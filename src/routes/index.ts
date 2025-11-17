import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import healthRoutes from "./health.routes";
import paymentRoutes from "./payment.routes";
import offersRoutes from "./offers.routes";
import activitiesRoutes from "./activities.routes";
import conversationsRoutes from "./conversations.routes";
import communitiesRoutes from "./communities.routes";
import stepContentRoutes from "./step-content.routes";
import templatesRoutes from "./templates.routes";
import issueReportsRoutes from "./issue-reports.routes";
import notificationsRoutes from "./notifications.routes";
import emailTrackingRoutes from "./email-tracking.routes";
import liveLaunchesRoutes from "./live-launches.routes";
import forumRoutes from "./forum.routes";
import accountabilityRoutes from "./accountability.routes";
import messagingStrategyRoutes from "./messaging-strategy.routes";
import workbookRoutes from "./workbook.routes";
import aiInterviewRoutes from "./ai-interview.routes";
import aiCoreOfferRoutes from "./ai-core-offer.routes";
import aiFeedbackRoutes from "./ai-feedback.routes";
import aiCoachingRoutes from "./ai-coaching.routes";
import userOffersRoutes from "./user-offers.routes";
import userOfferOutlinesRoutes from "./user-offer-outlines.routes";
import sectionCompletionsRoutes from "./section-completions.routes";
import checklistItemsRoutes from "./checklist-items.routes";
import aiGenerationRoutes from "./ai-generation.routes";
import salesPagesRoutes from "./sales-pages.routes";
import customerExperienceRoutes from "./customer-experience.routes";
import interviewTranscriptsRoutes from "./interview-transcripts.routes";
import interviewNotesRoutes from "./interview-notes.routes";
import adminRoutes from "./admin.routes";
import utilityRoutes from "./utility.routes";
import contentStrategyRoutes from "./content-strategy.routes";
import userMonitoringRoutes from "./user-monitoring.routes";

/**
 * Register all routes with the Express app
 */
export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Register new modular routes
  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/auth", userRoutes); // User routes under /api/auth (profile, last-visited)
  app.use("/api", paymentRoutes); // Payment routes: /api/create-payment-intent, /api/stripe-webhook, /api/create-checkout-session
  app.use("/api/offers", offersRoutes);
  app.use("/api/activities", activitiesRoutes);
  app.use("/api/conversations", conversationsRoutes);
  app.use("/api/communities", communitiesRoutes);
  app.use("/api/step-content", stepContentRoutes);
  app.use("/api/templates", templatesRoutes);
  app.use("/api/issue-reports", issueReportsRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/email-tracking", emailTrackingRoutes);
  app.use("/api/live-launches", liveLaunchesRoutes);
  app.use("/api/forum", forumRoutes);
  app.use("/api/accountability", accountabilityRoutes);
  app.use("/api/messaging-strategies", messagingStrategyRoutes);
  app.use("/api/workbook-responses", workbookRoutes);
  app.use("/api/interview", aiInterviewRoutes); // AI interview routes: /api/interview/parse-transcript, etc.
  app.use("/api/core-offer", aiCoreOfferRoutes); // Core offer routes: /api/core-offer/coach/:questionKey, etc.
  app.use("/api/ai-feedback", aiFeedbackRoutes); // AI feedback routes: /api/ai-feedback/analyze-response, etc.
  app.use("/api/ai-coaching", aiCoachingRoutes); // AI coaching routes: /api/ai-coaching/interactive-coaching, etc.
  
  // Direct route mappings to match server/routes.ts exactly
  app.post("/api/real-time-feedback", async (req, res) => {
    const { getRealTimeFeedbackRoute } = await import("../controllers/ai-coaching.controller");
    return getRealTimeFeedbackRoute(req, res);
  });
  
  app.post("/api/upload-transcript", async (req, res) => {
    const { upload } = await import("../middlewares/upload.middleware");
    const { uploadTranscript } = await import("../controllers/ai-interview.controller");
    return upload.single("transcript")(req, res, () => uploadTranscript(req, res));
  });
  
  app.use("/api/user-offers", userOffersRoutes);
  app.use("/api/user-offer-outlines", userOfferOutlinesRoutes);
  app.use("/api/section-completions", sectionCompletionsRoutes);
  app.use("/api/checklist-items", checklistItemsRoutes);
  app.use("/api/ai-generation", aiGenerationRoutes); // AI generation routes: /api/ai-generation/messaging-strategy, etc.
  app.use("/api/sales-pages", salesPagesRoutes);
  app.use("/api/customer-experience-plans", customerExperienceRoutes);
  app.use("/api/interview-transcripts", interviewTranscriptsRoutes);
  app.use("/api/interview-notes", interviewNotesRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", utilityRoutes); // Utility routes: /api/ontraport-webhook, /api/migration/*, etc.
  app.use("/api/content-strategy", contentStrategyRoutes); // Content strategy preferences
  app.use("/api/user-monitoring", userMonitoringRoutes); // User monitoring routes

  // All routes have been extracted from server/routes.ts
  // Return the server instance
  return server;
}
