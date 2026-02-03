// src/lib/gmailPayload.ts

export type ExtractedBodies = {
  html: string | null;
  text: string | null;
};

function base64UrlToUtf8(data?: string | null): string | null {
  if (!data) return null;
  try {
    let s = data.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    if (pad === 2) s += "==";
    else if (pad === 3) s += "=";
    return Buffer.from(s, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export function extractBodies(payloadOrMessage: any): ExtractedBodies {
  if (!payloadOrMessage || typeof payloadOrMessage !== "object") {
    return { html: null, text: null };
  }

  // message全体 or payload どちらでも対応
  const payload =
    payloadOrMessage.payload && payloadOrMessage.payload.mimeType
      ? payloadOrMessage.payload
      : payloadOrMessage;

  let html: string | null = null;
  let text: string | null = null;

  // ✅ ケース1：payload.parts がある（通常の multipart）
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) {
      const mt = String(p?.mimeType ?? "").toLowerCase();
      const data = p?.body?.data;
      const decoded = base64UrlToUtf8(data);
      if (!decoded) continue;

      if (mt === "text/html") html = (html ?? "") + decoded;
      else if (mt === "text/plain") text = (text ?? "") + decoded;
    }
  }

  // ✅ ケース2：parts が無く、payload.body.data に本文が直入っている（今回ここ）
  if (!html && !text) {
    const decoded = base64UrlToUtf8(payload?.body?.data);
    if (decoded) {
      // HTMLっぽければ html、そうでなければ text
      if (/<html|<\/div>|<\/p>|<br\s*\/?>/i.test(decoded)) {
        html = decoded;
      } else {
        text = decoded;
      }
    }
  }

  return { html, text };
}
