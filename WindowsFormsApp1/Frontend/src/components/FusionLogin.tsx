import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, LogIn, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useAccount } from '../account/AccountContext';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';
import { LANGS, LANG_LABELS, type Lang } from '../i18n/strings';
import { ACCOUNT_TEXT } from '../settings/settingsText';

// Fullscreen login / first-run setup gate shown between the boot loader and the desktop.
// Multi-user: every local account appears as a tile — pick one and unlock, or create
// another user right from the lock screen. phase: 'idle' = interactive, 'welcome' =
// success "歡迎" beat, 'exit' = zoom/fade out.
export type LoginPhase = 'idle' | 'welcome' | 'exit';

// deterministic muted avatar tone per name (indexes the .fl-av-N css classes)
function avatarTone(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 5;
}

export const FusionLogin: React.FC<{ phase?: LoginPhase }> = ({ phase = 'idle' }) => {
  const { t, lang } = useI18n();
  const { status, profile, users, verify, setup, reset } = useAccount();
  const { settings, update } = useSettings();

  const needsSetup = status === 'needsSetup';
  const [creating, setCreating] = useState(false);      // "新增使用者" from the lock screen
  const isCreate = needsSetup || creating;

  const [selectedId, setSelectedId] = useState<number>(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);

  // keep a valid selection as the user list loads/changes
  useEffect(() => {
    if (!users.length) return;
    if (!users.some((u) => u.id === selectedId)) {
      const preferred = users.find((u) => u.displayName === profile.displayName) ?? users[0];
      setSelectedId(preferred.id);
    }
  }, [users, selectedId, profile.displayName]);

  const selected = users.find((u) => u.id === selectedId) ?? users[0] ?? null;

  const displayName = isCreate ? name : selected?.displayName ?? '';
  const avatarLetter = useMemo(() => (displayName || 'F').trim().charAt(0).toUpperCase(), [displayName]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isCreate) {
      if (password.length < 4) {
        setError(t('密碼至少需 4 個字元'));
        return;
      }
      if (password !== confirm) {
        setError(t('兩次輸入的新密碼不一致'));
        return;
      }
      setBusy(true);
      const result = await setup({ displayName: name.trim() || t(ACCOUNT_TEXT.fusionUser), email: email.trim(), password, language: lang });
      setBusy(false);
      if (!result.ok) setError(t('無法建立帳戶，請再試一次'));
    } else {
      if (!password || !selected) return;
      setBusy(true);
      const result = await verify(selected.id, password);
      setBusy(false);
      if (!result.ok) {
        setError(t('密碼錯誤，請再試一次'));
        setPassword('');
      }
    }
  };

  const onConfirmReset = async () => {
    setShowReset(false);
    await reset();
    setCreating(false);
    setPassword('');
    setConfirm('');
    setName('');
    setEmail('');
    setError('');
  };

  const startCreate = () => {
    setCreating(true);
    setError('');
    setPassword('');
    setConfirm('');
  };
  const cancelCreate = () => {
    setCreating(false);
    setError('');
    setPassword('');
    setConfirm('');
  };

  const welcoming = phase !== 'idle';

  return (
    <div className={`fusion-login ${phase === 'exit' ? 'is-exiting' : ''} ${welcoming ? 'is-welcoming' : ''}`}>
      <div className="fusion-login-aurora" aria-hidden="true" />
      <form className="fusion-login-card" onSubmit={onSubmit}>
        {creating && (
          <button type="button" className="fusion-login-back" onClick={cancelCreate}>
            <ArrowLeft size={14} /> {t('返回登入')}
          </button>
        )}

        <div className={`fusion-login-avatar fl-av-${avatarTone(displayName || 'F')}`} aria-hidden="true">
          <span>{avatarLetter}</span>
        </div>

        <h1 className="fusion-login-title">
          {isCreate ? (needsSetup ? t('建立你的帳戶') : t('新增使用者')) : selected?.displayName || t('歡迎使用 FusionOS')}
        </h1>
        <p className="fusion-login-sub">
          {isCreate
            ? needsSetup
              ? t('設定名稱與密碼以保護你的桌面')
              : t('為這台裝置建立另一位使用者')
            : t('輸入密碼以解鎖')}
        </p>

        {/* user picker — every local account is a tile (lock screen, 2+ users) */}
        {!isCreate && users.length > 1 && (
          <div className="fusion-login-users" role="group" aria-label="users">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`fusion-login-user ${u.id === selectedId ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelectedId(u.id);
                  setPassword('');
                  setError('');
                }}
              >
                <span className={`fusion-login-user-avatar fl-av-${avatarTone(u.displayName || 'F')}`}>
                  {(u.displayName || 'F').trim().charAt(0).toUpperCase()}
                </span>
                <span className="fusion-login-user-name">{u.displayName}</span>
              </button>
            ))}
          </div>
        )}

        {isCreate && (
          <>
            <label className="fusion-login-field">
              <span>{t('名稱')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(ACCOUNT_TEXT.fusionUser)}
                autoFocus
                maxLength={40}
              />
            </label>
            <label className="fusion-login-field">
              <span>{t('電子郵件')}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@fusion.os" />
            </label>
          </>
        )}

        <label className="fusion-login-field">
          <span>{t('密碼')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={!isCreate}
            autoComplete={isCreate ? 'new-password' : 'current-password'}
          />
        </label>

        {isCreate && (
          <label className="fusion-login-field">
            <span>{t('確認新密碼')}</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
        )}

        {error && <div className="fusion-login-error">{error}</div>}

        <button type="submit" className="fusion-login-submit" disabled={busy}>
          {busy ? (
            <>{t('正在驗證…')}</>
          ) : isCreate ? (
            <>
              <UserPlus size={17} strokeWidth={2} /> {t('建立帳戶')}
            </>
          ) : (
            <>
              <LogIn size={17} strokeWidth={2} /> {t('解鎖')}
            </>
          )}
        </button>

        <div className="fusion-login-foot">
          <span className="fusion-login-secure">
            <ShieldCheck size={14} /> {t('帳戶資料儲存在本機 SQLite 資料庫')}
          </span>
          {!isCreate && (
            <div className="fusion-login-foot-actions">
              <button type="button" className="fusion-login-ghost" onClick={startCreate}>
                <UserPlus size={13} /> {t('新增使用者')}
              </button>
              <button type="button" className="fusion-login-ghost is-danger" onClick={() => setShowReset(true)}>
                <Trash2 size={13} /> {t('重設帳戶')}
              </button>
            </div>
          )}
        </div>

        <div className="fusion-login-langs" role="group" aria-label="language">
          {LANGS.map((code: Lang) => (
            <button
              key={code}
              type="button"
              className={settings.language === code ? 'is-active' : ''}
              onClick={() => update('language', code)}
            >
              {LANG_LABELS[code]}
            </button>
          ))}
        </div>
      </form>

      {/* reset confirmation — a proper in-OS dialog instead of window.confirm */}
      {showReset && (
        <div className="fusion-login-modal-backdrop" onClick={() => setShowReset(false)}>
          <div className="fusion-login-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="fusion-login-modal-icon">
              <AlertTriangle size={22} strokeWidth={2} />
            </div>
            <h2 className="fusion-login-modal-title">{t('重設此裝置的帳戶？')}</h2>
            <p className="fusion-login-modal-body">
              {t('這會刪除此裝置上的所有使用者與密碼，並回到首次設定。此動作無法復原。')}
            </p>
            <div className="fusion-login-modal-actions">
              <button type="button" className="fusion-login-btn-secondary" onClick={() => setShowReset(false)} autoFocus>
                {t('取消')}
              </button>
              <button type="button" className="fusion-login-btn-danger" onClick={onConfirmReset}>
                <Trash2 size={15} /> {t('全部清除')}
              </button>
            </div>
          </div>
        </div>
      )}

      {welcoming && (
        <div className="fusion-login-welcome" aria-hidden="true">
          <div className={`fusion-login-welcome-avatar fl-av-${avatarTone(profile.displayName || 'F')}`}>
            <span>{(profile.displayName || 'F').trim().charAt(0).toUpperCase()}</span>
            <div className="fusion-login-welcome-ring" />
          </div>
          <div className="fusion-login-welcome-title">
            {t('歡迎回來')}{profile.displayName ? `，${profile.displayName}` : ''}
          </div>
          <div className="fusion-login-welcome-sub">{t('正在載入你的桌面…')}</div>
        </div>
      )}
    </div>
  );
};
