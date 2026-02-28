const KEY = "vn:username";

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(KEY, name.trim());
}

export function clearUsername(): void {
  localStorage.removeItem(KEY);
}
