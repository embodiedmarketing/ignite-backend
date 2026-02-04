import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertTeamMemberSchema,
  updateTeamMemberSchema,
} from "../models";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

/**
 * Get all team members
 */
export async function getAllTeamMembers(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const members = await storage.getAllTeamMembers();
    res.json(members);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "fetching team members",
      defaultMessage: "Failed to fetch team members",
    });
  }
}

/**
 * Create a new team member
 */
export async function createTeamMember(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validatedData = insertTeamMemberSchema.parse(req.body);
    const member = await storage.createTeamMember(validatedData);
    res.status(201).json(member);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "creating team member",
      duplicateKeyMessage: "A team member with this ID already exists",
      defaultMessage: "Failed to create team member",
    });
  }
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const idNum = parseIdParam(req.params.id, res, {
      paramName: "Team member ID",
    });
    if (idNum === undefined) return;

    const validatedData = updateTeamMemberSchema.parse(req.body);
    const updated = await storage.updateTeamMember(idNum, validatedData);

    if (!updated) {
      res.status(404).json({ message: "Team member not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating team member",
      defaultMessage: "Failed to update team member",
    });
  }
}

/**
 * Delete a team member
 */
export async function deleteTeamMember(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const idNum = parseIdParam(req.params.id, res, {
      paramName: "Team member ID",
    });
    if (idNum === undefined) return;

    const deleted = await storage.deleteTeamMember(idNum);

    if (!deleted) {
      res.status(404).json({ message: "Team member not found" });
      return;
    }

    res.json({
      message: "Team member deleted successfully",
      id: idNum,
    });
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting team member",
      defaultMessage: "Failed to delete team member",
    });
  }
}
