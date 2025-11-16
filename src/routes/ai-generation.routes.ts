import { Router } from "express";
import {
  generateMessagingStrategy,
  generateOfferOutline,
  generateSalesPage,
  coachSalesSection,
  improveSalesSection,
  generateCustomerExperience,
  formatComprehensivePlan,
  generateTopicIdeas,
  generateContentStrategy,
  generateContentIdeas,
  generateFunnelCopy,
  generateVideoScripts,
} from "../controllers/ai-generation.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

router.post("/messaging-strategy", generateMessagingStrategy);
router.post("/offer-outline", generateOfferOutline);
router.post("/sales-page", generateSalesPage);
router.post("/coach-sales-section", coachSalesSection);
router.post("/improve-sales-section", improveSalesSection);
router.post("/customer-experience", generateCustomerExperience);
router.post("/format-comprehensive-plan", formatComprehensivePlan);
router.post("/topic-ideas", generateTopicIdeas);
router.post("/content-strategy", isAuthenticated, generateContentStrategy);
router.post("/content-ideas", isAuthenticated, generateContentIdeas);
router.post("/funnel-copy", generateFunnelCopy);
router.post("/video-scripts", isAuthenticated, generateVideoScripts);

export default router;
