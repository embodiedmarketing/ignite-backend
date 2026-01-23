import admin from "../config/firebase";
import { storage } from "./storage.service";

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    type: string;
    threadId?: number;
    postId?: number;
    parentPostId?: number;
    link?: string;
    [key: string]: any;
  };
}

/**
 * Send Firebase push notification to a user
 */
export async function sendPushNotificationToUser(
  userId: number,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Get user to check for FCM tokens
    // Note: You'll need to add fcmTokens field to users table or create a separate device_tokens table
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.log(`[FCM] User ${userId} not found`);
      return false;
    }

    // Get FCM tokens for the user
    // TODO: Implement getFCMTokens method in storage service
    // For now, we'll check if tokens are stored in user metadata or a separate table
    const fcmTokens = await getFCMTokensForUser(userId);
    
    if (!fcmTokens || fcmTokens.length === 0) {
      console.log(`[FCM] No FCM tokens found for user ${userId}`);
      return false;
    }

    // Send notification to all devices
    const results = await Promise.allSettled(
      fcmTokens.map((token) =>
        admin.messaging().send({
          token: token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data
            ? Object.entries(payload.data).reduce(
                (acc, [key, value]) => {
                  acc[key] = String(value || "");
                  return acc;
                },
                {} as Record<string, string>
              )
            : undefined,
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channelId: "forum_notifications",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        })
      )
    );

    // Check results and handle invalid tokens
    let successCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        successCount++;
        console.log(`[FCM] ✅ Notification sent to user ${userId}, token ${i + 1}`);
      } else {
        const error = result.reason;
        console.error(`[FCM] ❌ Failed to send to user ${userId}, token ${i + 1}:`, error);
        
        // Handle invalid tokens
        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          console.log(`[FCM] Removing invalid token for user ${userId}`);
          await removeInvalidToken(userId, fcmTokens[i]);
        }
      }
    }

    return successCount > 0;
  } catch (error: any) {
    console.error(`[FCM] Error sending push notification to user ${userId}:`, error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: number[],
  payload: PushNotificationPayload
): Promise<number> {
  let successCount = 0;
  
  for (const userId of userIds) {
    const success = await sendPushNotificationToUser(userId, payload);
    if (success) {
      successCount++;
    }
  }

  return successCount;
}

/**
 * Get FCM tokens for a user
 */
async function getFCMTokensForUser(userId: number): Promise<string[]> {
  try {
    const tokens = await storage.getDeviceTokensForUser(userId);
    return tokens.map((t) => t.token);
  } catch (error) {
    console.error(`[FCM] Error getting tokens for user ${userId}:`, error);
    return [];
  }
}

/**
 * Remove invalid FCM token
 */
async function removeInvalidToken(userId: number, token: string): Promise<void> {
  try {
    await storage.removeDeviceToken(userId, token);
    console.log(`[FCM] Removed invalid token for user ${userId}`);
  } catch (error) {
    console.error(`[FCM] Error removing invalid token:`, error);
  }
}

/**
 * Send forum reply notification (Level 1: Direct reply to thread)
 */
export async function sendForumThreadReplyNotification(
  threadOwnerId: number,
  replyAuthorName: string,
  threadTitle: string,
  threadId: number,
  postId: number
): Promise<boolean> {
  return await sendPushNotificationToUser(threadOwnerId, {
    title: "New reply to your thread",
    body: `${replyAuthorName} replied to "${threadTitle}"`,
    data: {
      type: "forum_reply",
      threadId: threadId,
      postId: postId,
      link: `/forum/thread/${threadId}#post-${postId}`,
    },
  });
}

/**
 * Send forum comment reply notification (Level 2+: Reply to a comment)
 */
export async function sendForumCommentReplyNotification(
  commentAuthorId: number,
  replyAuthorName: string,
  threadTitle: string,
  threadId: number,
  postId: number,
  parentPostId: number
): Promise<boolean> {
  return await sendPushNotificationToUser(commentAuthorId, {
    title: "New Reply to Your Comment",
    body: `${replyAuthorName} replied to your comment in "${threadTitle}"`,
    data: {
      type: "forum_reply",
      threadId: threadId,
      postId: postId,
      parentPostId: parentPostId,
      link: `/forum/thread/${threadId}#post-${postId}`,
    },
  });
}

/**
 * Send forum mention notification (Optional: @mentions)
 */
export async function sendForumMentionNotification(
  mentionedUserId: number,
  authorName: string,
  threadTitle: string,
  threadId: number,
  postId: number
): Promise<boolean> {
  return await sendPushNotificationToUser(mentionedUserId, {
    title: "You were mentioned",
    body: `${authorName} mentioned you in "${threadTitle}"`,
    data: {
      type: "forum_mention",
      threadId: threadId,
      postId: postId,
      link: `/forum/thread/${threadId}#post-${postId}`,
    },
  });
}

