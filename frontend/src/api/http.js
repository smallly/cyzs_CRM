export function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
}
export class AuthRequiredError extends Error {
    constructor(message = "请先登录") {
        super(message);
        this.name = "AuthRequiredError";
    }
}
export function isAuthRequiredError(error) {
    return error instanceof AuthRequiredError || error?.name === "AuthRequiredError";
}
export function createApiClient(getToken, onAuthError) {
    const apiBase = getApiBaseUrl();
    return async function api(path, init) {
        const normalizedPath = path.startsWith("/") ? path : "/" + path;
        const headers = {
            "Content-Type": "application/json",
            ...init?.headers
        };
        const token = getToken();
        if (token) {
            headers.Authorization = "Bearer " + token;
        }
        const res = await fetch(apiBase + normalizedPath, { ...init, headers });
        const text = await res.text();
        let payload = null;
        try {
            payload = text ? JSON.parse(text) : null;
        }
        catch {
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
            return payload.data;
        }
        return payload;
    };
}
