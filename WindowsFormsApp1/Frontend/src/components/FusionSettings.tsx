import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Accessibility,
  AppWindow,
  Battery,
  Bell,
  Bluetooth,
  Check,
  ChevronRight,
  Clock,
  Cpu,
  Gamepad2,
  Globe2,
  HardDrive,
  Info,
  Languages,
  Lock,
  LogOut,
  Mail,
  KeyRound,
  Monitor,
  Moon,
  MousePointer2,
  Palette,
  Plane,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
  Sun,
  User,
  Volume2,
  Wifi,
  X,
  type LucideIcon
} from 'lucide-react';
import { WALLPAPERS, type FusionSettingsState } from '../hooks/useFusionSettings';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { useI18n } from '../i18n/I18nContext';
import { useAccount } from '../account/AccountContext';
import { LANG_LABELS, LANGS } from '../i18n/strings';

interface FusionSettingsProps {
  open: boolean;
  onClose: () => void;
  settings: FusionSettingsState;
  onChange: <K extends keyof FusionSettingsState>(key: K, value: FusionSettingsState[K]) => void;
}

type CatId =
  | 'system'
  | 'devices'
  | 'network'
  | 'personalize'
  | 'apps'
  | 'accounts'
  | 'time'
  | 'gaming'
  | 'accessibility'
  | 'privacy'
  | 'update';

const CATEGORIES: Array<{ id: CatId; label: string; icon: LucideIcon }> = [
  { id: 'system', label: '系統', icon: Cpu },
  { id: 'devices', label: '藍牙與裝置', icon: Bluetooth },
  { id: 'network', label: '網路與網際網路', icon: Wifi },
  { id: 'personalize', label: '個人化', icon: Palette },
  { id: 'apps', label: '應用程式', icon: AppWindow },
  { id: 'accounts', label: '帳戶', icon: User },
  { id: 'time', label: '時間與語言', icon: Languages },
  { id: 'gaming', label: '遊戲', icon: Gamepad2 },
  { id: 'accessibility', label: '協助工具', icon: Accessibility },
  { id: 'privacy', label: '隱私權與安全性', icon: Shield },
  { id: 'update', label: '系統更新', icon: RefreshCw }
];

const ACCENTS = ['#67e8ff', '#6aa8ff', '#9c7cff', '#d56bff', '#ff6a9e', '#55d7d0', '#7ef6c8', '#ffb45c'];

/* ---------- small reusable controls ---------- */

