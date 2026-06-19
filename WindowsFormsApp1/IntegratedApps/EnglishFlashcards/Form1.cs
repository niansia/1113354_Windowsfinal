// ============================================================================
// TSV Studio Product Edition - Form1.cs
// 版本：3.6 Professional Learning Platform Motion Polish - C# 7.3
// 用途：把原本的 TSV 檔案讀取器升級成產品級 WinForms 工具
// 特點：豪華 UI、內建字庫、頁內播放器、測驗模式、學習資料庫、音檔治理、Command Palette、圖表儀表板、可選 NuGet 擴充中心、首頁、匯入精靈、學習歷程、Anki 匯出、HTML 報告與 Toast 通知
// 使用方式：
//   1. 建議先備份原專案。
//   2. 將本檔內容覆蓋原本的 Form1.cs。
//   3. 可保留原本的 Form1.Designer.cs；本版本會自行建立 UI，不依賴設計器控制項。
//   4. 核心功能不需要 NuGet；進階功能可於「擴充中心」查看可選套件與部署說明。
// ============================================================================

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Data.OleDb;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Media;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;
using WinFormsTimer = System.Windows.Forms.Timer;

namespace _1113354_陳冠瑋
{
    public partial class Form1 : Form
    {
        private readonly List<WordItem> _allWords = new List<WordItem>();
        private readonly BindingSource _bindingSource = new BindingSource();
        private readonly TsvLoader _loader = new TsvLoader();
        private readonly WordInsightEngine _insightEngine = new WordInsightEngine();
        private readonly RecentFileStore _recentFileStore = new RecentFileStore();
        private readonly InlineAudioPlayer _audioPlayer = new InlineAudioPlayer();
        private readonly LocalWordDatabase _localDatabase = new LocalWordDatabase();
        private readonly LearningStore _learningStore = new LearningStore();
        private readonly LearningHistoryStore _learningHistory = new LearningHistoryStore();
        private readonly WinFormsTimer _searchTimer = new WinFormsTimer();
        private readonly WinFormsTimer _playerTimer = new WinFormsTimer();
        private readonly Random _quizRandom = new Random();

        private CancellationTokenSource _loadCts;
        private string _currentFilePath = string.Empty;
        private string _currentBaseDirectory = string.Empty;
        private bool _darkMode = true;
        private bool _showRowNumber = true;
        private string _lastSortProperty = "Word";
        private bool _sortAscending = true;
        private ThemeProfile _activeTheme = ThemeProfile.GetDefaultDark();
        private int _quizTotal;
        private int _quizCorrect;
        private int _quizCorrectIndex = -1;
        private WordItem _quizCurrentItem;

        private MenuStrip _menu;
        private Panel _toolBar;
        private StatusStrip _statusStrip;
        private ToolStripStatusLabel _statusLabel;
        private ToolStripProgressBar _progressBar;
        private ToolStripStatusLabel _clockLabel;
        private ToolStripTextBox _searchBox;
        private ToolStripComboBox _riskComboBox;
        private SplitContainer _mainSplit;
        private SplitContainer _rightSplit;
        private FlowLayoutPanel _cardsPanel;
        private ListBox _issueList;
        private DataGridView _grid;
        private TabControl _bottomTabs;
        private TextBox _previewText;
        private TextBox _logText;
        private TextBox _statsText;
        private TextBox _securityText;
        private Panel _playerPanel;
        private TabPage _playerTab;
        private Label _playerWordLabel;
        private Label _playerPathLabel;
        private Label _playerStatusLabel;
        private Button _playerPlayButton;
        private Button _playerSpeakButton;
        private Button _playerStopButton;
        private Button _playerPauseButton;
        private Button _playerResumeButton;
        private Button _playerPrevButton;
        private Button _playerNextButton;
        private ProgressBar _playerProgressBar;
        private Label _playerTimeLabel;
        private TrackBar _volumeTrackBar;
        private CheckBox _playerAutoNextCheckBox;
        private CheckBox _playerLoopCheckBox;
        private TabPage _detailTab;
        private TextBox _detailWordBox;
        private TextBox _detailPhonogramBox;
        private TextBox _detailSoundPathBox;
        private TextBox _detailExplainBox;
        private Label _detailMetaLabel;
        private CheckBox _detailFavoriteCheckBox;
        private CheckBox _detailLearnedCheckBox;
        private TabPage _quizTab;
        private Label _quizQuestionLabel;
        private Label _quizScoreLabel;
        private Label _quizFeedbackLabel;
        private ComboBox _quizModeComboBox;
        private CheckBox _quizAutoSpeakCheckBox;
        private Button[] _quizButtons = new Button[4];
        private TextBox _audioScanText;
        private TabPage _audioScanTab;
        private TextBox _extensionText;
        private TabPage _extensionTab;
        private TextBox _studyPlanText;
        private TabPage _studyPlanTab;
        private VisualDashboardPanel _chartPanel;
        private TabPage _chartTab;
        private ToolStripComboBox _themeComboBox;
        private Label _heroTitle;
        private Label _heroSubtitle;
        private Panel _heroPanel;
        private FlowLayoutPanel _navigationPanel;
        private readonly Dictionary<string, StyledNavigationButton> _navigationButtons = new Dictionary<string, StyledNavigationButton>();
        private string _activeNavigationKey = "首頁";
        private int _hoveredGridRowIndex = -1;
        private TabPage _homeTab;
        private Panel _welcomePanel;
        private TextBox _welcomeSummaryText;
        private LearningHistoryPanel _historyPanel;
        private TabPage _historyTab;
        private TextBox _historyText;

        private const int LeftPanePreferredWidth = 320;
        private const int LeftPaneMinWidth = 280;
        private const int RightPaneMinWidth = 720;

        public Form1()
        {
            // 本版本刻意不呼叫 InitializeComponent()，避免被舊 Designer UI 限制。
            // 即使專案仍保留 Form1.Designer.cs，也不會影響本介面。
            Text = "TSV Studio Product Edition";
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(1240, 760);
            Size = new Size(1500, 920);
            Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            DoubleBuffered = true;
            TryApplyProductIcon();
            _learningStore.Load(Application.StartupPath);
            _learningHistory.Load(Application.StartupPath);

            BuildUi();
            WireEvents();
            Load += delegate { RestoreDashboardLayout(); };
            Shown += delegate
            {
                RestoreDashboardLayout();
                if (_allWords.Count == 0)
                {
                    LoadBuiltInEnglishDatabase(true);
                }
            };
            Resize += delegate { RestoreDashboardLayout(); };
            ApplyTheme();
            RefreshAllViews();
            Log("系統啟動完成。可直接使用內建英文字庫，或開啟 TSV / CSV / TXT / Excel 檔案開始分析。");
        }

        private void BuildUi()
        {
            Controls.Clear();

            _menu = BuildMenu();
            _toolBar = BuildToolBar();
            _statusStrip = BuildStatusStrip();

            _mainSplit = new SplitContainer();
            _mainSplit.Dock = DockStyle.Fill;
            _mainSplit.FixedPanel = FixedPanel.Panel1;
            _mainSplit.IsSplitterFixed = false;
            // 初始化階段 SplitContainer 還沒有實際寬度，不能直接設定 MinSize / SplitterDistance。
            // 否則會發生 InvalidOperationException：SplitterDistance 必須介於 Panel1MinSize 和 Width - Panel2MinSize 之間。
            // 先用安全值，等 Form 顯示完成後由 RestoreDashboardLayout() 依照實際尺寸調整。
            _mainSplit.Panel1MinSize = 0;
            _mainSplit.Panel2MinSize = 0;
            _mainSplit.SplitterWidth = 7;

            BuildLeftDashboard(_mainSplit.Panel1);

            _rightSplit = new SplitContainer();
            _rightSplit.Dock = DockStyle.Fill;
            _rightSplit.Orientation = Orientation.Horizontal;
            _rightSplit.SplitterWidth = 7;
            _rightSplit.Panel1MinSize = 0;
            _rightSplit.Panel2MinSize = 0;
            _mainSplit.Panel2.Controls.Add(_rightSplit);

            _grid = BuildGrid();
            _rightSplit.Panel1.Controls.Add(_grid);

            _bottomTabs = BuildBottomTabs();
            _rightSplit.Panel2.Controls.Add(_bottomTabs);

            Controls.Add(_mainSplit);
            Controls.Add(_toolBar);
            Controls.Add(_menu);
            Controls.Add(_statusStrip);
            MainMenuStrip = _menu;

            // SplitContainer 的尺寸調整交給 Shown / Resize 事件處理。
            // 這裡不能呼叫 BeginInvoke，因為 Form 的視窗控制代碼可能尚未建立。
        }

        private MenuStrip BuildMenu()
        {
            var menu = new MenuStrip();
            menu.Dock = DockStyle.Top;
            menu.AutoSize = false;
            menu.Height = 34;
            menu.Padding = new Padding(12, 4, 12, 4);
            menu.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            menu.RenderMode = ToolStripRenderMode.Professional;
            menu.Renderer = new StudioToolStripRenderer();

            var file = new ToolStripMenuItem("檔案(&F)");
            file.DropDownItems.Add(CreateMenuItem("開啟 TSV / CSV / TXT / Excel...", "Ctrl+O", OpenFileByDialog));
            file.DropDownItems.Add(CreateMenuItem("資料匯入精靈...", "Ctrl+Shift+O", ShowImportWizard));
            file.DropDownItems.Add(CreateMenuItem("載入內建英文字庫", "Ctrl+I", LoadBuiltInEnglishDatabase));
            file.DropDownItems.Add(CreateMenuItem("載入本機學習資料庫", "Ctrl+Alt+D", LoadLocalWordDatabase));
            file.DropDownItems.Add(CreateMenuItem("匯入目前資料到本機學習資料庫", "", ImportCurrentDataToLocalDatabase));
            file.DropDownItems.Add(CreateMenuItem("重新載入目前檔案", "F5", ReloadCurrentFile));
            file.DropDownItems.Add(new ToolStripSeparator());
            file.DropDownItems.Add(CreateMenuItem("匯出目前檢視為 TSV", "Ctrl+Shift+T", ExportVisibleAsTsv));
            file.DropDownItems.Add(CreateMenuItem("匯出目前檢視為 CSV", "Ctrl+Shift+C", ExportVisibleAsCsv));
            file.DropDownItems.Add(CreateMenuItem("匯出 AI / 資安報告", "Ctrl+Shift+R", ExportReport));
            file.DropDownItems.Add(CreateMenuItem("匯出正式 HTML 報告", "Ctrl+Alt+H", ExportHtmlReport));
            file.DropDownItems.Add(CreateMenuItem("匯出 Anki TSV", "Ctrl+Alt+K", ExportAnkiDeck));
            file.DropDownItems.Add(new ToolStripSeparator());
            var recent = new ToolStripMenuItem("最近開啟");
            recent.DropDownOpening += delegate { RebuildRecentMenu(recent); };
            file.DropDownItems.Add(recent);
            file.DropDownItems.Add(new ToolStripSeparator());
            file.DropDownItems.Add(CreateMenuItem("離開", "Alt+F4", delegate { Close(); }));

            var edit = new ToolStripMenuItem("編輯(&E)");
            edit.DropDownItems.Add(CreateMenuItem("複製選取列", "Ctrl+C", CopySelectedRows));
            edit.DropDownItems.Add(CreateMenuItem("複製選取單字", "Ctrl+Shift+W", CopySelectedWords));
            edit.DropDownItems.Add(CreateMenuItem("清除搜尋", "Esc", ClearSearch));
            edit.DropDownItems.Add(new ToolStripSeparator());
            edit.DropDownItems.Add(CreateMenuItem("自動修剪空白與不可見字元", "", NormalizeCurrentData));
            edit.DropDownItems.Add(CreateMenuItem("移除重複單字（保留第一筆）", "", RemoveDuplicates));
            edit.DropDownItems.Add(new ToolStripSeparator());
            edit.DropDownItems.Add(CreateMenuItem("切換收藏", "Ctrl+Alt+F", ToggleFavoriteForSelected));
            edit.DropDownItems.Add(CreateMenuItem("標記為已學會", "Ctrl+Alt+L", MarkSelectedAsLearned));
            edit.DropDownItems.Add(CreateMenuItem("儲存詳細面板修改", "Ctrl+S", SaveDetailEdits));

            var tools = new ToolStripMenuItem("工具(&T)");
            tools.DropDownItems.Add(CreateMenuItem("執行 AI 品質分析", "F6", RunAiAnalysis));
            tools.DropDownItems.Add(CreateMenuItem("執行資安掃描", "F7", RunSecurityScan));
            tools.DropDownItems.Add(CreateMenuItem("驗證音檔存在性", "F8", ValidateAudioFiles));
            tools.DropDownItems.Add(CreateMenuItem("音檔完整性掃描與建議修復", "Ctrl+Alt+A", RunAudioIntegrityScanner));
            tools.DropDownItems.Add(CreateMenuItem("自動修復可配對音檔路徑", "", AutoRepairAudioPaths));
            tools.DropDownItems.Add(new ToolStripSeparator());
            tools.DropDownItems.Add(CreateMenuItem("頁面內播放選取音檔", "F9", PlaySelectedAudio));
            tools.DropDownItems.Add(CreateMenuItem("語音合成朗讀單字", "F10", SpeakSelectedWord));
            tools.DropDownItems.Add(CreateMenuItem("停止播放器", "Esc", StopInlineAudio));
            tools.DropDownItems.Add(new ToolStripSeparator());
            tools.DropDownItems.Add(CreateMenuItem("開始測驗模式", "Ctrl+Q", StartQuiz));
            tools.DropDownItems.Add(CreateMenuItem("查看學習歷程", "Ctrl+Alt+G", ShowLearningHistory));
            tools.DropDownItems.Add(CreateMenuItem("Command Palette", "Ctrl+Shift+P", ShowCommandPalette));
            tools.DropDownItems.Add(new ToolStripSeparator());
            tools.DropDownItems.Add(CreateMenuItem("效能壓力測試摘要", "", ShowBenchmarkSummary));

            var view = new ToolStripMenuItem("檢視(&V)");
            view.DropDownItems.Add(CreateMenuItem("首頁", "Ctrl+Alt+Home", ShowHome));
            view.DropDownItems.Add(CreateMenuItem("Command Palette", "Ctrl+Shift+P", ShowCommandPalette));
            view.DropDownItems.Add(CreateMenuItem("顯示 / 隱藏列號", "Ctrl+L", ToggleRowNumber));
            view.DropDownItems.Add(CreateMenuItem("欄寬最佳化", "Ctrl+B", AutoResizeColumns));
            view.DropDownItems.Add(new ToolStripSeparator());
            var themeMenu = new ToolStripMenuItem("主題樣式");
            foreach (ThemeProfile profile in ThemeProfile.GetAll())
            {
                ThemeProfile captured = profile;
                themeMenu.DropDownItems.Add(CreateMenuItem(captured.Name, "", delegate { ApplyThemeProfile(captured.Id); }));
            }
            view.DropDownItems.Add(themeMenu);
            view.DropDownItems.Add(CreateMenuItem("切換深色 / 亮色模式", "Ctrl+D", ToggleTheme));

            var extensions = new ToolStripMenuItem("擴充(&X)");
            extensions.DropDownItems.Add(CreateMenuItem("擴充中心 / NuGet 狀態", "Ctrl+Alt+X", ShowExtensionCenter));
            extensions.DropDownItems.Add(CreateMenuItem("匯出可選 NuGet 安裝指南", "", GenerateNuGetInstallGuide));
            extensions.DropDownItems.Add(CreateMenuItem("匯出 Newtonsoft JSON 進階報告", "", TryExportWithNewtonsoftJson));
            extensions.DropDownItems.Add(new ToolStripSeparator());
            extensions.DropDownItems.Add(CreateMenuItem("產生個人化學習計畫", "Ctrl+Alt+P", ShowStudyPlan));
            extensions.DropDownItems.Add(CreateMenuItem("產品級功能藍圖", "", ShowPremiumRoadmap));

            var help = new ToolStripMenuItem("說明(&H)");
            help.DropDownItems.Add(CreateMenuItem("關於 TSV Studio", "", ShowAbout));

            menu.Items.Add(file);
            menu.Items.Add(edit);
            menu.Items.Add(tools);
            menu.Items.Add(view);
            menu.Items.Add(extensions);
            menu.Items.Add(help);
            return menu;
        }

        private Panel BuildToolBar()
        {
            var outer = new Panel();
            outer.Dock = DockStyle.Top;
            outer.Height = 88;
            outer.Padding = new Padding(0);
            outer.Margin = new Padding(0);

            var layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.ColumnCount = 1;
            layout.RowCount = 2;
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 46));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            layout.Margin = new Padding(0);
            layout.Padding = new Padding(0);
            outer.Controls.Add(layout);

            var commandBar = CreateCommandToolStrip(46);
            commandBar.Items.Add(CreateToolSectionLabel("主要操作"));
            commandBar.Items.Add(CreateToolButton("⌂ 首頁", ShowHome));
            commandBar.Items.Add(CreateToolButton("📂 開啟檔案", OpenFileByDialog));
            commandBar.Items.Add(CreateToolButton("⇣ 匯入精靈", ShowImportWizard));
            commandBar.Items.Add(CreateToolButton("📘 內建字庫", LoadBuiltInEnglishDatabase));
            commandBar.Items.Add(new ToolStripSeparator());

