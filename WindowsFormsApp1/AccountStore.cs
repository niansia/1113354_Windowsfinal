using System;
using System.Data.SQLite;
using System.IO;
using System.Security.Cryptography;

namespace WindowsFormsApp1
{
    // Lightweight account/profile DTO handed to the bridge layer.
    public sealed class FusionUser
    {
        public long Id;
        public string DisplayName;
        public string Email;
        public string Language;
    }

    // Local SQLite-backed account store for FusionOS. Holds the desktop profile
    // (display name, email), a PBKDF2-hashed password, and the chosen UI language.
    // The DB lives under %LocalAppData%\FusionOS\fusion.db so it persists across runs
    // and never touches the project folder. Multiple users are supported: the login
    // screen lists every row and verifies against the picked one.
    public sealed class AccountStore
    {
        private const int SaltBytes = 16;
        private const int HashBytes = 32;
        private const int Pbkdf2Iterations = 100000;

        private readonly string _connectionString;

        public AccountStore()
        {
            string dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "FusionOS");
            Directory.CreateDirectory(dir);
            string dbPath = Path.Combine(dir, "fusion.db");
            _connectionString = "Data Source=" + dbPath + ";Version=3;";
            EnsureSchema();
        }

        private SQLiteConnection Open()
        {
            var conn = new SQLiteConnection(_connectionString);
            conn.Open();
            return conn;
        }

