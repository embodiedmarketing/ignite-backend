import { z } from "zod";

/** Transcript parser: record of string keys to string values */
export const parsedAnswersSchema = z.record(z.string(), z.string());

/** Email sequence: exactly 5 emails with emailNumber, subject, body */
export const emailContentSchema = z.object({
  emailNumber: z.number().int().min(1).max(5),
  subject: z.string().min(1),
  body: z.string().min(1),
});
export const emailSequenceResponseSchema = z.object({
  emails: z.array(emailContentSchema).length(5),
});

/** Interactive coach / offer coach response */
export const coachingLevelSchema = z.enum([
  "needs-more-detail",
  "good-start",
  "excellent-depth",
]);
export const interactiveCoachingResponseSchema = z.object({
  level: coachingLevelSchema,
  levelDescription: z.string(),
  feedback: z.string(),
  followUpQuestions: z.array(z.string()),
  interactivePrompts: z.array(z.string()),
  examples: z.array(z.string()),
  nextSteps: z.array(z.string()),
  encouragement: z.string(),
  conversationalResponse: z.string(),
});

/** Improved versions list from AI */
export const improvedVersionsResponseSchema = z
  .object({ improvedVersions: z.array(z.string()).optional() })
  .transform((r) => r.improvedVersions ?? []);

/** Video script: 3 scripts with title and content */
const scriptItemSchema = z.object({
  title: z.string(),
  content: z.string(),
});
export const videoScriptOutputSchema = z.object({
  script1: scriptItemSchema,
  script2: scriptItemSchema,
  script3: scriptItemSchema,
});

/** Core offer coach: evaluation and rewrite */
const categoryScoreSchema = z.object({
  score: z.number(),
  reasoning: z.string(),
});
export const coachingEvaluationSchema = z.object({
  qualityScore: z.number(),
  categoryScores: z
    .object({
      clarity: categoryScoreSchema,
      specificity: categoryScoreSchema,
      differentiation: categoryScoreSchema,
      emotion: categoryScoreSchema,
      proof: categoryScoreSchema,
      alignment: categoryScoreSchema,
    })
    .optional(),
  totalScore: z.number().optional(),
  coachingFeedback: z.string(),
  strongPoints: z.array(z.string()).optional(),
  needsWork: z.array(z.string()).optional(),
  needsRewrite: z.boolean(),
  recommendedRewrite: z.string().optional(),
});
export const rewriteResultSchema = z.object({
  rewrittenContent: z.string(),
  changesSummary: z.string().optional(),
});
/** Core offer coach rewrite (rewrittenText, rationale, improvements) */
export const coreOfferRewriteResultSchema = z.object({
  rewrittenText: z.string(),
  rationale: z.string(),
  improvements: z.array(z.string()).optional(),
});
export const finalSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).optional(),
});
/** Core offer coach final summary */
export const coreOfferFinalSummarySchema = z.object({
  summary: z.string(),
  keyStrengths: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  totalScore: z.number().optional(),
  scoreSummary: z.string().optional(),
});

/** Core outline section coach */
export const sectionEvaluationSchema = z.object({
  qualityScore: z.number(),
  categoryScores: z.object({
    clarity: categoryScoreSchema,
    specificity: categoryScoreSchema,
    emotionalResonance: categoryScoreSchema,
    alignment: categoryScoreSchema,
  }),
  totalScore: z.number(),
  strongPoints: z.array(z.string()),
  needsWork: z.array(z.string()),
  coachingFeedback: z.string(),
  needsRewrite: z.boolean(),
  alignmentIssues: z.array(z.string()),
});
export const sectionRewriteResultSchema = z.object({
  rewrittenContent: z.string(),
  changesSummary: z.string().optional(),
  rationale: z.string().optional(),
  improvements: z.array(z.string()).optional(),
});

/** Content strategy: single content idea (matches prompt shape) */
export const contentIdeaSchema = z.object({
  title: z.string(),
  coreMessage: z.string(),
  format: z.string(),
  emotionalIntention: z.string(),
  callToAction: z.string(),
  category: z.enum(["contrarian", "emotional", "practical", "rooftop", "objection"]),
});

/** Content ideas API: expect object with `ideas` array (not raw array) */
export const contentIdeasResponseSchema = z.object({
  ideas: z.array(contentIdeaSchema).min(1),
});
export const contentIdeasObjectSchema = contentIdeasResponseSchema;

