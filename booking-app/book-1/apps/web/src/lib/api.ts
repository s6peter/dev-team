const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type Service = {
  id: string;
  name: string;
  groupName?: string | null;
  optionName?: string | null;
  size?: string | null;
  length?: string | null;
  description: string;
  price: string;
  depositAmount: string;
  durationMinutes: number;
  category: string;
  isActive: boolean;
};
export type Staff = { id: string; displayName: string; user: { firstName: string; lastName: string } };
export type Booking = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  service: Service;
  staff: Staff;
  customer: { id: string; firstName: string; lastName: string; email: string; phone: string };
  payment?: { status: string; depositAmount: string; taxAmount: string; totalAmount: string };
};

export function token() {
  return localStorage.getItem("token");
}

export function authHeaders() {
  const value = token();
  return value ? { Authorization: `Bearer ${value}` } : {};
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const formatMoney = (value: string | number) => `$${Number(value).toFixed(2)}`;
export const formatDateTime = (value: string) => new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
