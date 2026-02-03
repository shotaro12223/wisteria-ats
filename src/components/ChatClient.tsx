"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Room = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  icon_url?: string | null;
  description?: string | null;
  background_color?: string | null;
  muted?: boolean;
  muted_until?: string | null;
  pinned?: boolean;
  my_role?: "admin" | "member";
};

type RoomMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  joined_at: string;
};

type User = {
  id: string;
  display_name?: string | null;
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type Attachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

type Reaction = {
  id: string;
  emoji: string;
  user_id: string;
};

type Msg = {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  mentions?: string[];
  reply_to?: string | null;
  attachments?: Attachment[];
  user?: User | null;
  reactions?: Reaction[];
  reply_to_data?: { id: string; user_id: string; body: string } | null;
};

type MemberUser = {
  user_id: string;
  display_name: string | null;
  avatar_url?: string | null;
  role: string;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "今";
  if (diffMins < 60) return `${diffMins}分前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}時間前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getUserName(user: User | null | undefined): string {
  if (!user) return "Unknown";
  return (
    user.display_name ||
    user.name ||
    user.full_name ||
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null) ||
    user.first_name ||
    user.username ||
    user.email ||
    "Unknown"
  );
}

function getInitials(user: User | null | undefined): string {
  const name = getUserName(user);
  if (name === "Unknown") return "??";
  return name.slice(0, 2).toUpperCase();
}

export default function ChatClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [messageText, setMessageText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // For filtering room names
  const [messageSearchQuery, setMessageSearchQuery] = useState(""); // For searching messages
  const [searchResults, setSearchResults] = useState<Msg[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("新規グループ");
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);

  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [roomIconUrl, setRoomIconUrl] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomBgColor, setRoomBgColor] = useState("#ffffff");
  const [isRoomMuted, setIsRoomMuted] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [myRoleInRoom, setMyRoleInRoom] = useState<"admin" | "member">("member");

  const iconInputRef = useRef<HTMLInputElement>(null);

  const [filesOpen, setFilesOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [fileFilter, setFileFilter] = useState<"all" | "image" | "video" | "document">("all");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [selectedForwardRoomIds, setSelectedForwardRoomIds] = useState<string[]>([]);

  const [readersOpen, setReadersOpen] = useState(false);
  const [readers, setReaders] = useState<any[]>([]);
  const [readersMessageId, setReadersMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitializedRef = useRef(false);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const previousMessagesRef = useRef<Map<string, Set<string>>>(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function requestNotificationPermission() {
    if ("Notification" in window) {
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);

      if (currentPermission === "default") {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      }
    }
  }

  function showMessageNotification(message: Msg, room: Room) {
    if ("Notification" in window && Notification.permission === "granted") {
      const senderName = getUserName(message.user);
      const isFromMe = message.user_id === currentUserId;

      // Don't notify for own messages
      if (isFromMe) return;

      const title = room.type === "direct"
        ? `${senderName}からメッセージ`
        : `${room.name || "グループ"}に新着メッセージ`;

      const body = message.body.length > 100
        ? message.body.slice(0, 100) + "..."
        : message.body;

      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `chat-${room.id}-${message.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        setSelectedRoomId(room.id);
        notification.close();
      };
    }
  }


  async function fetchRooms() {
    const r = await fetch("/api/chat/rooms", { credentials: "include" });
    const j = await r.json();
    if (!j?.ok) {
      console.error("Failed to fetch rooms:", j);
      return [];
    }
    const items = j.items ?? [];

    // Debug: log all rooms data
    console.log("All rooms data:", items);

    // Debug: log rooms with unread counts
    const roomsWithUnread = items.filter((room: Room) => (room.unread_count || 0) > 0);
    if (roomsWithUnread.length > 0) {
      console.log("Rooms with unread messages:", roomsWithUnread.map((r: Room) => ({
        id: r.id,
        name: r.name,
        unread_count: r.unread_count
      })));
    }

    // Debug: log pinned rooms
    const pinnedRooms = items.filter((room: Room) => room.pinned);
    console.log("🔖 Pinned rooms from API:", pinnedRooms.map((r: Room) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      pinned: r.pinned
    })));

    // Detect new messages and show notifications
    const previousRooms = rooms;
    items.forEach((newRoom: Room) => {
      const prevRoom = previousRooms.find((r) => r.id === newRoom.id);

      // Check if this room has new unread messages
      if (prevRoom && newRoom.unread_count && newRoom.unread_count > (prevRoom.unread_count || 0)) {
        // Don't notify for muted rooms or the currently selected room
        if (newRoom.id !== selectedRoomId) {
          // Fetch the latest message to show in notification
          fetchLatestMessageForNotification(newRoom);
        }
      }
    });

    setRooms(items);
    return items;
  }

  async function fetchLatestMessageForNotification(room: Room) {
    try {
      const r = await fetch(`/api/chat/rooms/${room.id}/messages`, { credentials: "include" });
      const j = await r.json();
      if (!j?.ok || !j.items || j.items.length === 0) return;

      const latestMessage = j.items[j.items.length - 1];

      // Check if we've already seen this message
      const roomPreviousMessages = previousMessagesRef.current.get(room.id) || new Set();
      if (!roomPreviousMessages.has(latestMessage.id)) {
        showMessageNotification(latestMessage, room);

        // Update tracked messages
        roomPreviousMessages.add(latestMessage.id);
        previousMessagesRef.current.set(room.id, roomPreviousMessages);
      }
    } catch (e) {
      console.error("Failed to fetch latest message for notification:", e);
    }
  }

  async function fetchMessages(roomId: string, shouldMarkRead = true) {
    const r = await fetch(`/api/chat/rooms/${roomId}/messages`, { credentials: "include" });
    const j = await r.json();
    if (!j?.ok) return;
    const msgs = j.items ?? [];
    setMessages(msgs);

    // Track all messages in this room as seen
    const roomMessages = previousMessagesRef.current.get(roomId) || new Set();
    msgs.forEach((msg: Msg) => roomMessages.add(msg.id));
    previousMessagesRef.current.set(roomId, roomMessages);

    if (shouldMarkRead) {
      await markAsRead(roomId);
    }
  }

  async function markAsRead(roomId: string) {
    try {
      console.log("Marking room as read:", roomId);
      const r = await fetch(`/api/chat/rooms/${roomId}/read`, {
        method: "PUT",
        credentials: "include",
      });
      const j = await r.json();
      console.log("Mark as read response:", j);
      if (j?.ok) {
        setTimeout(() => {
          fetchRooms();
        }, 300);
      }
    } catch (e) {
      console.error("markAsRead error:", e);
    }
  }

  async function fetchUsers(q: string) {
    const u = new URLSearchParams();
    if (q.trim()) u.set("q", q.trim());
    const r = await fetch(`/api/chat/users?${u.toString()}`, { credentials: "include" });
    const j = await r.json();
    if (!j?.ok) return;
    setUsers(j.items ?? []);
  }

  async function searchMessages() {
    const u = new URLSearchParams();
    u.set("q", messageSearchQuery);
    if (selectedRoomId) u.set("room_id", selectedRoomId);
    const r = await fetch(`/api/chat/search?${u.toString()}`, { credentials: "include" });
    const j = await r.json();
    if (!j?.ok) return;
    setSearchResults(j.items ?? []);
  }

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.user) setCurrentUserId(j.user.id);
      })
      .catch(console.error);

    // Request notification permission on mount
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    fetchRooms().then((items) => {
      if (!hasInitializedRef.current && !selectedRoomId && items.length > 0) {
        setSelectedRoomId(items[0].id);
        hasInitializedRef.current = true;
      }
    });
    const interval = setInterval(() => {
      fetchRooms();
      if (selectedRoomId) fetchMessages(selectedRoomId, false);
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    fetchMessages(selectedRoomId);
    fetchPinnedMessages(selectedRoomId);
    if (filesOpen) fetchFiles(selectedRoomId, fileFilter);

    // ルーム切り替え時は下にスクロール（一回だけ）
    setTimeout(scrollToBottom, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) return;
    // Update mute status when room changes
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (room) {
      setIsRoomMuted(room.muted || false);
    }
  }, [selectedRoomId, rooms]);

  useEffect(() => {
    if (!selectedRoomId || !filesOpen) return;
    fetchFiles(selectedRoomId, fileFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileFilter, filesOpen]);

  useEffect(() => {
    if (!settingsOpen || !selectedRoomId) return;
    // Load current room settings
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;

    console.log("⚙️ Settings opened for room:", {
      id: room.id,
      name: room.name,
      type: room.type,
      my_role: room.my_role
    });

    setRoomIconUrl(room.icon_url || "");
    setRoomDescription(room.description || "");
    setRoomBgColor(room.background_color || "#ffffff");

    // Load members for group chats
    if (room.type === "group") {
      console.log("⚙️ This is a group, fetching members...");
      fetchRoomMembers(selectedRoomId);
    } else {
      console.log("⚙️ This is NOT a group (type:", room.type, "), skipping member fetch");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, selectedRoomId, rooms]);

  useEffect(() => {
    if (!createOpen) return;
    fetchUsers(userQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, userQuery]);

  useEffect(() => {
    if (messageSearchQuery.trim()) {
      const timeout = setTimeout(() => {
        searchMessages();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageSearchQuery, selectedRoomId]);

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);

  const filteredRooms = useMemo(() => {
    let filtered = rooms;

    // Filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = rooms.filter((r) => {
        const roomName = r.type === "group" ? (r.name || "グループ") : `@ ${r.name || "個人チャット"}`;
        return roomName.toLowerCase().includes(query);
      });
    }

    // Sort: pinned rooms first, then by last message time
    // IMPORTANT: Create a copy before sorting to avoid mutating state
    return [...filtered].sort((a, b) => {
      // Pinned rooms come first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // Within same pinned status, sort by last message time
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [rooms, searchQuery]);

  async function sendMessage() {
    if (!selectedRoomId) return;
    const text = messageText.trim();
    if (!text && attachments.length === 0) return;

    const currentReplyTo = replyTo;
    const currentAttachments = [...attachments];

    setMessageText("");
    setAttachments([]);
    setReplyTo(null);

    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        body: text || " ",
        mentions: [],
        reply_to: currentReplyTo?.id || null,
        attachments: currentAttachments,
      }),
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "failed");
      return;
    }
    await fetchMessages(selectedRoomId);
  }

  function toggleUser(id: string) {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createRoom() {
    if (createMode === "direct") {
      if (selectedUserIds.length !== 1) {
        alert("個チャは相手を1人選んでください");
        return;
      }
      const r = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "direct", otherUserId: selectedUserIds[0] }),
      });
      const j = await r.json();
      if (!j?.ok) {
        const errorMsg = typeof j?.error === "string"
          ? j.error
          : j?.error?.message || JSON.stringify(j?.error) || "ルーム作成に失敗しました";
        return alert(errorMsg);
      }

      setCreateOpen(false);
      setSelectedUserIds([]);
      await fetchRooms();
      setSelectedRoomId(j.item.id);
      return;
    }

    if (selectedUserIds.length < 1) {
      alert("グループはメンバーを1人以上選んでください");
      return;
    }
    const name = groupName.trim();
    if (!name) return alert("グループ名を入れてください");

    const r = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "group", name, memberUserIds: selectedUserIds }),
    });
    const j = await r.json();
    if (!j?.ok) {
      const errorMsg = typeof j?.error === "string"
        ? j.error
        : j?.error?.message || JSON.stringify(j?.error) || "グループ作成に失敗しました";
      return alert(errorMsg);
    }

    setCreateOpen(false);
    setSelectedUserIds([]);
    await fetchRooms();
    setSelectedRoomId(j.item.id);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const r = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const j = await r.json();
      setUploading(false);

      if (!j?.ok) {
        alert(`アップロード失敗: ${j?.error ?? "unknown error"}`);
        console.error("Upload error:", j);
        return;
      }

      setAttachments((prev) => [...prev, j.file]);
    } catch (err) {
      setUploading(false);
      alert("アップロード失敗");
      console.error("Upload exception:", err);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function addReaction(messageId: string, emoji: string) {
    if (!selectedRoomId) return;
    await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ emoji }),
    });
    await fetchMessages(selectedRoomId);
    setShowEmojiPicker(null);
  }

  async function removeReaction(messageId: string, emoji: string) {
    if (!selectedRoomId) return;
    await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetchMessages(selectedRoomId);
  }

  async function editMessage(messageId: string, newBody: string) {
    if (!selectedRoomId) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body: newBody }),
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "編集に失敗しました");
      return;
    }
    setEditingMessageId(null);
    setEditText("");
    await fetchMessages(selectedRoomId);
  }

  async function deleteMessage(messageId: string) {
    if (!selectedRoomId) return;
    if (!confirm("このメッセージを削除しますか？")) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "削除に失敗しました");
      return;
    }
    await fetchMessages(selectedRoomId);
  }

  function copyMessageText(body: string) {
    navigator.clipboard.writeText(body).then(
      () => {
        alert("コピーしました");
      },
      (err) => {
        console.error("コピー失敗:", err);
        alert("コピーに失敗しました");
      }
    );
  }

  async function fetchPinnedMessages(roomId: string) {
    const r = await fetch(`/api/chat/rooms/${roomId}/pinned`, { credentials: "include" });
    const j = await r.json();
    if (j?.ok) {
      setPinnedMessages(j.items ?? []);
    }
  }

  async function pinMessage(messageId: string) {
    if (!selectedRoomId) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/pin`, {
      method: "POST",
      credentials: "include",
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "ピン留めに失敗しました");
      return;
    }
    await fetchPinnedMessages(selectedRoomId);
  }

  async function unpinMessage(messageId: string) {
    if (!selectedRoomId) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/pin`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "ピン解除に失敗しました");
      return;
    }
    await fetchPinnedMessages(selectedRoomId);
  }

  async function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルのみアップロードできます");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploadingIcon(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const r = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const j = await r.json();
      setUploadingIcon(false);

      if (!j?.ok) {
        alert(`アップロード失敗: ${j?.error ?? "unknown error"}`);
        console.error("Upload error:", j);
        return;
      }

      setRoomIconUrl(j.file.url);
    } catch (err) {
      setUploadingIcon(false);
      alert("アップロード失敗");
      console.error("Upload exception:", err);
    }

    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }
  }

  async function updateRoomSettings() {
    if (!selectedRoomId) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        icon_url: roomIconUrl || null,
        description: roomDescription || null,
        background_color: roomBgColor,
      }),
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "設定の更新に失敗しました");
      return;
    }

    // Update the room in the rooms list immediately with the response data
    if (j.item) {
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === selectedRoomId
            ? {
                ...room,
                icon_url: j.item.icon_url,
                description: j.item.description,
                background_color: j.item.background_color,
                name: j.item.name,
              }
            : room
        )
      );
    }

    setSettingsOpen(false);
    await fetchRooms();
  }

  async function toggleMute() {
    if (!selectedRoomId) return;
    const newMuted = !isRoomMuted;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/mute`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ muted: newMuted }),
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "ミュート設定に失敗しました");
      return;
    }
    setIsRoomMuted(newMuted);

    // Update the room in the rooms list
    setRooms((prevRooms) =>
      prevRooms.map((room) =>
        room.id === selectedRoomId
          ? {
              ...room,
              muted: newMuted,
            }
          : room
      )
    );
  }

  async function toggleRoomPin(roomId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const newPinned = !room.pinned;
    console.log(`🔖 Toggling pin for room ${room.name} (${roomId}):`, {
      currentPinned: room.pinned,
      newPinned: newPinned
    });

    const r = await fetch(`/api/chat/rooms/${roomId}/pin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pinned: newPinned }),
    });
    const j = await r.json();

    console.log(`🔖 API response for pin toggle:`, j);

    if (!j?.ok) {
      console.error(`🔖 Pin toggle failed:`, j);
      alert(j?.error ?? "ピン留め設定に失敗しました");
      return;
    }

    // Update the room in the rooms list
    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              pinned: newPinned,
            }
          : r
      )
    );

    console.log(`🔖 Local state updated. Room ${room.name} pinned:`, newPinned);
  }

  async function fetchRoomMembers(roomId: string) {
    console.log("👥 Fetching room members for:", roomId);

    try {
      const r = await fetch(`/api/chat/rooms/${roomId}/members`, { credentials: "include" });
      const j = await r.json();

      console.log("👥 Members response:", j);

      if (j?.ok) {
        setRoomMembers(j.items ?? []);
        setMyRoleInRoom(j.my_role || "member");
        console.log("👥 Members loaded:", j.items?.length, "My role:", j.my_role);
      } else {
        console.error("👥 Failed to fetch members:", j);
      }
    } catch (err) {
      console.error("👥 Error fetching members:", err);
    }
  }

  async function updateMemberRole(roomId: string, targetUserId: string, role: "admin" | "member") {
    console.log("👥 Updating member role:", { roomId, targetUserId, role });

    try {
      const r = await fetch(`/api/chat/rooms/${roomId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target_user_id: targetUserId, role }),
      });

      console.log("👥 Response status:", r.status);
      const j = await r.json();
      console.log("👥 Response data:", j);

      if (!j?.ok) {
        alert(j?.error ?? "役職の変更に失敗しました");
        return;
      }

      alert("役職を変更しました");
      // Refresh members list
      await fetchRoomMembers(roomId);
    } catch (err) {
      console.error("👥 Error updating member role:", err);
      alert("役職の変更中にエラーが発生しました");
    }
  }

  async function removeMember(roomId: string, targetUserId: string) {
    console.log("👥 Removing member:", { roomId, targetUserId });

    if (!confirm("このメンバーを退会させますか？")) {
      console.log("👥 Remove cancelled");
      return;
    }

    try {
      const r = await fetch(`/api/chat/rooms/${roomId}/members?user_id=${targetUserId}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("👥 Response status:", r.status);
      const j = await r.json();
      console.log("👥 Response data:", j);

      if (!j?.ok) {
        alert(j?.error ?? "メンバーの退会に失敗しました");
        return;
      }

      alert("メンバーを退会させました");
      // Refresh members list
      await fetchRoomMembers(roomId);
    } catch (err) {
      console.error("👥 Error removing member:", err);
      alert("メンバー退会中にエラーが発生しました");
    }
  }

  async function fetchFiles(roomId: string, filter: string = "all") {
    const u = new URLSearchParams();
    if (filter !== "all") u.set("type", filter);
    const r = await fetch(`/api/chat/rooms/${roomId}/files?${u.toString()}`, { credentials: "include" });
    const j = await r.json();
    if (j?.ok) {
      setFiles(j.items ?? []);
    }
  }

  async function forwardMessage(messageId: string, targetRoomIds: string[]) {
    if (!selectedRoomId) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetRoomIds }),
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "転送に失敗しました");
      return;
    }
    setForwardOpen(false);
    setSelectedForwardRoomIds([]);
    alert(`${j.forwarded_count}件のルームに転送しました`);
  }

  async function fetchReaders(messageId: string) {
    if (!selectedRoomId) return;
    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/messages/${messageId}/readers`, { credentials: "include" });
    const j = await r.json();
    if (j?.ok) {
      setReaders(j.readers ?? []);
      setReadersMessageId(messageId);
      setReadersOpen(true);
    }
  }

  async function leaveRoom() {
    if (!selectedRoomId || !selectedRoom) return;
    if (!confirm(`${selectedRoom.name || "このグループ"}から退会しますか？`)) return;

    const r = await fetch(`/api/chat/rooms/${selectedRoomId}/leave`, {
      method: "POST",
      credentials: "include",
    });
    const j = await r.json();
    if (!j?.ok) {
      alert(j?.error ?? "退会に失敗しました");
      return;
    }

    if (j.deleted) {
      alert("最後のメンバーまたは作成者のため、ルームが削除されました");
    } else {
      alert("グループから退会しました");
    }

    setSelectedRoomId(null);
    await fetchRooms();
  }

  async function deleteRoom() {
    if (!selectedRoomId || !selectedRoom) return;

    const confirmMsg = selectedRoom.type === "direct"
      ? `${selectedRoom.name || "この個人チャット"}を削除しますか？`
      : `${selectedRoom.name || "このグループ"}を削除しますか？全メンバーから削除されます。`;

    if (!confirm(confirmMsg)) return;

    console.log("Deleting room:", selectedRoomId, selectedRoom);

    const r = await fetch(`/api/chat/rooms/${selectedRoomId}`, {
      method: "DELETE",
      credentials: "include",
    });

    console.log("Delete response status:", r.status);
    const j = await r.json();
    console.log("Delete response:", j);

    if (!j?.ok) {
      alert(j?.error ?? "削除に失敗しました");
      console.error("Delete failed:", j);
      return;
    }

    alert(selectedRoom.type === "direct" ? "個人チャットを削除しました" : "グループを削除しました");
    setSelectedRoomId(null);
    await fetchRooms();
  }

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);

  return (
    <div className="h-[calc(100vh-88px)] flex bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 rounded-xl overflow-hidden shadow-lg border border-slate-200/60 dark:border-slate-700/60">
      {/* Sidebar */}
      <aside className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200/80 dark:border-slate-700 flex flex-col shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-white dark:text-slate-100 tracking-tight">チャット</h1>
              {totalUnread > 0 && <div className="text-[10px] text-slate-300 dark:text-slate-400">{totalUnread}件の未読</div>}
            </div>
            <button
              className="px-2.5 py-1.5 rounded-md bg-white/95 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium hover:bg-white dark:hover:bg-slate-600 hover:shadow-md transition-all shadow-sm backdrop-blur"
              onClick={() => {
                setCreateOpen(true);
                setCreateMode("direct");
                setSelectedUserIds([]);
                setUserQuery("");
              }}
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規
            </button>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {notificationPermission === "default" && (
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="flex-1 min-w-0">
                <button
                  className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline font-medium"
                  onClick={requestNotificationPermission}
                >
                  通知を有効化
                </button>
              </div>
            </div>
          </div>
        )}
        {notificationPermission === "denied" && (
          <div className="p-2 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-red-800 dark:text-red-400">通知ブロック中</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-2 border-b border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
          <input
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-300/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 focus:border-blue-300/50 dark:focus:border-blue-500/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="ルームを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto">
          {filteredRooms.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div>{rooms.length === 0 ? "まだルームがありません" : "検索結果なし"}</div>
              {rooms.length === 0 && <div className="text-xs mt-1">右上の「新規」から作成</div>}
            </div>
          ) : (
            filteredRooms.map((r) => (
              <div
                key={r.id}
                className={cx(
                  "w-full px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative group",
                  selectedRoomId === r.id && "bg-gradient-to-r from-blue-200/10 via-slate-50/50 to-purple-200/10 dark:from-blue-900/20 dark:via-slate-800/50 dark:to-purple-900/20 border-l-4 border-l-slate-300 dark:border-l-slate-600"
                )}
              >
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedRoomId(r.id);
                    setSearchOpen(false);
                  }}
                >
                  {/* Room Icon */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-200/14 via-slate-50 to-purple-200/12 dark:from-blue-900/20 dark:via-slate-700 dark:to-purple-900/20 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium flex-shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                    {r.icon_url ? (
                      <img src={r.icon_url} alt={r.name || "Room icon"} className="w-full h-full object-cover" />
                    ) : r.type === "group" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>

                  {/* Room Info */}
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {r.type === "group" ? (r.name || "グループ") : `@ ${r.name || "個人チャット"}`}
                        </div>
                        {(r.unread_count || 0) > 0 && (
                          <span className="px-1 py-0.5 rounded-full bg-red-500 dark:bg-red-600 text-white text-[8px] font-bold min-w-[14px] text-center">
                            {r.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{r.last_message_preview || "メッセージなし"}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Pin button */}
                      <button
                        className={cx(
                          "p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0",
                          r.pinned ? "text-yellow-600 dark:text-yellow-500" : "text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRoomPin(r.id);
                        }}
                        title={r.pinned ? "ピン留め解除" : "ピン留め"}
                      >
                        <svg className="w-3.5 h-3.5" fill={r.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                      {r.last_message_at && <div className="text-[8px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatTime(r.last_message_at)}</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedRoom && (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200/14 via-slate-50 to-purple-200/12 dark:from-blue-900/20 dark:via-slate-700 dark:to-purple-900/20 flex items-center justify-center text-slate-600 dark:text-slate-300 overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                  {selectedRoom.icon_url ? (
                    <img src={selectedRoom.icon_url} alt="Room icon" className="w-full h-full object-cover" />
                  ) : selectedRoom.type === "group" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {selectedRoom.type === "group" ? selectedRoom.name || "グループ" : selectedRoom.name || "個人チャット"}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{selectedRoom.type === "group" ? "グループチャット" : "ダイレクトメッセージ"}</div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <button
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
              onClick={() => setShowPinned(!showPinned)}
              title="ピン留めメッセージ"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
              onClick={() => setSettingsOpen(true)}
              title="ルーム設定"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              className={cx(
                "p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                isRoomMuted ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30" : "text-slate-600 dark:text-slate-300"
              )}
              onClick={toggleMute}
              title={isRoomMuted ? "ミュート解除" : "ミュート"}
            >
              {isRoomMuted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
              onClick={() => {
                setFilesOpen(!filesOpen);
                setSearchOpen(false);
              }}
              title="ファイル一覧"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 flex items-center gap-1"
              onClick={() => {
                setSearchOpen(!searchOpen);
                setFilesOpen(false);
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs font-medium">検索</span>
            </button>
          </div>
        </div>

        {/* Pinned Messages Panel */}
        {showPinned && pinnedMessages.length > 0 && (
          <div className="border-b border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/20 p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                ピン留め ({pinnedMessages.length})
              </div>
              <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" onClick={() => setShowPinned(false)}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-auto">
              {pinnedMessages.map((pin: any) => (
                <div key={pin.pin_id} className="bg-white dark:bg-slate-800 p-2 rounded border border-yellow-200 dark:border-yellow-700/50 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {getUserName(pin.message.user)} • {formatTime(pin.message.created_at)}
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 truncate">{pin.message.body}</div>
                    </div>
                    <button
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      onClick={() => unpinMessage(pin.message.id)}
                    >
                      解除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto px-4 py-3 space-y-2.5 bg-slate-50 dark:bg-slate-900">
          {!selectedRoomId ? (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div className="text-base font-medium">左からルームを選んでください</div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <div className="text-base font-medium">まだメッセージがありません</div>
                <div className="text-sm mt-1">最初のメッセージを送ってみましょう</div>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.user_id === currentUserId;
              const userName = getUserName(m.user);
              const initials = getInitials(m.user);

              return (
                <div key={m.id} className={cx("flex gap-3", isMe && "flex-row-reverse")}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200/14 via-slate-100 to-purple-200/12 dark:from-blue-900/20 dark:via-slate-700 dark:to-purple-900/20 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs flex-shrink-0 border border-slate-200/40 dark:border-slate-600/50 overflow-hidden">
                    {m.user?.avatar_url ? (
                      <img src={m.user.avatar_url} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <div className={cx("flex-1 max-w-2xl", isMe && "flex flex-col items-end")}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={cx("text-sm font-medium", isMe ? "text-slate-700 dark:text-slate-300" : "text-slate-700 dark:text-slate-300")}>{isMe ? "あなた" : userName}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatTime(m.created_at)}</span>
                      {m.edited_at && <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">(編集済み)</span>}
                    </div>

                    {m.reply_to_data && (
                      <div className="mb-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border-l-4 border-slate-300 dark:border-slate-600 rounded text-xs text-slate-600 dark:text-slate-400">
                        <div className="font-semibold">返信先:</div>
                        <div className="truncate">{m.reply_to_data.body}</div>
                      </div>
                    )}

                    {editingMessageId === m.id ? (
                      <div className="w-full">
                        <textarea
                          className="w-full border-2 border-slate-300/80 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 focus:border-blue-300/50 dark:focus:border-blue-500/50 transition-colors"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-4 py-1.5 rounded-md bg-gradient-to-r from-blue-200/14 to-purple-200/12 dark:from-blue-900/30 dark:to-purple-900/30 text-slate-800 dark:text-slate-200 text-sm font-medium hover:from-blue-200/18 hover:to-purple-200/16 dark:hover:from-blue-900/40 dark:hover:to-purple-900/40 shadow-sm border border-blue-200/20 dark:border-blue-700/30"
                            onClick={() => editMessage(m.id, editText)}
                          >
                            保存
                          </button>
                          <button
                            className="px-4 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditText("");
                            }}
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cx(
                          "inline-block px-4 py-2 rounded-xl",
                          isMe ? "bg-gradient-to-r from-blue-200/14 to-purple-200/12 dark:from-blue-900/30 dark:to-purple-900/30 text-slate-800 dark:text-slate-200 border border-blue-200/20 dark:border-blue-700/30 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-sm"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>

                      {(m.attachments ?? []).length > 0 && (
                        <div className="mt-2 space-y-2">
                          {m.attachments!.map((att, i) => {
                            const isImage = att.type?.startsWith("image/");
                            const isVideo = att.type?.startsWith("video/");

                            if (isImage) {
                              return (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              );
                            }

                            if (isVideo) {
                              return (
                                <video
                                  key={i}
                                  src={att.url}
                                  controls
                                  className="max-w-xs max-h-64 rounded-lg"
                                />
                              );
                            }

                            return (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cx(
                                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                                  isMe ? "bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20" : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                                )}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {att.name} ({(att.size / 1024).toFixed(1)}KB)
                              </a>
                            );
                          })}
                        </div>
                      )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      {(m.reactions ?? []).length > 0 && (
                        <div className="flex gap-1">
                          {Object.entries(
                            (m.reactions ?? []).reduce((acc: any, r: Reaction) => {
                              if (!acc[r.emoji]) acc[r.emoji] = [];
                              acc[r.emoji].push(r);
                              return acc;
                            }, {})
                          ).map(([emoji, reacts]: [string, any]) => {
                            const hasReacted = reacts.some((r: Reaction) => r.user_id === currentUserId);
                            return (
                              <button
                                key={emoji}
                                className={cx(
                                  "px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors",
                                  hasReacted ? "bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                )}
                                onClick={() => {
                                  if (hasReacted) {
                                    removeReaction(m.id, emoji);
                                  } else {
                                    addReaction(m.id, emoji);
                                  }
                                }}
                              >
                                <span>{emoji}</span>
                                <span className="font-medium">{reacts.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <button
                        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)}
                        title="リアクション"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      <button
                        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => setReplyTo(m)}
                        title="返信"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>

                      {selectedRoom && selectedRoom.type === "group" && (
                        <>
                          <button
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1"
                            onClick={() => fetchReaders(m.id)}
                            title="既読"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => pinMessage(m.id)}
                            title="ピン留め"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        </>
                      )}

                      {isMe && (
                        <div className="relative">
                          <button
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => setShowMessageMenu(showMessageMenu === m.id ? null : m.id)}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {showMessageMenu === m.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => {
                                  pinMessage(m.id);
                                  setShowMessageMenu(null);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                ピン留め
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => {
                                  setEditingMessageId(m.id);
                                  setEditText(m.body);
                                  setShowMessageMenu(null);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                編集
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => {
                                  deleteMessage(m.id);
                                  setShowMessageMenu(null);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                削除
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => {
                                  copyMessageText(m.body);
                                  setShowMessageMenu(null);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                コピー
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                onClick={() => {
                                  setForwardMessageId(m.id);
                                  setForwardOpen(true);
                                  setShowMessageMenu(null);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                転送
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {showEmojiPicker === m.id && (
                      <div className="mt-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg flex gap-1">
                        {["👍", "❤️", "😊", "🎉", "👏", "🔥", "✅", "💯"].map((emoji) => (
                          <button
                            key={emoji}
                            className="px-2 py-1 text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            onClick={() => addReaction(m.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          {replyTo && (
            <div className="mb-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-between">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium">返信先:</span> {replyTo.body.slice(0, 50)}
              </div>
              <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" onClick={() => setReplyTo(null)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md text-xs flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-slate-800 dark:text-slate-200">{att.name}</span>
                  <button className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400" onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="ファイルを添付"
            >
              {uploading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>

            <input
              className="flex-1 border border-slate-300/80 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 focus:border-blue-300/50 dark:focus:border-blue-500/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="px-4 py-1.5 rounded-md bg-gradient-to-r from-blue-200/14 to-purple-200/12 dark:from-blue-900/30 dark:to-purple-900/30 text-slate-800 dark:text-slate-200 text-sm font-medium hover:from-blue-200/18 hover:to-purple-200/16 dark:hover:from-blue-900/40 dark:hover:to-purple-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-blue-200/20 dark:border-blue-700/30"
              onClick={sendMessage}
              disabled={!messageText.trim() && attachments.length === 0}
            >
              送信
            </button>
          </div>
        </div>
      </main>

      {/* Search Panel */}
      {searchOpen && (
        <aside className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-lg">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-700 dark:text-slate-300">検索結果</div>
              <button className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" onClick={() => setSearchOpen(false)}>
                ✕
              </button>
            </div>
            <input
              type="text"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300/80 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 focus:border-blue-300/50 dark:focus:border-blue-500/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder={selectedRoom ? `${selectedRoom.type === "group" ? selectedRoom.name || "グループ" : selectedRoom.name || "個人チャット"}内を検索...` : "メッセージを検索..."}
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {searchResults.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center mt-8">{messageSearchQuery.trim() ? "検索結果なし" : "検索ワードを入力してください"}</div>
            ) : (
              searchResults.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer border border-slate-200 dark:border-slate-600"
                  onClick={() => {
                    setSelectedRoomId(m.room_id);
                    setSearchOpen(false);
                    setMessageSearchQuery("");
                  }}
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{formatTime(m.created_at)}</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2">{m.body}</div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* Files Panel */}
      {filesOpen && (
        <aside className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-lg">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-700 dark:text-slate-300">ファイル一覧</div>
              <button className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" onClick={() => setFilesOpen(false)}>
                ✕
              </button>
            </div>
            <div className="flex gap-2">
              {(["all", "image", "video", "document"] as const).map((filter) => (
                <button
                  key={filter}
                  className={cx(
                    "px-2 py-1 rounded text-xs font-semibold transition-colors",
                    fileFilter === filter
                      ? "bg-indigo-600 dark:bg-indigo-700 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                  )}
                  onClick={() => setFileFilter(filter)}
                >
                  {filter === "all" ? "すべて" : filter === "image" ? "画像" : filter === "video" ? "動画" : "ドキュメント"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {files.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center mt-8">ファイルなし</div>
            ) : (
              files.map((file, idx) => {
                const isImage = file.type?.startsWith("image/");
                return (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    {isImage ? (
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                        <img src={file.url} alt={file.name} className="w-full h-32 object-cover rounded" />
                      </a>
                    ) : (
                      <div className="mb-2 text-2xl">📄</div>
                    )}
                    <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold truncate">{file.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {getUserName(file.user)} • {formatTime(file.created_at)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(1)}KB</div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">新規ルーム作成</h2>
                <button className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg px-3 py-1 transition-colors" onClick={() => setCreateOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-3 mb-4">
                <button
                  className={cx(
                    "flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                    createMode === "direct"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white shadow-md"
                      : "border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                  onClick={() => {
                    setCreateMode("direct");
                    setSelectedUserIds([]);
                  }}
                >
                  @ 個人チャット
                </button>
                <button
                  className={cx(
                    "flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                    createMode === "group"
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white shadow-md"
                      : "border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                  onClick={() => {
                    setCreateMode("group");
                    setSelectedUserIds([]);
                  }}
                >
                  # グループ
                </button>
              </div>

              {createMode === "group" && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">グループ名</label>
                  <input
                    className="w-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">メンバーを選択</label>
                <input
                  className="w-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="名前で検索..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>

              <div className="max-h-80 overflow-auto border-2 border-slate-200 dark:border-slate-700 rounded-xl">
                {users.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500 dark:text-slate-400 text-center">ユーザーが見つかりません</div>
                ) : (
                  users.map((u) => {
                    const checked = selectedUserIds.includes(u.user_id);
                    const userObj = { id: u.user_id, display_name: u.display_name, avatar_url: u.avatar_url, email: null };
                    const label = u.display_name || u.user_id.slice(0, 8);
                    return (
                      <label
                        key={u.user_id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-indigo-600 dark:accent-indigo-500"
                          checked={checked}
                          onChange={() => {
                            if (createMode === "direct") {
                              setSelectedUserIds(checked ? [] : [u.user_id]);
                            } else {
                              toggleUser(u.user_id);
                            }
                          }}
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 dark:from-indigo-500 dark:to-purple-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={label} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(userObj)}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{u.role}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="px-6 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setCreateOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 transition-all shadow-md"
                  onClick={createRoom}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Settings Modal */}
      {settingsOpen && selectedRoom && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">ルーム設定</h2>
                <button className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg px-3 py-1 transition-colors" onClick={() => setSettingsOpen(false)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">グループアイコン</label>
                <div className="flex items-center gap-4">
                  {roomIconUrl && (
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-300 flex-shrink-0">
                      <img src={roomIconUrl} alt="Icon preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={iconInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleIconUpload}
                    />
                    <button
                      className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      onClick={() => iconInputRef.current?.click()}
                      disabled={uploadingIcon}
                    >
                      {uploadingIcon ? "アップロード中..." : roomIconUrl ? "画像を変更" : "画像を選択"}
                    </button>
                    {roomIconUrl && (
                      <button
                        className="ml-2 px-4 py-2 rounded-lg border-2 border-red-300 dark:border-red-700 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        onClick={() => setRoomIconUrl("")}
                      >
                        削除
                      </button>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      推奨: 正方形の画像、5MB以下
                    </div>
                  </div>
                </div>
              </div>

              {/* Members List (Group only) */}
              {selectedRoom.type === "group" && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">
                    メンバー ({roomMembers.length}) -
                    {myRoleInRoom === "admin" ? "あなたはアドミン" : "あなたはメンバー"}
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {roomMembers.length === 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 p-2">
                        メンバー情報を読み込んでいます...
                      </div>
                    )}
                    {roomMembers.map((member) => {
                      const showButtons = myRoleInRoom === "admin" && member.user_id !== currentUserId;
                      console.log("👥 Member render:", {
                        user: member.display_name,
                        role: member.role,
                        myRole: myRoleInRoom,
                        currentUser: currentUserId,
                        memberUserId: member.user_id,
                        showButtons
                      });
                      return (
                      <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200/40 via-slate-50 to-purple-200/30 dark:from-blue-900/20 dark:via-slate-700 dark:to-purple-900/20 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm">{member.display_name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{member.display_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {member.role === "admin" ? "アドミン" : "メンバー"}
                            </div>
                          </div>
                        </div>
                        {showButtons && (
                          <div className="flex gap-1">
                            <button
                              className="px-2 py-1 rounded text-xs font-semibold border-2 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                              onClick={() => {
                                console.log("🔘 昇格/降格 button clicked");
                                updateMemberRole(selectedRoomId!, member.user_id, member.role === "admin" ? "member" : "admin");
                              }}
                            >
                              {member.role === "admin" ? "降格" : "昇格"}
                            </button>
                            <button
                              className="px-2 py-1 rounded text-xs font-semibold border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              onClick={() => {
                                console.log("🔘 退会 button clicked");
                                removeMember(selectedRoomId!, member.user_id);
                              }}
                            >
                              退会
                            </button>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-6">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">危険な操作</div>
                <div className="flex gap-2">
                  {selectedRoom.type === "group" && (
                    <button
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                      onClick={() => {
                        setSettingsOpen(false);
                        leaveRoom();
                      }}
                    >
                      グループから退会
                    </button>
                  )}
                  {/* グループ削除はアドミンのみ、個チャ削除は誰でもOK */}
                  {(selectedRoom.type === "direct" || (selectedRoom.type === "group" && myRoleInRoom === "admin")) && (
                    <button
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      onClick={() => {
                        setSettingsOpen(false);
                        deleteRoom();
                      }}
                    >
                      {selectedRoom.type === "direct" ? "チャットを削除" : "グループを削除"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  className="px-6 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setSettingsOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 transition-all shadow-md"
                  onClick={updateRoomSettings}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardOpen && forwardMessageId && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">メッセージ転送</h2>
                <button
                  className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg px-3 py-1 transition-colors"
                  onClick={() => {
                    setForwardOpen(false);
                    setSelectedForwardRoomIds([]);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">転送先のルームを選択してください（複数選択可）</div>
              <div className="max-h-80 overflow-auto border-2 border-slate-200 dark:border-slate-700 rounded-xl">
                {rooms
                  .filter((r) => r.id !== selectedRoomId)
                  .map((r) => {
                    const checked = selectedForwardRoomIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-indigo-600 dark:accent-indigo-500"
                          checked={checked}
                          onChange={() => {
                            setSelectedForwardRoomIds((prev) =>
                              prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                            );
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {r.type === "group" ? (r.name || "グループ") : `@ ${r.name || "個人チャット"}`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="px-6 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => {
                    setForwardOpen(false);
                    setSelectedForwardRoomIds([]);
                  }}
                >
                  キャンセル
                </button>
                <button
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 transition-all shadow-md disabled:opacity-50"
                  onClick={() => forwardMessage(forwardMessageId, selectedForwardRoomIds)}
                  disabled={selectedForwardRoomIds.length === 0}
                >
                  転送 ({selectedForwardRoomIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Readers Modal */}
      {readersOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">既読者リスト</h2>
                <button
                  className="text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-lg px-3 py-1 transition-colors"
                  onClick={() => {
                    setReadersOpen(false);
                    setReaders([]);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                {readers.length}人が既読
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {readers.length === 0 ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">まだ誰も読んでいません</div>
                ) : (
                  readers.map((reader: any, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 dark:from-indigo-500 dark:to-purple-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                        {reader.avatar_url ? (
                          <img src={reader.avatar_url} alt={reader.display_name || "User"} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(reader.display_name || "?").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{reader.display_name || "Unknown"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{formatTime(reader.read_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
