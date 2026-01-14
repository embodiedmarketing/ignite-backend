import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  index,
  uniqueIndex,
  unique,
  real,
} from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for traditional authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  businessName: varchar("business_name"),
  aboutMe: text("about_me"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // active, canceled, past_due, etc.
  hasCompletedOnboarding: boolean("has_completed_onboarding")
    .default(false)
    .notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastVisitedPath: varchar("last_visited_path", { length: 500 }), // "continue where you left off"
  lastVisitedSection: varchar("last_visited_section", { length: 255 }), // friendly section name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    token: varchar("token", { length: 255 }).unique().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenIdx: index("idx_password_reset_tokens_token").on(table.token),
    userIdIdx: index("idx_password_reset_tokens_user_id").on(table.userId),
    expiresAtIdx: index("idx_password_reset_tokens_expires_at").on(
      table.expiresAt
    ),
  })
);

// User logins table to track login history
export const userLogins = pgTable(
  "user_logins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    loginAt: timestamp("login_at").notNull().defaultNow(),
    ipAddress: varchar("ip_address", { length: 45 }), // Support IPv6
    userAgent: text("user_agent"),
  },
  (table) => ({
    userIdIdx: index("idx_user_logins_user_id").on(table.userId),
    loginAtIdx: index("idx_user_logins_login_at").on(table.loginAt),
    userLoginIdx: index("idx_user_logins_user_login").on(
      table.userId,
      table.loginAt
    ),
  })
);

