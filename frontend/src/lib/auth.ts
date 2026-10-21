export interface UserInfo {
  id: string;
  fullName: string;
  email: string;
  role: string;
  branchId: string;
  branchName?: string;
  permissions?: string[];
}

export function saveAuth(token: string, user: UserInfo, tenantId: string) {
  localStorage.setItem('token', token);
  localStorage.setItem('tenantId', tenantId);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('tenantId');
  localStorage.removeItem('tenantSlug');
  localStorage.removeItem('loginEmail');
  localStorage.removeItem('user');
  try { sessionStorage.removeItem('dukapos_locked'); } catch {}
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenantId');
}

export function getUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
