import { Router } from "express";
import {
  getAllBonusTrainingCategories,
  createBonusTrainingCategory,
  updateBonusTrainingCategory,
  deleteBonusTrainingCategory,
  getBonusTrainingSeries,
  createBonusTrainingSeries,
  updateBonusTrainingSeries,
  deleteBonusTrainingSeries,
  getBonusTrainingVideos,
  createBonusTrainingVideo,
  updateBonusTrainingVideo,
  deleteBonusTrainingVideo,
} from "../controllers/bonus-trainings.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/admin.middleware";

const router = Router();

router.use(isAuthenticated);

// Series and video routes (must be registered before /:id category routes)
router.get("/series/:seriesId/videos", getBonusTrainingVideos);
router.post("/series/:seriesId/videos", isAdmin, createBonusTrainingVideo);
router.get("/series/:seriesId", getBonusTrainingSeries);
router.put("/series/:seriesId", isAdmin, updateBonusTrainingSeries);
router.delete("/series/:seriesId", isAdmin, deleteBonusTrainingSeries);

router.put("/videos/:videoId", isAdmin, updateBonusTrainingVideo);
router.delete("/videos/:videoId", isAdmin, deleteBonusTrainingVideo);

router.post("/:categoryId/series", isAdmin, createBonusTrainingSeries);

router.get("/", getAllBonusTrainingCategories);
router.post("/", isAdmin, createBonusTrainingCategory);
router.put("/:id", isAdmin, updateBonusTrainingCategory);
router.delete("/:id", isAdmin, deleteBonusTrainingCategory);

export default router;
