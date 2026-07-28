const getWindowValue = (key: "NOCOBASE_PORTAL_BASE" | "NOCOBASE_API_URL") => {
  if (typeof window === "undefined") return undefined;
  const value = window[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const normalizePortalBase = (base?: string) => {
  const normalized = String(base || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return `/${normalized.replace(/^\/+|\/+$/g, "")}/`;
};

export const getPortalBase = () =>
  normalizePortalBase(
    getWindowValue("NOCOBASE_PORTAL_BASE") ?? import.meta.env.BASE_URL
  );

export const getRuntimeApiUrl = () =>
  getWindowValue("NOCOBASE_API_URL") ?? import.meta.env.NOCOBASE_API_URL;
