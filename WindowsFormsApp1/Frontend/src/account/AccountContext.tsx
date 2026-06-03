import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accountClient, accountBackend, type AccountResult } from './accountClient';

// Holds the live auth state for the whole desktop: which screen the boot gate should
// show (setup / lock / desktop) and the profile (display name + email) every surface
// reads so a rename updates everywhere at once.

type AuthStatus = 'loading' | 'needsSetup' | 'locked' | 'authed';

interface AccountProfile {
  displayName: string;
  email: string;
  language: string;
}

interface AccountContextValue {
  status: AuthStatus;
  authed: boolean;
  backend: 'host' | 'mock';
  profile: AccountProfile;
  setup: (input: { displayName: string; email: string; password: string; language: string }) => Promise<AccountResult>;
  verify: (password: string) => Promise<AccountResult>;
  updateProfile: (input: { displayName: string; email: string }) => Promise<AccountResult>;
  changePassword: (input: { current: string; next: string }) => Promise<AccountResult>;
  signOut: () => void;
  reset: () => Promise<AccountResult>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

const EMPTY_PROFILE: AccountProfile = { displayName: '', email: '', language: 'zh-TW' };

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<AccountProfile>(EMPTY_PROFILE);

  useEffect(() => {
    let alive = true;
    accountClient
      .getState()
      .then((state) => {
        if (!alive) return;
        setProfile({ displayName: state.displayName, email: state.email, language: state.language });
        setStatus(state.exists ? 'locked' : 'needsSetup');
      })
      .catch(() => {
        if (alive) setStatus('needsSetup');
      });

    // Host pushes a fresh STATE after profile changes — keep the cached profile in sync.
    const dispose = accountClient.onState((state) => {
      setProfile({ displayName: state.displayName, email: state.email, language: state.language });
    });
    return () => {
      alive = false;
      dispose();
    };
  }, []);

  const setup = useCallback(
    async (input: { displayName: string; email: string; password: string; language: string }) => {
      const result = await accountClient.setup(input);
      if (result.ok) {
        setProfile({ displayName: input.displayName, email: input.email, language: input.language });
        setStatus('authed');
      }
      return result;
    },
    []
  );

  const verify = useCallback(async (password: string) => {
    const result = await accountClient.verify(password);
    if (result.ok) setStatus('authed');
    return result;
  }, []);

  const updateProfile = useCallback(async (input: { displayName: string; email: string }) => {
    const result = await accountClient.updateProfile(input);
    if (result.ok) setProfile((prev) => ({ ...prev, displayName: input.displayName, email: input.email }));
    return result;
  }, []);

  const changePassword = useCallback(
    (input: { current: string; next: string }) => accountClient.changePassword(input),
    []
  );

  const signOut = useCallback(() => setStatus('locked'), []);

  const reset = useCallback(async () => {
    const result = await accountClient.reset();
    if (result.ok) {
      setProfile(EMPTY_PROFILE);
      setStatus('needsSetup');
    }
    return result;
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      authed: status === 'authed',
      backend: accountBackend,
      profile,
      setup,
      verify,
      updateProfile,
      changePassword,
      signOut,
      reset
    }),
    [status, profile, setup, verify, updateProfile, changePassword, signOut, reset]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used within an AccountProvider');
  return value;
}
