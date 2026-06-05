import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Accessibility,
  AppWindow,
  AudioLines,
  Battery,
  Bell,
  Bluetooth,
  Bot,
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
  Mic,
  Monitor,
  Moon,
  MousePointer2,
  Palette,
  Plane,
  RefreshCw,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  Volume2,
  WandSparkles,
  Wifi,
  X,
  type LucideIcon
} from 'lucide-react';
import { WALLPAPERS, type FusionSettingsState } from '../hooks/useFusionSettings';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { useI18n } from '../i18n/I18nContext';
import { useAccount } from '../account/AccountContext';
import { LANG_LABELS, LANGS } from '../i18n/strings';
import { DEFAULT_DESKTOP_PETS } from '../pets/defaultDesktopPets';
import { buildImportedDesktopPet, mergeDesktopPetLibrary } from '../pets/desktopPetRegistry';
import { ACCOUNT_TEXT, DESKTOP_PET_TEXT, SETTINGS_CATEGORY_LABELS } from '../settings/settingsText';
import { ASSISTANT_TEXT } from '../assistant/assistantText';
import { checkVoiceServer, type VoiceServerInfo } from '../assistant/voiceClient';

interface FusionSettingsProps {
  open: boolean;
  onClose: () => void;
  settings: FusionSettingsState;
  onChange: <K extends keyof FusionSettingsState>(key: K, value: FusionSettingsState[K]) => void;
  onOpenAssistant?: () => void;
}

type SettingsChange = FusionSettingsProps['onChange'];

type CatId =
  | 'system'
  | 'devices'
  | 'network'
  | 'personalize'
  | 'pet'
  | 'assistant'
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
  { id: 'assistant', label: '語音助理', icon: Mic },
  { id: 'apps', label: '應用程式', icon: AppWindow },
  { id: 'accounts', label: '帳戶', icon: User },
  { id: 'time', label: '時間與語言', icon: Languages },
  { id: 'gaming', label: '遊戲', icon: Gamepad2 },
  { id: 'accessibility', label: '協助工具', icon: Accessibility },
  { id: 'privacy', label: '隱私權與安全性', icon: Shield },
  { id: 'update', label: '系統更新', icon: RefreshCw }
];

const ACCENTS = ['#67e8ff', '#6aa8ff', '#9c7cff', '#d56bff', '#ff6a9e', '#55d7d0', '#7ef6c8', '#ffb45c'];

const SETTINGS_CATEGORIES: Array<{ id: CatId; label: string; icon: LucideIcon }> = [
  { id: 'system', label: SETTINGS_CATEGORY_LABELS.system, icon: Cpu },
  { id: 'devices', label: SETTINGS_CATEGORY_LABELS.devices, icon: Bluetooth },
  { id: 'network', label: SETTINGS_CATEGORY_LABELS.network, icon: Wifi },
  { id: 'personalize', label: SETTINGS_CATEGORY_LABELS.personalize, icon: Palette },
  { id: 'pet', label: SETTINGS_CATEGORY_LABELS.pet, icon: Bot },
  { id: 'assistant', label: SETTINGS_CATEGORY_LABELS.assistant, icon: Mic },
  { id: 'apps', label: SETTINGS_CATEGORY_LABELS.apps, icon: AppWindow },
  { id: 'accounts', label: SETTINGS_CATEGORY_LABELS.accounts, icon: User },
  { id: 'time', label: SETTINGS_CATEGORY_LABELS.time, icon: Languages },
  { id: 'gaming', label: SETTINGS_CATEGORY_LABELS.gaming, icon: Gamepad2 },
  { id: 'accessibility', label: SETTINGS_CATEGORY_LABELS.accessibility, icon: Accessibility },
  { id: 'privacy', label: SETTINGS_CATEGORY_LABELS.privacy, icon: Shield },
  { id: 'update', label: SETTINGS_CATEGORY_LABELS.update, icon: RefreshCw }
];

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
            <strong>{profile.displayName || t(ACCOUNT_TEXT.fusionUser)}</strong>
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

/* ---------- desktop pet section ---------- */

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(DESKTOP_PET_TEXT.readSpritesheetError));
    reader.readAsDataURL(file);
  });
}

