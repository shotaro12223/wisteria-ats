import { NextResponse } from "next/server";

export async function POST() {
  // TODO: ここで Supabase のサーバー側 signOut（cookieクリア）を実装する
  // 現段階では「クライアント側で auth guard が効く」前提で 200 を返す
  // 実際の認証方式に合わせて、cookie/sessionの破棄に切り替える。
  return NextResponse.json({ ok: true });
}
