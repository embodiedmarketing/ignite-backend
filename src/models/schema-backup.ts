import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
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
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for traditional authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // active, canceled, past_due, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  userId: varchar("user_id").notNull(),
  offerId: integer("offer_id"),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"), // draft, published, archived
  inputs: jsonb("inputs"), // Store the form inputs used to generate the page
  completeness: integer("completeness").notNull().default(0), // 0-100
  missingElements: jsonb("missing_elements"), // Store missing elements array
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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

export const interviewNotes = pgTable("interview_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  noteKey: varchar("note_key").notNull(), // e.g., "frustrations", "demographics", etc.
  content: text("content").notNull(),
  source: varchar("source").default("manual"), // manual, transcript, synthesis
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
export const workbookResponses = pgTable("workbook_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  sectionTitle: varchar("section_title").notNull(),
  questionKey: varchar("question_key").notNull(),
  responseText: text("response_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate responses for same question
  uniqueUserQuestion: index("unique_user_question").on(table.userId, table.stepNumber, table.questionKey)
}));

// Strategy interview links table to track which interviews contributed to strategies
export const strategyInterviewLinks = pgTable("strategy_interview_links", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull(),
  transcriptId: integer("transcript_id").notNull(),
  contributionType: varchar("contribution_type").notNull().default("source"), // source, update, revision
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate links
  uniqueStrategyTranscript: index("unique_strategy_transcript").on(table.strategyId, table.transcriptId)
}));

// User offer outlines table for standalone offer outline generation (not tied to specific offers)
export const userOfferOutlines = pgTable("user_offer_outlines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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
});

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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const insertInterviewNotesSchema = createInsertSchema(interviewNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewNotesHistorySchema = createInsertSchema(interviewNotesHistory).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type SignupUser = z.infer<typeof signupUserSchema>;
export type InterviewNote = typeof interviewNotes.$inferSelect;
export type InsertInterviewNote = z.infer<typeof insertInterviewNotesSchema>;
export type InterviewNoteHistory = typeof interviewNotesHistory.$inferSelect;
export type InsertInterviewNoteHistory = z.infer<typeof insertInterviewNotesHistorySchema>;

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferResponseSchema = createInsertSchema(offerResponses).omit({
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

export const insertCustomerExperiencePlanSchema = createInsertSchema(customerExperiencePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIcaInterviewTranscriptSchema = createInsertSchema(icaInterviewTranscripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserOfferOutlineSchema = createInsertSchema(userOfferOutlines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesPageDraftSchema = createInsertSchema(salesPageDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof insertUserSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type OfferResponse = typeof offerResponses.$inferSelect;
export type InsertOfferResponse = z.infer<typeof insertOfferResponseSchema>;
export type OfferOutline = typeof offerOutlines.$inferSelect;
export type InsertOfferOutline = z.infer<typeof insertOfferOutlineSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type StepContent = typeof stepContent.$inferSelect;
export type InsertStepContent = z.infer<typeof insertStepContentSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type SalesPage = typeof salesPages.$inferSelect;
export type InsertSalesPage = z.infer<typeof insertSalesPageSchema>;
export type CustomerExperiencePlan = typeof customerExperiencePlans.$inferSelect;
export type InsertCustomerExperiencePlan = z.infer<typeof insertCustomerExperiencePlanSchema>;
export type IcaInterviewTranscript = typeof icaInterviewTranscripts.$inferSelect;
export type InsertIcaInterviewTranscript = z.infer<typeof insertIcaInterviewTranscriptSchema>;
export type UserOfferOutline = typeof userOfferOutlines.$inferSelect;
export type InsertUserOfferOutline = z.infer<typeof insertUserOfferOutlineSchema>;
export type SalesPageDraft = typeof salesPageDrafts.$inferSelect;
export type InsertSalesPageDraft = z.infer<typeof insertSalesPageDraftSchema>;
export type MessagingStrategy = typeof messagingStrategies.$inferSelect;
export type InsertMessagingStrategy = z.infer<typeof insertMessagingStrategySchema>;
export type WorkbookResponse = typeof workbookResponses.$inferSelect;
export type InsertWorkbookResponse = z.infer<typeof insertWorkbookResponseSchema>;
export type StrategyInterviewLink = typeof strategyInterviewLinks.$inferSelect;
export type InsertStrategyInterviewLink = z.infer<typeof insertStrategyInterviewLinkSchema>;

export const insertIssueReportSchema = createInsertSchema(issueReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type IssueReport = typeof issueReports.$inferSelect;
export type InsertIssueReport = z.infer<typeof insertIssueReportSchema>;
