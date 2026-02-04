import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { insertIssueReportSchema } from "@backend/models";
import { sendIssueReportUpdateEmail } from "../services/email.service";
import { handleControllerError, parseIdParam } from "../utils/controller-error";

/**
 * Get all issue reports
 */
export async function getAllIssueReports(req: Request, res: Response) {
  try {
    const reports = await storage.getAllIssueReports();
    res.json(reports);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "fetching issue reports",
      defaultMessage: "Internal server error",
    });
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
    handleControllerError(error, res, {
      logLabel: "creating issue report",
      defaultMessage: "Internal server error",
    });
  }
}

/**
 * Update an issue report
 */
export async function updateIssueReport(req: Request, res: Response) {
  try {
    const id = parseIdParam(req.params.id, res, {
      paramName: "Issue report ID",
    });
    if (id === undefined) return;

    const updated = await storage.updateIssueReport(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Issue report not found" });
    }

    // Resolve the email of the user who created the issue:
    // 1) Prefer the stored userEmail on the issue report
    // 2) Fallback to the email from the users table via userId
    try {
      const explicitEmail = updated.userEmail;
      let resolvedEmail = explicitEmail;

      if (!resolvedEmail && updated.userId) {
        const user = await storage.getUser(updated.userId);
        resolvedEmail = user?.email ?? null;
      }

      if (resolvedEmail && updated.status === "resolved") {
        await sendIssueReportUpdateEmail(resolvedEmail, updated);
      } else {
        console.warn(
          `[ISSUE-REPORT] No email found for issue report ${updated.id}; skipping email notification.`
        );
      }
    } catch (emailError) {
      console.error(
        "[ISSUE-REPORT] Failed to send issue update email:",
        emailError
      );
      // Do not fail the API request if email sending fails
    }

    // Optionally create an in-app notification for the user
    try {
      await storage.createNotification({
        userId: updated.userId,
        type: "issue_status_updated",
        title: `Your issue "${updated.title}" was updated`,
        message: `Status: ${updated.status}${
          updated.adminNotes ? ` - ${updated.adminNotes}` : ""
        }`,
        metadata: {
          issueReportId: updated.id,
          status: updated.status,
        },
        isRead: false,
        link: updated.pageUrl ?? null,
      } as any);
    } catch (notifError) {
      console.error(
        "[ISSUE-REPORT] Failed to create user notification for issue update:",
        notifError
      );
      // Non-fatal
    }

    res.json(updated);
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "updating issue report",
      defaultMessage: "Internal server error",
    });
  }
}

/**
 * Delete an issue report
 */
export async function deleteIssueReport(req: Request, res: Response) {
  try {
    const id = parseIdParam(req.params.id, res, {
      paramName: "Issue report ID",
    });
    if (id === undefined) return;

    const deleted = await storage.deleteIssueReport(id);
    if (!deleted) {
      return res.status(404).json({ message: "Issue report not found" });
    }
    res.status(204).send();
  } catch (error) {
    handleControllerError(error, res, {
      logLabel: "deleting issue report",
      defaultMessage: "Internal server error",
    });
  }
}

