using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace WindowsFormsApp1
{
    public partial class Form1 : Form
    {
        private readonly Color desktopTop = Color.FromArgb(2, 6, 23);
        private readonly Color desktopBottom = Color.FromArgb(15, 23, 42);
        private readonly Color glass = Color.FromArgb(180, 15, 23, 42);
        private readonly Color glass2 = Color.FromArgb(210, 30, 41, 59);
        private readonly Color accent = Color.FromArgb(34, 211, 238); // Cyan
        private readonly Color accent2 = Color.FromArgb(192, 38, 211); // Fuchsia
        private readonly Color accent3 = Color.FromArgb(99, 102, 241); // Indigo
        private readonly Color text = Color.FromArgb(248, 250, 252);
        private readonly Color muted = Color.FromArgb(148, 163, 184);

        private DesktopSurfacePanel desktop;
        private RoundedPanel leftRail;
        private ScrollableFlowLayoutPanel iconRail;
        private RoundedPanel taskbar;
        private RoundedPanel startMenu;
        private HeroStagePanel heroStage;
        private WebView2 carouselWebView;
        private FlowLayoutPanel taskButtons;
        private Label clockLabel;
        private readonly List<Control> openWindows = new List<Control>();
        private readonly List<DesktopShortcutInfo> desktopShortcuts = new List<DesktopShortcutInfo>();
        private int shortcutSerial;
        private int windowOffset;
        private string currentLanguage = "zh-TW";
        private Process cosmicServerProcess;
        private int cameraAppWindowCount = 0;
        private const bool UseViteDevServer = false;
        private const bool RunNativeCameraSmokeTest = false;

        public Form1()
        {
            InitializeComponent();
            BuildSystemDesktop();
        }

        private void BuildSystemDesktop()
        {
            Controls.Clear();
            desktopShortcuts.Clear();
            shortcutSerial = 0;
            Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular);
            Text = L("WindowTitle");
            BackColor = Color.FromArgb(8, 12, 22);
            DoubleBuffered = true;
            KeyPreview = true;
            KeyDown -= Form1_KeyDown;
            KeyDown += Form1_KeyDown;

            desktop = new DesktopSurfacePanel
            {
                Dock = DockStyle.Fill,
                TopColor = desktopTop,
                BottomColor = desktopBottom,
                AccentColor = accent,
                AccentColor2 = accent2
            };
            desktop.MouseUp += DesktopMouseUp;
            Controls.Add(desktop);

            BuildTaskbar();
            BuildLeftRail();
            BuildHeroStage();
            BuildStartMenu();
            LayoutShell();

            Resize += delegate
            {
                LayoutShell();
            };
        }


        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Escape && openWindows.Count > 0)
            {
                CloseWindow(openWindows[openWindows.Count - 1]);
                e.Handled = true;
            }
        }

        private void LayoutShell()
        {
            if (taskbar != null)
            {
                taskbar.Width = ClientSize.Width;
                taskbar.Height = 82;
                taskbar.Location = new Point(0, Math.Max(0, ClientSize.Height - taskbar.Height));
                taskbar.BringToFront();
            }

            if (leftRail != null)
            {
                leftRail.Location = new Point(12, 18);
                leftRail.Size = new Size(250, Math.Max(360, ClientSize.Height - (taskbar == null ? 82 : taskbar.Height) - 40));
                UpdateShelfScrollSize();
                leftRail.BringToFront();
            }

            PositionHeroStage();
            PositionStartMenu();

            if (startMenu != null && startMenu.Visible)
            {
                startMenu.BringToFront();
            }
            if (taskbar != null)
            {
                taskbar.BringToFront();
            }
        }

        private void DesktopMouseUp(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Right)
            {
                return;
            }

            var menu = new ContextMenuStrip
            {
                BackColor = Color.FromArgb(245, 245, 250),
                ForeColor = Color.FromArgb(30, 34, 44),
                ShowImageMargin = false,
                Font = new Font("Microsoft JhengHei UI", 10F)
            };
            menu.Items.Add(L("NewFileShortcut"), null, delegate { AddUserFile(); });
            menu.Items.Add(L("RefreshDesktop"), null, delegate { 
                desktop.Invalidate(); 
                if (heroStage != null) heroStage.Invalidate();
                if (carouselWebView != null && carouselWebView.CoreWebView2 != null) carouselWebView.Reload();
            });
            menu.Items.Add(L("SystemInfo"), null, delegate
            {
                OpenSystemWindow(L("FusionOSInfo"), L("FusionOSInfoBody"), accent);
            });
            menu.Items.Add(L("OpenProjectFolder"), null, delegate
            {
                Process.Start("explorer.exe", "\"" + Environment.CurrentDirectory + "\"");
            });
            menu.Show(desktop, e.Location);
        }

        private void BuildLeftRail()
        {
            leftRail = new RoundedPanel
            {
                Radius = 26,
                Width = 250,
                Height = Math.Max(360, ClientSize.Height - 124),
                Location = new Point(12, 18),
                Padding = new Padding(14),
                BackColor = Color.FromArgb(238, 6, 12, 26),
                Anchor = AnchorStyles.Left | AnchorStyles.Top | AnchorStyles.Bottom
            };
            desktop.Controls.Add(leftRail);
            leftRail.BringToFront();

            var railLayout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                ColumnCount = 1,
                RowCount = 2,
                Margin = new Padding(0),
                Padding = new Padding(0)
            };
            railLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 82));
            railLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            leftRail.Controls.Add(railLayout);

            var header = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                Padding = new Padding(4, 0, 4, 0)
            };
            railLayout.Controls.Add(header, 0, 0);

            var title = new Label
            {
                Location = new Point(4, 0),
                Size = new Size(220, 34),
                Text = "FUSION OS",
                ForeColor = accent,
                Font = new Font(Font.FontFamily, 18F, FontStyle.Bold)
            };
            header.Controls.Add(title);

            var subtitle = new Label
            {
                Location = new Point(4, 40),
                Size = new Size(220, 38),
                Text = "HTML-IN-CANVAS LAB",
                ForeColor = accent2,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold)
            };
            header.Controls.Add(subtitle);

            iconRail = new ScrollableFlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                FlowDirection = FlowDirection.TopDown,
                WrapContents = false,
                AutoScroll = true,
                Padding = new Padding(2, 8, 18, 18),
                Margin = new Padding(0)
            };
            iconRail.MouseEnter += delegate { iconRail.Focus(); };
            railLayout.Controls.Add(iconRail, 0, 1);

            AddDesktopIcon(L("ThisPC"), "PC", L("ThisPCDesc"), accent3);
            AddDesktopIcon(L("ProjectFiles"), "DIR", L("ProjectFilesDesc"), Color.FromArgb(90, 212, 255));
            AddDesktopIcon(L("PianoStudio"), "88", L("PianoStudioDesc"), Color.FromArgb(205, 95, 255), LaunchPianoStudio);
            AddDesktopIcon(L("CosmicGesture"), "COS", L("CosmicGestureDesc"), Color.FromArgb(103, 125, 255), LaunchCosmicGesture);
            AddDesktopIcon(L("UserFiles"), "USR", L("UserFilesDesc"), Color.FromArgb(86, 214, 255));
            AddDesktopIcon(L("AddFile"), "+", L("AddFileDesc"), Color.FromArgb(130, 165, 255), AddUserFile);
            AddDesktopIcon(L("LanguageLab"), "DEV", L("LanguageLabDesc"), accent);
            AddDesktopIcon(L("ToolBox"), "TOOL", L("ToolBoxDesc"), Color.FromArgb(255, 129, 142));
            AddDesktopIcon(L("Database"), "DB", L("DatabaseDesc"), Color.FromArgb(255, 206, 138));
            AddDesktopIcon(L("WebZone"), "WEB", L("WebZoneDesc"), Color.FromArgb(119, 187, 255));
            AddDesktopIcon(L("GameRoom"), "GAME", L("GameRoomDesc"), accent2);
            AddDesktopIcon(L("Terminal"), "CMD", L("TerminalDesc"), Color.FromArgb(112, 226, 188));
            AddDesktopIcon(L("Settings"), "SET", L("SettingsDesc"), Color.FromArgb(163, 133, 255), OpenSettingsWindow);
            UpdateShelfScrollSize();
        }

        private void UpdateShelfScrollSize()
        {
            if (iconRail == null)
            {
                return;
            }

            int total = iconRail.Padding.Top + iconRail.Padding.Bottom;
            foreach (Control child in iconRail.Controls)
            {
                total += child.Height + child.Margin.Top + child.Margin.Bottom;
            }
            iconRail.AutoScrollMinSize = new Size(0, Math.Max(total + 18, iconRail.Height + 1));
        }

        private void BuildTaskbar()
        {
            taskbar = new RoundedPanel
            {
                Radius = 28,
                BackColor = Color.FromArgb(232, 8, 16, 32),
                Height = 82,
                Width = ClientSize.Width,
                Location = new Point(0, Math.Max(0, ClientSize.Height - 82)),
                Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Bottom,
                Padding = new Padding(14, 12, 14, 12)
            };
            desktop.Controls.Add(taskbar);
            taskbar.BringToFront();

            var layout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                ColumnCount = 3
            };
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 118));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 190));
            taskbar.Controls.Add(layout);

            var startButton = new Button
            {
                Dock = DockStyle.Fill,
                Text = L("SysButton"),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(42, 58, 96),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 13F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            startButton.FlatAppearance.BorderSize = 0;
            startButton.Click += delegate { ToggleStartMenu(); };
            layout.Controls.Add(startButton, 0, 0);

            taskButtons = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                WrapContents = false,
                AutoScroll = true,
                FlowDirection = FlowDirection.LeftToRight,
                Padding = new Padding(6, 0, 6, 0)
            };
            layout.Controls.Add(taskButtons, 1, 0);

            var rightBox = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent
            };
            layout.Controls.Add(rightBox, 2, 0);

            var layerText = new Label
            {
                Dock = DockStyle.Top,
                Height = 32,
                Text = "MODE: HTML-IN-CANVAS | NODES: 128 | LAYERS: 12",
                ForeColor = accent,
                TextAlign = ContentAlignment.MiddleRight,
                Font = new Font(Font.FontFamily, 8.5F, FontStyle.Bold)
            };
            rightBox.Controls.Add(layerText);

            clockLabel = new Label
            {
                Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.BottomRight,
                ForeColor = text,
                Font = new Font("Consolas", 11F, FontStyle.Bold)
            };
            rightBox.Controls.Add(clockLabel);

            var timer = new Timer { Interval = 1000 };
            timer.Tick += delegate { UpdateClock(); };
            timer.Start();
            UpdateClock();
        }

        private void BuildStartMenu()
        {
            startMenu = new RoundedPanel
            {
                Radius = 28,
                BackColor = Color.FromArgb(244, 14, 22, 40),
                Size = new Size(380, 450),
                Padding = new Padding(18),
                Visible = false
            };
            PositionStartMenu();
            desktop.Controls.Add(startMenu);
            startMenu.BringToFront();

            var titleLabel = new Label
            {
                Dock = DockStyle.Top,
                Height = 48,
                Text = L("Launcher"),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 16F, FontStyle.Bold)
            };
            startMenu.Controls.Add(titleLabel);

            var apps = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.TopDown,
                WrapContents = false,
                BackColor = Color.Transparent,
                AutoScroll = true
            };
            startMenu.Controls.Add(apps);
            apps.BringToFront();

            apps.Controls.Add(StartItem(L("FileManager"), L("FileManagerDesc"), accent));
            apps.Controls.Add(StartItem(L("AppRegistry"), L("AppRegistryDesc"), Color.FromArgb(255, 196, 96)));
            apps.Controls.Add(StartItem(L("PianoStudio"), L("StartPianoDesc"), accent2));
            apps.Controls.Add(StartItem(L("CosmicGesture"), L("StartCosmicDesc"), accent3));
            apps.Controls.Add(StartItem(L("LanguageLab"), L("StartLanguageDesc"), accent));
            apps.Controls.Add(StartItem(L("SystemSettings"), L("SystemSettingsDesc"), Color.FromArgb(163, 133, 255)));
            apps.Controls.Add(StartItem(L("AboutSystem"), L("AboutSystemDesc"), Color.FromArgb(100, 220, 145)));
        }

        private async void BuildHeroStage()
        {
            carouselWebView = new WebView2
            {
                Dock = DockStyle.None,
                Visible = false,
                BackColor = Color.FromArgb(2, 6, 23)
            };
            
            desktop.Controls.Add(carouselWebView);

            try
            {
                // Use a fresh folder for camera debug to clear old permission states
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                    "FusionOS", 
                    "CarouselDebugCamera"
                );
                Debug.WriteLine($"[FusionOS WebView2] userDataFolder={userDataFolder}");
                
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await carouselWebView.EnsureCoreWebView2Async(env);
                
                // WebView2 Settings
                carouselWebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                carouselWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                
                // Set Permissions BEFORE Navigate
                carouselWebView.CoreWebView2.PermissionRequested += (sender, args) =>
                {
                    Debug.WriteLine($"[FusionOS PermissionRequested] Kind={args.PermissionKind}, Uri={args.Uri}, IsUserInitiated={args.IsUserInitiated}");

                    if (args.PermissionKind == CoreWebView2PermissionKind.Camera ||
                        args.PermissionKind == CoreWebView2PermissionKind.Microphone)
                    {
                        args.State = CoreWebView2PermissionState.Allow;
                        Debug.WriteLine("[FusionOS PermissionRequested] Camera/Microphone allowed");
                    }
                };
                Debug.WriteLine("[FusionOS WebView2] PermissionRequested handler registered");
                
                carouselWebView.CoreWebView2.NavigationStarting += (s, e) => {
                    Debug.WriteLine($"[FusionOS NavigationStarting] URL={e.Uri}");
                };

                carouselWebView.CoreWebView2.NavigationCompleted += async (s, e) => {
                    Debug.WriteLine($"[FusionOS NavigationCompleted] Success={e.IsSuccess}, Status={e.WebErrorStatus}");
                    
                    if (!e.IsSuccess || !RunNativeCameraSmokeTest) return;

                    // Native Camera Smoke Test
                    string script = @"
(async () => {
  const result = {
    type: 'NATIVE_CAMERA_SMOKE_TEST',
    href: location.href,
    origin: location.origin,
    hasNavigator: !!navigator,
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    permissionState: 'unknown',
    ok: false,
    errorName: '',
    errorMessage: '',
    tracks: []
  };

  try {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const p = await navigator.permissions.query({ name: 'camera' });
        result.permissionState = p.state;
      } catch (permErr) {
        result.permissionState = 'permissions_query_failed:' + permErr.name + ':' + permErr.message;
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user'
      },
      audio: false
    });

    result.ok = true;
    result.tracks = stream.getVideoTracks().map(t => ({
      label: t.label,
      readyState: t.readyState,
      enabled: t.enabled,
      muted: t.muted
    }));

    stream.getTracks().forEach(t => t.stop());
  } catch (err) {
    result.ok = false;
    result.errorName = err && err.name ? err.name : String(err);
    result.errorMessage = err && err.message ? err.message : '';
  }

  chrome.webview.postMessage(result);
})();
";
                    Debug.WriteLine("[FusionOS NativeCameraSmokeTest] executing injected getUserMedia test...");
                    await carouselWebView.CoreWebView2.ExecuteScriptAsync(script);
                };

                carouselWebView.CoreWebView2.WebMessageReceived += CarouselWebView_WebMessageReceived;

                // Build-Only Workflow: Ignore localhost, always load built dist
                string distFolder = FindFrontendDistFolder();
                if (!string.IsNullOrEmpty(distFolder))
                {
                    Debug.WriteLine("[FusionOS WebView2] loading built dist: " + distFolder);

                    carouselWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "fusion.local",
                        distFolder,
                        CoreWebView2HostResourceAccessKind.Allow
                    );
                    
                    // Cache busting with timestamp
                    string url = "https://fusion.local/index.html?v=" + DateTimeOffset.Now.ToUnixTimeMilliseconds();
                    Debug.WriteLine($"[FusionOS WebView2] Navigate={url}");
                    carouselWebView.CoreWebView2.Navigate(url);
                    
                    carouselWebView.Visible = true;
                    PositionHeroStage();
                    return;
                }

                // 3. Fallback to Legacy Mode
                Debug.WriteLine("[FusionOS WebView2] Dist folder not found, falling back to legacy.");
                InitializeLegacyHeroStage();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("WebView2 Init Failed: " + ex.Message);
                InitializeLegacyHeroStage();
            }
        }

        private void InitializeLegacyHeroStage()
        {
            if (carouselWebView != null) carouselWebView.Visible = false;
            heroStage = new HeroStagePanel
            {
                Size = new Size(760, 520),
                ForeColor = text,
                BackColor = Color.Transparent,
                Title = "FUSION OS [LEGACY MODE]",
                Subtitle = "Frontend build not found or WebView2 failed. Run 'npm run build' in Frontend folder.",
                AccentColor = accent,
                AccentColor2 = accent2,
                AccentColor3 = accent3
            };
            heroStage.NodeClicked += HeroStage_NodeClicked;
            heroStage.SetShortcuts(desktopShortcuts);
            desktop.Controls.Add(heroStage);
            PositionHeroStage();
        }

        private Task<bool> IsFrontendDevServerReadyAsync()
        {
            return Task.Run(delegate
            {
                try
                {
                    var request = (HttpWebRequest)WebRequest.Create("http://localhost:5173/");
                    request.Timeout = 800;
                    using (var response = (HttpWebResponse)request.GetResponse())
                    {
                        return response.StatusCode == HttpStatusCode.OK;
                    }
                }
                catch
                {
                    return false;
                }
            });
        }

        private string FindFrontendDistFolder()
        {
            var probes = new List<string>();
            
            // 1 & 2: Local execution context
            probes.Add(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist"));
            probes.Add(Path.Combine(Environment.CurrentDirectory, "dist"));

            // 3 & 4: Project root
            string root = FindProjectDirectory("Frontend");
            if (root != null)
            {
                probes.Add(Path.Combine(root, "dist"));
                probes.Add(Path.Combine(root, "Frontend", "dist"));
            }

            // 5 & 6: Upwards from StartupPath
            var dir = new DirectoryInfo(Application.StartupPath);
            while (dir != null)
            {
                probes.Add(Path.Combine(dir.FullName, "dist"));
                probes.Add(Path.Combine(dir.FullName, "Frontend", "dist"));
                dir = dir.Parent;
            }

            // 7 & 8: Upwards from CurrentDirectory
            dir = new DirectoryInfo(Environment.CurrentDirectory);
            while (dir != null)
            {
                probes.Add(Path.Combine(dir.FullName, "dist"));
                probes.Add(Path.Combine(dir.FullName, "Frontend", "dist"));
                dir = dir.Parent;
            }

            foreach (string path in probes)
            {
                if (Directory.Exists(path) && File.Exists(Path.Combine(path, "index.html")))
                {
                    return path;
                }
            }
            return null;
        }

        private string FindFrontendIndexHtml()
        {
            var probes = new List<string>();
            
            // 1 & 2: Local execution context
            probes.Add(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist", "index.html"));
            probes.Add(Path.Combine(Environment.CurrentDirectory, "dist", "index.html"));

            // 3 & 4: Project root (where Frontend folder lives)
            string root = FindProjectDirectory("Frontend");
            if (root != null)
            {
                probes.Add(Path.Combine(root, "dist", "index.html"));
                probes.Add(Path.Combine(root, "Frontend", "dist", "index.html"));
            }

            // 5 & 6: Upwards from StartupPath
            var dir = new DirectoryInfo(Application.StartupPath);
            while (dir != null)
            {
                probes.Add(Path.Combine(dir.FullName, "dist", "index.html"));
                probes.Add(Path.Combine(dir.FullName, "Frontend", "dist", "index.html"));
                dir = dir.Parent;
            }

            // 7 & 8: Upwards from CurrentDirectory
            dir = new DirectoryInfo(Environment.CurrentDirectory);
            while (dir != null)
            {
                probes.Add(Path.Combine(dir.FullName, "dist", "index.html"));
                probes.Add(Path.Combine(dir.FullName, "Frontend", "dist", "index.html"));
                dir = dir.Parent;
            }

            foreach (string path in probes)
            {
                if (File.Exists(path)) return path;
            }
            return null;
        }

        private void CarouselWebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string message = e.WebMessageAsJson;
                
                // Intercept Native Camera Smoke Test
                if (!string.IsNullOrEmpty(message) && message.Contains("NATIVE_CAMERA_SMOKE_TEST"))
                {
                    Debug.WriteLine("[FusionOS NativeCameraSmokeTest Result] " + message);
                }

                if (string.IsNullOrEmpty(message)) message = e.TryGetWebMessageAsString();
                if (string.IsNullOrEmpty(message)) return;

                string lower = message.ToLower();

                if (lower.Contains("launch_app"))
                {
                    if (lower.Contains("\"piano\"") || lower.Contains("\"88\"")) LaunchPianoStudio();
                    else if (lower.Contains("\"cosmic\"") || lower.Contains("\"cos\"")) LaunchCosmicGesture();
                    else if (lower.Contains("\"settings\"") || lower.Contains("\"set\"")) OpenSettingsWindow();
                    else 
                    {
                        foreach(var shortcut in desktopShortcuts) 
                        {
                            IconInfo info = shortcut.Tag as IconInfo;
                            if (info != null && lower.Contains($"\"{info.Glyph.ToLower()}\"")) 
                            {
                                OpenIcon(info);
                                return;
                            }
                        }
                    }
                }
            }
            catch { }
        }

        private void HeroStage_NodeClicked(object sender, HeroNodeEventArgs e)
        {
            if (e == null || string.IsNullOrWhiteSpace(e.NodeKey))
            {
                return;
            }

            if (e.NodeKey.StartsWith("shortcut:"))
            {
                foreach (DesktopShortcutInfo shortcut in desktopShortcuts)
                {
                    if (shortcut.Key == e.NodeKey)
                    {
                        IconInfo info = shortcut.Tag as IconInfo;
                        if (info != null)
                        {
                            OpenIcon(info);
                        }
                        return;
                    }
                }
            }

            if (e.NodeKey == "cosmic")
            {
                LaunchCosmicGesture();
                return;
            }
            if (e.NodeKey == "piano")
            {
                LaunchPianoStudio();
                return;
            }
            if (e.NodeKey == "settings")
            {
                OpenSettingsWindow();
                return;
            }
            if (e.NodeKey == "web")
            {
                OpenSystemWindow(L("WebZone"), L("WebZoneDesc") + "\r\n\r\n" + L("ReservedAppBody"), Color.FromArgb(90, 190, 255));
                return;
            }

            OpenSystemWindow("Fusion Node", "Interactive canvas node: " + e.NodeKey, accent);
        }

        private void PositionHeroStage()
        {
            if (leftRail == null || taskbar == null)
            {
                return;
            }

            leftRail.Height = Math.Max(360, taskbar.Top - leftRail.Top - 14);
            UpdateShelfScrollSize();

            int x = leftRail.Right + 18;
            int y = 22;
            int rightMargin = 28;
            int bottomLimit = taskbar.Top - 18;
            int width = Math.Max(620, ClientSize.Width - x - rightMargin);
            int height = Math.Max(420, bottomLimit - y);

            if (heroStage != null)
            {
                heroStage.Size = new Size(width, height);
                heroStage.Location = new Point(x, y);
                heroStage.BringToFront();
                heroStage.Invalidate();
            }

            if (carouselWebView != null)
            {
                carouselWebView.Size = new Size(width, height);
                carouselWebView.Location = new Point(x, y);
                carouselWebView.BringToFront();
            }

            // Ensure system controls are on top of the hero area
            if (leftRail != null) leftRail.BringToFront();
            if (taskbar != null) taskbar.BringToFront();
            if (startMenu != null && startMenu.Visible) startMenu.BringToFront();
        }

        private void AddDesktopIcon(string name, string glyph, string description, Color accentColor)
        {
            AddDesktopIcon(name, glyph, description, accentColor, null, null, false);
        }

        private void AddDesktopIcon(string name, string glyph, string description, Color accentColor, Action customAction)
        {
            AddDesktopIcon(name, glyph, description, accentColor, customAction, null, false);
        }

        private void AddDesktopIcon(string name, string glyph, string description, Color accentColor, Action customAction, string sourcePath, bool canDelete)
        {
            var info = new IconInfo(name, glyph, description, customAction, sourcePath, canDelete);
            string iconPath = GetIconPath(glyph);
            Image image = null;
            if (iconPath != null)
            {
                try
                {
                    image = Image.FromFile(iconPath);
                }
                catch
                {
                    image = null;
                }
            }

            var tile = new CanvasIconTile
            {
                Width = 188,
                Height = 94,
                Margin = new Padding(0, 0, 0, 12),
                AccentColor = accentColor,
                Title = name,
                Glyph = glyph,
                Description = description,
                IconImage = image,
                Tag = info,
                Cursor = Cursors.Hand
            };

            tile.MouseUp += DesktopIconMouseUp;
            tile.TitleClicked += DesktopIconMouseUp;
            iconRail.Controls.Add(tile);

            var shortcut = new DesktopShortcutInfo
            {
                Key = "shortcut:" + (++shortcutSerial).ToString(),
                Title = name,
                Glyph = glyph,
                Description = description,
                AccentColor = accentColor,
                IconImage = image,
                Tag = info,
                IsUserFile = canDelete
            };
            desktopShortcuts.Add(shortcut);
            if (heroStage != null)
            {
                heroStage.SetShortcuts(desktopShortcuts);
            }
            UpdateShelfScrollSize();
        }

        private string GetIconPath(string glyph)
        {
            string iconRoot = FindProjectDirectory(Path.Combine("Assets", "AppIcons"));
            if (iconRoot == null)
            {
                return null;
            }

            string fileName;
            switch (glyph)
            {
                case "PC": fileName = "this-pc.png"; break;
                case "DIR": fileName = "project-files.png"; break;
                case "88": fileName = "piano-studio.png"; break;
                case "COS": fileName = "cosmic-gesture.png"; break;
                case "USR": fileName = "user-files.png"; break;
                case "+": fileName = "add-file.png"; break;
                case "DEV": fileName = "language-lab.png"; break;
                case "TOOL": fileName = "tool-box.png"; break;
                case "DB": fileName = "database.png"; break;
                case "WEB": fileName = "web-zone.png"; break;
                case "GAME": fileName = "game-room.png"; break;
                case "CMD": fileName = "terminal.png"; break;
                case "SET": fileName = "settings.png"; break;
                default: fileName = null; break;
            }
            if (fileName == null)
            {
                return null;
            }
            string candidate = Path.Combine(iconRoot, fileName);
            return File.Exists(candidate) ? candidate : null;
        }

        private Button StartItem(string name, string description, Color color)
        {
            var item = new Button
            {
                Width = 335,
                Height = 60,
                Text = name + "\r\n" + description,
                TextAlign = ContentAlignment.MiddleLeft,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(35, 46, 68),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 9.2F, FontStyle.Bold),
                Padding = new Padding(14, 0, 0, 0),
                Margin = new Padding(0, 0, 0, 10),
                Cursor = Cursors.Hand,
                Tag = new IconInfo(name, "APP", description, null, null, false)
            };
            item.FlatAppearance.BorderSize = 0;
            item.FlatAppearance.MouseOverBackColor = Color.FromArgb(48, 64, 92);
            item.Click += delegate
            {
                startMenu.Visible = false;
                if (name == L("PianoStudio"))
                {
                    LaunchPianoStudio();
                    return;
                }
                if (name == L("CosmicGesture"))
                {
                    LaunchCosmicGesture();
                    return;
                }
                if (name == L("SystemSettings"))
                {
                    OpenSettingsWindow();
                    return;
                }
                OpenSystemWindow(name, description + "\r\n\r\n" + L("ReservedAppBody"), color);
            };
            return item;
        }

        private void DesktopIconMouseUp(object sender, MouseEventArgs e)
        {
            Control control = sender as Control;
            if (sender is CanvasIconTile)
            {
                control = (Control)sender;
            }

            var info = control == null ? null : control.Tag as IconInfo;
            if (info == null)
            {
                return;
            }

            if (e.Button == MouseButtons.Right)
            {
                ShowIconContextMenu(control, info, e.Location);
                return;
            }

            if (e.Button != MouseButtons.Left)
            {
                return;
            }

            OpenIcon(info);
        }

        private void OpenIcon(IconInfo info)
        {
            if (info.CustomAction != null)
            {
                info.CustomAction();
                return;
            }

            OpenSystemWindow(info.Name, info.Description + "\r\n\r\n" + L("DefaultEntryBody"), ColorFor(info));
        }

        private void ShowIconContextMenu(Control source, IconInfo info, Point location)
        {
            var tile = source as CanvasIconTile;
            var menu = new ContextMenuStrip
            {
                BackColor = Color.FromArgb(245, 245, 250),
                ForeColor = Color.FromArgb(30, 34, 44),
                ShowImageMargin = false,
                Font = new Font("Microsoft JhengHei UI", 10F)
            };

            menu.Items.Add(L("Open"), null, delegate { OpenIcon(info); });
            menu.Items.Add(L("Info"), null, delegate { ShowIconInfo(info); });
            menu.Items.Add(L("OpenLocation"), null, delegate { OpenIconLocation(info); });
            menu.Items.Add(L("PinToTaskbar"), null, delegate { PinIcon(info); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(L("Rename"), null, delegate { RenameIcon(tile, info); });
            menu.Items.Add(L("Delete"), null, delegate { DeleteIcon(tile, info); });
            menu.Show(source, location);
        }

        private void ShowIconInfo(IconInfo info)
        {
            string path = ResolveIconPath(info);
            string body = info.Description + "\r\n\r\n" + L("Type") + ": " + (info.CustomAction == null ? L("SystemEntry") : L("ApplicationOrFile")) + "\r\n";
            if (path != null)
            {
                body += L("Location") + ":\r\n" + path;
            }
            else
            {
                body += L("Location") + ":\r\n" + L("VirtualDesktop");
            }
            OpenSystemWindow(info.Name + " " + L("Info"), body, ColorFor(info));
        }

        private void OpenIconLocation(IconInfo info)
        {
            string path = ResolveIconPath(info);
            if (path == null)
            {
                OpenSystemWindow(info.Name + " " + L("Location"), L("VirtualNoFolder"), ColorFor(info));
                return;
            }

            if (File.Exists(path))
            {
                Process.Start("explorer.exe", "/select,\"" + path + "\"");
                return;
            }

            if (Directory.Exists(path))
            {
                Process.Start("explorer.exe", "\"" + path + "\"");
            }
        }

        private void PinIcon(IconInfo info)
        {
            var task = new Button
            {
                Width = 138,
                Height = 48,
                Text = info.Name.Length > 14 ? info.Name.Substring(0, 14) : info.Name,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(36, 49, 78),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                Margin = new Padding(0, 0, 10, 0),
                Cursor = Cursors.Hand
            };
            task.FlatAppearance.BorderSize = 0;
            task.Click += delegate { OpenIcon(info); };
            taskButtons.Controls.Add(task);
        }

        private void RenameIcon(CanvasIconTile tile, IconInfo info)
        {
            if (tile == null)
            {
                return;
            }

            string newName = PromptForText(L("Rename"), L("NewName"), info.Name);
            if (string.IsNullOrWhiteSpace(newName))
            {
                return;
            }

            info.Name = newName.Trim();
            tile.Title = info.Name;
            tile.Invalidate();
            foreach (DesktopShortcutInfo shortcut in desktopShortcuts)
            {
                if (object.ReferenceEquals(shortcut.Tag, info))
                {
                    shortcut.Title = info.Name;
                }
            }
            if (heroStage != null)
            {
                heroStage.SetShortcuts(desktopShortcuts);
            }
        }

        private void DeleteIcon(CanvasIconTile tile, IconInfo info)
        {
            if (!info.CanDelete)
            {
                OpenSystemWindow(info.Name + " " + L("Delete"), L("ProtectedDelete"), ColorFor(info));
                return;
            }

            if (tile != null)
            {
                iconRail.Controls.Remove(tile);
                tile.Dispose();
            }
            for (int i = desktopShortcuts.Count - 1; i >= 0; i--)
            {
                if (object.ReferenceEquals(desktopShortcuts[i].Tag, info))
                {
                    desktopShortcuts.RemoveAt(i);
                }
            }
            if (heroStage != null)
            {
                heroStage.SetShortcuts(desktopShortcuts);
            }
            UpdateShelfScrollSize();
        }

        private string ResolveIconPath(IconInfo info)
        {
            if (!string.IsNullOrEmpty(info.SourcePath))
            {
                if (Path.IsPathRooted(info.SourcePath))
                {
                    return info.SourcePath;
                }

                string directory = FindProjectDirectory(info.SourcePath);
                if (directory != null)
                {
                    return directory;
                }

                string file = FindProjectFile(info.SourcePath);
                if (file != null)
                {
                    return file;
                }
            }

            if (info.Glyph == "88")
            {
                return FindProjectDirectory(Path.Combine("IntegratedApps", "PianoStudio"));
            }
            if (info.Glyph == "COS")
            {
                return FindProjectDirectory(Path.Combine("IntegratedApps", "CosmicGesture"));
            }

            return null;
        }

        private void AddUserFile()
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.Title = L("AddFileDialogTitle");
                dialog.Filter = L("AllFilesFilter");
                if (dialog.ShowDialog(this) != DialogResult.OK)
                {
                    return;
                }

                string fileName = Path.GetFileName(dialog.FileName);
                string selectedPath = dialog.FileName;
                AddDesktopIcon(fileName, "FILE", L("UserFilePath") + ":\r\n" + selectedPath, Color.FromArgb(140, 220, 255), delegate
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = selectedPath,
                        UseShellExecute = true
                    });
                }, selectedPath, true);
            }
        }

        private void LaunchPianoStudio()
        {
            string appRoot = FindProjectDirectory(Path.Combine("IntegratedApps", "PianoStudio"));
            string exePath = appRoot == null ? null : FindFirstExe(appRoot);
            if (exePath == null)
            {
                OpenSystemWindow(L("PianoStudio"), L("PianoMissingBody"), accent2);
                return;
            }

            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = exePath,
                    WorkingDirectory = Path.GetDirectoryName(exePath),
                    UseShellExecute = true
                };
                Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                OpenSystemWindow(L("PianoLaunchError"), L("PianoLaunchErrorBody") + "\r\n\r\n" + L("Executable") + ":\r\n" + exePath + "\r\n\r\n" + L("Error") + ":\r\n" + ex.Message, accent2);
            }
        }

        private async void LaunchCosmicGesture()
        {
            string appRoot = FindProjectDirectory(Path.Combine("IntegratedApps", "CosmicGesture"));
            string serverPath = appRoot == null ? null : Path.Combine(appRoot, "server.py");
            if (serverPath == null || !File.Exists(serverPath))
            {
                OpenSystemWindow(L("CosmicGesture"), L("CosmicMissingBody"), accent3);
                return;
            }

            bool serverReady = await IsCosmicServerReadyAsync();
            if (!serverReady)
            {
                string python = FindPythonCommand();
                if (python == null)
                {
                    OpenSystemWindow(L("CosmicGesture"), L("PythonMissingBody"), accent3);
                    return;
                }

                try
                {
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = python,
                        Arguments = "\"" + serverPath + "\"",
                        WorkingDirectory = appRoot,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    cosmicServerProcess = Process.Start(startInfo);
                    serverReady = await WaitForCosmicServerAsync();
                }
                catch (Exception ex)
                {
                    OpenSystemWindow(L("CosmicLaunchError"), L("CosmicLaunchErrorBody") + "\r\n\r\n" + L("Error") + ":\r\n" + ex.Message, accent3);
                    return;
                }
            }

            if (!serverReady)
            {
                OpenSystemWindow(L("CosmicLaunchError"), L("CosmicLaunchErrorBody") + "\r\n\r\n" + L("Error") + ":\r\nhttp://127.0.0.1:8765 did not respond.", accent3);
                return;
            }

            OpenWebAppWindow(L("CosmicGesture"), "http://127.0.0.1:8765/?host=fusionos", accent3, ownsCamera: true);
        }

        private async Task<bool> WaitForCosmicServerAsync()
        {
            for (int i = 0; i < 30; i++)
            {
                if (await IsCosmicServerReadyAsync())
                {
                    return true;
                }
                await Task.Delay(160);
            }

            return false;
        }

        private Task<bool> IsCosmicServerReadyAsync()
        {
            return Task.Run(delegate
            {
                try
                {
                    var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8765/health");
                    request.Timeout = 550;
                    using (var response = (HttpWebResponse)request.GetResponse())
                    {
                        return response.StatusCode == HttpStatusCode.OK;
                    }
                }
                catch
                {
                    return false;
                }
            });
        }

        private string FindPythonCommand()
        {
            string[] candidates = { "py", "python", "python3" };
            foreach (string candidate in candidates)
            {
                try
                {
                    using (var process = new Process())
                    {
                        process.StartInfo.FileName = candidate;
                        process.StartInfo.Arguments = "--version";
                        process.StartInfo.UseShellExecute = false;
                        process.StartInfo.CreateNoWindow = true;
                        process.StartInfo.RedirectStandardOutput = true;
                        process.StartInfo.RedirectStandardError = true;
                        process.Start();
                        if (process.WaitForExit(1200) && process.ExitCode == 0)
                        {
                            return candidate;
                        }
                    }
                }
                catch
                {
                }
            }

            return null;
        }

        private string FindProjectDirectory(string relativePath)
        {
            var probes = new List<string>();
            probes.Add(Application.StartupPath);
            probes.Add(Environment.CurrentDirectory);

            foreach (string start in probes)
            {
                var dir = new DirectoryInfo(start);
                while (dir != null)
                {
                    string candidate = Path.Combine(dir.FullName, relativePath);
                    if (Directory.Exists(candidate))
                    {
                        return candidate;
                    }
                    dir = dir.Parent;
                }
            }

            return null;
        }

        private string FindProjectFile(string relativePath)
        {
            var probes = new List<string>();
            probes.Add(Application.StartupPath);
            probes.Add(Environment.CurrentDirectory);

            foreach (string start in probes)
            {
                var dir = new DirectoryInfo(start);
                while (dir != null)
                {
                    string candidate = Path.Combine(dir.FullName, relativePath);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                    dir = dir.Parent;
                }
            }

            return null;
        }

        private string FindFirstExe(string appRoot)
        {
            string[] files = Directory.GetFiles(appRoot, "*.exe", SearchOption.AllDirectories);
            foreach (string file in files)
            {
                string normalized = file.Replace('/', '\\');
                if (normalized.IndexOf("\\bin\\Debug\\", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return file;
                }
            }

            return files.Length == 0 ? null : files[0];
        }

        private void OpenSystemWindow(string title, string body, Color color)
        {
            windowOffset = (windowOffset + 30) % 180;
            var win = new RoundedPanel
            {
                Radius = 22,
                BackColor = Color.FromArgb(246, 10, 16, 30),
                Size = new Size(Math.Min(600, Math.Max(460, ClientSize.Width - leftRail.Right - 70)), 380),
                Location = new Point(Math.Min(Math.Max(leftRail.Right + 24, 330 + windowOffset), Math.Max(leftRail.Right + 24, ClientSize.Width - 630)), Math.Max(44, 64 + windowOffset / 2)),
                Padding = new Padding(0)
            };
            desktop.Controls.Add(win);
            openWindows.Add(win);
            win.BringToFront();
            startMenu.BringToFront();
            taskbar.BringToFront();

            var header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 54,
                BackColor = Color.FromArgb(50, color)
            };
            win.Controls.Add(header);

            var titleLabel = new Label
            {
                Dock = DockStyle.Fill,
                Text = title,
                ForeColor = text,
                Font = new Font(Font.FontFamily, 13F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
                Padding = new Padding(18, 0, 0, 0)
            };
            header.Controls.Add(titleLabel);

            var close = new Button
            {
                Dock = DockStyle.Right,
                Width = 58,
                Text = "✕",
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                BackColor = Color.FromArgb(210, 220, 62, 91),
                Font = new Font(Font.FontFamily, 12F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            close.FlatAppearance.BorderSize = 0;
            close.FlatAppearance.MouseOverBackColor = Color.FromArgb(240, 255, 82, 120);
            close.Click += delegate { CloseWindow(win); };
            header.Controls.Add(close);
            close.BringToFront();

            var content = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                Padding = new Padding(22),
                RowCount = 3
            };
            content.RowStyles.Add(new RowStyle(SizeType.Absolute, 18));
            content.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            content.RowStyles.Add(new RowStyle(SizeType.Absolute, 54));
            win.Controls.Add(content);
            content.BringToFront();

            content.Controls.Add(new Panel { Dock = DockStyle.Fill, BackColor = color }, 0, 0);
            content.Controls.Add(new Label
            {
                Dock = DockStyle.Fill,
                Text = body,
                ForeColor = muted,
                Font = new Font(Font.FontFamily, 11F),
                TextAlign = ContentAlignment.TopLeft
            }, 0, 1);

            var actions = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.RightToLeft,
                WrapContents = false,
                BackColor = Color.Transparent
            };
            content.Controls.Add(actions, 0, 2);
            actions.Controls.Add(WindowButton(L("OpenLater")));
            actions.Controls.Add(WindowButton(L("Pin")));
            actions.Controls.Add(WindowButton(L("Details")));

            CreateTaskButtonForWindow(title, win);
        }

        private async void OpenWebAppWindow(string title, string url, Color color, bool ownsCamera = false)
        {
            windowOffset = (windowOffset + 28) % 168;
            int x = leftRail == null ? 24 : leftRail.Right + 16;
            int y = 28;
            int maxWidth = Math.Max(760, ClientSize.Width - x - 24);
            int maxHeight = Math.Max(520, (taskbar == null ? ClientSize.Height : taskbar.Top) - y - 18);
            int width = maxWidth;
            int height = maxHeight;

            var win = new RoundedPanel
            {
                Radius = 20,
                BackColor = Color.FromArgb(250, 4, 8, 20),
                Size = new Size(width, height),
                Location = new Point(x, y),
                Padding = new Padding(0)
            };
            desktop.Controls.Add(win);
            openWindows.Add(win);
            win.BringToFront();
            startMenu.BringToFront();
            taskbar.BringToFront();

            // Hand the shared webcam over to this app: release it from the desktop
            // carousel now, and give it back when this window closes.
            if (ownsCamera)
            {
                cameraAppWindowCount++;
                SetCarouselCamera(false);
                win.Disposed += delegate
                {
                    cameraAppWindowCount = Math.Max(0, cameraAppWindowCount - 1);
                    if (cameraAppWindowCount == 0) SetCarouselCamera(true);
                };
            }

            var header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 50,
                BackColor = Color.FromArgb(48, color)
            };
            win.Controls.Add(header);

            var titleLabel = new Label
            {
                Dock = DockStyle.Fill,
                Text = title + " / FusionOS React Web UI",    // Updated text hint
                ForeColor = text,
                Font = new Font(Font.FontFamily, 12.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
                Padding = new Padding(18, 0, 0, 0)
            };
            header.Controls.Add(titleLabel);

            var close = new Button
            {
                Dock = DockStyle.Right,
                Width = 58,
                Text = "✕",
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                BackColor = Color.FromArgb(210, 220, 62, 91),
                Font = new Font(Font.FontFamily, 12F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            close.FlatAppearance.BorderSize = 0;
            close.FlatAppearance.MouseOverBackColor = Color.FromArgb(240, 255, 82, 120);
            close.Click += delegate { CloseWindow(win); };
            header.Controls.Add(close);
            close.BringToFront();

            var content = new Panel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(0),
                BackColor = Color.FromArgb(2, 4, 13)
            };
            win.Controls.Add(content);
            content.BringToFront();

            var loading = new Label
            {
                Dock = DockStyle.Fill,
                Text = "Booting Modern Frontend Stack...",
                ForeColor = muted,
                BackColor = Color.FromArgb(2, 4, 13),
                Font = new Font(Font.FontFamily, 12F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter
            };
            content.Controls.Add(loading);

            var webView = new WebView2
            {
                Dock = DockStyle.Fill,
                Visible = false
            };
            content.Controls.Add(webView);
            webView.BringToFront();

            CreateTaskButtonForWindow(title, win);

            try
            {
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FusionOS",
                    "WebView2");
                Directory.CreateDirectory(userDataFolder);

                var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder, null);
                if (webView.IsDisposed)
                {
                    return;
                }

                await webView.EnsureCoreWebView2Async(environment);
                if (webView.IsDisposed)
                {
                    return;
                }

                webView.CoreWebView2.PermissionRequested += delegate (object eventSender, CoreWebView2PermissionRequestedEventArgs args)
                {
                    if (args.PermissionKind == CoreWebView2PermissionKind.Camera || args.PermissionKind == CoreWebView2PermissionKind.Microphone)
                    {
                        args.State = CoreWebView2PermissionState.Allow;
                    }
                };
                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.NavigationCompleted += delegate (object eventSender, CoreWebView2NavigationCompletedEventArgs args)
                {
                    if (!args.IsSuccess)
                    {
                        loading.Visible = true;
                        loading.Text = "Cosmic Gesture could not finish loading: " + args.WebErrorStatus;
                    }
                };

                loading.Visible = false;
                webView.Visible = true;
                webView.CoreWebView2.Navigate(url);
            }
            catch (Exception ex)
            {
                webView.Visible = false;
                loading.Visible = true;
                loading.Text = "WebView2 could not start.\r\n\r\n" + ex.Message;
            }
        }

        private void CreateTaskButtonForWindow(string title, Control win)
        {
            var task = new Button
            {
                Width = 138,
                Height = 48,
                Text = title.Length > 14 ? title.Substring(0, 14) : title,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(36, 49, 78),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                Margin = new Padding(0, 0, 10, 0),
                Tag = win,
                Cursor = Cursors.Hand
            };
            task.FlatAppearance.BorderSize = 0;
            task.Click += delegate
            {
                win.Visible = true;
                win.BringToFront();
                if (startMenu.Visible) startMenu.BringToFront();
                taskbar.BringToFront();
            };
            win.Tag = task;
            taskButtons.Controls.Add(task);
        }

        private Button WindowButton(string textValue)
        {
            var button = new Button
            {
                Width = 92,
                Height = 36,
                Text = textValue,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(34, 45, 66),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                Margin = new Padding(8, 8, 0, 0),
                Cursor = Cursors.Hand
            };
            button.FlatAppearance.BorderSize = 0;
            return button;
        }

        // Tells the desktop carousel WebView to release or resume the shared webcam
        // so that a camera-using app window (e.g. Cosmic Gesture) can acquire it.
        private void SetCarouselCamera(bool active)
        {
            try
            {
                if (carouselWebView != null && carouselWebView.CoreWebView2 != null)
                {
                    carouselWebView.CoreWebView2.PostWebMessageAsString(active ? "FUSION_CAMERA_RESUME" : "FUSION_CAMERA_RELEASE");
                    Debug.WriteLine("[FusionOS Camera] carousel " + (active ? "RESUME" : "RELEASE"));
                }
            }
            catch { }
        }

        private void CloseWindow(Control win)
        {
            var task = win.Tag as Button;
            if (task != null)
            {
                taskButtons.Controls.Remove(task);
                task.Dispose();
            }
            openWindows.Remove(win);
            desktop.Controls.Remove(win);
            win.Dispose();
        }

        private void ToggleStartMenu()
        {
            PositionStartMenu();
            startMenu.Visible = !startMenu.Visible;
            startMenu.BringToFront();
            taskbar.BringToFront();
        }

        private void PositionStartMenu()
        {
            if (startMenu == null)
            {
                return;
            }
            int bottom = taskbar == null ? ClientSize.Height : taskbar.Top;
            startMenu.Location = new Point(20, Math.Max(20, bottom - startMenu.Height - 12));
        }

        private void UpdateClock()
        {
            clockLabel.Text = DateTime.Now.ToString("HH:mm:ss\r\nyyyy/MM/dd");
        }

        private Color ColorFor(IconInfo info)
        {
            if (info.Glyph == "DEV") return accent;
            if (info.Glyph == "GAME") return accent2;
            if (info.Glyph == "DB") return Color.FromArgb(255, 190, 96);
            if (info.Glyph == "WEB") return Color.FromArgb(90, 190, 255);
            if (info.Glyph == "SET") return Color.FromArgb(150, 120, 255);
            if (info.Glyph == "88") return accent2;
            if (info.Glyph == "COS") return accent3;
            return accent;
        }

        private string L(string key)
        {
            bool zh = currentLanguage == "zh-TW";
            switch (key)
            {
                case "WindowTitle": return zh ? "FusionOS - 期末專案系統" : "FusionOS - Final Project Hub";
                case "SysButton": return zh ? "系統" : "SYS";
                case "Launcher": return zh ? "FusionOS 啟動器" : "FusionOS Launcher";
                case "AppRailSubtitle": return zh ? "側邊滾動 / 互動節點 / 立體卡片" : "side scroll / interactive nodes / depth cards";

                case "ThisPC": return zh ? "本機" : "This PC";
                case "ProjectFiles": return zh ? "專案檔案" : "Project Files";
                case "PianoStudio": return zh ? "鋼琴工作室" : "Piano Studio";
                case "CosmicGesture": return zh ? "宇宙手勢" : "Cosmic Gesture";
                case "UserFiles": return zh ? "使用者檔案" : "User Files";
                case "AddFile": return zh ? "新增檔案" : "Add File";
                case "LanguageLab": return zh ? "語言實驗室" : "Language Lab";
                case "ToolBox": return zh ? "工具箱" : "Tool Box";
                case "Database": return zh ? "資料庫" : "Database";
                case "WebZone": return zh ? "網頁區" : "Web Zone";
                case "GameRoom": return zh ? "遊戲室" : "Game Room";
                case "Terminal": return zh ? "終端機" : "Terminal";
                case "Settings": return zh ? "系統設定" : "Settings";

                case "ThisPCDesc": return zh ? "系統檔案管理與電腦資訊入口。" : "System file manager and computer information.";
                case "ProjectFilesDesc": return zh ? "存放舊作品與新作品的預設資料夾。" : "Default folder for all old and new school projects.";
                case "PianoStudioDesc": return zh ? "內建應用程式套件：IntegratedApps/PianoStudio。啟動鋼琴學習與音樂工具。" : "Integrated app package: IntegratedApps/PianoStudio.";
                case "CosmicGestureDesc": return zh ? "內建應用程式套件：IntegratedApps/CosmicGesture。啟動 Python + JavaScript 的 WebGL 宇宙手勢系統。" : "Integrated app package: IntegratedApps/CosmicGesture.";
                case "UserFilesDesc": return zh ? "執行時由使用者加入的檔案捷徑區。" : "A place for files added by the user during runtime.";
                case "AddFileDesc": return zh ? "選擇本機檔案並建立桌面捷徑。" : "Select a file and create a desktop shortcut.";
                case "LanguageLabDesc": return zh ? "預留 C#、Python、JavaScript、SQL、C++ 與多語言融合實驗區。" : "Reserved area for mixed-language experiments.";
                case "ToolBoxDesc": return zh ? "自動化、爬蟲、API、轉檔、計算與資料工具。" : "Automation, crawler, API, converter, calculator, and data tools.";
                case "DatabaseDesc": return zh ? "預留 SQL、SQLite、資料表與分析專案。" : "Reserved space for SQL and data projects.";
                case "WebZoneDesc": return zh ? "預留 WebView、HTML、CSS、JavaScript 與網頁作品。" : "Reserved space for web pages and HTML/CSS/JS work.";
                case "GameRoomDesc": return zh ? "預留 Unity、Unreal、WinForms 小遊戲與視覺展示。" : "Reserved space for games and visual demos.";
                case "TerminalDesc": return zh ? "未來用來啟動腳本與外部程式的命令面板。" : "Future command panel for scripts and external programs.";
                case "SettingsDesc": return zh ? "管理系統語言、主題、路徑、應用登錄與啟動設定。" : "System theme, language, and launch settings.";

                case "FileManager": return zh ? "檔案管理員" : "File Manager";
                case "FileManagerDesc": return zh ? "瀏覽預設專案資料夾。" : "Browse default project folders.";
                case "AppRegistry": return zh ? "應用登錄" : "App Registry";
                case "AppRegistryDesc": return zh ? "保留每個作品模組的登錄清單。" : "Reserved list for every project module.";
                case "StartPianoDesc": return zh ? "從系統啟動 1113354_piano。" : "Launch 1113354_piano from the system.";
                case "StartCosmicDesc": return zh ? "啟動手勢控制的 3D 宇宙。" : "Launch the gesture-controlled 3D universe.";
                case "StartLanguageDesc": return zh ? "開啟語言整合工作區。" : "Open language integration workspace.";
                case "SystemSettings": return zh ? "系統設定" : "System Settings";
                case "SystemSettingsDesc": return zh ? "語言、主題、啟動、資料夾與路徑。" : "Theme, startup, folders, and paths.";
                case "AboutSystem": return zh ? "關於系統" : "About System";
                case "AboutSystemDesc": return zh ? "查看系統理念與專案方向。" : "Show the idea and project direction.";

                case "NewFileShortcut": return zh ? "新增檔案捷徑" : "New File Shortcut";
                case "RefreshDesktop": return zh ? "重新整理桌面" : "Refresh Desktop";
                case "SystemInfo": return zh ? "系統資訊" : "System Info";
                case "OpenProjectFolder": return zh ? "開啟專案資料夾" : "Open Project Folder";
                case "FusionOSInfo": return zh ? "FusionOS 資訊" : "FusionOS Info";
                case "FusionOSInfoBody": return zh ? "FusionOS canvas-first 桌面殼層\r\n特色：側邊滾動圖示列、透視背景、互動 Hero Stage、WebView 橋接。\r\n在圖示上按右鍵可使用開啟、資訊、位置、釘選、重新命名與刪除。" : "FusionOS canvas-first shell with side scroll icons and interactive hero stage.";

                case "Open": return zh ? "開啟" : "Open";
                case "Info": return zh ? "資訊" : "Info";
                case "OpenLocation": return zh ? "開啟位置" : "Open Location";
                case "PinToTaskbar": return zh ? "釘選到工作列" : "Pin to Taskbar";
                case "Rename": return zh ? "重新命名" : "Rename";
                case "Delete": return zh ? "刪除" : "Delete";
                case "Type": return zh ? "類型" : "Type";
                case "SystemEntry": return zh ? "系統項目" : "System entry";
                case "ApplicationOrFile": return zh ? "應用程式或檔案" : "Application or file";
                case "Location": return zh ? "位置" : "Location";
                case "VirtualDesktop": return zh ? "FusionOS 虛擬桌面" : "FusionOS virtual desktop";
                case "VirtualNoFolder": return zh ? "這是虛擬系統項目，目前尚未有實體資料夾。" : "This is a virtual system item. It does not have a real folder yet.";
                case "ProtectedDelete": return zh ? "這是受保護的系統項目。目前可以整理或重新命名，但不能刪除。" : "This is a protected system item.";
                case "DefaultEntryBody": return zh ? "這是預設系統項目。之後可以接上作品、開啟資料夾、啟動腳本，或顯示完整頁面。" : "This is a default system entry.";
                case "ReservedAppBody": return zh ? "這是預留的系統應用。之後可以替換成真正的 UserControl 或獨立 Form。" : "This page is a reserved system app.";

                case "AddFileDialogTitle": return zh ? "新增檔案到 FusionOS 桌面" : "Add file to FusionOS desktop";
                case "AllFilesFilter": return zh ? "所有檔案 (*.*)|*.*" : "All files (*.*)|*.*";
                case "UserFilePath": return zh ? "使用者檔案路徑" : "User file path";
                case "PianoMissingBody": return zh ? "鋼琴專案套件已放在期末專案內，但找不到可執行檔。\r\n\r\n預期套件：\r\nIntegratedApps\\PianoStudio\r\n\r\n請先建置專案，再重新開啟鋼琴工作室。" : "The piano executable was not found.";
                case "PianoLaunchError": return zh ? "鋼琴工作室啟動錯誤" : "Piano Studio Launch Error";
                case "PianoLaunchErrorBody": return zh ? "FusionOS 找到內建鋼琴可執行檔，但 Windows 無法啟動。" : "FusionOS found the integrated piano executable, but Windows could not launch it.";
                case "CosmicMissingBody": return zh ? "宇宙手勢套件已登錄，但找不到 server.py。\r\n\r\n預期位置：\r\nIntegratedApps\\CosmicGesture\\server.py" : "server.py was not found.";
                case "PythonMissingBody": return zh ? "這個應用需要 Python 來啟動本機伺服器，但系統找不到 py、python 或 python3 命令。請安裝 Python 或把 Python 加入 PATH。" : "This app needs Python to start the local server.";
                case "CosmicLaunchError": return zh ? "宇宙手勢啟動錯誤" : "Cosmic Gesture Launch Error";
                case "CosmicLaunchErrorBody": return zh ? "FusionOS 找到宇宙手勢套件，但無法啟動 Python 伺服器。" : "FusionOS found Cosmic Gesture, but could not start the Python server.";
                case "Executable": return zh ? "可執行檔" : "Executable";
                case "Error": return zh ? "錯誤" : "Error";

                case "OpenLater": return zh ? "稍後開啟" : "Open Later";
                case "Pin": return zh ? "釘選" : "Pin";
                case "Details": return zh ? "詳細資料" : "Details";
                case "NewName": return zh ? "新名稱：" : "New name:";
                case "OK": return zh ? "確定" : "OK";
                case "Cancel": return zh ? "取消" : "Cancel";
                case "Apply": return zh ? "套用" : "Apply";
                case "LanguageSettingsTitle": return zh ? "語言設定" : "Language Settings";
                case "Language": return zh ? "系統語言" : "Language";
                default: return key;
            }
        }

        private void OpenSettingsWindow()
        {
            using (var dialog = new Form())
            using (var language = new ComboBox())
            using (var apply = new Button())
            using (var cancel = new Button())
            using (var title = new Label())
            using (var languageLabel = new Label())
            {
                dialog.Text = L("SystemSettings");
                dialog.StartPosition = FormStartPosition.CenterParent;
                dialog.FormBorderStyle = FormBorderStyle.FixedDialog;
                dialog.MinimizeBox = false;
                dialog.MaximizeBox = false;
                dialog.ClientSize = new Size(420, 190);
                dialog.BackColor = Color.FromArgb(245, 245, 250);

                title.Text = L("LanguageSettingsTitle");
                title.Font = new Font("Microsoft JhengHei UI", 13F, FontStyle.Bold);
                title.Location = new Point(18, 18);
                title.Size = new Size(380, 34);

                languageLabel.Text = L("Language");
                languageLabel.Location = new Point(20, 70);
                languageLabel.Size = new Size(120, 26);

                language.DropDownStyle = ComboBoxStyle.DropDownList;
                language.Items.Add("繁體中文");
                language.Items.Add("English");
                language.SelectedIndex = currentLanguage == "zh-TW" ? 0 : 1;
                language.Location = new Point(145, 68);
                language.Size = new Size(230, 28);

                apply.Text = L("Apply");
                apply.Location = new Point(214, 132);
                apply.Size = new Size(80, 32);
                apply.DialogResult = DialogResult.OK;

                cancel.Text = L("Cancel");
                cancel.Location = new Point(306, 132);
                cancel.Size = new Size(80, 32);
                cancel.DialogResult = DialogResult.Cancel;

                dialog.Controls.Add(title);
                dialog.Controls.Add(languageLabel);
                dialog.Controls.Add(language);
                dialog.Controls.Add(apply);
                dialog.Controls.Add(cancel);
                dialog.AcceptButton = apply;
                dialog.CancelButton = cancel;

                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    currentLanguage = language.SelectedIndex == 0 ? "zh-TW" : "en";
                    BuildSystemDesktop();
                }
            }
        }

        private string PromptForText(string title, string prompt, string defaultValue)
        {
            using (var dialog = new Form())
            using (var input = new TextBox())
            using (var ok = new Button())
            using (var cancel = new Button())
            using (var label = new Label())
            {
                dialog.Text = title;
                dialog.StartPosition = FormStartPosition.CenterParent;
                dialog.FormBorderStyle = FormBorderStyle.FixedDialog;
                dialog.MinimizeBox = false;
                dialog.MaximizeBox = false;
                dialog.ClientSize = new Size(360, 138);
                dialog.BackColor = Color.FromArgb(245, 245, 250);

                label.Text = prompt;
                label.Location = new Point(16, 16);
                label.Size = new Size(328, 24);

                input.Text = defaultValue;
                input.Location = new Point(16, 44);
                input.Size = new Size(328, 26);

                ok.Text = L("OK");
                ok.Location = new Point(178, 92);
                ok.DialogResult = DialogResult.OK;

                cancel.Text = L("Cancel");
                cancel.Location = new Point(266, 92);
                cancel.DialogResult = DialogResult.Cancel;

                dialog.Controls.Add(label);
                dialog.Controls.Add(input);
                dialog.Controls.Add(ok);
                dialog.Controls.Add(cancel);
                dialog.AcceptButton = ok;
                dialog.CancelButton = cancel;

                return dialog.ShowDialog(this) == DialogResult.OK ? input.Text : null;
            }
        }

        private sealed class IconInfo
        {
            public IconInfo(string name, string glyph, string description, Action customAction, string sourcePath, bool canDelete)
            {
                Name = name;
                Glyph = glyph;
                Description = description;
                CustomAction = customAction;
                SourcePath = sourcePath;
                CanDelete = canDelete;
            }

            public string Name { get; set; }
            public string Glyph { get; private set; }
            public string Description { get; private set; }
            public Action CustomAction { get; private set; }
            public string SourcePath { get; private set; }
            public bool CanDelete { get; private set; }
        }
    }

    public class DesktopSurfacePanel : Panel
    {
        public Color TopColor { get; set; }
        public Color BottomColor { get; set; }
        public Color AccentColor { get; set; }
        public Color AccentColor2 { get; set; }

        public DesktopSurfacePanel()
        {
            DoubleBuffered = true;
            ResizeRedraw = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint, true);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            if (ClientRectangle.Width <= 0 || ClientRectangle.Height <= 0)
            {
                return;
            }

            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

            using (var brush = new LinearGradientBrush(ClientRectangle, TopColor, BottomColor, 45f))
            {
                e.Graphics.FillRectangle(brush, ClientRectangle);
            }

            DrawStars(e.Graphics);
            DrawPerspectiveGrid(e.Graphics);
            DrawDepthBlobs(e.Graphics);
            DrawAtmosphere(e.Graphics);
        }

        private void DrawStars(Graphics g)
        {
            using (var starBrush = new SolidBrush(Color.FromArgb(40, 255, 255, 255)))
            {
                for (int x = 0; x < Width; x += 45)
                {
                    for (int y = 0; y < Height; y += 40)
                    {
                        int size = ((x + y) / 45) % 4 == 0 ? 2 : 1;
                        g.FillEllipse(starBrush, x + ((y / 8) % 12), y + ((x / 10) % 12), size, size);
                    }
                }
            }
        }

        private void DrawPerspectiveGrid(Graphics g)
        {
            using (var pen = new Pen(Color.FromArgb(30, AccentColor), 1f))
            {
                int horizonY = Height / 3;
                for (int x = -Width; x < Width * 2; x += 48)
                {
                    g.DrawLine(pen, x, Height, Width / 2, horizonY);
                }
                for (int y = horizonY; y < Height; y += 38)
                {
                    float factor = (float)(y - horizonY) / (Height - horizonY);
                    int alpha = (int)(20 + factor * 40);
                    using (var gridPen = new Pen(Color.FromArgb(alpha, AccentColor), 1f))
                    {
                        int inset = (int)((1f - factor) * (Width / 3));
                        g.DrawLine(gridPen, inset, y, Width - inset, y);
                    }
                }
            }
        }

        private void DrawDepthBlobs(Graphics g)
        {
            using (var ellipseBrush1 = new SolidBrush(Color.FromArgb(25, AccentColor2)))
            using (var ellipseBrush2 = new SolidBrush(Color.FromArgb(20, AccentColor)))
            {
                g.FillEllipse(ellipseBrush1, -100, Height - 300, 600, 500);
                g.FillEllipse(ellipseBrush2, Width - 400, -100, 600, 600);
            }
        }

        private void DrawAtmosphere(Graphics g)
        {
            using (var brush = new LinearGradientBrush(ClientRectangle, Color.FromArgb(40, AccentColor), Color.Transparent, LinearGradientMode.Vertical))
            {
                g.FillRectangle(brush, new Rectangle(0, 0, Width, 150));
            }
        }
    }

    public class ScrollableFlowLayoutPanel : FlowLayoutPanel
    {
        public ScrollableFlowLayoutPanel()
        {
            DoubleBuffered = true;
            AutoScroll = true;
            TabStop = true;
            SetStyle(ControlStyles.OptimizedDoubleBuffer | ControlStyles.AllPaintingInWmPaint, true);
        }

        protected override void OnMouseWheel(MouseEventArgs e)
        {
            if (VerticalScroll.Visible)
            {
                int current = -AutoScrollPosition.Y;
                int next = current - e.Delta;
                next = Math.Max(VerticalScroll.Minimum, Math.Min(VerticalScroll.Maximum, next));
                AutoScrollPosition = new Point(0, next);
                Invalidate();
                return;
            }
            base.OnMouseWheel(e);
        }
    }

    public class RoundedPanel : Panel
    {
        public int Radius { get; set; }

        public RoundedPanel()
        {
            Radius = 18;
            DoubleBuffered = true;
            ResizeRedraw = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (var path = RoundRect(new Rectangle(0, 0, Math.Max(1, Width - 1), Math.Max(1, Height - 1)), Radius))
            using (var brush = new SolidBrush(BackColor))
            using (var pen = new Pen(Color.FromArgb(28, 160, 220, 255), 1f))
            {
                e.Graphics.FillPath(brush, path);
                e.Graphics.DrawPath(pen, path);
            }
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            using (var path = RoundRect(new Rectangle(0, 0, Math.Max(1, Width - 1), Math.Max(1, Height - 1)), Radius))
            {
                Region = new Region(path);
            }
        }

        private static GraphicsPath RoundRect(Rectangle bounds, int radius)
        {
            int d = Math.Max(2, radius * 2);
            var path = new GraphicsPath();
            var arc = new Rectangle(bounds.Left, bounds.Top, d, d);
            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - d;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - d;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    public class CanvasIconTile : Control
    {
        public event MouseEventHandler TitleClicked;

        private bool hovered;
        public string Title { get; set; }
        public string Glyph { get; set; }
        public string Description { get; set; }
        public Color AccentColor { get; set; }
        public Image IconImage { get; set; }

        public CanvasIconTile()
        {
            AccentColor = Color.FromArgb(77, 224, 207);
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            Cursor = Cursors.Hand;
            MouseEnter += delegate { hovered = true; Invalidate(); };
            MouseLeave += delegate { hovered = false; Invalidate(); };
            MouseUp += delegate (object sender, MouseEventArgs e) { if (TitleClicked != null) TitleClicked(this, e); };
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

            int lift = hovered ? -6 : 0;
            Rectangle body = new Rectangle(10, 8 + lift, Width - 22, Height - 20);
            
            // Neon Glow
            if (hovered)
            {
                using (var glowBrush = new SolidBrush(Color.FromArgb(30, AccentColor)))
                {
                    e.Graphics.FillEllipse(glowBrush, body.X - 10, body.Y - 10, body.Width + 20, body.Height + 20);
                }
            }

            using (var path = RoundRect(body, 20))
            using (var brush = new LinearGradientBrush(body, Color.FromArgb(140, 15, 23, 42), Color.FromArgb(100, 30, 41, 59), LinearGradientMode.Vertical))
            using (var pen = new Pen(Color.FromArgb(hovered ? 200 : 80, AccentColor), hovered ? 2f : 1f))
            {
                e.Graphics.FillPath(brush, path);
                e.Graphics.DrawPath(pen, path);
            }

            Rectangle iconBox = new Rectangle(body.X + 12, body.Y + 12, 58, 58);
            using (var iconPath = RoundRect(iconBox, 16))
            using (var iconBrush = new LinearGradientBrush(iconBox, Color.FromArgb(180, AccentColor), Color.FromArgb(60, AccentColor), LinearGradientMode.ForwardDiagonal))
            {
                e.Graphics.FillPath(iconBrush, iconPath);
            }

            if (IconImage != null)
            {
                e.Graphics.DrawImage(IconImage, new Rectangle(iconBox.X + 12, iconBox.Y + 12, iconBox.Width - 24, iconBox.Height - 24));
            }
            else
            {
                using (var glyphBrush = new SolidBrush(Color.White))
                using (var font = new Font(Font.FontFamily, Glyph != null && Glyph.Length <= 3 ? 12F : 9.5F, FontStyle.Bold))
                {
                    var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                    e.Graphics.DrawString(Glyph ?? "?", font, glyphBrush, iconBox, sf);
                }
            }

            using (var titleBrush = new SolidBrush(Color.FromArgb(248, 250, 252)))
            using (var subBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (var titleFont = new Font(Font.FontFamily, 11F, FontStyle.Bold))
            using (var subFont = new Font(Font.FontFamily, 8.5F, FontStyle.Regular))
            {
                Rectangle titleRect = new Rectangle(iconBox.Right + 12, body.Y + 16, body.Width - 85, 24);
                Rectangle subRect = new Rectangle(iconBox.Right + 12, body.Y + 42, body.Width - 90, 30);
                e.Graphics.DrawString(Title ?? string.Empty, titleFont, titleBrush, titleRect);
                e.Graphics.DrawString(TrimLines(Description, 40), subFont, subBrush, subRect);
            }

            if (hovered)
            {
                using (var linePen = new Pen(Color.FromArgb(180, AccentColor), 2f))
                {
                    e.Graphics.DrawLine(linePen, body.Right - 30, body.Y + 20, body.Right - 15, body.Y + 20);
                }
            }
        }

        private static GraphicsPath RoundRect(Rectangle bounds, int radius)
        {
            int d = Math.Max(2, radius * 2);
            var path = new GraphicsPath();
            var arc = new Rectangle(bounds.Left, bounds.Top, d, d);
            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - d;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - d;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }

        private static Color Lighten(Color c, int amount)
        {
            return Color.FromArgb(c.A, Math.Min(255, c.R + amount), Math.Min(255, c.G + amount), Math.Min(255, c.B + amount));
        }

        private static string TrimLines(string input, int maxChars)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }
            string clean = input.Replace("\r", " ").Replace("\n", " ");
            if (clean.Length <= maxChars)
            {
                return clean;
            }
            return clean.Substring(0, maxChars - 1) + "…";
        }
    }

    public sealed class HeroNodeEventArgs : EventArgs
    {
        public HeroNodeEventArgs(string nodeKey)
        {
            NodeKey = nodeKey;
        }

        public string NodeKey { get; private set; }
    }

    public sealed class DesktopShortcutInfo
    {
        public string Key { get; set; }
        public string Title { get; set; }
        public string Glyph { get; set; }
        public string Description { get; set; }
        public Color AccentColor { get; set; }
        public Image IconImage { get; set; }
        public object Tag { get; set; }
        public bool IsUserFile { get; set; }
    }

    public class HeroStagePanel : Control
    {
        public event EventHandler<HeroNodeEventArgs> NodeClicked;

        public string Title { get; set; }
        public string Subtitle { get; set; }
        public Color AccentColor { get; set; }
        public Color AccentColor2 { get; set; }
        public Color AccentColor3 { get; set; }

        private readonly List<DesktopShortcutInfo> shortcuts = new List<DesktopShortcutInfo>();
        private readonly Dictionary<string, Rectangle> nodeRects = new Dictionary<string, Rectangle>();
        private Point mousePoint;
        private Point lastInvalidatedMouse;
        private DateTime lastMouseInvalidate = DateTime.MinValue;
        private int stageScroll;

        public HeroStagePanel()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor | ControlStyles.Selectable, true);
            BackColor = Color.Transparent;
            TabStop = true;
            mousePoint = new Point(240, 180);
            MouseMove += HeroStagePanel_MouseMove;
            MouseLeave += delegate { mousePoint = new Point(Width / 2, Height / 2); Invalidate(); };
            MouseUp += HeroStagePanel_MouseUp;
            MouseDown += delegate { Focus(); };
            MouseEnter += delegate { Focus(); };
            MouseWheel += HeroStagePanel_MouseWheel;
        }

        public void SetShortcuts(IList<DesktopShortcutInfo> source)
        {
            shortcuts.Clear();
            if (source != null)
            {
                foreach (DesktopShortcutInfo item in source)
                {
                    shortcuts.Add(item);
                }
            }
            ClampScroll();
            Invalidate();
        }

        private void HeroStagePanel_MouseWheel(object sender, MouseEventArgs e)
        {
            int direction = e.Delta > 0 ? -1 : 1;
            stageScroll += direction * 54;
            ClampScroll();
            Invalidate();
        }

        private void ClampScroll()
        {
            int rows = Math.Max(1, (shortcuts.Count + 3) / 4);
            int maxScroll = Math.Max(0, rows * 86 - Math.Max(180, Height - 300));
            if (stageScroll < 0) stageScroll = 0;
            if (stageScroll > maxScroll) stageScroll = maxScroll;
        }

        private void HeroStagePanel_MouseUp(object sender, MouseEventArgs e)
        {
            foreach (var pair in nodeRects)
            {
                if (pair.Value.Contains(e.Location))
                {
                    if (NodeClicked != null)
                    {
                        NodeClicked(this, new HeroNodeEventArgs(pair.Key));
                    }
                    return;
                }
            }
        }

        private void HeroStagePanel_MouseMove(object sender, MouseEventArgs e)
        {
            mousePoint = e.Location;
            int dx = e.X - lastInvalidatedMouse.X;
            int dy = e.Y - lastInvalidatedMouse.Y;
            if (Math.Abs(dx) + Math.Abs(dy) > 18 || (DateTime.Now - lastMouseInvalidate).TotalMilliseconds > 75)
            {
                lastInvalidatedMouse = e.Location;
                lastMouseInvalidate = DateTime.Now;
                Invalidate();
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
            nodeRects.Clear();
            ClampScroll();

            float parallaxX = Width == 0 ? 0f : (mousePoint.X - Width / 2f) / Width;
            float parallaxY = Height == 0 ? 0f : (mousePoint.Y - Height / 2f) / Height;

            DrawSideViewScreen(e.Graphics, parallaxX, parallaxY);
            DrawDesktopPlane(e.Graphics, parallaxX, parallaxY);
            DrawSystemRail(e.Graphics, parallaxX, parallaxY);
            DrawHint(e.Graphics);
        }

        private void DrawSideViewScreen(Graphics g, float px, float py)
        {
            Rectangle screen = new Rectangle(40, 32, Width - 160, Math.Max(360, Height - 92));
            
            // Outer HUD Frame
            using (var pen = new Pen(Color.FromArgb(40, AccentColor), 1f))
            {
                g.DrawRectangle(pen, screen);
                g.DrawLine(pen, screen.Left, screen.Top + 40, screen.Right, screen.Top + 40);
            }

            Point[] backPlane = {
                new Point(screen.Left + 46 + (int)(px * 22), screen.Top - 18 + (int)(py * 12)),
                new Point(screen.Right + 22 + (int)(px * 18), screen.Top + 10 + (int)(py * 10)),
                new Point(screen.Right - 22 + (int)(px * 8), screen.Bottom + 18 + (int)(py * 6)),
                new Point(screen.Left + 4 + (int)(px * 12), screen.Bottom - 4 + (int)(py * 8))
            };
            Point[] frontPlane = {
                new Point(screen.Left + (int)(px * 16), screen.Top + (int)(py * 8)),
                new Point(screen.Right - 20 + (int)(px * 14), screen.Top + 22 + (int)(py * 7)),
                new Point(screen.Right - 64 + (int)(px * 7), screen.Bottom + (int)(py * 4)),
                new Point(screen.Left - 10 + (int)(px * 10), screen.Bottom - 22 + (int)(py * 6))
            };

            FillPolygon(g, backPlane, Color.FromArgb(30, AccentColor3), Color.FromArgb(10, AccentColor), Color.FromArgb(60, AccentColor3));
            FillPolygon(g, frontPlane, Color.FromArgb(60, 15, 23, 42), Color.FromArgb(40, 30, 41, 59), Color.FromArgb(100, AccentColor2));

            using (var titleFont = new Font(Font.FontFamily, 32F, FontStyle.Bold))
            using (var subFont = new Font(Font.FontFamily, 10F, FontStyle.Bold))
            using (var titleBrush = new SolidBrush(Color.FromArgb(255, 255, 255)))
            using (var subBrush = new SolidBrush(AccentColor))
            {
                g.DrawString(Title ?? string.Empty, titleFont, titleBrush, screen.Left + 44, screen.Top + 48);
                g.DrawString(Subtitle ?? string.Empty, subFont, subBrush, new RectangleF(screen.Left + 48, screen.Top + 104, screen.Width - 120, 30));
            }

            // Pipeline Visualization
            int chipY = screen.Top + 150;
            DrawChip(g, new Rectangle(screen.Left + 48, chipY, 110, 34), "HTML NODE", AccentColor);
            DrawChip(g, new Rectangle(screen.Left + 168, chipY, 110, 34), "SNAPSHOT", AccentColor2);
            DrawChip(g, new Rectangle(screen.Left + 288, chipY, 120, 34), "CANVAS PAINT", AccentColor3);
            DrawChip(g, new Rectangle(screen.Left + 418, chipY, 125, 34), "WEBGL TEXTURE", Color.FromArgb(160, 190, 255));
            DrawChip(g, new Rectangle(screen.Left + 553, chipY, 110, 34), "3D SURFACE", Color.FromArgb(34, 211, 238));

            // Connection Lines
            using (var p = new Pen(Color.FromArgb(100, AccentColor), 1.5f))
            {
                p.DashStyle = DashStyle.Dash;
                g.DrawLine(p, screen.Left + 158, chipY + 17, screen.Left + 168, chipY + 17);
                g.DrawLine(p, screen.Left + 278, chipY + 17, screen.Left + 288, chipY + 17);
                g.DrawLine(p, screen.Left + 408, chipY + 17, screen.Left + 418, chipY + 17);
                g.DrawLine(p, screen.Left + 543, chipY + 17, screen.Left + 553, chipY + 17);
            }

            // Central Core Glow
            using (var haloPen = new Pen(Color.FromArgb(60, AccentColor), 2f))
            using (var haloBrush = new SolidBrush(Color.FromArgb(30, AccentColor2)))
            {
                int cx = screen.Right - 180 + (int)(px * 25);
                int cy = screen.Top + 240 + (int)(py * 20);
                g.DrawEllipse(haloPen, cx - 120, cy - 120, 240, 240);
                g.FillEllipse(haloBrush, cx - 80, cy - 80, 160, 160);
                
                using (var coreFont = new Font(Font.FontFamily, 14F, FontStyle.Bold))
                {
                    var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                    g.DrawString("FUSION\nCORE", coreFont, Brushes.White, new Rectangle(cx-100, cy-100, 200, 200), sf);
                }
            }
        }

        private void DrawDesktopPlane(Graphics g, float px, float py)
        {
            int planeTop = Math.Max(286, Height / 2 - 26);
            int planeBottom = Height - 36;
            int left = 92;
            int right = Width - 250;
            if (right <= left + 240)
            {
                right = Width - 90;
            }

            Point[] plane = {
                new Point(left + 26 + (int)(px * 14), planeTop + (int)(py * 6)),
                new Point(right - 18 + (int)(px * 12), planeTop + 26 + (int)(py * 4)),
                new Point(right + 28 + (int)(px * 5), planeBottom + (int)(py * 2)),
                new Point(left - 38 + (int)(px * 8), planeBottom - 10 + (int)(py * 3))
            };
            FillPolygon(g, plane, Color.FromArgb(32, 36, 43, 112), Color.FromArgb(18, 16, 22, 64), Color.FromArgb(54, AccentColor3));
            DrawPlaneGrid(g, planeTop, planeBottom, left, right, px);

            DrawShortcutCards(g, planeTop, left, right, px, py);
        }

        private void DrawShortcutCards(Graphics g, int planeTop, int left, int right, float px, float py)
        {
            int columns = 4;
            int cardW = Math.Max(138, Math.Min(176, (right - left - 90) / columns));
            int cardH = 76;
            int gapX = Math.Max(20, (right - left - columns * cardW) / (columns + 1));
            int baseY = planeTop + 44 - stageScroll;

            for (int i = 0; i < shortcuts.Count; i++)
            {
                DesktopShortcutInfo shortcut = shortcuts[i];
                int col = i % columns;
                int row = i / columns;
                int rawX = left + gapX + col * (cardW + gapX);
                int rawY = baseY + row * 96;

                float depth = 1f + row * 0.055f;
                int x = rawX + (int)(row * 22) + (int)(px * (12 + row * 3));
                int y = rawY + (int)(col * 5) + (int)(py * (10 + row * 2));
                int w = (int)(cardW * Math.Max(0.72f, 1f - row * 0.025f));
                int h = (int)(cardH * Math.Max(0.72f, 1f - row * 0.02f));

                Rectangle bounds = new Rectangle(x, y, w, h);
                if (bounds.Bottom < planeTop + 14 || bounds.Top > Height - 18)
                {
                    continue;
                }

                DrawShortcutCard(g, shortcut, bounds, row, i == 0 || shortcut.IsUserFile);
                nodeRects[shortcut.Key] = bounds;
            }

            if (shortcuts.Count == 0)
            {
                using (var brush = new SolidBrush(Color.FromArgb(170, 200, 212, 240)))
                using (var font = new Font(Font.FontFamily, 12F, FontStyle.Bold))
                {
                    g.DrawString("用左側新增檔案，檔案會成為這個 3D 桌面的卡片。", font, brush, left + 30, planeTop + 60);
                }
            }
        }

        private void DrawShortcutCard(Graphics g, DesktopShortcutInfo shortcut, Rectangle rect, int depthIndex, bool emphasize)
        {
            int skew = 12 + Math.Min(20, depthIndex * 3);
            Point[] poly = {
                new Point(rect.Left + skew, rect.Top),
                new Point(rect.Right, rect.Top + 8),
                new Point(rect.Right - skew, rect.Bottom),
                new Point(rect.Left, rect.Bottom - 8)
            };

            using (var shadow = new SolidBrush(Color.FromArgb(48, 0, 0, 0)))
            {
                Point[] shadowPoly = {
                    new Point(poly[0].X + 10, poly[0].Y + 12),
                    new Point(poly[1].X + 10, poly[1].Y + 12),
                    new Point(poly[2].X + 8, poly[2].Y + 14),
                    new Point(poly[3].X + 8, poly[3].Y + 14)
                };
                g.FillPolygon(shadow, shadowPoly);
            }

            Color edge = shortcut.AccentColor;
            using (var brush = new LinearGradientBrush(rect, Color.FromArgb(emphasize ? 135 : 105, 10, 18, 34), Color.FromArgb(72, edge), LinearGradientMode.ForwardDiagonal))
            using (var pen = new Pen(Color.FromArgb(emphasize ? 150 : 90, edge), emphasize ? 2f : 1.4f))
            {
                g.FillPolygon(brush, poly);
                g.DrawPolygon(pen, poly);
            }

            Rectangle iconRect = new Rectangle(rect.Left + skew + 10, rect.Top + 14, 38, 38);
            using (var iconGlow = new SolidBrush(Color.FromArgb(38, edge)))
            using (var iconPen = new Pen(Color.FromArgb(130, edge), 1.4f))
            {
                g.FillEllipse(iconGlow, iconRect);
                g.DrawEllipse(iconPen, iconRect);
            }

            if (shortcut.IconImage != null)
            {
                g.DrawImage(shortcut.IconImage, new Rectangle(iconRect.X + 8, iconRect.Y + 8, iconRect.Width - 16, iconRect.Height - 16));
            }
            else
            {
                using (var glyphFont = new Font(Font.FontFamily, shortcut.Glyph != null && shortcut.Glyph.Length <= 3 ? 10.5F : 8F, FontStyle.Bold))
                using (var glyphBrush = new SolidBrush(Color.White))
                {
                    g.DrawString(shortcut.Glyph ?? "?", glyphFont, glyphBrush, iconRect, new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center });
                }
            }

            using (var titleBrush = new SolidBrush(Color.FromArgb(246, 250, 255)))
            using (var subBrush = new SolidBrush(Color.FromArgb(160, 178, 210)))
            using (var titleFont = new Font(Font.FontFamily, 9.5F, FontStyle.Bold))
            using (var subFont = new Font(Font.FontFamily, 7.5F, FontStyle.Regular))
            {
                Rectangle titleRect = new Rectangle(iconRect.Right + 9, rect.Top + 16, rect.Width - 70, 20);
                Rectangle subRect = new Rectangle(iconRect.Right + 9, rect.Top + 40, rect.Width - 78, 24);
                g.DrawString(Trim(shortcut.Title, 16), titleFont, titleBrush, titleRect);
                g.DrawString(shortcut.IsUserFile ? "桌面檔案 / click open" : Trim(shortcut.Description, 32), subFont, subBrush, subRect);
            }
        }

        private void DrawSystemRail(Graphics g, float px, float py)
        {
            int x = Width - 210 + (int)(px * 18);
            int y = 88 + (int)(py * 14);
            DrawNodeCard(g, new Rectangle(x, y, 160, 76), "cosmic", "宇宙手勢", "WebView app", AccentColor3);
            DrawNodeCard(g, new Rectangle(x - 44, y + 98, 170, 78), "web", "網頁區", "browser zone", AccentColor);
            DrawNodeCard(g, new Rectangle(x + 12, y + 198, 160, 78), "piano", "鋼琴工作室", "built-in app", AccentColor2);
            DrawNodeCard(g, new Rectangle(x - 72, y + 296, 176, 78), "settings", "系統設定", "theme / paths", Color.FromArgb(163, 133, 255));
        }

        private void DrawNodeCard(Graphics g, Rectangle rect, string key, string title, string subtitle, Color accent)
        {
            Point[] poly = {
                new Point(rect.Left + 12, rect.Top),
                new Point(rect.Right, rect.Top + 8),
                new Point(rect.Right - 14, rect.Bottom),
                new Point(rect.Left, rect.Bottom - 8)
            };

            using (var brush = new LinearGradientBrush(rect, Color.FromArgb(110, 10, 18, 34), Color.FromArgb(50, accent), LinearGradientMode.ForwardDiagonal))
            using (var pen = new Pen(Color.FromArgb(96, accent), 1.4f))
            using (var shadow = new SolidBrush(Color.FromArgb(35, 0, 0, 0)))
            {
                Point[] shadowPoly = {
                    new Point(poly[0].X + 9, poly[0].Y + 11),
                    new Point(poly[1].X + 9, poly[1].Y + 11),
                    new Point(poly[2].X + 7, poly[2].Y + 13),
                    new Point(poly[3].X + 7, poly[3].Y + 13)
                };
                g.FillPolygon(shadow, shadowPoly);
                g.FillPolygon(brush, poly);
                g.DrawPolygon(pen, poly);
            }

            using (var titleBrush = new SolidBrush(Color.FromArgb(245, 250, 255)))
            using (var subBrush = new SolidBrush(Color.FromArgb(158, 176, 208)))
            using (var titleFont = new Font(Font.FontFamily, 9.5F, FontStyle.Bold))
            using (var subFont = new Font(Font.FontFamily, 8F, FontStyle.Regular))
            {
                g.DrawString(title, titleFont, titleBrush, rect.Left + 48, rect.Top + 16);
                g.DrawString(subtitle, subFont, subBrush, rect.Left + 48, rect.Top + 38);
            }

            Rectangle dot = new Rectangle(rect.Left + 16, rect.Top + 19, 26, 26);
            using (var b = new SolidBrush(Color.FromArgb(42, accent)))
            using (var p = new Pen(Color.FromArgb(140, accent), 1.3f))
            {
                g.FillEllipse(b, dot);
                g.DrawEllipse(p, dot);
            }
            nodeRects[key] = rect;
        }

        private void DrawPlaneGrid(Graphics g, int top, int bottom, int left, int right, float px)
        {
            using (var pen = new Pen(Color.FromArgb(26, AccentColor3), 1f))
            {
                int horizonX = left + (right - left) / 2 + (int)(px * 24);
                for (int i = -8; i <= 8; i++)
                {
                    int x = left + (right - left) * (i + 8) / 16;
                    g.DrawLine(pen, horizonX, top, x + i * 20, bottom);
                }
                for (int y = top + 18; y < bottom; y += 24)
                {
                    int inset = (y - top) / 3;
                    g.DrawLine(pen, left - inset, y, right + inset, y + 10);
                }
            }
        }

        private void DrawHint(Graphics g)
        {
            using (var brush = new SolidBrush(Color.FromArgb(166, 190, 208, 235)))
            using (var font = new Font(Font.FontFamily, 8.8F, FontStyle.Bold))
            {
                string hint = "滑鼠移動：視差  /  滾輪：桌面卡片深度捲動  /  點擊卡片：開啟  /  右鍵桌面：新增檔案";
                g.DrawString(hint, font, brush, 56, Height - 32);
            }
        }

        private void DrawChip(Graphics g, Rectangle rect, string text, Color accent)
        {
            using (var path = RoundRect(rect, 16))
            using (var brush = new LinearGradientBrush(rect, Color.FromArgb(72, accent), Color.FromArgb(28, accent), LinearGradientMode.Horizontal))
            using (var pen = new Pen(Color.FromArgb(110, accent), 1.2f))
            using (var font = new Font(Font.FontFamily, 8.3F, FontStyle.Bold))
            {
                g.FillPath(brush, path);
                g.DrawPath(pen, path);
                g.DrawString(text, font, Brushes.White, rect, new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center });
            }
        }

        private static void FillPolygon(Graphics g, Point[] poly, Color c1, Color c2, Color penColor)
        {
            Rectangle bounds = GetBounds(poly);
            using (var brush = new LinearGradientBrush(bounds, c1, c2, LinearGradientMode.ForwardDiagonal))
            using (var pen = new Pen(penColor, 1.4f))
            using (var shadow = new SolidBrush(Color.FromArgb(26, 0, 0, 0)))
            {
                Point[] shadowPoly = new Point[poly.Length];
                for (int i = 0; i < poly.Length; i++)
                {
                    shadowPoly[i] = new Point(poly[i].X + 10, poly[i].Y + 12);
                }
                g.FillPolygon(shadow, shadowPoly);
                g.FillPolygon(brush, poly);
                g.DrawPolygon(pen, poly);
            }
        }

        private static Rectangle GetBounds(Point[] points)
        {
            int minX = points[0].X;
            int maxX = points[0].X;
            int minY = points[0].Y;
            int maxY = points[0].Y;
            for (int i = 1; i < points.Length; i++)
            {
                minX = Math.Min(minX, points[i].X);
                maxX = Math.Max(maxX, points[i].X);
                minY = Math.Min(minY, points[i].Y);
                maxY = Math.Max(maxY, points[i].Y);
            }
            return new Rectangle(minX, minY, Math.Max(1, maxX - minX), Math.Max(1, maxY - minY));
        }

        private static string Trim(string input, int length)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }
            string value = input.Replace("\r", " ").Replace("\n", " ");
            if (value.Length <= length)
            {
                return value;
            }
            return value.Substring(0, Math.Max(1, length - 1)) + "…";
        }

        private static GraphicsPath RoundRect(Rectangle bounds, int radius)
        {
            int d = Math.Max(2, radius * 2);
            var path = new GraphicsPath();
            var arc = new Rectangle(bounds.Left, bounds.Top, d, d);
            path.AddArc(arc, 180, 90);
            arc.X = bounds.Right - d;
            path.AddArc(arc, 270, 90);
            arc.Y = bounds.Bottom - d;
            path.AddArc(arc, 0, 90);
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

}