// User offers table for multi-offer creation system
export const userOffers = pgTable(
  "user_offers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, complete, archived
    isActive: boolean("is_active").default(false).notNull(), // which offer user is currently working on
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_user_offers_user_id").on(table.userId),
    activeIdx: index("idx_user_offers_active").on(table.userId, table.isActive),
  })
);

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // course, consulting, service, product
  status: text("status").notNull().default("draft"), // draft, in_development, ready, launched
  progress: integer("progress").notNull().default(0), // 0-100
  currentStep: integer("current_step").notNull().default(1),
  totalSteps: integer("total_steps").notNull().default(6),
  description: text("description"),
  pricing: jsonb("pricing"),
  targetCustomer: jsonb("target_customer"),
  valueProposition: text("value_proposition"),
  conversationScript: text("conversation_script"),
  communityOutreach: jsonb("community_outreach"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Offer responses table to store user answers for each offer
export const offerResponses = pgTable("offer_responses", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull(),
  userId: integer("user_id").notNull(),
  section: text("section").notNull(), // e.g., "Offer Foundation", "Offer Structure"
  questionKey: text("question_key").notNull(),
  questionText: text("question_text").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Offer outlines table to store generated outlines for each offer
export const offerOutlines = pgTable("offer_outlines", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull(),
  userId: integer("user_id").notNull(),
  outline: text("outline").notNull(),
  completeness: integer("completeness").notNull().default(0),
  missingInformation: jsonb("missing_information"),
  recommendations: jsonb("recommendations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  offerId: integer("offer_id"),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  offerId: integer("offer_id"),
  customerName: text("customer_name"),
  platform: text("platform"),
  status: text("status").notNull(), // scheduled, completed, follow_up
  notes: text("notes"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salesPages = pgTable("sales_pages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"), // draft, published, archived
  inputs: jsonb("inputs"), // Store the form inputs used to generate the page
  completeness: integer("completeness").notNull().default(0), // 0-100
  missingElements: jsonb("missing_elements"), // Store missing elements array
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Funnel copy storage table for persistent funnel copy across sessions
export const funnelCopies = pgTable(
  "funnel_copies",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    offerNumber: integer("offer_number").notNull().default(1),
    optInPage: text("opt_in_page").notNull().default(""),
    tripwirePage: text("tripwire_page").notNull().default(""),
    checkoutPage: text("checkout_page").notNull().default(""),
    confirmationPage: text("confirmation_page").notNull().default(""),
    inputs: jsonb("inputs"), // Store the form inputs used to generate the copy
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userOfferIdx: uniqueIndex("idx_funnel_copies_user_offer").on(
      table.userId,
      table.offerNumber
    ),
  })
);

export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  url: text("url"),
  memberCount: integer("member_count"),
  description: text("description"),
  targetRelevance: integer("target_relevance"), // 1-10 rating
  status: text("status").notNull().default("identified"), // identified, joined, active
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stepContent = pgTable("step_content", {
  id: serial("id").primaryKey(),
  stepNumber: integer("step_number").notNull(),
  stepName: text("step_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  detailedContent: text("detailed_content"),
  tips: text("tips").array(),
  examples: text("examples").array(),
  resources: jsonb("resources"), // { templates: [], videos: [], links: [] }
  questions: text("questions").array(),
  actionItems: text("action_items").array(),
  videos: jsonb("videos"), // { vimeoIds: [], titles: [], descriptions: [] }
  workbookUrl: text("workbook_url"),
  interactivePrompts: jsonb("interactive_prompts"), // structured prompts for user interaction
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  stepNumber: integer("step_number").notNull(),
  completedPrompts: jsonb("completed_prompts"), // user's responses to interactive prompts
  brandVoice: text("brand_voice"),
  customerAvatar: jsonb("customer_avatar"), // detailed customer avatar data
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // worksheet, script, email, etc.
  description: text("description").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(),
  stepNumber: integer("step_number"), // optional association with a step
  isPublic: boolean("is_public").notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerExperiencePlans = pgTable("customer_experience_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  deliveryMethod: text("delivery_method").notNull(),
  duration: text("duration").notNull(),
  communicationFrequency: text("communication_frequency").notNull(),
  onboardingElements: text("onboarding_elements").array(),
  customOnboardingInfo: text("custom_onboarding_info"),
  feedbackMethod: text("feedback_method").notNull(),
  hasUpsells: boolean("has_upsells").notNull().default(false),
  nextOfferType: text("next_offer_type"),
  nextOfferReady: boolean("next_offer_ready").default(false),
  upsellTimeline: text("upsell_timeline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const icaInterviewTranscripts = pgTable("ica_interview_transcripts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  customerName: text("customer_name"),
  interviewDate: timestamp("interview_date"),
  platform: text("platform"), // zoom, phone, in-person, etc.
  duration: text("duration"), // e.g., "45 minutes"
  rawTranscript: text("raw_transcript").notNull(),
  extractedInsights: jsonb("extracted_insights"), // AI-parsed key insights
  tags: text("tags").array(), // user-defined tags for organization
  notes: text("notes"), // user's additional notes about the interview
  status: text("status").notNull().default("draft"), // draft, processing, processed, updated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interviewProcessingJobs = pgTable(
  "interview_processing_jobs",
  {
    id: varchar("id").primaryKey(), // UUID format: job_xxxxx
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("queued"), // queued, running, succeeded, failed
    transcriptIds: integer("transcript_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::integer[]`), // IDs of transcripts to process
    processedTranscriptIds: integer("processed_transcript_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::integer[]`), // IDs successfully processed
    totalTranscripts: integer("total_transcripts").notNull().default(0),
    processedCount: integer("processed_count").notNull().default(0),
    errorMessage: text("error_message"), // Error details if failed
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    lastHeartbeat: timestamp("last_heartbeat"), // For detecting stuck jobs
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_interview_jobs_user_id").on(table.userId),
    statusIdx: index("idx_interview_jobs_status").on(table.status),
    createdAtIdx: index("idx_interview_jobs_created_at").on(table.createdAt),
  })
);

export const interviewNotes = pgTable(
  "interview_notes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    noteKey: varchar("note_key").notNull(), // e.g., "frustrations", "demographics", etc.
    content: text("content").notNull(),
    source: varchar("source").default("manual"), // manual, transcript, synthesis
    isDeleted: boolean("is_deleted").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserNote: unique().on(table.userId, table.noteKey),
  })
);

export const interviewNotesHistory = pgTable("interview_notes_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  noteKey: varchar("note_key").notNull(),
  content: text("content"),
  actionType: varchar("action_type").notNull(), // create, update, delete
  source: varchar("source").default("manual"),
  sessionId: varchar("session_id"), // to group related changes
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const sectionCompletions = pgTable(
  "section_completions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    stepNumber: integer("step_number").notNull(),
    sectionTitle: varchar("section_title", { length: 255 }).notNull(),
    offerNumber: integer("offer_number").notNull().default(1), // Track completions per offer
    completedAt: timestamp("completed_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userStepIdx: index("idx_section_completions_user_step").on(
      table.userId,
      table.stepNumber
    ),
    uniqueCompletion: index("idx_section_completions_unique").on(
      table.userId,
      table.stepNumber,
      table.sectionTitle
    ),
    uniqueOfferCompletion: index("idx_section_completions_offer_unique").on(
      table.userId,
      table.stepNumber,
      table.sectionTitle,
      table.offerNumber
    ),
  })
);

// Checklist items table for persistent checkbox state tracking
export const checklistItems = pgTable(
  "checklist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    sectionKey: varchar("section_key", { length: 255 }).notNull(), // e.g., "visibility_ad", "lead_generation"
    itemKey: varchar("item_key", { length: 255 }).notNull(), // e.g., "content", "adCopy", "targeting", "launch"
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userSectionIdx: index("idx_checklist_items_user_section").on(
      table.userId,
      table.sectionKey
    ),
    uniqueItem: unique().on(table.userId, table.sectionKey, table.itemKey),
  })
);

export const issueReports = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userEmail: varchar("user_email"),
  issueType: varchar("issue_type").notNull(), // bug, feature_request, improvement, technical_issue
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, critical
  status: varchar("status").notNull().default("open"), // open, in_progress, resolved, closed
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  browserInfo: jsonb("browser_info"),
  pageUrl: varchar("page_url"),
  screenshotUrl: varchar("screenshot_url"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messaging strategies table for persistent strategy storage
export const messagingStrategies = pgTable("messaging_strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title").notNull().default("Messaging Strategy"),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  sourceData: jsonb("source_data"), // workbook responses that generated this strategy
  completionPercentage: integer("completion_percentage").default(0),
  missingInformation: jsonb("missing_information"), // what data was missing during generation
  recommendations: jsonb("recommendations"), // AI recommendations for improvement
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workbook responses table for persistent response storage
export const workbookResponses = pgTable(
  "workbook_responses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    offerId: integer("offer_id").references(() => userOffers.id), // Multi-offer support (nullable for backward compatibility)
    offerNumber: integer("offer_number").notNull().default(1), // Simple offer identification: 1 for first offer, 2 for second offer
    stepNumber: integer("step_number").notNull(),
    sectionTitle: varchar("section_title").notNull(),
    questionKey: varchar("question_key").notNull(),
    // CRITICAL FIX: Allow empty strings for cleared content - text persistence fix
    responseText: text("response_text").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Enhanced unique constraint including offer_number for independent offer support
    uniqueUserOfferNumberQuestion: uniqueIndex(
      "unique_user_offer_number_question"
    ).on(table.userId, table.offerNumber, table.stepNumber, table.questionKey),
    // Enhanced unique constraint including offer_id for multi-offer support
    uniqueUserOfferQuestion: index("unique_user_offer_question").on(
      table.userId,
      table.offerId,
      table.stepNumber,
      table.questionKey
    ),
    // Legacy constraint for backward compatibility (will be removed after migration)
    uniqueUserQuestion: index("unique_user_question").on(
      table.userId,
      table.stepNumber,
      table.questionKey
    ),
    // Step 4 enhanced indexes for complex sales strategy queries
    step4SalesStrategyIndex: index("step4_sales_strategy_idx").on(
      table.userId,
      table.stepNumber,
      table.sectionTitle
    ),
    step4CustomerLocationsIndex: index("step4_customer_locations_idx").on(
      table.userId,
      table.questionKey
    ),
    step4DailyPlanningIndex: index("step4_daily_planning_idx").on(
      table.stepNumber,
      table.sectionTitle,
      table.userId
    ),
    // Multi-offer indexes enhanced with offer_number
    offerResponsesIndex: index("offer_responses_idx").on(
      table.offerId,
      table.stepNumber
    ),
    offerNumberResponsesIndex: index("offer_number_responses_idx").on(
      table.userId,
      table.offerNumber,
      table.stepNumber
    ),
  })
);

// Strategy interview links table to track which interviews contributed to strategies
export const strategyInterviewLinks = pgTable(
  "strategy_interview_links",
  {
    id: serial("id").primaryKey(),
    strategyId: integer("strategy_id").notNull(),
    transcriptId: integer("transcript_id").notNull(),
    contributionType: varchar("contribution_type").notNull().default("source"), // source, update, revision
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to prevent duplicate links
    uniqueStrategyTranscript: index("unique_strategy_transcript").on(
      table.strategyId,
      table.transcriptId
    ),
  })
);

// User offer outlines table updated for multi-offer support
export const userOfferOutlines = pgTable(
  "user_offer_outlines",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    offerId: integer("offer_id").references(() => userOffers.id), // Multi-offer support (nullable for backward compatibility)
    offerNumber: integer("offer_number").notNull().default(1), // Simple offer identification: 1 for first offer, 2 for second offer
    title: varchar("title").notNull().default("Offer Outline"),
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    sourceData: jsonb("source_data"), // workbook responses that generated this outline
    completionPercentage: integer("completion_percentage").default(0),
    missingInformation: jsonb("missing_information"), // what data was missing during generation
    recommendations: jsonb("recommendations"), // AI recommendations for improvement
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Index for multi-offer queries
    userOfferIndex: index("user_offer_outline_idx").on(
      table.userId,
      table.offerId
    ),
    // Legacy index for backward compatibility
    userActiveIndex: index("user_active_outline_idx").on(
      table.userId,
      table.isActive
    ),
    // New offer number index for independent offer support
    userOfferNumberIndex: index("user_offer_number_outline_idx").on(
      table.userId,
      table.offerNumber
    ),
    // CRITICAL: Unique constraint to ensure only one active outline per user per offer number
    uniqueActiveOfferOutline: uniqueIndex("unique_active_offer_outline")
      .on(table.userId, table.offerNumber, table.isActive)
      .where(eq(table.isActive, true)),
  })
);

