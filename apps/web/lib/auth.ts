import { apiFetch, setTokens, clearTokens } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export async function register(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthUser> {
  const tokens = await apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  setTokens(tokens.access_token, tokens.refresh_token);
  return getMe();
}

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const tokens = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens.access_token, tokens.refresh_token);
  return getMe();
}

export async function logout(): Promise<void> {
  clearTokens();
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}
