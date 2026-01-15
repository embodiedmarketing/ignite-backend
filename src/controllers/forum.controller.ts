import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertForumThreadSchema, insertForumPostSchema } from "@backend/models";
import { sendForumNotification } from "../services/email.service";
import { isAuthenticated } from "../middlewares/auth.middleware";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Get all forum categories with thread counts
 */
export async function getForumCategories(req: Request, res: Response) {
  try {
    const categories = await storage.getForumCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching forum categories:", error);
    res.status(500).json({ message: "Failed to fetch forum categories" });
  }
}

/**
 * Get recent forum activity
 */
export async function getRecentForumActivity(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activity = await storage.getRecentForumActivity(limit);
    res.json(activity);
  } catch (error) {
    console.error("Error fetching recent forum activity:", error);
    res.status(500).json({ message: "Failed to fetch recent forum activity" });
  }
}

/**
 * Get threads for a specific category with pagination
 */
export async function getThreadsByCategory(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 20;

    if (size > 100) {
      return res.status(400).json({ message: "Page size cannot exceed 100" });
    }

    const result = await storage.getThreadsByCategorySlug(slug, page, size);
    res.json(result);
  } catch (error) {
    console.error("Error fetching threads:", error);
    res.status(500).json({ message: "Failed to fetch threads" });
  }
}

/**
 * Upload forum attachment (requires authentication)
 */
export const uploadForumAttachment = [
  isAuthenticated,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Convert file to base64 data URL for storage
      const base64 = req.file.buffer.toString("base64");
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

      const attachment = {
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        dataUrl: dataUrl,
      };

      res.json(attachment);
    } catch (error) {
      console.error("Error uploading forum attachment:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  },
];

/**
 * Create a new thread in a category (requires authentication)
 */
export async function createThread(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validatedData = insertForumThreadSchema.parse(req.body);
    const thread = await storage.createThread(slug, userId, validatedData);

    // Send email notification for tech category (Funnel Tech Questions & Support)
    if (slug === "tech") {
      try {
        const user = await storage.getUser(userId);
        const authorName = user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "A user";

        await sendForumNotification({
          categoryName: "Funnel Tech Questions & Support",
          categorySlug: slug,
          threadTitle: validatedData.title || "New Thread",
          threadId: thread.id,
          authorName: authorName || "Unknown User",
          contentPreview: validatedData.body || "",
          isNewThread: true,
        });
        console.log(
          `[FORUM] Email notification sent for new thread in ${slug}`
        );
      } catch (emailError) {
        console.error(
          "[FORUM] Error sending email notification:",
          emailError
        );
        // Don't fail the thread creation if email fails
      }
    }

    res.status(201).json(thread);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ message: "Category not found" });
    }
    console.error("Error creating thread:", error);
    res.status(500).json({ message: "Failed to create thread" });
  }
}

/**
 * Get a specific thread with all its posts
 */
export async function getThread(req: Request, res: Response) {
  try {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }

    const result = await storage.getThreadWithPosts(threadId);
    if (!result) {
      return res.status(404).json({ message: "Thread not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching thread:", error);
    res.status(500).json({ message: "Failed to fetch thread" });
  }
}

/**
 * Create a new post in a thread (requires authentication)
 */
export async function createPost(req: Request, res: Response) {
  try {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validatedData = insertForumPostSchema.parse(req.body);

    // Extract parentId from request body if replying to a specific post
    const parentId = req.body.parentId
      ? parseInt(req.body.parentId)
      : undefined;

    const post = await storage.createPost(
      threadId,
      userId,
      validatedData,
      parentId
    );

    console.log(
      `[FORUM] Post created: ${post.id} in thread ${threadId} by user ${userId}`
    );

    // Create notifications for forum interactions
    try {
      const threadData = await storage.getThreadWithPosts(threadId);

      console.log(
        `[FORUM] Thread owner: ${threadData?.thread?.userId}, Post author: ${userId}, ParentId: ${parentId}`
      );

      // 1. Notify thread owner when someone replies to their thread (if not replying to a specific post)
      if (!parentId && threadData?.thread) {
        console.log(
          `[FORUM] Creating notification for thread owner ${threadData.thread.userId}`
        );
        await storage.createForumReplyNotification(
          threadId,
          threadData.thread.userId,
          userId,
          post.id
        );
      }

      // 2. If this is a reply to a specific post, notify the author of the parent post
      if (parentId && threadData) {
        const parentPost = threadData.posts.find(
          (p: any) => p.id === parentId
        );
        if (parentPost && parentPost.userId !== userId) {
          const replyAuthor = await storage.getUser(userId);
          const replyAuthorName = replyAuthor
            ? `${replyAuthor.firstName || ""} ${
                replyAuthor.lastName || ""
              }`.trim() || replyAuthor.email
            : "Someone";

          await storage.createNotification({
            userId: parentPost.userId,
            type: "forum_reply",
            title: "New Reply to Your Comment",
            message: `${replyAuthorName} replied to your comment in "${
              threadData.thread?.title || "a thread"
            }"`,
            link: `/forum/thread/${threadId}#post-${post.id}`,
            metadata: {
              threadId,
              postId: post.id,
              parentPostId: parentId,
              replyAuthorId: userId,
            },
          });
        }
      }

      // 3. Check for @mentions and create notifications
      await storage.createForumMentionNotifications(
        validatedData.body,
        userId,
        threadId,
        post.id
      );

      console.log(`[FORUM] Notifications created for post ${post.id}`);
    } catch (notifError) {
      console.error("[FORUM] Error creating notifications:", notifError);
      // Don't fail the post creation if notification fails
    }

    // Check if this is the active accountability thread and mark user as participated
    const activeAccountabilityThread =
      await storage.getActiveAccountabilityThread();
    if (
      activeAccountabilityThread &&
      activeAccountabilityThread.threadId === threadId
    ) {
      try {
        await storage.markUserAsParticipated(
          activeAccountabilityThread.id,
          userId
        );
        console.log(
          `[ACCOUNTABILITY] User ${userId} marked as participated in accountability thread ${threadId}`
        );
      } catch (error) {
        console.error("Error marking user as participated:", error);
        // Don't fail the post creation if marking participated fails
      }
    }

    // Send email notification for posts in tech category (Funnel Tech Questions & Support)
    try {
      const threadData = await storage.getThreadWithPosts(threadId);
      if (threadData && threadData.category.slug === "tech") {
        const user = await storage.getUser(userId);
        const authorName = user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "A user";

        await sendForumNotification({
          categoryName: "Funnel Tech Questions & Support",
          categorySlug: threadData.category.slug,
          threadTitle: threadData.thread.title || "Thread",
          threadId: threadId,
          authorName: authorName || "Unknown User",
          contentPreview: validatedData.body || "",
          isNewThread: false,
        });
        console.log(
          `[FORUM] Email notification sent for new comment in tech thread ${threadId}`
        );
      }
    } catch (emailError) {
      console.error(
        "[FORUM] Error sending email notification:",
        emailError
      );
      // Don't fail the post creation if email fails
    }

    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
}

/**
 * Update a thread (requires authentication and ownership)
 */
export async function updateThread(req: Request, res: Response) {
  try {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate updates (only title and body can be updated)
    const validatedData = insertForumThreadSchema.partial().parse(req.body);

    const updatedThread = await storage.updateThread(
      threadId,
      userId,
      validatedData
    );

    res.json(updatedThread);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Thread not found") {
        return res.status(404).json({ message: "Thread not found" });
      }
      if (error.message.includes("Unauthorized")) {
        return res
          .status(403)
          .json({ message: "You can only update your own threads" });
      }
    }
    console.error("Error updating thread:", error);
    res.status(500).json({ message: "Failed to update thread" });
  }
}

