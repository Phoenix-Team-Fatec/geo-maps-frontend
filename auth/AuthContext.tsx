import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";

type User = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  cpf: string;
  image?: string;
  data_nascimento: string;
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  loading: boolean;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType>({} as any);

const ACCESS_KEY = "access_token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    user: null,
    loading: true,
  });

  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const scheduleRefresh = (expiresInSeconds: number) => {
    const ms = Math.max((expiresInSeconds - 60) * 1000, 5_000);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshAccessToken().catch(() => { });
    }, ms);
  };

  const accessTokenRef = useRef<string | null>(null);

  const saveAccess = async (token: string | null) => {
    accessTokenRef.current = token;
    setState((s) => ({ ...s, accessToken: token }));
    if (token) await SecureStore.setItemAsync(ACCESS_KEY, token);
    else await SecureStore.deleteItemAsync(ACCESS_KEY);
  };

  const loadPersisted = async () => {
    const token = await SecureStore.getItemAsync(ACCESS_KEY);
    accessTokenRef.current = token;
    setState((s) => ({ ...s, accessToken: token }));
    return token;
  };

  useEffect(() => {
    (async () => {
      try {
        const token = await loadPersisted();
        if (token) {
          await getMeAndStore();
        }
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseError = async (resp: Response) => {
    let detail = "Erro desconhecido";
    try {
      const data = await resp.json();
      detail = data?.detail || detail;
    } catch { }
    return { status: resp.status, detail };
  };

  const login = async (email: string, password: string) => {
    const resp = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",           // mantém cookie httpOnly do refresh
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      const { status, detail } = await parseError(resp);
      if (status === 401) throw new Error(detail || "Credenciais inválidas.");
      if (status >= 500) throw new Error("Erro no servidor. Tente novamente.");
      throw new Error(detail);
    }

    const data = await resp.json();     // { access_token, expires_in, token_type }
    await saveAccess(data.access_token);
    scheduleRefresh(data.expires_in || 15 * 60);
    await getMeAndStore();
  };

  const getMeAndStore = async () => {
    const token = accessTokenRef.current;
    if (!token) throw new Error("Sem access token");
    const resp = await fetch("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (resp.ok) {
      const user = (await resp.json()) as User;
      setState((s) => ({ ...s, user }));
      return user;
    }
    if (resp.status === 401) {
      const newTok = await refreshAccessToken();
      if (!newTok) throw new Error("Sessão expirada.");
      const again = await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${newTok}` },
        credentials: "include",
      });
      if (!again.ok) throw new Error("Não foi possível obter seus dados.");
      const user = (await again.json()) as User;
      setState((s) => ({ ...s, user }));
      return user;
    }
    const { detail } = await parseError(resp);
    throw new Error(detail || "Falha ao obter perfil.");
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    const resp = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok) {
      await saveAccess(null);
      setState((s) => ({ ...s, user: null }));
      return null;
    }
    const data = await resp.json(); // { access_token, expires_in }
    await saveAccess(data.access_token);
    scheduleRefresh(data.expires_in || 15 * 60);
    return data.access_token as string;
  };

  const fetchWithAuth = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const doFetch = async (token: string | null) => {
      const headers = new Headers(init.headers || {});
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers, credentials: "include" });
    };

    let token = state.accessToken;
    let resp = await doFetch(token);

    if (resp.status === 401) {
      const newTok = await refreshAccessToken();
      if (!newTok) return resp;
      resp = await doFetch(newTok);
    }
    return resp;
  };

  const logout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch { }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    await saveAccess(null);
    setState({ accessToken: null, user: null, loading: false });
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        accessToken: state.accessToken,
        loading: state.loading,
        login,
        logout,
        refreshAccessToken,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx || typeof ctx.login !== "function") {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
};