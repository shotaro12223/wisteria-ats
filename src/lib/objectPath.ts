// src/lib/objectPath.ts
export function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof path !== "string" || path.length === 0) return undefined;

  const parts = path.split(".");
  let cur: any = obj;

  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function toDisplayText(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "あり" : "なし";

  if (Array.isArray(value)) {
    // 配列は改行で見やすく
    return value.map((v) => toDisplayText(v)).filter(Boolean).join("\n");
  }

  // オブジェクトは JSON にせず空扱い（コピペしづらいので）
  return "";
}