// Core Offer Coaching Sessions table for AI-powered question coaching
export const coreOfferCoachingSessions = pgTable(
  "core_offer_coaching_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    offerId: integer("offer_id").references(() => userOffers.id),
    offerNumber: integer("offer_number").notNull().default(1),
    questionKey: varchar("question_key", { length: 100 }).notNull(),
    originalText: text("original_text"),
    currentText: text("current_text"),
    lastEvaluatedText: text("last_evaluated_text"),
    coachingFeedback: text("coaching_feedback"),
    recommendedRewrite: text("recommended_rewrite"),
    rewriteRationale: text("rewrite_rationale"),
    status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, needs_user, accepted, dismissed, resolved
    qualityScore: integer("quality_score"), // 0-100
    alignmentIssues: jsonb("alignment_issues"), // array of alignment problems
    suggestedFollowUps: jsonb("suggested_follow_ups"), // array of other questions to update
    iterationCount: integer("iteration_count").notNull().default(0),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userQuestionIndex: index("core_coaching_user_question_idx").on(
      table.userId,
      table.questionKey
    ),
    offerQuestionIndex: index("core_coaching_offer_question_idx").on(
      table.offerId,
      table.questionKey
    ),
    statusIndex: index("core_coaching_status_idx").on(
      table.userId,
      table.status
    ),
  })
);

// Sales page drafts table for managing multiple sales page versions
export const salesPageDrafts = pgTable("sales_page_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  draftNumber: integer("draft_number").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  sourceData: jsonb("source_data"), // messaging strategy + offer outline data used
  inputs: jsonb("inputs"), // form inputs used to generate the page
  completeness: integer("completeness").notNull().default(0), // 0-100
  missingElements: jsonb("missing_elements"), // missing elements array
  status: varchar("status").notNull().default("draft"), // draft, published, archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Funnel tracker data table for storing Lead Gen Funnel Tracker data
export const funnelTrackerData = pgTable(
  "funnel_tracker_data",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    tripwireProductCost: varchar("tripwire_product_cost"),
    funnelData: jsonb("funnel_data").notNull(), // Array of MetricData objects
    organicFunnelData: jsonb("organic_funnel_data").notNull(), // Array of MetricData objects
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("funnel_tracker_data_user_idx").on(table.userId),
    // Unique constraint to ensure only one tracker per user
    uniqueUserTracker: uniqueIndex("unique_user_tracker").on(table.userId),
  })
);

