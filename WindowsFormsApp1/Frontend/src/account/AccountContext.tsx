import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accountClient, accountBackend, type AccountResult, type AccountUser } from './accountClient';

// Holds the live auth state for the whole desktop: which screen the boot gate should
// show (setup / lock / desktop), every account on the device (the login screen lists
// them), and the signed-in profile every surface reads so a rename updates everywhere.

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
  users: AccountUser[];
  setup: (input: { displayName: string; email: string; password: string; language: string }) => Promise<AccountResult>;
  verify: (userId: number, password: string) => Promise<AccountResult>;
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
  const [users, setUsers] = useState<AccountUser[]>([]);

  useEffect(() => {
    let alive = true;
    accountClient
      .getState()
      .then((state) => {
        if (!alive) return;
        setProfile({ displayName: state.displayName, email: state.email, language: state.language });
        setUsers(state.users);
        setStatus(state.exists ? 'locked' : 'needsSetup');
      })
      .catch(() => {
        if (alive) setStatus('needsSetup');
      });

    // Host pushes a fresh STATE after profile changes — keep the cached data in sync.
    const dispose = accountClient.onState((state) => {
      setProfile({ displayName: state.displayName, email: state.email, language: state.language });
      setUsers(state.users);
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
        // mock backend never pushes states — refresh the list ourselves
        accountClient.getState().then((state) => setUsers(state.users)).catch(() => {});
        setStatus('authed');
      }
      return result;
    },
    []
  );

  const verify = useCallback(async (userId: number, password: string) => {
    const result = await accountClient.verify(userId, password);
    if (result.ok) {
      const picked = users.find((u) => u.id === userId);
      if (picked) setProfile({ displayName: picked.displayName, email: picked.email, language: picked.language || 'zh-TW' });
      setStatus('authed');
    }
    return result;
  }, [users]);

  const updateProfile = useCallback(async (input: { displayName: string; email: string }) => {
    const result = await accountClient.updateProfile(input);
    if (result.ok) {
      setProfile((prev) => ({ ...prev, displayName: input.displayName, email: input.email }));
      accountClient.getState().then((state) => setUsers(state.users)).catch(() => {});
    }
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
      setUsers([]);
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
      users,
      setup,
      verify,
      updateProfile,
      changePassword,
      signOut,
      reset
    }),
    [status, profile, users, setup, verify, updateProfile, changePassword, signOut, reset]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used within an AccountProvider');
  return value;
}
