export function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function cls(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

export function formatLocalDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
