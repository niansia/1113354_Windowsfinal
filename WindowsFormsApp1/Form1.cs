using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
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
        private readonly ToolTip windowToolTips = new ToolTip();
        private readonly List<Control> openWindows = new List<Control>();
        private readonly Dictionary<Control, FusionAppWindow> appWindows = new Dictionary<Control, FusionAppWindow>();
        private readonly Dictionary<Control, float> baseFontSizes = new Dictionary<Control, float>();
        private readonly Dictionary<string, int> externalAppRunCounts = new Dictionary<string, int>();

        // Live system metrics pushed to the React frontend (本機 / This PC page).
        private PerformanceCounter cpuCounter;
        private Timer metricsTimer;
        private readonly List<DesktopShortcutInfo> desktopShortcuts = new List<DesktopShortcutInfo>();
        private FusionAppWindow activeApp;
        private int shortcutSerial;
        private int windowOffset;
        private string currentLanguage = "zh-TW";
        private Process cosmicServerProcess;
        private int cameraAppWindowCount = 0;
        private bool nativeWarmupStarted;
        private string terminalWorkingDirectoryCache;
        private Font terminalOutputFont;
        private Font terminalInputFont;
        private const bool UseViteDevServer = false;

        // ---- Browser-like controls (zoom / fullscreen / devtools) ----
        private bool isFullscreen = false;
        private FormBorderStyle prevBorderStyle;
        private FormWindowState prevWindowState;
        private Rectangle prevBounds;
        private static readonly bool RunNativeCameraSmokeTest = false;

        // ---- System-level boot mode ----
        private bool isBooting = false;
        private bool bootDoneReceived = false;
        private bool frontendErrorToastShown = false;
        private System.Windows.Forms.Timer bootTimeoutTimer;

        // ---- Collapsible sidebar ----
        private int railWidth = 250;
        private bool railExpanded = true;
        private int railTargetWidth = 250;
        private System.Windows.Forms.Timer railAnimTimer;
        private Label railTitleLabel;
        private Label railSubtitleLabel;
        private const int RailExpandedWidth = 250;
        private const int RailCollapsedWidth = 76;

        private const double AppZoomMin = 0.5;
        private const double AppZoomMax = 2.5;
        private const double AppZoomStep = 0.1;
        private static readonly bool ReactOwnsShell = true;
        private static readonly bool WindowedDevMode = string.Equals(
            Environment.GetEnvironmentVariable("FUSION_WINDOWED_DEV"),
            "1",
            StringComparison.OrdinalIgnoreCase
        );

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        private const int SW_RESTORE = 9;
        private const int SW_MINIMIZE = 6;
        private const int SW_MAXIMIZE = 3;

        public Form1()
        {
            InitializeComponent();
            ConfigureHostWindowMode();
            BuildSystemDesktop();
        }

        private void ConfigureHostWindowMode()
        {
            StartPosition = FormStartPosition.CenterScreen;
            if (!ReactOwnsShell || WindowedDevMode) return;

            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            MinimumSize = new Size(960, 640);
            isFullscreen = true;
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
            MouseWheel -= Form1_MouseWheel;
            MouseWheel += Form1_MouseWheel;

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
            desktop.MouseWheel += Form1_MouseWheel;

            BuildTaskbar();
            BuildLeftRail();
            BuildHeroStage();
            BuildStartMenu();
            if (ReactOwnsShell) SetNativeShellVisible(false);

            // Enter system-level boot mode BEFORE the first layout: the WebView fills
            // the whole client area and the shell (rail/taskbar/start menu) stays hidden
            // until React posts FUSION_BOOT_DONE.
            EnterSystemBootMode();
            BeginNativeBootWarmup();
            LayoutShell();

            Resize += delegate
            {
                LayoutShell();
            };
        }

        // ===================== System Boot Mode =====================
        private void EnterSystemBootMode()
        {
            isBooting = true;
            bootDoneReceived = false;
            ApplyBootLayout();

            // Safety net: if React never reports BOOT_DONE, reveal the desktop anyway.
            bootTimeoutTimer = new System.Windows.Forms.Timer { Interval = 35000 };
            bootTimeoutTimer.Tick += delegate
            {
                Debug.WriteLine("[FusionOS] Boot timeout fallback, revealing desktop.");
                CompleteSystemBoot();
            };
            bootTimeoutTimer.Start();
        }

        // Fullscreen boot layout: shell hidden, WebView covers the entire client area.
        private void ApplyBootLayout()
        {
            SetNativeShellVisible(false);
            if (heroStage != null) heroStage.Visible = false;

            if (carouselWebView != null)
            {
                carouselWebView.Visible = true;
                carouselWebView.Dock = DockStyle.Fill;
                carouselWebView.BringToFront();
            }
        }

        // Called when React reports boot completion (or on timeout). Restores the shell
        // and the hero-stage WebView WITHOUT re-navigating or re-initializing anything.
        private void CompleteSystemBoot()
        {
            if (!isBooting || bootDoneReceived) return;
            isBooting = false;
            bootDoneReceived = true;

            if (bootTimeoutTimer != null)
            {
                bootTimeoutTimer.Stop();
                bootTimeoutTimer.Dispose();
                bootTimeoutTimer = null;
            }

            SuspendLayout();

            SetNativeShellVisible(!ReactOwnsShell);

            if (carouselWebView != null)
            {
                carouselWebView.Dock = ReactOwnsShell ? DockStyle.Fill : DockStyle.None;
                carouselWebView.Visible = true;
            }

            LayoutShell();          // now isBooting == false => normal hero-stage layout
            ResumeLayout(true);

            if (!ReactOwnsShell)
            {
                leftRail?.BringToFront();
                taskbar?.BringToFront();
            }
            Debug.WriteLine("[FusionOS] System boot complete, desktop revealed.");

            // Tell React the shell + hero-stage layout are FINAL, so it performs the
            // single clean reveal (no intermediate state). Small delay lets the WebView
            // finish resizing/painting at hero-stage size first.
            var readyTimer = new System.Windows.Forms.Timer { Interval = 130 };
            readyTimer.Tick += delegate
            {
                readyTimer.Stop();
                readyTimer.Dispose();
                PostSidebarLayout(false);
                try { carouselWebView?.CoreWebView2?.PostWebMessageAsString("FUSION_SHELL_READY"); } catch { }
                PostHostFullscreenChanged();
            };
            readyTimer.Start();
        }

        private void SetNativeShellVisible(bool visible)
        {
            if (leftRail != null) leftRail.Visible = visible;
            if (taskbar != null) taskbar.Visible = visible;
            if (startMenu != null) startMenu.Visible = false;
        }

        // ===================== Collapsible sidebar =====================
        private void ToggleSidebar()
        {
            railExpanded = !railExpanded;
            railTargetWidth = railExpanded ? RailExpandedWidth : RailCollapsedWidth;
            PostSidebarLayout(true);
            if (railAnimTimer == null)
            {
                railAnimTimer = new System.Windows.Forms.Timer { Interval = 15 };
                railAnimTimer.Tick += RailAnimTick;
            }
            railAnimTimer.Start();
        }

        private void RailAnimTick(object sender, EventArgs e)
        {
            int diff = railTargetWidth - railWidth;
            bool done = Math.Abs(diff) <= 2;
            railWidth = done ? railTargetWidth : railWidth + (int)Math.Round(diff * 0.32);

            // Lightweight per-tick update only: rail width + rail visuals.
            // Do not resize WebView2 here; high-frequency host resize causes
            // visible flashes in the WinForms WebView2 surface.
            if (leftRail != null) leftRail.Width = railWidth;
            ApplyRailCompactState(false);

            if (done)
            {
                railAnimTimer.Stop();
                UpdateShelfScrollSize();
                PostSidebarLayout(false);
            }
        }

        // Legacy fallback host layout. The real React WebView uses a stable full
        // shell work area and receives sidebar safe-area messages instead.
        private void UpdateHeroBounds()
        {
            if (leftRail == null || taskbar == null) return;
            int x = leftRail.Right + 18;
            int y = 22;
            int rightMargin = 28;
            int bottomLimit = taskbar.Top - 18;
            int width = Math.Max(620, ClientSize.Width - x - rightMargin);
            int height = Math.Max(420, bottomLimit - y);
            if (heroStage != null) heroStage.Bounds = new Rectangle(x, y, width, height);
        }

        private Rectangle HomeWebViewBounds()
        {
            if (ReactOwnsShell)
            {
                return new Rectangle(0, 0, Math.Max(320, ClientSize.Width), Math.Max(260, ClientSize.Height));
            }
            int bottom = taskbar == null || !taskbar.Visible ? ClientSize.Height : taskbar.Top;
            return new Rectangle(0, 0, Math.Max(320, ClientSize.Width), Math.Max(260, bottom));
        }

        private void PostSidebarLayout(bool useTargetWidth)
        {
            if (carouselWebView == null || carouselWebView.CoreWebView2 == null) return;
            int width = ReactOwnsShell ? 0 : (useTargetWidth ? railTargetWidth : railWidth);
            string json =
                "{\"type\":\"FUSION_SIDEBAR_LAYOUT\",\"payload\":{" +
                "\"expanded\":" + (!ReactOwnsShell && railExpanded ? "true" : "false") + "," +
                "\"width\":" + width + "," +
                "\"compactWidth\":" + RailCollapsedWidth + "," +
                "\"expandedWidth\":" + RailExpandedWidth +
                "}}";
            try { carouselWebView.CoreWebView2.PostWebMessageAsString(json); } catch { }
        }

        private static string JsonEscape(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            return value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "\\r").Replace("\n", "\\n");
        }

        private void PostAppLaunchStatus(string appId, string status, string message)
        {
            if (carouselWebView == null || carouselWebView.CoreWebView2 == null) return;
            string json =
                "{\"type\":\"FUSION_APP_LAUNCH_STATUS\",\"payload\":{" +
                "\"appId\":\"" + JsonEscape(appId) + "\"," +
                "\"status\":\"" + JsonEscape(status) + "\"," +
                "\"message\":\"" + JsonEscape(message) + "\"" +
                "}}";
            try { carouselWebView.CoreWebView2.PostWebMessageAsString(json); } catch { }
        }

        private void BeginNativeBootWarmup()
        {
            if (nativeWarmupStarted) return;
            nativeWarmupStarted = true;

            try
            {
                terminalOutputFont = new Font("Consolas", 10.5F);
                terminalInputFont = new Font("Consolas", 11F);
            }
            catch
            {
                terminalOutputFont = new Font(Font.FontFamily, 10.5F);
                terminalInputFont = new Font(Font.FontFamily, 11F);
            }

            ScheduleWarmTerminalControls();

            Task.Run(delegate
            {
                try
                {
                    terminalWorkingDirectoryCache = ResolveTerminalWorkingDirectory();
                    WarmTerminalShell("cmd.exe", "/d /s /c ver>nul");
                    WarmTerminalShell("powershell.exe", "-NoLogo -NoProfile -ExecutionPolicy Bypass -Command \"$PSVersionTable.PSVersion.ToString() | Out-Null\"");
                }
                catch
                {
                }
            });
        }

        private void ScheduleWarmTerminalControls()
        {
            if (IsDisposed) return;
            if (IsHandleCreated)
            {
                try { BeginInvoke((Action)WarmTerminalControls); }
                catch { }
                return;
            }

            EventHandler handler = null;
            handler = delegate
            {
                HandleCreated -= handler;
                if (IsDisposed || !IsHandleCreated) return;
                try { BeginInvoke((Action)WarmTerminalControls); }
                catch { }
            };
            HandleCreated += handler;
        }

        private void WarmTerminalControls()
        {
            try
            {
                using (var panel = new TableLayoutPanel())
                using (var input = new TextBox())
                using (var output = new TextBox())
                using (var button = new Button())
                {
                    panel.ColumnCount = 2;
                    panel.RowCount = 2;
                    input.Font = terminalInputFont ?? Font;
                    output.Multiline = true;
                    output.Font = terminalOutputFont ?? Font;
                    button.FlatStyle = FlatStyle.Flat;
                    panel.Controls.Add(input, 0, 0);
                    panel.Controls.Add(button, 1, 0);
                    panel.Controls.Add(output, 0, 1);
                    panel.PerformLayout();
                }
            }
            catch
            {
            }
        }

        private void WarmTerminalShell(string fileName, string arguments)
        {
            try
            {
                using (var process = new Process())
                {
                    process.StartInfo = new ProcessStartInfo
                    {
                        FileName = fileName,
                        Arguments = arguments,
                        WorkingDirectory = terminalWorkingDirectoryCache ?? Environment.CurrentDirectory,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };
                    process.Start();
                    if (!process.WaitForExit(1600))
                    {
                        try { process.Kill(); } catch { }
                    }
                }
            }
            catch
            {
            }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MEMORYSTATUSEX
        {
            public uint dwLength;
            public uint dwMemoryLoad;
            public ulong ullTotalPhys;
            public ulong ullAvailPhys;
            public ulong ullTotalPageFile;
            public ulong ullAvailPageFile;
            public ulong ullTotalVirtual;
            public ulong ullAvailVirtual;
            public ulong ullAvailExtendedVirtual;
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

        // Start pushing real CPU / RAM / disk usage to the React 本機 page every second.
        private void StartSystemMetrics()
        {
            if (metricsTimer != null) return;
            try
            {
                cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                cpuCounter.NextValue(); // priming read (the first value is always 0)
            }
            catch { cpuCounter = null; }

            metricsTimer = new Timer { Interval = 1000 };
            metricsTimer.Tick += delegate { PostSystemMetrics(); };
            metricsTimer.Start();
        }

        private void PostSystemMetrics()
        {
            if (carouselWebView == null || carouselWebView.CoreWebView2 == null) return;
            try
            {
                var ci = System.Globalization.CultureInfo.InvariantCulture;

                double cpu = -1;
                if (cpuCounter != null)
                {
                    try { cpu = Math.Round(cpuCounter.NextValue(), 1); } catch { cpu = -1; }
                }

                double ramPct = 0, ramUsed = 0, ramTotal = 0;
                var mem = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX)) };
                if (GlobalMemoryStatusEx(ref mem))
                {
                    ramTotal = mem.ullTotalPhys / 1073741824.0;
                    ramUsed = (mem.ullTotalPhys - mem.ullAvailPhys) / 1073741824.0;
                    ramPct = mem.dwMemoryLoad;
                }

                double diskUsed = 0, diskTotal = 0;
                try
                {
                    string root = Path.GetPathRoot(Environment.SystemDirectory) ?? "C:\\";
                    var drive = new DriveInfo(root);
                    if (drive.IsReady)
                    {
                        diskTotal = drive.TotalSize / 1073741824.0;
                        diskUsed = (drive.TotalSize - drive.AvailableFreeSpace) / 1073741824.0;
                    }
                }
                catch { }

                string json =
                    "{\"type\":\"FUSION_SYS_METRICS\",\"payload\":{" +
                    "\"cpu\":" + cpu.ToString(ci) + "," +
                    "\"ramPct\":" + ramPct.ToString(ci) + "," +
                    "\"ramUsed\":" + ramUsed.ToString("0.00", ci) + "," +
                    "\"ramTotal\":" + ramTotal.ToString("0.00", ci) + "," +
                    "\"diskUsed\":" + diskUsed.ToString("0", ci) + "," +
                    "\"diskTotal\":" + diskTotal.ToString("0", ci) +
                    "}}";
                carouselWebView.CoreWebView2.PostWebMessageAsString(json);
            }
            catch { }
        }

        private void PostActiveAppChanged(FusionAppWindow app)
        {
            if (carouselWebView == null || carouselWebView.CoreWebView2 == null || app == null) return;
            string json =
                "{\"type\":\"FUSION_ACTIVE_APP_CHANGED\",\"payload\":{" +
                "\"title\":\"" + JsonEscape(app.Title) + "\"," +
                "\"kind\":\"" + JsonEscape(app.Kind) + "\"" +
                "}}";
            try { carouselWebView.CoreWebView2.PostWebMessageAsString(json); } catch { }
        }

        // Adapt the rail contents to the current width: icon-only tiles + hidden
        // header text when narrow.
        private void ApplyRailCompactState(bool updateScroll = true)
        {
            bool compact = railWidth < 150;
            if (railTitleLabel != null && railTitleLabel.Visible == compact) railTitleLabel.Visible = !compact;
            if (railSubtitleLabel != null && railSubtitleLabel.Visible == compact) railSubtitleLabel.Visible = !compact;

            if (iconRail != null)
            {
                int tileW = Math.Max(56, railWidth - 34);
                foreach (Control c in iconRail.Controls)
                {
                    var tile = c as CanvasIconTile;
                    if (tile != null)
                    {
                        tile.Compact = compact;
                        int desiredWidth = compact ? 56 : tileW;
                        if (tile.Width != desiredWidth) tile.Width = desiredWidth;
                    }
                }
                if (updateScroll) UpdateShelfScrollSize();
            }
        }

        private void Form1_MouseWheel(object sender, MouseEventArgs e)
        {
            if ((ModifierKeys & Keys.Control) != Keys.Control)
            {
                return;
            }

            ZoomActiveApp(e.Delta > 0 ? AppZoomStep : -AppZoomStep);
        }


        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            if (HandleAppShortcut(e.KeyData))
            {
                e.SuppressKeyPress = true;
                e.Handled = true;
                return;
            }

            if (e.KeyCode == Keys.Escape && activeApp != null)
            {
                if (activeApp.IsFullscreen)
                {
                    ToggleAppFullscreen(activeApp);
                }
                else
                {
                    CloseWindow(activeApp.Window);
                }
                e.Handled = true;
            }
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (HandleAppShortcut(keyData))
            {
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private bool HandleAppShortcut(Keys keyData)
        {
            bool ctrl = (keyData & Keys.Control) == Keys.Control;
            Keys key = keyData & Keys.KeyCode;

            if (key == Keys.F5)
            {
                RefreshActiveApp();
                return true;
            }
            if (key == Keys.F11)
            {
                ToggleActiveFullscreen();
                return true;
            }
            if (key == Keys.F12)
            {
                OpenActiveDevTools();
                return true;
            }
            if (key == Keys.Escape && activeApp != null && activeApp.IsFullscreen)
            {
                ToggleAppFullscreen(activeApp);
                return true;
            }
            if (ctrl && (key == Keys.Oemplus || key == Keys.Add))
            {
                ZoomActiveApp(AppZoomStep);
                return true;
            }
            if (ctrl && (key == Keys.OemMinus || key == Keys.Subtract))
            {
                ZoomActiveApp(-AppZoomStep);
                return true;
            }
            if (ctrl && (key == Keys.D0 || key == Keys.NumPad0))
            {
                ResetActiveAppZoom();
                return true;
            }

            return false;
        }

        private void LayoutShell()
        {
            // During system boot the WebView fills everything and the shell stays hidden.
            if (isBooting)
            {
                ApplyBootLayout();
                return;
            }

            if (ReactOwnsShell)
            {
                SetNativeShellVisible(false);
                PositionHeroStage();
                foreach (FusionAppWindow app in appWindows.Values)
                {
                    if (app.Window == null || app.Window.IsDisposed) continue;
                    if (app.IsFullscreen)
                    {
                        app.Window.Bounds = AppWorkArea(true);
                    }
                    else if (app.IsMaximized)
                    {
                        app.Window.Bounds = AppWorkArea(false);
                    }
                    app.Window.BringToFront();
                }
                PostHostFullscreenChanged();
                return;
            }

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
                leftRail.Size = new Size(railWidth, Math.Max(360, ClientSize.Height - (taskbar == null ? 82 : taskbar.Height) - 40));
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

            foreach (FusionAppWindow app in appWindows.Values)
            {
                if (app.Window == null || app.Window.IsDisposed) continue;
                if (app.IsFullscreen)
                {
                    app.Window.Bounds = AppWorkArea(true);
                    app.Window.BringToFront();
                }
                else if (app.IsMaximized)
                {
                    app.Window.Bounds = AppWorkArea(false);
                }
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

            var hamburger = new HamburgerButton
            {
                Location = new Point(6, 20),
                Size = new Size(42, 38),
                AccentColor = accent,
                Cursor = Cursors.Hand
            };
            hamburger.Click += delegate { ToggleSidebar(); };
            header.Controls.Add(hamburger);
            hamburger.BringToFront();

            railTitleLabel = new Label
            {
                Location = new Point(56, 4),
                Size = new Size(180, 32),
                Text = "FUSION OS",
                ForeColor = accent,
                Font = new Font(Font.FontFamily, 17F, FontStyle.Bold)
            };
            header.Controls.Add(railTitleLabel);

            railSubtitleLabel = new Label
            {
                Location = new Point(56, 42),
                Size = new Size(180, 34),
                Text = "SPATIAL DESKTOP",
                ForeColor = accent2,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold)
            };
            header.Controls.Add(railSubtitleLabel);

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
            AddDesktopIcon(L("MultimediaStudio"), "VID", L("MultimediaStudioDesc"), Color.FromArgb(88, 220, 255), LaunchMultimediaStudio);
            AddDesktopIcon(L("WaveStudio"), "WAV", L("WaveStudioDesc"), Color.FromArgb(120, 235, 218), LaunchWaveStudio);
            AddDesktopIcon(L("CosmicGesture"), "COS", L("CosmicGestureDesc"), Color.FromArgb(103, 125, 255), LaunchCosmicGesture);
            AddDesktopIcon(L("UserFiles"), "USR", L("UserFilesDesc"), Color.FromArgb(86, 214, 255));
            AddDesktopIcon(L("AddFile"), "+", L("AddFileDesc"), Color.FromArgb(130, 165, 255), AddUserFile);
            AddDesktopIcon(L("LanguageLab"), "DEV", L("LanguageLabDesc"), accent);
            AddDesktopIcon(L("ToolBox"), "TOOL", L("ToolBoxDesc"), Color.FromArgb(255, 129, 142));
            AddDesktopIcon(L("Database"), "DB", L("DatabaseDesc"), Color.FromArgb(255, 206, 138));
            AddDesktopIcon(L("WebZone"), "WEB", L("WebZoneDesc"), Color.FromArgb(119, 187, 255));
            AddDesktopIcon(L("GameRoom"), "GAME", L("GameRoomDesc"), accent2);
            AddDesktopIcon(L("Terminal"), "CMD", L("TerminalDesc"), Color.FromArgb(112, 226, 188), OpenFusionTerminal);
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
            apps.Controls.Add(StartItem(L("MultimediaStudio"), L("StartMultimediaDesc"), Color.FromArgb(88, 220, 255)));
            apps.Controls.Add(StartItem(L("WaveStudio"), L("StartWaveDesc"), Color.FromArgb(120, 235, 218)));
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

                // Dark default background so the boot screen never flashes white before React paints.
                try { carouselWebView.DefaultBackgroundColor = Color.FromArgb(255, 3, 5, 14); } catch { }

                // WebView2 Settings
                carouselWebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                carouselWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                ApplyWebViewBrowserShortcuts(carouselWebView);
                
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

                string frontendGuardScript = @"
(() => {
  if (window.__fusionFrontendGuardInstalled) return;
  window.__fusionFrontendGuardInstalled = true;
  const post = (payload) => {
    try {
      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(payload);
      }
    } catch (_) {}
  };
  post({ type: 'FUSION_FRONTEND_ALIVE', href: location.href, readyState: document.readyState });
  window.addEventListener('DOMContentLoaded', () => {
    post({ type: 'FUSION_FRONTEND_DOM_READY', href: location.href, readyState: document.readyState });
  });
  window.addEventListener('error', (event) => {
    post({
      type: 'FUSION_FRONTEND_ERROR',
      kind: 'error',
      message: event.message || '',
      source: event.filename || '',
      line: event.lineno || 0,
      column: event.colno || 0
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    post({
      type: 'FUSION_FRONTEND_ERROR',
      kind: 'promise',
      message: reason && reason.message ? reason.message : String(reason || '')
    });
  });
})();
";
                await carouselWebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(frontendGuardScript);

                carouselWebView.CoreWebView2.ProcessFailed += (sender, args) =>
                {
                    Debug.WriteLine("[FusionOS WebView2 ProcessFailed] Kind=" + args.ProcessFailedKind + ", Reason=" + args.Reason);
                    if (!frontendErrorToastShown && IsHandleCreated)
                    {
                        frontendErrorToastShown = true;
                        BeginInvoke((Action)(() => ShowToast("前端啟動失敗，請查看 Visual Studio 輸出視窗", accent2)));
                    }
                };
                
                carouselWebView.CoreWebView2.NavigationStarting += (s, e) => {
                    Debug.WriteLine($"[FusionOS NavigationStarting] URL={e.Uri}");
                };

                carouselWebView.CoreWebView2.NavigationCompleted += async (s, e) => {
                    Debug.WriteLine($"[FusionOS NavigationCompleted] Success={e.IsSuccess}, Status={e.WebErrorStatus}");
                    
                    if (!e.IsSuccess)
                    {
                        if (!frontendErrorToastShown && IsHandleCreated)
                        {
                            frontendErrorToastShown = true;
                            BeginInvoke((Action)(() => ShowToast("前端載入失敗：" + e.WebErrorStatus, accent2)));
                        }
                        return;
                    }

                    if (!RunNativeCameraSmokeTest) return;

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

                // Begin streaming real CPU / RAM / disk usage to the 本機 page.
                StartSystemMetrics();

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
                    frontendErrorToastShown = false;
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

                if (string.IsNullOrEmpty(message)) message = TryReadStringWebMessage(e);
                if (string.IsNullOrEmpty(message)) return;

                string lower = message.ToLower();

                if (lower.Contains("fusion_frontend_alive") || lower.Contains("fusion_frontend_dom_ready"))
                {
                    Debug.WriteLine("[FusionOS Frontend] " + message);
                }

                if (lower.Contains("fusion_frontend_error"))
                {
                    Debug.WriteLine("[FusionOS Frontend Error] " + message);
                    if (!frontendErrorToastShown)
                    {
                        frontendErrorToastShown = true;
                        ShowToast("前端發生錯誤，請查看 Visual Studio 輸出視窗", accent2);
                    }
                    return;
                }

                // System-level boot completion from React.
                if (lower.Contains("fusion_boot_done") || lower.Contains("\"boot_done\""))
                {
                    if (IsHandleCreated) BeginInvoke((Action)CompleteSystemBoot);
                    else CompleteSystemBoot();
                    return;
                }

                if (lower.Contains("fusion_desktop_action"))
                {
                    HandleFusionDesktopAction(lower);
                    return;
                }

                if (lower.Contains("launch_app"))
                {
                    if (lower.Contains("\"piano\"") || lower.Contains("\"88\"")) LaunchPianoStudio();
                    else if (lower.Contains("\"media\"") || lower.Contains("\"vid\"")) LaunchMultimediaStudio();
                    else if (lower.Contains("\"wav\"") || lower.Contains("\"wave\"")) LaunchWaveStudio();
                    else if (lower.Contains("\"cosmic\"") || lower.Contains("\"cos\"")) LaunchCosmicGesture();
                    else if (lower.Contains("\"cmd\"") || lower.Contains("\"terminal\"")) OpenFusionTerminal();
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
            if (e.NodeKey == "media")
            {
                LaunchMultimediaStudio();
                return;
            }
            if (e.NodeKey == "wav")
            {
                LaunchWaveStudio();
                return;
            }
            if (e.NodeKey == "cmd" || e.NodeKey == "terminal")
            {
                OpenFusionTerminal();
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
            // Boot mode: keep the WebView fullscreen instead of insetting it.
            if (isBooting)
            {
                ApplyBootLayout();
                return;
            }

            if (ReactOwnsShell)
            {
                if (heroStage != null) heroStage.Visible = false;
                if (carouselWebView != null)
                {
                    carouselWebView.Dock = DockStyle.Fill;
                    carouselWebView.Visible = true;
                    carouselWebView.BringToFront();
                    PostSidebarLayout(false);
                }
                return;
            }

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
                Rectangle bounds = HomeWebViewBounds();
                if (carouselWebView.Bounds != bounds)
                {
                    carouselWebView.Bounds = bounds;
                }
                carouselWebView.BringToFront();
                PostSidebarLayout(false);
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
                if (name == L("MultimediaStudio"))
                {
                    LaunchMultimediaStudio();
                    return;
                }
                if (name == L("WaveStudio"))
                {
                    LaunchWaveStudio();
                    return;
                }
                if (name == L("CosmicGesture"))
                {
                    LaunchCosmicGesture();
                    return;
                }
                if (name == L("Terminal"))
                {
                    OpenFusionTerminal();
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

            OpenSystemWindow(info.Name, info.Description + "\r\n\r\n" + L("DefaultEntryBody"), ColorFor(info), AppIdForIcon(info));
            PostAppLaunchStatus(AppIdForIcon(info), "open", info.Name + " 已開啟");
        }

        private string AppIdForIcon(IconInfo info)
        {
            if (info == null || string.IsNullOrEmpty(info.Glyph)) return "system";
            switch (info.Glyph.ToUpperInvariant())
            {
                case "PC": return "pc";
                case "DIR": return "dir";
                case "88": return "piano";
                case "VID": return "media";
                case "WAV": return "wav";
                case "COS": return "cosmic";
                case "USR": return "user";
                case "+": return "add";
                case "DEV": return "dev";
                case "TOOL": return "tool";
                case "DB": return "db";
                case "WEB": return "web";
                case "GAME": return "game";
                case "CMD": return "cmd";
                case "SET": return "set";
                default: return info.Glyph.ToLowerInvariant();
            }
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
            if (info.Glyph == "VID")
            {
                return FindProjectDirectory(Path.Combine("IntegratedApps", "MultimediaStudio"));
            }
            if (info.Glyph == "WAV")
            {
                return FindProjectDirectory(Path.Combine("IntegratedApps", "WaveStudio"));
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

        private void HandleFusionDesktopAction(string lowerMessage)
        {
            if (string.IsNullOrEmpty(lowerMessage)) return;

            try
            {
                if (lowerMessage.Contains("new-folder"))
                {
                    CreateFusionDesktopItem("folder");
                }
                else if (lowerMessage.Contains("new-text"))
                {
                    CreateFusionDesktopItem("text");
                }
                else if (lowerMessage.Contains("new-markdown"))
                {
                    CreateFusionDesktopItem("markdown");
                }
                else if (lowerMessage.Contains("new-html"))
                {
                    CreateFusionDesktopItem("html");
                }
                else if (lowerMessage.Contains("new-csharp"))
                {
                    CreateFusionDesktopItem("csharp");
                }
                else if (lowerMessage.Contains("new-shortcut"))
                {
                    AddUserFile();
                }
                else if (lowerMessage.Contains("open-folder"))
                {
                    OpenFusionDesktopFolder();
                }
                else if (lowerMessage.Contains("view-contents"))
                {
                    OpenFusionDesktopContents();
                }
                else if (lowerMessage.Contains("properties"))
                {
                    OpenFusionDesktopProperties();
                }
                else if (lowerMessage.Contains("refresh") || lowerMessage.Contains("sort-name"))
                {
                    desktop.Invalidate();
                    if (heroStage != null) heroStage.Invalidate();
                    ShowToast("Desktop refreshed", accent);
                }
            }
            catch (Exception ex)
            {
                ShowToast("Desktop action failed: " + ex.Message, Color.FromArgb(255, 148, 168));
                PostAppLaunchStatus("dir", "error", "Desktop action failed");
            }
        }

        private string GetFusionDesktopDirectory()
        {
            string projectFile = FindProjectFile("WindowsFormsApp1.csproj");
            string projectRoot = !string.IsNullOrEmpty(projectFile) ? Path.GetDirectoryName(projectFile) : Environment.CurrentDirectory;
            string folder = Path.Combine(projectRoot, "FusionDesktop");
            Directory.CreateDirectory(folder);
            return folder;
        }

        private static string NextAvailablePath(string folder, string baseName, string extension)
        {
            string path = Path.Combine(folder, baseName + extension);
            int index = 2;
            while (File.Exists(path) || Directory.Exists(path))
            {
                path = Path.Combine(folder, baseName + " (" + index + ")" + extension);
                index++;
            }
            return path;
        }

        private void CreateFusionDesktopItem(string kind)
        {
            string folder = GetFusionDesktopDirectory();
            string path;
            string glyph;
            bool isFolder = false;

            switch (kind)
            {
                case "folder":
                    path = NextAvailablePath(folder, "New Folder", string.Empty);
                    Directory.CreateDirectory(path);
                    glyph = "DIR";
                    isFolder = true;
                    break;
                case "markdown":
                    path = NextAvailablePath(folder, "New Markdown", ".md");
                    File.WriteAllText(path, "# New Markdown\r\n", new UTF8Encoding(false));
                    glyph = "MD";
                    break;
                case "html":
                    path = NextAvailablePath(folder, "New Page", ".html");
                    File.WriteAllText(path, "<!doctype html>\r\n<html lang=\"en\">\r\n<head>\r\n  <meta charset=\"utf-8\">\r\n  <title>New Page</title>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n", new UTF8Encoding(false));
                    glyph = "WEB";
                    break;
                case "csharp":
                    path = NextAvailablePath(folder, "NewClass", ".cs");
                    File.WriteAllText(path, "using System;\r\n\r\npublic class NewClass\r\n{\r\n}\r\n", new UTF8Encoding(false));
                    glyph = "CS";
                    break;
                default:
                    path = NextAvailablePath(folder, "New Text Document", ".txt");
                    File.WriteAllText(path, string.Empty, new UTF8Encoding(false));
                    glyph = "TXT";
                    break;
            }

            string displayName = Path.GetFileName(path);
            AddDesktopIcon(displayName, glyph, "FusionDesktop item:\r\n" + path, Color.FromArgb(140, 220, 255), delegate
            {
                OpenPathWithShell(path);
            }, path, true);

            ShowToast("Created " + displayName, Color.FromArgb(112, 226, 188));
            PostAppLaunchStatus("dir", "open", "Created " + displayName);
            if (isFolder) desktop.Invalidate();
        }

        private void OpenPathWithShell(string path)
        {
            if (string.IsNullOrEmpty(path)) return;
            Process.Start(new ProcessStartInfo
            {
                FileName = path,
                UseShellExecute = true
            });
        }

        private void OpenFusionDesktopFolder()
        {
            OpenPathWithShell(GetFusionDesktopDirectory());
        }

        private void OpenFusionDesktopContents()
        {
            string folder = GetFusionDesktopDirectory();
            var body = new StringBuilder();
            body.AppendLine("Location: " + folder);
            body.AppendLine();

            string[] directories = Directory.GetDirectories(folder);
            string[] files = Directory.GetFiles(folder);
            if (directories.Length == 0 && files.Length == 0)
            {
                body.AppendLine("No desktop items yet.");
            }
            else
            {
                Array.Sort(directories, StringComparer.OrdinalIgnoreCase);
                Array.Sort(files, StringComparer.OrdinalIgnoreCase);

                int shown = 0;
                foreach (string directory in directories)
                {
                    if (shown >= 24) break;
                    body.AppendLine("[Folder] " + Path.GetFileName(directory));
                    shown++;
                }
                foreach (string file in files)
                {
                    if (shown >= 24) break;
                    var info = new FileInfo(file);
                    body.AppendLine("[File] " + info.Name + "  " + FormatByteSize(info.Length));
                    shown++;
                }
                if (directories.Length + files.Length > shown)
                {
                    body.AppendLine("...");
                }
            }

            OpenSystemWindow("FusionDesktop Contents", body.ToString(), Color.FromArgb(112, 226, 188), "dir");
        }

        private void OpenFusionDesktopProperties()
        {
            string folder = GetFusionDesktopDirectory();
            int fileCount = 0;
            int folderCount = 0;
            long bytes = 0;

            try
            {
                foreach (string directory in Directory.GetDirectories(folder, "*", SearchOption.AllDirectories))
                {
                    folderCount++;
                }
                foreach (string file in Directory.GetFiles(folder, "*", SearchOption.AllDirectories))
                {
                    fileCount++;
                    try { bytes += new FileInfo(file).Length; } catch { }
                }
            }
            catch { }

            string body =
                "Type: Fusion desktop folder\r\n" +
                "Location: " + folder + "\r\n" +
                "Folders: " + folderCount + "\r\n" +
                "Files: " + fileCount + "\r\n" +
                "Size: " + FormatByteSize(bytes) + "\r\n" +
                "Created: " + Directory.GetCreationTime(folder).ToString("yyyy-MM-dd HH:mm:ss");
            OpenSystemWindow("FusionDesktop Properties", body, Color.FromArgb(112, 226, 188), "dir");
        }

        private static string FormatByteSize(long bytes)
        {
            string[] units = { "B", "KB", "MB", "GB" };
            double value = Math.Max(0, bytes);
            int unit = 0;
            while (value >= 1024 && unit < units.Length - 1)
            {
                value /= 1024;
                unit++;
            }
            return value.ToString(unit == 0 ? "0" : "0.0") + " " + units[unit];
        }

        private void LaunchPianoStudio()
        {
            LaunchIntegratedExeApp("piano", "PianoStudio", "PianoStudio", accent2);
        }

        private void LaunchMultimediaStudio()
        {
            LaunchIntegratedExeApp("media", "MultimediaStudio", "MultimediaStudio", Color.FromArgb(88, 220, 255));
        }

        private void LaunchWaveStudio()
        {
            LaunchIntegratedExeApp("wav", "WaveStudio", "WaveStudio", Color.FromArgb(120, 235, 218));
        }

        private void LaunchIntegratedExeApp(string appId, string titleKey, string folderName, Color color)
        {
            string appRoot = FindProjectDirectory(Path.Combine("IntegratedApps", folderName));
            string exePath = appRoot == null ? null : FindFirstExe(appRoot);
            if (exePath == null)
            {
                ShowToast(L(titleKey) + " 找不到執行檔", color);
                PostAppLaunchStatus(appId, "error", L(titleKey) + " 找不到執行檔");
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
                Process process = Process.Start(startInfo);
                if (process != null)
                {
                    OpenExternalProcessWindow(L(titleKey), process, color, exePath);
                    TrackExternalAppProcess(appId, L(titleKey), process, color, exePath);
                }
            }
            catch (Exception)
            {
                ShowToast(L(titleKey) + " 啟動失敗", color);
                PostAppLaunchStatus(appId, "error", L(titleKey) + " 啟動失敗");
            }
        }

        private void TrackExternalAppProcess(string appId, string title, Process process, Color color, string exePath)
        {
            if (process == null) return;

            if (!externalAppRunCounts.ContainsKey(appId))
            {
                externalAppRunCounts[appId] = 0;
            }
            externalAppRunCounts[appId]++;
            PostAppLaunchStatus(appId, "open", exePath);

            bool completed = false;
            EventHandler exited = null;
            exited = delegate
            {
                if (completed) return;
                completed = true;
                Action complete = delegate { CompleteExternalAppProcess(appId, title, process, color); };
                if (!IsDisposed && IsHandleCreated)
                {
                    try { BeginInvoke(complete); }
                    catch { complete(); }
                }
                else
                {
                    complete();
                }
            };

            try
            {
                process.EnableRaisingEvents = true;
                process.Exited += exited;
                if (process.HasExited)
                {
                    exited(process, EventArgs.Empty);
                }
            }
            catch
            {
                PostAppLaunchStatus(appId, "closed", title + " closed");
            }
        }

        private void CompleteExternalAppProcess(string appId, string title, Process process, Color color)
        {
            int remaining = 0;
            if (externalAppRunCounts.ContainsKey(appId))
            {
                remaining = Math.Max(0, externalAppRunCounts[appId] - 1);
                if (remaining == 0) externalAppRunCounts.Remove(appId);
                else externalAppRunCounts[appId] = remaining;
            }

            if (remaining == 0)
            {
                PostAppLaunchStatus(appId, "closed", title + " closed");
            }

            try { process.Dispose(); } catch { }
        }

        private async void LaunchCosmicGesture()
        {
            string appRoot = FindProjectDirectory(Path.Combine("IntegratedApps", "CosmicGesture"));
            string serverPath = appRoot == null ? null : Path.Combine(appRoot, "server.py");
            if (serverPath == null || !File.Exists(serverPath))
            {
                ShowToast(L("CosmicGesture") + " 找不到 server.py", accent3);
                PostAppLaunchStatus("cosmic", "error", "找不到 Cosmic Gesture server.py");
                return;
            }

            bool serverReady = await IsCosmicServerReadyAsync();
            if (!serverReady)
            {
                string python = FindPythonCommand();
                if (python == null)
                {
                    ShowToast(L("CosmicGesture") + " 需要 Python 才能啟動", accent3);
                    PostAppLaunchStatus("cosmic", "error", "找不到 Python");
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
                catch (Exception)
                {
                    ShowToast(L("CosmicGesture") + " 啟動失敗", accent3);
                    PostAppLaunchStatus("cosmic", "error", "Cosmic Gesture 伺服器啟動失敗");
                    return;
                }
            }

            if (!serverReady)
            {
                ShowToast(L("CosmicGesture") + " 伺服器尚未就緒", accent3);
                PostAppLaunchStatus("cosmic", "error", "Cosmic Gesture 伺服器尚未就緒");
                return;
            }

            PostAppLaunchStatus("cosmic", "open", "Cosmic Gesture WebView 開啟中");
            OpenWebAppWindow(L("CosmicGesture"), "http://127.0.0.1:8765/?host=fusionos", accent3, ownsCamera: true, kind: "cosmic");
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

        private FusionAppWindow RegisterAppWindow(string title, Control win, Panel header, Label titleLabel, Color color, string kind)
        {
            var app = new FusionAppWindow
            {
                Title = title,
                Kind = kind,
                Window = win,
                Header = header,
                TitleLabel = titleLabel,
                AccentColor = color,
                RestoreBounds = new Rectangle(win.Location, win.Size),
                ZoomFactor = 1.0
            };
            appWindows[win] = app;
            win.Disposed += delegate
            {
                appWindows.Remove(win);
                baseFontSizes.Clear();
                if (object.ReferenceEquals(activeApp, app)) activeApp = null;
                PostAppLaunchStatus(app.Kind, "closed", app.Title + " closed");
            };
            AttachActivation(win, app);
            AddWindowControlStrip(header, app);
            SetActiveApp(app);
            return app;
        }

        private void AttachActivation(Control control, FusionAppWindow app)
        {
            control.MouseDown += delegate { SetActiveApp(app); };
            control.Enter += delegate { SetActiveApp(app); };
            control.GotFocus += delegate { SetActiveApp(app); };
            control.ControlAdded += delegate (object sender, ControlEventArgs e)
            {
                AttachActivation(e.Control, app);
            };
            foreach (Control child in control.Controls)
            {
                AttachActivation(child, app);
            }
        }

        private void AddWindowControlStrip(Panel header, FusionAppWindow app)
        {
            var strip = new FlowLayoutPanel
            {
                Dock = DockStyle.Right,
                Width = 292,
                Height = header.Height,
                Padding = new Padding(0, 8, 10, 8),
                Margin = new Padding(0),
                FlowDirection = FlowDirection.LeftToRight,
                WrapContents = false,
                BackColor = Color.Transparent
            };
            header.Controls.Add(strip);
            strip.BringToFront();

            strip.Controls.Add(HeaderButton("R", "Refresh", delegate { RefreshApp(app); }));
            strip.Controls.Add(HeaderButton("_", "Minimize", delegate { MinimizeApp(app); }));
            app.MaximizeButton = HeaderButton("[]", "Maximize", delegate { ToggleMaximizeApp(app); });
            strip.Controls.Add(app.MaximizeButton);
            app.FullscreenButton = HeaderButton("[ ]", "Fullscreen", delegate { ToggleAppFullscreen(app); });
            strip.Controls.Add(app.FullscreenButton);
            strip.Controls.Add(HeaderButton("<>", "DevTools / Status", delegate { OpenDevTools(app); }));
            strip.Controls.Add(HeaderButton("X", "Close", delegate { CloseWindow(app.Window); }, true));
        }

        private Button HeaderButton(string glyph, string tip, EventHandler click, bool danger = false)
        {
            var button = new Button
            {
                Width = glyph.Length > 1 ? 38 : 34,
                Height = 32,
                Text = glyph,
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                BackColor = danger ? Color.FromArgb(210, 190, 44, 76) : Color.FromArgb(108, 21, 35, 60),
                Font = new Font(Font.FontFamily, glyph.Length > 1 ? 8F : 11F, FontStyle.Bold),
                Margin = new Padding(3, 0, 0, 0),
                Cursor = Cursors.Hand,
                TabStop = false
            };
            button.FlatAppearance.BorderSize = 1;
            button.FlatAppearance.BorderColor = danger ? Color.FromArgb(255, 248, 113, 141) : Color.FromArgb(110, accent);
            button.FlatAppearance.MouseOverBackColor = danger ? Color.FromArgb(240, 255, 82, 120) : Color.FromArgb(130, 34, 211, 238);
            button.Click += click;
            windowToolTips.SetToolTip(button, tip);
            return button;
        }

        private void SetActiveApp(FusionAppWindow app)
        {
            if (app == null || app.Window == null || app.Window.IsDisposed)
            {
                return;
            }

            activeApp = app;
            app.Window.BringToFront();
            if (startMenu != null && startMenu.Visible) startMenu.BringToFront();
            if (taskbar != null && !app.IsFullscreen) taskbar.BringToFront();

            foreach (FusionAppWindow item in appWindows.Values)
            {
                if (item.TaskButton == null) continue;
                bool active = object.ReferenceEquals(item, app);
                item.TaskButton.BackColor = active ? Color.FromArgb(56, 88, 130) : Color.FromArgb(36, 49, 78);
                item.TaskButton.FlatAppearance.BorderColor = active ? accent : Color.FromArgb(36, 49, 78);
            }
            PostActiveAppChanged(app);
        }

        private FusionAppWindow GetActiveApp()
        {
            if (activeApp != null && activeApp.Window != null && !activeApp.Window.IsDisposed && activeApp.Window.Visible)
            {
                return activeApp;
            }
            for (int i = openWindows.Count - 1; i >= 0; i--)
            {
                FusionAppWindow app;
                if (appWindows.TryGetValue(openWindows[i], out app) && app.Window.Visible)
                {
                    activeApp = app;
                    return app;
                }
            }
            return null;
        }

        private Rectangle AppWorkArea(bool fullscreen)
        {
            if (desktop == null)
            {
                return ClientRectangle;
            }
            if (fullscreen)
            {
                return new Rectangle(0, 0, Math.Max(200, desktop.ClientSize.Width), Math.Max(200, desktop.ClientSize.Height));
            }

            int left = leftRail == null || !leftRail.Visible ? 18 : leftRail.Right + 16;
            int top = 18;
            int right = Math.Max(left + 420, desktop.ClientSize.Width - 18);
            int bottom = taskbar == null || !taskbar.Visible ? desktop.ClientSize.Height - 18 : taskbar.Top - 14;
            return new Rectangle(left, top, Math.Max(420, right - left), Math.Max(320, bottom - top));
        }

        private void RefreshActiveApp()
        {
            FusionAppWindow app = GetActiveApp();
            if (app == null)
            {
                desktop.Invalidate();
                if (heroStage != null) heroStage.Invalidate();
                if (carouselWebView != null && carouselWebView.CoreWebView2 != null) carouselWebView.Reload();
                return;
            }
            RefreshApp(app);
        }

        private void RefreshApp(FusionAppWindow app)
        {
            SetActiveApp(app);
            if (app.WebView != null && app.WebView.CoreWebView2 != null)
            {
                app.WebView.CoreWebView2.Reload();
                return;
            }
            if (app.ExternalProcess != null)
            {
                BringExternalProcessToFront(app);
                ShowToast(app.ExternalProcess.HasExited ? app.Title + " 已關閉" : app.Title + " 已帶到前景", app.AccentColor);
                return;
            }
            app.Window.Invalidate(true);
            ShowInlineStatus(app, "WinForms app view refreshed.");
        }

        private void MinimizeApp(FusionAppWindow app)
        {
            if (app == null) return;
            if (app.ExternalProcess != null) ShowExternalWindow(app, SW_MINIMIZE);
            app.IsMinimized = true;
            app.Window.Visible = false;
            if (object.ReferenceEquals(activeApp, app)) activeApp = null;
            if (app.TaskButton != null) app.TaskButton.BackColor = Color.FromArgb(24, 33, 54);
        }

        private void RestoreFromTaskbar(FusionAppWindow app)
        {
            if (app == null || app.Window == null || app.Window.IsDisposed) return;
            app.Window.Visible = true;
            app.IsMinimized = false;
            if (app.ExternalProcess != null) ShowExternalWindow(app, SW_RESTORE);
            SetActiveApp(app);
        }

        private void ToggleMaximizeApp(FusionAppWindow app)
        {
            if (app == null) return;
            if (app.IsFullscreen)
            {
                ToggleAppFullscreen(app);
                return;
            }
            if (!app.IsMaximized)
            {
                app.RestoreBounds = new Rectangle(app.Window.Location, app.Window.Size);
                Rectangle area = AppWorkArea(false);
                app.Window.Bounds = area;
                app.IsMaximized = true;
                if (app.ExternalProcess != null) ShowExternalWindow(app, SW_MAXIMIZE);
            }
            else
            {
                app.Window.Bounds = app.RestoreBounds;
                app.IsMaximized = false;
                if (app.ExternalProcess != null) ShowExternalWindow(app, SW_RESTORE);
            }
            UpdateWindowStateButtons(app);
            SetActiveApp(app);
        }

        private void ToggleActiveFullscreen()
        {
            FusionAppWindow app = GetActiveApp();
            if (app != null)
            {
                ToggleAppFullscreen(app);
            }
            else
            {
                ToggleHostFullscreen();
            }
        }

        private void ToggleAppFullscreen(FusionAppWindow app)
        {
            if (app == null) return;
            if (!app.IsFullscreen)
            {
                app.RestoreBounds = new Rectangle(app.Window.Location, app.Window.Size);
                app.WasMaximizedBeforeFullscreen = app.IsMaximized;
                SetShellChromeVisible(false);
                Rectangle area = AppWorkArea(true);
                app.Window.Bounds = area;
                app.IsFullscreen = true;
                app.IsMaximized = false;
                if (app.ExternalProcess != null) ShowExternalWindow(app, SW_MAXIMIZE);
            }
            else
            {
                app.Window.Bounds = app.RestoreBounds;
                app.IsFullscreen = false;
                app.IsMaximized = app.WasMaximizedBeforeFullscreen;
                SetShellChromeVisible(true);
                if (app.IsMaximized)
                {
                    app.Window.Bounds = AppWorkArea(false);
                }
                if (app.ExternalProcess != null) ShowExternalWindow(app, app.IsMaximized ? SW_MAXIMIZE : SW_RESTORE);
            }
            UpdateWindowStateButtons(app);
            SetActiveApp(app);
        }

        private void SetShellChromeVisible(bool visible)
        {
            if (leftRail != null) leftRail.Visible = visible;
            if (taskbar != null) taskbar.Visible = visible;
            if (heroStage != null) heroStage.Visible = visible;
            if (startMenu != null) startMenu.Visible = false;
        }

        private void UpdateWindowStateButtons(FusionAppWindow app)
        {
            if (app.MaximizeButton != null)
            {
                app.MaximizeButton.Text = app.IsMaximized ? "[=]" : "[]";
                windowToolTips.SetToolTip(app.MaximizeButton, app.IsMaximized ? "Restore" : "Maximize");
            }
            if (app.FullscreenButton != null)
            {
                app.FullscreenButton.BackColor = app.IsFullscreen ? Color.FromArgb(150, 34, 211, 238) : Color.FromArgb(108, 21, 35, 60);
                windowToolTips.SetToolTip(app.FullscreenButton, app.IsFullscreen ? "Exit Fullscreen" : "Fullscreen");
            }
        }

        private void OpenActiveDevTools()
        {
            FusionAppWindow app = GetActiveApp();
            if (app != null)
            {
                OpenDevTools(app);
                return;
            }
            if (carouselWebView != null && carouselWebView.CoreWebView2 != null)
            {
                carouselWebView.CoreWebView2.OpenDevToolsWindow();
            }
        }

        private void OpenDevTools(FusionAppWindow app)
        {
            SetActiveApp(app);
            if (app.WebView != null && app.WebView.CoreWebView2 != null)
            {
                app.WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                app.WebView.CoreWebView2.OpenDevToolsWindow();
                return;
            }

            ShowToast(app.Title + " 不是 WebView App，沒有可開啟的 DevTools", app.AccentColor);
        }

        private void ZoomActiveApp(double delta)
        {
            FusionAppWindow app = GetActiveApp();
            if (app == null) return;
            SetAppZoom(app, app.ZoomFactor + delta);
        }

        private void ResetActiveAppZoom()
        {
            FusionAppWindow app = GetActiveApp();
            if (app == null) return;
            SetAppZoom(app, 1.0);
        }

        private void SetAppZoom(FusionAppWindow app, double zoom)
        {
            zoom = Math.Max(AppZoomMin, Math.Min(AppZoomMax, zoom));
            app.ZoomFactor = zoom;
            if (app.WebView != null)
            {
                app.WebView.ZoomFactor = zoom;
            }
            else if (app.ExternalProcess == null)
            {
                ApplyWinFormsZoom(app.Window, zoom);
            }
            else
            {
                ShowToast(app.Title + " 不支援 FusionOS 內部縮放", app.AccentColor);
                return;
            }
            ShowInlineStatus(app, "Zoom " + Math.Round(zoom * 100) + "%");
        }

        private void ApplyWinFormsZoom(Control root, double zoom)
        {
            RecordBaseFonts(root);
            foreach (KeyValuePair<Control, float> item in new Dictionary<Control, float>(baseFontSizes))
            {
                if (item.Key == null || item.Key.IsDisposed || !IsChildOf(item.Key, root)) continue;
                item.Key.Font = new Font(item.Key.Font.FontFamily, Math.Max(7F, item.Value * (float)zoom), item.Key.Font.Style);
            }
        }

        private void RecordBaseFonts(Control root)
        {
            if (!baseFontSizes.ContainsKey(root)) baseFontSizes[root] = root.Font.Size;
            foreach (Control child in root.Controls)
            {
                RecordBaseFonts(child);
            }
        }

        private bool IsChildOf(Control child, Control root)
        {
            for (Control current = child; current != null; current = current.Parent)
            {
                if (object.ReferenceEquals(current, root)) return true;
            }
            return false;
        }

        private void ShowInlineStatus(FusionAppWindow app, string message)
        {
            if (app == null || app.TitleLabel == null || app.TitleLabel.IsDisposed) return;
            app.TitleLabel.Text = app.Title + "    " + message;
            var timer = new Timer { Interval = 1400 };
            timer.Tick += delegate
            {
                timer.Stop();
                timer.Dispose();
                if (app.TitleLabel != null && !app.TitleLabel.IsDisposed) app.TitleLabel.Text = app.Title;
            };
            timer.Start();
        }

        private void BringExternalProcessToFront(FusionAppWindow app)
        {
            if (app == null || app.ExternalProcess == null || app.ExternalProcess.HasExited) return;
            app.ExternalProcess.Refresh();
            IntPtr handle = app.ExternalProcess.MainWindowHandle;
            if (handle != IntPtr.Zero)
            {
                ShowWindow(handle, SW_RESTORE);
                SetForegroundWindow(handle);
            }
        }

        private void ShowExternalWindow(FusionAppWindow app, int command)
        {
            if (app == null || app.ExternalProcess == null || app.ExternalProcess.HasExited) return;
            app.ExternalProcess.Refresh();
            IntPtr handle = app.ExternalProcess.MainWindowHandle;
            if (handle != IntPtr.Zero) ShowWindow(handle, command);
        }

        // A native app launches its OWN window; FusionOS no longer wraps it in a
        // placeholder / process / status frame. Just a brief confirmation toast.
        private void OpenExternalProcessWindow(string title, Process process, Color color, string exePath)
        {
            ShowToast(title + " 已啟動", color);
        }

        // Lightweight auto-dismissing toast (replaces big status/placeholder frames).
        private void ShowToast(string message, Color color)
        {
            if (desktop == null || string.IsNullOrEmpty(message)) return;
            try
            {
                int w = Math.Max(240, TextRenderer.MeasureText(message, new Font(Font.FontFamily, 11F, FontStyle.Bold)).Width + 96);
                var toast = new RoundedPanel
                {
                    Radius = 16,
                    BackColor = Color.FromArgb(244, 12, 18, 34),
                    Size = new Size(w, 50)
                };
                int bottom = (taskbar != null && taskbar.Visible ? taskbar.Top : ClientSize.Height) - 26;
                toast.Location = new Point((ClientSize.Width - toast.Width) / 2, bottom - toast.Height);

                var dot = new Panel { Size = new Size(10, 10), Location = new Point(20, 20), BackColor = color };
                toast.Controls.Add(dot);
                var label = new Label
                {
                    AutoSize = false,
                    Bounds = new Rectangle(42, 0, w - 56, 50),
                    Text = message,
                    ForeColor = text,
                    Font = new Font(Font.FontFamily, 11F, FontStyle.Bold),
                    TextAlign = ContentAlignment.MiddleLeft
                };
                toast.Controls.Add(label);

                desktop.Controls.Add(toast);
                toast.BringToFront();

                var t = new Timer { Interval = 2300 };
                t.Tick += delegate
                {
                    t.Stop();
                    t.Dispose();
                    if (!toast.IsDisposed)
                    {
                        desktop.Controls.Remove(toast);
                        toast.Dispose();
                    }
                };
                t.Start();
            }
            catch { }
        }

        private void OpenSystemWindow(string title, string body, Color color, string kind = "system")
        {
            windowOffset = (windowOffset + 30) % 180;
            Rectangle area = AppWorkArea(false);
            int width = Math.Min(640, Math.Max(460, area.Width - 80));
            int height = Math.Min(420, Math.Max(340, area.Height - 80));
            int x = Math.Min(area.Right - width, area.Left + 64 + windowOffset);
            int y = Math.Min(area.Bottom - height, area.Top + 44 + windowOffset / 2);
            var win = new RoundedPanel
            {
                Radius = 22,
                BackColor = Color.FromArgb(246, 10, 16, 30),
                Size = new Size(width, height),
                Location = new Point(Math.Max(area.Left, x), Math.Max(area.Top, y)),
                Padding = new Padding(0)
            };
            desktop.Controls.Add(win);
            openWindows.Add(win);
            win.SuspendLayout();
            win.BringToFront();
            if (!ReactOwnsShell)
            {
                startMenu?.BringToFront();
                taskbar?.BringToFront();
            }

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
            var app = RegisterAppWindow(title, win, header, titleLabel, color, kind);

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
            SetActiveApp(app);
        }

        private void OpenFusionTerminal()
        {
            Color terminalAccent = Color.FromArgb(112, 226, 188);
            windowOffset = (windowOffset + 34) % 170;
            Rectangle area = AppWorkArea(false);
            int width = Math.Min(920, Math.Max(680, area.Width - 64));
            int height = Math.Min(560, Math.Max(440, area.Height - 54));
            int x = Math.Min(area.Right - width, area.Left + 38 + windowOffset);
            int y = Math.Min(area.Bottom - height, area.Top + 26 + windowOffset / 2);

            var win = new RoundedPanel
            {
                Radius = 22,
                BackColor = Color.FromArgb(250, 4, 9, 22),
                Size = new Size(width, height),
                Location = new Point(Math.Max(area.Left, x), Math.Max(area.Top, y)),
                Padding = new Padding(0)
            };
            win.SuspendLayout();

            var header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 54,
                BackColor = Color.FromArgb(52, terminalAccent)
            };
            win.Controls.Add(header);

            var titleLabel = new Label
            {
                Dock = DockStyle.Fill,
                Text = "Fusion Terminal",
                ForeColor = text,
                Font = new Font(Font.FontFamily, 13F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft,
                Padding = new Padding(18, 0, 0, 0)
            };
            header.Controls.Add(titleLabel);
            var app = RegisterAppWindow("Fusion Terminal", win, header, titleLabel, terminalAccent, "cmd");

            var root = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.Transparent,
                Padding = new Padding(18),
                RowCount = 4,
                ColumnCount = 1
            };
            root.SuspendLayout();
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 26));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 22));
            win.Controls.Add(root);

            var toolbar = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 6,
                RowCount = 1,
                BackColor = Color.Transparent
            };
            toolbar.SuspendLayout();
            toolbar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 112));
            toolbar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 72));
            toolbar.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            toolbar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 92));
            toolbar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 92));
            toolbar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 1));
            root.Controls.Add(toolbar, 0, 0);

            string shellMode = "PowerShell";
            var psButton = TerminalShellButton("PowerShell");
            var cmdButton = TerminalShellButton("CMD");
            toolbar.Controls.Add(psButton, 0, 0);
            toolbar.Controls.Add(cmdButton, 1, 0);
            UpdateTerminalShellButtons(psButton, cmdButton, shellMode, terminalAccent);

            var commandInput = new TextBox
            {
                Dock = DockStyle.Fill,
                BorderStyle = BorderStyle.FixedSingle,
                BackColor = Color.FromArgb(12, 24, 44),
                ForeColor = text,
                Font = terminalInputFont ?? new Font("Consolas", 11F),
                Margin = new Padding(8, 3, 8, 4)
            };
            toolbar.Controls.Add(commandInput, 2, 0);

            psButton.Click += delegate
            {
                shellMode = "PowerShell";
                UpdateTerminalShellButtons(psButton, cmdButton, shellMode, terminalAccent);
                commandInput.Focus();
            };
            cmdButton.Click += delegate
            {
                shellMode = "CMD";
                UpdateTerminalShellButtons(psButton, cmdButton, shellMode, terminalAccent);
                commandInput.Focus();
            };

            var runButton = TerminalButton("Run");
            runButton.BackColor = Color.FromArgb(52, terminalAccent);
            toolbar.Controls.Add(runButton, 3, 0);

            var clearButton = TerminalButton("Clear");
            toolbar.Controls.Add(clearButton, 4, 0);

            var output = new TextBox
            {
                Dock = DockStyle.Fill,
                ReadOnly = true,
                BorderStyle = BorderStyle.None,
                BackColor = Color.FromArgb(9, 16, 31),
                ForeColor = Color.FromArgb(216, 244, 255),
                Font = terminalOutputFont ?? new Font("Consolas", 10.5F),
                Multiline = true,
                WordWrap = false,
                ScrollBars = ScrollBars.Vertical,
                TabStop = true,
                HideSelection = false,
                Cursor = Cursors.IBeam
            };
            root.Controls.Add(output, 0, 1);

            var cwdLabel = new Label
            {
                Dock = DockStyle.Fill,
                Text = GetTerminalWorkingDirectory(),
                ForeColor = muted,
                Font = new Font(Font.FontFamily, 8.5F),
                TextAlign = ContentAlignment.MiddleLeft,
                Padding = new Padding(2, 0, 0, 0)
            };
            root.Controls.Add(cwdLabel, 0, 2);

            var status = new Label
            {
                Dock = DockStyle.Fill,
                Text = "Ready",
                ForeColor = muted,
                Font = new Font(Font.FontFamily, 8.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleLeft
            };
            root.Controls.Add(status, 0, 3);

            var history = new List<string>();
            int historyIndex = -1;
            string commandBuffer = string.Empty;
            int promptStart = 0;
            bool commandRunning = false;

            Action focusTerminal = delegate
            {
                if (output.IsDisposed) return;
                output.Select();
                output.Focus();
                output.SelectionStart = output.TextLength;
                output.SelectionLength = 0;
                output.ScrollToCaret();
            };
            psButton.Click += delegate { focusTerminal(); };
            cmdButton.Click += delegate { focusTerminal(); };

            Action<string> replaceCommandBuffer = delegate (string value)
            {
                value = value ?? string.Empty;
                if (promptStart < 0 || promptStart > output.TextLength)
                {
                    promptStart = output.TextLength;
                }

                output.Text = output.Text.Substring(0, promptStart) + value;
                commandBuffer = value;
                output.SelectionStart = output.TextLength;
                output.SelectionLength = 0;
                output.ScrollToCaret();
            };

            Action writePrompt = delegate
            {
                string promptShell = string.Equals(shellMode, "CMD", StringComparison.OrdinalIgnoreCase) ? "cmd" : "powershell";
                AppendTerminalText(output, "fusion " + promptShell + " > ", terminalAccent, true);
                promptStart = output.TextLength;
                commandBuffer = string.Empty;
                focusTerminal();
            };

            Func<Task> execute = async delegate
            {
                if (commandRunning) return;
                bool commandCameFromField = commandBuffer.Length == 0 && !string.IsNullOrWhiteSpace(commandInput.Text);
                string command = (commandBuffer.Length > 0 ? commandBuffer : commandInput.Text).Trim();
                if (string.IsNullOrWhiteSpace(command))
                {
                    AppendTerminalText(output, "\r\n", muted, false);
                    writePrompt();
                    return;
                }

                if (commandCameFromField)
                {
                    replaceCommandBuffer(command);
                }

                history.Add(command);
                historyIndex = history.Count;
                commandBuffer = string.Empty;
                commandInput.Clear();
                AppendTerminalText(output, "\r\n", muted, false);
                if (string.Equals(command, "exit", StringComparison.OrdinalIgnoreCase))
                {
                    CloseWindow(win);
                    return;
                }
                if (HandleTerminalBuiltIn(command, cwdLabel, output, terminalAccent))
                {
                    writePrompt();
                    return;
                }
                commandRunning = true;
                try
                {
                    await RunFusionTerminalCommandAsync(command, shellMode, cwdLabel.Text, output, commandInput, status, runButton);
                }
                finally
                {
                    commandRunning = false;
                    writePrompt();
                }
            };

            clearButton.Click += delegate
            {
                output.Clear();
                AppendTerminalText(output, "Fusion Terminal online\r\n", terminalAccent, true);
                AppendTerminalText(output, "Type directly in this terminal surface, then press Enter.\r\n\r\n", Color.FromArgb(184, 211, 255), false);
                writePrompt();
            };

            runButton.Click += async delegate { await execute(); };
            commandInput.KeyDown += async delegate (object sender, KeyEventArgs e)
            {
                if (e.KeyCode == Keys.Enter)
                {
                    e.SuppressKeyPress = true;
                    await execute();
                }
                else if (e.KeyCode == Keys.Up && history.Count > 0)
                {
                    e.SuppressKeyPress = true;
                    historyIndex = Math.Max(0, historyIndex - 1);
                    commandInput.Text = history[historyIndex];
                    commandInput.SelectionStart = commandInput.TextLength;
                }
                else if (e.KeyCode == Keys.Down && history.Count > 0)
                {
                    e.SuppressKeyPress = true;
                    historyIndex = Math.Min(history.Count, historyIndex + 1);
                    commandInput.Text = historyIndex >= history.Count ? string.Empty : history[historyIndex];
                    commandInput.SelectionStart = commandInput.TextLength;
                }
            };

            output.MouseDown += delegate { focusTerminal(); };
            output.KeyPress += delegate (object sender, KeyPressEventArgs e)
            {
                if (commandRunning || char.IsControl(e.KeyChar))
                {
                    e.Handled = true;
                    return;
                }

                e.Handled = true;
                commandBuffer += e.KeyChar;
                AppendTerminalText(output, e.KeyChar.ToString(), Color.FromArgb(216, 244, 255), false);
            };

            output.KeyDown += async delegate (object sender, KeyEventArgs e)
            {
                if (commandRunning)
                {
                    e.SuppressKeyPress = true;
                    return;
                }

                if (e.Control && e.KeyCode == Keys.V)
                {
                    e.SuppressKeyPress = true;
                    string textToPaste = Clipboard.ContainsText() ? Clipboard.GetText() : string.Empty;
                    if (!string.IsNullOrEmpty(textToPaste))
                    {
                        textToPaste = textToPaste.Replace("\r", string.Empty).Replace("\n", " ");
                        commandBuffer += textToPaste;
                        AppendTerminalText(output, textToPaste, Color.FromArgb(216, 244, 255), false);
                    }
                }
                else if (e.KeyCode == Keys.Enter)
                {
                    e.SuppressKeyPress = true;
                    await execute();
                }
                else if (e.KeyCode == Keys.Back)
                {
                    e.SuppressKeyPress = true;
                    if (commandBuffer.Length > 0)
                    {
                        replaceCommandBuffer(commandBuffer.Substring(0, commandBuffer.Length - 1));
                    }
                }
                else if (e.KeyCode == Keys.Up && history.Count > 0)
                {
                    e.SuppressKeyPress = true;
                    historyIndex = Math.Max(0, historyIndex - 1);
                    replaceCommandBuffer(history[historyIndex]);
                }
                else if (e.KeyCode == Keys.Down && history.Count > 0)
                {
                    e.SuppressKeyPress = true;
                    historyIndex = Math.Min(history.Count, historyIndex + 1);
                    replaceCommandBuffer(historyIndex >= history.Count ? string.Empty : history[historyIndex]);
                }
                else if (e.KeyCode == Keys.Left || e.KeyCode == Keys.Right || e.KeyCode == Keys.Home || e.KeyCode == Keys.Delete)
                {
                    e.SuppressKeyPress = true;
                    focusTerminal();
                }
            };

            toolbar.ResumeLayout(false);
            root.ResumeLayout(false);
            win.ResumeLayout(true);

            desktop.Controls.Add(win);
            openWindows.Add(win);
            win.BringToFront();
            header.BringToFront();
            CreateTaskButtonForWindow("Terminal", win);
            SetActiveApp(app);
            focusTerminal();
            BeginInvoke((Action)delegate
            {
                AppendTerminalText(output, "Fusion Terminal online\r\n", terminalAccent, true);
                AppendTerminalText(output, "Working directory: " + cwdLabel.Text + "\r\n", muted, false);
                AppendTerminalText(output, "Type directly in this terminal surface, then press Enter. Try: dir, cd, dotnet --info, npm -v\r\n\r\n", Color.FromArgb(184, 211, 255), false);
                writePrompt();
                PostAppLaunchStatus("cmd", "open", "Fusion Terminal ready");
                focusTerminal();
            });
        }

        private Button TerminalButton(string label)
        {
            var button = WindowButton(label);
            button.Width = 84;
            button.Height = 30;
            button.Margin = new Padding(8, 1, 0, 1);
            button.BackColor = Color.FromArgb(28, 43, 68);
            return button;
        }

        private Button TerminalShellButton(string label)
        {
            var button = new Button
            {
                Dock = DockStyle.Fill,
                Text = label,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(20, 34, 55),
                ForeColor = text,
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                Margin = new Padding(0, 3, 8, 4),
                Cursor = Cursors.Hand,
                UseVisualStyleBackColor = false
            };
            button.FlatAppearance.BorderSize = 1;
            button.FlatAppearance.BorderColor = Color.FromArgb(70, 112, 226, 188);
            button.FlatAppearance.MouseOverBackColor = Color.FromArgb(38, 63, 88);
            button.FlatAppearance.MouseDownBackColor = Color.FromArgb(52, 112, 226, 188);
            return button;
        }

        private void UpdateTerminalShellButtons(Button psButton, Button cmdButton, string shellMode, Color accentColor)
        {
            bool psActive = string.Equals(shellMode, "PowerShell", StringComparison.OrdinalIgnoreCase);
            psButton.BackColor = psActive ? Color.FromArgb(58, accentColor) : Color.FromArgb(20, 34, 55);
            cmdButton.BackColor = psActive ? Color.FromArgb(20, 34, 55) : Color.FromArgb(58, accentColor);
            psButton.ForeColor = psActive ? text : muted;
            cmdButton.ForeColor = psActive ? muted : text;
        }

        private string GetTerminalWorkingDirectory()
        {
            if (!string.IsNullOrEmpty(terminalWorkingDirectoryCache)) return terminalWorkingDirectoryCache;
            terminalWorkingDirectoryCache = ResolveTerminalWorkingDirectory();
            return terminalWorkingDirectoryCache;
        }

        private string ResolveTerminalWorkingDirectory()
        {
            string projectFile = FindProjectFile("WindowsFormsApp1.csproj");
            if (!string.IsNullOrEmpty(projectFile)) return Path.GetDirectoryName(projectFile);
            return Environment.CurrentDirectory;
        }

        private bool HandleTerminalBuiltIn(string command, Label cwdLabel, TextBox output, Color terminalAccent)
        {
            string clean = command.Trim();
            if (string.Equals(clean, "clear", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(clean, "cls", StringComparison.OrdinalIgnoreCase))
            {
                output.Clear();
                AppendTerminalText(output, "Fusion Terminal online\r\n\r\n", terminalAccent, true);
                return true;
            }

            if (string.Equals(clean, "pwd", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(clean, "cd", StringComparison.OrdinalIgnoreCase))
            {
                AppendTerminalText(output, cwdLabel.Text + "\r\n\r\n", Color.FromArgb(216, 244, 255), false);
                return true;
            }

            if (clean.StartsWith("cd ", StringComparison.OrdinalIgnoreCase))
            {
                string target = clean.Substring(3).Trim().Trim('"');
                try
                {
                    string next = Path.IsPathRooted(target) ? target : Path.Combine(cwdLabel.Text, target);
                    next = Path.GetFullPath(next);
                    if (!Directory.Exists(next))
                    {
                        AppendTerminalText(output, "Directory not found: " + next + "\r\n\r\n", Color.FromArgb(255, 148, 168), false);
                        return true;
                    }

                    cwdLabel.Text = next;
                    AppendTerminalText(output, next + "\r\n\r\n", Color.FromArgb(216, 244, 255), false);
                }
                catch (Exception ex)
                {
                    AppendTerminalText(output, ex.Message + "\r\n\r\n", Color.FromArgb(255, 148, 168), false);
                }
                return true;
            }

            return false;
        }

        private async Task RunFusionTerminalCommandAsync(string command, string shell, string workingDirectory, TextBox output, TextBox input, Label status, Button runButton)
        {
            input.Enabled = false;
            runButton.Enabled = false;
            status.Text = "Running " + shell;

            string stdout = string.Empty;
            string stderr = string.Empty;
            int exitCode = -1;
            try
            {
                ProcessStartInfo startInfo = CreateTerminalStartInfo(shell, command, workingDirectory);
                await Task.Run(delegate
                {
                    using (var process = new Process())
                    {
                        process.StartInfo = startInfo;
                        process.Start();
                        Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
                        Task<string> stderrTask = process.StandardError.ReadToEndAsync();
                        process.WaitForExit();
                        stdout = stdoutTask.Result;
                        stderr = stderrTask.Result;
                        exitCode = process.ExitCode;
                    }
                });

                if (!string.IsNullOrEmpty(stdout)) AppendTerminalText(output, stdout.EndsWith("\n") ? stdout : stdout + "\r\n", Color.FromArgb(216, 244, 255), false);
                if (!string.IsNullOrEmpty(stderr)) AppendTerminalText(output, stderr.EndsWith("\n") ? stderr : stderr + "\r\n", Color.FromArgb(255, 148, 168), false);
                AppendTerminalText(output, "exit " + exitCode + "\r\n\r\n", exitCode == 0 ? Color.FromArgb(112, 226, 188) : Color.FromArgb(255, 148, 168), true);
                status.Text = exitCode == 0 ? "Ready" : "Command exited with code " + exitCode;
            }
            catch (Exception ex)
            {
                AppendTerminalText(output, ex.Message + "\r\n\r\n", Color.FromArgb(255, 148, 168), false);
                status.Text = "Command failed";
            }
            finally
            {
                input.Enabled = true;
                runButton.Enabled = true;
                input.Focus();
            }
        }

        private ProcessStartInfo CreateTerminalStartInfo(string shell, string command, string workingDirectory)
        {
            bool useCmd = string.Equals(shell, "CMD", StringComparison.OrdinalIgnoreCase);
            var startInfo = new ProcessStartInfo
            {
                FileName = useCmd ? "cmd.exe" : "powershell.exe",
                WorkingDirectory = Directory.Exists(workingDirectory) ? workingDirectory : Environment.CurrentDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            if (useCmd)
            {
                startInfo.Arguments = "/d /s /c " + QuoteCmdArgument("chcp 65001>nul & " + command);
            }
            else
            {
                string script = "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $OutputEncoding = [Console]::OutputEncoding; " + command;
                startInfo.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -EncodedCommand " + Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
            }

            return startInfo;
        }

        private static string QuoteCmdArgument(string value)
        {
            return "\"" + (value ?? string.Empty).Replace("\"", "\"\"") + "\"";
        }

        private void AppendTerminalText(TextBox output, string value, Color color, bool bold)
        {
            if (output == null || output.IsDisposed || string.IsNullOrEmpty(value)) return;
            output.AppendText(value);
            output.SelectionStart = output.TextLength;
            output.ScrollToCaret();
        }

        private async void OpenWebAppWindow(string title, string url, Color color, bool ownsCamera = false, string kind = "webview")
        {
            windowOffset = (windowOffset + 28) % 168;
            Rectangle area = AppWorkArea(false);
            int x = area.Left;
            int y = area.Top;
            int width = Math.Max(760, area.Width);
            int height = Math.Max(520, area.Height);

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
            if (!ReactOwnsShell)
            {
                startMenu?.BringToFront();
                taskbar?.BringToFront();
            }

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
            var app = RegisterAppWindow(title, win, header, titleLabel, color, kind);

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
            SetActiveApp(app);

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
                app.WebView = webView;
                ApplyWebViewBrowserShortcuts(app);
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
            task.FlatAppearance.BorderColor = Color.FromArgb(36, 49, 78);
            task.Click += delegate
            {
                FusionAppWindow app;
                if (appWindows.TryGetValue(win, out app))
                {
                    RestoreFromTaskbar(app);
                }
                else
                {
                    win.Visible = true;
                    win.BringToFront();
                    if (startMenu.Visible) startMenu.BringToFront();
                    taskbar.BringToFront();
                }
            };
            FusionAppWindow registeredApp;
            if (appWindows.TryGetValue(win, out registeredApp))
            {
                registeredApp.TaskButton = task;
            }
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

        // Gives every WebView2 in FusionOS Chrome-like controls. Zoom (Ctrl +/-/0 and
        // Ctrl+wheel) and F12 DevTools are handled natively by WebView2's built-in
        // browser accelerator keys; F11 fullscreen is handled by a tiny injected
        // keydown listener that posts a message back to the host Form.
        private static string TryReadStringWebMessage(CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (e == null) return null;

            string json = null;
            try { json = e.WebMessageAsJson; }
            catch { return null; }

            if (string.IsNullOrEmpty(json) || json.Length < 2 || json[0] != '"' || json[json.Length - 1] != '"')
            {
                return null;
            }

            string value = json.Substring(1, json.Length - 2);
            return value
                .Replace("\\\"", "\"")
                .Replace("\\\\", "\\")
                .Replace("\\/", "/")
                .Replace("\\n", "\n")
                .Replace("\\r", "\r")
                .Replace("\\t", "\t");
        }

        private void ApplyWebViewBrowserShortcuts(WebView2 webView)
        {
            if (webView == null || webView.CoreWebView2 == null) return;
            try
            {
                var s = webView.CoreWebView2.Settings;
                s.AreDevToolsEnabled = true;
                s.IsZoomControlEnabled = true;
                s.AreBrowserAcceleratorKeysEnabled = true;
            }
            catch { }

            try
            {
                webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                    "document.addEventListener('keydown',function(e){if(e.key==='F11'){e.preventDefault();try{window.chrome.webview.postMessage('FUSION_HOST_FULLSCREEN');}catch(_){}}},true);");
            }
            catch { }

            webView.CoreWebView2.WebMessageReceived += delegate (object sender, CoreWebView2WebMessageReceivedEventArgs e)
            {
                try
                {
                    string msg = TryReadStringWebMessage(e);
                    if (msg == "FUSION_HOST_FULLSCREEN") BeginInvoke((Action)ToggleHostFullscreen);
                }
                catch { }
            };
        }

        private void ApplyWebViewBrowserShortcuts(FusionAppWindow app)
        {
            WebView2 webView = app.WebView;
            if (webView == null || webView.CoreWebView2 == null) return;
            try
            {
                var s = webView.CoreWebView2.Settings;
                s.AreDevToolsEnabled = true;                 // F12 DevTools
                s.IsZoomControlEnabled = true;               // Ctrl+wheel zoom
                s.AreBrowserAcceleratorKeysEnabled = true;   // Ctrl +/-/0 zoom, F12, etc.
                webView.ZoomFactor = app.ZoomFactor;
            }
            catch { }

            try
            {
                webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                    "document.addEventListener('keydown',function(e){if(e.key==='F11'||e.key==='F5'||e.key==='F12'||(e.ctrlKey&&(e.key==='+'||e.key==='='||e.key==='-'||e.key==='0'))){e.preventDefault();e.stopPropagation();try{window.chrome.webview.postMessage('FUSION_SHORTCUT:'+e.key+':'+(e.ctrlKey?'1':'0'));}catch(_){}}},true);");
            }
            catch { }

            webView.CoreWebView2.WebMessageReceived += delegate (object sender, CoreWebView2WebMessageReceivedEventArgs e)
            {
                try
                {
                    string msg = TryReadStringWebMessage(e);
                    if (msg == "FUSION_FULLSCREEN")
                    {
                        BeginInvoke((Action)delegate { ToggleAppFullscreen(app); });
                    }
                    else if (msg != null && msg.StartsWith("FUSION_SHORTCUT:", StringComparison.Ordinal))
                    {
                        BeginInvoke((Action)delegate
                        {
                            SetActiveApp(app);
                            string[] parts = msg.Split(':');
                            if (parts.Length >= 3)
                            {
                                bool ctrl = parts[2] == "1";
                                string key = parts[1];
                                if (key == "F5") RefreshApp(app);
                                else if (key == "F11") ToggleAppFullscreen(app);
                                else if (key == "F12") OpenDevTools(app);
                                else if (ctrl && (key == "+" || key == "=")) SetAppZoom(app, app.ZoomFactor + AppZoomStep);
                                else if (ctrl && key == "-") SetAppZoom(app, app.ZoomFactor - AppZoomStep);
                                else if (ctrl && key == "0") SetAppZoom(app, 1.0);
                            }
                        });
                    }
                }
                catch { }
            };
        }

        private void ToggleHostFullscreen()
        {
            if (ReactOwnsShell)
            {
                if (isFullscreen)
                {
                    Rectangle screen = Screen.FromControl(this).WorkingArea;
                    TopMost = false;
                    FormBorderStyle = FormBorderStyle.Sizable;
                    WindowState = FormWindowState.Normal;
                    Size = new Size(Math.Min(1440, Math.Max(1100, screen.Width - 160)), Math.Min(900, Math.Max(720, screen.Height - 120)));
                    Location = new Point(screen.Left + (screen.Width - Width) / 2, screen.Top + (screen.Height - Height) / 2);
                    isFullscreen = false;
                }
                else
                {
                    FormBorderStyle = FormBorderStyle.None;
                    WindowState = FormWindowState.Maximized;
                    TopMost = false;
                    isFullscreen = true;
                }
                LayoutShell();
                PostHostFullscreenChanged();
                return;
            }

            if (!isFullscreen)
            {
                prevBorderStyle = FormBorderStyle;
                prevWindowState = WindowState;
                prevBounds = Bounds;
                FormBorderStyle = FormBorderStyle.None;
                WindowState = FormWindowState.Normal;
                Bounds = Screen.FromControl(this).Bounds;
                TopMost = true;
                isFullscreen = true;
            }
            else
            {
                TopMost = false;
                FormBorderStyle = prevBorderStyle;
                WindowState = prevWindowState;
                if (prevWindowState == FormWindowState.Normal) Bounds = prevBounds;
                isFullscreen = false;
            }
            PostHostFullscreenChanged();
        }

        private void PostHostFullscreenChanged()
        {
            if (carouselWebView == null || carouselWebView.CoreWebView2 == null) return;
            string json = "{\"type\":\"FUSION_HOST_FULLSCREEN_CHANGED\",\"payload\":{\"fullscreen\":" + (isFullscreen ? "true" : "false") + "}}";
            try { carouselWebView.CoreWebView2.PostWebMessageAsString(json); } catch { }
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
            FusionAppWindow app;
            appWindows.TryGetValue(win, out app);
            if (app != null && app.IsFullscreen)
            {
                SetShellChromeVisible(true);
            }

            if (app != null && app.ExternalProcess != null && !app.ExternalProcess.HasExited)
            {
                try
                {
                    app.ExternalProcess.CloseMainWindow();
                }
                catch { }
            }

            var task = app == null ? win.Tag as Button : app.TaskButton;
            if (task != null)
            {
                taskButtons.Controls.Remove(task);
                task.Dispose();
            }
            if (app != null)
            {
                appWindows.Remove(win);
                if (object.ReferenceEquals(activeApp, app)) activeApp = null;
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
            if (info.Glyph == "VID") return Color.FromArgb(88, 220, 255);
            if (info.Glyph == "WAV") return Color.FromArgb(120, 235, 218);
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
                case "MultimediaStudio": return zh ? "影音中心" : "AURORA Cinema";
                case "WaveStudio": return zh ? "音訊工作室" : "Wave Studio";
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
                case "MultimediaStudioDesc": return zh ? "內建應用程式套件：IntegratedApps/MultimediaStudio。啟動 AURORA Cinema 多媒體播放器。" : "Integrated app package: IntegratedApps/MultimediaStudio.";
                case "WaveStudioDesc": return zh ? "內建應用程式套件：IntegratedApps/WaveStudio。啟動 WAV 與音訊播放工具。" : "Integrated app package: IntegratedApps/WaveStudio.";
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
                case "StartMultimediaDesc": return zh ? "從系統啟動 1113354_multimedia。" : "Launch 1113354_multimedia from the system.";
                case "StartWaveDesc": return zh ? "從系統啟動 1113354_wav。" : "Launch 1113354_wav from the system.";
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
            PostAppLaunchStatus("set", "open", "系統設定已開啟");
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

    // Neon thin-line hamburger toggle matching the FusionOS glass visual language.
    public class HamburgerButton : Control
    {
        private bool hovered;
        private bool pressed;
        public Color AccentColor { get; set; }

        public HamburgerButton()
        {
            AccentColor = Color.FromArgb(95, 230, 232);
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.ResizeRedraw | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
            MouseEnter += delegate { hovered = true; Invalidate(); };
            MouseLeave += delegate { hovered = false; pressed = false; Invalidate(); };
            MouseDown += delegate { pressed = true; Invalidate(); };
            MouseUp += delegate { pressed = false; Invalidate(); };
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(2, 2, Width - 4, Height - 4);
            using (var path = Round(r, 12))
            {
                using (var brush = new SolidBrush(Color.FromArgb(hovered ? 95 : 55, 18, 28, 52)))
                    g.FillPath(brush, path);
                using (var pen = new Pen(Color.FromArgb(hovered ? 210 : 95, AccentColor), hovered ? 1.6f : 1.1f))
                    g.DrawPath(pen, path);
            }
            int lineLeft = r.Left + 9;
            int lineRight = r.Right - 9;
            int cy = r.Top + r.Height / 2;
            int gap = 6;
            int off = pressed ? 1 : 0;
            if (hovered)
            {
                using (var glow = new Pen(Color.FromArgb(70, AccentColor), 5f))
                    g.DrawLine(glow, lineLeft, cy, lineRight, cy);
            }
            using (var pen = new Pen(Color.FromArgb(hovered ? 255 : 215, AccentColor), 2.4f))
            {
                pen.StartCap = LineCap.Round;
                pen.EndCap = LineCap.Round;
                g.DrawLine(pen, lineLeft, cy - gap + off, lineRight, cy - gap + off);
                g.DrawLine(pen, lineLeft, cy, lineRight, cy);
                g.DrawLine(pen, lineLeft, cy + gap - off, lineRight, cy + gap - off);
            }
        }

        private static GraphicsPath Round(Rectangle b, int radius)
        {
            int d = Math.Max(2, radius * 2);
            var path = new GraphicsPath();
            path.AddArc(b.Left, b.Top, d, d, 180, 90);
            path.AddArc(b.Right - d, b.Top, d, d, 270, 90);
            path.AddArc(b.Right - d, b.Bottom - d, d, d, 0, 90);
            path.AddArc(b.Left, b.Bottom - d, d, d, 90, 90);
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
        private bool compact;
        public bool Compact
        {
            get { return compact; }
            set { if (compact != value) { compact = value; Invalidate(); } }
        }

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

            // Compact (collapsed sidebar): icon-only square tile, no text.
            if (compact)
            {
                int s = Math.Min(Width, Height) - 14;
                Rectangle cb = new Rectangle((Width - s) / 2, (Height - s) / 2 + lift, s, s);
                using (var path = RoundRect(cb, 16))
                using (var brush = new LinearGradientBrush(cb, Color.FromArgb(150, 15, 23, 42), Color.FromArgb(110, 30, 41, 59), LinearGradientMode.Vertical))
                using (var pen = new Pen(Color.FromArgb(hovered ? 220 : 110, AccentColor), hovered ? 2f : 1.2f))
                {
                    e.Graphics.FillPath(brush, path);
                    e.Graphics.DrawPath(pen, path);
                }
                Rectangle cIcon = new Rectangle(cb.X + (cb.Width - 40) / 2, cb.Y + (cb.Height - 40) / 2, 40, 40);
                using (var iconPath = RoundRect(cIcon, 12))
                using (var iconBrush = new LinearGradientBrush(cIcon, Color.FromArgb(190, AccentColor), Color.FromArgb(70, AccentColor), LinearGradientMode.ForwardDiagonal))
                {
                    e.Graphics.FillPath(iconBrush, iconPath);
                }
                if (IconImage != null)
                {
                    e.Graphics.DrawImage(IconImage, new Rectangle(cIcon.X + 8, cIcon.Y + 8, cIcon.Width - 16, cIcon.Height - 16));
                }
                else
                {
                    using (var glyphBrush = new SolidBrush(Color.White))
                    using (var font = new Font(Font.FontFamily, Glyph != null && Glyph.Length <= 3 ? 10F : 8F, FontStyle.Bold))
                    {
                        var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                        e.Graphics.DrawString(Glyph ?? "?", font, glyphBrush, cIcon, sf);
                    }
                }
                return;
            }

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

    public sealed class FusionAppWindow
    {
        public string Title { get; set; }
        public string Kind { get; set; }
        public Control Window { get; set; }
        public Panel Header { get; set; }
        public Label TitleLabel { get; set; }
        public Button TaskButton { get; set; }
        public Button MaximizeButton { get; set; }
        public Button FullscreenButton { get; set; }
        public WebView2 WebView { get; set; }
        public Process ExternalProcess { get; set; }
        public string ExternalPath { get; set; }
        public Color AccentColor { get; set; }
        public Rectangle RestoreBounds { get; set; }
        public double ZoomFactor { get; set; }
        public bool IsMinimized { get; set; }
        public bool IsMaximized { get; set; }
        public bool IsFullscreen { get; set; }
        public bool WasMaximizedBeforeFullscreen { get; set; }
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
            DrawNodeCard(g, new Rectangle(x - 72, y + 296, 176, 78), "media", "影音中心", "WinForms app", Color.FromArgb(88, 220, 255));
            DrawNodeCard(g, new Rectangle(x + 2, y + 394, 166, 78), "wav", "音訊工作室", "WinForms app", Color.FromArgb(120, 235, 218));
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
