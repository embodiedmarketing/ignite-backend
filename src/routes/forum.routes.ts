import { Router } from "express";
import {
  getForumCategories,
  getRecentForumActivity,
  getThreadsByCategory,
  uploadForumAttachment,
  createThread,
  getThread,
  updateThread,
  createPost,
  updatePost,
  deletePost,
  deleteThread,
  searchUsersForMentions,
  getActiveAccountabilityThread,
  getParticipationStatus,
  markParticipated,
} from "../controllers/forum.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

router.get("/categories", getForumCategories);
router.get("/recent-activity", getRecentForumActivity);
router.get("/categories/:slug/threads", getThreadsByCategory);
router.post("/upload-attachment", uploadForumAttachment);
router.post("/categories/:slug/threads", isAuthenticated, createThread);
router.get("/threads/:id", getThread);
router.put("/threads/:id", isAuthenticated, updateThread);
router.post("/threads/:id/posts", isAuthenticated, createPost);
router.delete("/threads/:id", isAuthenticated, deleteThread);
router.put("/posts/:id", isAuthenticated, updatePost);
router.delete("/posts/:id", isAuthenticated, deletePost);
router.get("/users/search", searchUsersForMentions);

export default router;

