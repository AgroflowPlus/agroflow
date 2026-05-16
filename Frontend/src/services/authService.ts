import type {
  RegisterPayload,
  LoginPayload,
  AuthResponse,
} from "../types/auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const MOCK_MODE = false;

/* ── Real API request ──────────────────────────────────── */
async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error ?? data.message ?? "Something went wrong");
  return data as T;
}


/* ── Auth Service ──────────────────────────────────────── */
export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        role: payload.role,
      }),
    });
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    });
  },

  saveSession: (res: AuthResponse) => {
    localStorage.setItem("agf_token", res.token);
    localStorage.setItem("agf_user", JSON.stringify(res.user));
  },

  getToken: () => localStorage.getItem("agf_token"),

  getUser: () => {
    const raw = localStorage.getItem("agf_user");
    return raw ? JSON.parse(raw) : null;
  },

  setUser: (user: any) => {
    localStorage.setItem("agf_user", JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem("agf_token");
    localStorage.removeItem("agf_user");
  },

  isLoggedIn: (): boolean => {
    return !!localStorage.getItem("agf_token");
  },

  isMockMode: () => MOCK_MODE,
};

/* ── Content images from backend ───────────────────────── */
export async function getContentImages(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE_URL}/content`);
    const data = await res.json();
    const map: Record<string, string> = {};
    if (data.images) {
      data.images.forEach((img: { key: string; imageUrl: string }) => {
        map[img.key] = img.imageUrl;
      });
    }
    return map;
  } catch {
    return {};
  }
}