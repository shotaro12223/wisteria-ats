"use client";

import { useEffect, useState } from "react";

type Company = {
  id: string;
  company_name: string;
};

type ClientUser = {
  id: string;
  email: string;
  display_name: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminClientUsersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Create form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Password reset state
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // Load companies on mount
  useEffect(() => {
    async function loadCompanies() {
      const res = await fetch("/api/companies", { cache: "no-store" });

      if (!res.ok) {
        console.error("[ERROR] Failed to load companies:", res.status);
        if (res.status === 401 || res.status === 403) {
          setAuthError("認証エラー: ログインし直してください");
        }
        return;
      }

      const data = await res.json();
      console.log("[DEBUG] Companies loaded:", data.companies?.length);

      if (data.ok) {
        setCompanies(data.companies || []);
      }
    }
    loadCompanies();
  }, []);

  // Load client users when company is selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setClientUsers([]);
      return;
    }

    async function loadClientUsers() {
      setLoading(true);
      const res = await fetch(`/api/admin/client-users?companyId=${selectedCompanyId}`);
      const data = await res.json();
      setLoading(false);

      if (data.ok) {
        setClientUsers(data.data || []);
      }
    }

    loadClientUsers();
  }, [selectedCompanyId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCreating(true);

    try {
      const res = await fetch("/api/admin/client-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          companyId: selectedCompanyId,
          displayName,
        }),
      });

      if (!res.ok) {
        try {
          const errorData = await res.json();
          setMsg(`エラー: ${errorData.error?.message || "作成に失敗しました"}\n${errorData.error?.details || ""}\n${errorData.error?.hint || ""}`);
        } catch {
          const text = await res.text();
          setMsg(`エラー: ${res.status} - ${text || "作成に失敗しました"}`);
        }
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        setMsg(`エラー: ${data.error?.message || "作成に失敗しました"}\n${data.error?.details || ""}`);
        return;
      }

      // Success
      setMsg(null);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setShowCreateForm(false);

      // Reload client users
      const reloadRes = await fetch(`/api/admin/client-users?companyId=${selectedCompanyId}`);
      const reloadData = await reloadRes.json();
      if (reloadData.ok) {
        setClientUsers(reloadData.data || []);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    const res = await fetch(`/api/admin/client-users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });

    const data = await res.json();

    if (data.ok) {
      // Reload client users
      const reloadRes = await fetch(`/api/admin/client-users?companyId=${selectedCompanyId}`);
      const reloadData = await reloadRes.json();
      if (reloadData.ok) {
        setClientUsers(reloadData.data || []);
      }
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserId) return;

    setResetMsg(null);
    setResetting(true);

    try {
      const res = await fetch(`/api/admin/client-users/${resetUserId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        try {
          const errorData = await res.json();
          setResetMsg(errorData.error?.message || "パスワードリセットに失敗しました");
        } catch {
          setResetMsg("パスワードリセットに失敗しました");
        }
        return;
      }

      // Success
      setResetMsg(null);
      setNewPassword("");
      setResetUserId(null);
      alert("パスワードをリセットしました");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">クライアントユーザー管理</h1>

      {authError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-700 dark:text-red-400">{authError}</p>
        </div>
      )}

      {/* Company Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">企業を選択</label>
        <select
          className="w-full max-w-md rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
        >
          <option value="">-- 企業を選択してください --</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.company_name}
            </option>
          ))}
        </select>
      </div>

      {selectedCompanyId && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">クライアントユーザー一覧</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              {showCreateForm ? "キャンセル" : "+ 新規作成"}
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">新規クライアントユーザー作成</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">メールアドレス</label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">パスワード</label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">表示名（任意）</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="未入力の場合はメールアドレスを使用"
                  />
                </div>

                {msg && <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>}

                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                >
                  {creating ? "作成中..." : "作成"}
                </button>
              </form>
            </div>
          )}

          {/* Users List */}
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中...</p>
          ) : clientUsers.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">クライアントユーザーが登録されていません</p>
          ) : (
            <div className="space-y-3">
              {clientUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{user.display_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      作成日: {new Date(user.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {user.is_active ? "有効" : "無効"}
                    </span>

                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {user.is_active ? "無効化" : "有効化"}
                    </button>

                    <button
                      onClick={() => {
                        setResetUserId(user.id);
                        setNewPassword("");
                        setResetMsg(null);
                      }}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      パスワード変更
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">パスワード変更</h3>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">新しいパスワード</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                />
              </div>

              {resetMsg && <p className="text-sm text-red-600 dark:text-red-400">{resetMsg}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                >
                  {resetting ? "変更中..." : "変更"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetUserId(null);
                    setNewPassword("");
                    setResetMsg(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
