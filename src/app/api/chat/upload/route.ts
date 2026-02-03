import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function jsonWithCookies(baseRes: NextResponse, body: any, init?: { status?: number }) {
  const out = NextResponse.json(body, init);
  baseRes.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
  return out;
}

export async function POST(req: NextRequest) {
  const { supabase, res } = supabaseRoute(req);

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (error || !userId) {
    console.error("Auth error:", error);
    return jsonWithCookies(res, { ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return jsonWithCookies(res, { ok: false, error: "file required" }, { status: 400 });
    }

    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `chat/${userId}/${fileName}`;

    const buffer = await file.arrayBuffer();
    const uploadR = await supabaseAdmin.storage
      .from("chat-files")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadR.error) {
      console.error("Upload error:", uploadR.error);
      return jsonWithCookies(res, { ok: false, error: uploadR.error.message }, { status: 500 });
    }

    const publicUrlR = supabaseAdmin.storage.from("chat-files").getPublicUrl(filePath);

    return jsonWithCookies(res, {
      ok: true,
      file: {
        name: file.name,
        url: publicUrlR.data.publicUrl,
        type: file.type,
        size: file.size,
      },
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    return jsonWithCookies(res, { ok: false, error: e?.message ?? "upload failed" }, { status: 500 });
  }
}
