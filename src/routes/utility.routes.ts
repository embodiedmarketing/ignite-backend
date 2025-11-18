import { Router } from "express";
import {
  ontraportWebhook,
  smartPlacement,
  synthesizeAvatar,
  generateCustomerLocationsRoute,
  checkExistingData,
  migrateLocalStorage,
  migrateLocalStorageAlt,
  checkDatabaseData,
  getFunnelCopy,
  updateFunnelCopy,
  getIgniteDocs,
  createIgniteDoc,
  updateIgniteDoc,
  getStrategyInterviewLinks,
  createStrategyInterviewLink,
  deleteStrategyInterviewLink,
  getSalesPageDrafts,
  getActiveSalesPageDrafts,
  createSalesPageDraft,
  updateSalesPageDraft,
  deleteSalesPageDraft,
  setActiveSalesPageDraft,
  deleteSalesPageDraftsByUser,
  generateEmailSequence,
  getVideoScriptGeneratorState,
  saveVideoScriptGeneratorState,
  saveLaunchRegistrationFunnelData,
  getLaunchRegistrationFunnelData,
  generateLaunchRegistrationFunnelCopy,
  generateLaunchSalesPageCopy,
  generateLaunchEmailSequence,
  getLaunchEmails,
  updateLaunchEmail,
  saveFunnelTrackerData,
  getFunnelTrackerData,
  saveOptimizationSuggestions,
  getOptimizationSuggestions,
  saveImplementationCheckboxes,
  getImplementationCheckboxes,
} from "../controllers/utility.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// Webhooks and external integrations
router.post("/ontraport-webhook", ontraportWebhook);

// AI utility routes
router.post("/smart-placement", smartPlacement);
router.post("/synthesize-avatar", synthesizeAvatar);
router.post("/generate-customer-locations", generateCustomerLocationsRoute);
router.post("/ai/customer-locations", generateCustomerLocationsRoute);

// Migration routes
router.get(
  "/migration/check-existing/:userId",
  isAuthenticated,
  checkExistingData
);
router.post("/migration/migrate", isAuthenticated, migrateLocalStorage);
router.post("/migrate-localStorage", isAuthenticated, migrateLocalStorageAlt);
router.get("/check-database-data/:userId", isAuthenticated, checkDatabaseData);

// Funnel copy routes
router.get("/funnel-copy/user/:userId", getFunnelCopy);
router.put("/funnel-copy/user/:userId", updateFunnelCopy);

// IGNITE docs routes
router.get("/ignite-docs/user/:userId", getIgniteDocs);
router.post("/ignite-docs", createIgniteDoc);
router.put("/ignite-docs/:id", updateIgniteDoc);

// Strategy interview links routes
router.get("/strategy-interview-links/:strategyId", getStrategyInterviewLinks);
router.post("/strategy-interview-links", createStrategyInterviewLink);
router.delete(
  "/strategy-interview-links/:strategyId/:transcriptId",
  deleteStrategyInterviewLink
);

// Sales page drafts routes
router.get("/sales-page-drafts/user/:userId", getSalesPageDrafts);
router.get("/sales-page-drafts/active/:userId", getActiveSalesPageDrafts);
router.post("/sales-page-drafts", createSalesPageDraft);
router.put("/sales-page-drafts/:id", updateSalesPageDraft);
router.delete("/sales-page-drafts/:id", deleteSalesPageDraft);
router.post("/sales-page-drafts/set-active", setActiveSalesPageDraft);
router.delete("/sales-page-drafts/user/:userId", deleteSalesPageDraftsByUser);

// Email sequence generation
router.post("/generate-email-sequence", isAuthenticated, generateEmailSequence);

// Video script generator state
router.get(
  "/video-script-generator-state",
  isAuthenticated,
  getVideoScriptGeneratorState
);
router.post(
  "/video-script-generator-state",
  isAuthenticated,
  saveVideoScriptGeneratorState
);

// Launch registration funnel data
router.post(
  "/launch-registration-funnel-data",
  isAuthenticated,
  saveLaunchRegistrationFunnelData
);
router.get(
  "/launch-registration-funnel-data",
  isAuthenticated,
  getLaunchRegistrationFunnelData
);

// Launch registration funnel copy generation
router.post(
  "/launch-registration-funnel/generate-copy",
  isAuthenticated,
  generateLaunchRegistrationFunnelCopy
);

// Launch sales page copy generation
router.post(
  "/launch-sales-page/generate-copy",
  isAuthenticated,
  generateLaunchSalesPageCopy
);

// Launch emails routes
router.post(
  "/launch-emails/generate-sequence",
  isAuthenticated,
  generateLaunchEmailSequence
);
router.get("/launch-emails/:userId", isAuthenticated, getLaunchEmails);
router.put("/launch-emails/:emailId", isAuthenticated, updateLaunchEmail);

// Funnel tracker data routes
router.post("/funnel-tracker-data", isAuthenticated, saveFunnelTrackerData);
router.get("/funnel-tracker-data", isAuthenticated, getFunnelTrackerData);

// Optimization suggestions routes
router.post(
  "/optimization-suggestions",
  isAuthenticated,
  saveOptimizationSuggestions
);
router.get(
  "/optimization-suggestions",
  isAuthenticated,
  getOptimizationSuggestions
);

// Implementation checkboxes routes
router.post(
  "/implementation-checkboxes",
  isAuthenticated,
  saveImplementationCheckboxes
);
router.get(
  "/implementation-checkboxes/:pageIdentifier",
  isAuthenticated,
  getImplementationCheckboxes
);

export default router;
