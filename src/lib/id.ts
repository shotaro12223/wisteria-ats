// src/lib/id.ts
/**
 * localStorage用途の軽量ID
 * - timestamp + random を混ぜて衝突確率を下げる
 * - crypto.randomUUID など TS lib / 実行環境差に依存しない
 */
export function makeId(): string {
  const ts = Date.now().toString(16);
  const rnd = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");

  return `${ts}-${rnd()}-${rnd()}-${rnd()}`;
}
