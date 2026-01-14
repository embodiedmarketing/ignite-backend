import { Router } from "express";
import {
  adminLogin,
  getAdminUsers,
  getAdminUserDetails,
  getAdminMessagingStrategies,
  getAdminMessagingStrategy,
  getAdminOfferOutline,
  getAdminSalesPage,
  getAdminIgniteDoc,
  getAdminLoginHistory,
  getUserLoginHistory,
  getAdminUsageStats,
  getUserProgress,
  resetUserProgress,
  getModuleStats,
  getLearningProgress,
  getToolOutputs,
  getTrainingVideos,
  createTrainingVideo,
  updateTrainingVideo,
  deleteTrainingVideo,
  getPlatformResources,
  createPlatformResource,
  updatePlatformResource,
  deletePlatformResource,
  getChecklistDefinitions,
  createChecklistDefinition,
  updateChecklistDefinition,
  deleteChecklistDefinition,
  toggleUserActive,
} from "../controllers/admin.controller";
import { isAdmin } from "../middlewares/admin.middleware";

const router = Router();

// Admin login (no middleware required)
router.post("/login", adminLogin);
router.put("/users/:userId/toggle-active", isAdmin, toggleUserActive);
// Admin routes (require isAdmin middleware)
router.get("/users", isAdmin, getAdminUsers);
router.get("/users/:userId", isAdmin, getAdminUserDetails);
router.get("/users/:userId/progress", isAdmin, getUserProgress);
router.post("/users/:userId/reset-progress", isAdmin, resetUserProgress);
router.get("/messaging-strategies", isAdmin, getAdminMessagingStrategies);
router.get("/messaging-strategies/:id", isAdmin, getAdminMessagingStrategy);
router.get("/offer-outlines/:id", isAdmin, getAdminOfferOutline);
router.get("/sales-pages/:id", isAdmin, getAdminSalesPage);
router.get("/ignite-docs/:id", isAdmin, getAdminIgniteDoc);
router.get("/analytics/logins", isAdmin, getAdminLoginHistory);
router.get("/analytics/logins/:userId", isAdmin, getUserLoginHistory);
router.get("/analytics/usage", isAdmin, getAdminUsageStats);
router.get("/analytics/modules", isAdmin, getModuleStats);
router.get("/analytics/learning-progress", isAdmin, getLearningProgress);
router.get("/analytics/tool-outputs", isAdmin, getToolOutputs);
router.get("/training-videos", isAdmin, getTrainingVideos);
router.post("/training-videos", isAdmin, createTrainingVideo);
router.put("/training-videos/:id", isAdmin, updateTrainingVideo);
router.delete("/training-videos/:id", isAdmin, deleteTrainingVideo);
router.get("/platform-resources", isAdmin, getPlatformResources);
router.post("/platform-resources", isAdmin, createPlatformResource);
router.put("/platform-resources/:id", isAdmin, updatePlatformResource);
router.delete("/platform-resources/:id", isAdmin, deletePlatformResource);
router.get("/checklist-definitions", isAdmin, getChecklistDefinitions);
router.post("/checklist-definitions", isAdmin, createChecklistDefinition);
router.put("/checklist-definitions/:id", isAdmin, updateChecklistDefinition);
router.delete("/checklist-definitions/:id", isAdmin, deleteChecklistDefinition);

export default router;