// Optimization suggestions table for storing AI-generated funnel optimization suggestions
export const optimizationSuggestions = pgTable(
  "optimization_suggestions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    suggestions: jsonb("suggestions").notNull(), // Array of suggestion objects
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("optimization_suggestions_user_idx").on(table.userId),
    // Unique constraint to ensure only one set of suggestions per user
    uniqueUserSuggestions: uniqueIndex("unique_user_suggestions").on(
      table.userId
    ),
  })
);

// Content strategy responses table for storing user preferences and answers
export const contentStrategyResponses = pgTable(
  "content_strategy_responses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    // Platform and format preferences
    platforms: jsonb("platforms"), // Array of platform strings
    contentTypes: jsonb("content_types"), // Array of preferred content types
    postingFrequency: varchar("posting_frequency"), // How often they want to post
    corePlatform: varchar("core_platform"), // One core platform to focus on
    contentFormat: varchar("content_format"), // Consistent form of weekly content creation

    // Strategic content questions
    desiredFeelings: text("desired_feelings"), // How they want people to feel
    avoidFeelings: text("avoid_feelings"), // What they don't want people to feel
    brandAdjectives: text("brand_adjectives"), // 3-5 brand adjectives
    coreThemes: text("core_themes"), // 3-4 biggest themes/truths audience needs to understand
    problemsMyths: text("problems_myths"), // Common problems/mistakes/myths to address
    valuesBeliefs: text("values_beliefs"), // Values or beliefs to consistently reinforce
    contrarianTakes: text("contrarian_takes"), // 3-5 contrarian or disruptive takes
    actionableTips: text("actionable_tips"), // Quick tips, tools, or frameworks
    commonObjections: text("common_objections"), // Common questions/objections
    beliefShifts: text("belief_shifts"), // Belief shifts audience needs to make
    authenticTruths: text("authentic_truths"), // Truth they want to shout from rooftops
    keyMessage: text("key_message"), // One thing they want audience to remember
    authenticVoice: text("authentic_voice"), // How to say it authentically

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("content_strategy_responses_user_idx").on(table.userId),
  })
);

// Generated content strategy table for storing AI-generated content pillars and ideas
export const generatedContentStrategies = pgTable(
  "generated_content_strategies",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    contentPillars: jsonb("content_pillars").notNull(), // Array of content pillar objects
    contentIdeas: jsonb("content_ideas").notNull(), // Array of content idea objects
    postingCadence: text("posting_cadence"), // Recommended posting schedule
    recommendations: jsonb("recommendations"), // AI-generated recommendations
    sourceData: jsonb("source_data"), // User responses that generated this strategy
    isActive: boolean("is_active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("generated_content_strategies_user_idx").on(
      table.userId
    ),
    activeIndex: index("generated_content_strategies_active_idx").on(
      table.userId,
      table.isActive
    ),
  })
);

// Live Launch table for tracking multiple launches
export const liveLaunches = pgTable(
  "live_launches",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, archived
    offerCost: varchar("offer_cost"), // Offer cost for revenue calculations
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("live_launches_user_idx").on(table.userId),
    userStatusIndex: index("live_launches_user_status_idx").on(
      table.userId,
      table.status
    ),
  })
);

// Live Launch Funnel Metrics table for Ads funnel tracking
export const liveLaunchFunnelMetrics = pgTable(
  "live_launch_funnel_metrics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    liveLaunchId: integer("live_launch_id")
      .references(() => liveLaunches.id)
      .notNull(),
    date: varchar("date").notNull(), // YYYY-MM-DD format
    metricType: varchar("metric_type").notNull(), // e.g., "Ad Spend", "Landing Page Views", "Registration - Ads"
    value: varchar("value"), // Stored as string to handle currency, percentages, numbers
    goal: varchar("goal"), // Goal value for this metric
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    launchDateMetricIndex: index(
      "live_launch_funnel_metrics_launch_date_metric_idx"
    ).on(table.liveLaunchId, table.date, table.metricType),
    userLaunchIndex: index("live_launch_funnel_metrics_user_launch_idx").on(
      table.userId,
      table.liveLaunchId
    ),
    uniqueMetric: unique().on(table.liveLaunchId, table.date, table.metricType),
  })
);

// Live Launch Organic Metrics table for Organic funnel tracking
export const liveLaunchOrganicMetrics = pgTable(
  "live_launch_organic_metrics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    liveLaunchId: integer("live_launch_id")
      .references(() => liveLaunches.id)
      .notNull(),
    date: varchar("date").notNull(), // YYYY-MM-DD format
    metricType: varchar("metric_type").notNull(), // e.g., "Posts", "Registrations - Organic"
    value: varchar("value"), // Stored as string to handle different formats
    goal: varchar("goal"), // Goal value for this metric
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    launchDateMetricIndex: index(
      "live_launch_organic_metrics_launch_date_metric_idx"
    ).on(table.liveLaunchId, table.date, table.metricType),
    userLaunchIndex: index("live_launch_organic_metrics_user_launch_idx").on(
      table.userId,
      table.liveLaunchId
    ),
    uniqueMetric: unique().on(table.liveLaunchId, table.date, table.metricType),
  })
);