        private void EnsureSchema()
        {
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText =
                    "CREATE TABLE IF NOT EXISTS users (" +
                    "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                    "  displayName TEXT NOT NULL," +
                    "  email TEXT," +
                    "  pwHash TEXT NOT NULL," +
                    "  pwSalt TEXT NOT NULL," +
                    "  iterations INTEGER NOT NULL," +
                    "  language TEXT," +
                    "  createdAt TEXT," +
                    "  updatedAt TEXT" +
                    ");";
                cmd.ExecuteNonQuery();
            }
        }

        // ---- Password hashing (PBKDF2 / Rfc2898, built into .NET Framework) ----

        private static string Hash(string password, byte[] salt, int iterations)
        {
            using (var derive = new Rfc2898DeriveBytes(password ?? string.Empty, salt, iterations))
            {
                return Convert.ToBase64String(derive.GetBytes(HashBytes));
            }
        }

        private static byte[] NewSalt()
        {
            var salt = new byte[SaltBytes];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(salt);
            }
            return salt;
        }

        // Constant-time string compare to avoid timing leaks on the hash check.
        private static bool FixedEquals(string a, string b)
        {
            if (a == null || b == null || a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
            return diff == 0;
        }

        // ---- Public API used by the bridge ----

        private static FusionUser ReadUser(SQLiteDataReader reader)
        {
            return new FusionUser
            {
                Id = reader.GetInt64(0),
                DisplayName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                Email = reader.IsDBNull(2) ? "" : reader.GetString(2),
                Language = reader.IsDBNull(3) ? "" : reader.GetString(3)
            };
        }

        public FusionUser GetPrimaryUser()
        {
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT id, displayName, email, language FROM users ORDER BY id LIMIT 1;";
                using (var reader = cmd.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    return ReadUser(reader);
                }
            }
        }

        public System.Collections.Generic.List<FusionUser> ListUsers()
        {
            var users = new System.Collections.Generic.List<FusionUser>();
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT id, displayName, email, language FROM users ORDER BY id;";
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read()) users.Add(ReadUser(reader));
                }
            }
            return users;
        }

        public FusionUser GetUser(long id)
        {
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT id, displayName, email, language FROM users WHERE id = @id;";
                cmd.Parameters.AddWithValue("@id", id);
                using (var reader = cmd.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    return ReadUser(reader);
                }
            }
        }

        public bool HasUser()
        {
            return GetPrimaryUser() != null;
        }

        public FusionUser CreateUser(string displayName, string email, string password, string language)
        {
            byte[] salt = NewSalt();
            string hash = Hash(password, salt, Pbkdf2Iterations);
            string now = DateTime.UtcNow.ToString("o");
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText =
                    "INSERT INTO users (displayName, email, pwHash, pwSalt, iterations, language, createdAt, updatedAt) " +
                    "VALUES (@displayName, @email, @pwHash, @pwSalt, @iterations, @language, @createdAt, @updatedAt);";
                cmd.Parameters.AddWithValue("@displayName", displayName ?? "");
                cmd.Parameters.AddWithValue("@email", (object)email ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@pwHash", hash);
                cmd.Parameters.AddWithValue("@pwSalt", Convert.ToBase64String(salt));
                cmd.Parameters.AddWithValue("@iterations", Pbkdf2Iterations);
                cmd.Parameters.AddWithValue("@language", (object)language ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@createdAt", now);
                cmd.Parameters.AddWithValue("@updatedAt", now);
                cmd.ExecuteNonQuery();
                cmd.CommandText = "SELECT last_insert_rowid();";
                cmd.Parameters.Clear();
                long newId = Convert.ToInt64(cmd.ExecuteScalar());
                return GetUser(newId);
            }
        }

        // userId <= 0 means "the primary (first) user" -- the pre-multi-user behaviour.
        public bool VerifyPassword(long userId, string password)
        {
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                if (userId > 0)
                {
                    cmd.CommandText = "SELECT pwHash, pwSalt, iterations FROM users WHERE id = @id;";
                    cmd.Parameters.AddWithValue("@id", userId);
                }
                else
                {
                    cmd.CommandText = "SELECT pwHash, pwSalt, iterations FROM users ORDER BY id LIMIT 1;";
                }
                using (var reader = cmd.ExecuteReader())
                {
                    if (!reader.Read()) return false;
                    string storedHash = reader.GetString(0);
                    byte[] salt = Convert.FromBase64String(reader.GetString(1));
                    int iterations = reader.GetInt32(2);
                    return FixedEquals(storedHash, Hash(password, salt, iterations));
                }
            }
        }

        public bool VerifyPassword(string password)
        {
            return VerifyPassword(0, password);
        }

        public bool UpdateProfile(long userId, string displayName, string email)
        {
            var user = userId > 0 ? GetUser(userId) : GetPrimaryUser();
            if (user == null) return false;
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "UPDATE users SET displayName = @displayName, email = @email, updatedAt = @updatedAt WHERE id = @id;";
                cmd.Parameters.AddWithValue("@displayName", displayName ?? "");
                cmd.Parameters.AddWithValue("@email", (object)email ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow.ToString("o"));
                cmd.Parameters.AddWithValue("@id", user.Id);
                return cmd.ExecuteNonQuery() > 0;
            }
        }

        public bool ChangePassword(long userId, string current, string next)
        {
            var user = userId > 0 ? GetUser(userId) : GetPrimaryUser();
            if (user == null) return false;
            if (!VerifyPassword(user.Id, current)) return false;
            byte[] salt = NewSalt();
            string hash = Hash(next, salt, Pbkdf2Iterations);
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "UPDATE users SET pwHash = @pwHash, pwSalt = @pwSalt, iterations = @iterations, updatedAt = @updatedAt WHERE id = @id;";
                cmd.Parameters.AddWithValue("@pwHash", hash);
                cmd.Parameters.AddWithValue("@pwSalt", Convert.ToBase64String(salt));
                cmd.Parameters.AddWithValue("@iterations", Pbkdf2Iterations);
                cmd.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow.ToString("o"));
                cmd.Parameters.AddWithValue("@id", user.Id);
                return cmd.ExecuteNonQuery() > 0;
            }
        }

        public void SetLanguage(long userId, string language)
        {
            var user = userId > 0 ? GetUser(userId) : GetPrimaryUser();
            if (user == null) return;
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "UPDATE users SET language = @language, updatedAt = @updatedAt WHERE id = @id;";
                cmd.Parameters.AddWithValue("@language", (object)language ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow.ToString("o"));
                cmd.Parameters.AddWithValue("@id", user.Id);
                cmd.ExecuteNonQuery();
            }
        }

        public void SetLanguage(string language)
        {
            SetLanguage(0, language);
        }

        // Wipe the local account so a forgotten password never locks the demo out.
        public void ResetAll()
        {
            using (var conn = Open())
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "DELETE FROM users;";
                cmd.ExecuteNonQuery();
            }
        }
    }
}