/** Topic idea / tripwire / sales page: generic object with optional known keys */
export const topicIdeasSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())])).or(z.object({
  topics: z.array(z.string()).optional(),
  ideas: z.array(z.string()).optional(),
}));

/** Customer experience / locations: record or object with string values */
export const recordOrObjectSchema = z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())]));

/** Avatar synthesis: object with optional string fields */
export const avatarSynthesisSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

/** Launch email / funnel: flexible JSON object (we validate minimal shape per use case) */
export const jsonObjectSchema = z.record(z.string(), z.unknown());

/** Funnel copy generator: 4 page strings */
export const funnelCopyPagesSchema = z.object({
  optInPage: z.string(),
  tripwirePage: z.string(),
  checkoutPage: z.string(),
  confirmationPage: z.string(),
});

/** Tripwire funnel pages */
const tripwireThankyouSchema = z.object({
  headline: z.string(),
  transition: z.string(),
  productName: z.string(),
  quickTransformation: z.string(),
  price: z.string(),
  benefits: z.array(z.string()),
  socialProof: z.string().optional(),
  urgency: z.string().optional(),
  ctaButton: z.string(),
});
const tripwireCheckoutSchema = z.object({
  headline: z.string(),
  offerRecap: z.string(),
  whatsIncluded: z.array(z.string()),
  price: z.string(),
  trustElements: z.array(z.string()),
});
const tripwireConfirmationSchema = z.object({
  headline: z.string(),
  deliveryInstructions: z.string(),
  nextSteps: z.array(z.string()),
  encouragement: z.string(),
  supportInfo: z.string().optional(),
});
export const tripwireFunnelPagesSchema = z.object({
  thankyou: tripwireThankyouSchema,
  checkout: tripwireCheckoutSchema,
  confirmation: tripwireConfirmationSchema,
});

/** Topic ideas response */
export const topicIdeasResponseSchema = z.object({
  topicIdeas: z.array(z.string()).optional(),
  strategicInsights: z.array(z.string()).optional(),
}).transform((r) => ({
  topicIdeas: r.topicIdeas ?? [],
  strategicInsights: r.strategicInsights ?? [],
}));

/** Sales page coach section analysis */
export const salesPageSectionAnalysisSchema = z.object({
  level: z.string().optional(),
  levelDescription: z.string().optional(),
  feedback: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  emotionalDepthScore: z.number().optional(),
  clarityScore: z.number().optional(),
  persuasionScore: z.number().optional(),
  improvements: z.array(z.string()).optional(),
});

/** Core offer outline evaluation */
export const outlineEvaluationSchema = z.object({
  overall_score: z.number().optional(),
  strengths: z.array(z.string()).optional(),
  improvements_needed: z.array(z.string()).optional(),
  coaching_feedback: z.string().optional(),
});

/** Messaging strategy output validation - validates structure has required sections */
export const messagingStrategyOutputSchema = z.object({
  strategy: z.string().min(100, "Strategy must be at least 100 characters"),
  sections: z.object({
    corePromise: z.string().optional(),
    idealCustomer: z.string().optional(),
    brandVoice: z.string().optional(),
    problems: z.string().optional(),
    desires: z.string().optional(),
    beliefShifts: z.string().optional(),
    differentiators: z.string().optional(),
    messagingPillars: z.string().optional(),
    hooks: z.string().optional(),
    offerSnapshot: z.string().optional(),
    objections: z.string().optional(),
  }).optional(),
}).passthrough(); // Allow additional fields but validate core structure

/** Sales page output validation - validates HTML/text output has required sections */
export const salesPageOutputSchema = z.string()
  .min(500, "Sales page must be at least 500 characters")
  .refine(
    (content) => {
      const lower = content.toLowerCase();
      // Check for key sections (flexible matching)
      const hasHeadline = /<strong>.*headline|#\s+\w+|headline/i.test(content);
      const hasSolution = /solution|offer|program|course|system/i.test(lower);
      const hasAuthority = /testimonial|about|story|credentials|experience/i.test(lower);
      const hasPricing = /\$|price|investment|cost|pricing/i.test(lower);
      const hasCTA = /click|button|join|enroll|get started|sign up|buy now/i.test(lower);
      
      return hasHeadline && hasSolution && (hasAuthority || hasPricing || hasCTA);
    },
    {
      message: "Sales page must contain headline, solution/offer, and call-to-action sections"
    }
  );
