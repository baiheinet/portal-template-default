const rawApiUrl =
  import.meta.env.NOCOBASE_API_URL ?? "http://127.0.0.1:13000/api";

const getDefaultProxyTarget = (apiUrl?: string) => {
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
};

const proxyTarget = import.meta.env.DEV
  ? getDefaultProxyTarget(rawApiUrl)
  : undefined;

const toProxyRelativeUrl = (url: string, target?: string) => {
  if (!target || url.startsWith("/")) return url;

  try {
    const parsedUrl = new URL(url);
    const parsedTarget = new URL(target);

    if (parsedUrl.origin === parsedTarget.origin) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
  } catch {
    return url;
  }

  return url;
};

const getClientLocale = () =>
  typeof navigator !== "undefined" ? navigator.language : undefined;

const getClientTimezone = () => {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");

  return `${sign}${hours}:${minutes}`;
};

export const API_URL = toProxyRelativeUrl(rawApiUrl, proxyTarget);
export const AUTH_API_URL = API_URL;
export const TOKEN_KEY = "refine-auth";
export const NOCOBASE_TOKEN_KEY = "nocobase-auth-token";
export const NOCOBASE_AUTHENTICATOR =
  import.meta.env.NOCOBASE_AUTHENTICATOR ?? "basic";

export const getNocoBaseHeaders = ({
  token,
  includeAuthenticator = false,
  includeContentType = false,
}: {
  token?: string;
  includeAuthenticator?: boolean;
  includeContentType?: boolean;
} = {}) => {
  const locale = getClientLocale();
  const timezone = getClientTimezone();

  return {
    Accept: "application/json",
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
    ...(includeAuthenticator ? { "X-Authenticator": NOCOBASE_AUTHENTICATOR } : {}),
    ...(locale ? { "X-Locale": locale } : {}),
    ...(timezone ? { "X-Timezone": timezone } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
