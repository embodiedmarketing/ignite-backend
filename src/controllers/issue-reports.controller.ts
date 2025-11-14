import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertIssueReportSchema } from "@backend/models";

/**
 * Get all issue reports
 */
export async function getAllIssueReports(req: Request, res: Response) {
  try {
    const reports = await storage.getAllIssueReports();
    res.json(reports);
  } catch (error) {
    console.error("Error fetching issue reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Create a new issue report
 */
export async function createIssueReport(req: Request, res: Response) {
  try {
    const validated = insertIssueReportSchema.parse(req.body);
    const report = await storage.createIssueReport(validated);

    // Create notifications for all admin users
    const admins = await storage.getAdminUsers();
    const notificationPromises = admins.map((admin) =>
      storage.createNotification({
        userId: admin.id,
        type: "issue_report",
        title: "New Issue Report",
        message: `${validated.issueType}: ${validated.title}`,
        metadata: { issueReportId: report.id },
        isRead: false,
      })
    );
    await Promise.all(notificationPromises);

    res.status(201).json(report);
  } catch (error) {
    console.error("Error creating issue report:", error);
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({
        message: "Invalid issue report data",
        details: error.message,
      });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

/**
 * Update an issue report
 */
export async function updateIssueReport(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid issue report ID" });
    }

    const updated = await storage.updateIssueReport(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Issue report not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating issue report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Delete an issue report
 */
export async function deleteIssueReport(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid issue report ID" });
    }

    const deleted = await storage.deleteIssueReport(id);
    if (!deleted) {
      return res.status(404).json({ message: "Issue report not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting issue report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

