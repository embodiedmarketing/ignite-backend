import { pgTable, index, foreignKey, serial, integer, varchar, text, jsonb, timestamp, unique, boolean, uniqueIndex, real, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const coreOfferCoachingSessions = pgTable("core_offer_coaching_sessions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	offerId: integer("offer_id"),
	offerNumber: integer("offer_number").default(1).notNull(),
	questionKey: varchar("question_key", { length: 100 }).notNull(),
	originalText: text("original_text"),
	currentText: text("current_text"),
	lastEvaluatedText: text("last_evaluated_text"),
	coachingFeedback: text("coaching_feedback"),
	recommendedRewrite: text("recommended_rewrite"),
	rewriteRationale: text("rewrite_rationale"),
	status: varchar({ length: 50 }).default('pending').notNull(),
	qualityScore: integer("quality_score"),
	alignmentIssues: jsonb("alignment_issues"),
	suggestedFollowUps: jsonb("suggested_follow_ups"),
	iterationCount: integer("iteration_count").default(0).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("core_coaching_offer_question_idx").using("btree", table.offerId.asc().nullsLast().op("text_ops"), table.questionKey.asc().nullsLast().op("int4_ops")),
	index("core_coaching_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("core_coaching_user_question_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.questionKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [userOffers.id],
			name: "core_offer_coaching_sessions_offer_id_fkey"
		}),
]);

export const checklistStepDefinitions = pgTable("checklist_step_definitions", {
	id: serial().primaryKey().notNull(),
	sectionKey: varchar("section_key", { length: 255 }).notNull(),
	sectionTitle: varchar("section_title", { length: 255 }).notNull(),
	steps: jsonb().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("checklist_step_definitions_section_key_key").on(table.sectionKey),
]);

export const coachingCallRecordings = pgTable("coaching_call_recordings", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	date: varchar({ length: 50 }).notNull(),
	duration: varchar({ length: 255 }),
	vimeoId: varchar("vimeo_id", { length: 255 }),
	description: text(),
	transcript: text(),
	category: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_coaching_call_recordings_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_coaching_call_recordings_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
]);

export const coachingCallsSchedule = pgTable("coaching_calls_schedule", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	day: varchar({ length: 20 }).notNull(),
	time: varchar({ length: 50 }).notNull(),
	date: varchar({ length: 50 }).notNull(),
	description: text(),
	link: text(),
	color: varchar({ length: 20 }).default('blue').notNull(),
	canceled: boolean().default(false).notNull(),
	cancelReason: text("cancel_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	recurring: boolean().default(false).notNull(),
}, (table) => [
	index("idx_coaching_calls_schedule_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_coaching_calls_schedule_date").using("btree", table.date.asc().nullsLast().op("text_ops")),
]);

