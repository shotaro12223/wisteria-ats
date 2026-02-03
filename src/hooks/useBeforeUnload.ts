import { useEffect, useRef } from "react";

/**
 * フォーム入力中のページ離脱を警告するhook
 *
 * @param isDirty - フォームが変更されたかどうか
 * @param message - 警告メッセージ（オプション）
 */
export function useBeforeUnload(isDirty: boolean, message?: string) {
  const messageRef = useRef(message || "変更内容が保存されていません。ページを離れてもよろしいですか？");

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = messageRef.current;
      return messageRef.current;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}
