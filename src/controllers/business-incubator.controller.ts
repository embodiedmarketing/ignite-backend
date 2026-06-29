import type { Request, Response } from "express";
import type { z } from "zod";
import { storage } from "../services/storage.service";
import {
  insertBusinessIncubatorCustomerJourneyVideoSchema,
  updateBusinessIncubatorCustomerJourneyVideoSchema,
  insertBusinessIncubatorMessagingVideoSchema,
  updateBusinessIncubatorMessagingVideoSchema,
} from "../models";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

interface VideoControllerConfig<TInsert, TUpdate> {
  resourceLabel: string;
  getAll: () => Promise<unknown[]>;
  create: (data: TInsert) => Promise<unknown>;
  update: (id: number, data: TUpdate) => Promise<unknown | undefined>;
  delete: (id: number) => Promise<boolean>;
  insertSchema: z.ZodType<TInsert>;
  updateSchema: z.ZodType<TUpdate>;
}

function createVideoHandlers<TInsert, TUpdate>(
  config: VideoControllerConfig<TInsert, TUpdate>
) {
  const {
    resourceLabel,
    getAll,
    create,
    update,
    delete: remove,
    insertSchema,
    updateSchema,
  } = config;

  return {
    async getAllVideos(_req: Request, res: Response): Promise<void> {
      try {
        const videos = await getAll();
        res.json(videos);
      } catch (error) {
        handleControllerError(error, res, {
          logLabel: `fetching ${resourceLabel}`,
          defaultMessage: `Failed to fetch ${resourceLabel}`,
        });
      }
    },

    async createVideo(req: Request, res: Response): Promise<void> {
      try {
        const validatedData = insertSchema.parse(req.body);
        const video = await create(validatedData);
        res.status(201).json(video);
      } catch (error) {
        handleControllerError(error, res, {
          logLabel: `creating ${resourceLabel}`,
          defaultMessage: `Failed to create ${resourceLabel}`,
        });
      }
    },

    async updateVideo(req: Request, res: Response): Promise<void> {
      try {
        const idNum = parseIdParam(req.params.id, res, {
          paramName: `${resourceLabel} ID`,
        });
        if (idNum === undefined) return;

        const validatedData = updateSchema.parse(req.body);
        const updated = await update(idNum, validatedData);

        if (!updated) {
          res.status(404).json({ message: "Video not found" });
          return;
        }

        res.json(updated);
      } catch (error) {
        handleControllerError(error, res, {
          logLabel: `updating ${resourceLabel}`,
          defaultMessage: `Failed to update ${resourceLabel}`,
        });
      }
    },

    async deleteVideo(req: Request, res: Response): Promise<void> {
      try {
        const idNum = parseIdParam(req.params.id, res, {
          paramName: `${resourceLabel} ID`,
        });
        if (idNum === undefined) return;

        const deleted = await remove(idNum);

        if (!deleted) {
          res.status(404).json({ message: "Video not found" });
          return;
        }

        res.json({
          message: "Video deleted successfully",
          id: String(idNum),
        });
      } catch (error) {
        handleControllerError(error, res, {
          logLabel: `deleting ${resourceLabel}`,
          defaultMessage: `Failed to delete ${resourceLabel}`,
        });
      }
    },
  };
}

const customerJourneyHandlers = createVideoHandlers({
  resourceLabel: "customer journey video",
  getAll: () => storage.getAllBusinessIncubatorCustomerJourneyVideos(),
  create: (data) => storage.createBusinessIncubatorCustomerJourneyVideo(data),
  update: (id, data) =>
    storage.updateBusinessIncubatorCustomerJourneyVideo(id, data),
  delete: (id) => storage.deleteBusinessIncubatorCustomerJourneyVideo(id),
  insertSchema: insertBusinessIncubatorCustomerJourneyVideoSchema,
  updateSchema: updateBusinessIncubatorCustomerJourneyVideoSchema,
});

const messagingHandlers = createVideoHandlers({
  resourceLabel: "messaging video",
  getAll: () => storage.getAllBusinessIncubatorMessagingVideos(),
  create: (data) => storage.createBusinessIncubatorMessagingVideo(data),
  update: (id, data) => storage.updateBusinessIncubatorMessagingVideo(id, data),
  delete: (id) => storage.deleteBusinessIncubatorMessagingVideo(id),
  insertSchema: insertBusinessIncubatorMessagingVideoSchema,
  updateSchema: updateBusinessIncubatorMessagingVideoSchema,
});

export const getCustomerJourneyVideos = customerJourneyHandlers.getAllVideos;
export const createCustomerJourneyVideo = customerJourneyHandlers.createVideo;
export const updateCustomerJourneyVideo = customerJourneyHandlers.updateVideo;
export const deleteCustomerJourneyVideo = customerJourneyHandlers.deleteVideo;

export const getMessagingVideos = messagingHandlers.getAllVideos;
export const createMessagingVideo = messagingHandlers.createVideo;
export const updateMessagingVideo = messagingHandlers.updateVideo;
export const deleteMessagingVideo = messagingHandlers.deleteVideo;