export const communities = pgTable("communities", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	name: text().notNull(),
	platform: text().notNull(),
	url: text(),
	memberCount: integer("member_count"),
	description: text(),
	targetRelevance: integer("target_relevance"),
	status: text().default('identified').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const contentStrategyResponses = pgTable("content_strategy_responses", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	platforms: jsonb(),
	contentTypes: jsonb("content_types"),
	postingFrequency: varchar("posting_frequency"),
	corePlatform: varchar("core_platform"),
	contentFormat: varchar("content_format"),
	desiredFeelings: text("desired_feelings"),
	avoidFeelings: text("avoid_feelings"),
	brandAdjectives: text("brand_adjectives"),
	coreThemes: text("core_themes"),
	problemsMyths: text("problems_myths"),
	valuesBeliefs: text("values_beliefs"),
	contrarianTakes: text("contrarian_takes"),
	actionableTips: text("actionable_tips"),
	commonObjections: text("common_objections"),
	beliefShifts: text("belief_shifts"),
	authenticTruths: text("authentic_truths"),
	keyMessage: text("key_message"),
	authenticVoice: text("authentic_voice"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("content_strategy_responses_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const conversations = pgTable("conversations", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	offerId: integer("offer_id"),
	customerName: text("customer_name"),
	platform: text(),
	status: text().notNull(),
	notes: text(),
	outcome: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const customerExperiencePlans = pgTable("customer_experience_plans", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	deliveryMethod: text("delivery_method").notNull(),
	duration: text().notNull(),
	communicationFrequency: text("communication_frequency").notNull(),
	onboardingElements: text("onboarding_elements").array(),
	customOnboardingInfo: text("custom_onboarding_info"),
	feedbackMethod: text("feedback_method").notNull(),
	hasUpsells: boolean("has_upsells").default(false).notNull(),
	nextOfferType: text("next_offer_type"),
	nextOfferReady: boolean("next_offer_ready").default(false),
	upsellTimeline: text("upsell_timeline"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const accountabilityThreadParticipation = pgTable("accountability_thread_participation", {
	id: serial().primaryKey().notNull(),
	weeklyThreadId: integer("weekly_thread_id").notNull(),
	userId: integer("user_id").notNull(),
	hasParticipated: boolean("has_participated").default(false).notNull(),
	participatedAt: timestamp("participated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("accountability_participation_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("accountability_participation_weekly_user_idx").using("btree", table.weeklyThreadId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accountability_thread_participation_user_id_fkey"
		}),
	foreignKey({
			columns: [table.weeklyThreadId],
			foreignColumns: [weeklyAccountabilityThreads.id],
			name: "accountability_thread_participation_weekly_thread_id_fkey"
		}),
]);

export const checklistItems = pgTable("checklist_items", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sectionKey: varchar("section_key", { length: 255 }).notNull(),
	itemKey: varchar("item_key", { length: 255 }).notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_checklist_items_user_section").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.sectionKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "checklist_items_user_id_fkey"
		}),
	unique("checklist_items_user_id_section_key_item_key_key").on(table.userId, table.sectionKey, table.itemKey),
]);

export const customerResearch = pgTable("customer_research", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	q1BiggestFrustration: text("q1_biggest_frustration").default('),
	q2KeepsAwake: text("q2_keeps_awake").default('),
	q3SecretFear: text("q3_secret_fear").default('),
	q4MagicWand: text("q4_magic_wand").default('),
	q5Demographics: text("q5_demographics").default('),
	q6AlreadyTried: text("q6_already_tried").default('),
	q7Blocking: text("q7_blocking").default('),
	q8SourcesAdvice: text("q8_sources_advice").default('),
	q9BuyingDecisions: text("q9_buying_decisions").default('),
	q10NeedsToInvest: text("q10_needs_to_invest").default('),
	q11MeasureSuccess: text("q11_measure_success").default('),
	q12RecommendSolution: text("q12_recommend_solution").default('),
	q13AnythingElse: text("q13_anything_else").default('),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const forumPosts = pgTable("forum_posts", {
	id: serial().primaryKey().notNull(),
	threadId: integer("thread_id").notNull(),
	userId: integer("user_id").notNull(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	parentId: integer("parent_id"),
	attachments: jsonb(),
}, (table) => [
	index("forum_posts_parent_idx").using("btree", table.parentId.asc().nullsLast().op("int4_ops")),
	index("forum_posts_thread_idx").using("btree", table.threadId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	index("forum_posts_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [forumThreads.id],
			name: "forum_posts_thread_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "forum_posts_user_id_fkey"
		}),
]);

export const forumCategories = pgTable("forum_categories", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("forum_categories_slug_key").on(table.slug),
]);

export const emailTracking = pgTable("email_tracking", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	date: varchar().notNull(),
	subject: varchar().notNull(),
	type: varchar().notNull(),
	openRate: real("open_rate").notNull(),
	clickRate: real("click_rate").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	liveLaunchId: integer("live_launch_id"),
}, (table) => [
	index("email_tracking_launch_idx").using("btree", table.liveLaunchId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.liveLaunchId],
			foreignColumns: [liveLaunches.id],
			name: "email_tracking_live_launch_id_fkey"
		}),
]);

export const forumThreads = pgTable("forum_threads", {
	id: serial().primaryKey().notNull(),
	categoryId: integer("category_id").notNull(),
	userId: integer("user_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	replyCount: integer("reply_count").default(0).notNull(),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	attachments: jsonb(),
}, (table) => [
	index("forum_threads_category_activity_idx").using("btree", table.categoryId.asc().nullsLast().op("int4_ops"), table.lastActivityAt.asc().nullsLast().op("int4_ops")),
	index("forum_threads_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [forumCategories.id],
			name: "forum_threads_category_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "forum_threads_user_id_fkey"
		}),
]);

export const funnelCopies = pgTable("funnel_copies", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	offerNumber: integer("offer_number").default(1).notNull(),
	optInPage: text("opt_in_page").default(').notNull(),
	tripwirePage: text("tripwire_page").default(').notNull(),
	checkoutPage: text("checkout_page").default(').notNull(),
	confirmationPage: text("confirmation_page").default(').notNull(),
	inputs: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_funnel_copies_user_offer").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.offerNumber.asc().nullsLast().op("int4_ops")),
]);

export const funnelTrackerData = pgTable("funnel_tracker_data", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	tripwireProductCost: varchar("tripwire_product_cost"),
	funnelData: jsonb("funnel_data").notNull(),
	organicFunnelData: jsonb("organic_funnel_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("funnel_tracker_data_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("unique_user_tracker").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const generatedContentStrategies = pgTable("generated_content_strategies", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	contentPillars: jsonb("content_pillars").notNull(),
	contentIdeas: jsonb("content_ideas").notNull(),
	postingCadence: text("posting_cadence"),
	recommendations: jsonb(),
	sourceData: jsonb("source_data"),
	isActive: boolean("is_active").default(true).notNull(),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("generated_content_strategies_active_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.isActive.asc().nullsLast().op("int4_ops")),
	index("generated_content_strategies_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const icaInterviewTranscripts = pgTable("ica_interview_transcripts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	customerName: text("customer_name"),
	interviewDate: timestamp("interview_date", { mode: 'string' }),
	platform: text(),
	duration: text(),
	rawTranscript: text("raw_transcript").notNull(),
	extractedInsights: jsonb("extracted_insights"),
	tags: text().array(),
	notes: text(),
	status: text().default('processed').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const igniteDocuments = pgTable("ignite_documents", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	docType: varchar("doc_type").notNull(),
	title: varchar({ length: 500 }).notNull(),
	contentMarkdown: text("content_markdown").notNull(),
	sourcePayload: jsonb("source_payload"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ignite_documents_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	index("ignite_documents_user_type_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.docType.asc().nullsLast().op("int4_ops")),
]);

export const interviewNotes = pgTable("interview_notes", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	noteKey: varchar("note_key").notNull(),
	content: text().notNull(),
	source: varchar().default('manual'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isDeleted: boolean("is_deleted").default(false),
});

export const interviewNotesHistory = pgTable("interview_notes_history", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	noteKey: varchar("note_key").notNull(),
	content: text(),
	actionType: varchar("action_type").notNull(),
	source: varchar().default('manual'),
	sessionId: varchar("session_id"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const implementationCheckboxes = pgTable("implementation_checkboxes", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	pageIdentifier: varchar("page_identifier", { length: 255 }).notNull(),
	checkboxStates: jsonb("checkbox_states").default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "implementation_checkboxes_user_id_fkey"
		}).onDelete("cascade"),
	unique("implementation_checkboxes_user_id_page_identifier_key").on(table.userId, table.pageIdentifier),
]);

export const launchEmailSequences = pgTable("launch_email_sequences", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sequenceId: varchar("sequence_id").notNull(),
	emailType: varchar("email_type").notNull(),
	emailNumber: integer("email_number").notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("launch_email_sequences_sequence_id_idx").using("btree", table.sequenceId.asc().nullsLast().op("text_ops")),
	index("launch_email_sequences_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const liveLaunchFunnelMetrics = pgTable("live_launch_funnel_metrics", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	liveLaunchId: integer("live_launch_id").notNull(),
	date: varchar().notNull(),
	metricType: varchar("metric_type").notNull(),
	value: varchar(),
	goal: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("live_launch_funnel_metrics_launch_date_metric_idx").using("btree", table.liveLaunchId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops"), table.metricType.asc().nullsLast().op("text_ops")),
	index("live_launch_funnel_metrics_user_launch_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.liveLaunchId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.liveLaunchId],
			foreignColumns: [liveLaunches.id],
			name: "live_launch_funnel_metrics_live_launch_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "live_launch_funnel_metrics_user_id_fkey"
		}),
	unique("live_launch_funnel_metrics_live_launch_id_date_metric_type_key").on(table.liveLaunchId, table.date, table.metricType),
]);

export const liveLaunchOptimizationSuggestions = pgTable("live_launch_optimization_suggestions", {
	id: serial().primaryKey().notNull(),
	liveLaunchId: integer("live_launch_id").notNull(),
	userId: integer("user_id").notNull(),
	suggestionType: varchar("suggestion_type", { length: 50 }).notNull(),
	title: text().notNull(),
	issue: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	metricsSnapshot: jsonb("metrics_snapshot"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	actions: jsonb().default([]).notNull(),
}, (table) => [
	index("live_launch_optimization_suggestions_launch_idx").using("btree", table.liveLaunchId.asc().nullsLast().op("int4_ops")),
	index("live_launch_optimization_suggestions_user_launch_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.liveLaunchId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.liveLaunchId],
			foreignColumns: [liveLaunches.id],
			name: "live_launch_optimization_suggestions_live_launch_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "live_launch_optimization_suggestions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const liveLaunchOrganicMetrics = pgTable("live_launch_organic_metrics", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	liveLaunchId: integer("live_launch_id").notNull(),
	date: varchar().notNull(),
	metricType: varchar("metric_type").notNull(),
	value: varchar(),
	goal: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("live_launch_organic_metrics_launch_date_metric_idx").using("btree", table.liveLaunchId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops"), table.metricType.asc().nullsLast().op("text_ops")),
	index("live_launch_organic_metrics_user_launch_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.liveLaunchId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.liveLaunchId],
			foreignColumns: [liveLaunches.id],
			name: "live_launch_organic_metrics_live_launch_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "live_launch_organic_metrics_user_id_fkey"
		}),
	unique("live_launch_organic_metrics_live_launch_id_date_metric_type_key").on(table.liveLaunchId, table.date, table.metricType),
]);

export const issueReports = pgTable("issue_reports", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	userEmail: varchar("user_email"),
	issueType: varchar("issue_type").notNull(),
	priority: varchar().default('medium').notNull(),
	status: varchar().default('open').notNull(),
	title: varchar().notNull(),
	description: text().notNull(),
	stepsToReproduce: text("steps_to_reproduce"),
	expectedBehavior: text("expected_behavior"),
	actualBehavior: text("actual_behavior"),
	browserInfo: jsonb("browser_info"),
	pageUrl: varchar("page_url"),
	screenshotUrl: varchar("screenshot_url"),
	adminNotes: text("admin_notes"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	userName: varchar("user_name", { length: 255 }),
});

export const interviewProcessingJobs = pgTable("interview_processing_jobs", {
	id: varchar().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	status: text().default('queued').notNull(),
	transcriptIds: integer("transcript_ids").array().default([RAY]).notNull(),
	processedTranscriptIds: integer("processed_transcript_ids").array().default([RAY]).notNull(),
	totalTranscripts: integer("total_transcripts").default(0).notNull(),
	processedCount: integer("processed_count").default(0).notNull(),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastHeartbeat: timestamp("last_heartbeat", { mode: 'string' }),
}, (table) => [
	index("idx_interview_jobs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_interview_jobs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_interview_jobs_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interview_processing_jobs_user_id_fkey"
		}),
]);

export const liveLaunches = pgTable("live_launches", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	label: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 50 }).default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	offerCost: varchar("offer_cost"),
}, (table) => [
	index("live_launches_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	index("live_launches_user_status_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "live_launches_user_id_fkey"
		}),
]);

export const launchRegistrationFunnelData = pgTable("launch_registration_funnel_data", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
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
	objections: text(),
	socialProofResults: text("social_proof_results"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	generatedOptInPage: text("generated_opt_in_page"),
	generatedThankYouPage: text("generated_thank_you_page"),
	salesPageAction: text("sales_page_action"),
	salesPageUrgency: text("sales_page_urgency"),
	salesPageOfferName: text("sales_page_offer_name"),
	salesPageOfferPrice: text("sales_page_offer_price"),
	salesPageCorePromise: text("sales_page_core_promise"),
	salesPageWhatsIncluded: text("sales_page_whats_included"),
	salesPageUniqueApproach: text("sales_page_unique_approach"),
	generatedSalesPageCopy: text("generated_sales_page_copy"),
	emailInviteHooks: text("email_invite_hooks"),
	emailInviteFomo: text("email_invite_fomo"),
	emailConfirmationDetails: text("email_confirmation_details"),
	emailPreEventActions: text("email_pre_event_actions"),
	emailNurtureContent: text("email_nurture_content"),
	emailLiveAttendanceValue: text("email_live_attendance_value"),
	emailMythsBeliefs: text("email_myths_beliefs"),
	emailSalesStories: text("email_sales_stories"),
	emailFinalPush: text("email_final_push"),
}, (table) => [
	uniqueIndex("launch_registration_funnel_data_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "launch_registration_funnel_data_user_id_fkey"
		}),
]);

export const messagingStrategies = pgTable("messaging_strategies", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: varchar().default('Messaging Strategy').notNull(),
	content: text().notNull(),
	version: integer().default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sourceData: jsonb("source_data"),
	completionPercentage: integer("completion_percentage").default(0),
	missingInformation: jsonb("missing_information"),
	recommendations: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const offerOutlines = pgTable("offer_outlines", {
	id: serial().primaryKey().notNull(),
	offerId: integer("offer_id").notNull(),
	userId: integer("user_id").notNull(),
	outline: text().notNull(),
	completeness: integer().default(0),
	missingInformation: jsonb("missing_information"),
	recommendations: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("unique_offer_outline").on(table.offerId),
]);

export const offerResponses = pgTable("offer_responses", {
	id: serial().primaryKey().notNull(),
	offerId: integer("offer_id").notNull(),
	userId: integer("user_id").notNull(),
	section: text().notNull(),
	questionKey: text("question_key").notNull(),
	questionText: text("question_text").notNull(),
	response: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("unique_offer_question").on(table.offerId, table.questionKey),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar().notNull(),
	title: varchar().notNull(),
	message: text().notNull(),
	link: varchar(),
	isRead: boolean("is_read").default(false).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_is_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}),
]);

export const offers = pgTable("offers", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	type: text().notNull(),
	status: text().default('draft').notNull(),
	progress: integer().default(0).notNull(),
	currentStep: integer("current_step").default(1).notNull(),
	totalSteps: integer("total_steps").default(6).notNull(),
	description: text(),
	pricing: jsonb(),
	targetCustomer: jsonb("target_customer"),
	valueProposition: text("value_proposition"),
	conversationScript: text("conversation_script"),
	communityOutreach: jsonb("community_outreach"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const optimizationSuggestions = pgTable("optimization_suggestions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	suggestions: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("optimization_suggestions_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("unique_user_suggestions").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const platformResources = pgTable("platform_resources", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	resourceType: varchar("resource_type", { length: 50 }).notNull(),
	resourceUrl: text("resource_url").notNull(),
	sectionKey: varchar("section_key", { length: 100 }),
	downloadCount: integer("download_count").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const salesPageDrafts = pgTable("sales_page_drafts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: varchar().notNull(),
	content: text().notNull(),
	draftNumber: integer("draft_number").default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sourceData: jsonb("source_data"),
	inputs: jsonb(),
	completeness: integer().default(0).notNull(),
	missingElements: jsonb("missing_elements"),
	status: varchar().default('draft').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const sectionCompletions = pgTable("section_completions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	stepNumber: integer("step_number").notNull(),
	sectionTitle: varchar("section_title", { length: 255 }).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	offerNumber: integer("offer_number").default(1).notNull(),
}, (table) => [
	index("idx_section_completions_offer_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.stepNumber.asc().nullsLast().op("int4_ops"), table.sectionTitle.asc().nullsLast().op("text_ops"), table.offerNumber.asc().nullsLast().op("int4_ops")),
	index("idx_section_completions_unique").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.stepNumber.asc().nullsLast().op("int4_ops"), table.sectionTitle.asc().nullsLast().op("text_ops")),
	index("idx_section_completions_user_step").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.stepNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "section_completions_user_id_fkey"
		}),
	unique("section_completions_user_id_step_number_section_title_offer_num").on(table.userId, table.stepNumber, table.sectionTitle, table.offerNumber),
]);

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const stepContent = pgTable("step_content", {
	id: serial().primaryKey().notNull(),
	stepNumber: integer("step_number").notNull(),
	stepName: text("step_name").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	detailedContent: text("detailed_content"),
	tips: text().array(),
	examples: text().array(),
	resources: jsonb(),
	questions: text().array(),
	actionItems: text("action_items").array(),
	videos: jsonb(),
	workbookUrl: text("workbook_url"),
	interactivePrompts: jsonb("interactive_prompts"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const strategyInterviewLinks = pgTable("strategy_interview_links", {
	id: serial().primaryKey().notNull(),
	strategyId: integer("strategy_id").notNull(),
	transcriptId: integer("transcript_id").notNull(),
	contributionType: varchar("contribution_type").default('source').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("unique_strategy_transcript").using("btree", table.strategyId.asc().nullsLast().op("int4_ops"), table.transcriptId.asc().nullsLast().op("int4_ops")),
]);

export const templates = pgTable("templates", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	description: text().notNull(),
	content: text().notNull(),
	tags: text().array(),
	stepNumber: integer("step_number"),
	isPublic: boolean("is_public").default(true).notNull(),
	downloadCount: integer("download_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const trainingVideos = pgTable("training_videos", {
	id: serial().primaryKey().notNull(),
	moduleTitle: varchar("module_title", { length: 255 }).notNull(),
	description: text(),
	vimeoId: varchar("vimeo_id", { length: 100 }).notNull(),
	sectionKey: varchar("section_key", { length: 100 }),
	orderIndex: integer("order_index").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_password_reset_tokens_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_password_reset_tokens_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("idx_password_reset_tokens_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_fkey"
		}),
	unique("password_reset_tokens_token_key").on(table.token),
]);

export const salesPages = pgTable("sales_pages", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	headline: text(),
	content: text().notNull(),
	price: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	title: text(),
	status: text().default('draft'),
	inputs: jsonb(),
	completeness: integer().default(0).notNull(),
	missingElements: jsonb("missing_elements"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sales_pages_user_id_users_id_fk"
		}),
]);

export const userLogins = pgTable("user_logins", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	loginAt: timestamp("login_at", { mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
}, (table) => [
	index("idx_user_logins_login_at").using("btree", table.loginAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_user_logins_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	index("idx_user_logins_user_login").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.loginAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_logins_user_id_fkey"
		}),
]);

export const workbookResponses = pgTable("workbook_responses", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	stepNumber: integer("step_number").notNull(),
	sectionTitle: varchar("section_title").notNull(),
	questionKey: varchar("question_key").notNull(),
	responseText: text("response_text").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	offerId: integer("offer_id"),
	offerNumber: integer("offer_number").default(1).notNull(),
}, (table) => [
	index("idx_workbook_responses_build_offer").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.stepNumber.asc().nullsLast().op("int4_ops"), table.questionKey.asc().nullsLast().op("text_ops")).where(sql`(step_number = 3)`),
	index("idx_workbook_responses_step3_sections").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.stepNumber.asc().nullsLast().op("text_ops"), table.sectionTitle.asc().nullsLast().op("text_ops")).where(sql`(step_number = 3)`),
	index("offer_number_responses_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.offerNumber.asc().nullsLast().op("int4_ops"), table.stepNumber.asc().nullsLast().op("int4_ops")),
	index("offer_responses_idx").using("btree", table.offerId.asc().nullsLast().op("int4_ops"), table.stepNumber.asc().nullsLast().op("int4_ops")),
	uniqueIndex("unique_user_offer_number_question").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.offerNumber.asc().nullsLast().op("int4_ops"), table.stepNumber.asc().nullsLast().op("text_ops"), table.questionKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [userOffers.id],
			name: "workbook_responses_offer_id_fkey"
		}),
]);

export const userProgress = pgTable("user_progress", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	stepNumber: integer("step_number").notNull(),
	completedPrompts: jsonb("completed_prompts"),
	brandVoice: text("brand_voice"),
	customerAvatar: jsonb("customer_avatar"),
	isCompleted: boolean("is_completed").default(false).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userResponses = pgTable("user_responses", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	stepNumber: integer("step_number").notNull(),
	responseKey: varchar("response_key").notNull(),
	responseValue: text("response_value").notNull(),
	sectionName: varchar("section_name"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_responses_user_id_step_number_response_key_key").on(table.userId, table.stepNumber, table.responseKey),
]);

export const weeklyAccountabilityThreads = pgTable("weekly_accountability_threads", {
	id: serial().primaryKey().notNull(),
	threadId: integer("thread_id").notNull(),
	weekStartDate: timestamp("week_start_date", { mode: 'string' }).notNull(),
	weekEndDate: timestamp("week_end_date", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("weekly_accountability_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("weekly_accountability_week_start_idx").using("btree", table.weekStartDate.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [forumThreads.id],
			name: "weekly_accountability_threads_thread_id_fkey"
		}),
]);

export const videoScriptGeneratorState = pgTable("video_script_generator_state", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	landingPageUrl: text("landing_page_url"),
	generatedScripts: jsonb("generated_scripts"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	manualContent: text("manual_content"),
	inputMethod: varchar("input_method", { length: 20 }),
}, (table) => [
	unique("video_script_generator_state_user_id_key").on(table.userId),
]);

export const userOffers = pgTable("user_offers", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 50 }).default('draft').notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_offers_active").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.isActive.asc().nullsLast().op("int4_ops")),
	index("idx_user_offers_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_offers_user_id_fkey"
		}),
]);

export const userOfferOutlines = pgTable("user_offer_outlines", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	content: text().notNull(),
	version: integer().default(1),
	isActive: boolean("is_active").default(false),
	sourceData: jsonb("source_data"),
	completionPercentage: integer("completion_percentage").default(0),
	missingInformation: jsonb("missing_information"),
	recommendations: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	offerId: integer("offer_id"),
	offerNumber: integer("offer_number").default(1).notNull(),
}, (table) => [
	index("idx_user_offer_outlines_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_user_offer_outlines_user_active").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_user_offer_outlines_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("unique_active_offer_outline").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.offerNumber.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	index("user_offer_number_outline_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.offerNumber.asc().nullsLast().op("int4_ops")),
	index("user_offer_outline_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.offerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [userOffers.id],
			name: "user_offer_outlines_offer_id_fkey"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	stripeCustomerId: varchar("stripe_customer_id"),
	stripeSubscriptionId: varchar("stripe_subscription_id"),
	subscriptionStatus: varchar("subscription_status").default('free'),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	passwordHash: varchar("password_hash"),
	businessName: varchar("business_name"),
	aboutMe: text("about_me"),
	hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
	isAdmin: boolean("is_admin").default(false).notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	lastVisitedPath: varchar("last_visited_path", { length: 500 }),
	lastVisitedSection: varchar("last_visited_section", { length: 255 }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);
