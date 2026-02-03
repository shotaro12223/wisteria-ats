"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

/* ─────────── Premium hooks ─────────── */
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "おはようございます", icon: "☀️" };
  if (h >= 12 && h < 17) return { greeting: "お疲れさまです", icon: "🌤" };
  if (h >= 17 && h < 21) return { greeting: "お疲れさまです", icon: "🌅" };
  return { greeting: "夜遅くまでお疲れさまです", icon: "🌙" };
}

type Profile = {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  presence_status: string;
  created_at: string;
};

type User = {
  id: string;
  email: string | null;
};

export default function MyProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [presenceStatus, setPresenceStatus] = useState<"working" | "away">("working");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mouse tracking for gradient
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }, []);

  // Float animation
  useEffect(() => {
    const styleId = "profile-float-anim";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      @keyframes floatMedium { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    `;
    document.head.appendChild(style);
  }, []);

  const tod = getTimeOfDay();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/profile", { cache: "no-store" });
      const json = await res.json();

      if (json.ok) {
        setUser(json.user);
        setProfile(json.profile);
        setDisplayName(json.profile?.display_name ?? "");
        setBio(json.profile?.bio ?? "");
        setPresenceStatus(json.profile?.presence_status ?? "working");
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;

    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setProfile(json.profile);
        alert("プロフィールを更新しました");
      } else {
        alert(`更新に失敗しました: ${json.error?.message}`);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handlePresenceChange(status: "working" | "away") {
    try {
      const res = await fetch("/api/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (json.ok) {
        setPresenceStatus(status);
        setProfile((prev) => (prev ? { ...prev, presence_status: status } : null));
      }
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/me/avatar", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.ok) {
        setProfile(json.profile);
        alert("プロフィール画像を更新しました");
        // トップバーのアイコンも更新されるようにページをリフレッシュ
        window.location.reload();
      } else {
        alert(`アップロードに失敗しました: ${json.error?.message}`);
      }
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDeleteAvatar() {
    if (!confirm("プロフィール画像を削除しますか？")) return;

    setUploading(true);
    try {
      const res = await fetch("/api/me/avatar", {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.ok) {
        setProfile(json.profile);
        alert("プロフィール画像を削除しました");
        // トップバーのアイコンも更新されるようにページをリフレッシュ
        window.location.reload();
      } else {
        alert(`削除に失敗しました: ${json.error?.message}`);
      }
    } catch (error) {
      console.error("Failed to delete avatar:", error);
      alert("削除に失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function getInitials(name: string | null, email: string | null): string {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 dark:border-slate-700 border-t-indigo-600" />
          <div className="text-[13px] text-slate-600 dark:text-slate-400">読み込み中...</div>
        </div>
      </div>
    );
  }

  const initials = getInitials(profile?.display_name ?? null, user?.email ?? null);

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="min-h-screen relative">
      {/* Premium background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse 800px 600px at ${mousePos.x}% ${mousePos.y}%, rgba(99,102,241,0.06) 0%, transparent 50%)`,
          }}
        />
        <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900" />
        <div
          className="absolute -left-32 top-24 h-64 w-64 rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-3xl"
          style={{ animation: "floatSlow 8s ease-in-out infinite" }}
        />
        <div
          className="absolute right-12 top-48 h-48 w-48 rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-3xl"
          style={{ animation: "floatMedium 6s ease-in-out infinite 1s" }}
        />
      </div>

      {/* Header */}
      <div className="border-b border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{tod.icon}</span>
                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{tod.greeting}</span>
              </div>
              <h1 className="text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Profile</h1>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              ホーム
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">プロフィール情報</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar Section */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center border-2 border-slate-200">
                      <span className="text-[28px] font-bold text-white">{initials}</span>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="text-white text-[12px] font-semibold">...</div>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mb-2">プロフィール画像</div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-400 mb-3">
                    JPG、PNG、GIF、WebP形式（最大5MB）
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 bg-indigo-600 text-white text-[12px] font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploading ? "アップロード中..." : "画像を変更"}
                    </button>
                    {profile?.avatar_url && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={uploading}
                        className="px-4 py-2 bg-slate-200 text-slate-700 text-[12px] font-semibold rounded-md hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  表示名
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="あなたの名前"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-[14px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  他のメンバーに表示される名前です
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  自己紹介
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="あなたについて..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-[14px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "保存中..." : "プロフィールを保存"}
                </button>
              </div>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">アカウント情報</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1">メールアドレス</div>
                <div className="text-[14px] text-slate-900 dark:text-slate-100">{user?.email ?? "未設定"}</div>
              </div>

              <div>
                <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1">ロール</div>
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                    {profile?.role ?? "member"}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1">ユーザーID</div>
                <div className="text-[12px] text-slate-600 dark:text-slate-400 font-mono">{user?.id}</div>
              </div>
            </div>
          </div>

          {/* Presence Card */}
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">ステータス</h2>
            </div>

            <div className="p-6">
              <div className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-3">現在のステータス</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePresenceChange("working")}
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors",
                    presenceStatus === "working"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-2 border-green-500"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-2 h-2 rounded-full",
                      presenceStatus === "working" ? "bg-green-500" : "bg-slate-400",
                    ].join(" ")}
                  />
                  オンライン
                </button>

                <button
                  type="button"
                  onClick={() => handlePresenceChange("away")}
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors",
                    presenceStatus === "away"
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-2 border-amber-500"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-2 h-2 rounded-full",
                      presenceStatus === "away" ? "bg-amber-500" : "bg-slate-400",
                    ].join(" ")}
                  />
                  離席中
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
