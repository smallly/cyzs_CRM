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
        throw new Error(translateApiMessage(payload.message));
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
        throw new Error(translateApiMessage(payload.message || "request failed"));
      }
      return payload.data as T;
    }

    return payload as T;
  };
}

function translateApiMessage(message: string): string {
  if (!message) return "请求失败";
  if (message.startsWith("Linked contact does not exist")) return "关联联系人不存在";
  if (message.startsWith("Linked project does not exist")) return "关联项目不存在";
  const map: Record<string, string> = {
    "phone already exists in tenant": "手机号已存在",
    "phone already exists": "手机号已存在",
    "pending phone already exists in tenant": "待确认手机号已存在",
    "phone already bound": "手机号已绑定",
    "phone1 cannot equal phone2": "手机号1不能与手机号2相同",
    "name is required": "姓名不能为空",
    "phone is required": "手机号不能为空",
    "password is required": "密码不能为空",
    "invalid phone or password": "手机号或密码错误",
    "account is disabled": "账号已禁用",
    "tenant is disabled": "组织已停用",
    "tenant is expired": "组织已过期",
    "No permission": "无权操作",
    "No permission to view contact": "无权查看该联系人",
    "No permission to edit contact": "无权编辑该联系人",
    "No permission to delete contact": "无权删除该联系人",
    "Contact not found": "联系人不存在",
    "Contact is linked by project and cannot be deleted": "联系人已关联项目，不能删除",
    "request failed": "请求失败"
  };
  return map[message] || message;
}
