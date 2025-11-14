import { Router } from "express";
import {
  getForumCategories,
  getRecentForumActivity,
  getThreadsByCategory,
  uploadForumAttachment,
  createThread,
  getThread,
  createPost,
  deleteThread,
  searchUsersForMentions,
  getActiveAccountabilityThread,
  getParticipationStatus,
  markParticipated,
} from "../controllers/forum.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// Forum routes
router.get("/categories", getForumCategories);
router.get("/recent-activity", getRecentForumActivity);
router.get("/categories/:slug/threads", getThreadsByCategory);
router.post("/upload-attachment", uploadForumAttachment);
router.post("/categories/:slug/threads", isAuthenticated, createThread);
router.get("/threads/:id", getThread);
router.post("/threads/:id/posts", isAuthenticated, createPost);
router.delete("/threads/:id", isAuthenticated, deleteThread);
router.get("/users/search", searchUsersForMentions);

export default router;

