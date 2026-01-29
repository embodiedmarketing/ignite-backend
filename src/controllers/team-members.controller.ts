import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import {
  insertTeamMemberSchema,
  updateTeamMemberSchema,
} from "../models";

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error fetching team members:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to fetch team members" });
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error creating team member:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      res.status(400).json({
        message: "Invalid request data",
        details: zodError.errors || error.message,
      });
      return;
    }

    // Check for duplicate key error (PostgreSQL unique constraint violation)
    if (error instanceof Error && error.message.includes("duplicate key")) {
      res.status(400).json({
        message: "A team member with this ID already exists",
      });
      return;
    }

    res.status(500).json({ message: "Failed to create team member" });
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
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ message: "Team member ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid team member ID format" });
      return;
    }

    const validatedData = updateTeamMemberSchema.parse(req.body);

    const updated = await storage.updateTeamMember(idNum, validatedData);

    if (!updated) {
      res.status(404).json({ message: "Team member not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error updating team member:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      res.status(400).json({
        message: "Invalid request data",
        details: zodError.errors || error.message,
      });
      return;
    }

    res.status(500).json({ message: "Failed to update team member" });
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
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Team member ID is required" });
      return;
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      res.status(400).json({ message: "Invalid team member ID format" });
      return;
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Error deleting team member:", {
      name: errorName,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message: "Failed to delete team member" });
  }
}

