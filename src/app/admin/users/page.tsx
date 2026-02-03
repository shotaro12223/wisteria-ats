import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import InviteForm from "./InviteForm";
import MembersTable from "./MembersTable";

export default async function AdminUsersPage() {
  const supabase = await supabaseServer();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) redirect("/login");

  const { data: me, error: meErr } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (meErr || !me || me.role !== "admin") redirect("/");

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">ユーザー管理（管理者）</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">新規ユーザー作成・権限変更・アクセス削除ができます。</p>

      <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">新規ユーザー作成</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">メールアドレスとパスワードを設定して新しいユーザーを作成します。</p>
        <InviteForm />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 mt-6 bg-white dark:bg-slate-800">
        <MembersTable />
      </div>
    </div>
  );
}