function DesktopPetSection({ settings, onChange }: { settings: FusionSettingsState; onChange: SettingsChange }) {
  const { t, tf } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const library = useMemo(
    () => mergeDesktopPetLibrary(DEFAULT_DESKTOP_PETS, settings.desktopPetCustoms),
    [settings.desktopPetCustoms]
  );
  const selected = library.find((pet) => pet.id === settings.desktopPetSelectedId) ?? library[0];
  const customSelected = selected?.source === 'custom';
  const selectedDescription =
    selected.source === 'default' || selected.description === DESKTOP_PET_TEXT.importedDescription ? t(selected.description) : selected.description;
  const importErrorSources = new Set<string>([
    DESKTOP_PET_TEXT.readSpritesheetError,
    DESKTOP_PET_TEXT.importPairError,
    DESKTOP_PET_TEXT.importTooLargeError,
    DESKTOP_PET_TEXT.invalidManifestError,
    DESKTOP_PET_TEXT.unsupportedSpritesheetError
  ]);

  const setTemporaryMessage = (value: string, isError = false) => {
    setMessage(isError ? '' : value);
    setError(isError ? value : '');
    window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 2800);
  };

  const importFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    const manifestFile = selectedFiles.find((file) => file.name.toLowerCase().endsWith('.json'));
    const imageFile = selectedFiles.find((file) => /\.(webp|png)$/i.test(file.name) || /image\/(webp|png)/i.test(file.type));

    try {
      if (!manifestFile || !imageFile) {
        throw new Error(DESKTOP_PET_TEXT.importPairError);
      }
      if (imageFile.size > 2_800_000) {
        throw new Error(DESKTOP_PET_TEXT.importTooLargeError);
      }

      const imported = buildImportedDesktopPet({
        manifestText: await manifestFile.text(),
        imageDataUrl: await readFileAsDataUrl(imageFile),
        imageName: imageFile.name
      });
      const nextCustoms = [imported, ...settings.desktopPetCustoms.filter((pet) => pet.id !== imported.id)].slice(0, 6);
      onChange('desktopPetCustoms', nextCustoms);
      onChange('desktopPetSelectedId', imported.id);
      onChange('desktopPetEnabled', true);
      setTemporaryMessage(tf(DESKTOP_PET_TEXT.importedStatus, imported.displayName));
    } catch (err) {
      const errorSource =
        err instanceof Error && importErrorSources.has(err.message) ? err.message : DESKTOP_PET_TEXT.importFallbackError;
      setTemporaryMessage(t(errorSource), true);
    }
  };

  const removeSelected = () => {
    if (!customSelected || !selected) return;
    onChange(
      'desktopPetCustoms',
      settings.desktopPetCustoms.filter((pet) => pet.id !== selected.id)
    );
    onChange('desktopPetSelectedId', DEFAULT_DESKTOP_PETS[0].id);
    setTemporaryMessage(tf(DESKTOP_PET_TEXT.removedStatus, selected.displayName));
  };

  return (
    <>
      <Group title={t(DESKTOP_PET_TEXT.companion)}>
        <div className="set-pet-summary">
          <span className="set-pet-preview" style={{ backgroundImage: `url("${selected.spritesheetUrl}")` }} aria-hidden="true" />
          <div className="set-pet-summary-text">
            <strong>{selected.displayName}</strong>
            <span>{selectedDescription}</span>
          </div>
          <span className={`set-pet-badge ${selected.source}`}>
            {selected.source === 'default' ? t(DESKTOP_PET_TEXT.preset) : t(DESKTOP_PET_TEXT.imported)}
          </span>
        </div>
        <Row icon={Bot} title={t(DESKTOP_PET_TEXT.showDesktopPet)} desc={t(DESKTOP_PET_TEXT.showDesktopPetDesc)}>
          <Toggle on={settings.desktopPetEnabled} onChange={(value) => onChange('desktopPetEnabled', value)} />
        </Row>
        <Row icon={Sparkles} title={t(DESKTOP_PET_TEXT.activePet)} desc={t(DESKTOP_PET_TEXT.activePetDesc)}>
          <Picker
            value={selected.id}
            onChange={(value) => onChange('desktopPetSelectedId', value)}
            options={library.map((pet) => ({ value: pet.id, label: pet.displayName }))}
          />
        </Row>
        <Row icon={MousePointer2} title={t(DESKTOP_PET_TEXT.size)} desc={t(DESKTOP_PET_TEXT.sizeDesc)}>
          <Slider value={settings.desktopPetScale} min={45} max={120} onChange={(value) => onChange('desktopPetScale', value)} />
        </Row>
        <Row icon={RotateCcw} title={t(DESKTOP_PET_TEXT.resetPosition)} desc={t(DESKTOP_PET_TEXT.resetPositionDesc)}>
          <button type="button" className="set-btn" onClick={() => onChange('desktopPetPosition', { x: -1, y: -1 })}>
            <RotateCcw size={16} /> {t(DESKTOP_PET_TEXT.reset)}
          </button>
        </Row>
      </Group>

      <Group title={t(DESKTOP_PET_TEXT.petLibrary)}>
        <div className="set-pet-actions">
          <input
            ref={inputRef}
            type="file"
            accept=".json,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => {
              void importFiles(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
          <button type="button" className="set-btn primary" onClick={() => inputRef.current?.click()}>
            <Upload size={16} /> {t(DESKTOP_PET_TEXT.importPet)}
          </button>
          <button type="button" className="set-btn" onClick={removeSelected} disabled={!customSelected}>
            <Trash2 size={16} /> {t(DESKTOP_PET_TEXT.remove)}
          </button>
          {message && <span className="set-ok">{message}</span>}
          {error && <span className="set-err">{error}</span>}
        </div>
        <div className="set-pet-grid">
          {library.map((pet) => (
            <button
              key={pet.id}
              type="button"
              className={`set-pet-tile ${pet.id === selected.id ? 'active' : ''}`}
              onClick={() => onChange('desktopPetSelectedId', pet.id)}
            >
              <span className="set-pet-tile-sprite" style={{ backgroundImage: `url("${pet.spritesheetUrl}")` }} aria-hidden="true" />
              <span>
                <strong>{pet.displayName}</strong>
                <small>{pet.source === 'default' ? t(DESKTOP_PET_TEXT.presetCompanion) : t(DESKTOP_PET_TEXT.importedCompanion)}</small>
              </span>
            </button>
          ))}
        </div>
      </Group>
    </>
  );
}

