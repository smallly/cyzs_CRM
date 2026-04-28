export type AuthTokenProvider = () => string;

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
}

export type AuthErrorHandler = (message: string) => void;

export class AuthRequiredError extends Error {
  constructor(message = "请先登录") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function isAuthRequiredError(error: unknown): boolean {
  return error instanceof AuthRequiredError || (error as any)?.name === "AuthRequiredError";
}

export function createApiClient(getToken: AuthTokenProvider, onAuthError?: AuthErrorHandler) {
  const apiBase = getApiBaseUrl();

  return async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined)
    };
    const token = getToken();
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const res = await fetch(apiBase + normalizedPath, { ...init, headers });
    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        const message = payload?.message || "请先登录";
        onAuthError?.(message);
        throw new AuthRequiredError(message);
      }
      if (payload && typeof payload.message === "string") {
        throw new Error(payload.message);
      }
      throw new Error(text || ("HTTP " + res.status));
    }

    if (payload && typeof payload.code === "number") {
      if (payload.code !== 0) {
        if (payload.code === 401 || payload.code === 403) {
          const message = payload.message || "请先登录";
          onAuthError?.(message);
          throw new AuthRequiredError(message);
        }
        throw new Error(payload.message || "request failed");
      }
      return payload.data as T;
    }

    return payload as T;
  };
}
