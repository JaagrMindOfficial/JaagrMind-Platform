/**
 * Centralized Auth Storage & Cookie Manager
 * Handles complete session synchronization across localStorage, sessionStorage,
 * and cookies, with instant client-side JWT expiration checking.
 */

const TOKEN_COOKIE_NAME = "token";
const ROLE_COOKIE_NAME = "user_role";
const IS_INTERNAL_COOKIE_NAME = "is_internal";
const ROLE_TAG_COOKIE_NAME = "role_tag";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const ALL_SESSION_COOKIE_NAMES = [
  TOKEN_COOKIE_NAME,
  ROLE_COOKIE_NAME,
  IS_INTERNAL_COOKIE_NAME,
  ROLE_TAG_COOKIE_NAME,
];

/**
 * Checks if a JWT token is expired using its cryptographic 'exp' claim.
 * Fast, synchronous, zero-network-cost client-side check.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr);
    if (!payload.exp || typeof payload.exp !== "number") return false;
    // Buffer by 10 seconds to avoid edge-of-expiry race conditions
    return Date.now() >= (payload.exp - 10) * 1000;
  } catch {
    return true;
  }
}

/**
 * Sets the authentication cookie with standard security attributes.
 */
export function setAuthCookie(token: string) {
  if (typeof document === "undefined") return;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = isSecure ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
}

/**
 * Sets authentication and role metadata cookies for instant server/client hydration.
 */
export function setUserSessionCookies(
  token: string,
  user?: {
    roles?: Array<{ role: string; entity_id?: string }>;
    is_internal?: boolean;
    role?: string;
  } | null
) {
  if (typeof document === "undefined") return;
  setAuthCookie(token);

  if (user) {
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    const secureFlag = isSecure ? "; Secure" : "";

    const roles = user.roles?.map((r) => r.role) || (user.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("superadmin");
    const isCounselor = roles.includes("counselor");
    const isInternal = Boolean(user.is_internal) || isSuperAdmin;

    let primaryRole = roles[0] || (isInternal ? "internal_ops" : "user");
    let roleTag = "User";

    if (isSuperAdmin) {
      primaryRole = "superadmin";
      roleTag = "JaagrMind Ops Admin";
    } else if (isInternal && isCounselor) {
      primaryRole = "counselor";
      roleTag = "Care Desk Counselor";
    } else if (isCounselor) {
      primaryRole = "counselor";
      roleTag = "School Counselor";
    } else if (roles.includes("school_admin")) {
      primaryRole = "school_admin";
      roleTag = "School Admin";
    } else if (roles.includes("teacher")) {
      primaryRole = "teacher";
      roleTag = "Teacher";
    } else if (roles.includes("student")) {
      primaryRole = "student";
      roleTag = "Student";
    } else if (roles.includes("parent") || roles.includes("relative")) {
      primaryRole = "parent";
      roleTag = "Parent";
    }

    document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(primaryRole)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
    document.cookie = `${IS_INTERNAL_COOKIE_NAME}=${isInternal ? "1" : "0"}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
    document.cookie = `${ROLE_TAG_COOKIE_NAME}=${encodeURIComponent(roleTag)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
  }
}

/**
 * Reads the authentication cookie from document.cookie.
 */
export function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Reads the role cookie from document.cookie.
 */
export function getUserRoleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ROLE_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Reads the role tag cookie from document.cookie.
 */
export function getRoleTagCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ROLE_TAG_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Purges all authentication and role metadata cookies across root path, hostname, and apex domain.
 */
export function clearAllAuthCookies() {
  if (typeof document === "undefined") return;
  const pastDate = "Thu, 01 Jan 1970 00:00:00 GMT";

  ALL_SESSION_COOKIE_NAMES.forEach((name) => {
    // 1. Standard root path
    document.cookie = `${name}=; path=/; expires=${pastDate}; max-age=0; SameSite=Lax`;

    // 2. Specific hostname
    if (typeof window !== "undefined" && window.location.hostname) {
      const host = window.location.hostname;
      document.cookie = `${name}=; path=/; domain=${host}; expires=${pastDate}; max-age=0; SameSite=Lax`;

      // 3. Apex / root domain if on a subdomain (e.g. app.jaagrmind.com -> .jaagrmind.com)
      const hostParts = host.split(".");
      if (hostParts.length > 2) {
        const rootDomain = hostParts.slice(-2).join(".");
        document.cookie = `${name}=; path=/; domain=.${rootDomain}; expires=${pastDate}; max-age=0; SameSite=Lax`;
      }
    }
  });
}

/**
 * Complete, authoritative session flush across all client storage tiers.
 */
export function clearAllAuthSession() {
  if (typeof window === "undefined") return;

  // Clear LocalStorage
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("superadmin_impersonating");
  } catch {}

  // Clear SessionStorage
  try {
    sessionStorage.clear();
  } catch {}

  // Clear all cookie instances
  clearAllAuthCookies();
}

/**
 * Returns a guaranteed valid (non-expired) token, or cleans up and returns null.
 */
export function getValidStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  let token = localStorage.getItem("token");
  if (!token) {
    token = getAuthCookie();
    if (token) {
      localStorage.setItem("token", token);
    }
  }

  if (!token) {
    clearAllAuthSession();
    return null;
  }

  if (isTokenExpired(token)) {
    clearAllAuthSession();
    return null;
  }

  return token;
}
