import { syncGmailMessages, type SyncOptions, type SyncResult } from "./gmailSync";
import { notifyGmailSyncFailure } from "./sendAdminNotification";

/**
 * Gmail同期をリトライ機構付きで実行
 *
 * @param connectionId - Gmail接続ID
 * @param options - 同期オプション
 * @param maxRetries - 最大リトライ回数（デフォルト: 3）
 * @param baseDelay - 初回リトライ遅延（ミリ秒、デフォルト: 5000）
 * @returns 同期結果
 */
export async function syncGmailMessagesWithRetry(
  connectionId: string,
  options: SyncOptions = {},
  maxRetries = 3,
  baseDelay = 5000
): Promise<SyncResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gmail Sync] Attempt ${attempt}/${maxRetries}`);
      return await syncGmailMessages(connectionId, options);
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;

      // Permanent errors (don't retry)
      const isPermanentError =
        error.message?.includes("re-authentication required") ||
        error.message?.includes("Invalid credentials") ||
        error.message?.includes("Unauthorized");

      if (isPermanentError || isLastAttempt) {
        console.error(`[Gmail Sync] Permanent error or max retries reached:`, error);

        // 管理者に通知
        const errorMessage = error.message || String(error);
        const syncType = options.forceFullSync ? "full" : "incremental";
        await notifyGmailSyncFailure(errorMessage, syncType, attempt).catch((notifyErr) => {
          console.error("[Gmail Sync] Failed to send admin notification:", notifyErr);
        });

        throw error;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[Gmail Sync] Retry attempt ${attempt} failed. Retrying in ${delay}ms...`, error.message);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached
  throw new Error("Gmail sync failed after all retries");
}