// Email tracking table for Live Launch campaigns
export const emailTracking = pgTable(
  "email_tracking",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    liveLaunchId: integer("live_launch_id").references(() => liveLaunches.id), // Link to specific launch (nullable for backward compatibility)
    date: varchar("date").notNull(), // YYYY-MM-DD format
    subject: varchar("subject").notNull(),
    type: varchar("type").notNull(), // Invite, Nurture, Reminder, Sales Promo
    openRate: real("open_rate").notNull(), // Percentage as decimal (e.g., 11.5)
    clickRate: real("click_rate").notNull(), // Percentage as decimal (e.g., 48.0)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userDateIndex: index("email_tracking_user_date_idx").on(
      table.userId,
      table.date
    ),
    typeIndex: index("email_tracking_type_idx").on(table.type),
    launchIndex: index("email_tracking_launch_idx").on(table.liveLaunchId),
  })
);

// AI Optimization Suggestions table for Live Launch tracking
export const liveLaunchOptimizationSuggestions = pgTable(
  "live_launch_optimization_suggestions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    liveLaunchId: integer("live_launch_id")
      .references(() => liveLaunches.id)
      .notNull(),
    suggestionType: varchar("suggestion_type").notNull(), // "success", "warning", "danger"
    title: text("title").notNull(),
    issue: text("issue").notNull(),
    actions: jsonb("actions").notNull(), // Array of action strings
    metricsSnapshot: jsonb("metrics_snapshot"), // Snapshot of metrics that generated this suggestion
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    launchIndex: index("live_launch_optimization_suggestions_launch_idx").on(
      table.liveLaunchId
    ),
    userLaunchIndex: index(
      "live_launch_optimization_suggestions_user_launch_idx"
    ).on(table.userId, table.liveLaunchId),
  })
);

// Launch Registration Funnel Data table for Copy Generator persistence
export const launchRegistrationFunnelData = pgTable(
  "launch_registration_funnel_data",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    launchDateTime: text("launch_date_time"),
    experienceType: text("experience_type"),
    transformationResult: text("transformation_result"),
    topThreeOutcomes: text("top_three_outcomes"),
    specificProblem: text("specific_problem"),
    urgentProblem: text("urgent_problem"),
    uniqueExperience: text("unique_experience"),
    showUpBonus: text("show_up_bonus"),
    thankYouAction: text("thank_you_action"),
    painPoints: text("pain_points"),
    quickWin: text("quick_win"),
    objections: text("objections"),
    socialProofResults: text("social_proof_results"),
    generatedOptInPage: text("generated_opt_in_page"),
    generatedThankYouPage: text("generated_thank_you_page"),
    generatedSalesPageCopy: text("generated_sales_page_copy"),
    salesPageAction: text("sales_page_action"),
    salesPageUrgency: text("sales_page_urgency"),
    salesPageOfferName: text("sales_page_offer_name"),
    salesPageOfferPrice: text("sales_page_offer_price"),
    salesPageCorePromise: text("sales_page_core_promise"),
    salesPageWhatsIncluded: text("sales_page_whats_included"),
    salesPageUniqueApproach: text("sales_page_unique_approach"),
    // Launch Email Inputs
    emailInviteHooks: text("email_invite_hooks"),
    emailInviteFOMO: text("email_invite_fomo"),
    emailConfirmationDetails: text("email_confirmation_details"),
    emailPreEventActions: text("email_pre_event_actions"),
    emailNurtureContent: text("email_nurture_content"),
    emailLiveAttendanceValue: text("email_live_attendance_value"),
    emailMythsBeliefs: text("email_myths_beliefs"),
    emailSalesStories: text("email_sales_stories"),
    emailFinalPush: text("email_final_push"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: uniqueIndex("launch_registration_funnel_data_user_idx").on(
      table.userId
    ),
  })
);

// IGNITE Documents table for storing all generated strategy and content documents
export const igniteDocuments = pgTable(
  "ignite_documents",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    docType: varchar("doc_type").notNull(), // 'messaging', 'tripwire', 'core', 'content_strategy', 'content_ideas', 'lead_generation', 'email_sequence', 'video_scripts'
    title: varchar("title", { length: 500 }).notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    sourcePayload: jsonb("source_payload"), // Metadata and generation parameters
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("ignite_documents_user_idx").on(table.userId),
    userTypeIndex: index("ignite_documents_user_type_idx").on(
      table.userId,
      table.docType
    ),
  })
);

// Launch Email Sequences table for storing 17-email launch sequences
export const launchEmailSequences = pgTable(
  "launch_email_sequences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    sequenceId: varchar("sequence_id").notNull(), // Links all 17 emails in a sequence together
    emailType: varchar("email_type").notNull(), // 'registration', 'confirmation', 'nurture', 'reminder', 'sales'
    emailNumber: integer("email_number").notNull(), // 1-5 for registration, 1-3 for nurture, etc.
    subject: text("subject"),
    body: text("body").notNull(),
    metadata: jsonb("metadata"), // User inputs used to generate this email
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("launch_email_sequences_user_idx").on(table.userId),
    userTypeIndex: index("launch_email_sequences_user_type_idx").on(
      table.userId,
      table.emailType
    ),
  })
);

// Video Script Generator State table for persistence
export const videoScriptGeneratorState = pgTable(
  "video_script_generator_state",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().unique(),
    landingPageUrl: text("landing_page_url"),
    manualContent: text("manual_content"), // Stores manually pasted content
    inputMethod: varchar("input_method", { length: 20 }), // 'manual' or 'url'
    generatedScripts: jsonb("generated_scripts"), // Stores { script1: { title, content }, script2: { title, content }, script3: { title, content } }
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIndex: index("video_script_generator_state_user_idx").on(
      table.userId
    ),
  })
);