/**
 * Update a post (requires authentication and ownership)
 */
export async function updatePost(req: Request, res: Response) {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate updates (only body can be updated)
    const validatedData = insertForumPostSchema.partial().parse(req.body);

    const updatedPost = await storage.updatePost(
      postId,
      userId,
      validatedData
    );

    res.json(updatedPost);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        return res.status(404).json({ message: "Post not found" });
      }
      if (error.message.includes("Unauthorized")) {
        return res
          .status(403)
          .json({ message: "You can only update your own posts" });
      }
    }
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Failed to update post" });
  }
}

/**
 * Delete a post (requires authentication and ownership)
 */
export async function deletePost(req: Request, res: Response) {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await storage.deletePost(postId, userId);
    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        return res.status(404).json({ message: "Post not found" });
      }
      if (error.message.includes("Unauthorized")) {
        return res
          .status(403)
          .json({ message: "You can only delete your own posts" });
      }
    }
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
}

/**
 * Delete a thread (requires authentication and ownership)
 */
export async function deleteThread(req: Request, res: Response) {
  try {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ message: "Invalid thread ID" });
    }

    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await storage.deleteThread(threadId, userId);
    res.json({ success: true, message: "Thread deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Thread not found") {
        return res.status(404).json({ message: "Thread not found" });
      }
      if (error.message.includes("Unauthorized")) {
        return res
          .status(403)
          .json({ message: "You can only delete your own threads" });
      }
    }
    console.error("Error deleting thread:", error);
    res.status(500).json({ message: "Failed to delete thread" });
  }
}

/**
 * Search users for @mention autocomplete
 */
export async function searchUsersForMentions(req: Request, res: Response) {
  try {
    const query = ((req.query.q as string) || "").trim();
    const users = await storage.searchUsersForMentions(query);
    res.json(users);
  } catch (error) {
    console.error("Error searching users for mentions:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
}

/**
 * Get the active accountability thread
 */
export async function getActiveAccountabilityThread(req: Request, res: Response) {
  try {
    const activeThread = await storage.getActiveAccountabilityThread();

    if (!activeThread) {
      return res.json(null);
    }

    // Also fetch the full thread details with posts
    const threadDetails = await storage.getThreadWithPosts(
      activeThread.threadId
    );

    res.json({
      weeklyThread: activeThread,
      threadDetails: threadDetails,
    });
  } catch (error) {
    console.error("Error fetching active accountability thread:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch accountability thread" });
  }
}

/**
 * Check if the current user has participated in the active thread
 */
export async function getParticipationStatus(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activeThread = await storage.getActiveAccountabilityThread();

    if (!activeThread) {
      return res.json({ hasParticipated: false, noActiveThread: true });
    }

    const participation = await storage.getUserParticipation(
      activeThread.id,
      userId
    );

    res.json({
      hasParticipated: participation?.hasParticipated || false,
      participatedAt: participation?.participatedAt || null,
      weekStartDate: activeThread.weekStartDate,
      weekEndDate: activeThread.weekEndDate,
      threadId: activeThread.threadId,
    });
  } catch (error) {
    console.error("Error checking participation status:", error);
    res
      .status(500)
      .json({ message: "Failed to check participation status" });
  }
}

/**
 * Mark user as participated (called when they post in the accountability thread)
 */
export async function markParticipated(req: Request, res: Response) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activeThread = await storage.getActiveAccountabilityThread();

    if (!activeThread) {
      return res
        .status(404)
        .json({ message: "No active accountability thread" });
    }

    const participation = await storage.markUserAsParticipated(
      activeThread.id,
      userId
    );

    res.json({
      success: true,
      participation,
    });
  } catch (error) {
    console.error("Error marking participation:", error);
    res.status(500).json({ message: "Failed to mark participation" });
  }
}

