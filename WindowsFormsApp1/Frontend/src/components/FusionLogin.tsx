import React, { useMemo, useState } from 'react';
import { Lock, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAccount } from '../account/AccountContext';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../state/SettingsContext';
import { LANGS, LANG_LABELS, type Lang } from '../i18n/strings';
import { ACCOUNT_TEXT } from '../settings/settingsText';

// Fullscreen login / first-run setup gate shown between the boot loader and the desktop.
// First run (no account) => create display name + password; afterwards => password lock.
// phase: 'idle' = interactive, 'welcome' = success "歡迎" beat, 'exit' = zoom/fade out.
export type LoginPhase = 'idle' | 'welcome' | 'exit';
export const FusionLogin: React.FC<{ phase?: LoginPhase }> = ({ phase = 'idle' }) => {
  const { t, lang } = useI18n();
  const { status, profile, verify, setup, reset } = useAccount();
  const { settings, update } = useSettings();

  const isSetup = status === 'needsSetup';
  const [name, setName] = useState(profile.displayName || '');
  const [email, setEmail] = useState(profile.email || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const avatarLetter = useMemo(() => {
    const source = isSetup ? name : profile.displayName;
    return (source || 'F').trim().charAt(0).toUpperCase();
  }, [isSetup, name, profile.displayName]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isSetup) {
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
      if (!result.ok) setError(t('密碼錯誤，請再試一次'));
    } else {
      if (!password) return;
      setBusy(true);
      const result = await verify(password);
      setBusy(false);
      if (!result.ok) {
        setError(t('密碼錯誤，請再試一次'));
        setPassword('');
      }
    }
  };

  const onReset = async () => {
    if (window.confirm(t('這會清除本機帳戶並要求重新設定，確定嗎？'))) {
      await reset();
      setPassword('');
      setConfirm('');
      setError('');
    }
  };

  const welcoming = phase !== 'idle';

  return (
    <div className={`fusion-login ${phase === 'exit' ? 'is-exiting' : ''} ${welcoming ? 'is-welcoming' : ''}`}>
      <div className="fusion-login-aurora" aria-hidden="true" />
      <form className="fusion-login-card" onSubmit={onSubmit}>
        <div className="fusion-login-avatar" aria-hidden="true">
          <span>{avatarLetter}</span>
        </div>

        <h1 className="fusion-login-title">{isSetup ? t('建立你的帳戶') : profile.displayName || t('歡迎使用 FusionOS')}</h1>
        <p className="fusion-login-sub">{isSetup ? t('設定名稱與密碼以保護你的桌面') : t('輸入密碼以解鎖')}</p>

        {isSetup && (
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
            autoFocus={!isSetup}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
          />
        </label>

        {isSetup && (
          <label className="fusion-login-field">
            <span>{t('確認新密碼')}</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
        )}

        {error && <div className="fusion-login-error">{error}</div>}

        <button type="submit" className="fusion-login-submit" disabled={busy}>
          {busy ? (
            <>{t('正在驗證…')}</>
          ) : isSetup ? (
            <>
              <UserPlus size={18} strokeWidth={2} /> {t('建立帳戶')}
            </>
          ) : (
            <>
              <LogIn size={18} strokeWidth={2} /> {t('解鎖')}
            </>
          )}
        </button>

        <div className="fusion-login-foot">
          <span className="fusion-login-secure">
            <ShieldCheck size={14} /> {t('帳戶資料儲存在本機 SQLite 資料庫')}
          </span>
          {!isSetup && (
            <button type="button" className="fusion-login-reset" onClick={onReset}>
              <Lock size={13} /> {t('在此裝置上重設帳戶')}
            </button>
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

      {welcoming && (
        <div className="fusion-login-welcome" aria-hidden="true">
          <div className="fusion-login-welcome-avatar">
            <span>{avatarLetter}</span>
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
