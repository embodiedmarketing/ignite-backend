import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertBonusTrainingCategorySchema,
  updateBonusTrainingCategorySchema,
  insertBonusTrainingSeriesSchema,
  updateBonusTrainingSeriesSchema,
  insertBonusTrainingVideoSchema,
  updateBonusTrainingVideoSchema,
} from "../models";
import { handleControllerError } from "../utils/controller-error";

function parseStringIdParam(
  id: string | undefined,
  res: Response,
  paramName = "ID"
): string | undefined {
  if (!id) {
    res.status(400).json({ message: `${paramName} is required` });
    return undefined;
  }
  return id;
}

export async function getAllBonusTrainingCategories(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const categories = await storage.getAllBonusTrainingCategories();
    res.json(categories);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "fetching bonus training categories",
      defaultMessage: "Failed to fetch bonus training categories",
    });
  }
}

export async function createBonusTrainingCategory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validatedData = insertBonusTrainingCategorySchema.parse(req.body);
    const category = await storage.createBonusTrainingCategory(validatedData);
    res.status(201).json(category);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "creating bonus training category",
      duplicateKeyMessage: "A bonus training category with this ID already exists",
      defaultMessage: "Failed to create bonus training category",
    });
  }
}

export async function updateBonusTrainingCategory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = parseStringIdParam(req.params.id, res, "Category ID");
    if (id === undefined) return;

    const validatedData = updateBonusTrainingCategorySchema.parse(req.body);
    const updated = await storage.updateBonusTrainingCategory(id, validatedData);

    if (!updated) {
      res.status(404).json({ message: "Bonus training category not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating bonus training category",
      defaultMessage: "Failed to update bonus training category",
    });
  }
}

export async function deleteBonusTrainingCategory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = parseStringIdParam(req.params.id, res, "Category ID");
    if (id === undefined) return;

    const deleted = await storage.deleteBonusTrainingCategory(id);

    if (!deleted) {
      res.status(404).json({ message: "Bonus training category not found" });
      return;
    }

    res.json({
      message: "Bonus training category deleted successfully",
      id,
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting bonus training category",
      defaultMessage: "Failed to delete bonus training category",
    });
  }
}

export async function getBonusTrainingSeries(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seriesId = parseStringIdParam(req.params.seriesId, res, "Series ID");
    if (seriesId === undefined) return;

    const series = await storage.getBonusTrainingSeries(seriesId);

    if (!series) {
      res.status(404).json({ message: "Bonus training series not found" });
      return;
    }

    res.json(series);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "fetching bonus training series",
      defaultMessage: "Failed to fetch bonus training series",
    });
  }
}

export async function createBonusTrainingSeries(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const categoryId = parseStringIdParam(
      req.params.categoryId,
      res,
      "Category ID"
    );
    if (categoryId === undefined) return;

    const category = await storage.getBonusTrainingCategory(categoryId);
    if (!category) {
      res.status(404).json({ message: "Bonus training category not found" });
      return;
    }

    const validatedData = insertBonusTrainingSeriesSchema.parse(req.body);
    const series = await storage.createBonusTrainingSeries(
      categoryId,
      validatedData
    );
    res.status(201).json(series);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "creating bonus training series",
      duplicateKeyMessage: "A bonus training series with this ID already exists",
      defaultMessage: "Failed to create bonus training series",
    });
  }
}

export async function updateBonusTrainingSeries(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seriesId = parseStringIdParam(req.params.seriesId, res, "Series ID");
    if (seriesId === undefined) return;

    const validatedData = updateBonusTrainingSeriesSchema.parse(req.body);
    const updated = await storage.updateBonusTrainingSeries(
      seriesId,
      validatedData
    );

    if (!updated) {
      res.status(404).json({ message: "Bonus training series not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating bonus training series",
      defaultMessage: "Failed to update bonus training series",
    });
  }
}

export async function deleteBonusTrainingSeries(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seriesId = parseStringIdParam(req.params.seriesId, res, "Series ID");
    if (seriesId === undefined) return;

    const deleted = await storage.deleteBonusTrainingSeries(seriesId);

    if (!deleted) {
      res.status(404).json({ message: "Bonus training series not found" });
      return;
    }

    res.json({
      message: "Bonus training series deleted successfully",
      id: seriesId,
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting bonus training series",
      defaultMessage: "Failed to delete bonus training series",
    });
  }
}

export async function getBonusTrainingVideos(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seriesId = parseStringIdParam(req.params.seriesId, res, "Series ID");
    if (seriesId === undefined) return;

    const series = await storage.getBonusTrainingSeries(seriesId);
    if (!series) {
      res.status(404).json({ message: "Bonus training series not found" });
      return;
    }

    const videos = await storage.getBonusTrainingVideosBySeries(seriesId);
    res.json(videos);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "fetching bonus training videos",
      defaultMessage: "Failed to fetch bonus training videos",
    });
  }
}

export async function createBonusTrainingVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const seriesId = parseStringIdParam(req.params.seriesId, res, "Series ID");
    if (seriesId === undefined) return;

    const validatedData = insertBonusTrainingVideoSchema.parse(req.body);

    try {
      const video = await storage.createBonusTrainingVideo(
        seriesId,
        validatedData
      );
      res.status(201).json(video);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("not found")
      ) {
        res.status(404).json({ message: "Bonus training series not found" });
        return;
      }
      throw error;
    }
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "creating bonus training video",
      duplicateKeyMessage: "A bonus training video with this ID already exists",
      defaultMessage: "Failed to create bonus training video",
    });
  }
}

export async function updateBonusTrainingVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const videoId = parseStringIdParam(req.params.videoId, res, "Video ID");
    if (videoId === undefined) return;

    const validatedData = updateBonusTrainingVideoSchema.parse(req.body);
    const updated = await storage.updateBonusTrainingVideo(
      videoId,
      validatedData
    );

    if (!updated) {
      res.status(404).json({ message: "Bonus training video not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating bonus training video",
      defaultMessage: "Failed to update bonus training video",
    });
  }
}

export async function deleteBonusTrainingVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const videoId = parseStringIdParam(req.params.videoId, res, "Video ID");
    if (videoId === undefined) return;

    const deleted = await storage.deleteBonusTrainingVideo(videoId);

    if (!deleted) {
      res.status(404).json({ message: "Bonus training video not found" });
      return;
    }

    res.json({
      message: "Bonus training video deleted successfully",
      id: videoId,
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting bonus training video",
      defaultMessage: "Failed to delete bonus training video",
    });
  }
}