function Toggle({ on, onChange }: { on: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`set-switch ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="set-switch-knob" />
    </button>
  );
}

function Slider({
  value,
  onChange,
  min = 0,
  max = 100
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="set-slider-wrap">
      <input
        type="range"
        className="set-slider"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      <span className="set-slider-value">{value}</span>
    </div>
  );
}

function Picker({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="set-select-wrap">
      <select className="set-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight size={16} className="set-select-caret" />
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  desc,
  children,
  onClick,
  chevron
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}) {
  return (
    <div className={`set-row ${onClick ? 'is-clickable' : ''}`} onClick={onClick}>
      {Icon && (
        <span className="set-row-icon">
          <Icon size={19} strokeWidth={1.8} />
        </span>
      )}
      <div className="set-row-text">
        <strong>{title}</strong>
        {desc && <span>{desc}</span>}
      </div>
      <div className="set-row-control">
        {children}
        {chevron && <ChevronRight size={18} className="set-row-chevron" />}
      </div>
    </div>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="set-group">
      {title && <h3 className="set-group-title">{title}</h3>}
      <div className="set-card">{children}</div>
    </section>
  );
}

/* ---------- account section (editable profile + password, SQLite-backed) ---------- */

function AccountSection() {
  const { t } = useI18n();
  const { profile, updateProfile, changePassword, signOut } = useAccount();

  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [profileMsg, setProfileMsg] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Keep the form in sync if the profile is refreshed from the host.
  useEffect(() => {
    setName(profile.displayName);
    setEmail(profile.email);
  }, [profile.displayName, profile.email]);

  const saveProfile = async () => {
    setBusy(true);
    const result = await updateProfile({ displayName: name.trim() || profile.displayName, email: email.trim() });
    setBusy(false);
    setProfileMsg(result.ok ? t('已儲存') : '');
    window.setTimeout(() => setProfileMsg(''), 2200);
  };

  const savePassword = async () => {
    setPwError(false);
    setPwMsg('');
    if (next.length < 4) {
      setPwError(true);
      setPwMsg(t('密碼至少需 4 個字元'));
      return;
    }
    if (next !== confirm) {
      setPwError(true);
      setPwMsg(t('兩次輸入的新密碼不一致'));
      return;
    }
    setBusy(true);
    const result = await changePassword({ current, next });
    setBusy(false);
    if (result.ok) {
      setPwMsg(t('密碼已更新'));
      setPwError(false);
      setCurrent('');
      setNext('');
      setConfirm('');
    } else {
      setPwError(true);
      setPwMsg(t('目前密碼不正確'));
    }
    window.setTimeout(() => setPwMsg(''), 2800);
  };

  const avatar = (profile.displayName || 'F').trim().charAt(0).toUpperCase();

  return (
    <>
      <Group>
        <div className="set-profile">
          <span className="set-profile-av">{avatar}</span>
          <div className="set-profile-text">
            <strong>{profile.displayName || 'Fusion User'}</strong>
            <span>
              {t('專業使用者')}
              {profile.email ? ` · ${profile.email}` : ''}
            </span>
          </div>
        </div>
      </Group>

      <Group title={t('個人資料')}>
        <div className="set-field">
          <label>
            <User size={15} strokeWidth={1.9} /> {t('顯示名稱')}
          </label>
          <input className="set-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="set-field">
          <label>
            <Mail size={15} strokeWidth={1.9} /> {t('電子郵件')}
          </label>
          <input
            className="set-input"
            type="email"
            value={email}
            placeholder="name@fusion.os"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="set-actions">
          <button type="button" className="set-btn primary" onClick={saveProfile} disabled={busy}>
            {t('儲存變更')}
          </button>
          {profileMsg && <span className="set-ok">{profileMsg}</span>}
        </div>
      </Group>

      <Group title={t('安全性')}>
        <div className="set-field">
          <label>
            <Lock size={15} strokeWidth={1.9} /> {t('目前密碼')}
          </label>
          <input
            className="set-input"
            type="password"
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="set-field">
          <label>
            <KeyRound size={15} strokeWidth={1.9} /> {t('新密碼')}
          </label>
          <input
            className="set-input"
            type="password"
            value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="set-field">
          <label>
            <KeyRound size={15} strokeWidth={1.9} /> {t('確認新密碼')}
          </label>
          <input
            className="set-input"
            type="password"
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <div className="set-actions">
          <button type="button" className="set-btn primary" onClick={savePassword} disabled={busy}>
            {t('更新密碼')}
          </button>
          {pwMsg && <span className={pwError ? 'set-err' : 'set-ok'}>{pwMsg}</span>}
        </div>
      </Group>

      <Group>
        <Row icon={LogOut} title={t('登出並鎖定')} desc={t('帳戶資料儲存在本機 SQLite 資料庫')} onClick={signOut} chevron />
      </Group>
    </>
  );
}

/* ---------- main component ---------- */

export const FusionSettings: React.FC<FusionSettingsProps> = ({ open, onClose, settings: s, onChange: set }) => {
  const [active, setActive] = useState<CatId>('system');
  const [query, setQuery] = useState('');
  const sys = useSystemInfo();
  const { t } = useI18n();
  const account = useAccount();

  const storageText = sys.storage
    ? `已使用 ${sys.storage.usedGB.toFixed(1)} GB／可用約 ${sys.storage.totalGB.toFixed(0)} GB`
    : '計算中…';
  const audioOptions = sys.audioOutputs.length
    ? sys.audioOutputs.map((label, i) => ({ value: label || `device-${i}`, label }))
    : [
        { value: 'fusion-speakers', label: '預設輸出裝置' }
      ];

  // Close on Escape (capture so it doesn't reach the desktop shortcut handler).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const activeMeta = useMemo(() => CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0], [active]);

  const renderContent = () => {
    switch (active) {
      case 'system':
        return (
          <>
            <Group title="顯示器">
              <Row icon={Sun} title="亮度" desc="調整 FusionOS 桌面的整體明暗">
                <Slider value={s.brightness} onChange={(v) => set('brightness', v)} min={40} max={100} />
              </Row>
              <Row icon={Moon} title="夜間模式" desc="為桌面套上暖色濾鏡，於夜晚保護眼睛">
                <Toggle on={s.nightLight} onChange={(v) => set('nightLight', v)} />
              </Row>
              <Row icon={Monitor} title="顯示解析度" desc={`偵測到的螢幕：${sys.screen}（實體 ${sys.physical}）`} />
              <Row icon={Monitor} title="縮放與版面配置" desc={`系統偵測 ${sys.scalePercent}% · 此處調整僅縮放 FusionOS 介面`}>
                <Picker
                  value={s.scale}
                  onChange={(v) => set('scale', v)}
                  options={[
                    { value: '90%', label: '90%' },
                    { value: '100%', label: '100%（建議）' },
                    { value: '110%', label: '110%' }
                  ]}
                />
              </Row>
            </Group>

            <Group title="音效">
              <Row icon={Volume2} title="主音量" desc="FusionOS 介面音量（不影響系統音量）">
                <Slider value={s.muted ? 0 : s.volume} onChange={(v) => set('volume', v)} />
              </Row>
              <Row icon={Volume2} title="靜音">
                <Toggle on={s.muted} onChange={(v) => set('muted', v)} />
              </Row>
              <Row icon={Volume2} title="輸出裝置" desc={sys.audioOutputs.length ? '偵測自本機' : '需要相機/麥克風權限才能讀取裝置名稱'}>
                <Picker value={s.output} onChange={(v) => set('output', v)} options={audioOptions} />
              </Row>
            </Group>

            <Group title="電源與電池">
              <Row
                icon={Battery}
                title="電池"
                desc={sys.battery ? `${sys.battery.level}% · ${sys.battery.charging ? '充電中' : '使用電池'}` : '無電池或無法讀取'}
              />
              <Row icon={Battery} title="電源模式" desc="在效能與續航之間取得平衡">
                <Picker
                  value={s.powerMode}
                  onChange={(v) => set('powerMode', v)}
                  options={[
                    { value: 'saver', label: '省電' },
                    { value: 'balanced', label: '平衡' },
                    { value: 'performance', label: '最佳效能' }
                  ]}
                />
              </Row>
              <Row icon={Monitor} title="閒置後關閉螢幕">
                <Picker
                  value={s.screenOff}
                  onChange={(v) => set('screenOff', v)}
                  options={[
                    { value: '5', label: '5 分鐘' },
                    { value: '10', label: '10 分鐘' },
                    { value: '30', label: '30 分鐘' },
                    { value: 'never', label: '永不' }
                  ]}
                />
              </Row>
            </Group>

            <Group title="關於（即時偵測自你的電腦）">
              <Row icon={Info} title="作業系統" desc={`${sys.os} · ${sys.browser}`} />
              <Row icon={Cpu} title="裝置" desc={`${sys.device}${sys.arch ? ` · ${sys.arch}` : ''}`} />
              <Row icon={Cpu} title="處理器" desc={sys.cores ? `${sys.cores} 個邏輯核心` : '無法讀取'} />
              <Row icon={Cpu} title="記憶體" desc={sys.memoryGB ? `約 ${sys.memoryGB} GB（瀏覽器回報）` : '無法讀取'} />
              <Row icon={Monitor} title="螢幕" desc={`${sys.screen} · 縮放 ${sys.scalePercent}%`} />
              <Row icon={HardDrive} title="儲存空間（估計）" desc={storageText} />
              <Row icon={Languages} title="系統語言" desc={sys.language} />
            </Group>
          </>
        );

      case 'devices':
        return (
          <>
            <Group title="藍牙">
              <Row icon={Bluetooth} title="藍牙" desc={s.bluetooth ? '可被探索為「LAPTOP-FUSION」' : '已關閉'}>
                <Toggle on={s.bluetooth} onChange={(v) => set('bluetooth', v)} />
              </Row>
            </Group>
            <Group title="裝置">
              <Row icon={MousePointer2} title="Cobra Pro" desc={s.bluetooth ? '已連線 · 電量 86%' : '未連線'} chevron />
              <Row icon={Volume2} title="HECATE G5BT" desc={s.bluetooth ? '已連線' : '未連線'} chevron />
              <Row icon={Monitor} title="ROG 外接螢幕" desc="已連線 · HDMI" chevron />
              <Row icon={Bluetooth} title="新增裝置" desc="配對新的藍牙或無線裝置" onClick={() => undefined} chevron />
            </Group>
          </>
        );

      case 'network':
        return (
          <>
            <Group title="網路（即時偵測）">
              <Row
                icon={Globe2}
                title="連線狀態"
                desc={sys.online ? `已連線上網${sys.connection ? ` · ${sys.connection.toUpperCase()}` : ''}` : '離線'}
              />
              <Row icon={Wifi} title="Wi-Fi" desc={s.wifi && !s.airplane ? '已啟用' : '已關閉'}>
                <Toggle on={s.wifi && !s.airplane} onChange={(v) => set('wifi', v)} />
              </Row>
              <Row icon={Plane} title="飛航模式" desc="關閉所有無線通訊（FusionOS 模擬）">
                <Toggle on={s.airplane} onChange={(v) => set('airplane', v)} />
              </Row>
            </Group>
            <Group title="進階">
              <Row icon={Globe2} title="VPN" desc="未設定" chevron />
              <Row icon={Wifi} title="行動熱點" desc="分享此裝置的網路連線">
                <Toggle on={false} onChange={() => undefined} />
              </Row>
              <Row icon={Globe2} title="Proxy 代理伺服器" chevron />
            </Group>
          </>
        );

      case 'personalize':
        return (
          <>
            <Group title={t('色彩模式')}>
              <Row icon={s.colorMode === 'dark' ? Moon : Sun} title={t('佈景主題')} desc={t('選擇淺色或深色外觀')}>
                <Picker
                  value={s.colorMode}
                  onChange={(v) => set('colorMode', v)}
                  options={[
                    { value: 'dark', label: t('深色') },
                    { value: 'light', label: t('淺色') },
                    { value: 'auto', label: t('自動') }
                  ]}
                />
              </Row>
              <Row icon={Palette} title={t('透明效果')} desc={t('視窗與面板的玻璃模糊質感')}>
                <Toggle on={s.transparency} onChange={(v) => set('transparency', v)} />
              </Row>
            </Group>

            <Group title={t('強調色')}>
              <div className="set-swatches">
                {ACCENTS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`set-swatch ${s.accent === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => set('accent', color)}
                    aria-label={`強調色 ${color}`}
                  >
                    {s.accent === color && <Check size={16} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </Group>

            <Group title={t('桌布')}>
              <div className="set-wallpapers">
                {WALLPAPERS.map((bg, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`set-wallpaper ${s.wallpaper === i ? 'active' : ''}`}
                    style={{ background: bg }}
                    onClick={() => set('wallpaper', i)}
                    aria-label={`桌布 ${i + 1}`}
                  >
                    {s.wallpaper === i && <Check size={18} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </Group>
          </>
        );

      case 'apps':
        return (
          <>
            <Group title="預設應用程式">
              <Row icon={Globe2} title="網頁瀏覽器" desc="網頁區" chevron />
              <Row icon={AppWindow} title="檔案總管" desc="專案檔案" chevron />
            </Group>
            <Group title="啟動應用程式">
              <Row icon={Cpu} title="本機" desc="登入時自動啟動">
                <Toggle on onChange={() => undefined} />
              </Row>
              <Row icon={Bell} title="通知中心" desc="登入時自動啟動">
                <Toggle on={s.notifications} onChange={(v) => set('notifications', v)} />
              </Row>
              <Row icon={Gamepad2} title="遊戲室" desc="登入時自動啟動">
                <Toggle on={false} onChange={() => undefined} />
              </Row>
            </Group>
          </>
        );

      case 'accounts':
        return <AccountSection />;

      case 'time':
        return (
          <>
            <Group title={t('語言')}>
              <Row icon={Languages} title={t('顯示語言')} desc={t('變更整個 FusionOS 桌面的顯示語言')}>
                <Picker
                  value={s.language}
                  onChange={(v) => set('language', v)}
                  options={LANGS.map((code) => ({ value: code, label: LANG_LABELS[code] }))}
                />
              </Row>
            </Group>
            <Group title={t('時間')}>
              <Row icon={Clock} title={t('時區')}>
                <Picker
                  value={s.timezone}
                  onChange={(v) => set('timezone', v)}
                  options={[
                    { value: 'Asia/Taipei', label: '(UTC+8) 台北' },
                    { value: 'Asia/Tokyo', label: '(UTC+9) 東京' },
                    { value: 'America/Los_Angeles', label: '(UTC-8) 洛杉磯' },
                    { value: 'Europe/London', label: '(UTC+0) 倫敦' }
                  ]}
                />
              </Row>
              <Row icon={Clock} title={t('使用 24 小時制')}>
                <Toggle on={s.clock24} onChange={(v) => set('clock24', v)} />
              </Row>
            </Group>
          </>
        );

      case 'gaming':
        return (
          <Group title="遊戲">
            <Row icon={Gamepad2} title="遊戲模式" desc="最佳化系統資源以提升遊戲效能">
              <Toggle on={s.gameMode} onChange={(v) => set('gameMode', v)} />
            </Row>
            <Row icon={Monitor} title="背景錄製" desc="自動保留最近的精彩遊戲片段">
              <Toggle on={s.captureBg} onChange={(v) => set('captureBg', v)} />
            </Row>
          </Group>
        );

      case 'accessibility':
        return (
          <>
            <Group title="視覺">
              <Row icon={Accessibility} title="文字大小" desc="放大或縮小桌面介面文字">
                <Slider value={s.textSize} min={85} max={130} onChange={(v) => set('textSize', v)} />
              </Row>
              <Row icon={Sun} title="高對比" desc="提高文字與背景的對比度">
                <Toggle on={s.highContrast} onChange={(v) => set('highContrast', v)} />
              </Row>
            </Group>
            <Group title="動態效果">
              <Row icon={Accessibility} title="動畫效果" desc="關閉可降低動態與眩光">
                <Toggle on={s.animations} onChange={(v) => set('animations', v)} />
              </Row>
            </Group>
          </>
        );

      case 'privacy':
        return (
          <Group title="應用程式權限">
            <Row icon={Monitor} title="相機存取" desc="允許應用程式使用相機（手勢控制需要）">
              <Toggle on={s.camera} onChange={(v) => set('camera', v)} />
            </Row>
            <Row icon={Volume2} title="麥克風" desc="允許應用程式使用麥克風">
              <Toggle on={s.microphone} onChange={(v) => set('microphone', v)} />
            </Row>
            <Row icon={Globe2} title="位置" desc="允許應用程式存取你的位置">
              <Toggle on={s.location} onChange={(v) => set('location', v)} />
            </Row>
          </Group>
        );

      case 'update':
        return (
          <>
            <Group>
              <div className="set-update">
                <span className="set-update-icon">
                  <Check size={26} strokeWidth={2.4} />
                </span>
                <div className="set-update-text">
                  <strong>你的系統是最新的</strong>
                  <span>上次檢查時間：今天 09:24</span>
                </div>
                <button type="button" className="set-btn">
                  <RefreshCw size={16} /> 檢查更新
                </button>
              </div>
            </Group>
            <Group title="更新選項">
              <Row icon={RefreshCw} title="自動下載並安裝更新">
                <Toggle on={s.autoUpdate} onChange={(v) => set('autoUpdate', v)} />
              </Row>
              <Row icon={Clock} title="使用中時間" desc="08:00 – 23:00 不會自動重新啟動" chevron />
              <Row icon={Info} title="更新紀錄" chevron />
            </Group>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="set-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{ ['--accent' as string]: s.accent } as React.CSSProperties}
        >
          <motion.div
            className="set-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="set-topbar">
              <div className="set-title">
                <SettingsIcon size={20} strokeWidth={1.9} />
                <span>{t('系統設定')}</span>
              </div>
              <label className="set-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder={t('搜尋設定')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button type="button" className="set-close" onClick={onClose} title={t('關閉')}>
                <X size={18} />
              </button>
            </header>

            <div className="set-body">
              <nav className="set-sidebar" aria-label={t('設定分類')}>
                <div className="set-account-chip">
                  <span className="set-account-av">{(account.profile.displayName || 'A').trim().charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{account.profile.displayName || 'Avery'}</strong>
                    <span>{account.profile.email || 'avery@fusion.os'}</span>
                  </div>
                </div>
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={active === category.id ? 'active' : ''}
                      onClick={() => setActive(category.id)}
                    >
                      <Icon size={19} strokeWidth={1.8} />
                      <span>{t(category.label)}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="set-content">
                <div className="set-content-head">
                  <activeMeta.icon size={26} strokeWidth={1.8} />
                  <h2>{t(activeMeta.label)}</h2>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    className="set-content-scroll"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