// Forum tables for community discussion functionality
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .references(() => forumCategories.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    attachments: jsonb("attachments"),
    replyCount: integer("reply_count").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    categoryActivityIndex: index("forum_threads_category_activity_idx").on(
      table.categoryId,
      table.lastActivityAt
    ),
    userIndex: index("forum_threads_user_idx").on(table.userId),
  })
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .references(() => forumThreads.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    parentId: integer("parent_id"),
    body: text("body").notNull(),
    attachments: jsonb("attachments"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    threadIndex: index("forum_posts_thread_idx").on(
      table.threadId,
      table.createdAt
    ),
    userIndex: index("forum_posts_user_idx").on(table.userId),
    parentIndex: index("forum_posts_parent_idx").on(table.parentId),
  })
);

// Weekly accountability threads tracking
export const weeklyAccountabilityThreads = pgTable(
  "weekly_accountability_threads",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .references(() => forumThreads.id)
      .notNull(),
    weekStartDate: timestamp("week_start_date").notNull(), // Monday of the week
    weekEndDate: timestamp("week_end_date").notNull(), // Sunday of the week
    isActive: boolean("is_active").notNull().default(true), // Current week's thread
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    weekStartIndex: index("weekly_accountability_week_start_idx").on(
      table.weekStartDate
    ),
    activeIndex: index("weekly_accountability_active_idx").on(table.isActive),
  })
);

// Track user participation in accountability threads
export const accountabilityThreadParticipation = pgTable(
  "accountability_thread_participation",
  {
    id: serial("id").primaryKey(),
    weeklyThreadId: integer("weekly_thread_id")
      .references(() => weeklyAccountabilityThreads.id)
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    hasParticipated: boolean("has_participated").notNull().default(false),
    participatedAt: timestamp("participated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    weeklyUserIndex: uniqueIndex(
      "accountability_participation_weekly_user_idx"
    ).on(table.weeklyThreadId, table.userId),
    userIndex: index("accountability_participation_user_idx").on(table.userId),
  })
);

// Forum insert schemas and types
export const insertForumThreadSchema = createInsertSchema(forumThreads)
  .omit({
    id: true,
    categoryId: true,
    userId: true,
    replyCount: true,
    lastActivityAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    title: z
      .string()
      .min(4, "Title must be at least 4 characters")
      .max(140, "Title must be less than 140 characters"),
    body: z
      .string()
      .min(10, "Thread content must be at least 10 characters")
      .max(20000, "Thread content must be less than 20,000 characters"),
  });

export const insertForumPostSchema = createInsertSchema(forumPosts)
  .omit({
    id: true,
    threadId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    body: z
      .string()
      .min(10, "Reply must be at least 10 characters")
      .max(20000, "Reply must be less than 20,000 characters"),
  });

export type InsertForumThread = z.infer<typeof insertForumThreadSchema>;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumThread = typeof forumThreads.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumCategory = typeof forumCategories.$inferSelect;
export type WeeklyAccountabilityThread =
  typeof weeklyAccountabilityThreads.$inferSelect;
