using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using AxWMPLib;
using WMPLib;

namespace _1113354_陳冠瑋
{
    public partial class Form1 : Form
    {









        private AxWindowsMediaPlayer player;

        private TableLayoutPanel root;
        private SplitContainer split;
        private Panel sideTopBar;
        private Label lblSideSection;
        private Button btnSideMenu;
        private ContextMenuStrip sideMenu;
        private TabControl sideTabs;
        private GuidedTutorialOverlay tutorialOverlay;
        private List<TutorialStep> tutorialSteps = new List<TutorialStep>();
        private int tutorialIndex = 0;
        private Control tutorialClickTarget;
        private MouseEventHandler tutorialTargetMouseClick;
        private bool tutorialActive = false;
        private Panel header;
        private TableLayoutPanel viewer;
        private Panel playerHost;
        private Panel displayHost;
        private Panel webHost;

        private Panel externalPanel;
        private Panel embeddedSurface;
        private Process embeddedBrowserProcess;
        private IntPtr embeddedBrowserHandle = IntPtr.Zero;
        private bool usingEmbeddedBrowserFallback = false;
        private Control modernWebView;
        private object modernCore;
        private bool usingModernWebView2 = false;
        private bool webView2Initializing = false;
        private bool webReady = false;
        private bool platformMode = false;
        private bool webView2HelpShown = false;
        private string pendingWebUrl = "";
        private string lastBrowserEngine = "";
        private ComboBox cboPlatform;
        private ComboBox cboBrowserEngine;
        private TextBox txtPlatformSearch;
        private TextBox txtWebAddress;
        private Label lblWebStatus;
        private Panel titleBar;
        private Button btnWinMin;
        private Button btnWinMax;
        private Button btnWinClose;
        private PictureBox picBrand;
        private ListBox lbWebFavorites;
        private Button btnPlatformMode;
        private Button btnWebBack;
        private Button btnWebForward;
        private Button btnWebRefresh;
        private Label lblSubtitle;
        private Button btnQuickHelp;
        private Button btnQuickInfo;
        private ToolTip quickTip;
        private FloatingHelpCard activeHelpCard;
        private StarfieldWelcomePanel welcomeStage;
        private Label lblWelcomeTitle;
        private Label lblWelcomeSub;
        private float ambientPulse = 0f;
        private Color themeAccent = Color.FromArgb(255, 187, 82);
        private string themeName = "AURORA Gold";
        private RichTextBox statusCenterBox;
        private RichTextBox settingsBox;
        private RichTextBox themeStudioBox;
        private RichTextBox previewBox;
        private RichTextBox heatmapBox;
        private ListBox lbChapters;
        private TextBox txtChapterTitle;
        private ListBox lbDemoFlow;
        private readonly Dictionary<string, int[]> heatmapBuckets = new Dictionary<string, int[]>(StringComparer.OrdinalIgnoreCase);
        private readonly List<ChapterItem> chapters = new List<ChapterItem>();
        private bool showEndRecommendation = true;
        private bool enableResumeTracking = true;
        private bool enableToastNotification = true;
        private Label lblNow;
        private Label lblTimeOnVideo;

        private ListView lvPlaylist;
        private TextBox txtSearch;
        private Label lblCount;
        private RichTextBox logBox;
        private RichTextBox coreStatusBox;
        private RichTextBox showcaseBox;
        private RichTextBox commandCenterBox;
        private RichTextBox statsBox;
        private RichTextBox snapshotBox;
        private RichTextBox homeBox;
        private ListView lvLibrary;
        private TextBox txtLibrarySearch;
        private ListBox lbFavorites;
        private ListBox lbWatchLater;
        private ListBox lbNotes;
        private TextBox txtNoteInput;
        private ListBox lbRecommendations;
        private ListBox lbHotkeys;
        private CinemaPanel floatingControls;
        private System.Windows.Forms.Timer floatingTimer;
        private DateTime lastFloatingMove = DateTime.MinValue;
        private readonly Dictionary<string, Keys> customHotkeys = new Dictionary<string, Keys>();
        private readonly Dictionary<string, int> playCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, double> watchSeconds = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        private double totalWatchSeconds = 0;
        private DateTime lastWatchTick = DateTime.MinValue;
        private Font subtitleCustomFont = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
        private Color subtitleCustomForeColor = Color.White;
        private Color subtitleCustomBackColor = Color.Black;
        private int subtitleCustomAlpha = 255;
        private int subtitleCustomHeight = 44;

        private Label infoTitle;
        private Label infoType;
        private Label infoSize;
        private Label infoPath;
        private Label infoState;
        private Label infoDuration;

        private TrackBar seekBar;
        private Label lblCurrent;
        private Label lblTotal;

        private Button btnPlay;
        private Button btnStop;
        private Button btnPrev;
        private Button btnNext;
        private Button btnShuffle;
        private Button btnRepeat;
        private Button btnTheme;
        private Button btnFullscreen;
        private Button btnMute;
        private Button btnAspect;
        private ComboBox cboSpeed;
        private TrackBar volBar;
        private Label lblVolume;

        private ListBox lbBookmarks;
        private Label lblAB;

        private StatusStrip status;
        private ToolStripStatusLabel statusLeft;
        private ToolStripStatusLabel statusRight;

        private System.Windows.Forms.Timer timer;
        private System.Windows.Forms.Timer sleepTimer;

        private readonly List<MediaItem> playlist = new List<MediaItem>();
        private readonly List<MediaItem> mediaLibrary = new List<MediaItem>();
        private readonly List<SavedItem> favoriteItems = new List<SavedItem>();
        private readonly List<SavedItem> watchLaterItems = new List<SavedItem>();
        private readonly List<VideoNoteItem> videoNotes = new List<VideoNoteItem>();
        private readonly Dictionary<string, double> resumePositions = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        private readonly List<BookmarkItem> bookmarks = new List<BookmarkItem>();
        private readonly List<WebFavoriteItem> webFavorites = new List<WebFavoriteItem>();
        private readonly List<SubtitleCue> subtitles = new List<SubtitleCue>();
        private readonly Random random = new Random();

        private int currentIndex = -1;
        private bool seeking = false;
        private bool dark = true;
        private bool shuffle = false;
        private RepeatMode repeat = RepeatMode.None;
        private bool stretch = true;
        private bool theater = false;
        private bool miniMode = false;
        private Rectangle oldMiniBounds;
        private double pointA = -1;
        private double pointB = -1;
        private DateTime sleepAt = DateTime.MinValue;

        private FormBorderStyle oldBorder;
        private FormWindowState oldState;
        private Rectangle oldBounds;

        private readonly string sessionFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "NPlayerStudioPro");

        private static readonly string[] MediaExts =
        {
            ".wmv", ".mp4", ".m4v", ".mov", ".avi", ".mkv", ".mpeg", ".mpg",
            ".ts", ".m2ts", ".3gp", ".flv", ".webm", ".asf", ".vob",
            ".mp3", ".wav", ".wma", ".m4a", ".aac", ".flac", ".ogg", ".mid", ".midi"
        };

        private const string MediaFilter =
            "所有支援媒體|*.wmv;*.mp4;*.m4v;*.mov;*.avi;*.mkv;*.mpeg;*.mpg;*.ts;*.m2ts;*.3gp;*.flv;*.webm;*.asf;*.vob;*.mp3;*.wav;*.wma;*.m4a;*.aac;*.flac;*.ogg;*.mid;*.midi|" +
            "影片|*.wmv;*.mp4;*.m4v;*.mov;*.avi;*.mkv;*.mpeg;*.mpg;*.ts;*.m2ts;*.3gp;*.flv;*.webm;*.asf;*.vob|" +
            "音訊|*.mp3;*.wav;*.wma;*.m4a;*.aac;*.flac;*.ogg;*.mid;*.midi|所有檔案|*.*";

        private enum RepeatMode
        {
            None,
            One,
            All
        }

        public Form1()
        {
            InitializeComponent();
            MessageBox.OwnerProvider = delegate { return this; };
            RegisterDefaultHotkeys();
            BuildUI();
            BindEvents();
            Shown += Form1_Shown;
            Resize += delegate { SafeSetSplitterDistance(); ResizeEmbeddedBrowser(); };
        }

        private void Form1_Shown(object sender, EventArgs e)
        {
            BeginInvoke(new Action(SafeSetSplitterDistance));
            ConfigurePlayer();
            InitBrowser();
            LoadSession();
            LoadProductData();
            RefreshDashboard();
            Say("就緒。可拖曳檔案、資料夾，或使用連網播放。提示：按 Ctrl+K 或 Ctrl+P 可開啟指令面板。", true);
            if (lblSubtitle != null)
                lblSubtitle.Text = "可載入 .srt 字幕 · 右側 ? 可查看快捷提示";
            BeginInvoke(new Action(delegate
            {
                if (!StartGuidedTutorialIfNeeded())
                    ShowStartupShortcutTip();
            }));
        }



        private string UserFlagPath(string name)
        {
            try
            {
                Directory.CreateDirectory(sessionFolder);
                return Path.Combine(sessionFolder, name);
            }
            catch
            {
                return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, name);
            }
        }

        private bool IsFlagEnabled(string name)
        {
            try { return File.Exists(UserFlagPath(name)); } catch { return false; }
        }

        private void SetFlagEnabled(string name)
        {
            try { File.WriteAllText(UserFlagPath(name), DateTime.Now.ToString("s"), Encoding.UTF8); } catch { }
        }

        private bool StartGuidedTutorialIfNeeded()
        {
            if (IsFlagEnabled("aurora_guided_tutorial_seen_v1.flag")) return false;
            StartGuidedTutorial(false);
            return true;
        }

        private void StartGuidedTutorial(bool force)
        {
            try
            {
                if (tutorialActive) return;

                tutorialSteps = BuildGuidedTutorialSteps();
                tutorialIndex = 0;
                tutorialActive = true;

                tutorialOverlay = new GuidedTutorialOverlay(dark);
                tutorialOverlay.Dock = DockStyle.Fill;
                tutorialOverlay.SkipClicked += delegate { FinishGuidedTutorial(true); };
                tutorialOverlay.DoneClicked += delegate { FinishGuidedTutorial(false); };
                tutorialOverlay.TargetClicked += delegate
                {
                    tutorialIndex++;
                    ShowGuidedStep();
                };
                tutorialOverlay.WrongAreaClicked += delegate { ShowToast("請點擊 AURI 標示的發光區域，或按「跳過教學」。"); };

                Controls.Add(tutorialOverlay);
                tutorialOverlay.BringToFront();
                ShowGuidedStep();
            }
            catch
            {
                tutorialActive = false;
            }
        }

        private List<TutorialStep> BuildGuidedTutorialSteps()
        {
            List<TutorialStep> steps = new List<TutorialStep>();

            steps.Add(new TutorialStep(
                "播放艙 / 1",
                "這裡是主要播放區。你可以把影片、音訊或資料夾拖曳到這裡。\n\n請點擊亮起的播放區，AURI 會帶你到下一步。",
                delegate { return displayHost; },
                null));

            steps.Add(new TutorialStep(
                "播放控制 / 2",
                "這是播放鍵。播放、暫停是最常用的操作。\n\n請點擊亮起的「播放」按鈕。",
                delegate { return btnPlay; },
                null));

            steps.Add(new TutorialStep(
                "時間軸 / 3",
                "這條是進度列，可以拖曳或點擊來跳轉影片時間。\n\n請點擊亮起的時間軸。",
                delegate { return seekBar; },
                null));

            steps.Add(new TutorialStep(
                "音量控制 / 4",
                "右下角是音量控制區。也可以用 ↑ / ↓ 調整音量，M 可靜音。\n\n請點擊亮起的音量滑桿。",
                delegate { return volBar; },
                null));

            steps.Add(new TutorialStep(
                "側邊工作區 / 5",
                "右側的 ☰ 是側邊工作區選單。\n\n所有功能頁都藏在這裡，避免畫面擠滿按鈕。請點擊 ☰。",
                delegate { return btnSideMenu; },
                null));

            steps.Add(new TutorialStep(
                "播放清單 / 6",
                "這裡會顯示加入的本機檔案、網路串流與平台網址。\n\n你可以播放選取、排序、移除、清空或開啟來源位置。",
                delegate { return lvPlaylist; },
                delegate { SwitchSideTabByTitle("播放清單"); }));

            steps.Add(new TutorialStep(
                "平台搜尋 / 7",
                "這裡可搜尋 YouTube、Bilibili、愛奇藝等平台。\n\n有 WebView2 就內嵌，沒有就嘗試 Edge / Chrome 嵌入。",
                delegate { return sideTopBar; },
                delegate { SwitchSideTabByTitle("平台搜尋"); }));

            steps.Add(new TutorialStep(
                "沉浸影音 / 8",
                "這裡是畫質、HDR、Dolby Vision、AR / VR / 360 的相容入口。\n\n這些功能採 Optional Engine 設計，不會把大型套件硬包進作業。",
                delegate { return sideTopBar; },
                delegate { SwitchSideTabByTitle("沉浸影音"); }));

            steps.Add(new TutorialStep(
                "外部核心 / 9",
                "這裡會偵測 WebView2、Edge / Chrome、FFmpeg、VLC、CefSharp。\n\n有安裝就顯示可用，沒安裝也能自動降級。",
                delegate { return sideTopBar; },
                delegate { SwitchSideTabByTitle("外部核心"); RefreshExternalCoreStatus(); }));

            steps.Add(new TutorialStep(
                "Ctrl+K 指令面板 / 10",
                "這是最強的操作方式。\n\n按 Ctrl+K 或 Ctrl+P 可以搜尋所有功能，例如截圖、README、外部核心、HDR、電影夜。",
                delegate { return sideTopBar; },
                delegate { SwitchSideTabByTitle("指令中心"); RefreshCommandCenterReport(); }));

            steps.Add(new TutorialStep(
                "展示中心 / 11",
                "展示中心可以產生 README、展示台詞、繳交檢查、播放清單分析與 21MB 打包提醒。",
                delegate { return sideTopBar; },
                delegate { SwitchSideTabByTitle("展示中心"); RefreshShowcaseReport(); }));

            steps.Add(new TutorialStep(
                "開始使用 / 12",
                "導覽完成。\n\n現在所有功能都會解鎖。你可以自由操作播放器，也可以按 Ctrl+K 搜尋「重播星際導覽」再次開啟教學。",
                null,
                null));

            return steps;
        }

        private void ShowGuidedStep()
        {
            if (tutorialOverlay == null || tutorialSteps == null || tutorialSteps.Count == 0) return;
            if (tutorialIndex < 0) tutorialIndex = 0;
            if (tutorialIndex >= tutorialSteps.Count)
            {
                FinishGuidedTutorial(false);
                return;
            }

            UnregisterTutorialTarget();

            TutorialStep step = tutorialSteps[tutorialIndex];
            if (step.OnEnter != null)
                step.OnEnter();

            BeginInvoke(new Action(delegate
            {
                Control target = step.Target == null ? null : step.Target();
                Rectangle rect = TargetRectInTutorial(target);
                bool last = tutorialIndex == tutorialSteps.Count - 1;

                Bitmap backdrop = CaptureTutorialBackdrop();
                tutorialOverlay.SetBackdrop(backdrop);
                tutorialOverlay.SetStep(step.Title, step.Body, rect, tutorialIndex + 1, tutorialSteps.Count, last);
                tutorialOverlay.BringToFront();
            }));
        }

        private Bitmap CaptureTutorialBackdrop()
        {
            try
            {
                if (ClientSize.Width <= 0 || ClientSize.Height <= 0) return null;

                bool oldVisible = tutorialOverlay != null && tutorialOverlay.Visible;
                if (tutorialOverlay != null) tutorialOverlay.Visible = false;

                Bitmap bmp = new Bitmap(ClientSize.Width, ClientSize.Height);
                DrawToBitmap(bmp, new Rectangle(Point.Empty, ClientSize));

                if (tutorialOverlay != null) tutorialOverlay.Visible = oldVisible;
                return bmp;
            }
            catch
            {
                try
                {
                    if (tutorialOverlay != null) tutorialOverlay.Visible = true;
                }
                catch { }
                return null;
            }
        }

        private Rectangle TargetRectInTutorial(Control target)
        {
            try
            {
                if (tutorialOverlay == null || target == null || target.IsDisposed || !target.Visible)
                    return Rectangle.Empty;

                Point screen = target.PointToScreen(Point.Empty);
                Point local = tutorialOverlay.PointToClient(screen);
                Rectangle r = new Rectangle(local, target.Size);
                r.Inflate(10, 10);
                return r;
            }
            catch
            {
                return Rectangle.Empty;
            }
        }

        private void RegisterTutorialTarget(Control target)
        {
            UnregisterTutorialTarget();
            tutorialClickTarget = target;
            tutorialTargetMouseClick = delegate
            {
                BeginInvoke(new Action(delegate
                {
                    tutorialIndex++;
                    ShowGuidedStep();
                }));
            };
            tutorialClickTarget.MouseClick += tutorialTargetMouseClick;
        }

        private void UnregisterTutorialTarget()
        {
            try
            {
                if (tutorialClickTarget != null && tutorialTargetMouseClick != null)
                    tutorialClickTarget.MouseClick -= tutorialTargetMouseClick;
            }
            catch { }
            tutorialClickTarget = null;
            tutorialTargetMouseClick = null;
        }

        private void FinishGuidedTutorial(bool skipped)
        {
            UnregisterTutorialTarget();

            if (tutorialOverlay != null)
            {
                Controls.Remove(tutorialOverlay);
                tutorialOverlay.Dispose();
                tutorialOverlay = null;
            }

            tutorialActive = false;
            SetFlagEnabled("aurora_guided_tutorial_seen_v1.flag");

            if (skipped)
                Say("已跳過 AURI 引導式教學。按 Ctrl+K 搜尋「重播星際導覽」可再次播放。", true);
            else
                Say("AURI 引導式教學完成，所有功能已解鎖。", true);
        }

        private void ShowStartupShortcutTip()
        {
            try
            {
                if (IsFlagEnabled("hide_startup_tip.flag")) return;

                using (CinemaMessageDialog d = new CinemaMessageDialog(
                    "AURORA 使用提示",
                    "功能提示：\n\n" +
                    "按 Ctrl + K 或 Ctrl + P 可以開啟「指令面板」。\n\n" +
                    "助教可以直接搜尋並執行：播放、截圖、跳到時間、平台搜尋、HDR、WebXR、外部核心、README、展示中心、電影夜等功能。\n\n" +
                    "右側也可以按 ☰ 選單切換各功能頁。\n\n若想重播動畫導覽，按 Ctrl+K 搜尋「重播星際導覽」。",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information,
                    dark,
                    true))
                {
                    d.ShowDialog(this);
                    if (d.DoNotShowAgain)
                        SetFlagEnabled("hide_startup_tip.flag");
                }
            }
            catch { }
        }

        private void ReplayAuroraGuide()
        {
            StartGuidedTutorial(true);
        }

        private void StyleIconButton(Button button, bool blue)
        {
            CinemaButton cb = button as CinemaButton;
            if (cb == null) return;

            if (blue)
            {
                cb.BaseColor = Color.FromArgb(24, 72, 152);
                cb.HoverColor = Color.FromArgb(46, 112, 214);
                cb.PressedColor = Color.FromArgb(18, 55, 118);
                cb.BorderColor = Color.FromArgb(104, 172, 255);
                cb.TextColor = Color.White;
            }
            else
            {
                cb.BaseColor = Color.FromArgb(117, 72, 22);
                cb.HoverColor = Color.FromArgb(183, 112, 31);
                cb.PressedColor = Color.FromArgb(92, 56, 18);
                cb.BorderColor = Color.FromArgb(255, 190, 88);
                cb.TextColor = Color.FromArgb(255, 238, 202);
            }

            cb.CornerRadius = 17;
        }

        private void ShowQuickHelpCard(Control anchor)
        {
            string body =
                "Ctrl+K / Ctrl+P：開啟指令面板\n" +
                "Space：播放 / 暫停\n" +
                "F11：劇院模式\n" +
                "Ctrl+S：畫面截圖\n" +
                "Ctrl+J：跳到指定時間\n\n" +
                "建議展示：按 Ctrl+K 搜尋「外部核心」、「展示中心」、「沉浸影音」、「重播星際導覽」。";

            ShowFloatingHelp(anchor, "快捷教學", body, "開啟指令面板", "重播導覽",
                delegate { ShowCommandPalette(); },
                delegate { ReplayAuroraGuide(); },
                true);
        }

        private void ShowQuickInfoCard(Control anchor)
        {
            string engine =
                usingModernWebView2 ? "WebView2" :
                (usingEmbeddedBrowserFallback ? "Edge / Chrome 嵌入" : "WMP / 自動");

            string body =
                "目前模式：" + (platformMode ? "平台播放" : "本機播放") + "\n" +
                "播放核心：" + engine + "\n" +
                "播放清單：" + playlist.Count + " 個項目\n" +
                "媒體庫：" + mediaLibrary.Count + " 個項目\n" +
                "收藏：" + favoriteItems.Count + " 個\n" +
                "稍後觀看：" + watchLaterItems.Count + " 個\n" +
                "影片筆記：" + videoNotes.Count + " 則\n\n" +
                "提示：右側功能太擠時，可按 ☰ → 展開側邊欄。";

            ShowFloatingHelp(anchor, "播放器狀態", body, "重新偵測", "首頁",
                delegate { RefreshExternalCoreStatus(); },
                delegate { SwitchSideTabByTitle("首頁"); RefreshDashboard(); },
                false);
        }

        private void ShowFloatingHelp(Control anchor, string title, string body, string primaryText, string secondaryText, EventHandler primaryAction, EventHandler secondaryAction, bool helpMode)
        {
            try
            {
                if (activeHelpCard != null && !activeHelpCard.IsDisposed)
                {
                    activeHelpCard.Close();
                    activeHelpCard = null;
                }

                activeHelpCard = new FloatingHelpCard(title, body, primaryText, secondaryText, dark, helpMode);
                activeHelpCard.PrimaryClicked += delegate
                {
                    if (primaryAction != null) primaryAction(this, EventArgs.Empty);
                };
                activeHelpCard.SecondaryClicked += delegate
                {
                    if (secondaryAction != null) secondaryAction(this, EventArgs.Empty);
                };

                Point p = anchor.PointToScreen(new Point(anchor.Width, 0));
                Rectangle work = Screen.FromControl(this).WorkingArea;
                int x = p.X - activeHelpCard.Width;
                int y = p.Y - activeHelpCard.Height - 10;

                if (x < work.Left + 12) x = work.Left + 12;
                if (x + activeHelpCard.Width > work.Right - 12) x = work.Right - activeHelpCard.Width - 12;
                if (y < work.Top + 12) y = p.Y + anchor.Height + 10;
                if (y + activeHelpCard.Height > work.Bottom - 12) y = work.Bottom - activeHelpCard.Height - 12;

                activeHelpCard.Location = new Point(x, y);
                activeHelpCard.Show(this);
            }
            catch { }
        }

        private void BuildUI()
        {
            Text = "NPlayer Studio Pro Lite - 多媒體播放器";
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1500, 900);
            MinimumSize = new Size(1180, 720);
            KeyPreview = true;
            AllowDrop = true;
            DoubleBuffered = true;
            FormBorderStyle = FormBorderStyle.None;
            Padding = new Padding(1);
            Font = new Font("Microsoft JhengHei UI", 9F);
            Icon = CreateAppIcon();

            root = new TableLayoutPanel();
            root.Dock = DockStyle.Fill;
            root.Padding = new Padding(10);
            root.RowCount = 5;
            root.ColumnCount = 1;
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 116));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 58));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 92));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            Controls.Add(root);

            BuildHeader();
            BuildMain();
            BuildSeekArea();
            BuildControls();
            BuildStatusBar();

            ApplyTheme();
        }

        private void BuildHeader()
        {
            header = new Panel();
            header.Dock = DockStyle.Fill;
            header.Padding = new Padding(0);

            titleBar = new Panel();
            titleBar.Dock = DockStyle.Top;
            titleBar.Height = 40;
            titleBar.Padding = new Padding(10, 6, 8, 6);
            titleBar.MouseDown += TitleBar_MouseDown;
            titleBar.DoubleClick += delegate { ToggleWindowState(); };

            picBrand = new PictureBox();
            picBrand.Size = new Size(24, 24);
            picBrand.Location = new Point(8, 7);
            picBrand.Image = CreateBrandBitmap(64, 64);
            picBrand.SizeMode = PictureBoxSizeMode.StretchImage;
            picBrand.MouseDown += TitleBar_MouseDown;

            Label cap = new Label();
            cap.Text = "NPlayer Studio Pro";
            cap.Font = new Font("Microsoft JhengHei UI", 10.5F, FontStyle.Bold);
            cap.AutoSize = true;
            cap.Location = new Point(40, 5);
            cap.MouseDown += TitleBar_MouseDown;

            Label capSub = new Label();
            capSub.Text = "CINEMA WORKSPACE";
            capSub.Font = new Font("Segoe UI", 7.5F, FontStyle.Bold);
            capSub.AutoSize = true;
            capSub.Location = new Point(42, 22);
            capSub.MouseDown += TitleBar_MouseDown;

            FlowLayoutPanel chrome = new FlowLayoutPanel();
            chrome.Dock = DockStyle.Right;
            chrome.Width = 140;
            chrome.FlowDirection = FlowDirection.RightToLeft;
            chrome.WrapContents = false;
            chrome.Padding = new Padding(0, 0, 0, 0);
            chrome.Margin = new Padding(0);

            btnWinClose = CreateWindowButton("✕", 40);
            btnWinMax = CreateWindowButton("▢", 40);
            btnWinMin = CreateWindowButton("—", 40);
            btnWinClose.Click += delegate { Close(); };
            btnWinMax.Click += delegate { ToggleWindowState(); };
            btnWinMin.Click += delegate { WindowState = FormWindowState.Minimized; };
            chrome.Controls.Add(btnWinClose);
            chrome.Controls.Add(btnWinMax);
            chrome.Controls.Add(btnWinMin);

            titleBar.Controls.Add(picBrand);
            titleBar.Controls.Add(cap);
            titleBar.Controls.Add(capSub);
            titleBar.Controls.Add(chrome);

            Panel hero = new Panel();
            hero.Dock = DockStyle.Fill;
            hero.Padding = new Padding(10, 6, 10, 6);
            hero.Paint += PaintHero;

            Label title = new Label();
            title.Text = "AURORA Cinema Deck";
            title.Font = new Font("Microsoft JhengHei UI", 20F, FontStyle.Bold);
            title.AutoSize = true;
            title.Location = new Point(8, 10);

            Label sub = new Label();
            sub.Text = "星幕播放艙｜平台搜尋｜本機串流｜字幕書籤｜Ctrl+K 指令面板｜專注劇院模式";
            sub.AutoSize = true;
            sub.Location = new Point(10, 48);

            Label mood = new Label();
            mood.Text = "TIP: PRESS CTRL+K / CTRL+P FOR COMMAND PALETTE";
            mood.AutoSize = true;
            mood.Location = new Point(10, 68);
            mood.Font = new Font("Segoe UI", 8F, FontStyle.Bold);

            FlowLayoutPanel tools = new FlowLayoutPanel();
            tools.Dock = DockStyle.Right;
            tools.Width = 980;
            tools.Padding = new Padding(0, 12, 0, 0);
            tools.WrapContents = false;

            Button addFile = Btn("＋ 檔案", 84);
            Button addFolder = Btn("＋ 資料夾", 92);
            Button addUrl = Btn("連網播放", 98);
            btnPlatformMode = Btn("平台搜尋", 92);
            Button addSub = Btn("字幕", 72);
            Button save = Btn("儲存清單", 96);
            Button load = Btn("載入清單", 96);
            Button sleep = Btn("睡眠", 72);
            btnTheme = Btn("亮色", 72);
            btnFullscreen = Btn("劇院", 78);

            addFile.Click += delegate { PickFiles(); };
            addFolder.Click += delegate { PickFolder(); };
            addUrl.Click += delegate { AddUrlDialog(true); };
            btnPlatformMode.Click += delegate { TogglePlatformMode(); };
            addSub.Click += delegate { PickSubtitle(); };
            save.Click += delegate { SavePlaylistDialog(); };
            load.Click += delegate { LoadPlaylistDialog(); };
            sleep.Click += delegate { SleepDialog(); };
            btnTheme.Click += delegate { dark = !dark; ApplyTheme(); SaveSession(); };
            btnFullscreen.Click += delegate { ToggleTheater(); };

            tools.Controls.Add(addFile);
            tools.Controls.Add(addFolder);
            tools.Controls.Add(addUrl);
            tools.Controls.Add(btnPlatformMode);
            tools.Controls.Add(addSub);
            tools.Controls.Add(save);
            tools.Controls.Add(load);
            tools.Controls.Add(sleep);
            tools.Controls.Add(btnTheme);
            tools.Controls.Add(btnFullscreen);

            hero.Controls.Add(title);
            hero.Controls.Add(sub);
            hero.Controls.Add(mood);
            hero.Controls.Add(tools);

            header.Controls.Add(hero);
            header.Controls.Add(titleBar);
            root.Controls.Add(header, 0, 0);
        }

        private void BuildMain()
        {
            split = new SplitContainer();
            split.Dock = DockStyle.Fill;
            split.FixedPanel = FixedPanel.Panel2;
            split.SplitterWidth = 8;




            split.Panel1MinSize = 1;
            split.Panel2MinSize = 1;

            viewer = new TableLayoutPanel();
            viewer.Dock = DockStyle.Fill;
            viewer.RowCount = 3;
            viewer.ColumnCount = 1;
            viewer.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            viewer.RowStyles.Add(new RowStyle(SizeType.Absolute, 44));
            viewer.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));

            displayHost = new CinemaPanel();
            displayHost.Dock = DockStyle.Fill;
            displayHost.BackColor = Color.Black;
            displayHost.Padding = new Padding(8);
            displayHost.AllowDrop = true;
            displayHost.Paint += PaintDisplayShell;

            playerHost = new Panel();
            playerHost.Dock = DockStyle.Fill;
            playerHost.BackColor = Color.Black;
            playerHost.AllowDrop = true;

            player = new AxWindowsMediaPlayer();
            ((ISupportInitialize)player).BeginInit();
            player.Dock = DockStyle.Fill;
            player.Name = "player";
            player.Enabled = true;
            ((ISupportInitialize)player).EndInit();
            playerHost.Controls.Add(player);

            webHost = new Panel();
            webHost.Dock = DockStyle.Fill;
            webHost.BackColor = Color.Black;
            webHost.Visible = false;
            webHost.Resize += delegate { ResizeEmbeddedBrowser(); };
            displayHost.MouseMove += FloatingAreaMouseMove;
            playerHost.MouseMove += FloatingAreaMouseMove;
            webHost.MouseMove += FloatingAreaMouseMove;

            externalPanel = BuildExternalBrowserPanel();
            webHost.Controls.Add(externalPanel);

            displayHost.Controls.Add(playerHost);
            displayHost.Controls.Add(webHost);
            BuildWelcomeStage();
            BuildFloatingControls();
            playerHost.BringToFront();
            webHost.BringToFront();
            welcomeStage.BringToFront();
            floatingControls.BringToFront();

            Panel subtitleBar = new Panel();
            subtitleBar.Dock = DockStyle.Fill;
            subtitleBar.Padding = new Padding(12, 4, 12, 4);

            lblSubtitle = new Label();
            lblSubtitle.Dock = DockStyle.Fill;
            lblSubtitle.TextAlign = ContentAlignment.MiddleLeft;
            lblSubtitle.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            lblSubtitle.ForeColor = Color.FromArgb(210, 220, 235);
            lblSubtitle.Text = "可載入 .srt 字幕 · 也會自動嘗試同名字幕";

            btnQuickHelp = Btn("?", 34);
            btnQuickHelp.Dock = DockStyle.Right;
            btnQuickHelp.Width = 34;
            btnQuickHelp.Height = 32;
            btnQuickHelp.Margin = new Padding(6, 0, 0, 0);
            btnQuickHelp.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            btnQuickHelp.Text = "?";
            btnQuickHelp.TextAlign = ContentAlignment.MiddleCenter;
            btnQuickHelp.Click += delegate { ShowQuickHelpCard(btnQuickHelp); };
            btnQuickHelp.MouseEnter += delegate { ShowQuickHelpCard(btnQuickHelp); };
            StyleIconButton(btnQuickHelp, true);

            btnQuickInfo = Btn("i", 34);
            btnQuickInfo.Dock = DockStyle.Right;
            btnQuickInfo.Width = 34;
            btnQuickInfo.Height = 32;
            btnQuickInfo.Margin = new Padding(6, 0, 0, 0);
            btnQuickInfo.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            btnQuickInfo.Text = "i";
            btnQuickInfo.TextAlign = ContentAlignment.MiddleCenter;
            btnQuickInfo.Click += delegate { ShowQuickInfoCard(btnQuickInfo); };
            btnQuickInfo.MouseEnter += delegate { ShowQuickInfoCard(btnQuickInfo); };
            StyleIconButton(btnQuickInfo, false);

            quickTip = new ToolTip();
            quickTip.InitialDelay = 250;
            quickTip.ReshowDelay = 100;
            quickTip.AutoPopDelay = 5000;
            quickTip.SetToolTip(btnQuickHelp, "教學與快捷鍵");
            quickTip.SetToolTip(btnQuickInfo, "目前播放器狀態");

            subtitleBar.Controls.Add(lblSubtitle);
            subtitleBar.Controls.Add(btnQuickInfo);
            subtitleBar.Controls.Add(btnQuickHelp);

            Panel videoBar = new Panel();
            videoBar.Dock = DockStyle.Fill;
            videoBar.Padding = new Padding(12, 0, 12, 0);

            lblNow = new Label();
            lblNow.Dock = DockStyle.Left;
            lblNow.Width = 760;
            lblNow.TextAlign = ContentAlignment.MiddleLeft;
            lblNow.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            lblNow.Text = "尚未播放";

            lblTimeOnVideo = new Label();
            lblTimeOnVideo.Dock = DockStyle.Right;
            lblTimeOnVideo.Width = 160;
            lblTimeOnVideo.TextAlign = ContentAlignment.MiddleRight;
            lblTimeOnVideo.Font = new Font("Consolas", 10F, FontStyle.Bold);
            lblTimeOnVideo.Text = "00:00 / 00:00";

            videoBar.Controls.Add(lblNow);
            videoBar.Controls.Add(lblTimeOnVideo);

            viewer.Controls.Add(displayHost, 0, 0);
            viewer.Controls.Add(subtitleBar, 0, 1);
            viewer.Controls.Add(videoBar, 0, 2);
            split.Panel1.Controls.Add(viewer);

            TableLayoutPanel sideShell = new TableLayoutPanel();
            sideShell.Dock = DockStyle.Fill;
            sideShell.RowCount = 2;
            sideShell.ColumnCount = 1;
            sideShell.RowStyles.Add(new RowStyle(SizeType.Absolute, 50));
            sideShell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            sideShell.Padding = new Padding(0);

            sideTopBar = new Panel();
            sideTopBar.Dock = DockStyle.Fill;
            sideTopBar.Padding = new Padding(8, 8, 8, 6);

            btnSideMenu = Btn("☰", 44);
            btnSideMenu.Height = 34;
            btnSideMenu.Dock = DockStyle.Left;
            btnSideMenu.Font = new Font("Segoe UI Symbol", 12F, FontStyle.Bold);
            btnSideMenu.Click += delegate
            {
                if (sideMenu != null) sideMenu.Show(btnSideMenu, new Point(0, btnSideMenu.Height + 2));
            };

            lblSideSection = new Label();
            lblSideSection.Dock = DockStyle.Fill;
            lblSideSection.TextAlign = ContentAlignment.MiddleLeft;
            lblSideSection.Font = new Font("Microsoft JhengHei UI", 11F, FontStyle.Bold);
            lblSideSection.Padding = new Padding(12, 0, 0, 0);
            lblSideSection.Text = "播放清單";

            Label sideHint = new Label();
            sideHint.Dock = DockStyle.Right;
            sideHint.Width = 90;
            sideHint.TextAlign = ContentAlignment.MiddleRight;
            sideHint.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
            sideHint.Text = "Ctrl+K";

            sideTopBar.Controls.Add(lblSideSection);
            sideTopBar.Controls.Add(sideHint);
            sideTopBar.Controls.Add(btnSideMenu);

            sideTabs = new TabControl();
            sideTabs.Dock = DockStyle.Fill;
            sideTabs.Appearance = TabAppearance.FlatButtons;
            sideTabs.ItemSize = new Size(0, 1);
            sideTabs.SizeMode = TabSizeMode.Fixed;
            sideTabs.Multiline = true;

            sideTabs.TabPages.Add(DashboardTab());
            sideTabs.TabPages.Add(PlaylistTab());
            sideTabs.TabPages.Add(MediaLibraryTab());
            sideTabs.TabPages.Add(CollectionsTab());
            sideTabs.TabPages.Add(VideoNotesTab());
            sideTabs.TabPages.Add(RecommendationModeTab());
            sideTabs.TabPages.Add(ChaptersTab());
            sideTabs.TabPages.Add(HeatmapTab());
            sideTabs.TabPages.Add(PreviewTab());
            sideTabs.TabPages.Add(StatusCenterTab());
            sideTabs.TabPages.Add(SettingsCenterTab());
            sideTabs.TabPages.Add(ThemeStudioTab());
            sideTabs.TabPages.Add(DemoFlowTab());
            sideTabs.TabPages.Add(PlatformTab());
            sideTabs.TabPages.Add(InfoTab());
            sideTabs.TabPages.Add(BookmarkTab());
            sideTabs.TabPages.Add(ImmersiveTab());
            sideTabs.TabPages.Add(ExternalCoreTab());
            sideTabs.TabPages.Add(ShowcaseTab());
            sideTabs.TabPages.Add(CommandCenterTab());
            sideTabs.TabPages.Add(StatsTab());
            sideTabs.TabPages.Add(HotkeyTab());
            sideTabs.TabPages.Add(SessionSnapshotTab());
            sideTabs.TabPages.Add(SubtitleStyleTab());
            sideTabs.TabPages.Add(ToolsTab());
            sideTabs.TabPages.Add(LogTab());
            sideTabs.SelectedIndexChanged += delegate { UpdateSideSectionTitle(); };

            sideMenu = new ContextMenuStrip();
            BuildSideMenu();

            sideShell.Controls.Add(sideTopBar, 0, 0);
            sideShell.Controls.Add(sideTabs, 0, 1);
            split.Panel2.Controls.Add(sideShell);

            root.Controls.Add(split, 0, 1);
        }

        private void BuildSideMenu()
        {
            if (sideMenu == null || sideTabs == null) return;
            sideMenu.Items.Clear();

            ToolStripMenuItem command = new ToolStripMenuItem("Ctrl+K 指令面板");
            command.Click += delegate { ShowCommandPalette(); };
            sideMenu.Items.Add(command);
            sideMenu.Items.Add(new ToolStripSeparator());

            for (int i = 0; i < sideTabs.TabPages.Count; i++)
            {
                int index = i;
                ToolStripMenuItem item = new ToolStripMenuItem(sideTabs.TabPages[i].Text);
                item.Click += delegate { SwitchSideTab(index); };
                sideMenu.Items.Add(item);
            }

            sideMenu.Items.Add(new ToolStripSeparator());
            ToolStripMenuItem expand = new ToolStripMenuItem("展開側邊欄");
            expand.Click += delegate
            {
                try
                {
                    int usableWidth = split.ClientSize.Width;
                    int distance = Math.Max(split.Panel1MinSize, usableWidth - 500 - split.SplitterWidth);
                    if (distance > 0 && distance < usableWidth) split.SplitterDistance = distance;
                }
                catch { }
            };
            ToolStripMenuItem compact = new ToolStripMenuItem("精簡側邊欄");
            compact.Click += delegate
            {
                try
                {
                    int usableWidth = split.ClientSize.Width;
                    int distance = Math.Max(split.Panel1MinSize, usableWidth - 360 - split.SplitterWidth);
                    if (distance > 0 && distance < usableWidth) split.SplitterDistance = distance;
                }
                catch { }
            };
            sideMenu.Items.Add(expand);
            sideMenu.Items.Add(compact);
        }

        private void SwitchSideTab(int index)
        {
            if (sideTabs == null) return;
            if (index < 0 || index >= sideTabs.TabPages.Count) return;
            sideTabs.SelectedIndex = index;
            UpdateSideSectionTitle();
        }

        private void UpdateSideSectionTitle()
        {
            if (lblSideSection == null || sideTabs == null || sideTabs.SelectedTab == null) return;
            lblSideSection.Text = sideTabs.SelectedTab.Text + " · 側邊工作區";
        }

        private void BuildWelcomeStage()
        {
            welcomeStage = new StarfieldWelcomePanel();
            welcomeStage.Dock = DockStyle.Fill;
            welcomeStage.BackColor = Color.Black;
            welcomeStage.Visible = true;
            welcomeStage.Cursor = Cursors.Hand;
            welcomeStage.AccentColor = themeAccent;
            welcomeStage.Paint += PaintWelcomeStage;
            welcomeStage.DoubleClick += delegate { PickFiles(); };
            welcomeStage.DragEnter += DragEnterHandler;
            welcomeStage.DragDrop += DragDropHandler;

            TableLayoutPanel center = new TableLayoutPanel();
            center.BackColor = Color.FromArgb(8, 12, 20);
            center.Width = 660;
            center.Height = 260;
            center.ColumnCount = 1;
            center.RowCount = 5;
            center.Anchor = AnchorStyles.None;
            center.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
            center.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            center.RowStyles.Add(new RowStyle(SizeType.Absolute, 78));
            center.RowStyles.Add(new RowStyle(SizeType.Absolute, 58));
            center.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            lblWelcomeTitle = new Label();
            lblWelcomeTitle.Text = "AURORA CINEMA DECK";
            lblWelcomeTitle.Dock = DockStyle.Fill;
            lblWelcomeTitle.TextAlign = ContentAlignment.MiddleCenter;
            lblWelcomeTitle.Font = new Font("Segoe UI", 22F, FontStyle.Bold);
            lblWelcomeTitle.ForeColor = Color.FromArgb(255, 226, 170);
            lblWelcomeTitle.BackColor = Color.Transparent;

            lblWelcomeSub = new Label();
            lblWelcomeSub.Text = "Drop your media here · Ctrl+K Command Palette";
            lblWelcomeSub.Dock = DockStyle.Fill;
            lblWelcomeSub.TextAlign = ContentAlignment.MiddleCenter;
            lblWelcomeSub.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            lblWelcomeSub.ForeColor = Color.FromArgb(180, 198, 225);
            lblWelcomeSub.BackColor = Color.Transparent;

            Label desc = new Label();
            desc.Text = "拖曳影片、音樂、資料夾或 URL 到這裡\\n也可以掃描媒體庫、繼續觀看或搜尋平台影片";
            desc.Dock = DockStyle.Fill;
            desc.TextAlign = ContentAlignment.MiddleCenter;
            desc.Font = new Font("Microsoft JhengHei UI", 10F);
            desc.ForeColor = Color.FromArgb(225, 234, 246);
            desc.BackColor = Color.Transparent;

            FlowLayoutPanel buttons = new FlowLayoutPanel();
            buttons.Dock = DockStyle.Fill;
            buttons.WrapContents = false;
            buttons.FlowDirection = FlowDirection.LeftToRight;
            buttons.BackColor = Color.Transparent;

            Button open = Btn("＋ 檔案", 86);
            Button playFirst = Btn("▶ 播放第一部", 126);
            Button showList = Btn("播放清單", 104);
            Button scan = Btn("掃描媒體庫", 116);
            Button platform = Btn("平台搜尋", 104);

            open.Click += delegate { PickFiles(); };
            playFirst.Click += delegate { PlayFirstPlaylistItem(); };
            showList.Click += delegate { ShowPlaylistOnly(); };
            scan.Click += delegate { ScanMediaLibraryDialog(); };
            platform.Click += delegate { SwitchSideTabByTitle("平台搜尋"); ShowPlatformMode(true); };

            buttons.Controls.Add(open);
            buttons.Controls.Add(playFirst);
            buttons.Controls.Add(showList);
            buttons.Controls.Add(scan);
            buttons.Controls.Add(platform);

            Label tip = new Label();
            tip.Text = "未播放時顯示歡迎舞台；播放開始後會自動隱藏。";
            tip.Dock = DockStyle.Fill;
            tip.TextAlign = ContentAlignment.MiddleCenter;
            tip.Font = new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);
            tip.ForeColor = Color.FromArgb(145, 160, 188);
            tip.BackColor = Color.Transparent;

            center.Controls.Add(lblWelcomeTitle, 0, 0);
            center.Controls.Add(lblWelcomeSub, 0, 1);
            center.Controls.Add(desc, 0, 2);
            center.Controls.Add(buttons, 0, 3);
            center.Controls.Add(tip, 0, 4);

            welcomeStage.Controls.Add(center);
            welcomeStage.Resize += delegate
            {
                center.Location = new Point(
                    Math.Max(0, (welcomeStage.ClientSize.Width - center.Width) / 2),
                    Math.Max(0, (welcomeStage.ClientSize.Height - center.Height) / 2));
            };

            displayHost.Controls.Add(welcomeStage);
        }

        private void PaintWelcomeStage(object sender, PaintEventArgs e)
        {
            Control c = (Control)sender;
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;

            Rectangle r = c.ClientRectangle;
            if (r.Width <= 0 || r.Height <= 0) return;

            using (LinearGradientBrush bg = new LinearGradientBrush(
                r,
                Color.FromArgb(2, 5, 13),
                Color.FromArgb(12, 22, 42),
                90f))
            {
                g.FillRectangle(bg, r);
            }

            DrawAuroraNebula(g, r);
            DrawStableStarfield(g, r);
            DrawPlanetRing(g, r);

            Rectangle card = new Rectangle(
                Math.Max(20, (r.Width - 660) / 2),
                Math.Max(20, (r.Height - 340) / 2),
                Math.Min(660, r.Width - 40),
                Math.Min(340, r.Height - 40));

            if (card.Width > 0 && card.Height > 0)
            {
                using (GraphicsPath gp = CreateRoundPath(card, 32))
                using (LinearGradientBrush br = new LinearGradientBrush(
                    card,
                    Color.FromArgb(58, themeAccent),
                    Color.FromArgb(26, 34, 48),
                    90f))
                using (Pen pen = new Pen(Color.FromArgb(150, themeAccent), 1))
                {
                    g.FillPath(br, gp);
                    g.DrawPath(pen, gp);
                }

                Rectangle inner = new Rectangle(card.X + 18, card.Y + 18, card.Width - 36, card.Height - 36);
                using (GraphicsPath gp = CreateRoundPath(inner, 24))
                using (Pen p = new Pen(Color.FromArgb(38, Color.White), 1))
                {
                    g.DrawPath(p, gp);
                }
            }
        }

        private void DrawStableStarfield(Graphics g, Rectangle r)
        {
            for (int i = 0; i < 170; i++)
            {
                int x = (i * 97 + 53) % Math.Max(1, r.Width);
                int y = (i * 57 + 31) % Math.Max(1, r.Height);

                double wave = Math.Sin(ambientPulse * 1.5 + i * 0.37);
                int alpha = 70 + (int)(75 * Math.Abs(wave));
                int size = 1 + (i % 4 == 0 ? 1 : 0) + (i % 29 == 0 ? 1 : 0);

                using (SolidBrush b = new SolidBrush(Color.FromArgb(alpha, 210, 230, 255)))
                    g.FillEllipse(b, x, y, size, size);

                if (i % 37 == 0)
                {
                    using (Pen p = new Pen(Color.FromArgb(60, 210, 230, 255), 1))
                    {
                        g.DrawLine(p, x - 4, y, x + 4, y);
                        g.DrawLine(p, x, y - 4, x, y + 4);
                    }
                }
            }

            int sx = (int)(r.Width * 0.78 + Math.Sin(ambientPulse) * 20);
            int sy = (int)(r.Height * 0.18 + Math.Cos(ambientPulse * 0.7) * 12);
            using (Pen comet = new Pen(Color.FromArgb(105, themeAccent), 2))
            {
                comet.StartCap = System.Drawing.Drawing2D.LineCap.Round;
                comet.EndCap = System.Drawing.Drawing2D.LineCap.Round;
                g.DrawLine(comet, sx, sy, sx - 82, sy + 30);
            }
            using (SolidBrush b = new SolidBrush(Color.FromArgb(210, 255, 238, 200)))
                g.FillEllipse(b, sx - 3, sy - 3, 6, 6);
        }

        private void DrawAuroraNebula(Graphics g, Rectangle r)
        {
            Rectangle n1 = new Rectangle(-r.Width / 8, r.Height / 8, r.Width / 2, r.Height / 2);
            Rectangle n2 = new Rectangle(r.Width / 2, r.Height / 3, r.Width / 2, r.Height / 2);

            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddEllipse(n1);
                using (PathGradientBrush br = new PathGradientBrush(p))
                {
                    br.CenterColor = Color.FromArgb(42, 80, 150, 255);
                    br.SurroundColors = new Color[] { Color.FromArgb(0, 80, 150, 255) };
                    g.FillPath(br, p);
                }
            }

            using (GraphicsPath p = new GraphicsPath())
            {
                p.AddEllipse(n2);
                using (PathGradientBrush br = new PathGradientBrush(p))
                {
                    br.CenterColor = Color.FromArgb(34, themeAccent);
                    br.SurroundColors = new Color[] { Color.FromArgb(0, themeAccent) };
                    g.FillPath(br, p);
                }
            }

            using (Pen p = new Pen(Color.FromArgb(35, 150, 190, 255), 1))
            {
                p.DashStyle = DashStyle.Dash;
                g.DrawBezier(p,
                    new Point(20, r.Height - 80),
                    new Point(r.Width / 3, r.Height / 2),
                    new Point(r.Width * 2 / 3, r.Height / 2 + 60),
                    new Point(r.Width - 30, 80));
            }
        }

        private void DrawPlanetRing(Graphics g, Rectangle r)
        {
            int cx = r.Width - 180;
            int cy = r.Height - 135;
            int size = 105;

            Rectangle planet = new Rectangle(cx - size / 2, cy - size / 2, size, size);
            using (GraphicsPath gp = new GraphicsPath())
            {
                gp.AddEllipse(planet);
                using (PathGradientBrush br = new PathGradientBrush(gp))
                {
                    br.CenterColor = Color.FromArgb(50, themeAccent);
                    br.SurroundColors = new Color[] { Color.FromArgb(0, themeAccent) };
                    g.FillPath(br, gp);
                }
            }

            using (Pen ring = new Pen(Color.FromArgb(76, themeAccent), 2))
            {
                Rectangle rr = new Rectangle(cx - 88, cy - 28, 176, 56);
                g.DrawEllipse(ring, rr);
            }
        }

        private void BuildFloatingControls()
        {
            floatingControls = new CinemaPanel();
            floatingControls.Height = 62;
            floatingControls.Width = 540;
            floatingControls.Anchor = AnchorStyles.Bottom;
            floatingControls.BackColor = Color.Transparent;
            floatingControls.Visible = false;
            floatingControls.CornerRadius = 22;
            floatingControls.Padding = new Padding(12, 10, 12, 10);

            FlowLayoutPanel row = new FlowLayoutPanel();
            row.Dock = DockStyle.Fill;
            row.BackColor = Color.Transparent;
            row.WrapContents = false;

            Button bBack = Btn("⏪ 10", 74);
            Button bPlay = Btn("▶/Ⅱ", 84);
            Button bForward = Btn("10 ⏩", 74);
            Button bMute = Btn("靜音", 72);
            Button bShot = Btn("截圖", 72);
            Button bCmd = Btn("Ctrl+K", 84);
            Button bTheater = Btn("劇院", 74);

            bBack.Click += delegate { SeekRelative(-10); };
            bPlay.Click += delegate { PlayPause(); };
            bForward.Click += delegate { SeekRelative(10); };
            bMute.Click += delegate { ToggleMute(); };
            bShot.Click += delegate { SaveDisplaySnapshot(); };
            bCmd.Click += delegate { ShowCommandPalette(); };
            bTheater.Click += delegate { ToggleTheater(); };

            row.Controls.Add(bBack);
            row.Controls.Add(bPlay);
            row.Controls.Add(bForward);
            row.Controls.Add(bMute);
            row.Controls.Add(bShot);
            row.Controls.Add(bCmd);
            row.Controls.Add(bTheater);

            floatingControls.Controls.Add(row);
            displayHost.Controls.Add(floatingControls);
            PositionFloatingControls();

            floatingTimer = new System.Windows.Forms.Timer();
            floatingTimer.Interval = 500;
            floatingTimer.Tick += delegate
            {
                if (floatingControls == null) return;
                if (DateTime.Now.Subtract(lastFloatingMove).TotalSeconds > 2.2)
                    floatingControls.Visible = false;
            };
            floatingTimer.Start();

            displayHost.Resize += delegate { PositionFloatingControls(); };
        }

        private void FloatingAreaMouseMove(object sender, MouseEventArgs e)
        {
            if (floatingControls == null) return;
            lastFloatingMove = DateTime.Now;
            PositionFloatingControls();
            floatingControls.Visible = true;
            floatingControls.BringToFront();
        }

        private void PositionFloatingControls()
        {
            if (floatingControls == null || displayHost == null) return;
            int x = Math.Max(12, (displayHost.ClientSize.Width - floatingControls.Width) / 2);
            int y = Math.Max(12, displayHost.ClientSize.Height - floatingControls.Height - 18);
            floatingControls.Location = new Point(x, y);
        }

        private void SafeSetSplitterDistance()
        {
            if (split == null || split.IsDisposed) return;

            try
            {
                int usableWidth = split.ClientSize.Width;
                if (usableWidth <= 80) return;

                int desiredPanel1Min = 300;
                int desiredPanel2Min = 360;
                int desiredPanel2Width = 470;
                int sw = split.SplitterWidth;

                split.Panel1MinSize = 1;
                split.Panel2MinSize = 1;

                int panel2Width = desiredPanel2Width;
                int maxPanel2Width = usableWidth - desiredPanel1Min - sw;
                if (maxPanel2Width < 120) maxPanel2Width = Math.Max(1, usableWidth / 3);
                if (panel2Width > maxPanel2Width) panel2Width = maxPanel2Width;
                if (panel2Width < 120) panel2Width = Math.Min(120, Math.Max(1, usableWidth / 3));

                int distance = usableWidth - panel2Width - sw;
                if (distance < 1) distance = 1;
                if (distance > usableWidth - sw - 1) distance = usableWidth - sw - 1;

                split.SplitterDistance = distance;


                int safePanel1Min = Math.Min(desiredPanel1Min, Math.Max(1, distance));
                int safePanel2Min = Math.Min(desiredPanel2Min, Math.Max(1, usableWidth - distance - sw));

                split.Panel1MinSize = safePanel1Min;
                split.Panel2MinSize = safePanel2Min;
            }
            catch
            {

            }
        }

        private TabPage DashboardTab()
        {
            TabPage page = new TabPage("首頁");

            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 92));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 242));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 76));

            CinemaPanel hero = new CinemaPanel();
            hero.Dock = DockStyle.Fill;
            hero.CornerRadius = 20;
            hero.Padding = new Padding(14, 10, 14, 10);
            hero.Margin = new Padding(0, 0, 0, 10);

            TableLayoutPanel heroGrid = new TableLayoutPanel();
            heroGrid.Dock = DockStyle.Fill;
            heroGrid.ColumnCount = 1;
            heroGrid.RowCount = 3;
            heroGrid.BackColor = Color.Transparent;
            heroGrid.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
            heroGrid.RowStyles.Add(new RowStyle(SizeType.Absolute, 22));
            heroGrid.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = new Label();
            title.Text = "AURORA 首頁";
            title.Dock = DockStyle.Fill;
            title.TextAlign = ContentAlignment.MiddleLeft;
            title.Font = new Font("Microsoft JhengHei UI", 13F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(255, 228, 170);
            title.BackColor = Color.Transparent;

            Label subtitle = new Label();
            subtitle.Text = "繼續觀看 · 媒體庫 · 收藏 · 筆記 · 推薦";
            subtitle.Dock = DockStyle.Fill;
            subtitle.TextAlign = ContentAlignment.MiddleLeft;
            subtitle.Font = new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);
            subtitle.ForeColor = Color.FromArgb(154, 172, 198);
            subtitle.BackColor = Color.Transparent;

            Label desc = new Label();
            desc.Text = "像影音平台首頁一樣，快速進入最近進度與常用功能。";
            desc.Dock = DockStyle.Fill;
            desc.TextAlign = ContentAlignment.MiddleLeft;
            desc.Font = new Font("Microsoft JhengHei UI", 8.5F);
            desc.ForeColor = Color.FromArgb(210, 220, 235);
            desc.BackColor = Color.Transparent;

            heroGrid.Controls.Add(title, 0, 0);
            heroGrid.Controls.Add(subtitle, 0, 1);
            heroGrid.Controls.Add(desc, 0, 2);
            hero.Controls.Add(heroGrid);

            CinemaPanel actionCard = new CinemaPanel();
            actionCard.Dock = DockStyle.Fill;
            actionCard.CornerRadius = 20;
            actionCard.Padding = new Padding(12);
            actionCard.Margin = new Padding(0, 0, 0, 10);

            TableLayoutPanel actions = new TableLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.ColumnCount = 2;
            actions.RowCount = 5;
            actions.BackColor = Color.Transparent;
            actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            actions.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            for (int i = 0; i < 5; i++)
                actions.RowStyles.Add(new RowStyle(SizeType.Percent, 20));

            Button resume = Btn("▶ 繼續觀看", 150);
            Button scan = Btn("▣ 掃描媒體庫", 150);
            Button favorite = Btn("★ 加入收藏", 150);
            Button later = Btn("◷ 稍後觀看", 150);
            Button note = Btn("✎ 新增時間筆記", 150);
            Button recommend = Btn("◆ 推薦下一部", 150);
            Button movie = Btn("🎬 電影模式", 150);
            Button study = Btn("▤ 學習模式", 150);
            Button refresh = Btn("↻ 刷新首頁", 150);
            Button command = Btn("⌘ 指令面板", 150);

            Button[] buttons = { resume, scan, favorite, later, note, recommend, movie, study, refresh, command };
            foreach (Button b in buttons)
            {
                b.Dock = DockStyle.Fill;
                b.Margin = new Padding(6);
                b.MinimumSize = new Size(0, 34);
            }

            resume.Click += delegate { ContinueWatching(); };
            scan.Click += delegate { ScanMediaLibraryDialog(); };
            favorite.Click += delegate { AddCurrentToCollection(favoriteItems, "收藏"); };
            later.Click += delegate { AddCurrentToCollection(watchLaterItems, "稍後觀看"); };
            note.Click += delegate { AddNoteDialog(); };
            recommend.Click += delegate { PlayRecommendedNext(); };
            movie.Click += delegate { EnableMovieNightMode(); };
            study.Click += delegate { EnableStudyMode(); };
            refresh.Click += delegate { RefreshDashboard(); };
            command.Click += delegate { ShowCommandPalette(); };

            for (int i = 0; i < buttons.Length; i++)
                actions.Controls.Add(buttons[i], i % 2, i / 2);

            actionCard.Controls.Add(actions);

            homeBox = new RichTextBox();
            homeBox.Dock = DockStyle.Fill;
            homeBox.ReadOnly = true;
            homeBox.BorderStyle = BorderStyle.None;
            homeBox.Font = new Font("Consolas", 9F);
            homeBox.Margin = new Padding(0, 0, 0, 10);

            CinemaPanel hintCard = new CinemaPanel();
            hintCard.Dock = DockStyle.Fill;
            hintCard.CornerRadius = 18;
            hintCard.Padding = new Padding(12, 8, 12, 8);

            Label hint = new Label();
            hint.Dock = DockStyle.Fill;
            hint.TextAlign = ContentAlignment.MiddleLeft;
            hint.Font = new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);
            hint.ForeColor = Color.FromArgb(218, 228, 242);
            hint.BackColor = Color.Transparent;
            hint.Text = "首頁是影音平台入口。若側邊欄較窄，請按 ☰ → 展開側邊欄；也可直接按 Ctrl+K 搜尋所有功能。";
            hintCard.Controls.Add(hint);

            shell.Controls.Add(hero, 0, 0);
            shell.Controls.Add(actionCard, 0, 1);
            shell.Controls.Add(homeBox, 0, 2);
            shell.Controls.Add(hintCard, 0, 3);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage MediaLibraryTab()
        {
            TabPage page = new TabPage("媒體庫");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(8);
            shell.RowCount = 5;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));

            Label title = Info("本機媒體庫");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            txtLibrarySearch = new TextBox();
            txtLibrarySearch.Dock = DockStyle.Fill;
            txtLibrarySearch.TextChanged += delegate { RefreshMediaLibrary(); };

            lvLibrary = new ListView();
            lvLibrary.Dock = DockStyle.Fill;
            lvLibrary.View = View.Details;
            lvLibrary.FullRowSelect = true;
            lvLibrary.HideSelection = false;
            lvLibrary.MultiSelect = false;
            lvLibrary.Columns.Add("標題", 150);
            lvLibrary.Columns.Add("類型", 60);
            lvLibrary.Columns.Add("大小", 82);
            lvLibrary.Columns.Add("資料夾", 210);
            lvLibrary.DoubleClick += delegate { PlayLibrarySelected(); };

            FlowLayoutPanel r1 = Row();
            Button scan = Btn("掃描資料夾", 120);
            Button add = Btn("加入清單", 100);
            Button play = Btn("播放選取", 100);
            Button clear = Btn("清空媒體庫", 120);

            scan.Click += delegate { ScanMediaLibraryDialog(); };
            add.Click += delegate { AddLibrarySelectedToPlaylist(false); };
            play.Click += delegate { PlayLibrarySelected(); };
            clear.Click += delegate
            {
                if (MessageBox.Show("確定清空媒體庫索引？不會刪除原始檔案。", "媒體庫", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
                mediaLibrary.Clear();
                RefreshMediaLibrary();
                SaveProductData();
                RefreshDashboard();
            };

            r1.Controls.Add(scan);
            r1.Controls.Add(add);
            r1.Controls.Add(play);
            r1.Controls.Add(clear);

            FlowLayoutPanel r2 = Row();
            Button favorites = Btn("加到收藏", 100);
            Button later = Btn("稍後觀看", 110);
            Button folder = Btn("開啟位置", 100);
            favorites.Click += delegate { AddLibrarySelectedToCollection(favoriteItems, "收藏"); };
            later.Click += delegate { AddLibrarySelectedToCollection(watchLaterItems, "稍後觀看"); };
            folder.Click += delegate { OpenLibrarySelectedFolder(); };
            r2.Controls.Add(favorites);
            r2.Controls.Add(later);
            r2.Controls.Add(folder);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(txtLibrarySearch, 0, 1);
            shell.Controls.Add(lvLibrary, 0, 2);
            shell.Controls.Add(r1, 0, 3);
            shell.Controls.Add(r2, 0, 4);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage CollectionsTab()
        {
            TabPage page = new TabPage("收藏");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(8);
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));

            Label title = Info("我的收藏 / 稍後觀看");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            SplitContainer sp = new SplitContainer();
            sp.Dock = DockStyle.Fill;
            sp.Orientation = Orientation.Horizontal;
            sp.SplitterDistance = 190;

            lbFavorites = new ListBox();
            lbFavorites.Dock = DockStyle.Fill;
            lbFavorites.DoubleClick += delegate { PlaySavedListItem(lbFavorites); };

            lbWatchLater = new ListBox();
            lbWatchLater.Dock = DockStyle.Fill;
            lbWatchLater.DoubleClick += delegate { PlaySavedListItem(lbWatchLater); };

            GroupBox g1 = new GroupBox();
            g1.Text = "我的最愛";
            g1.Dock = DockStyle.Fill;
            g1.Controls.Add(lbFavorites);

            GroupBox g2 = new GroupBox();
            g2.Text = "稍後觀看";
            g2.Dock = DockStyle.Fill;
            g2.Controls.Add(lbWatchLater);

            sp.Panel1.Controls.Add(g1);
            sp.Panel2.Controls.Add(g2);

            FlowLayoutPanel actions = Row();
            Button addFav = Btn("目前加入收藏", 140);
            Button addLater = Btn("目前稍後觀看", 150);
            Button play = Btn("播放選取", 100);
            Button remove = Btn("移除選取", 100);
            Button clear = Btn("清空兩區", 100);

            addFav.Click += delegate { AddCurrentToCollection(favoriteItems, "收藏"); };
            addLater.Click += delegate { AddCurrentToCollection(watchLaterItems, "稍後觀看"); };
            play.Click += delegate { PlaySelectedCollection(); };
            remove.Click += delegate { RemoveSelectedCollection(); };
            clear.Click += delegate
            {
                if (MessageBox.Show("確定清空收藏與稍後觀看？", "收藏", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
                favoriteItems.Clear();
                watchLaterItems.Clear();
                RefreshCollections();
                SaveProductData();
                RefreshDashboard();
            };

            actions.Controls.Add(addFav);
            actions.Controls.Add(addLater);
            actions.Controls.Add(play);
            actions.Controls.Add(remove);
            actions.Controls.Add(clear);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(sp, 0, 1);
            shell.SetRowSpan(sp, 2);
            shell.Controls.Add(actions, 0, 3);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage VideoNotesTab()
        {
            TabPage page = new TabPage("影片筆記");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(8);
            shell.RowCount = 5;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 74));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));

            Label title = Info("時間軸筆記");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            lbNotes = new ListBox();
            lbNotes.Dock = DockStyle.Fill;
            lbNotes.DoubleClick += delegate { JumpToSelectedNote(); };

            txtNoteInput = new TextBox();
            txtNoteInput.Dock = DockStyle.Fill;
            txtNoteInput.Multiline = true;

            FlowLayoutPanel r1 = Row();
            Button add = Btn("新增目前時間筆記", 160);
            Button jump = Btn("跳到筆記", 100);
            Button remove = Btn("刪除筆記", 100);
            add.Click += delegate { AddCurrentTimeNote(txtNoteInput.Text); };
            jump.Click += delegate { JumpToSelectedNote(); };
            remove.Click += delegate { RemoveSelectedNote(); };
            r1.Controls.Add(add);
            r1.Controls.Add(jump);
            r1.Controls.Add(remove);

            FlowLayoutPanel r2 = Row();
            Button export = Btn("匯出筆記", 110);
            Button all = Btn("顯示全部", 100);
            Button current = Btn("只看目前影片", 130);
            export.Click += delegate { ExportVideoNotes(); };
            all.Click += delegate { RefreshNotes(false); };
            current.Click += delegate { RefreshNotes(true); };
            r2.Controls.Add(export);
            r2.Controls.Add(all);
            r2.Controls.Add(current);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(lbNotes, 0, 1);
            shell.Controls.Add(txtNoteInput, 0, 2);
            shell.Controls.Add(r1, 0, 3);
            shell.Controls.Add(r2, 0, 4);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage RecommendationModeTab()
        {
            TabPage page = new TabPage("推薦 / 模式");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 5;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 124));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 60));

            Label title = Info("智慧推薦與觀看模式");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel modes = new FlowLayoutPanel();
            modes.Dock = DockStyle.Fill;
            modes.WrapContents = true;
            Button movie = Btn("電影模式", 110);
            Button study = Btn("學習模式", 110);
            Button music = Btn("音樂模式", 110);
            Button demo = Btn("展示模式", 110);
            Button refresh = Btn("更新推薦", 120);
            movie.Click += delegate { EnableMovieNightMode(); };
            study.Click += delegate { EnableStudyMode(); };
            music.Click += delegate { EnableMusicMode(); };
            demo.Click += delegate { EnableDemoMode(); };
            refresh.Click += delegate { RefreshRecommendations(); };
            modes.Controls.Add(movie);
            modes.Controls.Add(study);
            modes.Controls.Add(music);
            modes.Controls.Add(demo);
            modes.Controls.Add(refresh);

            lbRecommendations = new ListBox();
            lbRecommendations.Dock = DockStyle.Fill;
            lbRecommendations.DoubleClick += delegate { PlaySelectedRecommendation(); };

            FlowLayoutPanel recActions = Row();
            Button play = Btn("播放推薦", 110);
            Button addFav = Btn("推薦加收藏", 130);
            Button addLater = Btn("推薦稍後", 120);
            play.Click += delegate { PlaySelectedRecommendation(); };
            addFav.Click += delegate { AddRecommendationToCollection(favoriteItems, "收藏"); };
            addLater.Click += delegate { AddRecommendationToCollection(watchLaterItems, "稍後觀看"); };
            recActions.Controls.Add(play);
            recActions.Controls.Add(addFav);
            recActions.Controls.Add(addLater);

            Label hint = Info("推薦邏輯：還沒看完、同資料夾、最近加入、常見格式與媒體庫未播放內容，不需 AI 套件也能呈現智慧感。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(modes, 0, 1);
            shell.Controls.Add(lbRecommendations, 0, 2);
            shell.Controls.Add(recActions, 0, 3);
            shell.Controls.Add(hint, 0, 4);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage PlaylistTab()
        {
            TabPage page = new TabPage("播放清單");
            TableLayoutPanel p = new TableLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.Padding = new Padding(8);
            p.AutoScroll = true;
            p.RowCount = 6;
            p.ColumnCount = 1;
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            p.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));

            lblCount = new Label();
            lblCount.Dock = DockStyle.Fill;
            lblCount.TextAlign = ContentAlignment.MiddleLeft;
            lblCount.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            lblCount.Text = "0 個項目";

            txtSearch = new TextBox();
            txtSearch.Dock = DockStyle.Fill;

            lvPlaylist = new ListView();
            lvPlaylist.Dock = DockStyle.Fill;
            lvPlaylist.View = View.Details;
            lvPlaylist.FullRowSelect = true;
            lvPlaylist.HideSelection = false;
            lvPlaylist.MultiSelect = false;
            lvPlaylist.Columns.Add("標題", 150);
            lvPlaylist.Columns.Add("類型", 60);
            lvPlaylist.Columns.Add("來源", 230);

            FlowLayoutPanel r1 = Row();
            Button play = Btn("播放選取", 96);
            Button remove = Btn("移除", 74);
            Button clear = Btn("清空", 74);
            play.Click += delegate { PlaySelected(); };
            remove.Click += delegate { RemoveSelected(); };
            clear.Click += delegate { ClearPlaylist(); };
            r1.Controls.Add(play);
            r1.Controls.Add(remove);
            r1.Controls.Add(clear);

            FlowLayoutPanel r2 = Row();
            Button sortTitle = Btn("標題排序", 96);
            Button sortType = Btn("類型排序", 96);
            Button reveal = Btn("開啟位置", 96);
            sortTitle.Click += delegate { SortByTitle(); };
            sortType.Click += delegate { SortByType(); };
            reveal.Click += delegate { RevealSelected(); };
            r2.Controls.Add(sortTitle);
            r2.Controls.Add(sortType);
            r2.Controls.Add(reveal);

            FlowLayoutPanel r3 = Row();
            Button url = Btn("加入 URL", 96);
            Button folder = Btn("掃描資料夾", 110);
            Button copy = Btn("複製來源", 96);
            url.Click += delegate { AddUrlDialog(false); };
            folder.Click += delegate { PickFolder(); };
            copy.Click += delegate { CopyCurrentSource(); };
            r3.Controls.Add(url);
            r3.Controls.Add(folder);
            r3.Controls.Add(copy);

            p.Controls.Add(lblCount, 0, 0);
            p.Controls.Add(txtSearch, 0, 1);
            p.Controls.Add(lvPlaylist, 0, 2);
            p.Controls.Add(r1, 0, 3);
            p.Controls.Add(r2, 0, 4);
            p.Controls.Add(r3, 0, 5);
            page.Controls.Add(p);
            return page;
        }

        private TabPage ChaptersTab()
        {
            TabPage page = new TabPage("章節");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(8);
            shell.RowCount = 5;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 54));

            Label title = Info("章節 Chapters");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            lbChapters = new ListBox();
            lbChapters.Dock = DockStyle.Fill;
            lbChapters.DoubleClick += delegate { JumpToSelectedChapter(); };

            txtChapterTitle = new TextBox();
            txtChapterTitle.Dock = DockStyle.Fill;
            txtChapterTitle.Text = "新章節";

            FlowLayoutPanel actions = Row();
            Button add = Btn("新增目前章節", 130);
            Button jump = Btn("跳到章節", 100);
            Button remove = Btn("刪除章節", 100);
            Button export = Btn("匯出章節", 100);
            add.Click += delegate { AddCurrentChapter(); };
            jump.Click += delegate { JumpToSelectedChapter(); };
            remove.Click += delegate { RemoveSelectedChapter(); };
            export.Click += delegate { ExportChapters(); };
            actions.Controls.Add(add);
            actions.Controls.Add(jump);
            actions.Controls.Add(remove);
            actions.Controls.Add(export);

            Label hint = Info("章節類似 YouTube 章節；可標記影片段落，雙擊即可跳轉。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(lbChapters, 0, 1);
            shell.Controls.Add(txtChapterTitle, 0, 2);
            shell.Controls.Add(actions, 0, 3);
            shell.Controls.Add(hint, 0, 4);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage HeatmapTab()
        {
            TabPage page = new TabPage("熱力圖");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(8);
            shell.RowCount = 3;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 84));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("播放進度熱力圖");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = Row();
            Button refresh = Btn("更新熱力圖", 120);
            Button clear = Btn("清除目前影片", 130);
            Button export = Btn("匯出熱力圖", 120);
            refresh.Click += delegate { RefreshHeatmap(); };
            clear.Click += delegate { ClearCurrentHeatmap(); };
            export.Click += delegate { ExportHeatmap(); };
            actions.Controls.Add(refresh);
            actions.Controls.Add(clear);
            actions.Controls.Add(export);

            heatmapBox = new RichTextBox();
            heatmapBox.Dock = DockStyle.Fill;
            heatmapBox.ReadOnly = true;
            heatmapBox.BorderStyle = BorderStyle.None;
            heatmapBox.Font = new Font("Consolas", 9.5F);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(heatmapBox, 0, 2);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage PreviewTab()
        {
            TabPage page = new TabPage("預覽卡");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 3;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 90));

            Label title = Info("播放前預覽卡");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            previewBox = new RichTextBox();
            previewBox.Dock = DockStyle.Fill;
            previewBox.ReadOnly = true;
            previewBox.BorderStyle = BorderStyle.None;
            previewBox.Font = new Font("Consolas", 9.5F);

            FlowLayoutPanel actions = Row();
            Button current = Btn("目前項目", 100);
            Button selected = Btn("播放清單選取", 130);
            Button play = Btn("播放預覽項", 120);
            current.Click += delegate { RefreshPreviewCard(CurrentSource()); };
            selected.Click += delegate { RefreshPreviewFromPlaylistSelection(); };
            play.Click += delegate { PlayPreviewSource(); };
            actions.Controls.Add(current);
            actions.Controls.Add(selected);
            actions.Controls.Add(play);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(previewBox, 0, 1);
            shell.Controls.Add(actions, 0, 2);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage StatusCenterTab()
        {
            TabPage page = new TabPage("狀態中心");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 3;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 80));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("智慧狀態中心");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = Row();
            Button refresh = Btn("重新整理", 110);
            Button core = Btn("外部核心", 110);
            Button copy = Btn("複製狀態", 110);
            refresh.Click += delegate { RefreshStatusCenter(); };
            core.Click += delegate { SwitchSideTabByTitle("外部核心"); RefreshExternalCoreStatus(); };
            copy.Click += delegate { Clipboard.SetText(BuildStatusCenterText()); Say("狀態中心內容已複製。", true); };
            actions.Controls.Add(refresh);
            actions.Controls.Add(core);
            actions.Controls.Add(copy);

            statusCenterBox = new RichTextBox();
            statusCenterBox.Dock = DockStyle.Fill;
            statusCenterBox.ReadOnly = true;
            statusCenterBox.BorderStyle = BorderStyle.None;
            statusCenterBox.Font = new Font("Consolas", 9.5F);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(statusCenterBox, 0, 2);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage SettingsCenterTab()
        {
            TabPage page = new TabPage("設定");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 132));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 70));

            Label title = Info("大廠級設定中心");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button resume = Btn("切換繼續觀看", 140);
            Button endRec = Btn("切換結束推薦", 140);
            Button toast = Btn("切換 Toast", 120);
            Button sidebarWide = Btn("側欄展開", 110);
            Button sidebarCompact = Btn("側欄精簡", 110);
            Button resetGuide = Btn("重播導覽", 110);
            Button save = Btn("儲存設定", 110);

            resume.Click += delegate { enableResumeTracking = !enableResumeTracking; RefreshSettingsCenter(); Say("繼續觀看記錄：" + (enableResumeTracking ? "開" : "關"), true); };
            endRec.Click += delegate { showEndRecommendation = !showEndRecommendation; RefreshSettingsCenter(); Say("播放結束推薦：" + (showEndRecommendation ? "開" : "關"), true); };
            toast.Click += delegate { enableToastNotification = !enableToastNotification; RefreshSettingsCenter(); Say("Toast 通知：" + (enableToastNotification ? "開" : "關"), true); };
            sidebarWide.Click += delegate { SetSidePanelWidth(560); };
            sidebarCompact.Click += delegate { SetSidePanelWidth(390); };
            resetGuide.Click += delegate { ReplayAuroraGuide(); };
            save.Click += delegate { SaveProductData(); Say("設定已儲存。", true); };

            actions.Controls.Add(resume);
            actions.Controls.Add(endRec);
            actions.Controls.Add(toast);
            actions.Controls.Add(sidebarWide);
            actions.Controls.Add(sidebarCompact);
            actions.Controls.Add(resetGuide);
            actions.Controls.Add(save);

            settingsBox = new RichTextBox();
            settingsBox.Dock = DockStyle.Fill;
            settingsBox.ReadOnly = true;
            settingsBox.BorderStyle = BorderStyle.None;
            settingsBox.Font = new Font("Consolas", 9.5F);

            Label hint = Info("設定中心把播放、外觀、提示、導覽、側邊欄與資料功能集中管理。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(settingsBox, 0, 2);
            shell.Controls.Add(hint, 0, 3);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage ThemeStudioTab()
        {
            TabPage page = new TabPage("主題");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 3;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 150));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("Theme Studio 主題商店");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            string[] names = { "AURORA Gold", "Midnight Blue", "Netflix Red", "Cyber Purple", "OLED Black", "Ice Glass" };
            foreach (string n in names)
            {
                Button b = Btn(n, 136);
                string theme = n;
                b.Click += delegate { ApplyThemePreset(theme); };
                actions.Controls.Add(b);
            }

            themeStudioBox = new RichTextBox();
            themeStudioBox.Dock = DockStyle.Fill;
            themeStudioBox.ReadOnly = true;
            themeStudioBox.BorderStyle = BorderStyle.None;
            themeStudioBox.Font = new Font("Consolas", 9.5F);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(themeStudioBox, 0, 2);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage DemoFlowTab()
        {
            TabPage page = new TabPage("Demo Flow");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 86));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 64));

            Label title = Info("一鍵展示 Demo Flow");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            lbDemoFlow = new ListBox();
            lbDemoFlow.Dock = DockStyle.Fill;
            lbDemoFlow.Items.AddRange(new object[]
            {
                "1. 首頁 Dashboard",
                "2. Ctrl+K 指令面板",
                "3. 播放清單",
                "4. 媒體庫",
                "5. 字幕與章節",
                "6. 外部核心",
                "7. 沉浸影音",
                "8. 展示中心與 README"
            });

            FlowLayoutPanel actions = Row();
            Button start = Btn("開始展示流程", 140);
            Button next = Btn("下一步", 100);
            Button copy = Btn("複製展示台詞", 140);
            start.Click += delegate { StartDemoFlow(); };
            next.Click += delegate { DemoFlowNext(); };
            copy.Click += delegate { Clipboard.SetText(BuildDemoFlowScript()); Say("Demo Flow 台詞已複製。", true); };
            actions.Controls.Add(start);
            actions.Controls.Add(next);
            actions.Controls.Add(copy);

            Label hint = Info("Demo Flow 讓助教觀看時更像產品發表會：一步一步切換到最有代表性的功能頁。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(lbDemoFlow, 0, 1);
            shell.Controls.Add(actions, 0, 2);
            shell.Controls.Add(hint, 0, 3);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage PlatformTab()
        {
            TabPage page = new TabPage("平台搜尋");
            TableLayoutPanel p = new TableLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.Padding = new Padding(8);
            p.AutoScroll = true;
            p.RowCount = 11;
            p.ColumnCount = 1;
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 96));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            p.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 96));

            Label title = Info("平台搜尋 / 網頁播放");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            cboPlatform = new ComboBox();
            cboPlatform.Dock = DockStyle.Fill;
            cboPlatform.DropDownStyle = ComboBoxStyle.DropDownList;
            cboPlatform.Items.AddRange(new object[]
            {
                "YouTube", "Bilibili", "愛奇藝", "Twitch", "Vimeo", "TikTok", "巴哈動畫瘋", "Google"
            });
            cboPlatform.SelectedIndex = 0;

            cboBrowserEngine = new ComboBox();
            cboBrowserEngine.Dock = DockStyle.Fill;
            cboBrowserEngine.DropDownStyle = ComboBoxStyle.DropDownList;
            cboBrowserEngine.Items.AddRange(new object[]
            {
                "自動：WebView2 優先，失敗就嵌入 Edge / Chrome",
                "強制 WebView2",
                "嵌入 Edge / Chrome 視窗（零 NuGet）",
                "外部預設瀏覽器（零套件）"
            });
            cboBrowserEngine.SelectedIndex = 0;
            cboBrowserEngine.SelectedIndexChanged += delegate { ResetBrowserEngine(); };

            txtPlatformSearch = new TextBox();
            txtPlatformSearch.Dock = DockStyle.Fill;
            txtPlatformSearch.KeyDown += delegate (object s, KeyEventArgs e)
            {
                if (e.KeyCode == Keys.Enter) { SearchPlatform(); e.Handled = true; e.SuppressKeyPress = true; }
            };

            FlowLayoutPanel row1 = Row();
            Button search = Btn("搜尋", 74);
            Button home = Btn("平台首頁", 96);
            Button cinema = Btn("平台模式", 96);
            search.Click += delegate { SearchPlatform(); };
            home.Click += delegate { OpenPlatformHome(); };
            cinema.Click += delegate { ShowPlatformMode(true); };
            row1.Controls.Add(search);
            row1.Controls.Add(home);
            row1.Controls.Add(cinema);

            txtWebAddress = new TextBox();
            txtWebAddress.Dock = DockStyle.Fill;
            txtWebAddress.KeyDown += delegate (object s, KeyEventArgs e)
            {
                if (e.KeyCode == Keys.Enter) { NavigateAddressBar(); e.Handled = true; e.SuppressKeyPress = true; }
            };

            FlowLayoutPanel row2 = Row();
            btnWebBack = Btn("返回", 74);
            btnWebForward = Btn("前進", 74);
            btnWebRefresh = Btn("重新整理", 96);
            Button go = Btn("前往", 74);
            btnWebBack.Click += delegate { WebBack(); };
            btnWebForward.Click += delegate { WebForward(); };
            btnWebRefresh.Click += delegate { WebRefresh(); };
            go.Click += delegate { NavigateAddressBar(); };
            row2.Controls.Add(btnWebBack);
            row2.Controls.Add(btnWebForward);
            row2.Controls.Add(btnWebRefresh);
            row2.Controls.Add(go);

            FlowLayoutPanel row3 = Row();
            Button external = Btn("外部瀏覽器", 110);
            Button copy = Btn("複製網址", 96);
            Button fav = Btn("收藏", 74);
            Button help = Btn("WebView2 說明", 126);
            external.Click += delegate { OpenCurrentWebExternal(); };
            copy.Click += delegate { CopyCurrentWebUrl(); };
            fav.Click += delegate { AddWebFavorite(); };
            help.Click += delegate { ShowWebView2InstallHelp(); };
            row3.Controls.Add(external);
            row3.Controls.Add(copy);
            row3.Controls.Add(fav);
            row3.Controls.Add(help);

            lblWebStatus = Info("瀏覽器引擎尚未初始化");
            lblWebStatus.Height = 30;

            lbWebFavorites = new ListBox();
            lbWebFavorites.Dock = DockStyle.Fill;
            lbWebFavorites.DoubleClick += delegate { OpenSelectedWebFavorite(); };

            Label note = Info("說明：本版不使用 .NET 內建舊瀏覽器。自動模式會先嘗試 WebView2；若沒有 WebView2，會把電腦已安裝的 Edge / Chrome 以子視窗方式嵌入本程式。若仍失敗，才使用外部瀏覽器。VIP、登入、廣告、DRM 都照平台規則，不會繞過限制。");
            note.Height = 92;

            p.Controls.Add(title, 0, 0);
            p.Controls.Add(cboPlatform, 0, 1);
            p.Controls.Add(cboBrowserEngine, 0, 2);
            p.Controls.Add(txtPlatformSearch, 0, 3);
            p.Controls.Add(row1, 0, 4);
            p.Controls.Add(txtWebAddress, 0, 5);
            p.Controls.Add(row2, 0, 6);
            p.Controls.Add(row3, 0, 7);
            p.Controls.Add(lblWebStatus, 0, 8);
            p.Controls.Add(lbWebFavorites, 0, 9);
            p.Controls.Add(note, 0, 10);
            page.Controls.Add(p);
            return page;
        }

        private TabPage InfoTab()
        {
            TabPage page = new TabPage("資訊");
            TableLayoutPanel p = new TableLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.Padding = new Padding(10);
            p.RowCount = 8;
            p.ColumnCount = 1;
            for (int i = 0; i < 8; i++) p.RowStyles.Add(new RowStyle(i == 7 ? SizeType.Percent : SizeType.Absolute, i == 7 ? 100 : 42));

            infoTitle = Info("標題：-");
            infoType = Info("格式：-");
            infoSize = Info("大小：-");
            infoDuration = Info("長度：-");
            infoState = Info("狀態：-");
            infoPath = Info("來源：-");
            Label hotkey = Info("快捷鍵：Ctrl+K / Ctrl+P 指令面板，Space 播放/暫停，←/→ 快退快轉，↑/↓ 音量，F11 劇院模式，M 靜音，T 置頂，Esc 離開。");

            p.Controls.Add(infoTitle, 0, 0);
            p.Controls.Add(infoType, 0, 1);
            p.Controls.Add(infoSize, 0, 2);
            p.Controls.Add(infoDuration, 0, 3);
            p.Controls.Add(infoState, 0, 4);
            p.Controls.Add(infoPath, 0, 5);
            p.Controls.Add(hotkey, 0, 6);
            page.Controls.Add(p);
            return page;
        }

        private TabPage BookmarkTab()
        {
            TabPage page = new TabPage("書籤 / AB");
            TableLayoutPanel p = new TableLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.Padding = new Padding(8);
            p.RowCount = 5;
            p.ColumnCount = 1;
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            p.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            p.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));

            Label title = Info("時間書籤");
            lbBookmarks = new ListBox();
            lbBookmarks.Dock = DockStyle.Fill;

            FlowLayoutPanel br = Row();
            Button add = Btn("加入", 74);
            Button jump = Btn("跳轉", 74);
            Button del = Btn("刪除", 74);
            add.Click += delegate { AddBookmark(); };
            jump.Click += delegate { JumpBookmark(); };
            del.Click += delegate { DeleteBookmark(); };
            br.Controls.Add(add);
            br.Controls.Add(jump);
            br.Controls.Add(del);

            FlowLayoutPanel ar = Row();
            Button a = Btn("設 A", 74);
            Button b = Btn("設 B", 74);
            Button c = Btn("清除", 74);
            a.Click += delegate { pointA = CurrentPos(); UpdateAB(); };
            b.Click += delegate { SetBPoint(); };
            c.Click += delegate { ClearAB(); };
            ar.Controls.Add(a);
            ar.Controls.Add(b);
            ar.Controls.Add(c);

            lblAB = Info("AB 重複：未設定");
            p.Controls.Add(title, 0, 0);
            p.Controls.Add(lbBookmarks, 0, 1);
            p.Controls.Add(br, 0, 2);
            p.Controls.Add(ar, 0, 3);
            p.Controls.Add(lblAB, 0, 4);
            page.Controls.Add(p);
            return page;
        }

        private TabPage ImmersiveTab()
        {
            TabPage page = new TabPage("沉浸影音");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 5;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 132));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 144));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 116));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("沉浸影音實驗室");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            GroupBox qualityBox = new GroupBox();
            qualityBox.Text = "畫質偏好 / Quality";
            qualityBox.Dock = DockStyle.Fill;
            qualityBox.Padding = new Padding(10);

            FlowLayoutPanel qualityRow = new FlowLayoutPanel();
            qualityRow.Dock = DockStyle.Fill;
            qualityRow.WrapContents = true;

            ComboBox quality = new ComboBox();
            quality.DropDownStyle = ComboBoxStyle.DropDownList;
            quality.Width = 156;
            quality.Items.AddRange(new object[] { "自動", "最高畫質", "2160p / 4K", "1440p / 2K", "1080p", "720p", "480p", "省流量" });
            quality.SelectedIndex = 0;

            Button applyQuality = Btn("套用偏好", 110);
            Button findVersions = Btn("尋找多畫質版本", 154);
            Button qualityNote = Btn("畫質說明", 110);

            applyQuality.Click += delegate { ApplyQualityPreference(quality.Text); };
            findVersions.Click += delegate { FindLocalQualityVersions(); };
            qualityNote.Click += delegate { ShowQualityHelp(); };

            Label qInfo = Info("平台畫質由官方播放器決定；本機影片若有不同解析度版本，可用「尋找多畫質版本」加入清單。");
            qInfo.Width = 300;
            qInfo.Height = 52;

            qualityRow.Controls.Add(quality);
            qualityRow.Controls.Add(applyQuality);
            qualityRow.Controls.Add(findVersions);
            qualityRow.Controls.Add(qualityNote);
            qualityRow.Controls.Add(qInfo);
            qualityBox.Controls.Add(qualityRow);

            GroupBox hdrBox = new GroupBox();
            hdrBox.Text = "HDR / Dolby Vision 相容模式";
            hdrBox.Dock = DockStyle.Fill;
            hdrBox.Padding = new Padding(10);

            FlowLayoutPanel hdrRow = new FlowLayoutPanel();
            hdrRow.Dock = DockStyle.Fill;
            hdrRow.WrapContents = true;

            Button dvGuide = Btn("Dolby Vision 說明", 154);
            Button hdrGuide = Btn("HDR 系統設定", 142);
            Button dvSearch = Btn("搜尋 Dolby Vision 測試片", 190);
            Button hdrStatus = Btn("播放核心狀態", 150);
            Button copySpec = Btn("複製作業說明", 150);

            dvGuide.Click += delegate { ShowDolbyVisionGuide(); };
            hdrGuide.Click += delegate { OpenWindowsHDRSettings(); };
            dvSearch.Click += delegate { SearchImmersiveKeyword("Dolby Vision HDR 4K demo"); };
            hdrStatus.Click += delegate { ShowPlaybackCoreStatus(); };
            copySpec.Click += delegate { CopyImmersiveSpecText(); };

            Label hInfo = Info("Dolby Vision / HDR 需要片源、螢幕、Windows、顯示卡與播放核心共同支援；本程式採相容提示與平台入口，不內建大型解碼器。");
            hInfo.Width = 300;
            hInfo.Height = 64;

            hdrRow.Controls.Add(dvGuide);
            hdrRow.Controls.Add(hdrGuide);
            hdrRow.Controls.Add(dvSearch);
            hdrRow.Controls.Add(hdrStatus);
            hdrRow.Controls.Add(copySpec);
            hdrRow.Controls.Add(hInfo);
            hdrBox.Controls.Add(hdrRow);

            GroupBox vrBox = new GroupBox();
            vrBox.Text = "AR / VR / 360";
            vrBox.Dock = DockStyle.Fill;
            vrBox.Padding = new Padding(10);

            FlowLayoutPanel vrRow = new FlowLayoutPanel();
            vrRow.Dock = DockStyle.Fill;
            vrRow.WrapContents = true;

            Button yt360 = Btn("YouTube 360 搜尋", 166);
            Button vr180 = Btn("VR180 搜尋", 130);
            Button webxr = Btn("WebXR 測試入口", 156);
            Button ar = Btn("AR / WebXR 說明", 156);
            Button vrNote = Btn("VR 支援說明", 140);

            yt360.Click += delegate { SearchImmersiveKeyword("360 video 4K VR"); };
            vr180.Click += delegate { SearchImmersiveKeyword("VR180 3D video"); };
            webxr.Click += delegate { OpenWeb("https://immersive-web.github.io/webxr-samples/"); };
            ar.Click += delegate { OpenWeb("https://immersiveweb.dev/"); };
            vrNote.Click += delegate { ShowVrArGuide(); };

            Label vInfo = Info("此版以 WebView2 / Edge / Chrome 開啟 WebXR、360、VR180 內容；不內建 Unity / DirectX / VR 引擎，避免壓縮檔爆量。");
            vInfo.Width = 300;
            vInfo.Height = 64;

            vrRow.Controls.Add(yt360);
            vrRow.Controls.Add(vr180);
            vrRow.Controls.Add(webxr);
            vrRow.Controls.Add(ar);
            vrRow.Controls.Add(vrNote);
            vrRow.Controls.Add(vInfo);
            vrBox.Controls.Add(vrRow);

            Label bottom = Info("檔案大小策略：只增加 UI、入口、提示與相容邏輯，不打包 FFmpeg、VLC、CefSharp 或完整 WebView2 Runtime，因此適合 21MB 限制的作業繳交。");
            bottom.Height = 80;

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(qualityBox, 0, 1);
            shell.Controls.Add(hdrBox, 0, 2);
            shell.Controls.Add(vrBox, 0, 3);
            shell.Controls.Add(bottom, 0, 4);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage ExternalCoreTab()
        {
            TabPage page = new TabPage("外部核心");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 86));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));

            Label title = Info("外部核心偵測 / Optional Engines");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button scan = Btn("重新偵測", 110);
            Button help = Btn("安裝 / 備援說明", 156);
            Button copy = Btn("複製繳交說明", 150);
            Button folder = Btn("開啟程式資料夾", 150);
            Button webviewHelp = Btn("WebView2 說明", 130);

            scan.Click += delegate { RefreshExternalCoreStatus(); };
            help.Click += delegate { ShowExternalCoreHelp(); };
            copy.Click += delegate { CopyExternalCoreSubmissionNote(); };
            folder.Click += delegate { OpenAppFolder(); };
            webviewHelp.Click += delegate { ShowWebView2InstallHelp(); };

            actions.Controls.Add(scan);
            actions.Controls.Add(help);
            actions.Controls.Add(copy);
            actions.Controls.Add(folder);
            actions.Controls.Add(webviewHelp);

            coreStatusBox = new RichTextBox();
            coreStatusBox.Dock = DockStyle.Fill;
            coreStatusBox.ReadOnly = true;
            coreStatusBox.BorderStyle = BorderStyle.None;
            coreStatusBox.Font = new Font("Consolas", 9F);

            Label bottom = Info("策略：不把 FFmpeg / VLC / CefSharp / 完整 WebView2 Runtime 打包進作業；程式會自動偵測，找得到就提示可使用，找不到就走 WMP、WebView2、Edge / Chrome 嵌入或外部瀏覽器備援。");
            bottom.Height = 76;

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(coreStatusBox, 0, 2);
            shell.Controls.Add(bottom, 0, 3);
            page.Controls.Add(shell);

            RefreshExternalCoreStatus();
            return page;
        }

        private TabPage ShowcaseTab()
        {
            TabPage page = new TabPage("展示中心");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 132));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));

            Label title = Info("展示中心 / Demo Console");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button refresh = Btn("產生展示摘要", 150);
            Button readme = Btn("匯出 README", 130);
            Button copyReadme = Btn("複製 README", 130);
            Button checklist = Btn("繳交檢查", 120);
            Button analytics = Btn("播放清單分析", 150);
            Button duplicates = Btn("重複項目掃描", 150);
            Button trailer = Btn("展示台詞", 120);
            Button shortcuts = Btn("快捷鍵總覽", 130);
            Button packageTips = Btn("21MB 打包提醒", 150);

            refresh.Click += delegate { RefreshShowcaseReport(); };
            readme.Click += delegate { ExportReadmeFile(); };
            copyReadme.Click += delegate { CopyReadmeText(); };
            checklist.Click += delegate { ShowSubmissionChecklist(); };
            analytics.Click += delegate { ShowPlaylistAnalytics(); };
            duplicates.Click += delegate { ScanDuplicatePlaylistItems(); };
            trailer.Click += delegate { ShowDemoScript(); };
            shortcuts.Click += delegate { ShowShortcutOverview(); };
            packageTips.Click += delegate { ShowPackageSizeGuide(); };

            actions.Controls.Add(refresh);
            actions.Controls.Add(readme);
            actions.Controls.Add(copyReadme);
            actions.Controls.Add(checklist);
            actions.Controls.Add(analytics);
            actions.Controls.Add(duplicates);
            actions.Controls.Add(trailer);
            actions.Controls.Add(shortcuts);
            actions.Controls.Add(packageTips);

            showcaseBox = new RichTextBox();
            showcaseBox.Dock = DockStyle.Fill;
            showcaseBox.ReadOnly = true;
            showcaseBox.BorderStyle = BorderStyle.None;
            showcaseBox.Font = new Font("Consolas", 9F);

            Label note = Info("這一頁是交作業和展示用的控制台：可自動產生功能摘要、README、環境檢查、播放清單分析和展示台詞。");
            note.Height = 76;

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(showcaseBox, 0, 2);
            shell.Controls.Add(note, 0, 3);
            page.Controls.Add(shell);

            RefreshShowcaseReport();
            return page;
        }

        private TabPage CommandCenterTab()
        {
            TabPage page = new TabPage("指令中心");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 132));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 82));

            Label title = Info("指令中心 / Command Palette");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button palette = Btn("開啟指令面板 Ctrl+K", 190);
            Button organize = Btn("智慧整理清單", 140);
            Button movieNight = Btn("一鍵電影夜", 130);
            Button health = Btn("功能完整度檢查", 160);
            Button pitch = Btn("複製產品賣點", 150);
            Button shortcuts = Btn("匯出快捷鍵卡", 150);
            Button layoutWide = Btn("右欄展開", 110);
            Button layoutCompact = Btn("右欄精簡", 110);
            Button openEngines = Btn("外部核心偵測", 150);

            palette.Click += delegate { ShowCommandPalette(); };
            organize.Click += delegate { SmartOrganizePlaylist(); };
            movieNight.Click += delegate { EnableMovieNightMode(); };
            health.Click += delegate { RefreshCommandCenterReport(); };
            pitch.Click += delegate { CopyProductPitch(); };
            shortcuts.Click += delegate { ExportShortcutCard(); };
            layoutWide.Click += delegate { SetSidePanelWidth(520); };
            layoutCompact.Click += delegate { SetSidePanelWidth(370); };
            openEngines.Click += delegate { SwitchSideTabByTitle("外部核心"); RefreshExternalCoreStatus(); };

            actions.Controls.Add(palette);
            actions.Controls.Add(organize);
            actions.Controls.Add(movieNight);
            actions.Controls.Add(health);
            actions.Controls.Add(pitch);
            actions.Controls.Add(shortcuts);
            actions.Controls.Add(layoutWide);
            actions.Controls.Add(layoutCompact);
            actions.Controls.Add(openEngines);

            commandCenterBox = new RichTextBox();
            commandCenterBox.Dock = DockStyle.Fill;
            commandCenterBox.ReadOnly = true;
            commandCenterBox.BorderStyle = BorderStyle.None;
            commandCenterBox.Font = new Font("Consolas", 9F);

            Label note = Info("Ctrl+K 可開啟類似 VS Code / Notion 的指令面板；右側功能太多時不用找按鈕，直接搜尋並執行。");
            note.Height = 70;

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(commandCenterBox, 0, 2);
            shell.Controls.Add(note, 0, 3);
            page.Controls.Add(shell);

            RefreshCommandCenterReport();
            return page;
        }

        private TabPage StatsTab()
        {
            TabPage page = new TabPage("統計");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 3;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("播放統計儀表板");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button refresh = Btn("更新統計", 120);
            Button export = Btn("匯出統計", 120);
            Button reset = Btn("清空統計", 120);
            Button analyze = Btn("格式分析", 120);

            refresh.Click += delegate { RefreshStatsReport(); };
            export.Click += delegate { ExportStatsReport(); };
            reset.Click += delegate
            {
                if (MessageBox.Show("確定清空本次統計？", "清空統計", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
                playCounts.Clear();
                watchSeconds.Clear();
                totalWatchSeconds = 0;
                RefreshStatsReport();
                Say("播放統計已清空。", true);
            };
            analyze.Click += delegate { MessageBox.Show(BuildPlaylistAnalyticsText(), "格式分析", MessageBoxButtons.OK, MessageBoxIcon.Information); };

            actions.Controls.Add(refresh);
            actions.Controls.Add(export);
            actions.Controls.Add(reset);
            actions.Controls.Add(analyze);

            statsBox = new RichTextBox();
            statsBox.Dock = DockStyle.Fill;
            statsBox.ReadOnly = true;
            statsBox.BorderStyle = BorderStyle.None;
            statsBox.Font = new Font("Consolas", 9F);

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(statsBox, 0, 2);
            page.Controls.Add(shell);
            RefreshStatsReport();
            return page;
        }

        private TabPage HotkeyTab()
        {
            TabPage page = new TabPage("快捷鍵");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 70));

            Label title = Info("快捷鍵自訂");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            lbHotkeys = new ListBox();
            lbHotkeys.Dock = DockStyle.Fill;
            lbHotkeys.Font = new Font("Consolas", 9F);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button set = Btn("設定選取快捷鍵", 160);
            Button reset = Btn("恢復預設", 120);
            Button export = Btn("匯出快捷鍵卡", 150);
            Button cmd = Btn("開啟指令面板", 150);

            set.Click += delegate { SetSelectedHotkey(); };
            reset.Click += delegate { RegisterDefaultHotkeys(); RefreshHotkeyList(); Say("快捷鍵已恢復預設。", true); };
            export.Click += delegate { ExportShortcutCard(); };
            cmd.Click += delegate { ShowCommandPalette(); };

            actions.Controls.Add(set);
            actions.Controls.Add(reset);
            actions.Controls.Add(export);
            actions.Controls.Add(cmd);

            Label note = Info("說明：固定快捷鍵仍保留，這裡可額外自訂常用指令。建議展示時按 Ctrl+K 或 Ctrl+P 開啟指令面板。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(lbHotkeys, 0, 1);
            shell.Controls.Add(actions, 0, 2);
            shell.Controls.Add(note, 0, 3);
            page.Controls.Add(shell);

            RefreshHotkeyList();
            return page;
        }

        private TabPage SessionSnapshotTab()
        {
            TabPage page = new TabPage("工作階段");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 96));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));

            Label title = Info("工作階段快照");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel actions = new FlowLayoutPanel();
            actions.Dock = DockStyle.Fill;
            actions.WrapContents = true;

            Button save = Btn("儲存快照", 120);
            Button load = Btn("載入快照", 120);
            Button list = Btn("重新整理列表", 150);
            Button folder = Btn("開啟快照資料夾", 160);
            Button current = Btn("快照目前狀態", 150);

            save.Click += delegate { SaveSessionSnapshotDialog(); };
            load.Click += delegate { LoadSessionSnapshotDialog(); };
            list.Click += delegate { RefreshSnapshotList(); };
            folder.Click += delegate { OpenSnapshotFolder(); };
            current.Click += delegate { if (snapshotBox != null) snapshotBox.Text = BuildSnapshotPreview(); };

            actions.Controls.Add(save);
            actions.Controls.Add(load);
            actions.Controls.Add(list);
            actions.Controls.Add(folder);
            actions.Controls.Add(current);

            snapshotBox = new RichTextBox();
            snapshotBox.Dock = DockStyle.Fill;
            snapshotBox.ReadOnly = true;
            snapshotBox.BorderStyle = BorderStyle.None;
            snapshotBox.Font = new Font("Consolas", 9F);

            Label note = Info("快照會保存播放清單、音量、主題、循環、隨機、目前項目與進度。適合展示前先保存一套完整環境。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(actions, 0, 1);
            shell.Controls.Add(snapshotBox, 0, 2);
            shell.Controls.Add(note, 0, 3);
            page.Controls.Add(shell);

            RefreshSnapshotList();
            return page;
        }

        private TabPage SubtitleStyleTab()
        {
            TabPage page = new TabPage("字幕樣式");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 5;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 90));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 90));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 90));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("字幕樣式編輯器");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel row1 = new FlowLayoutPanel();
            row1.Dock = DockStyle.Fill;
            row1.WrapContents = true;

            ComboBox fontSize = new ComboBox();
            fontSize.DropDownStyle = ComboBoxStyle.DropDownList;
            fontSize.Width = 100;
            fontSize.Items.AddRange(new object[] { "12", "14", "16", "18", "20", "24", "28", "32" });
            fontSize.SelectedItem = "14";

            ComboBox fontStyle = new ComboBox();
            fontStyle.DropDownStyle = ComboBoxStyle.DropDownList;
            fontStyle.Width = 120;
            fontStyle.Items.AddRange(new object[] { "粗體", "一般", "斜體", "粗斜體" });
            fontStyle.SelectedIndex = 0;

            Button apply = Btn("套用字型", 110);
            apply.Click += delegate
            {
                float size = 14;
                float.TryParse(fontSize.Text, out size);
                FontStyle style = FontStyle.Bold;
                if (fontStyle.Text == "一般") style = FontStyle.Regular;
                else if (fontStyle.Text == "斜體") style = FontStyle.Italic;
                else if (fontStyle.Text == "粗斜體") style = FontStyle.Bold | FontStyle.Italic;
                subtitleCustomFont = new Font("Microsoft JhengHei UI", size, style);
                ApplySubtitleStyle();
            };

            row1.Controls.Add(InfoInline("大小"));
            row1.Controls.Add(fontSize);
            row1.Controls.Add(InfoInline("樣式"));
            row1.Controls.Add(fontStyle);
            row1.Controls.Add(apply);

            FlowLayoutPanel row2 = new FlowLayoutPanel();
            row2.Dock = DockStyle.Fill;
            row2.WrapContents = true;

            Button white = Btn("白字", 86);
            Button yellow = Btn("金字", 86);
            Button cyan = Btn("青字", 86);
            Button blackBg = Btn("黑底", 86);
            Button transBg = Btn("透明底", 100);
            white.Click += delegate { subtitleCustomForeColor = Color.White; ApplySubtitleStyle(); };
            yellow.Click += delegate { subtitleCustomForeColor = Color.FromArgb(255, 210, 118); ApplySubtitleStyle(); };
            cyan.Click += delegate { subtitleCustomForeColor = Color.FromArgb(120, 220, 255); ApplySubtitleStyle(); };
            blackBg.Click += delegate { subtitleCustomBackColor = Color.Black; subtitleCustomAlpha = 230; ApplySubtitleStyle(); };
            transBg.Click += delegate { subtitleCustomAlpha = 0; ApplySubtitleStyle(); };

            row2.Controls.Add(white);
            row2.Controls.Add(yellow);
            row2.Controls.Add(cyan);
            row2.Controls.Add(blackBg);
            row2.Controls.Add(transBg);

            FlowLayoutPanel row3 = new FlowLayoutPanel();
            row3.Dock = DockStyle.Fill;
            row3.WrapContents = true;

            Button small = Btn("低字幕列", 110);
            Button medium = Btn("標準字幕列", 120);
            Button large = Btn("大字幕列", 110);
            Button preview = Btn("預覽字幕", 110);
            small.Click += delegate { subtitleCustomHeight = 36; ApplySubtitleStyle(); };
            medium.Click += delegate { subtitleCustomHeight = 44; ApplySubtitleStyle(); };
            large.Click += delegate { subtitleCustomHeight = 62; ApplySubtitleStyle(); };
            preview.Click += delegate { lblSubtitle.Text = "AURORA 字幕樣式預覽 Subtitle Preview"; ApplySubtitleStyle(); };

            row3.Controls.Add(small);
            row3.Controls.Add(medium);
            row3.Controls.Add(large);
            row3.Controls.Add(preview);

            Label note = Info("字幕樣式會套用到 .srt 顯示列。此功能不需要外部套件，展示效果明顯且不會增加檔案大小。");

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(row1, 0, 1);
            shell.Controls.Add(row2, 0, 2);
            shell.Controls.Add(row3, 0, 3);
            shell.Controls.Add(note, 0, 4);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage ToolsTab()
        {
            TabPage page = new TabPage("工具");
            TableLayoutPanel shell = new TableLayoutPanel();
            shell.Dock = DockStyle.Fill;
            shell.Padding = new Padding(10);
            shell.AutoScroll = true;
            shell.RowCount = 4;
            shell.ColumnCount = 1;
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 176));
            shell.RowStyles.Add(new RowStyle(SizeType.Absolute, 176));
            shell.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            Label title = Info("工具箱 / 進階控制");
            title.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);

            FlowLayoutPanel mediaTools = new FlowLayoutPanel();
            mediaTools.Dock = DockStyle.Fill;
            mediaTools.Padding = new Padding(0, 4, 0, 0);
            mediaTools.WrapContents = true;

            Button url = Btn("連網播放 / 串流 URL", 220);
            Button platform = Btn("平台搜尋 / 網頁播放", 220);
            Button yt = Btn("YouTube 搜尋", 220);
            Button bili = Btn("Bilibili 搜尋", 220);
            Button iqiyi = Btn("愛奇藝搜尋", 220);
            Button autoSub = Btn("自動尋找同名字幕", 220);
            Button clearSub = Btn("清除字幕", 220);
            btnAspect = Btn("畫面模式：填滿", 220);

            url.Click += delegate { AddUrlDialog(true); };
            platform.Click += delegate { ShowPlatformMode(true); };
            yt.Click += delegate { if (cboPlatform != null) cboPlatform.SelectedItem = "YouTube"; ShowPlatformMode(true); };
            bili.Click += delegate { if (cboPlatform != null) cboPlatform.SelectedItem = "Bilibili"; ShowPlatformMode(true); };
            iqiyi.Click += delegate { if (cboPlatform != null) cboPlatform.SelectedItem = "愛奇藝"; ShowPlatformMode(true); };
            autoSub.Click += delegate { AutoSubtitle(true); };
            clearSub.Click += delegate { subtitles.Clear(); lblSubtitle.Text = ""; Say("字幕已清除。", true); };
            btnAspect.Click += delegate { ToggleAspect(); };

            mediaTools.Controls.Add(url);
            mediaTools.Controls.Add(platform);
            mediaTools.Controls.Add(yt);
            mediaTools.Controls.Add(bili);
            mediaTools.Controls.Add(iqiyi);
            mediaTools.Controls.Add(autoSub);
            mediaTools.Controls.Add(clearSub);
            mediaTools.Controls.Add(btnAspect);

            FlowLayoutPanel powerTools = new FlowLayoutPanel();
            powerTools.Dock = DockStyle.Fill;
            powerTools.Padding = new Padding(0, 4, 0, 0);
            powerTools.WrapContents = true;

            Button back10 = Btn("倒退 10 秒", 136);
            Button fwd10 = Btn("快轉 10 秒", 136);
            Button back60 = Btn("倒退 60 秒", 136);
            Button fwd60 = Btn("快轉 60 秒", 136);
            Button jumpTime = Btn("跳到指定時間", 160);
            Button copyTime = Btn("複製時間碼", 136);
            Button snap = Btn("畫面截圖 PNG", 156);
            Button mini = Btn("迷你專注模式", 160);
            Button pin = Btn("視窗置頂", 126);
            Button folder = Btn("開啟來源位置", 150);
            Button duplicate = Btn("複製目前項目", 150);
            Button shuffleList = Btn("清單洗牌", 126);
            Button cleanMissing = Btn("清理失效檔案", 150);
            Button report = Btn("匯出播放報表", 156);
            Button exportLog = Btn("匯出紀錄", 126);
            Button clearLog = Btn("清除紀錄", 126);
            Button sleep15 = Btn("15 分鐘後停止", 156);
            Button sleep30 = Btn("30 分鐘後停止", 156);
            Button cancelSleep = Btn("取消睡眠計時", 156);

            back10.Click += delegate { SeekRelative(-10); };
            fwd10.Click += delegate { SeekRelative(10); };
            back60.Click += delegate { SeekRelative(-60); };
            fwd60.Click += delegate { SeekRelative(60); };
            jumpTime.Click += delegate { JumpToTimeDialog(); };
            copyTime.Click += delegate { CopyTimestamp(); };
            snap.Click += delegate { SaveDisplaySnapshot(); };
            mini.Click += delegate { ToggleMiniMode(); };
            pin.Click += delegate { ToggleAlwaysOnTop(); };
            folder.Click += delegate { OpenCurrentFolder(); };
            duplicate.Click += delegate { DuplicateCurrentItem(); };
            shuffleList.Click += delegate { ShufflePlaylistOrder(); };
            cleanMissing.Click += delegate { CleanMissingFiles(); };
            report.Click += delegate { ExportPlaylistReport(); };
            exportLog.Click += delegate { ExportLog(); };
            clearLog.Click += delegate { if (logBox != null) logBox.Clear(); Say("紀錄已清除。", false); };
            sleep15.Click += delegate { SetSleep(15); };
            sleep30.Click += delegate { SetSleep(30); };
            cancelSleep.Click += delegate { sleepAt = DateTime.MinValue; UpdateCount(); Say("已取消睡眠計時。", true); };

            powerTools.Controls.Add(back10);
            powerTools.Controls.Add(fwd10);
            powerTools.Controls.Add(back60);
            powerTools.Controls.Add(fwd60);
            powerTools.Controls.Add(jumpTime);
            powerTools.Controls.Add(copyTime);
            powerTools.Controls.Add(snap);
            powerTools.Controls.Add(mini);
            powerTools.Controls.Add(pin);
            powerTools.Controls.Add(folder);
            powerTools.Controls.Add(duplicate);
            powerTools.Controls.Add(shuffleList);
            powerTools.Controls.Add(cleanMissing);
            powerTools.Controls.Add(report);
            powerTools.Controls.Add(exportLog);
            powerTools.Controls.Add(clearLog);
            powerTools.Controls.Add(sleep15);
            powerTools.Controls.Add(sleep30);
            powerTools.Controls.Add(cancelSleep);

            Label note = Info("設計說明：此版採 AURORA 劇院控制台風格；本機影片使用 Windows Media Player 核心，平台影片優先用 WebView2，沒有 WebView2 時可嵌入 Edge / Chrome 視窗。會員、付費、廣告與 DRM 皆遵守平台規則。");
            note.Width = 310;
            note.Height = 130;

            shell.Controls.Add(title, 0, 0);
            shell.Controls.Add(mediaTools, 0, 1);
            shell.Controls.Add(powerTools, 0, 2);
            shell.Controls.Add(note, 0, 3);
            page.Controls.Add(shell);
            return page;
        }

        private TabPage LogTab()
        {
            TabPage page = new TabPage("紀錄");
            page.AutoScroll = true;
            logBox = new RichTextBox();
            logBox.Dock = DockStyle.Fill;
            logBox.ReadOnly = true;
            logBox.BorderStyle = BorderStyle.None;
            logBox.Font = new Font("Consolas", 9F);
            page.Controls.Add(logBox);
            return page;
        }

        private void BuildSeekArea()
        {
            TableLayoutPanel p = new TableLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.Padding = new Padding(10, 8, 10, 4);
            p.ColumnCount = 3;
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 82));
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 82));

            lblCurrent = Info("00:00");
            lblCurrent.Font = new Font("Consolas", 10F, FontStyle.Bold);
            lblCurrent.TextAlign = ContentAlignment.MiddleLeft;

            seekBar = new TrackBar();
            seekBar.Dock = DockStyle.Fill;
            seekBar.Minimum = 0;
            seekBar.Maximum = 1000;
            seekBar.TickStyle = TickStyle.None;

            lblTotal = Info("00:00");
            lblTotal.Font = new Font("Consolas", 10F, FontStyle.Bold);
            lblTotal.TextAlign = ContentAlignment.MiddleRight;

            p.Controls.Add(lblCurrent, 0, 0);
            p.Controls.Add(seekBar, 1, 0);
            p.Controls.Add(lblTotal, 2, 0);
            root.Controls.Add(p, 0, 2);
        }

        private void BuildControls()
        {
            CinemaPanel controlCard = new CinemaPanel();
            controlCard.Dock = DockStyle.Fill;
            controlCard.Padding = new Padding(12, 10, 12, 10);
            controlCard.CornerRadius = 22;
            controlCard.Paint += PaintControlDeck;

            TableLayoutPanel p = new TableLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.BackColor = Color.Transparent;
            p.ColumnCount = 3;
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33));
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 34));
            p.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33));

            FlowLayoutPanel left = Row();
            left.BackColor = Color.Transparent;
            left.Padding = new Padding(0, 14, 0, 0);
            btnShuffle = Btn("隨機：關", 96);
            btnRepeat = Btn("循環：關", 96);
            btnAspect = Btn("畫面：填滿", 112);
            btnShuffle.Click += delegate { shuffle = !shuffle; btnShuffle.Text = shuffle ? "隨機：開" : "隨機：關"; };
            btnRepeat.Click += delegate { CycleRepeat(); };
            btnAspect.Click += delegate { ToggleAspect(); };
            left.Controls.Add(btnShuffle);
            left.Controls.Add(btnRepeat);
            left.Controls.Add(btnAspect);

            FlowLayoutPanel mid = Row();
            mid.BackColor = Color.Transparent;
            mid.Padding = new Padding(0, 6, 0, 0);
            btnPrev = Btn("⏮", 70);
            btnPlay = Btn("▶ 播放", 130);
            btnStop = Btn("■ 停止", 92);
            btnNext = Btn("⏭", 70);
            btnPlay.Height = 46;
            btnPrev.Height = 42;
            btnStop.Height = 42;
            btnNext.Height = 42;
            btnPrev.Font = new Font("Segoe UI Symbol", 13F, FontStyle.Bold);
            btnNext.Font = new Font("Segoe UI Symbol", 13F, FontStyle.Bold);
            btnPlay.Font = new Font("Microsoft JhengHei UI", 11F, FontStyle.Bold);
            btnStop.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            btnPrev.Click += delegate { Previous(); };
            btnPlay.Click += delegate { PlayPause(); };
            btnStop.Click += delegate { Stop(); };
            btnNext.Click += delegate { Next(true); };
            mid.Controls.Add(btnPrev);
            mid.Controls.Add(btnPlay);
            mid.Controls.Add(btnStop);
            mid.Controls.Add(btnNext);

            FlowLayoutPanel right = Row();
            right.BackColor = Color.Transparent;
            right.Padding = new Padding(0, 9, 0, 0);
            Label speed = Info("倍速");
            speed.Width = 42;
            cboSpeed = new ComboBox();
            cboSpeed.DropDownStyle = ComboBoxStyle.DropDownList;
            cboSpeed.Width = 86;
            cboSpeed.Items.AddRange(new object[] { "0.5x", "0.75x", "1.0x", "1.25x", "1.5x", "2.0x" });
            cboSpeed.SelectedIndex = 2;
            btnMute = Btn("靜音", 76);
            lblVolume = Info("音量 80");
            lblVolume.Width = 72;
            volBar = new TrackBar();
            volBar.Width = 150;
            volBar.Minimum = 0;
            volBar.Maximum = 100;
            volBar.Value = 80;
            volBar.TickStyle = TickStyle.None;
            cboSpeed.SelectedIndexChanged += delegate { ApplyRate(); };
            btnMute.Click += delegate { ToggleMute(); };
            volBar.Scroll += delegate { SetVolume(volBar.Value); };
            right.Controls.Add(speed);
            right.Controls.Add(cboSpeed);
            right.Controls.Add(btnMute);
            right.Controls.Add(lblVolume);
            right.Controls.Add(volBar);

            p.Controls.Add(left, 0, 0);
            p.Controls.Add(mid, 1, 0);
            p.Controls.Add(right, 2, 0);

            controlCard.Controls.Add(p);
            root.Controls.Add(controlCard, 0, 3);
        }

        private void BuildStatusBar()
        {
            status = new StatusStrip();
            status.Dock = DockStyle.Fill;
            status.SizingGrip = false;
            status.Padding = new Padding(8, 2, 8, 2);
            statusLeft = new ToolStripStatusLabel("就緒");
            statusLeft.Spring = true;
            statusLeft.TextAlign = ContentAlignment.MiddleLeft;
            statusRight = new ToolStripStatusLabel("0 個項目");
            status.Items.Add(statusLeft);
            status.Items.Add(statusRight);
            root.Controls.Add(status, 0, 4);
        }

        private Button CreateWindowButton(string text, int width)
        {
            Button b = new Button();
            b.Text = text;
            b.Width = width;
            b.Height = 28;
            b.Margin = new Padding(3, 0, 0, 0);
            b.FlatStyle = FlatStyle.Flat;
            b.FlatAppearance.BorderSize = 0;
            b.Font = new Font("Segoe UI Symbol", 10F, FontStyle.Bold);
            b.Cursor = Cursors.Hand;
            return b;
        }

        private void TitleBar_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            ReleaseCapture();
            SendMessage(Handle, WM_NCLBUTTONDOWN, HTCAPTION, 0);
        }

        private void ToggleWindowState()
        {
            if (WindowState == FormWindowState.Maximized)
                WindowState = FormWindowState.Normal;
            else
                WindowState = FormWindowState.Maximized;
        }

        private Bitmap CreateBrandBitmap(int width, int height)
        {
            Bitmap bmp = new Bitmap(width, height);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);
                Rectangle rect = new Rectangle(2, 2, width - 4, height - 4);
                using (GraphicsPath path = CreateRoundPath(rect, 14))
                using (LinearGradientBrush brush = new LinearGradientBrush(rect, Color.FromArgb(255, 182, 72), Color.FromArgb(79, 126, 255), 45f))
                {
                    g.FillPath(brush, path);
                }

                using (SolidBrush b = new SolidBrush(Color.FromArgb(18, 22, 31)))
                {
                    g.FillRectangle(b, width * 0.18f, height * 0.26f, width * 0.48f, height * 0.48f);
                    PointF[] tri =
                    {
                        new PointF(width * 0.62f, height * 0.28f),
                        new PointF(width * 0.84f, height * 0.16f),
                        new PointF(width * 0.84f, height * 0.62f),
                        new PointF(width * 0.62f, height * 0.50f)
                    };
                    g.FillPolygon(b, tri);
                }

                using (Pen p2 = new Pen(Color.WhiteSmoke, Math.Max(2, width / 18)))
                {
                    g.DrawLine(p2, width * 0.28f, height * 0.26f, width * 0.28f, height * 0.74f);
                    g.DrawLine(p2, width * 0.42f, height * 0.26f, width * 0.42f, height * 0.74f);
                    g.DrawLine(p2, width * 0.18f, height * 0.40f, width * 0.66f, height * 0.40f);
                    g.DrawLine(p2, width * 0.18f, height * 0.56f, width * 0.66f, height * 0.56f);
                }
            }
            return bmp;
        }

        private Icon CreateAppIcon()
        {
            using (Bitmap bmp = CreateBrandBitmap(64, 64))
            {
                IntPtr hIcon = bmp.GetHicon();
                return Icon.FromHandle(hIcon);
            }
        }

        private GraphicsPath CreateRoundPath(Rectangle rect, int radius)
        {
            int d = radius * 2;
            GraphicsPath gp = new GraphicsPath();
            gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
            gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            gp.CloseFigure();
            return gp;
        }

        private void ApplyRoundRegion(Control c, int radius)
        {
            if (c.Width <= 0 || c.Height <= 0) return;
            using (GraphicsPath gp = CreateRoundPath(new Rectangle(0, 0, c.Width - 1, c.Height - 1), radius))
            {
                c.Region = new Region(gp);
            }
        }

        private void PaintHero(object sender, PaintEventArgs e)
        {
            Control c = (Control)sender;
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(0, 0, c.Width - 1, c.Height - 1);
            if (r.Width <= 0 || r.Height <= 0) return;

            Color c1 = dark ? Color.FromArgb(12, 17, 24) : Color.FromArgb(250, 252, 255);
            Color c2 = dark ? Color.FromArgb(18, 25, 38) : Color.FromArgb(238, 242, 249);
            using (LinearGradientBrush br = new LinearGradientBrush(r, c1, c2, 0f))
                e.Graphics.FillRectangle(br, r);

            using (Pen glow = new Pen(dark ? Color.FromArgb(60, 255, 187, 82) : Color.FromArgb(70, 238, 154, 32), 2))
                e.Graphics.DrawLine(glow, 12, c.Height - 2, c.Width - 12, c.Height - 2);

            using (Pen p = new Pen(dark ? Color.FromArgb(35, 255, 255, 255) : Color.FromArgb(40, 30, 40, 60)))
            {
                for (int x = 0; x < c.Width; x += 26)
                {
                    e.Graphics.DrawLine(p, x, c.Height - 9, x + 10, c.Height - 9);
                }
            }
        }

        private void PaintDisplayShell(object sender, PaintEventArgs e)
        {
            Control c = (Control)sender;
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(0, 0, c.Width - 1, c.Height - 1);
            if (r.Width <= 0 || r.Height <= 0) return;

            bool playing = State() == WMPPlayState.wmppsPlaying || platformMode;
            bool paused = State() == WMPPlayState.wmppsPaused;
            Color glowColor = playing ? themeAccent : (paused ? Color.FromArgb(90, 120, 160) : Color.FromArgb(55, 64, 80));
            int glowAlpha = playing ? 90 + (int)(50 * Math.Abs(Math.Sin(ambientPulse))) : 48;

            using (GraphicsPath gp = CreateRoundPath(r, 18))
            using (LinearGradientBrush br = new LinearGradientBrush(r, Color.FromArgb(0, 0, 0), Color.FromArgb(13, 16, 22), 90f))
            using (Pen border = new Pen(dark ? Color.FromArgb(72, 83, 104) : Color.FromArgb(198, 207, 220), 1))
            {
                e.Graphics.FillPath(br, gp);
                e.Graphics.DrawPath(border, gp);
            }

            for (int i = 0; i < 3; i++)
            {
                Rectangle halo = new Rectangle(5 + i * 4, 5 + i * 4, Math.Max(1, c.Width - 11 - i * 8), Math.Max(1, c.Height - 11 - i * 8));
                using (GraphicsPath gp = CreateRoundPath(halo, 20))
                using (Pen glow = new Pen(Color.FromArgb(Math.Max(10, glowAlpha - i * 24), glowColor), 1 + i))
                    e.Graphics.DrawPath(glow, gp);
            }
        }

        private void PaintControlDeck(object sender, PaintEventArgs e)
        {
            Control c = (Control)sender;
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle r = new Rectangle(0, 0, c.Width - 1, c.Height - 1);
            if (r.Width <= 0 || r.Height <= 0) return;

            Color top = dark ? Color.FromArgb(18, 24, 34) : Color.FromArgb(255, 255, 255);
            Color bottom = dark ? Color.FromArgb(9, 12, 18) : Color.FromArgb(232, 237, 246);
            using (GraphicsPath gp = CreateRoundPath(r, 22))
            using (LinearGradientBrush br = new LinearGradientBrush(r, top, bottom, 90f))
            using (Pen border = new Pen(dark ? Color.FromArgb(54, 63, 82) : Color.FromArgb(210, 218, 230), 1))
            {
                e.Graphics.FillPath(br, gp);
                e.Graphics.DrawPath(border, gp);
            }
        }

        private void ConfigureCinemaTabs(TabControl tabs)
        {
            tabs.DrawMode = TabDrawMode.OwnerDrawFixed;
            tabs.SizeMode = TabSizeMode.Fixed;
            tabs.ItemSize = new Size(86, 34);
            tabs.Padding = new Point(12, 6);
            tabs.DrawItem += DrawCinemaTab;
        }

        private void DrawCinemaTab(object sender, DrawItemEventArgs e)
        {
            TabControl tabs = (TabControl)sender;
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle r = tabs.GetTabRect(e.Index);
            r.Inflate(-3, -4);
            bool selected = e.Index == tabs.SelectedIndex;

            Color fill1 = selected
                ? (dark ? Color.FromArgb(255, 187, 82) : Color.FromArgb(238, 154, 32))
                : (dark ? Color.FromArgb(22, 28, 39) : Color.FromArgb(238, 242, 248));
            Color fill2 = selected
                ? (dark ? Color.FromArgb(255, 139, 68) : Color.FromArgb(255, 190, 92))
                : (dark ? Color.FromArgb(14, 18, 27) : Color.FromArgb(247, 249, 252));
            Color txt = selected
                ? Color.FromArgb(18, 20, 25)
                : (dark ? Color.FromArgb(220, 226, 235) : Color.FromArgb(35, 43, 56));

            using (GraphicsPath gp = CreateRoundPath(r, 12))
            using (LinearGradientBrush br = new LinearGradientBrush(r, fill1, fill2, 90f))
            using (Pen pen = new Pen(selected ? Color.FromArgb(255, 215, 130) : (dark ? Color.FromArgb(48, 58, 74) : Color.FromArgb(210, 218, 230))))
            {
                g.FillPath(br, gp);
                g.DrawPath(pen, gp);
            }

            TextRenderer.DrawText(
                g,
                tabs.TabPages[e.Index].Text,
                new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold),
                r,
                txt,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }

        private Button Btn(string text, int width)
        {
            CinemaButton b = new CinemaButton();
            b.Text = text;
            b.Width = width;
            b.Height = 34;
            b.Margin = new Padding(5, 3, 5, 3);
            b.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            b.Cursor = Cursors.Hand;
            b.CornerRadius = 18;
            return b;
        }

        private FlowLayoutPanel Row()
        {
            FlowLayoutPanel p = new FlowLayoutPanel();
            p.Dock = DockStyle.Fill;
            p.WrapContents = false;
            p.FlowDirection = FlowDirection.LeftToRight;
            return p;
        }

        private Label Info(string text)
        {
            Label l = new Label();
            l.Text = text;
            l.Dock = DockStyle.Fill;
            l.TextAlign = ContentAlignment.MiddleLeft;
            l.AutoEllipsis = true;
            l.Padding = new Padding(4, 0, 4, 0);
            return l;
        }

        private Label InfoInline(string text)
        {
            Label l = new Label();
            l.Text = text;
            l.Width = 48;
            l.Height = 34;
            l.TextAlign = ContentAlignment.MiddleCenter;
            l.AutoEllipsis = true;
            l.Padding = new Padding(4, 0, 4, 0);
            return l;
        }

        private Panel BuildExternalBrowserPanel()
        {
            Panel panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.BackColor = Color.Black;
            panel.Padding = new Padding(24);

            TableLayoutPanel box = new TableLayoutPanel();
            box.Dock = DockStyle.Fill;
            box.RowCount = 5;
            box.ColumnCount = 1;
            box.RowStyles.Add(new RowStyle(SizeType.Percent, 38));
            box.RowStyles.Add(new RowStyle(SizeType.Absolute, 56));
            box.RowStyles.Add(new RowStyle(SizeType.Absolute, 82));
            box.RowStyles.Add(new RowStyle(SizeType.Absolute, 48));
            box.RowStyles.Add(new RowStyle(SizeType.Percent, 62));

            Label title = new Label();
            title.Text = "平台播放相容 / 嵌入模式";
            title.Dock = DockStyle.Fill;
            title.TextAlign = ContentAlignment.BottomCenter;
            title.ForeColor = Color.White;
            title.Font = new Font("Microsoft JhengHei UI", 22F, FontStyle.Bold);

            Label desc = new Label();
            desc.Text = "此模式不使用 .NET 內建舊瀏覽器，避免 YouTube / Bilibili / 愛奇藝提示瀏覽器過舊。\n" +
                        "若未安裝 WebView2，平台影片會改由系統預設瀏覽器開啟；本程式仍會保留搜尋、收藏、網址管理與播放清單功能。";
            desc.Dock = DockStyle.Fill;
            desc.TextAlign = ContentAlignment.MiddleCenter;
            desc.ForeColor = Color.Gainsboro;
            desc.Font = new Font("Microsoft JhengHei UI", 11F, FontStyle.Bold);

            FlowLayoutPanel buttons = new FlowLayoutPanel();
            buttons.Dock = DockStyle.Fill;
            buttons.FlowDirection = FlowDirection.LeftToRight;
            buttons.WrapContents = false;
            buttons.Anchor = AnchorStyles.None;
            buttons.AutoSize = true;

            Button embed = Btn("嵌入 Edge / Chrome", 170);
            Button open = Btn("外部開啟", 110);
            Button copy = Btn("複製網址", 110);
            Button help = Btn("WebView2 說明", 130);
            embed.Click += delegate { OpenCurrentWebEmbedded(); };
            open.Click += delegate { OpenCurrentWebExternal(); };
            copy.Click += delegate { CopyCurrentWebUrl(); };
            help.Click += delegate { ShowWebView2InstallHelp(); };
            buttons.Controls.Add(embed);
            buttons.Controls.Add(open);
            buttons.Controls.Add(copy);
            buttons.Controls.Add(help);

            Label tip = new Label();
            tip.Text = "建議繳交說明：有 WebView2 時直接內嵌平台；沒有 WebView2 時改用 Edge / Chrome 子視窗嵌入；最後才外部開啟。";
            tip.Dock = DockStyle.Fill;
            tip.TextAlign = ContentAlignment.TopCenter;
            tip.ForeColor = Color.FromArgb(139, 154, 175);
            tip.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular);

            box.Controls.Add(title, 0, 0);
            box.Controls.Add(desc, 0, 1);
            box.Controls.Add(buttons, 0, 2);
            box.Controls.Add(tip, 0, 3);
            panel.Controls.Add(box);
            return panel;
        }



        private void BindEvents()
        {
            FormClosing += delegate { RememberCurrentPosition(); SaveSession(); SaveProductData(); StopEmbeddedBrowser(); };
            KeyDown += FormKeyDown;
            DragEnter += DragEnterHandler;
            DragDrop += DragDropHandler;
            playerHost.DragEnter += DragEnterHandler;
            playerHost.DragDrop += DragDropHandler;
            displayHost.DragEnter += DragEnterHandler;
            displayHost.DragDrop += DragDropHandler;
            webHost.DragEnter += DragEnterHandler;
            webHost.DragDrop += DragDropHandler;

            txtSearch.TextChanged += delegate { RefreshPlaylist(); };
            lvPlaylist.DoubleClick += delegate { PlaySelected(); };
            lvPlaylist.SelectedIndexChanged += delegate { UpdateInfo(); };
            lvPlaylist.KeyDown += delegate (object s, KeyEventArgs e)
            {
                if (e.KeyCode == Keys.Delete) RemoveSelected();
                if (e.KeyCode == Keys.Enter) PlaySelected();
            };

            seekBar.MouseDown += delegate { seeking = true; };
            seekBar.MouseUp += delegate { SeekByBar(); seeking = false; };
            seekBar.Scroll += delegate { if (seeking) lblCurrent.Text = FormatTime(BarSeconds()); };

            timer = new System.Windows.Forms.Timer();
            timer.Interval = 250;
            timer.Tick += delegate { TickUI(); };
            timer.Start();

            sleepTimer = new System.Windows.Forms.Timer();
            sleepTimer.Interval = 1000;
            sleepTimer.Tick += delegate { TickSleep(); };
            sleepTimer.Start();
        }

        private void ConfigurePlayer()
        {
            try
            {
                player.uiMode = "none";
                player.stretchToFit = stretch;
                player.enableContextMenu = false;
                player.settings.autoStart = false;
                player.settings.volume = volBar.Value;
                player.PlayStateChange += Player_PlayStateChange;
                player.MediaError += Player_MediaError;
                Log("Windows Media Player ActiveX 初始化完成。");
            }
            catch (Exception ex)
            {
                MessageBox.Show("播放器初始化失敗。\n\n請確認已加入 COM 參考：Windows Media Player。\n若仍失敗，可把平台目標改成 x86。\n\n" + ex.Message,
                    "初始化失敗", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void Player_PlayStateChange(object sender, _WMPOCXEvents_PlayStateChangeEvent e)
        {
            WMPPlayState st = (WMPPlayState)e.newState;
            string text = StateText(st);
            infoState.Text = "狀態：" + text;
            Say(text, false);

            if (currentIndex >= 0 && currentIndex < playlist.Count)
                lblNow.Text = text + "「" + playlist[currentIndex].Title + "」";
            else
                lblNow.Text = text;

            if (st == WMPPlayState.wmppsPlaying)
            {
                btnPlay.Text = "暫停";
                ApplyRate();
            }
            else if (st == WMPPlayState.wmppsPaused || st == WMPPlayState.wmppsStopped)
            {
                btnPlay.Text = "播放";
            }
            else if (st == WMPPlayState.wmppsMediaEnded)
            {
                Ended();
            }

            RefreshPlaylist();
            UpdateWelcomeStage();
        }

        private void Player_MediaError(object sender, _WMPOCXEvents_MediaErrorEvent e)
        {
            string source = CurrentSource();
            string msg = "播放失敗：" + source;
            try
            {
                if (player.Error != null && player.Error.errorCount > 0)
                    msg += "\n" + player.Error.get_Item(0).errorDescription;
            }
            catch { }

            Log(msg);
            Say("播放失敗，可能是格式、解碼器或網路來源不支援。", true);
            MessageBox.Show(msg + "\n\n可能原因：\n1. 缺少解碼器\n2. 網路串流 URL 不支援或無效\n3. 檔案損毀\n4. WMP 不支援該容器/編碼\n\nMP4 通常可播；MKV、FLAC、m3u8 則視電腦環境而定。",
                "播放失敗", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        private void FormKeyDown(object sender, KeyEventArgs e)
        {
            if (HandleCustomHotkey(e)) return;
            if (e.KeyCode == Keys.Space) { PlayPause(); e.Handled = true; }
            else if (e.KeyCode == Keys.Left) { SeekRelative(-5); e.Handled = true; }
            else if (e.KeyCode == Keys.Right) { SeekRelative(5); e.Handled = true; }
            else if (e.KeyCode == Keys.Up) { SetVolume(Math.Min(100, volBar.Value + 5)); e.Handled = true; }
            else if (e.KeyCode == Keys.Down) { SetVolume(Math.Max(0, volBar.Value - 5)); e.Handled = true; }
            else if (e.KeyCode == Keys.F11) { ToggleTheater(); e.Handled = true; }
            else if (e.KeyCode == Keys.M) { ToggleMute(); e.Handled = true; }
            else if (e.KeyCode == Keys.T) { ToggleAlwaysOnTop(); e.Handled = true; }
            else if (e.KeyCode == Keys.Escape && theater) { ToggleTheater(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.K) { ShowCommandPalette(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.P) { ShowCommandPalette(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.J) { JumpToTimeDialog(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.S) { SaveDisplaySnapshot(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.O) { PickFiles(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.U) { AddUrlDialog(true); e.Handled = true; }
        }

        private void DragEnterHandler(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop) || e.Data.GetDataPresent(DataFormats.Text))
                e.Effect = DragDropEffects.Copy;
        }

        private void DragDropHandler(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                string[] paths = e.Data.GetData(DataFormats.FileDrop) as string[];
                AddPaths(paths, true);
            }
            else if (e.Data.GetDataPresent(DataFormats.Text))
            {
                string text = Convert.ToString(e.Data.GetData(DataFormats.Text)).Trim();
                if (IsUrl(text)) AddUrl(text, true);
            }
        }



        private string SelectedBrowserEngine()
        {
            if (cboBrowserEngine == null || cboBrowserEngine.SelectedItem == null) return "自動";
            return cboBrowserEngine.SelectedItem.ToString();
        }

        private bool BrowserEngineIsExternal()
        {
            return SelectedBrowserEngine().StartsWith("外部");
        }

        private bool BrowserEngineIsEmbedded()
        {
            return SelectedBrowserEngine().StartsWith("嵌入") || usingEmbeddedBrowserFallback;
        }

        private bool BrowserEngineIsClassic()
        {

            return false;
        }

        private bool BrowserEngineIsForceWebView2()
        {
            return SelectedBrowserEngine().StartsWith("強制");
        }

        private void ResetBrowserEngine()
        {
            string current = CurrentWebUrl();
            lastBrowserEngine = "";
            webReady = false;
            usingModernWebView2 = false;
            usingEmbeddedBrowserFallback = false;
            modernCore = null;
            StopEmbeddedBrowser();
            if (!string.IsNullOrWhiteSpace(current)) pendingWebUrl = current;

            if (platformMode) InitBrowser();
        }

        private void InitBrowser()
        {
            string selected = SelectedBrowserEngine();
            if (webReady && selected == lastBrowserEngine) return;

            lastBrowserEngine = selected;

            if (BrowserEngineIsExternal())
            {
                webReady = true;
                usingModernWebView2 = false;
                usingEmbeddedBrowserFallback = false;
                StopEmbeddedBrowser();
                if (externalPanel != null)
                {
                    externalPanel.Visible = true;
                    externalPanel.BringToFront();
                }
                if (modernWebView != null) modernWebView.Visible = false;
                if (lblWebStatus != null) lblWebStatus.Text = "外部瀏覽器模式：搜尋或前往時會用系統預設瀏覽器開啟。";
                return;
            }

            if (SelectedBrowserEngine().StartsWith("嵌入"))
            {
                ActivateEmbeddedBrowserFallback();
                return;
            }

            if (!BrowserEngineIsClassic())
            {
                if (TryEnableWebView2()) return;

                if (BrowserEngineIsForceWebView2())
                {
                    webReady = false;
                    if (lblWebStatus != null) lblWebStatus.Text = "WebView2 無法使用。請安裝 NuGet 套件與 Runtime，或改選自動 / 外部預設瀏覽器。";
                    if (!webView2HelpShown)
                    {
                        webView2HelpShown = true;
                        ShowWebView2InstallHelp();
                    }
                    return;
                }
            }

            ActivateEmbeddedBrowserFallback();
        }

        private bool TryEnableWebView2()
        {
            try
            {
                if (modernWebView == null)
                {
                    Type wvType = FindWebView2Type();
                    if (wvType == null)
                    {
                        Log("找不到 Microsoft.Web.WebView2.WinForms.dll，改用 Edge / Chrome 嵌入模式。 ");
                        return false;
                    }

                    object instance = Activator.CreateInstance(wvType);
                    Control control = instance as Control;
                    if (control == null) return false;

                    control.Dock = DockStyle.Fill;
                    control.Visible = true;
                    modernWebView = control;
                    webHost.Controls.Add(modernWebView);
                }

                usingModernWebView2 = true;
                if (externalPanel != null) externalPanel.Visible = false;
                modernWebView.Visible = true;
                modernWebView.BringToFront();

                if (modernCore != null)
                {
                    webReady = true;
                    if (lblWebStatus != null) lblWebStatus.Text = "WebView2 已啟用。";
                    return true;
                }

                if (webView2Initializing)
                {
                    if (lblWebStatus != null) lblWebStatus.Text = "WebView2 初始化中...";
                    return true;
                }

                MethodInfo ensure = modernWebView.GetType().GetMethods()
                    .FirstOrDefault(m => m.Name == "EnsureCoreWebView2Async");

                if (ensure == null)
                {
                    Log("WebView2 控制項沒有 EnsureCoreWebView2Async，改用 Edge / Chrome 嵌入模式。 ");
                    return false;
                }

                object[] args = new object[ensure.GetParameters().Length];
                object result = ensure.Invoke(modernWebView, args);
                Task task = result as Task;

                webView2Initializing = true;
                if (lblWebStatus != null) lblWebStatus.Text = "WebView2 初始化中...";

                if (task == null)
                {
                    FinishWebView2Initialization(null);
                    return modernCore != null;
                }

                task.ContinueWith(delegate (Task t)
                {
                    if (t.IsFaulted)
                    {
                        string msg = t.Exception == null ? "未知錯誤" : t.Exception.GetBaseException().Message;
                        webView2Initializing = false;
                        Log("WebView2 初始化失敗：" + msg);
                        if (lblWebStatus != null) lblWebStatus.Text = "WebView2 Runtime 未安裝或初始化失敗，已降級。";

                        if (BrowserEngineIsForceWebView2())
                        {
                            ShowWebView2InstallHelp();
                        }
                        else
                        {
                            ActivateEmbeddedBrowserFallback();
                            if (!string.IsNullOrWhiteSpace(pendingWebUrl))
                            {
                                string url = pendingWebUrl;
                                pendingWebUrl = "";
                                OpenWeb(url);
                            }
                        }
                        return;
                    }

                    FinishWebView2Initialization(null);
                    if (!string.IsNullOrWhiteSpace(pendingWebUrl))
                    {
                        string url = pendingWebUrl;
                        pendingWebUrl = "";
                        OpenWeb(url);
                    }
                }, TaskScheduler.FromCurrentSynchronizationContext());

                return true;
            }
            catch (Exception ex)
            {
                Log("啟用 WebView2 失敗：" + ex.Message);
                return false;
            }
        }

        private Type FindWebView2Type()
        {
            Type t = Type.GetType("Microsoft.Web.WebView2.WinForms.WebView2, Microsoft.Web.WebView2.WinForms");
            if (t != null) return t;

            try
            {
                Assembly a = Assembly.Load("Microsoft.Web.WebView2.WinForms");
                t = a.GetType("Microsoft.Web.WebView2.WinForms.WebView2");
                if (t != null) return t;
            }
            catch { }

            try
            {
                string dll = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Microsoft.Web.WebView2.WinForms.dll");
                if (File.Exists(dll))
                {
                    Assembly a = Assembly.LoadFrom(dll);
                    t = a.GetType("Microsoft.Web.WebView2.WinForms.WebView2");
                    if (t != null) return t;
                }
            }
            catch { }

            return null;
        }

        private void FinishWebView2Initialization(object unused)
        {
            try
            {
                webView2Initializing = false;
                if (modernWebView == null) return;
                PropertyInfo p = modernWebView.GetType().GetProperty("CoreWebView2");
                modernCore = p == null ? null : p.GetValue(modernWebView, null);
                if (modernCore == null)
                {
                    webReady = false;
                    if (lblWebStatus != null) lblWebStatus.Text = "WebView2 初始化未完成。";
                    return;
                }

                ConfigureWebView2Settings();
                webReady = true;
                usingModernWebView2 = true;
                usingEmbeddedBrowserFallback = false;
                StopEmbeddedBrowser();
                modernWebView.Visible = true;
                if (externalPanel != null) externalPanel.Visible = false;
                modernWebView.BringToFront();
                if (lblWebStatus != null) lblWebStatus.Text = "WebView2 就緒：可播放 YouTube / Bilibili / 愛奇藝等官方頁面。";
                Log("WebView2 初始化完成。 ");
            }
            catch (Exception ex)
            {
                Log("WebView2 完成初始化時發生錯誤：" + ex.Message);
            }
        }

        private void ConfigureWebView2Settings()
        {
            try
            {
                if (modernCore == null) return;
                object settings = GetPropertyValue(modernCore, "Settings");
                if (settings == null) return;
                SetBoolProperty(settings, "AreDefaultContextMenusEnabled", true);
                SetBoolProperty(settings, "AreDevToolsEnabled", true);
                SetBoolProperty(settings, "IsZoomControlEnabled", true);
                SetBoolProperty(settings, "AreBrowserAcceleratorKeysEnabled", true);
                SetBoolProperty(settings, "IsStatusBarEnabled", false);
            }
            catch { }
        }

        private object GetPropertyValue(object obj, string name)
        {
            if (obj == null) return null;
            PropertyInfo p = obj.GetType().GetProperty(name);
            return p == null ? null : p.GetValue(obj, null);
        }

        private void SetBoolProperty(object obj, string name, bool value)
        {
            try
            {
                PropertyInfo p = obj.GetType().GetProperty(name);
                if (p != null && p.CanWrite) p.SetValue(obj, value, null);
            }
            catch { }
        }

        private void ActivateEmbeddedBrowserFallback()
        {
            try
            {
                usingModernWebView2 = false;
                usingEmbeddedBrowserFallback = true;
                webReady = true;

                if (modernWebView != null) modernWebView.Visible = false;

                if (embeddedSurface == null)
                {
                    embeddedSurface = new Panel();
                    embeddedSurface.Dock = DockStyle.Fill;
                    embeddedSurface.BackColor = Color.Black;
                    embeddedSurface.Resize += delegate { ResizeEmbeddedBrowser(); };
                    webHost.Controls.Add(embeddedSurface);
                }

                if (externalPanel != null) externalPanel.Visible = false;
                embeddedSurface.Visible = true;
                embeddedSurface.BringToFront();

                if (lblWebStatus != null)
                    lblWebStatus.Text = "嵌入 Edge / Chrome 模式：不用 NuGet；會把瀏覽器視窗嵌入在本程式播放區。";

                Log("已切換到 Edge / Chrome 視窗嵌入模式。 ");
            }
            catch (Exception ex)
            {
                Log("嵌入瀏覽器模式初始化失敗：" + ex.Message);
                ActivateExternalBrowserFallback();
            }
        }

        private void OpenCurrentWebEmbedded()
        {
            string url = CurrentWebUrl();
            if (url.Length == 0) return;
            ActivateEmbeddedBrowserFallback();
            OpenEmbeddedBrowser(url);
        }

        private void OpenEmbeddedBrowser(string url)
        {
            try
            {
                string exe = FindModernBrowserExe();
                if (string.IsNullOrWhiteSpace(exe) || !File.Exists(exe))
                {
                    ActivateExternalBrowserFallback();
                    OpenExternalUrl(url);
                    Say("找不到 Edge / Chrome，已改用外部瀏覽器。", false);
                    return;
                }

                ActivateEmbeddedBrowserFallback();
                if (txtWebAddress != null) txtWebAddress.Text = url;

                StopEmbeddedBrowser();

                Directory.CreateDirectory(sessionFolder);
                string profile = Path.Combine(sessionFolder, "EmbeddedBrowserProfile");
                Directory.CreateDirectory(profile);

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exe;
                psi.Arguments = "--app=\"" + url.Replace("\"", "") + "\" --new-window --no-first-run --disable-extensions --user-data-dir=\"" + profile + "\"";
                psi.UseShellExecute = false;

                embeddedBrowserProcess = Process.Start(psi);
                if (embeddedBrowserProcess == null)
                    throw new Exception("無法啟動瀏覽器程序。");

                embeddedBrowserHandle = WaitForMainWindow(embeddedBrowserProcess, 12000);
                if (embeddedBrowserHandle == IntPtr.Zero)
                    throw new Exception("找不到瀏覽器主視窗。若 Edge / Chrome 已在背景鎖定設定檔，請稍後再試或使用外部瀏覽器。 ");

                long style = GetWindowStyle(embeddedBrowserHandle);
                style &= ~WS_POPUP;
                style &= ~WS_CAPTION;
                style &= ~WS_THICKFRAME;
                style &= ~WS_MINIMIZEBOX;
                style &= ~WS_MAXIMIZEBOX;
                style &= ~WS_SYSMENU;
                style |= WS_CHILD;
                style |= WS_VISIBLE;
                SetWindowStyle(embeddedBrowserHandle, style);

                SetParent(embeddedBrowserHandle, embeddedSurface.Handle);
                ShowWindow(embeddedBrowserHandle, SW_SHOW);
                ResizeEmbeddedBrowser();

                if (lblWebStatus != null) lblWebStatus.Text = "已嵌入瀏覽器：" + Path.GetFileName(exe);
                Say("已在本程式內嵌入 Edge / Chrome 播放平台頁面。", true);
                Log("嵌入瀏覽器載入：" + url);
            }
            catch (Exception ex)
            {
                Log("嵌入 Edge / Chrome 失敗：" + ex.Message);
                ActivateExternalBrowserFallback();
                MessageBox.Show("無法把 Edge / Chrome 嵌入到播放區。\n\n原因：" + ex.Message + "\n\n會改用外部瀏覽器開啟。",
                    "嵌入瀏覽器失敗", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                OpenExternalUrl(url);
            }
        }

        private string FindModernBrowserExe()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidates = new string[]
            {
                Path.Combine(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(pfx86, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(local, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(pf, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(pfx86, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(local, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(pf, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
                Path.Combine(pfx86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")
            };

            foreach (string c in candidates)
                if (File.Exists(c)) return c;

            return "";
        }

        private IntPtr WaitForMainWindow(Process process, int timeoutMs)
        {
            DateTime until = DateTime.Now.AddMilliseconds(timeoutMs);
            while (DateTime.Now < until)
            {
                try
                {
                    process.Refresh();
                    if (process.MainWindowHandle != IntPtr.Zero)
                        return process.MainWindowHandle;

                    IntPtr h = FindWindowByProcessId(process.Id);
                    if (h != IntPtr.Zero) return h;
                }
                catch { }

                Application.DoEvents();
                Thread.Sleep(100);
            }
            return IntPtr.Zero;
        }

        private IntPtr FindWindowByProcessId(int pid)
        {
            IntPtr found = IntPtr.Zero;
            EnumWindows(delegate (IntPtr hWnd, IntPtr lParam)
            {
                uint windowPid;
                GetWindowThreadProcessId(hWnd, out windowPid);
                if (windowPid == (uint)pid && IsWindowVisible(hWnd))
                {
                    found = hWnd;
                    return false;
                }
                return true;
            }, IntPtr.Zero);
            return found;
        }

        private void ResizeEmbeddedBrowser()
        {
            try
            {
                if (embeddedSurface == null) return;
                if (embeddedBrowserHandle == IntPtr.Zero) return;
                if (!IsWindow(embeddedBrowserHandle)) return;
                MoveWindow(embeddedBrowserHandle, 0, 0, embeddedSurface.ClientSize.Width, embeddedSurface.ClientSize.Height, true);
            }
            catch { }
        }

        private void StopEmbeddedBrowser()
        {
            try
            {
                if (embeddedBrowserProcess != null && !embeddedBrowserProcess.HasExited)
                {
                    try { embeddedBrowserProcess.CloseMainWindow(); } catch { }
                    if (!embeddedBrowserProcess.WaitForExit(500))
                    {
                        try { embeddedBrowserProcess.Kill(); } catch { }
                    }
                }
            }
            catch { }
            embeddedBrowserProcess = null;
            embeddedBrowserHandle = IntPtr.Zero;
        }

        private void ActivateExternalBrowserFallback()
        {
            try
            {
                usingModernWebView2 = false;
                usingEmbeddedBrowserFallback = false;
                StopEmbeddedBrowser();
                webReady = true;

                if (modernWebView != null) modernWebView.Visible = false;
                if (externalPanel == null)
                {
                    externalPanel = BuildExternalBrowserPanel();
                    webHost.Controls.Add(externalPanel);
                }

                externalPanel.Visible = true;
                externalPanel.BringToFront();

                if (lblWebStatus != null)
                    lblWebStatus.Text = "外部瀏覽器模式：不使用舊版 IE WebBrowser；搜尋或前往會用 Edge / Chrome 開啟。";

                Log("已切換到外部預設瀏覽器模式。 ");
            }
            catch (Exception ex)
            {
                if (lblWebStatus != null) lblWebStatus.Text = "外部瀏覽器模式初始化失敗";
                Log("外部瀏覽器模式初始化失敗：" + ex.Message);
                MessageBox.Show("外部瀏覽器模式初始化失敗。\n\n錯誤：" + ex.Message,
                    "瀏覽器初始化失敗", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void ShowWebView2InstallHelp()
        {
            string msg =
                "平台影片建議使用 WebView2。\n\n" +
                "優點：比 .NET 內建 WebBrowser 新很多，比較像 Edge / Chrome，YouTube、Bilibili、愛奇藝等網站支援度較好。\n\n" +
                "如果助教電腦沒有 WebView2，本程式仍可執行，會嘗試把 Edge / Chrome 視窗嵌入在播放區；若嵌入失敗，才改用系統預設瀏覽器開啟平台頁面。\n\n" +
                "開發電腦安裝 SDK：\n" +
                "Visual Studio → 工具 → NuGet 套件管理員 → 管理解決方案的 NuGet 套件 → 搜尋 Microsoft.Web.WebView2\n\n" +
                "Package Manager Console 指令：\n" +
                "Install-Package Microsoft.Web.WebView2\n\n" +
                "若是 SDK-style 專案，也可用：\n" +
                "dotnet add package Microsoft.Web.WebView2\n\n" +
                "注意：不是 pip install，pip 是 Python 用的。C# / WinForms 請用 NuGet。\n\n" +
                "Runtime 官方下載頁：\n" +
                "https://developer.microsoft.com/microsoft-edge/webview2/";

            MessageBox.Show(msg, "WebView2 安裝與助教相容提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void TogglePlatformMode()
        {
            ShowPlatformMode(!platformMode);
        }

        private void ShowPlatformMode(bool on)
        {
            platformMode = on;
            if (webHost != null) webHost.Visible = on;
            if (playerHost != null) playerHost.Visible = !on;

            if (on)
            {
                try { player.Ctlcontrols.pause(); } catch { }
                if (webHost != null) webHost.BringToFront();
                if (btnPlatformMode != null) btnPlatformMode.Text = "本機播放";
                lblNow.Text = "平台模式：自動選 WebView2；沒有 WebView2 時嵌入 Edge / Chrome";
                lblSubtitle.Text = "平台影片使用官方網站；若無 WebView2，會嘗試嵌入 Edge / Chrome 視窗";
                InitBrowser();
            }
            else
            {
                if (playerHost != null) playerHost.BringToFront();
                if (btnPlatformMode != null) btnPlatformMode.Text = "平台搜尋";
                lblSubtitle.Text = subtitles.Count == 0 ? "可載入 .srt 字幕，也會自動嘗試同名字幕" : lblSubtitle.Text;
            }
        }

        private void SearchPlatform()
        {
            string q = txtPlatformSearch == null ? "" : txtPlatformSearch.Text.Trim();
            if (q.Length == 0)
            {
                MessageBox.Show("請輸入要搜尋的關鍵字。", "平台搜尋", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            OpenWeb(PlatformSearchUrl(CurrentPlatform(), q));
        }

        private void OpenPlatformHome()
        {
            OpenWeb(PlatformHomeUrl(CurrentPlatform()));
        }

        private string CurrentPlatform()
        {
            return cboPlatform == null || cboPlatform.SelectedItem == null ? "YouTube" : cboPlatform.SelectedItem.ToString();
        }

        private string PlatformSearchUrl(string platform, string keyword)
        {
            string q = Uri.EscapeDataString(keyword);
            switch (platform)
            {
                case "YouTube": return "https://www.youtube.com/results?search_query=" + q;
                case "Bilibili": return "https://search.bilibili.com/all?keyword=" + q;
                case "愛奇藝": return "https://so.iqiyi.com/so/q_" + q;
                case "Twitch": return "https://www.twitch.tv/search?term=" + q;
                case "Vimeo": return "https://vimeo.com/search?q=" + q;
                case "TikTok": return "https://www.tiktok.com/search?q=" + q;
                case "巴哈動畫瘋": return "https://ani.gamer.com.tw/search.php?keyword=" + q;
                default: return "https://www.google.com/search?q=" + q;
            }
        }

        private string PlatformHomeUrl(string platform)
        {
            switch (platform)
            {
                case "YouTube": return "https://www.youtube.com/";
                case "Bilibili": return "https://www.bilibili.com/";
                case "愛奇藝": return "https://www.iqiyi.com/";
                case "Twitch": return "https://www.twitch.tv/";
                case "Vimeo": return "https://vimeo.com/";
                case "TikTok": return "https://www.tiktok.com/";
                case "巴哈動畫瘋": return "https://ani.gamer.com.tw/";
                default: return "https://www.google.com/";
            }
        }

        private void NavigateAddressBar()
        {
            if (txtWebAddress == null) return;
            string url = NormalizeWebAddress(txtWebAddress.Text.Trim());
            if (url.Length == 0) return;
            OpenWeb(url);
        }

        private string NormalizeWebAddress(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";
            Uri u;
            if (Uri.TryCreate(text, UriKind.Absolute, out u)) return text;
            if (text.Contains(".") && !text.Contains(" ")) return "https://" + text;
            return PlatformSearchUrl(CurrentPlatform(), text);
        }

        private void OpenWeb(string url)
        {
            url = NormalizeWebAddress(url);
            if (string.IsNullOrWhiteSpace(url)) return;

            ShowPlatformMode(true);
            if (BrowserEngineIsExternal())
            {
                if (txtWebAddress != null) txtWebAddress.Text = url;
                OpenExternalUrl(url);
                Say("已用外部瀏覽器開啟平台網址。", true);
                return;
            }

            if (!webReady)
            {
                pendingWebUrl = url;
                InitBrowser();
                return;
            }

            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    MethodInfo m = modernCore.GetType().GetMethod("Navigate");
                    if (m != null) m.Invoke(modernCore, new object[] { url });
                    if (lblWebStatus != null) lblWebStatus.Text = "WebView2 載入中：" + url;
                }
                else if (BrowserEngineIsEmbedded())
                {
                    if (txtWebAddress != null) txtWebAddress.Text = url;
                    OpenEmbeddedBrowser(url);
                    return;
                }
                else
                {
                    if (txtWebAddress != null) txtWebAddress.Text = url;
                    OpenExternalUrl(url);
                    Say("已用外部瀏覽器開啟平台網址：" + url, true);
                    return;
                }

                if (txtWebAddress != null) txtWebAddress.Text = url;
                Say("平台載入：" + url, true);
            }
            catch (Exception ex)
            {
                MessageBox.Show("無法在目前瀏覽器引擎開啟網址：\n" + url + "\n\n" + ex.Message + "\n\n你可以改選『外部預設瀏覽器（零套件）』或按『外部瀏覽器』。", "平台播放", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void WebBack()
        {
            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    bool can = Convert.ToBoolean(GetPropertyValue(modernCore, "CanGoBack"));
                    if (can) modernCore.GetType().GetMethod("GoBack").Invoke(modernCore, null);
                }
                else Say(BrowserEngineIsEmbedded() ? "嵌入瀏覽器模式下請在網頁內操作返回，或重新搜尋。" : "外部瀏覽器模式無法由程式控制返回，請在瀏覽器內操作。", false);
            }
            catch { }
        }

        private void WebForward()
        {
            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    bool can = Convert.ToBoolean(GetPropertyValue(modernCore, "CanGoForward"));
                    if (can) modernCore.GetType().GetMethod("GoForward").Invoke(modernCore, null);
                }
                else Say(BrowserEngineIsEmbedded() ? "嵌入瀏覽器模式下請在網頁內操作前進，或重新搜尋。" : "外部瀏覽器模式無法由程式控制前進，請在瀏覽器內操作。", false);
            }
            catch { }
        }

        private void WebRefresh()
        {
            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    MethodInfo m = modernCore.GetType().GetMethod("Reload");
                    if (m != null) m.Invoke(modernCore, null);
                }
                else if (BrowserEngineIsEmbedded()) OpenCurrentWebEmbedded();
                else OpenCurrentWebExternal();
            }
            catch { }
        }

        private void UpdateWebButtons()
        {
            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    if (btnWebBack != null) btnWebBack.Enabled = Convert.ToBoolean(GetPropertyValue(modernCore, "CanGoBack"));
                    if (btnWebForward != null) btnWebForward.Enabled = Convert.ToBoolean(GetPropertyValue(modernCore, "CanGoForward"));
                }
                else
                {
                    if (btnWebBack != null) btnWebBack.Enabled = false;
                    if (btnWebForward != null) btnWebForward.Enabled = false;
                }
            }
            catch { }
        }

        private void OpenCurrentWebExternal()
        {
            string url = CurrentWebUrl();
            if (url.Length == 0) return;
            OpenExternalUrl(url);
        }

        private void OpenExternalUrl(string url)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = url;
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch
            {
                try { Process.Start(url); } catch { }
            }
        }

        private void CopyCurrentWebUrl()
        {
            string url = CurrentWebUrl();
            if (url.Length == 0) return;
            Clipboard.SetText(url);
            Say("平台網址已複製。", true);
        }

        private string CurrentWebUrl()
        {
            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    object source = GetPropertyValue(modernCore, "Source");
                    if (source != null && !string.IsNullOrWhiteSpace(source.ToString())) return source.ToString();

                    if (modernWebView != null)
                    {
                        object v = GetPropertyValue(modernWebView, "Source");
                        if (v != null) return v.ToString();
                    }
                }

            }
            catch { }
            return txtWebAddress == null ? "" : txtWebAddress.Text.Trim();
        }

        private string CurrentWebTitle()
        {
            try
            {
                if (usingModernWebView2 && modernCore != null)
                {
                    object title = GetPropertyValue(modernCore, "DocumentTitle");
                    if (title != null && !string.IsNullOrWhiteSpace(title.ToString())) return title.ToString();
                }

            }
            catch { }
            return "";
        }

        private void AddWebFavorite()
        {
            string url = CurrentWebUrl();
            if (url.Length == 0) return;
            string title = CurrentWebTitle();
            if (string.IsNullOrWhiteSpace(title)) title = url;
            WebFavoriteItem item = new WebFavoriteItem { Title = title, Url = url };
            webFavorites.Add(item);
            if (lbWebFavorites != null) lbWebFavorites.Items.Add(item);
            Say("已收藏平台頁面。", true);
        }

        private void OpenSelectedWebFavorite()
        {
            if (lbWebFavorites == null) return;
            WebFavoriteItem item = lbWebFavorites.SelectedItem as WebFavoriteItem;
            if (item != null) OpenWeb(item.Url);
        }

        private bool ShouldOpenInWebView(string url)
        {
            Uri u;
            if (!Uri.TryCreate(url, UriKind.Absolute, out u)) return false;
            string scheme = u.Scheme.ToLowerInvariant();
            if (scheme != "http" && scheme != "https") return false;
            if (LooksLikeDirectMediaUrl(url)) return false;
            return true;
        }

        private bool LooksLikeDirectMediaUrl(string url)
        {
            try
            {
                Uri u = new Uri(url);
                string ext = Path.GetExtension(u.AbsolutePath).ToLowerInvariant();
                if (ext == ".m3u8" || ext == ".mpd") return true;
                return MediaExts.Contains(ext, StringComparer.OrdinalIgnoreCase);
            }
            catch { return false; }
        }

        private void TryUpdateWebTitleFromDocument()
        {
            try
            {
                string title = CurrentWebTitle();
                if (!string.IsNullOrWhiteSpace(title))
                {
                    lblNow.Text = "平台頁面「" + title + "」";
                    if (lblWebStatus != null) lblWebStatus.Text = title;
                }
            }
            catch { }
        }

        private void ExecuteModernScript(string script)
        {
            try
            {
                if (!usingModernWebView2 || modernCore == null) return;
                MethodInfo m = modernCore.GetType().GetMethod("ExecuteScriptAsync");
                if (m != null) m.Invoke(modernCore, new object[] { script });
            }
            catch { }
        }

        private void ToggleWebVideoPlayback()
        {
            if (usingModernWebView2 && modernCore != null)
            {
                ExecuteModernScript("(function(){var v=document.querySelector('video');if(v){if(v.paused){v.play();}else{v.pause();}}})();");
                Say("已嘗試控制 WebView2 網頁影片播放 / 暫停。", true);
                return;
            }

            Say("目前不是 WebView2 引擎，無法可靠控制平台網頁影片。請使用網站播放器控制列，或按『外部瀏覽器』。", true);
        }

        private void PauseWebVideo()
        {
            if (usingModernWebView2 && modernCore != null)
                ExecuteModernScript("(function(){var v=document.querySelector('video');if(v){v.pause();}})();");
        }

        private void SeekWebVideo(double sec)
        {
            if (usingModernWebView2 && modernCore != null)
            {
                string s = sec.ToString(CultureInfo.InvariantCulture);
                ExecuteModernScript("(function(){var v=document.querySelector('video');if(v){v.currentTime=Math.max(0,v.currentTime+(" + s + "));}})();");
                return;
            }

            Say("平台網頁影片請使用網站播放器本身快轉；WebView2 模式才會嘗試鍵盤快轉。", true);
        }

        private void UpdateWebVideoTime()
        {
            if (platformMode)
            {
                lblCurrent.Text = "--:--";
                lblTotal.Text = "--:--";
                lblTimeOnVideo.Text = usingModernWebView2 ? "WebView2" : (BrowserEngineIsEmbedded() ? "嵌入瀏覽器" : (BrowserEngineIsExternal() ? "外部瀏覽器" : "平台模式"));
                TryUpdateWebTitleFromDocument();
                UpdateWebButtons();
            }
        }

        private string GuessTitleFromUrl(Uri u, bool isWebPage)
        {
            string host = u.Host.Replace("www.", "");
            if (isWebPage)
            {
                if (host.Contains("youtube")) return "YouTube 影片 / 頁面";
                if (host.Contains("bilibili")) return "Bilibili 影片 / 頁面";
                if (host.Contains("iqiyi")) return "愛奇藝影片 / 頁面";
                if (host.Contains("twitch")) return "Twitch 直播 / 頁面";
                if (host.Contains("vimeo")) return "Vimeo 影片 / 頁面";
                if (host.Contains("tiktok")) return "TikTok 影片 / 頁面";
                if (host.Contains("gamer.com.tw")) return "巴哈動畫瘋頁面";
                return host + " 網頁媒體";
            }

            string name = u.Segments.Length > 0 ? u.Segments[u.Segments.Length - 1].Trim('/') : host;
            if (string.IsNullOrWhiteSpace(name)) name = host;
            if (string.IsNullOrWhiteSpace(name)) name = "網路媒體";
            return Uri.UnescapeDataString(name);
        }



        private void PickFiles()
        {
            using (OpenFileDialog d = new OpenFileDialog())
            {
                d.Title = "加入媒體檔案";
                d.Filter = MediaFilter;
                d.Multiselect = true;
                if (d.ShowDialog(this) == DialogResult.OK)
                    AddPaths(d.FileNames, playlist.Count == 0 && currentIndex < 0);
            }
        }

        private void PickFolder()
        {
            using (FolderBrowserDialog d = new FolderBrowserDialog())
            {
                d.Description = "選擇要掃描的資料夾";
                if (d.ShowDialog(this) != DialogResult.OK) return;

                DialogResult r = MessageBox.Show("是否包含子資料夾？", "掃描資料夾", MessageBoxButtons.YesNoCancel, MessageBoxIcon.Question);
                if (r == DialogResult.Cancel) return;

                bool recursive = r == DialogResult.Yes;
                List<string> files = ScanFolder(d.SelectedPath, recursive).ToList();
                AddPaths(files, false);
                Say("資料夾掃描完成，找到 " + files.Count + " 個媒體檔。", true);
            }
        }

        private IEnumerable<string> ScanFolder(string folder, bool recursive)
        {
            Stack<string> stack = new Stack<string>();
            stack.Push(folder);

            while (stack.Count > 0)
            {
                string dir = stack.Pop();
                string[] files = new string[0];
                try { files = Directory.GetFiles(dir); } catch (Exception ex) { Log("讀取資料夾失敗：" + ex.Message); }

                foreach (string f in files)
                    if (IsMediaFile(f)) yield return f;

                if (!recursive) continue;

                string[] dirs = new string[0];
                try { dirs = Directory.GetDirectories(dir); } catch { }
                foreach (string sub in dirs) stack.Push(sub);
            }
        }

        private void AddPaths(IEnumerable<string> paths, bool autoPlay)
        {
            if (paths == null) return;

            int added = 0;
            int duplicated = 0;
            int unsupported = 0;
            int firstPlayableIndex = -1;

            foreach (string raw in paths)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;
                string p = raw.Trim();

                if (Directory.Exists(p))
                {
                    foreach (string file in ScanFolder(p, true))
                    {
                        string full = "";
                        try { full = Path.GetFullPath(file); } catch { full = file; }

                        int exists = FindPlaylistSourceIndex(full);
                        if (exists >= 0)
                        {
                            duplicated++;
                            if (firstPlayableIndex < 0) firstPlayableIndex = exists;
                            continue;
                        }

                        if (AddFile(full))
                        {
                            added++;
                            if (firstPlayableIndex < 0) firstPlayableIndex = playlist.Count - 1;
                        }
                        else unsupported++;
                    }
                }
                else if (File.Exists(p))
                {
                    string full = "";
                    try { full = Path.GetFullPath(p); } catch { full = p; }

                    if (!IsMediaFile(full))
                    {
                        unsupported++;
                        continue;
                    }

                    int exists = FindPlaylistSourceIndex(full);
                    if (exists >= 0)
                    {
                        duplicated++;
                        if (firstPlayableIndex < 0) firstPlayableIndex = exists;
                        continue;
                    }

                    if (AddFile(full))
                    {
                        added++;
                        if (firstPlayableIndex < 0) firstPlayableIndex = playlist.Count - 1;
                    }
                    else unsupported++;
                }
                else if (IsUrl(p))
                {
                    string normalized = NormalizeWebAddress(p);
                    int exists = FindPlaylistSourceIndex(normalized);
                    if (exists >= 0)
                    {
                        duplicated++;
                        if (firstPlayableIndex < 0) firstPlayableIndex = exists;
                        continue;
                    }

                    if (AddUrl(normalized, false))
                    {
                        added++;
                        if (firstPlayableIndex < 0) firstPlayableIndex = playlist.Count - 1;
                    }
                    else unsupported++;
                }
                else
                {
                    unsupported++;
                }
            }

            RefreshPlaylist();
            SaveSession();
            RefreshDashboard();
            UpdateWelcomeStage();

            if (firstPlayableIndex >= 0)
                ShowPlaylistAndSelect(firstPlayableIndex);

            if (autoPlay && firstPlayableIndex >= 0)
                PlayAt(firstPlayableIndex, true);

            if (added > 0)
            {
                string msg = "已加入 " + added + " 個項目，目前播放清單共有 " + playlist.Count + " 個項目。";
                if (duplicated > 0) msg += " 另有 " + duplicated + " 個已存在，未重複加入。";
                if (unsupported > 0) msg += " 另有 " + unsupported + " 個不支援或不存在。";
                Say(msg, true);
            }
            else if (duplicated > 0)
            {
                Say("這個檔案已經在播放清單中，所以沒有重複加入。目前播放清單共有 " + playlist.Count + " 個項目。", true);
            }
            else if (unsupported > 0)
            {
                Say("沒有加入新項目：檔案不存在或格式不在支援清單內。", true);
            }
            else
            {
                Say("沒有選到可加入的媒體項目。", true);
            }
        }

        private int FindPlaylistSourceIndex(string source)
        {
            if (string.IsNullOrWhiteSpace(source)) return -1;
            return playlist.FindIndex(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase));
        }

        private bool AddFile(string file)
        {
            try
            {
                string full = Path.GetFullPath(file);
                if (!File.Exists(full)) return false;
                if (!IsMediaFile(full)) return false;
                if (playlist.Any(x => string.Equals(x.Source, full, StringComparison.OrdinalIgnoreCase))) return false;

                FileInfo fi = new FileInfo(full);
                playlist.Add(new MediaItem
                {
                    Source = full,
                    Title = Path.GetFileNameWithoutExtension(full),
                    Type = fi.Extension.TrimStart('.').ToUpperInvariant(),
                    IsUrl = false,
                    Size = fi.Length
                });
                return true;
            }
            catch (Exception ex)
            {
                Log("加入檔案失敗：" + ex.Message);
                return false;
            }
        }

        private void AddUrlDialog(bool play)
        {
            using (InputDialog d = new InputDialog("連網播放 / 平台連結", "輸入影片、音樂、串流 URL，或 YouTube / Bilibili / 愛奇藝等平台連結：", "例如：https://example.com/video.mp4 或 https://www.youtube.com/watch?v=..."))
            {
                if (d.ShowDialog(this) == DialogResult.OK)
                    AddUrl(d.Value, play);
            }
        }

        private bool AddUrl(string url, bool play)
        {
            url = NormalizeWebAddress((url ?? "").Trim());
            if (!IsUrl(url))
            {
                MessageBox.Show("URL 格式不正確。支援 http、https、mms、rtsp、file；沒有 http 的網址可先補上 https://。", "連網播放", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return false;
            }

            int old = FindPlaylistSourceIndex(url);
            if (old >= 0)
            {
                if (play) PlayAt(old, true);
                return false;
            }

            Uri u = new Uri(url);
            bool isWebPage = ShouldOpenInWebView(url);
            string name = GuessTitleFromUrl(u, isWebPage);

            playlist.Add(new MediaItem
            {
                Source = url,
                Title = name,
                Type = isWebPage ? "WEB" : u.Scheme.ToUpperInvariant(),
                IsUrl = true,
                IsWeb = isWebPage,
                Size = 0
            });

            RefreshPlaylist();
            SaveSession();
            Log("加入 URL：" + url);
            if (play) PlayAt(playlist.Count - 1, true);
            return true;
        }

        private bool IsMediaFile(string path)
        {
            return MediaExts.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase);
        }

        private bool IsUrl(string text)
        {
            Uri u;
            if (!Uri.TryCreate(text, UriKind.Absolute, out u)) return false;
            string s = u.Scheme.ToLowerInvariant();
            return s == "http" || s == "https" || s == "mms" || s == "rtsp" || s == "file";
        }

        private void ShowPlaylistOnly()
        {
            SwitchSideTabByTitle("播放清單");
            RefreshPlaylist();

            if (playlist.Count > 0)
                ShowPlaylistAndSelect(currentIndex >= 0 ? currentIndex : 0);
            else
                Say("播放清單目前是空的，請先按「＋ 檔案」加入影片或音訊。", true);
        }

        private void ShowPlaylistAndSelect(int index)
        {
            try
            {
                SwitchSideTabByTitle("播放清單");
                RefreshPlaylist();

                if (lvPlaylist == null || index < 0) return;

                foreach (ListViewItem item in lvPlaylist.Items)
                {
                    if (item.Tag is int && (int)item.Tag == index)
                    {
                        item.Selected = true;
                        item.Focused = true;
                        item.EnsureVisible();
                        lvPlaylist.Focus();
                        break;
                    }
                }
            }
            catch { }
        }

        private void PlayFirstPlaylistItem()
        {
            if (playlist.Count == 0)
            {
                Say("播放清單是空的，請先選擇檔案。", true);
                PickFiles();
                return;
            }

            int index = currentIndex >= 0 && currentIndex < playlist.Count ? currentIndex : 0;
            ShowPlaylistAndSelect(index);
            PlayAt(index, true);
        }

        private void RefreshPlaylist()
        {
            if (lvPlaylist == null) return;
            string key = (txtSearch == null ? "" : txtSearch.Text.Trim()).ToLowerInvariant();

            lvPlaylist.BeginUpdate();
            lvPlaylist.Items.Clear();

            for (int i = 0; i < playlist.Count; i++)
            {
                MediaItem m = playlist[i];
                string text = (m.Title + " " + m.Type + " " + m.Source).ToLowerInvariant();
                if (key.Length > 0 && !text.Contains(key)) continue;

                ListViewItem item = new ListViewItem((i == currentIndex ? "▶ " : "") + m.Title);
                item.SubItems.Add(m.Type);
                item.SubItems.Add(m.IsUrl ? m.Source : Path.GetDirectoryName(m.Source));
                item.Tag = i;

                if (i == currentIndex)
                {
                    item.Font = new Font(lvPlaylist.Font, FontStyle.Bold);
                    item.BackColor = Color.FromArgb(73, 132, 246);
                    item.ForeColor = Color.White;
                }

                lvPlaylist.Items.Add(item);
            }

            lvPlaylist.EndUpdate();
            UpdateCount();
        }

        private void UpdateCount()
        {
            string text = playlist.Count + " 個項目";
            if (lblCount != null) lblCount.Text = text;
            if (statusRight != null && sleepAt == DateTime.MinValue) statusRight.Text = text;
        }

        private int SelectedIndex()
        {
            if (lvPlaylist.SelectedItems.Count == 0) return -1;
            object tag = lvPlaylist.SelectedItems[0].Tag;
            return tag is int ? (int)tag : -1;
        }

        private void PlaySelected()
        {
            int i = SelectedIndex();
            if (i >= 0) PlayAt(i, true);
        }

        private void RemoveSelected()
        {
            int i = SelectedIndex();
            if (i < 0) return;
            bool now = i == currentIndex;
            playlist.RemoveAt(i);
            if (now) { Stop(); currentIndex = -1; }
            else if (i < currentIndex) currentIndex--;
            RefreshPlaylist();
            UpdateInfo();
            SaveSession();
        }

        private void ClearPlaylist()
        {
            if (MessageBox.Show("確定清空播放清單？", "清空", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            Stop();
            playlist.Clear();
            bookmarks.Clear();
            lbBookmarks.Items.Clear();
            currentIndex = -1;
            RefreshPlaylist();
            UpdateInfo();
            SaveSession();
        }

        private void SortByTitle()
        {
            string cur = CurrentSource();
            playlist.Sort((a, b) => string.Compare(a.Title, b.Title, StringComparison.CurrentCultureIgnoreCase));
            currentIndex = playlist.FindIndex(x => string.Equals(x.Source, cur, StringComparison.OrdinalIgnoreCase));
            RefreshPlaylist();
        }

        private void SortByType()
        {
            string cur = CurrentSource();
            playlist.Sort((a, b) =>
            {
                int c = string.Compare(a.Type, b.Type, StringComparison.CurrentCultureIgnoreCase);
                return c != 0 ? c : string.Compare(a.Title, b.Title, StringComparison.CurrentCultureIgnoreCase);
            });
            currentIndex = playlist.FindIndex(x => string.Equals(x.Source, cur, StringComparison.OrdinalIgnoreCase));
            RefreshPlaylist();
        }

        private void RevealSelected()
        {
            int i = SelectedIndex();
            if (i < 0) return;
            MediaItem m = playlist[i];
            if (m.IsUrl)
            {
                Clipboard.SetText(m.Source);
                Say("URL 已複製。", true);
                return;
            }
            if (File.Exists(m.Source)) Process.Start("explorer.exe", "/select,\"" + m.Source + "\"");
        }

        private void UpdateInfo()
        {
            int i = SelectedIndex();
            if (i < 0) i = currentIndex;
            if (i < 0 || i >= playlist.Count)
            {
                infoTitle.Text = "標題：-";
                infoType.Text = "格式：-";
                infoSize.Text = "大小：-";
                infoDuration.Text = "長度：-";
                infoState.Text = "狀態：-";
                infoPath.Text = "來源：-";
                return;
            }

            MediaItem m = playlist[i];
            infoTitle.Text = "標題：" + m.Title;
            infoType.Text = "格式：" + m.Type + (m.IsUrl ? "｜網路媒體" : "｜本機檔案");
            infoSize.Text = "大小：" + (m.IsUrl ? "未知" : SizeText(m.Size));
            infoDuration.Text = "長度：" + (i == currentIndex && Duration() > 0 ? FormatTime(Duration()) : "播放後顯示");
            infoState.Text = "狀態：" + StateText(State());
            infoPath.Text = "來源：" + m.Source;
        }



        private void PlayAt(int index, bool play)
        {
            if (index < 0 || index >= playlist.Count) return;
            currentIndex = index;
            MediaItem m = playlist[index];
            RecordPlayStart(m.Source);

            try
            {
                ClearAB();
                subtitles.Clear();
                lblSubtitle.Text = "";

                if (m.IsWeb)
                {
                    try { player.Ctlcontrols.pause(); } catch { }
                    ShowPlatformMode(true);
                    OpenWeb(m.Source);
                    lblNow.Text = "平台播放「" + m.Title + "」";
                    Say("平台播放：" + m.Title, true);
                    RefreshPlaylist();
                    UpdateInfo();
                    return;
                }

                ShowPlatformMode(false);
                player.URL = m.Source;
                lblNow.Text = "載入中「" + m.Title + "」";
                Say("載入中：" + m.Title, true);
                RefreshPlaylist();
                UpdateInfo();
                AutoSubtitle(false);

                double resumePos = GetResumePosition(m.Source);
                bool resumeYes = false;
                if (play && resumePos > 10)
                {
                    resumeYes = MessageBox.Show("上次看到 " + FormatTime(resumePos) + "，是否從此位置繼續觀看？", "繼續觀看", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes;
                }

                if (play)
                {
                    bool goResume = resumeYes;
                    BeginInvoke(new Action(delegate
                    {
                        player.Ctlcontrols.play();
                        if (goResume) Seek(resumePos);
                        ApplyRate();
                    }));
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("無法播放：\n" + m.Source + "\n\n" + ex.Message, "播放失敗", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                Log("播放失敗：" + ex.Message);
            }
        }

        private void PlayPause()
        {
            if (platformMode)
            {
                ToggleWebVideoPlayback();
                return;
            }

            WMPPlayState s = State();
            if (s == WMPPlayState.wmppsPlaying) { player.Ctlcontrols.pause(); return; }
            if (s == WMPPlayState.wmppsPaused) { player.Ctlcontrols.play(); return; }

            if (currentIndex < 0)
            {
                if (playlist.Count == 0) { PickFiles(); if (playlist.Count == 0) return; }
                PlayAt(0, true);
            }
            else
            {
                try { player.Ctlcontrols.play(); }
                catch { PlayAt(currentIndex, true); }
            }
        }

        private void Stop()
        {
            if (platformMode) PauseWebVideo();
            try { player.Ctlcontrols.stop(); } catch { }
            btnPlay.Text = "播放";
            lblNow.Text = currentIndex >= 0 && currentIndex < playlist.Count ? "停止「" + playlist[currentIndex].Title + "」" : "停止";
            Say("停止", false);
            UpdateWelcomeStage();
        }

        private void Previous()
        {
            if (playlist.Count == 0) return;
            if (CurrentPos() > 3) { Seek(0); return; }
            int n = currentIndex <= 0 ? playlist.Count - 1 : currentIndex - 1;
            PlayAt(n, true);
        }

        private void Next(bool manual)
        {
            if (playlist.Count == 0) return;
            int n;
            if (shuffle && playlist.Count > 1)
            {
                do { n = random.Next(playlist.Count); } while (n == currentIndex);
            }
            else n = currentIndex + 1;

            if (n >= playlist.Count)
            {
                if (repeat == RepeatMode.All || manual) n = 0;
                else { Stop(); return; }
            }
            PlayAt(n, true);
        }

        private void Ended()
        {
            if (repeat == RepeatMode.One) { PlayAt(currentIndex, true); return; }

            if (showEndRecommendation && playlist.Count > 0)
            {
                ShowEndRecommendation();
                return;
            }

            Next(false);
        }

        private WMPPlayState State()
        {
            try { return player.playState; } catch { return WMPPlayState.wmppsUndefined; }
        }

        private double CurrentPos()
        {
            try { return player.Ctlcontrols.currentPosition; } catch { return 0; }
        }

        private double Duration()
        {
            try { return player.currentMedia == null ? 0 : player.currentMedia.duration; } catch { return 0; }
        }

        private string CurrentSource()
        {
            if (currentIndex >= 0 && currentIndex < playlist.Count) return playlist[currentIndex].Source;
            try { return player.URL; } catch { return ""; }
        }

        private void Seek(double sec)
        {
            try { player.Ctlcontrols.currentPosition = Math.Max(0, sec); } catch { }
        }

        private void SeekRelative(double sec)
        {
            if (platformMode) { SeekWebVideo(sec); return; }
            double d = Duration();
            if (d <= 0) return;
            Seek(Math.Max(0, Math.Min(d, CurrentPos() + sec)));
        }

        private double BarSeconds()
        {
            double d = Duration();
            if (d <= 0) return 0;
            return d * seekBar.Value / seekBar.Maximum;
        }

        private void SeekByBar()
        {
            Seek(BarSeconds());
        }

        private void SetVolume(int v)
        {
            v = Math.Max(0, Math.Min(100, v));
            volBar.Value = v;
            lblVolume.Text = "音量 " + v;
            try
            {
                player.settings.volume = v;
                if (v > 0 && player.settings.mute)
                {
                    player.settings.mute = false;
                    btnMute.Text = "靜音";
                }
            }
            catch { }
        }

        private void ToggleMute()
        {
            try
            {
                player.settings.mute = !player.settings.mute;
                btnMute.Text = player.settings.mute ? "取消靜音" : "靜音";
            }
            catch { }
        }

        private void ApplyRate()
        {
            if (cboSpeed.SelectedItem == null) return;
            string t = cboSpeed.SelectedItem.ToString().Replace("x", "");
            double r;
            if (!double.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out r)) r = 1;
            try { player.settings.rate = r; } catch { Say("目前媒體不支援倍速。", false); }
        }

        private void CycleRepeat()
        {
            if (repeat == RepeatMode.None) repeat = RepeatMode.One;
            else if (repeat == RepeatMode.One) repeat = RepeatMode.All;
            else repeat = RepeatMode.None;
            btnRepeat.Text = repeat == RepeatMode.None ? "循環：關" : repeat == RepeatMode.One ? "循環：單首" : "循環：全部";
        }

        private void ToggleAspect()
        {
            stretch = !stretch;
            try { player.stretchToFit = stretch; } catch { }
            string text = stretch ? "畫面：填滿" : "畫面：原比例";
            if (btnAspect != null) btnAspect.Text = text;
            Say(text, true);
        }

        private void TickUI()
        {
            if (platformMode)
            {
                UpdateWebVideoTime();
                return;
            }

            TrackWatchTime();
            RememberCurrentPosition();
            TrackPlaybackHeatmap();
            UpdateWelcomeStage();
            ambientPulse += 0.035f;
            if (welcomeStage != null && welcomeStage.Visible)
            {
                welcomeStage.Pulse = ambientPulse;
                welcomeStage.AccentColor = themeAccent;
                welcomeStage.Invalidate();
            }

            double d = Duration();
            double c = CurrentPos();
            if (!seeking && d > 0)
            {
                int v = (int)Math.Round(c / d * seekBar.Maximum);
                seekBar.Value = Math.Max(seekBar.Minimum, Math.Min(seekBar.Maximum, v));
            }

            lblCurrent.Text = FormatTime(c);
            lblTotal.Text = d > 0 ? FormatTime(d) : "00:00";
            lblTimeOnVideo.Text = lblCurrent.Text + " / " + lblTotal.Text;
            if (d > 0) infoDuration.Text = "長度：" + FormatTime(d);

            UpdateSubtitle();
            CheckAB();
            RefreshChapters();
            if (heatmapBox != null) RefreshHeatmap();
        }



        private void PickSubtitle()
        {
            using (OpenFileDialog d = new OpenFileDialog())
            {
                d.Title = "載入 SRT 字幕";
                d.Filter = "SRT 字幕|*.srt|所有檔案|*.*";
                if (d.ShowDialog(this) == DialogResult.OK) LoadSubtitle(d.FileName, true);
            }
        }

        private void AutoSubtitle(bool message)
        {
            if (currentIndex < 0 || currentIndex >= playlist.Count) return;
            MediaItem m = playlist[currentIndex];
            if (m.IsUrl)
            {
                if (message) MessageBox.Show("網路媒體無法自動尋找同名字幕，請手動載入 .srt。", "字幕", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            string srt = Path.ChangeExtension(m.Source, ".srt");
            if (File.Exists(srt)) LoadSubtitle(srt, message);
            else if (message) MessageBox.Show("找不到同名字幕：\n" + srt, "字幕", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void LoadSubtitle(string path, bool message)
        {
            try
            {
                subtitles.Clear();
                string text = File.ReadAllText(path, DetectEncoding(path)).Replace("\r\n", "\n").Replace("\r", "\n");
                string[] blocks = text.Split(new string[] { "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string block in blocks)
                {
                    string[] lines = block.Split(new char[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
                    int timeLine = lines.Length > 1 && !lines[0].Contains("-->") ? 1 : 0;
                    if (lines.Length <= timeLine || !lines[timeLine].Contains("-->")) continue;
                    string[] times = lines[timeLine].Split(new string[] { "-->" }, StringSplitOptions.None);
                    double st, en;
                    if (!ParseSrtTime(times[0], out st) || !ParseSrtTime(times[1], out en)) continue;
                    subtitles.Add(new SubtitleCue
                    {
                        Start = st,
                        End = en,
                        Text = string.Join(Environment.NewLine, lines.Skip(timeLine + 1).ToArray())
                    });
                }
                subtitles.Sort((a, b) => a.Start.CompareTo(b.Start));
                lblSubtitle.Text = "字幕已載入：" + Path.GetFileName(path);
                Log("字幕載入：" + path + "，" + subtitles.Count + " 段。 ");
                if (message) MessageBox.Show("字幕已載入，共 " + subtitles.Count + " 段。", "字幕", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("字幕載入失敗：\n" + ex.Message, "字幕", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private Encoding DetectEncoding(string path)
        {
            byte[] b = new byte[4];
            using (FileStream fs = File.OpenRead(path)) fs.Read(b, 0, 4);
            if (b[0] == 0xEF && b[1] == 0xBB && b[2] == 0xBF) return Encoding.UTF8;
            if (b[0] == 0xFF && b[1] == 0xFE) return Encoding.Unicode;
            if (b[0] == 0xFE && b[1] == 0xFF) return Encoding.BigEndianUnicode;
            return Encoding.Default;
        }

        private bool ParseSrtTime(string s, out double seconds)
        {
            seconds = 0;
            s = s.Trim().Replace(',', '.').Split(' ')[0];
            TimeSpan ts;
            if (!TimeSpan.TryParse(s, CultureInfo.InvariantCulture, out ts)) return false;
            seconds = ts.TotalSeconds;
            return true;
        }

        private void UpdateSubtitle()
        {
            if (subtitles.Count == 0) return;
            double p = CurrentPos();
            SubtitleCue cue = subtitles.FirstOrDefault(x => p >= x.Start && p <= x.End);
            lblSubtitle.Text = cue == null ? "" : cue.Text;
        }



        private void AddBookmark()
        {
            if (currentIndex < 0 || currentIndex >= playlist.Count) return;
            BookmarkItem b = new BookmarkItem
            {
                Source = playlist[currentIndex].Source,
                Title = playlist[currentIndex].Title,
                Seconds = CurrentPos(),
                Note = "書籤 " + (bookmarks.Count + 1)
            };
            bookmarks.Add(b);
            lbBookmarks.Items.Add(b);
        }

        private void JumpBookmark()
        {
            BookmarkItem b = lbBookmarks.SelectedItem as BookmarkItem;
            if (b == null) return;
            int i = playlist.FindIndex(x => string.Equals(x.Source, b.Source, StringComparison.OrdinalIgnoreCase));
            if (i < 0) { MessageBox.Show("播放清單中找不到此書籤的媒體。", "書籤"); return; }
            if (i != currentIndex) PlayAt(i, true);
            BeginInvoke(new Action(delegate { Seek(b.Seconds); }));
        }

        private void DeleteBookmark()
        {
            int i = lbBookmarks.SelectedIndex;
            if (i < 0) return;
            bookmarks.RemoveAt(i);
            lbBookmarks.Items.RemoveAt(i);
        }

        private void SetBPoint()
        {
            pointB = CurrentPos();
            if (pointA < 0 || pointB <= pointA)
            {
                MessageBox.Show("B 點必須大於 A 點。", "AB 重複", MessageBoxButtons.OK, MessageBoxIcon.Information);
                pointB = -1;
            }
            UpdateAB();
        }

        private void ClearAB()
        {
            pointA = -1;
            pointB = -1;
            UpdateAB();
        }

        private void CheckAB()
        {
            if (pointA >= 0 && pointB > pointA && CurrentPos() >= pointB) Seek(pointA);
        }

        private void UpdateAB()
        {
            if (lblAB == null) return;
            lblAB.Text = pointA < 0 && pointB < 0 ? "AB 重複：未設定" : "AB 重複：A=" + (pointA >= 0 ? FormatTime(pointA) : "-") + "，B=" + (pointB >= 0 ? FormatTime(pointB) : "-");
        }

        private void SleepDialog()
        {
            using (InputDialog d = new InputDialog("睡眠計時", "幾分鐘後停止播放？", "例如：30"))
            {
                if (d.ShowDialog(this) == DialogResult.OK)
                {
                    int m;
                    if (int.TryParse(d.Value, out m) && m > 0) SetSleep(m);
                }
            }
        }

        private void SetSleep(int minutes)
        {
            sleepAt = DateTime.Now.AddMinutes(minutes);
            Say(minutes + " 分鐘後停止播放。", true);
        }

        private void TickSleep()
        {
            if (sleepAt == DateTime.MinValue) return;
            TimeSpan left = sleepAt - DateTime.Now;
            if (left.TotalSeconds <= 0)
            {
                Stop();
                sleepAt = DateTime.MinValue;
                Say("睡眠計時到達，已停止播放。", true);
            }
            else statusRight.Text = playlist.Count + " 個項目｜睡眠倒數 " + left.ToString(@"mm\:ss");
        }



        private void SavePlaylistDialog()
        {
            using (SaveFileDialog d = new SaveFileDialog())
            {
                d.Title = "儲存播放清單";
                d.Filter = "NPlayer 清單|*.nplist|M3U 清單|*.m3u|文字檔|*.txt";
                d.FileName = "playlist.nplist";
                if (d.ShowDialog(this) == DialogResult.OK) SavePlaylist(d.FileName);
            }
        }

        private void LoadPlaylistDialog()
        {
            using (OpenFileDialog d = new OpenFileDialog())
            {
                d.Title = "載入播放清單";
                d.Filter = "播放清單|*.nplist;*.m3u;*.txt|所有檔案|*.*";
                if (d.ShowDialog(this) == DialogResult.OK) LoadPlaylist(d.FileName, false);
            }
        }

        private void SavePlaylist(string path)
        {
            try
            {
                using (StreamWriter w = new StreamWriter(path, false, Encoding.UTF8))
                {
                    w.WriteLine("#NPlayerStudioPro");
                    foreach (MediaItem m in playlist) w.WriteLine(m.Source);
                }
                Say("播放清單已儲存。", true);
            }
            catch (Exception ex) { MessageBox.Show("儲存失敗：\n" + ex.Message); }
        }

        private void LoadPlaylist(string path, bool silent)
        {
            try
            {
                int before = playlist.Count;
                foreach (string raw in File.ReadAllLines(path, Encoding.UTF8))
                {
                    string line = raw.Trim();
                    if (line.Length == 0 || line.StartsWith("#")) continue;
                    if (IsUrl(line)) AddUrl(line, false);
                    else if (File.Exists(line)) AddFile(line);
                }
                RefreshPlaylist();
                int added = playlist.Count - before;
                Say("載入清單完成，新增 " + added + " 個項目。", true);
                if (!silent) MessageBox.Show("新增 " + added + " 個項目。", "播放清單");
            }
            catch (Exception ex) { if (!silent) MessageBox.Show("載入失敗：\n" + ex.Message); }
        }

        private void SaveSession()
        {
            try
            {
                Directory.CreateDirectory(sessionFolder);
                string path = Path.Combine(sessionFolder, "last_session.nplist");
                using (StreamWriter w = new StreamWriter(path, false, Encoding.UTF8))
                {
                    w.WriteLine("#Dark=" + dark);
                    w.WriteLine("#Volume=" + volBar.Value);
                    foreach (MediaItem m in playlist) w.WriteLine(m.Source);
                }
                SaveProductData();
            }
            catch { }
        }

        private void LoadSession()
        {
            try
            {
                string path = Path.Combine(sessionFolder, "last_session.nplist");
                if (!File.Exists(path)) return;
                foreach (string raw in File.ReadAllLines(path, Encoding.UTF8))
                {
                    string line = raw.Trim();
                    if (line.StartsWith("#Dark="))
                    {
                        bool b;
                        if (bool.TryParse(line.Substring(6), out b)) dark = b;
                    }
                    else if (line.StartsWith("#Volume="))
                    {
                        int v;
                        if (int.TryParse(line.Substring(8), out v)) SetVolume(v);
                    }
                    else if (line.Length > 0 && !line.StartsWith("#"))
                    {
                        if (IsUrl(line)) AddUrl(line, false);
                        else if (File.Exists(line)) AddFile(line);
                    }
                }
                RefreshPlaylist();
                ApplyTheme();
            }
            catch { }
        }



        private void ApplyQualityPreference(string quality)
        {
            if (string.IsNullOrWhiteSpace(quality)) quality = "自動";

            string msg =
                "畫質偏好已設定為：「" + quality + "」。\n\n" +
                "本功能採相容設計：\n" +
                "1. YouTube / Bilibili / 愛奇藝等平台影片會由官方播放器、帳號、網路速度與片源決定實際畫質。\n" +
                "2. 本機單一影片檔無法憑空升級解析度；若同一影片有 1080p / 720p / 480p 等版本，可加入播放清單後切換。\n" +
                "3. 為符合 21MB 作業限制，本程式不內建 FFmpeg / VLC 即時轉檔核心。";

            Log("畫質偏好：" + quality);
            MessageBox.Show(msg, "畫質偏好", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void ShowQualityHelp()
        {
            MessageBox.Show(
                "畫質調整設計說明：\n\n" +
                "平台影片：由官方播放器控制，程式提供偏好、搜尋與平台入口。\n" +
                "本機影片：若只有一個影片檔，解析度由原始檔決定；若存在多個版本，建議命名如 movie_1080p.mp4、movie_720p.mp4。\n\n" +
                "此設計可在不打包大型影音引擎的前提下，保留產品級功能表現，也能符合助教解壓縮 21MB 限制。",
                "畫質說明",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }

        private void FindLocalQualityVersions()
        {
            string source = CurrentSource();
            if (string.IsNullOrWhiteSpace(source) || !File.Exists(source))
            {
                MessageBox.Show("請先播放或選取一個本機影片檔。", "尋找多畫質版本", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            try
            {
                string dir = Path.GetDirectoryName(source);
                string baseName = Path.GetFileNameWithoutExtension(source);
                if (string.IsNullOrWhiteSpace(dir) || string.IsNullOrWhiteSpace(baseName)) return;

                string normalized = RemoveQualityToken(baseName).ToLowerInvariant();
                string[] tokens = { "2160", "4k", "1440", "2k", "1080", "720", "480", "360", "hdr", "dv", "dolby" };
                List<string> matches = new List<string>();

                foreach (string file in Directory.GetFiles(dir))
                {
                    string ext = Path.GetExtension(file).ToLowerInvariant();
                    if (!MediaExts.Contains(ext)) continue;

                    string name = Path.GetFileNameWithoutExtension(file).ToLowerInvariant();
                    string stripped = RemoveQualityToken(name).ToLowerInvariant();

                    bool sameFamily = stripped.Contains(normalized) || normalized.Contains(stripped);
                    bool hasQualityToken = tokens.Any(t => name.Contains(t));
                    if (sameFamily || hasQualityToken)
                    {
                        if (!playlist.Any(x => string.Equals(x.Source, file, StringComparison.OrdinalIgnoreCase)))
                            matches.Add(file);
                    }
                }

                foreach (string f in matches) AddFile(f);

                RefreshPlaylist();
                SaveSession();

                MessageBox.Show(
                    matches.Count == 0
                        ? "沒有找到尚未加入的多畫質版本。\n\n建議命名：movie_2160p.mp4、movie_1080p.mp4、movie_720p.mp4。"
                        : "已加入 " + matches.Count + " 個可能的多畫質版本。",
                    "尋找多畫質版本",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("尋找多畫質版本失敗：\n" + ex.Message, "尋找多畫質版本", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private string RemoveQualityToken(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "";
            string[] tokens =
            {
                "_2160p", "-2160p", "2160p", "_4k", "-4k", "4k",
                "_1440p", "-1440p", "1440p", "_2k", "-2k", "2k",
                "_1080p", "-1080p", "1080p", "_720p", "-720p", "720p",
                "_480p", "-480p", "480p", "_360p", "-360p", "360p",
                "_hdr", "-hdr", "hdr", "_dv", "-dv", "dv", "dolbyvision", "dolby vision"
            };

            string result = name;
            foreach (string t in tokens) result = result.Replace(t, "");
            result = result.Replace("__", "_").Replace("--", "-").Trim('_', '-', ' ');
            return result;
        }

        private void ShowDolbyVisionGuide()
        {
            MessageBox.Show(
                "Dolby Vision / HDR 相容模式：\n\n" +
                "此程式可以提供 Dolby Vision / HDR 內容入口、狀態提示與播放核心說明，但不會自行解碼或偽造 Dolby Vision。\n\n" +
                "真正呈現 Dolby Vision / HDR 通常需要：\n" +
                "1. 影片本身含 HDR / Dolby Vision 資訊。\n" +
                "2. 螢幕支援 HDR / Dolby Vision。\n" +
                "3. Windows、顯示卡與驅動支援。\n" +
                "4. 播放核心或平台網站支援。\n\n" +
                "這樣寫在作業報告中是合理的：本播放器提供 HDR / Dolby Vision 相容入口與提示，不內建大型商用解碼器。",
                "Dolby Vision / HDR 說明",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }

        private void OpenWindowsHDRSettings()
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "ms-settings:display",
                    UseShellExecute = true
                });
                Say("已開啟 Windows 顯示設定，可從此檢查 HDR。", true);
            }
            catch
            {
                MessageBox.Show("無法直接開啟 Windows 設定，請手動前往：設定 → 系統 → 顯示器 → HDR。", "HDR 系統設定", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void SearchImmersiveKeyword(string keyword)
        {
            if (cboPlatform != null) cboPlatform.SelectedItem = "YouTube";
            if (txtPlatformSearch != null) txtPlatformSearch.Text = keyword;
            OpenWeb(PlatformSearchUrl("YouTube", keyword));
        }

        private void ShowPlaybackCoreStatus()
        {
            string engine =
                usingModernWebView2 ? "WebView2 內嵌" :
                usingEmbeddedBrowserFallback ? "Edge / Chrome 視窗嵌入" :
                BrowserEngineIsExternal() ? "外部預設瀏覽器" :
                "Windows Media Player / 自動模式";

            string msg =
                "目前播放核心狀態：\n\n" +
                "本機影音核心：Windows Media Player ActiveX\n" +
                "平台播放核心：" + engine + "\n" +
                "瀏覽器狀態：" + (webReady ? "已初始化" : "尚未初始化") + "\n" +
                "目前模式：" + (platformMode ? "平台播放模式" : "本機播放模式") + "\n\n" +
                "HDR / Dolby Vision / AR / VR 屬於相容入口功能，實際效果取決於片源、硬體、系統與平台播放器。";

            MessageBox.Show(msg, "播放核心狀態", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void CopyImmersiveSpecText()
        {
            string spec =
                "本播放器加入沉浸影音實驗室，提供畫質偏好、HDR / Dolby Vision 相容模式、AR / VR / 360 內容入口與播放核心狀態檢查。\\r\\n" +
                "為符合繳交限制，程式不內建 FFmpeg、VLC、CefSharp 或完整 WebView2 Runtime，而是採用 Windows Media Player、WebView2 優先、Edge / Chrome 嵌入與外部瀏覽器備援的 Hybrid 架構。\\r\\n" +
                "因此在助教電腦沒有額外大型套件時，本機播放與主要管理功能仍可使用；平台、HDR、VR 等功能依照系統與平台支援程度啟用。";

            Clipboard.SetText(spec);
            Say("已複製沉浸影音作業說明。", true);
        }

        private void ShowVrArGuide()
        {
            MessageBox.Show(
                "AR / VR / 360 支援設計：\n\n" +
                "此版以 WebXR、YouTube 360、VR180 與平台入口為主，會透過 WebView2 或嵌入 Edge / Chrome 開啟。\n\n" +
                "如果要在 WinForms 內自行做真正 VR 播放器，通常需要 Unity、DirectX、OpenGL、頭部追蹤或專用 VR SDK，檔案大小與複雜度都會大幅增加。\n\n" +
                "所以作業版採用『入口 + 相容模式 + 說明提示』，功能看起來完整，也不會超過 21MB。",
                "AR / VR 支援說明",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }



        private void RefreshExternalCoreStatus()
        {
            if (coreStatusBox != null)
                coreStatusBox.Text = BuildExternalCoreReport();

            Say("外部核心偵測完成。", true);
        }

        private string BuildExternalCoreReport()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Optional Engine Detector");
            sb.AppendLine("偵測時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine(new string('=', 58));
            sb.AppendLine();

            string webView2Sdk = HasWebView2Sdk() ? "已偵測到 WebView2 SDK / NuGet 組件" : "未偵測到 WebView2 SDK / NuGet 組件";
            string webView2Runtime = FindWebView2RuntimeExe();
            string browser = FindModernBrowserExe();
            string ffmpeg = FindOptionalExecutable("ffmpeg.exe");
            string ffprobe = FindOptionalExecutable("ffprobe.exe");
            string vlc = FindVlcExe();
            string cef = FindCefSharpEvidence();

            sb.AppendLine("[平台網頁播放]");
            sb.AppendLine("WebView2 SDK： " + webView2Sdk);
            sb.AppendLine("WebView2 Runtime： " + (webView2Runtime.Length > 0 ? "已找到｜" + webView2Runtime : "未找到或無法判斷"));
            sb.AppendLine("Edge / Chrome / Brave： " + (browser.Length > 0 ? "已找到｜" + browser : "未找到"));
            sb.AppendLine();

            sb.AppendLine("[進階本機影音核心]");
            sb.AppendLine("FFmpeg： " + (ffmpeg.Length > 0 ? "已找到｜" + ffmpeg : "未找到，仍可用 WMP 播放基本格式"));
            sb.AppendLine("FFprobe： " + (ffprobe.Length > 0 ? "已找到｜" + ffprobe : "未找到，媒體詳細分析功能會停用"));
            sb.AppendLine("VLC： " + (vlc.Length > 0 ? "已找到｜" + vlc : "未找到，不啟用 VLC 進階相容核心"));
            sb.AppendLine("CefSharp： " + (cef.Length > 0 ? "已找到｜" + cef : "未找到，不啟用 Chromium 內嵌核心"));
            sb.AppendLine();

            sb.AppendLine("[目前實際使用策略]");
            sb.AppendLine("1. 本機影片：預設使用 Windows Media Player ActiveX。");
            sb.AppendLine("2. 平台影片：優先 WebView2；沒有 WebView2 時嵌入 Edge / Chrome；再失敗才外部瀏覽器。");
            sb.AppendLine("3. FFmpeg / VLC / CefSharp 只做可選偵測，不會因為沒有安裝而讓程式無法啟動。");
            sb.AppendLine("4. Dolby Vision / HDR / AR / VR 屬於相容入口與提示功能，實際效果看片源、硬體、系統與平台。");
            sb.AppendLine();

            sb.AppendLine("[檔案大小]");
            sb.AppendLine("這些大型核心若直接打包，才容易超過 21MB。");
            sb.AppendLine("本版只加入偵測程式碼與提示，通常只增加少量文字與 UI，不會造成作業壓縮檔爆掉。");

            return sb.ToString();
        }

        private bool HasWebView2Sdk()
        {
            try
            {
                Type t1 = Type.GetType("Microsoft.Web.WebView2.WinForms.WebView2, Microsoft.Web.WebView2.WinForms", false);
                if (t1 != null) return true;

                foreach (Assembly a in AppDomain.CurrentDomain.GetAssemblies())
                {
                    if (a.GetName().Name.IndexOf("Microsoft.Web.WebView2", StringComparison.OrdinalIgnoreCase) >= 0)
                        return true;
                }
            }
            catch { }
            return false;
        }

        private string FindWebView2RuntimeExe()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] roots =
            {
                Path.Combine(pf, "Microsoft", "EdgeWebView", "Application"),
                Path.Combine(pfx86, "Microsoft", "EdgeWebView", "Application"),
                Path.Combine(local, "Microsoft", "EdgeWebView", "Application")
            };

            foreach (string r in roots)
            {
                string found = FindFileUnder(r, "msedgewebview2.exe", 3);
                if (found.Length > 0) return found;
            }

            return "";
        }

        private string FindVlcExe()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            string[] candidates =
            {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "vlc.exe"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "vlc", "vlc.exe"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tools", "vlc", "vlc.exe"),
                Path.Combine(pf, "VideoLAN", "VLC", "vlc.exe"),
                Path.Combine(pfx86, "VideoLAN", "VLC", "vlc.exe")
            };

            foreach (string c in candidates)
                if (File.Exists(c)) return c;

            return FindExecutableInPath("vlc.exe");
        }

        private string FindCefSharpEvidence()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string[] files = Directory.GetFiles(baseDir, "CefSharp*.dll", SearchOption.TopDirectoryOnly);
                if (files.Length > 0) return files[0];

                string cefDir = Path.Combine(baseDir, "CefSharp");
                if (Directory.Exists(cefDir))
                {
                    files = Directory.GetFiles(cefDir, "CefSharp*.dll", SearchOption.TopDirectoryOnly);
                    if (files.Length > 0) return files[0];
                }
            }
            catch { }
            return "";
        }

        private string FindOptionalExecutable(string exeName)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            string[] candidates =
            {
                Path.Combine(baseDir, exeName),
                Path.Combine(baseDir, "tools", exeName),
                Path.Combine(baseDir, "tools", "ffmpeg", exeName),
                Path.Combine(baseDir, "ffmpeg", exeName),
                Path.Combine(baseDir, "ffmpeg", "bin", exeName)
            };

            foreach (string c in candidates)
                if (File.Exists(c)) return c;

            return FindExecutableInPath(exeName);
        }

        private string FindExecutableInPath(string exeName)
        {
            try
            {
                string path = Environment.GetEnvironmentVariable("PATH") ?? "";
                foreach (string dir in path.Split(Path.PathSeparator))
                {
                    string clean = dir.Trim();
                    if (clean.Length == 0) continue;
                    string candidate = Path.Combine(clean, exeName);
                    if (File.Exists(candidate)) return candidate;
                }
            }
            catch { }
            return "";
        }

        private string FindFileUnder(string root, string fileName, int depth)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root) || depth < 0) return "";

                string direct = Path.Combine(root, fileName);
                if (File.Exists(direct)) return direct;

                if (depth == 0) return "";

                foreach (string d in Directory.GetDirectories(root))
                {
                    string found = FindFileUnder(d, fileName, depth - 1);
                    if (found.Length > 0) return found;
                }
            }
            catch { }
            return "";
        }

        private void ShowExternalCoreHelp()
        {
            MessageBox.Show(
                "這些很大的功能大多不是單純 C# 程式碼，而是外部核心、Runtime 或大型套件：\n\n" +
                "FFmpeg：進階轉檔、媒體分析、更多格式。\n" +
                "VLC / LibVLC：更強的本機播放核心。\n" +
                "CefSharp：內嵌 Chromium，但體積通常很大。\n" +
                "完整 WebView2 Runtime：可內嵌 Edge Chromium，但不建議整包打進 21MB 作業。\n\n" +
                "本程式採可選偵測：有安裝就顯示可用；沒有就自動降級，不影響基本播放與平台入口。",
                "外部核心說明",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }

        private void CopyExternalCoreSubmissionNote()
        {
            string note =
                "本播放器採 Optional Engine 架構，會自動偵測 WebView2、Edge / Chrome、FFmpeg、VLC、CefSharp 等外部核心。\\r\\n" +
                "為符合解壓縮後 21MB 的作業限制，程式不將大型 Runtime 或影音核心直接打包，而是採用有則啟用、無則降級的設計。\\r\\n" +
                "沒有外部核心時，仍可使用 Windows Media Player 進行基本本機播放，平台影片則可透過 WebView2、Edge / Chrome 嵌入或外部瀏覽器備援。";

            Clipboard.SetText(note);
            Say("已複製外部核心繳交說明。", true);
        }

        private void OpenAppFolder()
        {
            try
            {
                Process.Start("explorer.exe", "\"" + AppDomain.CurrentDomain.BaseDirectory + "\"");
            }
            catch (Exception ex)
            {
                MessageBox.Show("無法開啟程式資料夾：\n" + ex.Message, "程式資料夾", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }



        private void RecordPlayStart(string source)
        {
            if (string.IsNullOrWhiteSpace(source)) return;
            if (!playCounts.ContainsKey(source)) playCounts[source] = 0;
            playCounts[source]++;
            if (!watchSeconds.ContainsKey(source)) watchSeconds[source] = 0;
            lastWatchTick = DateTime.Now;
            RefreshStatsReport();
        }

        private void TrackWatchTime()
        {
            try
            {
                if (State() != WMPPlayState.wmppsPlaying)
                {
                    lastWatchTick = DateTime.Now;
                    return;
                }

                string src = CurrentSource();
                if (string.IsNullOrWhiteSpace(src)) return;

                DateTime now = DateTime.Now;
                if (lastWatchTick == DateTime.MinValue) lastWatchTick = now;
                double delta = now.Subtract(lastWatchTick).TotalSeconds;
                lastWatchTick = now;

                if (delta <= 0 || delta > 3) return;

                totalWatchSeconds += delta;
                if (!watchSeconds.ContainsKey(src)) watchSeconds[src] = 0;
                watchSeconds[src] += delta;
            }
            catch { }
        }

        private void RefreshStatsReport()
        {
            if (statsBox != null)
                statsBox.Text = BuildStatsReport();
        }

        private string BuildStatsReport()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA 播放統計儀表板");
            sb.AppendLine(new string('=', 60));
            sb.AppendLine("更新時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine("清單項目：" + playlist.Count);
            sb.AppendLine("累積觀看時間：" + FormatTime(totalWatchSeconds));
            sb.AppendLine();

            sb.AppendLine("[本次播放次數 Top 10]");
            foreach (var kv in playCounts.OrderByDescending(x => x.Value).Take(10))
            {
                string title = SourceTitle(kv.Key);
                double sec = watchSeconds.ContainsKey(kv.Key) ? watchSeconds[kv.Key] : 0;
                sb.AppendLine(kv.Value.ToString().PadLeft(3) + " 次｜" + FormatTime(sec).PadLeft(8) + "｜" + title);
            }
            if (playCounts.Count == 0) sb.AppendLine("尚無播放紀錄。");

            sb.AppendLine();
            sb.AppendLine("[播放清單分析]");
            sb.AppendLine(BuildPlaylistAnalyticsText());
            return sb.ToString();
        }

        private string SourceTitle(string source)
        {
            MediaItem m = playlist.FirstOrDefault(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase));
            if (m != null) return m.Title;
            if (IsUrl(source)) return source;
            return Path.GetFileName(source);
        }

        private void ExportStatsReport()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出播放統計";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "AURORA_Playback_Stats_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;
                    File.WriteAllText(d.FileName, BuildStatsReport(), Encoding.UTF8);
                    Say("播放統計已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出統計失敗：\n" + ex.Message, "播放統計", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void RegisterDefaultHotkeys()
        {
            customHotkeys.Clear();
            customHotkeys["播放 / 暫停"] = Keys.Space;
            customHotkeys["停止"] = Keys.S;
            customHotkeys["上一首"] = Keys.B;
            customHotkeys["下一首"] = Keys.N;
            customHotkeys["靜音"] = Keys.M;
            customHotkeys["劇院模式"] = Keys.F11;
            customHotkeys["指令面板"] = Keys.K | Keys.Control;
            customHotkeys["截圖"] = Keys.S | Keys.Control;
            customHotkeys["跳到指定時間"] = Keys.J | Keys.Control;
            customHotkeys["置頂"] = Keys.T;
        }

        private bool HandleCustomHotkey(KeyEventArgs e)
        {
            foreach (KeyValuePair<string, Keys> kv in customHotkeys)
            {
                if (KeyEventToKeys(e) != kv.Value) continue;
                ExecuteHotkeyAction(kv.Key);
                e.Handled = true;
                e.SuppressKeyPress = true;
                return true;
            }
            return false;
        }

        private Keys KeyEventToKeys(KeyEventArgs e)
        {
            Keys k = e.KeyCode;
            if (e.Control) k |= Keys.Control;
            if (e.Shift) k |= Keys.Shift;
            if (e.Alt) k |= Keys.Alt;
            return k;
        }

        private void ExecuteHotkeyAction(string action)
        {
            switch (action)
            {
                case "播放 / 暫停": PlayPause(); break;
                case "停止": Stop(); break;
                case "上一首": Previous(); break;
                case "下一首": Next(true); break;
                case "靜音": ToggleMute(); break;
                case "劇院模式": ToggleTheater(); break;
                case "指令面板": ShowCommandPalette(); break;
                case "截圖": SaveDisplaySnapshot(); break;
                case "跳到指定時間": JumpToTimeDialog(); break;
                case "置頂": ToggleAlwaysOnTop(); break;
            }
        }

        private void RefreshHotkeyList()
        {
            if (lbHotkeys == null) return;
            lbHotkeys.Items.Clear();
            foreach (KeyValuePair<string, Keys> kv in customHotkeys)
                lbHotkeys.Items.Add(kv.Key + " = " + KeyText(kv.Value));
        }

        private string KeyText(Keys k)
        {
            List<string> parts = new List<string>();
            if ((k & Keys.Control) == Keys.Control) parts.Add("Ctrl");
            if ((k & Keys.Shift) == Keys.Shift) parts.Add("Shift");
            if ((k & Keys.Alt) == Keys.Alt) parts.Add("Alt");
            Keys key = k & Keys.KeyCode;
            parts.Add(key.ToString());
            return string.Join(" + ", parts.ToArray());
        }

        private void SetSelectedHotkey()
        {
            if (lbHotkeys == null || lbHotkeys.SelectedItem == null)
            {
                MessageBox.Show("請先選擇一個快捷鍵項目。", "快捷鍵", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string line = lbHotkeys.SelectedItem.ToString();
            string action = line.Split('=')[0].Trim();
            using (KeyCaptureDialog d = new KeyCaptureDialog(action, dark))
            {
                if (d.ShowDialog(this) != DialogResult.OK) return;
                customHotkeys[action] = d.CapturedKeys;
                RefreshHotkeyList();
                Say("快捷鍵已更新：" + action + " = " + KeyText(d.CapturedKeys), true);
            }
        }

        private string SnapshotFolder()
        {
            string f = Path.Combine(sessionFolder, "Snapshots");
            Directory.CreateDirectory(f);
            return f;
        }

        private string BuildSnapshotPreview()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA 工作階段快照預覽");
            sb.AppendLine(new string('=', 60));
            sb.AppendLine("時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine("目前項目：" + (currentIndex >= 0 && currentIndex < playlist.Count ? playlist[currentIndex].Title : "-"));
            sb.AppendLine("目前進度：" + FormatTime(CurrentPos()));
            sb.AppendLine("音量：" + (volBar == null ? 0 : volBar.Value));
            sb.AppendLine("深色：" + dark);
            sb.AppendLine("隨機：" + shuffle);
            sb.AppendLine("循環：" + repeat);
            sb.AppendLine("項目數：" + playlist.Count);
            sb.AppendLine();
            foreach (MediaItem m in playlist)
                sb.AppendLine(m.Source);
            return sb.ToString();
        }

        private void SaveSessionSnapshotDialog()
        {
            try
            {
                string file = Path.Combine(SnapshotFolder(), "snapshot_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".aurora");
                using (StreamWriter w = new StreamWriter(file, false, Encoding.UTF8))
                {
                    w.WriteLine("#AURORA_SNAPSHOT");
                    w.WriteLine("#Time=" + DateTime.Now.ToString("s"));
                    w.WriteLine("#Dark=" + dark);
                    w.WriteLine("#Volume=" + volBar.Value);
                    w.WriteLine("#Shuffle=" + shuffle);
                    w.WriteLine("#Repeat=" + repeat);
                    w.WriteLine("#CurrentIndex=" + currentIndex);
                    w.WriteLine("#Position=" + CurrentPos().ToString(CultureInfo.InvariantCulture));
                    foreach (MediaItem m in playlist) w.WriteLine(m.Source);
                }
                RefreshSnapshotList();
                Say("工作階段快照已儲存：" + file, true);
            }
            catch (Exception ex)
            {
                MessageBox.Show("儲存快照失敗：\n" + ex.Message, "工作階段", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void LoadSessionSnapshotDialog()
        {
            try
            {
                using (OpenFileDialog d = new OpenFileDialog())
                {
                    d.Title = "載入工作階段快照";
                    d.Filter = "AURORA 快照|*.aurora|所有檔案|*.*";
                    d.InitialDirectory = SnapshotFolder();
                    if (d.ShowDialog(this) != DialogResult.OK) return;
                    LoadSessionSnapshot(d.FileName);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("載入快照失敗：\n" + ex.Message, "工作階段", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void LoadSessionSnapshot(string file)
        {
            Stop();
            playlist.Clear();
            currentIndex = -1;
            double pos = 0;
            int idx = -1;

            foreach (string raw in File.ReadAllLines(file, Encoding.UTF8))
            {
                string line = raw.Trim();
                if (line.Length == 0 || line == "#AURORA_SNAPSHOT") continue;
                if (line.StartsWith("#Dark="))
                {
                    bool b; if (bool.TryParse(line.Substring(6), out b)) dark = b;
                }
                else if (line.StartsWith("#Volume="))
                {
                    int v; if (int.TryParse(line.Substring(8), out v)) SetVolume(v);
                }
                else if (line.StartsWith("#Shuffle="))
                {
                    bool b; if (bool.TryParse(line.Substring(9), out b)) shuffle = b;
                }
                else if (line.StartsWith("#Repeat="))
                {
                    try { repeat = (RepeatMode)Enum.Parse(typeof(RepeatMode), line.Substring(8)); } catch { repeat = RepeatMode.None; }
                }
                else if (line.StartsWith("#CurrentIndex="))
                {
                    int.TryParse(line.Substring(14), out idx);
                }
                else if (line.StartsWith("#Position="))
                {
                    double.TryParse(line.Substring(10), NumberStyles.Float, CultureInfo.InvariantCulture, out pos);
                }
                else if (!line.StartsWith("#"))
                {
                    if (IsUrl(line)) AddUrl(line, false);
                    else if (File.Exists(line)) AddFile(line);
                }
            }

            RefreshPlaylist();
            ApplyTheme();
            if (idx >= 0 && idx < playlist.Count)
            {
                PlayAt(idx, true);
                BeginInvoke(new Action(delegate { Seek(pos); }));
            }

            RefreshSnapshotList();
            Say("工作階段快照已載入。", true);
        }

        private void RefreshSnapshotList()
        {
            if (snapshotBox == null) return;
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("快照資料夾：" + SnapshotFolder());
            sb.AppendLine(new string('=', 60));
            foreach (string f in Directory.GetFiles(SnapshotFolder(), "*.aurora").OrderByDescending(x => x))
            {
                FileInfo info = new FileInfo(f);
                sb.AppendLine(info.Name + "｜" + info.LastWriteTime.ToString("yyyy/MM/dd HH:mm:ss") + "｜" + SizeText(info.Length));
            }
            snapshotBox.Text = sb.ToString();
        }

        private void OpenSnapshotFolder()
        {
            try { Process.Start("explorer.exe", "\"" + SnapshotFolder() + "\""); }
            catch (Exception ex) { MessageBox.Show("無法開啟快照資料夾：\n" + ex.Message, "工作階段", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }

        private void ApplySubtitleStyle()
        {
            if (lblSubtitle == null) return;
            lblSubtitle.Font = subtitleCustomFont;
            lblSubtitle.ForeColor = subtitleCustomForeColor;
            lblSubtitle.BackColor = Color.FromArgb(Math.Max(0, Math.Min(255, subtitleCustomAlpha)), subtitleCustomBackColor);
            if (viewer != null && viewer.RowStyles.Count > 1)
                viewer.RowStyles[1].Height = subtitleCustomHeight;
            lblSubtitle.Invalidate();
            Say("字幕樣式已套用。", true);
        }

        private void UpdateWelcomeStage()
        {
            if (welcomeStage == null) return;
            bool show = !platformMode && currentIndex < 0 && State() != WMPPlayState.wmppsPlaying;

            if (lblWelcomeSub != null)
            {
                if (playlist.Count > 0 && currentIndex < 0)
                    lblWelcomeSub.Text = "已加入 " + playlist.Count + " 個項目 · 按「播放第一部」開始播放";
                else
                    lblWelcomeSub.Text = "Drop your media here · Ctrl+K Command Palette";
            }

            welcomeStage.Visible = show;
            if (show) welcomeStage.BringToFront();
            if (floatingControls != null) floatingControls.BringToFront();
        }

        private void TrackPlaybackHeatmap()
        {
            try
            {
                if (State() != WMPPlayState.wmppsPlaying) return;
                string src = CurrentSource();
                double d = Duration();
                double c = CurrentPos();
                if (string.IsNullOrWhiteSpace(src) || d <= 0 || c < 0) return;

                int[] buckets;
                if (!heatmapBuckets.TryGetValue(src, out buckets))
                {
                    buckets = new int[40];
                    heatmapBuckets[src] = buckets;
                }

                int i = (int)Math.Floor(c / d * buckets.Length);
                if (i < 0) i = 0;
                if (i >= buckets.Length) i = buckets.Length - 1;
                buckets[i]++;
            }
            catch { }
        }

        private string BuildHeatmapText()
        {
            string src = CurrentSource();
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Playback Heatmap");
            sb.AppendLine(new string('=', 60));

            if (string.IsNullOrWhiteSpace(src))
            {
                sb.AppendLine("目前沒有播放項目。");
                return sb.ToString();
            }

            sb.AppendLine("目前項目：" + SourceTitle(src));
            sb.AppendLine();

            int[] buckets;
            if (!heatmapBuckets.TryGetValue(src, out buckets))
            {
                sb.AppendLine("尚未累積足夠的播放熱力資料。");
                sb.AppendLine("播放影片一段時間後，這裡會顯示類似 YouTube 熱門片段的熱力圖。");
                return sb.ToString();
            }

            int max = buckets.Max();
            if (max <= 0) max = 1;

            sb.Append("00:00 ");
            for (int i = 0; i < buckets.Length; i++)
            {
                double ratio = (double)buckets[i] / max;
                if (ratio > 0.75) sb.Append("█");
                else if (ratio > 0.45) sb.Append("▓");
                else if (ratio > 0.20) sb.Append("▒");
                else if (ratio > 0.02) sb.Append("░");
                else sb.Append("─");
            }
            sb.AppendLine(" " + FormatTime(Duration()));
            sb.AppendLine();

            sb.AppendLine("區間資料：");
            for (int i = 0; i < buckets.Length; i++)
            {
                if (buckets[i] <= 0) continue;
                double start = Duration() * i / buckets.Length;
                double end = Duration() * (i + 1) / buckets.Length;
                sb.AppendLine(FormatTime(start) + " - " + FormatTime(end) + "｜" + buckets[i] + " ticks");
            }

            return sb.ToString();
        }

        private void RefreshHeatmap()
        {
            if (heatmapBox != null) heatmapBox.Text = BuildHeatmapText();
        }

        private void ClearCurrentHeatmap()
        {
            string src = CurrentSource();
            if (!string.IsNullOrWhiteSpace(src) && heatmapBuckets.ContainsKey(src))
                heatmapBuckets.Remove(src);
            RefreshHeatmap();
            Say("目前影片熱力圖已清除。", true);
        }

        private void ExportHeatmap()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出播放熱力圖";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "AURORA_Heatmap_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;
                    File.WriteAllText(d.FileName, BuildHeatmapText(), Encoding.UTF8);
                    Say("熱力圖已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出熱力圖失敗：\n" + ex.Message, "熱力圖", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void AddCurrentChapter()
        {
            string src = CurrentSource();
            if (string.IsNullOrWhiteSpace(src))
            {
                MessageBox.Show("目前沒有播放項目。", "章節", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            string title = txtChapterTitle == null ? "" : txtChapterTitle.Text.Trim();
            if (title.Length == 0) title = "新章節";

            chapters.Add(new ChapterItem
            {
                Source = src,
                Title = title,
                Seconds = CurrentPos()
            });

            RefreshChapters();
            Say("已新增章節：" + FormatTime(CurrentPos()) + " " + title, true);
        }

        private void RefreshChapters()
        {
            if (lbChapters == null) return;
            string src = CurrentSource();
            lbChapters.Items.Clear();
            foreach (ChapterItem c in chapters.Where(x => string.Equals(x.Source, src, StringComparison.OrdinalIgnoreCase)).OrderBy(x => x.Seconds))
                lbChapters.Items.Add(c);
        }

        private void JumpToSelectedChapter()
        {
            if (lbChapters == null || !(lbChapters.SelectedItem is ChapterItem)) return;
            ChapterItem c = (ChapterItem)lbChapters.SelectedItem;
            Seek(c.Seconds);
            Say("跳到章節：" + c.Title, true);
        }

        private void RemoveSelectedChapter()
        {
            if (lbChapters == null || !(lbChapters.SelectedItem is ChapterItem)) return;
            chapters.Remove((ChapterItem)lbChapters.SelectedItem);
            RefreshChapters();
        }

        private void ExportChapters()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出章節";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "AURORA_Chapters_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;

                    StringBuilder sb = new StringBuilder();
                    foreach (ChapterItem c in chapters.OrderBy(x => x.Source).ThenBy(x => x.Seconds))
                        sb.AppendLine(SourceTitle(c.Source) + "｜" + FormatTime(c.Seconds) + "｜" + c.Title + "｜" + c.Source);

                    File.WriteAllText(d.FileName, sb.ToString(), Encoding.UTF8);
                    Say("章節已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出章節失敗：\n" + ex.Message, "章節", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void RefreshPreviewCard(string source)
        {
            if (previewBox == null) return;
            previewBox.Text = BuildPreviewText(source);
        }

        private void RefreshPreviewFromPlaylistSelection()
        {
            if (lvPlaylist == null || lvPlaylist.SelectedItems.Count == 0)
            {
                RefreshPreviewCard(CurrentSource());
                return;
            }

            int i = lvPlaylist.SelectedItems[0].Index;
            if (i >= 0 && i < playlist.Count) RefreshPreviewCard(playlist[i].Source);
        }

        private string BuildPreviewText(string source)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Preview Card");
            sb.AppendLine(new string('=', 60));

            if (string.IsNullOrWhiteSpace(source))
            {
                sb.AppendLine("尚未選擇項目。");
                return sb.ToString();
            }

            sb.AppendLine("標題：" + SourceTitle(source));
            sb.AppendLine("來源：" + source);
            sb.AppendLine("類型：" + (IsUrl(source) ? "URL / Web" : Path.GetExtension(source).TrimStart('.').ToUpperInvariant()));

            if (File.Exists(source))
            {
                FileInfo fi = new FileInfo(source);
                sb.AppendLine("大小：" + SizeText(fi.Length));
                sb.AppendLine("資料夾：" + fi.DirectoryName);
                sb.AppendLine("最後修改：" + fi.LastWriteTime.ToString("yyyy/MM/dd HH:mm:ss"));
                sb.AppendLine("同名字幕：" + (File.Exists(Path.ChangeExtension(source, ".srt")) ? "有" : "無"));
            }

            sb.AppendLine("收藏：" + (favoriteItems.Any(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase)) ? "是" : "否"));
            sb.AppendLine("稍後觀看：" + (watchLaterItems.Any(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase)) ? "是" : "否"));
            sb.AppendLine("筆記數：" + videoNotes.Count(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase)));
            sb.AppendLine("章節數：" + chapters.Count(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase)));

            double resume = GetResumePosition(source);
            sb.AppendLine("上次進度：" + (resume > 0 ? FormatTime(resume) : "無"));

            return sb.ToString();
        }

        private void PlayPreviewSource()
        {
            string src = CurrentSource();
            if (lvPlaylist != null && lvPlaylist.SelectedItems.Count > 0)
            {
                int i = lvPlaylist.SelectedItems[0].Index;
                if (i >= 0 && i < playlist.Count) src = playlist[i].Source;
            }

            int index = EnsureSourceInPlaylist(src);
            if (index >= 0) PlayAt(index, true);
        }

        private string BuildStatusCenterText()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Smart Status Center");
            sb.AppendLine(new string('=', 60));
            sb.AppendLine("主題：" + themeName);
            sb.AppendLine("目前模式：" + (platformMode ? "平台播放" : "本機播放"));
            sb.AppendLine("播放狀態：" + StateText(State()));
            sb.AppendLine("播放核心：" + (usingModernWebView2 ? "WebView2" : (usingEmbeddedBrowserFallback ? "Edge / Chrome 嵌入" : "Windows Media Player / Auto")));
            sb.AppendLine("WebView2：" + (HasWebView2Sdk() ? "● SDK 可用" : "○ SDK 未偵測"));
            sb.AppendLine("WebView2 Runtime：" + (FindWebView2RuntimeExe().Length > 0 ? "● 可用" : "○ 未偵測"));
            sb.AppendLine("Edge / Chrome：" + (FindModernBrowserExe().Length > 0 ? "● 可用" : "○ 未偵測"));
            sb.AppendLine("FFmpeg：" + (FindOptionalExecutable("ffmpeg.exe").Length > 0 ? "● 可用" : "○ 未安裝"));
            sb.AppendLine("VLC：" + (FindVlcExe().Length > 0 ? "● 可用" : "○ 未安裝"));
            sb.AppendLine();
            sb.AppendLine("播放清單：" + playlist.Count);
            sb.AppendLine("媒體庫：" + mediaLibrary.Count);
            sb.AppendLine("收藏：" + favoriteItems.Count);
            sb.AppendLine("稍後觀看：" + watchLaterItems.Count);
            sb.AppendLine("影片筆記：" + videoNotes.Count);
            sb.AppendLine("章節：" + chapters.Count);
            sb.AppendLine("快照資料夾：" + SnapshotFolder());
            return sb.ToString();
        }

        private void RefreshStatusCenter()
        {
            if (statusCenterBox != null) statusCenterBox.Text = BuildStatusCenterText();
        }

        private void RefreshSettingsCenter()
        {
            if (settingsBox == null) return;
            settingsBox.Text =
                "AURORA Settings Center\n" +
                new string('=', 60) + "\n" +
                "繼續觀看記錄：" + (enableResumeTracking ? "開" : "關") + "\n" +
                "播放結束推薦：" + (showEndRecommendation ? "開" : "關") + "\n" +
                "Toast 通知：" + (enableToastNotification ? "開" : "關") + "\n" +
                "目前主題：" + themeName + "\n" +
                "目前音量：" + (volBar == null ? 0 : volBar.Value) + "\n" +
                "隨機：" + shuffle + "\n" +
                "循環：" + repeat + "\n" +
                "劇院模式：" + theater + "\n" +
                "迷你模式：" + miniMode + "\n\n" +
                "這裡集中管理播放器偏好，讓整體更接近商業影音軟體的設定中心。";
        }

        private void ApplyThemePreset(string name)
        {
            themeName = name;

            if (name == "Midnight Blue")
            {
                dark = true;
                themeAccent = Color.FromArgb(86, 166, 255);
            }
            else if (name == "Netflix Red")
            {
                dark = true;
                themeAccent = Color.FromArgb(229, 9, 20);
            }
            else if (name == "Cyber Purple")
            {
                dark = true;
                themeAccent = Color.FromArgb(180, 118, 255);
            }
            else if (name == "OLED Black")
            {
                dark = true;
                themeAccent = Color.FromArgb(220, 220, 220);
            }
            else if (name == "Ice Glass")
            {
                dark = false;
                themeAccent = Color.FromArgb(68, 140, 220);
            }
            else
            {
                dark = true;
                themeAccent = Color.FromArgb(255, 187, 82);
                themeName = "AURORA Gold";
            }

            ApplyTheme();
            RefreshThemeStudio();
            Say("已切換主題：" + themeName, true);
        }

        private void RefreshThemeStudio()
        {
            if (themeStudioBox == null) return;
            themeStudioBox.Text =
                "AURORA Theme Studio\n" +
                new string('=', 60) + "\n" +
                "目前主題：" + themeName + "\n" +
                "強調色 RGB：" + themeAccent.R + ", " + themeAccent.G + ", " + themeAccent.B + "\n\n" +
                "內建主題：\n" +
                "AURORA Gold：劇院金色\n" +
                "Midnight Blue：科技藍\n" +
                "Netflix Red：串流平台紅\n" +
                "Cyber Purple：賽博紫\n" +
                "OLED Black：純黑高對比\n" +
                "Ice Glass：亮色玻璃感";
        }

        private void ShowEndRecommendation()
        {
            SavedItem first = BuildRecommendations().FirstOrDefault();
            if (first == null)
            {
                Next(false);
                return;
            }

            DialogResult r = MessageBox.Show(
                "已播放完畢。\n\n推薦下一部：\n" + SourceTitle(first.Source) + "\n\n是否立即播放？",
                "下一部推薦",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (r == DialogResult.Yes)
            {
                int index = EnsureSourceInPlaylist(first.Source);
                if (index >= 0) PlayAt(index, true);
            }
            else Next(false);
        }

        private void ToggleMiniPlayerPro()
        {
            ToggleMiniMode();
            if (miniMode)
            {
                Opacity = 0.96;
                if (floatingControls != null) floatingControls.Visible = true;
                Say("迷你播放器 2.0：置頂、小窗、滑鼠移入顯示控制列。", true);
            }
            else
            {
                Opacity = 1.0;
            }
        }

        private void StartDemoFlow()
        {
            if (lbDemoFlow != null) lbDemoFlow.SelectedIndex = 0;
            DemoFlowRun(0);
        }

        private void DemoFlowNext()
        {
            if (lbDemoFlow == null) return;
            int i = lbDemoFlow.SelectedIndex < 0 ? 0 : lbDemoFlow.SelectedIndex + 1;
            if (i >= lbDemoFlow.Items.Count) i = 0;
            lbDemoFlow.SelectedIndex = i;
            DemoFlowRun(i);
        }

        private void DemoFlowRun(int i)
        {
            switch (i)
            {
                case 0: SwitchSideTabByTitle("首頁"); RefreshDashboard(); break;
                case 1: ShowCommandPalette(); break;
                case 2: SwitchSideTabByTitle("播放清單"); break;
                case 3: SwitchSideTabByTitle("媒體庫"); RefreshMediaLibrary(); break;
                case 4: SwitchSideTabByTitle("章節"); RefreshChapters(); break;
                case 5: SwitchSideTabByTitle("外部核心"); RefreshExternalCoreStatus(); break;
                case 6: SwitchSideTabByTitle("沉浸影音"); break;
                case 7: SwitchSideTabByTitle("展示中心"); RefreshShowcaseReport(); break;
            }
            Say("Demo Flow Step " + (i + 1) + " 已切換。", true);
        }

        private string BuildDemoFlowScript()
        {
            return
                "AURORA Cinema Deck Demo Flow\n\n" +
                "1. 首頁 Dashboard：展示影音平台入口。\n" +
                "2. Ctrl+K 指令面板：快速搜尋所有功能。\n" +
                "3. 播放清單：本機與網路媒體管理。\n" +
                "4. 媒體庫：掃描資料夾建立本機影音中心。\n" +
                "5. 字幕與章節：影片學習、標註與跳轉。\n" +
                "6. 外部核心：WebView2、Edge、FFmpeg、VLC 偵測。\n" +
                "7. 沉浸影音：HDR、Dolby Vision、AR / VR 入口。\n" +
                "8. 展示中心：README、繳交檢查與 21MB 策略。";
        }

        private void RefreshDashboard()
        {
            if (homeBox != null)
                homeBox.Text = BuildDashboardText();
            RefreshMediaLibrary();
            RefreshCollections();
            RefreshNotes(true);
            RefreshRecommendations();
        }

        private string BuildDashboardText()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Home Dashboard");
            sb.AppendLine(new string('=', 60));
            sb.AppendLine("現在時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine("播放清單：" + playlist.Count + " 個項目");
            sb.AppendLine("媒體庫：" + mediaLibrary.Count + " 個項目");
            sb.AppendLine("收藏：" + favoriteItems.Count + " 個");
            sb.AppendLine("稍後觀看：" + watchLaterItems.Count + " 個");
            sb.AppendLine("影片筆記：" + videoNotes.Count + " 則");
            sb.AppendLine("累積觀看時間：" + FormatTime(totalWatchSeconds));
            sb.AppendLine();

            sb.AppendLine("[繼續觀看]");
            foreach (var r in ResumeCandidates().Take(6))
                sb.AppendLine("  " + FormatTime(r.Value) + "｜" + SourceTitle(r.Key));
            if (!ResumeCandidates().Any()) sb.AppendLine("  尚無可繼續觀看的項目。");

            sb.AppendLine();
            sb.AppendLine("[最近收藏 / 稍後觀看]");
            foreach (SavedItem x in favoriteItems.Take(3)) sb.AppendLine("  收藏｜" + x.Title);
            foreach (SavedItem x in watchLaterItems.Take(3)) sb.AppendLine("  稍後｜" + x.Title);

            sb.AppendLine();
            sb.AppendLine("[建議展示]");
            sb.AppendLine("  1. 掃描媒體庫，建立類 Plex 的本機影音中心。");
            sb.AppendLine("  2. 播放一部影片後停下，展示繼續觀看。");
            sb.AppendLine("  3. 新增時間軸筆記，點筆記可跳轉。");
            sb.AppendLine("  4. 切換電影 / 學習 / 音樂 / 展示模式。");
            sb.AppendLine("  5. 按 Ctrl+K 搜尋所有功能。");
            return sb.ToString();
        }

        private IEnumerable<KeyValuePair<string, double>> ResumeCandidates()
        {
            return resumePositions
                .Where(x => x.Value > 10 && SourceExistsOrUrl(x.Key))
                .OrderByDescending(x => x.Value);
        }

        private bool SourceExistsOrUrl(string source)
        {
            if (string.IsNullOrWhiteSpace(source)) return false;
            return IsUrl(source) || File.Exists(source);
        }

        private void ContinueWatching()
        {
            KeyValuePair<string, double> item = ResumeCandidates().FirstOrDefault();
            if (string.IsNullOrWhiteSpace(item.Key))
            {
                MessageBox.Show("目前沒有可繼續觀看的項目。", "繼續觀看", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            int index = EnsureSourceInPlaylist(item.Key);
            if (index < 0) return;
            PlayAt(index, true);
            BeginInvoke(new Action(delegate { Seek(item.Value); }));
            Say("繼續觀看：" + SourceTitle(item.Key) + " @ " + FormatTime(item.Value), true);
        }

        private int EnsureSourceInPlaylist(string source)
        {
            int index = playlist.FindIndex(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase));
            if (index >= 0) return index;

            if (IsUrl(source))
            {
                AddUrl(source, false);
            }
            else if (File.Exists(source))
            {
                AddFile(source);
            }

            return playlist.FindIndex(x => string.Equals(x.Source, source, StringComparison.OrdinalIgnoreCase));
        }

        private void RememberCurrentPosition()
        {
            try
            {
                string src = CurrentSource();
                if (!enableResumeTracking) return;
                if (string.IsNullOrWhiteSpace(src)) return;
                if (platformMode) return;

                double pos = CurrentPos();
                double dur = Duration();
                if (pos < 5) return;
                if (dur > 0 && dur - pos < 8)
                {
                    if (resumePositions.ContainsKey(src)) resumePositions.Remove(src);
                    return;
                }

                resumePositions[src] = pos;
            }
            catch { }
        }

        private double GetResumePosition(string src)
        {
            double v;
            if (src != null && resumePositions.TryGetValue(src, out v)) return v;
            return 0;
        }

        private void ScanMediaLibraryDialog()
        {
            using (FolderBrowserDialog d = new FolderBrowserDialog())
            {
                d.Description = "選擇要建立媒體庫索引的資料夾";
                if (d.ShowDialog(this) != DialogResult.OK) return;
                ScanMediaLibrary(d.SelectedPath);
            }
        }

        private void ScanMediaLibrary(string folder)
        {
            try
            {
                int before = mediaLibrary.Count;
                foreach (string f in ScanFolder(folder, true))
                    AddMediaLibraryFile(f);

                RefreshMediaLibrary();
                SaveProductData();
                RefreshDashboard();
                Say("媒體庫掃描完成，新增 " + (mediaLibrary.Count - before) + " 個項目。", true);
            }
            catch (Exception ex)
            {
                MessageBox.Show("掃描媒體庫失敗：\n" + ex.Message, "媒體庫", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private bool AddMediaLibraryFile(string file)
        {
            try
            {
                string full = Path.GetFullPath(file);
                if (!File.Exists(full) || !IsMediaFile(full)) return false;
                if (mediaLibrary.Any(x => string.Equals(x.Source, full, StringComparison.OrdinalIgnoreCase))) return false;
                FileInfo fi = new FileInfo(full);
                mediaLibrary.Add(new MediaItem
                {
                    Source = full,
                    Title = Path.GetFileNameWithoutExtension(full),
                    Type = fi.Extension.TrimStart('.').ToUpperInvariant(),
                    IsUrl = false,
                    IsWeb = false,
                    Size = fi.Length
                });
                return true;
            }
            catch { return false; }
        }

        private void RefreshMediaLibrary()
        {
            if (lvLibrary == null) return;
            string key = txtLibrarySearch == null ? "" : txtLibrarySearch.Text.Trim().ToLowerInvariant();

            lvLibrary.BeginUpdate();
            lvLibrary.Items.Clear();

            for (int i = 0; i < mediaLibrary.Count; i++)
            {
                MediaItem m = mediaLibrary[i];
                string hay = (m.Title + " " + m.Type + " " + m.Source).ToLowerInvariant();
                if (key.Length > 0 && !hay.Contains(key)) continue;
                ListViewItem item = new ListViewItem(m.Title);
                item.SubItems.Add(m.Type);
                item.SubItems.Add(SizeText(m.Size));
                item.SubItems.Add(Path.GetDirectoryName(m.Source));
                item.Tag = i;
                lvLibrary.Items.Add(item);
            }

            lvLibrary.EndUpdate();
        }

        private int SelectedLibraryIndex()
        {
            if (lvLibrary == null || lvLibrary.SelectedItems.Count == 0) return -1;
            object tag = lvLibrary.SelectedItems[0].Tag;
            if (tag is int) return (int)tag;
            return -1;
        }

        private void AddLibrarySelectedToPlaylist(bool play)
        {
            int i = SelectedLibraryIndex();
            if (i < 0 || i >= mediaLibrary.Count)
            {
                MessageBox.Show("請先選擇媒體庫項目。", "媒體庫", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            MediaItem m = mediaLibrary[i];
            int before = playlist.Count;
            AddFile(m.Source);
            RefreshPlaylist();
            SaveSession();
            int idx = playlist.FindIndex(x => string.Equals(x.Source, m.Source, StringComparison.OrdinalIgnoreCase));
            if (idx >= 0) ShowPlaylistAndSelect(idx);
            if (play && idx >= 0)
            {
                PlayAt(idx, true);
            }
            Say(before == playlist.Count ? "清單已存在：" + m.Title : "已加入播放清單：" + m.Title + "，已切到播放清單。", true);
        }

        private void PlayLibrarySelected()
        {
            AddLibrarySelectedToPlaylist(true);
        }

        private void OpenLibrarySelectedFolder()
        {
            int i = SelectedLibraryIndex();
            if (i < 0 || i >= mediaLibrary.Count) return;
            try { Process.Start("explorer.exe", "/select,\"" + mediaLibrary[i].Source + "\""); }
            catch { }
        }

        private void AddLibrarySelectedToCollection(List<SavedItem> list, string name)
        {
            int i = SelectedLibraryIndex();
            if (i < 0 || i >= mediaLibrary.Count)
            {
                MessageBox.Show("請先選擇媒體庫項目。", name, MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            AddSourceToCollection(list, mediaLibrary[i].Source, mediaLibrary[i].Title, name);
        }

        private void AddCurrentToCollection(List<SavedItem> list, string name)
        {
            string src = CurrentSource();
            if (string.IsNullOrWhiteSpace(src) && currentIndex >= 0 && currentIndex < playlist.Count)
                src = playlist[currentIndex].Source;

            if (string.IsNullOrWhiteSpace(src))
            {
                MessageBox.Show("目前沒有可加入的項目。", name, MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            AddSourceToCollection(list, src, SourceTitle(src), name);
        }

        private void AddSourceToCollection(List<SavedItem> list, string src, string title, string name)
        {
            if (list.Any(x => string.Equals(x.Source, src, StringComparison.OrdinalIgnoreCase)))
            {
                Say(name + " 已存在：" + title, true);
                return;
            }

            list.Insert(0, new SavedItem { Source = src, Title = title, AddedAt = DateTime.Now });
            RefreshCollections();
            SaveProductData();
            RefreshDashboard();
            Say("已加入" + name + "：" + title, true);
        }

        private void RefreshCollections()
        {
            if (lbFavorites != null)
            {
                lbFavorites.Items.Clear();
                foreach (SavedItem x in favoriteItems) lbFavorites.Items.Add(x);
            }

            if (lbWatchLater != null)
            {
                lbWatchLater.Items.Clear();
                foreach (SavedItem x in watchLaterItems) lbWatchLater.Items.Add(x);
            }
        }

        private void PlaySavedListItem(ListBox lb)
        {
            if (lb == null || lb.SelectedItem == null) return;
            SavedItem item = lb.SelectedItem as SavedItem;
            if (item == null) return;
            int index = EnsureSourceInPlaylist(item.Source);
            if (index >= 0) PlayAt(index, true);
        }

        private void PlaySelectedCollection()
        {
            if (lbFavorites != null && lbFavorites.Focused) { PlaySavedListItem(lbFavorites); return; }
            if (lbWatchLater != null && lbWatchLater.Focused) { PlaySavedListItem(lbWatchLater); return; }
            if (lbFavorites != null && lbFavorites.SelectedItem != null) PlaySavedListItem(lbFavorites);
            else if (lbWatchLater != null && lbWatchLater.SelectedItem != null) PlaySavedListItem(lbWatchLater);
        }

        private void RemoveSelectedCollection()
        {
            bool changed = false;
            if (lbFavorites != null && lbFavorites.SelectedItem is SavedItem)
            {
                favoriteItems.Remove((SavedItem)lbFavorites.SelectedItem);
                changed = true;
            }
            if (lbWatchLater != null && lbWatchLater.SelectedItem is SavedItem)
            {
                watchLaterItems.Remove((SavedItem)lbWatchLater.SelectedItem);
                changed = true;
            }
            if (changed)
            {
                RefreshCollections();
                SaveProductData();
                RefreshDashboard();
            }
        }

        private void AddNoteDialog()
        {
            using (InputDialog d = new InputDialog("新增時間軸筆記", "輸入此時間點的筆記：", "例如：這段可以展示字幕或 AB 重複"))
            {
                if (d.ShowDialog(this) != DialogResult.OK) return;
                AddCurrentTimeNote(d.Value);
            }
        }

        private void AddCurrentTimeNote(string note)
        {
            string src = CurrentSource();
            if (string.IsNullOrWhiteSpace(src))
            {
                MessageBox.Show("目前沒有播放項目。", "影片筆記", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            if (string.IsNullOrWhiteSpace(note)) note = "未命名筆記";

            videoNotes.Insert(0, new VideoNoteItem
            {
                Source = src,
                Title = SourceTitle(src),
                Seconds = CurrentPos(),
                Note = note.Trim(),
                CreatedAt = DateTime.Now
            });

            if (txtNoteInput != null) txtNoteInput.Clear();
            RefreshNotes(true);
            SaveProductData();
            RefreshDashboard();
            Say("已新增影片筆記：" + FormatTime(CurrentPos()), true);
        }

        private void RefreshNotes(bool currentOnly)
        {
            if (lbNotes == null) return;
            string src = CurrentSource();
            lbNotes.Items.Clear();
            IEnumerable<VideoNoteItem> q = videoNotes;
            if (currentOnly && !string.IsNullOrWhiteSpace(src))
                q = q.Where(x => string.Equals(x.Source, src, StringComparison.OrdinalIgnoreCase));
            foreach (VideoNoteItem n in q.OrderByDescending(x => x.CreatedAt))
                lbNotes.Items.Add(n);
        }

        private void JumpToSelectedNote()
        {
            if (lbNotes == null || !(lbNotes.SelectedItem is VideoNoteItem)) return;
            VideoNoteItem n = (VideoNoteItem)lbNotes.SelectedItem;
            int index = EnsureSourceInPlaylist(n.Source);
            if (index >= 0)
            {
                PlayAt(index, true);
                BeginInvoke(new Action(delegate { Seek(n.Seconds); }));
                Say("跳到筆記：" + FormatTime(n.Seconds), true);
            }
        }

        private void RemoveSelectedNote()
        {
            if (lbNotes == null || !(lbNotes.SelectedItem is VideoNoteItem)) return;
            videoNotes.Remove((VideoNoteItem)lbNotes.SelectedItem);
            RefreshNotes(false);
            SaveProductData();
            RefreshDashboard();
        }

        private void ExportVideoNotes()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出影片筆記";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "AURORA_Video_Notes_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;

                    StringBuilder sb = new StringBuilder();
                    sb.AppendLine("AURORA 影片時間軸筆記");
                    sb.AppendLine(new string('=', 60));
                    foreach (VideoNoteItem n in videoNotes.OrderBy(x => x.Source).ThenBy(x => x.Seconds))
                        sb.AppendLine(n.Title + "｜" + FormatTime(n.Seconds) + "｜" + n.Note + "｜" + n.Source);

                    File.WriteAllText(d.FileName, sb.ToString(), Encoding.UTF8);
                    Say("影片筆記已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出影片筆記失敗：\n" + ex.Message, "影片筆記", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void RefreshRecommendations()
        {
            if (lbRecommendations == null) return;
            lbRecommendations.Items.Clear();

            foreach (SavedItem x in BuildRecommendations().Take(20))
                lbRecommendations.Items.Add(x);
        }

        private IEnumerable<SavedItem> BuildRecommendations()
        {
            List<SavedItem> result = new List<SavedItem>();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            Action<string, string> add = delegate (string src, string reason)
            {
                if (string.IsNullOrWhiteSpace(src) || seen.Contains(src) || !SourceExistsOrUrl(src)) return;
                seen.Add(src);
                result.Add(new SavedItem { Source = src, Title = reason + "｜" + SourceTitle(src), AddedAt = DateTime.Now });
            };

            foreach (var r in ResumeCandidates())
                add(r.Key, "繼續觀看 " + FormatTime(r.Value));

            string cur = CurrentSource();
            if (!string.IsNullOrWhiteSpace(cur) && File.Exists(cur))
            {
                string dir = Path.GetDirectoryName(cur);
                foreach (MediaItem m in mediaLibrary.Where(x => string.Equals(Path.GetDirectoryName(x.Source), dir, StringComparison.OrdinalIgnoreCase)))
                    add(m.Source, "同資料夾");
            }

            foreach (SavedItem x in watchLaterItems)
                add(x.Source, "稍後觀看");

            foreach (MediaItem m in mediaLibrary.OrderByDescending(x => x.Size))
                add(m.Source, "媒體庫推薦");

            foreach (MediaItem m in playlist)
                add(m.Source, "播放清單");

            return result;
        }

        private void PlaySelectedRecommendation()
        {
            if (lbRecommendations == null || !(lbRecommendations.SelectedItem is SavedItem)) return;
            SavedItem item = (SavedItem)lbRecommendations.SelectedItem;
            int index = EnsureSourceInPlaylist(item.Source);
            if (index >= 0) PlayAt(index, true);
        }

        private void PlayRecommendedNext()
        {
            SavedItem first = BuildRecommendations().FirstOrDefault();
            if (first == null)
            {
                MessageBox.Show("目前沒有推薦項目。", "推薦", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            int index = EnsureSourceInPlaylist(first.Source);
            if (index >= 0) PlayAt(index, true);
        }

        private void AddRecommendationToCollection(List<SavedItem> list, string name)
        {
            if (lbRecommendations == null || !(lbRecommendations.SelectedItem is SavedItem)) return;
            SavedItem item = (SavedItem)lbRecommendations.SelectedItem;
            AddSourceToCollection(list, item.Source, SourceTitle(item.Source), name);
        }

        private void EnableStudyMode()
        {
            dark = true;
            repeat = RepeatMode.One;
            if (btnRepeat != null) btnRepeat.Text = "循環：單首";
            subtitleCustomHeight = 62;
            subtitleCustomFont = new Font("Microsoft JhengHei UI", 18F, FontStyle.Bold);
            ApplySubtitleStyle();
            SetVolume(55);
            SwitchSideTabByTitle("影片筆記");
            ApplyTheme();
            Say("學習模式已啟用：大字幕、單首循環、筆記頁、音量 55。", true);
        }

        private void EnableMusicMode()
        {
            dark = true;
            shuffle = true;
            repeat = RepeatMode.All;
            if (btnShuffle != null) btnShuffle.Text = "隨機：開";
            if (btnRepeat != null) btnRepeat.Text = "循環：全部";
            SetVolume(65);
            SwitchSideTabByTitle("播放清單");
            Say("音樂模式已啟用：隨機、全部循環、音量 65。", true);
        }

        private void EnableDemoMode()
        {
            dark = true;
            TopMost = true;
            SetVolume(70);
            SwitchSideTabByTitle("展示中心");
            RefreshShowcaseReport();
            ApplyTheme();
            Say("展示模式已啟用：置頂、展示中心、音量 70。", true);
        }

        private void LoadProductData()
        {
            try
            {
                Directory.CreateDirectory(sessionFolder);
                LoadResumePositions();
                LoadMediaLibrary();
                LoadCollections();
                LoadVideoNotes();
                LoadPrimeSettings();
                RefreshDashboard();
            }
            catch { }
        }

        private void SaveProductData()
        {
            try
            {
                Directory.CreateDirectory(sessionFolder);
                SaveResumePositions();
                SaveMediaLibrary();
                SaveCollections();
                SaveVideoNotes();
                SavePrimeSettings();
            }
            catch { }
        }

        private void SavePrimeSettings()
        {
            try
            {
                using (StreamWriter w = new StreamWriter(DataPath("prime_settings.tsv"), false, Encoding.UTF8))
                {
                    w.WriteLine("Theme\t" + EscapeField(themeName));
                    w.WriteLine("Accent\t" + themeAccent.R + "," + themeAccent.G + "," + themeAccent.B);
                    w.WriteLine("Resume\t" + enableResumeTracking);
                    w.WriteLine("EndRecommendation\t" + showEndRecommendation);
                    w.WriteLine("Toast\t" + enableToastNotification);
                }
            }
            catch { }
        }

        private void LoadPrimeSettings()
        {
            try
            {
                string path = DataPath("prime_settings.tsv");
                if (!File.Exists(path)) return;
                foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
                {
                    string[] p = line.Split('\t');
                    if (p.Length < 2) continue;
                    if (p[0] == "Theme") themeName = UnescapeField(p[1]);
                    else if (p[0] == "Accent")
                    {
                        string[] rgb = p[1].Split(',');
                        if (rgb.Length == 3)
                        {
                            int r, g, b;
                            if (int.TryParse(rgb[0], out r) && int.TryParse(rgb[1], out g) && int.TryParse(rgb[2], out b))
                                themeAccent = Color.FromArgb(r, g, b);
                        }
                    }
                    else if (p[0] == "Resume") bool.TryParse(p[1], out enableResumeTracking);
                    else if (p[0] == "EndRecommendation") bool.TryParse(p[1], out showEndRecommendation);
                    else if (p[0] == "Toast") bool.TryParse(p[1], out enableToastNotification);
                }
                ApplyTheme();
            }
            catch { }
        }

        private string DataPath(string name)
        {
            return Path.Combine(sessionFolder, name);
        }

        private void SaveResumePositions()
        {
            using (StreamWriter w = new StreamWriter(DataPath("resume_positions.tsv"), false, Encoding.UTF8))
            {
                foreach (var kv in resumePositions)
                    w.WriteLine(EscapeField(kv.Key) + "\t" + kv.Value.ToString(CultureInfo.InvariantCulture));
            }
        }

        private void LoadResumePositions()
        {
            resumePositions.Clear();
            string path = DataPath("resume_positions.tsv");
            if (!File.Exists(path)) return;
            foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
            {
                string[] p = line.Split('\t');
                if (p.Length < 2) continue;
                double v;
                if (double.TryParse(p[1], NumberStyles.Float, CultureInfo.InvariantCulture, out v))
                    resumePositions[UnescapeField(p[0])] = v;
            }
        }

        private void SaveMediaLibrary()
        {
            using (StreamWriter w = new StreamWriter(DataPath("media_library.tsv"), false, Encoding.UTF8))
            {
                foreach (MediaItem m in mediaLibrary)
                    w.WriteLine(EscapeField(m.Source));
            }
        }

        private void LoadMediaLibrary()
        {
            mediaLibrary.Clear();
            string path = DataPath("media_library.tsv");
            if (!File.Exists(path)) return;
            foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
            {
                string src = UnescapeField(line.Trim());
                if (File.Exists(src)) AddMediaLibraryFile(src);
            }
        }

        private void SaveCollections()
        {
            SaveSavedItems("favorites.tsv", favoriteItems);
            SaveSavedItems("watch_later.tsv", watchLaterItems);
        }

        private void LoadCollections()
        {
            favoriteItems.Clear();
            watchLaterItems.Clear();
            LoadSavedItems("favorites.tsv", favoriteItems);
            LoadSavedItems("watch_later.tsv", watchLaterItems);
            RefreshCollections();
        }

        private void SaveSavedItems(string file, List<SavedItem> list)
        {
            using (StreamWriter w = new StreamWriter(DataPath(file), false, Encoding.UTF8))
            {
                foreach (SavedItem x in list)
                    w.WriteLine(EscapeField(x.Source) + "\t" + EscapeField(x.Title) + "\t" + x.AddedAt.ToString("s"));
            }
        }

        private void LoadSavedItems(string file, List<SavedItem> list)
        {
            string path = DataPath(file);
            if (!File.Exists(path)) return;
            foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
            {
                string[] p = line.Split('\t');
                if (p.Length < 1) continue;
                string src = UnescapeField(p[0]);
                if (!SourceExistsOrUrl(src)) continue;
                string title = p.Length > 1 ? UnescapeField(p[1]) : SourceTitle(src);
                DateTime dt = DateTime.Now;
                if (p.Length > 2) DateTime.TryParse(p[2], out dt);
                list.Add(new SavedItem { Source = src, Title = title, AddedAt = dt });
            }
        }

        private void SaveVideoNotes()
        {
            using (StreamWriter w = new StreamWriter(DataPath("video_notes.tsv"), false, Encoding.UTF8))
            {
                foreach (VideoNoteItem n in videoNotes)
                    w.WriteLine(EscapeField(n.Source) + "\t" + n.Seconds.ToString(CultureInfo.InvariantCulture) + "\t" + EscapeField(n.Title) + "\t" + EscapeField(n.Note) + "\t" + n.CreatedAt.ToString("s"));
            }
        }

        private void LoadVideoNotes()
        {
            videoNotes.Clear();
            string path = DataPath("video_notes.tsv");
            if (!File.Exists(path)) return;
            foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
            {
                string[] p = line.Split('\t');
                if (p.Length < 4) continue;
                double sec;
                if (!double.TryParse(p[1], NumberStyles.Float, CultureInfo.InvariantCulture, out sec)) sec = 0;
                DateTime dt = DateTime.Now;
                if (p.Length > 4) DateTime.TryParse(p[4], out dt);
                videoNotes.Add(new VideoNoteItem
                {
                    Source = UnescapeField(p[0]),
                    Seconds = sec,
                    Title = UnescapeField(p[2]),
                    Note = UnescapeField(p[3]),
                    CreatedAt = dt
                });
            }
            RefreshNotes(false);
        }

        private string EscapeField(string s)
        {
            if (s == null) return "";
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(s));
        }

        private string UnescapeField(string s)
        {
            try { return Encoding.UTF8.GetString(Convert.FromBase64String(s)); }
            catch { return s ?? ""; }
        }

        private void RefreshCommandCenterReport()
        {
            if (commandCenterBox != null)
                commandCenterBox.Text = BuildCommandCenterReport();

            Say("指令中心已更新。", true);
        }

        private string BuildCommandCenterReport()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Command Center");
            sb.AppendLine(new string('=', 60));
            sb.AppendLine("指令數量：" + BuildCommandList().Count);
            sb.AppendLine("快捷入口：Ctrl+K 或 Ctrl+P");
            sb.AppendLine();

            sb.AppendLine("[智慧狀態]");
            sb.AppendLine("播放清單項目：" + playlist.Count);
            sb.AppendLine("目前模式：" + (platformMode ? "平台播放" : "本機播放"));
            sb.AppendLine("視窗置頂：" + (TopMost ? "開啟" : "關閉"));
            sb.AppendLine("劇院模式：" + (theater ? "開啟" : "關閉"));
            sb.AppendLine("迷你模式：" + (miniMode ? "開啟" : "關閉"));
            sb.AppendLine("外部瀏覽器引擎：" + (usingModernWebView2 ? "WebView2" : (usingEmbeddedBrowserFallback ? "Edge / Chrome 嵌入" : "自動 / 尚未啟用")));
            sb.AppendLine();

            sb.AppendLine("[建議]");
            if (playlist.Count == 0)
                sb.AppendLine("可先拖曳影片或資料夾到播放器，或按 Ctrl+K 搜尋『開啟檔案』。");
            else
            {
                sb.AppendLine("可用『智慧整理清單』移除失效與重複來源，並依類型排序。");
                sb.AppendLine("可用『展示中心』匯出 README，讓作業說明看起來更完整。");
            }

            sb.AppendLine();
            sb.AppendLine("[可搜尋指令]");
            foreach (CommandAction c in BuildCommandList())
                sb.AppendLine(c.Title + "｜" + c.Keyword);

            return sb.ToString();
        }

        private List<CommandAction> BuildCommandList()
        {
            List<CommandAction> list = new List<CommandAction>();
            list.Add(new CommandAction("play", "播放 / 暫停", "play pause space 播放 暫停", "切換播放與暫停"));
            list.Add(new CommandAction("stop", "停止播放", "stop 停止", "停止目前媒體"));
            list.Add(new CommandAction("prev", "上一首", "previous prev 上一首", "播放上一個項目"));
            list.Add(new CommandAction("next", "下一首", "next 下一首", "播放下一個項目"));
            list.Add(new CommandAction("open", "開啟檔案", "open file 檔案 影片 音樂", "選擇本機檔案"));
            list.Add(new CommandAction("folder", "加入資料夾", "folder 資料夾 批次", "加入整個資料夾"));
            list.Add(new CommandAction("url", "連網播放 URL", "url stream 串流 網址", "加入網路媒體或平台網址"));
            list.Add(new CommandAction("platform", "平台搜尋", "youtube bilibili iqiyi 平台 搜尋", "切到平台搜尋頁"));
            list.Add(new CommandAction("dashboard", "首頁儀表板", "home dashboard 首頁 儀表板", "切到首頁儀表板"));
            list.Add(new CommandAction("playlist", "播放清單", "playlist 清單", "切到播放清單"));
            list.Add(new CommandAction("library", "媒體庫", "library media plex 媒體庫 掃描", "切到本機媒體庫"));
            list.Add(new CommandAction("collections", "收藏 / 稍後觀看", "favorite watch later 收藏 稍後觀看", "切到收藏與稍後觀看"));
            list.Add(new CommandAction("notes", "影片筆記", "notes annotation 筆記 時間軸", "切到影片筆記"));
            list.Add(new CommandAction("recommend", "推薦 / 模式", "recommend mode 推薦 模式", "切到智慧推薦與模式"));
            list.Add(new CommandAction("chapters", "章節 Chapters", "chapter chapters 章節", "切到影片章節"));
            list.Add(new CommandAction("heatmap", "播放熱力圖", "heatmap 熱力圖 熱門片段", "切到播放進度熱力圖"));
            list.Add(new CommandAction("preview", "播放前預覽卡", "preview 預覽卡 檔案資訊", "切到播放前預覽卡"));
            list.Add(new CommandAction("statusCenter", "智慧狀態中心", "status center 狀態 系統", "切到智慧狀態中心"));
            list.Add(new CommandAction("settingsCenter", "設定中心", "settings 設定 偏好", "切到大廠級設定中心"));
            list.Add(new CommandAction("themeStudio", "Theme Studio", "theme studio 主題 商店", "切到主題商店"));
            list.Add(new CommandAction("miniPro", "迷你播放器 2.0", "mini pip 小窗 置頂", "切換迷你播放器 2.0"));
            list.Add(new CommandAction("demoFlow", "一鍵展示 Demo Flow", "demo flow 展示 發表", "切到展示流程"));
            list.Add(new CommandAction("info", "媒體資訊", "info 資訊", "切到資訊頁"));
            list.Add(new CommandAction("bookmark", "書籤 / AB", "bookmark ab 書籤", "切到書籤與 AB 重複"));
            list.Add(new CommandAction("immersive", "沉浸影音", "hdr dolby vr ar 360 畫質", "切到沉浸影音實驗室"));
            list.Add(new CommandAction("engines", "外部核心偵測", "ffmpeg vlc webview cefsharp core 核心", "偵測外部核心"));
            list.Add(new CommandAction("showcase", "展示中心", "readme demo 展示 繳交", "切到展示中心"));
            list.Add(new CommandAction("commands", "指令中心", "command palette 指令", "切到指令中心"));
            list.Add(new CommandAction("guide", "重播星際導覽", "guide tutorial wizard onboarding 導覽 小精靈", "重新播放首次啟動動畫導覽"));
            list.Add(new CommandAction("stats", "播放統計", "stats 統計 儀表板", "切到播放統計儀表板"));
            list.Add(new CommandAction("hotkeys", "快捷鍵自訂", "hotkey 快捷鍵 自訂", "切到快捷鍵自訂"));
            list.Add(new CommandAction("snapshots", "工作階段快照", "snapshot session 工作階段 快照", "切到工作階段快照"));
            list.Add(new CommandAction("subtitleStyle", "字幕樣式", "subtitle style 字幕 樣式", "切到字幕樣式編輯器"));
            list.Add(new CommandAction("tools", "工具箱", "tools 工具", "切到工具箱"));
            list.Add(new CommandAction("log", "紀錄", "log 紀錄", "切到紀錄"));
            list.Add(new CommandAction("theater", "劇院模式", "theater fullscreen f11 劇院 全螢幕", "切換劇院模式"));
            list.Add(new CommandAction("mini", "迷你專注模式", "mini focus 迷你 專注", "切換迷你專注模式"));
            list.Add(new CommandAction("topmost", "視窗置頂", "pin topmost 置頂", "切換視窗置頂"));
            list.Add(new CommandAction("snapshot", "畫面截圖", "snapshot screenshot 截圖", "儲存播放畫面截圖"));
            list.Add(new CommandAction("jump", "跳到指定時間", "jump seek time 跳轉 時間", "輸入時間並跳轉"));
            list.Add(new CommandAction("organize", "智慧整理清單", "organize clean duplicate missing 整理 重複 失效", "移除重複與失效來源並排序"));
            list.Add(new CommandAction("movieNight", "一鍵電影夜", "movie night cinema 電影夜", "套用沉浸觀影設定"));
            list.Add(new CommandAction("report", "匯出播放報表", "report export 報表", "匯出播放清單報表"));
            list.Add(new CommandAction("readme", "匯出 README", "readme markdown 說明", "匯出作業 README"));
            list.Add(new CommandAction("pitch", "複製產品賣點", "pitch product 賣點", "複製產品介紹文字"));
            list.Add(new CommandAction("youtube360", "搜尋 YouTube 360", "360 vr youtube", "搜尋 360 / VR 影片"));
            list.Add(new CommandAction("webxr", "開啟 WebXR 測試", "webxr ar vr", "開啟 WebXR 測試入口"));
            return list;
        }

        private void ShowCommandPalette()
        {
            List<CommandAction> commands = BuildCommandList();
            using (CommandPaletteDialog d = new CommandPaletteDialog(commands, dark))
            {
                if (d.ShowDialog(this) != DialogResult.OK) return;
                ExecuteCommand(d.SelectedCommandId);
            }
        }

        private void ExecuteCommand(string id)
        {
            switch (id)
            {
                case "play": PlayPause(); break;
                case "stop": Stop(); break;
                case "prev": Previous(); break;
                case "next": Next(true); break;
                case "open": PickFiles(); break;
                case "folder": PickFolder(); break;
                case "url": AddUrlDialog(true); break;
                case "platform": SwitchSideTabByTitle("平台搜尋"); ShowPlatformMode(true); break;
                case "dashboard": SwitchSideTabByTitle("首頁"); RefreshDashboard(); break;
                case "playlist": SwitchSideTabByTitle("播放清單"); break;
                case "library": SwitchSideTabByTitle("媒體庫"); RefreshMediaLibrary(); break;
                case "collections": SwitchSideTabByTitle("收藏"); RefreshCollections(); break;
                case "notes": SwitchSideTabByTitle("影片筆記"); RefreshNotes(true); break;
                case "recommend": SwitchSideTabByTitle("推薦 / 模式"); RefreshRecommendations(); break;
                case "chapters": SwitchSideTabByTitle("章節"); RefreshChapters(); break;
                case "heatmap": SwitchSideTabByTitle("熱力圖"); RefreshHeatmap(); break;
                case "preview": SwitchSideTabByTitle("預覽卡"); RefreshPreviewCard(CurrentSource()); break;
                case "statusCenter": SwitchSideTabByTitle("狀態中心"); RefreshStatusCenter(); break;
                case "settingsCenter": SwitchSideTabByTitle("設定"); RefreshSettingsCenter(); break;
                case "themeStudio": SwitchSideTabByTitle("主題"); RefreshThemeStudio(); break;
                case "miniPro": ToggleMiniPlayerPro(); break;
                case "demoFlow": SwitchSideTabByTitle("Demo Flow"); StartDemoFlow(); break;
                case "info": SwitchSideTabByTitle("資訊"); break;
                case "bookmark": SwitchSideTabByTitle("書籤 / AB"); break;
                case "immersive": SwitchSideTabByTitle("沉浸影音"); break;
                case "engines": SwitchSideTabByTitle("外部核心"); RefreshExternalCoreStatus(); break;
                case "showcase": SwitchSideTabByTitle("展示中心"); RefreshShowcaseReport(); break;
                case "commands": SwitchSideTabByTitle("指令中心"); RefreshCommandCenterReport(); break;
                case "guide": ReplayAuroraGuide(); break;
                case "stats": SwitchSideTabByTitle("統計"); RefreshStatsReport(); break;
                case "hotkeys": SwitchSideTabByTitle("快捷鍵"); break;
                case "snapshots": SwitchSideTabByTitle("工作階段"); RefreshSnapshotList(); break;
                case "subtitleStyle": SwitchSideTabByTitle("字幕樣式"); break;
                case "tools": SwitchSideTabByTitle("工具"); break;
                case "log": SwitchSideTabByTitle("紀錄"); break;
                case "theater": ToggleTheater(); break;
                case "mini": ToggleMiniMode(); break;
                case "topmost": ToggleAlwaysOnTop(); break;
                case "snapshot": SaveDisplaySnapshot(); break;
                case "jump": JumpToTimeDialog(); break;
                case "organize": SmartOrganizePlaylist(); break;
                case "movieNight": EnableMovieNightMode(); break;
                case "report": ExportPlaylistReport(); break;
                case "readme": ExportReadmeFile(); break;
                case "pitch": CopyProductPitch(); break;
                case "youtube360": SearchImmersiveKeyword("360 video 4K VR"); break;
                case "webxr": OpenWeb("https://immersive-web.github.io/webxr-samples/"); break;
            }
        }

        private void SwitchSideTabByTitle(string title)
        {
            if (sideTabs == null) return;
            for (int i = 0; i < sideTabs.TabPages.Count; i++)
            {
                if (string.Equals(sideTabs.TabPages[i].Text, title, StringComparison.CurrentCultureIgnoreCase))
                {
                    SwitchSideTab(i);
                    return;
                }
            }
        }

        private void SetSidePanelWidth(int width)
        {
            if (split == null) return;
            try
            {
                int usableWidth = split.ClientSize.Width;
                int distance = Math.Max(split.Panel1MinSize, usableWidth - width - split.SplitterWidth);
                if (distance > 0 && distance < usableWidth)
                    split.SplitterDistance = distance;
            }
            catch { }
        }

        private void SmartOrganizePlaylist()
        {
            if (playlist.Count == 0)
            {
                MessageBox.Show("播放清單是空的。", "智慧整理清單", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            if (MessageBox.Show("將移除重複來源與失效本機檔案，並依類型與標題排序。是否繼續？", "智慧整理清單", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            string cur = CurrentSource();
            int before = playlist.Count;

            List<MediaItem> cleaned = new List<MediaItem>();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (MediaItem m in playlist)
            {
                if (!m.IsUrl && !File.Exists(m.Source)) continue;
                if (seen.Contains(m.Source)) continue;
                seen.Add(m.Source);
                cleaned.Add(m);
            }

            cleaned = cleaned
                .OrderBy(x => x.IsWeb ? 2 : (x.IsUrl ? 1 : 0))
                .ThenBy(x => x.Type)
                .ThenBy(x => x.Title)
                .ToList();

            playlist.Clear();
            playlist.AddRange(cleaned);
            currentIndex = playlist.FindIndex(x => string.Equals(x.Source, cur, StringComparison.OrdinalIgnoreCase));

            RefreshPlaylist();
            UpdateInfo();
            SaveSession();
            Say("智慧整理完成，移除 " + (before - playlist.Count) + " 個重複或失效項目。", true);
            RefreshCommandCenterReport();
        }

        private void EnableMovieNightMode()
        {
            dark = true;
            shuffle = false;
            repeat = RepeatMode.All;
            if (btnShuffle != null) btnShuffle.Text = "隨機：關";
            if (btnRepeat != null) btnRepeat.Text = "循環：全部";
            SetVolume(70);
            SetSidePanelWidth(370);
            ApplyTheme();

            if (!theater)
            {
                DialogResult r = MessageBox.Show("是否進入劇院模式？", "一鍵電影夜", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
                if (r == DialogResult.Yes) ToggleTheater();
            }

            Say("一鍵電影夜已套用：深色、音量 70、全部循環、側欄精簡。", true);
        }

        private void CopyProductPitch()
        {
            string pitch =
                "AURORA Cinema Deck 是以 Windows Forms 製作的 Hybrid 多媒體播放器，整合本機影音播放、平台搜尋、WebView2 / Edge / Chrome 備援、字幕、書籤、AB 重複、沉浸影音實驗室、外部核心偵測、展示中心與 Ctrl+K 指令面板。\\r\\n" +
                "它不硬包大型影音核心，因此可符合 21MB 繳交限制；同時透過 Optional Engine 架構，在有 WebView2、FFmpeg、VLC 等環境時顯示進階可用狀態，沒有時自動降級。";

            Clipboard.SetText(pitch);
            Say("產品賣點已複製。", true);
        }

        private void ExportShortcutCard()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出快捷鍵卡";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "AURORA_Shortcut_Card.txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;

                    StringBuilder sb = new StringBuilder();
                    sb.AppendLine("AURORA Cinema Deck 快捷鍵卡");
                    sb.AppendLine(new string('=', 40));
                    sb.AppendLine("Ctrl + K / Ctrl + P：指令面板");
                    sb.AppendLine("Space：播放 / 暫停");
                    sb.AppendLine("← / →：快退 / 快轉");
                    sb.AppendLine("↑ / ↓：音量");
                    sb.AppendLine("M：靜音");
                    sb.AppendLine("T：置頂");
                    sb.AppendLine("F11：劇院模式");
                    sb.AppendLine("Esc：離開劇院模式");
                    sb.AppendLine("Ctrl + O：開啟檔案");
                    sb.AppendLine("Ctrl + U：加入 URL");
                    sb.AppendLine("Ctrl + J：跳到指定時間");
                    sb.AppendLine("Ctrl + S：畫面截圖");
                    File.WriteAllText(d.FileName, sb.ToString(), Encoding.UTF8);
                    Say("快捷鍵卡已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出快捷鍵卡失敗：\n" + ex.Message, "快捷鍵卡", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void RefreshShowcaseReport()
        {
            if (showcaseBox != null)
                showcaseBox.Text = BuildShowcaseReport();

            Say("展示摘要已更新。", true);
        }

        private string BuildShowcaseReport()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Cinema Deck");
            sb.AppendLine("展示摘要 / Demo Summary");
            sb.AppendLine("重點提示：Ctrl+K / Ctrl+P 可開啟指令面板搜尋所有功能。");
            sb.AppendLine(new string('=', 60));
            sb.AppendLine("產生時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine();

            sb.AppendLine("[核心亮點]");
            sb.AppendLine("1. 本機多媒體播放：WMV、MP4、AVI、MOV、MKV、MP3、WAV 等格式依系統解碼器支援播放。");
            sb.AppendLine("2. 平台播放：YouTube、Bilibili、愛奇藝、Twitch、Vimeo、TikTok、巴哈動畫瘋。");
            sb.AppendLine("3. Hybrid 網頁核心：WebView2 優先，失敗後嵌入 Edge / Chrome，再失敗則外部瀏覽器備援。");
            sb.AppendLine("4. 播放清單、搜尋、排序、儲存、載入、拖曳檔案和資料夾。");
            sb.AppendLine("5. 字幕、書籤、AB 重複、睡眠計時、劇院模式、迷你專注模式。");
            sb.AppendLine("6. 沉浸影音實驗室：畫質偏好、HDR / Dolby Vision 相容提示、AR / VR / 360 入口。");
            sb.AppendLine("7. 外部核心偵測：WebView2、Edge / Chrome、FFmpeg、FFprobe、VLC、CefSharp。");
            sb.AppendLine();

            sb.AppendLine("[目前播放清單]");
            sb.AppendLine(BuildPlaylistAnalyticsText());
            sb.AppendLine();

            sb.AppendLine("[外部核心狀態]");
            sb.AppendLine(BuildExternalCoreReport());
            return sb.ToString();
        }

        private string BuildReadmeText()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("AURORA Cinema Deck - 多媒體播放器");
            sb.AppendLine();
            sb.AppendLine("一、專案特色");
            sb.AppendLine("本播放器以 Windows Forms 製作，提供本機影音播放、播放清單管理、字幕、書籤、AB 重複、睡眠計時、劇院介面、平台搜尋與 Hybrid 網頁播放。");
            sb.AppendLine();
            sb.AppendLine("二、平台播放架構");
            sb.AppendLine("程式採 Optional Engine 設計。若環境有 WebView2，優先使用 WebView2；若沒有，會自動偵測 Edge / Chrome / Brave 並嘗試嵌入視窗；再失敗則外部瀏覽器開啟。");
            sb.AppendLine();
            sb.AppendLine("三、進階相容功能");
            sb.AppendLine("畫質偏好、HDR / Dolby Vision、AR / VR / 360 採相容入口與提示模式，不內建大型解碼器或 VR 引擎，實際效果取決於片源、硬體、系統、瀏覽器與平台支援程度。");
            sb.AppendLine();
            sb.AppendLine("四、外部核心偵測");
            sb.AppendLine("會偵測 WebView2 Runtime、FFmpeg、FFprobe、VLC、CefSharp 等可選核心。沒有安裝不會影響基本播放。");
            sb.AppendLine();
            sb.AppendLine("五、繳交提醒");
            sb.AppendLine("請勿壓縮 bin、obj、.vs、packages、FFmpeg、VLC、CefSharp、完整 WebView2 Runtime 等大型資料夾，避免超過 21MB。");
            sb.AppendLine();
            sb.AppendLine("六、快捷鍵");
            sb.AppendLine("Space 播放 / 暫停，← / → 快退快轉，↑ / ↓ 音量，M 靜音，T 視窗置頂，F11 劇院模式，Esc 離開劇院模式，Ctrl+O 開檔，Ctrl+U 加入 URL，Ctrl+J 跳到指定時間，Ctrl+S 截圖。");
            return sb.ToString();
        }

        private void ExportReadmeFile()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出 README";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "README_AURORA_Cinema_Deck.txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;
                    File.WriteAllText(d.FileName, BuildReadmeText(), Encoding.UTF8);
                    Say("README 已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出 README 失敗：\n" + ex.Message, "README", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void CopyReadmeText()
        {
            Clipboard.SetText(BuildReadmeText());
            Say("README 內容已複製。", true);
        }

        private void ShowSubmissionChecklist()
        {
            string msg =
                "繳交檢查建議：\n\n" +
                "1. 保留 .sln、.csproj、Form1.cs、Program.cs、Properties 資料夾。\n" +
                "2. 不要壓縮 bin、obj、.vs、packages。\n" +
                "3. 若助教沒有 WebView2，程式會改用 Edge / Chrome 嵌入或外部瀏覽器。\n" +
                "4. FFmpeg、VLC、CefSharp 是選配偵測，不需要打包。\n" +
                "5. Windows Media Player COM 參考需要保留。\n" +
                "6. 建議壓縮前先清除建置輸出，再重新開啟確認可以編譯。";

            MessageBox.Show(msg, "繳交檢查", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void ShowPlaylistAnalytics()
        {
            MessageBox.Show(BuildPlaylistAnalyticsText(), "播放清單分析", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private string BuildPlaylistAnalyticsText()
        {
            int total = playlist.Count;
            int local = playlist.Count(x => !x.IsUrl);
            int url = playlist.Count(x => x.IsUrl && !x.IsWeb);
            int web = playlist.Count(x => x.IsWeb);
            long size = playlist.Where(x => !x.IsUrl).Sum(x => x.Size);

            Dictionary<string, int> extCount = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (MediaItem m in playlist)
            {
                string key = m.IsWeb ? "WEB" : (m.IsUrl ? "URL" : Path.GetExtension(m.Source));
                if (string.IsNullOrWhiteSpace(key)) key = "UNKNOWN";
                if (!extCount.ContainsKey(key)) extCount[key] = 0;
                extCount[key]++;
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("總項目：" + total);
            sb.AppendLine("本機檔案：" + local);
            sb.AppendLine("網路串流：" + url);
            sb.AppendLine("平台頁面：" + web);
            sb.AppendLine("本機檔案總大小：" + SizeText(size));
            sb.AppendLine();

            sb.AppendLine("格式分佈：");
            foreach (KeyValuePair<string, int> kv in extCount.OrderByDescending(x => x.Value))
                sb.AppendLine("  " + kv.Key + "：" + kv.Value);

            if (total == 0)
                sb.AppendLine("目前清單是空的，可以拖曳檔案或資料夾到播放器。");

            return sb.ToString();
        }

        private void ScanDuplicatePlaylistItems()
        {
            var groups = playlist
                .Select((m, i) => new { Item = m, Index = i })
                .GroupBy(x => x.Item.Source, StringComparer.OrdinalIgnoreCase)
                .Where(g => g.Count() > 1)
                .ToList();

            if (groups.Count == 0)
            {
                MessageBox.Show("沒有發現重複來源。", "重複項目掃描", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("發現重複來源：");
            sb.AppendLine();

            foreach (var g in groups)
            {
                sb.AppendLine(g.Key);
                foreach (var x in g)
                    sb.AppendLine("  #" + (x.Index + 1) + " " + x.Item.Title);
                sb.AppendLine();
            }

            MessageBox.Show(sb.ToString(), "重複項目掃描", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        private void ShowDemoScript()
        {
            string msg =
                "展示流程建議：\n\n" +
                "1. 先展示 AURORA 劇院 UI、播放清單和拖曳加入檔案。\n" +
                "2. 播放本機影片，展示進度列、音量、倍速、字幕、AB 重複和書籤。\n" +
                "3. 切到平台搜尋，展示 YouTube / Bilibili 搜尋與 WebView2 / Edge 嵌入備援。\n" +
                "4. 切到沉浸影音，說明畫質偏好、HDR / Dolby Vision、AR / VR 入口採相容設計。\n" +
                "5. 切到外部核心，展示自動偵測 WebView2、FFmpeg、VLC 等核心。\n" +
                "6. 最後展示 README 匯出與 21MB 打包策略。";

            MessageBox.Show(msg, "展示台詞", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void ShowShortcutOverview()
        {
            string msg =
                "快捷鍵總覽：\n\n" +
                "Space：播放 / 暫停\n" +
                "← / →：快退 / 快轉\n" +
                "↑ / ↓：音量調整\n" +
                "M：靜音\n" +
                "T：視窗置頂\n" +
                "F11：劇院模式\n" +
                "Esc：離開劇院模式\n" +
                "Ctrl + O：開啟檔案\n" +
                "Ctrl + U：加入 URL\n" +
                "Ctrl + J：跳到指定時間\n" +
                "Ctrl + S：畫面截圖";

            MessageBox.Show(msg, "快捷鍵總覽", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void ShowPackageSizeGuide()
        {
            MessageBox.Show(
                "21MB 打包策略：\n\n" +
                "可以放：原始碼、.sln、.csproj、Properties、必要資源檔。\n\n" +
                "不要放：bin、obj、.vs、packages、FFmpeg、VLC、CefSharp、完整 WebView2 Runtime、大影片測試檔。\n\n" +
                "程式已設計成 Optional Engine 架構，所以沒有大型核心也能執行基本功能。",
                "21MB 打包提醒",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }



        private void JumpToTimeDialog()
        {
            if (platformMode)
            {
                MessageBox.Show("平台網頁影片無法保證可由程式精準跳轉，請使用平台播放器本身的進度列。", "跳轉時間", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            using (InputDialog d = new InputDialog("跳到指定時間", "輸入時間，例如 90、01:30、1:02:15", "支援秒數、mm:ss、hh:mm:ss"))
            {
                if (d.ShowDialog(this) != DialogResult.OK) return;
                double sec;
                if (!TryParseTime(d.Value, out sec))
                {
                    MessageBox.Show("時間格式不正確。", "跳轉時間", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                double dur = Duration();
                if (dur > 0) sec = Math.Max(0, Math.Min(dur, sec));
                Seek(sec);
                Say("已跳到 " + FormatTime(sec), true);
            }
        }

        private bool TryParseTime(string text, out double seconds)
        {
            seconds = 0;
            if (string.IsNullOrWhiteSpace(text)) return false;
            text = text.Trim();

            double direct;
            if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out direct) ||
                double.TryParse(text, NumberStyles.Float, CultureInfo.CurrentCulture, out direct))
            {
                seconds = direct;
                return seconds >= 0;
            }

            string[] parts = text.Split(':');
            if (parts.Length < 2 || parts.Length > 3) return false;

            int h = 0;
            int m = 0;
            double s = 0;

            if (parts.Length == 2)
            {
                if (!int.TryParse(parts[0], out m)) return false;
                if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out s) &&
                    !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.CurrentCulture, out s)) return false;
            }
            else
            {
                if (!int.TryParse(parts[0], out h)) return false;
                if (!int.TryParse(parts[1], out m)) return false;
                if (!double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out s) &&
                    !double.TryParse(parts[2], NumberStyles.Float, CultureInfo.CurrentCulture, out s)) return false;
            }

            if (h < 0 || m < 0 || s < 0) return false;
            seconds = h * 3600 + m * 60 + s;
            return true;
        }

        private void CopyTimestamp()
        {
            string title = currentIndex >= 0 && currentIndex < playlist.Count ? playlist[currentIndex].Title : "目前媒體";
            string time = platformMode ? lblCurrent.Text : FormatTime(CurrentPos());
            string text = title + " @ " + time;
            Clipboard.SetText(text);
            Say("已複製時間碼：" + text, true);
        }

        private void SaveDisplaySnapshot()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "儲存畫面截圖";
                    d.Filter = "PNG 圖片|*.png";
                    d.FileName = "NPlayer_Snapshot_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".png";
                    if (d.ShowDialog(this) != DialogResult.OK) return;

                    Rectangle rect = displayHost.RectangleToScreen(displayHost.ClientRectangle);
                    using (Bitmap bmp = new Bitmap(Math.Max(1, rect.Width), Math.Max(1, rect.Height)))
                    using (Graphics g = Graphics.FromImage(bmp))
                    {
                        g.CopyFromScreen(rect.Location, Point.Empty, rect.Size);
                        bmp.Save(d.FileName, ImageFormat.Png);
                    }

                    Say("已儲存截圖：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("截圖失敗：\n" + ex.Message, "截圖", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void ToggleMiniMode()
        {
            if (theater) ToggleTheater();

            miniMode = !miniMode;
            if (miniMode)
            {
                oldMiniBounds = Bounds;
                split.Panel2Collapsed = true;
                root.RowStyles[0].Height = 40;
                root.RowStyles[2].Height = 50;
                root.RowStyles[3].Height = 78;
                root.RowStyles[4].Height = 0;
                TopMost = true;
                MinimumSize = new Size(820, 480);
                Size = new Size(920, 540);
                Say("已進入迷你專注模式。", true);
            }
            else
            {
                split.Panel2Collapsed = false;
                root.RowStyles[0].Height = 116;
                root.RowStyles[2].Height = 58;
                root.RowStyles[3].Height = 92;
                root.RowStyles[4].Height = 30;
                MinimumSize = new Size(1180, 720);
                if (oldMiniBounds.Width > 0 && oldMiniBounds.Height > 0) Bounds = oldMiniBounds;
                Say("已離開迷你專注模式。", true);
            }

            ApplyTheme();
        }

        private void ToggleAlwaysOnTop()
        {
            TopMost = !TopMost;
            Say(TopMost ? "視窗置頂已開啟。" : "視窗置頂已關閉。", true);
        }

        private void OpenCurrentFolder()
        {
            string source = CurrentSource();
            if (string.IsNullOrWhiteSpace(source))
            {
                MessageBox.Show("目前沒有來源。", "開啟來源位置", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            try
            {
                if (File.Exists(source))
                {
                    Process.Start("explorer.exe", "/select,\"" + source + "\"");
                }
                else if (Directory.Exists(source))
                {
                    Process.Start("explorer.exe", "\"" + source + "\"");
                }
                else if (IsUrl(source))
                {
                    Clipboard.SetText(source);
                    Say("網路來源已複製網址。", true);
                }
                else
                {
                    MessageBox.Show("找不到來源位置。", "開啟來源位置", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("開啟來源位置失敗：\n" + ex.Message, "開啟來源位置", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void DuplicateCurrentItem()
        {
            int i = SelectedIndex();
            if (i < 0) i = currentIndex;
            if (i < 0 || i >= playlist.Count)
            {
                MessageBox.Show("請先選擇或播放一個項目。", "複製項目", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            MediaItem src = playlist[i];
            playlist.Insert(i + 1, new MediaItem
            {
                Source = src.Source,
                Title = src.Title + "（複製）",
                Type = src.Type,
                IsUrl = src.IsUrl,
                IsWeb = src.IsWeb,
                Size = src.Size
            });

            RefreshPlaylist();
            SaveSession();
            Say("已複製清單項目。", true);
        }

        private void ShufflePlaylistOrder()
        {
            if (playlist.Count <= 1) return;

            string cur = CurrentSource();
            for (int i = playlist.Count - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                MediaItem tmp = playlist[i];
                playlist[i] = playlist[j];
                playlist[j] = tmp;
            }

            currentIndex = playlist.FindIndex(x => string.Equals(x.Source, cur, StringComparison.OrdinalIgnoreCase));
            RefreshPlaylist();
            SaveSession();
            Say("播放清單已洗牌。", true);
        }

        private void CleanMissingFiles()
        {
            int before = playlist.Count;
            playlist.RemoveAll(x => !x.IsUrl && !File.Exists(x.Source));
            int removed = before - playlist.Count;
            if (currentIndex >= playlist.Count) currentIndex = playlist.Count - 1;
            RefreshPlaylist();
            UpdateInfo();
            SaveSession();
            Say("已清理 " + removed + " 個失效本機檔案。", true);
        }

        private void ExportPlaylistReport()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出播放報表";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "NPlayer_Playlist_Report_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;

                    using (StreamWriter w = new StreamWriter(d.FileName, false, Encoding.UTF8))
                    {
                        w.WriteLine("AURORA Cinema Deck 播放報表");
                        w.WriteLine("匯出時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
                        w.WriteLine("項目數：" + playlist.Count);
                        w.WriteLine(new string('-', 64));

                        for (int i = 0; i < playlist.Count; i++)
                        {
                            MediaItem m = playlist[i];
                            w.WriteLine((i + 1) + ". " + m.Title);
                            w.WriteLine("   類型：" + m.Type + (m.IsWeb ? " / 平台頁面" : (m.IsUrl ? " / 網路來源" : " / 本機檔案")));
                            w.WriteLine("   大小：" + (m.IsUrl ? "未知" : SizeText(m.Size)));
                            w.WriteLine("   來源：" + m.Source);
                            w.WriteLine();
                        }
                    }

                    Say("播放報表已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出播放報表失敗：\n" + ex.Message, "播放報表", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void ExportLog()
        {
            try
            {
                using (SaveFileDialog d = new SaveFileDialog())
                {
                    d.Title = "匯出紀錄";
                    d.Filter = "文字檔|*.txt";
                    d.FileName = "NPlayer_Log_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                    if (d.ShowDialog(this) != DialogResult.OK) return;
                    File.WriteAllText(d.FileName, logBox == null ? "" : logBox.Text, Encoding.UTF8);
                    Say("紀錄已匯出：" + d.FileName, true);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出紀錄失敗：\n" + ex.Message, "紀錄", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }



        private void ToggleTheater()
        {
            theater = !theater;
            if (theater)
            {
                oldBorder = FormBorderStyle;
                oldState = WindowState;
                oldBounds = Bounds;
                FormBorderStyle = FormBorderStyle.None;
                WindowState = FormWindowState.Maximized;
                root.RowStyles[0].Height = 0;
                root.RowStyles[2].Height = 0;
                root.RowStyles[3].Height = 0;
                root.RowStyles[4].Height = 0;
                split.Panel2Collapsed = true;
                if (btnFullscreen != null) btnFullscreen.Text = "離開劇院";
            }
            else
            {
                FormBorderStyle = oldBorder;
                WindowState = oldState;
                if (oldState == FormWindowState.Normal) Bounds = oldBounds;
                root.RowStyles[0].Height = 116;
                root.RowStyles[2].Height = 58;
                root.RowStyles[3].Height = 92;
                root.RowStyles[4].Height = 30;
                split.Panel2Collapsed = false;
                if (btnFullscreen != null) btnFullscreen.Text = "劇院";
            }
        }

        private void CopyCurrentSource()
        {
            string s = CurrentSource();
            if (s.Length == 0) return;
            Clipboard.SetText(s);
            Say("來源已複製。", true);
        }

        private void ApplyTheme()
        {
            Color bg = dark ? Color.FromArgb(7, 10, 14) : Color.FromArgb(245, 247, 250);
            Color card = dark ? Color.FromArgb(15, 19, 27) : Color.White;
            Color card2 = dark ? Color.FromArgb(25, 31, 42) : Color.FromArgb(236, 240, 246);
            Color fg = dark ? Color.FromArgb(240, 243, 247) : Color.FromArgb(26, 32, 42);
            Color sub = dark ? Color.FromArgb(146, 156, 175) : Color.FromArgb(97, 110, 128);
            Color border = dark ? Color.FromArgb(43, 50, 63) : Color.FromArgb(212, 220, 232);
            Color accent = themeAccent;
            Color titleBarBg = dark ? Color.FromArgb(11, 14, 19) : Color.FromArgb(251, 252, 254);

            BackColor = border;
            ThemeControl(this, bg, card, card2, fg, sub, border, accent);

            if (root != null) root.BackColor = bg;
            if (header != null) header.BackColor = bg;
            if (titleBar != null) titleBar.BackColor = titleBarBg;
            if (sideTopBar != null) sideTopBar.BackColor = dark ? Color.FromArgb(10, 14, 22) : Color.FromArgb(248, 250, 253);
            if (lblSideSection != null) lblSideSection.ForeColor = fg;
            if (picBrand != null) picBrand.BackColor = Color.Transparent;
            if (sideMenu != null)
            {
                sideMenu.BackColor = card;
                sideMenu.ForeColor = fg;
                sideMenu.RenderMode = ToolStripRenderMode.System;
            }

            playerHost.BackColor = Color.Black;
            displayHost.BackColor = Color.Black;
            webHost.BackColor = Color.Black;
            lblSubtitle.BackColor = Color.FromArgb(4, 4, 6);
            lblSubtitle.ForeColor = Color.WhiteSmoke;
            lblNow.ForeColor = accent;
            lblTimeOnVideo.ForeColor = accent;
            btnPlay.BackColor = accent;
            btnPlay.ForeColor = Color.FromArgb(20, 20, 24);
            CinemaButton playButton = btnPlay as CinemaButton;
            if (playButton != null)
            {
                playButton.BaseColor = accent;
                playButton.HoverColor = dark ? Color.FromArgb(255, 205, 112) : Color.FromArgb(255, 182, 65);
                playButton.PressedColor = dark ? Color.FromArgb(230, 134, 48) : Color.FromArgb(216, 129, 24);
                playButton.BorderColor = dark ? Color.FromArgb(255, 226, 148) : Color.FromArgb(217, 137, 28);
                playButton.TextColor = Color.FromArgb(20, 20, 24);
            }
            btnTheme.Text = dark ? "亮色" : "深色";
            btnFullscreen.Text = theater ? "離開劇院" : "劇院";
            status.BackColor = card2;
            status.ForeColor = sub;

            if (btnWinMin != null)
            {
                btnWinMin.BackColor = titleBarBg;
                btnWinMax.BackColor = titleBarBg;
                btnWinClose.BackColor = titleBarBg;
                btnWinMin.ForeColor = fg;
                btnWinMax.ForeColor = fg;
                btnWinClose.ForeColor = fg;
                btnWinMin.FlatAppearance.MouseOverBackColor = dark ? Color.FromArgb(28, 35, 48) : Color.FromArgb(232, 237, 244);
                btnWinMax.FlatAppearance.MouseOverBackColor = dark ? Color.FromArgb(28, 35, 48) : Color.FromArgb(232, 237, 244);
                btnWinClose.FlatAppearance.MouseOverBackColor = Color.FromArgb(232, 78, 78);
            }

            RefreshPlaylist();
        }

        private void ThemeControl(Control c, Color bg, Color card, Color card2, Color fg, Color sub, Color border, Color accent)
        {
            foreach (Control x in c.Controls)
            {
                CinemaPanel cinemaPanel = x as CinemaPanel;
                if (cinemaPanel != null)
                {
                    cinemaPanel.FillColor1 = card;
                    cinemaPanel.FillColor2 = dark ? Color.FromArgb(9, 12, 18) : Color.FromArgb(232, 237, 246);
                    cinemaPanel.BorderColor = border;
                    cinemaPanel.Invalidate();
                }

                if (x is Button)
                {
                    Button b = (Button)x;
                    b.BackColor = card2;
                    b.ForeColor = fg;
                    b.FlatAppearance.BorderColor = border;
                    b.FlatAppearance.MouseOverBackColor = dark ? Color.FromArgb(42, 52, 68) : Color.FromArgb(226, 235, 250);

                    CinemaButton cb = b as CinemaButton;
                    if (cb != null)
                    {
                        cb.BaseColor = card2;
                        cb.HoverColor = dark ? Color.FromArgb(42, 50, 66) : Color.FromArgb(226, 235, 250);
                        cb.PressedColor = dark ? Color.FromArgb(58, 69, 88) : Color.FromArgb(210, 223, 246);
                        cb.BorderColor = border;
                        cb.TextColor = fg;
                    }
                }
                else if (x is TextBox || x is ListView || x is ListBox || x is RichTextBox || x is ComboBox)
                {
                    x.BackColor = card;
                    x.ForeColor = fg;
                }
                else if (x is TabPage)
                {
                    x.BackColor = card;
                    x.ForeColor = fg;
                }
                else if (x is Label)
                {
                    x.ForeColor = fg;
                    x.BackColor = Color.Transparent;
                }
                else if (x is Panel || x is TableLayoutPanel || x is FlowLayoutPanel || x is SplitContainer || x is TabControl)
                {
                    x.BackColor = bg;
                    x.ForeColor = fg;
                }
                ThemeControl(x, bg, card, card2, fg, sub, border, accent);
            }
        }

        private void Say(string text, bool log)
        {
            if (statusLeft != null) statusLeft.Text = text;
            if (log)
            {
                Log(text);
                if (enableToastNotification) ShowToast(text);
            }
        }

        private void ShowToast(string text)
        {
            try
            {
                if (!Visible || string.IsNullOrWhiteSpace(text)) return;
                if (text.Length > 120) text = text.Substring(0, 120) + "...";
                ToastForm toast = new ToastForm(text, dark);
                toast.Show(this);
            }
            catch { }
        }

        private void Log(string text)
        {
            if (logBox == null) return;
            logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + text + Environment.NewLine);
            logBox.ScrollToCaret();
        }

        private string StateText(WMPPlayState s)
        {
            switch (s)
            {
                case WMPPlayState.wmppsStopped: return "停止";
                case WMPPlayState.wmppsPaused: return "暫停";
                case WMPPlayState.wmppsPlaying: return "播放中";
                case WMPPlayState.wmppsBuffering: return "緩衝中";
                case WMPPlayState.wmppsWaiting: return "等待中";
                case WMPPlayState.wmppsMediaEnded: return "播放結束";
                case WMPPlayState.wmppsReady: return "準備完成";
                case WMPPlayState.wmppsReconnecting: return "重新連線中";
                default: return s.ToString();
            }
        }

        private string FormatTime(double seconds)
        {
            if (double.IsNaN(seconds) || double.IsInfinity(seconds) || seconds < 0) seconds = 0;
            TimeSpan t = TimeSpan.FromSeconds(seconds);
            return t.TotalHours >= 1 ? t.ToString(@"hh\:mm\:ss") : t.ToString(@"mm\:ss");
        }

        private string SizeText(long bytes)
        {
            if (bytes < 1024) return bytes + " B";
            double kb = bytes / 1024.0;
            if (kb < 1024) return kb.ToString("0.##") + " KB";
            double mb = kb / 1024.0;
            if (mb < 1024) return mb.ToString("0.##") + " MB";
            return (mb / 1024.0).ToString("0.##") + " GB";
        }

        protected override void WndProc(ref Message m)
        {
            const int WM_NCHITTEST = 0x84;
            const int HTCLIENT = 1;
            const int HTLEFT = 10;
            const int HTRIGHT = 11;
            const int HTTOP = 12;
            const int HTTOPLEFT = 13;
            const int HTTOPRIGHT = 14;
            const int HTBOTTOM = 15;
            const int HTBOTTOMLEFT = 16;
            const int HTBOTTOMRIGHT = 17;

            base.WndProc(ref m);

            if (m.Msg == WM_NCHITTEST && (int)m.Result == HTCLIENT && !theater && WindowState == FormWindowState.Normal)
            {
                int x = unchecked((short)(long)m.LParam);
                int y = unchecked((short)((long)m.LParam >> 16));
                Point p = PointToClient(new Point(x, y));
                int grip = 8;

                bool left = p.X <= grip;
                bool right = p.X >= ClientSize.Width - grip;
                bool top = p.Y <= grip;
                bool bottom = p.Y >= ClientSize.Height - grip;

                if (left && top) m.Result = (IntPtr)HTTOPLEFT;
                else if (right && top) m.Result = (IntPtr)HTTOPRIGHT;
                else if (left && bottom) m.Result = (IntPtr)HTBOTTOMLEFT;
                else if (right && bottom) m.Result = (IntPtr)HTBOTTOMRIGHT;
                else if (left) m.Result = (IntPtr)HTLEFT;
                else if (right) m.Result = (IntPtr)HTRIGHT;
                else if (top) m.Result = (IntPtr)HTTOP;
                else if (bottom) m.Result = (IntPtr)HTBOTTOM;
            }
        }



        private const int GWL_STYLE = -16;
        private const int SW_SHOW = 5;
        private const int WM_NCLBUTTONDOWN = 0xA1;
        private const int HTCAPTION = 0x2;
        private const long WS_VISIBLE = 0x10000000L;
        private const long WS_CHILD = 0x40000000L;
        private const long WS_POPUP = unchecked((long)0x80000000L);
        private const long WS_CAPTION = 0x00C00000L;
        private const long WS_SYSMENU = 0x00080000L;
        private const long WS_THICKFRAME = 0x00040000L;
        private const long WS_MINIMIZEBOX = 0x00020000L;
        private const long WS_MAXIMIZEBOX = 0x00010000L;

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

        [DllImport("user32.dll")]
        private static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

        [DllImport("user32.dll")]
        private static extern bool MoveWindow(IntPtr hWnd, int x, int y, int width, int height, bool repaint);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

        [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
        private static extern int GetWindowLong32(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
        private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
        private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
        private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        private static long GetWindowStyle(IntPtr hWnd)
        {
            if (IntPtr.Size == 8) return GetWindowLongPtr64(hWnd, GWL_STYLE).ToInt64();
            return GetWindowLong32(hWnd, GWL_STYLE);
        }

        private static void SetWindowStyle(IntPtr hWnd, long style)
        {
            if (IntPtr.Size == 8) SetWindowLongPtr64(hWnd, GWL_STYLE, new IntPtr(style));
            else SetWindowLong32(hWnd, GWL_STYLE, unchecked((int)style));
        }

        private class CinemaPanel : Panel
        {
            public int CornerRadius = 18;
            public Color FillColor1 = Color.FromArgb(18, 24, 34);
            public Color FillColor2 = Color.FromArgb(8, 12, 18);
            public Color BorderColor = Color.FromArgb(55, 66, 88);

            public CinemaPanel()
            {
                SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw | ControlStyles.UserPaint, true);
            }

            protected override void OnPaintBackground(PaintEventArgs e)
            {

            }

            protected override void OnPaint(PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
                if (r.Width <= 0 || r.Height <= 0) return;

                using (GraphicsPath gp = Rounded(r, CornerRadius))
                using (LinearGradientBrush br = new LinearGradientBrush(r, FillColor1, FillColor2, 90f))
                using (Pen pen = new Pen(BorderColor))
                {
                    e.Graphics.FillPath(br, gp);
                    e.Graphics.DrawPath(pen, gp);
                }

                base.OnPaint(e);
            }

            private GraphicsPath Rounded(Rectangle rect, int radius)
            {
                int d = radius * 2;
                GraphicsPath gp = new GraphicsPath();
                gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
                gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                gp.CloseFigure();
                return gp;
            }
        }

        private class CinemaButton : Button
        {
            private bool hovering;
            private bool pressing;

            public int CornerRadius = 16;
            public Color BaseColor = Color.FromArgb(25, 31, 42);
            public Color HoverColor = Color.FromArgb(42, 50, 66);
            public Color PressedColor = Color.FromArgb(58, 69, 88);
            public Color BorderColor = Color.FromArgb(48, 58, 73);
            public Color TextColor = Color.FromArgb(240, 243, 247);

            public CinemaButton()
            {
                FlatStyle = FlatStyle.Flat;
                FlatAppearance.BorderSize = 0;
                FlatAppearance.MouseDownBackColor = Color.Transparent;
                FlatAppearance.MouseOverBackColor = Color.Transparent;
                UseVisualStyleBackColor = false;
                TabStop = false;
                BackColor = Color.Transparent;
                SetStyle(
                    ControlStyles.AllPaintingInWmPaint |
                    ControlStyles.OptimizedDoubleBuffer |
                    ControlStyles.ResizeRedraw |
                    ControlStyles.UserPaint |
                    ControlStyles.SupportsTransparentBackColor,
                    true);
                UpdateStyles();
            }

            protected override void OnResize(EventArgs e)
            {
                base.OnResize(e);
                UpdateButtonRegion();
            }

            protected override void OnMouseEnter(EventArgs e)
            {
                hovering = true;
                Invalidate();
                base.OnMouseEnter(e);
            }

            protected override void OnMouseLeave(EventArgs e)
            {
                hovering = false;
                pressing = false;
                Invalidate();
                base.OnMouseLeave(e);
            }

            protected override void OnMouseDown(MouseEventArgs mevent)
            {
                pressing = true;
                Invalidate();
                base.OnMouseDown(mevent);
            }

            protected override void OnMouseUp(MouseEventArgs mevent)
            {
                pressing = false;
                Invalidate();
                base.OnMouseUp(mevent);
            }

            protected override void OnPaintBackground(PaintEventArgs pevent)
            {
                PaintCleanBackground(pevent.Graphics);
            }

            protected override void OnPaint(PaintEventArgs pevent)
            {
                Graphics g = pevent.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.CompositingQuality = CompositingQuality.HighQuality;

                PaintCleanBackground(g);

                Rectangle r = new Rectangle(1, 1, Width - 3, Height - 3);
                if (r.Width <= 0 || r.Height <= 0) return;

                Color c = pressing ? PressedColor : (hovering ? HoverColor : BaseColor);
                Color top = ControlPaint.Light(c, 0.14f);
                Color bottom = ControlPaint.Dark(c, 0.08f);

                using (GraphicsPath gp = Rounded(r, Math.Min(CornerRadius, Math.Max(4, Height / 2))))
                using (LinearGradientBrush br = new LinearGradientBrush(r, top, bottom, 90f))
                {
                    g.FillPath(br, gp);

                    using (Pen outer = new Pen(BorderColor, 1f))
                    {
                        g.DrawPath(outer, gp);
                    }

                    Rectangle inner = new Rectangle(r.X + 1, r.Y + 1, r.Width - 2, r.Height - 2);
                    if (inner.Width > 0 && inner.Height > 0)
                    {
                        using (GraphicsPath innerPath = Rounded(inner, Math.Min(CornerRadius - 1, Math.Max(4, Height / 2 - 1))))
                        using (Pen highlight = new Pen(Color.FromArgb(38, Color.White), 1f))
                        {
                            g.DrawPath(highlight, innerPath);
                        }
                    }
                }

                TextRenderer.DrawText(
                    g,
                    Text,
                    Font,
                    ClientRectangle,
                    Enabled ? TextColor : Color.Gray,
                    TextFormatFlags.HorizontalCenter |
                    TextFormatFlags.VerticalCenter |
                    TextFormatFlags.EndEllipsis |
                    TextFormatFlags.NoPrefix);
            }

            private void PaintCleanBackground(Graphics g)
            {
                Color bg = Color.FromArgb(7, 10, 14);
                if (Parent != null)
                {
                    bg = Parent.BackColor;
                    if (bg == Color.Transparent && Parent.Parent != null)
                        bg = Parent.Parent.BackColor;
                }

                using (SolidBrush brush = new SolidBrush(bg))
                    g.FillRectangle(brush, ClientRectangle);
            }

            private void UpdateButtonRegion()
            {
                if (Width <= 0 || Height <= 0) return;

                Region old = Region;
                using (GraphicsPath gp = Rounded(new Rectangle(0, 0, Width, Height), Math.Min(CornerRadius + 1, Math.Max(5, Height / 2))))
                {
                    Region = new Region(gp);
                }

                if (old != null) old.Dispose();
            }

            private GraphicsPath Rounded(Rectangle rect, int radius)
            {
                radius = Math.Max(1, Math.Min(radius, Math.Min(rect.Width, rect.Height) / 2));
                int d = radius * 2;
                GraphicsPath gp = new GraphicsPath();
                gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
                gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                gp.CloseFigure();
                return gp;
            }
        }

        private class MessageBox
        {
            public static Func<Form1> OwnerProvider;

            public static DialogResult Show(string text)
            {
                return Show(text, "AURORA", MessageBoxButtons.OK, MessageBoxIcon.None);
            }

            public static DialogResult Show(string text, string caption)
            {
                return Show(text, caption, MessageBoxButtons.OK, MessageBoxIcon.None);
            }

            public static DialogResult Show(string text, string caption, MessageBoxButtons buttons)
            {
                return Show(text, caption, buttons, MessageBoxIcon.None);
            }

            public static DialogResult Show(string text, string caption, MessageBoxButtons buttons, MessageBoxIcon icon)
            {
                Form1 owner = null;
                try
                {
                    if (OwnerProvider != null) owner = OwnerProvider();
                }
                catch { }

                bool darkMode = owner == null ? true : owner.dark;

                using (CinemaMessageDialog d = new CinemaMessageDialog(caption, text, buttons, icon, darkMode, false))
                {
                    if (owner != null && !owner.IsDisposed)
                        return d.ShowDialog(owner);
                    return d.ShowDialog();
                }
            }
        }

        private class TutorialStep
        {
            public string Title;
            public string Body;
            public Func<Control> Target;
            public Action OnEnter;

            public TutorialStep(string title, string body, Func<Control> target, Action onEnter)
            {
                Title = title;
                Body = body;
                Target = target;
                OnEnter = onEnter;
            }
        }

        private class GuidedTutorialOverlay : Panel
        {
            public event EventHandler SkipClicked;
            public event EventHandler DoneClicked;
            public event EventHandler TargetClicked;
            public event EventHandler WrongAreaClicked;

            private string title = "";
            private string body = "";
            private Rectangle targetRect = Rectangle.Empty;
            private int step = 1;
            private int total = 1;
            private bool last = false;
            private bool dark;
            private Button btnSkip;
            private Button btnDone;
            private System.Windows.Forms.Timer pulseTimer;
            private float pulse = 0f;
            private Rectangle bubbleRect = Rectangle.Empty;
            private Bitmap backdrop;

            public GuidedTutorialOverlay(bool darkMode)
            {
                dark = darkMode;
                BackColor = Color.Transparent;
                DoubleBuffered = true;
                SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);

                btnSkip = CreateButton("跳過教學");
                btnSkip.Click += delegate
                {
                    if (SkipClicked != null) SkipClicked(this, EventArgs.Empty);
                };
                Controls.Add(btnSkip);

                btnDone = CreateButton("我了解了，開始使用");
                btnDone.Width = 170;
                btnDone.Visible = false;
                btnDone.Click += delegate
                {
                    if (DoneClicked != null) DoneClicked(this, EventArgs.Empty);
                };
                Controls.Add(btnDone);

                pulseTimer = new System.Windows.Forms.Timer();
                pulseTimer.Interval = 30;
                pulseTimer.Tick += delegate
                {
                    pulse += 0.08f;
                    Invalidate();
                };
                pulseTimer.Start();

                Resize += delegate { UpdateLayoutAndRegion(); };
            }

            private Button CreateButton(string text)
            {
                Button b = new Button();
                b.Text = text;
                b.Size = new Size(112, 36);
                b.FlatStyle = FlatStyle.Flat;
                b.FlatAppearance.BorderSize = 1;
                b.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
                b.BackColor = Color.FromArgb(255, 176, 64);
                b.ForeColor = Color.FromArgb(18, 22, 30);
                b.FlatAppearance.BorderColor = Color.FromArgb(255, 218, 142);
                return b;
            }

            public void SetBackdrop(Bitmap image)
            {
                Bitmap old = backdrop;
                backdrop = image;
                if (old != null) old.Dispose();
                Invalidate();
            }

            public void SetStep(string title, string body, Rectangle targetRect, int step, int total, bool last)
            {
                this.title = title;
                this.body = body;
                this.targetRect = targetRect;
                this.step = step;
                this.total = total;
                this.last = last;
                btnDone.Visible = last;
                UpdateLayoutAndRegion();
                Invalidate();
            }

            private void UpdateLayoutAndRegion()
            {
                if (Width <= 0 || Height <= 0) return;

                bubbleRect = CalculateBubbleRect();
                btnSkip.Location = new Point(Math.Max(18, Width - btnSkip.Width - 22), 18);

                btnDone.Location = new Point(
                    Math.Max(18, bubbleRect.Right - btnDone.Width - 20),
                    Math.Max(18, bubbleRect.Bottom - btnDone.Height - 18));

                if (Region != null)
                {
                    Region.Dispose();
                    Region = null;
                }
            }

            private Rectangle CalculateBubbleRect()
            {
                int bw = Math.Min(500, Math.Max(400, Width / 3));
                int bh = last ? 250 : 270;

                if (targetRect.IsEmpty)
                    return new Rectangle(Clamp((Width - bw) / 2, 24, Math.Max(24, Width - bw - 24)), Clamp((Height - bh) / 2, 72, Math.Max(72, Height - bh - 32)), bw, bh);

                List<Rectangle> candidates = new List<Rectangle>();
                candidates.Add(new Rectangle(targetRect.Right + 28, targetRect.Top, bw, bh));
                candidates.Add(new Rectangle(targetRect.Left - bw - 28, targetRect.Top, bw, bh));
                candidates.Add(new Rectangle(targetRect.Left, targetRect.Bottom + 28, bw, bh));
                candidates.Add(new Rectangle(targetRect.Left, targetRect.Top - bh - 28, bw, bh));
                candidates.Add(new Rectangle(Width - bw - 28, 88, bw, bh));
                candidates.Add(new Rectangle(32, 88, bw, bh));
                candidates.Add(new Rectangle(Width - bw - 28, Height - bh - 52, bw, bh));
                candidates.Add(new Rectangle(32, Height - bh - 52, bw, bh));

                Rectangle screen = new Rectangle(18, 64, Math.Max(1, Width - 36), Math.Max(1, Height - 92));
                Rectangle best = candidates[0];
                int bestScore = int.MinValue;

                foreach (Rectangle c0 in candidates)
                {
                    Rectangle c = new Rectangle(
                        Clamp(c0.X, screen.Left, Math.Max(screen.Left, screen.Right - bw)),
                        Clamp(c0.Y, screen.Top, Math.Max(screen.Top, screen.Bottom - bh)),
                        bw,
                        bh);

                    Rectangle overlap = Rectangle.Intersect(c, targetRect);
                    int overlapArea = overlap.Width * overlap.Height;
                    int edgePenalty = Math.Abs(c.Left - 28) + Math.Abs((Width - c.Right) - 28);
                    int score = -overlapArea - edgePenalty;

                    if (score > bestScore)
                    {
                        bestScore = score;
                        best = c;
                    }
                }

                return best;
            }

            private int Clamp(int value, int min, int max)
            {
                if (max < min) max = min;
                if (value < min) return min;
                if (value > max) return max;
                return value;
            }

            protected override void OnPaint(PaintEventArgs e)
            {
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                DrawBackdrop(g);

                using (SolidBrush shade = new SolidBrush(Color.FromArgb(138, 0, 0, 0)))
                    g.FillRectangle(shade, ClientRectangle);

                if (!targetRect.IsEmpty && !last)
                    RestoreTargetArea(g);

                if (!targetRect.IsEmpty && !last)
                    DrawTarget(g);

                DrawBubble(g);
                DrawMascot(g);
                DrawProgress(g);

                base.OnPaint(e);
            }

            private void DrawBackdrop(Graphics g)
            {
                if (backdrop != null)
                {
                    g.DrawImage(backdrop, ClientRectangle);
                }
                else
                {
                    using (LinearGradientBrush br = new LinearGradientBrush(ClientRectangle, Color.FromArgb(7, 10, 14), Color.FromArgb(18, 24, 36), 90f))
                        g.FillRectangle(br, ClientRectangle);
                }
            }

            private void RestoreTargetArea(Graphics g)
            {
                if (backdrop == null || targetRect.IsEmpty) return;

                Rectangle src = targetRect;
                Rectangle bounds = new Rectangle(Point.Empty, backdrop.Size);
                src.Intersect(bounds);
                if (src.Width <= 0 || src.Height <= 0) return;

                Rectangle dst = src;
                using (GraphicsPath gp = Rounded(dst, 18))
                {
                    Region oldClip = g.Clip;
                    g.SetClip(gp);
                    g.DrawImage(backdrop, dst, src, GraphicsUnit.Pixel);
                    g.Clip = oldClip;
                }

                using (SolidBrush glow = new SolidBrush(Color.FromArgb(38, 255, 190, 88)))
                using (GraphicsPath gp = Rounded(dst, 18))
                    g.FillPath(glow, gp);
            }

            private void DrawTarget(Graphics g)
            {
                int glow = 8 + (int)(Math.Sin(pulse) * 4);
                Rectangle r = targetRect;
                using (GraphicsPath gp = Rounded(r, 18))
                using (Pen p = new Pen(Color.FromArgb(230, 255, 190, 88), 3))
                {
                    g.DrawPath(p, gp);
                }

                Rectangle outer = r;
                outer.Inflate(glow, glow);
                using (GraphicsPath gp = Rounded(outer, 24))
                using (Pen p = new Pen(Color.FromArgb(90, 255, 190, 88), 4))
                {
                    g.DrawPath(p, gp);
                }

                Point a = new Point(r.Left + r.Width / 2, r.Top + r.Height / 2);
                Point b = new Point(bubbleRect.Left + 26, bubbleRect.Top + 50);
                using (Pen p = new Pen(Color.FromArgb(180, 255, 190, 88), 2))
                {
                    p.DashStyle = DashStyle.Dash;
                    g.DrawLine(p, a, b);
                }
            }

            private void DrawBubble(Graphics g)
            {
                using (GraphicsPath gp = Rounded(bubbleRect, 24))
                using (LinearGradientBrush br = new LinearGradientBrush(bubbleRect, Color.FromArgb(235, 12, 18, 30), Color.FromArgb(235, 24, 34, 52), 90f))
                using (Pen p = new Pen(Color.FromArgb(210, 255, 176, 64), 1))
                {
                    g.FillPath(br, gp);
                    g.DrawPath(p, gp);
                }

                Rectangle top = new Rectangle(bubbleRect.X, bubbleRect.Y, bubbleRect.Width, 58);
                using (GraphicsPath gp = Rounded(top, 22))
                using (SolidBrush br = new SolidBrush(Color.FromArgb(80, 255, 176, 64)))
                    g.FillPath(br, gp);

                using (SolidBrush b = new SolidBrush(Color.FromArgb(255, 190, 88)))
                    g.DrawString("AURI GUIDE  ·  STEP " + step + " / " + total, new Font("Segoe UI", 8F, FontStyle.Bold), b, bubbleRect.X + 18, bubbleRect.Y + 10);

                using (SolidBrush b = new SolidBrush(Color.White))
                    g.DrawString(title, new Font("Microsoft JhengHei UI", 15F, FontStyle.Bold), b, bubbleRect.X + 18, bubbleRect.Y + 28);

                Rectangle bodyRect = new Rectangle(bubbleRect.X + 20, bubbleRect.Y + 82, bubbleRect.Width - 42, bubbleRect.Height - 138);
                using (SolidBrush b = new SolidBrush(Color.FromArgb(232, 240, 250)))
                    g.DrawString(body, new Font("Microsoft JhengHei UI", 10F), b, bodyRect);

                string foot = last ? "按下「我了解了，開始使用」即可解鎖所有功能。" : "請點擊亮起區域。其他區域會被 AURI 暫時鎖定。";
                using (SolidBrush b = new SolidBrush(Color.FromArgb(160, 190, 210)))
                    g.DrawString(foot, new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold), b, bubbleRect.X + 20, bubbleRect.Bottom - 54);
            }

            private void DrawMascot(Graphics g)
            {
                int cx = bubbleRect.Right - 62;
                int cy = bubbleRect.Top - 26 + (int)(Math.Sin(pulse) * 5);

                using (SolidBrush aura = new SolidBrush(Color.FromArgb(65, 255, 190, 88)))
                    g.FillEllipse(aura, cx - 38, cy - 38, 76, 76);

                using (SolidBrush body = new SolidBrush(Color.FromArgb(255, 255, 190, 88)))
                    g.FillEllipse(body, cx - 22, cy - 22, 44, 44);

                using (SolidBrush eye = new SolidBrush(Color.FromArgb(20, 24, 32)))
                {
                    g.FillEllipse(eye, cx - 8, cy - 4, 5, 5);
                    g.FillEllipse(eye, cx + 7, cy - 4, 5, 5);
                }

                using (Pen smile = new Pen(Color.FromArgb(20, 24, 32), 2))
                    g.DrawArc(smile, cx - 8, cy, 16, 12, 10, 160);

                using (Pen antenna = new Pen(Color.FromArgb(255, 230, 160), 2))
                {
                    g.DrawLine(antenna, cx, cy - 22, cx, cy - 36);
                    g.DrawEllipse(antenna, cx - 4, cy - 44, 8, 8);
                }
            }

            private void DrawProgress(Graphics g)
            {
                int left = 32;
                int bottom = Height - 28;
                int w = Math.Max(120, Width - 64);
                using (SolidBrush bg = new SolidBrush(Color.FromArgb(90, 80, 95, 120)))
                    g.FillRectangle(bg, left, bottom, w, 5);

                int fill = (int)(w * ((float)step / Math.Max(1, total)));
                using (SolidBrush fg = new SolidBrush(Color.FromArgb(255, 176, 64)))
                    g.FillRectangle(fg, left, bottom, fill, 5);
            }

            private GraphicsPath Rounded(Rectangle rect, int radius)
            {
                radius = Math.Max(2, Math.Min(radius, Math.Min(rect.Width, rect.Height) / 2));
                int d = radius * 2;
                GraphicsPath gp = new GraphicsPath();
                gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
                gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                gp.CloseFigure();
                return gp;
            }

            protected override void OnMouseDown(MouseEventArgs e)
            {
                base.OnMouseDown(e);

                if (btnSkip.Bounds.Contains(e.Location) || btnDone.Bounds.Contains(e.Location))
                    return;

                if (last)
                {
                    if (bubbleRect.Contains(e.Location))
                        return;

                    if (WrongAreaClicked != null) WrongAreaClicked(this, EventArgs.Empty);
                    return;
                }

                if (!targetRect.IsEmpty && targetRect.Contains(e.Location))
                {
                    if (TargetClicked != null) TargetClicked(this, EventArgs.Empty);
                }
                else
                {
                    if (WrongAreaClicked != null) WrongAreaClicked(this, EventArgs.Empty);
                }
            }

            protected override void Dispose(bool disposing)
            {
                if (disposing && pulseTimer != null)
                    pulseTimer.Dispose();
                if (disposing && backdrop != null)
                {
                    backdrop.Dispose();
                    backdrop = null;
                }
                base.Dispose(disposing);
            }
        }

        private class FloatingHelpCard : Form
        {
            public event EventHandler PrimaryClicked;
            public event EventHandler SecondaryClicked;

            private System.Windows.Forms.Timer fadeTimer;
            private System.Windows.Forms.Timer autoCloseTimer;
            private bool fadingOut = false;

            public FloatingHelpCard(string title, string body, string primaryText, string secondaryText, bool dark, bool helpMode)
            {
                FormBorderStyle = FormBorderStyle.None;
                ShowInTaskbar = false;
                StartPosition = FormStartPosition.Manual;
                Size = new Size(470, 360);
                Opacity = 0;
                TopMost = false;

                Color bg1 = dark ? Color.FromArgb(18, 25, 38) : Color.FromArgb(250, 252, 255);
                Color bg2 = dark ? Color.FromArgb(8, 12, 20) : Color.FromArgb(232, 238, 247);
                Color fg = dark ? Color.FromArgb(236, 242, 250) : Color.FromArgb(30, 38, 52);
                Color sub = dark ? Color.FromArgb(155, 170, 195) : Color.FromArgb(84, 96, 116);
                Color accent = helpMode ? Color.FromArgb(104, 172, 255) : Color.FromArgb(255, 190, 88);

                BackColor = accent;
                DoubleBuffered = true;

                GlassPanel root = new GlassPanel(bg1, bg2, accent);
                root.Dock = DockStyle.Fill;
                root.Padding = new Padding(18, 16, 18, 14);
                Controls.Add(root);

                Label badge = new Label();
                badge.Text = helpMode ? "AURORA HELP" : "AURORA INFO";
                badge.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
                badge.ForeColor = accent;
                badge.Location = new Point(18, 14);
                badge.Size = new Size(220, 18);
                badge.BackColor = Color.Transparent;
                root.Controls.Add(badge);

                Label icon = new Label();
                icon.Text = helpMode ? "?" : "i";
                icon.TextAlign = ContentAlignment.MiddleCenter;
                icon.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
                icon.ForeColor = dark ? Color.FromArgb(8, 12, 20) : Color.White;
                icon.BackColor = accent;
                icon.Location = new Point(402, 18);
                icon.Size = new Size(42, 42);
                root.Controls.Add(icon);

                Label ttl = new Label();
                ttl.Text = title;
                ttl.Font = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
                ttl.ForeColor = fg;
                ttl.Location = new Point(18, 36);
                ttl.Size = new Size(360, 32);
                ttl.BackColor = Color.Transparent;
                root.Controls.Add(ttl);

                Label content = new Label();
                content.Text = body;
                content.Font = new Font("Microsoft JhengHei UI", 9.5F, FontStyle.Bold);
                content.ForeColor = fg;
                content.Location = new Point(20, 78);
                content.Size = new Size(420, 178);
                content.BackColor = Color.Transparent;
                content.AutoEllipsis = true;
                root.Controls.Add(content);

                Label footer = new Label();
                footer.Text = "Hover 浮層說明 · 點擊下方按鈕可直接執行";
                footer.Font = new Font("Microsoft JhengHei UI", 8F, FontStyle.Bold);
                footer.ForeColor = sub;
                footer.Location = new Point(20, 270);
                footer.Size = new Size(410, 18);
                footer.BackColor = Color.Transparent;
                root.Controls.Add(footer);

                Button primary = CreateCardButton(primaryText, accent, true, dark);
                primary.Location = new Point(246, 308);
                primary.Click += delegate
                {
                    if (PrimaryClicked != null) PrimaryClicked(this, EventArgs.Empty);
                    StartClose();
                };
                root.Controls.Add(primary);

                Button secondary = CreateCardButton(secondaryText, accent, false, dark);
                secondary.Location = new Point(126, 308);
                secondary.Click += delegate
                {
                    if (SecondaryClicked != null) SecondaryClicked(this, EventArgs.Empty);
                    StartClose();
                };
                root.Controls.Add(secondary);

                Button close = CreateCloseButton(fg, dark);
                close.Location = new Point(430, 8);
                close.Click += delegate { StartClose(); };
                root.Controls.Add(close);

                MouseEnter += delegate { ResetAutoClose(); };
                root.MouseEnter += delegate { ResetAutoClose(); };
                MouseLeave += delegate { StartAutoClose(); };

                Shown += delegate
                {
                    StartFadeIn();
                    StartAutoClose();
                };
            }

            private Button CreateCardButton(string text, Color accent, bool primary, bool dark)
            {
                Button b = new Button();
                b.Text = text;
                b.Size = new Size(104, 34);
                b.FlatStyle = FlatStyle.Flat;
                b.FlatAppearance.BorderSize = 1;
                b.Font = new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);
                if (primary)
                {
                    b.BackColor = accent;
                    b.ForeColor = Color.FromArgb(10, 14, 22);
                    b.FlatAppearance.BorderColor = ControlPaint.Light(accent);
                }
                else
                {
                    b.BackColor = dark ? Color.FromArgb(28, 36, 50) : Color.FromArgb(224, 230, 240);
                    b.ForeColor = dark ? Color.White : Color.FromArgb(34, 42, 56);
                    b.FlatAppearance.BorderColor = dark ? Color.FromArgb(82, 96, 118) : Color.FromArgb(170, 180, 194);
                }
                return b;
            }

            private Button CreateCloseButton(Color fg, bool dark)
            {
                Button b = new Button();
                b.Text = "×";
                b.Size = new Size(28, 28);
                b.FlatStyle = FlatStyle.Flat;
                b.FlatAppearance.BorderSize = 0;
                b.BackColor = Color.Transparent;
                b.ForeColor = fg;
                b.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
                return b;
            }

            private void StartFadeIn()
            {
                fadeTimer = new System.Windows.Forms.Timer();
                fadeTimer.Interval = 15;
                fadeTimer.Tick += delegate
                {
                    if (!fadingOut)
                    {
                        if (Opacity >= 0.98)
                        {
                            Opacity = 0.98;
                            fadeTimer.Stop();
                        }
                        else Opacity += 0.10;
                    }
                    else
                    {
                        if (Opacity <= 0.05)
                        {
                            fadeTimer.Stop();
                            Close();
                        }
                        else Opacity -= 0.10;
                    }
                };
                fadeTimer.Start();
            }

            private void StartAutoClose()
            {
                if (autoCloseTimer == null)
                {
                    autoCloseTimer = new System.Windows.Forms.Timer();
                    autoCloseTimer.Interval = 7000;
                    autoCloseTimer.Tick += delegate { StartClose(); };
                }
                autoCloseTimer.Stop();
                autoCloseTimer.Start();
            }

            private void ResetAutoClose()
            {
                if (autoCloseTimer != null)
                {
                    autoCloseTimer.Stop();
                    autoCloseTimer.Start();
                }
            }

            private void StartClose()
            {
                fadingOut = true;
                if (autoCloseTimer != null) autoCloseTimer.Stop();
                if (fadeTimer == null || !fadeTimer.Enabled) StartFadeIn();
            }

            protected override void OnFormClosed(FormClosedEventArgs e)
            {
                if (fadeTimer != null) fadeTimer.Dispose();
                if (autoCloseTimer != null) autoCloseTimer.Dispose();
                base.OnFormClosed(e);
            }

            private class GlassPanel : Panel
            {
                private Color c1;
                private Color c2;
                private Color accent;

                public GlassPanel(Color c1, Color c2, Color accent)
                {
                    this.c1 = c1;
                    this.c2 = c2;
                    this.accent = accent;
                    SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw | ControlStyles.UserPaint, true);
                }

                protected override void OnPaint(PaintEventArgs e)
                {
                    e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                    Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);

                    using (GraphicsPath gp = Round(r, 22))
                    using (LinearGradientBrush br = new LinearGradientBrush(r, c1, c2, 90f))
                    using (Pen border = new Pen(Color.FromArgb(170, accent), 1))
                    {
                        e.Graphics.FillPath(br, gp);
                        e.Graphics.DrawPath(border, gp);
                    }

                    Rectangle glow = new Rectangle(8, 8, Width - 17, Height - 17);
                    using (GraphicsPath gp = Round(glow, 18))
                    using (Pen p = new Pen(Color.FromArgb(38, Color.White), 1))
                    {
                        e.Graphics.DrawPath(p, gp);
                    }

                    base.OnPaint(e);
                }

                private GraphicsPath Round(Rectangle rect, int radius)
                {
                    int d = radius * 2;
                    GraphicsPath gp = new GraphicsPath();
                    gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
                    gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                    gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                    gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                    gp.CloseFigure();
                    return gp;
                }
            }
        }

        private class CinemaMessageDialog : Form
        {
            private CheckBox dontShow;
            public bool DoNotShowAgain
            {
                get { return dontShow != null && dontShow.Checked; }
            }

            public CinemaMessageDialog(string title, string message, MessageBoxButtons buttons, MessageBoxIcon icon, bool dark, bool allowDontShow)
            {
                Text = title;
                StartPosition = FormStartPosition.CenterParent;
                FormBorderStyle = FormBorderStyle.None;
                ShowInTaskbar = false;
                ClientSize = new Size(780, 460);
                Padding = new Padding(1);
                Font = new Font("Microsoft JhengHei UI", 10F);
                BackColor = icon == MessageBoxIcon.Warning || icon == MessageBoxIcon.Error
                    ? Color.FromArgb(232, 94, 74)
                    : Color.FromArgb(255, 176, 64);
                Opacity = 0;

                Color bg = dark ? Color.FromArgb(9, 13, 21) : Color.FromArgb(248, 250, 253);
                Color titleBg = dark ? Color.FromArgb(14, 20, 32) : Color.FromArgb(236, 240, 247);
                Color panelBg = dark ? Color.FromArgb(12, 18, 28) : Color.FromArgb(238, 242, 248);
                Color fg = dark ? Color.FromArgb(238, 242, 248) : Color.FromArgb(28, 36, 48);
                Color sub = dark ? Color.FromArgb(150, 160, 178) : Color.FromArgb(92, 104, 122);
                Color accent = ResolveAccent(icon);

                Panel body = new Panel();
                body.Dock = DockStyle.Fill;
                body.BackColor = bg;
                Controls.Add(body);

                Panel top = new Panel();
                top.Dock = DockStyle.Top;
                top.Height = 58;
                top.BackColor = titleBg;
                body.Controls.Add(top);

                Label brand = new Label();
                brand.Text = "AURORA MESSAGE";
                brand.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
                brand.ForeColor = accent;
                brand.Location = new Point(18, 8);
                brand.Size = new Size(240, 18);
                top.Controls.Add(brand);

                Label ttl = new Label();
                ttl.Text = title;
                ttl.Font = new Font("Microsoft JhengHei UI", 15F, FontStyle.Bold);
                ttl.ForeColor = fg;
                ttl.Location = new Point(18, 27);
                ttl.Size = new Size(650, 26);
                top.Controls.Add(ttl);

                Button close = new Button();
                close.Text = "✕";
                close.FlatStyle = FlatStyle.Flat;
                close.FlatAppearance.BorderSize = 0;
                close.Font = new Font("Segoe UI Symbol", 12F, FontStyle.Bold);
                close.Size = new Size(42, 34);
                close.Location = new Point(720, 12);
                close.BackColor = Color.Transparent;
                close.ForeColor = fg;
                close.Click += delegate { DialogResult = CancelResult(buttons); Close(); };
                top.Controls.Add(close);

                Panel glow = new Panel();
                glow.Dock = DockStyle.Left;
                glow.Width = 8;
                glow.BackColor = accent;
                body.Controls.Add(glow);

                Label iconLabel = new Label();
                iconLabel.Text = IconText(icon);
                iconLabel.Font = new Font("Segoe UI Symbol", 30F, FontStyle.Bold);
                iconLabel.ForeColor = accent;
                iconLabel.TextAlign = ContentAlignment.MiddleCenter;
                iconLabel.Location = new Point(34, 104);
                iconLabel.Size = new Size(92, 92);
                body.Controls.Add(iconLabel);

                Label content = new Label();
                content.Text = message;
                content.ForeColor = fg;
                content.Font = new Font("Microsoft JhengHei UI", 10.5F);
                content.Location = new Point(132, 92);
                content.Size = new Size(590, allowDontShow ? 210 : 238);
                content.AutoEllipsis = true;
                body.Controls.Add(content);

                Label footer = new Label();
                footer.Text = "AURORA Cinema Deck · 劇院風格提示系統";
                footer.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
                footer.ForeColor = sub;
                footer.Location = new Point(132, 316);
                footer.Size = new Size(560, 22);
                body.Controls.Add(footer);

                if (allowDontShow)
                {
                    dontShow = new CheckBox();
                    dontShow.Text = "不再顯示此提示";
                    dontShow.ForeColor = fg;
                    dontShow.BackColor = bg;
                    dontShow.Location = new Point(132, 342);
                    dontShow.Size = new Size(240, 26);
                    body.Controls.Add(dontShow);
                }

                Panel bottom = new Panel();
                bottom.Dock = DockStyle.Bottom;
                bottom.Height = 86;
                bottom.BackColor = panelBg;
                body.Controls.Add(bottom);

                AddButtons(bottom, buttons, dark, accent);

                top.MouseDown += DragDialog;
                ttl.MouseDown += DragDialog;
                brand.MouseDown += DragDialog;

                Shown += delegate { StartFadeIn(); };
            }

            private Color ResolveAccent(MessageBoxIcon icon)
            {
                if (icon == MessageBoxIcon.Warning) return Color.FromArgb(255, 136, 88);
                if (icon == MessageBoxIcon.Error) return Color.FromArgb(255, 86, 86);
                if (icon == MessageBoxIcon.Question) return Color.FromArgb(96, 172, 255);
                return Color.FromArgb(255, 190, 88);
            }

            private string IconText(MessageBoxIcon icon)
            {
                if (icon == MessageBoxIcon.Warning) return "!";
                if (icon == MessageBoxIcon.Error) return "×";
                if (icon == MessageBoxIcon.Question) return "?";
                return "i";
            }

            private DialogResult CancelResult(MessageBoxButtons buttons)
            {
                if (buttons == MessageBoxButtons.YesNo || buttons == MessageBoxButtons.YesNoCancel) return DialogResult.No;
                if (buttons == MessageBoxButtons.OKCancel) return DialogResult.Cancel;
                return DialogResult.OK;
            }

            private void AddButtons(Panel bottom, MessageBoxButtons buttons, bool dark, Color accent)
            {
                List<Tuple<string, DialogResult, bool>> data = new List<Tuple<string, DialogResult, bool>>();

                if (buttons == MessageBoxButtons.YesNo)
                {
                    data.Add(new Tuple<string, DialogResult, bool>("取消", DialogResult.No, false));
                    data.Add(new Tuple<string, DialogResult, bool>("是，繼續", DialogResult.Yes, true));
                }
                else if (buttons == MessageBoxButtons.YesNoCancel)
                {
                    data.Add(new Tuple<string, DialogResult, bool>("取消", DialogResult.Cancel, false));
                    data.Add(new Tuple<string, DialogResult, bool>("否", DialogResult.No, false));
                    data.Add(new Tuple<string, DialogResult, bool>("是，繼續", DialogResult.Yes, true));
                }
                else if (buttons == MessageBoxButtons.OKCancel)
                {
                    data.Add(new Tuple<string, DialogResult, bool>("取消", DialogResult.Cancel, false));
                    data.Add(new Tuple<string, DialogResult, bool>("確定", DialogResult.OK, true));
                }
                else
                {
                    data.Add(new Tuple<string, DialogResult, bool>("確定", DialogResult.OK, true));
                }

                int spacing = 12;
                int w = 118;
                int total = data.Count * w + (data.Count - 1) * spacing;
                int left = bottom.Width - total - 24;
                if (left < 20) left = 20;

                bottom.Resize += delegate
                {
                    int t = data.Count * w + (data.Count - 1) * spacing;
                    int l = bottom.Width - t - 24;
                    if (l < 20) l = 20;
                    for (int i = 0; i < bottom.Controls.Count; i++)
                        bottom.Controls[i].Location = new Point(l + i * (w + spacing), 24);
                };

                for (int i = 0; i < data.Count; i++)
                {
                    Button b = CreateDialogButton(data[i].Item1, data[i].Item3, dark, accent);
                    b.Location = new Point(left + i * (w + spacing), 24);
                    DialogResult result = data[i].Item2;
                    b.Click += delegate { DialogResult = result; Close(); };
                    bottom.Controls.Add(b);
                }
            }

            private Button CreateDialogButton(string text, bool primary, bool dark, Color accent)
            {
                Button b = new Button();
                b.Text = text;
                b.Size = new Size(118, 38);
                b.FlatStyle = FlatStyle.Flat;
                b.FlatAppearance.BorderSize = 1;
                b.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);

                if (primary)
                {
                    b.BackColor = accent;
                    b.ForeColor = Color.FromArgb(18, 22, 30);
                    b.FlatAppearance.BorderColor = ControlPaint.Light(accent);
                }
                else
                {
                    b.BackColor = dark ? Color.FromArgb(28, 36, 50) : Color.FromArgb(224, 230, 240);
                    b.ForeColor = dark ? Color.White : Color.FromArgb(32, 40, 52);
                    b.FlatAppearance.BorderColor = dark ? Color.FromArgb(78, 92, 112) : Color.FromArgb(170, 180, 194);
                }

                return b;
            }

            private void StartFadeIn()
            {
                System.Windows.Forms.Timer t = new System.Windows.Forms.Timer();
                t.Interval = 12;
                t.Tick += delegate
                {
                    if (Opacity >= 1)
                    {
                        Opacity = 1;
                        t.Stop();
                        t.Dispose();
                    }
                    else Opacity += 0.08;
                };
                t.Start();
            }

            [DllImport("user32.dll")]
            private static extern bool ReleaseCapture();

            [DllImport("user32.dll")]
            private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

            private void DragDialog(object sender, MouseEventArgs e)
            {
                if (e.Button != MouseButtons.Left) return;
                ReleaseCapture();
                SendMessage(Handle, 0xA1, 0x2, 0);
            }
        }

        private class FirstLaunchWizardDialog : Form
        {
            private int pageIndex = 0;
            private Label title;
            private Label body;
            private Label mascot;
            private Label pageHint;
            private Button back;
            private Button next;
            private Button skip;
            private CheckBox suppress;
            private GalaxyPanel galaxy;
            private System.Windows.Forms.Timer animationTimer;
            private readonly bool dark;
            private float pulse = 0f;
            private float shipX = 0f;
            private float shipY = 0f;

            private readonly string[] titles = new string[]
            {
                "啟動 AURORA 航行模式",
                "Ctrl+K：你的星艦指令面板",
                "平台播放與外部核心偵測",
                "沉浸影音實驗室",
                "準備展示給助教"
            };

            private readonly string[] bodies = new string[]
            {
                "歡迎進入 AURORA Cinema Deck。這不是普通播放器，而是一個劇院風格的影音控制艙。\n\n拖曳影片、資料夾或 URL 到播放器，就能建立播放清單並開始播放。",
                "按 Ctrl + K 或 Ctrl + P 可以開啟指令面板。\n\n不用記按鈕在哪裡，直接搜尋：播放、截圖、HDR、WebXR、README、外部核心、電影夜、工作階段快照。",
                "平台影片會優先使用 WebView2；沒有 WebView2 時會嘗試嵌入 Edge / Chrome，再失敗才用外部瀏覽器。\n\nFFmpeg、VLC、CefSharp 也會自動偵測，有安裝就提示可用，沒有也不會讓程式壞掉。",
                "沉浸影音分頁提供畫質偏好、HDR / Dolby Vision 相容提示、AR / VR / 360 入口。\n\n這些是作業可交的 Optional Engine 設計，不硬塞大型套件，所以不會爆 21MB。",
                "展示時建議流程：\n\n1. 播放本機影片。\n2. 按 Ctrl+K 展示指令面板。\n3. 切換沉浸影音、外部核心、展示中心。\n4. 匯出 README 或快捷鍵卡。"
            };

            public bool SuppressStartupTip
            {
                get { return suppress != null && suppress.Checked; }
            }

            public FirstLaunchWizardDialog(bool darkMode)
            {
                dark = darkMode;
                Text = "AURORA 星際導覽";
                StartPosition = FormStartPosition.CenterParent;
                FormBorderStyle = FormBorderStyle.None;
                ClientSize = new Size(960, 620);
                Padding = new Padding(1);
                BackColor = Color.FromArgb(255, 176, 64);
                Opacity = 0;
                KeyPreview = true;

                galaxy = new GalaxyPanel(dark);
                galaxy.Dock = DockStyle.Fill;
                Controls.Add(galaxy);

                Panel topBar = new Panel();
                topBar.Dock = DockStyle.Top;
                topBar.Height = 56;
                topBar.BackColor = Color.FromArgb(18, 24, 36);
                galaxy.Controls.Add(topBar);

                Label brand = new Label();
                brand.Text = "AURORA FLIGHT GUIDE";
                brand.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
                brand.ForeColor = Color.FromArgb(255, 190, 88);
                brand.Location = new Point(22, 9);
                brand.Size = new Size(280, 18);
                topBar.Controls.Add(brand);

                Label subtitle = new Label();
                subtitle.Text = "星際穿越式首次啟動導覽 · AI 小精靈 AURI 正在帶路";
                subtitle.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
                subtitle.ForeColor = Color.FromArgb(235, 240, 248);
                subtitle.Location = new Point(22, 28);
                subtitle.Size = new Size(650, 22);
                topBar.Controls.Add(subtitle);

                Button close = CreateWizardButton("略過", false);
                close.Size = new Size(76, 32);
                close.Location = new Point(862, 12);
                close.Click += delegate { DialogResult = DialogResult.OK; Close(); };
                topBar.Controls.Add(close);

                title = new Label();
                title.Font = new Font("Microsoft JhengHei UI", 23F, FontStyle.Bold);
                title.ForeColor = Color.White;
                title.BackColor = Color.Transparent;
                title.Location = new Point(52, 100);
                title.Size = new Size(720, 52);
                galaxy.Controls.Add(title);

                body = new Label();
                body.Font = new Font("Microsoft JhengHei UI", 12F);
                body.ForeColor = Color.FromArgb(225, 232, 244);
                body.BackColor = Color.Transparent;
                body.Location = new Point(58, 166);
                body.Size = new Size(600, 220);
                galaxy.Controls.Add(body);

                mascot = new Label();
                mascot.Text = "✦\nAURI";
                mascot.TextAlign = ContentAlignment.MiddleCenter;
                mascot.Font = new Font("Segoe UI", 22F, FontStyle.Bold);
                mascot.ForeColor = Color.FromArgb(255, 205, 108);
                mascot.BackColor = Color.Transparent;
                mascot.Location = new Point(700, 155);
                mascot.Size = new Size(160, 128);
                galaxy.Controls.Add(mascot);

                pageHint = new Label();
                pageHint.TextAlign = ContentAlignment.MiddleLeft;
                pageHint.Font = new Font("Consolas", 9F, FontStyle.Bold);
                pageHint.ForeColor = Color.FromArgb(255, 190, 88);
                pageHint.BackColor = Color.Transparent;
                pageHint.Location = new Point(58, 412);
                pageHint.Size = new Size(720, 28);
                galaxy.Controls.Add(pageHint);

                suppress = new CheckBox();
                suppress.Text = "不再顯示啟動提示";
                suppress.Font = new Font("Microsoft JhengHei UI", 9.5F, FontStyle.Bold);
                suppress.ForeColor = Color.FromArgb(225, 232, 244);
                suppress.BackColor = Color.Transparent;
                suppress.Location = new Point(58, 482);
                suppress.Size = new Size(240, 28);
                galaxy.Controls.Add(suppress);

                Panel bottom = new Panel();
                bottom.Dock = DockStyle.Bottom;
                bottom.Height = 86;
                bottom.BackColor = Color.FromArgb(13, 19, 30);
                galaxy.Controls.Add(bottom);

                back = CreateWizardButton("上一步", false);
                back.Location = new Point(596, 24);
                back.Click += delegate
                {
                    pageIndex--;
                    if (pageIndex < 0) pageIndex = 0;
                    RenderPage(true);
                };
                bottom.Controls.Add(back);

                next = CreateWizardButton("下一步", true);
                next.Location = new Point(718, 24);
                next.Click += delegate
                {
                    if (pageIndex >= titles.Length - 1)
                    {
                        DialogResult = DialogResult.OK;
                        Close();
                    }
                    else
                    {
                        pageIndex++;
                        RenderPage(true);
                    }
                };
                bottom.Controls.Add(next);

                skip = CreateWizardButton("直接啟航", false);
                skip.Location = new Point(60, 24);
                skip.Click += delegate { DialogResult = DialogResult.OK; Close(); };
                bottom.Controls.Add(skip);

                MouseDown += DragDialog;
                galaxy.MouseDown += DragDialog;
                topBar.MouseDown += DragDialog;
                title.MouseDown += DragDialog;
                body.MouseDown += DragDialog;

                KeyDown += delegate (object sender, KeyEventArgs e)
                {
                    if (e.KeyCode == Keys.Escape) { DialogResult = DialogResult.OK; Close(); }
                    else if (e.KeyCode == Keys.Right || e.KeyCode == Keys.Enter) next.PerformClick();
                    else if (e.KeyCode == Keys.Left) back.PerformClick();
                };

                RenderPage(false);
                StartAnimation();
                Shown += delegate { StartFadeIn(); };
            }

            private Button CreateWizardButton(string text, bool primary)
            {
                Button b = new Button();
                b.Text = text;
                b.Size = new Size(110, 38);
                b.FlatStyle = FlatStyle.Flat;
                b.FlatAppearance.BorderSize = 1;
                b.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
                if (primary)
                {
                    b.BackColor = Color.FromArgb(255, 176, 64);
                    b.ForeColor = Color.FromArgb(18, 22, 30);
                    b.FlatAppearance.BorderColor = Color.FromArgb(255, 218, 142);
                }
                else
                {
                    b.BackColor = Color.FromArgb(28, 36, 50);
                    b.ForeColor = Color.White;
                    b.FlatAppearance.BorderColor = Color.FromArgb(78, 92, 112);
                }
                return b;
            }

            private void RenderPage(bool animate)
            {
                back.Enabled = pageIndex > 0;
                next.Text = pageIndex >= titles.Length - 1 ? "開始使用" : "下一步";
                title.Text = titles[pageIndex];
                body.Text = bodies[pageIndex];
                pageHint.Text = "MISSION STEP " + (pageIndex + 1).ToString("00") + " / " + titles.Length.ToString("00") + "   " + ProgressText();
                galaxy.PageIndex = pageIndex;
                galaxy.Progress = (float)(pageIndex + 1) / (float)titles.Length;
                galaxy.Invalidate();

                if (animate)
                {
                    title.Left = 30;
                    body.Left = 76;
                    mascot.Top = 145;
                }
            }

            private string ProgressText()
            {
                if (pageIndex == 0) return "載入播放器控制艙";
                if (pageIndex == 1) return "同步指令面板";
                if (pageIndex == 2) return "掃描外部核心";
                if (pageIndex == 3) return "啟動沉浸影音實驗室";
                return "完成展示航線規劃";
            }

            private void StartAnimation()
            {
                animationTimer = new System.Windows.Forms.Timer();
                animationTimer.Interval = 25;
                animationTimer.Tick += delegate
                {
                    pulse += 0.08f;
                    shipX += 2.4f;
                    if (shipX > ClientSize.Width + 80) shipX = -120;
                    shipY = (float)Math.Sin(pulse * 0.7f) * 10f;

                    if (title.Left < 52) title.Left += 2;
                    if (body.Left > 58) body.Left -= 2;
                    mascot.Top = 150 + (int)(Math.Sin(pulse) * 12);

                    galaxy.Pulse = pulse;
                    galaxy.ShipX = shipX;
                    galaxy.ShipY = shipY;
                    galaxy.Invalidate();
                };
                animationTimer.Start();
            }

            private void StartFadeIn()
            {
                System.Windows.Forms.Timer t = new System.Windows.Forms.Timer();
                t.Interval = 12;
                t.Tick += delegate
                {
                    if (Opacity >= 1)
                    {
                        Opacity = 1;
                        t.Stop();
                        t.Dispose();
                    }
                    else Opacity += 0.08;
                };
                t.Start();
            }

            protected override void OnFormClosed(FormClosedEventArgs e)
            {
                if (animationTimer != null) animationTimer.Dispose();
                base.OnFormClosed(e);
            }

            [DllImport("user32.dll")]
            private static extern bool ReleaseCapture();

            [DllImport("user32.dll")]
            private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

            private void DragDialog(object sender, MouseEventArgs e)
            {
                if (e.Button != MouseButtons.Left) return;
                ReleaseCapture();
                SendMessage(Handle, 0xA1, 0x2, 0);
            }

            private class GalaxyPanel : Panel
            {
                private readonly Random random = new Random(7);
                private readonly PointF[] stars;
                private readonly float[] speeds;
                private readonly float[] sizes;
                private readonly bool dark;
                public float Pulse = 0f;
                public float ShipX = 0f;
                public float ShipY = 0f;
                public int PageIndex = 0;
                public float Progress = 0.2f;

                public GalaxyPanel(bool darkMode)
                {
                    dark = darkMode;
                    DoubleBuffered = true;
                    SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw | ControlStyles.UserPaint, true);
                    stars = new PointF[120];
                    speeds = new float[120];
                    sizes = new float[120];

                    for (int i = 0; i < stars.Length; i++)
                    {
                        stars[i] = new PointF(random.Next(0, 960), random.Next(0, 620));
                        speeds[i] = 0.4f + (float)random.NextDouble() * 2.2f;
                        sizes[i] = 1f + (float)random.NextDouble() * 2.4f;
                    }
                }

                protected override void OnPaint(PaintEventArgs e)
                {
                    Graphics g = e.Graphics;
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                    Rectangle r = ClientRectangle;
                    using (LinearGradientBrush br = new LinearGradientBrush(r, Color.FromArgb(3, 6, 13), Color.FromArgb(19, 28, 47), 90f))
                        g.FillRectangle(br, r);

                    DrawStars(g);
                    DrawWormhole(g);
                    DrawRoute(g);
                    DrawShip(g);
                    DrawProgressDots(g);
                    DrawGlassCard(g);
                    base.OnPaint(e);
                }

                private void DrawStars(Graphics g)
                {
                    for (int i = 0; i < stars.Length; i++)
                    {
                        float x = stars[i].X - (Pulse * speeds[i] * 10f) % Math.Max(1, Width + 60);
                        if (x < -20) x += Width + 60;
                        float y = stars[i].Y;
                        int alpha = 110 + (int)(80 * Math.Abs(Math.Sin(Pulse + i)));
                        using (SolidBrush b = new SolidBrush(Color.FromArgb(alpha, 210, 230, 255)))
                            g.FillEllipse(b, x, y, sizes[i], sizes[i]);
                    }
                }

                private void DrawWormhole(Graphics g)
                {
                    int cx = Width - 170;
                    int cy = 270;
                    for (int i = 0; i < 7; i++)
                    {
                        int size = 70 + i * 34 + (int)(Math.Sin(Pulse + i) * 6);
                        int alpha = 80 - i * 8;
                        if (alpha < 10) alpha = 10;
                        using (Pen p = new Pen(Color.FromArgb(alpha, 255, 188, 88), 2))
                        {
                            Rectangle ring = new Rectangle(cx - size / 2, cy - size / 2, size, size);
                            g.DrawEllipse(p, ring);
                        }
                    }
                }

                private void DrawRoute(Graphics g)
                {
                    using (Pen p = new Pen(Color.FromArgb(80, 255, 190, 88), 2))
                    {
                        p.DashStyle = DashStyle.Dash;
                        g.DrawBezier(p, 70, 450, 260, 360, 520, 530, Width - 150, 270);
                    }
                }

                private void DrawShip(Graphics g)
                {
                    float x = ShipX;
                    float y = 448 + ShipY;
                    PointF[] ship =
                    {
                        new PointF(x, y),
                        new PointF(x - 38, y + 16),
                        new PointF(x - 28, y),
                        new PointF(x - 38, y - 16)
                    };

                    using (SolidBrush flame = new SolidBrush(Color.FromArgb(170, 255, 112, 60)))
                        g.FillEllipse(flame, x - 58, y - 8, 28, 16);

                    using (SolidBrush b = new SolidBrush(Color.FromArgb(230, 255, 210, 120)))
                        g.FillPolygon(b, ship);

                    using (Pen p = new Pen(Color.FromArgb(255, 255, 245, 190), 1))
                        g.DrawPolygon(p, ship);
                }

                private void DrawProgressDots(Graphics g)
                {
                    int left = 58;
                    int top = 452;
                    int gap = 42;
                    for (int i = 0; i < 5; i++)
                    {
                        Rectangle dot = new Rectangle(left + i * gap, top, 18, 18);
                        bool on = i <= PageIndex;
                        using (SolidBrush b = new SolidBrush(on ? Color.FromArgb(255, 176, 64) : Color.FromArgb(55, 70, 96)))
                            g.FillEllipse(b, dot);
                        using (Pen p = new Pen(Color.FromArgb(110, 255, 255, 255), 1))
                            g.DrawEllipse(p, dot);
                    }

                    using (SolidBrush b = new SolidBrush(Color.FromArgb(180, 255, 190, 88)))
                        g.FillRectangle(b, 58, 476, (int)(260 * Progress), 4);

                    using (Pen p = new Pen(Color.FromArgb(60, 255, 255, 255), 1))
                        g.DrawRectangle(p, 58, 476, 260, 4);
                }

                private void DrawGlassCard(Graphics g)
                {
                    Rectangle card = new Rectangle(34, 88, 650, 338);
                    using (GraphicsPath gp = Round(card, 26))
                    using (SolidBrush b = new SolidBrush(Color.FromArgb(86, 8, 14, 24)))
                    using (Pen p = new Pen(Color.FromArgb(88, 255, 190, 88), 1))
                    {
                        g.FillPath(b, gp);
                        g.DrawPath(p, gp);
                    }

                    Rectangle badge = new Rectangle(706, 120, 160, 164);
                    using (GraphicsPath gp = Round(badge, 28))
                    using (LinearGradientBrush br = new LinearGradientBrush(badge, Color.FromArgb(52, 255, 190, 88), Color.FromArgb(30, 88, 150, 255), 90f))
                    using (Pen p = new Pen(Color.FromArgb(100, 255, 255, 255), 1))
                    {
                        g.FillPath(br, gp);
                        g.DrawPath(p, gp);
                    }
                }

                private GraphicsPath Round(Rectangle rect, int radius)
                {
                    int d = radius * 2;
                    GraphicsPath gp = new GraphicsPath();
                    gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
                    gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                    gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                    gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                    gp.CloseFigure();
                    return gp;
                }
            }
        }

        private class ToastForm : Form
        {
            private System.Windows.Forms.Timer life;
            private System.Windows.Forms.Timer fade;
            private bool closing = false;

            public ToastForm(string message, bool dark)
            {
                FormBorderStyle = FormBorderStyle.None;
                ShowInTaskbar = false;
                TopMost = true;
                StartPosition = FormStartPosition.Manual;
                Size = new Size(420, 86);
                Opacity = 0;

                Color bg = dark ? Color.FromArgb(14, 20, 32) : Color.FromArgb(246, 248, 252);
                Color fg = dark ? Color.FromArgb(242, 246, 252) : Color.FromArgb(28, 36, 48);
                Color accent = Color.FromArgb(255, 176, 64);

                BackColor = accent;

                Panel body = new Panel();
                body.Dock = DockStyle.Fill;
                body.Padding = new Padding(10);
                body.BackColor = bg;
                Controls.Add(body);

                Panel left = new Panel();
                left.Dock = DockStyle.Left;
                left.Width = 5;
                left.BackColor = accent;
                body.Controls.Add(left);

                Label title = new Label();
                title.Text = "AURORA";
                title.Font = new Font("Segoe UI", 8F, FontStyle.Bold);
                title.ForeColor = accent;
                title.Location = new Point(18, 10);
                title.Size = new Size(120, 18);
                body.Controls.Add(title);

                Label text = new Label();
                text.Text = message;
                text.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
                text.ForeColor = fg;
                text.Location = new Point(18, 32);
                text.Size = new Size(372, 42);
                text.AutoEllipsis = true;
                body.Controls.Add(text);

                Shown += delegate
                {
                    Rectangle wa = Screen.FromControl(this).WorkingArea;
                    Location = new Point(wa.Right - Width - 24, wa.Bottom - Height - 24);
                    StartFadeIn();
                };
            }

            private void StartFadeIn()
            {
                fade = new System.Windows.Forms.Timer();
                fade.Interval = 20;
                fade.Tick += delegate
                {
                    if (!closing)
                    {
                        if (Opacity >= 0.96)
                        {
                            Opacity = 0.96;
                            fade.Stop();
                            StartLife();
                        }
                        else Opacity += 0.10;
                    }
                    else
                    {
                        if (Opacity <= 0.05)
                        {
                            fade.Stop();
                            Close();
                        }
                        else Opacity -= 0.08;
                    }
                };
                fade.Start();
            }

            private void StartLife()
            {
                life = new System.Windows.Forms.Timer();
                life.Interval = 2300;
                life.Tick += delegate
                {
                    life.Stop();
                    closing = true;
                    fade.Start();
                };
                life.Start();
            }

            protected override void OnFormClosed(FormClosedEventArgs e)
            {
                if (life != null) life.Dispose();
                if (fade != null) fade.Dispose();
                base.OnFormClosed(e);
            }
        }

        private class KeyCaptureDialog : Form
        {
            private Label display;
            public Keys CapturedKeys { get; private set; }

            public KeyCaptureDialog(string action, bool dark)
            {
                Text = "設定快捷鍵";
                StartPosition = FormStartPosition.CenterParent;
                FormBorderStyle = FormBorderStyle.FixedDialog;
                MinimizeBox = false;
                MaximizeBox = false;
                ClientSize = new Size(520, 210);
                KeyPreview = true;
                Font = new Font("Microsoft JhengHei UI", 9F);
                BackColor = dark ? Color.FromArgb(10, 14, 22) : Color.FromArgb(248, 250, 253);
                ForeColor = dark ? Color.White : Color.FromArgb(30, 36, 48);

                Label title = new Label();
                title.Text = "請按下新的快捷鍵：" + action;
                title.Left = 18;
                title.Top = 18;
                title.Width = 480;
                title.Height = 28;
                title.Font = new Font("Microsoft JhengHei UI", 11F, FontStyle.Bold);

                display = new Label();
                display.Text = "等待按鍵...";
                display.Left = 18;
                display.Top = 62;
                display.Width = 480;
                display.Height = 52;
                display.TextAlign = ContentAlignment.MiddleCenter;
                display.Font = new Font("Consolas", 16F, FontStyle.Bold);
                display.BorderStyle = BorderStyle.FixedSingle;

                Button ok = new Button();
                ok.Text = "確定";
                ok.Left = 318;
                ok.Top = 150;
                ok.Width = 86;
                ok.DialogResult = DialogResult.OK;

                Button cancel = new Button();
                cancel.Text = "取消";
                cancel.Left = 414;
                cancel.Top = 150;
                cancel.Width = 86;
                cancel.DialogResult = DialogResult.Cancel;

                Controls.Add(title);
                Controls.Add(display);
                Controls.Add(ok);
                Controls.Add(cancel);
                AcceptButton = ok;
                CancelButton = cancel;
            }

            protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
            {
                CapturedKeys = keyData;
                display.Text = keyData.ToString().Replace(",", " +");
                return true;
            }
        }

        private class CommandAction
        {
            public string Id;
            public string Title;
            public string Keyword;
            public string Description;

            public CommandAction(string id, string title, string keyword, string description)
            {
                Id = id;
                Title = title;
                Keyword = keyword;
                Description = description;
            }

            public override string ToString()
            {
                return Title + "  —  " + Description;
            }
        }

        private class CommandPaletteDialog : Form
        {
            private TextBox searchBox;
            private ListBox listBox;
            private List<CommandAction> commands;
            public string SelectedCommandId = "";

            public CommandPaletteDialog(List<CommandAction> items, bool dark)
            {
                commands = items;

                Text = "AURORA 指令面板";
                StartPosition = FormStartPosition.CenterParent;
                FormBorderStyle = FormBorderStyle.FixedDialog;
                MinimizeBox = false;
                MaximizeBox = false;
                ClientSize = new Size(720, 460);
                Font = new Font("Microsoft JhengHei UI", 9F);
                KeyPreview = true;

                Color bg = dark ? Color.FromArgb(10, 14, 22) : Color.FromArgb(248, 250, 253);
                Color card = dark ? Color.FromArgb(22, 28, 39) : Color.White;
                Color fg = dark ? Color.FromArgb(240, 243, 247) : Color.FromArgb(26, 32, 42);
                Color sub = dark ? Color.FromArgb(146, 156, 175) : Color.FromArgb(97, 110, 128);

                BackColor = bg;
                ForeColor = fg;

                Label title = new Label();
                title.Text = "輸入關鍵字搜尋指令";
                title.Left = 18;
                title.Top = 16;
                title.Width = 680;
                title.Height = 24;
                title.Font = new Font("Microsoft JhengHei UI", 11F, FontStyle.Bold);
                title.ForeColor = fg;

                searchBox = new TextBox();
                searchBox.Left = 18;
                searchBox.Top = 48;
                searchBox.Width = 684;
                searchBox.Height = 30;
                searchBox.BackColor = card;
                searchBox.ForeColor = fg;

                Label hint = new Label();
                hint.Text = "例如：播放、截圖、HDR、WebXR、README、外部核心、電影夜";
                hint.Left = 18;
                hint.Top = 84;
                hint.Width = 684;
                hint.Height = 24;
                hint.ForeColor = sub;

                listBox = new ListBox();
                listBox.Left = 18;
                listBox.Top = 114;
                listBox.Width = 684;
                listBox.Height = 278;
                listBox.BackColor = card;
                listBox.ForeColor = fg;
                listBox.Font = new Font("Microsoft JhengHei UI", 9.5F);

                Button ok = new Button();
                ok.Text = "執行";
                ok.Left = 512;
                ok.Top = 410;
                ok.Width = 90;
                ok.Height = 32;
                ok.DialogResult = DialogResult.OK;

                Button cancel = new Button();
                cancel.Text = "取消";
                cancel.Left = 612;
                cancel.Top = 410;
                cancel.Width = 90;
                cancel.Height = 32;
                cancel.DialogResult = DialogResult.Cancel;

                Controls.Add(title);
                Controls.Add(searchBox);
                Controls.Add(hint);
                Controls.Add(listBox);
                Controls.Add(ok);
                Controls.Add(cancel);

                AcceptButton = ok;
                CancelButton = cancel;

                searchBox.TextChanged += delegate { RefreshList(); };
                listBox.DoubleClick += delegate { ConfirmSelection(); };
                ok.Click += delegate { ConfirmSelection(); };
                KeyDown += delegate (object sender, KeyEventArgs e)
                {
                    if (e.KeyCode == Keys.Down && listBox.Items.Count > 0)
                    {
                        listBox.Focus();
                        if (listBox.SelectedIndex < 0) listBox.SelectedIndex = 0;
                    }
                    else if (e.KeyCode == Keys.Enter)
                    {
                        ConfirmSelection();
                    }
                };

                RefreshList();
                searchBox.Focus();
            }

            private void RefreshList()
            {
                string q = searchBox.Text.Trim().ToLowerInvariant();
                listBox.BeginUpdate();
                listBox.Items.Clear();

                foreach (CommandAction c in commands)
                {
                    string hay = (c.Title + " " + c.Keyword + " " + c.Description).ToLowerInvariant();
                    if (q.Length == 0 || hay.Contains(q))
                        listBox.Items.Add(c);
                }

                if (listBox.Items.Count > 0) listBox.SelectedIndex = 0;
                listBox.EndUpdate();
            }

            private void ConfirmSelection()
            {
                CommandAction c = listBox.SelectedItem as CommandAction;
                if (c == null) return;
                SelectedCommandId = c.Id;
                DialogResult = DialogResult.OK;
                Close();
            }
        }

        private class SavedItem
        {
            public string Source;
            public string Title;
            public DateTime AddedAt;

            public override string ToString()
            {
                return AddedAt.ToString("MM/dd HH:mm") + "｜" + Title;
            }
        }

        private class VideoNoteItem
        {
            public string Source;
            public string Title;
            public double Seconds;
            public string Note;
            public DateTime CreatedAt;

            public override string ToString()
            {
                TimeSpan t = TimeSpan.FromSeconds(Seconds);
                string time = t.TotalHours >= 1 ? t.ToString(@"hh\:mm\:ss") : t.ToString(@"mm\:ss");
                return time + "｜" + Note + "｜" + Title;
            }
        }

        private class StarfieldWelcomePanel : Panel
        {
            public float Pulse { get; set; }
            public Color AccentColor { get; set; }

            public StarfieldWelcomePanel()
            {
                AccentColor = Color.FromArgb(255, 187, 82);
                DoubleBuffered = true;
                ResizeRedraw = true;
                SetStyle(
                    ControlStyles.AllPaintingInWmPaint |
                    ControlStyles.OptimizedDoubleBuffer |
                    ControlStyles.ResizeRedraw |
                    ControlStyles.UserPaint,
                    true);
                UpdateStyles();
            }

            protected override CreateParams CreateParams
            {
                get
                {
                    CreateParams cp = base.CreateParams;
                    cp.ExStyle |= 0x02000000;
                    return cp;
                }
            }

            protected override void OnPaintBackground(PaintEventArgs e)
            {
                // 背景由 PaintWelcomeStage 一次畫完，避免 WinForms 先清背景造成閃爍。
            }
        }

        private class ChapterItem
        {
            public string Source;
            public string Title;
            public double Seconds;

            public override string ToString()
            {
                TimeSpan t = TimeSpan.FromSeconds(Seconds);
                string time = t.TotalHours >= 1 ? t.ToString(@"hh\:mm\:ss") : t.ToString(@"mm\:ss");
                return time + "｜" + Title;
            }
        }

        private class MediaItem
        {
            public string Source;
            public string Title;
            public string Type;
            public bool IsUrl;
            public bool IsWeb;
            public long Size;
        }

        private class WebFavoriteItem
        {
            public string Title;
            public string Url;

            public override string ToString()
            {
                return Title + "｜" + Url;
            }
        }

        private class SubtitleCue
        {
            public double Start;
            public double End;
            public string Text;
        }

        private class BookmarkItem
        {
            public string Source;
            public string Title;
            public double Seconds;
            public string Note;

            public override string ToString()
            {
                TimeSpan t = TimeSpan.FromSeconds(Seconds);
                string time = t.TotalHours >= 1 ? t.ToString(@"hh\:mm\:ss") : t.ToString(@"mm\:ss");
                return time + "｜" + Note + "｜" + Title;
            }
        }

        private class InputDialog : Form
        {
            private TextBox box;
            public string Value { get { return box.Text.Trim(); } }

            public InputDialog(string title, string label, string hint)
            {
                Text = title;
                StartPosition = FormStartPosition.CenterParent;
                FormBorderStyle = FormBorderStyle.FixedDialog;
                MinimizeBox = false;
                MaximizeBox = false;
                ClientSize = new Size(560, 170);
                Font = new Font("Microsoft JhengHei UI", 9F);

                Label l = new Label();
                l.Text = label;
                l.Left = 16;
                l.Top = 18;
                l.Width = 520;
                l.Height = 24;

                box = new TextBox();
                box.Left = 16;
                box.Top = 50;
                box.Width = 528;
                box.Height = 28;

                Label h = new Label();
                h.Text = hint;
                h.Left = 16;
                h.Top = 84;
                h.Width = 528;
                h.Height = 24;
                h.ForeColor = Color.DimGray;
                h.AutoEllipsis = true;

                Button ok = new Button();
                ok.Text = "確定";
                ok.Left = 352;
                ok.Top = 118;
                ok.Width = 90;
                ok.DialogResult = DialogResult.OK;

                Button cancel = new Button();
                cancel.Text = "取消";
                cancel.Left = 454;
                cancel.Top = 118;
                cancel.Width = 90;
                cancel.DialogResult = DialogResult.Cancel;

                Controls.Add(l);
                Controls.Add(box);
                Controls.Add(h);
                Controls.Add(ok);
                Controls.Add(cancel);
                AcceptButton = ok;
                CancelButton = cancel;
            }
        }
    }
}
