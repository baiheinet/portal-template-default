import type { AuthProvider } from "@refinedev/core";

import {
  AUTH_API_URL,
  getNocoBaseHeaders,
  NOCOBASE_TOKEN_KEY,
} from "./constants";

type NocoBaseUser = {
  id: number | string;
  nickname?: string;
  username?: string;
  email?: string;
  avatar?: string;
};

type NocoBaseSignInResponse = {
  token?: string;
  user?: NocoBaseUser;
};

type CurrentUserCache = {
  token: string;
  user: NocoBaseUser;
  expiresAt: number;
};

const CURRENT_USER_CACHE_MS = 30_000;
let currentUserCache: CurrentUserCache | undefined;
let currentUserRequest: Promise<NocoBaseUser> | undefined;

const authUrl = (action: "signIn" | "signOut" | "check") =>
  `${AUTH_API_URL.replace(/\/$/, "")}/auth:${action}`;

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload !== "object" || payload === null) return fallback;
  const error = payload as { message?: string; errors?: Array<{ message?: string }> };
  return error.errors?.[0]?.message ?? error.message ?? fallback;
};

const saveRenewedToken = (response: Response) => {
  const token = response.headers.get("x-new-token");
  if (token) localStorage.setItem(NOCOBASE_TOKEN_KEY, token);
};

const clearCurrentUserCache = () => {
  currentUserCache = undefined;
  currentUserRequest = undefined;
};

const getCurrentUser = async (): Promise<NocoBaseUser> => {
  const token = localStorage.getItem(NOCOBASE_TOKEN_KEY);
  if (!token) throw new Error("No NocoBase token");

  if (currentUserCache?.token === token && currentUserCache.expiresAt > Date.now()) {
    return currentUserCache.user;
  }

  if (currentUserRequest) return currentUserRequest;

  currentUserRequest = (async () => {
    const response = await fetch(authUrl("check"), {
      headers: getNocoBaseHeaders({ token, includeAuthenticator: true }),
    });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) throw new Error(getErrorMessage(payload, "NocoBase session is invalid"));

    saveRenewedToken(response);
    const user = (payload?.data ?? payload) as NocoBaseUser;
    currentUserCache = {
      token: localStorage.getItem(NOCOBASE_TOKEN_KEY) ?? token,
      user,
      expiresAt: Date.now() + CURRENT_USER_CACHE_MS,
    };
    return user;
  })();

  try {
    return await currentUserRequest;
  } finally {
    currentUserRequest = undefined;
  }
};

export const authProvider: AuthProvider = {
  login: async ({ username, email, password, providerName }) => {
    if (providerName) {
      return {
        success: false,
        error: {
          name: "UnsupportedAuthenticator",
          message: "Configure this provider as a NocoBase authenticator before using social sign-in.",
        },
      };
    }

    const account = username ?? email;
    if (!account || !password) {
      return {
        success: false,
        error: { name: "LoginError", message: "Please enter your account and password." },
      };
    }

    try {
      const response = await fetch(authUrl("signIn"), {
        method: "POST",
        headers: getNocoBaseHeaders({
          includeAuthenticator: true,
          includeContentType: true,
        }),
        body: JSON.stringify({ account, password }),
      });
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) {
        return {
          success: false,
          error: { name: "LoginError", message: getErrorMessage(payload, "Unable to sign in.") },
        };
      }

      const result = (payload?.data ?? payload) as NocoBaseSignInResponse;
      if (!result.token) {
        return {
          success: false,
          error: { name: "LoginError", message: "NocoBase did not return an access token." },
        };
      }

      localStorage.setItem(NOCOBASE_TOKEN_KEY, result.token);
      clearCurrentUserCache();
      return { success: true, redirectTo: "/" };
    } catch {
      return {
        success: false,
        error: {
          name: "NetworkError",
          message:
            "Unable to reach the NocoBase server. If this is a remote NocoBase from localhost, enable backend CORS for X-Authenticator or use the Vite proxy.",
        },
      };
    }
  },

  logout: async () => {
    const token = localStorage.getItem(NOCOBASE_TOKEN_KEY);
    try {
      if (token) {
        await fetch(authUrl("signOut"), {
          method: "POST",
          headers: getNocoBaseHeaders({ token, includeAuthenticator: true }),
        });
      }
    } finally {
      localStorage.removeItem(NOCOBASE_TOKEN_KEY);
      clearCurrentUserCache();
    }

    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    try {
      await getCurrentUser();
      return { authenticated: true };
    } catch {
      localStorage.removeItem(NOCOBASE_TOKEN_KEY);
      clearCurrentUserCache();
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  getPermissions: async () => null,

  getIdentity: async () => {
    try {
      const user = await getCurrentUser();
      const fullName = user.nickname ?? user.username ?? user.email ?? "NocoBase user";
      return {
        id: user.id,
        firstName: fullName,
        lastName: "",
        fullName,
        email: user.email ?? "",
        avatar: user.avatar,
      };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    const status = (error as { status?: number; statusCode?: number }).status ??
      (error as { status?: number; statusCode?: number }).statusCode;

    if (status === 401 || status === 403) {
      localStorage.removeItem(NOCOBASE_TOKEN_KEY);
      clearCurrentUserCache();
      return { logout: true, redirectTo: "/login" };
    }

    return { error };
  },
};
