using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace _1113354_陳冠瑋
{
    public partial class Form1 : Form
    {
        #region MIDI

        [DllImport("winmm.dll")]
        private static extern int midiOutOpen(out IntPtr lphmo, int uDeviceID, IntPtr dwCallback, IntPtr dwInstance, int dwFlags);

        [DllImport("winmm.dll")]
        private static extern int midiOutShortMsg(IntPtr hmo, int dwMsg);

        [DllImport("winmm.dll")]
        private static extern int midiOutReset(IntPtr hmo);

        [DllImport("winmm.dll")]
        private static extern int midiOutClose(IntPtr hmo);

        private const int MIDI_MAPPER = -1;
        private IntPtr midiOut;
        private bool midiReady = false;

        #endregion

        #region UI 欄位

        private TableLayoutPanel rootLayout;
        private Panel topPanel;
        private TableLayoutPanel contentLayout;

        private Panel pianoScenePanel;
        private PianoRollControl pianoRoll;
        private PianoKeyboardControl pianoControl;

        private Label lblStatus;
        private ComboBox cboInstrument;
        private TrackBar trkVelocity;
        private CheckBox chkSustain;
        private Button btnStopAll;
        private Button btnCenterC;
        private Button btnToggleRightPanel;
        private ComboBox cboViewZoom;
        private bool rightPanelCollapsed = false;
        private bool isClosingForm = false;
        private int pianoZoomPercent = 0; // 0 = 符合寬度

        private TabControl rightTabs;
        private Panel rightRail;

        // 琴譜
        private PictureBox picSheet;
        private WebBrowser pdfSheetViewer;
        private Label lblPdfPreviewHint;
        private Button btnOpenSheetPreview;
        private Form sheetPreviewForm;
        private WebBrowser sheetPreviewBrowser;
        private PictureBox sheetPreviewPicture;
        private string currentPdfPath = "";
        private Label lblSheetPage;
        private TextBox txtSearch;
        private WebBrowser webBrowser;
        private List<Image> sheetImages = new List<Image>();
        private int currentSheetIndex = -1;

        // 曲目 / 播放清單
        private ListBox lstSongs;
        private ListBox lstPlaylist;
        private Label lblSongDesc;
        private TextBox txtPlaybackBpm;
        private Label lblPlaybackBpmInfo;
        private double activePlaybackBaseBpm = 120.0;
        private Button btnPlaySong;
        private Button btnAddToPlaylist;
        private Button btnStopSong;
        private Button btnPlayPlaylist;
        private Button btnRemovePlaylist;
        private Button btnMoveUp;
        private Button btnMoveDown;
        private Button btnImportMidi;
        private Button btnImportMusicXml;
        private Button btnExportMidi;
        private Button btnSelectAudiveris;
        private Button btnSelectPoppler;
        private Button btnRunOmr;
        private ComboBox cmbOmrMode;
        private CheckBox chkManualOmrTempo;
        private NumericUpDown nudOmrTempo;
        private Label lblOmrBpmPreview;
        private OmrProgressDialog omrProgressDialog;
        private OmrProgressDialog aiProgressDialog;
        private string audiverisPath = "";
        private string popplerPdftoppmPath = "";
        private string ytdlpPath = "";
        private string basicPitchPath = "";
        private string demucsPath = "";
        private TextBox txtYouTubeUrl;
        private ComboBox cmbAiMidiMode;
        private Button btnSelectYtDlp;
        private Button btnSelectBasicPitch;
        private Button btnSelectDemucs;
        private Button btnYoutubeToBlocks;
        private Button btnAiHelp;
        private string lastAudiverisErrorMessage = "";
        private string toolSettingsPath = "";
        private string currentSheetInputPath = "";
        private List<string> sheetFilePaths = new List<string>();
        private Button btnPauseResume;
        private TrackBar trkProgress;
        private Label lblProgress;
        private System.Windows.Forms.Timer playbackProgressTimer;

        // 錄製 / 節拍器
        private Button btnRecord;
        private Button btnStopRecord;
        private Button btnPlayRecord;
        private Button btnClearRecord;
        private Button btnAddRecordToPlaylist;
        private Button btnSaveRecord;
        private Button btnLoadRecord;
        private Label lblRecordStatus;

        private NumericUpDown nudBpm;
        private NumericUpDown nudBeatsPerMeasure;
        private Button btnMetronomeStart;
        private Button btnMetronomeStop;
        private Label lblMetronomeBeat;
        private System.Windows.Forms.Timer metronomeTimer;
        private int metronomeBeat = 1;

        #endregion

        #region 資料欄位

        private int velocity = 112;
        private const int PianoRollLeadInMs = 1300; // 落下方塊從畫面出現到碰到紅線的前導時間，音符會等到碰線才發
        private const int OmrFastPdfDpi = 420; // 準確優先：PDF 先轉成 420 DPI，降低漏音機率
        private const int OmrRetryPdfDpi = 600; // 若 420 DPI 失敗，才自動重試 600 DPI
        private const int OmrMaxParallelAudiverisJobs = 2; // 準確優先：降低同時辨識數，避免 Audiveris 太多程序互相搶資源

        private readonly Dictionary<int, int> noteHoldCount = new Dictionary<int, int>();
        private readonly Dictionary<Keys, int> computerKeyMap = new Dictionary<Keys, int>();
        private readonly Dictionary<int, string> shortcutLabelMap = new Dictionary<int, string>();
        private readonly HashSet<Keys> pressedComputerKeys = new HashSet<Keys>();

        private List<Song> presetSongs = new List<Song>();
        private CancellationTokenSource autoPlayCts;

        private bool playbackPaused = false;
        private bool playbackRunning = false;
        private int playbackPositionMs = 0;
        private double playbackPositionExactMs = 0.0;
        private int playbackTotalMs = 1;
        private Song currentPlaybackSong = null;
        private bool progressUserDragging = false;
        private bool updatingProgressUi = false;
        private bool playbackSeekRequested = false;
        private int playbackSeekTargetMs = 0;

        private bool isRecording = false;
        private Stopwatch recordWatch;
        private List<RecordedMidiEvent> recordedEvents = new List<RecordedMidiEvent>();

        #endregion

        public Form1()
        {
            InitializeComponent();

            BuildShortcutMap();
            BuildInterface();
            LoadExternalToolSettings();
            InitMidi();
            LoadPresetSongs();

            KeyPreview = true;
            KeyDown += Form1_KeyDown;
            KeyUp += Form1_KeyUp;
            FormClosing += Form1_FormClosing;
            Deactivate += Form1_Deactivate;
            Shown += Form1_Shown;
        }

        private void Form1_Load(object sender, EventArgs e)
        {
        }

        #region 初始化畫面

        private void BuildInterface()
        {
            Controls.Clear();

            Text = "電子鋼琴 Piano";
            Icon = CreateDesignedAppIcon();
            WindowState = FormWindowState.Maximized;
            MinimumSize = new Size(1280, 820);
            BackColor = Color.FromArgb(25, 25, 25);
            Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular);

            rootLayout = new TableLayoutPanel();
            rootLayout.Dock = DockStyle.Fill;
            rootLayout.RowCount = 2;
            rootLayout.ColumnCount = 1;
            rootLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 108F));
            rootLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            rootLayout.BackColor = Color.FromArgb(25, 25, 25);
            Controls.Add(rootLayout);

            BuildTopPanel();
            BuildContentLayout();
        }

        private void BuildTopPanel()
        {
            topPanel = new Panel();
            topPanel.Dock = DockStyle.Fill;
            topPanel.BackColor = Color.FromArgb(18, 22, 30);
            rootLayout.Controls.Add(topPanel, 0, 0);

            Label lblTitle = new Label();
            lblTitle.Text = "電子鋼琴 Piano";
            lblTitle.ForeColor = Color.White;
            lblTitle.Font = new Font("Microsoft JhengHei UI", 23F, FontStyle.Bold);
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(20, 12);
            topPanel.Controls.Add(lblTitle);

            Label lblHint = new Label();
            lblHint.Text = "快捷鍵：Z S X D C V G B H N J M / Q 2 W 3 E R 5 T 6 Y 7 U";
            lblHint.ForeColor = Color.Gainsboro;
            lblHint.AutoSize = true;
            lblHint.Location = new Point(24, 56);
            topPanel.Controls.Add(lblHint);

            lblStatus = new Label();
            lblStatus.Text = "狀態：準備中...";
            lblStatus.ForeColor = Color.LightSteelBlue;
            lblStatus.AutoSize = true;
            lblStatus.Location = new Point(24, 81);
            topPanel.Controls.Add(lblStatus);

            Label lblInst = new Label();
            lblInst.Text = "音色：";
            lblInst.ForeColor = Color.White;
            lblInst.AutoSize = true;
            lblInst.Location = new Point(520, 18);
            topPanel.Controls.Add(lblInst);

            cboInstrument = new ComboBox();
            cboInstrument.DropDownStyle = ComboBoxStyle.DropDownList;
            cboInstrument.Width = 180;
            cboInstrument.Location = new Point(575, 14);
            cboInstrument.Items.Add(new InstrumentItem("平台鋼琴", 0));
            cboInstrument.Items.Add(new InstrumentItem("明亮鋼琴", 1));
            cboInstrument.Items.Add(new InstrumentItem("電鋼琴 1", 4));
            cboInstrument.Items.Add(new InstrumentItem("電鋼琴 2", 5));
            cboInstrument.Items.Add(new InstrumentItem("古鍵琴", 6));
            cboInstrument.Items.Add(new InstrumentItem("音樂盒", 10));
            cboInstrument.Items.Add(new InstrumentItem("弦樂合奏", 48));
            cboInstrument.SelectedIndex = 1;
            cboInstrument.SelectedIndexChanged += CboInstrument_SelectedIndexChanged;
            topPanel.Controls.Add(cboInstrument);

            Label lblVel = new Label();
            lblVel.Text = "力度 / 音量：";
            lblVel.ForeColor = Color.White;
            lblVel.AutoSize = true;
            lblVel.Location = new Point(520, 58);
            topPanel.Controls.Add(lblVel);

            trkVelocity = new TrackBar();
            trkVelocity.Minimum = 20;
            trkVelocity.Maximum = 127;
            trkVelocity.Value = velocity;
            trkVelocity.TickFrequency = 10;
            trkVelocity.Width = 190;
            trkVelocity.Location = new Point(620, 46);
            trkVelocity.Scroll += TrkVelocity_Scroll;
            topPanel.Controls.Add(trkVelocity);

            chkSustain = new CheckBox();
            chkSustain.Text = "延音 Sustain";
            chkSustain.ForeColor = Color.White;
            chkSustain.AutoSize = true;
            chkSustain.Location = new Point(840, 18);
            chkSustain.CheckedChanged += ChkSustain_CheckedChanged;
            topPanel.Controls.Add(chkSustain);

            btnStopAll = CreateTopButton("停止全部聲音", 840, 52, 130);
            btnStopAll.Click += BtnStopAll_Click;
            topPanel.Controls.Add(btnStopAll);

            btnCenterC = CreateTopButton("⌂ 中央 C", 980, 52, 120);
            btnCenterC.Click += BtnCenterC_Click;
            topPanel.Controls.Add(btnCenterC);

            Label lblView = new Label();
            lblView.Text = "視圖：";
            lblView.ForeColor = Color.White;
            lblView.AutoSize = true;
            lblView.Location = new Point(1120, 18);
            topPanel.Controls.Add(lblView);

            cboViewZoom = new ComboBox();
            cboViewZoom.DropDownStyle = ComboBoxStyle.DropDownList;
            cboViewZoom.Width = 110;
            cboViewZoom.Location = new Point(1170, 14);
            cboViewZoom.Items.Add("符合寬度");
            cboViewZoom.Items.Add("100%");
            cboViewZoom.Items.Add("125%");
            cboViewZoom.Items.Add("150%");
            cboViewZoom.Items.Add("200%");
            cboViewZoom.SelectedIndex = 0;
            cboViewZoom.SelectedIndexChanged += CboViewZoom_SelectedIndexChanged;
            topPanel.Controls.Add(cboViewZoom);

            btnToggleRightPanel = CreateTopButton("☰ 面板", 1120, 52, 120);
            btnToggleRightPanel.Click += BtnToggleRightPanel_Click;
            topPanel.Controls.Add(btnToggleRightPanel);
        }

        private void BuildContentLayout()
        {
            contentLayout = new TableLayoutPanel();
            contentLayout.Dock = DockStyle.Fill;
            contentLayout.RowCount = 1;
            contentLayout.ColumnCount = 2;
            contentLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 72F));
            contentLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 28F));
            rootLayout.Controls.Add(contentLayout, 0, 1);

            BuildLeftPianoScene();
            BuildRightTabs();
        }

        private void BuildLeftPianoScene()
        {
            Panel leftPanel = new Panel();
            leftPanel.Dock = DockStyle.Fill;
            leftPanel.BackColor = Color.FromArgb(35, 35, 35);
            contentLayout.Controls.Add(leftPanel, 0, 0);

            pianoScenePanel = new Panel();
            pianoScenePanel.Dock = DockStyle.Fill;
            pianoScenePanel.AutoScroll = true;
            pianoScenePanel.BackColor = Color.FromArgb(32, 32, 32);
            leftPanel.Controls.Add(pianoScenePanel);

            pianoControl = new PianoKeyboardControl();
            pianoControl.Location = new Point(20, 300);
            pianoControl.BuildKeyboard(BuildDisplayLabels());
            pianoControl.NotePressed += PianoControl_NotePressed;
            pianoControl.NoteReleased += PianoControl_NoteReleased;

            pianoRoll = new PianoRollControl();
            pianoRoll.Location = new Point(20, 20);
            pianoRoll.Width = pianoControl.Width;
            pianoRoll.Height = 250;
            pianoRoll.KeyRectProvider = delegate (int midi)
            {
                return pianoControl.GetKeyRect(midi);
            };

            pianoScenePanel.Controls.Add(pianoRoll);
            pianoScenePanel.Controls.Add(pianoControl);

            pianoScenePanel.Resize += delegate
            {
                ApplyPianoViewLayout();
            };

            ApplyPianoViewLayout();
        }

        private void CboViewZoom_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (cboViewZoom == null)
            {
                return;
            }

            string text = cboViewZoom.SelectedItem == null ? "符合寬度" : cboViewZoom.SelectedItem.ToString();

            if (text == "符合寬度")
            {
                pianoZoomPercent = 0;
            }
            else
            {
                int percent = 100;
                int.TryParse(text.Replace("%", ""), out percent);
                pianoZoomPercent = percent;
            }

            ApplyPianoViewLayout();
        }

        private void BtnToggleRightPanel_Click(object sender, EventArgs e)
        {
            if (contentLayout == null || rightTabs == null)
            {
                return;
            }

            rightPanelCollapsed = !rightPanelCollapsed;

            if (rightPanelCollapsed)
            {
                rightTabs.Visible = false;
                if (rightRail != null)
                {
                    rightRail.Visible = true;
                    rightRail.BringToFront();
                }

                contentLayout.ColumnStyles[0].SizeType = SizeType.Percent;
                contentLayout.ColumnStyles[0].Width = 100F;
                contentLayout.ColumnStyles[1].SizeType = SizeType.Absolute;
                contentLayout.ColumnStyles[1].Width = 64F;
                btnToggleRightPanel.Text = "☰ 展開";
            }
            else
            {
                if (rightRail != null)
                {
                    rightRail.Visible = false;
                }

                rightTabs.Visible = true;
                rightTabs.BringToFront();
                contentLayout.ColumnStyles[0].SizeType = SizeType.Percent;
                contentLayout.ColumnStyles[0].Width = 72F;
                contentLayout.ColumnStyles[1].SizeType = SizeType.Percent;
                contentLayout.ColumnStyles[1].Width = 28F;
                btnToggleRightPanel.Text = "☰ 面板";
            }

            BeginInvoke(new Action(delegate
            {
                ApplyPianoViewLayout();
            }));
        }

        private int CountWhiteKeys(int startMidi, int endMidi)
        {
            int count = 0;
            for (int midi = startMidi; midi <= endMidi; midi++)
            {
                int note = midi % 12;
                bool isBlack = note == 1 || note == 3 || note == 6 || note == 8 || note == 10;
                if (!isBlack)
                {
                    count++;
                }
            }
            return count;
        }

        private void ApplyPianoViewLayout()
        {
            if (pianoScenePanel == null || pianoControl == null || pianoRoll == null)
            {
                return;
            }

            int availableWidth = pianoScenePanel.ClientSize.Width - 8;
            if (availableWidth < 400)
            {
                return;
            }

            int whiteCount = CountWhiteKeys(pianoControl.StartMidi, pianoControl.EndMidi);
            int whiteWidth;

            if (pianoZoomPercent <= 0)
            {
                whiteWidth = (availableWidth - pianoControl.SideMargin * 2 - 8) / whiteCount;
                whiteWidth = Math.Max(14, Math.Min(42, whiteWidth));
            }
            else
            {
                whiteWidth = Math.Max(14, (int)Math.Round(42.0 * pianoZoomPercent / 100.0));
            }

            pianoControl.WhiteKeyWidth = whiteWidth;
            pianoControl.BlackKeyWidth = Math.Max(10, (int)Math.Round(whiteWidth * 0.66));

            // 符合寬度時讓畫面上下也更像參考影片，鍵盤不需要水平拖動。
            if (whiteWidth <= 22)
            {
                pianoControl.WhiteKeyHeight = 300;
                pianoControl.BlackKeyHeight = 185;
            }
            else
            {
                pianoControl.WhiteKeyHeight = 330;
                pianoControl.BlackKeyHeight = 205;
            }

            pianoControl.BuildKeyboard(BuildDisplayLabels());

            int x = 4;
            if (pianoControl.Width < availableWidth)
            {
                x = Math.Max(4, (availableWidth - pianoControl.Width) / 2);
            }

            pianoRoll.Location = new Point(x, 20);
            pianoRoll.Width = pianoControl.Width;
            pianoRoll.Height = Math.Max(220, Math.Min(300, pianoScenePanel.ClientSize.Height - pianoControl.WhiteKeyHeight - 120));

            pianoControl.Location = new Point(x, pianoRoll.Bottom + 28);

            pianoScenePanel.AutoScrollMinSize = new Size(
                pianoControl.Width + x + 20,
                pianoControl.Bottom + 80);

            if (pianoZoomPercent <= 0)
            {
                pianoScenePanel.AutoScrollPosition = new Point(0, 0);
            }

            pianoRoll.Invalidate();
            pianoControl.Invalidate();
        }

        private void BuildRightTabs()
        {
            rightTabs = new TabControl();
            rightTabs.Dock = DockStyle.Fill;
            rightTabs.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            rightTabs.Appearance = TabAppearance.Normal;
            rightTabs.ItemSize = new Size(88, 34);
            rightTabs.SizeMode = TabSizeMode.Fixed;
            rightTabs.DrawMode = TabDrawMode.OwnerDrawFixed;
            rightTabs.DrawItem += RightTabs_DrawItem;
            rightTabs.Padding = new Point(14, 6);
            contentLayout.Controls.Add(rightTabs, 1, 0);

            rightRail = new Panel();
            rightRail.Dock = DockStyle.Fill;
            rightRail.BackColor = Color.FromArgb(15, 23, 42);
            rightRail.Visible = false;
            contentLayout.Controls.Add(rightRail, 1, 0);

            BuildRightRail();
            BuildSheetTab();
            BuildSearchTab();
            BuildSongTab();
            BuildRecordMetronomeTab();

            ApplyEnterpriseRightPanelStyle();
        }

        private void BuildRightRail()
        {
            if (rightRail == null)
            {
                return;
            }

            rightRail.Controls.Clear();

            AddRailButton("匯入", 0, ModernIcon.Upload);
            AddRailButton("搜尋", 1, ModernIcon.Search);
            AddRailButton("曲目", 2, ModernIcon.Music);
            AddRailButton("錄製", 3, ModernIcon.Record);

            ModernButton expand = new ModernButton();
            expand.Text = "";
            expand.Kind = ModernButtonKind.Dark;
            expand.Icon = ModernIcon.Menu;
            expand.Location = new Point(10, 16);
            expand.Size = new Size(42, 42);
            expand.Click += delegate
            {
                if (rightPanelCollapsed)
                {
                    BtnToggleRightPanel_Click(expand, EventArgs.Empty);
                }
            };
            rightRail.Controls.Add(expand);
            expand.BringToFront();
        }

        private void AddRailButton(string title, int tabIndex, ModernIcon icon)
        {
            ModernButton btn = new ModernButton();
            btn.Text = "";
            btn.Kind = ModernButtonKind.Dark;
            btn.Icon = icon;
            btn.Tag = tabIndex;
            btn.Size = new Size(42, 42);
            btn.Location = new Point(10, 72 + tabIndex * 54);
            btn.Click += delegate
            {
                if (rightTabs != null && tabIndex >= 0 && tabIndex < rightTabs.TabPages.Count)
                {
                    if (rightPanelCollapsed)
                    {
                        BtnToggleRightPanel_Click(btn, EventArgs.Empty);
                    }

                    rightTabs.SelectedIndex = tabIndex;
                }
            };

            ToolTip tip = new ToolTip();
            tip.SetToolTip(btn, title);
            rightRail.Controls.Add(btn);
        }

        private Panel CreateCardPanel(int x, int y, int width, int height)
        {
            Panel card = new Panel();
            card.Location = new Point(x, y);
            card.Size = new Size(width, height);
            card.BackColor = Color.White;
            card.Padding = new Padding(12);
            card.Paint += delegate (object sender, PaintEventArgs e)
            {
                Panel p = sender as Panel;
                if (p == null)
                {
                    return;
                }

                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                Rectangle r = new Rectangle(0, 0, p.Width - 1, p.Height - 1);
                using (GraphicsPath path = CreateRoundedRectPath(r, 14))
                using (SolidBrush br = new SolidBrush(Color.White))
                using (Pen pen = new Pen(Color.FromArgb(218, 226, 236), 1))
                {
                    e.Graphics.FillPath(br, path);
                    e.Graphics.DrawPath(pen, path);
                }
            };
            return card;
        }

        private void AddCardTitle(Control card, string title, string subtitle)
        {
            Label lblTitle = new Label();
            lblTitle.Text = title;
            lblTitle.AutoSize = true;
            lblTitle.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(15, 23, 42);
            lblTitle.Location = new Point(16, 10);
            card.Controls.Add(lblTitle);

            if (!string.IsNullOrWhiteSpace(subtitle))
            {
                Label lblSub = new Label();
                lblSub.Text = subtitle;
                lblSub.AutoSize = true;
                lblSub.Font = new Font("Microsoft JhengHei UI", 8F, FontStyle.Regular);
                lblSub.ForeColor = Color.FromArgb(100, 116, 139);
                lblSub.Location = new Point(104, 13);
                card.Controls.Add(lblSub);
            }
        }

        private void BuildSheetTab()
        {
            TabPage tabSheet = new TabPage("匯入");
            tabSheet.AutoScroll = true;
            rightTabs.TabPages.Add(tabSheet);

            Panel toolbar = new Panel();
            toolbar.Dock = DockStyle.Top;
            toolbar.Height = 402;
            toolbar.BackColor = Color.FromArgb(241, 245, 250);
            tabSheet.Controls.Add(toolbar);

            Panel importCard = CreateCardPanel(12, 12, 410, 82);
            toolbar.Controls.Add(importCard);
            AddCardTitle(importCard, "匯入工具", "PDF / 圖片 / 截圖");

            Button btnImportSheet = CreateNormalButton("多頁圖片", 16, 38, 112, 34);
            btnImportSheet.Click += BtnImportSheet_Click;
            importCard.Controls.Add(btnImportSheet);

            Button btnOpenPdf = CreateNormalButton("匯入 PDF", 138, 38, 104, 34);
            btnOpenPdf.Click += BtnOpenPdf_Click;
            importCard.Controls.Add(btnOpenPdf);

            Button btnPasteShot = CreateNormalButton("貼上截圖", 252, 38, 104, 34);
            btnPasteShot.Click += BtnPasteShot_Click;
            importCard.Controls.Add(btnPasteShot);

            Panel omrCard = CreateCardPanel(12, 104, 410, 194);
            toolbar.Controls.Add(omrCard);
            AddCardTitle(omrCard, "辨識工具", "Audiveris 必要，Poppler 可提升複雜 PDF 成功率");

            btnSelectAudiveris = CreateNormalButton("Audiveris", 16, 40, 122, 34);
            btnSelectAudiveris.Click += BtnSelectAudiveris_Click;
            omrCard.Controls.Add(btnSelectAudiveris);

            btnSelectPoppler = CreateNormalButton("Poppler", 148, 40, 102, 34);
            btnSelectPoppler.Click += BtnSelectPoppler_Click;
            omrCard.Controls.Add(btnSelectPoppler);

            btnRunOmr = CreateNormalButton("全部辨識", 260, 40, 132, 34);
            btnRunOmr.Click += BtnRunOmr_Click;
            omrCard.Controls.Add(btnRunOmr);

            Label lblOmrMode = new Label();
            lblOmrMode.Text = "辨識模式";
            lblOmrMode.AutoSize = true;
            lblOmrMode.Location = new Point(18, 88);
            omrCard.Controls.Add(lblOmrMode);

            cmbOmrMode = new ComboBox();
            cmbOmrMode.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbOmrMode.Items.AddRange(new object[] { "快速", "平衡", "準確" });
            cmbOmrMode.SelectedIndex = 1;
            cmbOmrMode.Location = new Point(92, 84);
            cmbOmrMode.Size = new Size(98, 28);
            cmbOmrMode.SelectedIndexChanged += delegate { SaveExternalToolSettings(); };
            omrCard.Controls.Add(cmbOmrMode);

            lblSheetPage = new Label();
            lblSheetPage.Text = "頁數：0 / 0";
            lblSheetPage.AutoSize = true;
            lblSheetPage.Location = new Point(218, 88);
            omrCard.Controls.Add(lblSheetPage);

            chkManualOmrTempo = new CheckBox();
            chkManualOmrTempo.Text = "手動速度";
            chkManualOmrTempo.AutoSize = true;
            chkManualOmrTempo.Location = new Point(18, 124);
            chkManualOmrTempo.CheckedChanged += delegate { UpdateOmrTempoPreviewLabel(); SaveExternalToolSettings(); };
            omrCard.Controls.Add(chkManualOmrTempo);

            nudOmrTempo = new NumericUpDown();
            nudOmrTempo.Minimum = 40;
            nudOmrTempo.Maximum = 240;
            nudOmrTempo.Value = 102;
            nudOmrTempo.Location = new Point(105, 121);
            nudOmrTempo.Size = new Size(72, 26);
            nudOmrTempo.ValueChanged += delegate { UpdateOmrTempoPreviewLabel(); SaveExternalToolSettings(); };
            omrCard.Controls.Add(nudOmrTempo);

            Label lblOmrTempoHint = new Label();
            lblOmrTempoHint.Text = "BPM（例如 ♩=102 就填 102）";
            lblOmrTempoHint.AutoSize = true;
            lblOmrTempoHint.Location = new Point(188, 125);
            omrCard.Controls.Add(lblOmrTempoHint);

            lblOmrBpmPreview = new Label();
            lblOmrBpmPreview.Text = "目前使用：自動 / 預設 102 BPM";
            lblOmrBpmPreview.AutoSize = false;
            lblOmrBpmPreview.Location = new Point(18, 154);
            lblOmrBpmPreview.Size = new Size(370, 24);
            lblOmrBpmPreview.ForeColor = Color.FromArgb(37, 99, 235);
            omrCard.Controls.Add(lblOmrBpmPreview);

            Panel pageCard = CreateCardPanel(12, 310, 410, 78);
            toolbar.Controls.Add(pageCard);
            AddCardTitle(pageCard, "頁面操作", "預覽、翻頁與拆行工具");

            btnOpenSheetPreview = CreateNormalButton("預覽窗", 16, 38, 88, 32);
            btnOpenSheetPreview.Click += BtnOpenSheetPreview_Click;
            pageCard.Controls.Add(btnOpenSheetPreview);

            Button btnPrevPage = CreateNormalButton("上頁", 112, 38, 68, 32);
            btnPrevPage.Click += BtnPrevPage_Click;
            pageCard.Controls.Add(btnPrevPage);

            Button btnNextPage = CreateNormalButton("下頁", 190, 38, 68, 32);
            btnNextPage.Click += BtnNextPage_Click;
            pageCard.Controls.Add(btnNextPage);

            Button btnSplitRows = CreateNormalButton("拆行", 282, 38, 68, 32);
            btnSplitRows.Click += BtnSplitAllRows_Click;
            pageCard.Controls.Add(btnSplitRows);

            Button btnClearSheet = CreateNormalButton("清除", 356, 38, 54, 32);
            btnClearSheet.Click += BtnClearSheet_Click;
            pageCard.Controls.Add(btnClearSheet);

            Panel sheetPanel = new Panel();
            sheetPanel.Dock = DockStyle.Fill;
            sheetPanel.AutoScroll = true;
            sheetPanel.BackColor = Color.FromArgb(248, 250, 252);
            sheetPanel.Padding = new Padding(8);
            tabSheet.Controls.Add(sheetPanel);

            picSheet = new PictureBox();
            picSheet.Location = new Point(10, 10);
            picSheet.SizeMode = PictureBoxSizeMode.AutoSize;
            sheetPanel.Controls.Add(picSheet);

            pdfSheetViewer = new WebBrowser();
            pdfSheetViewer.Location = new Point(10, 10);
            pdfSheetViewer.Size = new Size(760, 900);
            pdfSheetViewer.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            pdfSheetViewer.ScriptErrorsSuppressed = true;
            pdfSheetViewer.Visible = false;
            sheetPanel.Controls.Add(pdfSheetViewer);

            lblPdfPreviewHint = new Label();
            lblPdfPreviewHint.Location = new Point(10, 10);
            lblPdfPreviewHint.Size = new Size(760, 90);
            lblPdfPreviewHint.AutoSize = false;
            lblPdfPreviewHint.Padding = new Padding(10);
            lblPdfPreviewHint.BackColor = Color.White;
            lblPdfPreviewHint.ForeColor = Color.Black;
            lblPdfPreviewHint.BorderStyle = BorderStyle.FixedSingle;
            lblPdfPreviewHint.Visible = false;
            sheetPanel.Controls.Add(lblPdfPreviewHint);
        }

        private void BuildSearchTab()
        {
            TabPage tabSearch = new TabPage("搜尋");
            rightTabs.TabPages.Add(tabSearch);

            Panel aiPanel = new Panel();
            aiPanel.Dock = DockStyle.Top;
            aiPanel.Height = 285;
            aiPanel.BackColor = Color.White;
            tabSearch.Controls.Add(aiPanel);

            Label lblAiTitle = new Label();
            lblAiTitle.Text = "YouTube / 音訊 AI 轉 MIDI";
            lblAiTitle.AutoSize = true;
            lblAiTitle.Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Bold);
            lblAiTitle.Location = new Point(10, 12);
            aiPanel.Controls.Add(lblAiTitle);

            Label lblUrl = new Label();
            lblUrl.Text = "連結：";
            lblUrl.AutoSize = true;
            lblUrl.Location = new Point(10, 45);
            aiPanel.Controls.Add(lblUrl);

            txtYouTubeUrl = new TextBox();
            txtYouTubeUrl.Location = new Point(58, 41);
            txtYouTubeUrl.Size = new Size(335, 25);
            aiPanel.Controls.Add(txtYouTubeUrl);

            btnSelectYtDlp = CreateNormalButton("yt-dlp", 10, 78, 90, 32);
            btnSelectYtDlp.Click += BtnSelectYtDlp_Click;
            aiPanel.Controls.Add(btnSelectYtDlp);

            btnSelectBasicPitch = CreateNormalButton("Basic Pitch", 108, 78, 120, 32);
            btnSelectBasicPitch.Click += BtnSelectBasicPitch_Click;
            aiPanel.Controls.Add(btnSelectBasicPitch);

            btnSelectDemucs = CreateNormalButton("Demucs", 236, 78, 90, 32);
            btnSelectDemucs.Click += BtnSelectDemucs_Click;
            aiPanel.Controls.Add(btnSelectDemucs);

            btnYoutubeToBlocks = CreateNormalButton("轉方塊", 334, 78, 76, 32);
            btnYoutubeToBlocks.Click += BtnYoutubeToBlocks_Click;
            aiPanel.Controls.Add(btnYoutubeToBlocks);

            Label lblAiMode = new Label();
            lblAiMode.Text = "模式：";
            lblAiMode.AutoSize = true;
            lblAiMode.Location = new Point(10, 122);
            aiPanel.Controls.Add(lblAiMode);

            cmbAiMidiMode = new ComboBox();
            cmbAiMidiMode.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbAiMidiMode.Items.AddRange(new object[]
            {
                "原始音訊（最快但較亂）",
                "旋律清理（推薦 MV）",
                "鋼琴清理（推薦 Piano Cover）",
                "強力降噪（最乾淨但會少音）",
                "Demucs 分離 + 旋律清理（最推薦 MV）",
                "精簡主旋律版",
                "主旋律 + 簡單左手",
                "主旋律 + 分解和弦",
                "PopPiano 風格相似版"
            });
            cmbAiMidiMode.SelectedIndex = 8;
            cmbAiMidiMode.Location = new Point(58, 118);
            cmbAiMidiMode.Size = new Size(250, 28);
            aiPanel.Controls.Add(cmbAiMidiMode);

            btnAiHelp = CreateNormalButton("安裝說明", 318, 116, 90, 30);
            btnAiHelp.Click += delegate { ShowYouTubeToolsRequiredDialog(); };
            aiPanel.Controls.Add(btnAiHelp);

            Label aiTip = new Label();
            aiTip.Text = "說明：PopPiano 風格不是精準扒譜，而是抓主旋律、估和弦與左手型，重新生成比較像鋼琴改編的方塊。僅限你有權使用的音訊。";
            aiTip.AutoSize = false;
            aiTip.Location = new Point(10, 154);
            aiTip.Size = new Size(400, 110);
            aiTip.ForeColor = Color.FromArgb(71, 85, 105);
            aiPanel.Controls.Add(aiTip);

            Panel searchPanel = new Panel();
            searchPanel.Dock = DockStyle.Top;
            searchPanel.Height = 132;
            tabSearch.Controls.Add(searchPanel);

            Label lbl = new Label();
            lbl.Text = "搜尋：";
            lbl.AutoSize = true;
            lbl.Location = new Point(10, 14);
            searchPanel.Controls.Add(lbl);

            txtSearch = new TextBox();
            txtSearch.Width = 230;
            txtSearch.Location = new Point(58, 10);
            txtSearch.Text = "Fur Elise piano sheet";
            searchPanel.Controls.Add(txtSearch);

            Button btnSearch = CreateNormalButton("搜尋", 295, 8, 70, 30);
            btnSearch.Click += BtnSearch_Click;
            searchPanel.Controls.Add(btnSearch);

            Button btnOpenBrowser = CreateNormalButton("外部瀏覽器", 10, 45, 100, 30);
            btnOpenBrowser.Click += BtnOpenBrowser_Click;
            searchPanel.Controls.Add(btnOpenBrowser);

            Button btnFreeClassical = CreateNormalButton("免費古典", 118, 45, 82, 30);
            btnFreeClassical.Click += delegate
            {
                txtSearch.Text = "site:imslp.org piano sheet music";
                SearchSheet(txtSearch.Text);
            };
            searchPanel.Controls.Add(btnFreeClassical);

            Button btnImages = CreateNormalButton("圖片搜尋", 208, 45, 82, 30);
            btnImages.Click += delegate
            {
                OpenExternal("https://www.google.com/search?tbm=isch&q=" + Uri.EscapeDataString(txtSearch.Text + " piano sheet"));
            };
            searchPanel.Controls.Add(btnImages);

            Button btnMusescore = CreateNormalButton("流行搜尋", 298, 45, 82, 30);
            btnMusescore.Click += delegate
            {
                txtSearch.Text = "piano sheet " + txtSearch.Text;
                SearchSheet(txtSearch.Text);
            };
            searchPanel.Controls.Add(btnMusescore);

            Label tip = new Label();
            tip.Text = "說明：古典樂多半可找公版琴譜；流行歌很多是授權付費，因此建議改用上方落下方塊 / 自動彈奏模式。";
            tip.AutoSize = false;
            tip.Location = new Point(10, 84);
            tip.Size = new Size(400, 40);
            searchPanel.Controls.Add(tip);

            webBrowser = new WebBrowser();
            webBrowser.Dock = DockStyle.Fill;
            webBrowser.ScriptErrorsSuppressed = true;
            tabSearch.Controls.Add(webBrowser);
        }

        private void BuildSongTab()
        {
            TabPage tabSong = new TabPage("曲目");
            tabSong.AutoScroll = true;
            rightTabs.TabPages.Add(tabSong);

            Label lblPreset = new Label();
            lblPreset.Text = "曲名 / 預設曲目";
            lblPreset.AutoSize = true;
            lblPreset.Location = new Point(12, 12);
            tabSong.Controls.Add(lblPreset);

            lstSongs = new ListBox();
            lstSongs.Location = new Point(12, 34);
            lstSongs.Size = new Size(410, 155);
            lstSongs.HorizontalScrollbar = true;
            lstSongs.SelectedIndexChanged += LstSongs_SelectedIndexChanged;
            tabSong.Controls.Add(lstSongs);

            lblSongDesc = new Label();
            lblSongDesc.Text = "請選擇一首曲目。";
            lblSongDesc.BorderStyle = BorderStyle.FixedSingle;
            lblSongDesc.AutoSize = false;
            lblSongDesc.Padding = new Padding(8);
            lblSongDesc.Location = new Point(12, 198);
            lblSongDesc.Size = new Size(410, 112);
            tabSong.Controls.Add(lblSongDesc);

            Label lblTempo = new Label();
            lblTempo.Text = "播放 BPM：";
            lblTempo.AutoSize = true;
            lblTempo.Location = new Point(12, 324);
            tabSong.Controls.Add(lblTempo);

            txtPlaybackBpm = new TextBox();
            txtPlaybackBpm.Text = "120";
            txtPlaybackBpm.Location = new Point(95, 319);
            txtPlaybackBpm.Size = new Size(78, 25);
            txtPlaybackBpm.TextChanged += TxtPlaybackBpm_TextChanged;
            tabSong.Controls.Add(txtPlaybackBpm);

            lblPlaybackBpmInfo = new Label();
            lblPlaybackBpmInfo.Text = "基準 120 BPM｜倍率 1.00x";
            lblPlaybackBpmInfo.AutoSize = false;
            lblPlaybackBpmInfo.Location = new Point(184, 323);
            lblPlaybackBpmInfo.Size = new Size(235, 25);
            lblPlaybackBpmInfo.ForeColor = Color.FromArgb(71, 85, 105);
            tabSong.Controls.Add(lblPlaybackBpmInfo);

            btnPlaySong = CreateNormalButton("播放曲目", 12, 358, 95, 34);
            btnPlaySong.Click += BtnPlaySong_Click;
            tabSong.Controls.Add(btnPlaySong);

            btnAddToPlaylist = CreateNormalButton("加入清單", 115, 358, 95, 34);
            btnAddToPlaylist.Click += BtnAddToPlaylist_Click;
            tabSong.Controls.Add(btnAddToPlaylist);

            btnStopSong = CreateNormalButton("停止", 218, 358, 80, 34);
            btnStopSong.Click += BtnStopSong_Click;
            tabSong.Controls.Add(btnStopSong);

            Button btnPreviewRoll = CreateNormalButton("預覽方塊", 306, 358, 110, 34);
            btnPreviewRoll.Click += BtnPreviewRoll_Click;
            tabSong.Controls.Add(btnPreviewRoll);

            btnImportMidi = CreateNormalButton("↥ 匯入 MIDI", 12, 402, 105, 36);
            btnImportMidi.Click += BtnImportMidi_Click;
            tabSong.Controls.Add(btnImportMidi);

            btnImportMusicXml = CreateNormalButton("↥ 匯入 MusicXML", 124, 402, 120, 36);
            btnImportMusicXml.Click += BtnImportMusicXml_Click;
            tabSong.Controls.Add(btnImportMusicXml);

            btnPauseResume = CreateNormalButton("暫停", 252, 402, 52, 36);
            btnPauseResume.Click += BtnPauseResume_Click;
            tabSong.Controls.Add(btnPauseResume);

            btnExportMidi = CreateNormalButton("匯出 MIDI", 312, 402, 104, 36);
            btnExportMidi.Click += BtnExportMidi_Click;
            tabSong.Controls.Add(btnExportMidi);

            lblProgress = new Label();
            lblProgress.Text = "進度：00:00 / 00:00";
            lblProgress.AutoSize = true;
            lblProgress.Location = new Point(12, 450);
            tabSong.Controls.Add(lblProgress);

            trkProgress = new TrackBar();
            trkProgress.Minimum = 0;
            trkProgress.Maximum = 1000;
            trkProgress.Value = 0;
            trkProgress.TickFrequency = 100;
            trkProgress.Location = new Point(12, 475);
            trkProgress.Size = new Size(410, 42);
            trkProgress.Enabled = false;
            trkProgress.MouseDown += TrkProgress_MouseDown;
            trkProgress.MouseUp += TrkProgress_MouseUp;
            trkProgress.Scroll += TrkProgress_Scroll;
            trkProgress.KeyUp += TrkProgress_KeyUp;
            tabSong.Controls.Add(trkProgress);

            playbackProgressTimer = new System.Windows.Forms.Timer();
            playbackProgressTimer.Interval = 120;
            playbackProgressTimer.Tick += PlaybackProgressTimer_Tick;

            Label lblPlaylist = new Label();
            lblPlaylist.Text = "播放清單";
            lblPlaylist.AutoSize = true;
            lblPlaylist.Location = new Point(12, 525);
            tabSong.Controls.Add(lblPlaylist);

            lstPlaylist = new ListBox();
            lstPlaylist.Location = new Point(12, 550);
            lstPlaylist.Size = new Size(410, 140);
            lstPlaylist.HorizontalScrollbar = true;
            tabSong.Controls.Add(lstPlaylist);

            btnPlayPlaylist = CreateNormalButton("▶ 播放清單", 12, 700, 105, 36);
            btnPlayPlaylist.Click += BtnPlayPlaylist_Click;
            tabSong.Controls.Add(btnPlayPlaylist);

            btnRemovePlaylist = CreateNormalButton("✕ 移除", 124, 700, 68, 36);
            btnRemovePlaylist.Click += BtnRemovePlaylist_Click;
            tabSong.Controls.Add(btnRemovePlaylist);

            btnMoveUp = CreateNormalButton("↑ 上移", 200, 700, 68, 36);
            btnMoveUp.Click += BtnMoveUp_Click;
            tabSong.Controls.Add(btnMoveUp);

            btnMoveDown = CreateNormalButton("↓ 下移", 276, 700, 68, 36);
            btnMoveDown.Click += BtnMoveDown_Click;
            tabSong.Controls.Add(btnMoveDown);
        }

        private void BuildRecordMetronomeTab()
        {
            TabPage tab = new TabPage("錄製");
            rightTabs.TabPages.Add(tab);

            GroupBox grpRecord = new GroupBox();
            grpRecord.Text = "錄製";
            grpRecord.Location = new Point(12, 12);
            grpRecord.Size = new Size(395, 282);
            tab.Controls.Add(grpRecord);

            btnRecord = CreateNormalButton("開始錄製", 18, 28, 100, 34);
            btnRecord.Click += BtnRecord_Click;
            grpRecord.Controls.Add(btnRecord);

            btnStopRecord = CreateNormalButton("停止錄製", 128, 28, 100, 34);
            btnStopRecord.Click += BtnStopRecord_Click;
            grpRecord.Controls.Add(btnStopRecord);

            btnPlayRecord = CreateNormalButton("播放錄音", 238, 28, 100, 34);
            btnPlayRecord.Click += BtnPlayRecord_Click;
            grpRecord.Controls.Add(btnPlayRecord);

            btnClearRecord = CreateNormalButton("清除錄音", 18, 74, 100, 34);
            btnClearRecord.Click += BtnClearRecord_Click;
            grpRecord.Controls.Add(btnClearRecord);

            btnAddRecordToPlaylist = CreateNormalButton("錄音加入清單", 128, 74, 120, 34);
            btnAddRecordToPlaylist.Click += BtnAddRecordToPlaylist_Click;
            grpRecord.Controls.Add(btnAddRecordToPlaylist);

            btnSaveRecord = CreateNormalButton("儲存 TXT", 18, 120, 100, 34);
            btnSaveRecord.Click += BtnSaveRecord_Click;
            grpRecord.Controls.Add(btnSaveRecord);

            btnLoadRecord = CreateNormalButton("讀取 TXT", 128, 120, 100, 34);
            btnLoadRecord.Click += BtnLoadRecord_Click;
            grpRecord.Controls.Add(btnLoadRecord);

            lblRecordStatus = new Label();
            lblRecordStatus.Text = "錄音狀態：尚未錄製。";
            lblRecordStatus.AutoSize = false;
            lblRecordStatus.BorderStyle = BorderStyle.FixedSingle;
            lblRecordStatus.Padding = new Padding(8);
            lblRecordStatus.Location = new Point(18, 170);
            lblRecordStatus.Size = new Size(355, 88);
            grpRecord.Controls.Add(lblRecordStatus);

            GroupBox grpMetronome = new GroupBox();
            grpMetronome.Text = "節拍器";
            grpMetronome.Location = new Point(12, 310);
            grpMetronome.Size = new Size(395, 220);
            tab.Controls.Add(grpMetronome);

            Label lblBpm = new Label();
            lblBpm.Text = "BPM：";
            lblBpm.AutoSize = true;
            lblBpm.Location = new Point(18, 35);
            grpMetronome.Controls.Add(lblBpm);

            nudBpm = new NumericUpDown();
            nudBpm.Minimum = 40;
            nudBpm.Maximum = 240;
            nudBpm.Value = 100;
            nudBpm.Location = new Point(70, 31);
            nudBpm.Width = 80;
            grpMetronome.Controls.Add(nudBpm);

            Label lblBeats = new Label();
            lblBeats.Text = "每小節拍數：";
            lblBeats.AutoSize = true;
            lblBeats.Location = new Point(170, 35);
            grpMetronome.Controls.Add(lblBeats);

            nudBeatsPerMeasure = new NumericUpDown();
            nudBeatsPerMeasure.Minimum = 1;
            nudBeatsPerMeasure.Maximum = 12;
            nudBeatsPerMeasure.Value = 4;
            nudBeatsPerMeasure.Location = new Point(265, 31);
            nudBeatsPerMeasure.Width = 65;
            grpMetronome.Controls.Add(nudBeatsPerMeasure);

            btnMetronomeStart = CreateNormalButton("開始節拍器", 18, 75, 110, 34);
            btnMetronomeStart.Click += BtnMetronomeStart_Click;
            grpMetronome.Controls.Add(btnMetronomeStart);

            btnMetronomeStop = CreateNormalButton("停止節拍器", 138, 75, 110, 34);
            btnMetronomeStop.Click += BtnMetronomeStop_Click;
            grpMetronome.Controls.Add(btnMetronomeStop);

            lblMetronomeBeat = new Label();
            lblMetronomeBeat.Text = "節拍：-";
            lblMetronomeBeat.Font = new Font("Microsoft JhengHei UI", 28F, FontStyle.Bold);
            lblMetronomeBeat.ForeColor = Color.FromArgb(40, 40, 40);
            lblMetronomeBeat.AutoSize = false;
            lblMetronomeBeat.TextAlign = ContentAlignment.MiddleCenter;
            lblMetronomeBeat.BorderStyle = BorderStyle.FixedSingle;
            lblMetronomeBeat.Location = new Point(18, 126);
            lblMetronomeBeat.Size = new Size(355, 68);
            grpMetronome.Controls.Add(lblMetronomeBeat);

            metronomeTimer = new System.Windows.Forms.Timer();
            metronomeTimer.Tick += MetronomeTimer_Tick;
        }


        private Button CreateTopButton(string text, int x, int y, int width)
        {
            ModernButton btn = new ModernButton();
            btn.Text = text;
            btn.Width = width;
            btn.Height = 36;
            btn.Location = new Point(x, y);
            btn.Kind = ModernButtonKind.Dark;
            btn.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            btn.Cursor = Cursors.Hand;
            return btn;
        }

        private Button CreateNormalButton(string text, int x, int y, int width, int height)
        {
            ModernButton btn = new ModernButton();
            btn.Text = text;
            btn.Width = width;
            btn.Height = height;
            btn.Location = new Point(x, y);
            btn.Kind = ModernButtonKind.Secondary;
            btn.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
            btn.Cursor = Cursors.Hand;
            return btn;
        }

        private void ApplyEnterpriseRightPanelStyle()
        {
            if (rightTabs == null)
            {
                return;
            }

            rightTabs.BackColor = Color.FromArgb(234, 240, 248);

            foreach (TabPage page in rightTabs.TabPages)
            {
                page.BackColor = Color.FromArgb(241, 245, 250);
                page.Padding = new Padding(10);

                foreach (Control c in page.Controls)
                {
                    if (c is Panel)
                    {
                        c.BackColor = Color.White;
                        c.Padding = new Padding(8);
                    }
                }

                StyleControlTree(page);
            }

            StylePrimaryButton(btnRunOmr);
            StylePrimaryButton(btnPlaySong);
            StylePrimaryButton(btnPlayPlaylist);
            StylePrimaryButton(btnExportMidi);
            StylePrimaryButton(btnOpenSheetPreview);
        }

        private void RightTabs_DrawItem(object sender, DrawItemEventArgs e)
        {
            if (rightTabs == null || e.Index < 0 || e.Index >= rightTabs.TabPages.Count)
            {
                return;
            }

            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle r = e.Bounds;
            bool selected = (e.State & DrawItemState.Selected) == DrawItemState.Selected;

            Color fill = selected ? Color.White : Color.FromArgb(223, 231, 242);
            Color border = selected ? Color.FromArgb(72, 132, 255) : Color.FromArgb(193, 204, 219);
            Color textColor = selected ? Color.FromArgb(23, 37, 84) : Color.FromArgb(71, 85, 105);

            Rectangle tabRect = new Rectangle(r.X + 2, r.Y + 3, r.Width - 4, r.Height - 5);

            using (GraphicsPath path = CreateRoundedRectPath(tabRect, 10))
            using (SolidBrush br = new SolidBrush(fill))
            using (Pen pen = new Pen(border, selected ? 2F : 1F))
            {
                g.FillPath(br, path);
                g.DrawPath(pen, path);
            }

            if (selected)
            {
                using (SolidBrush accent = new SolidBrush(Color.FromArgb(37, 99, 235)))
                {
                    g.FillRectangle(accent, new Rectangle(tabRect.Left + 10, tabRect.Bottom - 3, tabRect.Width - 20, 3));
                }
            }

            TextRenderer.DrawText(
                g,
                rightTabs.TabPages[e.Index].Text,
                new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold),
                tabRect,
                textColor,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }

        private void StyleControlTree(Control parent)
        {
            foreach (Control c in parent.Controls)
            {
                if (c is Panel)
                {
                    c.BackColor = Color.White;
                }
                else if (c is Label)
                {
                    c.ForeColor = Color.FromArgb(71, 85, 105);
                    c.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular);
                }
                else if (c is ListBox)
                {
                    ListBox list = (ListBox)c;
                    list.BackColor = Color.White;
                    list.ForeColor = Color.FromArgb(15, 23, 42);
                    list.BorderStyle = BorderStyle.FixedSingle;
                    list.Font = new Font("Microsoft JhengHei UI", 8.8F);
                    list.IntegralHeight = false;
                }
                else if (c is TextBox)
                {
                    TextBox tb = (TextBox)c;
                    tb.BackColor = Color.White;
                    tb.ForeColor = Color.FromArgb(15, 23, 42);
                    tb.BorderStyle = BorderStyle.FixedSingle;
                }
                else if (c is ComboBox)
                {
                    ComboBox cb = (ComboBox)c;
                    cb.BackColor = Color.White;
                    cb.ForeColor = Color.FromArgb(15, 23, 42);
                    cb.FlatStyle = FlatStyle.Flat;
                }
                else if (c is GroupBox)
                {
                    c.ForeColor = Color.FromArgb(30, 41, 59);
                    c.Font = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold);
                }

                if (c.Controls.Count > 0)
                {
                    StyleControlTree(c);
                }
            }
        }

        private void StylePrimaryButton(Button btn)
        {
            ModernButton mb = btn as ModernButton;
            if (mb != null)
            {
                mb.Kind = ModernButtonKind.Primary;
                mb.Invalidate();
                return;
            }

            if (btn == null)
            {
                return;
            }

            btn.BackColor = Color.FromArgb(37, 99, 235);
            btn.ForeColor = Color.White;
            btn.FlatAppearance.BorderColor = Color.FromArgb(30, 64, 175);
            btn.FlatAppearance.MouseOverBackColor = Color.FromArgb(59, 130, 246);
            btn.FlatAppearance.MouseDownBackColor = Color.FromArgb(29, 78, 216);
        }

        private GraphicsPath CreateRoundedRectPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;

            if (d > rect.Width) d = rect.Width;
            if (d > rect.Height) d = rect.Height;

            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        private enum ModernButtonKind
        {
            Secondary,
            Primary,
            Dark
        }

        private enum ModernIcon
        {
            None,
            Menu,
            Upload,
            Pdf,
            Paste,
            Prev,
            Next,
            Clear,
            Gear,
            Play,
            Split,
            Preview,
            Search,
            Music,
            Record,
            Stop,
            Pause,
            Export,
            Import,
            Plus,
            Up,
            Down,
            Home
        }

        private class ModernButton : Button
        {
            private bool hovered;
            private bool pressed;

            public ModernButtonKind Kind { get; set; }
            public ModernIcon Icon { get; set; }

            public ModernButton()
            {
                FlatStyle = FlatStyle.Flat;
                FlatAppearance.BorderSize = 0;
                TabStop = false;
                Cursor = Cursors.Hand;
                SetStyle(ControlStyles.AllPaintingInWmPaint |
                         ControlStyles.OptimizedDoubleBuffer |
                         ControlStyles.ResizeRedraw |
                         ControlStyles.UserPaint, true);
            }

            protected override void OnMouseEnter(EventArgs e)
            {
                hovered = true;
                Invalidate();
                base.OnMouseEnter(e);
            }

            protected override void OnMouseLeave(EventArgs e)
            {
                hovered = false;
                pressed = false;
                Invalidate();
                base.OnMouseLeave(e);
            }

            protected override void OnMouseDown(MouseEventArgs mevent)
            {
                pressed = true;
                Invalidate();
                base.OnMouseDown(mevent);
            }

            protected override void OnMouseUp(MouseEventArgs mevent)
            {
                pressed = false;
                Invalidate();
                base.OnMouseUp(mevent);
            }

            protected override void OnPaint(PaintEventArgs pevent)
            {
                Graphics g = pevent.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Parent != null ? Parent.BackColor : SystemColors.Control);

                Color fill = Color.White;
                Color border = Color.FromArgb(194, 205, 222);
                Color textColor = Color.FromArgb(30, 41, 59);

                if (Kind == ModernButtonKind.Primary)
                {
                    fill = Color.FromArgb(37, 99, 235);
                    border = Color.FromArgb(30, 64, 175);
                    textColor = Color.White;
                }
                else if (Kind == ModernButtonKind.Dark)
                {
                    fill = Color.FromArgb(48, 57, 73);
                    border = Color.FromArgb(82, 93, 112);
                    textColor = Color.White;
                }

                if (hovered)
                {
                    if (Kind == ModernButtonKind.Primary) fill = Color.FromArgb(59, 130, 246);
                    else if (Kind == ModernButtonKind.Dark) fill = Color.FromArgb(61, 71, 91);
                    else fill = Color.FromArgb(240, 247, 255);
                }

                if (pressed)
                {
                    if (Kind == ModernButtonKind.Primary) fill = Color.FromArgb(29, 78, 216);
                    else if (Kind == ModernButtonKind.Dark) fill = Color.FromArgb(38, 46, 60);
                    else fill = Color.FromArgb(224, 236, 252);
                }

                Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
                using (GraphicsPath path = CreateButtonPath(rect, 10))
                {
                    using (SolidBrush br = new SolidBrush(fill))
                        g.FillPath(br, path);

                    using (Pen pen = new Pen(border, 1.2F))
                        g.DrawPath(pen, path);
                }

                string displayText = CleanButtonText(Text);
                ModernIcon actualIcon = Icon == ModernIcon.None ? GuessIconFromText(Text) : Icon;

                bool iconOnly = string.IsNullOrWhiteSpace(displayText);
                bool drawIcon = actualIcon != ModernIcon.None;
                int iconSize = 16;
                int iconArea = 0;

                // V37：避免小按鈕文字被 icon 擠掉。
                // 如果按鈕太窄，就優先完整顯示文字；只有空白文字或寬度夠時才畫 icon。
                if (drawIcon && !iconOnly)
                {
                    int textWidth = TextRenderer.MeasureText(displayText, Font).Width;
                    drawIcon = Width >= textWidth + 44;
                }

                if (drawIcon)
                {
                    Rectangle iconRect;
                    if (iconOnly)
                    {
                        iconRect = new Rectangle((Width - iconSize) / 2, (Height - iconSize) / 2, iconSize, iconSize);
                    }
                    else
                    {
                        iconRect = new Rectangle(9, (Height - iconSize) / 2, iconSize, iconSize);
                        iconArea = 24;
                    }

                    DrawModernIcon(g, actualIcon, iconRect, textColor);
                }

                Rectangle textRect = new Rectangle(8 + iconArea, 0, Width - 16 - iconArea, Height);
                TextRenderer.DrawText(
                    g,
                    displayText,
                    Font,
                    textRect,
                    textColor,
                    TextFormatFlags.HorizontalCenter |
                    TextFormatFlags.VerticalCenter |
                    TextFormatFlags.EndEllipsis |
                    TextFormatFlags.SingleLine);
            }

            private string CleanButtonText(string text)
            {
                if (string.IsNullOrWhiteSpace(text))
                {
                    return "";
                }

                char[] trimChars = new char[] { '▦', '▤', '⎘', '◀', '▶', '✕', '⚙', '✂', '↗', '▣', '↥', 'Ⅱ', '⇩', '＋', '⏹', '↑', '↓', '☰', '⌂' };
                return text.Trim().TrimStart(trimChars).Trim();
            }

            private ModernIcon GuessIconFromText(string text)
            {
                if (string.IsNullOrWhiteSpace(text)) return ModernIcon.None;
                if (text.Contains("面板") || text.Contains("展開")) return ModernIcon.Menu;
                if (text.Contains("PDF")) return ModernIcon.Pdf;
                if (text.Contains("圖片")) return ModernIcon.Upload;
                if (text.Contains("貼上")) return ModernIcon.Paste;
                if (text.Contains("上頁") || text.Contains("上一頁")) return ModernIcon.Prev;
                if (text.Contains("下頁") || text.Contains("下一頁")) return ModernIcon.Next;
                if (text.Contains("清除") || text.Contains("移除")) return ModernIcon.Clear;
                if (text.Contains("Audiveris") || text.Contains("Poppler")) return ModernIcon.Gear;
                if (text.Contains("辨識") || text.Contains("播放")) return ModernIcon.Play;
                if (text.Contains("拆行")) return ModernIcon.Split;
                if (text.Contains("預覽")) return ModernIcon.Preview;
                if (text.Contains("搜尋")) return ModernIcon.Search;
                if (text.Contains("錄製")) return ModernIcon.Record;
                if (text.Contains("停止") || text.Contains("靜音")) return ModernIcon.Stop;
                if (text.Contains("暫停")) return ModernIcon.Pause;
                if (text.Contains("匯出")) return ModernIcon.Export;
                if (text.Contains("匯入")) return ModernIcon.Import;
                if (text.Contains("加入")) return ModernIcon.Plus;
                if (text.Contains("上移")) return ModernIcon.Up;
                if (text.Contains("下移")) return ModernIcon.Down;
                if (text.Contains("中央")) return ModernIcon.Home;
                return ModernIcon.None;
            }

            private void DrawModernIcon(Graphics g, ModernIcon icon, Rectangle r, Color color)
            {
                using (Pen p = new Pen(color, 2F))
                using (SolidBrush br = new SolidBrush(color))
                {
                    p.StartCap = LineCap.Round;
                    p.EndCap = LineCap.Round;
                    p.LineJoin = LineJoin.Round;

                    int cx = r.Left + r.Width / 2;
                    int cy = r.Top + r.Height / 2;

                    switch (icon)
                    {
                        case ModernIcon.Menu:
                            g.DrawLine(p, r.Left + 2, r.Top + 4, r.Right - 2, r.Top + 4);
                            g.DrawLine(p, r.Left + 2, cy, r.Right - 2, cy);
                            g.DrawLine(p, r.Left + 2, r.Bottom - 4, r.Right - 2, r.Bottom - 4);
                            break;
                        case ModernIcon.Upload:
                        case ModernIcon.Import:
                            g.DrawRectangle(p, r.Left + 3, r.Top + 9, r.Width - 6, r.Height - 6);
                            g.DrawLine(p, cx, r.Top + 2, cx, r.Top + 12);
                            g.DrawLine(p, cx, r.Top + 2, cx - 5, r.Top + 7);
                            g.DrawLine(p, cx, r.Top + 2, cx + 5, r.Top + 7);
                            break;
                        case ModernIcon.Export:
                            g.DrawRectangle(p, r.Left + 3, r.Top + 3, r.Width - 6, r.Height - 9);
                            g.DrawLine(p, cx, r.Top + 8, cx, r.Bottom - 2);
                            g.DrawLine(p, cx, r.Bottom - 2, cx - 5, r.Bottom - 7);
                            g.DrawLine(p, cx, r.Bottom - 2, cx + 5, r.Bottom - 7);
                            break;
                        case ModernIcon.Pdf:
                            g.DrawRectangle(p, r.Left + 4, r.Top + 2, r.Width - 8, r.Height - 4);
                            g.DrawLine(p, r.Right - 7, r.Top + 2, r.Right - 7, r.Top + 7);
                            g.DrawLine(p, r.Right - 7, r.Top + 7, r.Right - 2, r.Top + 7);
                            break;
                        case ModernIcon.Paste:
                            g.DrawRectangle(p, r.Left + 5, r.Top + 5, r.Width - 7, r.Height - 7);
                            g.DrawRectangle(p, r.Left + 2, r.Top + 2, r.Width - 7, r.Height - 7);
                            break;
                        case ModernIcon.Prev:
                            g.DrawLine(p, r.Right - 3, r.Top + 3, r.Left + 4, cy);
                            g.DrawLine(p, r.Left + 4, cy, r.Right - 3, r.Bottom - 3);
                            break;
                        case ModernIcon.Next:
                            g.DrawLine(p, r.Left + 3, r.Top + 3, r.Right - 4, cy);
                            g.DrawLine(p, r.Right - 4, cy, r.Left + 3, r.Bottom - 3);
                            break;
                        case ModernIcon.Clear:
                            g.DrawLine(p, r.Left + 4, r.Top + 4, r.Right - 4, r.Bottom - 4);
                            g.DrawLine(p, r.Right - 4, r.Top + 4, r.Left + 4, r.Bottom - 4);
                            break;
                        case ModernIcon.Gear:
                            g.DrawEllipse(p, r.Left + 4, r.Top + 4, r.Width - 8, r.Height - 8);
                            g.DrawEllipse(p, cx - 3, cy - 3, 6, 6);
                            g.DrawLine(p, cx, r.Top + 1, cx, r.Top + 5);
                            g.DrawLine(p, cx, r.Bottom - 1, cx, r.Bottom - 5);
                            g.DrawLine(p, r.Left + 1, cy, r.Left + 5, cy);
                            g.DrawLine(p, r.Right - 1, cy, r.Right - 5, cy);
                            break;
                        case ModernIcon.Play:
                            Point[] tri = new Point[] { new Point(r.Left + 5, r.Top + 3), new Point(r.Right - 3, cy), new Point(r.Left + 5, r.Bottom - 3) };
                            g.FillPolygon(br, tri);
                            break;
                        case ModernIcon.Split:
                            g.DrawLine(p, r.Left + 2, r.Top + 5, r.Right - 2, r.Top + 5);
                            g.DrawLine(p, r.Left + 2, cy, r.Right - 2, cy);
                            g.DrawLine(p, r.Left + 2, r.Bottom - 5, r.Right - 2, r.Bottom - 5);
                            g.DrawLine(p, cx, r.Top + 2, cx, r.Bottom - 2);
                            break;
                        case ModernIcon.Preview:
                            g.DrawEllipse(p, r.Left + 2, r.Top + 5, r.Width - 4, r.Height - 10);
                            g.FillEllipse(br, cx - 3, cy - 3, 6, 6);
                            break;
                        case ModernIcon.Search:
                            g.DrawEllipse(p, r.Left + 2, r.Top + 2, 10, 10);
                            g.DrawLine(p, r.Left + 11, r.Top + 11, r.Right - 2, r.Bottom - 2);
                            break;
                        case ModernIcon.Music:
                            g.DrawLine(p, r.Right - 6, r.Top + 2, r.Right - 6, r.Bottom - 5);
                            g.DrawLine(p, r.Right - 6, r.Top + 2, r.Left + 6, r.Top + 5);
                            g.FillEllipse(br, r.Left + 2, r.Bottom - 7, 8, 6);
                            g.FillEllipse(br, r.Right - 10, r.Bottom - 7, 8, 6);
                            break;
                        case ModernIcon.Record:
                            g.FillEllipse(br, r.Left + 4, r.Top + 4, r.Width - 8, r.Height - 8);
                            break;
                        case ModernIcon.Stop:
                            g.FillRectangle(br, r.Left + 5, r.Top + 5, r.Width - 10, r.Height - 10);
                            break;
                        case ModernIcon.Pause:
                            g.FillRectangle(br, r.Left + 5, r.Top + 4, 4, r.Height - 8);
                            g.FillRectangle(br, r.Right - 9, r.Top + 4, 4, r.Height - 8);
                            break;
                        case ModernIcon.Plus:
                            g.DrawLine(p, cx, r.Top + 4, cx, r.Bottom - 4);
                            g.DrawLine(p, r.Left + 4, cy, r.Right - 4, cy);
                            break;
                        case ModernIcon.Up:
                            g.DrawLine(p, cx, r.Top + 3, cx, r.Bottom - 3);
                            g.DrawLine(p, cx, r.Top + 3, cx - 5, r.Top + 8);
                            g.DrawLine(p, cx, r.Top + 3, cx + 5, r.Top + 8);
                            break;
                        case ModernIcon.Down:
                            g.DrawLine(p, cx, r.Top + 3, cx, r.Bottom - 3);
                            g.DrawLine(p, cx, r.Bottom - 3, cx - 5, r.Bottom - 8);
                            g.DrawLine(p, cx, r.Bottom - 3, cx + 5, r.Bottom - 8);
                            break;
                        case ModernIcon.Home:
                            g.DrawLine(p, r.Left + 3, cy, cx, r.Top + 3);
                            g.DrawLine(p, cx, r.Top + 3, r.Right - 3, cy);
                            g.DrawRectangle(p, r.Left + 5, cy, r.Width - 10, r.Height / 2 - 2);
                            break;
                    }
                }
            }

            private GraphicsPath CreateButtonPath(Rectangle rect, int radius)
            {
                GraphicsPath path = new GraphicsPath();
                int d = radius * 2;
                path.AddArc(rect.X, rect.Y, d, d, 180, 90);
                path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                path.CloseFigure();
                return path;
            }
        }

        private Icon CreateDesignedAppIcon()
        {
            Bitmap bmp = new Bitmap(64, 64);

            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);

                Rectangle bg = new Rectangle(3, 3, 58, 58);
                using (GraphicsPath path = new GraphicsPath())
                {
                    path.AddArc(bg.X, bg.Y, 12, 12, 180, 90);
                    path.AddArc(bg.Right - 12, bg.Y, 12, 12, 270, 90);
                    path.AddArc(bg.Right - 12, bg.Bottom - 12, 12, 12, 0, 90);
                    path.AddArc(bg.X, bg.Bottom - 12, 12, 12, 90, 90);
                    path.CloseFigure();

                    using (LinearGradientBrush br = new LinearGradientBrush(bg, Color.FromArgb(20, 28, 42), Color.FromArgb(7, 10, 18), 90f))
                    {
                        g.FillPath(br, path);
                    }

                    using (Pen pen = new Pen(Color.FromArgb(210, 220, 185, 90), 2))
                    {
                        g.DrawPath(pen, path);
                    }
                }

                // 紅色琴身牌匾
                Rectangle plate = new Rectangle(11, 11, 42, 14);
                using (LinearGradientBrush br = new LinearGradientBrush(plate, Color.FromArgb(110, 20, 18), Color.FromArgb(65, 5, 6), 90f))
                {
                    g.FillRectangle(br, plate);
                }
                using (Pen p = new Pen(Color.FromArgb(215, 180, 70), 1))
                {
                    g.DrawRectangle(p, plate);
                }

                // 白鍵
                int keyTop = 29;
                int keyH = 25;
                int keyW = 6;
                int startX = 10;

                for (int i = 0; i < 7; i++)
                {
                    Rectangle key = new Rectangle(startX + i * keyW, keyTop, keyW, keyH);
                    using (LinearGradientBrush br = new LinearGradientBrush(key, Color.FromArgb(255, 254, 232), Color.FromArgb(205, 200, 168), 90f))
                    {
                        g.FillRectangle(br, key);
                    }

                    using (Pen p = new Pen(Color.FromArgb(120, 110, 90), 1))
                    {
                        g.DrawRectangle(p, key);
                    }
                }

                // 黑鍵
                int[] blackOffsets = new int[] { 4, 10, 22, 28, 34 };
                foreach (int offset in blackOffsets)
                {
                    Rectangle key = new Rectangle(startX + offset, keyTop, 4, 16);
                    using (LinearGradientBrush br = new LinearGradientBrush(key, Color.FromArgb(70, 70, 70), Color.Black, 90f))
                    {
                        g.FillRectangle(br, key);
                    }
                }

                // 小音符
                using (Pen notePen = new Pen(Color.FromArgb(125, 210, 95), 3))
                using (SolidBrush noteBrush = new SolidBrush(Color.FromArgb(125, 210, 95)))
                {
                    g.DrawLine(notePen, 48, 28, 48, 47);
                    g.FillEllipse(noteBrush, 39, 44, 11, 8);
                    g.DrawArc(notePen, 47, 25, 10, 8, 210, 140);
                }
            }

            return Icon.FromHandle(bmp.GetHicon());
        }

        private void ShowOmrProgressDialog(string status, int total)
        {
            CloseOmrProgressDialog();

            omrProgressDialog = new OmrProgressDialog();
            if (Icon != null)
            {
                omrProgressDialog.Icon = Icon;
            }

            omrProgressDialog.Show(this);
            SetOmrProgress(0, total, status);
        }

        private void CloseOmrProgressDialog()
        {
            try
            {
                if (omrProgressDialog != null)
                {
                    if (!omrProgressDialog.IsDisposed)
                    {
                        omrProgressDialog.Close();
                    }

                    omrProgressDialog.Dispose();
                    omrProgressDialog = null;
                }
            }
            catch
            {
                omrProgressDialog = null;
            }
        }

        private void SetOmrProgress(int current, int total, string status)
        {
            if (InvokeRequired)
            {
                try
                {
                    BeginInvoke(new Action<int, int, string>(SetOmrProgress), current, total, status);
                }
                catch
                {
                }

                return;
            }

            if (lblStatus != null)
            {
                lblStatus.Text = status;
            }

            if (omrProgressDialog != null && !omrProgressDialog.IsDisposed)
            {
                omrProgressDialog.SetProgress(current, total, status);
            }

            Application.DoEvents();
        }

        private void SetStatus(string text)
        {
            if (isClosingForm || IsDisposed || Disposing)
            {
                return;
            }

            if (lblStatus == null)
            {
                return;
            }

            if (lblStatus.InvokeRequired)
            {
                try
                {
                    lblStatus.BeginInvoke(new Action<string>(SetStatus), text);
                }
                catch
                {
                }

                return;
            }

            lblStatus.Text = text;

            if (omrProgressDialog != null && !omrProgressDialog.IsDisposed)
            {
                omrProgressDialog.SetStatusText(text);
            }

            Application.DoEvents();
        }

        private void InitMidi()
        {
            int result = midiOutOpen(out midiOut, MIDI_MAPPER, IntPtr.Zero, IntPtr.Zero, 0);

            if (result == 0)
            {
                midiReady = true;

                InstrumentItem selected = cboInstrument != null ? cboInstrument.SelectedItem as InstrumentItem : null;
                ChangeInstrument(selected != null ? selected.Program : 1);

                // V55：讓 Windows 內建 MIDI 播放比較亮、比較乾淨。
                // 這不是高級音源，但可以改善原本偏悶、偏鈍的感覺。
                SendControlChange(7, 127);   // Channel Volume
                SendControlChange(11, 127);  // Expression
                SendControlChange(64, 0);    // Sustain Off
                SendControlChange(72, 32);   // Release Time：部分 MIDI 裝置支援，讓尾音不要拖太久
                SendControlChange(73, 12);   // Attack Time：部分 MIDI 裝置支援，讓起音更快
                SendControlChange(91, 18);   // Reverb：少量空間感
                SendControlChange(93, 0);    // Chorus Off，避免糊

                lblStatus.Text = "狀態：MIDI 已啟動，可以開始彈奏。";
            }
            else
            {
                midiReady = false;
                lblStatus.Text = "狀態：MIDI 啟動失敗，請確認電腦音效裝置。";
            }
        }

        private void LoadPresetSongs()
        {
            presetSongs = BuildPresetSongs();
            lstSongs.Items.Clear();

            foreach (Song song in presetSongs)
            {
                lstSongs.Items.Add(song);
            }

            if (lstSongs.Items.Count > 0)
            {
                lstSongs.SelectedIndex = 0;
            }
        }

        private void Form1_Shown(object sender, EventArgs e)
        {
            ApplyPianoViewLayout();
            ScrollToMiddleC();
        }

        #endregion

        #region 快捷鍵對應

        private void BuildShortcutMap()
        {
            computerKeyMap.Clear();
            shortcutLabelMap.Clear();

            AddShortcut(Keys.Z, 60, "Z");
            AddShortcut(Keys.S, 61, "S");
            AddShortcut(Keys.X, 62, "X");
            AddShortcut(Keys.D, 63, "D");
            AddShortcut(Keys.C, 64, "C");
            AddShortcut(Keys.V, 65, "V");
            AddShortcut(Keys.G, 66, "G");
            AddShortcut(Keys.B, 67, "B");
            AddShortcut(Keys.H, 68, "H");
            AddShortcut(Keys.N, 69, "N");
            AddShortcut(Keys.J, 70, "J");
            AddShortcut(Keys.M, 71, "M");

            AddShortcut(Keys.Q, 72, "Q");
            AddShortcut(Keys.D2, 73, "2");
            AddShortcut(Keys.W, 74, "W");
            AddShortcut(Keys.D3, 75, "3");
            AddShortcut(Keys.E, 76, "E");
            AddShortcut(Keys.R, 77, "R");
            AddShortcut(Keys.D5, 78, "5");
            AddShortcut(Keys.T, 79, "T");
            AddShortcut(Keys.D6, 80, "6");
            AddShortcut(Keys.Y, 81, "Y");
            AddShortcut(Keys.D7, 82, "7");
            AddShortcut(Keys.U, 83, "U");
        }

        private void AddShortcut(Keys key, int midi, string text)
        {
            computerKeyMap[key] = midi;
            shortcutLabelMap[midi] = text;
        }

        private Dictionary<int, string> BuildDisplayLabels()
        {
            Dictionary<int, string> labels = new Dictionary<int, string>();

            for (int midi = 21; midi <= 108; midi++)
            {
                int note = midi % 12;

                if (shortcutLabelMap.ContainsKey(midi))
                {
                    labels[midi] = NoteName(midi) + Environment.NewLine + shortcutLabelMap[midi];
                }
                else if (note == 0 || midi == 21 || midi == 108)
                {
                    labels[midi] = NoteName(midi);
                }
            }

            return labels;
        }

        private void Form1_KeyDown(object sender, KeyEventArgs e)
        {
            if (ActiveControl is TextBoxBase || ActiveControl is ComboBox || ActiveControl is NumericUpDown)
            {
                return;
            }

            if (e.Control && e.KeyCode == Keys.V)
            {
                PasteClipboardImageAsSheet();
                e.SuppressKeyPress = true;
                return;
            }

            if (!computerKeyMap.ContainsKey(e.KeyCode))
            {
                return;
            }

            if (pressedComputerKeys.Contains(e.KeyCode))
            {
                return;
            }

            pressedComputerKeys.Add(e.KeyCode);
            int midi = computerKeyMap[e.KeyCode];
            StartNote(midi, true);
            e.SuppressKeyPress = true;
        }

        private void Form1_KeyUp(object sender, KeyEventArgs e)
        {
            if (!computerKeyMap.ContainsKey(e.KeyCode))
            {
                return;
            }

            pressedComputerKeys.Remove(e.KeyCode);
            int midi = computerKeyMap[e.KeyCode];
            StopNote(midi, true);
        }

        #endregion

        #region 鋼琴控制事件

        private void PianoControl_NotePressed(int midi)
        {
            Point oldScroll = GetPianoSceneScrollPosition();
            StartNote(midi, true);
            RestorePianoSceneScrollPosition(oldScroll);
        }

        private void PianoControl_NoteReleased(int midi)
        {
            Point oldScroll = GetPianoSceneScrollPosition();
            StopNote(midi, true);
            RestorePianoSceneScrollPosition(oldScroll);
        }

        private Point GetPianoSceneScrollPosition()
        {
            if (pianoScenePanel == null)
            {
                return Point.Empty;
            }

            return new Point(-pianoScenePanel.AutoScrollPosition.X, -pianoScenePanel.AutoScrollPosition.Y);
        }

        private void RestorePianoSceneScrollPosition(Point position)
        {
            if (pianoScenePanel == null || pianoZoomPercent <= 0)
            {
                return;
            }

            if (position.X < 0 || position.Y < 0)
            {
                return;
            }

            pianoScenePanel.AutoScrollPosition = new Point(position.X, position.Y);
        }

        #endregion

        #region 音符播放

        private void StartNote(int midi, bool allowRecord)
        {
            if (!noteHoldCount.ContainsKey(midi))
            {
                noteHoldCount[midi] = 1;
                SendNoteOn(midi, velocity);
                pianoControl.SetPressed(midi, true);

                if (allowRecord)
                {
                    AddRecordedEvent(true, midi, velocity);
                }
            }
            else
            {
                noteHoldCount[midi]++;
            }
        }

        private void StopNote(int midi, bool allowRecord)
        {
            if (!noteHoldCount.ContainsKey(midi))
            {
                return;
            }

            noteHoldCount[midi]--;

            if (noteHoldCount[midi] <= 0)
            {
                noteHoldCount.Remove(midi);
                SendNoteOff(midi);
                pianoControl.SetPressed(midi, false);

                if (allowRecord)
                {
                    AddRecordedEvent(false, midi, 0);
                }
            }
        }

        private void StopAllNotes()
        {
            StopAllNotes(true);
        }

        private void StopAllNotes(bool updateStatus)
        {
            if (midiReady)
            {
                for (int i = 0; i < 128; i++)
                {
                    SendNoteOff(i);
                }

                midiOutReset(midiOut);

                if (chkSustain != null && chkSustain.Checked)
                {
                    SendControlChange(64, 127);
                }
            }

            noteHoldCount.Clear();
            pressedComputerKeys.Clear();

            if (pianoControl != null)
            {
                for (int midi = 21; midi <= 108; midi++)
                {
                    pianoControl.SetPressed(midi, false);
                }
            }

            if (updateStatus && lblStatus != null)
            {
                lblStatus.Text = "狀態：已停止全部聲音。";
            }
        }

        private void SendNoteOn(int midi, int vel)
        {
            if (!midiReady)
            {
                return;
            }

            vel = ApplyBrightVelocityCurve(vel);
            SendMidiMessage(0x90, midi, vel);
        }

        private int ApplyBrightVelocityCurve(int vel)
        {
            if (vel <= 0)
            {
                return 0;
            }

            // V55：Basic Pitch / OMR / MusicXML 有時 velocity 偏小，
            // Windows 內建 MIDI 又偏悶，所以這裡做一點點亮化與最低力度保護。
            int adjusted = (int)Math.Round(vel * 1.10 + 8);
            if (adjusted < 64)
            {
                adjusted = 64;
            }

            if (adjusted > 127)
            {
                adjusted = 127;
            }

            return adjusted;
        }

        private void SendNoteOff(int midi)
        {
            if (!midiReady)
            {
                return;
            }

            SendMidiMessage(0x80, midi, 0);
        }

        private void SendControlChange(int controller, int value)
        {
            if (!midiReady)
            {
                return;
            }

            SendMidiMessage(0xB0, controller, value);
        }

        private void ChangeInstrument(int program)
        {
            if (!midiReady)
            {
                return;
            }

            SendMidiMessage(0xC0, program, 0);
        }

        private void SendMidiMessage(int status, int data1, int data2)
        {
            int message = status | (data1 << 8) | (data2 << 16);
            midiOutShortMsg(midiOut, message);
        }

        private void SendMidiMessageOnChannel(int channelZeroBased, int command, int data1, int data2)
        {
            if (!midiReady)
            {
                return;
            }

            int status = command | channelZeroBased;
            int message = status | (data1 << 8) | (data2 << 16);
            midiOutShortMsg(midiOut, message);
        }

        #endregion

        #region 上方控制列事件

        private void CboInstrument_SelectedIndexChanged(object sender, EventArgs e)
        {
            InstrumentItem item = cboInstrument.SelectedItem as InstrumentItem;
            if (item == null)
            {
                return;
            }

            ChangeInstrument(item.Program);
            lblStatus.Text = "狀態：目前音色 = " + item.Name;
        }

        private void TrkVelocity_Scroll(object sender, EventArgs e)
        {
            velocity = trkVelocity.Value;
            lblStatus.Text = "狀態：力度 / 音量 = " + velocity;
        }

        private void ChkSustain_CheckedChanged(object sender, EventArgs e)
        {
            if (chkSustain.Checked)
            {
                SendControlChange(64, 127);
                lblStatus.Text = "狀態：延音已開啟。";
            }
            else
            {
                SendControlChange(64, 0);
                lblStatus.Text = "狀態：延音已關閉。";
            }
        }

        private void BtnStopAll_Click(object sender, EventArgs e)
        {
            StopAutoPlay();
            pianoRoll.StopPlayback();
            StopAllNotes();
        }

        private void BtnCenterC_Click(object sender, EventArgs e)
        {
            ScrollToMiddleC();
        }

        private void ScrollToMiddleC()
        {
            ApplyPianoViewLayout();

            if (pianoZoomPercent <= 0)
            {
                pianoScenePanel.AutoScrollPosition = new Point(0, 0);
                return;
            }

            int x = pianoControl.GetKeyRect(60).X + pianoControl.Left;
            if (x > 0)
            {
                pianoScenePanel.AutoScrollPosition = new Point(Math.Max(0, x - 320), 0);
            }
        }

        #endregion

        #region 琴譜功能

        private void BtnSplitCurrentRows_Click(object sender, EventArgs e)
        {
            try
            {
                if (currentSheetIndex < 0 || currentSheetIndex >= sheetImages.Count)
                {
                    MessageBox.Show("目前沒有可拆行的琴譜圖片。請先貼上或匯入圖片。");
                    return;
                }

                Bitmap source = new Bitmap(sheetImages[currentSheetIndex]);
                List<Bitmap> rows = SplitIntoStaffRows(source);
                source.Dispose();

                if (rows.Count <= 1)
                {
                    MessageBox.Show("這張圖片沒有偵測到可拆分的多行大譜表。\r\n\r\n建議：截圖解析度放大一點、保持白底黑譜、不要截太斜。");
                    foreach (Bitmap b in rows) b.Dispose();
                    return;
                }

                ReplaceCurrentSheetWithSplitPages(rows);
                lblStatus.Text = "狀態：已把目前頁拆成 " + rows.Count + " 行辨識片段。";
            }
            catch (Exception ex)
            {
                MessageBox.Show("目前頁拆行失敗：" + ex.Message);
            }
        }

        private void BtnSplitAllRows_Click(object sender, EventArgs e)
        {
            try
            {
                if (sheetImages.Count == 0)
                {
                    MessageBox.Show("目前沒有可拆行的琴譜圖片。請先貼上或匯入圖片。");
                    return;
                }

                List<Image> newImages = new List<Image>();
                List<string> newPaths = new List<string>();
                int sourceCount = sheetImages.Count;
                int totalRows = 0;

                for (int i = 0; i < sheetImages.Count; i++)
                {
                    Bitmap source = new Bitmap(sheetImages[i]);
                    List<Bitmap> rows = SplitIntoStaffRows(source);
                    source.Dispose();

                    if (rows.Count == 0)
                    {
                        Bitmap copy = new Bitmap(sheetImages[i]);
                        rows.Add(copy);
                    }

                    totalRows += rows.Count;

                    foreach (Bitmap row in rows)
                    {
                        string path = SaveSheetBitmapToTemp(row, "staff_row_");
                        newImages.Add(row);
                        newPaths.Add(path);
                    }
                }

                ClearSheetImages(false);
                sheetImages = newImages;
                sheetFilePaths = newPaths;
                currentSheetIndex = sheetImages.Count > 0 ? 0 : -1;
                currentSheetInputPath = sheetFilePaths.Count > 0 ? sheetFilePaths[0] : "";
                ShowCurrentSheetPage();

                lblStatus.Text = "狀態：已將 " + sourceCount + " 張圖片拆成 " + totalRows + " 行辨識片段。";
                MessageBox.Show("完成！\r\n\r\n已自動拆成 " + totalRows + " 行辨識片段。\r\n接下來請按「辨識全部頁面」。");
            }
            catch (Exception ex)
            {
                MessageBox.Show("全部自動拆行失敗：" + ex.Message);
            }
        }

        private void BtnSplitCurrentPage_Click(object sender, EventArgs e)
        {
            try
            {
                if (currentSheetIndex < 0 || currentSheetIndex >= sheetImages.Count)
                {
                    MessageBox.Show("目前沒有可切分的琴譜圖片。請先貼上或匯入雙頁截圖。");
                    return;
                }

                Bitmap source = new Bitmap(sheetImages[currentSheetIndex]);
                List<Bitmap> splitPages = SplitDoublePageBitmap(source);
                source.Dispose();

                if (splitPages.Count < 2)
                {
                    MessageBox.Show("這張圖片看起來不像左右雙頁，或無法安全切分。\r\n\r\n建議：截圖時讓左右兩頁都完整、置中，四周保留一點白邊。");
                    return;
                }

                ReplaceCurrentSheetWithSplitPages(splitPages);
                lblStatus.Text = "狀態：已把目前雙頁截圖切成左右兩頁。";
            }
            catch (Exception ex)
            {
                MessageBox.Show("左右切頁失敗：" + ex.Message);
            }
        }

        private void BtnSplitAllPages_Click(object sender, EventArgs e)
        {
            try
            {
                if (sheetImages.Count == 0)
                {
                    MessageBox.Show("目前沒有可切分的琴譜圖片。請先貼上或匯入雙頁截圖。");
                    return;
                }

                List<Image> newImages = new List<Image>();
                List<string> newPaths = new List<string>();
                int splitCount = 0;

                for (int i = 0; i < sheetImages.Count; i++)
                {
                    Bitmap source = new Bitmap(sheetImages[i]);
                    List<Bitmap> pages = SplitDoublePageBitmap(source);
                    source.Dispose();

                    if (pages.Count >= 2)
                    {
                        splitCount++;
                        foreach (Bitmap page in pages)
                        {
                            string path = SaveSheetBitmapToTemp(page, "split_page_");
                            newImages.Add(page);
                            newPaths.Add(path);
                        }
                    }
                    else
                    {
                        Bitmap copy = new Bitmap(sheetImages[i]);
                        string path = SaveSheetBitmapToTemp(copy, "single_page_");
                        newImages.Add(copy);
                        newPaths.Add(path);
                    }
                }

                ClearSheetImages(false);
                sheetImages = newImages;
                sheetFilePaths = newPaths;
                currentSheetIndex = sheetImages.Count > 0 ? 0 : -1;
                currentSheetInputPath = sheetFilePaths.Count > 0 ? sheetFilePaths[0] : "";
                ShowCurrentSheetPage();

                lblStatus.Text = "狀態：已處理全部圖片，切開 " + splitCount + " 張雙頁截圖，目前共 " + sheetImages.Count + " 頁。";
                MessageBox.Show("完成！\r\n\r\n已切開 " + splitCount + " 張雙頁截圖。\r\n目前總頁數：" + sheetImages.Count + "\r\n\r\n接下來請按「辨識全部頁面」。");
            }
            catch (Exception ex)
            {
                MessageBox.Show("全部左右切頁失敗：" + ex.Message);
            }
        }

        private void BtnSplitAllFourPages_Click(object sender, EventArgs e)
        {
            try
            {
                if (sheetImages.Count == 0)
                {
                    MessageBox.Show("目前沒有可四分切的琴譜圖片。請先貼上或匯入雙頁截圖。");
                    return;
                }

                List<Image> newImages = new List<Image>();
                List<string> newPaths = new List<string>();
                int processedCount = 0;

                for (int i = 0; i < sheetImages.Count; i++)
                {
                    Bitmap source = new Bitmap(sheetImages[i]);
                    List<Bitmap> pieces = SplitIntoReadablePieces(source);
                    source.Dispose();

                    if (pieces.Count > 1)
                    {
                        processedCount++;
                    }

                    foreach (Bitmap piece in pieces)
                    {
                        string path = SaveSheetBitmapToTemp(piece, "four_split_page_");
                        newImages.Add(piece);
                        newPaths.Add(path);
                    }
                }

                ClearSheetImages(false);
                sheetImages = newImages;
                sheetFilePaths = newPaths;
                currentSheetIndex = sheetImages.Count > 0 ? 0 : -1;
                currentSheetInputPath = sheetFilePaths.Count > 0 ? sheetFilePaths[0] : "";
                ShowCurrentSheetPage();

                lblStatus.Text = "狀態：已四分切處理 " + processedCount + " 張圖片，目前共 " + sheetImages.Count + " 張可辨識片段。";
                MessageBox.Show("完成！\r\n\r\n已把圖片切成較大的辨識片段。\r\n目前總片段數：" + sheetImages.Count + "\r\n\r\n接下來請按「辨識全部頁面」。");
            }
            catch (Exception ex)
            {
                MessageBox.Show("全部四分切頁失敗：" + ex.Message);
            }
        }

        private void ReplaceCurrentSheetWithSplitPages(List<Bitmap> splitPages)
        {
            int index = currentSheetIndex;

            if (index < 0 || index >= sheetImages.Count)
            {
                return;
            }

            if (picSheet.Image == sheetImages[index])
            {
                picSheet.Image = null;
            }

            sheetImages[index].Dispose();
            sheetImages.RemoveAt(index);

            if (index < sheetFilePaths.Count)
            {
                sheetFilePaths.RemoveAt(index);
            }

            for (int i = splitPages.Count - 1; i >= 0; i--)
            {
                Bitmap page = splitPages[i];
                string path = SaveSheetBitmapToTemp(page, "split_page_");
                sheetImages.Insert(index, page);
                sheetFilePaths.Insert(index, path);
            }

            currentSheetIndex = index;
            currentSheetInputPath = sheetFilePaths[index];
            ShowCurrentSheetPage();
        }

        private List<Bitmap> SplitIntoStaffRows(Bitmap original)
        {
            List<Bitmap> result = new List<Bitmap>();

            Rectangle allContent = FindNonWhiteBounds(original, 246);
            if (allContent.Width <= 0 || allContent.Height <= 0)
            {
                return result;
            }

            Rectangle expanded = ExpandRect(allContent, 18, original.Width, original.Height);
            Bitmap cropped = CropBitmap(original, expanded);

            List<Bitmap> pages = new List<Bitmap>();

            // 若是雙頁截圖，先拆成左頁、右頁；單頁就直接拆行。
            if (cropped.Width >= cropped.Height * 1.08)
            {
                List<Bitmap> splitPages = SplitDoublePageBitmap(cropped);
                if (splitPages.Count >= 2)
                {
                    pages.AddRange(splitPages);
                    cropped.Dispose();
                }
                else
                {
                    pages.Add(cropped);
                }
            }
            else
            {
                pages.Add(cropped);
            }

            foreach (Bitmap page in pages)
            {
                List<Bitmap> rows = SplitSinglePageIntoStaffRows(page);
                page.Dispose();

                if (rows.Count > 0)
                {
                    result.AddRange(rows);
                }
            }

            return result;
        }

        private List<Bitmap> GroupRowsForFastOmr(List<Bitmap> rows, int rowsPerGroup)
        {
            List<Bitmap> grouped = new List<Bitmap>();

            if (rows == null || rows.Count == 0)
            {
                return grouped;
            }

            if (rows.Count <= 3 || rowsPerGroup <= 1)
            {
                return rows;
            }

            for (int i = 0; i < rows.Count; i += rowsPerGroup)
            {
                List<Bitmap> part = new List<Bitmap>();

                for (int j = 0; j < rowsPerGroup && i + j < rows.Count; j++)
                {
                    part.Add(rows[i + j]);
                }

                Bitmap merged = CombineBitmapsVertical(part, 36);
                grouped.Add(merged);

                foreach (Bitmap b in part)
                {
                    b.Dispose();
                }
            }

            return grouped;
        }

        private Bitmap CombineBitmapsVertical(List<Bitmap> bitmaps, int gap)
        {
            if (bitmaps == null || bitmaps.Count == 0)
            {
                return new Bitmap(1, 1);
            }

            if (bitmaps.Count == 1)
            {
                return new Bitmap(bitmaps[0]);
            }

            int width = bitmaps.Max(b => b.Width);
            int height = bitmaps.Sum(b => b.Height) + gap * (bitmaps.Count - 1);

            Bitmap result = new Bitmap(width, height);
            result.SetResolution(300, 300);

            using (Graphics g = Graphics.FromImage(result))
            {
                g.Clear(Color.White);
                g.CompositingQuality = CompositingQuality.HighQuality;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                int y = 0;
                foreach (Bitmap b in bitmaps)
                {
                    int x = Math.Max(0, (width - b.Width) / 2);
                    g.DrawImage(b, x, y, b.Width, b.Height);
                    y += b.Height + gap;
                }
            }

            return result;
        }

        private List<Bitmap> SplitSinglePageIntoStaffRows(Bitmap page)
        {
            List<Bitmap> result = new List<Bitmap>();
            Bitmap trimmed = TrimWhiteMarginBitmap(page, 246, 24);

            int width = trimmed.Width;
            int height = trimmed.Height;

            if (width < 100 || height < 120)
            {
                result.Add(trimmed);
                return result;
            }

            int[] darkCount = new int[height];

            for (int y = 0; y < height; y++)
            {
                int count = 0;
                for (int x = 0; x < width; x += 2)
                {
                    Color c = trimmed.GetPixel(x, y);
                    int gray = (int)(c.R * 0.299 + c.G * 0.587 + c.B * 0.114);
                    if (gray < 225)
                    {
                        count++;
                    }
                }
                darkCount[y] = count;
            }

            int window = Math.Max(5, height / 350);
            int[] smooth = new int[height];

            for (int y = 0; y < height; y++)
            {
                int from = Math.Max(0, y - window);
                int to = Math.Min(height - 1, y + window);
                int sum = 0;
                for (int k = from; k <= to; k++)
                {
                    sum += darkCount[k];
                }
                smooth[y] = sum / Math.Max(1, to - from + 1);
            }

            int threshold = Math.Max(8, width / 180);
            bool[] hasInk = new bool[height];
            for (int y = 0; y < height; y++)
            {
                hasInk[y] = smooth[y] >= threshold;
            }

            // 先找所有有墨跡的水平帶，再把同一組鋼琴大譜表內的帶合併。
            List<Rectangle> rawBands = new List<Rectangle>();
            int start = -1;
            for (int y = 0; y < height; y++)
            {
                if (hasInk[y] && start < 0)
                {
                    start = y;
                }
                else if (!hasInk[y] && start >= 0)
                {
                    int end = y - 1;
                    if (end - start >= 2)
                    {
                        rawBands.Add(new Rectangle(0, start, width, end - start + 1));
                    }
                    start = -1;
                }
            }

            if (start >= 0)
            {
                rawBands.Add(new Rectangle(0, start, width, height - start));
            }

            if (rawBands.Count == 0)
            {
                result.Add(trimmed);
                return result;
            }

            List<Rectangle> systems = new List<Rectangle>();
            int gapLimit = Math.Max(55, height / 38);
            int minSystemHeight = Math.Max(70, height / 18);

            int sysTop = rawBands[0].Top;
            int sysBottom = rawBands[0].Bottom;

            for (int i = 1; i < rawBands.Count; i++)
            {
                Rectangle band = rawBands[i];
                int gap = band.Top - sysBottom;

                if (gap <= gapLimit)
                {
                    sysBottom = Math.Max(sysBottom, band.Bottom);
                }
                else
                {
                    if (sysBottom - sysTop >= minSystemHeight)
                    {
                        systems.Add(Rectangle.FromLTRB(0, sysTop, width, sysBottom));
                    }

                    sysTop = band.Top;
                    sysBottom = band.Bottom;
                }
            }

            if (sysBottom - sysTop >= minSystemHeight)
            {
                systems.Add(Rectangle.FromLTRB(0, sysTop, width, sysBottom));
            }

            if (systems.Count <= 1)
            {
                result.Add(trimmed);
                return result;
            }

            int marginY = Math.Max(60, height / 45); // 準確優先：多保留上下空間，避免切掉右手旋律、加線、連音線
            int marginX = Math.Max(28, width / 80);

            foreach (Rectangle system in systems)
            {
                Rectangle r = ExpandRect(system, marginY, width, height);
                r = Rectangle.FromLTRB(Math.Max(0, r.Left - marginX), r.Top, Math.Min(width, r.Right + marginX), r.Bottom);

                if (r.Width < 120 || r.Height < 80)
                {
                    continue;
                }

                Bitmap row = CropBitmap(trimmed, r);

                // V29：不要再對切好的行做第二次白邊裁切。
                // 有些密集譜的右手旋律、加線或最上方音符會被二次裁切吃掉，導致整段漏音。
                if (row.Width > 120 && row.Height > 80)
                {
                    result.Add(row);
                }
                else
                {
                    row.Dispose();
                }
            }

            trimmed.Dispose();

            if (result.Count == 0)
            {
                result.Add(new Bitmap(page));
            }

            return result;
        }

        private List<Bitmap> SplitDoublePageBitmap(Bitmap original)
        {
            List<Bitmap> result = new List<Bitmap>();

            Rectangle allContent = FindNonWhiteBounds(original, 246);
            if (allContent.Width <= 0 || allContent.Height <= 0)
            {
                return result;
            }

            Rectangle expanded = ExpandRect(allContent, 18, original.Width, original.Height);
            Bitmap cropped = CropBitmap(original, expanded);

            // 一般單頁直式琴譜通常高度大於寬度；雙頁截圖通常寬度明顯大於高度。
            // 若寬度沒有足夠大，為了避免把單頁誤切，直接返回空結果。
            if (cropped.Width < cropped.Height * 1.10)
            {
                cropped.Dispose();
                return result;
            }

            int splitX = FindBestVerticalSplit(cropped);
            if (splitX < cropped.Width * 0.30 || splitX > cropped.Width * 0.70)
            {
                splitX = cropped.Width / 2;
            }

            Rectangle leftRect = new Rectangle(0, 0, splitX, cropped.Height);
            Rectangle rightRect = new Rectangle(splitX, 0, cropped.Width - splitX, cropped.Height);

            Bitmap leftRaw = CropBitmap(cropped, leftRect);
            Bitmap rightRaw = CropBitmap(cropped, rightRect);
            cropped.Dispose();

            Bitmap left = TrimWhiteMarginBitmap(leftRaw, 246, 20);
            Bitmap right = TrimWhiteMarginBitmap(rightRaw, 246, 20);
            leftRaw.Dispose();
            rightRaw.Dispose();

            if (left.Width > 60 && left.Height > 60)
            {
                result.Add(left);
            }
            else
            {
                left.Dispose();
            }

            if (right.Width > 60 && right.Height > 60)
            {
                result.Add(right);
            }
            else
            {
                right.Dispose();
            }

            return result;
        }

        private List<Bitmap> SplitIntoReadablePieces(Bitmap original)
        {
            List<Bitmap> result = new List<Bitmap>();

            Rectangle allContent = FindNonWhiteBounds(original, 246);
            if (allContent.Width <= 0 || allContent.Height <= 0)
            {
                return result;
            }

            Rectangle expanded = ExpandRect(allContent, 18, original.Width, original.Height);
            Bitmap cropped = CropBitmap(original, expanded);

            List<Bitmap> pageCandidates = new List<Bitmap>();

            // 如果是左右雙頁，先切成左頁、右頁；如果是單頁，直接用整頁。
            if (cropped.Width >= cropped.Height * 1.08)
            {
                List<Bitmap> leftRight = SplitDoublePageBitmap(cropped);
                if (leftRight.Count >= 2)
                {
                    pageCandidates.AddRange(leftRight);
                    cropped.Dispose();
                }
                else
                {
                    pageCandidates.Add(cropped);
                }
            }
            else
            {
                pageCandidates.Add(cropped);
            }

            // 每一頁再依照中間附近的空白區切成上半、下半，避免整頁太小。
            foreach (Bitmap page in pageCandidates)
            {
                List<Bitmap> topBottom = SplitSinglePageTopBottom(page);
                page.Dispose();

                if (topBottom.Count >= 2)
                {
                    result.AddRange(topBottom);
                }
                else
                {
                    foreach (Bitmap b in topBottom)
                    {
                        result.Add(b);
                    }
                }
            }

            return result;
        }

        private List<Bitmap> SplitSinglePageTopBottom(Bitmap page)
        {
            List<Bitmap> result = new List<Bitmap>();

            Bitmap trimmed = TrimWhiteMarginBitmap(page, 246, 18);

            if (trimmed.Height < 500)
            {
                result.Add(trimmed);
                return result;
            }

            int splitY = FindBestHorizontalSplit(trimmed);

            if (splitY < trimmed.Height * 0.28 || splitY > trimmed.Height * 0.72)
            {
                splitY = trimmed.Height / 2;
            }

            Rectangle topRect = new Rectangle(0, 0, trimmed.Width, splitY);
            Rectangle bottomRect = new Rectangle(0, splitY, trimmed.Width, trimmed.Height - splitY);

            Bitmap topRaw = CropBitmap(trimmed, topRect);
            Bitmap bottomRaw = CropBitmap(trimmed, bottomRect);
            trimmed.Dispose();

            Bitmap top = TrimWhiteMarginBitmap(topRaw, 246, 22);
            Bitmap bottom = TrimWhiteMarginBitmap(bottomRaw, 246, 22);
            topRaw.Dispose();
            bottomRaw.Dispose();

            if (top.Width > 80 && top.Height > 80)
            {
                result.Add(top);
            }
            else
            {
                top.Dispose();
            }

            if (bottom.Width > 80 && bottom.Height > 80)
            {
                result.Add(bottom);
            }
            else
            {
                bottom.Dispose();
            }

            if (result.Count == 0)
            {
                result.Add(new Bitmap(page));
            }

            return result;
        }

        private int FindBestHorizontalSplit(Bitmap bmp)
        {
            int startY = (int)(bmp.Height * 0.35);
            int endY = (int)(bmp.Height * 0.65);
            int bestY = bmp.Height / 2;
            long bestScore = long.MaxValue;

            for (int y = startY; y <= endY; y++)
            {
                long score = 0;
                int band = 6;

                for (int dy = -band; dy <= band; dy++)
                {
                    int py = y + dy;
                    if (py < 0 || py >= bmp.Height)
                    {
                        continue;
                    }

                    for (int x = 0; x < bmp.Width; x += 3)
                    {
                        Color c = bmp.GetPixel(x, py);
                        int darkness = 765 - c.R - c.G - c.B;
                        if (darkness > 45)
                        {
                            score += darkness;
                        }
                    }
                }

                // 偏好接近中間的大片空白，盡量不要切到五線譜或音符。
                score += Math.Abs(y - bmp.Height / 2) * 20;

                if (score < bestScore)
                {
                    bestScore = score;
                    bestY = y;
                }
            }

            return bestY;
        }

        private int FindBestVerticalSplit(Bitmap bmp)
        {
            int startX = (int)(bmp.Width * 0.38);
            int endX = (int)(bmp.Width * 0.62);
            int bestX = bmp.Width / 2;
            long bestScore = long.MaxValue;

            for (int x = startX; x <= endX; x++)
            {
                long score = 0;
                int band = 5;

                for (int dx = -band; dx <= band; dx++)
                {
                    int px = x + dx;
                    if (px < 0 || px >= bmp.Width)
                    {
                        continue;
                    }

                    for (int y = 0; y < bmp.Height; y += 3)
                    {
                        Color c = bmp.GetPixel(px, y);
                        int darkness = 765 - c.R - c.G - c.B;
                        if (darkness > 45)
                        {
                            score += darkness;
                        }
                    }
                }

                // 稍微偏好中間，避免切到左右頁內部的大空白。
                score += Math.Abs(x - bmp.Width / 2) * 25;

                if (score < bestScore)
                {
                    bestScore = score;
                    bestX = x;
                }
            }

            return bestX;
        }

        private Bitmap TrimWhiteMarginBitmap(Bitmap source, int whiteThreshold, int margin)
        {
            Rectangle bounds = FindNonWhiteBounds(source, whiteThreshold);
            if (bounds.Width <= 0 || bounds.Height <= 0)
            {
                return new Bitmap(source);
            }

            Rectangle expanded = ExpandRect(bounds, margin, source.Width, source.Height);
            return CropBitmap(source, expanded);
        }

        private Rectangle FindNonWhiteBounds(Bitmap bmp, int whiteThreshold)
        {
            int minX = bmp.Width;
            int minY = bmp.Height;
            int maxX = -1;
            int maxY = -1;

            for (int y = 0; y < bmp.Height; y += 2)
            {
                for (int x = 0; x < bmp.Width; x += 2)
                {
                    Color c = bmp.GetPixel(x, y);
                    bool nonWhite = c.R < whiteThreshold || c.G < whiteThreshold || c.B < whiteThreshold;

                    if (nonWhite)
                    {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < minX || maxY < minY)
            {
                return Rectangle.Empty;
            }

            return Rectangle.FromLTRB(minX, minY, Math.Min(maxX + 2, bmp.Width), Math.Min(maxY + 2, bmp.Height));
        }

        private Rectangle ExpandRect(Rectangle rect, int margin, int maxWidth, int maxHeight)
        {
            int x = Math.Max(0, rect.X - margin);
            int y = Math.Max(0, rect.Y - margin);
            int right = Math.Min(maxWidth, rect.Right + margin);
            int bottom = Math.Min(maxHeight, rect.Bottom + margin);
            return Rectangle.FromLTRB(x, y, right, bottom);
        }

        private Bitmap CropBitmap(Bitmap source, Rectangle rect)
        {
            Bitmap cropped = new Bitmap(rect.Width, rect.Height);

            using (Graphics g = Graphics.FromImage(cropped))
            {
                g.Clear(Color.White);
                g.DrawImage(source, new Rectangle(0, 0, rect.Width, rect.Height), rect, GraphicsUnit.Pixel);
            }

            return cropped;
        }

        private string SaveSheetBitmapToTemp(Bitmap bitmap, string prefix)
        {
            string folder = Path.Combine(Path.GetTempPath(), "PianoSheetScreenshots");
            Directory.CreateDirectory(folder);
            string filePath = Path.Combine(folder, prefix + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff") + "_" + Guid.NewGuid().ToString("N").Substring(0, 6) + ".png");
            bitmap.Save(filePath, System.Drawing.Imaging.ImageFormat.Png);
            return filePath;
        }

        private string PrepareRowImageForAudiveris(string inputPath, int rowNumber)
        {
            string ext = Path.GetExtension(inputPath).ToLower();

            if (ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".bmp" && ext != ".gif")
            {
                return inputPath;
            }

            using (Bitmap original = new Bitmap(inputPath))
            {
                Bitmap cropped = null;
                Bitmap resized = null;
                Bitmap bw = null;

                try
                {
                    cropped = TrimWhiteMarginBitmap(original, 248, 18);

                    // V29 準確優先：單行解析度提高一些，讓密集和弦、加線、臨時升降記號比較不會漏。
                    double scaleW = 3600.0 / Math.Max(1, cropped.Width);
                    double scaleH = 1200.0 / Math.Max(1, cropped.Height);
                    double scale = Math.Max(scaleW, scaleH);

                    if (scale < 1.0)
                    {
                        scale = 1.0;
                    }

                    if (scale > 2.5)
                    {
                        scale = 2.5;
                    }

                    int newW = Math.Max(1, (int)Math.Round(cropped.Width * scale));
                    int newH = Math.Max(1, (int)Math.Round(cropped.Height * scale));

                    resized = new Bitmap(newW, newH);
                    resized.SetResolution(300, 300);

                    using (Graphics g = Graphics.FromImage(resized))
                    {
                        g.Clear(Color.White);
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.DrawImage(cropped, new Rectangle(0, 0, newW, newH));
                    }

                    bw = ConvertToBlackWhite(resized, 225);
                    bw.SetResolution(300, 300);

                    string folder = Path.Combine(Path.GetTempPath(), "PianoSheetScreenshots", "PreprocessedRowsForAudiveris");
                    Directory.CreateDirectory(folder);

                    string filePath = Path.Combine(
                        folder,
                        "omr_row_" + rowNumber.ToString("000") + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff") + ".png");

                    bw.Save(filePath, System.Drawing.Imaging.ImageFormat.Png);
                    return filePath;
                }
                finally
                {
                    if (cropped != null) cropped.Dispose();
                    if (resized != null) resized.Dispose();
                    if (bw != null) bw.Dispose();
                }
            }
        }

        private string PrepareImageForAudiveris(string inputPath, int pageNumber)
        {
            string ext = Path.GetExtension(inputPath).ToLower();

            // PDF 直接交給 Audiveris，不做圖片預處理。
            if (ext == ".pdf")
            {
                return inputPath;
            }

            if (ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".bmp" && ext != ".gif")
            {
                return inputPath;
            }

            using (Bitmap original = new Bitmap(inputPath))
            {
                Bitmap working = null;
                Bitmap cropped = null;
                Bitmap enlarged = null;
                Bitmap bw = null;

                try
                {
                    working = new Bitmap(original);

                    // 先裁掉大白邊，讓五線譜本身在 Audiveris 裡變大。
                    cropped = TrimWhiteMarginBitmap(working, 248, 35);

                    // Audiveris 對解析度很敏感。截圖切半後常太小，所以這裡自動放大。
                    // 目標：單頁至少約 2600px 寬或 3400px 高，太大則不再放大。
                    double scaleW = 2600.0 / Math.Max(1, cropped.Width);
                    double scaleH = 3400.0 / Math.Max(1, cropped.Height);
                    double scale = Math.Max(scaleW, scaleH);

                    if (scale < 1.0)
                    {
                        scale = 1.0;
                    }

                    if (scale > 4.0)
                    {
                        scale = 4.0;
                    }

                    int newW = Math.Max(1, (int)Math.Round(cropped.Width * scale));
                    int newH = Math.Max(1, (int)Math.Round(cropped.Height * scale));

                    enlarged = new Bitmap(newW, newH);
                    enlarged.SetResolution(300, 300);

                    using (Graphics g = Graphics.FromImage(enlarged))
                    {
                        g.Clear(Color.White);
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.DrawImage(cropped, new Rectangle(0, 0, newW, newH));
                    }

                    // 黑白化可以讓 staff line 與 note head 更清楚。
                    // 如果你的譜很淡，可把 threshold 從 215 調高到 225；如果雜點太多，可調低到 200。
                    bw = ConvertToBlackWhite(enlarged, 215);
                    bw.SetResolution(300, 300);

                    string folder = Path.Combine(Path.GetTempPath(), "PianoSheetScreenshots", "PreprocessedForAudiveris");
                    Directory.CreateDirectory(folder);

                    string filePath = Path.Combine(
                        folder,
                        "omr_page_" + pageNumber.ToString("000") + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff") + ".png");

                    bw.Save(filePath, System.Drawing.Imaging.ImageFormat.Png);
                    return filePath;
                }
                finally
                {
                    if (bw != null) bw.Dispose();
                    if (enlarged != null) enlarged.Dispose();
                    if (cropped != null) cropped.Dispose();
                    if (working != null) working.Dispose();
                }
            }
        }

        private Bitmap ConvertToBlackWhite(Bitmap source, int threshold)
        {
            Bitmap output = new Bitmap(source.Width, source.Height);

            using (Graphics g = Graphics.FromImage(output))
            {
                g.Clear(Color.White);
            }

            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    Color c = source.GetPixel(x, y);
                    int gray = (int)(c.R * 0.299 + c.G * 0.587 + c.B * 0.114);

                    if (gray < threshold)
                    {
                        output.SetPixel(x, y, Color.Black);
                    }
                    else
                    {
                        output.SetPixel(x, y, Color.White);
                    }
                }
            }

            return output;
        }

        private void BtnPasteShot_Click(object sender, EventArgs e)
        {
            PasteClipboardImageAsSheet();
        }

        private void PasteClipboardImageAsSheet()
        {
            try
            {
                if (!Clipboard.ContainsImage())
                {
                    MessageBox.Show("剪貼簿目前沒有圖片。請先按 Win + Shift + S 截圖，截完後回到程式按 Ctrl + V 或按「貼上截圖」。");
                    return;
                }

                Image clipImage = Clipboard.GetImage();
                if (clipImage == null)
                {
                    MessageBox.Show("無法讀取剪貼簿圖片，請重新截圖後再試一次。");
                    return;
                }

                Bitmap bitmap = new Bitmap(clipImage);
                string folder = Path.Combine(Path.GetTempPath(), "PianoSheetScreenshots");
                Directory.CreateDirectory(folder);
                string filePath = Path.Combine(folder, "sheet_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff") + ".png");
                bitmap.Save(filePath, System.Drawing.Imaging.ImageFormat.Png);

                currentPdfPath = "";
                sheetImages.Add(bitmap);
                sheetFilePaths.Add(filePath);
                currentSheetIndex = sheetImages.Count - 1;
                currentSheetInputPath = filePath;
                ShowCurrentSheetPage();
                rightTabs.SelectedIndex = 0;

                lblStatus.Text = "狀態：已從剪貼簿貼上截圖，並加入琴譜第 " + sheetImages.Count + " 頁。";
            }
            catch (Exception ex)
            {
                MessageBox.Show("貼上截圖失敗：" + ex.Message);
            }
        }

        private void BtnImportSheet_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "匯入多頁琴譜圖片";
            dlg.Filter = "圖片檔|*.png;*.jpg;*.jpeg;*.bmp;*.gif";
            dlg.Multiselect = true;

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            ClearSheetImages(false);
            currentPdfPath = "";

            try
            {
                List<string> files = dlg.FileNames.ToList();
                files.Sort();
                sheetFilePaths = new List<string>(files);

                foreach (string file in files)
                {
                    using (FileStream fs = new FileStream(file, FileMode.Open, FileAccess.Read))
                    {
                        Image img = Image.FromStream(fs);
                        sheetImages.Add(new Bitmap(img));
                    }
                }

                currentSheetIndex = sheetImages.Count > 0 ? 0 : -1;
                currentSheetInputPath = currentSheetIndex >= 0 && sheetFilePaths.Count > currentSheetIndex ? sheetFilePaths[currentSheetIndex] : "";
                ShowCurrentSheetPage();
                rightTabs.SelectedIndex = 0;
                lblStatus.Text = "狀態：已匯入 " + sheetImages.Count + " 頁琴譜圖片。";
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯入失敗：" + ex.Message);
            }
        }

        private void BtnOpenSheetPreview_Click(object sender, EventArgs e)
        {
            OpenSheetPreviewWindow();
        }

        private void OpenSheetPreviewWindow()
        {
            try
            {
                if (sheetPreviewForm == null || sheetPreviewForm.IsDisposed)
                {
                    sheetPreviewForm = new Form();
                    sheetPreviewForm.Text = "PDF / 琴譜預覽";
                    sheetPreviewForm.StartPosition = FormStartPosition.CenterScreen;
                    sheetPreviewForm.Size = new Size(980, 760);

                    sheetPreviewBrowser = new WebBrowser();
                    sheetPreviewBrowser.Dock = DockStyle.Fill;
                    sheetPreviewBrowser.ScriptErrorsSuppressed = true;

                    sheetPreviewPicture = new PictureBox();
                    sheetPreviewPicture.Dock = DockStyle.Fill;
                    sheetPreviewPicture.SizeMode = PictureBoxSizeMode.Zoom;
                    sheetPreviewPicture.BackColor = Color.White;

                    sheetPreviewForm.Controls.Add(sheetPreviewBrowser);
                    sheetPreviewForm.Controls.Add(sheetPreviewPicture);
                }

                sheetPreviewForm.Text = "PDF / 琴譜預覽";

                if (!string.IsNullOrWhiteSpace(currentPdfPath) && File.Exists(currentPdfPath))
                {
                    sheetPreviewForm.Text = "PDF 預覽 - " + Path.GetFileName(currentPdfPath);
                    sheetPreviewPicture.Visible = false;
                    sheetPreviewBrowser.Visible = true;
                    sheetPreviewBrowser.Navigate(new Uri(currentPdfPath));
                }
                else if (sheetImages.Count > 0 && currentSheetIndex >= 0 && currentSheetIndex < sheetImages.Count)
                {
                    sheetPreviewForm.Text = "圖片琴譜預覽";
                    sheetPreviewBrowser.Visible = false;
                    sheetPreviewPicture.Visible = true;
                    sheetPreviewPicture.Image = sheetImages[currentSheetIndex];
                }
                else
                {
                    MessageBox.Show("目前沒有可預覽的 PDF 或圖片琴譜。");
                    return;
                }

                sheetPreviewForm.Show();
                sheetPreviewForm.BringToFront();
            }
            catch (Exception ex)
            {
                MessageBox.Show("預覽視窗開啟失敗：" + ex.Message);
            }
        }

        private void BtnOpenPdf_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "匯入 PDF 琴譜";
            dlg.Filter = "PDF|*.pdf";

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            ClearSheetImages(false);

            currentPdfPath = dlg.FileName;
            currentSheetInputPath = dlg.FileName;
            sheetFilePaths = new List<string>();
            sheetFilePaths.Add(dlg.FileName);
            currentSheetIndex = 0;

            ShowCurrentSheetPage();
            rightTabs.SelectedIndex = 0;
            OpenSheetPreviewWindow();

            lblStatus.Text = "狀態：已匯入 PDF 琴譜，已開啟獨立預覽視窗，可直接進行 OMR 辨識。";
        }

        private void BtnPrevPage_Click(object sender, EventArgs e)
        {
            if (sheetImages.Count == 0)
            {
                return;
            }

            if (currentSheetIndex > 0)
            {
                currentSheetIndex--;
                currentSheetInputPath = sheetFilePaths.Count > currentSheetIndex ? sheetFilePaths[currentSheetIndex] : "";
                ShowCurrentSheetPage();
            }
        }

        private void BtnNextPage_Click(object sender, EventArgs e)
        {
            if (sheetImages.Count == 0)
            {
                return;
            }

            if (currentSheetIndex < sheetImages.Count - 1)
            {
                currentSheetIndex++;
                currentSheetInputPath = sheetFilePaths.Count > currentSheetIndex ? sheetFilePaths[currentSheetIndex] : "";
                ShowCurrentSheetPage();
            }
        }

        private void BtnClearSheet_Click(object sender, EventArgs e)
        {
            ClearSheetImages(true);
        }

        private void ShowCurrentSheetPage()
        {
            // V42：關閉視窗時不要再更新 PictureBox。
            // 否則 PictureBox 正在重繪、Image 又被 Dispose，WinForms 可能丟出
            // System.ArgumentException: 參數無效，導致無法正常關閉程式。
            if (isClosingForm || IsDisposed || Disposing)
            {
                return;
            }

            try
            {
                if (picSheet == null || picSheet.IsDisposed)
                {
                    return;
                }

                if (!string.IsNullOrWhiteSpace(currentPdfPath) && File.Exists(currentPdfPath))
                {
                    picSheet.Visible = false;
                    picSheet.Image = null;

                    if (pdfSheetViewer != null && !pdfSheetViewer.IsDisposed)
                    {
                        pdfSheetViewer.Visible = false;
                        pdfSheetViewer.Stop();
                    }

                    if (lblPdfPreviewHint != null && !lblPdfPreviewHint.IsDisposed)
                    {
                        lblPdfPreviewHint.Visible = true;
                        lblPdfPreviewHint.Text =
                            "目前 PDF：" + Path.GetFileName(currentPdfPath) + "\r\n\r\n" +
                            "PDF 不再塞在右側下方顯示，請按『開預覽窗』或重新匯入 PDF 開啟獨立預覽視窗。\r\n" +
                            "OMR 辨識仍可直接按『辨識全部頁面』。";
                    }

                    if (lblSheetPage != null && !lblSheetPage.IsDisposed)
                    {
                        lblSheetPage.Text = "目前：" + Path.GetFileName(currentPdfPath);
                    }

                    return;
                }

                if (pdfSheetViewer != null && !pdfSheetViewer.IsDisposed)
                {
                    pdfSheetViewer.Visible = false;
                }

                if (lblPdfPreviewHint != null && !lblPdfPreviewHint.IsDisposed)
                {
                    lblPdfPreviewHint.Visible = false;
                }

                if (sheetImages.Count == 0 || currentSheetIndex < 0 || currentSheetIndex >= sheetImages.Count)
                {
                    picSheet.Image = null;
                    picSheet.Visible = true;

                    if (lblSheetPage != null && !lblSheetPage.IsDisposed)
                    {
                        lblSheetPage.Text = "頁數：0 / 0";
                    }

                    return;
                }

                Image img = sheetImages[currentSheetIndex];
                if (img == null)
                {
                    picSheet.Image = null;
                    return;
                }

                // 先換 Image，再顯示，避免 PictureBox 在 Visible=true 時拿到已釋放圖片重繪。
                picSheet.Image = img;
                picSheet.Visible = true;

                if (lblSheetPage != null && !lblSheetPage.IsDisposed)
                {
                    string fileName = sheetFilePaths.Count > currentSheetIndex ? sheetFilePaths[currentSheetIndex] : "圖片琴譜";
                    lblSheetPage.Text =
                        "目前：" + Path.GetFileName(fileName) +
                        "　頁數：" + (currentSheetIndex + 1) + " / " + sheetImages.Count;
                }
            }
            catch (ArgumentException)
            {
                // 通常是圖片物件已被釋放或 GDI+ 重繪時機衝突。
                // 不讓它跳到 Visual Studio，直接清掉預覽即可。
                try
                {
                    if (picSheet != null && !picSheet.IsDisposed)
                    {
                        picSheet.Image = null;
                        picSheet.Visible = false;
                    }

                    if (lblSheetPage != null && !lblSheetPage.IsDisposed)
                    {
                        lblSheetPage.Text = "預覽圖片已清除。";
                    }
                }
                catch
                {
                }
            }
            catch (ObjectDisposedException)
            {
            }
            catch
            {
                // 預覽失敗不影響鋼琴、播放或關閉程式。
            }
        }

        private void ClearSheetImages(bool updateStatus)
        {
            try
            {
                if (picSheet != null && !picSheet.IsDisposed)
                {
                    // 先解除 PictureBox 對 Image 的參考，再 Dispose 圖片。
                    picSheet.Image = null;
                    picSheet.Visible = false;
                }
            }
            catch
            {
            }

            foreach (Image img in sheetImages)
            {
                try
                {
                    if (img != null)
                    {
                        img.Dispose();
                    }
                }
                catch
                {
                }
            }

            sheetImages.Clear();
            sheetFilePaths.Clear();
            currentPdfPath = "";
            currentSheetInputPath = "";
            currentSheetIndex = -1;

            if (!isClosingForm)
            {
                ShowCurrentSheetPage();

                if (updateStatus && lblStatus != null && !lblStatus.IsDisposed)
                {
                    lblStatus.Text = "狀態：已清除琴譜。";
                }
            }
        }

        private void BtnSelectYtDlp_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "選擇 yt-dlp.exe";
            dlg.Filter = "yt-dlp|yt-dlp.exe;yt-dlp|所有檔案|*.*";

            if (File.Exists(ytdlpPath))
            {
                dlg.InitialDirectory = Path.GetDirectoryName(ytdlpPath);
            }

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            ytdlpPath = dlg.FileName;
            SaveExternalToolSettings();
            UpdateExternalToolUi();
            lblStatus.Text = "狀態：已設定 yt-dlp - " + Path.GetFileName(ytdlpPath);
        }

        private void BtnSelectBasicPitch_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "選擇 basic-pitch.exe";
            dlg.Filter = "Basic Pitch|basic-pitch.exe;basic-pitch|所有檔案|*.*";

            if (File.Exists(basicPitchPath))
            {
                dlg.InitialDirectory = Path.GetDirectoryName(basicPitchPath);
            }

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            basicPitchPath = dlg.FileName;
            SaveExternalToolSettings();
            UpdateExternalToolUi();
            lblStatus.Text = "狀態：已設定 Basic Pitch - " + Path.GetFileName(basicPitchPath);
        }

        private void BtnSelectDemucs_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "選擇 demucs.exe";
            dlg.Filter = "Demucs|demucs.exe;demucs|所有檔案|*.*";

            if (File.Exists(demucsPath))
            {
                dlg.InitialDirectory = Path.GetDirectoryName(demucsPath);
            }

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            demucsPath = dlg.FileName;
            SaveExternalToolSettings();
            UpdateExternalToolUi();
            lblStatus.Text = "狀態：已設定 Demucs - " + Path.GetFileName(demucsPath);
        }

        private async void BtnYoutubeToBlocks_Click(object sender, EventArgs e)
        {
            string url = txtYouTubeUrl == null ? "" : txtYouTubeUrl.Text.Trim();

            if (string.IsNullOrWhiteSpace(url))
            {
                MessageBox.Show("請先貼上 YouTube 連結。");
                return;
            }

            DialogResult confirm = MessageBox.Show(
                "這個功能會呼叫外部工具下載音訊並轉成 MIDI。" + Environment.NewLine + Environment.NewLine +
                "請確認你有權使用這段音訊，例如自己的影片、授權音訊或課堂允許使用的素材。" + Environment.NewLine + Environment.NewLine +
                "要繼續嗎？",
                "確認使用音訊來源",
                MessageBoxButtons.OKCancel,
                MessageBoxIcon.Information);

            if (confirm != DialogResult.OK)
            {
                return;
            }

            string ytExe = ResolveExternalExecutable(ytdlpPath, "yt-dlp.exe", "yt-dlp");
            string basicPitchExe = ResolveExternalExecutable(basicPitchPath, "basic-pitch.exe", "basic-pitch");

            if (!string.IsNullOrWhiteSpace(ytExe) && File.Exists(ytExe))
            {
                ytdlpPath = ytExe;
            }

            if (!string.IsNullOrWhiteSpace(basicPitchExe) && File.Exists(basicPitchExe))
            {
                basicPitchPath = basicPitchExe;
            }

            UpdateExternalToolUi();
            SaveExternalToolSettings();

            if (string.IsNullOrWhiteSpace(ytExe) || string.IsNullOrWhiteSpace(basicPitchExe))
            {
                ShowYouTubeToolsRequiredDialog();
                return;
            }

            string selectedAiMode = GetSelectedAiMidiMode();
            bool requireDemucs = IsAiModeDemucs(selectedAiMode);
            bool preferDemucs = requireDemucs || IsAiSimilarPianoMode(selectedAiMode);
            bool useDemucs = false;
            string demucsExe = "";

            if (preferDemucs)
            {
                demucsExe = ResolveExternalExecutable(demucsPath, "demucs.exe", "demucs");
                if (!string.IsNullOrWhiteSpace(demucsExe) && File.Exists(demucsExe))
                {
                    demucsPath = demucsExe;
                    useDemucs = true;
                    UpdateExternalToolUi();
                    SaveExternalToolSettings();
                }
                else if (requireDemucs)
                {
                    ShowDemucsRequiredDialog();
                    return;
                }
            }

            ShowAiProgressDialog("準備開始 YouTube / AI 轉 MIDI...");
            SetAiProgress(3, "準備外部工具與暫存資料夾，模式：" + selectedAiMode);

            try
            {
                string workDir = Path.Combine(Path.GetTempPath(), "PianoYouTubeAi", DateTime.Now.ToString("yyyyMMdd_HHmmss"));
                Directory.CreateDirectory(workDir);

                string audioTemplate = Path.Combine(workDir, "youtube_audio.%(ext)s");
                string midiOutDir = Path.Combine(workDir, "basic_pitch_output");
                Directory.CreateDirectory(midiOutDir);

                SetAiProgress(10, "步驟 1 / 3：正在用 yt-dlp 取得音訊...");
                AiStageResult audioResult = await Task.Run(() =>
                {
                    string args = "-x --audio-format wav --no-playlist -o " + QuoteArg(audioTemplate) + " " + QuoteArg(url);
                    ToolRunResult run = RunExternalTool(ytExe, args, workDir);

                    string[] wavFiles = Directory.GetFiles(workDir, "*.wav", SearchOption.TopDirectoryOnly);
                    if (wavFiles.Length > 0)
                    {
                        string wav = wavFiles.OrderByDescending(f => new FileInfo(f).Length).First();
                        return AiStageResult.Success(wav, run.CombinedText);
                    }

                    string errorText = run.CombinedText;
                    if (string.IsNullOrWhiteSpace(errorText))
                    {
                        errorText = "yt-dlp 沒有產生 WAV。請確認 ffmpeg 已安裝並加入 PATH。";
                    }

                    return AiStageResult.Fail("yt-dlp 取得音訊失敗。" + Environment.NewLine + errorText);
                });

                if (!audioResult.Ok)
                {
                    CloseAiProgressDialog();
                    ShowYouTubeConvertFailedDialog("yt-dlp 取得音訊失敗", audioResult.ErrorMessage);
                    SetStatus("狀態：YouTube 轉方塊失敗。");
                    return;
                }

                string audioForBasicPitch = audioResult.OutputPath;

                if (useDemucs)
                {
                    SetAiProgress(25, "步驟 1.5 / 4：Demucs 正在分離人聲、鼓、貝斯與其他樂器，這一步可能會比較久...");
                    AiStageResult demucsResult = await Task.Run(() => SeparateAudioWithDemucs(audioResult.OutputPath, workDir, demucsExe));

                    if (demucsResult.Ok && !string.IsNullOrWhiteSpace(demucsResult.OutputPath) && File.Exists(demucsResult.OutputPath))
                    {
                        audioForBasicPitch = demucsResult.OutputPath;
                    }
                    else
                    {
                        CloseAiProgressDialog();
                        ShowYouTubeConvertFailedDialog("Demucs 分離失敗", demucsResult.ErrorMessage);
                        SetStatus("狀態：Demucs 分離失敗。");
                        return;
                    }
                }

                if (!IsAiModeOriginal(selectedAiMode))
                {
                    SetAiProgress(useDemucs ? 42 : 32, "步驟 2 / 4：正在依模式做音訊前處理，減少人聲、鼓點與雜訊...");
                    AiStageResult filterResult = await Task.Run(() => PreprocessAudioForAiMode(audioForBasicPitch, workDir, selectedAiMode));

                    if (filterResult.Ok && !string.IsNullOrWhiteSpace(filterResult.OutputPath) && File.Exists(filterResult.OutputPath))
                    {
                        audioForBasicPitch = filterResult.OutputPath;
                    }
                }

                SetAiProgress(useDemucs ? 58 : 45, useDemucs ? "步驟 3 / 4：正在用 Basic Pitch 將分離後音訊轉成 MIDI..." : "步驟 2 / 3：正在用 Basic Pitch 將音訊轉成 MIDI...");
                AiStageResult midiResult = await Task.Run(() =>
                {
                    string args = QuoteArg(midiOutDir) + " " + QuoteArg(audioForBasicPitch);
                    ToolRunResult run = RunExternalTool(basicPitchExe, args, workDir);

                    string[] midiFiles = Directory.GetFiles(midiOutDir, "*.mid", SearchOption.AllDirectories);
                    if (midiFiles.Length == 0)
                    {
                        midiFiles = Directory.GetFiles(midiOutDir, "*.midi", SearchOption.AllDirectories);
                    }

                    if (midiFiles.Length > 0)
                    {
                        string midi = midiFiles.OrderByDescending(f => new FileInfo(f).LastWriteTime).First();
                        return AiStageResult.Success(midi, run.CombinedText);
                    }

                    string errorText = run.CombinedText;
                    if (string.IsNullOrWhiteSpace(errorText))
                    {
                        errorText = "Basic Pitch 沒有產生 MIDI 檔。";
                    }

                    return AiStageResult.Fail(BuildBasicPitchFailureHint(errorText));
                });

                if (!midiResult.Ok)
                {
                    CloseAiProgressDialog();
                    ShowYouTubeConvertFailedDialog("Basic Pitch 轉 MIDI 失敗", midiResult.ErrorMessage);
                    SetStatus("狀態：YouTube 轉方塊失敗。");
                    return;
                }

                SetAiProgress(85, useDemucs ? "步驟 4 / 4：正在匯入 MIDI 並清理雜訊音符..." : "步驟 3 / 3：正在匯入 AI 產生的 MIDI，並依模式清理雜訊音符...");
                Song song = LoadMidiAsSong(midiResult.OutputPath);
                int beforeEventCount = song.RecordedEvents == null ? 0 : song.RecordedEvents.Count;
                song = CleanAiMidiSong(song, selectedAiMode);
                int afterEventCount = song.RecordedEvents == null ? 0 : song.RecordedEvents.Count;

                song.Name = "YouTube AI MIDI | " + song.Name;
                song.Category = "AI 音訊轉 MIDI";
                song.Description =
                    "由 YouTube 連結經外部 yt-dlp 取得音訊，再由 Basic Pitch 轉成 MIDI。" + Environment.NewLine +
                    "AI 清理模式：" + selectedAiMode + Environment.NewLine +
                    "清理前事件數：" + beforeEventCount + "，清理後事件數：" + afterEventCount + Environment.NewLine +
                    "提醒：這是 AI 音訊轉 MIDI，準確度會受原曲人聲、鼓、混音與音質影響。";

                AddImportedSong(song);

                SetAiProgress(100, "完成：已匯入 MIDI，可以播放落下方塊。");
                await Task.Delay(450);
                CloseAiProgressDialog();

                SetStatus("狀態：YouTube 連結已轉成 MIDI 並匯入，可以播放落下方塊。");

                MessageBox.Show(
                    "完成！" + Environment.NewLine + Environment.NewLine +
                    "已經把連結音訊轉成 MIDI 並匯入曲目清單。" + Environment.NewLine +
                    "如果方塊還是太亂，通常是因為原曲混音太複雜；可以使用「AI 相似鋼琴版」或找 Piano Cover / Instrumental 音源。");
            }
            catch (Exception ex)
            {
                CloseAiProgressDialog();
                ShowYouTubeConvertFailedDialog("YouTube 轉方塊失敗", ex.Message);
                SetStatus("狀態：YouTube 轉方塊失敗。");
            }
        }

        private string GetSelectedAiMidiMode()
        {
            if (cmbAiMidiMode == null || cmbAiMidiMode.SelectedItem == null)
            {
                return "PopPiano 風格相似版";
            }

            return cmbAiMidiMode.SelectedItem.ToString();
        }

        private bool IsAiModeOriginal(string mode)
        {
            return !string.IsNullOrWhiteSpace(mode) && mode.StartsWith("原始");
        }

        private bool IsAiModeDemucs(string mode)
        {
            return !string.IsNullOrWhiteSpace(mode) && mode.StartsWith("Demucs");
        }

        private bool IsAiSimilarPianoMode(string mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
            {
                return false;
            }

            return mode.StartsWith("AI 相似") ||
                   mode.StartsWith("精簡") ||
                   mode.StartsWith("主旋律") ||
                   mode.StartsWith("PopPiano");
        }

        private AiStageResult SeparateAudioWithDemucs(string inputAudioPath, string workDir, string demucsExe)
        {
            try
            {
                string demucsOutDir = Path.Combine(workDir, "demucs_output");
                Directory.CreateDirectory(demucsOutDir);

                string args = "-n htdemucs -o " + QuoteArg(demucsOutDir) + " " + QuoteArg(inputAudioPath);
                ToolRunResult run = RunExternalTool(demucsExe, args, workDir);

                string stem = FindBestDemucsStem(demucsOutDir);
                if (!string.IsNullOrWhiteSpace(stem) && File.Exists(stem))
                {
                    return AiStageResult.Success(stem, run.CombinedText);
                }

                string message = run.CombinedText;
                if (string.IsNullOrWhiteSpace(message))
                {
                    message = "Demucs 沒有產生 other.wav / no_vocals.wav。";
                }

                return AiStageResult.Fail(message);
            }
            catch (Exception ex)
            {
                return AiStageResult.Fail(ex.Message);
            }
        }

        private string FindBestDemucsStem(string demucsOutDir)
        {
            try
            {
                if (!Directory.Exists(demucsOutDir))
                {
                    return "";
                }

                string[] others = Directory.GetFiles(demucsOutDir, "other.wav", SearchOption.AllDirectories);
                if (others.Length > 0)
                {
                    return others.OrderByDescending(f => new FileInfo(f).Length).First();
                }

                string[] noVocals = Directory.GetFiles(demucsOutDir, "no_vocals.wav", SearchOption.AllDirectories);
                if (noVocals.Length > 0)
                {
                    return noVocals.OrderByDescending(f => new FileInfo(f).Length).First();
                }

                string[] wavs = Directory.GetFiles(demucsOutDir, "*.wav", SearchOption.AllDirectories)
                    .Where(f =>
                        Path.GetFileName(f).IndexOf("vocals", StringComparison.OrdinalIgnoreCase) < 0 &&
                        Path.GetFileName(f).IndexOf("drums", StringComparison.OrdinalIgnoreCase) < 0 &&
                        Path.GetFileName(f).IndexOf("bass", StringComparison.OrdinalIgnoreCase) < 0)
                    .ToArray();

                if (wavs.Length > 0)
                {
                    return wavs.OrderByDescending(f => new FileInfo(f).Length).First();
                }
            }
            catch
            {
            }

            return "";
        }

        private AiStageResult PreprocessAudioForAiMode(string inputAudioPath, string workDir, string mode)
        {
            try
            {
                string ffmpegExe = ResolveExternalExecutable("", "ffmpeg.exe", "ffmpeg");

                if (string.IsNullOrWhiteSpace(ffmpegExe) || !File.Exists(ffmpegExe))
                {
                    return AiStageResult.Success(inputAudioPath, "找不到 ffmpeg，略過音訊前處理。");
                }

                string outputAudioPath = Path.Combine(workDir, "ai_filtered_" + DateTime.Now.ToString("HHmmssfff") + ".wav");
                string filter = GetFfmpegFilterForAiMode(mode);

                string args =
                    "-y -i " + QuoteArg(inputAudioPath) +
                    " -vn -ac 1 -ar 22050 -af " + QuoteArg(filter) +
                    " " + QuoteArg(outputAudioPath);

                ToolRunResult run = RunExternalTool(ffmpegExe, args, workDir);

                if (File.Exists(outputAudioPath))
                {
                    return AiStageResult.Success(outputAudioPath, run.CombinedText);
                }

                return AiStageResult.Success(inputAudioPath, "ffmpeg 沒有成功輸出前處理音訊，改用原始音訊。" + Environment.NewLine + run.CombinedText);
            }
            catch (Exception ex)
            {
                return AiStageResult.Success(inputAudioPath, "音訊前處理失敗，改用原始音訊。" + Environment.NewLine + ex.Message);
            }
        }

        private string GetFfmpegFilterForAiMode(string mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
            {
                mode = "";
            }

            if (mode.StartsWith("AI 相似"))
            {
                return "afftdn=nf=-25,highpass=f=120,lowpass=f=3000,acompressor=threshold=-20dB:ratio=2.5:attack=20:release=220,dynaudnorm=f=150:g=10";
            }

            if (mode.StartsWith("旋律"))
            {
                return "afftdn=nf=-25,highpass=f=160,lowpass=f=3200,dynaudnorm=f=150:g=12";
            }

            if (mode.StartsWith("鋼琴"))
            {
                return "afftdn=nf=-22,highpass=f=60,lowpass=f=6200,dynaudnorm=f=150:g=14";
            }

            if (mode.StartsWith("強力"))
            {
                return "afftdn=nf=-20,highpass=f=130,lowpass=f=4000,acompressor=threshold=-18dB:ratio=3:attack=20:release=250,dynaudnorm=f=200:g=10";
            }

            return "highpass=f=60,lowpass=f=7000,dynaudnorm=f=150:g=12";
        }

        private void ShowAiProgressDialog(string status)
        {
            CloseAiProgressDialog();

            aiProgressDialog = new OmrProgressDialog();
            aiProgressDialog.SetTitleText("連結轉方塊進度");
            aiProgressDialog.SetProgress(0, 100, status);
            aiProgressDialog.Show(this);
            aiProgressDialog.Refresh();
        }

        private void SetAiProgress(int percent, string status)
        {
            percent = Math.Max(0, Math.Min(100, percent));
            SetStatus("狀態：" + status);

            try
            {
                if (aiProgressDialog != null && !aiProgressDialog.IsDisposed)
                {
                    aiProgressDialog.SetProgress(percent, 100, status);
                }
            }
            catch
            {
            }
        }

        private void CloseAiProgressDialog()
        {
            try
            {
                if (aiProgressDialog != null && !aiProgressDialog.IsDisposed)
                {
                    aiProgressDialog.Close();
                    aiProgressDialog.Dispose();
                }
            }
            catch
            {
            }

            aiProgressDialog = null;
        }

        private void ShowYouTubeConvertFailedDialog(string title, string detail)
        {
            Form form = new Form();
            form.Text = title;
            form.StartPosition = FormStartPosition.CenterParent;
            form.ClientSize = new Size(700, 500);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.BackColor = Color.White;
            form.Font = new Font("Microsoft JhengHei UI", 10F);

            Label lblTitle = new Label();
            lblTitle.Text = title;
            lblTitle.Font = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(20, 30, 45);
            lblTitle.Location = new Point(22, 18);
            lblTitle.Size = new Size(640, 30);
            form.Controls.Add(lblTitle);

            Label lblBody = new Label();
            lblBody.Text =
                "這不是主程式壞掉，而是外部工具執行失敗或 Basic Pitch 環境缺少推論套件。" + Environment.NewLine +
                "可以先照下面建議重新安裝，再回來按「連結轉方塊」。";
            lblBody.Location = new Point(24, 56);
            lblBody.Size = new Size(640, 48);
            lblBody.ForeColor = Color.FromArgb(55, 65, 81);
            form.Controls.Add(lblBody);

            TextBox txt = new TextBox();
            txt.Multiline = true;
            txt.ReadOnly = true;
            txt.ScrollBars = ScrollBars.Vertical;
            txt.Location = new Point(24, 110);
            txt.Size = new Size(650, 245);
            txt.Text = detail;
            form.Controls.Add(txt);

            Label cmd = new Label();
            cmd.Text =
                "建議在 PowerShell 執行：" + Environment.NewLine +
                "python -m pip install -U yt-dlp" + Environment.NewLine +
                "python -m pip install -U \"basic-pitch[tf]\"" + Environment.NewLine +
                "winget install -e --id Gyan.FFmpeg" + Environment.NewLine +
                "python -m pip install -U demucs";
            cmd.Location = new Point(24, 366);
            cmd.Size = new Size(650, 70);
            cmd.ForeColor = Color.FromArgb(37, 99, 235);
            form.Controls.Add(cmd);

            LinkLabel link = new LinkLabel();
            link.Text = "開啟 Basic Pitch 官方 GitHub";
            link.Location = new Point(24, 440);
            link.Size = new Size(260, 24);
            link.LinkClicked += delegate { OpenExternal("https://github.com/spotify/basic-pitch"); };
            form.Controls.Add(link);

            Button ok = new Button();
            ok.Text = "知道了";
            ok.Location = new Point(582, 452);
            ok.Size = new Size(92, 32);
            ok.DialogResult = DialogResult.OK;
            form.Controls.Add(ok);

            form.AcceptButton = ok;
            form.ShowDialog(this);
        }

        private string BuildBasicPitchFailureHint(string rawText)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("Basic Pitch 沒有成功輸出 MIDI。");
            sb.AppendLine();
            sb.AppendLine("常見原因：");
            sb.AppendLine("1. 只安裝 basic-pitch，但沒有可用的模型推論套件。");
            sb.AppendLine("2. TensorFlow / ONNX Runtime / 相關 runtime 沒裝好。");
            sb.AppendLine("3. Python 版本或套件版本不相容。");
            sb.AppendLine("4. Windows cp950 編碼無法輸出 Basic Pitch 的特殊符號，V50 已強制改用 UTF-8。");
            sb.AppendLine();
            sb.AppendLine("建議先在 PowerShell 執行：");
            sb.AppendLine("python -m pip install -U \"basic-pitch[tf]\"");
            sb.AppendLine("python -m pip install -U onnxruntime");
            sb.AppendLine("$env:PYTHONIOENCODING=\"utf-8\"");
            sb.AppendLine();
            sb.AppendLine("如果仍失敗，先測試：");
            sb.AppendLine("basic-pitch --help");
            sb.AppendLine();
            sb.AppendLine("外部工具輸出：");
            sb.AppendLine(rawText);
            return sb.ToString();
        }

        private void ShowDemucsRequiredDialog()
        {
            Form form = new Form();
            form.Text = "需要安裝 Demucs 分離工具";
            form.StartPosition = FormStartPosition.CenterParent;
            form.ClientSize = new Size(660, 360);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.BackColor = Color.White;
            form.Font = new Font("Microsoft JhengHei UI", 10F);

            Label title = new Label();
            title.Text = "Demucs 分離模式需要另外安裝 Demucs";
            title.Font = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(20, 30, 45);
            title.Location = new Point(22, 18);
            title.Size = new Size(600, 32);
            form.Controls.Add(title);

            Label body = new Label();
            body.Text =
                "這個模式會先把原始 MV 分成人聲、鼓、貝斯、其他樂器，再拿比較乾淨的 other 音軌去轉 MIDI。" + Environment.NewLine +
                "因為 Demucs / PyTorch / 模型很大，所以沒有包進作業 ZIP，避免超過 21MB。" + Environment.NewLine + Environment.NewLine +
                "建議在 PowerShell 安裝：" + Environment.NewLine +
                "python -m pip install -U demucs";
            body.Location = new Point(24, 62);
            body.Size = new Size(610, 150);
            body.ForeColor = Color.FromArgb(55, 65, 81);
            form.Controls.Add(body);

            LinkLabel demucsLink = new LinkLabel();
            demucsLink.Text = "開啟 Demucs 官方 GitHub";
            demucsLink.Location = new Point(24, 222);
            demucsLink.Size = new Size(300, 24);
            demucsLink.LinkClicked += delegate { OpenExternal("https://github.com/facebookresearch/demucs"); };
            form.Controls.Add(demucsLink);

            Label note = new Label();
            note.Text = "安裝後重開程式，或按「Demucs」手動選 demucs.exe。其他 YouTube / MIDI 功能不受影響。";
            note.Location = new Point(24, 258);
            note.Size = new Size(600, 40);
            note.ForeColor = Color.FromArgb(90, 100, 115);
            form.Controls.Add(note);

            Button ok = new Button();
            ok.Text = "知道了";
            ok.Location = new Point(540, 310);
            ok.Size = new Size(92, 32);
            ok.DialogResult = DialogResult.OK;
            form.Controls.Add(ok);

            form.AcceptButton = ok;
            form.ShowDialog(this);
        }

        private void ShowYouTubeToolsRequiredDialog()
        {
            Form form = new Form();
            form.Text = "需要安裝 YouTube / AI 轉 MIDI 工具";
            form.StartPosition = FormStartPosition.CenterParent;
            form.ClientSize = new Size(640, 390);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.BackColor = Color.White;
            form.Font = new Font("Microsoft JhengHei UI", 10F);

            Label title = new Label();
            title.Text = "助教您好，這個功能需要另外安裝外部工具";
            title.Font = new Font("Microsoft JhengHei UI", 14F, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(20, 30, 45);
            title.Location = new Point(22, 18);
            title.Size = new Size(590, 32);
            form.Controls.Add(title);

            Label body = new Label();
            body.Text =
                "YouTube 轉方塊功能沒有把 AI 模型包進作業 ZIP，避免檔案超過 21MB。" + Environment.NewLine +
                "若要使用這個功能，請先安裝 / 設定以下工具：" + Environment.NewLine + Environment.NewLine +
                "1. yt-dlp：取得音訊" + Environment.NewLine +
                "2. FFmpeg：轉成 WAV，通常需要加入 PATH" + Environment.NewLine +
                "3. Basic Pitch：把音訊轉成 MIDI" + Environment.NewLine +
                "4. Demucs：進階模式才需要，用來先分離人聲 / 鼓 / 貝斯" + Environment.NewLine + Environment.NewLine +
                "如果使用 pip 安裝，程式會自動偵測常見 Python Scripts 位置。" + Environment.NewLine +
                "Basic Pitch 建議安裝：python -m pip install -U \"basic-pitch[tf]\"" + Environment.NewLine +
                "也可以手動按「yt-dlp」與「Basic Pitch」選擇執行檔。";
            body.Location = new Point(24, 62);
            body.Size = new Size(590, 150);
            body.ForeColor = Color.FromArgb(55, 65, 81);
            form.Controls.Add(body);

            LinkLabel yt = new LinkLabel();
            yt.Text = "開啟 yt-dlp 官方 Releases";
            yt.Location = new Point(26, 222);
            yt.Size = new Size(300, 24);
            yt.LinkClicked += delegate { OpenExternal("https://github.com/yt-dlp/yt-dlp/releases"); };
            form.Controls.Add(yt);

            LinkLabel ffmpeg = new LinkLabel();
            ffmpeg.Text = "開啟 FFmpeg 官方下載頁";
            ffmpeg.Location = new Point(26, 252);
            ffmpeg.Size = new Size(300, 24);
            ffmpeg.LinkClicked += delegate { OpenExternal("https://www.ffmpeg.org/download.html"); };
            form.Controls.Add(ffmpeg);

            LinkLabel bp = new LinkLabel();
            bp.Text = "開啟 Basic Pitch 官方 GitHub";
            bp.Location = new Point(26, 282);
            bp.Size = new Size(300, 24);
            bp.LinkClicked += delegate { OpenExternal("https://github.com/spotify/basic-pitch"); };
            form.Controls.Add(bp);

            Label note = new Label();
            note.Text = "提醒：請只使用自己有權使用的音訊。若沒有安裝這些工具，其他鋼琴、MIDI、MusicXML、OMR 功能仍可正常使用。";
            note.Location = new Point(24, 318);
            note.Size = new Size(590, 34);
            note.ForeColor = Color.FromArgb(90, 100, 115);
            form.Controls.Add(note);

            Button ok = new Button();
            ok.Text = "知道了";
            ok.Location = new Point(520, 348);
            ok.Size = new Size(92, 32);
            ok.DialogResult = DialogResult.OK;
            form.Controls.Add(ok);

            form.AcceptButton = ok;
            form.ShowDialog(this);
        }

        private string ResolveExternalExecutable(string savedPath, string exeName, string commandName)
        {
            if (!string.IsNullOrWhiteSpace(savedPath) && File.Exists(savedPath))
            {
                return savedPath;
            }

            string fromPath = FindExecutableInPath(exeName);
            if (!string.IsNullOrWhiteSpace(fromPath))
            {
                return fromPath;
            }

            fromPath = FindExecutableInPath(commandName);
            if (!string.IsNullOrWhiteSpace(fromPath))
            {
                return fromPath;
            }

            if (exeName.IndexOf("yt-dlp", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return AutoDetectYtDlpPath();
            }

            if (exeName.IndexOf("basic-pitch", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return AutoDetectBasicPitchPath();
            }

            if (exeName.IndexOf("demucs", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return AutoDetectDemucsPath();
            }

            return "";
        }

        private ToolRunResult RunExternalTool(string fileName, string arguments, string workingDirectory)
        {
            ToolRunResult result = new ToolRunResult();

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = fileName;
            psi.Arguments = arguments;
            psi.WorkingDirectory = workingDirectory;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.StandardOutputEncoding = Encoding.UTF8;
            psi.StandardErrorEncoding = Encoding.UTF8;

            // V50：Basic Pitch 會輸出 ✨ 這類 Unicode 字元。
            // 台灣 Windows 預設 cp950 會讓 Python 在 print 時爆 UnicodeEncodeError，
            // 所以這裡強制外部 Python 工具用 UTF-8 輸出。
            try
            {
                psi.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8";
                psi.EnvironmentVariables["PYTHONUTF8"] = "1";
                psi.EnvironmentVariables["PYTHONLEGACYWINDOWSSTDIO"] = "0";
                psi.EnvironmentVariables["TF_CPP_MIN_LOG_LEVEL"] = "2";
            }
            catch
            {
            }

            using (Process p = new Process())
            {
                p.StartInfo = psi;
                StringBuilder output = new StringBuilder();
                StringBuilder error = new StringBuilder();

                p.OutputDataReceived += delegate (object sender, DataReceivedEventArgs e)
                {
                    if (e.Data != null)
                    {
                        output.AppendLine(e.Data);
                    }
                };

                p.ErrorDataReceived += delegate (object sender, DataReceivedEventArgs e)
                {
                    if (e.Data != null)
                    {
                        error.AppendLine(e.Data);
                    }
                };

                p.Start();
                p.BeginOutputReadLine();
                p.BeginErrorReadLine();
                p.WaitForExit();

                result.ExitCode = p.ExitCode;
                result.Output = output.ToString();
                result.Error = error.ToString();
                return result;
            }
        }

        private void RunExternalToolAndThrow(string fileName, string arguments, string workingDirectory, string displayName)
        {
            ToolRunResult result = RunExternalTool(fileName, arguments, workingDirectory);

            if (result.ExitCode != 0)
            {
                throw new Exception(displayName + " 執行失敗，ExitCode=" + result.ExitCode + Environment.NewLine + result.CombinedText);
            }
        }

        private string QuoteArg(string value)
        {
            if (value == null)
            {
                value = "";
            }

            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private void BtnSearch_Click(object sender, EventArgs e)
        {
            SearchSheet(txtSearch.Text);
        }

        private void BtnOpenBrowser_Click(object sender, EventArgs e)
        {
            OpenExternal(BuildSearchUrl(txtSearch.Text));
        }

        private void SearchSheet(string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
            {
                return;
            }

            string url = BuildSearchUrl(keyword);

            try
            {
                webBrowser.Navigate(url);
                lblStatus.Text = "狀態：正在搜尋琴譜 - " + keyword;
            }
            catch
            {
                OpenExternal(url);
            }
        }

        private string BuildSearchUrl(string keyword)
        {
            return "https://www.google.com/search?q=" + Uri.EscapeDataString(keyword + " piano sheet music");
        }

        private void OpenExternal(string pathOrUrl)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(pathOrUrl);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch
            {
                try
                {
                    Process.Start(pathOrUrl);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("無法開啟：" + ex.Message);
                }
            }
        }

        #endregion

        #region 曲目 / 播放清單

        private void BtnExportMidi_Click(object sender, EventArgs e)
        {
            try
            {
                Song song = GetSongForExport();
                if (song == null)
                {
                    MessageBox.Show("請先在「曲目 / 清單」選擇一首曲目，或先完成 OMR 辨識。");
                    return;
                }

                List<RecordedMidiEvent> events = BuildRecordedEventsForMidiExport(song);
                if (events == null || events.Count == 0)
                {
                    MessageBox.Show("這首曲目沒有可匯出的音符資料。");
                    return;
                }

                SaveFileDialog dlg = new SaveFileDialog();
                dlg.Title = "匯出 MIDI 檔";
                dlg.Filter = "MIDI 檔案 (*.mid)|*.mid";
                dlg.FileName = MakeSafeFileName(song.Name) + ".mid";

                if (dlg.ShowDialog() != DialogResult.OK)
                {
                    return;
                }

                WriteMidiFile(dlg.FileName, events, song.Name);
                lblStatus.Text = "狀態：已匯出 MIDI - " + Path.GetFileName(dlg.FileName);

                MessageBox.Show(
                    "匯出完成！" + Environment.NewLine + Environment.NewLine +
                    "之後可以直接按「匯入 MIDI」載入這個檔案，不用再重新跑 OMR 辨識。");
            }
            catch (Exception ex)
            {
                MessageBox.Show("匯出 MIDI 失敗：" + ex.Message);
            }
        }

        private Song GetSongForExport()
        {
            Song song = lstSongs != null ? lstSongs.SelectedItem as Song : null;
            if (song != null)
            {
                return song;
            }

            song = lstPlaylist != null ? lstPlaylist.SelectedItem as Song : null;
            if (song != null)
            {
                return song;
            }

            if (lstSongs != null && lstSongs.Items.Count > 0)
            {
                return lstSongs.Items[lstSongs.Items.Count - 1] as Song;
            }

            return null;
        }

        private List<RecordedMidiEvent> BuildRecordedEventsForMidiExport(Song song)
        {
            if (song.RecordedEvents != null && song.RecordedEvents.Count > 0)
            {
                return NormalizeRecordedEventsForPlayback(song.RecordedEvents);
            }

            List<RecordedMidiEvent> events = new List<RecordedMidiEvent>();
            int currentMs = 0;

            foreach (SongEvent ev in song.Events)
            {
                int hold = Math.Max(60, ev.HoldMs);
                foreach (int note in ev.Notes)
                {
                    events.Add(new RecordedMidiEvent { TimeMs = currentMs, Midi = note, IsNoteOn = true, Velocity = 100, Hand = note < 60 ? 0 : 1 });
                    events.Add(new RecordedMidiEvent { TimeMs = currentMs + hold, Midi = note, IsNoteOn = false, Velocity = 0, Hand = note < 60 ? 0 : 1 });
                }

                currentMs += Math.Max(1, ev.DurationMs);
            }

            return NormalizeRecordedEventsForPlayback(events);
        }

        private void WriteMidiFile(string filePath, List<RecordedMidiEvent> events, string trackName)
        {
            List<RecordedMidiEvent> ordered = NormalizeRecordedEventsForPlayback(events);
            if (ordered.Count == 0)
            {
                throw new Exception("沒有 MIDI 事件可寫入。");
            }

            const int ticksPerQuarter = 480;
            const int microsecondsPerQuarter = 500000; // 120 BPM。事件時間會照原本毫秒轉成 tick，因此播放長度會保留。

            List<MidiWriteEvent> midiEvents = new List<MidiWriteEvent>();

            foreach (RecordedMidiEvent ev in ordered)
            {
                int midi = Math.Max(0, Math.Min(127, ev.Midi));
                int velocity = ev.IsNoteOn ? Math.Max(1, Math.Min(127, ev.Velocity <= 0 ? 96 : ev.Velocity)) : 0;
                long tick = MsToMidiTick(ev.TimeMs, ticksPerQuarter, microsecondsPerQuarter);

                MidiWriteEvent me = new MidiWriteEvent();
                me.Tick = tick;
                me.Midi = midi;
                me.Velocity = velocity;
                me.IsNoteOn = ev.IsNoteOn;
                midiEvents.Add(me);
            }

            midiEvents = midiEvents
                .OrderBy(e => e.Tick)
                .ThenBy(e => e.IsNoteOn ? 1 : 0) // 同一時間先 NoteOff 再 NoteOn，重複音才會連彈
                .ThenBy(e => e.Midi)
                .ToList();

            using (MemoryStream track = new MemoryStream())
            {
                // Tempo
                WriteVariableLength(track, 0);
                track.WriteByte(0xFF);
                track.WriteByte(0x51);
                track.WriteByte(0x03);
                track.WriteByte((byte)((microsecondsPerQuarter >> 16) & 0xFF));
                track.WriteByte((byte)((microsecondsPerQuarter >> 8) & 0xFF));
                track.WriteByte((byte)(microsecondsPerQuarter & 0xFF));

                // Track name
                if (!string.IsNullOrWhiteSpace(trackName))
                {
                    byte[] nameBytes = Encoding.UTF8.GetBytes(trackName);
                    WriteVariableLength(track, 0);
                    track.WriteByte(0xFF);
                    track.WriteByte(0x03);
                    WriteVariableLength(track, nameBytes.Length);
                    track.Write(nameBytes, 0, nameBytes.Length);
                }

                // Program Change：Acoustic Grand Piano
                WriteVariableLength(track, 0);
                track.WriteByte(0xC0);
                track.WriteByte(0x00);

                long lastTick = 0;
                foreach (MidiWriteEvent ev in midiEvents)
                {
                    long delta = Math.Max(0, ev.Tick - lastTick);
                    WriteVariableLength(track, delta);

                    if (ev.IsNoteOn)
                    {
                        track.WriteByte(0x90);
                        track.WriteByte((byte)ev.Midi);
                        track.WriteByte((byte)ev.Velocity);
                    }
                    else
                    {
                        track.WriteByte(0x80);
                        track.WriteByte((byte)ev.Midi);
                        track.WriteByte(0x00);
                    }

                    lastTick = ev.Tick;
                }

                // End of track
                WriteVariableLength(track, ticksPerQuarter);
                track.WriteByte(0xFF);
                track.WriteByte(0x2F);
                track.WriteByte(0x00);

                byte[] trackData = track.ToArray();

                using (FileStream fs = new FileStream(filePath, FileMode.Create, FileAccess.Write))
                {
                    // Header chunk
                    WriteAscii(fs, "MThd");
                    WriteInt32BigEndian(fs, 6);
                    WriteInt16BigEndian(fs, 0); // format 0
                    WriteInt16BigEndian(fs, 1); // one track
                    WriteInt16BigEndian(fs, ticksPerQuarter);

                    // Track chunk
                    WriteAscii(fs, "MTrk");
                    WriteInt32BigEndian(fs, trackData.Length);
                    fs.Write(trackData, 0, trackData.Length);
                }
            }
        }

        private long MsToMidiTick(int ms, int ticksPerQuarter, int microsecondsPerQuarter)
        {
            double quarterMs = microsecondsPerQuarter / 1000.0;
            return (long)Math.Round(ms * ticksPerQuarter / quarterMs);
        }

        private void WriteAscii(Stream stream, string text)
        {
            byte[] data = Encoding.ASCII.GetBytes(text);
            stream.Write(data, 0, data.Length);
        }

        private void WriteInt16BigEndian(Stream stream, int value)
        {
            stream.WriteByte((byte)((value >> 8) & 0xFF));
            stream.WriteByte((byte)(value & 0xFF));
        }

        private void WriteInt32BigEndian(Stream stream, int value)
        {
            stream.WriteByte((byte)((value >> 24) & 0xFF));
            stream.WriteByte((byte)((value >> 16) & 0xFF));
            stream.WriteByte((byte)((value >> 8) & 0xFF));
            stream.WriteByte((byte)(value & 0xFF));
        }

        private void WriteVariableLength(Stream stream, long value)
        {
            value = Math.Max(0, value);

            long buffer = value & 0x7F;
            while ((value >>= 7) > 0)
            {
                buffer <<= 8;
                buffer |= ((value & 0x7F) | 0x80);
            }

            while (true)
            {
                stream.WriteByte((byte)(buffer & 0xFF));

                if ((buffer & 0x80) != 0)
                {
                    buffer >>= 8;
                }
                else
                {
                    break;
                }
            }
        }

        private void LstSongs_SelectedIndexChanged(object sender, EventArgs e)
        {
            Song song = lstSongs.SelectedItem as Song;
            if (song == null)
            {
                return;
            }

            int count = song.RecordedEvents != null && song.RecordedEvents.Count > 0 ? song.RecordedEvents.Count : song.Events.Count;
            SetPlaybackBpmFromSong(song);

            lblSongDesc.Text =
                "曲名：" + song.Name + "\r\n" +
                "類型：" + song.Category + "\r\n\r\n" +
                song.Description + "\r\n\r\n" +
                "BPM：" + GetSongTempoDescription(song) + "\r\n" +
                "播放感：明亮鋼琴 / 輕快斷奏補正（不影響原檔）\r\n" +
                "事件數：" + count + "\r\n" +
                "提示：可按『預覽方塊』先看上方落下方塊。";

            PreviewSongRoll(song);
        }

        private void BtnPreviewRoll_Click(object sender, EventArgs e)
        {
            Song song = lstSongs.SelectedItem as Song;
            if (song == null)
            {
                MessageBox.Show("請先選擇一首曲目。");
                return;
            }

            PreviewSongRoll(song);
            lblStatus.Text = "狀態：已載入方塊預覽 - " + song.Name;
        }

        private void PreviewSongRoll(Song song)
        {
            if (song == null)
            {
                return;
            }

            currentPlaybackSong = song;
            playbackTotalMs = Math.Max(1, GetSongTotalMs(song));
            playbackPositionMs = 0;
            playbackPositionExactMs = 0.0;

            List<VisualRollNote> notes = BuildVisualNotes(song);
            pianoRoll.LoadNotes(notes);
            pianoRoll.SetCurrentTimeMs(0);

            if (trkProgress != null)
            {
                trkProgress.Enabled = true;
                updatingProgressUi = true;
                trkProgress.Value = 0;
                updatingProgressUi = false;
            }

            ApplyKeysAtSongPosition(song, 0, false);
            UpdateProgressLabel();
        }

        private async void BtnPlaySong_Click(object sender, EventArgs e)
        {
            Song song = lstSongs.SelectedItem as Song;
            if (song == null)
            {
                MessageBox.Show("請先選擇一首曲目。");
                return;
            }

            await StartPlaySingleSongAsync(song);
        }

        private void BtnAddToPlaylist_Click(object sender, EventArgs e)
        {
            Song song = lstSongs.SelectedItem as Song;
            if (song == null)
            {
                MessageBox.Show("請先選擇一首曲目。");
                return;
            }

            lstPlaylist.Items.Add(song);
            lblStatus.Text = "狀態：已加入播放清單 - " + song.Name;
        }

        private void BtnRemovePlaylist_Click(object sender, EventArgs e)
        {
            int index = lstPlaylist.SelectedIndex;
            if (index < 0)
            {
                return;
            }

            lstPlaylist.Items.RemoveAt(index);
        }

        private void BtnMoveUp_Click(object sender, EventArgs e)
        {
            int index = lstPlaylist.SelectedIndex;
            if (index <= 0)
            {
                return;
            }

            object item = lstPlaylist.Items[index];
            lstPlaylist.Items.RemoveAt(index);
            lstPlaylist.Items.Insert(index - 1, item);
            lstPlaylist.SelectedIndex = index - 1;
        }

        private void BtnMoveDown_Click(object sender, EventArgs e)
        {
            int index = lstPlaylist.SelectedIndex;
            if (index < 0 || index >= lstPlaylist.Items.Count - 1)
            {
                return;
            }

            object item = lstPlaylist.Items[index];
            lstPlaylist.Items.RemoveAt(index);
            lstPlaylist.Items.Insert(index + 1, item);
            lstPlaylist.SelectedIndex = index + 1;
        }

        private async void BtnPlayPlaylist_Click(object sender, EventArgs e)
        {
            if (lstPlaylist.Items.Count == 0)
            {
                MessageBox.Show("播放清單是空的，請先加入曲目。");
                return;
            }

            StopAutoPlay();
            StopAllNotes(false);

            autoPlayCts = new CancellationTokenSource();
            CancellationToken token = autoPlayCts.Token;

            try
            {
                for (int i = 0; i < lstPlaylist.Items.Count; i++)
                {
                    token.ThrowIfCancellationRequested();

                    Song song = lstPlaylist.Items[i] as Song;
                    if (song == null)
                    {
                        continue;
                    }

                    lstPlaylist.SelectedIndex = i;
                    lblStatus.Text = "狀態：播放清單演奏中 - " + song.Name;
                    if (trkProgress != null)
                    {
                        updatingProgressUi = true;
                        trkProgress.Value = 0;
                        updatingProgressUi = false;
                    }
                    BeginPlaybackProgress(song);
                    PrepareRollForPlayback(song);
                    await WaitPianoRollLeadInAsync(token);
                    await PlaySongCoreAsync(song, token);
                    pianoRoll.StopPlayback();
                    EndPlaybackProgress();
                    await WaitWithPauseAsync(250, token);
                }

                lblStatus.Text = "狀態：播放清單演奏完成。";
            }
            catch (OperationCanceledException)
            {
                lblStatus.Text = "狀態：播放清單已停止。";
            }
            finally
            {
                pianoRoll.StopPlayback();
                EndPlaybackProgress();
                StopAllNotes(false);

                if (autoPlayCts != null)
                {
                    autoPlayCts.Dispose();
                    autoPlayCts = null;
                }
            }
        }

        private void BtnStopSong_Click(object sender, EventArgs e)
        {
            StopAutoPlay();
            pianoRoll.StopPlayback();
            StopAllNotes();
        }

        private async Task StartPlaySingleSongAsync(Song song)
        {
            StopAutoPlay();
            StopAllNotes(false);

            autoPlayCts = new CancellationTokenSource();
            CancellationToken token = autoPlayCts.Token;

            try
            {
                lblStatus.Text = "狀態：正在自動演奏 - " + song.Name;
                BeginPlaybackProgress(song);
                PrepareRollForPlayback(song);
                if (playbackPositionMs <= 0)
                {
                    await WaitPianoRollLeadInAsync(token);
                }
                else
                {
                    pianoRoll.SetCurrentTimeMs(playbackPositionMs);
                    ApplyKeysAtSongPosition(song, playbackPositionMs, true);
                }
                await PlaySongCoreAsync(song, token);
                lblStatus.Text = "狀態：演奏完成 - " + song.Name;
            }
            catch (OperationCanceledException)
            {
                lblStatus.Text = "狀態：自動演奏已停止。";
            }
            finally
            {
                pianoRoll.StopPlayback();
                EndPlaybackProgress();
                StopAllNotes(false);

                if (autoPlayCts != null)
                {
                    autoPlayCts.Dispose();
                    autoPlayCts = null;
                }
            }
        }

        private void PrepareRollForPlayback(Song song)
        {
            List<VisualRollNote> notes = BuildVisualNotes(song);
            pianoRoll.LoadNotes(notes);

            // V18：不要讓 PianoRoll 自己用 Stopwatch 跑時間。
            // 視覺時間改由實際播放流程推進，這樣方塊碰到紅線時才會真正發聲。
            pianoRoll.SetCurrentTimeMs(-PianoRollLeadInMs);
        }

        private async Task PlaySongCoreAsync(Song song, CancellationToken token)
        {
            // V57：統一把所有來源轉成 RecordedMidiEvent 時間軸播放。
            // 這樣使用者拉動進度條時，不論是預設曲、PDF、截圖、MIDI、MusicXML、YouTube 來源，
            // 方塊位置與琴鍵亮起都可以跟著跳到正確時間點。
            List<RecordedMidiEvent> events = GetPlaybackEventsForSong(song);
            await PlayRecordedEventsCoreAsync(events, token);
        }

        private List<RecordedMidiEvent> GetPlaybackEventsForSong(Song song)
        {
            if (song == null)
            {
                return new List<RecordedMidiEvent>();
            }

            if (song.RecordedEvents != null && song.RecordedEvents.Count > 0)
            {
                return PrepareRecordedEventsForPlaybackFeel(song.RecordedEvents);
            }

            return PrepareRecordedEventsForPlaybackFeel(ConvertSongEventsToRecordedEvents(song.Events));
        }

        private List<RecordedMidiEvent> ConvertSongEventsToRecordedEvents(List<SongEvent> events)
        {
            List<RecordedMidiEvent> result = new List<RecordedMidiEvent>();

            if (events == null)
            {
                return result;
            }

            int time = 0;
            foreach (SongEvent ev in events)
            {
                int hold = Math.Max(1, ev.HoldMs);

                foreach (int midi in ev.Notes)
                {
                    RecordedMidiEvent on = new RecordedMidiEvent();
                    on.TimeMs = time;
                    on.Midi = midi;
                    on.IsNoteOn = true;
                    on.Velocity = velocity;
                    on.Hand = midi < 60 ? 0 : 1;
                    result.Add(on);

                    RecordedMidiEvent off = new RecordedMidiEvent();
                    off.TimeMs = time + hold;
                    off.Midi = midi;
                    off.IsNoteOn = false;
                    off.Velocity = 0;
                    off.Hand = midi < 60 ? 0 : 1;
                    result.Add(off);
                }

                time += Math.Max(1, ev.DurationMs);
            }

            return result;
        }

        private async Task WaitPianoRollLeadInAsync(CancellationToken token)
        {
            // V19：前導落下時間也吃速度滑桿。
            // 例如速度 150%，方塊會更快落到紅線；速度 60%，方塊會較慢落下。
            double elapsedScoreMs = 0.0;

            while (elapsedScoreMs < PianoRollLeadInMs)
            {
                token.ThrowIfCancellationRequested();

                if (playbackPaused)
                {
                    await Task.Delay(50, token);
                    continue;
                }

                double tempoFactor = GetTempoFactor();
                double remainingScoreMs = PianoRollLeadInMs - elapsedScoreMs;
                int delayMs = (int)Math.Max(1, Math.Min(20, Math.Ceiling(remainingScoreMs / tempoFactor)));

                await Task.Delay(delayMs, token);

                elapsedScoreMs += delayMs * tempoFactor;
                if (elapsedScoreMs > PianoRollLeadInMs)
                {
                    elapsedScoreMs = PianoRollLeadInMs;
                }

                if (pianoRoll != null)
                {
                    pianoRoll.SetCurrentTimeMs((int)Math.Round(-PianoRollLeadInMs + elapsedScoreMs));
                }
            }

            if (pianoRoll != null)
            {
                pianoRoll.SetCurrentTimeMs(0);
            }
        }

        private async Task WaitWithPauseAsync(int scoreMilliseconds, CancellationToken token)
        {
            // V19：scoreMilliseconds 是樂譜原始時間，不是實際等待時間。
            // 實際等待多久由目前速度滑桿決定，所以播放中改速度也會立即生效。
            double elapsedScoreMs = 0.0;

            while (elapsedScoreMs < scoreMilliseconds)
            {
                token.ThrowIfCancellationRequested();

                if (playbackPaused)
                {
                    await Task.Delay(50, token);
                    continue;
                }

                double tempoFactor = GetTempoFactor();
                double remainingScoreMs = scoreMilliseconds - elapsedScoreMs;
                int delayMs = (int)Math.Max(1, Math.Min(20, Math.Ceiling(remainingScoreMs / tempoFactor)));

                await Task.Delay(delayMs, token);

                double advancedScoreMs = delayMs * tempoFactor;
                elapsedScoreMs += advancedScoreMs;
                playbackPositionExactMs += advancedScoreMs;

                if (elapsedScoreMs > scoreMilliseconds)
                {
                    double overshoot = elapsedScoreMs - scoreMilliseconds;
                    elapsedScoreMs = scoreMilliseconds;
                    playbackPositionExactMs -= overshoot;
                }

                playbackPositionMs = (int)Math.Round(playbackPositionExactMs);

                if (pianoRoll != null)
                {
                    pianoRoll.SetCurrentTimeMs(playbackPositionMs);
                }
            }
        }

        private double GetTempoFactor()
        {
            double playbackBpm = GetPlaybackBpm();
            double baseBpm = activePlaybackBaseBpm;

            if (baseBpm <= 0.0)
            {
                baseBpm = 120.0;
            }

            if (playbackBpm <= 0.0)
            {
                playbackBpm = baseBpm;
            }

            // V56：速度改成 BPM。倍率 = 使用者輸入 BPM / 原曲基準 BPM。
            // TextBox 不設上限，不再使用 40%~180% 這種百分比限制。
            return Math.Max(0.01, playbackBpm / baseBpm);
        }

        private void TxtPlaybackBpm_TextChanged(object sender, EventArgs e)
        {
            UpdatePlaybackBpmInfo();

            if (pianoRoll != null)
            {
                pianoRoll.Invalidate();
            }
        }

        private double GetPlaybackBpm()
        {
            if (txtPlaybackBpm == null)
            {
                return activePlaybackBaseBpm > 0.0 ? activePlaybackBaseBpm : 120.0;
            }

            double bpm;
            if (double.TryParse(txtPlaybackBpm.Text.Trim(), out bpm) && bpm > 0.0)
            {
                return bpm;
            }

            return activePlaybackBaseBpm > 0.0 ? activePlaybackBaseBpm : 120.0;
        }

        private double GetSongBaseBpm(Song song)
        {
            if (song != null && song.TempoBpm >= 1.0)
            {
                return song.TempoBpm;
            }

            return 120.0;
        }

        private void SetPlaybackBpmFromSong(Song song)
        {
            activePlaybackBaseBpm = GetSongBaseBpm(song);

            if (txtPlaybackBpm != null)
            {
                txtPlaybackBpm.Text = activePlaybackBaseBpm.ToString("0.##");
            }

            UpdatePlaybackBpmInfo();
        }

        private void UpdatePlaybackBpmInfo()
        {
            if (lblPlaybackBpmInfo == null)
            {
                return;
            }

            double bpm = GetPlaybackBpm();
            double baseBpm = activePlaybackBaseBpm <= 0.0 ? 120.0 : activePlaybackBaseBpm;
            double factor = bpm / baseBpm;

            lblPlaybackBpmInfo.Text = "基準 " + baseBpm.ToString("0.##") + " BPM｜倍率 " + factor.ToString("0.00") + "x";
        }

        private void BeginPlaybackProgress(Song song)
        {
            currentPlaybackSong = song;
            activePlaybackBaseBpm = GetSongBaseBpm(song);
            UpdatePlaybackBpmInfo();

            playbackPaused = false;
            playbackRunning = true;
            playbackSeekRequested = false;
            playbackTotalMs = Math.Max(1, GetSongTotalMs(song));

            // 若使用者已經先拉動進度條，就從該位置開始播放；否則從頭開始。
            if (trkProgress != null && trkProgress.Enabled && trkProgress.Value > 0 && trkProgress.Value < 1000 && !progressUserDragging)
            {
                playbackPositionMs = (int)Math.Round(trkProgress.Value * playbackTotalMs / 1000.0);
                playbackPositionExactMs = playbackPositionMs;
            }
            else
            {
                playbackPositionMs = 0;
                playbackPositionExactMs = 0.0;
            }

            if (trkProgress != null)
            {
                trkProgress.Enabled = true;
                updatingProgressUi = true;
                trkProgress.Value = Math.Max(0, Math.Min(1000, (int)Math.Round(playbackPositionMs * 1000.0 / playbackTotalMs)));
                updatingProgressUi = false;
            }

            if (btnPauseResume != null)
            {
                btnPauseResume.Text = "暫停";
            }

            UpdateProgressLabel();

            if (playbackProgressTimer != null)
            {
                playbackProgressTimer.Start();
            }
        }

        private void EndPlaybackProgress()
        {
            playbackRunning = false;
            playbackPaused = false;

            if (playbackProgressTimer != null)
            {
                playbackProgressTimer.Stop();
            }

            if (btnPauseResume != null)
            {
                btnPauseResume.Text = "暫停";
            }

            UpdateProgressLabel();
        }

        private int GetSongTotalMs(Song song)
        {
            if (song == null)
            {
                return 1;
            }

            if (song.RecordedEvents != null && song.RecordedEvents.Count > 0)
            {
                List<RecordedMidiEvent> prepared = PrepareRecordedEventsForPlaybackFeel(song.RecordedEvents);
                int max = prepared.Count == 0 ? song.RecordedEvents.Max(x => x.TimeMs) : prepared.Max(x => x.TimeMs);
                return Math.Max(1, max);
            }

            int total = 0;
            foreach (SongEvent ev in song.Events)
            {
                total += ev.DurationMs;
            }

            return Math.Max(1, total);
        }

        private void PlaybackProgressTimer_Tick(object sender, EventArgs e)
        {
            UpdateProgressLabel();
        }

        private void UpdateProgressLabel()
        {
            int pos = Math.Max(0, Math.Min(playbackPositionMs, playbackTotalMs));

            if (trkProgress != null && !progressUserDragging && !updatingProgressUi)
            {
                int value = playbackTotalMs <= 0 ? 0 : (int)(pos * 1000.0 / playbackTotalMs);
                value = Math.Max(0, Math.Min(1000, value));
                updatingProgressUi = true;
                trkProgress.Value = value;
                updatingProgressUi = false;
            }

            if (lblProgress != null)
            {
                lblProgress.Text = "進度：" + FormatTime(pos) + " / " + FormatTime(playbackTotalMs);
            }
        }

        private string FormatTime(int ms)
        {
            TimeSpan ts = TimeSpan.FromMilliseconds(Math.Max(0, ms));
            return ts.Minutes.ToString("00") + ":" + ts.Seconds.ToString("00");
        }

        private void TrkProgress_MouseDown(object sender, MouseEventArgs e)
        {
            progressUserDragging = true;
            SeekOrPreviewFromProgressTrackBar(false);
        }

        private void TrkProgress_MouseUp(object sender, MouseEventArgs e)
        {
            progressUserDragging = false;
            SeekOrPreviewFromProgressTrackBar(true);
        }

        private void TrkProgress_Scroll(object sender, EventArgs e)
        {
            SeekOrPreviewFromProgressTrackBar(playbackRunning);
        }

        private void TrkProgress_KeyUp(object sender, KeyEventArgs e)
        {
            SeekOrPreviewFromProgressTrackBar(true);
        }

        private void SeekOrPreviewFromProgressTrackBar(bool requestPlaybackSeek)
        {
            if (updatingProgressUi || trkProgress == null)
            {
                return;
            }

            int target = playbackTotalMs <= 0 ? 0 : (int)Math.Round(trkProgress.Value * playbackTotalMs / 1000.0);
            SeekOrPreviewPlaybackPosition(target, requestPlaybackSeek);
        }

        private void SeekOrPreviewPlaybackPosition(int targetMs, bool requestPlaybackSeek)
        {
            targetMs = Math.Max(0, Math.Min(playbackTotalMs, targetMs));
            playbackPositionMs = targetMs;
            playbackPositionExactMs = targetMs;

            if (pianoRoll != null)
            {
                pianoRoll.SetCurrentTimeMs(targetMs);
            }

            Song song = currentPlaybackSong;
            if (song == null && lstSongs != null)
            {
                song = lstSongs.SelectedItem as Song;
            }

            ApplyKeysAtSongPosition(song, targetMs, playbackRunning && !playbackPaused);

            if (playbackRunning && requestPlaybackSeek)
            {
                playbackSeekTargetMs = targetMs;
                playbackSeekRequested = true;
                lblStatus.Text = "狀態：已跳到 " + FormatTime(targetMs) + "。";
            }

            UpdateProgressLabel();
        }

        private void ApplyKeysAtSongPosition(Song song, int positionMs, bool soundActiveNotes)
        {
            if (song == null)
            {
                StopAllNotes(false);
                return;
            }

            List<RecordedMidiEvent> events = GetPlaybackEventsForSong(song);
            ApplyKeysAtRecordedPosition(events, positionMs, soundActiveNotes);
        }

        private void ApplyKeysAtRecordedPosition(List<RecordedMidiEvent> events, int positionMs, bool soundActiveNotes)
        {
            StopAllNotes(false);

            if (events == null || events.Count == 0)
            {
                return;
            }

            Dictionary<int, RecordedMidiEvent> active = new Dictionary<int, RecordedMidiEvent>();

            foreach (RecordedMidiEvent ev in events.OrderBy(x => x.TimeMs).ThenBy(x => x.IsNoteOn ? 1 : 0))
            {
                if (ev.TimeMs > positionMs)
                {
                    break;
                }

                if (ev.IsNoteOn && ev.Velocity > 0)
                {
                    active[ev.Midi] = ev;
                }
                else
                {
                    if (active.ContainsKey(ev.Midi))
                    {
                        active.Remove(ev.Midi);
                    }
                }
            }

            foreach (RecordedMidiEvent ev in active.Values)
            {
                if (soundActiveNotes)
                {
                    SendNoteOn(ev.Midi, ev.Velocity);
                }

                pianoControl.SetPressed(ev.Midi, true);
            }
        }

        private int FindFirstEventIndexAfter(List<RecordedMidiEvent> events, int positionMs)
        {
            for (int i = 0; i < events.Count; i++)
            {
                if (events[i].TimeMs > positionMs)
                {
                    return i;
                }
            }

            return events.Count;
        }

        private void BtnPauseResume_Click(object sender, EventArgs e)
        {
            if (!playbackRunning)
            {
                return;
            }

            playbackPaused = !playbackPaused;

            if (playbackPaused)
            {
                StopAllNotes(false);
                pianoRoll.PausePlayback();
                btnPauseResume.Text = "繼續";
                lblStatus.Text = "狀態：已暫停。";
            }
            else
            {
                pianoRoll.ResumePlayback();
                btnPauseResume.Text = "暫停";
                lblStatus.Text = "狀態：繼續播放。";
            }
        }

        private void StopAutoPlay()
        {
            if (autoPlayCts != null)
            {
                autoPlayCts.Cancel();
            }

            EndPlaybackProgress();
        }

        private int ScaleByTempo(int ms)
        {
            double factor = GetTempoFactor();
            if (factor <= 0.0)
            {
                factor = 1.0;
            }

            return (int)Math.Round(ms / factor);
        }

        private List<Song> BuildPresetSongs()
        {
            List<Song> songs = new List<Song>();

            Song s1 = new Song("給愛麗絲 前段", "古典", "貝多芬《給愛麗絲》開頭片段。", true);
            s1.Events.AddRange(new[]
            {
                E(300, "E5"), E(300, "D#5"), E(300, "E5"), E(300, "D#5"),
                E(300, "E5"), E(300, "B4"), E(300, "D5"), E(300, "C5"),
                E(650, "A4"),
                E(350, "C4", "E4", "A4"),
                E(300, "E4"), E(300, "A4"), E(300, "B4"),
                E(350, "E4", "G#4", "B4"),
                E(300, "G#4"), E(300, "B4"), E(300, "C5"),
                E(800, "A4")
            });
            songs.Add(s1);

            Song s2 = new Song("月亮代表我的心（簡化）", "中文流行", "中文歌曲示範，使用簡化主旋律片段。", true);
            s2.Events.AddRange(new[]
            {
                E(500, "E4"), E(500, "G4"), E(500, "A4"), E(700, "G4"),
                E(500, "E4"), E(500, "D4"), E(700, "C4"),
                E(500, "E4"), E(500, "G4"), E(500, "A4"), E(700, "G4"),
                E(500, "E4"), E(500, "D4"), E(900, "C4")
            });
            songs.Add(s2);

            Song s3 = new Song("Lemon（簡化）", "日文流行", "日文歌曲示範，簡化副歌感覺片段。", true);
            s3.Events.AddRange(new[]
            {
                E(450, "A4"), E(450, "B4"), E(450, "C5"), E(650, "B4"),
                E(450, "A4"), E(450, "G4"), E(700, "E4"),
                E(450, "E4"), E(450, "G4"), E(450, "A4"), E(650, "B4"),
                E(450, "C5"), E(450, "B4"), E(900, "A4")
            });
            songs.Add(s3);

            Song s4 = new Song("Spring Day（簡化）", "韓文流行", "韓文歌曲示範，簡化旋律片段。", true);
            s4.Events.AddRange(new[]
            {
                E(500, "G4"), E(500, "A4"), E(700, "B4"),
                E(500, "A4"), E(500, "G4"), E(700, "E4"),
                E(500, "G4"), E(500, "A4"), E(700, "B4"),
                E(500, "D5"), E(500, "B4"), E(900, "A4")
            });
            songs.Add(s4);

            Song s5 = new Song("Let It Be（簡化）", "英文流行", "英文歌曲示範，簡化副歌旋律。", true);
            s5.Events.AddRange(new[]
            {
                E(500, "G4"), E(500, "G4"), E(500, "A4"), E(700, "C5"),
                E(500, "C5"), E(500, "A4"), E(500, "G4"), E(700, "F4"),
                E(500, "E4"), E(500, "D4"), E(1000, "C4")
            });
            songs.Add(s5);

            Song s6 = new Song("流行和弦練習", "現代流行", "常見 C - G - Am - F 和弦走向，可搭配上方落下方塊觀看。", true);
            s6.Events.AddRange(new[]
            {
                E(700, "C4", "E4", "G4"),
                E(700, "G3", "B3", "D4"),
                E(700, "A3", "C4", "E4"),
                E(700, "F3", "A3", "C4"),
                E(350, "C5"), E(350, "B4"), E(350, "A4"), E(350, "G4"),
                E(350, "E4"), E(350, "G4"), E(900, "C5")
            });
            songs.Add(s6);

            return songs;
        }

        #endregion


        #region MusicXML / OMR 琴譜辨識

        private void BtnImportMusicXml_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "匯入 MusicXML 檔";
            dlg.Filter = "MusicXML|*.musicxml;*.xml;*.mxl|所有檔案|*.*";

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            try
            {
                Song song = LoadMusicXmlAsSong(dlg.FileName);
                AddImportedSong(song);
                lblStatus.Text = "狀態：已匯入 MusicXML - " + Path.GetFileName(dlg.FileName);
            }
            catch (Exception ex)
            {
                MessageBox.Show("MusicXML 匯入失敗：" + ex.Message);
            }
        }

        private void BtnSelectAudiveris_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "選擇 Audiveris 執行檔或 audiveris.jar";
            dlg.Filter = "Audiveris|*.exe;*.bat;*.cmd;*.jar|所有檔案|*.*";

            if (File.Exists(audiverisPath))
            {
                dlg.InitialDirectory = Path.GetDirectoryName(audiverisPath);
            }
            else if (Directory.Exists(@"C:\Program Files\Audiveris"))
            {
                dlg.InitialDirectory = @"C:\Program Files\Audiveris";
            }

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            audiverisPath = dlg.FileName;
            SaveExternalToolSettings();
            UpdateExternalToolUi();
            lblStatus.Text = "狀態：已設定 Audiveris - " + Path.GetFileName(audiverisPath);
        }


        private void BtnSelectPoppler_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "選擇 Poppler 的 pdftoppm.exe";
            dlg.Filter = "pdftoppm.exe|pdftoppm.exe|所有檔案|*.*";

            if (File.Exists(popplerPdftoppmPath))
            {
                dlg.InitialDirectory = Path.GetDirectoryName(popplerPdftoppmPath);
            }
            else
            {
                string detectedPoppler = AutoDetectPopplerPath();
                if (File.Exists(detectedPoppler))
                {
                    dlg.InitialDirectory = Path.GetDirectoryName(detectedPoppler);
                }
            }

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            popplerPdftoppmPath = dlg.FileName;
            SaveExternalToolSettings();
            UpdateExternalToolUi();
            lblStatus.Text = "狀態：已設定 Poppler - " + Path.GetFileName(popplerPdftoppmPath);
        }

        private void LoadExternalToolSettings()
        {
            toolSettingsPath = GetToolSettingsPath();
            audiverisPath = "";
            popplerPdftoppmPath = "";
            ytdlpPath = "";
            basicPitchPath = "";
            demucsPath = "";
            string pendingOmrModeFromSettings = "";
            string pendingManualOmrTempo = "";
            string pendingOmrTempoBpm = "";

            try
            {
                if (File.Exists(toolSettingsPath))
                {
                    string[] lines = File.ReadAllLines(toolSettingsPath, Encoding.UTF8);
                    foreach (string rawLine in lines)
                    {
                        string line = rawLine.Trim();
                        if (line.Length == 0 || line.StartsWith("#"))
                        {
                            continue;
                        }

                        int index = line.IndexOf('=');
                        if (index <= 0)
                        {
                            continue;
                        }

                        string key = line.Substring(0, index).Trim();
                        string value = line.Substring(index + 1).Trim();

                        if (string.Equals(key, "AudiverisPath", StringComparison.OrdinalIgnoreCase))
                        {
                            audiverisPath = value;
                        }
                        else if (string.Equals(key, "PopplerPath", StringComparison.OrdinalIgnoreCase))
                        {
                            popplerPdftoppmPath = value;
                        }
                        else if (string.Equals(key, "YtDlpPath", StringComparison.OrdinalIgnoreCase))
                        {
                            ytdlpPath = value;
                        }
                        else if (string.Equals(key, "BasicPitchPath", StringComparison.OrdinalIgnoreCase))
                        {
                            basicPitchPath = value;
                        }
                        else if (string.Equals(key, "DemucsPath", StringComparison.OrdinalIgnoreCase))
                        {
                            demucsPath = value;
                        }
                        else if (string.Equals(key, "OmrMode", StringComparison.OrdinalIgnoreCase))
                        {
                            pendingOmrModeFromSettings = value;
                        }
                        else if (string.Equals(key, "ManualOmrTempo", StringComparison.OrdinalIgnoreCase))
                        {
                            pendingManualOmrTempo = value;
                        }
                        else if (string.Equals(key, "OmrTempoBpm", StringComparison.OrdinalIgnoreCase))
                        {
                            pendingOmrTempoBpm = value;
                        }
                    }
                }
            }
            catch
            {
            }

            if (!File.Exists(audiverisPath))
            {
                audiverisPath = AutoDetectAudiverisPath();
            }

            if (!File.Exists(popplerPdftoppmPath))
            {
                popplerPdftoppmPath = AutoDetectPopplerPath();
            }

            if (!File.Exists(ytdlpPath))
            {
                ytdlpPath = AutoDetectYtDlpPath();
            }

            if (!File.Exists(basicPitchPath))
            {
                basicPitchPath = AutoDetectBasicPitchPath();
            }

            if (!File.Exists(demucsPath))
            {
                demucsPath = AutoDetectDemucsPath();
            }

            if (File.Exists(audiverisPath) || File.Exists(popplerPdftoppmPath) || File.Exists(ytdlpPath) || File.Exists(basicPitchPath) || File.Exists(demucsPath))
            {
                SaveExternalToolSettings();
            }

            UpdateExternalToolUi();
            ApplyOmrModeFromSettings(pendingOmrModeFromSettings);
            ApplyOmrTempoFromSettings(pendingManualOmrTempo, pendingOmrTempoBpm);
            UpdateOmrTempoPreviewLabel();
        }

        private string GetToolSettingsPath()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string folder = Path.Combine(appData, "SimplePianoOmr");
            Directory.CreateDirectory(folder);
            return Path.Combine(folder, "PianoSettings.txt");
        }

        private void SaveExternalToolSettings()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(toolSettingsPath))
                {
                    toolSettingsPath = GetToolSettingsPath();
                }

                List<string> lines = new List<string>();
                lines.Add("# Simple Piano OMR external tools settings");
                lines.Add("AudiverisPath=" + (audiverisPath ?? ""));
                lines.Add("PopplerPath=" + (popplerPdftoppmPath ?? ""));
                lines.Add("YtDlpPath=" + (ytdlpPath ?? ""));
                lines.Add("BasicPitchPath=" + (basicPitchPath ?? ""));
                lines.Add("DemucsPath=" + (demucsPath ?? ""));
                lines.Add("OmrMode=" + GetSelectedOmrMode());
                lines.Add("ManualOmrTempo=" + (IsManualOmrTempoEnabled() ? "true" : "false"));
                lines.Add("OmrTempoBpm=" + GetSelectedOmrBpm().ToString("0"));
                File.WriteAllLines(toolSettingsPath, lines.ToArray(), Encoding.UTF8);
            }
            catch
            {
            }
        }

        private void UpdateExternalToolUi()
        {
            if (btnSelectAudiveris != null)
            {
                btnSelectAudiveris.Text = File.Exists(audiverisPath) ? "Audiveris ✓" : "選 Audiveris";
            }

            if (btnSelectPoppler != null)
            {
                btnSelectPoppler.Text = File.Exists(popplerPdftoppmPath) ? "Poppler ✓" : "選 Poppler";
            }

            if (btnSelectYtDlp != null)
            {
                btnSelectYtDlp.Text = File.Exists(ytdlpPath) ? "yt-dlp ✓" : "yt-dlp";
            }

            if (btnSelectBasicPitch != null)
            {
                btnSelectBasicPitch.Text = File.Exists(basicPitchPath) ? "Basic Pitch ✓" : "Basic Pitch";
            }

            if (btnSelectDemucs != null)
            {
                btnSelectDemucs.Text = File.Exists(demucsPath) ? "Demucs ✓" : "Demucs";
            }
        }

        private string GetSelectedOmrMode()
        {
            if (cmbOmrMode == null || cmbOmrMode.SelectedItem == null)
            {
                return "平衡";
            }

            string mode = cmbOmrMode.SelectedItem.ToString();
            if (mode == "快速" || mode == "平衡" || mode == "準確")
            {
                return mode;
            }

            return "平衡";
        }

        private void ApplyOmrModeFromSettings(string mode)
        {
            if (cmbOmrMode == null || string.IsNullOrWhiteSpace(mode))
            {
                return;
            }

            for (int i = 0; i < cmbOmrMode.Items.Count; i++)
            {
                if (string.Equals(cmbOmrMode.Items[i].ToString(), mode, StringComparison.OrdinalIgnoreCase))
                {
                    cmbOmrMode.SelectedIndex = i;
                    return;
                }
            }
        }

        private bool IsManualOmrTempoEnabled()
        {
            return chkManualOmrTempo != null && chkManualOmrTempo.Checked;
        }

        private double GetSelectedOmrBpm()
        {
            if (nudOmrTempo == null)
            {
                return 102.0;
            }

            double bpm = (double)nudOmrTempo.Value;
            if (bpm < 40.0) bpm = 40.0;
            if (bpm > 240.0) bpm = 240.0;
            return bpm;
        }

        private void ApplyOmrTempoFromSettings(string enabledText, string bpmText)
        {
            if (chkManualOmrTempo != null)
            {
                bool enabled;
                if (bool.TryParse(enabledText, out enabled))
                {
                    chkManualOmrTempo.Checked = enabled;
                }
            }

            if (nudOmrTempo != null)
            {
                decimal bpm;
                if (decimal.TryParse(bpmText, out bpm))
                {
                    if (bpm < nudOmrTempo.Minimum) bpm = nudOmrTempo.Minimum;
                    if (bpm > nudOmrTempo.Maximum) bpm = nudOmrTempo.Maximum;
                    nudOmrTempo.Value = bpm;
                }
            }
        }

        private void UpdateOmrTempoPreviewLabel()
        {
            if (lblOmrBpmPreview == null || lblOmrBpmPreview.IsDisposed)
            {
                return;
            }

            if (IsManualOmrTempoEnabled())
            {
                lblOmrBpmPreview.Text = "目前使用：手動 " + GetSelectedOmrBpm().ToString("0") + " BPM";
                lblOmrBpmPreview.ForeColor = Color.FromArgb(37, 99, 235);
            }
            else
            {
                lblOmrBpmPreview.Text = "目前使用：自動讀譜；讀不到時預設 102 BPM";
                lblOmrBpmPreview.ForeColor = Color.FromArgb(71, 85, 105);
            }
        }

        private string GetSongTempoDescription(Song song)
        {
            if (song == null || song.TempoBpm <= 0.0)
            {
                return "未標示";
            }

            string source = string.IsNullOrWhiteSpace(song.TempoSource) ? "未標示來源" : song.TempoSource;
            return source + "，" + song.TempoBpm.ToString("0.##") + " BPM";
        }

        private Song LoadOmrMusicXmlAsSong(string filePath)
        {
            return LoadMusicXmlAsSong(filePath, GetSelectedOmrBpm(), IsManualOmrTempoEnabled());
        }


        private string AutoDetectAudiverisPath()
        {
            List<string> candidates = new List<string>();

            AddCandidatePath(candidates, @"C:\Program Files\Audiveris\Audiveris.exe");
            AddCandidatePath(candidates, @"C:\Program Files\Audiveris\bin\Audiveris.bat");
            AddCandidatePath(candidates, @"C:\Program Files\Audiveris\bin\Audiveris.exe");
            AddCandidatePath(candidates, @"C:\Program Files (x86)\Audiveris\Audiveris.exe");
            AddCandidatePath(candidates, @"C:\Program Files (x86)\Audiveris\bin\Audiveris.bat");
            AddCandidatePath(candidates, FindExecutableInPath("Audiveris.exe"));
            AddCandidatePath(candidates, FindExecutableInPath("audiveris.bat"));

            AddCandidatePath(candidates, FindNearApplication("Audiveris.exe"));
            AddCandidatePath(candidates, FindNearApplication("audiveris.bat"));
            AddCandidatePath(candidates, FindNearApplication("audiveris.jar"));

            foreach (string path in candidates)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return "";
        }

        private string AutoDetectPopplerPath()
        {
            List<string> candidates = new List<string>();

            AddCandidatePath(candidates, @"C:\Tools\poppler\Library\bin\pdftoppm.exe");
            AddCandidatePath(candidates, @"C:\poppler\Library\bin\pdftoppm.exe");
            AddCandidatePath(candidates, @"C:\Program Files\poppler\Library\bin\pdftoppm.exe");
            AddCandidatePath(candidates, @"C:\Program Files\Poppler\Library\bin\pdftoppm.exe");
            AddCandidatePath(candidates, FindExecutableInPath("pdftoppm.exe"));
            AddCandidatePath(candidates, FindNearApplication("pdftoppm.exe"));

            foreach (string path in candidates)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return "";
        }

        private string AutoDetectYtDlpPath()
        {
            List<string> candidates = new List<string>();

            AddCandidatePath(candidates, FindExecutableInPath("yt-dlp.exe"));
            AddCandidatePath(candidates, FindExecutableInPath("yt-dlp"));
            AddCandidatePath(candidates, FindNearApplication("yt-dlp.exe"));
            AddCandidatePath(candidates, FindNearApplication("yt-dlp"));
            AddPythonScriptsExecutableCandidates(candidates, "yt-dlp.exe");
            AddCandidatePath(candidates, @"C:\Tools\yt-dlp\yt-dlp.exe");

            foreach (string path in candidates)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return "";
        }

        private string AutoDetectBasicPitchPath()
        {
            List<string> candidates = new List<string>();

            AddCandidatePath(candidates, FindExecutableInPath("basic-pitch.exe"));
            AddCandidatePath(candidates, FindExecutableInPath("basic-pitch"));
            AddCandidatePath(candidates, FindNearApplication("basic-pitch.exe"));
            AddCandidatePath(candidates, FindNearApplication("basic-pitch"));
            AddPythonScriptsExecutableCandidates(candidates, "basic-pitch.exe");

            foreach (string path in candidates)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return "";
        }

        private string AutoDetectDemucsPath()
        {
            List<string> candidates = new List<string>();

            AddCandidatePath(candidates, FindExecutableInPath("demucs.exe"));
            AddCandidatePath(candidates, FindExecutableInPath("demucs"));
            AddCandidatePath(candidates, FindNearApplication("demucs.exe"));
            AddCandidatePath(candidates, FindNearApplication("demucs"));
            AddPythonScriptsExecutableCandidates(candidates, "demucs.exe");

            foreach (string path in candidates)
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }

            return "";
        }

        private void AddPythonScriptsExecutableCandidates(List<string> candidates, string fileName)
        {
            try
            {
                List<string> roots = new List<string>();

                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

                if (!string.IsNullOrWhiteSpace(appData))
                {
                    AddCandidatePath(roots, Path.Combine(appData, "Python"));
                }

                if (!string.IsNullOrWhiteSpace(localAppData))
                {
                    AddCandidatePath(roots, Path.Combine(localAppData, "Programs", "Python"));
                }

                if (!string.IsNullOrWhiteSpace(programFiles))
                {
                    AddCandidatePath(roots, programFiles);
                }

                if (!string.IsNullOrWhiteSpace(programFilesX86))
                {
                    AddCandidatePath(roots, programFilesX86);
                }

                foreach (string root in roots)
                {
                    if (!Directory.Exists(root))
                    {
                        continue;
                    }

                    string[] pythonDirs = Directory.GetDirectories(root, "Python*", SearchOption.TopDirectoryOnly);
                    foreach (string pyDir in pythonDirs)
                    {
                        AddCandidatePath(candidates, Path.Combine(pyDir, "Scripts", fileName));
                    }

                    AddCandidatePath(candidates, Path.Combine(root, "Scripts", fileName));
                }

                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                if (!string.IsNullOrWhiteSpace(userProfile))
                {
                    string roamingPython = Path.Combine(userProfile, "AppData", "Roaming", "Python");
                    if (Directory.Exists(roamingPython))
                    {
                        string[] pythonDirs = Directory.GetDirectories(roamingPython, "Python*", SearchOption.TopDirectoryOnly);
                        foreach (string pyDir in pythonDirs)
                        {
                            AddCandidatePath(candidates, Path.Combine(pyDir, "Scripts", fileName));
                        }
                    }
                }
            }
            catch
            {
            }
        }

        private void AddCandidatePath(List<string> list, string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return;
            }

            if (!list.Contains(path))
            {
                list.Add(path);
            }
        }

        private string FindExecutableInPath(string fileName)
        {
            try
            {
                string pathVariable = Environment.GetEnvironmentVariable("PATH");
                if (string.IsNullOrWhiteSpace(pathVariable))
                {
                    return "";
                }

                string[] folders = pathVariable.Split(Path.PathSeparator);
                foreach (string folder in folders)
                {
                    if (string.IsNullOrWhiteSpace(folder))
                    {
                        continue;
                    }

                    string candidate = Path.Combine(folder.Trim(), fileName);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
            }
            catch
            {
            }

            return "";
        }

        private string FindNearApplication(string fileName)
        {
            try
            {
                DirectoryInfo dir = new DirectoryInfo(Application.StartupPath);
                for (int i = 0; i < 4 && dir != null; i++)
                {
                    string direct = Path.Combine(dir.FullName, fileName);
                    if (File.Exists(direct))
                    {
                        return direct;
                    }

                    string tools = Path.Combine(dir.FullName, "Tools");
                    if (Directory.Exists(tools))
                    {
                        string[] matches = Directory.GetFiles(tools, fileName, SearchOption.AllDirectories);
                        if (matches.Length > 0)
                        {
                            return matches[0];
                        }
                    }

                    string lowerTools = Path.Combine(dir.FullName, "tools");
                    if (Directory.Exists(lowerTools))
                    {
                        string[] matches = Directory.GetFiles(lowerTools, fileName, SearchOption.AllDirectories);
                        if (matches.Length > 0)
                        {
                            return matches[0];
                        }
                    }

                    dir = dir.Parent;
                }
            }
            catch
            {
            }

            return "";
        }

        private bool HasPdfInput(List<string> inputPaths)
        {
            foreach (string path in inputPaths)
            {
                if (string.Equals(Path.GetExtension(path), ".pdf", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private bool EnsureExternalToolsReady(bool needPoppler)
        {
            if (!File.Exists(audiverisPath))
            {
                audiverisPath = AutoDetectAudiverisPath();
            }

            if (!File.Exists(popplerPdftoppmPath))
            {
                popplerPdftoppmPath = AutoDetectPopplerPath();
            }

            UpdateExternalToolUi();

            if (File.Exists(audiverisPath) && (!needPoppler || File.Exists(popplerPdftoppmPath)))
            {
                SaveExternalToolSettings();
                return true;
            }

            ShowMissingExternalToolsDialog(!File.Exists(audiverisPath), needPoppler && !File.Exists(popplerPdftoppmPath));
            return false;
        }

        private void ShowMissingExternalToolsDialog(bool needAudiveris, bool needPoppler)
        {
            Form form = new Form();
            form.Text = "缺少 OMR 辨識工具";
            form.StartPosition = FormStartPosition.CenterParent;
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.ClientSize = new Size(580, 330);
            form.Font = new Font("Microsoft JhengHei UI", 10F);

            Label title = new Label();
            title.Text = "助教您好，OMR 辨識需要先設定工具";
            title.Font = new Font("Microsoft JhengHei UI", 13F, FontStyle.Bold);
            title.AutoSize = false;
            title.Location = new Point(18, 16);
            title.Size = new Size(520, 30);
            form.Controls.Add(title);

            Label body = new Label();
            body.AutoSize = false;
            body.Location = new Point(20, 55);
            body.Size = new Size(540, 110);
            body.Text =
                "這台電腦目前還沒有找到 Audiveris，所以不能使用琴譜辨識。" + Environment.NewLine +
                "Audiveris 是必要的，負責把樂譜辨識成 MusicXML。" + Environment.NewLine +
                "Poppler 不是必裝，只有 PDF 很複雜、圖片太小，或辨識效果不好時再設定即可。" + Environment.NewLine +
                "如果沒有安裝這兩個工具，鋼琴彈奏、MIDI 匯入、MusicXML 匯入等功能仍然可以正常使用。";
            form.Controls.Add(body);

            int y = 175;
            if (needAudiveris)
            {
                LinkLabel audiverisLink = new LinkLabel();
                audiverisLink.Text = "下載 Audiveris（必要，建議可用 winget install Audiveris）";
                audiverisLink.Location = new Point(22, y);
                audiverisLink.Size = new Size(510, 24);
                audiverisLink.LinkClicked += delegate
                {
                    OpenExternal("https://audiveris.github.io/audiveris/_pages/tutorials/install/binaries/");
                };
                form.Controls.Add(audiverisLink);
                y += 32;
            }

            if (needPoppler)
            {
                LinkLabel popplerLink = new LinkLabel();
                popplerLink.Text = "下載 Poppler for Windows（選用，複雜 PDF 才建議安裝）";
                popplerLink.Location = new Point(22, y);
                popplerLink.Size = new Size(510, 24);
                popplerLink.LinkClicked += delegate
                {
                    OpenExternal("https://github.com/oschwartz10612/poppler-windows/releases/");
                };
                form.Controls.Add(popplerLink);
                y += 32;
            }

            Label note = new Label();
            note.AutoSize = false;
            note.Location = new Point(20, 225);
            note.Size = new Size(520, 36);
            note.Text = "提醒：這兩個工具很大，不建議放進作業 ZIP。交作業時請在 README 說明安裝連結。";
            form.Controls.Add(note);

            Button ok = new Button();
            ok.Text = "知道了";
            ok.DialogResult = DialogResult.OK;
            ok.Location = new Point(450, 270);
            ok.Size = new Size(85, 30);
            form.Controls.Add(ok);
            form.AcceptButton = ok;

            form.ShowDialog(this);
            form.Dispose();
        }

        private async void BtnRunOmr_Click(object sender, EventArgs e)
        {
            // 多頁辨識版：
            // 1. 如果目前沒有任何頁面，但剪貼簿有圖片，就先貼上成第 1 頁。
            // 2. 如果已經貼上 / 匯入多張圖片，會依照頁面順序逐張交給 Audiveris。
            // 3. 每一頁辨識出的 MusicXML 會依序合併成同一首曲子，再生成落下方塊。
            if ((sheetFilePaths == null || sheetFilePaths.Count == 0) &&
                (string.IsNullOrWhiteSpace(currentSheetInputPath) || !File.Exists(currentSheetInputPath)) &&
                Clipboard.ContainsImage())
            {
                PasteClipboardImageAsSheet();
            }

            List<string> inputPaths = GetOmrInputPaths();

            if (inputPaths.Count == 0)
            {
                MessageBox.Show("請先匯入圖片琴譜、選擇 PDF 琴譜，或先按 Win + Shift + S 截圖後用 Ctrl + V / 貼上截圖加入頁面。\r\n\r\n如果你要辨識多頁，請把每一頁依序貼上後，再按『辨識全部頁面』。");
                return;
            }

            bool needPopplerForPdf = false; // Poppler 改成選用：有裝就用高解析拆行，沒裝就直接交給 Audiveris 嘗試辨識。

            if (!EnsureExternalToolsReady(needPopplerForPdf))
            {
                return;
            }

            string selectedOmrMode = GetSelectedOmrMode();
            string tempoTextForStatus = IsManualOmrTempoEnabled() ? ("手動 BPM " + GetSelectedOmrBpm().ToString("0")) : "自動讀譜 / 讀不到預設 102 BPM";

            try
            {
                btnRunOmr.Enabled = false;
                ShowOmrProgressDialog("正在準備 OMR 辨識，模式：" + selectedOmrMode + "，" + tempoTextForStatus + "。", 1);
                SetOmrProgress(0, 1, "狀態：OMR 準備中：共 " + inputPaths.Count + " 個輸入，模式：" + selectedOmrMode + "，" + tempoTextForStatus + "，正在檢查檔案與設定...");

                List<Song> pageSongs = new List<Song>();
                List<string> resultFiles = new List<string>();
                List<string> failedPages = new List<string>();

                bool singlePdfMode = inputPaths.Count == 1 &&
                    Path.GetExtension(inputPaths[0]).Equals(".pdf", StringComparison.OrdinalIgnoreCase);

                if (singlePdfMode)
                {
                    string pdfPath = inputPaths[0];
                    int pdfPageCount = GetPdfPageCount(pdfPath);

                    SetOmrProgress(0, pdfPageCount, "狀態：偵測到 PDF，共 " + pdfPageCount + " 頁。模式：" + selectedOmrMode + "。V32：會在獨立進度視窗顯示目前處理步驟。");

                    for (int pageNumber = 1; pageNumber <= pdfPageCount; pageNumber++)
                    {
                        try
                        {
                            SetOmrProgress(pageNumber - 1, pdfPageCount, "狀態：PDF 第 " + pageNumber + " / " + pdfPageCount + " 頁：開始處理...");

                            Song pageSong = await Task.Run(() => RecognizePdfPageWithImagePipeline(pdfPath, pageNumber, pdfPageCount, selectedOmrMode));
                            if (pageSong == null || pageSong.RecordedEvents == null || pageSong.RecordedEvents.Count == 0)
                            {
                                throw new Exception("這一頁沒有可播放音符。");
                            }

                            pageSong.Name = "PDF 第 " + pageNumber + " 頁 - " + selectedOmrMode + "模式辨識";
                            pageSongs.Add(pageSong);
                            SetOmrProgress(pageNumber, pdfPageCount, "狀態：PDF 第 " + pageNumber + " / " + pdfPageCount + " 頁完成，正在準備下一頁...");
                        }
                        catch (Exception pageEx)
                        {
                            failedPages.Add("第 " + pageNumber + " 頁：" + pageEx.Message);
                            SetOmrProgress(pageNumber, pdfPageCount, "狀態：PDF 第 " + pageNumber + " / " + pdfPageCount + " 頁失敗，已記錄錯誤並繼續。");
                        }
                    }
                }
                else
                {
                    SetOmrProgress(0, inputPaths.Count, "狀態：偵測到圖片 / 截圖，共 " + inputPaths.Count + " 張。V40 會自動判斷雙頁截圖，先拆左右頁再拆行辨識。");

                    for (int i = 0; i < inputPaths.Count; i++)
                    {
                        string pagePath = inputPaths[i];
                        int pageNumber = i + 1;

                        SetOmrProgress(i, inputPaths.Count, "狀態：截圖第 " + pageNumber + " / " + inputPaths.Count + " 頁：開始整頁 + 拆行辨識...");

                        ImageRecognitionResult imageResult = await Task.Run(() => RecognizeImagePageSmart(pagePath, pageNumber, inputPaths.Count, selectedOmrMode));

                        if (imageResult != null && imageResult.Song != null && imageResult.Song.RecordedEvents != null && imageResult.Song.RecordedEvents.Count > 0)
                        {
                            imageResult.Song.Name = "截圖第 " + pageNumber + " 頁 - " + selectedOmrMode + "模式辨識";
                            pageSongs.Add(imageResult.Song);
                            SetOmrProgress(i + 1, inputPaths.Count, "狀態：截圖第 " + pageNumber + " / " + inputPaths.Count + " 頁完成。");
                        }
                        else
                        {
                            string reason = imageResult == null ? "沒有回傳辨識結果。" : imageResult.ErrorMessage;
                            if (string.IsNullOrWhiteSpace(reason))
                            {
                                reason = "Audiveris 沒有輸出 MusicXML。";
                            }

                            failedPages.Add("第 " + pageNumber + " 頁：" + reason);
                            SetOmrProgress(i + 1, inputPaths.Count, "狀態：截圖第 " + pageNumber + " / " + inputPaths.Count + " 頁失敗，已記錄錯誤並繼續。");
                        }
                    }
                }

                if (pageSongs.Count == 0)
                {
                    CloseOmrProgressDialog();

                    string failText = failedPages.Count > 0 ? string.Join(Environment.NewLine + Environment.NewLine, failedPages.ToArray()) : "沒有成功頁面。";
                    ShowOmrFailedMessage(
                        "截圖 / 圖片辨識失敗",
                        "這次沒有任何頁面成功輸出可播放的 MusicXML。",
                        failText,
                        "建議：截圖請盡量包含完整五線譜、不要只截半行；如果 PDF 本身能匯入，優先用 PDF 會比截圖穩。");

                    SetStatus("狀態：OMR 辨識失敗，請查看失敗說明。");
                    return;
                }

                SetOmrProgress(1, 1, "狀態：正在合併辨識結果並產生落下方塊...");

                Song combinedSong = CombinePageSongs(pageSongs, "OMR 合併琴譜 " + DateTime.Now.ToString("HH:mm:ss"));
                AddImportedSong(combinedSong);

                string failedMessage = "";
                if (failedPages.Count > 0)
                {
                    failedMessage =
                        Environment.NewLine + Environment.NewLine +
                        "未成功頁面：" + failedPages.Count + " 頁" + Environment.NewLine +
                        string.Join(Environment.NewLine, failedPages.Take(6).ToArray());

                    if (failedPages.Count > 6)
                    {
                        failedMessage += Environment.NewLine + "...還有 " + (failedPages.Count - 6) + " 頁";
                    }
                }

                SetOmrProgress(1, 1, "狀態：OMR 完成：已成功合併 " + pageSongs.Count + " 頁成一首曲子。");
                CloseOmrProgressDialog();

                MessageBox.Show(
                    "辨識完成！" + Environment.NewLine + Environment.NewLine +
                    "成功合併頁數：" + pageSongs.Count + Environment.NewLine +
                    "總音符事件數：" + combinedSong.RecordedEvents.Count + failedMessage + Environment.NewLine + Environment.NewLine +
                    "如果播放時中間有段落怪怪的，通常是某一頁 Audiveris 辨識錯，可單獨截大一點重辨識那一頁。");
            }
            catch (Exception ex)
            {
                CloseOmrProgressDialog();
                ShowOmrFailedMessage(
                    "OMR 多頁辨識失敗",
                    "程式已停止本次辨識，但不會跳到 Visual Studio 中斷畫面。",
                    ex.Message,
                    "你可以先改用 PDF / MIDI；若一定要用截圖，請截完整一頁或至少完整一行五線譜。");
                SetStatus("狀態：OMR 多頁辨識失敗。");
            }
            finally
            {
                CloseOmrProgressDialog();
                btnRunOmr.Enabled = true;
            }
        }


        private List<string> GetOmrInputPaths()
        {
            List<string> paths = new List<string>();

            if (sheetFilePaths != null && sheetFilePaths.Count > 0)
            {
                foreach (string path in sheetFilePaths)
                {
                    if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
                    {
                        paths.Add(path);
                    }
                }
            }

            if (paths.Count == 0 && !string.IsNullOrWhiteSpace(currentSheetInputPath) && File.Exists(currentSheetInputPath))
            {
                paths.Add(currentSheetInputPath);
            }

            return paths;
        }


        private int GetPdfPageCount(string pdfPath)
        {
            try
            {
                byte[] data = File.ReadAllBytes(pdfPath);
                string text = Encoding.ASCII.GetString(data);
                int count = 0;
                int index = 0;

                while (true)
                {
                    index = text.IndexOf("/Type", index, StringComparison.Ordinal);
                    if (index < 0)
                    {
                        break;
                    }

                    int end = Math.Min(text.Length, index + 80);
                    string part = text.Substring(index, end - index);

                    if (part.Contains("/Page") && !part.Contains("/Pages"))
                    {
                        count++;
                    }

                    index += 5;
                }

                if (count > 0)
                {
                    return count;
                }
            }
            catch
            {
            }

            return 1;
        }

        private Song CombinePageSongs(List<Song> pageSongs, string combinedName)
        {
            if (pageSongs == null || pageSongs.Count == 0)
            {
                throw new Exception("沒有可合併的頁面辨識結果。");
            }

            Song combined = new Song(combinedName, "OMR 多頁合併", "由多張琴譜圖片 / 截圖經 Audiveris 辨識後依序合併，可顯示落下方塊與自動彈奏。", false);

            int offsetMs = 0;
            int gapMs = 450;

            for (int pageIndex = 0; pageIndex < pageSongs.Count; pageIndex++)
            {
                Song pageSong = pageSongs[pageIndex];

                if (pageSong == null || pageSong.RecordedEvents == null || pageSong.RecordedEvents.Count == 0)
                {
                    continue;
                }

                int minTime = pageSong.RecordedEvents.Min(x => x.TimeMs);
                int maxTime = pageSong.RecordedEvents.Max(x => x.TimeMs);

                foreach (RecordedMidiEvent ev in NormalizeRecordedEventsForPlayback(pageSong.RecordedEvents))
                {
                    RecordedMidiEvent copy = new RecordedMidiEvent();
                    copy.TimeMs = offsetMs + Math.Max(0, ev.TimeMs - minTime);
                    copy.Midi = ev.Midi;
                    copy.IsNoteOn = ev.IsNoteOn;
                    copy.Velocity = ev.Velocity;
                    copy.Hand = ev.Hand;
                    combined.RecordedEvents.Add(copy);
                }

                offsetMs += Math.Max(0, maxTime - minTime) + gapMs;
            }

            combined.RecordedEvents = NormalizeRecordedEventsForPlayback(combined.RecordedEvents);

            if (combined.RecordedEvents.Count == 0)
            {
                throw new Exception("多頁辨識後沒有任何可播放音符。可能是 Audiveris 沒有正確辨識音符。");
            }

            return combined;
        }



        private class ImageRecognitionResult
        {
            public Song Song { get; set; }
            public string ErrorMessage { get; set; }

            public ImageRecognitionResult(Song song, string errorMessage)
            {
                Song = song;
                ErrorMessage = errorMessage;
            }
        }

        private ImageRecognitionResult RecognizeImagePageSmart(string imagePath, int pageNumber, int totalPages, string mode)
        {
            mode = NormalizeOmrMode(mode);
            List<string> errors = new List<string>();
            Song fullSong = null;

            bool isDoublePageScreenshot = IsLikelyDoublePageScreenshot(imagePath);

            // V40：雙頁截圖不能先整張丟 Audiveris。
            // Audiveris 可能會把左右兩頁當成同一頁同時讀，或把左右手 / 小節順序混在一起。
            // 所以雙頁截圖一律先拆成左頁、右頁，再各自拆行，最後依序合併。
            if (isDoublePageScreenshot)
            {
                try
                {
                    SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：偵測到雙頁截圖，先拆左頁 / 右頁，再依序拆行辨識...");
                    Song rowSong = RecognizeImagePageByRows(imagePath, pageNumber, totalPages, mode);

                    if (rowSong != null && rowSong.RecordedEvents != null && rowSong.RecordedEvents.Count > 0)
                    {
                        return new ImageRecognitionResult(rowSong, "");
                    }

                    errors.Add("雙頁拆行辨識：沒有可播放音符。");
                }
                catch (Exception ex)
                {
                    errors.Add("雙頁拆行辨識：" + ex.Message);
                }

                return new ImageRecognitionResult(null, BuildScreenshotFailureMessage(errors));
            }

            try
            {
                SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：步驟 1 / 4，整頁裁白邊、放大與黑白化...");
                string fullImagePath = PrepareImageForAudiveris(imagePath, pageNumber);

                SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：步驟 2 / 4，整頁 Audiveris 辨識中...");
                string fullXml = RunAudiverisAndFindMusicXml(fullImagePath);

                if (!string.IsNullOrWhiteSpace(fullXml) && File.Exists(fullXml))
                {
                    fullSong = LoadOmrMusicXmlAsSong(fullXml);
                    if (fullSong != null && fullSong.RecordedEvents != null && fullSong.RecordedEvents.Count > 0)
                    {
                        if (mode == "快速" || !IsProbablyMissingManyNotes(fullSong))
                        {
                            return new ImageRecognitionResult(fullSong, "");
                        }
                    }
                }
                else
                {
                    errors.Add("整頁辨識：沒有輸出 MusicXML。" + FormatLastAudiverisErrorForUser());
                }
            }
            catch (Exception ex)
            {
                errors.Add("整頁辨識：" + ex.Message);
            }

            try
            {
                SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：步驟 3 / 4，整頁結果不足，開始自動拆行補強...");
                Song rowSong = RecognizeImagePageByRows(imagePath, pageNumber, totalPages, mode);

                if (rowSong != null && rowSong.RecordedEvents != null && rowSong.RecordedEvents.Count > 0)
                {
                    if (fullSong != null && fullSong.RecordedEvents != null && fullSong.RecordedEvents.Count > 0)
                    {
                        int fullCount = fullSong.RecordedEvents.Count;
                        int rowCount = rowSong.RecordedEvents.Count;

                        if (fullCount >= rowCount - Math.Max(12, rowCount / 12))
                        {
                            return new ImageRecognitionResult(fullSong, "");
                        }
                    }

                    return new ImageRecognitionResult(rowSong, "");
                }

                errors.Add("拆行辨識：沒有可播放音符。");
            }
            catch (Exception ex)
            {
                errors.Add("拆行辨識：" + ex.Message);
            }

            if (fullSong != null && fullSong.RecordedEvents != null && fullSong.RecordedEvents.Count > 0)
            {
                return new ImageRecognitionResult(fullSong, "");
            }

            return new ImageRecognitionResult(null, BuildScreenshotFailureMessage(errors));
        }

        private Song RecognizeImagePageByRows(string imagePath, int pageNumber, int totalPages, string mode)
        {
            List<string> rowRawPaths = new List<string>();
            int detectedRowCount = 0;
            int detectedPageCount = 1;

            using (Bitmap original = new Bitmap(imagePath))
            {
                bool accurate = mode == "準確";
                int rowsPerGroup = accurate ? 1 : 2;

                // V40：這裡不能直接 SplitIntoStaffRows 後再整批 GroupRowsForFastOmr。
                // 因為雙頁截圖若左頁有奇數行，舊版會把「左頁最後一行」和「右頁第一行」合併在同一張圖，
                // Audiveris 就會把順序與左右手讀亂。
                List<Bitmap> rows = SplitImageIntoOrderedStaffGroups(original, rowsPerGroup, out detectedRowCount, out detectedPageCount);

                if (rows.Count == 0)
                {
                    rows.Add(new Bitmap(original));
                    detectedRowCount = 1;
                    detectedPageCount = 1;
                }

                SetStatus(
                    "狀態：截圖第 " + pageNumber + " / " + totalPages +
                    " 頁：步驟 3 / 4，已拆出 " + detectedPageCount +
                    " 個頁面區塊、" + detectedRowCount +
                    " 行，依序辨識 " + rows.Count + " 個片段。");

                for (int i = 0; i < rows.Count; i++)
                {
                    Bitmap row = rows[i];

                    try
                    {
                        string rawRowPath = SaveSheetBitmapToTemp(row, "image_row_p" + pageNumber.ToString("00") + "_");
                        rowRawPaths.Add(rawRowPath);
                    }
                    finally
                    {
                        row.Dispose();
                    }
                }
            }

            if (rowRawPaths.Count == 0)
            {
                throw new Exception("沒有切出可辨識的行。");
            }

            List<Song> rowSongs = new List<Song>();
            List<string> rowErrors = new List<string>();
            SemaphoreSlim semaphore = new SemaphoreSlim(GetOmrParallelJobCount());
            List<Task<RowRecognitionResult>> tasks = new List<Task<RowRecognitionResult>>();

            int segmentCount = rowRawPaths.Count;

            for (int i = 0; i < rowRawPaths.Count; i++)
            {
                int rowIndex = i + 1;
                string rowPath = rowRawPaths[i];

                tasks.Add(Task.Run(() =>
                {
                    semaphore.Wait();

                    try
                    {
                        SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：步驟 4 / 4，片段 " + rowIndex + " / " + segmentCount + " 影像清晰化...");
                        string omrRowPath = PrepareRowImageForAudiveris(rowPath, pageNumber * 100 + rowIndex);

                        SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：步驟 4 / 4，片段 " + rowIndex + " / " + segmentCount + " Audiveris 辨識中...");
                        string resultXml = RunAudiverisAndFindMusicXml(omrRowPath);

                        if (string.IsNullOrWhiteSpace(resultXml) || !File.Exists(resultXml))
                        {
                            return new RowRecognitionResult(rowIndex, null, "Audiveris 沒有輸出 MusicXML。" + FormatLastAudiverisErrorForUser());
                        }

                        Song rowSong = LoadOmrMusicXmlAsSong(resultXml);
                        if (rowSong == null || rowSong.RecordedEvents == null || rowSong.RecordedEvents.Count == 0)
                        {
                            return new RowRecognitionResult(rowIndex, null, "這一行沒有可播放音符。");
                        }

                        rowSong.Name = "截圖第 " + pageNumber + " 頁 第 " + rowIndex + " 片段";
                        SetStatus("狀態：截圖第 " + pageNumber + " / " + totalPages + " 頁：步驟 4 / 4，片段 " + rowIndex + " / " + segmentCount + " 完成。");
                        return new RowRecognitionResult(rowIndex, rowSong, "");
                    }
                    catch (Exception ex)
                    {
                        return new RowRecognitionResult(rowIndex, null, ex.Message);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }));
            }

            Task.WaitAll(tasks.ToArray());
            semaphore.Dispose();

            foreach (Task<RowRecognitionResult> task in tasks.OrderBy(t => t.Result.RowIndex))
            {
                RowRecognitionResult result = task.Result;

                if (result.Song != null && result.Song.RecordedEvents != null && result.Song.RecordedEvents.Count > 0)
                {
                    rowSongs.Add(result.Song);
                }
                else
                {
                    rowErrors.Add("第 " + result.RowIndex + " 片段：" + result.ErrorMessage);
                }
            }

            if (rowSongs.Count > 0)
            {
                return CombinePageSongs(rowSongs, "截圖第 " + pageNumber + " 頁拆行結果");
            }

            throw new Exception(rowErrors.Count > 0 ? string.Join(Environment.NewLine, rowErrors.Take(6).ToArray()) : "所有切片都失敗。");
        }

        private bool IsLikelyDoublePageScreenshot(string imagePath)
        {
            try
            {
                using (Bitmap bitmap = new Bitmap(imagePath))
                {
                    Rectangle content = FindNonWhiteBounds(bitmap, 246);
                    if (content.Width <= 0 || content.Height <= 0)
                    {
                        content = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
                    }

                    return content.Width >= content.Height * 1.08;
                }
            }
            catch
            {
                return false;
            }
        }

        private List<Bitmap> SplitImageIntoOrderedStaffGroups(Bitmap original, int rowsPerGroup, out int detectedRowCount, out int detectedPageCount)
        {
            List<Bitmap> result = new List<Bitmap>();
            detectedRowCount = 0;
            detectedPageCount = 1;

            Rectangle allContent = FindNonWhiteBounds(original, 246);
            if (allContent.Width <= 0 || allContent.Height <= 0)
            {
                return result;
            }

            Rectangle expanded = ExpandRect(allContent, 18, original.Width, original.Height);
            Bitmap cropped = CropBitmap(original, expanded);

            List<Bitmap> pages = new List<Bitmap>();

            // 雙頁截圖：先拆左頁、右頁，再分別拆行。
            // 這樣不會把左頁最後一行跟右頁第一行合在一起。
            if (cropped.Width >= cropped.Height * 1.08)
            {
                List<Bitmap> splitPages = SplitDoublePageBitmap(cropped);
                if (splitPages.Count >= 2)
                {
                    pages.AddRange(splitPages);
                    cropped.Dispose();
                }
                else
                {
                    pages.Add(cropped);
                }
            }
            else
            {
                pages.Add(cropped);
            }

            detectedPageCount = Math.Max(1, pages.Count);

            foreach (Bitmap page in pages)
            {
                List<Bitmap> rows = SplitSinglePageIntoStaffRows(page);

                if (rows.Count == 0)
                {
                    rows.Add(new Bitmap(page));
                }

                detectedRowCount += rows.Count;

                List<Bitmap> groupedRows = GroupRowsForFastOmr(rows, rowsPerGroup);
                result.AddRange(groupedRows);

                page.Dispose();
            }

            return result;
        }

        private string BuildScreenshotFailureMessage(List<string> errors)
        {
            StringBuilder sb = new StringBuilder();

            if (errors != null && errors.Count > 0)
            {
                foreach (string err in errors.Take(8))
                {
                    if (!string.IsNullOrWhiteSpace(err))
                    {
                        sb.AppendLine("・" + err);
                    }
                }
            }

            sb.AppendLine();
            sb.AppendLine("截圖辨識常見原因：");
            sb.AppendLine("1. 截圖太小或解析度不足，五線譜線條太細。");
            sb.AppendLine("2. 只截到半行、缺少譜號 / 調號 / 小節線。");
            sb.AppendLine("3. 雙頁截圖建議保持左右頁完整、不要裁掉頁邊，程式會先拆左頁再拆右頁。");
            sb.AppendLine("4. 圖片有縮放、傾斜、陰影或背景雜訊。");
            sb.AppendLine("5. 這張截圖對 Audiveris 來說可以辨識成 .omr，但未成功 Export MusicXML。");

            return sb.ToString();
        }

        private string FormatLastAudiverisErrorForUser()
        {
            if (string.IsNullOrWhiteSpace(lastAudiverisErrorMessage))
            {
                return "";
            }

            return Environment.NewLine + lastAudiverisErrorMessage;
        }

        private void ShowOmrFailedMessage(string title, string summary, string details, string suggestion)
        {
            Form form = new Form();
            form.Text = title;
            form.StartPosition = FormStartPosition.CenterParent;
            form.ClientSize = new Size(620, 430);
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.BackColor = Color.White;
            form.Font = new Font("Microsoft JhengHei UI", 10F);

            Label lblTitle = new Label();
            lblTitle.Text = title;
            lblTitle.Font = new Font("Microsoft JhengHei UI", 15F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(25, 35, 55);
            lblTitle.AutoSize = false;
            lblTitle.Location = new Point(22, 18);
            lblTitle.Size = new Size(560, 32);
            form.Controls.Add(lblTitle);

            Label lblSummary = new Label();
            lblSummary.Text = summary;
            lblSummary.AutoSize = false;
            lblSummary.Location = new Point(24, 58);
            lblSummary.Size = new Size(560, 44);
            lblSummary.ForeColor = Color.FromArgb(55, 65, 81);
            form.Controls.Add(lblSummary);

            TextBox txt = new TextBox();
            txt.Multiline = true;
            txt.ReadOnly = true;
            txt.ScrollBars = ScrollBars.Vertical;
            txt.Location = new Point(24, 108);
            txt.Size = new Size(570, 230);
            txt.Text = details;
            form.Controls.Add(txt);

            Label lblSuggestion = new Label();
            lblSuggestion.Text = suggestion;
            lblSuggestion.AutoSize = false;
            lblSuggestion.Location = new Point(24, 350);
            lblSuggestion.Size = new Size(570, 42);
            lblSuggestion.ForeColor = Color.FromArgb(75, 85, 99);
            form.Controls.Add(lblSuggestion);

            Button ok = new Button();
            ok.Text = "知道了";
            ok.Width = 96;
            ok.Height = 34;
            ok.Location = new Point(498, 390);
            ok.DialogResult = DialogResult.OK;
            form.Controls.Add(ok);

            form.AcceptButton = ok;
            form.ShowDialog(this);
        }

        private Song TryLoadOmrPageCache(string inputPath, int pageNumber, string mode)
        {
            try
            {
                string cachePath = GetOmrPageCachePath(inputPath, pageNumber, mode);
                if (!File.Exists(cachePath))
                {
                    return null;
                }

                string[] lines = File.ReadAllLines(cachePath, Encoding.UTF8);
                if (lines.Length < 2 || lines[0] != "SimplePianoOmrCacheV1")
                {
                    return null;
                }

                Song song = new Song("PDF 第 " + pageNumber + " 頁快取", "OMR 快取", "由快取載入的辨識結果。", false);
                song.RecordedEvents.Clear();

                for (int i = 1; i < lines.Length; i++)
                {
                    string line = lines[i].Trim();
                    if (line.Length == 0 || line.StartsWith("#"))
                    {
                        continue;
                    }

                    string[] parts = line.Split('\t');
                    if (parts.Length < 5)
                    {
                        continue;
                    }

                    RecordedMidiEvent ev = new RecordedMidiEvent();
                    ev.TimeMs = SafeParseInt(parts[0], 0);
                    ev.Midi = SafeParseInt(parts[1], 60);
                    ev.IsNoteOn = parts[2] == "1";
                    ev.Velocity = SafeParseInt(parts[3], 100);
                    ev.Hand = SafeParseInt(parts[4], -1);
                    song.RecordedEvents.Add(ev);
                }

                if (song.RecordedEvents.Count == 0)
                {
                    return null;
                }

                song.RecordedEvents = NormalizeRecordedEventsForPlayback(song.RecordedEvents);
                return song;
            }
            catch
            {
                return null;
            }
        }

        private void TrySaveOmrPageCache(string inputPath, int pageNumber, string mode, Song song)
        {
            try
            {
                if (song == null || song.RecordedEvents == null || song.RecordedEvents.Count == 0)
                {
                    return;
                }

                string cachePath = GetOmrPageCachePath(inputPath, pageNumber, mode);
                Directory.CreateDirectory(Path.GetDirectoryName(cachePath));

                List<string> lines = new List<string>();
                lines.Add("SimplePianoOmrCacheV1");
                lines.Add("# input=" + inputPath);
                lines.Add("# page=" + pageNumber);
                lines.Add("# mode=" + mode);

                foreach (RecordedMidiEvent ev in song.RecordedEvents.OrderBy(e => e.TimeMs).ThenBy(e => e.IsNoteOn ? 1 : 0))
                {
                    lines.Add(
                        ev.TimeMs.ToString() + "\t" +
                        ev.Midi.ToString() + "\t" +
                        (ev.IsNoteOn ? "1" : "0") + "\t" +
                        ev.Velocity.ToString() + "\t" +
                        ev.Hand.ToString());
                }

                File.WriteAllLines(cachePath, lines.ToArray(), Encoding.UTF8);
            }
            catch
            {
            }
        }

        private string GetOmrPageCachePath(string inputPath, int pageNumber, string mode)
        {
            FileInfo info = new FileInfo(inputPath);
            string keySource =
                inputPath + "|" +
                (info.Exists ? info.Length.ToString() : "0") + "|" +
                (info.Exists ? info.LastWriteTimeUtc.Ticks.ToString() : "0") + "|" +
                pageNumber.ToString() + "|" +
                mode + "|V31";

            string hash = ComputeStableHash(keySource);
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SimplePianoOmr", "Cache");
            string safeName = MakeSafeFileName(Path.GetFileNameWithoutExtension(inputPath));
            return Path.Combine(folder, safeName + "_p" + pageNumber.ToString("000") + "_" + mode + "_" + hash + ".pianocache");
        }

        private string ComputeStableHash(string text)
        {
            unchecked
            {
                ulong hash = 14695981039346656037UL;

                for (int i = 0; i < text.Length; i++)
                {
                    hash ^= text[i];
                    hash *= 1099511628211UL;
                }

                return hash.ToString("X16");
            }
        }

        private string MakeSafeFileName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return "score";
            }

            foreach (char c in Path.GetInvalidFileNameChars())
            {
                name = name.Replace(c, '_');
            }

            if (name.Length > 40)
            {
                name = name.Substring(0, 40);
            }

            return name;
        }

        private int SafeParseInt(string text, int defaultValue)
        {
            int value;
            if (int.TryParse(text, out value))
            {
                return value;
            }

            return defaultValue;
        }

        private Song RecognizePdfPageWithImagePipeline(string pdfPath, int pageNumber, int totalPages, string mode)
        {
            mode = NormalizeOmrMode(mode);

            Song cached = TryLoadOmrPageCache(pdfPath, pageNumber, mode);
            if (cached != null && cached.RecordedEvents != null && cached.RecordedEvents.Count > 0)
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：讀取快取完成（" + mode + "模式），不用重新辨識。");
                return cached;
            }

            Song result = null;

            if (mode == "快速")
            {
                result = RecognizePdfPageFast(pdfPath, pageNumber, totalPages);
            }
            else if (mode == "準確")
            {
                result = RecognizePdfPageAccurate(pdfPath, pageNumber, totalPages);
            }
            else
            {
                result = RecognizePdfPageBalanced(pdfPath, pageNumber, totalPages);
            }

            if (result != null && result.RecordedEvents != null && result.RecordedEvents.Count > 0)
            {
                TrySaveOmrPageCache(pdfPath, pageNumber, mode, result);
            }

            return result;
        }

        private Song RecognizePdfPageFast(string pdfPath, int pageNumber, int totalPages)
        {
            Exception firstError = null;

            try
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：快速模式，整頁辨識中...");
                return RecognizePdfPageFullPageOnly(pdfPath, pageNumber, totalPages, 300);
            }
            catch (Exception ex)
            {
                firstError = ex;
            }

            try
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁失敗，改用拆行備援...");
                return RecognizePdfPageWithImagePipelineCore(pdfPath, pageNumber, totalPages, 300, false);
            }
            catch (Exception retryEx)
            {
                throw new Exception(
                    "快速模式失敗。" + Environment.NewLine +
                    "整頁錯誤：" + (firstError == null ? "無" : firstError.Message) + Environment.NewLine +
                    "拆行錯誤：" + retryEx.Message);
            }
        }

        private Song RecognizePdfPageBalanced(string pdfPath, int pageNumber, int totalPages)
        {
            Exception fullError = null;
            Song fullSong = null;

            try
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：平衡模式，先整頁辨識...");
                fullSong = RecognizePdfPageFullPageOnly(pdfPath, pageNumber, totalPages, 360);
                if (!IsProbablyMissingManyNotes(fullSong))
                {
                    SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁結果看起來正常，直接採用。");
                    return fullSong;
                }

                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁音符數偏少，改做拆行補強...");
            }
            catch (Exception ex)
            {
                fullError = ex;
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁辨識失敗，改做拆行補強...");
            }

            try
            {
                Song rowSong = RecognizePdfPageWithImagePipelineCore(pdfPath, pageNumber, totalPages, 360, false);
                if (fullSong != null && fullSong.RecordedEvents != null && fullSong.RecordedEvents.Count > 0)
                {
                    int fullCount = fullSong.RecordedEvents.Count;
                    int rowCount = rowSong.RecordedEvents == null ? 0 : rowSong.RecordedEvents.Count;

                    if (fullCount >= rowCount - Math.Max(12, rowCount / 12))
                    {
                        SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁與拆行差異不大，採用較快的整頁結果。");
                        return fullSong;
                    }
                }

                return rowSong;
            }
            catch (Exception rowEx)
            {
                if (fullSong != null && fullSong.RecordedEvents != null && fullSong.RecordedEvents.Count > 0)
                {
                    return fullSong;
                }

                throw new Exception(
                    "平衡模式失敗。" + Environment.NewLine +
                    "整頁錯誤：" + (fullError == null ? "疑似漏音" : fullError.Message) + Environment.NewLine +
                    "拆行錯誤：" + rowEx.Message);
            }
        }

        private Song RecognizePdfPageAccurate(string pdfPath, int pageNumber, int totalPages)
        {
            Exception firstError = null;

            try
            {
                return RecognizePdfPageWithImagePipelineCore(pdfPath, pageNumber, totalPages, OmrFastPdfDpi, true);
            }
            catch (Exception ex)
            {
                firstError = ex;
            }

            try
            {
                return RecognizePdfPageWithImagePipelineCore(pdfPath, pageNumber, totalPages, OmrRetryPdfDpi, true);
            }
            catch (Exception retryEx)
            {
                throw new Exception(
                    "PDF 第 " + pageNumber + " 頁準確模式失敗。" +
                    Environment.NewLine +
                    "第一次錯誤：" + (firstError == null ? "無" : firstError.Message) +
                    Environment.NewLine +
                    "高解析重試錯誤：" + retryEx.Message);
            }
        }

        private Song RecognizePdfPageFullPageOnly(string pdfPath, int pageNumber, int totalPages, int dpi)
        {
            string resultXml = "";

            if (File.Exists(popplerPdftoppmPath))
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：Poppler 轉整頁圖片中（" + dpi + " DPI）...");
                string renderedPng = RenderPdfPageToPngWithPoppler(pdfPath, pageNumber, dpi);

                if (!string.IsNullOrWhiteSpace(renderedPng) && File.Exists(renderedPng))
                {
                    SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁影像清晰化...");
                    string omrPagePath = PrepareImageForAudiveris(renderedPng, pageNumber);

                    SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：Audiveris 整頁辨識中...");
                    resultXml = RunAudiverisAndFindMusicXml(omrPagePath);
                }
            }

            if (string.IsNullOrWhiteSpace(resultXml) || !File.Exists(resultXml))
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：直接交給 Audiveris 處理 PDF...");
                resultXml = RunAudiverisPdfSheetAndFindMusicXml(pdfPath, pageNumber);
            }

            if (string.IsNullOrWhiteSpace(resultXml) || !File.Exists(resultXml))
            {
                throw new Exception("整頁辨識沒有輸出 MusicXML。");
            }

            Song song = LoadOmrMusicXmlAsSong(resultXml);
            if (song == null || song.RecordedEvents == null || song.RecordedEvents.Count == 0)
            {
                throw new Exception("整頁辨識沒有可播放音符。");
            }

            return song;
        }

        private bool IsProbablyMissingManyNotes(Song song)
        {
            if (song == null || song.RecordedEvents == null || song.RecordedEvents.Count == 0)
            {
                return true;
            }

            int eventCount = song.RecordedEvents.Count;
            int first = song.RecordedEvents.Min(e => e.TimeMs);
            int last = song.RecordedEvents.Max(e => e.TimeMs);
            int duration = Math.Max(0, last - first);

            // 這只是「疑似漏音」偵測，不是音樂分析。
            // 太短或事件數太少時才啟用拆行補強，避免每頁都慢慢重跑。
            if (eventCount < 80)
            {
                return true;
            }

            if (duration < 6000)
            {
                return true;
            }

            return false;
        }

        private string NormalizeOmrMode(string mode)
        {
            if (mode == "快速" || mode == "平衡" || mode == "準確")
            {
                return mode;
            }

            return "平衡";
        }

        private Song RecognizePdfPageWithImagePipelineCore(string pdfPath, int pageNumber, int totalPages, int dpi, bool checkFullPage)
        {
            SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：Poppler 轉圖中（" + dpi + " DPI）...");
            string renderedPng = RenderPdfPageToPngWithPoppler(pdfPath, pageNumber, dpi);

            if (string.IsNullOrWhiteSpace(renderedPng) || !File.Exists(renderedPng))
            {
                // 如果沒有安裝 Poppler，退回舊方式：直接請 Audiveris 處理 PDF 第 N 頁。
                string fallbackXml = RunAudiverisPdfSheetAndFindMusicXml(pdfPath, pageNumber);
                return LoadOmrMusicXmlAsSong(fallbackXml);
            }

            List<string> rowRawPaths = new List<string>();

            using (Bitmap rendered = new Bitmap(renderedPng))
            {
                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：裁白邊與自動拆行中...");
                List<Bitmap> rows = SplitIntoStaffRows(rendered);

                if (rows.Count == 0)
                {
                    rows.Add(new Bitmap(rendered));
                }

                int detectedRowCount = rows.Count;
                if (checkFullPage)
                {
                    rows = GroupRowsForFastOmr(rows, 1);
                    SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：已偵測 " + detectedRowCount + " 行，準確模式逐行辨識，共 " + rows.Count + " 個片段。");
                }
                else
                {
                    rows = GroupRowsForFastOmr(rows, 2);
                    SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：已偵測 " + detectedRowCount + " 行，平衡/快速模式合併成 " + rows.Count + " 個片段。");
                }

                for (int i = 0; i < rows.Count; i++)
                {
                    Bitmap row = rows[i];

                    try
                    {
                        string rawRowPath = SaveSheetBitmapToTemp(row, "pdf_row_p" + pageNumber.ToString("00") + "_dpi" + dpi + "_");
                        rowRawPaths.Add(rawRowPath);
                    }
                    finally
                    {
                        row.Dispose();
                    }
                }
            }

            if (rowRawPaths.Count == 0)
            {
                throw new Exception("沒有切出可辨識的行。");
            }

            List<Song> rowSongs = new List<Song>();
            List<string> rowErrors = new List<string>();

            // V31：準確模式加速。
            // 以前是「逐行辨識完成後，才開始整頁交叉檢查」，所以時間會變成兩者相加。
            // 現在改成整頁交叉檢查和逐行辨識同時跑，時間大約變成兩者取較慢的一邊。
            Task<Song> fullPageCheckTask = null;
            if (checkFullPage)
            {
                fullPageCheckTask = Task.Run(() =>
                {
                    try
                    {
                        SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁交叉檢查同步執行中...");
                        string omrPagePath = PrepareImageForAudiveris(renderedPng, pageNumber);
                        string resultXml = RunAudiverisAndFindMusicXml(omrPagePath);

                        if (!string.IsNullOrWhiteSpace(resultXml) && File.Exists(resultXml))
                        {
                            Song fullPageSong = LoadOmrMusicXmlAsSong(resultXml);
                            if (fullPageSong != null && fullPageSong.RecordedEvents != null && fullPageSong.RecordedEvents.Count > 0)
                            {
                                return fullPageSong;
                            }
                        }
                    }
                    catch
                    {
                    }

                    return null;
                });
            }

            SemaphoreSlim semaphore = new SemaphoreSlim(GetOmrParallelJobCount());
            List<Task<RowRecognitionResult>> tasks = new List<Task<RowRecognitionResult>>();

            int segmentCount = rowRawPaths.Count;

            for (int i = 0; i < rowRawPaths.Count; i++)
            {
                int rowIndex = i + 1;
                string rowPath = rowRawPaths[i];

                tasks.Add(Task.Run(() =>
                {
                    semaphore.Wait();

                    try
                    {
                        SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：片段 " + rowIndex + " / " + segmentCount + " 影像清晰化...");
                        string omrRowPath = PrepareRowImageForAudiveris(rowPath, pageNumber * 100 + rowIndex);

                        SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：片段 " + rowIndex + " / " + segmentCount + " Audiveris 辨識中...");
                        string resultXml = RunAudiverisAndFindMusicXml(omrRowPath);

                        if (string.IsNullOrWhiteSpace(resultXml) || !File.Exists(resultXml))
                        {
                            return new RowRecognitionResult(rowIndex, null, "Audiveris 沒有輸出 MusicXML。");
                        }

                        Song rowSong = LoadOmrMusicXmlAsSong(resultXml);
                        if (rowSong.RecordedEvents == null || rowSong.RecordedEvents.Count == 0)
                        {
                            return new RowRecognitionResult(rowIndex, null, "這一行沒有可播放音符。");
                        }

                        rowSong.Name = "PDF 第 " + pageNumber + " 頁 第 " + rowIndex + " 片段";
                        SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：片段 " + rowIndex + " / " + segmentCount + " 完成。");
                        return new RowRecognitionResult(rowIndex, rowSong, "");
                    }
                    catch (Exception ex)
                    {
                        return new RowRecognitionResult(rowIndex, null, ex.Message);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }));
            }

            Task.WaitAll(tasks.ToArray());
            semaphore.Dispose();

            foreach (Task<RowRecognitionResult> task in tasks.OrderBy(t => t.Result.RowIndex))
            {
                RowRecognitionResult result = task.Result;

                if (result.Song != null && result.Song.RecordedEvents != null && result.Song.RecordedEvents.Count > 0)
                {
                    rowSongs.Add(result.Song);
                }
                else
                {
                    rowErrors.Add("第 " + result.RowIndex + " 行：" + result.ErrorMessage);
                }
            }

            if (rowSongs.Count > 0)
            {
                Song rowCombined = CombinePageSongs(rowSongs, "PDF 第 " + pageNumber + " 頁逐行辨識結果");

                if (checkFullPage && fullPageCheckTask != null)
                {
                    // V31：整頁交叉檢查已經在背景同步跑，這裡只等待它收尾並比較結果。
                    try
                    {
                        if (!fullPageCheckTask.IsCompleted)
                        {
                            SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：等待整頁交叉檢查收尾...");
                        }

                        fullPageCheckTask.Wait();
                        Song fullPageSong = fullPageCheckTask.Result;

                        if (fullPageSong != null && fullPageSong.RecordedEvents != null && fullPageSong.RecordedEvents.Count > 0)
                        {
                            int rowCount = rowCombined.RecordedEvents == null ? 0 : rowCombined.RecordedEvents.Count;
                            int fullCount = fullPageSong.RecordedEvents == null ? 0 : fullPageSong.RecordedEvents.Count;

                            if (fullCount > rowCount + Math.Max(20, rowCount / 10))
                            {
                                fullPageSong.Name = "PDF 第 " + pageNumber + " 頁整頁交叉檢查結果";
                                SetStatus("狀態：PDF 第 " + pageNumber + " / " + totalPages + " 頁：整頁結果音符較多，採用整頁結果。");
                                return fullPageSong;
                            }
                        }
                    }
                    catch
                    {
                        // 交叉檢查失敗沒關係，仍使用逐行結果。
                    }
                }

                return rowCombined;
            }

            // 拆行全部失敗時，最後再嘗試整頁高解析圖片。
            try
            {
                string omrPagePath = PrepareImageForAudiveris(renderedPng, pageNumber);
                string resultXml = RunAudiverisAndFindMusicXml(omrPagePath);
                if (!string.IsNullOrWhiteSpace(resultXml) && File.Exists(resultXml))
                {
                    return LoadOmrMusicXmlAsSong(resultXml);
                }
            }
            catch
            {
            }

            string errorText = rowErrors.Count > 0 ? string.Join(Environment.NewLine, rowErrors.Take(5).ToArray()) : "沒有可用的拆行辨識結果。";
            throw new Exception("PDF 第 " + pageNumber + " 頁 " + dpi + " DPI 拆行辨識失敗。" + Environment.NewLine + errorText);
        }

        private int GetOmrParallelJobCount()
        {
            int byCpu = Math.Max(1, Environment.ProcessorCount / 2);
            return Math.Max(1, Math.Min(OmrMaxParallelAudiverisJobs, byCpu));
        }

        private class RowRecognitionResult
        {
            public int RowIndex { get; private set; }
            public Song Song { get; private set; }
            public string ErrorMessage { get; private set; }

            public RowRecognitionResult(int rowIndex, Song song, string errorMessage)
            {
                RowIndex = rowIndex;
                Song = song;
                ErrorMessage = errorMessage ?? "";
            }
        }

        private string RenderPdfPageToPngWithPoppler(string pdfPath, int pageNumber, int dpi)
        {
            string pdftoppm = FindPdftoppmExecutable();
            if (string.IsNullOrWhiteSpace(pdftoppm) || !File.Exists(pdftoppm))
            {
                return "";
            }

            string outDir = Path.Combine(Path.GetTempPath(), "PianoPdfRaster", Path.GetFileNameWithoutExtension(pdfPath) + "_p" + pageNumber.ToString("00") + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
            Directory.CreateDirectory(outDir);

            string outputRoot = Path.Combine(outDir, "page");
            DateTime startTime = DateTime.Now.AddSeconds(-2);

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = pdftoppm;
            psi.Arguments = "-f " + pageNumber + " -l " + pageNumber + " -r " + dpi + " -png \"" + pdfPath + "\" \"" + outputRoot + "\"";
            psi.WorkingDirectory = outDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;

            string output = "";
            string error = "";
            int exitCode = -1;

            using (Process process = new Process())
            {
                process.StartInfo = psi;
                process.Start();
                output = process.StandardOutput.ReadToEnd();
                error = process.StandardError.ReadToEnd();
                process.WaitForExit();
                exitCode = process.ExitCode;
            }

            string logPath = Path.Combine(outDir, "pdftoppm_log.txt");
            try
            {
                File.WriteAllText(logPath,
                    "執行檔：" + psi.FileName + Environment.NewLine +
                    "參數：" + psi.Arguments + Environment.NewLine +
                    "ExitCode：" + exitCode + Environment.NewLine +
                    "輸出：" + output + Environment.NewLine +
                    "錯誤：" + error, Encoding.UTF8);
            }
            catch
            {
            }

            List<string> pngs = Directory.GetFiles(outDir, "*.png", SearchOption.AllDirectories)
                .Where(f => File.GetLastWriteTime(f) >= startTime)
                .OrderByDescending(f => new FileInfo(f).Length)
                .ToList();

            if (pngs.Count > 0)
            {
                return pngs[0];
            }

            return "";
        }

        private string FindPdftoppmExecutable()
        {
            if (!string.IsNullOrWhiteSpace(popplerPdftoppmPath) && File.Exists(popplerPdftoppmPath))
            {
                return popplerPdftoppmPath;
            }

            string envPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in envPath.Split(Path.PathSeparator))
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(dir)) continue;
                    string candidate = Path.Combine(dir.Trim(), "pdftoppm.exe");
                    if (File.Exists(candidate))
                    {
                        popplerPdftoppmPath = candidate;
                        return candidate;
                    }
                }
                catch
                {
                }
            }

            List<string> roots = new List<string>();
            roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "poppler"));
            roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "poppler"));
            roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads"));
            roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Desktop"));

            foreach (string root in roots)
            {
                try
                {
                    if (!Directory.Exists(root)) continue;
                    string[] files = Directory.GetFiles(root, "pdftoppm.exe", SearchOption.AllDirectories);
                    if (files.Length > 0)
                    {
                        popplerPdftoppmPath = files[0];
                        return files[0];
                    }
                }
                catch
                {
                }
            }

            return "";
        }

        private string RunAudiverisPdfSheetAndFindMusicXml(string pdfPath, int sheetNumber)
        {
            DateTime startTime = DateTime.Now.AddSeconds(-3);
            string inputDir = Path.GetDirectoryName(pdfPath);
            string inputBase = Path.GetFileNameWithoutExtension(pdfPath) + "_sheet" + sheetNumber.ToString("00");
            string outputDir = Path.Combine(Path.GetTempPath(), "PianoAudiverisOutput", inputBase + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
            Directory.CreateDirectory(outputDir);

            List<string> argumentCandidates = new List<string>();
            argumentCandidates.Add("-batch -force -transcribe -export -output \"" + outputDir + "\" -sheets " + sheetNumber + " -- \"" + pdfPath + "\"");
            argumentCandidates.Add("-batch -transcribe -export -output \"" + outputDir + "\" -sheets " + sheetNumber + " -- \"" + pdfPath + "\"");
            argumentCandidates.Add("-batch -force -transcribe -export -save -output \"" + outputDir + "\" -sheets " + sheetNumber + " -- \"" + pdfPath + "\"");
            argumentCandidates.Add("-batch -transcribe -export -save -output \"" + outputDir + "\" -sheets " + sheetNumber + " -- \"" + pdfPath + "\"");
            argumentCandidates.Add("-batch -force -transcribe -export -sheets " + sheetNumber + " -- \"" + pdfPath + "\"");
            argumentCandidates.Add("-batch -transcribe -export -sheets " + sheetNumber + " -- \"" + pdfPath + "\"");

            StringBuilder fullLog = new StringBuilder();
            string logPath = Path.Combine(outputDir, "audiveris_pdf_sheet_" + sheetNumber + "_log.txt");
            string lastFileName = "";
            string lastArguments = "";
            int lastExitCode = -1;

            for (int i = 0; i < argumentCandidates.Count; i++)
            {
                string args = argumentCandidates[i];

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.WorkingDirectory = inputDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                if (Path.GetExtension(audiverisPath).Equals(".jar", StringComparison.OrdinalIgnoreCase))
                {
                    psi.FileName = "java";
                    psi.Arguments = "-jar \"" + audiverisPath + "\" " + args;
                }
                else
                {
                    psi.FileName = audiverisPath;
                    psi.Arguments = args;
                }

                lastFileName = psi.FileName;
                lastArguments = psi.Arguments;

                string output = "";
                string error = "";
                int exitCode = -1;

                try
                {
                    using (Process process = new Process())
                    {
                        process.StartInfo = psi;
                        process.Start();
                        output = process.StandardOutput.ReadToEnd();
                        error = process.StandardError.ReadToEnd();
                        process.WaitForExit();
                        exitCode = process.ExitCode;
                        lastExitCode = exitCode;
                    }
                }
                catch (Exception ex)
                {
                    error = "程式啟動失敗：" + ex.Message;
                    exitCode = -999;
                    lastExitCode = exitCode;
                }

                fullLog.AppendLine("==============================");
                fullLog.AppendLine("PDF 頁碼：" + sheetNumber);
                fullLog.AppendLine("嘗試次數：" + (i + 1));
                fullLog.AppendLine("執行檔：" + psi.FileName);
                fullLog.AppendLine("參數：" + psi.Arguments);
                fullLog.AppendLine("ExitCode：" + exitCode);
                fullLog.AppendLine();
                fullLog.AppendLine("輸出：");
                fullLog.AppendLine(output);
                fullLog.AppendLine();
                fullLog.AppendLine("錯誤：");
                fullLog.AppendLine(error);
                fullLog.AppendLine();

                try
                {
                    File.WriteAllText(logPath, fullLog.ToString(), Encoding.UTF8);
                }
                catch
                {
                }

                string found = FindAudiverisMusicXmlOutput(outputDir, inputDir, Path.GetFileNameWithoutExtension(pdfPath), startTime);
                if (!string.IsNullOrWhiteSpace(found))
                {
                    return found;
                }
            }

            lastAudiverisErrorMessage =
                "PDF 第 " + sheetNumber + " 頁沒有輸出 .mxl / .musicxml / .xml。" + Environment.NewLine +
                "最後 ExitCode：" + lastExitCode + Environment.NewLine +
                "紀錄檔：" + logPath;

            return "";
        }

        private string RunAudiverisAndFindMusicXml(string inputPath)
        {
            DateTime startTime = DateTime.Now.AddSeconds(-3);
            string inputDir = Path.GetDirectoryName(inputPath);
            string inputBase = Path.GetFileNameWithoutExtension(inputPath);
            string outputDir = Path.Combine(Path.GetTempPath(), "PianoAudiverisOutput", inputBase + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
            Directory.CreateDirectory(outputDir);

            // Audiveris 不同版本 / 不同安裝方式對命令列參數比較敏感。
            // 這版會自動嘗試多組參數：有 --、沒有 --、有 -save、沒有 -save。
            // 只要其中一組成功輸出 .mxl / .musicxml / .xml，就會繼續匯入。
            List<string> argumentCandidates = new List<string>();
            // 快速版：每個片段只嘗試最常成功的兩組參數，避免失敗片段重跑 6 次拖慢整體速度。
            argumentCandidates.Add("-batch -force -transcribe -export -output \"" + outputDir + "\" -- \"" + inputPath + "\"");
            argumentCandidates.Add("-batch -transcribe -export -output \"" + outputDir + "\" -- \"" + inputPath + "\"");

            StringBuilder fullLog = new StringBuilder();
            string logPath = Path.Combine(outputDir, "audiveris_log.txt");
            string lastFileName = "";
            string lastArguments = "";
            int lastExitCode = -1;

            for (int i = 0; i < argumentCandidates.Count; i++)
            {
                string args = argumentCandidates[i];

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.WorkingDirectory = inputDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                if (Path.GetExtension(audiverisPath).Equals(".jar", StringComparison.OrdinalIgnoreCase))
                {
                    psi.FileName = "java";
                    psi.Arguments = "-jar \"" + audiverisPath + "\" " + args;
                }
                else
                {
                    psi.FileName = audiverisPath;
                    psi.Arguments = args;
                }

                lastFileName = psi.FileName;
                lastArguments = psi.Arguments;

                string output = "";
                string error = "";
                int exitCode = -1;

                try
                {
                    using (Process process = new Process())
                    {
                        process.StartInfo = psi;
                        process.Start();

                        output = process.StandardOutput.ReadToEnd();
                        error = process.StandardError.ReadToEnd();

                        process.WaitForExit();
                        exitCode = process.ExitCode;
                        lastExitCode = exitCode;
                    }
                }
                catch (Exception ex)
                {
                    error = "程式啟動失敗：" + ex.Message;
                    exitCode = -999;
                    lastExitCode = exitCode;
                }

                fullLog.AppendLine("==============================");
                fullLog.AppendLine("嘗試次數：" + (i + 1));
                fullLog.AppendLine("執行檔：" + psi.FileName);
                fullLog.AppendLine("參數：" + psi.Arguments);
                fullLog.AppendLine("ExitCode：" + exitCode);
                fullLog.AppendLine();
                fullLog.AppendLine("輸出：");
                fullLog.AppendLine(output);
                fullLog.AppendLine();
                fullLog.AppendLine("錯誤：");
                fullLog.AppendLine(error);
                fullLog.AppendLine();

                try
                {
                    File.WriteAllText(logPath, fullLog.ToString(), Encoding.UTF8);
                }
                catch
                {
                }

                string found = FindAudiverisMusicXmlOutput(outputDir, inputDir, inputBase, startTime);
                if (!string.IsNullOrWhiteSpace(found))
                {
                    return found;
                }
            }

            string foundAfterAll = FindAudiverisMusicXmlOutput(outputDir, inputDir, inputBase, startTime);
            if (!string.IsNullOrWhiteSpace(foundAfterAll))
            {
                return foundAfterAll;
            }

            List<string> omrFiles = new List<string>();
            if (Directory.Exists(outputDir))
            {
                omrFiles.AddRange(Directory.GetFiles(outputDir, "*.omr", SearchOption.AllDirectories));
            }
            if (Directory.Exists(inputDir))
            {
                omrFiles.AddRange(Directory.GetFiles(inputDir, inputBase + "*.omr", SearchOption.AllDirectories));
            }

            string omrText = "";
            if (omrFiles.Count > 0)
            {
                omrText = Environment.NewLine + Environment.NewLine +
                    "有找到 Audiveris 專案檔 .omr，但還沒有成功匯出 MusicXML：" + Environment.NewLine +
                    string.Join(Environment.NewLine, omrFiles.ToArray()) + Environment.NewLine +
                    "你可以用 Audiveris GUI 開啟 .omr，檢查辨識結果後 Export 成 .mxl / .musicxml，再回到本程式匯入。";
            }

            lastAudiverisErrorMessage =
                "Audiveris 沒有輸出 .mxl / .musicxml / .xml。" + Environment.NewLine +
                "最後 ExitCode：" + lastExitCode + Environment.NewLine +
                "紀錄檔：" + logPath + omrText;

            return "";
        }

        private string FindAudiverisMusicXmlOutput(string outputDir, string inputDir, string inputBase, DateTime startTime)
        {
            List<string> candidates = new List<string>();

            if (Directory.Exists(outputDir))
            {
                candidates.AddRange(Directory.GetFiles(outputDir, "*.mxl", SearchOption.AllDirectories));
                candidates.AddRange(Directory.GetFiles(outputDir, "*.musicxml", SearchOption.AllDirectories));
                candidates.AddRange(Directory.GetFiles(outputDir, "*.xml", SearchOption.AllDirectories));
            }

            if (Directory.Exists(inputDir))
            {
                candidates.AddRange(Directory.GetFiles(inputDir, inputBase + "*.mxl", SearchOption.AllDirectories));
                candidates.AddRange(Directory.GetFiles(inputDir, inputBase + "*.musicxml", SearchOption.AllDirectories));
                candidates.AddRange(Directory.GetFiles(inputDir, inputBase + "*.xml", SearchOption.AllDirectories));
            }

            string found = candidates
                .Where(f => !Path.GetFileName(f).Equals("container.xml", StringComparison.OrdinalIgnoreCase))
                .Where(f => File.GetLastWriteTime(f) >= startTime)
                .OrderByDescending(f => File.GetLastWriteTime(f))
                .FirstOrDefault();

            return found;
        }

        private void AddImportedSong(Song song)
        {
            presetSongs.Add(song);
            lstSongs.Items.Add(song);
            lstSongs.SelectedItem = song;
            lstPlaylist.Items.Add(song);
            PreviewSongRoll(song);
            rightTabs.SelectedIndex = 2;
        }

        private Song LoadMusicXmlAsSong(string filePath)
        {
            return LoadMusicXmlAsSong(filePath, 102.0, false);
        }

        private Song LoadMusicXmlAsSong(string filePath, double fallbackBpm, bool forceTempo)
        {
            if (fallbackBpm < 40.0 || fallbackBpm > 240.0)
            {
                fallbackBpm = 102.0;
            }

            string readableMusicXmlPath = PrepareMusicXmlFileForReading(filePath);

            XDocument doc;
            XmlReaderSettings xmlSettings = new XmlReaderSettings();
            xmlSettings.DtdProcessing = DtdProcessing.Ignore;
            using (XmlReader reader = XmlReader.Create(readableMusicXmlPath, xmlSettings))
            {
                doc = XDocument.Load(reader);
            }

            XElement root = doc.Root;
            if (root == null)
            {
                throw new Exception("MusicXML 內容是空的。");
            }

            bool foundGlobalTempo = false;
            double initialTempoBpm = forceTempo ? fallbackBpm : DetectFirstMusicXmlTempoBpm(root, fallbackBpm, out foundGlobalTempo);

            List<RecordedMidiEvent> events = new List<RecordedMidiEvent>();
            double effectiveTempoBpm = initialTempoBpm;
            string effectiveTempoSource = forceTempo ? "手動 BPM" : (foundGlobalTempo ? "MusicXML 全譜速度標記" : "預設 BPM");
            List<XElement> parts = ElementsLocal(root, "part").ToList();

            if (parts.Count == 0)
            {
                throw new Exception("這份 MusicXML 找不到 part 音軌。");
            }

            for (int partIndex = 0; partIndex < parts.Count; partIndex++)
            {
                XElement part = parts[partIndex];
                int hand = parts.Count >= 2 ? (partIndex == 0 ? 1 : 0) : -1;

                double partCurrentMs = 0.0;
                // V45：初始速度要套用到所有 part。
                // 很多 MusicXML 只把 ♩=102 寫在第一個 part；如果第二個 part 還用預設 102，
                // 左右手就會慢慢錯開，聽起來像休止符過長或不連貫。
                double msPerQuarter = 60000.0 / initialTempoBpm;
                int divisions = 1;

                Dictionary<int, ActiveTieState> activeTies = new Dictionary<int, ActiveTieState>();

                foreach (XElement measure in ElementsLocal(part, "measure"))
                {
                    // V43：以 measure 為單位追蹤時間。
                    // 舊版 currentMs 可能停在某個 voice / staff 的游標上，下一小節起點就會被帶歪，
                    // 聽起來就像休止符過長、過短或左右手錯開。
                    double measureStartMs = partCurrentMs;
                    double cursorMs = measureStartMs;
                    double measureMaxMs = measureStartMs;
                    double lastStartMs = measureStartMs;

                    foreach (XElement item in measure.Elements())
                    {
                        string local = item.Name.LocalName;

                        if (local == "attributes")
                        {
                            XElement div = ElementLocal(item, "divisions");
                            if (div != null)
                            {
                                int parsed;
                                if (int.TryParse(div.Value.Trim(), out parsed) && parsed > 0)
                                {
                                    divisions = parsed;
                                }
                            }
                        }
                        else if (local == "direction")
                        {
                            if (!forceTempo)
                            {
                                XElement sound = ElementLocal(item, "sound");
                                if (sound != null)
                                {
                                    XAttribute tempoAttr = sound.Attribute("tempo");
                                    if (tempoAttr != null)
                                    {
                                        double bpm;
                                        if (double.TryParse(tempoAttr.Value, out bpm) && bpm > 0)
                                        {
                                            msPerQuarter = 60000.0 / bpm;
                                            effectiveTempoBpm = bpm;
                                            effectiveTempoSource = "MusicXML 速度標記";
                                        }
                                    }
                                }
                            }
                        }
                        else if (local == "backup")
                        {
                            int dur = GetDurationDivisions(item);
                            double moveMs = dur * msPerQuarter / Math.Max(1, divisions);
                            cursorMs -= moveMs;
                            if (cursorMs < measureStartMs)
                            {
                                cursorMs = measureStartMs;
                            }

                            lastStartMs = cursorMs;
                        }
                        else if (local == "forward")
                        {
                            int dur = GetDurationDivisions(item);
                            double moveMs = dur * msPerQuarter / Math.Max(1, divisions);
                            cursorMs += moveMs;
                            if (cursorMs > measureMaxMs)
                            {
                                measureMaxMs = cursorMs;
                            }

                            lastStartMs = cursorMs;
                        }
                        else if (local == "note")
                        {
                            bool isChord = ElementLocal(item, "chord") != null;
                            bool isRest = ElementLocal(item, "rest") != null;
                            bool isGrace = ElementLocal(item, "grace") != null;

                            int dur = GetDurationDivisions(item);
                            double durationMs = dur > 0 ? dur * msPerQuarter / Math.Max(1, divisions) : 0.0;
                            double advanceMs = (dur > 0 && !isGrace) ? durationMs : 0.0;
                            double holdMs = durationMs > 0 ? durationMs : 80.0;
                            double startMs = isChord ? lastStartMs : cursorMs;
                            double endMs = startMs + Math.Max(40.0, holdMs);

                            if (!isRest)
                            {
                                XElement pitch = ElementLocal(item, "pitch");
                                if (pitch != null)
                                {
                                    int midi = MusicXmlPitchToMidi(pitch);
                                    int noteHand = hand >= 0 ? hand : (midi < 60 ? 0 : 1);
                                    bool tieStart = HasMusicXmlTieType(item, "start");
                                    bool tieStop = HasMusicXmlTieType(item, "stop");

                                    if (tieStop && activeTies.ContainsKey(midi))
                                    {
                                        ActiveTieState tie = activeTies[midi];
                                        tie.LastEndMs = endMs;

                                        if (!tieStart)
                                        {
                                            AddRecordedMidiEvent(events, (int)Math.Round(endMs), midi, false, 0, tie.Hand);
                                            activeTies.Remove(midi);
                                        }
                                    }
                                    else
                                    {
                                        AddRecordedMidiEvent(events, (int)Math.Round(startMs), midi, true, velocity, noteHand);

                                        if (tieStart)
                                        {
                                            if (activeTies.ContainsKey(midi))
                                            {
                                                activeTies[midi].LastEndMs = endMs;
                                            }
                                            else
                                            {
                                                activeTies.Add(midi, new ActiveTieState(midi, noteHand, endMs));
                                            }
                                        }
                                        else
                                        {
                                            AddRecordedMidiEvent(events, (int)Math.Round(endMs), midi, false, 0, noteHand);
                                        }
                                    }

                                    if (endMs > measureMaxMs)
                                    {
                                        measureMaxMs = endMs;
                                    }
                                }
                            }
                            else
                            {
                                double restEndMs = startMs + advanceMs;
                                if (restEndMs > measureMaxMs)
                                {
                                    measureMaxMs = restEndMs;
                                }
                            }

                            if (!isChord)
                            {
                                lastStartMs = cursorMs;
                                cursorMs += advanceMs;

                                if (cursorMs > measureMaxMs)
                                {
                                    measureMaxMs = cursorMs;
                                }
                            }
                        }
                    }

                    if (measureMaxMs > partCurrentMs)
                    {
                        partCurrentMs = measureMaxMs;
                    }
                }

                // 如果 OMR 少掉 tie stop，至少在最後已知時間補 NoteOff，避免長音卡住。
                foreach (ActiveTieState tie in activeTies.Values)
                {
                    AddRecordedMidiEvent(events, (int)Math.Round(tie.LastEndMs), tie.Midi, false, 0, tie.Hand);
                }
            }

            events = NormalizeRecordedEventsForPlayback(events);

            if (events.Count == 0)
            {
                throw new Exception("這份 MusicXML 沒有解析到可播放音符。");
            }

            Song song = new Song(Path.GetFileNameWithoutExtension(filePath), "MusicXML 匯入", "由 MusicXML 產生，可顯示落下方塊與自動彈奏。", false);
            song.RecordedEvents = events;
            song.TempoBpm = effectiveTempoBpm;
            song.TempoSource = effectiveTempoSource;
            return song;
        }

        private double DetectFirstMusicXmlTempoBpm(XElement root, double fallbackBpm, out bool found)
        {
            found = false;

            if (root == null)
            {
                return fallbackBpm;
            }

            // 先找 <sound tempo="...">，這是 Audiveris / MusicXML 最常輸出的速度。
            foreach (XElement sound in root.Descendants().Where(x => x.Name.LocalName == "sound"))
            {
                XAttribute tempoAttr = sound.Attribute("tempo");
                if (tempoAttr != null)
                {
                    double bpm;
                    if (double.TryParse(tempoAttr.Value, out bpm) && bpm >= 20.0 && bpm <= 300.0)
                    {
                        found = true;
                        return bpm;
                    }
                }
            }

            // 有些 MusicXML 只有 <metronome><per-minute>102</per-minute></metronome>。
            foreach (XElement perMinute in root.Descendants().Where(x => x.Name.LocalName == "per-minute"))
            {
                double bpm;
                if (double.TryParse(perMinute.Value.Trim(), out bpm) && bpm >= 20.0 && bpm <= 300.0)
                {
                    found = true;
                    return bpm;
                }
            }

            return fallbackBpm;
        }

        private void AddRecordedMidiEvent(List<RecordedMidiEvent> events, int timeMs, int midi, bool isNoteOn, int eventVelocity, int hand)
        {
            RecordedMidiEvent ev = new RecordedMidiEvent();
            ev.TimeMs = Math.Max(0, timeMs);
            ev.Midi = Math.Max(0, Math.Min(127, midi));
            ev.IsNoteOn = isNoteOn;
            ev.Velocity = isNoteOn ? Math.Max(1, Math.Min(127, eventVelocity)) : 0;
            ev.Hand = hand;
            events.Add(ev);
        }

        private string PrepareMusicXmlFileForReading(string filePath)
        {
            if (!Path.GetExtension(filePath).Equals(".mxl", StringComparison.OrdinalIgnoreCase))
            {
                return filePath;
            }

            string extractDir = Path.Combine(
                Path.GetTempPath(),
                "PianoMxlExtract",
                Path.GetFileNameWithoutExtension(filePath) + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));

            Directory.CreateDirectory(extractDir);

            string zipPath = Path.Combine(extractDir, "score.zip");
            File.Copy(filePath, zipPath, true);

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "powershell.exe";
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.Arguments =
                "-NoProfile -ExecutionPolicy Bypass -Command " +
                "\"Expand-Archive -LiteralPath '" + PowerShellSingleQuote(zipPath) + "' -DestinationPath '" + PowerShellSingleQuote(extractDir) + "' -Force\"";

            string output = "";
            string error = "";
            int exitCode = -1;

            using (Process p = new Process())
            {
                p.StartInfo = psi;
                p.Start();
                output = p.StandardOutput.ReadToEnd();
                error = p.StandardError.ReadToEnd();
                p.WaitForExit();
                exitCode = p.ExitCode;
            }

            if (exitCode != 0)
            {
                throw new Exception(
                    "無法解壓縮 .mxl 檔案。" + Environment.NewLine +
                    "PowerShell 輸出：" + output + Environment.NewLine +
                    "PowerShell 錯誤：" + error);
            }

            string containerPath = Path.Combine(extractDir, "META-INF", "container.xml");

            if (File.Exists(containerPath))
            {
                try
                {
                    XmlReaderSettings settings = new XmlReaderSettings();
                    settings.DtdProcessing = DtdProcessing.Ignore;

                    XDocument containerDoc;
                    using (XmlReader reader = XmlReader.Create(containerPath, settings))
                    {
                        containerDoc = XDocument.Load(reader);
                    }

                    XElement rootfile = containerDoc.Descendants().FirstOrDefault(x => x.Name.LocalName == "rootfile");
                    if (rootfile != null)
                    {
                        XAttribute fullPathAttr = rootfile.Attribute("full-path");
                        if (fullPathAttr != null)
                        {
                            string mainPath = Path.Combine(extractDir, fullPathAttr.Value.Replace('/', Path.DirectorySeparatorChar));
                            if (File.Exists(mainPath))
                            {
                                return mainPath;
                            }
                        }
                    }
                }
                catch
                {
                    // 如果 container.xml 解析失敗，就改用下面的檔案搜尋。
                }
            }

            string found = Directory.GetFiles(extractDir, "*.musicxml", SearchOption.AllDirectories)
                .Concat(Directory.GetFiles(extractDir, "*.xml", SearchOption.AllDirectories))
                .Where(f => !Path.GetFileName(f).Equals("container.xml", StringComparison.OrdinalIgnoreCase))
                .FirstOrDefault();

            if (string.IsNullOrWhiteSpace(found))
            {
                throw new Exception(".mxl 已解壓縮，但找不到 MusicXML 主檔。");
            }

            return found;
        }

        private string PowerShellSingleQuote(string text)
        {
            return text.Replace("'", "''");
        }

        private IEnumerable<XElement> ElementsLocal(XContainer container, string localName)
        {
            return container.Elements().Where(e => e.Name.LocalName == localName);
        }

        private XElement ElementLocal(XContainer container, string localName)
        {
            return container.Elements().FirstOrDefault(e => e.Name.LocalName == localName);
        }

        private int GetDurationDivisions(XElement element)
        {
            XElement dur = ElementLocal(element, "duration");
            if (dur == null)
            {
                return 0;
            }

            int value;
            if (int.TryParse(dur.Value.Trim(), out value))
            {
                return Math.Max(0, value);
            }

            return 0;
        }

        private bool HasMusicXmlTieType(XElement note, string type)
        {
            foreach (XElement tie in ElementsLocal(note, "tie"))
            {
                XAttribute attr = tie.Attribute("type");
                if (attr != null && string.Equals(attr.Value, type, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            XElement notations = ElementLocal(note, "notations");
            if (notations != null)
            {
                foreach (XElement tied in notations.Descendants().Where(x => x.Name.LocalName == "tied"))
                {
                    XAttribute attr = tied.Attribute("type");
                    if (attr != null && string.Equals(attr.Value, type, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private int MusicXmlPitchToMidi(XElement pitch)
        {
            string step = ValueLocal(pitch, "step").ToUpper();
            int alter = 0;
            int octave = 4;

            int.TryParse(ValueLocal(pitch, "alter"), out alter);
            int.TryParse(ValueLocal(pitch, "octave"), out octave);

            int semitone = 0;
            switch (step)
            {
                case "C": semitone = 0; break;
                case "D": semitone = 2; break;
                case "E": semitone = 4; break;
                case "F": semitone = 5; break;
                case "G": semitone = 7; break;
                case "A": semitone = 9; break;
                case "B": semitone = 11; break;
                default: semitone = 0; break;
            }

            return (octave + 1) * 12 + semitone + alter;
        }

        private string ValueLocal(XContainer container, string localName)
        {
            XElement el = ElementLocal(container, localName);
            return el == null ? "" : el.Value.Trim();
        }

        #endregion

        #region MIDI 匯入

        private void BtnImportMidi_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "匯入 MIDI 檔";
            dlg.Filter = "MIDI 檔|*.mid;*.midi|所有檔案|*.*";

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            try
            {
                Song song = LoadMidiAsSong(dlg.FileName);
                AddImportedSong(song);
                lblStatus.Text = "狀態：已匯入 MIDI - " + Path.GetFileName(dlg.FileName);
            }
            catch (Exception ex)
            {
                MessageBox.Show("MIDI 匯入失敗：" + ex.Message);
            }
        }

        private Song LoadMidiAsSong(string filePath)
        {
            byte[] data = File.ReadAllBytes(filePath);
            int pos = 0;

            string header = ReadAscii(data, ref pos, 4);
            if (header != "MThd")
            {
                throw new Exception("這不是標準 MIDI 檔。");
            }

            int headerLength = ReadInt32BE(data, ref pos);
            int format = ReadInt16BE(data, ref pos);
            int trackCount = ReadInt16BE(data, ref pos);
            int division = ReadInt16BE(data, ref pos);

            if ((division & 0x8000) != 0)
            {
                throw new Exception("目前版本尚未支援 SMPTE time division 的 MIDI。");
            }

            int ticksPerQuarter = division;
            pos += Math.Max(0, headerLength - 6);

            List<RawMidiNoteEvent> rawNotes = new List<RawMidiNoteEvent>();
            List<TempoChange> tempos = new List<TempoChange>();
            tempos.Add(new TempoChange(0, 500000));

            for (int trackIndex = 0; trackIndex < trackCount; trackIndex++)
            {
                if (pos + 8 > data.Length)
                {
                    break;
                }

                string chunkId = ReadAscii(data, ref pos, 4);
                int chunkLength = ReadInt32BE(data, ref pos);
                int trackEnd = Math.Min(data.Length, pos + chunkLength);

                if (chunkId != "MTrk")
                {
                    pos = trackEnd;
                    continue;
                }

                ParseMidiTrack(data, pos, trackEnd, rawNotes, tempos);
                pos = trackEnd;
            }

            tempos = tempos.OrderBy(x => x.Tick).ToList();
            rawNotes = rawNotes.OrderBy(x => x.Tick).ToList();

            List<RecordedMidiEvent> events = new List<RecordedMidiEvent>();
            foreach (RawMidiNoteEvent raw in rawNotes)
            {
                RecordedMidiEvent ev = new RecordedMidiEvent();
                ev.TimeMs = TickToMilliseconds(raw.Tick, tempos, ticksPerQuarter);
                ev.Midi = raw.Midi;
                ev.IsNoteOn = raw.IsNoteOn;
                ev.Velocity = raw.Velocity <= 0 ? 0 : raw.Velocity;
                ev.Hand = raw.Midi < 60 ? 0 : 1;
                events.Add(ev);
            }

            events = NormalizeRecordedEventsForPlayback(events);

            if (events.Count == 0)
            {
                throw new Exception("這個 MIDI 沒有讀到音符事件。");
            }

            Song song = new Song(Path.GetFileNameWithoutExtension(filePath), "MIDI 匯入", "從 MIDI 檔匯入，可自動播放、顯示落下方塊、左右手分色。", false);
            song.RecordedEvents = events;
            return song;
        }

        private void ParseMidiTrack(byte[] data, int start, int end, List<RawMidiNoteEvent> rawNotes, List<TempoChange> tempos)
        {
            int pos = start;
            int runningStatus = 0;
            long tick = 0;

            while (pos < end)
            {
                int delta = ReadVariableLength(data, ref pos, end);
                tick += delta;

                if (pos >= end)
                {
                    break;
                }

                int status = data[pos];

                if (status < 0x80)
                {
                    if (runningStatus == 0)
                    {
                        break;
                    }

                    status = runningStatus;
                }
                else
                {
                    pos++;

                    if (status < 0xF0)
                    {
                        runningStatus = status;
                    }
                }

                if (status == 0xFF)
                {
                    if (pos >= end)
                    {
                        break;
                    }

                    int metaType = data[pos++];
                    int length = ReadVariableLength(data, ref pos, end);

                    if (metaType == 0x51 && length == 3 && pos + 2 < end)
                    {
                        int microseconds = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
                        tempos.Add(new TempoChange(tick, microseconds));
                    }

                    pos += length;
                    continue;
                }

                if (status == 0xF0 || status == 0xF7)
                {
                    int length = ReadVariableLength(data, ref pos, end);
                    pos += length;
                    continue;
                }

                int command = status & 0xF0;
                int channel = status & 0x0F;

                int data1 = 0;
                int data2 = 0;

                if (command == 0xC0 || command == 0xD0)
                {
                    if (pos >= end) break;
                    data1 = data[pos++];
                }
                else
                {
                    if (pos + 1 >= end) break;
                    data1 = data[pos++];
                    data2 = data[pos++];
                }

                if (command == 0x90 || command == 0x80)
                {
                    RawMidiNoteEvent ev = new RawMidiNoteEvent();
                    ev.Tick = tick;
                    ev.Midi = data1;
                    ev.Channel = channel;
                    ev.IsNoteOn = command == 0x90 && data2 > 0;
                    ev.Velocity = ev.IsNoteOn ? data2 : 0;
                    rawNotes.Add(ev);
                }
            }
        }

        private int TickToMilliseconds(long tick, List<TempoChange> tempos, int ticksPerQuarter)
        {
            double ms = 0;
            long lastTick = 0;
            int tempo = 500000;

            foreach (TempoChange change in tempos)
            {
                if (change.Tick > tick)
                {
                    break;
                }

                long delta = change.Tick - lastTick;
                if (delta > 0)
                {
                    ms += delta * tempo / (double)ticksPerQuarter / 1000.0;
                }

                tempo = change.MicrosecondsPerQuarter;
                lastTick = change.Tick;
            }

            long remain = tick - lastTick;
            if (remain > 0)
            {
                ms += remain * tempo / (double)ticksPerQuarter / 1000.0;
            }

            return (int)Math.Round(ms);
        }

        private string ReadAscii(byte[] data, ref int pos, int length)
        {
            string s = Encoding.ASCII.GetString(data, pos, length);
            pos += length;
            return s;
        }

        private int ReadInt16BE(byte[] data, ref int pos)
        {
            int value = (data[pos] << 8) | data[pos + 1];
            pos += 2;
            return value;
        }

        private int ReadInt32BE(byte[] data, ref int pos)
        {
            int value = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
            pos += 4;
            return value;
        }

        private int ReadVariableLength(byte[] data, ref int pos, int end)
        {
            int value = 0;
            int count = 0;

            while (pos < end && count < 4)
            {
                int b = data[pos++];
                value = (value << 7) | (b & 0x7F);
                count++;

                if ((b & 0x80) == 0)
                {
                    break;
                }
            }

            return value;
        }

        #endregion

        #region 錄製

        private void BtnRecord_Click(object sender, EventArgs e)
        {
            StopAutoPlay();
            pianoRoll.StopPlayback();
            StopAllNotes(false);

            recordedEvents.Clear();
            recordWatch = Stopwatch.StartNew();
            isRecording = true;

            lblRecordStatus.Text = "錄音狀態：錄製中...\r\n請用滑鼠或鍵盤彈奏。";
            lblStatus.Text = "狀態：開始錄製。";
        }

        private void BtnStopRecord_Click(object sender, EventArgs e)
        {
            if (!isRecording)
            {
                return;
            }

            isRecording = false;

            if (recordWatch != null)
            {
                recordWatch.Stop();
            }

            StopAllNotes(false);
            lblRecordStatus.Text =
                "錄音狀態：已停止。\r\n" +
                "事件數：" + recordedEvents.Count + "\r\n" +
                "長度：" + GetRecordingLengthText();

            Song previewSong = new Song("錄音預覽", "錄製", "目前錄製的內容。", false);
            previewSong.RecordedEvents = CloneRecordedEvents(recordedEvents);
            pianoRoll.LoadNotes(BuildVisualNotes(previewSong));
            lblStatus.Text = "狀態：錄製完成。";
        }

        private async void BtnPlayRecord_Click(object sender, EventArgs e)
        {
            if (recordedEvents.Count == 0)
            {
                MessageBox.Show("目前沒有錄音內容。");
                return;
            }

            StopAutoPlay();
            StopAllNotes(false);

            Song temp = new Song("錄音", "錄製", "目前錄製的內容。", false);
            temp.RecordedEvents = CloneRecordedEvents(recordedEvents);

            autoPlayCts = new CancellationTokenSource();
            CancellationToken token = autoPlayCts.Token;

            try
            {
                if (trkProgress != null)
                {
                    updatingProgressUi = true;
                    trkProgress.Value = 0;
                    updatingProgressUi = false;
                }
                BeginPlaybackProgress(temp);
                PrepareRollForPlayback(temp);
                lblStatus.Text = "狀態：正在播放錄音。";
                await WaitPianoRollLeadInAsync(token);
                await PlayRecordedEventsCoreAsync(recordedEvents, token);
                lblStatus.Text = "狀態：錄音播放完成。";
            }
            catch (OperationCanceledException)
            {
                lblStatus.Text = "狀態：錄音播放已停止。";
            }
            finally
            {
                pianoRoll.StopPlayback();
                EndPlaybackProgress();
                StopAllNotes(false);

                if (autoPlayCts != null)
                {
                    autoPlayCts.Dispose();
                    autoPlayCts = null;
                }
            }
        }

        private void BtnClearRecord_Click(object sender, EventArgs e)
        {
            isRecording = false;
            recordedEvents.Clear();
            recordWatch = null;
            lblRecordStatus.Text = "錄音狀態：已清除。";
            lblStatus.Text = "狀態：錄音已清除。";
            pianoRoll.ClearNotes();
        }

        private void BtnAddRecordToPlaylist_Click(object sender, EventArgs e)
        {
            if (recordedEvents.Count == 0)
            {
                MessageBox.Show("目前沒有錄音內容。");
                return;
            }

            Song song = new Song("我的錄音 " + DateTime.Now.ToString("HH:mm:ss"), "錄製", "使用者錄製的演奏。", false);
            song.RecordedEvents = CloneRecordedEvents(recordedEvents);
            lstPlaylist.Items.Add(song);
            lblStatus.Text = "狀態：錄音已加入播放清單。";
        }

        private void BtnSaveRecord_Click(object sender, EventArgs e)
        {
            if (recordedEvents.Count == 0)
            {
                MessageBox.Show("目前沒有錄音內容。");
                return;
            }

            SaveFileDialog dlg = new SaveFileDialog();
            dlg.Title = "儲存錄音 TXT";
            dlg.Filter = "文字檔|*.txt";
            dlg.FileName = "piano_record_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt";

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            List<string> lines = new List<string>();
            lines.Add("# Piano Recording TXT");
            lines.Add("# TimeMs,Midi,IsNoteOn,Velocity,Hand");

            foreach (RecordedMidiEvent ev in recordedEvents)
            {
                lines.Add(ev.TimeMs + "," + ev.Midi + "," + ev.IsNoteOn + "," + ev.Velocity + "," + ev.Hand);
            }

            File.WriteAllLines(dlg.FileName, lines, Encoding.UTF8);
            lblStatus.Text = "狀態：錄音已儲存 TXT。";
        }

        private void BtnLoadRecord_Click(object sender, EventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Title = "讀取錄音 TXT";
            dlg.Filter = "文字檔|*.txt|所有檔案|*.*";

            if (dlg.ShowDialog() != DialogResult.OK)
            {
                return;
            }

            try
            {
                List<RecordedMidiEvent> loaded = new List<RecordedMidiEvent>();
                string[] lines = File.ReadAllLines(dlg.FileName, Encoding.UTF8);

                foreach (string raw in lines)
                {
                    string line = raw.Trim();
                    if (line.Length == 0 || line.StartsWith("#"))
                    {
                        continue;
                    }

                    string[] parts = line.Split(',');
                    if (parts.Length < 4)
                    {
                        continue;
                    }

                    RecordedMidiEvent ev = new RecordedMidiEvent();
                    ev.TimeMs = int.Parse(parts[0]);
                    ev.Midi = int.Parse(parts[1]);
                    ev.IsNoteOn = bool.Parse(parts[2]);
                    ev.Velocity = int.Parse(parts[3]);
                    ev.Hand = parts.Length >= 5 ? int.Parse(parts[4]) : (ev.Midi < 60 ? 0 : 1);
                    loaded.Add(ev);
                }

                recordedEvents = loaded;
                lblRecordStatus.Text =
                    "錄音狀態：已讀取 TXT。\r\n" +
                    "事件數：" + recordedEvents.Count + "\r\n" +
                    "長度：" + GetRecordingLengthText();

                Song previewSong = new Song("錄音預覽", "錄製", "從 TXT 讀取的錄音。", false);
                previewSong.RecordedEvents = CloneRecordedEvents(recordedEvents);
                pianoRoll.LoadNotes(BuildVisualNotes(previewSong));
                lblStatus.Text = "狀態：錄音 TXT 已讀取。";
            }
            catch (Exception ex)
            {
                MessageBox.Show("讀取失敗：" + ex.Message);
            }
        }

        private void AddRecordedEvent(bool isNoteOn, int midi, int vel)
        {
            if (!isRecording || recordWatch == null)
            {
                return;
            }

            RecordedMidiEvent ev = new RecordedMidiEvent();
            ev.TimeMs = (int)recordWatch.ElapsedMilliseconds;
            ev.Midi = midi;
            ev.IsNoteOn = isNoteOn;
            ev.Velocity = vel;
            ev.Hand = midi < 60 ? 0 : 1;
            recordedEvents.Add(ev);

            lblRecordStatus.Text =
                "錄音狀態：錄製中...\r\n" +
                "事件數：" + recordedEvents.Count + "\r\n" +
                "目前音符：" + NoteName(midi);
        }

        private async Task PlayRecordedEventsCoreAsync(List<RecordedMidiEvent> events, CancellationToken token)
        {
            List<RecordedMidiEvent> ordered = PrepareRecordedEventsForPlaybackFeel(events);
            if (ordered.Count == 0)
            {
                return;
            }

            if (playbackPositionMs < 0)
            {
                playbackPositionMs = 0;
                playbackPositionExactMs = 0.0;
            }

            ApplyKeysAtRecordedPosition(ordered, playbackPositionMs, true);
            int index = FindFirstEventIndexAfter(ordered, playbackPositionMs);

            while (index < ordered.Count)
            {
                token.ThrowIfCancellationRequested();

                if (ConsumePlaybackSeek(out int seekTarget))
                {
                    playbackPositionMs = Math.Max(0, Math.Min(playbackTotalMs, seekTarget));
                    playbackPositionExactMs = playbackPositionMs;
                    if (pianoRoll != null)
                    {
                        pianoRoll.SetCurrentTimeMs(playbackPositionMs);
                    }
                    ApplyKeysAtRecordedPosition(ordered, playbackPositionMs, true);
                    index = FindFirstEventIndexAfter(ordered, playbackPositionMs);
                    continue;
                }

                RecordedMidiEvent ev = ordered[index];

                if (ev.TimeMs > playbackPositionMs)
                {
                    await AdvancePlaybackPositionUntilAsync(ev.TimeMs, token);
                    continue;
                }

                while (index < ordered.Count && ordered[index].TimeMs <= playbackPositionMs)
                {
                    RecordedMidiEvent current = ordered[index];
                    if (current.IsNoteOn)
                    {
                        SendNoteOn(current.Midi, current.Velocity);
                        pianoControl.SetPressed(current.Midi, true);
                    }
                    else
                    {
                        SendNoteOff(current.Midi);
                        pianoControl.SetPressed(current.Midi, false);
                    }

                    index++;
                }
            }

            if (playbackPositionMs < playbackTotalMs)
            {
                await AdvancePlaybackPositionUntilAsync(playbackTotalMs, token);
            }
        }

        private async Task AdvancePlaybackPositionUntilAsync(int targetMs, CancellationToken token)
        {
            targetMs = Math.Max(0, Math.Min(playbackTotalMs, targetMs));

            while (playbackPositionMs < targetMs)
            {
                token.ThrowIfCancellationRequested();

                if (playbackSeekRequested)
                {
                    return;
                }

                if (playbackPaused)
                {
                    await Task.Delay(50, token);
                    continue;
                }

                double tempoFactor = GetTempoFactor();
                if (tempoFactor <= 0.0)
                {
                    tempoFactor = 1.0;
                }

                double remainingScoreMs = targetMs - playbackPositionExactMs;
                int delayMs = (int)Math.Max(1, Math.Min(20, Math.Ceiling(remainingScoreMs / tempoFactor)));

                await Task.Delay(delayMs, token);

                if (playbackSeekRequested)
                {
                    return;
                }

                playbackPositionExactMs += delayMs * tempoFactor;
                if (playbackPositionExactMs > targetMs)
                {
                    playbackPositionExactMs = targetMs;
                }

                playbackPositionMs = (int)Math.Round(playbackPositionExactMs);

                if (pianoRoll != null)
                {
                    pianoRoll.SetCurrentTimeMs(playbackPositionMs);
                }
            }
        }

        private bool ConsumePlaybackSeek(out int targetMs)
        {
            if (playbackSeekRequested)
            {
                targetMs = playbackSeekTargetMs;
                playbackSeekRequested = false;
                return true;
            }

            targetMs = 0;
            return false;
        }

        private string GetRecordingLengthText()
        {
            if (recordedEvents.Count == 0)
            {
                return "0 秒";
            }

            int max = recordedEvents.Max(x => x.TimeMs);
            return (max / 1000.0).ToString("0.0") + " 秒";
        }

        private List<RecordedMidiEvent> CloneRecordedEvents(List<RecordedMidiEvent> source)
        {
            List<RecordedMidiEvent> list = new List<RecordedMidiEvent>();

            foreach (RecordedMidiEvent ev in source)
            {
                RecordedMidiEvent copy = new RecordedMidiEvent();
                copy.TimeMs = ev.TimeMs;
                copy.Midi = ev.Midi;
                copy.IsNoteOn = ev.IsNoteOn;
                copy.Velocity = ev.Velocity;
                copy.Hand = ev.Hand;
                list.Add(copy);
            }

            return list;
        }

        #endregion

        #region 節拍器

        private void BtnMetronomeStart_Click(object sender, EventArgs e)
        {
            int bpm = (int)nudBpm.Value;
            metronomeTimer.Interval = Math.Max(20, 60000 / bpm);
            metronomeBeat = 1;
            metronomeTimer.Start();
            lblStatus.Text = "狀態：節拍器已開始，BPM = " + bpm;
        }

        private void BtnMetronomeStop_Click(object sender, EventArgs e)
        {
            metronomeTimer.Stop();
            lblMetronomeBeat.Text = "節拍：-";
            lblStatus.Text = "狀態：節拍器已停止。";
        }

        private void MetronomeTimer_Tick(object sender, EventArgs e)
        {
            int beats = (int)nudBeatsPerMeasure.Value;
            bool accent = metronomeBeat == 1;
            lblMetronomeBeat.Text = accent ? "●  " + metronomeBeat : "○  " + metronomeBeat;
            lblMetronomeBeat.ForeColor = accent ? Color.Firebrick : Color.FromArgb(40, 40, 40);
            PlayMetronomeClick(accent);

            metronomeBeat++;
            if (metronomeBeat > beats)
            {
                metronomeBeat = 1;
            }
        }

        private async void PlayMetronomeClick(bool accent)
        {
            int note = accent ? 76 : 77;
            int vel = accent ? 120 : 85;
            SendMidiMessageOnChannel(9, 0x90, note, vel);
            await Task.Delay(55);
            SendMidiMessageOnChannel(9, 0x80, note, 0);
        }

        #endregion

        private List<RecordedMidiEvent> NormalizeRecordedEventsForPlayback(List<RecordedMidiEvent> source)
        {
            List<RecordedMidiEvent> ordered = source
                .OrderBy(x => x.TimeMs)
                .ThenBy(x => x.IsNoteOn ? 1 : 0) // 同一時間先放開再按下，重複同音才會確實連彈
                .ToList();

            List<RecordedMidiEvent> result = new List<RecordedMidiEvent>();
            HashSet<int> activeNotes = new HashSet<int>();

            foreach (RecordedMidiEvent ev in ordered)
            {
                if (ev.IsNoteOn)
                {
                    if (activeNotes.Contains(ev.Midi))
                    {
                        RecordedMidiEvent forcedOff = new RecordedMidiEvent();
                        forcedOff.TimeMs = ev.TimeMs;
                        forcedOff.Midi = ev.Midi;
                        forcedOff.IsNoteOn = false;
                        forcedOff.Velocity = 0;
                        forcedOff.Hand = ev.Hand;
                        result.Add(forcedOff);
                        activeNotes.Remove(ev.Midi);
                    }

                    result.Add(ev);
                    activeNotes.Add(ev.Midi);
                }
                else
                {
                    result.Add(ev);
                    activeNotes.Remove(ev.Midi);
                }
            }

            return result
                .OrderBy(x => x.TimeMs)
                .ThenBy(x => x.IsNoteOn ? 1 : 0)
                .ToList();
        }

        private List<RecordedMidiEvent> PrepareRecordedEventsForPlaybackFeel(List<RecordedMidiEvent> source)
        {
            // V55：這個只影響「本程式播放 / 方塊顯示」的演奏感，不改原始 MIDI / MusicXML 資料。
            // 目的：讓 OMR、PDF、截圖、YouTube 轉 MIDI 聽起來更像 PopPiano 那種乾淨、輕快的鋼琴播放。
            if (source == null || source.Count == 0)
            {
                return new List<RecordedMidiEvent>();
            }

            List<AiMidiNoteSegment> segments = BuildAiMidiNoteSegments(NormalizeRecordedEventsForPlayback(source));
            if (segments.Count == 0)
            {
                return NormalizeRecordedEventsForPlayback(source);
            }

            List<RecordedMidiEvent> result = new List<RecordedMidiEvent>();

            foreach (AiMidiNoteSegment seg in segments)
            {
                int duration = Math.Max(40, seg.EndMs - seg.StartMs);
                double ratio;

                if (duration <= 160)
                {
                    ratio = 0.86;
                }
                else if (duration <= 500)
                {
                    ratio = 0.90;
                }
                else
                {
                    ratio = 0.94;
                }

                int newDuration = Math.Max(55, (int)Math.Round(duration * ratio));

                // 不要讓很長的音整個糊在一起，但也保留長音感。
                if (duration > 900)
                {
                    newDuration = Math.Max(500, Math.Min(newDuration, duration - 45));
                }

                int startMs = seg.StartMs;
                int endMs = startMs + newDuration;

                RecordedMidiEvent on = new RecordedMidiEvent();
                on.TimeMs = startMs;
                on.Midi = seg.Midi;
                on.IsNoteOn = true;
                on.Velocity = ApplyBrightVelocityCurve(seg.Velocity);
                on.Hand = seg.Hand;
                result.Add(on);

                RecordedMidiEvent off = new RecordedMidiEvent();
                off.TimeMs = endMs;
                off.Midi = seg.Midi;
                off.IsNoteOn = false;
                off.Velocity = 0;
                off.Hand = seg.Hand;
                result.Add(off);
            }

            return NormalizeRecordedEventsForPlayback(result);
        }

        private Song CleanAiMidiSong(Song song, string mode)
        {
            if (song == null || song.RecordedEvents == null || song.RecordedEvents.Count == 0)
            {
                return song;
            }

            if (IsAiModeOriginal(mode))
            {
                song.RecordedEvents = NormalizeRecordedEventsForPlayback(song.RecordedEvents);
                return song;
            }

            List<AiMidiNoteSegment> notes = BuildAiMidiNoteSegments(song.RecordedEvents);
            if (notes.Count == 0)
            {
                return song;
            }

            if (IsAiSimilarPianoMode(mode))
            {
                song.RecordedEvents = BuildAiSimilarPianoEvents(notes, mode);
                return song;
            }

            int minMidi = 36;
            int maxMidi = 96;
            int minDuration = 80;
            int quantizeMs = 50;
            int maxNotesPerSlice = 8;
            bool preferMelody = false;

            if (!string.IsNullOrWhiteSpace(mode) && mode.StartsWith("旋律"))
            {
                minMidi = 55;
                maxMidi = 96;
                minDuration = 100;
                quantizeMs = 60;
                maxNotesPerSlice = 2;
                preferMelody = true;
            }
            else if (!string.IsNullOrWhiteSpace(mode) && mode.StartsWith("鋼琴"))
            {
                minMidi = 36;
                maxMidi = 96;
                minDuration = 80;
                quantizeMs = 50;
                maxNotesPerSlice = 8;
                preferMelody = false;
            }
            else if (!string.IsNullOrWhiteSpace(mode) && mode.StartsWith("強力"))
            {
                minMidi = 48;
                maxMidi = 88;
                minDuration = 120;
                quantizeMs = 80;
                maxNotesPerSlice = 3;
                preferMelody = true;
            }

            List<AiMidiNoteSegment> filtered = new List<AiMidiNoteSegment>();

            foreach (AiMidiNoteSegment note in notes)
            {
                if (note.Midi < minMidi || note.Midi > maxMidi)
                {
                    continue;
                }

                int duration = note.EndMs - note.StartMs;
                if (duration < minDuration)
                {
                    continue;
                }

                note.StartMs = QuantizeTime(note.StartMs, quantizeMs);
                note.EndMs = QuantizeTime(note.EndMs, quantizeMs);

                if (note.EndMs <= note.StartMs)
                {
                    note.EndMs = note.StartMs + minDuration;
                }

                if (note.EndMs - note.StartMs < minDuration)
                {
                    note.EndMs = note.StartMs + minDuration;
                }

                filtered.Add(note);
            }

            filtered = LimitAiMidiDensity(filtered, quantizeMs, maxNotesPerSlice, preferMelody);

            List<RecordedMidiEvent> cleanedEvents = new List<RecordedMidiEvent>();
            foreach (AiMidiNoteSegment note in filtered)
            {
                RecordedMidiEvent on = new RecordedMidiEvent();
                on.TimeMs = note.StartMs;
                on.Midi = note.Midi;
                on.IsNoteOn = true;
                on.Velocity = Math.Max(35, Math.Min(120, note.Velocity));
                on.Hand = note.Hand;
                cleanedEvents.Add(on);

                RecordedMidiEvent off = new RecordedMidiEvent();
                off.TimeMs = note.EndMs;
                off.Midi = note.Midi;
                off.IsNoteOn = false;
                off.Velocity = 0;
                off.Hand = note.Hand;
                cleanedEvents.Add(off);
            }

            if (cleanedEvents.Count > 0)
            {
                song.RecordedEvents = NormalizeRecordedEventsForPlayback(cleanedEvents);
            }

            return song;
        }

        private List<RecordedMidiEvent> BuildAiSimilarPianoEvents(List<AiMidiNoteSegment> sourceNotes, string mode)
        {
            List<AiMidiNoteSegment> source = new List<AiMidiNoteSegment>();

            foreach (AiMidiNoteSegment note in sourceNotes)
            {
                int duration = note.EndMs - note.StartMs;
                if (duration < 80)
                {
                    continue;
                }

                if (note.Midi < 36 || note.Midi > 96)
                {
                    continue;
                }

                AiMidiNoteSegment n = new AiMidiNoteSegment(
                    QuantizeTime(note.StartMs, 80),
                    QuantizeTime(note.EndMs, 80),
                    note.Midi,
                    note.Velocity,
                    note.Midi < 60 ? 0 : 1);

                if (n.EndMs <= n.StartMs)
                {
                    n.EndMs = n.StartMs + 160;
                }

                source.Add(n);
            }

            if (source.Count == 0)
            {
                return new List<RecordedMidiEvent>();
            }

            // V56：這裡不是精準扒譜，而是更接近 PopPiano 的「抓主旋律 + 估和弦 + 重新編成鋼琴版」。
            List<AiMidiNoteSegment> arrangement = new List<AiMidiNoteSegment>();
            arrangement.AddRange(ExtractSimpleMelodyLine(source));

            if (mode.StartsWith("精簡"))
            {
                // 只保留主旋律。
            }
            else if (mode.StartsWith("主旋律 + 簡單左手"))
            {
                arrangement.AddRange(ExtractSimpleBassLine(source));
            }
            else if (mode.StartsWith("主旋律 + 分解和弦"))
            {
                arrangement.AddRange(GenerateChordAccompaniment(source, true, false));
            }
            else
            {
                // PopPiano 風格：主旋律 + 低音根音 + 輕量分解和弦。
                arrangement.AddRange(GenerateChordAccompaniment(source, true, true));
            }

            arrangement = arrangement
                .OrderBy(n => n.StartMs)
                .ThenBy(n => n.Midi)
                .ToList();

            arrangement = MergeTooCloseSimilarNotes(arrangement);
            return ConvertAiSegmentsToRecordedEvents(arrangement);
        }

        private List<AiMidiNoteSegment> ExtractSimpleMelodyLine(List<AiMidiNoteSegment> source)
        {
            List<AiMidiNoteSegment> melody = new List<AiMidiNoteSegment>();
            int windowMs = 240;
            int lastMidi = -1;
            int lastStart = -99999;

            var groups = source
                .Where(n => n.Midi >= 58 && n.Midi <= 96)
                .GroupBy(n => n.StartMs / windowMs)
                .OrderBy(g => g.Key);

            foreach (var group in groups)
            {
                List<AiMidiNoteSegment> candidates = group.ToList();
                if (candidates.Count == 0)
                {
                    continue;
                }

                AiMidiNoteSegment selected = candidates
                    .OrderByDescending(n => ScoreMelodyCandidate(n, lastMidi))
                    .First();

                // 太密的同音通常是人聲抖動或 Basic Pitch 抖音，直接略過。
                if (lastMidi == selected.Midi && selected.StartMs - lastStart < 260)
                {
                    continue;
                }

                int duration = selected.EndMs - selected.StartMs;
                duration = Math.Max(180, Math.Min(720, duration));

                AiMidiNoteSegment m = new AiMidiNoteSegment(
                    selected.StartMs,
                    selected.StartMs + duration,
                    selected.Midi,
                    Math.Max(78, Math.Min(108, selected.Velocity + 8)),
                    1);

                melody.Add(m);
                lastMidi = m.Midi;
                lastStart = m.StartMs;
            }

            return melody;
        }

        private int ScoreMelodyCandidate(AiMidiNoteSegment note, int lastMidi)
        {
            int duration = Math.Max(0, note.EndMs - note.StartMs);
            int score = note.Velocity * 3 + duration / 4;

            // 主旋律多半在中高音，但太高的泛音不要過度鼓勵。
            if (note.Midi >= 62 && note.Midi <= 84)
            {
                score += 70;
            }
            else if (note.Midi > 84)
            {
                score += 15;
            }

            if (lastMidi >= 0)
            {
                int jump = Math.Abs(note.Midi - lastMidi);
                if (jump <= 7)
                {
                    score += 35;
                }
                else if (jump > 18)
                {
                    score -= 80;
                }
            }

            return score;
        }

        private List<AiMidiNoteSegment> ExtractSimpleBassLine(List<AiMidiNoteSegment> source)
        {
            List<AiMidiNoteSegment> bass = new List<AiMidiNoteSegment>();
            int windowMs = 960;

            var groups = source
                .Where(n => n.Midi >= 36 && n.Midi <= 64 && (n.EndMs - n.StartMs) >= 100)
                .GroupBy(n => n.StartMs / windowMs)
                .OrderBy(g => g.Key);

            foreach (var group in groups)
            {
                List<AiMidiNoteSegment> candidates = group.ToList();
                if (candidates.Count == 0)
                {
                    continue;
                }

                AiMidiNoteSegment selected = candidates
                    .OrderBy(n => n.Midi)
                    .ThenByDescending(n => n.Velocity)
                    .ThenByDescending(n => n.EndMs - n.StartMs)
                    .First();

                int start = group.Key * windowMs;
                int duration = 520;

                AiMidiNoteSegment b = new AiMidiNoteSegment(
                    start,
                    start + duration,
                    selected.Midi,
                    Math.Max(52, Math.Min(82, selected.Velocity)),
                    0);

                bass.Add(b);
            }

            return bass;
        }

        private List<AiMidiNoteSegment> GenerateChordAccompaniment(List<AiMidiNoteSegment> source, bool arpeggio, bool includeBass)
        {
            List<AiMidiNoteSegment> result = new List<AiMidiNoteSegment>();
            int windowMs = 960;

            var groups = source
                .Where(n => n.Midi >= 36 && n.Midi <= 90)
                .GroupBy(n => n.StartMs / windowMs)
                .OrderBy(g => g.Key);

            foreach (var group in groups)
            {
                List<AiMidiNoteSegment> notes = group.ToList();
                if (notes.Count == 0)
                {
                    continue;
                }

                bool minor;
                int rootPc = EstimateChordRoot(notes, out minor);
                int start = group.Key * windowMs;

                if (includeBass)
                {
                    int bassMidi = PitchClassToBassMidi(rootPc);
                    result.Add(new AiMidiNoteSegment(start, start + 560, bassMidi, 62, 0));

                    int fifthMidi = PitchClassToBassMidi((rootPc + 7) % 12);
                    if (Math.Abs(fifthMidi - bassMidi) > 3)
                    {
                        result.Add(new AiMidiNoteSegment(start + 480, start + 800, fifthMidi, 52, 0));
                    }
                }

                int root = PitchClassToRightHandMidi(rootPc);
                int third = PitchClassToRightHandMidi((rootPc + (minor ? 3 : 4)) % 12);
                int fifth = PitchClassToRightHandMidi((rootPc + 7) % 12);
                int[] chord = new int[] { root, third, fifth };

                if (arpeggio)
                {
                    int step = 240;
                    for (int i = 0; i < chord.Length; i++)
                    {
                        int s = start + i * step;
                        result.Add(new AiMidiNoteSegment(s, s + 210, chord[i], 58, 1));
                    }

                    result.Add(new AiMidiNoteSegment(start + 720, start + 900, chord[1], 50, 1));
                }
                else
                {
                    foreach (int midi in chord)
                    {
                        result.Add(new AiMidiNoteSegment(start, start + 520, midi, 54, 1));
                    }
                }
            }

            return result;
        }

        private int EstimateChordRoot(List<AiMidiNoteSegment> notes, out bool minor)
        {
            minor = false;
            double[] weights = new double[12];

            foreach (AiMidiNoteSegment note in notes)
            {
                int pc = ((note.Midi % 12) + 12) % 12;
                int duration = Math.Max(60, note.EndMs - note.StartMs);
                weights[pc] += duration + note.Velocity * 8;
            }

            double bestScore = double.MinValue;
            int bestRoot = 0;
            bool bestMinor = false;

            for (int root = 0; root < 12; root++)
            {
                double majorScore = weights[root] * 1.45 + weights[(root + 4) % 12] * 1.15 + weights[(root + 7) % 12] * 1.20;
                double minorScore = weights[root] * 1.45 + weights[(root + 3) % 12] * 1.15 + weights[(root + 7) % 12] * 1.20;

                // 稍微懲罰非和弦音太多，避免亂抓。
                for (int pc = 0; pc < 12; pc++)
                {
                    bool inMajor = pc == root || pc == (root + 4) % 12 || pc == (root + 7) % 12;
                    bool inMinor = pc == root || pc == (root + 3) % 12 || pc == (root + 7) % 12;

                    if (!inMajor) majorScore -= weights[pc] * 0.10;
                    if (!inMinor) minorScore -= weights[pc] * 0.10;
                }

                if (majorScore > bestScore)
                {
                    bestScore = majorScore;
                    bestRoot = root;
                    bestMinor = false;
                }

                if (minorScore > bestScore)
                {
                    bestScore = minorScore;
                    bestRoot = root;
                    bestMinor = true;
                }
            }

            minor = bestMinor;
            return bestRoot;
        }

        private int PitchClassToBassMidi(int pitchClass)
        {
            int midi = 36 + ((pitchClass % 12 + 12) % 12);
            while (midi < 40) midi += 12;
            while (midi > 55) midi -= 12;
            return midi;
        }

        private int PitchClassToRightHandMidi(int pitchClass)
        {
            int midi = 60 + ((pitchClass % 12 + 12) % 12);
            while (midi < 60) midi += 12;
            while (midi > 76) midi -= 12;
            return midi;
        }

        private List<AiMidiNoteSegment> MergeTooCloseSimilarNotes(List<AiMidiNoteSegment> notes)
        {
            List<AiMidiNoteSegment> result = new List<AiMidiNoteSegment>();

            foreach (AiMidiNoteSegment note in notes.OrderBy(n => n.StartMs).ThenBy(n => n.Midi))
            {
                if (result.Count > 0)
                {
                    AiMidiNoteSegment last = result[result.Count - 1];
                    if (last.Midi == note.Midi && note.StartMs - last.EndMs >= 0 && note.StartMs - last.EndMs < 120)
                    {
                        last.EndMs = Math.Max(last.EndMs, note.EndMs);
                        continue;
                    }
                }

                result.Add(note);
            }

            return result;
        }

        private List<RecordedMidiEvent> ConvertAiSegmentsToRecordedEvents(List<AiMidiNoteSegment> segments)
        {
            List<RecordedMidiEvent> events = new List<RecordedMidiEvent>();

            foreach (AiMidiNoteSegment note in segments)
            {
                if (note.EndMs <= note.StartMs)
                {
                    continue;
                }

                RecordedMidiEvent on = new RecordedMidiEvent();
                on.TimeMs = Math.Max(0, note.StartMs);
                on.Midi = Math.Max(0, Math.Min(127, note.Midi));
                on.IsNoteOn = true;
                on.Velocity = Math.Max(1, Math.Min(127, note.Velocity));
                on.Hand = note.Hand;
                events.Add(on);

                RecordedMidiEvent off = new RecordedMidiEvent();
                off.TimeMs = Math.Max(on.TimeMs + 80, note.EndMs);
                off.Midi = on.Midi;
                off.IsNoteOn = false;
                off.Velocity = 0;
                off.Hand = note.Hand;
                events.Add(off);
            }

            return NormalizeRecordedEventsForPlayback(events);
        }

        private List<AiMidiNoteSegment> BuildAiMidiNoteSegments(List<RecordedMidiEvent> events)
        {
            List<AiMidiNoteSegment> notes = new List<AiMidiNoteSegment>();
            Dictionary<int, RecordedMidiEvent> active = new Dictionary<int, RecordedMidiEvent>();

            foreach (RecordedMidiEvent ev in events.OrderBy(x => x.TimeMs).ThenBy(x => x.IsNoteOn ? 1 : 0))
            {
                if (ev.IsNoteOn && ev.Velocity > 0)
                {
                    if (active.ContainsKey(ev.Midi))
                    {
                        RecordedMidiEvent old = active[ev.Midi];
                        int end = Math.Max(old.TimeMs + 50, ev.TimeMs);
                        notes.Add(new AiMidiNoteSegment(old.TimeMs, end, old.Midi, old.Velocity, old.Hand));
                        active[ev.Midi] = ev;
                    }
                    else
                    {
                        active.Add(ev.Midi, ev);
                    }
                }
                else
                {
                    if (active.ContainsKey(ev.Midi))
                    {
                        RecordedMidiEvent start = active[ev.Midi];
                        int end = Math.Max(start.TimeMs + 50, ev.TimeMs);
                        notes.Add(new AiMidiNoteSegment(start.TimeMs, end, start.Midi, start.Velocity, start.Hand));
                        active.Remove(ev.Midi);
                    }
                }
            }

            foreach (RecordedMidiEvent start in active.Values)
            {
                notes.Add(new AiMidiNoteSegment(start.TimeMs, start.TimeMs + 250, start.Midi, start.Velocity, start.Hand));
            }

            return notes;
        }

        private List<AiMidiNoteSegment> LimitAiMidiDensity(List<AiMidiNoteSegment> notes, int gridMs, int maxNotesPerSlice, bool preferMelody)
        {
            if (gridMs <= 0)
            {
                gridMs = 50;
            }

            List<AiMidiNoteSegment> result = new List<AiMidiNoteSegment>();

            foreach (var group in notes.GroupBy(n => n.StartMs / gridMs).OrderBy(g => g.Key))
            {
                IEnumerable<AiMidiNoteSegment> ordered;

                if (preferMelody)
                {
                    ordered = group
                        .OrderByDescending(n => n.Midi)
                        .ThenByDescending(n => n.Velocity)
                        .ThenByDescending(n => n.EndMs - n.StartMs);
                }
                else
                {
                    ordered = group
                        .OrderByDescending(n => n.Velocity)
                        .ThenByDescending(n => n.EndMs - n.StartMs)
                        .ThenBy(n => Math.Abs(n.Midi - 60));
                }

                result.AddRange(ordered.Take(maxNotesPerSlice));
            }

            return result
                .OrderBy(n => n.StartMs)
                .ThenBy(n => n.Midi)
                .ToList();
        }

        private int QuantizeTime(int timeMs, int gridMs)
        {
            if (gridMs <= 0)
            {
                return Math.Max(0, timeMs);
            }

            return Math.Max(0, (int)Math.Round(timeMs / (double)gridMs) * gridMs);
        }

        #region 視覺方塊資料

        private List<VisualRollNote> BuildVisualNotes(Song song)
        {
            List<VisualRollNote> notes = new List<VisualRollNote>();

            if (song.RecordedEvents != null && song.RecordedEvents.Count > 0)
            {
                notes.AddRange(BuildVisualNotesFromRecorded(song.RecordedEvents));
                return notes;
            }

            int currentMs = 0;

            foreach (SongEvent ev in song.Events)
            {
                int duration = ev.DurationMs;
                int hold = ev.HoldMs;

                foreach (int note in ev.Notes)
                {
                    VisualRollNote vn = new VisualRollNote();
                    vn.Midi = note;
                    vn.StartMs = currentMs;
                    vn.DurationMs = Math.Max(100, hold);
                    vn.Color = GetHandColor(note);
                    notes.Add(vn);
                }

                currentMs += duration;
            }

            return notes;
        }

        private List<VisualRollNote> BuildVisualNotesFromRecorded(List<RecordedMidiEvent> events)
        {
            List<VisualRollNote> notes = new List<VisualRollNote>();
            Dictionary<int, RecordedMidiEvent> active = new Dictionary<int, RecordedMidiEvent>();

            List<RecordedMidiEvent> ordered = PrepareRecordedEventsForPlaybackFeel(events);

            foreach (RecordedMidiEvent ev in ordered)
            {
                if (ev.IsNoteOn)
                {
                    active[ev.Midi] = ev;
                }
                else
                {
                    if (active.ContainsKey(ev.Midi))
                    {
                        RecordedMidiEvent start = active[ev.Midi];
                        active.Remove(ev.Midi);

                        VisualRollNote vn = new VisualRollNote();
                        vn.Midi = ev.Midi;
                        vn.StartMs = start.TimeMs;
                        vn.DurationMs = Math.Max(70, ev.TimeMs - start.TimeMs);
                        vn.Color = GetHandColor(start);
                        notes.Add(vn);
                    }
                }
            }

            return notes;
        }

        #endregion

        private Color GetHandColor(RecordedMidiEvent ev)
        {
            if (ev.Hand == 0)
            {
                return Color.FromArgb(60, 130, 255);
            }

            if (ev.Hand == 1)
            {
                return Color.FromArgb(140, 220, 80);
            }

            return GetHandColor(ev.Midi);
        }

        private Color GetHandColor(int midi)
        {
            if (midi < 60)
            {
                return Color.FromArgb(60, 130, 255); // 左手：藍色
            }

            return Color.FromArgb(140, 220, 80); // 右手：綠色
        }

        #region 音名工具

        private SongEvent E(int durationMs, params string[] noteNames)
        {
            int[] notes = noteNames.Select(n => N(n)).ToArray();
            int hold = Math.Max(90, (int)(durationMs * 0.86));
            return new SongEvent(notes, durationMs, hold);
        }

        private int N(string noteText)
        {
            string note = noteText.Trim().ToUpper();
            int octave = int.Parse(note.Substring(note.Length - 1, 1));
            string pitch = note.Substring(0, note.Length - 1);

            int semitone = 0;
            switch (pitch)
            {
                case "C": semitone = 0; break;
                case "C#":
                case "DB": semitone = 1; break;
                case "D": semitone = 2; break;
                case "D#":
                case "EB": semitone = 3; break;
                case "E": semitone = 4; break;
                case "F": semitone = 5; break;
                case "F#":
                case "GB": semitone = 6; break;
                case "G": semitone = 7; break;
                case "G#":
                case "AB": semitone = 8; break;
                case "A": semitone = 9; break;
                case "A#":
                case "BB": semitone = 10; break;
                case "B": semitone = 11; break;
                default: throw new Exception("無法辨識音名：" + noteText);
            }

            return (octave + 1) * 12 + semitone;
        }

        private string NoteName(int midi)
        {
            string[] names = { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" };
            int note = midi % 12;
            int octave = midi / 12 - 1;
            return names[note] + octave;
        }

        #endregion

        #region 關閉處理

        private void Form1_Deactivate(object sender, EventArgs e)
        {
            pressedComputerKeys.Clear();
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            isClosingForm = true;

            try
            {
                StopAutoPlay();
            }
            catch
            {
            }

            try
            {
                if (playbackProgressTimer != null)
                {
                    playbackProgressTimer.Stop();
                }
            }
            catch
            {
            }

            try
            {
                if (metronomeTimer != null)
                {
                    metronomeTimer.Stop();
                }
            }
            catch
            {
            }

            try
            {
                if (omrProgressDialog != null && !omrProgressDialog.IsDisposed)
                {
                    omrProgressDialog.Close();
                }

                if (aiProgressDialog != null && !aiProgressDialog.IsDisposed)
                {
                    aiProgressDialog.Close();
                }
            }
            catch
            {
            }

            try
            {
                if (pianoRoll != null)
                {
                    pianoRoll.DisposeResources();
                }
            }
            catch
            {
            }

            try
            {
                if (sheetPreviewForm != null && !sheetPreviewForm.IsDisposed)
                {
                    sheetPreviewForm.Close();
                }
            }
            catch
            {
            }

            try
            {
                ClearSheetImages(false);
            }
            catch
            {
            }

            try
            {
                StopAllNotes(false);
            }
            catch
            {
            }

            try
            {
                if (midiReady)
                {
                    midiOutClose(midiOut);
                    midiReady = false;
                }
            }
            catch
            {
            }
        }

        #endregion

        #region 內部資料類別

        private class InstrumentItem
        {
            public string Name { get; set; }
            public int Program { get; set; }

            public InstrumentItem(string name, int program)
            {
                Name = name;
                Program = program;
            }

            public override string ToString()
            {
                return Name;
            }
        }

        private class MidiWriteEvent
        {
            public long Tick { get; set; }
            public int Midi { get; set; }
            public int Velocity { get; set; }
            public bool IsNoteOn { get; set; }
        }

        private class Song
        {
            public string Name { get; set; }
            public string Category { get; set; }
            public string Description { get; set; }
            public List<SongEvent> Events { get; set; }
            public List<RecordedMidiEvent> RecordedEvents { get; set; }
            public bool IsDemoApproximation { get; set; }
            public double TempoBpm { get; set; }
            public string TempoSource { get; set; }

            public Song(string name, string category, string description, bool isDemoApproximation)
            {
                Name = name;
                Category = category;
                Description = description;
                IsDemoApproximation = isDemoApproximation;
                Events = new List<SongEvent>();
                RecordedEvents = new List<RecordedMidiEvent>();
                TempoBpm = 0.0;
                TempoSource = "";
            }

            public override string ToString()
            {
                return Category + "｜" + Name;
            }
        }

        private class SongEvent
        {
            public int[] Notes { get; set; }
            public int DurationMs { get; set; }
            public int HoldMs { get; set; }

            public SongEvent(int[] notes, int durationMs, int holdMs)
            {
                Notes = notes;
                DurationMs = durationMs;
                HoldMs = holdMs;
            }
        }

        private class RecordedMidiEvent
        {
            public int TimeMs { get; set; }
            public int Midi { get; set; }
            public bool IsNoteOn { get; set; }
            public int Velocity { get; set; }
            public int Hand { get; set; } // 0=左手，1=右手，-1=自動判斷
        }

        private class ActiveTieState
        {
            public int Midi { get; set; }
            public int Hand { get; set; }
            public double LastEndMs { get; set; }

            public ActiveTieState(int midi, int hand, double lastEndMs)
            {
                Midi = midi;
                Hand = hand;
                LastEndMs = lastEndMs;
            }
        }

        private class ToolRunResult
        {
            public int ExitCode { get; set; }
            public string Output { get; set; }
            public string Error { get; set; }

            public string CombinedText
            {
                get
                {
                    string output = Output ?? "";
                    string error = Error ?? "";

                    if (string.IsNullOrWhiteSpace(error))
                    {
                        return output;
                    }

                    if (string.IsNullOrWhiteSpace(output))
                    {
                        return error;
                    }

                    return output + Environment.NewLine + error;
                }
            }
        }

        private class AiStageResult
        {
            public bool Ok { get; set; }
            public string OutputPath { get; set; }
            public string ErrorMessage { get; set; }

            public static AiStageResult Success(string outputPath, string message)
            {
                AiStageResult r = new AiStageResult();
                r.Ok = true;
                r.OutputPath = outputPath;
                r.ErrorMessage = message;
                return r;
            }

            public static AiStageResult Fail(string errorMessage)
            {
                AiStageResult r = new AiStageResult();
                r.Ok = false;
                r.OutputPath = "";
                r.ErrorMessage = errorMessage;
                return r;
            }
        }

        private class AiMidiNoteSegment
        {
            public int StartMs { get; set; }
            public int EndMs { get; set; }
            public int Midi { get; set; }
            public int Velocity { get; set; }
            public int Hand { get; set; }

            public AiMidiNoteSegment(int startMs, int endMs, int midi, int velocity, int hand)
            {
                StartMs = startMs;
                EndMs = endMs;
                Midi = midi;
                Velocity = velocity;
                Hand = hand;
            }
        }

        #endregion
    }

    internal class OmrProgressDialog : Form
    {
        private Label lblTitle;
        private Label lblStatus;
        private Label lblPercent;
        private Panel progressBack;
        private Panel progressFill;
        private System.Windows.Forms.Timer animationTimer;

        private double displayedPercent = 0.0;
        private double targetPercent = 0.0;
        private double softLimitPercent = 98.0;
        private DateTime lastTargetUpdate = DateTime.Now;
        private bool isCompleted = false;

        public OmrProgressDialog()
        {
            Text = "OMR 辨識進度";
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(640, 230);
            BackColor = Color.White;
            Font = new Font("Microsoft JhengHei UI", 10F, FontStyle.Regular);

            lblTitle = new Label();
            lblTitle.Text = "正在辨識琴譜";
            lblTitle.Font = new Font("Microsoft JhengHei UI", 15F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(25, 25, 25);
            lblTitle.AutoSize = false;
            lblTitle.Location = new Point(24, 20);
            lblTitle.Size = new Size(580, 34);
            Controls.Add(lblTitle);

            lblStatus = new Label();
            lblStatus.Text = "準備中...";
            lblStatus.AutoSize = false;
            lblStatus.Location = new Point(26, 62);
            lblStatus.Size = new Size(588, 64);
            lblStatus.ForeColor = Color.FromArgb(55, 55, 55);
            Controls.Add(lblStatus);

            progressBack = new Panel();
            progressBack.Location = new Point(26, 132);
            progressBack.Size = new Size(588, 20);
            progressBack.BackColor = Color.FromArgb(225, 225, 225);
            progressBack.BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(progressBack);

            progressFill = new Panel();
            progressFill.Location = new Point(0, 0);
            progressFill.Size = new Size(0, progressBack.Height);
            progressFill.BackColor = Color.FromArgb(65, 175, 75);
            progressBack.Controls.Add(progressFill);

            lblPercent = new Label();
            lblPercent.Text = "0%";
            lblPercent.AutoSize = false;
            lblPercent.Location = new Point(26, 160);
            lblPercent.Size = new Size(588, 26);
            lblPercent.TextAlign = ContentAlignment.MiddleRight;
            lblPercent.ForeColor = Color.FromArgb(65, 65, 65);
            Controls.Add(lblPercent);

            animationTimer = new System.Windows.Forms.Timer();
            animationTimer.Interval = 30;
            animationTimer.Tick += AnimationTimer_Tick;
            animationTimer.Start();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (animationTimer != null)
                {
                    animationTimer.Stop();
                    animationTimer.Dispose();
                    animationTimer = null;
                }
            }

            base.Dispose(disposing);
        }

        public void SetTitleText(string title)
        {
            if (InvokeRequired)
            {
                try
                {
                    BeginInvoke(new Action<string>(SetTitleText), title);
                }
                catch
                {
                }

                return;
            }

            if (!string.IsNullOrWhiteSpace(title))
            {
                Text = title;
                lblTitle.Text = title;
            }
        }

        public void SetProgress(int current, int total, string status)
        {
            if (InvokeRequired)
            {
                try
                {
                    BeginInvoke(new Action<int, int, string>(SetProgress), current, total, status);
                }
                catch
                {
                }

                return;
            }

            total = Math.Max(1, total);
            current = Math.Max(0, Math.Min(current, total));

            if (!string.IsNullOrWhiteSpace(status))
            {
                lblStatus.Text = status;
                InferFineProgressFromStatus(status);
            }

            double percent = current * 100.0 / total;

            // current/total 是大範圍進度，例如第幾頁完成。
            // 不直接跳格，而是更新目標值，由 Timer 慢慢補上。
            if (percent >= 100.0)
            {
                isCompleted = true;
                SetTargetPercent(100.0);
            }
            else
            {
                isCompleted = false;
                SetTargetPercent(percent);
            }

            UpdatePercentText(current, total);
        }

        public void SetStatusText(string status)
        {
            if (InvokeRequired)
            {
                try
                {
                    BeginInvoke(new Action<string>(SetStatusText), status);
                }
                catch
                {
                }

                return;
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                lblStatus.Text = status;
                InferFineProgressFromStatus(status);
            }
        }

        private void SetTargetPercent(double value)
        {
            value = Math.Max(0.0, Math.Min(100.0, value));

            // 避免背景執行緒偶爾較舊的狀態把進度往回拉。
            if (value > targetPercent || value >= 100.0)
            {
                targetPercent = value;
                lastTargetUpdate = DateTime.Now;
            }
        }

        private void AnimationTimer_Tick(object sender, EventArgs e)
        {
            // 如果長時間沒有新狀態，讓目標值小幅慢慢前進到 softLimit，
            // 視覺上會像真的在跑，不會卡死在某一格；但不會自動衝到 100%。
            if (!isCompleted && (DateTime.Now - lastTargetUpdate).TotalSeconds > 1.2 && targetPercent < softLimitPercent)
            {
                targetPercent = Math.Min(softLimitPercent, targetPercent + 0.08);
            }

            double diff = targetPercent - displayedPercent;

            if (Math.Abs(diff) < 0.05)
            {
                displayedPercent = targetPercent;
            }
            else
            {
                // 越遠補越快，越接近越慢，視覺上比較平滑。
                displayedPercent += Math.Max(0.08, Math.Abs(diff) * 0.10) * Math.Sign(diff);
            }

            DrawDisplayedProgress();
        }

        private void DrawDisplayedProgress()
        {
            displayedPercent = Math.Max(0.0, Math.Min(100.0, displayedPercent));

            int fillWidth = (int)Math.Round((progressBack.ClientSize.Width - 2) * displayedPercent / 100.0);
            progressFill.Width = Math.Max(0, Math.Min(progressBack.ClientSize.Width, fillWidth));
            progressFill.Height = progressBack.ClientSize.Height;

            int shownPercent = (int)Math.Round(displayedPercent);
            lblPercent.Text = shownPercent + "%";

            progressFill.Invalidate();
            progressBack.Invalidate();
        }

        private void UpdatePercentText(int current, int total)
        {
            int shownPercent = (int)Math.Round(displayedPercent);
            lblPercent.Text = shownPercent + "%  （" + current + " / " + total + "）";
        }

        private void InferFineProgressFromStatus(string status)
        {
            int page;
            int total;
            if (!TryParsePageProgress(status, out page, out total))
            {
                if (status.Contains("合併辨識結果") || status.Contains("產生落下方塊"))
                {
                    softLimitPercent = 99.0;
                    SetTargetPercent(Math.Max(targetPercent, 96.0));
                }

                // V39：不要看到「完成」兩個字就直接跳 100%。
                // 像「片段 1 / 6 完成」或「截圖第 1 / 15 頁完成」都不是整體完成。
                if (status.Contains("OMR 完成") || status.Contains("已成功合併"))
                {
                    SetTargetPercent(Math.Max(targetPercent, 100.0));
                }

                return;
            }

            total = Math.Max(1, total);
            page = Math.Max(1, Math.Min(page, total));

            double pageStart = (page - 1) * 100.0 / total;
            double pageSize = 100.0 / total;
            double phase = GetPhaseFromStatus(status);
            double inferred = pageStart + pageSize * phase;

            softLimitPercent = Math.Min(99.0, pageStart + pageSize * 0.97);
            SetTargetPercent(inferred);
        }

        private double GetPhaseFromStatus(string status)
        {
            if (status.Contains("讀取快取完成"))
            {
                return 0.98;
            }

            if (status.Contains("開始處理") || status.Contains("開始整頁") || status.Contains("開始辨識"))
            {
                return 0.03;
            }

            if (status.Contains("整頁裁白邊") || status.Contains("裁白邊、放大") || status.Contains("黑白化"))
            {
                return 0.10;
            }

            if (status.Contains("整頁 Audiveris") || status.Contains("整頁辨識中") || status.Contains("直接交給 Audiveris"))
            {
                return 0.22;
            }

            if (status.Contains("拆行補強") || status.Contains("自動拆行"))
            {
                return 0.34;
            }

            if (status.Contains("Poppler 轉"))
            {
                return 0.12;
            }

            if (status.Contains("影像清晰化") || status.Contains("裁白邊"))
            {
                return 0.22;
            }

            if (status.Contains("已偵測") || status.Contains("偵測到"))
            {
                return 0.36;
            }

            int segment;
            int segmentTotal;
            if (TryParseSegmentProgress(status, out segment, out segmentTotal))
            {
                segmentTotal = Math.Max(1, segmentTotal);
                segment = Math.Max(1, Math.Min(segment, segmentTotal));

                double segmentStart = 0.38;
                double segmentSpan = 0.46;
                double stepInside = 0.0;

                if (status.Contains("影像清晰化"))
                {
                    stepInside = 0.25;
                }
                else if (status.Contains("Audiveris 辨識中"))
                {
                    stepInside = 0.65;
                }
                else if (status.Contains("完成"))
                {
                    stepInside = 1.0;
                }
                else
                {
                    stepInside = 0.45;
                }

                return segmentStart + segmentSpan * ((segment - 1 + stepInside) / segmentTotal);
            }

            if (status.Contains("整頁交叉檢查同步"))
            {
                return 0.35;
            }

            if (status.Contains("等待整頁交叉檢查"))
            {
                return 0.88;
            }

            if (status.Contains("整頁結果音符較多") || status.Contains("準備下一頁") || status.Contains("頁完成"))
            {
                return 0.98;
            }

            if (status.Contains("失敗"))
            {
                return 0.96;
            }

            return 0.45;
        }

        private bool TryParsePageProgress(string status, out int page, out int total)
        {
            page = 0;
            total = 0;

            string[] markers = new string[] { "PDF 第 ", "圖片第 ", "截圖第 " };
            int idx = -1;
            string marker = "";

            foreach (string m in markers)
            {
                idx = status.IndexOf(m);
                if (idx >= 0)
                {
                    marker = m;
                    break;
                }
            }

            if (idx < 0)
            {
                return false;
            }

            idx += marker.Length;
            int slash = status.IndexOf("/", idx);
            int pageWord = status.IndexOf("頁", slash >= 0 ? slash : idx);

            if (slash < 0 || pageWord < 0)
            {
                return false;
            }

            string pageText = status.Substring(idx, slash - idx).Trim();
            string totalText = status.Substring(slash + 1, pageWord - slash - 1).Trim();

            return int.TryParse(pageText, out page) && int.TryParse(totalText, out total);
        }

        private bool TryParseSegmentProgress(string status, out int segment, out int total)
        {
            segment = 0;
            total = 0;

            string marker = "片段 ";
            int idx = status.IndexOf(marker);
            if (idx < 0)
            {
                return false;
            }

            idx += marker.Length;
            int slash = status.IndexOf("/", idx);
            if (slash < 0)
            {
                return false;
            }

            int end = slash + 1;
            while (end < status.Length && char.IsWhiteSpace(status[end]))
            {
                end++;
            }

            int totalStart = end;
            while (end < status.Length && char.IsDigit(status[end]))
            {
                end++;
            }

            string segmentText = status.Substring(idx, slash - idx).Trim();
            string totalText = status.Substring(totalStart, end - totalStart).Trim();

            return int.TryParse(segmentText, out segment) && int.TryParse(totalText, out total);
        }
    }

    public class PianoKeyboardControl : Control
    {
        private class PianoKeyInfo
        {
            public int Midi { get; set; }
            public bool IsBlack { get; set; }
            public Rectangle Rect { get; set; }
            public string Label { get; set; }
            public bool Pressed { get; set; }
        }

        private readonly List<PianoKeyInfo> whiteKeys = new List<PianoKeyInfo>();
        private readonly List<PianoKeyInfo> blackKeys = new List<PianoKeyInfo>();
        private readonly Dictionary<int, PianoKeyInfo> allKeys = new Dictionary<int, PianoKeyInfo>();
        private int? currentMouseNote = null;

        public event Action<int> NotePressed;
        public event Action<int> NoteReleased;

        public int StartMidi { get; set; } = 21;
        public int EndMidi { get; set; } = 108;
        public int WhiteKeyWidth { get; set; } = 42;
        public int WhiteKeyHeight { get; set; } = 330;
        public int BlackKeyWidth { get; set; } = 27;
        public int BlackKeyHeight { get; set; } = 205;
        public int SideMargin { get; set; } = 22;
        public int TopMargin { get; set; } = 80;

        public Dictionary<int, string> DisplayLabels { get; private set; } = new Dictionary<int, string>();

        public PianoKeyboardControl()
        {
            DoubleBuffered = true;
            BackColor = Color.FromArgb(45, 45, 45);
            TabStop = false;

            // V58：避免點擊鋼琴鍵時，WinForms AutoScroll 因為控制項取得焦點，
            // 自動把水平捲軸拉回最左側。鍵盤只負責滑鼠彈奏，不需要取得焦點。
            SetStyle(ControlStyles.Selectable, false);
            SetStyle(ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.ResizeRedraw, true);
        }

        public void BuildKeyboard(Dictionary<int, string> displayLabels)
        {
            DisplayLabels = displayLabels ?? new Dictionary<int, string>();
            whiteKeys.Clear();
            blackKeys.Clear();
            allKeys.Clear();

            int whiteIndex = 0;

            for (int midi = StartMidi; midi <= EndMidi; midi++)
            {
                if (!IsBlackKey(midi))
                {
                    int x = SideMargin + whiteIndex * WhiteKeyWidth;
                    Rectangle rect = new Rectangle(x, TopMargin, WhiteKeyWidth, WhiteKeyHeight);

                    PianoKeyInfo key = new PianoKeyInfo();
                    key.Midi = midi;
                    key.IsBlack = false;
                    key.Rect = rect;
                    key.Label = GetLabel(midi);
                    key.Pressed = false;

                    whiteKeys.Add(key);
                    allKeys[midi] = key;
                    whiteIndex++;
                }
            }

            whiteIndex = 0;

            for (int midi = StartMidi; midi <= EndMidi; midi++)
            {
                if (IsBlackKey(midi))
                {
                    int x = SideMargin + whiteIndex * WhiteKeyWidth - BlackKeyWidth / 2;
                    Rectangle rect = new Rectangle(x, TopMargin, BlackKeyWidth, BlackKeyHeight);

                    PianoKeyInfo key = new PianoKeyInfo();
                    key.Midi = midi;
                    key.IsBlack = true;
                    key.Rect = rect;
                    key.Label = GetLabel(midi);
                    key.Pressed = false;

                    blackKeys.Add(key);
                    allKeys[midi] = key;
                }
                else
                {
                    whiteIndex++;
                }
            }

            int totalWidth = SideMargin * 2 + whiteKeys.Count * WhiteKeyWidth + 4;
            int totalHeight = TopMargin + WhiteKeyHeight + 70;
            Size = new Size(totalWidth, totalHeight);
            Invalidate();
        }

        public void SetPressed(int midi, bool pressed)
        {
            if (!allKeys.ContainsKey(midi))
            {
                return;
            }

            allKeys[midi].Pressed = pressed;
            Invalidate(allKeys[midi].Rect);
        }

        public Rectangle GetKeyRect(int midi)
        {
            if (!allKeys.ContainsKey(midi))
            {
                return Rectangle.Empty;
            }

            return allKeys[midi].Rect;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.FromArgb(40, 40, 40));

            DrawPianoBody(g);
            DrawWhiteKeys(g);
            DrawBlackKeys(g);
            DrawBottomCaption(g);
        }

        private void DrawPianoBody(Graphics g)
        {
            Rectangle bodyRect = new Rectangle(4, 6, Width - 8, Height - 12);
            using (LinearGradientBrush bodyBrush = new LinearGradientBrush(bodyRect, Color.FromArgb(18, 18, 18), Color.FromArgb(65, 65, 65), 90f))
            {
                g.FillRectangle(bodyBrush, bodyRect);
            }

            using (Pen bodyPen = new Pen(Color.FromArgb(95, 95, 95), 2))
            {
                g.DrawRectangle(bodyPen, bodyRect);
            }

            Rectangle namePlate = new Rectangle(SideMargin, 22, 520, 40);
            using (LinearGradientBrush plateBrush = new LinearGradientBrush(namePlate, Color.FromArgb(95, 25, 20), Color.FromArgb(55, 10, 10), 90f))
            {
                g.FillRectangle(plateBrush, namePlate);
            }

            using (Pen goldPen = new Pen(Color.FromArgb(200, 160, 70), 2))
            {
                g.DrawRectangle(goldPen, namePlate);
            }

            using (Font titleFont = new Font("Georgia", 18F, FontStyle.Bold))
            using (SolidBrush goldBrush = new SolidBrush(Color.FromArgb(230, 190, 90)))
            {
                g.DrawString("GRAND PIANO", titleFont, goldBrush, new PointF(SideMargin + 18, 27));
            }

            Rectangle redFelt = new Rectangle(SideMargin, TopMargin - 8, whiteKeys.Count * WhiteKeyWidth, 8);
            using (LinearGradientBrush feltBrush = new LinearGradientBrush(redFelt, Color.FromArgb(160, 15, 15), Color.FromArgb(80, 0, 0), 90f))
            {
                g.FillRectangle(feltBrush, redFelt);
            }
        }

        private void DrawWhiteKeys(Graphics g)
        {
            foreach (PianoKeyInfo key in whiteKeys)
            {
                Rectangle r = key.Rect;
                bool pressed = key.Pressed;

                Color topColor = pressed ? Color.FromArgb(205, 230, 255) : Color.FromArgb(255, 254, 238);
                Color midColor = pressed ? Color.FromArgb(170, 205, 245) : Color.FromArgb(248, 246, 224);
                Color bottomColor = pressed ? Color.FromArgb(135, 178, 220) : Color.FromArgb(220, 216, 190);

                using (LinearGradientBrush br = new LinearGradientBrush(r, topColor, bottomColor, 90f))
                {
                    ColorBlend blend = new ColorBlend();
                    blend.Positions = new float[] { 0f, 0.55f, 1f };
                    blend.Colors = new Color[] { topColor, midColor, bottomColor };
                    br.InterpolationColors = blend;
                    g.FillRectangle(br, r);
                }

                // 左側亮邊，讓白鍵彼此有分離感
                using (SolidBrush leftLight = new SolidBrush(Color.FromArgb(120, 255, 255, 255)))
                {
                    g.FillRectangle(leftLight, new Rectangle(r.X + 1, r.Y + 2, 2, r.Height - 8));
                }

                // 右側陰影，模擬白鍵縫隙
                using (LinearGradientBrush sideShadow = new LinearGradientBrush(
                    new Rectangle(r.Right - 6, r.Y + 2, 6, r.Height - 6),
                    Color.FromArgb(15, 0, 0, 0),
                    Color.FromArgb(95, 0, 0, 0),
                    0f))
                {
                    g.FillRectangle(sideShadow, new Rectangle(r.Right - 6, r.Y + 2, 6, r.Height - 6));
                }

                // 白鍵底部暗部，看起來比較像實體鍵盤
                using (LinearGradientBrush bottomShadow = new LinearGradientBrush(
                    new Rectangle(r.X + 2, r.Bottom - 34, r.Width - 4, 32),
                    Color.FromArgb(0, 0, 0, 0),
                    Color.FromArgb(85, 0, 0, 0),
                    90f))
                {
                    g.FillRectangle(bottomShadow, new Rectangle(r.X + 2, r.Bottom - 34, r.Width - 4, 32));
                }

                // 按下時再加一層藍色光暈
                if (pressed)
                {
                    using (SolidBrush pressGlow = new SolidBrush(Color.FromArgb(85, 70, 150, 255)))
                    {
                        g.FillRectangle(pressGlow, new Rectangle(r.X + 3, r.Y + 3, r.Width - 6, r.Height - 10));
                    }
                }

                using (Pen border = new Pen(Color.FromArgb(135, 130, 115)))
                {
                    g.DrawRectangle(border, r);
                }

                using (Pen deepLine = new Pen(Color.FromArgb(85, 70, 70, 70)))
                {
                    g.DrawLine(deepLine, r.Right - 1, r.Y + 1, r.Right - 1, r.Bottom - 1);
                }

                if (!string.IsNullOrWhiteSpace(key.Label))
                {
                    DrawKeyLabel(g, key, false);
                }
            }
        }

        private void DrawBlackKeys(Graphics g)
        {
            foreach (PianoKeyInfo key in blackKeys)
            {
                Rectangle r = key.Rect;
                bool pressed = key.Pressed;

                // 黑鍵投影，讓它浮在白鍵上方
                Rectangle shadowRect = new Rectangle(r.X + 5, r.Y + 6, r.Width, r.Height + 2);
                using (SolidBrush shadow = new SolidBrush(Color.FromArgb(105, 0, 0, 0)))
                {
                    g.FillRectangle(shadow, shadowRect);
                }

                Rectangle bodyRect = new Rectangle(r.X, r.Y, r.Width, r.Height - 18);
                Rectangle lipRect = new Rectangle(r.X + 2, r.Bottom - 28, r.Width - 4, 24);

                Color topColor = pressed ? Color.FromArgb(75, 95, 120) : Color.FromArgb(78, 78, 78);
                Color centerColor = pressed ? Color.FromArgb(36, 55, 75) : Color.FromArgb(28, 28, 28);
                Color bottomColor = pressed ? Color.FromArgb(10, 22, 34) : Color.FromArgb(3, 3, 3);

                using (LinearGradientBrush br = new LinearGradientBrush(bodyRect, topColor, bottomColor, 90f))
                {
                    ColorBlend blend = new ColorBlend();
                    blend.Positions = new float[] { 0f, 0.35f, 1f };
                    blend.Colors = new Color[] { topColor, centerColor, bottomColor };
                    br.InterpolationColors = blend;
                    g.FillRectangle(br, bodyRect);
                }

                // 中央亮面，黑鍵看起來像有弧度
                Rectangle shine = new Rectangle(r.X + 5, r.Y + 10, Math.Max(3, r.Width / 4), r.Height - 46);
                using (LinearGradientBrush shineBrush = new LinearGradientBrush(
                    shine,
                    Color.FromArgb(75, 255, 255, 255),
                    Color.FromArgb(0, 255, 255, 255),
                    0f))
                {
                    g.FillRectangle(shineBrush, shine);
                }

                // 右側深陰影，強化黑鍵立體感
                using (LinearGradientBrush sideDark = new LinearGradientBrush(
                    new Rectangle(r.Right - 7, r.Y + 4, 7, r.Height - 30),
                    Color.FromArgb(0, 0, 0, 0),
                    Color.FromArgb(130, 0, 0, 0),
                    0f))
                {
                    g.FillRectangle(sideDark, new Rectangle(r.Right - 7, r.Y + 4, 7, r.Height - 30));
                }

                // 黑鍵底部突出的小台階
                using (LinearGradientBrush lipBrush = new LinearGradientBrush(
                    lipRect,
                    pressed ? Color.FromArgb(40, 65, 90) : Color.FromArgb(38, 38, 38),
                    Color.FromArgb(5, 5, 5),
                    90f))
                {
                    g.FillRectangle(lipBrush, lipRect);
                }

                using (Pen border = new Pen(Color.FromArgb(5, 5, 5)))
                {
                    g.DrawRectangle(border, bodyRect);
                    g.DrawRectangle(border, lipRect);
                }

                if (pressed)
                {
                    using (SolidBrush pressOverlay = new SolidBrush(Color.FromArgb(75, 70, 150, 255)))
                    {
                        g.FillRectangle(pressOverlay, new Rectangle(r.X + 2, r.Y + 2, r.Width - 4, r.Height - 8));
                    }
                }

                if (!string.IsNullOrWhiteSpace(key.Label))
                {
                    DrawKeyLabel(g, key, true);
                }
            }
        }

        private void DrawKeyLabel(Graphics g, PianoKeyInfo key, bool black)
        {
            Rectangle r = key.Rect;
            StringFormat sf = new StringFormat();
            sf.Alignment = StringAlignment.Center;
            sf.LineAlignment = StringAlignment.Far;

            Rectangle textRect = new Rectangle(r.X + 1, r.Y + 4, r.Width - 2, r.Height - 12);
            Font font = black ? new Font("Microsoft JhengHei UI", 7.2F, FontStyle.Bold) : new Font("Microsoft JhengHei UI", 8.5F, FontStyle.Bold);

            using (font)
            using (SolidBrush brText = new SolidBrush(black ? Color.White : Color.FromArgb(35, 35, 35)))
            {
                g.DrawString(key.Label, font, brText, textRect, sf);
            }
        }

        private void DrawBottomCaption(Graphics g)
        {
            int y = TopMargin + WhiteKeyHeight + 24;
            Rectangle area = new Rectangle(SideMargin, y, 430, 32);

            using (SolidBrush br = new SolidBrush(Color.FromArgb(25, 25, 25)))
            {
                g.FillRectangle(br, area);
            }

            using (Pen p = new Pen(Color.FromArgb(110, 110, 110)))
            {
                g.DrawRectangle(p, area);
            }

            using (Font f = new Font("Microsoft JhengHei UI", 9F, FontStyle.Regular))
            using (SolidBrush brText = new SolidBrush(Color.Gainsboro))
            {
                g.DrawString("真實 88 鍵鋼琴配置 A0 - C8 ｜ 可滑鼠拖曳連續彈奏", f, brText, new PointF(SideMargin + 10, y + 8));
            }
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);

            // V58：不要 Focus()。在 100% / 125% / 150% / 200% 視圖下，
            // 點擊鍵盤若取得焦點，父層 AutoScroll 會嘗試把整個鍵盤控制項帶回可視範圍，
            // 結果水平位置會跳回最左側。
            if (e.Button != MouseButtons.Left)
            {
                return;
            }

            int? hit = HitTest(e.Location);
            if (hit.HasValue)
            {
                currentMouseNote = hit.Value;
                if (NotePressed != null)
                {
                    NotePressed(hit.Value);
                }
            }
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);

            if (e.Button != MouseButtons.Left)
            {
                return;
            }

            int? hit = HitTest(e.Location);
            if (hit == currentMouseNote)
            {
                return;
            }

            if (currentMouseNote.HasValue && NoteReleased != null)
            {
                NoteReleased(currentMouseNote.Value);
            }

            currentMouseNote = hit;

            if (currentMouseNote.HasValue && NotePressed != null)
            {
                NotePressed(currentMouseNote.Value);
            }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            ReleaseCurrentMouseNote();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);

            if ((Control.MouseButtons & MouseButtons.Left) != MouseButtons.Left)
            {
                ReleaseCurrentMouseNote();
            }
        }

        private void ReleaseCurrentMouseNote()
        {
            if (currentMouseNote.HasValue)
            {
                if (NoteReleased != null)
                {
                    NoteReleased(currentMouseNote.Value);
                }

                currentMouseNote = null;
            }
        }

        private int? HitTest(Point p)
        {
            foreach (PianoKeyInfo key in blackKeys)
            {
                if (key.Rect.Contains(p))
                {
                    return key.Midi;
                }
            }

            foreach (PianoKeyInfo key in whiteKeys)
            {
                if (key.Rect.Contains(p))
                {
                    return key.Midi;
                }
            }

            return null;
        }

        private bool IsBlackKey(int midi)
        {
            int note = midi % 12;
            return note == 1 || note == 3 || note == 6 || note == 8 || note == 10;
        }

        private string GetLabel(int midi)
        {
            if (DisplayLabels.ContainsKey(midi))
            {
                return DisplayLabels[midi];
            }

            return string.Empty;
        }
    }

    public class PianoRollControl : Control
    {
        private List<VisualRollNote> notes = new List<VisualRollNote>();
        private Func<int, Rectangle> keyRectProvider;
        private System.Windows.Forms.Timer playTimer;
        private Stopwatch playWatch;
        private int currentTimeMs = 0;
        private int baseTimeMs = 0;
        private int leadInMs = 2000;
        private const float PixelsPerMs = 0.11f;

        public Func<int, Rectangle> KeyRectProvider
        {
            get { return keyRectProvider; }
            set { keyRectProvider = value; }
        }

        public PianoRollControl()
        {
            DoubleBuffered = true;
            BackColor = Color.FromArgb(30, 30, 30);
            SetStyle(ControlStyles.AllPaintingInWmPaint |
                     ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer |
                     ControlStyles.ResizeRedraw, true);

            playTimer = new System.Windows.Forms.Timer();
            playTimer.Interval = 25;
            playTimer.Tick += PlayTimer_Tick;
        }

        public void LoadNotes(List<VisualRollNote> incomingNotes)
        {
            notes = incomingNotes ?? new List<VisualRollNote>();
            currentTimeMs = 0;
            Invalidate();
        }

        public void ClearNotes()
        {
            notes.Clear();
            currentTimeMs = 0;
            Invalidate();
        }

        public int CurrentTimeMs
        {
            get { return currentTimeMs; }
        }

        public void SetCurrentTimeMs(int value)
        {
            currentTimeMs = value;
            Invalidate();
        }

        public void StartPlaybackWithLeadIn(int leadInMilliseconds)
        {
            // V18：保留方法名稱，避免其他程式碼呼叫失敗。
            // 實際時間由 Form1 的播放流程推進，不再由 PianoRoll 自己計時。
            leadInMs = Math.Max(0, leadInMilliseconds);
            SetCurrentTimeMs(-leadInMs);
        }

        public void StartPlayback()
        {
            StartPlaybackWithLeadIn(2000);
        }

        public void PausePlayback()
        {
            Invalidate();
        }

        public void ResumePlayback()
        {
            Invalidate();
        }

        public void StopPlayback()
        {
            currentTimeMs = 0;
            baseTimeMs = 0;

            if (playTimer != null)
            {
                playTimer.Stop();
            }

            if (playWatch != null)
            {
                playWatch.Stop();
            }

            Invalidate();
        }

        public void DisposeResources()
        {
            if (playTimer != null)
            {
                playTimer.Stop();
                playTimer.Dispose();
            }
        }

        private void PlayTimer_Tick(object sender, EventArgs e)
        {
            // V18：不在這裡推進時間，避免視覺速度與實際播放速度不同。
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.FromArgb(32, 32, 32));

            DrawBackground(g);
            DrawGrid(g);
            DrawNotes(g);
            DrawStrikeLine(g);
            DrawCaption(g);
        }

        private void DrawBackground(Graphics g)
        {
            Rectangle rect = new Rectangle(0, 0, Width, Height);
            using (LinearGradientBrush br = new LinearGradientBrush(rect, Color.FromArgb(38, 38, 38), Color.FromArgb(24, 24, 24), 90f))
            {
                g.FillRectangle(br, rect);
            }
        }

        private void DrawGrid(Graphics g)
        {
            if (keyRectProvider == null)
            {
                return;
            }

            using (Pen pen = new Pen(Color.FromArgb(55, 70, 70, 70), 1))
            {
                for (int midi = 21; midi <= 108; midi++)
                {
                    Rectangle r = keyRectProvider(midi);
                    if (!r.IsEmpty)
                    {
                        g.DrawLine(pen, r.X, 0, r.X, Height);
                    }
                }
            }

            using (Pen beatPen = new Pen(Color.FromArgb(55, 100, 100, 100), 1))
            {
                int strikeLine = Height - 18;
                for (int t = 0; t <= 60000; t += 500)
                {
                    float y = strikeLine - (t - currentTimeMs) * PixelsPerMs;
                    if (y >= 0 && y <= Height)
                    {
                        g.DrawLine(beatPen, 0, y, Width, y);
                    }
                }
            }
        }

        private void DrawNotes(Graphics g)
        {
            if (keyRectProvider == null || notes == null)
            {
                return;
            }

            int strikeLine = Height - 18;

            foreach (VisualRollNote note in notes)
            {
                Rectangle keyRect = keyRectProvider(note.Midi);
                if (keyRect.IsEmpty)
                {
                    continue;
                }

                int startMs = note.StartMs;
                int durationMs = note.DurationMs;
                Color color = note.Color;

                float h = Math.Max(10f, durationMs * PixelsPerMs);
                float y = strikeLine - h - ((startMs - currentTimeMs) * PixelsPerMs);

                if (y > Height || y + h < 0)
                {
                    continue;
                }

                // V19：紅線以下的方塊不再顯示。
                // 長音碰到紅線後，會隨著時間逐漸縮短，不會穿過紅線跑到琴鍵上。
                float visibleTop = y;
                float visibleBottom = Math.Min(y + h, strikeLine);

                if (visibleBottom <= visibleTop)
                {
                    continue;
                }

                float x = keyRect.X + 1;
                float w = Math.Max(6, keyRect.Width - 2);
                RectangleF rect = new RectangleF(x, visibleTop, w, visibleBottom - visibleTop);

                using (SolidBrush br = new SolidBrush(Color.FromArgb(205, color)))
                {
                    g.FillRoundedRectangle(br, rect, 5f);
                }

                using (Pen p = new Pen(Color.FromArgb(220, 255, 255, 255), 1))
                {
                    g.DrawRoundedRectangle(p, rect, 5f);
                }
            }
        }

        private void DrawStrikeLine(Graphics g)
        {
            int strikeLine = Height - 18;

            using (Pen pen = new Pen(Color.FromArgb(230, 180, 60, 60), 3))
            {
                g.DrawLine(pen, 0, strikeLine, Width, strikeLine);
            }
        }

        private void DrawCaption(Graphics g)
        {
            using (Font f = new Font("Microsoft JhengHei UI", 9F, FontStyle.Bold))
            using (SolidBrush br = new SolidBrush(Color.White))
            {
                g.DrawString("Piano Roll / 落下方塊模式（可搭配自動彈奏、錄音回放）", f, br, new PointF(10, 8));
            }
        }
    }


    internal class TempoChange
    {
        public long Tick { get; set; }
        public int MicrosecondsPerQuarter { get; set; }

        public TempoChange(long tick, int microsecondsPerQuarter)
        {
            Tick = tick;
            MicrosecondsPerQuarter = microsecondsPerQuarter;
        }
    }

    internal class RawMidiNoteEvent
    {
        public long Tick { get; set; }
        public int Midi { get; set; }
        public int Channel { get; set; }
        public bool IsNoteOn { get; set; }
        public int Velocity { get; set; }
    }

    public class VisualRollNote
    {
        public int Midi { get; set; }
        public int StartMs { get; set; }
        public int DurationMs { get; set; }
        public Color Color { get; set; }
    }

    internal static class GraphicsExtension
    {
        public static void FillRoundedRectangle(this Graphics g, Brush brush, RectangleF bounds, float radius)
        {
            using (GraphicsPath path = CreatePath(bounds, radius))
            {
                g.FillPath(brush, path);
            }
        }

        public static void DrawRoundedRectangle(this Graphics g, Pen pen, RectangleF bounds, float radius)
        {
            using (GraphicsPath path = CreatePath(bounds, radius))
            {
                g.DrawPath(pen, path);
            }
        }

        private static GraphicsPath CreatePath(RectangleF bounds, float radius)
        {
            float d = radius * 2f;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(bounds.X, bounds.Y, d, d, 180, 90);
            path.AddArc(bounds.Right - d, bounds.Y, d, d, 270, 90);
            path.AddArc(bounds.Right - d, bounds.Bottom - d, d, d, 0, 90);
            path.AddArc(bounds.X, bounds.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }
}
