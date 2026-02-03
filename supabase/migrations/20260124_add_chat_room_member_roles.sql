-- =====================================================
-- チャットルームメンバーに役職機能を追加
-- admin: グループの管理者（削除、メンバー退会、役職変更が可能）
-- member: 通常メンバー
-- =====================================================

-- 1. chat_room_members テーブルに role カラムを追加
ALTER TABLE chat_room_members
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
CHECK (role IN ('admin', 'member'));

-- 2. インデックスを作成（アドミン検索用）
CREATE INDEX IF NOT EXISTS idx_chat_room_members_role
ON chat_room_members(room_id, role)
WHERE role = 'admin';

-- 3. 既存のグループの作成者を admin に設定
-- chat_rooms.created_by が作成者なので、その人を admin にする
UPDATE chat_room_members crm
SET role = 'admin'
FROM chat_rooms cr
WHERE crm.room_id = cr.id
  AND cr.type = 'group'
  AND crm.user_id = cr.created_by
  AND crm.role = 'member';

-- 4. 確認用クエリ
SELECT
  cr.name as room_name,
  cr.type,
  crm.user_id,
  crm.role,
  crm.joined_at
FROM chat_room_members crm
JOIN chat_rooms cr ON cr.id = crm.room_id
WHERE cr.type = 'group'
ORDER BY cr.name, crm.role DESC, crm.joined_at;