/* ---------- voice assistant section ---------- */

function AssistantSettingsSection({
  settings: s,
  onChange: set,
  onOpenAssistant
}: {
  settings: FusionSettingsState;
  onChange: SettingsChange;
  onOpenAssistant?: () => void;
}) {
  const { t } = useI18n();
  const [serverInfo, setServerInfo] = useState<VoiceServerInfo | null>(null);

  // Live status of the local Fusion Voice Server so users can see whether to start it.
  useEffect(() => {
    let alive = true;
    setServerInfo(null);
    const probe = () => {
      void checkVoiceServer(s.assistantServerUrl).then((info) => {
        if (alive) setServerInfo(info);
      });
    };
    probe();
    const id = window.setInterval(probe, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [s.assistantServerUrl]);

  const audio = serverInfo?.audio;
  const signalKey = !audio || audio.rmsDbfs < -75
    ? ASSISTANT_TEXT.signalSilent
    : audio.rmsDbfs < -42
      ? ASSISTANT_TEXT.signalAudible
      : ASSISTANT_TEXT.signalSpeech;
  const inputPercent = audio ? Math.max(0, Math.min(100, ((audio.peakDbfs + 90) / 60) * 100)) : 0;

  return (
    <>
      <Group title={t(ASSISTANT_TEXT.title)}>
        <Row icon={Mic} title={t(ASSISTANT_TEXT.settingEnable)} desc={t(ASSISTANT_TEXT.settingEnableDesc)}>
          <Toggle on={s.assistantEnabled} onChange={(v) => set('assistantEnabled', v)} />
        </Row>
        <Row icon={Volume2} title={t(ASSISTANT_TEXT.settingVoice)} desc={t(ASSISTANT_TEXT.settingVoiceDesc)}>
          <Toggle on={s.assistantVoice} onChange={(v) => set('assistantVoice', v)} />
        </Row>
        <Row icon={AudioLines} title={t(ASSISTANT_TEXT.settingWake)} desc={t(ASSISTANT_TEXT.settingWakeDesc)}>
          <Toggle on={s.assistantWakeWord} onChange={(v) => set('assistantWakeWord', v)} />
        </Row>
      </Group>

      <Group title={t(ASSISTANT_TEXT.settingServer)}>
        <Row
          icon={AudioLines}
          title={t(ASSISTANT_TEXT.settingServer)}
          desc={
            serverInfo === null
              ? '…'
              : serverInfo.ok
                ? `${t(ASSISTANT_TEXT.settingServerOn)} · ${serverInfo.sttEngine} + ${serverInfo.vadEngine}`
                : t(ASSISTANT_TEXT.settingServerOff)
          }
        >
          <span className={`set-voice-dot ${serverInfo?.ok ? 'on' : serverInfo?.ok === false ? 'off' : ''}`} />
        </Row>
        <div className="set-field">
          <input
            className="set-input"
            value={s.assistantServerUrl}
            placeholder="http://localhost:8770"
            onChange={(e) => set('assistantServerUrl', e.target.value)}
          />
          <span className="set-field-hint">{t(ASSISTANT_TEXT.settingServerHint)}</span>
        </div>
        <div className="set-voice-diagnostics">
          <div className="set-voice-diagnostics-head">
            <span>
              <AudioLines size={16} />
              {t(ASSISTANT_TEXT.diagnosticsTitle)}
            </span>
            <span className={`set-voice-signal ${signalKey === ASSISTANT_TEXT.signalSilent ? 'silent' : signalKey === ASSISTANT_TEXT.signalSpeech ? 'speech' : 'audible'}`}>
              {t(signalKey)}
            </span>
          </div>
          <div className="set-voice-device">
            <small>{t(ASSISTANT_TEXT.diagnosticsDevice)}</small>
            <strong>{audio?.deviceLabel || '—'}</strong>
          </div>
          <div className="set-voice-meter-row">
            <span>{t(ASSISTANT_TEXT.diagnosticsInputLevel)}</span>
            <div className="set-voice-meter" aria-hidden="true">
              <i style={{ width: `${inputPercent}%` }} />
            </div>
            <strong>{audio ? `${audio.rmsDbfs.toFixed(1)} dBFS` : '—'}</strong>
          </div>
          <div className="set-voice-diagnostics-grid">
            <span>
              <small>{t(ASSISTANT_TEXT.diagnosticsPackets)}</small>
              <strong>{audio?.totalPackets.toLocaleString() ?? '0'}</strong>
            </span>
            <span>
              <small>{t(ASSISTANT_TEXT.diagnosticsSessions)}</small>
              <strong>{audio?.activeSessions ?? 0}</strong>
            </span>
            <span className="wide">
              <small>{t(ASSISTANT_TEXT.diagnosticsLastText)}</small>
              <strong>{audio?.lastText || t(ASSISTANT_TEXT.diagnosticsNoText)}</strong>
            </span>
          </div>
        </div>
      </Group>

      <Group title={t(ASSISTANT_TEXT.settingAi)}>
        <Row icon={WandSparkles} title={t(ASSISTANT_TEXT.settingAi)} desc={t(ASSISTANT_TEXT.settingAiDesc)}>
          <Toggle on={s.assistantUseAI} onChange={(v) => set('assistantUseAI', v)} />
        </Row>
        <Row
          icon={Cpu}
          title="Gemma 4 12B"
          desc={
            serverInfo?.gemma
              ? `${t(ASSISTANT_TEXT.aiReady)} · ${serverInfo.modelId}`
              : serverInfo?.gemmaLoading
                ? `${t(ASSISTANT_TEXT.statusModelLoading)} · ${serverInfo.modelId}`
                : `${serverInfo?.modelId || 'google/gemma-4-12B-it'} · ${t(ASSISTANT_TEXT.aiFallback)}`
          }
        />
        <Row
          icon={KeyRound}
          title="Hugging Face"
          desc={t(serverInfo?.hfAuthenticated ? ASSISTANT_TEXT.hfAuthenticated : ASSISTANT_TEXT.hfPublicAccess)}
        >
          <span className={`set-voice-dot ${serverInfo?.hfAuthenticated ? 'on' : 'off'}`} />
        </Row>
        {s.assistantUseAI && (
          <div className="set-field">
            <label>
              <Cpu size={15} strokeWidth={1.9} /> {t(ASSISTANT_TEXT.settingModel)}
            </label>
            <input
              className="set-input"
              value={s.assistantModel}
              placeholder="gemma3:12b"
              onChange={(e) => set('assistantModel', e.target.value)}
            />
            <span className="set-field-hint">{t(ASSISTANT_TEXT.settingModelHint)}</span>
          </div>
        )}
      </Group>

      <Group title={t(ASSISTANT_TEXT.settingHotkey)}>
        <Row icon={Sparkles} title={t(ASSISTANT_TEXT.settingHotkey)} desc={t(ASSISTANT_TEXT.settingHotkeyDesc)}>
          <span className="set-kbd">Alt + V</span>
        </Row>
        <div className="set-actions">
          <button type="button" className="set-btn primary" onClick={() => onOpenAssistant?.()} disabled={!s.assistantEnabled}>
            <Sparkles size={16} /> {t(ASSISTANT_TEXT.settingOpenNow)}
          </button>
        </div>
      </Group>
    </>
  );
}

/* ---------- main component ---------- */

export const FusionSettings: React.FC<FusionSettingsProps> = ({ open, onClose, settings: s, onChange: set, onOpenAssistant }) => {
  const [active, setActive] = useState<CatId>('system');
  const [query, setQuery] = useState('');
  const sys = useSystemInfo();
  const { t, tf } = useI18n();
  const account = useAccount();

  const storageText = sys.storage
    ? tf('已使用 {0} GB／可用約 {1} GB', sys.storage.usedGB.toFixed(1), sys.storage.totalGB.toFixed(0))
    : t('計算中…');
  const audioOptions = sys.audioOutputs.length
    ? sys.audioOutputs.map((label, i) => ({ value: label || `device-${i}`, label }))
    : [
        { value: 'fusion-speakers', label: t('預設輸出裝置') }
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

  const activeMeta = useMemo(() => SETTINGS_CATEGORIES.find((c) => c.id === active) ?? SETTINGS_CATEGORIES[0], [active]);

  const renderContent = () => {
    switch (active) {
      case 'system':
        return (
          <>
            <Group title={t('顯示器')}>
              <Row icon={Sun} title={t('亮度')} desc={t('調整 FusionOS 桌面的整體明暗')}>
                <Slider value={s.brightness} onChange={(v) => set('brightness', v)} min={40} max={100} />
              </Row>
              <Row icon={Moon} title={t('夜間模式')} desc={t('為桌面套上暖色濾鏡，於夜晚保護眼睛')}>
                <Toggle on={s.nightLight} onChange={(v) => set('nightLight', v)} />
              </Row>
              <Row icon={Monitor} title={t('顯示解析度')} desc={tf('偵測到的螢幕：{0}（實體 {1}）', sys.screen, sys.physical)} />
              <Row icon={Monitor} title={t('縮放與版面配置')} desc={tf('系統偵測 {0}% · 此處調整僅縮放 FusionOS 介面', sys.scalePercent)}>
                <Picker
                  value={s.scale}
                  onChange={(v) => set('scale', v)}
                  options={[
                    { value: '90%', label: '90%' },
                    { value: '100%', label: t('100%（建議）') },
                    { value: '110%', label: '110%' }
                  ]}
                />
              </Row>
            </Group>

            <Group title={t('音效')}>
              <Row icon={Volume2} title={t('主音量')} desc={t('FusionOS 介面音量（不影響系統音量）')}>
                <Slider value={s.muted ? 0 : s.volume} onChange={(v) => set('volume', v)} />
              </Row>
              <Row icon={Volume2} title={t('靜音')}>
                <Toggle on={s.muted} onChange={(v) => set('muted', v)} />
              </Row>
              <Row icon={Volume2} title={t('輸出裝置')} desc={sys.audioOutputs.length ? t('偵測自本機') : t('需要相機/麥克風權限才能讀取裝置名稱')}>
                <Picker value={s.output} onChange={(v) => set('output', v)} options={audioOptions} />
              </Row>
            </Group>

            <Group title={t('電源與電池')}>
              <Row
                icon={Battery}
                title={t('電池')}
                desc={sys.battery ? `${sys.battery.level}% · ${sys.battery.charging ? t('充電中') : t('使用電池')}` : t('無電池或無法讀取')}
              />
              <Row icon={Battery} title={t('電源模式')} desc={t('在效能與續航之間取得平衡')}>
                <Picker
                  value={s.powerMode}
                  onChange={(v) => set('powerMode', v)}
                  options={[
                    { value: 'saver', label: t('省電') },
                    { value: 'balanced', label: t('平衡') },
                    { value: 'performance', label: t('最佳效能') }
                  ]}
                />
              </Row>
              <Row icon={Monitor} title={t('閒置後關閉螢幕')}>
                <Picker
                  value={s.screenOff}
                  onChange={(v) => set('screenOff', v)}
                  options={[
                    { value: '5', label: t('5 分鐘') },
                    { value: '10', label: t('10 分鐘') },
                    { value: '30', label: t('30 分鐘') },
                    { value: 'never', label: t('永不') }
                  ]}
                />
              </Row>
            </Group>

            <Group title={t('關於（即時偵測自你的電腦）')}>
              <Row icon={Info} title={t('作業系統')} desc={`${sys.os} · ${sys.browser}`} />
              <Row icon={Cpu} title={t('裝置')} desc={`${sys.device}${sys.arch ? ` · ${sys.arch}` : ''}`} />
              <Row icon={Cpu} title={t('處理器')} desc={sys.cores ? tf('{0} 個邏輯核心', sys.cores) : t('無法讀取')} />
              <Row icon={Cpu} title={t('記憶體')} desc={sys.memoryGB ? tf('約 {0} GB（瀏覽器回報）', sys.memoryGB) : t('無法讀取')} />
              <Row icon={Monitor} title={t('螢幕')} desc={tf('{0} · 縮放 {1}%', sys.screen, sys.scalePercent)} />
              <Row icon={HardDrive} title={t('儲存空間（估計）')} desc={storageText} />
              <Row icon={Languages} title={t('系統語言')} desc={sys.language} />
            </Group>
          </>
        );

      case 'devices':
        return (
          <>
            <Group title={t('藍牙與裝置')}>
              <Row icon={Bluetooth} title="Bluetooth" desc={s.bluetooth ? t('可被探索為「LAPTOP-FUSION」') : t('已關閉')}>
                <Toggle on={s.bluetooth} onChange={(v) => set('bluetooth', v)} />
              </Row>
            </Group>
            <Group title={t('裝置')}>
              <Row icon={MousePointer2} title="Cobra Pro" desc={s.bluetooth ? t('已連線 · 電量 86%') : t('未連線')} chevron />
              <Row icon={Volume2} title="HECATE G5BT" desc={s.bluetooth ? t('已連線') : t('未連線')} chevron />
              <Row icon={Monitor} title={t('ROG 外接螢幕')} desc={t('已連線 · HDMI')} chevron />
              <Row icon={Bluetooth} title={t('新增裝置')} desc={t('配對新的藍牙或無線裝置')} onClick={() => undefined} chevron />
            </Group>
          </>
        );

      case 'network':
        return (
          <>
            <Group title={t('網路（即時偵測）')}>
              <Row
                icon={Globe2}
                title={t('連線狀態')}
                desc={sys.online ? `${t('已連線上網')}${sys.connection ? ` · ${sys.connection.toUpperCase()}` : ''}` : t('離線')}
              />
              <Row icon={Wifi} title="Wi-Fi" desc={s.wifi && !s.airplane ? t('已啟用') : t('已關閉')}>
                <Toggle on={s.wifi && !s.airplane} onChange={(v) => set('wifi', v)} />
              </Row>
              <Row icon={Plane} title={t('飛航模式')} desc={t('關閉所有無線通訊（FusionOS 模擬）')}>
                <Toggle on={s.airplane} onChange={(v) => set('airplane', v)} />
              </Row>
            </Group>
            <Group title={t('進階')}>
              <Row icon={Globe2} title="VPN" desc={t('未設定')} chevron />
              <Row icon={Wifi} title={t('行動熱點')} desc={t('分享此裝置的網路連線')}>
                <Toggle on={false} onChange={() => undefined} />
              </Row>
              <Row icon={Globe2} title={t('Proxy 代理伺服器')} chevron />
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

      case 'pet':
        return <DesktopPetSection settings={s} onChange={set} />;

      case 'assistant':
        return <AssistantSettingsSection settings={s} onChange={set} onOpenAssistant={onOpenAssistant} />;

      case 'apps':
        return (
          <>
            <Group title={t('預設應用程式')}>
              <Row icon={Globe2} title={t('網頁瀏覽器')} desc={t('網頁區')} chevron />
              <Row icon={AppWindow} title={t('檔案總管')} desc={t('專案檔案')} chevron />
            </Group>
            <Group title={t('啟動應用程式')}>
              <Row icon={Cpu} title={t('本機')} desc={t('登入時自動啟動')}>
                <Toggle on onChange={() => undefined} />
              </Row>
              <Row icon={Bell} title={t('通知中心')} desc={t('登入時自動啟動')}>
                <Toggle on={s.notifications} onChange={(v) => set('notifications', v)} />
              </Row>
              <Row icon={Gamepad2} title={t('遊戲室')} desc={t('登入時自動啟動')}>
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
                    { value: 'Asia/Taipei', label: t('(UTC+8) 台北') },
                    { value: 'Asia/Tokyo', label: t('(UTC+9) 東京') },
                    { value: 'America/Los_Angeles', label: t('(UTC-8) 洛杉磯') },
                    { value: 'Europe/London', label: t('(UTC+0) 倫敦') }
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
          <Group title={t('遊戲')}>
            <Row icon={Gamepad2} title={t('遊戲模式')} desc={t('最佳化系統資源以提升遊戲效能')}>
              <Toggle on={s.gameMode} onChange={(v) => set('gameMode', v)} />
            </Row>
            <Row icon={Monitor} title={t('背景錄製')} desc={t('自動保留最近的精彩遊戲片段')}>
              <Toggle on={s.captureBg} onChange={(v) => set('captureBg', v)} />
            </Row>
          </Group>
        );

      case 'accessibility':
        return (
          <>
            <Group title={t('視覺')}>
              <Row icon={Accessibility} title={t('文字大小')} desc={t('放大或縮小桌面介面文字')}>
                <Slider value={s.textSize} min={85} max={130} onChange={(v) => set('textSize', v)} />
              </Row>
              <Row icon={Sun} title={t('高對比')} desc={t('提高文字與背景的對比度')}>
                <Toggle on={s.highContrast} onChange={(v) => set('highContrast', v)} />
              </Row>
            </Group>
            <Group title={t('動態效果')}>
              <Row icon={Accessibility} title={t('動畫效果')} desc={t('關閉可降低動態與眩光')}>
                <Toggle on={s.animations} onChange={(v) => set('animations', v)} />
              </Row>
            </Group>
          </>
        );

      case 'privacy':
        return (
          <Group title={t('應用程式權限')}>
            <Row icon={Monitor} title={t('相機存取')} desc={t('允許應用程式使用相機（手勢控制需要）')}>
              <Toggle on={s.camera} onChange={(v) => set('camera', v)} />
            </Row>
            <Row icon={Volume2} title={t('麥克風')} desc={t('允許應用程式使用麥克風')}>
              <Toggle on={s.microphone} onChange={(v) => set('microphone', v)} />
            </Row>
            <Row icon={Globe2} title={t('位置')} desc={t('允許應用程式存取你的位置')}>
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
                  <strong>{t('你的系統是最新的')}</strong>
                  <span>{t('上次檢查時間：今天 09:24')}</span>
                </div>
                <button type="button" className="set-btn">
                  <RefreshCw size={16} /> {t('檢查更新')}
                </button>
              </div>
            </Group>
            <Group title={t('更新選項')}>
              <Row icon={RefreshCw} title={t('自動下載並安裝更新')}>
                <Toggle on={s.autoUpdate} onChange={(v) => set('autoUpdate', v)} />
              </Row>
              <Row icon={Clock} title={t('使用中時間')} desc={t('08:00 – 23:00 不會自動重新啟動')} chevron />
              <Row icon={Info} title={t('更新紀錄')} chevron />
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
                  <span className="set-account-av">{(account.profile.displayName || t(ACCOUNT_TEXT.guest)).trim().charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{account.profile.displayName || t(ACCOUNT_TEXT.guest)}</strong>
                    <span>{account.profile.email || 'guest@fusion.os'}</span>
                  </div>
                </div>
                {SETTINGS_CATEGORIES.map((category) => {
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