            var dataDropDown = CreateToolDropDownButton("▦ 資料管理");
            dataDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("本機學習資料庫", LoadLocalWordDatabase));
            dataDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("重新載入目前檔案", ReloadCurrentFile));
            dataDropDown.DropDownItems.Add(new ToolStripSeparator());
            dataDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("匯入目前資料到本機學習資料庫", ImportCurrentDataToLocalDatabase));
            dataDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("移除重複單字（保留第一筆）", RemoveDuplicates));
            dataDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("自動修剪空白與不可見字元", NormalizeCurrentData));
            commandBar.Items.Add(dataDropDown);

            var analysisDropDown = CreateToolDropDownButton("◆ 分析治理");
            analysisDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("執行 AI 品質分析", RunAiAnalysis));
            analysisDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("執行資安掃描", RunSecurityScan));
            analysisDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("音檔完整性掃描", RunAudioIntegrityScanner));
            analysisDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("驗證音檔存在性", ValidateAudioFiles));
            analysisDropDown.DropDownItems.Add(new ToolStripSeparator());
            analysisDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("自動修復可配對音檔路徑", AutoRepairAudioPaths));
            commandBar.Items.Add(analysisDropDown);

            var learningDropDown = CreateToolDropDownButton("◎ 學習模式");
            learningDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("開始測驗", StartQuiz));
            learningDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("學習計畫", ShowStudyPlan));
            learningDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("學習歷程", ShowLearningHistory));
            learningDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("命令面板", ShowCommandPalette));
            commandBar.Items.Add(learningDropDown);

            var audioDropDown = CreateToolDropDownButton("▶ 播放工具");
            audioDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("頁內播放選取音檔", PlaySelectedAudio));
            audioDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("TTS 朗讀單字", SpeakSelectedWord));
            audioDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("停止播放器", StopInlineAudio));
            commandBar.Items.Add(audioDropDown);

            var exportDropDown = CreateToolDropDownButton("▤ 報表匯出");
            exportDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("匯出分析報告", ExportReport));
            exportDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("匯出 HTML 報告", ExportHtmlReport));
            exportDropDown.DropDownItems.Add(CreateToolDropDownMenuItem("匯出 Anki TSV", ExportAnkiDeck));
            commandBar.Items.Add(exportDropDown);

            commandBar.Items.Add(new ToolStripSeparator());
            commandBar.Items.Add(CreateToolButton("✦ 擴充中心", ShowExtensionCenter));

            var filterBar = CreateCommandToolStrip(42);
            filterBar.Items.Add(CreateToolSectionLabel("搜尋與篩選"));

            filterBar.Items.Add(new ToolStripLabel("快速搜尋"));
            _searchBox = new ToolStripTextBox();
            _searchBox.AutoSize = false;
            _searchBox.Width = 380;
            _searchBox.BorderStyle = BorderStyle.FixedSingle;
            _searchBox.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular);
            _searchBox.ToolTipText = "可搜尋單字、音標、音檔路徑、解釋、議題標籤";
            filterBar.Items.Add(_searchBox);

            filterBar.Items.Add(new ToolStripSeparator());
            filterBar.Items.Add(new ToolStripLabel("風險篩選"));
            _riskComboBox = new ToolStripComboBox();
            _riskComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            _riskComboBox.AutoSize = false;
            _riskComboBox.Width = 96;
            _riskComboBox.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular);
            _riskComboBox.Items.AddRange(new object[] { "全部", "低", "中", "高", "致命" });
            _riskComboBox.SelectedIndex = 0;
            filterBar.Items.Add(_riskComboBox);

            filterBar.Items.Add(new ToolStripLabel("介面主題"));
            _themeComboBox = new ToolStripComboBox();
            _themeComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            _themeComboBox.AutoSize = false;
            _themeComboBox.Width = 142;
            _themeComboBox.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular);
            foreach (ThemeProfile profile in ThemeProfile.GetAll()) _themeComboBox.Items.Add(profile.Name);
            _themeComboBox.SelectedIndex = 0;
            _themeComboBox.SelectedIndexChanged += delegate
            {
                ThemeProfile selected = ThemeProfile.FindByName(Convert.ToString(_themeComboBox.SelectedItem));
                if (selected != null) ApplyThemeProfile(selected.Id);
            };
            filterBar.Items.Add(_themeComboBox);

            filterBar.Items.Add(new ToolStripSeparator());
            filterBar.Items.Add(CreateToolButton("⌘ Command Palette", ShowCommandPalette));

            layout.Controls.Add(commandBar, 0, 0);
            layout.Controls.Add(filterBar, 0, 1);

            return outer;
        }

        private ToolStrip CreateCommandToolStrip(int height)
        {
            var bar = new ToolStrip();
            bar.Dock = DockStyle.Fill;
            bar.AutoSize = false;
            bar.Height = height;
            bar.GripStyle = ToolStripGripStyle.Hidden;
            bar.Padding = new Padding(12, 7, 12, 7);
            bar.LayoutStyle = ToolStripLayoutStyle.HorizontalStackWithOverflow;
            bar.CanOverflow = true;
            bar.RenderMode = ToolStripRenderMode.Professional;
            bar.Renderer = new StudioToolStripRenderer();
            bar.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            bar.ImageScalingSize = new Size(20, 20);
            return bar;
        }

        private StatusStrip BuildStatusStrip()
        {
            var status = new StatusStrip();
            status.Dock = DockStyle.Bottom;
            _statusLabel = new ToolStripStatusLabel("就緒");
            _statusLabel.Spring = true;
            _statusLabel.TextAlign = ContentAlignment.MiddleLeft;

            _progressBar = new ToolStripProgressBar();
            _progressBar.Minimum = 0;
            _progressBar.Maximum = 100;
            _progressBar.Value = 0;
            _progressBar.Width = 180;

            _clockLabel = new ToolStripStatusLabel(DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));

            status.Items.Add(_statusLabel);
            status.Items.Add(_progressBar);
            status.Items.Add(_clockLabel);
            return status;
        }

        private void BuildLeftDashboard(Control parent)
        {
            parent.Padding = new Padding(14);

            var layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.RowCount = 5;
            layout.ColumnCount = 1;
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 112));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 278));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 214));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            parent.Controls.Add(layout);

            _heroPanel = new GradientPanel();
            _heroPanel.Dock = DockStyle.Fill;
            _heroPanel.Padding = new Padding(16);
            _heroPanel.Margin = new Padding(0, 0, 0, 10);

            _heroTitle = new Label();
            _heroTitle.Text = "TSV Studio";
            _heroTitle.Font = new Font(Font.FontFamily, 21F, FontStyle.Bold);
            _heroTitle.Dock = DockStyle.Top;
            _heroTitle.Height = 42;

            _heroSubtitle = new Label();
            _heroSubtitle.Text = "Learning Data Platform";
            _heroSubtitle.Font = new Font(Font.FontFamily, 10F, FontStyle.Regular);
            _heroSubtitle.Dock = DockStyle.Fill;

            _heroPanel.Controls.Add(_heroSubtitle);
            _heroPanel.Controls.Add(_heroTitle);
            layout.Controls.Add(_heroPanel, 0, 0);

            _navigationPanel = BuildNavigationPanel();
            layout.Controls.Add(_navigationPanel, 0, 1);

            _cardsPanel = new FlowLayoutPanel();
            _cardsPanel.Dock = DockStyle.Fill;
            _cardsPanel.AutoScroll = true;
            _cardsPanel.FlowDirection = FlowDirection.TopDown;
            _cardsPanel.WrapContents = false;
            _cardsPanel.Margin = new Padding(0, 0, 0, 10);
            _cardsPanel.Padding = new Padding(0);
            _cardsPanel.Resize += delegate { ResizeMetricCards(); };
            layout.Controls.Add(_cardsPanel, 0, 2);

            var issueTitle = new Label();
            issueTitle.Text = "即時議題雷達";
            issueTitle.Font = new Font(Font.FontFamily, 11F, FontStyle.Bold);
            issueTitle.Dock = DockStyle.Fill;
            issueTitle.TextAlign = ContentAlignment.MiddleLeft;
            layout.Controls.Add(issueTitle, 0, 3);

            _issueList = new ListBox();
            _issueList.Dock = DockStyle.Fill;
            _issueList.IntegralHeight = false;
            _issueList.BorderStyle = BorderStyle.None;
            layout.Controls.Add(_issueList, 0, 4);
        }

        private FlowLayoutPanel BuildNavigationPanel()
        {
            _navigationButtons.Clear();

            var panel = new FlowLayoutPanel();
            panel.Dock = DockStyle.Fill;
            panel.FlowDirection = FlowDirection.TopDown;
            panel.WrapContents = false;
            panel.AutoScroll = true;
            panel.Padding = new Padding(0, 0, 0, 4);
            panel.Margin = new Padding(0, 0, 0, 10);

            panel.Controls.Add(CreateNavigationSectionLabel("工作區"));
            panel.Controls.Add(CreateNavigationButton("首頁", "⌂  首頁", ShowHome));
            panel.Controls.Add(CreateNavigationButton("字庫", "▦  字庫", ShowVocabularyGrid));
            panel.Controls.Add(CreateNavigationButton("匯入精靈", "⇣  匯入精靈", ShowImportWizard));
            panel.Controls.Add(CreateNavigationButton("單字詳細", "□  單字詳細", delegate { SelectBottomTab(_detailTab); }));

            panel.Controls.Add(CreateNavigationSectionLabel("學習"));
            panel.Controls.Add(CreateNavigationButton("測驗", "◎  測驗", delegate { SelectBottomTab(_quizTab); }));
            panel.Controls.Add(CreateNavigationButton("播放器", "▶  播放器", delegate { SelectBottomTab(_playerTab); }));
            panel.Controls.Add(CreateNavigationButton("圖表", "▥  圖表", delegate { SelectBottomTab(_chartTab); }));
            panel.Controls.Add(CreateNavigationButton("學習歷程", "↗  學習歷程", ShowLearningHistory));

            panel.Controls.Add(CreateNavigationSectionLabel("治理與輸出"));
            panel.Controls.Add(CreateNavigationButton("音檔治理", "♬  音檔治理", RunAudioIntegrityScanner));
            panel.Controls.Add(CreateNavigationButton("Anki 匯出", "A  Anki 匯出", ExportAnkiDeck));
            panel.Controls.Add(CreateNavigationButton("HTML 報告", "H  HTML 報告", ExportHtmlReport));
            panel.Controls.Add(CreateNavigationButton("擴充中心", "✦  擴充中心", ShowExtensionCenter));

            SetActiveNavigation(_activeNavigationKey);
            return panel;
        }

        private Label CreateNavigationSectionLabel(string text)
        {
            var label = new Label();
            label.Text = text;
            label.Width = 258;
            label.Height = 24;
            label.Margin = new Padding(0, 8, 0, 6);
            label.Padding = new Padding(4, 0, 0, 0);
            label.TextAlign = ContentAlignment.MiddleLeft;
            label.Font = new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);
            return label;
        }

        private StyledNavigationButton CreateNavigationButton(string key, string text, Action action)
        {
            var button = new StyledNavigationButton();
            button.Text = text;
            button.Width = 258;
            button.Height = 36;
            button.Margin = new Padding(0, 0, 0, 7);
            button.TextAlign = ContentAlignment.MiddleLeft;
            button.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            button.UseVisualStyleBackColor = false;
            button.Click += delegate
            {
                SetActiveNavigation(key);
                action();
            };
            _navigationButtons[key] = button;
            return button;
        }

        private void SetActiveNavigation(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return;
            _activeNavigationKey = key;
            foreach (KeyValuePair<string, StyledNavigationButton> pair in _navigationButtons)
            {
                pair.Value.IsActive = string.Equals(pair.Key, key, StringComparison.OrdinalIgnoreCase);
                pair.Value.Invalidate();
            }
        }

        private void UpdateNavigationBySelectedTab()
        {
            if (_bottomTabs == null || _bottomTabs.SelectedTab == null) return;
            string text = _bottomTabs.SelectedTab.Text;
            if (text == "首頁") SetActiveNavigation("首頁");
            else if (text == "資料預覽") SetActiveNavigation("字庫");
            else if (text == "單字詳細") SetActiveNavigation("單字詳細");
            else if (text == "媒體播放器") SetActiveNavigation("播放器");
            else if (text == "測驗模式") SetActiveNavigation("測驗");
            else if (text == "視覺化圖表") SetActiveNavigation("圖表");
            else if (text == "學習歷程") SetActiveNavigation("學習歷程");
            else if (text == "音檔治理") SetActiveNavigation("音檔治理");
            else if (text == "擴充中心") SetActiveNavigation("擴充中心");
        }

        private DataGridView BuildGrid()
        {
            var grid = new DataGridView();
            grid.Dock = DockStyle.Fill;
            grid.AutoGenerateColumns = false;
            grid.AllowUserToAddRows = false;
            grid.AllowUserToDeleteRows = false;
            grid.AllowUserToResizeRows = false;
            grid.ReadOnly = true;
            grid.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            grid.MultiSelect = true;
            grid.RowHeadersWidth = 58;
            grid.BorderStyle = BorderStyle.None;
            grid.EnableHeadersVisualStyles = false;
            grid.AutoSizeRowsMode = DataGridViewAutoSizeRowsMode.None;
            grid.RowTemplate.Height = 30;
            grid.DataSource = _bindingSource;

            AddGridColumn(grid, "Word", "單字", 155, DataGridViewContentAlignment.MiddleLeft);
            AddGridColumn(grid, "LearningBadge", "學習", 75, DataGridViewContentAlignment.MiddleCenter);
            AddGridColumn(grid, "Phonogram", "音標", 150, DataGridViewContentAlignment.MiddleLeft);
            AddGridColumn(grid, "SoundPath", "音檔路徑", 230, DataGridViewContentAlignment.MiddleLeft);
            AddGridColumn(grid, "Explain", "解釋", 420, DataGridViewContentAlignment.MiddleLeft);
            AddGridColumn(grid, "AiLevel", "AI難度", 80, DataGridViewContentAlignment.MiddleCenter);
            AddGridColumn(grid, "QualityScore", "品質", 70, DataGridViewContentAlignment.MiddleRight);
            AddGridColumn(grid, "RiskLevel", "風險", 70, DataGridViewContentAlignment.MiddleCenter);
            AddGridColumn(grid, "IssuesText", "問題標籤", 320, DataGridViewContentAlignment.MiddleLeft);

            grid.SelectionChanged += delegate { UpdatePreviewFromSelection(); };
            grid.CellDoubleClick += delegate { PlaySelectedAudio(); };
            grid.RowPostPaint += Grid_RowPostPaint;
            grid.ColumnHeaderMouseClick += Grid_ColumnHeaderMouseClick;
            grid.CellFormatting += Grid_CellFormatting;
            grid.CellPainting += Grid_CellPainting;
            grid.CellMouseEnter += Grid_CellMouseEnter;
            grid.MouseLeave += delegate
            {
                int oldHover = _hoveredGridRowIndex;
                _hoveredGridRowIndex = -1;
                if (oldHover >= 0 && oldHover < grid.Rows.Count) grid.InvalidateRow(oldHover);
            };
            return grid;
        }

        private TabControl BuildBottomTabs()
        {
            var tabs = new TabControl();
            tabs.Dock = DockStyle.Fill;
            tabs.DrawMode = TabDrawMode.OwnerDrawFixed;
            tabs.ItemSize = new Size(112, 30);
            tabs.SizeMode = TabSizeMode.Fixed;
            tabs.HotTrack = true;
            tabs.DrawItem += BottomTabs_DrawItem;
            tabs.SelectedIndexChanged += delegate
            {
                UpdateNavigationBySelectedTab();
                tabs.Invalidate();
            };

            _previewText = CreateReadOnlyTextBox();
            _logText = CreateReadOnlyTextBox();
            _statsText = CreateReadOnlyTextBox();
            _securityText = CreateReadOnlyTextBox();
            _audioScanText = CreateReadOnlyTextBox();
            _playerPanel = BuildInlinePlayerPanel();
            _chartPanel = new VisualDashboardPanel();
            _chartPanel.Dock = DockStyle.Fill;
            _historyPanel = new LearningHistoryPanel();
            _historyPanel.Dock = DockStyle.Fill;
            _historyText = CreateReadOnlyTextBox();

            _homeTab = CreateTab("首頁", BuildWelcomeDashboardPanel());
            _detailTab = CreateTab("單字詳細", BuildDetailPanel());
            _playerTab = CreateTab("媒體播放器", _playerPanel);
            _quizTab = CreateTab("測驗模式", BuildQuizPanel());
            _audioScanTab = CreateTab("音檔治理", BuildAudioIntegrityPanel());
            _chartTab = CreateTab("視覺化圖表", _chartPanel);
            _historyTab = CreateTab("學習歷程", BuildLearningHistoryPanel());
            _extensionText = CreateReadOnlyTextBox();
            _studyPlanText = CreateReadOnlyTextBox();
            _extensionTab = CreateTab("擴充中心", _extensionText);
            _studyPlanTab = CreateTab("學習計畫", _studyPlanText);

            tabs.TabPages.Add(_homeTab);
            tabs.TabPages.Add(CreateTab("資料預覽", _previewText));
            tabs.TabPages.Add(_detailTab);
            tabs.TabPages.Add(_playerTab);
            tabs.TabPages.Add(_quizTab);
            tabs.TabPages.Add(_chartTab);
            tabs.TabPages.Add(_historyTab);
            tabs.TabPages.Add(_studyPlanTab);
            tabs.TabPages.Add(_extensionTab);
            tabs.TabPages.Add(CreateTab("統計分析", _statsText));
            tabs.TabPages.Add(_audioScanTab);
            tabs.TabPages.Add(CreateTab("資安報告", _securityText));
            tabs.TabPages.Add(CreateTab("系統紀錄", _logText));
            return tabs;
        }

        private Panel BuildWelcomeDashboardPanel()
        {
            _welcomePanel = new Panel();
            _welcomePanel.Dock = DockStyle.Fill;
            _welcomePanel.Padding = new Padding(18);

            var layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.ColumnCount = 2;
            layout.RowCount = 2;
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 58));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 42));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 128));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            _welcomePanel.Controls.Add(layout);

            var titlePanel = new GradientPanel();
            titlePanel.Dock = DockStyle.Fill;
            titlePanel.Padding = new Padding(18);
            titlePanel.Margin = new Padding(0, 0, 12, 12);

            var title = new Label();
            title.Text = "TSV Studio Product Edition";
            title.Font = new Font(Font.FontFamily, 22F, FontStyle.Bold);
            title.Dock = DockStyle.Top;
            title.Height = 46;

            var subtitle = new Label();
            subtitle.Text = "字庫資料治理、音檔管理、學習測驗與分析報告整合平台";
            subtitle.Font = new Font(Font.FontFamily, 11F, FontStyle.Regular);
            subtitle.Dock = DockStyle.Fill;

            titlePanel.Controls.Add(subtitle);
            titlePanel.Controls.Add(title);
            layout.Controls.Add(titlePanel, 0, 0);

            var quickPanel = new FlowLayoutPanel();
            quickPanel.Dock = DockStyle.Fill;
            quickPanel.FlowDirection = FlowDirection.LeftToRight;
            quickPanel.WrapContents = true;
            quickPanel.Padding = new Padding(0, 4, 0, 0);
            quickPanel.Margin = new Padding(0, 0, 0, 12);
            quickPanel.Controls.Add(CreateWelcomeActionButton("開啟檔案", OpenFileByDialog));
            quickPanel.Controls.Add(CreateWelcomeActionButton("匯入精靈", ShowImportWizard));
            quickPanel.Controls.Add(CreateWelcomeActionButton("載入字庫", LoadBuiltInEnglishDatabase));
            quickPanel.Controls.Add(CreateWelcomeActionButton("開始測驗", StartQuiz));
            quickPanel.Controls.Add(CreateWelcomeActionButton("HTML 報告", ExportHtmlReport));
            quickPanel.Controls.Add(CreateWelcomeActionButton("Anki 匯出", ExportAnkiDeck));
            layout.Controls.Add(quickPanel, 1, 0);

            _welcomeSummaryText = CreateReadOnlyTextBox();
            _welcomeSummaryText.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular, GraphicsUnit.Point);
            layout.SetColumnSpan(_welcomeSummaryText, 2);
            layout.Controls.Add(_welcomeSummaryText, 0, 1);
            return _welcomePanel;
        }

        private Button CreateWelcomeActionButton(string text, Action action)
        {
            var button = new Button();
            button.Text = text;
            button.Width = 128;
            button.Height = 38;
            button.Margin = new Padding(0, 0, 8, 8);
            button.FlatStyle = FlatStyle.Flat;
            button.Click += delegate { action(); };
            return button;
        }

        private Control BuildLearningHistoryPanel()
        {
            var layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.RowCount = 2;
            layout.ColumnCount = 1;
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 72));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 28));
            layout.Controls.Add(_historyPanel, 0, 0);
            layout.Controls.Add(_historyText, 0, 1);
            return layout;
        }

        private Panel BuildInlinePlayerPanel()
        {
            var outer = new Panel();
            outer.Dock = DockStyle.Fill;
            outer.Padding = new Padding(14);

            var title = new Label();
            title.Text = "內建媒體播放器 Pro";
            title.Dock = DockStyle.Top;
            title.Height = 32;
            title.Font = new Font(Font.FontFamily, 14F, FontStyle.Bold);

            _playerWordLabel = new Label();
            _playerWordLabel.Text = "目前單字：尚未選取";
            _playerWordLabel.Dock = DockStyle.Top;
            _playerWordLabel.Height = 34;
            _playerWordLabel.Font = new Font(Font.FontFamily, 12F, FontStyle.Bold);

            _playerPathLabel = new Label();
            _playerPathLabel.Text = "音訊來源：尚未選取";
            _playerPathLabel.Dock = DockStyle.Top;
            _playerPathLabel.Height = 42;
            _playerPathLabel.AutoEllipsis = true;

            var buttons = new FlowLayoutPanel();
            buttons.Dock = DockStyle.Top;
            buttons.Height = 48;
            buttons.FlowDirection = FlowDirection.LeftToRight;
            buttons.WrapContents = false;
            buttons.Padding = new Padding(0, 6, 0, 0);

            _playerPrevButton = CreatePlayerButton("⏮ 上一筆", PlayPreviousWord);
            _playerPlayButton = CreatePlayerButton("▶ 播放", PlaySelectedAudio);
            _playerPauseButton = CreatePlayerButton("⏸ 暫停", PauseInlineAudio);
            _playerResumeButton = CreatePlayerButton("⏵ 繼續", ResumeInlineAudio);
            _playerNextButton = CreatePlayerButton("⏭ 下一筆", PlayNextWord);
            _playerSpeakButton = CreatePlayerButton("🔊 TTS", SpeakSelectedWord);
            _playerStopButton = CreatePlayerButton("■ 停止", StopInlineAudio);

            buttons.Controls.Add(_playerPrevButton);
            buttons.Controls.Add(_playerPlayButton);
            buttons.Controls.Add(_playerPauseButton);
            buttons.Controls.Add(_playerResumeButton);
            buttons.Controls.Add(_playerNextButton);
            buttons.Controls.Add(_playerSpeakButton);
            buttons.Controls.Add(_playerStopButton);

            var progressPanel = new Panel();
            progressPanel.Dock = DockStyle.Top;
            progressPanel.Height = 48;
            progressPanel.Padding = new Padding(0, 8, 0, 0);

            _playerProgressBar = new ProgressBar();
            _playerProgressBar.Dock = DockStyle.Fill;
            _playerProgressBar.Minimum = 0;
            _playerProgressBar.Maximum = 1000;

            _playerTimeLabel = new Label();
            _playerTimeLabel.Text = "00:00 / 00:00";
            _playerTimeLabel.Dock = DockStyle.Right;
            _playerTimeLabel.Width = 130;
            _playerTimeLabel.TextAlign = ContentAlignment.MiddleRight;

            progressPanel.Controls.Add(_playerProgressBar);
            progressPanel.Controls.Add(_playerTimeLabel);

            var options = new FlowLayoutPanel();
            options.Dock = DockStyle.Top;
            options.Height = 46;
            options.FlowDirection = FlowDirection.LeftToRight;
            options.WrapContents = false;
            options.Padding = new Padding(0, 6, 0, 0);

            _playerAutoNextCheckBox = new CheckBox();
            _playerAutoNextCheckBox.Text = "播完自動下一筆";
            _playerAutoNextCheckBox.Width = 150;
            _playerAutoNextCheckBox.Checked = false;

            _playerLoopCheckBox = new CheckBox();
            _playerLoopCheckBox.Text = "循環播放目前選取";
            _playerLoopCheckBox.Width = 170;
            _playerLoopCheckBox.Checked = false;

            var volumeLabel = new Label();
            volumeLabel.Text = "音量";
            volumeLabel.Width = 42;
            volumeLabel.TextAlign = ContentAlignment.MiddleLeft;

            _volumeTrackBar = new TrackBar();
            _volumeTrackBar.Minimum = 0;
            _volumeTrackBar.Maximum = 1000;
            _volumeTrackBar.Value = 850;
            _volumeTrackBar.TickFrequency = 250;
            _volumeTrackBar.Width = 180;
            _volumeTrackBar.Scroll += delegate { _audioPlayer.SetVolume(_volumeTrackBar.Value); };

            options.Controls.Add(_playerAutoNextCheckBox);
            options.Controls.Add(_playerLoopCheckBox);
            options.Controls.Add(volumeLabel);
            options.Controls.Add(_volumeTrackBar);

            _playerStatusLabel = new Label();
            _playerStatusLabel.Text = "狀態：待命。播放會直接在程式頁面內完成；沒有音檔時自動使用 Windows SAPI TTS 發音。";
            _playerStatusLabel.Dock = DockStyle.Fill;
            _playerStatusLabel.Padding = new Padding(0, 10, 0, 0);

            outer.Controls.Add(_playerStatusLabel);
            outer.Controls.Add(options);
            outer.Controls.Add(progressPanel);
            outer.Controls.Add(buttons);
            outer.Controls.Add(_playerPathLabel);
            outer.Controls.Add(_playerWordLabel);
            outer.Controls.Add(title);
            return outer;
        }


        private Panel BuildDetailPanel()
        {
            var outer = new Panel();
            outer.Dock = DockStyle.Fill;
            outer.Padding = new Padding(12);

            var title = new Label();
            title.Text = "單字詳細面板 / 可編輯資料卡";
            title.Font = new Font(Font.FontFamily, 13F, FontStyle.Bold);
            title.Dock = DockStyle.Top;
            title.Height = 32;

            var buttons = new FlowLayoutPanel();
            buttons.Dock = DockStyle.Bottom;
            buttons.Height = 46;
            buttons.FlowDirection = FlowDirection.LeftToRight;
            buttons.WrapContents = false;
            buttons.Controls.Add(CreatePlayerButton("儲存修改", SaveDetailEdits));
            buttons.Controls.Add(CreatePlayerButton("播放音檔", PlaySelectedAudio));
            buttons.Controls.Add(CreatePlayerButton("TTS 朗讀", SpeakSelectedWord));
            buttons.Controls.Add(CreatePlayerButton("加入本機資料庫", ImportCurrentDataToLocalDatabase));

            var table = new TableLayoutPanel();
            table.Dock = DockStyle.Fill;
            table.ColumnCount = 2;
            table.RowCount = 7;
            table.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90));
            table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            table.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            table.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            table.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
            table.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            table.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            table.RowStyles.Add(new RowStyle(SizeType.Absolute, 32));
            table.RowStyles.Add(new RowStyle(SizeType.Absolute, 46));

            _detailWordBox = new TextBox();
            _detailPhonogramBox = new TextBox();
            _detailSoundPathBox = new TextBox();
            _detailExplainBox = new TextBox();
            _detailExplainBox.Multiline = true;
            _detailExplainBox.ScrollBars = ScrollBars.Vertical;
            _detailMetaLabel = new Label();
            _detailMetaLabel.Dock = DockStyle.Fill;
            _detailMetaLabel.TextAlign = ContentAlignment.MiddleLeft;
            _detailFavoriteCheckBox = new CheckBox();
            _detailFavoriteCheckBox.Text = "收藏此單字";
            _detailLearnedCheckBox = new CheckBox();
            _detailLearnedCheckBox.Text = "已學會";

            AddDetailRow(table, 0, "單字", _detailWordBox);
            AddDetailRow(table, 1, "音標", _detailPhonogramBox);
            AddDetailRow(table, 2, "音檔", _detailSoundPathBox);
            AddDetailRow(table, 3, "解釋", _detailExplainBox);
            AddDetailRow(table, 4, "狀態", _detailMetaLabel);

            var flags = new FlowLayoutPanel();
            flags.Dock = DockStyle.Fill;
            flags.FlowDirection = FlowDirection.LeftToRight;
            flags.Controls.Add(_detailFavoriteCheckBox);
            flags.Controls.Add(_detailLearnedCheckBox);
            table.Controls.Add(new Label { Text = "學習", Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft }, 0, 5);
            table.Controls.Add(flags, 1, 5);

            outer.Controls.Add(table);
            outer.Controls.Add(buttons);
            outer.Controls.Add(title);
            return outer;
        }

        private void AddDetailRow(TableLayoutPanel table, int row, string label, Control editor)
        {
            var l = new Label();
            l.Text = label;
            l.Dock = DockStyle.Fill;
            l.TextAlign = ContentAlignment.MiddleLeft;
            editor.Dock = DockStyle.Fill;
            table.Controls.Add(l, 0, row);
            table.Controls.Add(editor, 1, row);
        }

        private Panel BuildQuizPanel()
        {
            var outer = new Panel();
            outer.Dock = DockStyle.Fill;
            outer.Padding = new Padding(14);

            var title = new Label();
            title.Text = "測驗模式 / 聽音選字 / 中英互選";
            title.Dock = DockStyle.Top;
            title.Height = 32;
            title.Font = new Font(Font.FontFamily, 13F, FontStyle.Bold);

            var top = new FlowLayoutPanel();
            top.Dock = DockStyle.Top;
            top.Height = 46;
            top.FlowDirection = FlowDirection.LeftToRight;
            top.WrapContents = false;

            _quizModeComboBox = new ComboBox();
            _quizModeComboBox.DropDownStyle = ComboBoxStyle.DropDownList;
            _quizModeComboBox.Width = 180;
            _quizModeComboBox.Items.AddRange(new object[] { "英文選中文", "中文選英文", "聽音選單字" });
            _quizModeComboBox.SelectedIndex = 0;

            _quizAutoSpeakCheckBox = new CheckBox();
            _quizAutoSpeakCheckBox.Text = "出題時自動朗讀";
            _quizAutoSpeakCheckBox.Width = 140;

            top.Controls.Add(_quizModeComboBox);
            top.Controls.Add(CreatePlayerButton("開始 / 下一題", StartQuiz));
            top.Controls.Add(CreatePlayerButton("只練困難字", StartHardQuiz));
            top.Controls.Add(_quizAutoSpeakCheckBox);

            _quizQuestionLabel = new Label();
            _quizQuestionLabel.Dock = DockStyle.Top;
            _quizQuestionLabel.Height = 70;
            _quizQuestionLabel.Font = new Font(Font.FontFamily, 16F, FontStyle.Bold);
            _quizQuestionLabel.Text = "按「開始 / 下一題」進入測驗。";

            var options = new TableLayoutPanel();
            options.Dock = DockStyle.Top;
            options.Height = 126;
            options.ColumnCount = 2;
            options.RowCount = 2;
            options.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            options.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            options.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
            options.RowStyles.Add(new RowStyle(SizeType.Percent, 50));

            for (int i = 0; i < 4; i++)
            {
                int captured = i;
                _quizButtons[i] = new Button();
                _quizButtons[i].Dock = DockStyle.Fill;
                _quizButtons[i].Margin = new Padding(6);
                _quizButtons[i].Font = new Font(Font.FontFamily, 11F, FontStyle.Bold);
                _quizButtons[i].Text = "選項 " + (i + 1).ToString(CultureInfo.InvariantCulture);
                _quizButtons[i].Click += delegate { CheckQuizAnswer(captured); };
                options.Controls.Add(_quizButtons[i], i % 2, i / 2);
            }

            _quizFeedbackLabel = new Label();
            _quizFeedbackLabel.Dock = DockStyle.Top;
            _quizFeedbackLabel.Height = 40;
            _quizFeedbackLabel.Text = "答題結果會顯示在這裡。";

            _quizScoreLabel = new Label();
            _quizScoreLabel.Dock = DockStyle.Top;
            _quizScoreLabel.Height = 32;
            _quizScoreLabel.Text = "正確率：0 / 0";

            outer.Controls.Add(_quizScoreLabel);
            outer.Controls.Add(_quizFeedbackLabel);
            outer.Controls.Add(options);
            outer.Controls.Add(_quizQuestionLabel);
            outer.Controls.Add(top);
            outer.Controls.Add(title);
            return outer;
        }

        private Panel BuildAudioIntegrityPanel()
        {
            var outer = new Panel();
            outer.Dock = DockStyle.Fill;
            outer.Padding = new Padding(12);

            var top = new FlowLayoutPanel();
            top.Dock = DockStyle.Top;
            top.Height = 44;
            top.FlowDirection = FlowDirection.LeftToRight;
            top.WrapContents = false;
            top.Controls.Add(CreatePlayerButton("掃描音檔完整性", RunAudioIntegrityScanner));
            top.Controls.Add(CreatePlayerButton("自動修復路徑", AutoRepairAudioPaths));
            top.Controls.Add(CreatePlayerButton("驗證存在性", ValidateAudioFiles));

            _audioScanText.Dock = DockStyle.Fill;
            outer.Controls.Add(_audioScanText);
            outer.Controls.Add(top);
            return outer;
        }

        private Button CreatePlayerButton(string text, Action action)
        {
            var button = new Button();
            button.Text = text;
            button.Width = 160;
            button.Height = 32;
            button.Margin = new Padding(0, 0, 10, 0);
            button.FlatStyle = FlatStyle.Flat;
            button.Click += delegate { action(); };
            return button;
        }

        private TextBox CreateReadOnlyTextBox()
        {
            var box = new TextBox();
            box.Dock = DockStyle.Fill;
            box.Multiline = true;
            box.ReadOnly = true;
            box.ScrollBars = ScrollBars.Both;
            box.BorderStyle = BorderStyle.None;
            box.Font = new Font("Consolas", 10F, FontStyle.Regular, GraphicsUnit.Point);
            return box;
        }

        private TabPage CreateTab(string title, Control content)
        {
            var page = new TabPage(title);
            page.Padding = new Padding(10);
            page.Controls.Add(content);
            return page;
        }

        private void AddGridColumn(DataGridView grid, string propertyName, string title, int width, DataGridViewContentAlignment alignment)
        {
            var column = new DataGridViewTextBoxColumn();
            column.DataPropertyName = propertyName;
            column.Name = propertyName;
            column.HeaderText = title;
            column.Width = width;
            column.SortMode = DataGridViewColumnSortMode.Programmatic;
            column.DefaultCellStyle.Alignment = alignment;
            grid.Columns.Add(column);
        }

        private void TryApplyProductIcon()
        {
            try
            {
                string[] candidates = new string[]
                {
                    Path.Combine(Application.StartupPath, "tsvstudio.ico"),
                    Path.Combine(Application.StartupPath, "app.ico"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tsvstudio.ico")
                };

                foreach (string path in candidates)
                {
                    if (File.Exists(path))
                    {
                        Icon = new Icon(path);
                        return;
                    }
                }

                Icon = AppIconFactory.CreateProductIcon();
            }
            catch
            {
                // ignore icon loading errors
            }
        }

        private ToolStripMenuItem CreateMenuItem(string text, string shortcutText, Action action)
        {
            var item = new ToolStripMenuItem(text);
            item.ShortcutKeyDisplayString = shortcutText;
            item.Click += delegate { action(); };
            return item;
        }

        private ToolStripLabel CreateToolSectionLabel(string text)
        {
            var label = new ToolStripLabel(text);
            label.AutoSize = false;
            label.Width = MeasureToolItemWidth(text, 42);
            label.Height = 28;
            label.Margin = new Padding(0, 0, 8, 0);
            label.Padding = new Padding(4, 0, 4, 0);
            label.Font = new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);
            return label;
        }

        private ToolStripButton CreateToolButton(string text, Action action)
        {
            var btn = new ToolStripButton(text);
            btn.DisplayStyle = ToolStripItemDisplayStyle.Text;
            btn.AutoToolTip = true;
            btn.AutoSize = false;
            btn.Width = MeasureToolItemWidth(text, 74);
            btn.Height = 28;
            btn.Padding = new Padding(8, 2, 8, 2);
            btn.Margin = new Padding(0, 0, 5, 0);
            btn.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            btn.Click += delegate { action(); };
            return btn;
        }

        private ToolStripDropDownButton CreateToolDropDownButton(string text)
        {
            var btn = new ToolStripDropDownButton(text);
            btn.DisplayStyle = ToolStripItemDisplayStyle.Text;
            btn.AutoSize = false;
            btn.Width = MeasureToolItemWidth(text, 84);
            btn.Height = 28;
            btn.Padding = new Padding(8, 2, 8, 2);
            btn.Margin = new Padding(0, 0, 5, 0);
            btn.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            return btn;
        }

        private ToolStripMenuItem CreateToolDropDownMenuItem(string text, Action action)
        {
            var item = new ToolStripMenuItem(text);
            item.Click += delegate { action(); };
            return item;
        }

        private int MeasureToolItemWidth(string text, int minimum)
        {
            using (Font font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold))
            {
                int width = TextRenderer.MeasureText(text, font).Width + 28;
                return Math.Max(minimum, width);
            }
        }



        // --------------------------------------------------------------------
        // 與舊版 Form1.Designer.cs 相容
        // --------------------------------------------------------------------
        // 原本專案的 Designer 仍然會編譯，裡面可能有：
        //   this.tsmiOpen.Click += new EventHandler(this.tsmiOpen_Click);
        //   this.tsmiExit.Click += new EventHandler(this.tsmiExit_Click);
        //   this.tsmiAbout.Click += new EventHandler(this.tsmiAbout_Click);
        // 即使新版介面不呼叫 InitializeComponent()，這些方法也必須存在，
        // 否則 Visual Studio 會出現 CS1061 找不到事件方法。
        private void tsmiOpen_Click(object sender, EventArgs e)
        {
            OpenFileByDialog();
        }

        private void tsmiExit_Click(object sender, EventArgs e)
        {
            Close();
        }

        private void tsmiAbout_Click(object sender, EventArgs e)
        {
            ShowAbout();
        }

        private void WireEvents()
        {
            KeyPreview = true;
            KeyDown += Form1_KeyDown;
            FormClosing += Form1_FormClosing;

            _searchTimer.Interval = 220;
            _searchTimer.Tick += delegate
            {
                _searchTimer.Stop();
                ApplyFilterAndRefresh();
            };

            _playerTimer.Interval = 350;
            _playerTimer.Tick += delegate { UpdatePlayerProgressTick(); };
            _playerTimer.Start();

            _searchBox.TextChanged += delegate
            {
                _searchTimer.Stop();
                _searchTimer.Start();
            };

            _riskComboBox.SelectedIndexChanged += delegate { ApplyFilterAndRefresh(); };

            var clock = new WinFormsTimer();
            clock.Interval = 1000;
            clock.Tick += delegate { _clockLabel.Text = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"); };
            clock.Start();
        }

        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Control && e.Shift && e.KeyCode == Keys.P) { ShowCommandPalette(); e.Handled = true; }
            else if (e.Control && e.Shift && e.KeyCode == Keys.O) { ShowImportWizard(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.Home) { ShowHome(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.O) { OpenFileByDialog(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.I) { LoadBuiltInEnglishDatabase(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.Q) { StartQuiz(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.X) { ShowExtensionCenter(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.P) { ShowStudyPlan(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.G) { ShowLearningHistory(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.H) { ExportHtmlReport(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.K) { ExportAnkiDeck(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.S) { SaveDetailEdits(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.F) { ToggleFavoriteForSelected(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.L) { MarkSelectedAsLearned(); e.Handled = true; }
            else if (e.Control && e.Alt && e.KeyCode == Keys.A) { RunAudioIntegrityScanner(); e.Handled = true; }
            else if (e.KeyCode == Keys.F5) { ReloadCurrentFile(); e.Handled = true; }
            else if (e.KeyCode == Keys.F6) { RunAiAnalysis(); e.Handled = true; }
            else if (e.KeyCode == Keys.F7) { RunSecurityScan(); e.Handled = true; }
            else if (e.KeyCode == Keys.F8) { ValidateAudioFiles(); e.Handled = true; }
            else if (e.KeyCode == Keys.F9) { PlaySelectedAudio(); e.Handled = true; }
            else if (e.KeyCode == Keys.F10) { SpeakSelectedWord(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.C) { CopySelectedRows(); e.Handled = true; }
            else if (e.KeyCode == Keys.Escape) { StopInlineAudio(); ClearSearch(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.D) { ToggleTheme(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.L) { ToggleRowNumber(); e.Handled = true; }
            else if (e.Control && e.KeyCode == Keys.B) { AutoResizeColumns(); e.Handled = true; }
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (_loadCts != null)
            {
                _loadCts.Cancel();
                _loadCts.Dispose();
                _loadCts = null;
            }
            SaveLearningStateFromAll();
            _learningHistory.Save(Application.StartupPath);
            _playerTimer.Stop();
            _audioPlayer.Dispose();
        }

        private void LoadBuiltInEnglishDatabase()
        {
            LoadBuiltInEnglishDatabase(false);
        }

        private async void LoadBuiltInEnglishDatabase(bool silent)
        {
            if (_loadCts != null)
            {
                _loadCts.Cancel();
                _loadCts.Dispose();
            }
            _loadCts = new CancellationTokenSource();

            SetBusy(true, "正在載入內建英文字庫...");
            _progressBar.Value = 0;
            var sw = Stopwatch.StartNew();

            try
            {
                var progress = new Progress<LoadProgress>(p =>
                {
                    _progressBar.Value = Math.Max(0, Math.Min(100, p.Percent));
                    _statusLabel.Text = string.Format("內建字庫載入中：{0:N0} 筆 / {1}%", p.RowsLoaded, p.Percent);
                });

                LoadResult result = await Task.Run(delegate
                {
                    return BuiltInEnglishDatabase.Load(Application.StartupPath, _loadCts.Token, progress);
                });

                _allWords.Clear();
                _allWords.AddRange(result.Items);
                _currentFilePath = "內建英文字庫";
                _currentBaseDirectory = Application.StartupPath;

                _insightEngine.Analyze(_allWords, _currentBaseDirectory);
                ApplyLearningStateToAll();
                ApplyFilterAndRefresh();
                sw.Stop();

                _statusLabel.Text = string.Format("已載入內建英文字庫：{0:N0} 筆", _allWords.Count);
                Text = "TSV Studio Product Edition - 內建英文字庫";
                ShowToast("內建英文字庫載入完成：" + _allWords.Count.ToString("N0") + " 筆");
                Log(string.Format("內建英文字庫載入完成：{0:N0} 筆，來源 {1}，耗時 {2:N2} 秒。", _allWords.Count, result.DelimiterName, sw.Elapsed.TotalSeconds));

                if (!silent && _allWords.Count < 1000)
                {
                    Log("提示：若要使用完整大型英文字庫，將 BuiltInEnglishDatabase.tsv、InternalEnglishDatabase.tsv、english_words.txt 或 words_alpha.txt 放到 exe 同層，按 Ctrl+I 即可直接載入，不需要開啟檔案對話框。缺少音檔時會自動使用 TTS 朗讀。");
                }
            }
            catch (OperationCanceledException)
            {
                Log("內建字庫載入已取消。 ");
            }
            catch (Exception ex)
            {
                Log("內建字庫載入失敗：" + ex.Message);
                if (!silent) ShowWarning(ex.Message, "內建字庫載入失敗");
            }
            finally
            {
                _progressBar.Value = 0;
                SetBusy(false, "就緒");
            }
        }

        private void OpenFileByDialog()
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.FileName = "";
                dialog.Filter =
                    "所有檔案 (*.*)|*.*|" +
                    "所有支援格式 (*.tsv;*.txt;*.csv;*.xlsx;*.xls)|*.tsv;*.txt;*.csv;*.xlsx;*.xls|" +
                    "TSV 檔案 (*.tsv)|*.tsv|" +
                    "文字檔 (*.txt)|*.txt|" +
                    "CSV 檔案 (*.csv)|*.csv|" +
                    "Excel 活頁簿 (*.xlsx;*.xls)|*.xlsx;*.xls";
                dialog.FilterIndex = 1;
                dialog.Title = "開啟字典資料檔（TSV / TXT / CSV / Excel / 所有檔案）";
                dialog.InitialDirectory = Directory.Exists(Application.StartupPath) ? Application.StartupPath : Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    LoadFileAsync(dialog.FileName);
                }
            }
        }

        private async void LoadFileAsync(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            {
                ShowWarning("找不到檔案。", "開啟失敗");
                return;
            }

            if (_loadCts != null)
            {
                _loadCts.Cancel();
                _loadCts.Dispose();
            }
            _loadCts = new CancellationTokenSource();

            SetBusy(true, "正在載入資料...");
            _progressBar.Value = 0;
            var sw = Stopwatch.StartNew();
            try
            {
                var progress = new Progress<LoadProgress>(p =>
                {
                    _progressBar.Value = Math.Max(0, Math.Min(100, p.Percent));
                    _statusLabel.Text = string.Format("載入中：{0:N0} 列 / {1}%", p.RowsLoaded, p.Percent);
                });

                LoadResult result = await Task.Run(delegate
                {
                    return _loader.Load(path, _loadCts.Token, progress);
                });

                _allWords.Clear();
                _allWords.AddRange(result.Items);
                _currentFilePath = path;
                _currentBaseDirectory = Path.GetDirectoryName(path) ?? string.Empty;
                _recentFileStore.Add(path);

                _insightEngine.Analyze(_allWords, _currentBaseDirectory);
                ApplyLearningStateToAll();
                ApplyFilterAndRefresh();
                sw.Stop();

                Log(string.Format("載入完成：{0:N0} 筆，耗時 {1:N2} 秒，編碼 {2}，分隔符號 {3}",
                    _allWords.Count, sw.Elapsed.TotalSeconds, result.EncodingName, result.DelimiterName));

                _statusLabel.Text = string.Format("{0:N0} 筆資料已載入：{1}", _allWords.Count, Path.GetFileName(path));
                Text = "TSV Studio Product Edition - " + Path.GetFileName(path);
                ShowToast("載入完成：" + _allWords.Count.ToString("N0") + " 筆資料");
            }
            catch (OperationCanceledException)
            {
                Log("載入已取消。");
                _statusLabel.Text = "載入已取消";
            }
            catch (Exception ex)
            {
                Log("載入失敗：" + ex.Message);
                ShowWarning(ex.Message, "載入失敗");
            }
            finally
            {
                _progressBar.Value = 0;
                SetBusy(false, "就緒");
            }
        }

        private void ReloadCurrentFile()
        {
            if (string.IsNullOrWhiteSpace(_currentFilePath) || !File.Exists(_currentFilePath))
            {
                ShowWarning("尚未開啟檔案，或目前檔案已不存在。", "無法重新載入");
                return;
            }
            LoadFileAsync(_currentFilePath);
        }

        private void SetBusy(bool busy, string status)
        {
            UseWaitCursor = busy;
            _statusLabel.Text = status;
            _toolBar.Enabled = !busy;
            _menu.Enabled = !busy;
        }

        private void ApplyFilterAndRefresh()
        {
            string query = _searchBox == null ? string.Empty : _searchBox.Text.Trim().ToLowerInvariant();
            string risk = _riskComboBox == null || _riskComboBox.SelectedItem == null ? "全部" : _riskComboBox.SelectedItem.ToString();

            IEnumerable<WordItem> view = _allWords;

            if (!string.IsNullOrWhiteSpace(query))
            {
                view = view.Where(delegate (WordItem item)
                {
                    return SafeLower(item.Word).Contains(query)
                        || SafeLower(item.Phonogram).Contains(query)
                        || SafeLower(item.SoundPath).Contains(query)
                        || SafeLower(item.Explain).Contains(query)
                        || SafeLower(item.IssuesText).Contains(query)
                        || SafeLower(item.AiLevel).Contains(query);
                });
            }

            if (!string.IsNullOrWhiteSpace(risk) && risk != "全部")
            {
                view = view.Where(item => string.Equals(item.RiskLevel, risk, StringComparison.OrdinalIgnoreCase));
            }

            view = ApplyCurrentSort(view);
            var list = view.ToList();
            _bindingSource.DataSource = new BindingList<WordItem>(list);
            RefreshAllViews();
            _statusLabel.Text = string.Format("顯示 {0:N0} / 總計 {1:N0} 筆", list.Count, _allWords.Count);
        }

        private IEnumerable<WordItem> ApplyCurrentSort(IEnumerable<WordItem> source)
        {
            Func<WordItem, object> selector;
            switch (_lastSortProperty)
            {
                case "Phonogram": selector = x => x.Phonogram; break;
                case "SoundPath": selector = x => x.SoundPath; break;
                case "Explain": selector = x => x.Explain; break;
                case "AiLevel": selector = x => x.AiLevel; break;
                case "QualityScore": selector = x => x.QualityScore; break;
                case "RiskLevel": selector = x => x.RiskScore; break;
                case "IssuesText": selector = x => x.IssuesText; break;
                case "LearningBadge": selector = x => x.LearningBadge; break;
                case "ReviewCount": selector = x => x.ReviewCount; break;
                default: selector = x => x.Word; break;
            }
            return _sortAscending ? source.OrderBy(selector).ThenBy(x => x.LineNumber) : source.OrderByDescending(selector).ThenBy(x => x.LineNumber);
        }

        private static string SafeLower(string value)
        {
            return string.IsNullOrEmpty(value) ? string.Empty : value.ToLowerInvariant();
        }

        private void RefreshAllViews()
        {
            RefreshCards();
            RefreshIssueRadar();
            RefreshStatsText();
            RefreshSecurityText();
            RefreshVisualDashboard();
            RefreshWelcomeDashboard();
            RefreshLearningHistory();
            RefreshExtensionCenterText();
            RefreshStudyPlanText();
            UpdatePreviewFromSelection();
        }

        private void RefreshVisualDashboard()
        {
            if (_chartPanel == null) return;
            _chartPanel.SetData(_allWords, _activeTheme);
        }

        private void RefreshCards()
        {
            if (_cardsPanel == null) return;
            _cardsPanel.SuspendLayout();
            _cardsPanel.Controls.Clear();

            var summary = InsightSummary.From(_allWords);
            _cardsPanel.Controls.Add(CreateMetricCard("總筆數", summary.Total.ToString("N0"), "目前資料量"));
            _cardsPanel.Controls.Add(CreateMetricCard("唯一單字", summary.UniqueWords.ToString("N0"), "去重後數量"));
            _cardsPanel.Controls.Add(CreateMetricCard("高風險", summary.HighRisk.ToString("N0"), "需要立即處理"));
            _cardsPanel.Controls.Add(CreateMetricCard("缺音檔", summary.MissingAudio.ToString("N0"), "學習體驗缺口"));
            _cardsPanel.Controls.Add(CreateMetricCard("平均品質", summary.AverageQuality.ToString("N1"), "0 到 100 分"));
            _cardsPanel.Controls.Add(CreateMetricCard("重複資料", summary.Duplicates.ToString("N0"), "可能需要合併"));

            _cardsPanel.ResumeLayout();
        }

        private Control CreateMetricCard(string title, string value, string caption)
        {
            var card = new GradientPanel();
            card.Width = 260;
            card.Height = 82;
            card.Margin = new Padding(0, 0, 0, 10);
            card.Padding = new Padding(12, 8, 12, 8);

            var valueLabel = new Label();
            valueLabel.Text = value;
            valueLabel.Dock = DockStyle.Top;
            valueLabel.Height = 28;
            valueLabel.Font = new Font(Font.FontFamily, 15F, FontStyle.Bold);
            valueLabel.TextAlign = ContentAlignment.MiddleLeft;

            var titleLabel = new Label();
            titleLabel.Text = title;
            titleLabel.Dock = DockStyle.Top;
            titleLabel.Height = 20;
            titleLabel.Font = new Font(Font.FontFamily, 9F, FontStyle.Bold);

            var captionLabel = new Label();
            captionLabel.Text = caption;
            captionLabel.Dock = DockStyle.Fill;
            captionLabel.Font = new Font(Font.FontFamily, 8F, FontStyle.Regular);

            card.Controls.Add(captionLabel);
            card.Controls.Add(titleLabel);
            card.Controls.Add(valueLabel);
            return card;
        }

        private void RestoreDashboardLayout()
        {
            ApplySafeMainSplitterLayout();
            ApplySafeRightSplitterLayout();
            ResizeMetricCards();
        }

        private void ApplySafeMainSplitterLayout()
        {
            if (_mainSplit == null || _mainSplit.IsDisposed) return;

            int totalWidth = _mainSplit.ClientSize.Width;
            int splitterWidth = Math.Max(1, _mainSplit.SplitterWidth);
            if (totalWidth <= splitterWidth + 80) return;

            // 依照實際寬度動態計算限制，確保 leftMin + rightMin + splitterWidth <= totalWidth。
            int leftMin = Math.Min(LeftPaneMinWidth, Math.Max(80, totalWidth / 4));
            int rightMin = Math.Min(RightPaneMinWidth, Math.Max(160, totalWidth - leftMin - splitterWidth));

            if (leftMin + rightMin + splitterWidth > totalWidth)
            {
                rightMin = Math.Max(0, totalWidth - leftMin - splitterWidth);
            }

            if (leftMin + rightMin + splitterWidth > totalWidth)
            {
                leftMin = Math.Max(0, totalWidth - rightMin - splitterWidth);
            }

            int maxDistance = Math.Max(0, totalWidth - rightMin - splitterWidth);
            int target = Math.Max(leftMin, Math.Min(LeftPanePreferredWidth, maxDistance));
            target = Math.Max(0, Math.Min(target, Math.Max(0, totalWidth - splitterWidth)));

            try
            {
                // 先解除限制，再調整 SplitterDistance，最後套回新的限制。
                _mainSplit.Panel1MinSize = 0;
                _mainSplit.Panel2MinSize = 0;
                _mainSplit.SplitterDistance = target;
                _mainSplit.Panel1MinSize = leftMin;
                _mainSplit.Panel2MinSize = rightMin;
            }
            catch (InvalidOperationException)
            {
                // WinForms 正在重新配置 Dock 時可能短暫失敗；保持安全值即可，不讓程式中斷。
                try
                {
                    _mainSplit.Panel1MinSize = 0;
                    _mainSplit.Panel2MinSize = 0;
                }
                catch { }
            }
        }

        private void ApplySafeRightSplitterLayout()
        {
            if (_rightSplit == null || _rightSplit.IsDisposed) return;

            int totalHeight = _rightSplit.ClientSize.Height;
            int splitterWidth = Math.Max(1, _rightSplit.SplitterWidth);
            if (totalHeight <= splitterWidth + 80) return;

            int topMin = Math.Min(260, Math.Max(80, totalHeight / 3));
            int bottomMin = Math.Min(190, Math.Max(80, totalHeight / 4));

            if (topMin + bottomMin + splitterWidth > totalHeight)
            {
                bottomMin = Math.Max(0, totalHeight - topMin - splitterWidth);
            }

            int maxDistance = Math.Max(0, totalHeight - bottomMin - splitterWidth);
            int target = Math.Max(topMin, Math.Min(510, maxDistance));
            target = Math.Max(0, Math.Min(target, Math.Max(0, totalHeight - splitterWidth)));

            try
            {
                _rightSplit.Panel1MinSize = 0;
                _rightSplit.Panel2MinSize = 0;
                _rightSplit.SplitterDistance = target;
                _rightSplit.Panel1MinSize = topMin;
                _rightSplit.Panel2MinSize = bottomMin;
            }
            catch (InvalidOperationException)
            {
                try
                {
                    _rightSplit.Panel1MinSize = 0;
                    _rightSplit.Panel2MinSize = 0;
                }
                catch { }
            }
        }

        private void ResizeMetricCards()
        {
            if (_cardsPanel == null || _cardsPanel.IsDisposed) return;

            int availableWidth = _cardsPanel.ClientSize.Width - SystemInformation.VerticalScrollBarWidth - 2;
            int cardWidth = Math.Max(220, availableWidth);

            foreach (Control control in _cardsPanel.Controls)
            {
                control.Width = cardWidth;
            }
        }

        private void RefreshIssueRadar()
        {
            if (_issueList == null) return;
            _issueList.Items.Clear();
            if (_allWords.Count == 0)
            {
                _issueList.Items.Add("尚未載入資料。");
                _issueList.Items.Add("建議：先開啟 TSV 檔，再執行 AI 分析。");
                return;
            }

            var topIssues = _allWords
                .SelectMany(w => w.Issues)
                .GroupBy(x => x)
                .Select(g => new { Issue = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Issue)
                .Take(18)
                .ToList();

            if (topIssues.Count == 0)
            {
                _issueList.Items.Add("目前沒有明顯問題，資料狀況良好。");
                return;
            }

            foreach (var issue in topIssues)
            {
                _issueList.Items.Add(string.Format("{0:N0}  {1}", issue.Count, issue.Issue));
            }
        }

        private void RefreshStatsText()
        {
            if (_statsText == null) return;
            _statsText.Text = ReportBuilder.BuildStatisticsReport(_allWords, _currentFilePath);
        }

        private void RefreshSecurityText()
        {
            if (_securityText == null) return;
            _securityText.Text = ReportBuilder.BuildSecurityReport(_allWords, _currentFilePath, _currentBaseDirectory);
        }

        private void UpdatePreviewFromSelection()
        {
            if (_previewText == null) return;
            WordItem item = GetSelectedWord();
            if (item == null)
            {
                _previewText.Text = "尚未選取資料列。";
                UpdatePlayerPanel(null);
                UpdateDetailPanel(null);
                return;
            }

            UpdatePlayerPanel(item);
            UpdateDetailPanel(item);

            var sb = new StringBuilder();
            sb.AppendLine("單字：" + item.Word);
            sb.AppendLine("音標：" + item.Phonogram);
            sb.AppendLine("學習狀態：" + item.LearningBadge + "，複習次數：" + item.ReviewCount.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine("音檔：" + item.SoundPath);
            sb.AppendLine("音檔完整路徑：" + item.ResolveSoundPath(_currentBaseDirectory));
            sb.AppendLine("AI 難度：" + item.AiLevel);
            sb.AppendLine("品質分數：" + item.QualityScore.ToString("N1"));
            sb.AppendLine("風險等級：" + item.RiskLevel);
            sb.AppendLine("原始列號：" + item.LineNumber.ToString(CultureInfo.InvariantCulture));
            sb.AppendLine();
            sb.AppendLine("解釋：");
            sb.AppendLine(item.Explain);
            sb.AppendLine();
            sb.AppendLine("問題標籤：");
            if (item.Issues.Count == 0) sb.AppendLine("無");
            else foreach (string issue in item.Issues) sb.AppendLine("- " + issue);
            sb.AppendLine();
            sb.AppendLine("AI 建議：");
            sb.AppendLine(item.Recommendation);
            sb.AppendLine();
            sb.AppendLine("原始資料：");
            sb.AppendLine(item.RawLine);
            _previewText.Text = sb.ToString();
        }

        private WordItem GetSelectedWord()
        {
            if (_grid == null || _grid.SelectedRows.Count == 0) return null;
            return _grid.SelectedRows[0].DataBoundItem as WordItem;
        }

        private IEnumerable<WordItem> GetVisibleWords()
        {
            var list = _bindingSource.DataSource as BindingList<WordItem>;
            if (list == null) return Enumerable.Empty<WordItem>();
            return list.ToList();
        }

        private void RunAiAnalysis()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入檔案。", "AI 分析");
                return;
            }
            var sw = Stopwatch.StartNew();
            _insightEngine.Analyze(_allWords, _currentBaseDirectory);
            sw.Stop();
            ApplyFilterAndRefresh();
            Log(string.Format("AI 品質分析完成，耗時 {0:N2} 秒。", sw.Elapsed.TotalSeconds));
            if (_bottomTabs != null) _bottomTabs.SelectedTab = _chartTab ?? _bottomTabs.SelectedTab;
        }

        private void RunSecurityScan()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入檔案。", "資安掃描");
                return;
            }
            _insightEngine.Analyze(_allWords, _currentBaseDirectory);
            ApplyFilterAndRefresh();
            if (_bottomTabs != null && _securityText != null) _bottomTabs.SelectedTab = _bottomTabs.TabPages.Cast<TabPage>().FirstOrDefault(p => p.Text == "資安報告") ?? _bottomTabs.SelectedTab;
            Log("資安掃描完成。已檢查路徑穿越、可疑指令字串、危險副檔名、外部路徑與 HTML/Script 注入。 ");
        }

        private void ValidateAudioFiles()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入檔案。", "音檔驗證");
                return;
            }

            int ok = 0;
            int missing = 0;
            int unsafePath = 0;
            foreach (var item in _allWords)
            {
                string resolved = item.ResolveSoundPath(_currentBaseDirectory);
                if (string.IsNullOrWhiteSpace(item.SoundPath)) missing++;
                else if (SecurityInspector.HasSuspiciousPath(item.SoundPath)) unsafePath++;
                else if (File.Exists(resolved)) ok++;
                else missing++;
            }
            Log(string.Format("音檔驗證完成：存在 {0:N0}，缺失 {1:N0}，可疑路徑 {2:N0}。", ok, missing, unsafePath));
            if (_audioScanText != null)
            {
                _audioScanText.Text = string.Format("音檔驗證完成：存在 {0:N0}，缺失 {1:N0}，可疑路徑 {2:N0}。", ok, missing, unsafePath);
            }
            RefreshAllViews();
        }

        private void PlaySelectedAudio()
        {
            WordItem item = GetSelectedWord();
            if (item == null)
            {
                ShowWarning("請先選取一筆資料。", "播放音檔");
                return;
            }

            PlayWordItemInline(item, false);
        }

        private void SpeakSelectedWord()
        {
            WordItem item = GetSelectedWord();
            if (item == null)
            {
                ShowWarning("請先選取一筆資料。", "語音朗讀");
                return;
            }

            PlayWordItemInline(item, true);
        }

        private void StopInlineAudio()
        {
            try
            {
                _audioPlayer.Stop();
                if (_playerProgressBar != null) _playerProgressBar.Value = 0;
                if (_playerTimeLabel != null) _playerTimeLabel.Text = "00:00 / 00:00";
                SetPlayerStatus("狀態：已停止播放。 ");
                Log("播放器已停止。 ");
            }
            catch (Exception ex)
            {
                Log("停止播放器失敗：" + ex.Message);
            }
        }

        private void PlayWordItemInline(WordItem item, bool forceSpeech)
        {
            if (item == null) return;

            UpdatePlayerPanel(item);
            if (_playerTab != null && _bottomTabs != null)
            {
                _bottomTabs.SelectedTab = _playerTab;
            }

            if (forceSpeech)
            {
                SpeakWordWithSystemVoice(item);
                return;
            }

            string path = item.ResolveSoundPath(_currentBaseDirectory);
            bool hasAudioPath = !string.IsNullOrWhiteSpace(item.SoundPath);

            if (!hasAudioPath)
            {
                SpeakWordWithSystemVoice(item);
                return;
            }

            if (SecurityInspector.HasSuspiciousPath(item.SoundPath))
            {
                ShowWarning("此音檔路徑被判定為可疑，已阻擋播放。", "播放已阻擋");
                SetPlayerStatus("狀態：播放已阻擋，可疑音檔路徑。 ");
                return;
            }

            if (!AudioInspector.IsAllowedAudioExtension(path))
            {
                ShowWarning("只允許播放 .mp3、.wav、.m4a、.aac、.wma、.flac 音訊檔。", "播放已阻擋");
                SetPlayerStatus("狀態：播放已阻擋，不支援的音訊格式。 ");
                return;
            }

            if (!File.Exists(path))
            {
                SetPlayerStatus("狀態：找不到音檔，已改用系統 TTS 朗讀：" + item.Word);
                Log("找不到音檔，改用 TTS：" + path);
                SpeakWordWithSystemVoice(item);
                return;
            }

            try
            {
                _audioPlayer.PlayFile(path);
                if (_volumeTrackBar != null) _audioPlayer.SetVolume(_volumeTrackBar.Value);
                SetPlayerStatus("狀態：頁面內播放中：" + Path.GetFileName(path));
                Log("頁面內播放音檔：" + path);
            }
            catch (Exception ex)
            {
                SetPlayerStatus("狀態：音檔播放失敗，已改用系統 TTS。原因：" + ex.Message);
                Log("音檔播放失敗，改用 TTS：" + ex.Message);
                SpeakWordWithSystemVoice(item);
            }
        }

        private void SpeakWordWithSystemVoice(WordItem item)
        {
            string text = item == null ? string.Empty : item.Word;
            if (string.IsNullOrWhiteSpace(text))
            {
                ShowWarning("此筆資料沒有可朗讀的單字。", "語音朗讀");
                return;
            }

            try
            {
                _audioPlayer.Speak(text);
                if (_playerProgressBar != null) _playerProgressBar.Value = 0;
                if (_playerTimeLabel != null) _playerTimeLabel.Text = "TTS 朗讀中";
                SetPlayerStatus("狀態：使用 Windows SAPI 語音合成朗讀：" + text);
                Log("TTS 朗讀單字：" + text);
            }
            catch (Exception ex)
            {
                SetPlayerStatus("狀態：TTS 朗讀失敗：" + ex.Message);
                ShowWarning("系統語音合成失敗：" + ex.Message, "語音朗讀失敗");
                Log("TTS 朗讀失敗：" + ex.Message);
            }
        }

        private void UpdatePlayerPanel(WordItem item)
        {
            if (_playerWordLabel == null || _playerPathLabel == null) return;

            if (item == null)
            {
                _playerWordLabel.Text = "目前單字：尚未選取";
                _playerPathLabel.Text = "音訊來源：尚未選取";
                return;
            }

            string resolved = item.ResolveSoundPath(_currentBaseDirectory);
            _playerWordLabel.Text = "目前單字：" + (string.IsNullOrWhiteSpace(item.Word) ? "（空白）" : item.Word) + "    音標：" + (item.Phonogram ?? string.Empty);

            if (string.IsNullOrWhiteSpace(item.SoundPath))
            {
                _playerPathLabel.Text = "音訊來源：此筆沒有音檔路徑，會使用 Windows SAPI TTS 朗讀。";
            }
            else if (File.Exists(resolved))
            {
                _playerPathLabel.Text = "音訊來源：" + resolved;
            }
            else
            {
                _playerPathLabel.Text = "音訊來源：找不到音檔，會自動改用 TTS。原路徑：" + resolved;
            }
        }

        private void SetPlayerStatus(string status)
        {
            if (_playerStatusLabel != null)
            {
                _playerStatusLabel.Text = status;
            }
            _statusLabel.Text = status.Replace("狀態：", string.Empty).Trim();
        }


        private void PauseInlineAudio()
        {
            try
            {
                _audioPlayer.Pause();
                SetPlayerStatus("狀態：已暫停。 ");
            }
            catch (Exception ex)
            {
                Log("暫停失敗：" + ex.Message);
            }
        }

        private void ResumeInlineAudio()
        {
            try
            {
                _audioPlayer.Resume();
                SetPlayerStatus("狀態：繼續播放。 ");
            }
            catch (Exception ex)
            {
                Log("繼續播放失敗：" + ex.Message);
            }
        }

        private void PlayPreviousWord()
        {
            MoveSelectionAndPlay(-1);
        }

        private void PlayNextWord()
        {
            MoveSelectionAndPlay(1);
        }

        private void MoveSelectionAndPlay(int delta)
        {
            if (_grid == null || _grid.Rows.Count == 0) return;
            int index = _grid.CurrentRow == null ? 0 : _grid.CurrentRow.Index + delta;
            if (index < 0) index = _grid.Rows.Count - 1;
            if (index >= _grid.Rows.Count) index = 0;
            _grid.ClearSelection();
            _grid.Rows[index].Selected = true;
            _grid.CurrentCell = _grid.Rows[index].Cells[0];
            PlaySelectedAudio();
        }

        private void UpdatePlayerProgressTick()
        {
            if (_playerProgressBar == null || _playerTimeLabel == null) return;
            try
            {
                int length = _audioPlayer.GetLengthMilliseconds();
                int position = _audioPlayer.GetPositionMilliseconds();
                string mode = _audioPlayer.GetMode();

                if (length > 0 && position >= 0)
                {
                    int value = Math.Max(0, Math.Min(1000, position * 1000 / Math.Max(1, length)));
                    _playerProgressBar.Value = value;
                    _playerTimeLabel.Text = FormatDuration(position) + " / " + FormatDuration(length);
                }

                if (mode == "stopped" && length > 0 && position >= length - 500)
                {
                    if (_playerLoopCheckBox != null && _playerLoopCheckBox.Checked) PlaySelectedAudio();
                    else if (_playerAutoNextCheckBox != null && _playerAutoNextCheckBox.Checked) PlayNextWord();
                }
            }
            catch
            {
                // MCI 在未開啟音檔時會回傳錯誤，忽略即可。
            }
        }

        private static string FormatDuration(int milliseconds)
        {
            if (milliseconds < 0) milliseconds = 0;
            TimeSpan span = TimeSpan.FromMilliseconds(milliseconds);
            return span.TotalHours >= 1 ? span.ToString(@"h\:mm\:ss") : span.ToString(@"mm\:ss");
        }

        private void UpdateDetailPanel(WordItem item)
        {
            if (_detailWordBox == null) return;
            if (item == null)
            {
                _detailWordBox.Text = string.Empty;
                _detailPhonogramBox.Text = string.Empty;
                _detailSoundPathBox.Text = string.Empty;
                _detailExplainBox.Text = string.Empty;
                _detailMetaLabel.Text = "尚未選取資料。";
                _detailFavoriteCheckBox.Checked = false;
                _detailLearnedCheckBox.Checked = false;
                return;
            }

            _detailWordBox.Text = item.Word ?? string.Empty;
            _detailPhonogramBox.Text = item.Phonogram ?? string.Empty;
            _detailSoundPathBox.Text = item.SoundPath ?? string.Empty;
            _detailExplainBox.Text = item.Explain ?? string.Empty;
            _detailFavoriteCheckBox.Checked = item.IsFavorite;
            _detailLearnedCheckBox.Checked = item.IsLearned;
            _detailMetaLabel.Text = string.Format("列號 {0}｜AI {1}｜品質 {2:N1}｜風險 {3}｜複習 {4:N0} 次", item.LineNumber, item.AiLevel, item.QualityScore, item.RiskLevel, item.ReviewCount);
        }

        private void SaveDetailEdits()
        {
            WordItem item = GetSelectedWord();
            if (item == null)
            {
                ShowWarning("請先選取一筆資料。", "儲存詳細資料");
                return;
            }
            item.Word = TextCleaner.CleanCell(_detailWordBox.Text);
            item.Phonogram = TextCleaner.CleanCell(_detailPhonogramBox.Text);
            item.SoundPath = TextCleaner.CleanCell(_detailSoundPathBox.Text);
            item.Explain = TextCleaner.CleanLongText(_detailExplainBox.Text);
            item.IsFavorite = _detailFavoriteCheckBox.Checked;
            item.IsLearned = _detailLearnedCheckBox.Checked;
            _learningStore.Update(item);
            _learningStore.Save(Application.StartupPath);
            _insightEngine.Analyze(_allWords, _currentBaseDirectory);
            _grid.Refresh();
            RefreshAllViews();
            Log("已儲存詳細面板修改：" + item.Word);
        }

        private void ToggleFavoriteForSelected()
        {
            WordItem item = GetSelectedWord();
            if (item == null) return;
            item.IsFavorite = !item.IsFavorite;
            _learningStore.Update(item);
            _learningStore.Save(Application.StartupPath);
            UpdateDetailPanel(item);
            _grid.Refresh();
            Log((item.IsFavorite ? "已收藏：" : "已取消收藏：") + item.Word);
        }

        private void MarkSelectedAsLearned()
        {
            WordItem item = GetSelectedWord();
            if (item == null) return;
            item.IsLearned = true;
            item.ReviewCount++;
            item.NextReviewDate = DateTime.Today.AddDays(Math.Min(60, Math.Max(1, item.ReviewCount * 2)));
            _learningStore.Update(item);
            _learningStore.Save(Application.StartupPath);
            _learningHistory.RecordLearned(1);
            _learningHistory.Save(Application.StartupPath);
            RefreshLearningHistory();
            UpdateDetailPanel(item);
            _grid.Refresh();
            Log("已標記為學會：" + item.Word);
            ShowToast("已標記為學會：" + item.Word);
        }

        private void ApplyLearningStateToAll()
        {
            _learningStore.Apply(_allWords);
        }

        private void SaveLearningStateFromAll()
        {
            foreach (WordItem item in _allWords) _learningStore.Update(item);
            _learningStore.Save(Application.StartupPath);
        }

        private void LoadLocalWordDatabase()
        {
            try
            {
                List<WordItem> items = _localDatabase.Load(Application.StartupPath);
                if (items.Count == 0)
                {
                    ShowWarning("本機學習資料庫目前是空的。可先載入內建字庫或檔案，再按「匯入目前資料到本機學習資料庫」。", "本機資料庫");
                    return;
                }
                _allWords.Clear();
                _allWords.AddRange(items);
                _currentFilePath = "本機學習資料庫";
                _currentBaseDirectory = Application.StartupPath;
                _insightEngine.Analyze(_allWords, _currentBaseDirectory);
                ApplyLearningStateToAll();
                ApplyFilterAndRefresh();
                Text = "TSV Studio Product Edition - 本機學習資料庫";
                Log("已載入本機學習資料庫：" + _allWords.Count.ToString("N0") + " 筆。 ");
            }
            catch (Exception ex)
            {
                ShowWarning(ex.Message, "本機資料庫載入失敗");
            }
        }

        private void ImportCurrentDataToLocalDatabase()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("目前沒有資料可以匯入。", "本機資料庫");
                return;
            }
            try
            {
                int count = _localDatabase.MergeAndSave(Application.StartupPath, _allWords);
                Log("已匯入 / 合併本機學習資料庫，目前資料庫共 " + count.ToString("N0") + " 筆。 ");
                ShowWarning("已匯入 / 合併完成，目前本機學習資料庫共 " + count.ToString("N0") + " 筆。", "本機資料庫");
            }
            catch (Exception ex)
            {
                ShowWarning(ex.Message, "本機資料庫匯入失敗");
            }
        }

        private void StartQuiz()
        {
            StartQuizInternal(false);
        }

        private void StartHardQuiz()
        {
            StartQuizInternal(true);
        }

        private void StartQuizInternal(bool hardOnly)
        {
            List<WordItem> pool = GetVisibleWords().Where(x => !string.IsNullOrWhiteSpace(x.Word)).ToList();
            if (hardOnly) pool = pool.Where(x => x.QualityScore < 70 || x.RiskLevel == "中" || x.RiskLevel == "高" || x.RiskLevel == "致命" || !x.IsLearned).ToList();
            if (pool.Count < 4)
            {
                ShowWarning("至少需要 4 筆有單字的資料才能開始測驗。", "測驗模式");
                return;
            }

            _quizCurrentItem = pool[_quizRandom.Next(pool.Count)];
            string mode = _quizModeComboBox == null ? "英文選中文" : Convert.ToString(_quizModeComboBox.SelectedItem);
            if (string.IsNullOrWhiteSpace(mode)) mode = "英文選中文";

            List<WordItem> options = pool.Where(x => !string.Equals(x.Word, _quizCurrentItem.Word, StringComparison.OrdinalIgnoreCase)).OrderBy(x => _quizRandom.Next()).Take(3).ToList();
            options.Add(_quizCurrentItem);
            options = options.OrderBy(x => _quizRandom.Next()).ToList();
            _quizCorrectIndex = options.FindIndex(x => object.ReferenceEquals(x, _quizCurrentItem));

            if (mode == "中文選英文")
            {
                _quizQuestionLabel.Text = "請選出這個解釋對應的英文：" + Environment.NewLine + TrimForQuiz(_quizCurrentItem.Explain, 80);
                for (int i = 0; i < 4; i++) _quizButtons[i].Text = options[i].Word;
            }
            else if (mode == "聽音選單字")
            {
                _quizQuestionLabel.Text = "請聽發音後選出正確單字。";
                for (int i = 0; i < 4; i++) _quizButtons[i].Text = options[i].Word;
                PlayWordItemInline(_quizCurrentItem, false);
            }
            else
            {
                _quizQuestionLabel.Text = "請選出「" + _quizCurrentItem.Word + "」的中文解釋。";
                for (int i = 0; i < 4; i++) _quizButtons[i].Text = TrimForQuiz(options[i].Explain, 80);
            }

            if (_quizAutoSpeakCheckBox != null && _quizAutoSpeakCheckBox.Checked && mode != "聽音選單字") SpeakWordWithSystemVoice(_quizCurrentItem);
            _quizFeedbackLabel.Text = "請選擇答案。";
            if (_bottomTabs != null && _quizTab != null) _bottomTabs.SelectedTab = _quizTab;
        }

        private void CheckQuizAnswer(int index)
        {
            if (_quizCurrentItem == null || _quizCorrectIndex < 0) return;
            _quizTotal++;
            if (index == _quizCorrectIndex)
            {
                _quizCorrect++;
                _quizCurrentItem.ReviewCount++;
                _quizCurrentItem.IsLearned = _quizCurrentItem.ReviewCount >= 3;
                _quizCurrentItem.NextReviewDate = DateTime.Today.AddDays(Math.Min(60, Math.Max(1, _quizCurrentItem.ReviewCount * 2)));
                _quizFeedbackLabel.Text = "答對了！";
            }
            else
            {
                _quizCurrentItem.IsLearned = false;
                _quizCurrentItem.NextReviewDate = DateTime.Today.AddDays(1);
                _quizFeedbackLabel.Text = "答錯。正確答案是：" + _quizButtons[_quizCorrectIndex].Text;
            }

            _learningStore.Update(_quizCurrentItem);
            _learningStore.Save(Application.StartupPath);
            _learningHistory.RecordQuiz(index == _quizCorrectIndex);
            if (index == _quizCorrectIndex && _quizCurrentItem.IsLearned) _learningHistory.RecordLearned(1);
            _learningHistory.Save(Application.StartupPath);
            RefreshLearningHistory();
            _quizScoreLabel.Text = string.Format("正確率：{0:N0} / {1:N0}（{2:N1}%）", _quizCorrect, _quizTotal, _quizTotal == 0 ? 0 : _quizCorrect * 100.0 / _quizTotal);
            _grid.Refresh();
            ShowToast(index == _quizCorrectIndex ? "測驗答對" : "測驗答錯，已加入複習");
        }

        private static string TrimForQuiz(string value, int maxLength)
        {
            value = string.IsNullOrWhiteSpace(value) ? "（沒有解釋）" : value.Replace("\r", " ").Replace("\n", " ").Trim();
            return value.Length <= maxLength ? value : value.Substring(0, maxLength) + "...";
        }

        private void RunAudioIntegrityScanner()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入資料。", "音檔治理");
                return;
            }
            AudioIntegrityReport report = AudioIntegrityScanner.Scan(_allWords, _currentBaseDirectory);
            if (_audioScanText != null) _audioScanText.Text = report.ToText();
            if (_bottomTabs != null && _audioScanTab != null) _bottomTabs.SelectedTab = _audioScanTab;
            Log("音檔治理掃描完成：" + report.SummaryLine);
        }

        private void AutoRepairAudioPaths()
        {
            if (_allWords.Count == 0) return;
            AudioIntegrityReport report = AudioIntegrityScanner.Scan(_allWords, _currentBaseDirectory);
            int repaired = 0;
            foreach (AudioRepairSuggestion suggestion in report.Suggestions)
            {
                if (suggestion.Item != null && !string.IsNullOrWhiteSpace(suggestion.RecommendedRelativePath))
                {
                    suggestion.Item.SoundPath = suggestion.RecommendedRelativePath;
                    repaired++;
                }
            }
            _insightEngine.Analyze(_allWords, _currentBaseDirectory);
            ApplyFilterAndRefresh();
            RunAudioIntegrityScanner();
            Log("自動修復音檔路徑完成：" + repaired.ToString("N0") + " 筆。 ");
        }

        private void ShowCommandPalette()
        {
            var commands = new List<CommandEntry>();
            commands.Add(new CommandEntry("首頁", ShowHome));
            commands.Add(new CommandEntry("開啟檔案", OpenFileByDialog));
            commands.Add(new CommandEntry("資料匯入精靈", ShowImportWizard));
            commands.Add(new CommandEntry("載入內建英文字庫", LoadBuiltInEnglishDatabase));
            commands.Add(new CommandEntry("載入本機學習資料庫", LoadLocalWordDatabase));
            commands.Add(new CommandEntry("開始測驗", StartQuiz));
            commands.Add(new CommandEntry("音檔治理掃描", RunAudioIntegrityScanner));
            commands.Add(new CommandEntry("頁內播放", PlaySelectedAudio));
            commands.Add(new CommandEntry("TTS 朗讀", SpeakSelectedWord));
            commands.Add(new CommandEntry("AI 品質分析", RunAiAnalysis));
            commands.Add(new CommandEntry("資安掃描", RunSecurityScan));
            commands.Add(new CommandEntry("匯出報告", ExportReport));
            commands.Add(new CommandEntry("匯出正式 HTML 報告", ExportHtmlReport));
            commands.Add(new CommandEntry("匯出 Anki TSV", ExportAnkiDeck));
            commands.Add(new CommandEntry("查看學習歷程", ShowLearningHistory));
            commands.Add(new CommandEntry("擴充中心 / NuGet 狀態", ShowExtensionCenter));
            commands.Add(new CommandEntry("匯出可選 NuGet 安裝指南", GenerateNuGetInstallGuide));
            commands.Add(new CommandEntry("匯出 Newtonsoft JSON 進階報告", TryExportWithNewtonsoftJson));
            commands.Add(new CommandEntry("產生個人化學習計畫", ShowStudyPlan));
            commands.Add(new CommandEntry("產品級功能藍圖", ShowPremiumRoadmap));
            foreach (ThemeProfile profile in ThemeProfile.GetAll())
            {
                ThemeProfile captured = profile;
                commands.Add(new CommandEntry("套用主題：" + captured.Name, delegate { ApplyThemeProfile(captured.Id); }));
            }

            using (var dialog = new CommandPaletteDialog(commands, _activeTheme))
            {
                if (dialog.ShowDialog(this) == DialogResult.OK && dialog.SelectedCommand != null)
                {
                    dialog.SelectedCommand.Execute();
                }
            }
        }

        private void ApplyThemeProfile(string id)
        {
            ThemeProfile profile = ThemeProfile.FindById(id);
            if (profile == null) return;
            _activeTheme = profile;
            _darkMode = profile.IsDark;
            ApplyTheme();
            if (_themeComboBox != null && Convert.ToString(_themeComboBox.SelectedItem) != profile.Name)
            {
                _themeComboBox.SelectedItem = profile.Name;
            }
            Log("已套用主題：" + profile.Name);
        }

        private void NormalizeCurrentData()
        {
            if (_allWords.Count == 0) return;
            foreach (var item in _allWords)
            {
                item.Word = TextCleaner.CleanCell(item.Word);
                item.Phonogram = TextCleaner.CleanCell(item.Phonogram);
                item.SoundPath = TextCleaner.CleanCell(item.SoundPath);
                item.Explain = TextCleaner.CleanLongText(item.Explain);
            }
            _insightEngine.Analyze(_allWords, _currentBaseDirectory);
            ApplyFilterAndRefresh();
            Log("已完成空白、控制字元與文字正規化。 ");
        }

        private void RemoveDuplicates()
        {
            if (_allWords.Count == 0) return;
            if (MessageBox.Show(this, "將依照單字忽略大小寫移除重複資料，保留第一筆。是否繼續？", "移除重複資料", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            {
                return;
            }

            int before = _allWords.Count;
            var distinct = _allWords
                .GroupBy(x => (x.Word ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .OrderBy(x => x.LineNumber)
                .ToList();

            _allWords.Clear();
            _allWords.AddRange(distinct);
            _insightEngine.Analyze(_allWords, _currentBaseDirectory);
            ApplyFilterAndRefresh();
            Log(string.Format("重複資料清理完成：{0:N0} -> {1:N0}。", before, _allWords.Count));
        }

        private void CopySelectedRows()
        {
            if (_grid == null || _grid.SelectedRows.Count == 0) return;
            var selected = _grid.SelectedRows.Cast<DataGridViewRow>()
                .Select(r => r.DataBoundItem as WordItem)
                .Where(x => x != null)
                .OrderBy(x => x.LineNumber)
                .Select(x => x.ToTsvLine());
            Clipboard.SetText(string.Join(Environment.NewLine, selected));
            Log("已複製選取列到剪貼簿。 ");
        }

        private void CopySelectedWords()
        {
            if (_grid == null || _grid.SelectedRows.Count == 0) return;
            var selected = _grid.SelectedRows.Cast<DataGridViewRow>()
                .Select(r => r.DataBoundItem as WordItem)
                .Where(x => x != null)
                .OrderBy(x => x.LineNumber)
                .Select(x => x.Word);
            Clipboard.SetText(string.Join(Environment.NewLine, selected));
            Log("已複製選取單字到剪貼簿。 ");
        }

        private void ExportVisibleAsTsv()
        {
            ExportVisible("tsv", "TSV 檔案 (*.tsv)|*.tsv", delegate (IEnumerable<WordItem> items, string path)
            {
                File.WriteAllLines(path, items.Select(x => x.ToTsvLine()), Encoding.UTF8);
            });
        }

        private void ExportVisibleAsCsv()
        {
            ExportVisible("csv", "CSV 檔案 (*.csv)|*.csv", delegate (IEnumerable<WordItem> items, string path)
            {
                File.WriteAllLines(path, items.Select(x => x.ToCsvLine()), Encoding.UTF8);
            });
        }

        private void ExportVisible(string extension, string filter, Action<IEnumerable<WordItem>, string> exporter)
        {
            var items = GetVisibleWords().ToList();
            if (items.Count == 0)
            {
                ShowWarning("目前沒有可匯出的資料。", "匯出");
                return;
            }

            using (var dialog = new SaveFileDialog())
            {
                dialog.Filter = filter;
                dialog.FileName = "TSV_Studio_Export_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + "." + extension;
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    exporter(items, dialog.FileName);
                    Log("已匯出：" + dialog.FileName);
                }
            }
        }

        private void ExportReport()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入資料。", "匯出報告");
                return;
            }

            using (var dialog = new SaveFileDialog())
            {
                dialog.Filter = "文字報告 (*.txt)|*.txt|JSON 報告 (*.json)|*.json";
                dialog.FilterIndex = 1;
                dialog.FileName = "TSV_Studio_Report_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";
                if (dialog.ShowDialog(this) != DialogResult.OK) return;

                string ext = Path.GetExtension(dialog.FileName).ToLowerInvariant();
                if (ext == ".json")
                {
                    File.WriteAllText(dialog.FileName, ReportBuilder.BuildJsonReport(_allWords, _currentFilePath, _currentBaseDirectory), Encoding.UTF8);
                }
                else
                {
                    var sb = new StringBuilder();
                    sb.AppendLine(ReportBuilder.BuildStatisticsReport(_allWords, _currentFilePath));
                    sb.AppendLine();
                    sb.AppendLine(new string('=', 80));
                    sb.AppendLine();
                    sb.AppendLine(ReportBuilder.BuildSecurityReport(_allWords, _currentFilePath, _currentBaseDirectory));
                    File.WriteAllText(dialog.FileName, sb.ToString(), Encoding.UTF8);
                }
                Log("報告已匯出：" + dialog.FileName);
            }
        }


        private void ShowHome()
        {
            SetActiveNavigation("首頁");
            SelectBottomTab(_homeTab);
            RefreshWelcomeDashboard();
        }

        private void ShowVocabularyGrid()
        {
            SetActiveNavigation("字庫");
            if (_grid != null)
            {
                _grid.Focus();
            }
            if (_bottomTabs != null && _previewText != null)
            {
                TabPage preview = _bottomTabs.TabPages.Cast<TabPage>().FirstOrDefault(p => p.Text == "資料預覽");
                if (preview != null) _bottomTabs.SelectedTab = preview;
            }
        }

        private void SelectBottomTab(TabPage tab)
        {
            if (_bottomTabs != null && tab != null)
            {
                _bottomTabs.SelectedTab = tab;
            }
        }

        private void RefreshWelcomeDashboard()
        {
            if (_welcomeSummaryText == null) return;
            InsightSummary summary = InsightSummary.From(_allWords);
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("系統首頁");
            sb.AppendLine(new string('=', 72));
            sb.AppendLine("資料來源：" + (string.IsNullOrWhiteSpace(_currentFilePath) ? "尚未載入" : _currentFilePath));
            sb.AppendLine("目前資料量：" + summary.Total.ToString("N0") + " 筆");
            sb.AppendLine("唯一單字：" + summary.UniqueWords.ToString("N0"));
            sb.AppendLine("平均品質：" + summary.AverageQuality.ToString("N1"));
            sb.AppendLine("高風險資料：" + summary.HighRisk.ToString("N0"));
            sb.AppendLine("缺音檔：" + summary.MissingAudio.ToString("N0"));
            sb.AppendLine("已學會：" + _allWords.Count(x => x.IsLearned).ToString("N0"));
            sb.AppendLine("收藏：" + _allWords.Count(x => x.IsFavorite).ToString("N0"));
            sb.AppendLine();
            sb.AppendLine("快速流程");
            sb.AppendLine("1. 使用「匯入精靈」預覽資料並指定欄位。 ");
            sb.AppendLine("2. 執行 AI 分析、資安掃描與音檔治理。 ");
            sb.AppendLine("3. 透過測驗模式與學習歷程追蹤記憶狀態。 ");
            sb.AppendLine("4. 匯出 HTML 報告或 Anki TSV 進行後續整理。 ");
            sb.AppendLine();
            sb.AppendLine("今日學習歷程");
            sb.AppendLine(_learningHistory.BuildTodaySummary());
            _welcomeSummaryText.Text = sb.ToString();
        }

        private void ShowImportWizard()
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.FileName = "";
                dialog.Filter = "所有支援格式 (*.tsv;*.txt;*.csv;*.xlsx;*.xls)|*.tsv;*.txt;*.csv;*.xlsx;*.xls|所有檔案 (*.*)|*.*";
                dialog.FilterIndex = 1;
                dialog.Title = "選擇要匯入的資料檔";
                if (dialog.ShowDialog(this) != DialogResult.OK) return;

                try
                {
                    DataImportPreview preview = DataImportWizardReader.ReadPreview(dialog.FileName, 40);
                    using (var wizard = new DataImportWizardDialog(dialog.FileName, preview))
                    {
                        if (wizard.ShowDialog(this) == DialogResult.OK)
                        {
                            LoadFileWithImportMapping(wizard.Mapping);
                        }
                    }
                }
                catch (Exception ex)
                {
                    ShowWarning(ex.Message, "資料匯入精靈");
                }
            }
        }

        private async void LoadFileWithImportMapping(DataImportMapping mapping)
        {
            if (mapping == null || string.IsNullOrWhiteSpace(mapping.FilePath) || !File.Exists(mapping.FilePath))
            {
                ShowWarning("找不到匯入檔案。", "資料匯入精靈");
                return;
            }

            if (_loadCts != null)
            {
                _loadCts.Cancel();
                _loadCts.Dispose();
            }
            _loadCts = new CancellationTokenSource();

            SetBusy(true, "匯入精靈正在載入資料...");
            _progressBar.Value = 0;
            Stopwatch sw = Stopwatch.StartNew();
            try
            {
                List<WordItem> items = await Task.Run(delegate
                {
                    List<string[]> rows = DataImportWizardReader.ReadAllRows(mapping.FilePath, _loadCts.Token);
                    return DataImportWizardReader.MapRows(rows, mapping);
                });

                _allWords.Clear();
                _allWords.AddRange(items);
                _currentFilePath = mapping.FilePath;
                _currentBaseDirectory = Path.GetDirectoryName(mapping.FilePath) ?? string.Empty;
                _recentFileStore.Add(mapping.FilePath);

                _insightEngine.Analyze(_allWords, _currentBaseDirectory);
                ApplyLearningStateToAll();
                ApplyFilterAndRefresh();
                sw.Stop();

                Text = "TSV Studio Product Edition - " + Path.GetFileName(mapping.FilePath);
                _statusLabel.Text = string.Format("匯入完成：{0:N0} 筆資料", _allWords.Count);
                Log(string.Format("匯入精靈完成：{0:N0} 筆，欄位對應 Word={1}, Phonogram={2}, Sound={3}, ExplainStart={4}，耗時 {5:N2} 秒。",
                    _allWords.Count, mapping.WordColumn + 1, mapping.PhonogramColumn + 1, mapping.SoundColumn + 1, mapping.ExplainStartColumn + 1, sw.Elapsed.TotalSeconds));
                ShowToast("匯入完成：" + _allWords.Count.ToString("N0") + " 筆資料");
            }
            catch (OperationCanceledException)
            {
                Log("匯入精靈載入已取消。 ");
            }
            catch (Exception ex)
            {
                Log("匯入精靈失敗：" + ex.Message);
                ShowWarning(ex.Message, "資料匯入精靈");
            }
            finally
            {
                _progressBar.Value = 0;
                SetBusy(false, "就緒");
            }
        }

        private void ShowLearningHistory()
        {
            SetActiveNavigation("學習歷程");
            RefreshLearningHistory();
            SelectBottomTab(_historyTab);
        }

        private void RefreshLearningHistory()
        {
            if (_historyPanel != null)
            {
                _historyPanel.SetData(_learningHistory.GetEntries(), _activeTheme);
            }
            if (_historyText != null)
            {
                _historyText.Text = _learningHistory.BuildReport();
            }
        }

        private void ExportAnkiDeck()
        {
            List<WordItem> items = GetVisibleWords().Where(x => !string.IsNullOrWhiteSpace(x.Word)).ToList();
            if (items.Count == 0)
            {
                ShowWarning("目前沒有可匯出的單字。", "Anki 匯出");
                return;
            }

            using (var dialog = new SaveFileDialog())
            {
                dialog.Filter = "Anki TSV (*.tsv)|*.tsv|文字檔 (*.txt)|*.txt";
                dialog.FilterIndex = 1;
                dialog.FileName = "TSV_Studio_Anki_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".tsv";
                if (dialog.ShowDialog(this) != DialogResult.OK) return;

                File.WriteAllText(dialog.FileName, AnkiExportBuilder.Build(items, _currentBaseDirectory), Encoding.UTF8);
                Log("Anki TSV 已匯出：" + dialog.FileName);
                ShowToast("Anki TSV 匯出完成");
            }
        }

        private void ExportHtmlReport()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入資料。", "HTML 報告");
                return;
            }

            using (var dialog = new SaveFileDialog())
            {
                dialog.Filter = "HTML 報告 (*.html)|*.html|所有檔案 (*.*)|*.*";
                dialog.FilterIndex = 1;
                dialog.FileName = "TSV_Studio_Report_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".html";
                if (dialog.ShowDialog(this) != DialogResult.OK) return;

                File.WriteAllText(dialog.FileName, ReportBuilder.BuildHtmlReport(_allWords, _currentFilePath, _currentBaseDirectory), Encoding.UTF8);
                Log("HTML 報告已匯出：" + dialog.FileName);
                ShowToast("HTML 報告匯出完成");
            }
        }

        private void ShowExtensionCenter()
        {
            SetActiveNavigation("擴充中心");
            RefreshExtensionCenterText();
            if (_bottomTabs != null && _extensionTab != null)
            {
                _bottomTabs.SelectedTab = _extensionTab;
            }
            Log("已開啟擴充中心。核心功能不依賴 NuGet，進階功能可依需求安裝。");
        }

        private void RefreshExtensionCenterText()
        {
            if (_extensionText == null) return;
            _extensionText.Text = OptionalNuGetFeatureCatalog.BuildStatusText(Application.StartupPath, _allWords.Count);
        }

        private void GenerateNuGetInstallGuide()
        {
            using (var dialog = new SaveFileDialog())
            {
                dialog.Filter = "文字指南 (*.txt)|*.txt|PowerShell 指令 (*.ps1)|*.ps1|所有檔案 (*.*)|*.*";
                dialog.FilterIndex = 1;
                dialog.FileName = "TSV_Studio_Optional_NuGet_Guide.txt";
                if (dialog.ShowDialog(this) != DialogResult.OK) return;

                string content = OptionalNuGetFeatureCatalog.BuildInstallGuide(Application.StartupPath);
                File.WriteAllText(dialog.FileName, content, Encoding.UTF8);
                Log("已匯出 NuGet 擴充安裝指南：" + dialog.FileName);
                MessageBox.Show(this,
                    "已匯出安裝指南。" + Environment.NewLine +
                    "未安裝可選套件也不會影響核心功能；如需啟用進階功能，請依指南安裝。",
                    "擴充中心", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void TryExportWithNewtonsoftJson()
        {
            if (_allWords.Count == 0)
            {
                ShowWarning("請先載入資料。", "Newtonsoft JSON 匯出");
                return;
            }

            Type jsonConvert = OptionalAssemblyLoader.TryGetType("Newtonsoft.Json", "Newtonsoft.Json.JsonConvert");
            if (jsonConvert == null)
            {
                ShowOptionalPackageMissing("Newtonsoft.Json",
                    "這是可選功能，不影響程式核心功能。" + Environment.NewLine +
                    "若要啟用更完整的 JSON 序列化、縮排與特殊字元處理，請在 Visual Studio 的 NuGet Package Manager 安裝：Newtonsoft.Json");
                return;
            }

            using (var dialog = new SaveFileDialog())
            {
                dialog.Filter = "JSON 檔案 (*.json)|*.json";
                dialog.FileName = "TSV_Studio_Newtonsoft_Export_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".json";
                if (dialog.ShowDialog(this) != DialogResult.OK) return;

                try
                {
                    var exportItems = _allWords.Select(x => new
                    {
                        x.LineNumber,
                        x.Word,
                        x.Phonogram,
                        x.SoundPath,
                        x.Explain,
                        x.AiLevel,
                        x.QualityScore,
                        x.RiskLevel,
                        x.IssuesText,
                        x.IsFavorite,
                        x.IsLearned
                    }).ToList();

                    MethodInfo serialize = jsonConvert.GetMethod("SerializeObject", new Type[] { typeof(object) });
                    if (serialize == null)
                    {
                        throw new MissingMethodException("Newtonsoft.Json.JsonConvert.SerializeObject(object) not found.");
                    }

                    object json = serialize.Invoke(null, new object[] { exportItems });
                    File.WriteAllText(dialog.FileName, Convert.ToString(json), Encoding.UTF8);
                    Log("Newtonsoft JSON 匯出完成：" + dialog.FileName);
                }
                catch (Exception ex)
                {
                    ShowWarning("Newtonsoft.Json 已偵測到，但匯出失敗：" + ex.Message, "Newtonsoft JSON 匯出");
                }
            }
        }

        private void ShowOptionalPackageMissing(string packageName, string detail)
        {
            var sb = new StringBuilder();
            sb.AppendLine("尚未啟用可選套件：" + packageName);
            sb.AppendLine();
            sb.AppendLine(detail);
            sb.AppendLine();
            sb.AppendLine("安裝方式：");
            sb.AppendLine("1. 請在 Visual Studio 中開啟本專案，不是在一般 Windows PowerShell。");
            sb.AppendLine("2. Visual Studio 上方選單：工具 > NuGet 套件管理員 > 套件管理器主控台。");
            sb.AppendLine("3. 確認「預設專案」選到目前 WinForms 專案。");
            sb.AppendLine("4. 輸入：Install-Package " + packageName);
            sb.AppendLine("5. 重新建置專案。");
            sb.AppendLine();
            sb.AppendLine("注意：此套件是可選擴充，不安裝也可以正常開啟字庫、播放、測驗、分析與匯出基本報告。");
            MessageBox.Show(this, sb.ToString(), "可選 NuGet 擴充", MessageBoxButtons.OK, MessageBoxIcon.Information);
            Log("可選套件尚未啟用：" + packageName);
        }

        private void ShowStudyPlan()
        {
            RefreshStudyPlanText();
            if (_bottomTabs != null && _studyPlanTab != null)
            {
                _bottomTabs.SelectedTab = _studyPlanTab;
            }
            Log("已產生個人化學習計畫。");
        }

        private void RefreshStudyPlanText()
        {
            if (_studyPlanText == null) return;
            _studyPlanText.Text = StudyPlanBuilder.Build(_allWords, _currentFilePath);
        }

        private void ShowPremiumRoadmap()
        {
            MessageBox.Show(this, OptionalNuGetFeatureCatalog.BuildRoadmapText(), "產品級功能藍圖", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void ShowBenchmarkSummary()
        {
            var sb = new StringBuilder();
            sb.AppendLine("效能設計摘要");
            sb.AppendLine("- 載入採 Task.Run 背景執行，避免 UI 卡死。");
            sb.AppendLine("- 搜尋採 220ms debounce，避免每打一個字就完整刷新。");
            sb.AppendLine("- DataGridView 綁定目前檢視，資料量更大時可再升級 VirtualMode。");
            sb.AppendLine("- AI 分析採 O(n) 掃描，重複偵測使用雜湊分組。");
            sb.AppendLine("- 報告輸出採 StringBuilder，避免大量字串串接浪費記憶體。");
            sb.AppendLine();
            sb.AppendLine("下一階段可擴充：");
            sb.AppendLine("1. 接 ONNX Runtime 做真正深度學習難度分類。");
            sb.AppendLine("2. 建 SQLite 索引支援百萬列級資料。");
            sb.AppendLine("3. 建立音檔雜湊與重複音訊偵測。");
            sb.AppendLine("4. 加入雲端同步、版本差異比對與團隊審核流程。");
            sb.AppendLine("5. 可到「擴充中心」查看可選 NuGet 套件；未安裝也不影響核心功能。");
            MessageBox.Show(this, sb.ToString(), "效能壓力測試摘要", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void ClearSearch()
        {
            _searchBox.Text = string.Empty;
            _riskComboBox.SelectedIndex = 0;
            ApplyFilterAndRefresh();
        }

        private void ToggleTheme()
        {
            ApplyThemeProfile(_darkMode ? "professional-light" : "tech-blue");
        }

        private void ToggleRowNumber()
        {
            _showRowNumber = !_showRowNumber;
            _grid.Invalidate();
        }

        private void AutoResizeColumns()
        {
            if (_grid == null) return;
            _grid.AutoResizeColumns(DataGridViewAutoSizeColumnsMode.DisplayedCells);
            Log("已依目前顯示內容最佳化欄寬。 ");
        }

        private void ShowAbout()
        {
            using (var dialog = new ProductAboutDialog())
            {
                dialog.ShowDialog(this);
            }
        }

        private void RebuildRecentMenu(ToolStripMenuItem recent)
        {
            recent.DropDownItems.Clear();
            var files = _recentFileStore.GetFiles().ToList();
            if (files.Count == 0)
            {
                recent.DropDownItems.Add("沒有最近檔案").Enabled = false;
                return;
            }
            foreach (string file in files)
            {
                var item = new ToolStripMenuItem(file);
                item.Click += delegate { if (File.Exists(file)) LoadFileAsync(file); else ShowWarning("檔案不存在：" + file, "最近檔案"); };
                recent.DropDownItems.Add(item);
            }
        }

        private void Grid_ColumnHeaderMouseClick(object sender, DataGridViewCellMouseEventArgs e)
        {
            if (e.ColumnIndex < 0 || e.ColumnIndex >= _grid.Columns.Count) return;
            string property = _grid.Columns[e.ColumnIndex].DataPropertyName;
            if (string.Equals(_lastSortProperty, property, StringComparison.OrdinalIgnoreCase))
            {
                _sortAscending = !_sortAscending;
            }
            else
            {
                _lastSortProperty = property;
                _sortAscending = true;
            }
            ApplyFilterAndRefresh();
        }

        private void Grid_RowPostPaint(object sender, DataGridViewRowPostPaintEventArgs e)
        {
            if (!_showRowNumber) return;
            string rowNumber = (e.RowIndex + 1).ToString(CultureInfo.InvariantCulture);
            var centerFormat = new StringFormat();
            centerFormat.Alignment = StringAlignment.Center;
            centerFormat.LineAlignment = StringAlignment.Center;
            Rectangle headerBounds = new Rectangle(e.RowBounds.Left, e.RowBounds.Top, _grid.RowHeadersWidth, e.RowBounds.Height);
            using (var brush = new SolidBrush(_darkMode ? Color.FromArgb(190, 205, 230) : Color.FromArgb(60, 70, 90)))
            {
                e.Graphics.DrawString(rowNumber, Font, brush, headerBounds, centerFormat);
            }
        }

        private void Grid_CellFormatting(object sender, DataGridViewCellFormattingEventArgs e)
        {
            if (e.RowIndex < 0 || e.ColumnIndex < 0) return;
            string name = _grid.Columns[e.ColumnIndex].Name;
            if (name == "RiskLevel")
            {
                string risk = Convert.ToString(e.Value);
                if (risk == "致命")
                {
                    e.CellStyle.BackColor = Color.FromArgb(130, 25, 35);
                    e.CellStyle.ForeColor = Color.White;
                }
                else if (risk == "高")
                {
                    e.CellStyle.BackColor = Color.FromArgb(170, 70, 40);
                    e.CellStyle.ForeColor = Color.White;
                }
                else if (risk == "中")
                {
                    e.CellStyle.BackColor = Color.FromArgb(180, 145, 45);
                    e.CellStyle.ForeColor = Color.White;
                }
            }
            else if (name == "QualityScore")
            {
                double score;
                if (e.Value != null && double.TryParse(e.Value.ToString(), out score) && score < 60)
                {
                    e.CellStyle.ForeColor = _darkMode ? Color.FromArgb(255, 170, 140) : Color.DarkRed;
                    e.CellStyle.Font = new Font(Font, FontStyle.Bold);
                }
            }
        }

        private void Grid_CellMouseEnter(object sender, DataGridViewCellEventArgs e)
        {
            if (e.RowIndex < 0 || _grid == null) return;
            if (_hoveredGridRowIndex == e.RowIndex) return;
            int oldHover = _hoveredGridRowIndex;
            _hoveredGridRowIndex = e.RowIndex;
            if (oldHover >= 0 && oldHover < _grid.Rows.Count) _grid.InvalidateRow(oldHover);
            if (_hoveredGridRowIndex >= 0 && _hoveredGridRowIndex < _grid.Rows.Count) _grid.InvalidateRow(_hoveredGridRowIndex);
        }

        private void Grid_CellPainting(object sender, DataGridViewCellPaintingEventArgs e)
        {
            if (_grid == null || e.RowIndex < 0 || e.ColumnIndex < 0) return;

            bool hovered = e.RowIndex == _hoveredGridRowIndex && !_grid.Rows[e.RowIndex].Selected;
            if (hovered)
            {
                e.CellStyle.BackColor = BlendColor(_activeTheme.Panel, _activeTheme.Accent, 0.08);
            }

            string name = _grid.Columns[e.ColumnIndex].Name;
            if (name == "RiskLevel" || name == "LearningBadge" || name == "QualityScore")
            {
                e.Paint(e.CellBounds, DataGridViewPaintParts.Background | DataGridViewPaintParts.Border | DataGridViewPaintParts.SelectionBackground);

                Rectangle bounds = new Rectangle(e.CellBounds.X + 8, e.CellBounds.Y + 6, e.CellBounds.Width - 16, e.CellBounds.Height - 12);
                if (bounds.Width < 10 || bounds.Height < 8)
                {
                    e.Handled = true;
                    return;
                }

                string value = Convert.ToString(e.FormattedValue);
                Color badgeBack = _activeTheme.Button;
                Color badgeFore = _activeTheme.Text;

                if (name == "RiskLevel")
                {
                    if (value == "致命") badgeBack = Color.FromArgb(140, 36, 48);
                    else if (value == "高") badgeBack = Color.FromArgb(180, 80, 50);
                    else if (value == "中") badgeBack = Color.FromArgb(178, 140, 42);
                    else badgeBack = BlendColor(_activeTheme.Button, Color.Green, 0.12);
                    badgeFore = Color.White;
                    DrawRoundedBadge(e.Graphics, bounds, badgeBack, badgeFore, value);
                    e.Handled = true;
                    return;
                }

                if (name == "LearningBadge")
                {
                    badgeBack = BlendColor(_activeTheme.Button, _activeTheme.Accent, value.Contains("已學") ? 0.34 : 0.16);
                    DrawRoundedBadge(e.Graphics, bounds, badgeBack, badgeFore, value);
                    e.Handled = true;
                    return;
                }

                if (name == "QualityScore")
                {
                    double score;
                    double.TryParse(value, out score);
                    Color barColor = score >= 80 ? Color.FromArgb(48, 160, 115) : score >= 60 ? Color.FromArgb(200, 150, 50) : Color.FromArgb(195, 80, 70);
                    using (SolidBrush backBrush = new SolidBrush(BlendColor(_activeTheme.Button, Color.Black, 0.05)))
                    using (GraphicsPath backPath = CreateRoundedRectanglePath(bounds, 7))
                    {
                        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                        e.Graphics.FillPath(backBrush, backPath);
                    }

                    int fillWidth = Math.Max(14, (int)(bounds.Width * Math.Max(0, Math.Min(100, score)) / 100.0));
                    fillWidth = Math.Min(bounds.Width, fillWidth);
                    Rectangle fill = new Rectangle(bounds.X, bounds.Y, fillWidth, bounds.Height);
                    using (SolidBrush fillBrush = new SolidBrush(barColor))
                    using (GraphicsPath fillPath = CreateRoundedRectanglePath(fill, 7))
                    {
                        e.Graphics.FillPath(fillBrush, fillPath);
                    }

                    TextRenderer.DrawText(e.Graphics, value, e.CellStyle.Font ?? Font, bounds, Color.White, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
                    e.Handled = true;
                    return;
                }
            }
        }

        private void DrawRoundedBadge(Graphics graphics, Rectangle bounds, Color backColor, Color foreColor, string text)
        {
            using (GraphicsPath path = CreateRoundedRectanglePath(bounds, 8))
            using (SolidBrush brush = new SolidBrush(backColor))
            {
                graphics.SmoothingMode = SmoothingMode.AntiAlias;
                graphics.FillPath(brush, path);
            }
            TextRenderer.DrawText(graphics, text, Font, bounds, foreColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }

        private GraphicsPath CreateRoundedRectanglePath(Rectangle rect, int radius)
        {
            radius = Math.Max(1, Math.Min(radius, Math.Min(rect.Width, rect.Height) / 2));
            int diameter = radius * 2;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }

        private void BottomTabs_DrawItem(object sender, DrawItemEventArgs e)
        {
            if (_bottomTabs == null || e.Index < 0 || e.Index >= _bottomTabs.TabPages.Count) return;

            TabPage page = _bottomTabs.TabPages[e.Index];
            Rectangle rect = _bottomTabs.GetTabRect(e.Index);
            bool selected = e.Index == _bottomTabs.SelectedIndex;

            Color back = selected ? BlendColor(_activeTheme.Button, _activeTheme.Accent, 0.28) : _activeTheme.Panel;
            Color fore = selected ? Color.White : _activeTheme.Text;
            Color border = selected ? _activeTheme.Accent : _activeTheme.Line;

            using (SolidBrush brush = new SolidBrush(back))
            {
                e.Graphics.FillRectangle(brush, rect);
            }

            using (Pen pen = new Pen(border))
            {
                e.Graphics.DrawRectangle(pen, rect.X, rect.Y, rect.Width - 1, rect.Height - 1);
            }

            string title = GetTabIcon(page.Text) + " " + page.Text;
            TextRenderer.DrawText(e.Graphics, title, new Font("Microsoft JhengHei UI", 8.5F, selected ? FontStyle.Bold : FontStyle.Regular), rect, fore, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }

        private string GetTabIcon(string tabText)
        {
            if (tabText == "首頁") return "⌂";
            if (tabText == "資料預覽") return "▦";
            if (tabText == "單字詳細") return "□";
            if (tabText == "媒體播放器") return "▶";
            if (tabText == "測驗模式") return "◎";
            if (tabText == "視覺化圖表") return "▥";
            if (tabText == "學習歷程") return "↗";
            if (tabText == "學習計畫") return "◇";
            if (tabText == "擴充中心") return "✦";
            if (tabText == "統計分析") return "Σ";
            if (tabText == "音檔治理") return "♬";
            if (tabText == "資安報告") return "◆";
            if (tabText == "系統紀錄") return "≡";
            return "•";
        }

        private void ApplyTheme()
        {
            ThemeProfile theme = _activeTheme ?? (_darkMode ? ThemeProfile.GetDefaultDark() : ThemeProfile.GetDefaultLight());
            Color bg = theme.Background;
            Color panel = theme.Panel;
            Color panel2 = theme.PanelAlt;
            Color text = theme.Text;
            Color muted = theme.Muted;
            Color line = theme.Line;

            BackColor = bg;
            ForeColor = text;
            _mainSplit.BackColor = bg;
            _mainSplit.Panel1.BackColor = bg;
            _mainSplit.Panel2.BackColor = bg;
            _rightSplit.BackColor = bg;
            _rightSplit.Panel1.BackColor = panel;
            _rightSplit.Panel2.BackColor = panel;

            _heroPanel.BackColor = panel2;
            _heroTitle.ForeColor = text;
            _heroSubtitle.ForeColor = muted;
            _cardsPanel.BackColor = bg;
            _issueList.BackColor = panel;
            _issueList.ForeColor = text;

            ApplyThemeToMenu(_menu, panel, text);
            ApplyThemeToTopBarPanel(_toolBar, panel, text);
            ApplyThemeToStatusStrip(_statusStrip, panel, text);

            _grid.BackgroundColor = panel;
            _grid.GridColor = line;
            _grid.DefaultCellStyle.BackColor = panel;
            _grid.DefaultCellStyle.ForeColor = text;
            _grid.DefaultCellStyle.SelectionBackColor = _darkMode ? Color.FromArgb(55, 92, 145) : Color.FromArgb(205, 225, 255);
            _grid.DefaultCellStyle.SelectionForeColor = _darkMode ? Color.White : Color.FromArgb(18, 32, 55);
            _grid.AlternatingRowsDefaultCellStyle.BackColor = panel2;
            _grid.ColumnHeadersDefaultCellStyle.BackColor = _darkMode ? Color.FromArgb(38, 50, 78) : Color.FromArgb(230, 238, 250);
            _grid.ColumnHeadersDefaultCellStyle.ForeColor = text;
            _grid.RowHeadersDefaultCellStyle.BackColor = _grid.ColumnHeadersDefaultCellStyle.BackColor;
            _grid.RowHeadersDefaultCellStyle.ForeColor = text;

            foreach (TabPage page in _bottomTabs.TabPages)
            {
                page.BackColor = panel;
                page.ForeColor = text;
            }
            _bottomTabs.BackColor = panel;
            _previewText.BackColor = panel2;
            _previewText.ForeColor = text;
            _logText.BackColor = panel2;
            _logText.ForeColor = text;
            _statsText.BackColor = panel2;
            _statsText.ForeColor = text;
            _securityText.BackColor = panel2;
            _securityText.ForeColor = text;
            ApplyThemeToPlayer(panel2, text, muted);
            if (_audioScanText != null) { _audioScanText.BackColor = panel2; _audioScanText.ForeColor = text; }
            if (_chartPanel != null) { _chartPanel.BackColor = panel2; _chartPanel.SetData(_allWords, theme); }
            if (_welcomePanel != null) ApplyThemeToGenericPanel(_welcomePanel, panel2, text, muted);
            if (_welcomeSummaryText != null) { _welcomeSummaryText.BackColor = panel2; _welcomeSummaryText.ForeColor = text; }
            if (_historyText != null) { _historyText.BackColor = panel2; _historyText.ForeColor = text; }
            if (_historyPanel != null) _historyPanel.SetData(_learningHistory.GetEntries(), _activeTheme);
            if (_extensionText != null) { _extensionText.BackColor = panel2; _extensionText.ForeColor = text; }
            if (_studyPlanText != null) { _studyPlanText.BackColor = panel2; _studyPlanText.ForeColor = text; }
            if (_navigationPanel != null) ApplyThemeToGenericPanel(_navigationPanel, panel2, text, muted);
            if (_detailTab != null) ApplyThemeToGenericPanel(_detailTab, panel2, text, muted);
            if (_quizTab != null) ApplyThemeToGenericPanel(_quizTab, panel2, text, muted);
            if (_audioScanTab != null) ApplyThemeToGenericPanel(_audioScanTab, panel2, text, muted);
            if (_extensionTab != null) ApplyThemeToGenericPanel(_extensionTab, panel2, text, muted);
            if (_studyPlanTab != null) ApplyThemeToGenericPanel(_studyPlanTab, panel2, text, muted);

            RefreshCards();
        }

        private void ApplyThemeToGenericPanel(Control root, Color bg, Color fg, Color muted)
        {
            if (root == null) return;
            foreach (Control control in GetControlTree(root))
            {
                if (!(control is ProgressBar) && !(control is TrackBar))
                {
                    control.BackColor = bg;
                    control.ForeColor = fg;
                }
                StyledNavigationButton navButton = control as StyledNavigationButton;
                if (navButton != null)
                {
                    navButton.BaseColor = _activeTheme.Button;
                    navButton.HoverColor = BlendColor(_activeTheme.Button, _activeTheme.Accent, 0.18);
                    navButton.PressedColor = BlendColor(_activeTheme.Button, Color.Black, 0.15);
                    navButton.ActiveColor = BlendColor(_activeTheme.Button, _activeTheme.Accent, 0.32);
                    navButton.AccentColor = _activeTheme.Accent;
                    navButton.TextColor = fg;
                    navButton.Invalidate();
                    continue;
                }

                Label label = control as Label;
                if (label != null && label.Parent == _navigationPanel)
                {
                    label.ForeColor = _activeTheme.Accent;
                    label.BackColor = bg;
                }

                Button button = control as Button;
                if (button != null)
                {
                    button.BackColor = _activeTheme.Button;
                    button.ForeColor = fg;
                    button.FlatStyle = FlatStyle.Flat;
                    button.FlatAppearance.BorderColor = _activeTheme.Accent;
                    AttachButtonHoverBehavior(button);
                }
                TextBox textBox = control as TextBox;
                if (textBox != null)
                {
                    textBox.BackColor = _activeTheme.Input;
                    textBox.ForeColor = fg;
                }
            }
        }

        private Color BlendColor(Color a, Color b, double amount)
        {
            amount = Math.Max(0, Math.Min(1, amount));
            int r = (int)(a.R + (b.R - a.R) * amount);
            int g = (int)(a.G + (b.G - a.G) * amount);
            int bl = (int)(a.B + (b.B - a.B) * amount);
            return Color.FromArgb(r, g, bl);
        }

        private void AttachButtonHoverBehavior(Button button)
        {
            if (button == null || button is StyledNavigationButton || button.Tag as string == "hover-attached") return;
            button.Tag = "hover-attached";
            button.MouseEnter += delegate
            {
                if (_activeTheme != null) button.BackColor = BlendColor(_activeTheme.Button, _activeTheme.Accent, 0.16);
            };
            button.MouseLeave += delegate
            {
                if (_activeTheme != null) button.BackColor = _activeTheme.Button;
            };
            button.MouseDown += delegate
            {
                if (_activeTheme != null) button.BackColor = BlendColor(_activeTheme.Button, Color.Black, 0.12);
            };
            button.MouseUp += delegate
            {
                if (_activeTheme != null) button.BackColor = BlendColor(_activeTheme.Button, _activeTheme.Accent, 0.16);
            };
        }

        private void ApplyThemeToPlayer(Color bg, Color fg, Color muted)
        {
            if (_playerPanel == null) return;
            _playerPanel.BackColor = bg;

            foreach (Control control in GetControlTree(_playerPanel))
            {
                control.BackColor = bg;
                control.ForeColor = fg;

                var button = control as Button;
                if (button != null)
                {
                    button.BackColor = _activeTheme.Button;
                    button.ForeColor = fg;
                    button.FlatAppearance.BorderColor = _activeTheme.Accent;
                }
            }

            if (_playerPathLabel != null) _playerPathLabel.ForeColor = muted;
            if (_playerStatusLabel != null) _playerStatusLabel.ForeColor = muted;
        }

        private IEnumerable<Control> GetControlTree(Control root)
        {
            if (root == null) yield break;
            foreach (Control child in root.Controls)
            {
                yield return child;
                foreach (Control grandChild in GetControlTree(child))
                {
                    yield return grandChild;
                }
            }
        }

        private void ApplyThemeToTopBarPanel(Panel panel, Color bg, Color fg)
        {
            if (panel == null) return;
            panel.BackColor = bg;
            panel.ForeColor = fg;
            foreach (Control control in GetControlTree(panel))
            {
                ToolStrip strip = control as ToolStrip;
                if (strip != null)
                {
                    ApplyThemeToToolStrip(strip, bg, fg);
                }
                else
                {
                    control.BackColor = bg;
                    control.ForeColor = fg;
                }
            }
        }

        private void ApplyThemeToMenu(MenuStrip menu, Color bg, Color fg)
        {
            if (menu == null) return;
            menu.BackColor = bg;
            menu.ForeColor = fg;
            ApplyThemeToToolStripItems(menu.Items, bg, fg);
        }

        private void ApplyThemeToToolStrip(ToolStrip strip, Color bg, Color fg)
        {
            if (strip == null) return;
            strip.BackColor = bg;
            strip.ForeColor = fg;
            ApplyThemeToToolStripItems(strip.Items, bg, fg);
            foreach (ToolStripItem item in strip.Items)
            {
                item.BackColor = bg;
                item.ForeColor = fg;

                ToolStripTextBox textBox = item as ToolStripTextBox;
                if (textBox != null)
                {
                    textBox.BackColor = _activeTheme.Input;
                    textBox.ForeColor = fg;
                    textBox.BorderStyle = BorderStyle.FixedSingle;
                }

                ToolStripComboBox combo = item as ToolStripComboBox;
                if (combo != null)
                {
                    combo.BackColor = _activeTheme.Input;
                    combo.ForeColor = fg;
                    combo.FlatStyle = FlatStyle.Flat;
                }
            }
        }

        private void ApplyThemeToToolStripItems(ToolStripItemCollection items, Color bg, Color fg)
        {
            if (items == null) return;
            foreach (ToolStripItem item in items)
            {
                item.BackColor = bg;
                item.ForeColor = fg;

                ToolStripLabel label = item as ToolStripLabel;
                if (label != null && (label.Text == "主要操作" || label.Text == "搜尋與篩選"))
                {
                    label.ForeColor = _activeTheme.Accent;
                }

                ToolStripDropDownItem dropDownItem = item as ToolStripDropDownItem;
                if (dropDownItem != null)
                {
                    dropDownItem.DropDown.BackColor = bg;
                    dropDownItem.DropDown.ForeColor = fg;
                    if (dropDownItem.DropDownItems != null && dropDownItem.DropDownItems.Count > 0)
                    {
                        ApplyThemeToToolStripItems(dropDownItem.DropDownItems, bg, fg);
                    }
                }
            }
        }

        private void ApplyThemeToStatusStrip(StatusStrip strip, Color bg, Color fg)
        {
            if (strip == null) return;
            strip.BackColor = bg;
            strip.ForeColor = fg;
            foreach (ToolStripItem item in strip.Items)
            {
                item.BackColor = bg;
                item.ForeColor = fg;
            }
        }

        private void ShowToast(string message)
        {
            if (string.IsNullOrWhiteSpace(message) || IsDisposed) return;
            try
            {
                var toast = new Panel();
                toast.Width = Math.Min(460, Math.Max(280, message.Length * 9 + 70));
                toast.Height = 52;
                int targetLeft = Math.Max(8, ClientSize.Width - toast.Width - 26);
                int startLeft = ClientSize.Width + 12;
                int top = Math.Max(8, ClientSize.Height - toast.Height - 62);
                toast.Left = startLeft;
                toast.Top = top;
                toast.Anchor = AnchorStyles.Right | AnchorStyles.Bottom;
                toast.BackColor = _activeTheme == null ? Color.FromArgb(36, 48, 78) : BlendColor(_activeTheme.Button, _activeTheme.Accent, 0.18);
                toast.Padding = new Padding(16, 8, 16, 8);
                toast.BorderStyle = BorderStyle.FixedSingle;

                var label = new Label();
                label.Text = "✓  " + message;
                label.Dock = DockStyle.Fill;
                label.TextAlign = ContentAlignment.MiddleLeft;
                label.ForeColor = _activeTheme == null ? Color.White : _activeTheme.Text;
                label.Font = new Font(Font.FontFamily, 9.5F, FontStyle.Bold);
                toast.Controls.Add(label);

                Controls.Add(toast);
                toast.BringToFront();

                var timer = new WinFormsTimer();
                timer.Interval = 16;
                int phase = 0;
                int hold = 0;
                timer.Tick += delegate
                {
                    if (toast.IsDisposed)
                    {
                        timer.Stop();
                        timer.Dispose();
                        return;
                    }

                    if (phase == 0)
                    {
                        int delta = Math.Max(3, Math.Abs(toast.Left - targetLeft) / 4);
                        toast.Left = Math.Max(targetLeft, toast.Left - delta);
                        if (toast.Left <= targetLeft + 2)
                        {
                            toast.Left = targetLeft;
                            phase = 1;
                        }
                    }
                    else if (phase == 1)
                    {
                        hold += timer.Interval;
                        if (hold >= 2300) phase = 2;
                    }
                    else
                    {
                        toast.Left += 24;
                        if (toast.Left > ClientSize.Width + 20)
                        {
                            timer.Stop();
                            timer.Dispose();
                            if (!toast.IsDisposed)
                            {
                                Controls.Remove(toast);
                                toast.Dispose();
                            }
                        }
                    }
                };
                timer.Start();
            }
            catch
            {
                // Toast 是非必要提示，不影響主流程。
            }
        }

        private void Log(string message)
        {
            string line = string.Format("[{0:yyyy/MM/dd HH:mm:ss}] {1}", DateTime.Now, message);
            if (_logText != null)
            {
                _logText.AppendText(line + Environment.NewLine);
            }
            Debug.WriteLine(line);
        }

        private void ShowWarning(string message, string title)
        {
            MessageBox.Show(this, message, title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    public static class BuiltInEnglishDatabase
    {
        public static LoadResult Load(string startupPath, CancellationToken token, IProgress<LoadProgress> progress)
        {
            string[] candidateFiles = new string[]
            {
                Path.Combine(startupPath ?? string.Empty, "BuiltInEnglishDatabase.tsv"),
                Path.Combine(startupPath ?? string.Empty, "InternalEnglishDatabase.tsv"),
                Path.Combine(startupPath ?? string.Empty, "EnglishWords.tsv"),
                Path.Combine(startupPath ?? string.Empty, "english_words.txt"),
                Path.Combine(startupPath ?? string.Empty, "words_alpha.txt"),
                Path.Combine(startupPath ?? string.Empty, "words.txt")
            };

            foreach (string file in candidateFiles)
            {
                token.ThrowIfCancellationRequested();
                if (!File.Exists(file)) continue;

                LoadResult external = new TsvLoader().Load(file, token, progress);
                NormalizeBuiltInItems(external.Items, Path.GetFileName(file));
                return new LoadResult(external.Items, external.EncodingName, "本機內建字庫檔：" + Path.GetFileName(file));
            }

            List<WordItem> items = BuildEmbeddedCoreWords(token, progress);
            return new LoadResult(items, "Embedded", "程式內建核心英文字庫");
        }

        private static void NormalizeBuiltInItems(List<WordItem> items, string sourceName)
        {
            if (items == null) return;
            foreach (WordItem item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Explain))
                {
                    item.Explain = "內建英文字庫來源：" + sourceName + "。若沒有音檔，播放器會使用 Windows SAPI 語音合成朗讀。";
                }
            }
        }

        private static List<WordItem> BuildEmbeddedCoreWords(CancellationToken token, IProgress<LoadProgress> progress)
        {
            string raw = @"a
able
about
above
accept
according
account
across
action
activity
actually
add
address
administration
admit
adult
affect
after
again
against
age
agency
agent
ago
agree
agreement
ahead
air
all
allow
almost
alone
along
already
also
although
always
American
among
amount
analysis
and
animal
another
answer
any
anyone
anything
appear
apply
approach
area
argue
arm
around
arrive
art
article
artist
as
ask
assume
at
attack
attention
author
authority
available
avoid
away
baby
back
bad
bag
ball
bank
bar
base
be
beat
beautiful
because
become
bed
before
begin
behavior
behind
believe
benefit
best
better
between
beyond
big
bill
billion
bit
black
blood
blue
board
body
book
born
both
box
boy
break
bring
brother
budget
build
building
business
but
buy
by
call
camera
campaign
can
cancer
candidate
capital
car
card
care
career
carry
case
catch
cause
cell
center
central
century
certain
certainly
chair
challenge
chance
change
character
charge
check
child
choice
choose
church
citizen
city
civil
claim
class
clear
clearly
close
coach
cold
collection
college
color
come
commercial
common
community
company
compare
computer
concern
condition
conference
Congress
consider
consumer
contain
continue
control
cost
could
country
couple
course
court
cover
create
crime
cultural
culture
cup
current
customer
cut
dark
data
daughter
day
dead
deal
death
debate
decade
decide
decision
deep
defense
degree
Democrat
democratic
describe
design
despite
detail
determine
develop
development
die
difference
different
difficult
dinner
direction
director
discover
discuss
discussion
disease
do
doctor
dog
door
down
draw
dream
drive
drop
drug
during
each
early
east
easy
eat
economic
economy
edge
education
effect
effort
eight
either
election
else
employee
end
energy
enjoy
enough
enter
entire
environment
environmental
especially
establish
even
evening
event
ever
every
everybody
everyone
everything
evidence
exactly
example
executive
exist
expect
experience
expert
explain
eye
face
fact
factor
fail
fall
family
far
fast
father
fear
federal
feel
feeling
few
field
fight
figure
fill
film
final
finally
financial
find
fine
finger
finish
fire
firm
first
fish
five
floor
fly
focus
follow
food
foot
for
force
foreign
forget
form
former
forward
four
free
friend
from
front
full
fund
future
game
garden
gas
general
generation
get
girl
give
glass
go
goal
good
government
great
green
ground
group
grow
growth
guess
gun
guy
hair
half
hand
hang
happen
happy
hard
have
he
head
health
hear
heart
heat
heavy
help
her
here
herself
high
him
himself
his
history
hit
hold
home
hope
hospital
hot
hotel
hour
house
how
however
huge
human
hundred
husband
I
idea
identify
if
image
imagine
impact
important
improve
in
include
including
increase
indeed
indicate
individual
industry
information
inside
instead
institution
interest
interesting
international
interview
into
investment
involve
issue
it
item
its
itself
job
join
just
keep
key
kid
kill
kind
kitchen
know
knowledge
land
language
large
last
late
later
laugh
law
lawyer
lay
lead
leader
learn
least
leave
left
leg
legal
less
let
letter
level
life
light
like
likely
line
list
listen
little
live
local
long
look
lose
loss
lot
love
low
machine
magazine
main
maintain
major
majority
make
man
manage
management
manager
many
market
marriage
material
matter
may
maybe
me
mean
measure
media
medical
meet
meeting
member
memory
mention
message
method
middle
might
military
million
mind
minute
mission
model
modern
moment
money
month
more
morning
most
mother
mouth
move
movement
movie
Mr
Mrs
much
music
must
my
myself
name
nation
national
natural
nature
near
nearly
necessary
need
network
never
new
news
newspaper
next
nice
night
no
none
nor
north
not
note
nothing
notice
now
number
occur
of
off
offer
office
officer
official
often
oh
oil
ok
old
on
once
one
only
onto
open
operation
opportunity
option
or
order
organization
other
others
our
out
outside
over
own
owner
page
pain
painting
paper
parent
part
participant
particular
particularly
partner
party
pass
past
patient
pattern
pay
peace
people
per
perform
performance
perhaps
period
person
personal
phone
physical
pick
picture
piece
place
plan
plant
play
player
PM
point
police
policy
political
politics
poor
popular
population
position
positive
possible
power
practice
prepare
present
president
pressure
pretty
prevent
price
private
probably
problem
process
produce
product
production
professional
professor
program
project
property
protect
prove
provide
public
pull
purpose
push
put
quality
question
quickly
quite
race
radio
raise
range
rate
rather
reach
read
ready
real
reality
realize
really
reason
receive
recent
recently
recognize
record
red
reduce
reflect
region
relate
relationship
religious
remain
remember
remove
report
represent
Republican
require
research
resource
respond
response
responsibility
rest
result
return
reveal
rich
right
rise
risk
road
rock
role
room
rule
run
safe
same
save
say
scene
school
science
scientist
score
sea
season
seat
second
section
security
see
seek
seem
sell
send
senior
sense
series
serious
serve
service
set
seven
several
sex
shake
share
she
shoot
short
shot
should
shoulder
show
side
sign
significant
similar
simple
simply
since
sing
single
sister
sit
site
situation
six
size
skill
skin
small
smile
so
social
society
soldier
some
somebody
someone
something
sometimes
son
song
soon
sort
sound
source
south
southern
space
speak
special
specific
speech
spend
sport
spring
staff
stage
stand
standard
star
start
state
statement
station
stay
step
still
stock
stop
store
story
strategy
street
strong
structure
student
study
stuff
style
subject
success
successful
such
suddenly
suffer
suggest
summer
support
sure
surface
system
table
take
talk
task
tax
teach
teacher
team
technology
television
tell
ten
tend
term
test
than
thank
that
the
their
them
themselves
then
theory
there
these
they
thing
think
third
this
those
though
thought
thousand
threat
three
through
throughout
throw
thus
time
to
today
together
tonight
too
top
total
tough
toward
town
trade
traditional
training
travel
treat
treatment
tree
trial
trip
trouble
true
truth
try
turn
TV
two
type
under
understand
unit
until
up
upon
us
use
usually
value
various
very
victim
view
violence
visit
voice
vote
wait
walk
wall
want
war
watch
water
way
we
weapon
wear
week
weight
well
west
western
what
whatever
when
where
whether
which
while
white
who
whole
whom
whose
why
wide
wife
will
win
wind
window
wish
with
within
without
woman
wonder
word
work
worker
world
worry
would
write
writer
wrong
yard
year
yes
yet
you
young
your
yourself";
            string[] lines = raw.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            var items = new List<WordItem>();

            for (int i = 0; i < lines.Length; i++)
            {
                token.ThrowIfCancellationRequested();
                string word = lines[i].Trim();
                if (word.Length == 0) continue;

                var item = new WordItem();
                item.LineNumber = items.Count + 1;
                item.Word = word;
                item.Phonogram = string.Empty;
                item.SoundPath = string.Empty;
                item.Explain = "程式內建核心英文字庫。此筆未綁定音檔，請按「TTS 朗讀單字」或 F10 使用 Windows SAPI 發音。若要擴充成完整大型字庫，請把 BuiltInEnglishDatabase.tsv 或 english_words.txt 放到 exe 同層後按 Ctrl+I。";
                item.RawLine = word;
                items.Add(item);

                if (items.Count % 100 == 0 && progress != null)
                {
                    int percent = Math.Min(99, items.Count * 100 / Math.Max(1, lines.Length));
                    progress.Report(new LoadProgress(items.Count, percent));
                }
            }

            if (progress != null) progress.Report(new LoadProgress(items.Count, 100));
            return items;
        }
    }

    public sealed class InlineAudioPlayer : IDisposable
    {
        private const string AudioAlias = "TSVStudioInlineAudio";
        private object _sapiVoice;
        private bool _isDisposed;

        [DllImport("winmm.dll", CharSet = CharSet.Unicode)]
        private static extern int mciSendString(string command, StringBuilder returnValue, int returnLength, IntPtr winHandle);

        [DllImport("winmm.dll", CharSet = CharSet.Unicode)]
        private static extern bool mciGetErrorString(int errorCode, StringBuilder errorText, int errorTextSize);

        public void PlayFile(string path)
        {
            if (_isDisposed) throw new ObjectDisposedException("InlineAudioPlayer");
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("音檔路徑是空白。", "path");
            if (!File.Exists(path)) throw new FileNotFoundException("找不到音檔。", path);

            Stop();

            string extension = Path.GetExtension(path).ToLowerInvariant();
            string type = extension == ".wav" ? "waveaudio" : "mpegvideo";
            string safePath = path.Replace("\"", string.Empty);

            string openCommand = "open \"" + safePath + "\" type " + type + " alias " + AudioAlias;
            int error = mciSendString(openCommand, null, 0, IntPtr.Zero);
            if (error != 0)
            {
                openCommand = "open \"" + safePath + "\" alias " + AudioAlias;
                error = mciSendString(openCommand, null, 0, IntPtr.Zero);
            }
            ThrowIfMciError(error, "開啟音檔失敗");

            error = mciSendString("play " + AudioAlias, null, 0, IntPtr.Zero);
            ThrowIfMciError(error, "播放音檔失敗");
        }

        public void Pause()
        {
            mciSendString("pause " + AudioAlias, null, 0, IntPtr.Zero);
        }

        public void Resume()
        {
            mciSendString("resume " + AudioAlias, null, 0, IntPtr.Zero);
        }

        public void SetVolume(int volume)
        {
            volume = Math.Max(0, Math.Min(1000, volume));
            mciSendString("setaudio " + AudioAlias + " volume to " + volume.ToString(CultureInfo.InvariantCulture), null, 0, IntPtr.Zero);
        }

        public int GetLengthMilliseconds()
        {
            return QueryInt("status " + AudioAlias + " length");
        }

        public int GetPositionMilliseconds()
        {
            return QueryInt("status " + AudioAlias + " position");
        }

        public string GetMode()
        {
            var sb = new StringBuilder(64);
            int error = mciSendString("status " + AudioAlias + " mode", sb, sb.Capacity, IntPtr.Zero);
            if (error != 0) return string.Empty;
            return sb.ToString().Trim().ToLowerInvariant();
        }

        private static int QueryInt(string command)
        {
            var sb = new StringBuilder(64);
            int error = mciSendString(command, sb, sb.Capacity, IntPtr.Zero);
            if (error != 0) return 0;
            int value;
            return int.TryParse(sb.ToString().Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value) ? value : 0;
        }

        public void Speak(string text)
        {
            if (_isDisposed) throw new ObjectDisposedException("InlineAudioPlayer");
            if (string.IsNullOrWhiteSpace(text)) throw new ArgumentException("朗讀文字是空白。", "text");

            Stop();

            Type sapiType = Type.GetTypeFromProgID("SAPI.SpVoice");
            if (sapiType == null)
            {
                throw new InvalidOperationException("此系統找不到 SAPI.SpVoice，無法使用內建語音合成。 ");
            }

            _sapiVoice = Activator.CreateInstance(sapiType);
            sapiType.InvokeMember("Speak", BindingFlags.InvokeMethod, null, _sapiVoice, new object[] { text, 1 });
        }

        public void Stop()
        {
            mciSendString("stop " + AudioAlias, null, 0, IntPtr.Zero);
            mciSendString("close " + AudioAlias, null, 0, IntPtr.Zero);

            if (_sapiVoice != null)
            {
                try
                {
                    _sapiVoice.GetType().InvokeMember("Speak", BindingFlags.InvokeMethod, null, _sapiVoice, new object[] { string.Empty, 2 });
                }
                catch { }
                finally
                {
                    try { Marshal.ReleaseComObject(_sapiVoice); } catch { }
                    _sapiVoice = null;
                }
            }
        }

        public void Dispose()
        {
            if (_isDisposed) return;
            Stop();
            _isDisposed = true;
        }

        private static void ThrowIfMciError(int errorCode, string prefix)
        {
            if (errorCode == 0) return;

            var sb = new StringBuilder(512);
            if (mciGetErrorString(errorCode, sb, sb.Capacity))
            {
                throw new InvalidOperationException(prefix + "：" + sb.ToString());
            }

            throw new InvalidOperationException(prefix + "，MCI 錯誤碼：" + errorCode.ToString(CultureInfo.InvariantCulture));
        }
    }

    public sealed class TsvLoader
    {
        public LoadResult Load(string path, CancellationToken token, IProgress<LoadProgress> progress)
        {
            string extension = Path.GetExtension(path ?? string.Empty).ToLowerInvariant();

            if (extension == ".xlsx" || (string.IsNullOrWhiteSpace(extension) && SimpleXlsxReader.IsLikelyXlsx(path)))
            {
                return LoadXlsx(path, token, progress);
            }

            if (extension == ".xls")
            {
                return LoadExcelWithOleDb(path, token, progress, "XLS");
            }

            return LoadDelimitedText(path, token, progress);
        }

        private LoadResult LoadDelimitedText(string path, CancellationToken token, IProgress<LoadProgress> progress)
        {
            var encoding = EncodingDetector.Detect(path);
            var items = new List<WordItem>();
            char delimiter;
            string delimiterName;
            long fileLength = new FileInfo(path).Length;

            using (var reader = new StreamReader(path, encoding, true))
            {
                var samples = new List<string>();
                string line;
                int lineNumber = 0;
                while (samples.Count < 80 && (line = reader.ReadLine()) != null)
                {
                    token.ThrowIfCancellationRequested();
                    lineNumber++;
                    samples.Add(line);
                }

                delimiter = DelimiterDetector.Detect(samples);
                delimiterName = DelimiterDetector.GetName(delimiter);

                foreach (string sample in samples)
                {
                    AddLine(items, sample, items.Count + 1, delimiter);
                }

                int rows = items.Count;
                while ((line = reader.ReadLine()) != null)
                {
                    token.ThrowIfCancellationRequested();
                    rows++;
                    AddLine(items, line, rows, delimiter);

                    if (rows % 500 == 0 && progress != null)
                    {
                        int percent = 0;
                        try
                        {
                            percent = fileLength > 0 ? (int)Math.Min(99, reader.BaseStream.Position * 100L / fileLength) : 0;
                        }
                        catch { percent = 0; }
                        progress.Report(new LoadProgress(rows, percent));
                    }
                }
            }

            if (progress != null) progress.Report(new LoadProgress(items.Count, 100));
            return new LoadResult(items, encoding.WebName, delimiterName);
        }

        private LoadResult LoadXlsx(string path, CancellationToken token, IProgress<LoadProgress> progress)
        {
            try
            {
                List<string[]> rows = SimpleXlsxReader.ReadFirstWorksheet(path, token, progress);
                List<WordItem> items = RowsToWordItems(rows, token, progress);
                if (progress != null) progress.Report(new LoadProgress(items.Count, 100));
                return new LoadResult(items, "XLSX", "Excel 第一個工作表");
            }
            catch (Exception xlsxError)
            {
                try
                {
                    return LoadExcelWithOleDb(path, token, progress, "XLSX");
                }
                catch (Exception oleDbError)
                {
                    throw new InvalidOperationException(
                        "無法讀取 Excel 檔案。" + Environment.NewLine +
                        "可能原因：" + Environment.NewLine +
                        "1. 檔案不是有效的 .xlsx / .xls。" + Environment.NewLine +
                        "2. .xls 舊格式需要系統安裝 Microsoft ACE OLEDB Provider。" + Environment.NewLine +
                        "3. 檔案被 Excel 鎖定或受到權限限制。" + Environment.NewLine +
                        "建議：若仍失敗，請在 Excel 另存為 CSV 或 Unicode 文字檔後再開啟。" + Environment.NewLine + Environment.NewLine +
                        "XLSX 解析錯誤：" + xlsxError.Message + Environment.NewLine +
                        "OLEDB 解析錯誤：" + oleDbError.Message,
                        oleDbError);
                }
            }
        }

        private LoadResult LoadExcelWithOleDb(string path, CancellationToken token, IProgress<LoadProgress> progress, string formatName)
        {
            string extension = Path.GetExtension(path ?? string.Empty).ToLowerInvariant();
            var connectionStrings = new List<string>();

            if (extension == ".xls")
            {
                connectionStrings.Add(string.Format(
                    CultureInfo.InvariantCulture,
                    "Provider=Microsoft.ACE.OLEDB.12.0;Data Source={0};Extended Properties=\"Excel 8.0;HDR=NO;IMEX=1\";",
                    path));
                connectionStrings.Add(string.Format(
                    CultureInfo.InvariantCulture,
                    "Provider=Microsoft.Jet.OLEDB.4.0;Data Source={0};Extended Properties=\"Excel 8.0;HDR=NO;IMEX=1\";",
                    path));
            }
            else
            {
                connectionStrings.Add(string.Format(
                    CultureInfo.InvariantCulture,
                    "Provider=Microsoft.ACE.OLEDB.12.0;Data Source={0};Extended Properties=\"Excel 12.0 Xml;HDR=NO;IMEX=1\";",
                    path));
            }

            Exception lastError = null;

            foreach (string connectionString in connectionStrings)
            {
                token.ThrowIfCancellationRequested();

                try
                {
                    using (var connection = new OleDbConnection(connectionString))
                    {
                        connection.Open();

                        DataTable schema = connection.GetOleDbSchemaTable(OleDbSchemaGuid.Tables, null);
                        if (schema == null || schema.Rows.Count == 0)
                        {
                            throw new InvalidOperationException("找不到 Excel 工作表。");
                        }

                        string sheetName = FindFirstWorksheetName(schema);
                        if (string.IsNullOrWhiteSpace(sheetName))
                        {
                            throw new InvalidOperationException("找不到可讀取的 Excel 工作表。");
                        }

                        string commandText = "SELECT * FROM [" + sheetName.Replace("]", "]]") + "]";
                        using (var adapter = new OleDbDataAdapter(commandText, connection))
                        {
                            var table = new DataTable();
                            adapter.Fill(table);

                            var rows = new List<string[]>();
                            foreach (DataRow row in table.Rows)
                            {
                                token.ThrowIfCancellationRequested();
                                var values = new string[table.Columns.Count];
                                for (int i = 0; i < table.Columns.Count; i++)
                                {
                                    object value = row[i];
                                    values[i] = value == null || value == DBNull.Value ? string.Empty : Convert.ToString(value, CultureInfo.InvariantCulture);
                                }
                                rows.Add(values);
                            }

                            List<WordItem> items = RowsToWordItems(rows, token, progress);
                            if (progress != null) progress.Report(new LoadProgress(items.Count, 100));
                            return new LoadResult(items, formatName + " / OLEDB", "Excel 工作表：" + sheetName);
                        }
                    }
                }
                catch (Exception ex)
                {
                    lastError = ex;
                }
            }

            throw new InvalidOperationException("Excel OLEDB 讀取失敗。系統可能沒有安裝對應的 Microsoft ACE OLEDB Provider。", lastError);
        }

        private static string FindFirstWorksheetName(DataTable schema)
        {
            foreach (DataRow row in schema.Rows)
            {
                string tableName = row["TABLE_NAME"] == null ? string.Empty : row["TABLE_NAME"].ToString();
                string tableType = schema.Columns.Contains("TABLE_TYPE") && row["TABLE_TYPE"] != null ? row["TABLE_TYPE"].ToString() : string.Empty;

                if (tableType.IndexOf("TABLE", StringComparison.OrdinalIgnoreCase) >= 0 &&
                    (tableName.EndsWith("$", StringComparison.Ordinal) || tableName.EndsWith("$'", StringComparison.Ordinal)))
                {
                    return tableName;
                }
            }

            foreach (DataRow row in schema.Rows)
            {
                string tableName = row["TABLE_NAME"] == null ? string.Empty : row["TABLE_NAME"].ToString();
                if (!string.IsNullOrWhiteSpace(tableName) && tableName.IndexOf("FilterDatabase", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    return tableName;
                }
            }

            return string.Empty;
        }

        private static List<WordItem> RowsToWordItems(IEnumerable<string[]> rows, CancellationToken token, IProgress<LoadProgress> progress)
        {
            var items = new List<WordItem>();
            int rowNumber = 0;

            foreach (string[] row in rows)
            {
                token.ThrowIfCancellationRequested();
                rowNumber++;

                if (row == null || row.All(x => string.IsNullOrWhiteSpace(x)))
                {
                    continue;
                }

                WordItem item = WordItem.FromParts(row, rowNumber);
                items.Add(item);

                if (items.Count % 500 == 0 && progress != null)
                {
                    progress.Report(new LoadProgress(items.Count, 95));
                }
            }

            return items;
        }

        private static void AddLine(List<WordItem> items, string line, int lineNumber, char delimiter)
        {
            if (string.IsNullOrWhiteSpace(line)) return;
            var item = WordItem.FromLine(line, lineNumber, delimiter);
            items.Add(item);
        }
    }

    public sealed class SimpleXlsxReader
    {
        public static bool IsLikelyXlsx(string path)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return false;
                using (var fs = File.OpenRead(path))
                {
                    if (fs.Length < 4) return false;
                    return fs.ReadByte() == 0x50 && fs.ReadByte() == 0x4B;
                }
            }
            catch
            {
                return false;
            }
        }

        public static List<string[]> ReadFirstWorksheet(string path, CancellationToken token, IProgress<LoadProgress> progress)
        {
            token.ThrowIfCancellationRequested();

            SimpleZipPackage package = SimpleZipPackage.Open(path);

            string workbookPath = "xl/workbook.xml";
            string relsPath = "xl/_rels/workbook.xml.rels";
            string sheetPath = ResolveFirstSheetPath(package, workbookPath, relsPath);

            List<string> sharedStrings = ParseSharedStrings(package.TryReadText("xl/sharedStrings.xml"));
            string sheetXml = package.ReadText(sheetPath);

            return ParseWorksheet(sheetXml, sharedStrings, token, progress);
        }

        private static string ResolveFirstSheetPath(SimpleZipPackage package, string workbookPath, string relsPath)
        {
            string workbookXml = package.TryReadText(workbookPath);
            string relsXml = package.TryReadText(relsPath);

            if (!string.IsNullOrWhiteSpace(workbookXml) && !string.IsNullOrWhiteSpace(relsXml))
            {
                string relationshipId = GetFirstWorksheetRelationshipId(workbookXml);
                if (!string.IsNullOrWhiteSpace(relationshipId))
                {
                    string target = GetRelationshipTarget(relsXml, relationshipId);
                    if (!string.IsNullOrWhiteSpace(target))
                    {
                        target = target.Replace('\\', '/');
                        if (target.StartsWith("/", StringComparison.Ordinal))
                        {
                            return NormalizeXlsxPath(target.TrimStart('/'));
                        }
                        return NormalizeXlsxPath("xl/" + target);
                    }
                }
            }

            if (package.Contains("xl/worksheets/sheet1.xml"))
            {
                return "xl/worksheets/sheet1.xml";
            }

            string firstSheet = package.Names
                .Where(x => x.StartsWith("xl/worksheets/", StringComparison.OrdinalIgnoreCase) && x.EndsWith(".xml", StringComparison.OrdinalIgnoreCase))
                .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault();

            if (string.IsNullOrWhiteSpace(firstSheet))
            {
                throw new InvalidOperationException("XLSX 裡找不到工作表 XML。");
            }

            return firstSheet;
        }

        private static string GetFirstWorksheetRelationshipId(string workbookXml)
        {
            var doc = LoadXml(workbookXml);
            XmlNodeList nodes = doc.GetElementsByTagName("*");

            foreach (XmlNode node in nodes)
            {
                if (node.LocalName != "sheet" || node.Attributes == null) continue;

                string state = GetAttribute(node, "state");
                if (string.Equals(state, "hidden", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(state, "veryHidden", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string id = GetAttribute(node, "id");
                if (!string.IsNullOrWhiteSpace(id)) return id;
            }

            foreach (XmlNode node in nodes)
            {
                if (node.LocalName == "sheet" && node.Attributes != null)
                {
                    string id = GetAttribute(node, "id");
                    if (!string.IsNullOrWhiteSpace(id)) return id;
                }
            }

            return string.Empty;
        }

        private static string GetRelationshipTarget(string relsXml, string relationshipId)
        {
            var doc = LoadXml(relsXml);
            XmlNodeList nodes = doc.GetElementsByTagName("*");

            foreach (XmlNode node in nodes)
            {
                if (node.LocalName != "Relationship" || node.Attributes == null) continue;
                string id = GetAttribute(node, "Id");
                if (string.Equals(id, relationshipId, StringComparison.OrdinalIgnoreCase))
                {
                    return GetAttribute(node, "Target");
                }
            }

            return string.Empty;
        }

        private static List<string> ParseSharedStrings(string xml)
        {
            var result = new List<string>();
            if (string.IsNullOrWhiteSpace(xml)) return result;

            var doc = LoadXml(xml);
            XmlNodeList nodes = doc.GetElementsByTagName("*");

            foreach (XmlNode node in nodes)
            {
                if (node.LocalName != "si") continue;
                var sb = new StringBuilder();
                AppendTextNodes(node, sb);
                result.Add(sb.ToString());
            }

            return result;
        }

        private static List<string[]> ParseWorksheet(string xml, List<string> sharedStrings, CancellationToken token, IProgress<LoadProgress> progress)
        {
            var result = new List<string[]>();
            var doc = LoadXml(xml);
            XmlNodeList rowNodes = doc.GetElementsByTagName("*");
            int parsedRows = 0;

            foreach (XmlNode rowNode in rowNodes)
            {
                if (rowNode.LocalName != "row") continue;

                token.ThrowIfCancellationRequested();

                var values = new List<string>();
                int nextColumn = 0;

                foreach (XmlNode cellNode in rowNode.ChildNodes)
                {
                    if (cellNode.LocalName != "c") continue;

                    int columnIndex = GetColumnIndex(GetAttribute(cellNode, "r"), nextColumn);

                    while (values.Count < columnIndex)
                    {
                        values.Add(string.Empty);
                    }

                    string value = GetCellValue(cellNode, sharedStrings);
                    if (values.Count == columnIndex)
                    {
                        values.Add(value);
                    }
                    else
                    {
                        values[columnIndex] = value;
                    }

                    nextColumn = columnIndex + 1;
                }

                result.Add(values.ToArray());
                parsedRows++;

                if (parsedRows % 500 == 0 && progress != null)
                {
                    progress.Report(new LoadProgress(parsedRows, 95));
                }
            }

            return result;
        }

        private static string GetCellValue(XmlNode cellNode, List<string> sharedStrings)
        {
            string type = GetAttribute(cellNode, "t");

            if (string.Equals(type, "inlineStr", StringComparison.OrdinalIgnoreCase))
            {
                var sb = new StringBuilder();
                AppendTextNodes(cellNode, sb);
                return sb.ToString();
            }

            string raw = GetFirstChildText(cellNode, "v");

            if (string.Equals(type, "s", StringComparison.OrdinalIgnoreCase))
            {
                int index;
                if (int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out index) &&
                    index >= 0 && index < sharedStrings.Count)
                {
                    return sharedStrings[index];
                }
                return string.Empty;
            }

            if (string.Equals(type, "b", StringComparison.OrdinalIgnoreCase))
            {
                return raw == "1" ? "TRUE" : "FALSE";
            }

            return raw;
        }

        private static string GetFirstChildText(XmlNode node, string localName)
        {
            foreach (XmlNode child in node.ChildNodes)
            {
                if (child.LocalName == localName) return child.InnerText ?? string.Empty;
            }

            return string.Empty;
        }

        private static void AppendTextNodes(XmlNode node, StringBuilder sb)
        {
            if (node == null) return;

            if (node.LocalName == "t")
            {
                sb.Append(node.InnerText);
                return;
            }

            foreach (XmlNode child in node.ChildNodes)
            {
                AppendTextNodes(child, sb);
            }
        }

        private static XmlDocument LoadXml(string xml)
        {
            var doc = new XmlDocument();
            doc.XmlResolver = null;
            doc.LoadXml(xml);
            return doc;
        }

        private static string GetAttribute(XmlNode node, string localName)
        {
            if (node == null || node.Attributes == null) return string.Empty;

            foreach (XmlAttribute attr in node.Attributes)
            {
                if (string.Equals(attr.LocalName, localName, StringComparison.OrdinalIgnoreCase))
                {
                    return attr.Value ?? string.Empty;
                }
            }

            return string.Empty;
        }

        private static int GetColumnIndex(string cellReference, int fallback)
        {
            if (string.IsNullOrWhiteSpace(cellReference)) return fallback;

            int index = 0;
            bool hasLetter = false;

            foreach (char ch in cellReference)
            {
                if (ch >= 'A' && ch <= 'Z')
                {
                    hasLetter = true;
                    index = index * 26 + (ch - 'A' + 1);
                }
                else if (ch >= 'a' && ch <= 'z')
                {
                    hasLetter = true;
                    index = index * 26 + (ch - 'a' + 1);
                }
                else
                {
                    break;
                }
            }

            return hasLetter ? index - 1 : fallback;
        }

        private static string NormalizeXlsxPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return string.Empty;

            path = path.Replace('\\', '/');

            while (path.Contains("/../"))
            {
                int marker = path.IndexOf("/../", StringComparison.Ordinal);
                if (marker <= 0) break;

                int previousSlash = path.LastIndexOf('/', marker - 1);
                if (previousSlash < 0)
                {
                    path = path.Substring(marker + 4);
                }
                else
                {
                    path = path.Substring(0, previousSlash) + path.Substring(marker + 3);
                }
            }

            return path.TrimStart('/');
        }
    }

    public sealed class SimpleZipPackage
    {
        private readonly byte[] _data;
        private readonly Dictionary<string, SimpleZipEntry> _entries;

        private SimpleZipPackage(byte[] data, Dictionary<string, SimpleZipEntry> entries)
        {
            _data = data;
            _entries = entries;
        }

        public IEnumerable<string> Names
        {
            get { return _entries.Keys; }
        }

        public bool Contains(string name)
        {
            return _entries.ContainsKey(NormalizeName(name));
        }

        public string TryReadText(string name)
        {
            try
            {
                if (!Contains(name)) return string.Empty;
                return ReadText(name);
            }
            catch
            {
                return string.Empty;
            }
        }

        public string ReadText(string name)
        {
            byte[] bytes = ReadBytes(name);
            return Encoding.UTF8.GetString(bytes);
        }

        public byte[] ReadBytes(string name)
        {
            name = NormalizeName(name);

            SimpleZipEntry entry;
            if (!_entries.TryGetValue(name, out entry))
            {
                throw new FileNotFoundException("XLSX 壓縮包內找不到檔案：" + name);
            }

            int offset = entry.LocalHeaderOffset;
            if (ReadUInt32(_data, offset) != 0x04034b50)
            {
                throw new InvalidDataException("XLSX ZIP local header 格式不正確。");
            }

            int fileNameLength = ReadUInt16(_data, offset + 26);
            int extraLength = ReadUInt16(_data, offset + 28);
            int dataOffset = offset + 30 + fileNameLength + extraLength;

            if (dataOffset < 0 || dataOffset + entry.CompressedSize > _data.Length)
            {
                throw new InvalidDataException("XLSX ZIP 內容長度不正確。");
            }

            if (entry.CompressionMethod == 0)
            {
                byte[] raw = new byte[entry.CompressedSize];
                Buffer.BlockCopy(_data, dataOffset, raw, 0, raw.Length);
                return raw;
            }

            if (entry.CompressionMethod == 8)
            {
                using (var input = new MemoryStream(_data, dataOffset, entry.CompressedSize))
                using (var deflate = new DeflateStream(input, CompressionMode.Decompress))
                using (var output = new MemoryStream())
                {
                    deflate.CopyTo(output);
                    return output.ToArray();
                }
            }

            throw new NotSupportedException("不支援的 XLSX ZIP 壓縮方法：" + entry.CompressionMethod);
        }

        public static SimpleZipPackage Open(string path)
        {
            byte[] data = File.ReadAllBytes(path);

            int eocd = FindEndOfCentralDirectory(data);
            if (eocd < 0)
            {
                throw new InvalidDataException("不是有效的 XLSX ZIP 檔案。");
            }

            int entryCount = ReadUInt16(data, eocd + 10);
            int centralDirectoryOffset = (int)ReadUInt32(data, eocd + 16);
            var entries = new Dictionary<string, SimpleZipEntry>(StringComparer.OrdinalIgnoreCase);

            int position = centralDirectoryOffset;

            for (int i = 0; i < entryCount; i++)
            {
                if (position + 46 > data.Length || ReadUInt32(data, position) != 0x02014b50)
                {
                    throw new InvalidDataException("XLSX ZIP central directory 格式不正確。");
                }

                int flags = ReadUInt16(data, position + 8);
                int compressionMethod = ReadUInt16(data, position + 10);
                int compressedSize = (int)ReadUInt32(data, position + 20);
                int uncompressedSize = (int)ReadUInt32(data, position + 24);
                int fileNameLength = ReadUInt16(data, position + 28);
                int extraLength = ReadUInt16(data, position + 30);
                int commentLength = ReadUInt16(data, position + 32);
                int localHeaderOffset = (int)ReadUInt32(data, position + 42);

                string name = DecodeZipName(data, position + 46, fileNameLength, flags);
                name = NormalizeName(name);

                if (!string.IsNullOrWhiteSpace(name) && !name.EndsWith("/", StringComparison.Ordinal))
                {
                    entries[name] = new SimpleZipEntry(name, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset);
                }

                position += 46 + fileNameLength + extraLength + commentLength;
            }

            return new SimpleZipPackage(data, entries);
        }

        private static int FindEndOfCentralDirectory(byte[] data)
        {
            int min = Math.Max(0, data.Length - 65557);
            for (int i = data.Length - 22; i >= min; i--)
            {
                if (ReadUInt32(data, i) == 0x06054b50)
                {
                    return i;
                }
            }

            return -1;
        }

        private static string DecodeZipName(byte[] data, int offset, int length, int flags)
        {
            Encoding encoding = (flags & 0x0800) != 0 ? Encoding.UTF8 : Encoding.Default;
            return encoding.GetString(data, offset, length);
        }

        private static string NormalizeName(string name)
        {
            return (name ?? string.Empty).Replace('\\', '/').TrimStart('/');
        }

        private static ushort ReadUInt16(byte[] data, int offset)
        {
            if (offset < 0 || offset + 2 > data.Length) return 0;
            return (ushort)(data[offset] | (data[offset + 1] << 8));
        }

        private static uint ReadUInt32(byte[] data, int offset)
        {
            if (offset < 0 || offset + 4 > data.Length) return 0;
            return (uint)(data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24));
        }
    }

    public sealed class SimpleZipEntry
    {
        public SimpleZipEntry(string name, int compressionMethod, int compressedSize, int uncompressedSize, int localHeaderOffset)
        {
            Name = name;
            CompressionMethod = compressionMethod;
            CompressedSize = compressedSize;
            UncompressedSize = uncompressedSize;
            LocalHeaderOffset = localHeaderOffset;
        }

        public string Name { get; private set; }
        public int CompressionMethod { get; private set; }
        public int CompressedSize { get; private set; }
        public int UncompressedSize { get; private set; }
        public int LocalHeaderOffset { get; private set; }
    }

    public sealed class LoadResult
    {
        public LoadResult(List<WordItem> items, string encodingName, string delimiterName)
        {
            Items = items;
            EncodingName = encodingName;
            DelimiterName = delimiterName;
        }

        public List<WordItem> Items { get; private set; }
        public string EncodingName { get; private set; }
        public string DelimiterName { get; private set; }
    }

    public sealed class LoadProgress
    {
        public LoadProgress(int rowsLoaded, int percent)
        {
            RowsLoaded = rowsLoaded;
            Percent = percent;
        }

        public int RowsLoaded { get; private set; }
        public int Percent { get; private set; }
    }

    public sealed class WordItem
    {
        public WordItem()
        {
            Issues = new List<string>();
            QualityScore = 0;
            RiskLevel = "低";
            RiskScore = 0;
            AiLevel = "未知";
            Recommendation = "尚未分析。";
            NextReviewDate = DateTime.MinValue;
        }

        public int LineNumber { get; set; }
        public string Word { get; set; }
        public string Phonogram { get; set; }
        public string SoundPath { get; set; }
        public string Explain { get; set; }
        public string RawLine { get; set; }
        public double QualityScore { get; set; }
        public string RiskLevel { get; set; }
        public int RiskScore { get; set; }
        public string AiLevel { get; set; }
        public string Recommendation { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsLearned { get; set; }
        public int ReviewCount { get; set; }
        public DateTime NextReviewDate { get; set; }
        public List<string> Issues { get; private set; }

        public string LearningBadge
        {
            get
            {
                if (IsFavorite && IsLearned) return "★✓";
                if (IsFavorite) return "★";
                if (IsLearned) return "✓";
                if (ReviewCount > 0) return "R" + ReviewCount.ToString(CultureInfo.InvariantCulture);
                return "";
            }
        }

        public string IssuesText
        {
            get { return Issues == null || Issues.Count == 0 ? "" : string.Join("、", Issues.ToArray()); }
        }

        public static WordItem FromLine(string line, int lineNumber, char delimiter)
        {
            string[] parts = DelimitedLineParser.Parse(line, delimiter).ToArray();
            return FromParts(parts, lineNumber, line ?? string.Empty);
        }

        public static WordItem FromParts(IEnumerable<string> values, int lineNumber)
        {
            string[] parts = values == null ? new string[0] : values.ToArray();
            return FromParts(parts, lineNumber, string.Join("\t", parts));
        }

        private static WordItem FromParts(string[] parts, int lineNumber, string rawLine)
        {
            var item = new WordItem();
            item.LineNumber = lineNumber;
            item.RawLine = rawLine ?? string.Empty;
            item.Word = GetPart(parts, 0);
            item.Phonogram = GetPart(parts, 1);
            item.SoundPath = GetPart(parts, 2);
            item.Explain = parts.Length > 3 ? string.Join(Environment.NewLine, parts.Skip(3).Select(TextCleaner.CleanCell).Where(x => !string.IsNullOrWhiteSpace(x)).ToArray()) : string.Empty;
            return item;
        }

        private static string GetPart(string[] parts, int index)
        {
            if (parts == null || index >= parts.Length) return string.Empty;
            return TextCleaner.CleanCell(parts[index]);
        }

        public string ResolveSoundPath(string baseDirectory)
        {
            if (string.IsNullOrWhiteSpace(SoundPath)) return string.Empty;
            string cleaned = SoundPath.Trim().Trim('"');
            try
            {
                if (Path.IsPathRooted(cleaned)) return Path.GetFullPath(cleaned);
                if (string.IsNullOrWhiteSpace(baseDirectory)) return cleaned;
                return Path.GetFullPath(Path.Combine(baseDirectory, cleaned));
            }
            catch
            {
                return cleaned;
            }
        }

        public string ToTsvLine()
        {
            return string.Join("\t", new string[]
            {
                EscapeTsv(Word),
                EscapeTsv(Phonogram),
                EscapeTsv(SoundPath),
                EscapeTsv(Explain)
            });
        }

        public string ToCsvLine()
        {
            return string.Join(",", new string[]
            {
                EscapeCsv(Word),
                EscapeCsv(Phonogram),
                EscapeCsv(SoundPath),
                EscapeCsv(Explain),
                EscapeCsv(AiLevel),
                EscapeCsv(QualityScore.ToString("N1")),
                EscapeCsv(RiskLevel),
                EscapeCsv(IssuesText)
            });
        }

        private static string EscapeTsv(string value)
        {
            value = value ?? string.Empty;
            return value.Replace("\t", " ").Replace("\r", " ").Replace("\n", " ");
        }

        private static string EscapeCsv(string value)
        {
            value = value ?? string.Empty;
            bool needQuote = value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r");
            value = value.Replace("\"", "\"\"");
            return needQuote ? "\"" + value + "\"" : value;
        }
    }

    public static class EncodingDetector
    {
        public static Encoding Detect(string path)
        {
            byte[] bom = new byte[4];
            using (var fs = File.OpenRead(path))
            {
                fs.Read(bom, 0, Math.Min(4, (int)fs.Length));
            }

            if (bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF) return new UTF8Encoding(true);
            if (bom[0] == 0xFF && bom[1] == 0xFE) return Encoding.Unicode;
            if (bom[0] == 0xFE && bom[1] == 0xFF) return Encoding.BigEndianUnicode;
            return new UTF8Encoding(false, false);
        }
    }

    public static class DelimiterDetector
    {
        public static char Detect(IEnumerable<string> lines)
        {
            int tabs = 0;
            int commas = 0;
            int semicolons = 0;
            foreach (string line in lines.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                tabs += Count(line, '\t');
                commas += Count(line, ',');
                semicolons += Count(line, ';');
            }
            if (tabs >= commas && tabs >= semicolons) return '\t';
            if (commas >= semicolons) return ',';
            return ';';
        }

        public static string GetName(char delimiter)
        {
            if (delimiter == '\t') return "Tab / TSV";
            if (delimiter == ',') return "Comma / CSV";
            if (delimiter == ';') return "Semicolon";
            return delimiter.ToString();
        }

        private static int Count(string value, char c)
        {
            int count = 0;
            foreach (char x in value) if (x == c) count++;
            return count;
        }
    }

    public static class DelimitedLineParser
    {
        public static IEnumerable<string> Parse(string line, char delimiter)
        {
            if (line == null) yield break;
            if (delimiter == '\t')
            {
                foreach (string part in line.Split('\t')) yield return part;
                yield break;
            }

            var sb = new StringBuilder();
            bool inQuote = false;
            for (int i = 0; i < line.Length; i++)
            {
                char ch = line[i];
                if (ch == '"')
                {
                    if (inQuote && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        sb.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuote = !inQuote;
                    }
                }
                else if (ch == delimiter && !inQuote)
                {
                    yield return sb.ToString();
                    sb.Length = 0;
                }
                else
                {
                    sb.Append(ch);
                }
            }
            yield return sb.ToString();
        }
    }

    public sealed class WordInsightEngine
    {
        private readonly List<IInsightProvider> _providers = new List<IInsightProvider>();

        public WordInsightEngine()
        {
            _providers.Add(new LocalHeuristicInsightProvider());
            _providers.Add(new DeepLearningHookProvider());
        }

        public void Analyze(List<WordItem> items, string baseDirectory)
        {
            if (items == null) return;

            var context = new InsightContext(items, baseDirectory);
            foreach (var item in items)
            {
                item.Issues.Clear();
                item.RiskScore = 0;
                item.RiskLevel = "低";
                item.QualityScore = 100;
                item.AiLevel = "未知";
                item.Recommendation = string.Empty;
            }

            foreach (IInsightProvider provider in _providers)
            {
                provider.Analyze(context);
            }

            foreach (var item in items)
            {
                item.QualityScore = Math.Max(0, Math.Min(100, item.QualityScore));
                if (item.RiskScore >= 90) item.RiskLevel = "致命";
                else if (item.RiskScore >= 60) item.RiskLevel = "高";
                else if (item.RiskScore >= 30) item.RiskLevel = "中";
                else item.RiskLevel = "低";

                if (string.IsNullOrWhiteSpace(item.Recommendation))
                {
                    item.Recommendation = RecommendationEngine.Build(item);
                }
            }
        }
    }

    public interface IInsightProvider
    {
        string Name { get; }
        void Analyze(InsightContext context);
    }

    public sealed class InsightContext
    {
        public InsightContext(List<WordItem> items, string baseDirectory)
        {
            Items = items ?? new List<WordItem>();
            BaseDirectory = baseDirectory ?? string.Empty;
            DuplicateMap = Items
                .Where(x => !string.IsNullOrWhiteSpace(x.Word))
                .GroupBy(x => x.Word.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);
        }

        public List<WordItem> Items { get; private set; }
        public string BaseDirectory { get; private set; }
        public Dictionary<string, int> DuplicateMap { get; private set; }
    }

    public sealed class LocalHeuristicInsightProvider : IInsightProvider
    {
        public string Name { get { return "Local Heuristic AI"; } }

        public void Analyze(InsightContext context)
        {
            foreach (var item in context.Items)
            {
                AnalyzeStructure(item, context);
                AnalyzeSecurity(item, context);
                AnalyzeDifficulty(item);
                AnalyzeQuality(item);
            }
        }

        private void AnalyzeStructure(WordItem item, InsightContext context)
        {
            if (string.IsNullOrWhiteSpace(item.Word)) AddIssue(item, "缺少單字", 35, 20);
            if (string.IsNullOrWhiteSpace(item.Phonogram)) AddIssue(item, "缺少音標", 12, 8);
            if (string.IsNullOrWhiteSpace(item.SoundPath)) AddIssue(item, "缺少音檔", 18, 10);
            if (string.IsNullOrWhiteSpace(item.Explain)) AddIssue(item, "缺少解釋", 25, 12);

            if (!string.IsNullOrWhiteSpace(item.Word))
            {
                if (item.Word.Length > 40) AddIssue(item, "單字過長", 8, 3);
                if (item.Word.Any(char.IsWhiteSpace)) AddIssue(item, "單字含空白", 10, 3);
                if (item.Word.Any(ch => char.IsControl(ch))) AddIssue(item, "單字含控制字元", 20, 10);
                int count;
                if (context.DuplicateMap.TryGetValue(item.Word.Trim(), out count) && count > 1) AddIssue(item, "重複單字", 10, 4);
            }

            if (!string.IsNullOrWhiteSpace(item.SoundPath))
            {
                string resolved = item.ResolveSoundPath(context.BaseDirectory);
                if (!AudioInspector.IsAllowedAudioExtension(resolved)) AddIssue(item, "音檔副檔名不建議", 20, 20);
                if (!SecurityInspector.HasSuspiciousPath(item.SoundPath) && !File.Exists(resolved)) AddIssue(item, "音檔不存在", 15, 6);
            }
        }

        private void AnalyzeSecurity(WordItem item, InsightContext context)
        {
            if (SecurityInspector.HasSuspiciousPath(item.SoundPath)) AddIssue(item, "可疑音檔路徑", 50, 55);
            if (SecurityInspector.HasDangerousExtension(item.SoundPath)) AddIssue(item, "危險副檔名", 70, 75);
            if (SecurityInspector.ContainsScriptLikeContent(item.Explain)) AddIssue(item, "解釋含可疑腳本", 55, 60);
            if (SecurityInspector.ContainsCommandLikeContent(item.Explain)) AddIssue(item, "解釋含可疑指令", 45, 45);
            if (SecurityInspector.ContainsExternalUrl(item.Explain)) AddIssue(item, "解釋含外部連結", 18, 22);
        }

        private void AnalyzeDifficulty(WordItem item)
        {
            string word = item.Word ?? string.Empty;
            int len = word.Count(ch => char.IsLetter(ch));
            int syllableLike = EstimateSyllables(word);
            bool hasAffix = word.EndsWith("tion", StringComparison.OrdinalIgnoreCase)
                || word.EndsWith("sion", StringComparison.OrdinalIgnoreCase)
                || word.EndsWith("ment", StringComparison.OrdinalIgnoreCase)
                || word.EndsWith("ness", StringComparison.OrdinalIgnoreCase)
                || word.EndsWith("ous", StringComparison.OrdinalIgnoreCase)
                || word.EndsWith("ive", StringComparison.OrdinalIgnoreCase);

            int score = len + syllableLike * 3 + (hasAffix ? 6 : 0);
            if (score <= 8) item.AiLevel = "A1";
            else if (score <= 12) item.AiLevel = "A2";
            else if (score <= 18) item.AiLevel = "B1";
            else if (score <= 24) item.AiLevel = "B2";
            else if (score <= 31) item.AiLevel = "C1";
            else item.AiLevel = "C2";
        }

        private void AnalyzeQuality(WordItem item)
        {
            if (!string.IsNullOrWhiteSpace(item.Explain))
            {
                if (item.Explain.Length < 4) AddIssue(item, "解釋過短", 10, 3);
                if (item.Explain.Length > 800) AddIssue(item, "解釋過長", 5, 2);
                if (item.Explain.Contains("???") || item.Explain.Contains("TODO")) AddIssue(item, "解釋疑似未完成", 20, 6);
            }

            if (!string.IsNullOrWhiteSpace(item.Phonogram))
            {
                bool looksLikePhonogram = item.Phonogram.Contains("ə") || item.Phonogram.Contains("ˈ") || item.Phonogram.Contains("ɪ") || item.Phonogram.Contains("æ") || item.Phonogram.Contains("/") || item.Phonogram.Contains("\\");
                if (!looksLikePhonogram) AddIssue(item, "音標格式可能異常", 6, 2);
            }
        }

        private static void AddIssue(WordItem item, string issue, double qualityPenalty, int riskPenalty)
        {
            if (!item.Issues.Contains(issue)) item.Issues.Add(issue);
            item.QualityScore -= qualityPenalty;
            item.RiskScore += riskPenalty;
        }

        private static int EstimateSyllables(string word)
        {
            if (string.IsNullOrWhiteSpace(word)) return 0;
            const string vowels = "aeiouyAEIOUY";
            int count = 0;
            bool previousVowel = false;
            foreach (char ch in word)
            {
                bool isVowel = vowels.IndexOf(ch) >= 0;
                if (isVowel && !previousVowel) count++;
                previousVowel = isVowel;
            }
            if (word.EndsWith("e", StringComparison.OrdinalIgnoreCase) && count > 1) count--;
            return Math.Max(1, count);
        }
    }

    public sealed class DeepLearningHookProvider : IInsightProvider
    {
        public string Name { get { return "Deep Learning Hook"; } }

        public void Analyze(InsightContext context)
        {
            // 產品級架構預留點：之後可在這裡接 ONNX Runtime、雲端模型或本地 Embedding。
            // 為了讓本檔案可直接編譯，這裡不引用任何外部 NuGet。
            foreach (var item in context.Items)
            {
                if (item.Issues.Count >= 4 && item.QualityScore < 55)
                {
                    if (!item.Issues.Contains("AI建議人工複查")) item.Issues.Add("AI建議人工複查");
                    item.RiskScore += 5;
                }
            }
        }
    }

    public static class RecommendationEngine
    {
        public static string Build(WordItem item)
        {
            var tips = new List<string>();
            if (item.Issues.Contains("缺少音標")) tips.Add("補上音標，能提高背單字與發音學習品質。");
            if (item.Issues.Contains("缺少音檔") || item.Issues.Contains("音檔不存在")) tips.Add("確認 SoundPath 是否正確，建議使用相對路徑集中管理音檔。");
            if (item.Issues.Contains("重複單字")) tips.Add("檢查重複單字是否為不同詞性；若不是，建議合併。");
            if (item.Issues.Contains("可疑音檔路徑") || item.Issues.Contains("危險副檔名")) tips.Add("不要直接開啟可疑路徑，請先人工確認來源。");
            if (item.Issues.Contains("解釋含可疑腳本")) tips.Add("解釋欄不應包含腳本；建議清除 HTML/JS 內容。");
            if (tips.Count == 0) tips.Add("資料品質良好，可列入正式字庫。 ");
            return string.Join(Environment.NewLine, tips.ToArray());
        }
    }

    public static class SecurityInspector
    {
        private static readonly string[] DangerousExtensions = new string[]
        {
            ".exe", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".jar", ".msi", ".scr", ".com", ".lnk"
        };

        public static bool HasSuspiciousPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return false;
            string p = path.Trim();
            if (p.Contains("..")) return true;
            if (p.StartsWith("\\\\")) return true;
            if (p.StartsWith("//")) return true;
            if (p.IndexOfAny(Path.GetInvalidPathChars()) >= 0) return true;
            if (p.Length > 260) return true;
            return false;
        }

        public static bool HasDangerousExtension(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return false;
            string ext;
            try { ext = Path.GetExtension(path).ToLowerInvariant(); }
            catch { return true; }
            return DangerousExtensions.Contains(ext);
        }

        public static bool ContainsScriptLikeContent(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            string t = text.ToLowerInvariant();
            return t.Contains("<script") || t.Contains("javascript:") || t.Contains("onerror=") || t.Contains("onload=") || t.Contains("iframe") || t.Contains("<object");
        }

        public static bool ContainsCommandLikeContent(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            string t = text.ToLowerInvariant();
            return t.Contains("powershell") || t.Contains("cmd.exe") || t.Contains("/c ") || t.Contains("wget ") || t.Contains("curl ") || t.Contains("certutil");
        }

        public static bool ContainsExternalUrl(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            string t = text.ToLowerInvariant();
            return t.Contains("http://") || t.Contains("https://") || t.Contains("ftp://");
        }
    }

    public static class AudioInspector
    {
        private static readonly string[] AllowedExtensions = new string[]
        {
            ".mp3", ".wav", ".m4a", ".aac", ".wma", ".flac", ".ogg"
        };

        public static bool IsAllowedAudioExtension(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return false;
            string ext;
            try { ext = Path.GetExtension(path).ToLowerInvariant(); }
            catch { return false; }
            return AllowedExtensions.Contains(ext);
        }
    }

    public static class TextCleaner
    {
        public static string CleanCell(string value)
        {
            if (value == null) return string.Empty;
            value = value.Replace("\uFEFF", string.Empty);
            value = RemoveControlChars(value);
            return value.Trim();
        }

        public static string CleanLongText(string value)
        {
            value = CleanCell(value);
            while (value.Contains("  ")) value = value.Replace("  ", " ");
            return value;
        }

        private static string RemoveControlChars(string value)
        {
            var sb = new StringBuilder(value.Length);
            foreach (char ch in value)
            {
                if (!char.IsControl(ch) || ch == '\r' || ch == '\n' || ch == '\t') sb.Append(ch);
            }
            return sb.ToString();
        }
    }

    public sealed class InsightSummary
    {
        public int Total { get; set; }
        public int UniqueWords { get; set; }
        public int Duplicates { get; set; }
        public int HighRisk { get; set; }
        public int MissingAudio { get; set; }
        public int MissingExplain { get; set; }
        public double AverageQuality { get; set; }

        public static InsightSummary From(List<WordItem> items)
        {
            items = items ?? new List<WordItem>();
            int unique = items.Where(x => !string.IsNullOrWhiteSpace(x.Word)).Select(x => x.Word.Trim().ToLowerInvariant()).Distinct().Count();
            return new InsightSummary
            {
                Total = items.Count,
                UniqueWords = unique,
                Duplicates = Math.Max(0, items.Count - unique),
                HighRisk = items.Count(x => x.RiskLevel == "高" || x.RiskLevel == "致命"),
                MissingAudio = items.Count(x => x.Issues.Contains("缺少音檔") || x.Issues.Contains("音檔不存在")),
                MissingExplain = items.Count(x => x.Issues.Contains("缺少解釋")),
                AverageQuality = items.Count == 0 ? 0 : items.Average(x => x.QualityScore)
            };
        }
    }

    public static class ReportBuilder
    {
        public static string BuildStatisticsReport(List<WordItem> items, string filePath)
        {
            items = items ?? new List<WordItem>();
            var summary = InsightSummary.From(items);
            var sb = new StringBuilder();
            sb.AppendLine("TSV Studio 統計分析報告");
            sb.AppendLine("產生時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine("來源檔案：" + (string.IsNullOrWhiteSpace(filePath) ? "未載入" : filePath));
            sb.AppendLine(new string('=', 80));
            sb.AppendLine("總筆數：" + summary.Total.ToString("N0"));
            sb.AppendLine("唯一單字：" + summary.UniqueWords.ToString("N0"));
            sb.AppendLine("重複資料：" + summary.Duplicates.ToString("N0"));
            sb.AppendLine("高風險：" + summary.HighRisk.ToString("N0"));
            sb.AppendLine("缺音檔：" + summary.MissingAudio.ToString("N0"));
            sb.AppendLine("缺解釋：" + summary.MissingExplain.ToString("N0"));
            sb.AppendLine("平均品質：" + summary.AverageQuality.ToString("N2"));
            sb.AppendLine();

            sb.AppendLine("AI 難度分布");
            foreach (var group in items.GroupBy(x => x.AiLevel).OrderBy(x => x.Key))
            {
                sb.AppendLine(string.Format("- {0}: {1:N0}", group.Key, group.Count()));
            }
            sb.AppendLine();

            sb.AppendLine("風險分布");
            foreach (var group in items.GroupBy(x => x.RiskLevel).OrderByDescending(x => x.Count()))
            {
                sb.AppendLine(string.Format("- {0}: {1:N0}", group.Key, group.Count()));
            }
            sb.AppendLine();

            sb.AppendLine("前 20 大議題");
            foreach (var issue in items.SelectMany(x => x.Issues).GroupBy(x => x).OrderByDescending(x => x.Count()).Take(20))
            {
                sb.AppendLine(string.Format("- {0}: {1:N0}", issue.Key, issue.Count()));
            }
            sb.AppendLine();

            sb.AppendLine("低品質資料 Top 30");
            foreach (var item in items.OrderBy(x => x.QualityScore).ThenByDescending(x => x.RiskScore).Take(30))
            {
                sb.AppendLine(string.Format("[{0}] {1} | 品質 {2:N1} | 風險 {3} | {4}", item.LineNumber, item.Word, item.QualityScore, item.RiskLevel, item.IssuesText));
            }
            return sb.ToString();
        }

        public static string BuildSecurityReport(List<WordItem> items, string filePath, string baseDirectory)
        {
            items = items ?? new List<WordItem>();
            var sb = new StringBuilder();
            sb.AppendLine("TSV Studio 資安掃描報告");
            sb.AppendLine("產生時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine("來源檔案：" + (string.IsNullOrWhiteSpace(filePath) ? "未載入" : filePath));
            sb.AppendLine("基準目錄：" + (string.IsNullOrWhiteSpace(baseDirectory) ? "未設定" : baseDirectory));
            sb.AppendLine(new string('=', 80));
            sb.AppendLine("檢查項目：");
            sb.AppendLine("- 路徑穿越：..、UNC、過長路徑、非法字元");
            sb.AppendLine("- 危險副檔名：exe、bat、cmd、ps1、vbs、js、jar、msi、scr、com、lnk");
            sb.AppendLine("- 內容注入：script、javascript、onerror、onload、iframe、object");
            sb.AppendLine("- 可疑指令：powershell、cmd.exe、wget、curl、certutil");
            sb.AppendLine("- 外部連結：http、https、ftp");
            sb.AppendLine();

            var risky = items.Where(x => x.RiskLevel == "中" || x.RiskLevel == "高" || x.RiskLevel == "致命")
                .OrderByDescending(x => x.RiskScore)
                .ThenBy(x => x.LineNumber)
                .ToList();

            sb.AppendLine("中高風險筆數：" + risky.Count.ToString("N0"));
            sb.AppendLine();
            foreach (var item in risky.Take(200))
            {
                sb.AppendLine(string.Format("列 {0} | {1} | 風險 {2}({3})", item.LineNumber, item.Word, item.RiskLevel, item.RiskScore));
                sb.AppendLine("音檔：" + item.SoundPath);
                sb.AppendLine("議題：" + item.IssuesText);
                sb.AppendLine("建議：" + item.Recommendation.Replace(Environment.NewLine, " "));
                sb.AppendLine(new string('-', 80));
            }
            if (risky.Count > 200) sb.AppendLine("僅顯示前 200 筆；請匯出 JSON 取得完整明細。");
            return sb.ToString();
        }

        public static string BuildHtmlReport(List<WordItem> items, string filePath, string baseDirectory)
        {
            items = items ?? new List<WordItem>();
            InsightSummary summary = InsightSummary.From(items);
            var sb = new StringBuilder();
            sb.AppendLine("<!doctype html>");
            sb.AppendLine("<html lang=\"zh-Hant\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
            sb.AppendLine("<title>TSV Studio Report</title>");
            sb.AppendLine("<style>");
            sb.AppendLine("body{font-family:'Microsoft JhengHei UI','Segoe UI',Arial,sans-serif;background:#0f172a;color:#e5e7eb;margin:0;padding:28px;} .wrap{max-width:1200px;margin:auto;} h1{font-size:32px;margin:0 0 8px;} h2{margin-top:34px;border-left:5px solid #60a5fa;padding-left:12px;} .muted{color:#9ca3af;} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0;} .card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.2);} .value{font-size:28px;font-weight:700;color:#93c5fd;} table{width:100%;border-collapse:collapse;background:#111827;border-radius:14px;overflow:hidden;} th,td{border-bottom:1px solid #334155;padding:10px;text-align:left;vertical-align:top;} th{background:#1f2937;color:#bfdbfe;} tr:hover{background:#1e293b;} .risk-high{color:#fca5a5;font-weight:700;} .risk-mid{color:#fcd34d;font-weight:700;} .badge{display:inline-block;border:1px solid #475569;border-radius:999px;padding:2px 8px;margin:2px;color:#dbeafe;} </style>");
            sb.AppendLine("</head><body><div class=\"wrap\">");
            sb.AppendLine("<h1>TSV Studio Product Edition Report</h1>");
            sb.AppendLine("<div class=\"muted\">產生時間：" + HtmlEncode(DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss")) + "</div>");
            sb.AppendLine("<div class=\"muted\">來源檔案：" + HtmlEncode(string.IsNullOrWhiteSpace(filePath) ? "未載入" : filePath) + "</div>");
            sb.AppendLine("<div class=\"grid\">");
            AppendCard(sb, "總筆數", summary.Total.ToString("N0"));
            AppendCard(sb, "唯一單字", summary.UniqueWords.ToString("N0"));
            AppendCard(sb, "高風險", summary.HighRisk.ToString("N0"));
            AppendCard(sb, "缺音檔", summary.MissingAudio.ToString("N0"));
            AppendCard(sb, "平均品質", summary.AverageQuality.ToString("N1"));
            AppendCard(sb, "重複資料", summary.Duplicates.ToString("N0"));
            sb.AppendLine("</div>");

            sb.AppendLine("<h2>AI 難度分布</h2><div>");
            foreach (var group in items.GroupBy(x => string.IsNullOrWhiteSpace(x.AiLevel) ? "未知" : x.AiLevel).OrderBy(x => x.Key))
            {
                sb.AppendLine("<span class=\"badge\">" + HtmlEncode(group.Key) + "：" + group.Count().ToString("N0") + "</span>");
            }
            sb.AppendLine("</div>");

            sb.AppendLine("<h2>風險分布</h2><div>");
            foreach (var group in items.GroupBy(x => string.IsNullOrWhiteSpace(x.RiskLevel) ? "低" : x.RiskLevel).OrderByDescending(x => x.Count()))
            {
                sb.AppendLine("<span class=\"badge\">" + HtmlEncode(group.Key) + "：" + group.Count().ToString("N0") + "</span>");
            }
            sb.AppendLine("</div>");

            sb.AppendLine("<h2>低品質 / 高風險資料 Top 50</h2>");
            sb.AppendLine("<table><thead><tr><th>#</th><th>單字</th><th>音標</th><th>品質</th><th>風險</th><th>問題</th><th>解釋</th></tr></thead><tbody>");
            foreach (WordItem item in items.OrderBy(x => x.QualityScore).ThenByDescending(x => x.RiskScore).Take(50))
            {
                string riskClass = item.RiskLevel == "高" || item.RiskLevel == "致命" ? "risk-high" : (item.RiskLevel == "中" ? "risk-mid" : "");
                sb.AppendLine("<tr><td>" + item.LineNumber + "</td><td>" + HtmlEncode(item.Word) + "</td><td>" + HtmlEncode(item.Phonogram) + "</td><td>" + item.QualityScore.ToString("N1") + "</td><td class=\"" + riskClass + "\">" + HtmlEncode(item.RiskLevel) + "</td><td>" + HtmlEncode(item.IssuesText) + "</td><td>" + HtmlEncode(Shorten(item.Explain, 160)) + "</td></tr>");
            }
            sb.AppendLine("</tbody></table>");

            sb.AppendLine("<h2>缺音檔清單 Top 50</h2>");
            sb.AppendLine("<table><thead><tr><th>#</th><th>單字</th><th>音檔路徑</th><th>建議</th></tr></thead><tbody>");
            foreach (WordItem item in items.Where(x => string.IsNullOrWhiteSpace(x.SoundPath) || (x.Issues != null && x.Issues.Any(i => i.Contains("缺少音檔")))).Take(50))
            {
                sb.AppendLine("<tr><td>" + item.LineNumber + "</td><td>" + HtmlEncode(item.Word) + "</td><td>" + HtmlEncode(item.SoundPath) + "</td><td>可補音檔或使用 TTS 替代</td></tr>");
            }
            sb.AppendLine("</tbody></table>");
            sb.AppendLine("</div></body></html>");
            return sb.ToString();
        }

        private static void AppendCard(StringBuilder sb, string title, string value)
        {
            sb.AppendLine("<div class=\"card\"><div class=\"muted\">" + HtmlEncode(title) + "</div><div class=\"value\">" + HtmlEncode(value) + "</div></div>");
        }

        private static string HtmlEncode(string value)
        {
            if (value == null) return string.Empty;
            return value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;").Replace("'", "&#39;");
        }

        private static string Shorten(string value, int maxLength)
        {
            value = value ?? string.Empty;
            value = value.Replace("\r", " ").Replace("\n", " ").Trim();
            if (value.Length <= maxLength) return value;
            return value.Substring(0, maxLength) + "...";
        }

        public static string BuildJsonReport(List<WordItem> items, string filePath, string baseDirectory)
        {
            items = items ?? new List<WordItem>();
            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine("  \"generatedAt\": \"" + JsonEscape(DateTime.Now.ToString("o")) + "\",");
            sb.AppendLine("  \"sourceFile\": \"" + JsonEscape(filePath) + "\",");
            sb.AppendLine("  \"baseDirectory\": \"" + JsonEscape(baseDirectory) + "\",");
            sb.AppendLine("  \"items\": [");
            for (int i = 0; i < items.Count; i++)
            {
                var item = items[i];
                sb.AppendLine("    {");
                sb.AppendLine("      \"lineNumber\": " + item.LineNumber + ",");
                sb.AppendLine("      \"word\": \"" + JsonEscape(item.Word) + "\",");
                sb.AppendLine("      \"phonogram\": \"" + JsonEscape(item.Phonogram) + "\",");
                sb.AppendLine("      \"soundPath\": \"" + JsonEscape(item.SoundPath) + "\",");
                sb.AppendLine("      \"explain\": \"" + JsonEscape(item.Explain) + "\",");
                sb.AppendLine("      \"aiLevel\": \"" + JsonEscape(item.AiLevel) + "\",");
                sb.AppendLine("      \"qualityScore\": " + item.QualityScore.ToString("0.##", CultureInfo.InvariantCulture) + ",");
                sb.AppendLine("      \"riskLevel\": \"" + JsonEscape(item.RiskLevel) + "\",");
                sb.AppendLine("      \"riskScore\": " + item.RiskScore + ",");
                sb.AppendLine("      \"issues\": [" + string.Join(", ", item.Issues.Select(x => "\"" + JsonEscape(x) + "\"").ToArray()) + "],");
                sb.AppendLine("      \"recommendation\": \"" + JsonEscape(item.Recommendation) + "\"");
                sb.Append("    }");
                if (i < items.Count - 1) sb.Append(",");
                sb.AppendLine();
            }
            sb.AppendLine("  ]");
            sb.AppendLine("}");
            return sb.ToString();
        }

        private static string JsonEscape(string value)
        {
            if (value == null) return string.Empty;
            var sb = new StringBuilder(value.Length + 16);
            foreach (char c in value)
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (char.IsControl(c)) sb.Append("\\u" + ((int)c).ToString("x4"));
                        else sb.Append(c);
                        break;
                }
            }
            return sb.ToString();
        }
    }

    public sealed class RecentFileStore
    {
        private readonly string _path;

        public RecentFileStore()
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TSVStudioProductEdition");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            _path = Path.Combine(dir, "recent.txt");
        }

        public void Add(string file)
        {
            var files = GetFiles().ToList();
            files.RemoveAll(x => string.Equals(x, file, StringComparison.OrdinalIgnoreCase));
            files.Insert(0, file);
            files = files.Take(12).ToList();
            File.WriteAllLines(_path, files.ToArray(), Encoding.UTF8);
        }

        public IEnumerable<string> GetFiles()
        {
            if (!File.Exists(_path)) return Enumerable.Empty<string>();
            try
            {
                return File.ReadAllLines(_path, Encoding.UTF8).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
            }
            catch
            {
                return Enumerable.Empty<string>();
            }
        }
    }

    public sealed class GradientPanel : Panel
    {
        public GradientPanel()
        {
            DoubleBuffered = true;
            BackColor = Color.Transparent;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = ClientRectangle;
            rect.Width -= 1;
            rect.Height -= 1;
            Color top = Parent != null && Parent.BackColor.GetBrightness() < 0.3f ? Color.FromArgb(42, 57, 95) : Color.FromArgb(255, 255, 255);
            Color bottom = Parent != null && Parent.BackColor.GetBrightness() < 0.3f ? Color.FromArgb(26, 35, 60) : Color.FromArgb(232, 240, 255);
            using (var brush = new LinearGradientBrush(rect, top, bottom, LinearGradientMode.ForwardDiagonal))
            using (var path = RoundedRect(rect, 16))
            {
                e.Graphics.FillPath(brush, path);
                using (var pen = new Pen(Color.FromArgb(70, 255, 255, 255)))
                {
                    e.Graphics.DrawPath(pen, path);
                }
            }
            base.OnPaint(e);
        }

        private static GraphicsPath RoundedRect(Rectangle bounds, int radius)
        {
            int diameter = radius * 2;
            var path = new GraphicsPath();
            path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }


    public sealed class ThemeProfile
    {
        public string Id { get; private set; }
        public string Name { get; private set; }
        public bool IsDark { get; private set; }
        public Color Background { get; private set; }
        public Color Panel { get; private set; }
        public Color PanelAlt { get; private set; }
        public Color Text { get; private set; }
        public Color Muted { get; private set; }
        public Color Line { get; private set; }
        public Color Accent { get; private set; }
        public Color Button { get; private set; }
        public Color Input { get; private set; }

        public ThemeProfile(string id, string name, bool isDark, Color bg, Color panel, Color panelAlt, Color text, Color muted, Color line, Color accent, Color button, Color input)
        {
            Id = id;
            Name = name;
            IsDark = isDark;
            Background = bg;
            Panel = panel;
            PanelAlt = panelAlt;
            Text = text;
            Muted = muted;
            Line = line;
            Accent = accent;
            Button = button;
            Input = input;
        }

        public static ThemeProfile GetDefaultDark()
        {
            return FindById("tech-blue");
        }

        public static ThemeProfile GetDefaultLight()
        {
            return FindById("professional-light");
        }

        public static List<ThemeProfile> GetAll()
        {
            return new List<ThemeProfile>
            {
                new ThemeProfile("tech-blue", "科技藍", true, Color.FromArgb(13,18,32), Color.FromArgb(22,29,48), Color.FromArgb(27,37,60), Color.FromArgb(236,242,255), Color.FromArgb(160,175,205), Color.FromArgb(49,62,92), Color.FromArgb(83,160,255), Color.FromArgb(42,57,95), Color.FromArgb(18,25,42)),
                new ThemeProfile("neon-purple", "紫色霓虹", true, Color.FromArgb(18,12,31), Color.FromArgb(30,20,52), Color.FromArgb(43,26,72), Color.FromArgb(250,240,255), Color.FromArgb(190,160,220), Color.FromArgb(76,52,116), Color.FromArgb(205,97,255), Color.FromArgb(76,42,122), Color.FromArgb(30,18,48)),
                new ThemeProfile("oled-black", "OLED 黑", true, Color.Black, Color.FromArgb(10,10,12), Color.FromArgb(18,18,22), Color.FromArgb(242,242,245), Color.FromArgb(160,160,170), Color.FromArgb(50,50,58), Color.FromArgb(0,220,180), Color.FromArgb(28,28,34), Color.FromArgb(8,8,10)),
                new ThemeProfile("professional-light", "專業白", false, Color.FromArgb(244,247,252), Color.White, Color.FromArgb(250,252,255), Color.FromArgb(28,36,52), Color.FromArgb(92,104,126), Color.FromArgb(218,225,238), Color.FromArgb(40,105,210), Color.FromArgb(236,243,255), Color.White),
                new ThemeProfile("soft-learning", "柔和學習", false, Color.FromArgb(252,248,239), Color.FromArgb(255,253,248), Color.FromArgb(246,239,225), Color.FromArgb(54,48,40), Color.FromArgb(118,102,82), Color.FromArgb(222,210,190), Color.FromArgb(224,135,65), Color.FromArgb(255,242,224), Color.FromArgb(255,253,248)),
                new ThemeProfile("high-contrast", "高對比", true, Color.Black, Color.Black, Color.FromArgb(24,24,24), Color.White, Color.Yellow, Color.White, Color.Yellow, Color.FromArgb(48,48,0), Color.Black)
            };
        }

        public static ThemeProfile FindById(string id)
        {
            foreach (ThemeProfile profile in GetAll())
            {
                if (string.Equals(profile.Id, id, StringComparison.OrdinalIgnoreCase)) return profile;
            }
            return GetAll()[0];
        }

        public static ThemeProfile FindByName(string name)
        {
            foreach (ThemeProfile profile in GetAll())
            {
                if (string.Equals(profile.Name, name, StringComparison.OrdinalIgnoreCase)) return profile;
            }
            return null;
        }
    }

    public sealed class CommandEntry
    {
        public CommandEntry(string name, Action action)
        {
            Name = name;
            Action = action;
        }

        public string Name { get; private set; }
        public Action Action { get; private set; }

        public void Execute()
        {
            if (Action != null) Action();
        }

        public override string ToString()
        {
            return Name;
        }
    }

    public sealed class CommandPaletteDialog : Form
    {
        private readonly List<CommandEntry> _commands;
        private readonly TextBox _search;
        private readonly ListBox _list;
        public CommandEntry SelectedCommand { get; private set; }

        public CommandPaletteDialog(List<CommandEntry> commands, ThemeProfile theme)
        {
            _commands = commands ?? new List<CommandEntry>();
            Text = "Command Palette";
            Width = 620;
            Height = 460;
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            KeyPreview = true;

            Color bg = theme == null ? Color.FromArgb(22, 29, 48) : theme.Panel;
            Color fg = theme == null ? Color.White : theme.Text;
            Color input = theme == null ? Color.FromArgb(18, 25, 42) : theme.Input;
            BackColor = bg;
            ForeColor = fg;

            _search = new TextBox();
            _search.Dock = DockStyle.Top;
            _search.Height = 34;
            _search.Font = new Font("Microsoft JhengHei UI", 12F, FontStyle.Regular);
            _search.BackColor = input;
            _search.ForeColor = fg;

            _list = new ListBox();
            _list.Dock = DockStyle.Fill;
            _list.Font = new Font("Microsoft JhengHei UI", 11F, FontStyle.Regular);
            _list.BackColor = input;
            _list.ForeColor = fg;
            _list.DoubleClick += delegate { AcceptSelection(); };

            Controls.Add(_list);
            Controls.Add(_search);
            _search.TextChanged += delegate { RefreshList(); };
            KeyDown += CommandPaletteDialog_KeyDown;
            RefreshList();
        }

        private void CommandPaletteDialog_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter) { AcceptSelection(); e.Handled = true; }
            else if (e.KeyCode == Keys.Escape) { DialogResult = DialogResult.Cancel; Close(); }
            else if (e.KeyCode == Keys.Down && _list.Items.Count > 0) { _list.Focus(); if (_list.SelectedIndex < 0) _list.SelectedIndex = 0; }
        }

        private void RefreshList()
        {
            string keyword = (_search.Text ?? string.Empty).Trim().ToLowerInvariant();
            _list.Items.Clear();
            foreach (CommandEntry command in _commands)
            {
                if (keyword.Length == 0 || command.Name.ToLowerInvariant().Contains(keyword)) _list.Items.Add(command);
            }
            if (_list.Items.Count > 0) _list.SelectedIndex = 0;
        }

        private void AcceptSelection()
        {
            SelectedCommand = _list.SelectedItem as CommandEntry;
            if (SelectedCommand == null) return;
            DialogResult = DialogResult.OK;
            Close();
        }
    }

    public sealed class VisualDashboardPanel : Panel
    {
        private List<WordItem> _items = new List<WordItem>();
        private ThemeProfile _theme = ThemeProfile.GetDefaultDark();

        public VisualDashboardPanel()
        {
            DoubleBuffered = true;
        }

        public void SetData(IEnumerable<WordItem> items, ThemeProfile theme)
        {
            _items = items == null ? new List<WordItem>() : items.ToList();
            if (theme != null) _theme = theme;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.Clear(_theme.PanelAlt);

            using (var titleBrush = new SolidBrush(_theme.Text))
            using (var mutedBrush = new SolidBrush(_theme.Muted))
            using (var accentBrush = new SolidBrush(_theme.Accent))
            using (var linePen = new Pen(_theme.Line))
            {
                var titleFont = new Font("Microsoft JhengHei UI", 16F, FontStyle.Bold);
                var labelFont = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular);
                e.Graphics.DrawString("視覺化儀表板", titleFont, titleBrush, new PointF(18, 16));
                e.Graphics.DrawString("難度、品質、風險、學習狀態即時統計", labelFont, mutedBrush, new PointF(20, 50));

                int y = 86;
                DrawBarGroup(e.Graphics, "AI 難度分布", _items.GroupBy(x => string.IsNullOrWhiteSpace(x.AiLevel) ? "未知" : x.AiLevel).ToDictionary(x => x.Key, x => x.Count()), 20, y, Width - 40, accentBrush, titleBrush, mutedBrush, linePen);
                y += 135;
                DrawBarGroup(e.Graphics, "風險分布", _items.GroupBy(x => string.IsNullOrWhiteSpace(x.RiskLevel) ? "低" : x.RiskLevel).ToDictionary(x => x.Key, x => x.Count()), 20, y, Width - 40, accentBrush, titleBrush, mutedBrush, linePen);
                y += 135;
                var learning = new Dictionary<string, int>();
                learning["收藏"] = _items.Count(x => x.IsFavorite);
                learning["已學會"] = _items.Count(x => x.IsLearned);
                learning["待複習"] = _items.Count(x => !x.IsLearned);
                DrawBarGroup(e.Graphics, "學習狀態", learning, 20, y, Width - 40, accentBrush, titleBrush, mutedBrush, linePen);
            }
        }

        private void DrawBarGroup(Graphics g, string title, Dictionary<string, int> data, int x, int y, int width, Brush accentBrush, Brush titleBrush, Brush mutedBrush, Pen linePen)
        {
            var titleFont = new Font("Microsoft JhengHei UI", 11F, FontStyle.Bold);
            var labelFont = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular);
            g.DrawString(title, titleFont, titleBrush, x, y);
            y += 28;
            if (data == null || data.Count == 0)
            {
                g.DrawString("尚無資料", labelFont, mutedBrush, x, y);
                return;
            }
            int max = Math.Max(1, data.Values.Max());
            int row = 0;
            foreach (KeyValuePair<string, int> kv in data.OrderByDescending(k => k.Value).Take(8))
            {
                int rowY = y + row * 22;
                int labelWidth = 90;
                int barWidth = Math.Max(4, (width - labelWidth - 80) * kv.Value / max);
                g.DrawString(kv.Key, labelFont, mutedBrush, x, rowY);
                Rectangle bar = new Rectangle(x + labelWidth, rowY + 4, barWidth, 12);
                g.FillRectangle(accentBrush, bar);
                g.DrawRectangle(linePen, x + labelWidth, rowY + 4, Math.Max(1, width - labelWidth - 80), 12);
                g.DrawString(kv.Value.ToString("N0"), labelFont, titleBrush, x + labelWidth + barWidth + 8, rowY);
                row++;
            }
        }
    }

    public sealed class LearningStore
    {
        private readonly Dictionary<string, LearningState> _states = new Dictionary<string, LearningState>(StringComparer.OrdinalIgnoreCase);

        public void Load(string startupPath)
        {
            _states.Clear();
            string path = GetPath(startupPath);
            if (!File.Exists(path)) return;
            foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
            {
                string[] parts = line.Split('\t');
                if (parts.Length == 0 || string.IsNullOrWhiteSpace(parts[0])) continue;
                LearningState state = new LearningState();
                state.Word = parts[0];
                state.IsFavorite = parts.Length > 1 && parts[1] == "1";
                state.IsLearned = parts.Length > 2 && parts[2] == "1";
                int count;
                if (parts.Length > 3 && int.TryParse(parts[3], out count)) state.ReviewCount = count;
                long ticks;
                if (parts.Length > 4 && long.TryParse(parts[4], out ticks) && ticks > 0) state.NextReviewDate = new DateTime(ticks);
                _states[NormalizeKey(state.Word)] = state;
            }
        }

        public void Apply(IEnumerable<WordItem> items)
        {
            if (items == null) return;
            foreach (WordItem item in items)
            {
                if (item == null || string.IsNullOrWhiteSpace(item.Word)) continue;
                LearningState state;
                if (_states.TryGetValue(NormalizeKey(item.Word), out state))
                {
                    item.IsFavorite = state.IsFavorite;
                    item.IsLearned = state.IsLearned;
                    item.ReviewCount = state.ReviewCount;
                    item.NextReviewDate = state.NextReviewDate;
                }
            }
        }

        public void Update(WordItem item)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.Word)) return;
            LearningState state = new LearningState();
            state.Word = item.Word;
            state.IsFavorite = item.IsFavorite;
            state.IsLearned = item.IsLearned;
            state.ReviewCount = item.ReviewCount;
            state.NextReviewDate = item.NextReviewDate;
            _states[NormalizeKey(item.Word)] = state;
        }

        public void Save(string startupPath)
        {
            string path = GetPath(startupPath);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var lines = new List<string>();
            foreach (LearningState state in _states.Values.OrderBy(x => x.Word))
            {
                lines.Add(string.Join("\t", new string[]
                {
                    state.Word ?? string.Empty,
                    state.IsFavorite ? "1" : "0",
                    state.IsLearned ? "1" : "0",
                    state.ReviewCount.ToString(CultureInfo.InvariantCulture),
                    state.NextReviewDate == DateTime.MinValue ? "0" : state.NextReviewDate.Ticks.ToString(CultureInfo.InvariantCulture)
                }));
            }
            File.WriteAllLines(path, lines.ToArray(), Encoding.UTF8);
        }

        private static string NormalizeKey(string word)
        {
            return (word ?? string.Empty).Trim().ToLowerInvariant();
        }

        private static string GetPath(string startupPath)
        {
            string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TSVStudioProductEdition");
            return Path.Combine(root, "learning_state.tsv");
        }
    }

    public sealed class LearningState
    {
        public string Word;
        public bool IsFavorite;
        public bool IsLearned;
        public int ReviewCount;
        public DateTime NextReviewDate;
    }

    public sealed class LocalWordDatabase
    {
        public List<WordItem> Load(string startupPath)
        {
            string path = GetPath(startupPath);
            if (!File.Exists(path)) return new List<WordItem>();
            LoadResult result = new TsvLoader().Load(path, CancellationToken.None, null);
            return result.Items;
        }

        public int MergeAndSave(string startupPath, IEnumerable<WordItem> incoming)
        {
            List<WordItem> all = Load(startupPath);
            var map = new Dictionary<string, WordItem>(StringComparer.OrdinalIgnoreCase);
            foreach (WordItem item in all)
            {
                if (item != null && !string.IsNullOrWhiteSpace(item.Word)) map[item.Word.Trim()] = item;
            }
            foreach (WordItem item in incoming ?? Enumerable.Empty<WordItem>())
            {
                if (item == null || string.IsNullOrWhiteSpace(item.Word)) continue;
                map[item.Word.Trim()] = item;
            }
            List<WordItem> output = map.Values.OrderBy(x => x.Word).ToList();
            string path = GetPath(startupPath);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllLines(path, output.Select(x => x.ToTsvLine()).ToArray(), Encoding.UTF8);
            return output.Count;
        }

        private static string GetPath(string startupPath)
        {
            string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TSVStudioProductEdition");
            return Path.Combine(root, "local_word_database.tsv");
        }
    }

    public sealed class AudioRepairSuggestion
    {
        public WordItem Item;
        public string RecommendedRelativePath;
        public string Reason;
    }

    public sealed class AudioIntegrityReport
    {
        public int Existing;
        public int Missing;
        public int Unsafe;
        public int Empty;
        public int Unused;
        public List<AudioRepairSuggestion> Suggestions = new List<AudioRepairSuggestion>();
        public List<string> UnusedFiles = new List<string>();
        public string SummaryLine
        {
            get { return string.Format("存在 {0:N0}、缺失 {1:N0}、可疑 {2:N0}、空白 {3:N0}、未使用 {4:N0}、可修復 {5:N0}", Existing, Missing, Unsafe, Empty, Unused, Suggestions.Count); }
        }

        public string ToText()
        {
            var sb = new StringBuilder();
            sb.AppendLine("音檔完整性掃描報告");
            sb.AppendLine("產生時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine(new string('=', 70));
            sb.AppendLine(SummaryLine);
            sb.AppendLine();
            sb.AppendLine("可自動修復建議：");
            if (Suggestions.Count == 0) sb.AppendLine("無");
            foreach (AudioRepairSuggestion s in Suggestions.Take(200))
            {
                sb.AppendLine("- " + s.Item.Word + " → " + s.RecommendedRelativePath + "（" + s.Reason + "）");
            }
            sb.AppendLine();
            sb.AppendLine("未被資料表使用的音檔 Top 200：");
            if (UnusedFiles.Count == 0) sb.AppendLine("無");
            foreach (string file in UnusedFiles.Take(200)) sb.AppendLine("- " + file);
            return sb.ToString();
        }
    }

    public static class AudioIntegrityScanner
    {
        public static AudioIntegrityReport Scan(IEnumerable<WordItem> items, string baseDirectory)
        {
            var report = new AudioIntegrityReport();
            List<WordItem> list = items == null ? new List<WordItem>() : items.ToList();
            HashSet<string> used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, string> audioByFileName = BuildAudioFileIndex(baseDirectory);

            foreach (WordItem item in list)
            {
                if (item == null) continue;
                string path = item.ResolveSoundPath(baseDirectory);
                if (string.IsNullOrWhiteSpace(item.SoundPath)) { report.Empty++; AddSuggestion(item, audioByFileName, report, baseDirectory, "資料表沒有音檔路徑"); continue; }
                if (SecurityInspector.HasSuspiciousPath(item.SoundPath)) { report.Unsafe++; continue; }
                if (File.Exists(path)) { report.Existing++; used.Add(Path.GetFullPath(path)); }
                else { report.Missing++; AddSuggestion(item, audioByFileName, report, baseDirectory, "原路徑不存在"); }
            }

            foreach (string fullPath in audioByFileName.Values.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                string normalized = Path.GetFullPath(fullPath);
                if (!used.Contains(normalized)) report.UnusedFiles.Add(MakeRelative(baseDirectory, normalized));
            }
            report.Unused = report.UnusedFiles.Count;
            return report;
        }

        private static void AddSuggestion(WordItem item, Dictionary<string, string> audioByFileName, AudioIntegrityReport report, string baseDirectory, string reason)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.Word)) return;
            string[] candidates = new string[]
            {
                item.Word.Trim() + ".mp3",
                item.Word.Trim() + ".wav",
                item.Word.Trim().ToLowerInvariant() + ".mp3",
                item.Word.Trim().ToLowerInvariant() + ".wav"
            };
            foreach (string candidate in candidates)
            {
                string full;
                if (audioByFileName.TryGetValue(candidate, out full))
                {
                    report.Suggestions.Add(new AudioRepairSuggestion { Item = item, RecommendedRelativePath = MakeRelative(baseDirectory, full), Reason = reason });
                    return;
                }
            }
        }

        private static Dictionary<string, string> BuildAudioFileIndex(string baseDirectory)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(baseDirectory) || !Directory.Exists(baseDirectory)) return map;
            string[] extensions = new string[] { "*.mp3", "*.wav", "*.m4a", "*.aac", "*.wma", "*.flac" };
            foreach (string pattern in extensions)
            {
                string[] files;
                try { files = Directory.GetFiles(baseDirectory, pattern, SearchOption.AllDirectories); }
                catch { files = new string[0]; }
                foreach (string file in files)
                {
                    string name = Path.GetFileName(file);
                    if (!map.ContainsKey(name)) map[name] = file;
                }
            }
            return map;
        }

        private static string MakeRelative(string baseDirectory, string fullPath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(baseDirectory)) return fullPath;
                Uri baseUri = new Uri(AppendSlash(Path.GetFullPath(baseDirectory)));
                Uri fileUri = new Uri(Path.GetFullPath(fullPath));
                return Uri.UnescapeDataString(baseUri.MakeRelativeUri(fileUri).ToString()).Replace('/', Path.DirectorySeparatorChar);
            }
            catch
            {
                return fullPath;
            }
        }

        private static string AppendSlash(string path)
        {
            if (path.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal)) return path;
            return path + Path.DirectorySeparatorChar;
        }
    }


    public static class OptionalAssemblyLoader
    {
        public static bool IsAvailable(string assemblySimpleName)
        {
            return TryLoad(assemblySimpleName) != null;
        }

        public static Type TryGetType(string assemblySimpleName, string fullTypeName)
        {
            Assembly assembly = TryLoad(assemblySimpleName);
            if (assembly == null) return null;
            return assembly.GetType(fullTypeName, false);
        }

        public static Assembly TryLoad(string assemblySimpleName)
        {
            try
            {
                foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
                {
                    if (string.Equals(assembly.GetName().Name, assemblySimpleName, StringComparison.OrdinalIgnoreCase))
                    {
                        return assembly;
                    }
                }

                string dll = Path.Combine(Application.StartupPath, assemblySimpleName + ".dll");
                if (File.Exists(dll))
                {
                    return Assembly.LoadFrom(dll);
                }

                return Assembly.Load(assemblySimpleName);
            }
            catch
            {
                return null;
            }
        }
    }

    public sealed class OptionalNuGetFeature
    {
        public OptionalNuGetFeature(string packageId, string assemblyName, string featureName, string description, string installHint)
        {
            PackageId = packageId;
            AssemblyName = assemblyName;
            FeatureName = featureName;
            Description = description;
            InstallHint = installHint;
        }

        public string PackageId { get; private set; }
        public string AssemblyName { get; private set; }
        public string FeatureName { get; private set; }
        public string Description { get; private set; }
        public string InstallHint { get; private set; }

        public bool IsAvailable
        {
            get { return OptionalAssemblyLoader.IsAvailable(AssemblyName); }
        }
    }

    public static class OptionalNuGetFeatureCatalog
    {
        public static List<OptionalNuGetFeature> GetAll()
        {
            return new List<OptionalNuGetFeature>
            {
                new OptionalNuGetFeature("Newtonsoft.Json", "Newtonsoft.Json", "進階 JSON 報表", "更完整的 JSON 序列化、縮排、自訂欄位輸出與特殊字元處理。", "Install-Package Newtonsoft.Json"),
                new OptionalNuGetFeature("Microsoft.Data.Sqlite", "Microsoft.Data.Sqlite", "SQLite 大型字庫引擎", "把本機學習資料庫升級為 SQLite 索引，適合十萬到百萬級單字資料。", "Install-Package Microsoft.Data.Sqlite"),
                new OptionalNuGetFeature("Dapper", "Dapper", "高速資料查詢層", "搭配 SQLite 建立輕量 ORM，讓查詢、匯入、複習紀錄更乾淨。", "Install-Package Dapper"),
                new OptionalNuGetFeature("ClosedXML", "ClosedXML", "Excel 匯出 Pro", "輸出漂亮的 .xlsx 報表，包含樣式、欄寬、凍結窗格與統計表。", "Install-Package ClosedXML"),
                new OptionalNuGetFeature("ExcelDataReader", "ExcelDataReader", "Excel 匯入 Pro", "更完整支援 .xls / .xlsx、多工作表與混合欄位型態。", "Install-Package ExcelDataReader"),
                new OptionalNuGetFeature("NAudio", "NAudio", "音訊播放器 Pro", "更精準的 MP3 進度、音量、播放長度、波形與音檔格式支援。", "Install-Package NAudio"),
                new OptionalNuGetFeature("Microsoft.ML.OnnxRuntime", "Microsoft.ML.OnnxRuntime", "ONNX 深度學習推論", "可接真正的本機 AI 模型做難度分類、語意分類或品質評分。", "Install-Package Microsoft.ML.OnnxRuntime"),
                new OptionalNuGetFeature("FuzzySharp", "FuzzySharp", "模糊搜尋與相似字配對", "用於拼字相似度、音檔自動配對、重複資料合併建議。", "Install-Package FuzzySharp"),
                new OptionalNuGetFeature("LiveCharts.WinForms", "LiveCharts.WinForms", "互動式圖表", "把目前手繪儀表板升級成可互動長條圖、圓餅圖與趨勢圖。", "Install-Package LiveCharts.WinForms")
            };
        }

        public static string BuildStatusText(string startupPath, int currentWordCount)
        {
            var sb = new StringBuilder();
            sb.AppendLine("擴充中心 / Optional Extension Center");
            sb.AppendLine(new string('=', 72));
            sb.AppendLine("核心功能完全不依賴 NuGet；環境未安裝可選套件時仍可正常使用：開檔、內建字庫、頁內播放、TTS、測驗、AI 規則分析、資安掃描、匯出基本報告。");
            sb.AppendLine();
            sb.AppendLine("目前資料量：" + currentWordCount.ToString("N0") + " 筆");
            sb.AppendLine("偵測位置：" + startupPath);
            sb.AppendLine();
            sb.AppendLine("可選擴充狀態：");
            sb.AppendLine();

            foreach (OptionalNuGetFeature feature in GetAll())
            {
                sb.AppendLine((feature.IsAvailable ? "[已啟用] " : "[未安裝] ") + feature.FeatureName);
                sb.AppendLine("  Package： " + feature.PackageId);
                sb.AppendLine("  用途： " + feature.Description);
                sb.AppendLine("  Visual Studio 套件管理器主控台： " + feature.InstallHint);
                sb.AppendLine();
            }

            sb.AppendLine("部署與展示流程：");
            sb.AppendLine("1. 先確認核心功能可在無可選套件環境下完整執行。");
            sb.AppendLine("2. 再開啟本頁查看可選進階能力與目前啟用狀態。");
            sb.AppendLine("3. 若需要啟用進階功能時，可安裝指定套件後重新建置，或把對應 DLL 放到 exe 同層。");
            sb.AppendLine();
            sb.AppendLine("安全設計：");
            sb.AppendLine("- 程式不直接引用可選套件命名空間，避免執行環境未安裝可選套件就編譯失敗。");
            sb.AppendLine("- 以反射偵測 DLL，缺少時只顯示安裝說明，不中斷主功能。");
            return sb.ToString();
        }

        public static string BuildInstallGuide(string startupPath)
        {
            var sb = new StringBuilder();
            sb.AppendLine("TSV Studio Optional Extension 安裝指南");
            sb.AppendLine("產生時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine();
            sb.AppendLine("核心功能不需要安裝以下套件。這些套件只用於進階展示。");
            sb.AppendLine();
            sb.AppendLine("Visual Studio 安裝方式：");
            sb.AppendLine("1. 在 Visual Studio 開啟本 WinForms 專案。");
            sb.AppendLine("2. 點選：工具 > NuGet 套件管理員 > 套件管理器主控台。");
            sb.AppendLine("3. 確認「預設專案」選到目前專案。");
            sb.AppendLine("4. 在 Visual Studio 下方的「套件管理器主控台」輸入以下指令。");
            sb.AppendLine();
            sb.AppendLine("注意：以下指令不是給一般 Windows PowerShell 使用。");
            sb.AppendLine();
            foreach (OptionalNuGetFeature feature in GetAll())
            {
                sb.AppendLine(feature.InstallHint);
            }
            sb.AppendLine();
            sb.AppendLine("推薦安裝順序：");
            sb.AppendLine("1. Newtonsoft.Json：進階 JSON 報表");
            sb.AppendLine("2. NAudio：音訊播放器 Pro");
            sb.AppendLine("3. ClosedXML：Excel 匯出 Pro");
            sb.AppendLine("4. Microsoft.Data.Sqlite + Dapper：大型本機字庫");
            sb.AppendLine("5. Microsoft.ML.OnnxRuntime：本機 AI 推論");
            sb.AppendLine();
            sb.AppendLine("若不想使用 NuGet，也可以把對應 DLL 複製到 exe 同層：");
            sb.AppendLine(startupPath);
            return sb.ToString();
        }

        public static string BuildRoadmapText()
        {
            var sb = new StringBuilder();
            sb.AppendLine("產品級功能藍圖");
            sb.AppendLine();
            sb.AppendLine("已完成：");
            sb.AppendLine("- TSV / TXT / CSV / Excel 讀取");
            sb.AppendLine("- 內建字庫與本機學習資料庫");
            sb.AppendLine("- 頁面內播放器、TTS、測驗、音檔治理");
            sb.AppendLine("- Command Palette、多主題、視覺化儀表板");
            sb.AppendLine("- Optional Extension Center，缺套件不影響核心功能");
            sb.AppendLine();
            sb.AppendLine("下一階段可加：");
            sb.AppendLine("1. SQLite 百萬級字庫索引與快速全文搜尋。");
            sb.AppendLine("2. NAudio 波形播放器、逐字音標播放、A-B loop。");
            sb.AppendLine("3. ClosedXML 精美 Excel 報表與班級成績統計。");
            sb.AppendLine("4. ONNX 模型自動分類 CEFR A1-C2、詞性、主題領域。");
            sb.AppendLine("5. 語意搜尋：輸入「法律相關」自動找 court / judge / evidence。");
            sb.AppendLine("6. Anki 匯出、錯題本、每日複習推播。");
            sb.AppendLine("7. 雲端同步、版本差異、多人審核流程。");
            return sb.ToString();
        }
    }

    public static class StudyPlanBuilder
    {
        public static string Build(IEnumerable<WordItem> source, string sourceName)
        {
            var items = source == null ? new List<WordItem>() : source.ToList();
            var sb = new StringBuilder();
            sb.AppendLine("個人化學習計畫");
            sb.AppendLine(new string('=', 72));
            sb.AppendLine("資料來源：" + (string.IsNullOrWhiteSpace(sourceName) ? "尚未載入" : sourceName));
            sb.AppendLine("產生時間：" + DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"));
            sb.AppendLine();

            if (items.Count == 0)
            {
                sb.AppendLine("尚未載入資料。建議先載入內建英文字庫或自己的 TSV / Excel。");
                return sb.ToString();
            }

            int total = items.Count;
            int learned = items.Count(x => x.IsLearned);
            int favorite = items.Count(x => x.IsFavorite);
            int missingAudio = items.Count(x => string.IsNullOrWhiteSpace(x.SoundPath) || (x.Issues != null && x.Issues.Any(i => i.Contains("缺少音檔"))));
            int highRisk = items.Count(x => x.RiskLevel == "高" || x.RiskLevel == "致命");
            int weak = items.Count(x => x.QualityScore < 70);
            int review = total - learned;

            sb.AppendLine("目前狀態");
            sb.AppendLine("- 總單字：" + total.ToString("N0"));
            sb.AppendLine("- 已學會：" + learned.ToString("N0"));
            sb.AppendLine("- 待複習：" + review.ToString("N0"));
            sb.AppendLine("- 收藏 / 困難字：" + favorite.ToString("N0"));
            sb.AppendLine("- 缺音檔或需 TTS：" + missingAudio.ToString("N0"));
            sb.AppendLine("- 高風險資料：" + highRisk.ToString("N0"));
            sb.AppendLine("- 品質低於 70：" + weak.ToString("N0"));
            sb.AppendLine();

            int dailyNew = total < 500 ? 20 : total < 3000 ? 35 : 50;
            int dailyReview = Math.Max(20, Math.Min(120, review / 7));
            int days = Math.Max(1, (int)Math.Ceiling(total / (double)dailyNew));

            sb.AppendLine("建議每日節奏");
            sb.AppendLine("- 新單字：" + dailyNew + " 個 / 天");
            sb.AppendLine("- 複習：" + dailyReview + " 個 / 天");
            sb.AppendLine("- 聽音測驗：10 分鐘");
            sb.AppendLine("- 拼字測驗：10 分鐘");
            sb.AppendLine("- 預估完成第一輪：" + days + " 天");
            sb.AppendLine();

            sb.AppendLine("七日流程");
            sb.AppendLine("Day 1：載入字庫，先跑 AI 分析與音檔治理，處理缺音檔。");
            sb.AppendLine("Day 2：只學 A1 / A2 或品質高的單字，建立信心。");
            sb.AppendLine("Day 3：開始聽音選字，錯題自動收藏。");
            sb.AppendLine("Day 4：練習收藏字與低品質字，補解釋與例句。");
            sb.AppendLine("Day 5：進行中文選英文測驗，檢查主動回想能力。");
            sb.AppendLine("Day 6：回頭清理重複資料與可疑路徑。");
            sb.AppendLine("Day 7：匯出報告，觀察正確率與待複習數量。");
            sb.AppendLine();

            sb.AppendLine("今日優先清單");
            foreach (WordItem item in items.Where(x => !x.IsLearned).OrderByDescending(x => x.IsFavorite).ThenBy(x => x.QualityScore).Take(20))
            {
                sb.AppendLine("- " + item.Word + "  " + item.Phonogram + "  [" + item.AiLevel + "]  " + Trim(item.Explain, 60));
            }

            return sb.ToString();
        }

        private static string Trim(string value, int max)
        {
            value = value ?? string.Empty;
            value = value.Replace("\r", " ").Replace("\n", " ").Trim();
            if (value.Length <= max) return value;
            return value.Substring(0, max) + "...";
        }
    }

    public sealed class DataImportPreview
    {
        public DataImportPreview(List<string[]> rows, string sourceType, string delimiterName)
        {
            Rows = rows ?? new List<string[]>();
            SourceType = sourceType ?? string.Empty;
            DelimiterName = delimiterName ?? string.Empty;
        }

        public List<string[]> Rows { get; private set; }
        public string SourceType { get; private set; }
        public string DelimiterName { get; private set; }

        public int ColumnCount
        {
            get { return Rows.Count == 0 ? 4 : Math.Max(4, Rows.Max(x => x == null ? 0 : x.Length)); }
        }
    }

    public sealed class DataImportMapping
    {
        public string FilePath { get; set; }
        public int WordColumn { get; set; }
        public int PhonogramColumn { get; set; }
        public int SoundColumn { get; set; }
        public int ExplainStartColumn { get; set; }
        public bool SkipFirstRow { get; set; }
    }

    public static class DataImportWizardReader
    {
        public static DataImportPreview ReadPreview(string path, int maxRows)
        {
            List<string[]> rows = ReadRowsInternal(path, CancellationToken.None, Math.Max(1, maxRows));
            string ext = Path.GetExtension(path ?? string.Empty).ToLowerInvariant();
            string sourceType = ext == ".xlsx" ? "XLSX" : (ext == ".xls" ? "XLS" : "Delimited Text");
            string delimiterName = "自動偵測";
            if (ext != ".xlsx" && ext != ".xls")
            {
                List<string> lines = File.ReadLines(path, EncodingDetector.Detect(path)).Take(40).ToList();
                delimiterName = DelimiterDetector.GetName(DelimiterDetector.Detect(lines));
            }
            return new DataImportPreview(rows, sourceType, delimiterName);
        }

        public static List<string[]> ReadAllRows(string path, CancellationToken token)
        {
            return ReadRowsInternal(path, token, 0);
        }

        private static List<string[]> ReadRowsInternal(string path, CancellationToken token, int maxRows)
        {
            string ext = Path.GetExtension(path ?? string.Empty).ToLowerInvariant();
            if (ext == ".xlsx" || (string.IsNullOrWhiteSpace(ext) && SimpleXlsxReader.IsLikelyXlsx(path)))
            {
                List<string[]> rows = SimpleXlsxReader.ReadFirstWorksheet(path, token, null);
                return maxRows > 0 ? rows.Take(maxRows).ToList() : rows;
            }

            if (ext == ".xls")
            {
                LoadResult loaded = new TsvLoader().Load(path, token, null);
                List<string[]> rows = loaded.Items.Select(x => new string[] { x.Word, x.Phonogram, x.SoundPath, x.Explain }).ToList();
                return maxRows > 0 ? rows.Take(maxRows).ToList() : rows;
            }

            Encoding encoding = EncodingDetector.Detect(path);
            List<string> sample = File.ReadLines(path, encoding).Take(80).ToList();
            char delimiter = DelimiterDetector.Detect(sample);
            var result = new List<string[]>();
            using (var reader = new StreamReader(path, encoding, true))
            {
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    token.ThrowIfCancellationRequested();
                    result.Add(DelimitedLineParser.Parse(line, delimiter).ToArray());
                    if (maxRows > 0 && result.Count >= maxRows) break;
                }
            }
            return result;
        }

        public static List<WordItem> MapRows(List<string[]> rows, DataImportMapping mapping)
        {
            var items = new List<WordItem>();
            if (rows == null || mapping == null) return items;
            int lineNumber = 0;
            foreach (string[] row in rows)
            {
                lineNumber++;
                if (mapping.SkipFirstRow && lineNumber == 1) continue;
                WordItem item = new WordItem();
                item.LineNumber = items.Count + 1;
                item.Word = Get(row, mapping.WordColumn);
                item.Phonogram = Get(row, mapping.PhonogramColumn);
                item.SoundPath = Get(row, mapping.SoundColumn);
                if (mapping.ExplainStartColumn >= 0 && row != null && mapping.ExplainStartColumn < row.Length)
                {
                    item.Explain = string.Join(Environment.NewLine, row.Skip(mapping.ExplainStartColumn).Select(TextCleaner.CleanCell).Where(x => !string.IsNullOrWhiteSpace(x)).ToArray());
                }
                else
                {
                    item.Explain = string.Empty;
                }
                item.RawLine = row == null ? string.Empty : string.Join("\t", row);
                if (!string.IsNullOrWhiteSpace(item.Word) || !string.IsNullOrWhiteSpace(item.Explain)) items.Add(item);
            }
            return items;
        }

        private static string Get(string[] row, int index)
        {
            if (row == null || index < 0 || index >= row.Length) return string.Empty;
            return TextCleaner.CleanCell(row[index]);
        }
    }

    public sealed class DataImportWizardDialog : Form
    {
        private readonly string _filePath;
        private readonly DataImportPreview _preview;
        private readonly ComboBox _wordCombo = new ComboBox();
        private readonly ComboBox _phonogramCombo = new ComboBox();
        private readonly ComboBox _soundCombo = new ComboBox();
        private readonly ComboBox _explainCombo = new ComboBox();
        private readonly CheckBox _skipHeader = new CheckBox();

        public DataImportWizardDialog(string filePath, DataImportPreview preview)
        {
            _filePath = filePath;
            _preview = preview ?? new DataImportPreview(new List<string[]>(), string.Empty, string.Empty);
            Text = "資料匯入精靈";
            StartPosition = FormStartPosition.CenterParent;
            Size = new Size(980, 660);
            MinimumSize = new Size(820, 560);
            Font = new Font("Microsoft JhengHei UI", 9F);

            var root = new TableLayoutPanel();
            root.Dock = DockStyle.Fill;
            root.RowCount = 4;
            root.ColumnCount = 1;
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 122));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
            Controls.Add(root);

            var header = new Label();
            header.Dock = DockStyle.Fill;
            header.TextAlign = ContentAlignment.MiddleLeft;
            header.Padding = new Padding(14, 0, 14, 0);
            header.Font = new Font(Font.FontFamily, 11F, FontStyle.Bold);
            header.Text = "來源：" + Path.GetFileName(filePath) + Environment.NewLine + "格式：" + _preview.SourceType + " / " + _preview.DelimiterName + "，預覽 " + _preview.Rows.Count.ToString("N0") + " 列";
            root.Controls.Add(header, 0, 0);

            var grid = new DataGridView();
            grid.Dock = DockStyle.Fill;
            grid.ReadOnly = true;
            grid.AllowUserToAddRows = false;
            grid.AllowUserToDeleteRows = false;
            grid.RowHeadersWidth = 55;
            grid.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.DisplayedCells;
            grid.BackgroundColor = Color.White;
            int columns = _preview.ColumnCount;
            for (int c = 0; c < columns; c++) grid.Columns.Add("C" + (c + 1), "第 " + (c + 1) + " 欄");
            foreach (string[] row in _preview.Rows)
            {
                object[] values = new object[columns];
                for (int c = 0; c < columns; c++) values[c] = row != null && c < row.Length ? row[c] : string.Empty;
                grid.Rows.Add(values);
            }
            root.Controls.Add(grid, 0, 1);

            var mappingPanel = new TableLayoutPanel();
            mappingPanel.Dock = DockStyle.Fill;
            mappingPanel.Padding = new Padding(14, 8, 14, 8);
            mappingPanel.ColumnCount = 4;
            mappingPanel.RowCount = 3;
            mappingPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
            mappingPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
            mappingPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
            mappingPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
            mappingPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
            mappingPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 38));
            mappingPanel.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.Controls.Add(mappingPanel, 0, 2);

            AddMappingControl(mappingPanel, "單字欄位", _wordCombo, 0, Math.Min(0, columns - 1));
            AddMappingControl(mappingPanel, "音標欄位", _phonogramCombo, 1, Math.Min(1, columns - 1));
            AddMappingControl(mappingPanel, "音檔欄位", _soundCombo, 2, Math.Min(2, columns - 1));
            AddMappingControl(mappingPanel, "解釋起始欄", _explainCombo, 3, Math.Min(3, columns - 1));

            _skipHeader.Text = "第一列為標題列，不匯入";
            _skipHeader.Dock = DockStyle.Fill;
            mappingPanel.SetColumnSpan(_skipHeader, 4);
            mappingPanel.Controls.Add(_skipHeader, 0, 2);

            var buttons = new FlowLayoutPanel();
            buttons.Dock = DockStyle.Fill;
            buttons.FlowDirection = FlowDirection.RightToLeft;
            buttons.Padding = new Padding(8);
            root.Controls.Add(buttons, 0, 3);

            var ok = new Button();
            ok.Text = "確認匯入";
            ok.Width = 120;
            ok.Height = 32;
            ok.DialogResult = DialogResult.OK;
            buttons.Controls.Add(ok);

            var cancel = new Button();
            cancel.Text = "取消";
            cancel.Width = 90;
            cancel.Height = 32;
            cancel.DialogResult = DialogResult.Cancel;
            buttons.Controls.Add(cancel);

            AcceptButton = ok;
            CancelButton = cancel;
        }

        public DataImportMapping Mapping
        {
            get
            {
                return new DataImportMapping
                {
                    FilePath = _filePath,
                    WordColumn = GetSelectedColumn(_wordCombo),
                    PhonogramColumn = GetSelectedColumn(_phonogramCombo),
                    SoundColumn = GetSelectedColumn(_soundCombo),
                    ExplainStartColumn = GetSelectedColumn(_explainCombo),
                    SkipFirstRow = _skipHeader.Checked
                };
            }
        }

        private void AddMappingControl(TableLayoutPanel panel, string title, ComboBox combo, int column, int defaultColumn)
        {
            var label = new Label();
            label.Text = title;
            label.Dock = DockStyle.Fill;
            label.TextAlign = ContentAlignment.MiddleLeft;
            panel.Controls.Add(label, column, 0);

            combo.Dock = DockStyle.Fill;
            combo.DropDownStyle = ComboBoxStyle.DropDownList;
            combo.Items.Add("不使用");
            for (int i = 0; i < _preview.ColumnCount; i++) combo.Items.Add("第 " + (i + 1) + " 欄");
            combo.SelectedIndex = defaultColumn >= 0 ? defaultColumn + 1 : 0;
            panel.Controls.Add(combo, column, 1);
        }

        private int GetSelectedColumn(ComboBox combo)
        {
            if (combo == null || combo.SelectedIndex <= 0) return -1;
            return combo.SelectedIndex - 1;
        }
    }

    public static class AnkiExportBuilder
    {
        public static string Build(IEnumerable<WordItem> items, string baseDirectory)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Word\tPhonogram\tExplain\tAudio\tTags");
            foreach (WordItem item in items ?? Enumerable.Empty<WordItem>())
            {
                string audio = BuildAudioTag(item, baseDirectory);
                string tags = BuildTags(item);
                sb.AppendLine(string.Join("\t", new string[]
                {
                    Clean(item.Word),
                    Clean(item.Phonogram),
                    Clean(item.Explain),
                    Clean(audio),
                    Clean(tags)
                }));
            }
            return sb.ToString();
        }

        private static string BuildAudioTag(WordItem item, string baseDirectory)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.SoundPath)) return string.Empty;
            string path = item.ResolveSoundPath(baseDirectory);
            if (!File.Exists(path)) return string.Empty;
            return "[sound:" + Path.GetFileName(path) + "]";
        }

        private static string BuildTags(WordItem item)
        {
            if (item == null) return string.Empty;
            var tags = new List<string>();
            if (!string.IsNullOrWhiteSpace(item.AiLevel)) tags.Add("Level_" + NormalizeTag(item.AiLevel));
            if (!string.IsNullOrWhiteSpace(item.RiskLevel)) tags.Add("Risk_" + NormalizeTag(item.RiskLevel));
            if (item.IsFavorite) tags.Add("Favorite");
            if (item.IsLearned) tags.Add("Learned");
            return string.Join(" ", tags.ToArray());
        }

        private static string NormalizeTag(string value)
        {
            if (value == null) return string.Empty;
            var sb = new StringBuilder();
            foreach (char ch in value)
            {
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
                else if (ch == '_' || ch == '-') sb.Append(ch);
            }
            return sb.Length == 0 ? "Unknown" : sb.ToString();
        }

        private static string Clean(string value)
        {
            value = value ?? string.Empty;
            return value.Replace("\t", " ").Replace("\r", " ").Replace("\n", " ").Trim();
        }
    }

    public sealed class LearningHistoryEntry
    {
        public DateTime Date { get; set; }
        public int LearnedCount { get; set; }
        public int QuizTotal { get; set; }
        public int QuizCorrect { get; set; }

        public double Accuracy
        {
            get { return QuizTotal == 0 ? 0 : QuizCorrect * 100.0 / QuizTotal; }
        }
    }

    public sealed class LearningHistoryStore
    {
        private readonly Dictionary<string, LearningHistoryEntry> _entries = new Dictionary<string, LearningHistoryEntry>(StringComparer.OrdinalIgnoreCase);

        public void Load(string startupPath)
        {
            _entries.Clear();
            string path = GetPath(startupPath);
            if (!File.Exists(path)) return;
            foreach (string line in File.ReadAllLines(path, Encoding.UTF8))
            {
                string[] parts = line.Split('\t');
                if (parts.Length < 4) continue;
                DateTime date;
                if (!DateTime.TryParse(parts[0], out date)) continue;
                LearningHistoryEntry entry = new LearningHistoryEntry();
                entry.Date = date.Date;
                int learned, total, correct;
                if (int.TryParse(parts[1], out learned)) entry.LearnedCount = learned;
                if (int.TryParse(parts[2], out total)) entry.QuizTotal = total;
                if (int.TryParse(parts[3], out correct)) entry.QuizCorrect = correct;
                _entries[Key(entry.Date)] = entry;
            }
        }

        public void Save(string startupPath)
        {
            string path = GetPath(startupPath);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            List<string> lines = _entries.Values.OrderBy(x => x.Date).Select(x => string.Join("\t", new string[]
            {
                x.Date.ToString("yyyy-MM-dd"),
                x.LearnedCount.ToString(CultureInfo.InvariantCulture),
                x.QuizTotal.ToString(CultureInfo.InvariantCulture),
                x.QuizCorrect.ToString(CultureInfo.InvariantCulture)
            })).ToList();
            File.WriteAllLines(path, lines, Encoding.UTF8);
        }

        public void RecordQuiz(bool correct)
        {
            LearningHistoryEntry entry = GetToday();
            entry.QuizTotal++;
            if (correct) entry.QuizCorrect++;
        }

        public void RecordLearned(int count)
        {
            if (count <= 0) return;
            LearningHistoryEntry entry = GetToday();
            entry.LearnedCount += count;
        }

        public List<LearningHistoryEntry> GetEntries()
        {
            return _entries.Values.OrderBy(x => x.Date).ToList();
        }

        public string BuildTodaySummary()
        {
            LearningHistoryEntry today = GetToday();
            return string.Format("今日已學會 {0:N0} 個，測驗 {1:N0} 題，答對 {2:N0} 題，正確率 {3:N1}%", today.LearnedCount, today.QuizTotal, today.QuizCorrect, today.Accuracy);
        }

        public string BuildReport()
        {
            var sb = new StringBuilder();
            sb.AppendLine("學習歷程報告");
            sb.AppendLine(new string('=', 72));
            List<LearningHistoryEntry> entries = GetEntries();
            if (entries.Count == 0)
            {
                sb.AppendLine("尚無學習歷程。完成測驗或標記已學會後會自動累積。 ");
                return sb.ToString();
            }

            sb.AppendLine("累積已學會：" + entries.Sum(x => x.LearnedCount).ToString("N0"));
            sb.AppendLine("累積測驗題數：" + entries.Sum(x => x.QuizTotal).ToString("N0"));
            sb.AppendLine("累積答對題數：" + entries.Sum(x => x.QuizCorrect).ToString("N0"));
            int total = entries.Sum(x => x.QuizTotal);
            int correct = entries.Sum(x => x.QuizCorrect);
            sb.AppendLine("整體正確率：" + (total == 0 ? 0 : correct * 100.0 / total).ToString("N1") + "%");
            sb.AppendLine();
            sb.AppendLine("最近 14 日");
            foreach (LearningHistoryEntry e in entries.OrderByDescending(x => x.Date).Take(14).OrderBy(x => x.Date))
            {
                sb.AppendLine(string.Format("{0:yyyy/MM/dd}  已學會 {1,3}  測驗 {2,3}  答對 {3,3}  正確率 {4,5:N1}%", e.Date, e.LearnedCount, e.QuizTotal, e.QuizCorrect, e.Accuracy));
            }
            return sb.ToString();
        }

        private LearningHistoryEntry GetToday()
        {
            DateTime today = DateTime.Today;
            string key = Key(today);
            LearningHistoryEntry entry;
            if (!_entries.TryGetValue(key, out entry))
            {
                entry = new LearningHistoryEntry { Date = today };
                _entries[key] = entry;
            }
            return entry;
        }

        private static string Key(DateTime date)
        {
            return date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        private static string GetPath(string startupPath)
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TSVStudioProductEdition");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            return Path.Combine(dir, "LearningHistory.tsv");
        }
    }

    public sealed class LearningHistoryPanel : Panel
    {
        private List<LearningHistoryEntry> _items = new List<LearningHistoryEntry>();
        private ThemeProfile _theme = ThemeProfile.GetDefaultDark();

        public LearningHistoryPanel()
        {
            DoubleBuffered = true;
        }

        public void SetData(IEnumerable<LearningHistoryEntry> items, ThemeProfile theme)
        {
            _items = items == null ? new List<LearningHistoryEntry>() : items.OrderBy(x => x.Date).ToList();
            if (theme != null) _theme = theme;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.Clear(_theme.PanelAlt);
            using (Brush text = new SolidBrush(_theme.Text))
            using (Brush muted = new SolidBrush(_theme.Muted))
            using (Brush accent = new SolidBrush(_theme.Accent))
            using (Pen line = new Pen(_theme.Line))
            {
                Font titleFont = new Font("Microsoft JhengHei UI", 16F, FontStyle.Bold);
                Font labelFont = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular);
                e.Graphics.DrawString("學習歷程圖表", titleFont, text, 18, 16);
                e.Graphics.DrawString("已學會數、測驗題數與正確率趨勢", labelFont, muted, 20, 50);

                List<LearningHistoryEntry> recent = _items.OrderByDescending(x => x.Date).Take(14).OrderBy(x => x.Date).ToList();
                if (recent.Count == 0)
                {
                    e.Graphics.DrawString("尚無學習歷程。完成測驗或標記已學會後會出現在這裡。", labelFont, muted, 20, 96);
                    return;
                }

                DrawBars(e.Graphics, "每日已學會", recent, x => x.LearnedCount, 20, 90, Width - 40, 100, accent, text, muted, line);
                DrawBars(e.Graphics, "每日測驗題數", recent, x => x.QuizTotal, 20, 220, Width - 40, 100, accent, text, muted, line);
                DrawAccuracy(e.Graphics, recent, 20, 350, Width - 40, 100, text, muted, line);
            }
        }

        private void DrawBars(Graphics g, string title, List<LearningHistoryEntry> data, Func<LearningHistoryEntry, int> selector, int x, int y, int width, int height, Brush accent, Brush text, Brush muted, Pen line)
        {
            Font titleFont = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            Font labelFont = new Font("Microsoft JhengHei UI", 8F, FontStyle.Regular);
            g.DrawString(title, titleFont, text, x, y);
            y += 24;
            g.DrawRectangle(line, x, y, width, height);
            int max = Math.Max(1, data.Max(selector));
            int gap = 6;
            int barWidth = Math.Max(8, (width - gap * (data.Count + 1)) / data.Count);
            for (int i = 0; i < data.Count; i++)
            {
                int value = selector(data[i]);
                int barHeight = (int)Math.Round(value * (height - 24) / (double)max);
                int bx = x + gap + i * (barWidth + gap);
                int by = y + height - barHeight - 18;
                g.FillRectangle(accent, bx, by, barWidth, barHeight);
                g.DrawString(data[i].Date.ToString("MM/dd"), labelFont, muted, bx - 2, y + height - 16);
            }
        }

        private void DrawAccuracy(Graphics g, List<LearningHistoryEntry> data, int x, int y, int width, int height, Brush text, Brush muted, Pen line)
        {
            Font titleFont = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            Font labelFont = new Font("Microsoft JhengHei UI", 8F, FontStyle.Regular);
            g.DrawString("測驗正確率", titleFont, text, x, y);
            y += 24;
            g.DrawRectangle(line, x, y, width, height);
            if (data.Count < 2)
            {
                g.DrawString("資料累積後會顯示趨勢線", labelFont, muted, x + 8, y + 12);
                return;
            }
            PointF[] points = new PointF[data.Count];
            int gap = 8;
            for (int i = 0; i < data.Count; i++)
            {
                float px = x + gap + i * (width - gap * 2) / (float)(data.Count - 1);
                float py = y + height - 18 - (float)(data[i].Accuracy / 100.0 * (height - 28));
                points[i] = new PointF(px, py);
            }
            using (Pen accentPen = new Pen(_theme.Accent, 3F))
            {
                g.DrawLines(accentPen, points);
            }
            foreach (PointF p in points)
            {
                g.FillEllipse(new SolidBrush(_theme.Accent), p.X - 4, p.Y - 4, 8, 8);
            }
            g.DrawString("0%", labelFont, muted, x + 4, y + height - 18);
            g.DrawString("100%", labelFont, muted, x + 4, y + 4);
        }
    }

    public sealed class ProductAboutDialog : Form
    {
        public ProductAboutDialog()
        {
            Text = "關於 TSV Studio";
            StartPosition = FormStartPosition.CenterParent;
            Size = new Size(540, 360);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            Font = new Font("Microsoft JhengHei UI", 10F);
            BackColor = Color.FromArgb(18, 24, 42);
            ForeColor = Color.White;

            var title = new Label();
            title.Text = "TSV Studio Product Edition";
            title.Font = new Font(Font.FontFamily, 18F, FontStyle.Bold);
            title.Dock = DockStyle.Top;
            title.Height = 56;
            title.TextAlign = ContentAlignment.MiddleCenter;

            var body = new TextBox();
            body.Multiline = true;
            body.ReadOnly = true;
            body.BorderStyle = BorderStyle.None;
            body.Dock = DockStyle.Fill;
            body.BackColor = BackColor;
            body.ForeColor = ForeColor;
            body.Font = new Font("Consolas", 10F);
            body.Text = BuildAboutText();

            var ok = new Button();
            ok.Text = "確定";
            ok.Dock = DockStyle.Bottom;
            ok.Height = 44;
            ok.DialogResult = DialogResult.OK;

            Controls.Add(body);
            Controls.Add(title);
            Controls.Add(ok);
            AcceptButton = ok;
        }

        private string BuildAboutText()
        {
            var asm = Assembly.GetExecutingAssembly();
            var sb = new StringBuilder();
            sb.AppendLine("產品定位：字典 TSV 資料治理、AI 分析、資安掃描、品質報告");
            sb.AppendLine("版本：" + asm.GetName().Version);
            sb.AppendLine();
            sb.AppendLine("內建能力：");
            sb.AppendLine("- TSV / CSV / TXT 載入");
            sb.AppendLine("- 深色產品級介面");
            sb.AppendLine("- 即時搜尋、風險篩選、欄位排序");
            sb.AppendLine("- AI 難度估計與品質分數");
            sb.AppendLine("- 音檔存在性與安全路徑檢查");
            sb.AppendLine("- Script / 指令 / URL 風險掃描");
            sb.AppendLine("- TXT / JSON / TSV / CSV 報表輸出");
            sb.AppendLine("- 可選 NuGet 擴充中心、首頁、匯入精靈、學習歷程、Anki 匯出、HTML 報告與 Toast 通知：未安裝不影響核心功能，安裝後可升級 SQLite、ONNX、NAudio、ClosedXML 等能力");
            sb.AppendLine();
            sb.AppendLine("此版本保留深度學習模型擴充點，可於 DeepLearningHookProvider 接 ONNX。 ");
            return sb.ToString();
        }
    }


    internal sealed class StyledNavigationButton : Button
    {
        private bool _hover;
        private bool _pressed;
        private bool _isActive;

        public Color BaseColor { get; set; }
        public Color HoverColor { get; set; }
        public Color PressedColor { get; set; }
        public Color ActiveColor { get; set; }
        public Color AccentColor { get; set; }
        public Color TextColor { get; set; }

        public bool IsActive
        {
            get { return _isActive; }
            set
            {
                _isActive = value;
                Invalidate();
            }
        }

        public StyledNavigationButton()
        {
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            BaseColor = Color.FromArgb(36, 52, 88);
            HoverColor = Color.FromArgb(46, 70, 120);
            PressedColor = Color.FromArgb(28, 42, 72);
            ActiveColor = Color.FromArgb(58, 98, 160);
            AccentColor = Color.FromArgb(90, 160, 255);
            TextColor = Color.White;
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            _hover = true;
            Invalidate();
            base.OnMouseEnter(e);
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            _hover = false;
            _pressed = false;
            Invalidate();
            base.OnMouseLeave(e);
        }

        protected override void OnMouseDown(MouseEventArgs mevent)
        {
            _pressed = true;
            Invalidate();
            base.OnMouseDown(mevent);
        }

        protected override void OnMouseUp(MouseEventArgs mevent)
        {
            _pressed = false;
            Invalidate();
            base.OnMouseUp(mevent);
        }

        protected override void OnPaint(PaintEventArgs pevent)
        {
            pevent.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            Color fill = BaseColor;
            if (IsActive) fill = ActiveColor;
            else if (_pressed) fill = PressedColor;
            else if (_hover) fill = HoverColor;

            using (GraphicsPath path = CreateRoundedRectangle(rect, 8))
            using (SolidBrush brush = new SolidBrush(fill))
            {
                pevent.Graphics.FillPath(brush, path);
            }

            Color borderColor = IsActive || _hover ? AccentColor : ControlPaint.Dark(BaseColor);
            using (GraphicsPath path = CreateRoundedRectangle(rect, 8))
            using (Pen pen = new Pen(borderColor))
            {
                pevent.Graphics.DrawPath(pen, path);
            }

            if (IsActive)
            {
                using (SolidBrush accent = new SolidBrush(AccentColor))
                {
                    pevent.Graphics.FillRectangle(accent, 0, 6, 4, Height - 12);
                }
            }

            Rectangle textRect = new Rectangle(14, 0, Width - 20, Height);
            TextRenderer.DrawText(pevent.Graphics, Text, Font, textRect, TextColor, TextFormatFlags.VerticalCenter | TextFormatFlags.Left | TextFormatFlags.EndEllipsis);
        }

        private static GraphicsPath CreateRoundedRectangle(Rectangle rect, int radius)
        {
            int diameter = radius * 2;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    internal sealed class StudioColorTable : ProfessionalColorTable
    {
        public override Color MenuStripGradientBegin { get { return Color.FromArgb(20, 30, 52); } }
        public override Color MenuStripGradientEnd { get { return Color.FromArgb(16, 24, 42); } }
        public override Color ToolStripGradientBegin { get { return Color.FromArgb(20, 30, 52); } }
        public override Color ToolStripGradientMiddle { get { return Color.FromArgb(22, 34, 58); } }
        public override Color ToolStripGradientEnd { get { return Color.FromArgb(18, 28, 48); } }
        public override Color ImageMarginGradientBegin { get { return Color.FromArgb(18, 28, 48); } }
        public override Color ImageMarginGradientMiddle { get { return Color.FromArgb(18, 28, 48); } }
        public override Color ImageMarginGradientEnd { get { return Color.FromArgb(18, 28, 48); } }
        public override Color ButtonSelectedBorder { get { return Color.FromArgb(78, 142, 255); } }
        public override Color ButtonSelectedHighlight { get { return Color.FromArgb(38, 71, 124); } }
        public override Color ButtonPressedHighlight { get { return Color.FromArgb(48, 84, 145); } }
        public override Color ButtonPressedBorder { get { return Color.FromArgb(90, 160, 255); } }
        public override Color ButtonCheckedHighlight { get { return Color.FromArgb(44, 78, 135); } }
        public override Color ButtonCheckedHighlightBorder { get { return Color.FromArgb(90, 160, 255); } }
        public override Color SeparatorDark { get { return Color.FromArgb(52, 78, 124); } }
        public override Color SeparatorLight { get { return Color.FromArgb(26, 39, 66); } }
        public override Color MenuBorder { get { return Color.FromArgb(52, 78, 124); } }
        public override Color ToolStripBorder { get { return Color.FromArgb(52, 78, 124); } }
    }

    internal sealed class StudioToolStripRenderer : ToolStripProfessionalRenderer
    {
        public StudioToolStripRenderer()
            : base(new StudioColorTable())
        {
            RoundedEdges = false;
        }
    }

    internal static class AppIconFactory
    {
        public static Icon CreateProductIcon()
        {
            Bitmap bitmap = new Bitmap(64, 64);
            using (Graphics g = Graphics.FromImage(bitmap))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Rectangle rect = new Rectangle(0, 0, 63, 63);

                using (GraphicsPath path = CreateRoundedRectangle(rect, 14))
                using (LinearGradientBrush brush = new LinearGradientBrush(rect, Color.FromArgb(33, 58, 110), Color.FromArgb(67, 132, 255), 45f))
                using (Pen border = new Pen(Color.FromArgb(168, 211, 255), 2f))
                {
                    g.FillPath(brush, path);
                    g.DrawPath(border, path);
                }

                using (Pen linePen = new Pen(Color.FromArgb(180, 224, 255), 3f))
                {
                    g.DrawLine(linePen, 16, 19, 48, 19);
                    g.DrawLine(linePen, 16, 31, 44, 31);
                    g.DrawLine(linePen, 16, 43, 36, 43);
                }

                using (Font font = new Font("Segoe UI", 12f, FontStyle.Bold, GraphicsUnit.Pixel))
                using (Brush brush = new SolidBrush(Color.White))
                {
                    StringFormat format = new StringFormat();
                    format.Alignment = StringAlignment.Far;
                    format.LineAlignment = StringAlignment.Far;
                    g.DrawString("TSV", font, brush, new RectangleF(6, 6, 52, 52), format);
                }
            }

            IntPtr hIcon = bitmap.GetHicon();
            Icon icon = null;
            try
            {
                icon = (Icon)Icon.FromHandle(hIcon).Clone();
            }
            finally
            {
                DestroyIcon(hIcon);
                bitmap.Dispose();
            }
            return icon;
        }

        private static GraphicsPath CreateRoundedRectangle(Rectangle rect, int radius)
        {
            int diameter = radius * 2;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern bool DestroyIcon(IntPtr handle);
    }

}
