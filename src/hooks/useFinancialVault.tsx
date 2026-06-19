import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSessionPassword, setSessionPassword } from "@/lib/sessionSecret";
import {
  computeSummary,
  createVault,
  decryptRow,
  fetchVaultRow,
  rewrapPasswordWrap,
  saveState,
  unlockWithPasswordRow,
  unlockWithRecoveryRow,
  type CashFlowSummary,
  type FinancialState,
  type VaultRow,
} from "@/lib/financialData";

/**
 * Status of the encrypted financial vault for the signed-in user:
 *  - loading: still resolving (auth or the vault row)
 *  - absent:  no vault has been set up yet
 *  - locked:  a vault exists but we don't hold the key this session
 *  - unlocked: key in memory; `state`/`summary` are available
 *  - error:   the vault row couldn't be loaded
 */
export type VaultStatus = "loading" | "absent" | "locked" | "unlocked" | "error";

interface VaultContextValue {
  status: VaultStatus;
  state: FinancialState | null;
  summary: CashFlowSummary | null;
  error: string | null;
  /** Whether a login password is cached this session (seamless setup/unlock). */
  hasSessionPassword: boolean;
  setup: (password: string) => Promise<string>; // resolves to the recovery code
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithRecovery: (code: string) => Promise<void>;
  save: (next: FinancialState) => Promise<void>;
  lock: () => void;
  reload: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function FinancialVaultProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [state, setState] = useState<FinancialState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<VaultRow | null>(null);
  const dekRef = useRef<CryptoKey | null>(null);

  const summary = useMemo(() => (state ? computeSummary(state) : null), [state]);

  const reset = useCallback(() => {
    rowRef.current = null;
    dekRef.current = null;
    setState(null);
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      reset();
      setStatus("loading");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const row = await fetchVaultRow(user.id);
      rowRef.current = row;
      if (!row) {
        setStatus("absent");
        return;
      }
      // Try seamless unlock from the cached login password.
      const pw = getSessionPassword();
      if (pw) {
        try {
          const dek = await unlockWithPasswordRow(pw, row);
          dekRef.current = dek;
          setState(await decryptRow(dek, row));
          setStatus("unlocked");
          return;
        } catch {
          /* wrong/absent — fall through to a manual unlock */
        }
      }
      setStatus("locked");
    } catch (e) {
      console.error("[vault] load failed", e);
      setError(e instanceof Error ? e.message : "Could not load your financial vault");
      setStatus("error");
    }
  }, [user, reset]);

  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, reload]);

  const setup = useCallback<VaultContextValue["setup"]>(
    async (password) => {
      if (!user) throw new Error("You must be signed in");
      const { recoveryCode, dek } = await createVault(user.id, password);
      // Cache the password so seamless unlock works for the rest of the session
      // (and so the post-setup reload doesn't re-lock the vault we just created).
      setSessionPassword(password);
      dekRef.current = dek;
      rowRef.current = await fetchVaultRow(user.id);
      setState((s) => s ?? { income: [], expenses: [], meta: { currency: "USD", updatedAt: new Date().toISOString() } });
      setStatus("unlocked");
      return recoveryCode;
    },
    [user],
  );

  const unlockWithPassword = useCallback<VaultContextValue["unlockWithPassword"]>(
    async (password) => {
      const row = rowRef.current;
      if (!row) throw new Error("No vault to unlock");
      const dek = await unlockWithPasswordRow(password, row); // throws on wrong password
      dekRef.current = dek;
      setState(await decryptRow(dek, row));
      setStatus("unlocked");
    },
    [],
  );

  const unlockWithRecovery = useCallback<VaultContextValue["unlockWithRecovery"]>(
    async (code) => {
      const row = rowRef.current;
      if (!row || !user) throw new Error("No vault to unlock");
      const dek = await unlockWithRecoveryRow(code, row); // throws on wrong code
      dekRef.current = dek;
      setState(await decryptRow(dek, row));
      setStatus("unlocked");
      // Self-heal: re-wrap under the current login password so next session is seamless.
      const pw = getSessionPassword();
      if (pw) {
        try {
          await rewrapPasswordWrap(user.id, dek, pw);
          rowRef.current = await fetchVaultRow(user.id);
        } catch (e) {
          console.error("[vault] rewrap after recovery failed", e);
        }
      }
    },
    [user],
  );

  const save = useCallback<VaultContextValue["save"]>(
    async (next) => {
      if (!user || !dekRef.current) throw new Error("Vault is locked");
      const saved = await saveState(user.id, dekRef.current, next);
      setState(saved);
    },
    [user],
  );

  const lock = useCallback(() => {
    dekRef.current = null;
    setState(null);
    setStatus(rowRef.current ? "locked" : "absent");
  }, []);

  const value: VaultContextValue = {
    status,
    state,
    summary,
    error,
    hasSessionPassword: getSessionPassword() != null,
    setup,
    unlockWithPassword,
    unlockWithRecovery,
    save,
    lock,
    reload,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useFinancialVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useFinancialVault must be used within FinancialVaultProvider");
  return ctx;
}