export type AccountabilityThreadParticipation =
  typeof accountabilityThreadParticipation.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const signupUserSchema = insertUserSchema
  .pick({
    email: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

export const loginUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const insertInterviewNotesSchema = createInsertSchema(
  interviewNotes
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewNotesHistorySchema = createInsertSchema(
  interviewNotesHistory
).omit({
  id: true,
  timestamp: true,
});

export const insertSectionCompletionSchema = createInsertSchema(
  sectionCompletions
).omit({
  id: true,
  completedAt: true,
  updatedAt: true,
});

export const insertChecklistItemSchema = createInsertSchema(
  checklistItems
).omit({
  id: true,
  completedAt: true,
  updatedAt: true,
});

export const insertUserLoginSchema = createInsertSchema(userLogins).omit({
  id: true,
  loginAt: true,
});

export type InterviewNote = typeof interviewNotes.$inferSelect;
export type InsertInterviewNote = z.infer<typeof insertInterviewNotesSchema>;
export type InterviewNoteHistory = typeof interviewNotesHistory.$inferSelect;
export type InsertInterviewNoteHistory = z.infer<
  typeof insertInterviewNotesHistorySchema
>;
export type SectionCompletion = typeof sectionCompletions.$inferSelect;
export type InsertSectionCompletion = z.infer<
  typeof insertSectionCompletionSchema
>;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type UserLogin = typeof userLogins.$inferSelect;
export type InsertUserLogin = z.infer<typeof insertUserLoginSchema>;

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferResponseSchema = createInsertSchema(
  offerResponses
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferOutlineSchema = createInsertSchema(offerOutlines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
});

export const insertStepContentSchema = createInsertSchema(stepContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesPageSchema = createInsertSchema(salesPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFunnelCopySchema = createInsertSchema(funnelCopies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerExperiencePlanSchema = createInsertSchema(
  customerExperiencePlans
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIcaInterviewTranscriptSchema = createInsertSchema(
  icaInterviewTranscripts
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewProcessingJobSchema = createInsertSchema(
  interviewProcessingJobs
).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserOfferSchema = createInsertSchema(userOffers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserOfferOutlineSchema = createInsertSchema(
  userOfferOutlines
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoreOfferCoachingSessionSchema = createInsertSchema(
  coreOfferCoachingSessions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesPageDraftSchema = createInsertSchema(
  salesPageDrafts
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFunnelTrackerDataSchema = createInsertSchema(
  funnelTrackerData
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizationSuggestionsSchema = createInsertSchema(
  optimizationSuggestions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentStrategyResponseSchema = createInsertSchema(
  contentStrategyResponses
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGeneratedContentStrategySchema = createInsertSchema(
  generatedContentStrategies
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIgniteDocumentSchema = createInsertSchema(
  igniteDocuments
).omit({
  id: true,
  createdAt: true,
});

export const insertVideoScriptGeneratorStateSchema = createInsertSchema(
  videoScriptGeneratorState
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessagingStrategySchema = createInsertSchema(
  messagingStrategies
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkbookResponseSchema = createInsertSchema(
  workbookResponses
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // CRITICAL FIX: Allow empty strings for cleared content - text persistence fix
    responseText: z.string().min(0), // Explicitly allow empty strings (length 0+)
  });

export const insertStrategyInterviewLinkSchema = createInsertSchema(
  strategyInterviewLinks
).omit({
  id: true,
  createdAt: true,
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type SalesPage = typeof salesPages.$inferSelect;
export type InsertSalesPage = z.infer<typeof insertSalesPageSchema>;
export type FunnelCopy = typeof funnelCopies.$inferSelect;
export type InsertFunnelCopy = z.infer<typeof insertFunnelCopySchema>;
export type CustomerExperiencePlan =
  typeof customerExperiencePlans.$inferSelect;
export type InsertCustomerExperiencePlan = z.infer<
  typeof insertCustomerExperiencePlanSchema
>;
export type IcaInterviewTranscript =
  typeof icaInterviewTranscripts.$inferSelect;
export type InsertIcaInterviewTranscript = z.infer<
  typeof insertIcaInterviewTranscriptSchema
>;
export type InterviewProcessingJob =
  typeof interviewProcessingJobs.$inferSelect;
export type InsertInterviewProcessingJob = z.infer<
  typeof insertInterviewProcessingJobSchema
>;
export type UserOffer = typeof userOffers.$inferSelect;
export type InsertUserOffer = z.infer<typeof insertUserOfferSchema>;
export type UserOfferOutline = typeof userOfferOutlines.$inferSelect;
export type InsertUserOfferOutline = z.infer<
  typeof insertUserOfferOutlineSchema
>;
export type CoreOfferCoachingSession =
  typeof coreOfferCoachingSessions.$inferSelect;
export type InsertCoreOfferCoachingSession = z.infer<
  typeof insertCoreOfferCoachingSessionSchema
>;
export type SalesPageDraft = typeof salesPageDrafts.$inferSelect;
export type InsertSalesPageDraft = z.infer<typeof insertSalesPageDraftSchema>;
export type FunnelTrackerData = typeof funnelTrackerData.$inferSelect;
export type InsertFunnelTrackerData = z.infer<
  typeof insertFunnelTrackerDataSchema
>;
export type OptimizationSuggestions =
  typeof optimizationSuggestions.$inferSelect;
export type InsertOptimizationSuggestions = z.infer<
  typeof insertOptimizationSuggestionsSchema
>;
export type MessagingStrategy = typeof messagingStrategies.$inferSelect;
export type InsertMessagingStrategy = z.infer<
  typeof insertMessagingStrategySchema
>;
export type WorkbookResponse = typeof workbookResponses.$inferSelect;
export type InsertWorkbookResponse = z.infer<
  typeof insertWorkbookResponseSchema
>;
export type StrategyInterviewLink = typeof strategyInterviewLinks.$inferSelect;
export type InsertStrategyInterviewLink = z.infer<
  typeof insertStrategyInterviewLinkSchema
>;

export const insertIssueReportSchema = createInsertSchema(issueReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type IssueReport = typeof issueReports.$inferSelect;
export type InsertIssueReport = z.infer<typeof insertIssueReportSchema>;

// Notifications table for in-app notifications
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    type: varchar("type").notNull(), // issue_reported, status_updated, etc.
    title: varchar("title").notNull(),
    message: text("message").notNull(),
    link: varchar("link"), // Optional link to relevant page
    isRead: boolean("is_read").default(false).notNull(),
    metadata: jsonb("metadata"), // Additional data like issueId, priority, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_notifications_user_id").on(table.userId),
    isReadIdx: index("idx_notifications_is_read").on(table.isRead),
  })
);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Export all missing types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type SignupUser = z.infer<typeof signupUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type StepContent = typeof stepContent.$inferSelect;
export type InsertStepContent = z.infer<typeof insertStepContentSchema>;
export type ContentStrategyResponse =
  typeof contentStrategyResponses.$inferSelect;
export type InsertContentStrategyResponse = z.infer<
  typeof insertContentStrategyResponseSchema
>;
export type GeneratedContentStrategy =
  typeof generatedContentStrategies.$inferSelect;
export type InsertGeneratedContentStrategy = z.infer<
  typeof insertGeneratedContentStrategySchema
>;
export type IgniteDocument = typeof igniteDocuments.$inferSelect;
export type InsertIgniteDocument = z.infer<typeof insertIgniteDocumentSchema>;
export type VideoScriptGeneratorState =
  typeof videoScriptGeneratorState.$inferSelect;
export type InsertVideoScriptGeneratorState = z.infer<
  typeof insertVideoScriptGeneratorStateSchema
>;

export const insertLiveLaunchSchema = createInsertSchema(liveLaunches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLiveLaunchFunnelMetricSchema = createInsertSchema(
  liveLaunchFunnelMetrics
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLiveLaunchOrganicMetricSchema = createInsertSchema(
  liveLaunchOrganicMetrics
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTrackingSchema = createInsertSchema(emailTracking).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
  }
);

export const insertLiveLaunchOptimizationSuggestionSchema = createInsertSchema(
  liveLaunchOptimizationSuggestions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LiveLaunch = typeof liveLaunches.$inferSelect;
export type InsertLiveLaunch = z.infer<typeof insertLiveLaunchSchema>;
export type LiveLaunchFunnelMetric =
  typeof liveLaunchFunnelMetrics.$inferSelect;
export type InsertLiveLaunchFunnelMetric = z.infer<
  typeof insertLiveLaunchFunnelMetricSchema
>;
export type LiveLaunchOrganicMetric =
  typeof liveLaunchOrganicMetrics.$inferSelect;
export type InsertLiveLaunchOrganicMetric = z.infer<
  typeof insertLiveLaunchOrganicMetricSchema
>;
export type EmailTracking = typeof emailTracking.$inferSelect;
export type InsertEmailTracking = z.infer<typeof insertEmailTrackingSchema>;
export type LiveLaunchOptimizationSuggestion =
  typeof liveLaunchOptimizationSuggestions.$inferSelect;
export type InsertLiveLaunchOptimizationSuggestion = z.infer<
  typeof insertLiveLaunchOptimizationSuggestionSchema
>;

export const insertLaunchRegistrationFunnelDataSchema = createInsertSchema(
  launchRegistrationFunnelData
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LaunchRegistrationFunnelData =
  typeof launchRegistrationFunnelData.$inferSelect;
export type InsertLaunchRegistrationFunnelData = z.infer<
  typeof insertLaunchRegistrationFunnelDataSchema
>;

export const insertLaunchEmailSequenceSchema = createInsertSchema(
  launchEmailSequences
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LaunchEmailSequence = typeof launchEmailSequences.$inferSelect;
export type InsertLaunchEmailSequence = z.infer<
  typeof insertLaunchEmailSequenceSchema
>;

// Implementation checkboxes table for persistent checkbox state across devices
export const implementationCheckboxes = pgTable(
  "implementation_checkboxes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    pageIdentifier: varchar("page_identifier", { length: 100 }).notNull(), // e.g., "launch-your-ads", "build-your-strategy"
    checkboxStates: jsonb("checkbox_states").notNull(), // stores the complete checkbox state object
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserPage: unique().on(table.userId, table.pageIdentifier),
    userPageIdx: index("idx_implementation_checkboxes_user_page").on(
      table.userId,
      table.pageIdentifier
    ),
  })
);

export const insertImplementationCheckboxSchema = createInsertSchema(
  implementationCheckboxes
).omit({
  id: true,
  updatedAt: true,
});

export type ImplementationCheckbox =
  typeof implementationCheckboxes.$inferSelect;
export type InsertImplementationCheckbox = z.infer<
  typeof insertImplementationCheckboxSchema
>;

// Admin Content Management Tables

// Training videos managed by admin
export const trainingVideos = pgTable("training_videos", {
  id: serial("id").primaryKey(),
  moduleTitle: varchar("module_title", { length: 255 }).notNull(),
  description: text("description"),
  vimeoId: varchar("vimeo_id", { length: 100 }).notNull(),
  sectionKey: varchar("section_key", { length: 100 }), // e.g., "messaging-mastery", "create-your-offer"
  orderIndex: integer("order_index").notNull().default(0), // for ordering videos within a section
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTrainingVideoSchema = createInsertSchema(
  trainingVideos
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TrainingVideo = typeof trainingVideos.$inferSelect;
export type InsertTrainingVideo = z.infer<typeof insertTrainingVideoSchema>;

// Platform resources (PDFs, templates, links) managed by admin
export const platformResources = pgTable("platform_resources", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // 'pdf', 'template', 'link', 'video'
  resourceUrl: text("resource_url").notNull(), // URL to the resource
  sectionKey: varchar("section_key", { length: 100 }), // optional association with a section
  downloadCount: integer("download_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlatformResourceSchema = createInsertSchema(
  platformResources
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PlatformResource = typeof platformResources.$inferSelect;
export type InsertPlatformResource = z.infer<
  typeof insertPlatformResourceSchema
>;

// Checklist step definitions managed by admin (not user completion tracking)
export const checklistStepDefinitions = pgTable(
  "checklist_step_definitions",
  {
    id: serial("id").primaryKey(),
    sectionKey: varchar("section_key", { length: 255 }).notNull(), // e.g., "launch-your-ads-lead-generation"
    sectionTitle: varchar("section_title", { length: 255 }).notNull(), // e.g., "Launch Your Ads - Lead Generation"
    steps: jsonb("steps").notNull(), // Array of step objects: [{ key: "leadMagnet", label: "Create Lead Magnet", order: 1 }]
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSectionKey: unique().on(table.sectionKey),
  })
);

export const insertChecklistStepDefinitionSchema = createInsertSchema(
  checklistStepDefinitions
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ChecklistStepDefinition =
  typeof checklistStepDefinitions.$inferSelect;
export type InsertChecklistStepDefinition = z.infer<
  typeof insertChecklistStepDefinitionSchema
>;

// Coaching call recordings table
export const coachingCallRecordings = pgTable("coaching_call_recordings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(), // Stored as string in YYYY-MM-DD format
  duration: varchar("duration", { length: 255 }),
  vimeoId: varchar("vimeo_id", { length: 255 }),
  description: text("description"),
  transcript: text("transcript"),
  category: varchar("category", { length: 100 }), // e.g., "strategy", "technical", etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dateIdx: index("idx_coaching_call_recordings_date").on(table.date),
  categoryIdx: index("idx_coaching_call_recordings_category").on(table.category),
}));

export const insertCoachingCallRecordingSchema = createInsertSchema(coachingCallRecordings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CoachingCallRecording = typeof coachingCallRecordings.$inferSelect;
export type InsertCoachingCallRecording = z.infer<typeof insertCoachingCallRecordingSchema>;
