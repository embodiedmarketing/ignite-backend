import {
  users,
  offers,
  activities,
  conversations,
  communities,
  stepContent,
  templates,
  userProgress,
  salesPages,
  funnelCopies,
  customerExperiencePlans,
  icaInterviewTranscripts,
  issueReports,
  notifications,
  messagingStrategies,
  workbookResponses,
  strategyInterviewLinks,
  userOffers,
  userOfferOutlines,
  coreOfferCoachingSessions,
  salesPageDrafts,
  passwordResetTokens,
  sectionCompletions,
  checklistItems,
  contentStrategyResponses,
  generatedContentStrategies,
  emailTracking,
  liveLaunches,
  liveLaunchFunnelMetrics,
  liveLaunchOrganicMetrics,
  liveLaunchOptimizationSuggestions,
  igniteDocuments,
  videoScriptGeneratorState,
  launchRegistrationFunnelData,
  launchEmailSequences,
  funnelTrackerData,
  optimizationSuggestions,
  implementationCheckboxes,
  forumCategories,
  forumThreads,
  forumPosts,
  weeklyAccountabilityThreads,
  accountabilityThreadParticipation,
  userLogins,
  trainingVideos,
  platformResources,
  checklistStepDefinitions,
  type User,
  type UpsertUser,
  type Offer,
  type InsertOffer,
  type Activity,
  type InsertActivity,
  type Conversation,
  type InsertConversation,
  type Community,
  type InsertCommunity,
  type StepContent,
  type InsertStepContent,
  type Template,
  type InsertTemplate,
  type UserProgress,
  type InsertUserProgress,
  type SalesPage,
  type InsertSalesPage,
  type FunnelCopy,
  type InsertFunnelCopy,
  type CustomerExperiencePlan,
  type InsertCustomerExperiencePlan,
  type IcaInterviewTranscript,
  type InsertIcaInterviewTranscript,
  type IssueReport,
  type InsertIssueReport,
  type Notification,
  type InsertNotification,
  type MessagingStrategy,
  type InsertMessagingStrategy,
  type WorkbookResponse,
  type InsertWorkbookResponse,
  type StrategyInterviewLink,
  type InsertStrategyInterviewLink,
  type UserOffer,
  type InsertUserOffer,
  type UserOfferOutline,
  type InsertUserOfferOutline,
  type CoreOfferCoachingSession,
  type InsertCoreOfferCoachingSession,
  type SectionCompletion,
  type InsertSectionCompletion,
  type ChecklistItem,
  type InsertChecklistItem,
  type SalesPageDraft,
  type InsertSalesPageDraft,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type ContentStrategyResponse,
  type InsertContentStrategyResponse,
  type GeneratedContentStrategy,
  type InsertGeneratedContentStrategy,
  type EmailTracking,
  type InsertEmailTracking,
  type LiveLaunch,
  type InsertLiveLaunch,
  type LiveLaunchFunnelMetric,
  type InsertLiveLaunchFunnelMetric,
  type LiveLaunchOrganicMetric,
  type InsertLiveLaunchOrganicMetric,
  type LiveLaunchOptimizationSuggestion,
  type InsertLiveLaunchOptimizationSuggestion,
  type IgniteDocument,
  type InsertIgniteDocument,
  type VideoScriptGeneratorState,
  type InsertVideoScriptGeneratorState,
  type LaunchRegistrationFunnelData,
  type InsertLaunchRegistrationFunnelData,
  type LaunchEmailSequence,
  type InsertLaunchEmailSequence,
  type FunnelTrackerData,
  type InsertFunnelTrackerData,
  type OptimizationSuggestions,
  type InsertOptimizationSuggestions,
  type ImplementationCheckbox,
  type InsertImplementationCheckbox,
  type ForumCategory,
  type ForumThread,
  type ForumPost,
  type InsertForumThread,
  type InsertForumPost,
  type WeeklyAccountabilityThread,
  type AccountabilityThreadParticipation,
  type TrainingVideo,
  type InsertTrainingVideo,
  type PlatformResource,
  type InsertPlatformResource,
  type ChecklistStepDefinition,
  type InsertChecklistStepDefinition,
  type UserLogin,
  type InsertUserLogin,
} from "../models";
import { db } from "../config/db";
import { eq, and, desc, or, lt, not, sql, ne } from "drizzle-orm";

export interface IStorage {
  // User operations for traditional auth
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Password reset token methods
  createPasswordResetToken(
    data: InsertPasswordResetToken
  ): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(id: number): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // User login tracking
  recordUserLogin(data: InsertUserLogin): Promise<UserLogin>;
  getUserLoginHistory(userId: number, limit?: number): Promise<UserLogin[]>;
  getAllUserLogins(limit?: number): Promise<UserLogin[]>;

  // Section completions operations
  getSectionCompletions(userId: number): Promise<SectionCompletion[]>;
  markSectionComplete(
    completion: InsertSectionCompletion
  ): Promise<SectionCompletion>;
  unmarkSectionComplete(
    userId: number,
    stepNumber: number,
    sectionTitle: string
  ): Promise<boolean>;

  // Checklist items operations
  getChecklistItems(
    userId: number,
    sectionKey: string
  ): Promise<ChecklistItem[]>;
  upsertChecklistItem(
    userId: number,
    sectionKey: string,
    itemKey: string,
    isCompleted: boolean
  ): Promise<ChecklistItem>;

  // Offers
  getOffer(id: number): Promise<Offer | undefined>;
  getOffersByUser(userId: number): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: number, updates: Partial<Offer>): Promise<Offer | undefined>;
  deleteOffer(id: number): Promise<boolean>;

  // Activities
  getActivitiesByUser(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Conversations
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  getConversationsByOffer(offerId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(
    id: number,
    updates: Partial<Conversation>
  ): Promise<Conversation | undefined>;

  // Communities
  getCommunitiesByUser(userId: number): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(
    id: number,
    updates: Partial<Community>
  ): Promise<Community | undefined>;

  // Step Content
  getStepContent(stepNumber: number): Promise<StepContent | undefined>;
  getAllStepContent(): Promise<StepContent[]>;
  createStepContent(stepContent: InsertStepContent): Promise<StepContent>;
  updateStepContent(
    id: number,
    updates: Partial<StepContent>
  ): Promise<StepContent | undefined>;

  // Templates
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplatesByCategory(category: string): Promise<Template[]>;
  getTemplatesByStep(stepNumber: number): Promise<Template[]>;
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(
    id: number,
    updates: Partial<Template>
  ): Promise<Template | undefined>;

  // Sales Pages
  getSalesPagesByUser(userId: number): Promise<SalesPage[]>;
  createSalesPage(salesPage: InsertSalesPage): Promise<SalesPage>;
  updateSalesPage(
    id: number,
    updates: Partial<SalesPage>
  ): Promise<SalesPage | undefined>;

  // Funnel Copies
  getFunnelCopyByUser(
    userId: number,
    offerNumber?: number
  ): Promise<FunnelCopy | undefined>;
  upsertFunnelCopy(funnelCopy: InsertFunnelCopy): Promise<FunnelCopy>;

  // Tripwire Templates
  getTripwireTemplatesByOffer(
    userId: number,
    offerId: number
  ): Promise<SalesPage[]>;
  getTripwireTemplateByType(
    userId: number,
    offerId: number,
    pageType: string
  ): Promise<SalesPage | undefined>;

  // User Progress
  getUserProgressByStep(
    userId: number,
    stepNumber: number
  ): Promise<UserProgress | undefined>;

  // Customer Experience Plans
  getCustomerExperiencePlansByUser(
    userId: number
  ): Promise<CustomerExperiencePlan[]>;
  createCustomerExperiencePlan(
    plan: InsertCustomerExperiencePlan
  ): Promise<CustomerExperiencePlan>;
  updateCustomerExperiencePlan(
    id: number,
    updates: Partial<CustomerExperiencePlan>
  ): Promise<CustomerExperiencePlan | undefined>;
  deleteCustomerExperiencePlan(id: number): Promise<boolean>;

  // Customer Experience (simplified for dual-write)
  createCustomerExperience(data: {
    userId: number;
    responses: any;
    todos: any;
  }): Promise<{ id: number; success: boolean }>;

  // ICA Interview Transcripts
  getInterviewTranscriptsByUser(
    userId: number
  ): Promise<IcaInterviewTranscript[]>;
  getInterviewTranscript(
    id: number
  ): Promise<IcaInterviewTranscript | undefined>;
  createInterviewTranscript(
    transcript: InsertIcaInterviewTranscript
  ): Promise<IcaInterviewTranscript>;
  updateInterviewTranscript(
    id: number,
    updates: Partial<IcaInterviewTranscript>
  ): Promise<IcaInterviewTranscript | undefined>;
  deleteInterviewTranscript(id: number): Promise<boolean>;

  // Issue Reports
  getAllIssueReports(): Promise<IssueReport[]>;
  getIssueReport(id: number): Promise<IssueReport | undefined>;
  createIssueReport(report: InsertIssueReport): Promise<IssueReport>;
  updateIssueReport(
    id: number,
    updates: Partial<IssueReport>
  ): Promise<IssueReport | undefined>;
  deleteIssueReport(id: number): Promise<boolean>;

  // Notifications
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // Messaging Strategies
  getMessagingStrategiesByUser(userId: number): Promise<MessagingStrategy[]>;
  getAllMessagingStrategies(): Promise<MessagingStrategy[]>;
  getActiveMessagingStrategy(
    userId: number
  ): Promise<MessagingStrategy | undefined>;
  createMessagingStrategy(
    strategy: InsertMessagingStrategy
  ): Promise<MessagingStrategy>;
  updateMessagingStrategy(
    id: number,
    updates: Partial<MessagingStrategy>
  ): Promise<MessagingStrategy | undefined>;
  deleteMessagingStrategy(id: number): Promise<boolean>;
  setActiveMessagingStrategy(
    userId: number,
    strategyId: number
  ): Promise<boolean>;

  // Workbook Responses
  getWorkbookResponsesByUser(userId: number): Promise<WorkbookResponse[]>;
  getWorkbookResponsesByStep(
    userId: number,
    stepNumber: number,
    offerNumber?: number
  ): Promise<WorkbookResponse[]>;
  getWorkbookResponse(
    userId: number,
    stepNumber: number,
    questionKey: string
  ): Promise<WorkbookResponse | undefined>;
  upsertWorkbookResponse(
    response: InsertWorkbookResponse
  ): Promise<WorkbookResponse>;
  deleteWorkbookResponse(
    userId: number,
    stepNumber: number,
    questionKey: string
  ): Promise<boolean>;

  // Messaging Strategies
  getMessagingStrategiesByUser(userId: number): Promise<MessagingStrategy[]>;
  getAllMessagingStrategies(): Promise<MessagingStrategy[]>;
  getActiveMessagingStrategy(
    userId: number
  ): Promise<MessagingStrategy | undefined>;
  createMessagingStrategy(
    strategy: InsertMessagingStrategy
  ): Promise<MessagingStrategy>;
  updateMessagingStrategy(
    id: number,
    updates: Partial<MessagingStrategy>
  ): Promise<MessagingStrategy | undefined>;
  deleteMessagingStrategy(id: number): Promise<boolean>;
  setActiveMessagingStrategy(
    userId: number,
    strategyId: number
  ): Promise<boolean>;

  // Strategy Interview Links
  getStrategyInterviewLinks(
    strategyId: number
  ): Promise<StrategyInterviewLink[]>;
  createStrategyInterviewLink(
    link: InsertStrategyInterviewLink
  ): Promise<StrategyInterviewLink>;
  deleteStrategyInterviewLink(
    strategyId: number,
    transcriptId: number
  ): Promise<boolean>;

  // User Offers
  getUserOffers(userId: number): Promise<UserOffer[]>;
  getUserOffer(id: number): Promise<UserOffer | undefined>;
  getActiveUserOffer(userId: number): Promise<UserOffer | undefined>;
  createUserOffer(offer: InsertUserOffer): Promise<UserOffer>;
  updateUserOffer(
    id: number,
    updates: Partial<UserOffer>
  ): Promise<UserOffer | undefined>;
  deleteUserOffer(id: number): Promise<boolean>;
  setActiveUserOffer(id: number): Promise<UserOffer | undefined>;

  // User Offer Outlines
  getUserOfferOutlinesByUser(userId: number): Promise<UserOfferOutline[]>;
  getActiveUserOfferOutline(
    userId: number
  ): Promise<UserOfferOutline | undefined>;
  createUserOfferOutline(
    outline: InsertUserOfferOutline
  ): Promise<UserOfferOutline>;
  updateUserOfferOutline(
    id: number,
    updates: Partial<UserOfferOutline>
  ): Promise<UserOfferOutline | undefined>;
  deleteUserOfferOutline(id: number): Promise<boolean>;
  setActiveUserOfferOutline(
    userId: number,
    outlineId: number
  ): Promise<boolean>;

  // Core Offer Coaching Sessions
  getCoreCoachingSession(
    userId: number,
    questionKey: string
  ): Promise<CoreOfferCoachingSession | undefined>;
  getCoreCoachingSessions(userId: number): Promise<CoreOfferCoachingSession[]>;
  createCoreCoachingSession(
    session: InsertCoreOfferCoachingSession
  ): Promise<CoreOfferCoachingSession>;
  updateCoreCoachingSession(
    id: number,
    updates: Partial<CoreOfferCoachingSession>
  ): Promise<CoreOfferCoachingSession | undefined>;

  // Sales Page Drafts
  getSalesPageDraftsByUser(userId: number): Promise<SalesPageDraft[]>;
  getActiveSalesPageDrafts(userId: number): Promise<SalesPageDraft[]>;
  createSalesPageDraft(draft: InsertSalesPageDraft): Promise<SalesPageDraft>;
  updateSalesPageDraft(
    id: number,
    updates: Partial<SalesPageDraft>
  ): Promise<SalesPageDraft | undefined>;
  deleteSalesPageDraft(id: number): Promise<boolean>;
  deleteSalesPageDraftsByUser(userId: number): Promise<boolean>;
  setActiveSalesPageDraft(userId: number, draftId: number): Promise<boolean>;

  // Content Strategy
  getContentStrategyResponse(
    userId: number
  ): Promise<ContentStrategyResponse | undefined>;
  createContentStrategyResponse(
    response: InsertContentStrategyResponse
  ): Promise<ContentStrategyResponse>;
  updateContentStrategyResponse(
    id: number,
    updates: Partial<ContentStrategyResponse>
  ): Promise<ContentStrategyResponse | undefined>;

  getGeneratedContentStrategiesByUser(
    userId: number
  ): Promise<GeneratedContentStrategy[]>;
  getActiveGeneratedContentStrategy(
    userId: number
  ): Promise<GeneratedContentStrategy | undefined>;
  createGeneratedContentStrategy(
    strategy: InsertGeneratedContentStrategy
  ): Promise<GeneratedContentStrategy>;
  updateGeneratedContentStrategy(
    id: number,
    updates: Partial<GeneratedContentStrategy>
  ): Promise<GeneratedContentStrategy | undefined>;
  setActiveGeneratedContentStrategy(
    userId: number,
    strategyId: number
  ): Promise<boolean>;

  // Section Completions
  getSectionCompletions(userId: number): Promise<SectionCompletion[]>;
  markSectionComplete(
    completion: InsertSectionCompletion
  ): Promise<SectionCompletion>;
  unmarkSectionComplete(
    userId: number,
    stepNumber: number,
    sectionTitle: string
  ): Promise<boolean>;

  // Create coaching event (for AI coaching monitor)
  createCoachingEvent(eventData: any): Promise<any>;

  // Email Tracking
  getEmailTrackingByUser(userId: number): Promise<EmailTracking[]>;
  getEmailTrackingByDate(
    userId: number,
    date: string
  ): Promise<EmailTracking[]>;
  getEmailTrackingByLaunch(
    userId: number,
    liveLaunchId: number
  ): Promise<EmailTracking[]>;
  createEmailTracking(email: InsertEmailTracking): Promise<EmailTracking>;
  updateEmailTracking(
    id: number,
    updates: Partial<EmailTracking>
  ): Promise<EmailTracking | undefined>;
  deleteEmailTracking(id: number): Promise<boolean>;

  // Live Launch Management
  getLiveLaunchesByUser(userId: number): Promise<LiveLaunch[]>;
  getLiveLaunch(id: number): Promise<LiveLaunch | undefined>;
  createLiveLaunch(launch: InsertLiveLaunch): Promise<LiveLaunch>;
  updateLiveLaunch(
    id: number,
    updates: Partial<LiveLaunch>
  ): Promise<LiveLaunch | undefined>;
  deleteLiveLaunch(id: number): Promise<boolean>;

  // Live Launch Optimization Suggestions
  getLiveLaunchOptimizationSuggestions(
    liveLaunchId: number
  ): Promise<LiveLaunchOptimizationSuggestion[]>;
  createLiveLaunchOptimizationSuggestion(
    data: InsertLiveLaunchOptimizationSuggestion
  ): Promise<LiveLaunchOptimizationSuggestion>;
  saveLiveLaunchOptimizationSuggestions(
    liveLaunchId: number,
    userId: number,
    suggestions: Array<{
      type: string;
      title: string;
      issue: string;
      actions: string[];
    }>
  ): Promise<void>;
  clearLiveLaunchOptimizationSuggestions(liveLaunchId: number): Promise<void>;

  // Live Launch Funnel Metrics
  getFunnelMetricsByLaunch(
    liveLaunchId: number
  ): Promise<LiveLaunchFunnelMetric[]>;
  getFunnelMetricByDateAndType(
    liveLaunchId: number,
    date: string,
    metricType: string
  ): Promise<LiveLaunchFunnelMetric | undefined>;
  upsertFunnelMetric(
    metric: InsertLiveLaunchFunnelMetric
  ): Promise<LiveLaunchFunnelMetric>;
  updateFunnelMetric(
    id: number,
    updates: Partial<LiveLaunchFunnelMetric>
  ): Promise<LiveLaunchFunnelMetric | undefined>;

  // Live Launch Organic Metrics
  getOrganicMetricsByLaunch(
    liveLaunchId: number
  ): Promise<LiveLaunchOrganicMetric[]>;
  getOrganicMetricByDateAndType(
    liveLaunchId: number,
    date: string,
    metricType: string
  ): Promise<LiveLaunchOrganicMetric | undefined>;
  upsertOrganicMetric(
    metric: InsertLiveLaunchOrganicMetric
  ): Promise<LiveLaunchOrganicMetric>;
  updateOrganicMetric(
    id: number,
    updates: Partial<LiveLaunchOrganicMetric>
  ): Promise<LiveLaunchOrganicMetric | undefined>;

  // IGNITE Documents
  createIgniteDocument(document: InsertIgniteDocument): Promise<IgniteDocument>;
  getIgniteDocumentsByUser(userId: number): Promise<IgniteDocument[]>;
  updateIgniteDocument(
    id: number,
    updates: Partial<IgniteDocument>
  ): Promise<IgniteDocument | undefined>;

  // Video Script Generator State
  upsertVideoScriptGeneratorState(
    state: InsertVideoScriptGeneratorState
  ): Promise<VideoScriptGeneratorState>;
  getVideoScriptGeneratorState(
    userId: number
  ): Promise<VideoScriptGeneratorState | undefined>;

  // Launch Registration Funnel Data
  upsertLaunchRegistrationFunnelData(
    data: InsertLaunchRegistrationFunnelData
  ): Promise<LaunchRegistrationFunnelData>;
  getLaunchRegistrationFunnelData(
    userId: number
  ): Promise<LaunchRegistrationFunnelData | undefined>;

  // Launch Email Sequences
  createLaunchEmailSequence(
    sequence: InsertLaunchEmailSequence
  ): Promise<LaunchEmailSequence>;
  getLaunchEmailSequencesByUserId(
    userId: number
  ): Promise<LaunchEmailSequence[]>;
  updateLaunchEmailSequence(
    id: number,
    userId: number,
    updates: Partial<LaunchEmailSequence>
  ): Promise<LaunchEmailSequence | undefined>;
  deleteLaunchEmailSequencesByUserId(userId: number): Promise<boolean>;

  // Funnel Tracker Data
  getFunnelTrackerData(userId: number): Promise<FunnelTrackerData | undefined>;
  upsertFunnelTrackerData(
    data: InsertFunnelTrackerData
  ): Promise<FunnelTrackerData>;

  // Optimization Suggestions
  getOptimizationSuggestions(
    userId: number
  ): Promise<OptimizationSuggestions | undefined>;
  upsertOptimizationSuggestions(
    data: InsertOptimizationSuggestions
  ): Promise<OptimizationSuggestions>;

  // Implementation Checkboxes
  getImplementationCheckboxes(
    userId: number,
    pageIdentifier: string
  ): Promise<ImplementationCheckbox | undefined>;
  upsertImplementationCheckboxes(
    data: InsertImplementationCheckbox
  ): Promise<ImplementationCheckbox>;

  // Analytics and monitoring
  getSystemHealth(): Promise<any>;

  // Forum Categories
  getForumCategories(): Promise<ForumCategory[]>;

  // Forum Threads
  getThreadsByCategorySlug(
    slug: string,
    page: number,
    size: number
  ): Promise<{ threads: ForumThread[]; total: number }>;
  createThread(
    categorySlug: string,
    userId: number,
    data: InsertForumThread
  ): Promise<ForumThread>;
  getThreadWithPosts(
    threadId: number
  ): Promise<
    | { thread: ForumThread; posts: ForumPost[]; category: ForumCategory }
    | undefined
  >;
  deleteThread(threadId: number, userId: number): Promise<boolean>;
  getRecentForumActivity(limit: number): Promise<any[]>;

  // Forum Posts
  createPost(
    threadId: number,
    userId: number,
    data: InsertForumPost,
    parentId?: number
  ): Promise<ForumPost>;
  deletePost(postId: number, userId: number): Promise<boolean>;

  // Forum Notifications
  createForumReplyNotification(
    threadId: number,
    threadOwnerId: number,
    replierUserId: number,
    postId: number
  ): Promise<void>;
  createForumMentionNotifications(
    postBody: string,
    postAuthorId: number,
    threadId: number,
    postId: number
  ): Promise<void>;

  // Forum User Search
  searchUsersForMentions(query: string): Promise<
    Array<{
      id: number;
      firstName: string | null;
      lastName: string | null;
      email: string;
    }>
  >;

  // Weekly Accountability Threads
  getActiveAccountabilityThread(): Promise<
    WeeklyAccountabilityThread | undefined
  >;
  createWeeklyAccountabilityThread(
    threadId: number,
    weekStartDate: Date,
    weekEndDate: Date
  ): Promise<WeeklyAccountabilityThread>;
  markPreviousThreadsInactive(): Promise<void>;
  getUserParticipation(
    weeklyThreadId: number,
    userId: number
  ): Promise<AccountabilityThreadParticipation | undefined>;
  markUserAsParticipated(
    weeklyThreadId: number,
    userId: number
  ): Promise<AccountabilityThreadParticipation>;

  // Content Management - Training Videos
  getAllTrainingVideos(): Promise<TrainingVideo[]>;
  getTrainingVideosBySection(sectionKey: string): Promise<TrainingVideo[]>;
  getTrainingVideo(id: number): Promise<TrainingVideo | undefined>;
  createTrainingVideo(video: InsertTrainingVideo): Promise<TrainingVideo>;
  updateTrainingVideo(
    id: number,
    updates: Partial<TrainingVideo>
  ): Promise<TrainingVideo | undefined>;
  deleteTrainingVideo(id: number): Promise<boolean>;

  // Content Management - Platform Resources
  getAllPlatformResources(): Promise<PlatformResource[]>;
  getPlatformResourcesBySection(
    sectionKey: string
  ): Promise<PlatformResource[]>;
  getPlatformResource(id: number): Promise<PlatformResource | undefined>;
  createPlatformResource(
    resource: InsertPlatformResource
  ): Promise<PlatformResource>;
  updatePlatformResource(
    id: number,
    updates: Partial<PlatformResource>
  ): Promise<PlatformResource | undefined>;
  deletePlatformResource(id: number): Promise<boolean>;

  // Content Management - Checklist Step Definitions
  getAllChecklistStepDefinitions(): Promise<ChecklistStepDefinition[]>;
  getChecklistStepDefinition(
    sectionKey: string
  ): Promise<ChecklistStepDefinition | undefined>;
  createChecklistStepDefinition(
    definition: InsertChecklistStepDefinition
  ): Promise<ChecklistStepDefinition>;
  updateChecklistStepDefinition(
    id: number,
    updates: Partial<ChecklistStepDefinition>
  ): Promise<ChecklistStepDefinition | undefined>;
  deleteChecklistStepDefinition(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations for traditional auth
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, true));
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getOffer(id: number): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer || undefined;
  }

  async getOffersByUser(userId: number): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.userId, userId));
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const [offer] = await db.insert(offers).values(insertOffer).returning();
    return offer;
  }

  async updateOffer(
    id: number,
    updates: Partial<Offer>
  ): Promise<Offer | undefined> {
    const [offer] = await db
      .update(offers)
      .set(updates)
      .where(eq(offers.id, id))
      .returning();
    return offer || undefined;
  }

  async deleteOffer(id: number): Promise<boolean> {
    const result = await db.delete(offers).where(eq(offers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId.toString()));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId.toString()));
  }

  async getConversationsByOffer(offerId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.offerId, offerId));
  }

  async createConversation(
    insertConversation: InsertConversation
  ): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversation(
    id: number,
    updates: Partial<Conversation>
  ): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async getCommunitiesByUser(userId: number): Promise<Community[]> {
    return await db
      .select()
      .from(communities)
      .where(eq(communities.userId, userId.toString()));
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const [community] = await db
      .insert(communities)
      .values(insertCommunity)
      .returning();
    return community;
  }

  async checkUserHasData(userId: number): Promise<boolean> {
    // Check if user has any workbook responses or messaging strategies
    const responses = await db
      .select()
      .from(workbookResponses)
      .where(eq(workbookResponses.userId, userId))
      .limit(1);

    const strategies = await db
      .select()
      .from(messagingStrategies)
      .where(eq(messagingStrategies.userId, userId))
      .limit(1);

    return responses.length > 0 || strategies.length > 0;
  }

  async migrateLocalStorageData(
    userId: number,
    workbookData: Record<string, string>,
    messagingStrategy?: string,
    completedSections?: string[]
  ): Promise<{ migratedResponses: number; migratedStrategy: boolean }> {
    let migratedResponses = 0;
    let migratedStrategy = false;

    // Migrate workbook responses
    for (const [questionKey, responseText] of Object.entries(workbookData)) {
      if (responseText && responseText.trim().length > 0) {
        // Extract step number from key (e.g., "step-1-responses" -> 1)
        let stepNumber = 1;
        const stepMatch = questionKey.match(/step-(\d+)/);
        if (stepMatch) {
          stepNumber = parseInt(stepMatch[1]);
        }

        try {
          await db
            .insert(workbookResponses)
            .values({
              userId,
              stepNumber,
              questionKey,
              responseText: responseText.trim(),
              sectionTitle: questionKey.split("-")[0] || "General",
            })
            .onConflictDoNothing();
          migratedResponses++;
        } catch (error) {
          console.error("Error migrating response:", questionKey, error);
        }
      }
    }

    // Migrate messaging strategy
    if (messagingStrategy && messagingStrategy.trim().length > 0) {
      try {
        await db.insert(messagingStrategies).values({
          userId,
          title: "Migrated Messaging Strategy",
          content: messagingStrategy.trim(),
          version: 1,
          isActive: true,
          sourceData: {
            migrated: true,
            completedSections: completedSections || [],
          },
          completionPercentage: 100,
        });
        migratedStrategy = true;
      } catch (error) {
        console.error("Error migrating messaging strategy:", error);
      }
    }

    return { migratedResponses, migratedStrategy };
  }

  async updateCommunity(
    id: number,
    updates: Partial<Community>
  ): Promise<Community | undefined> {
    const [community] = await db
      .update(communities)
      .set(updates)
      .where(eq(communities.id, id))
      .returning();
    return community || undefined;
  }

  async getStepContent(stepNumber: number): Promise<StepContent | undefined> {
    const [step] = await db
      .select()
      .from(stepContent)
      .where(eq(stepContent.stepNumber, stepNumber));
    return step || undefined;
  }

  async getAllStepContent(): Promise<StepContent[]> {
    return await db.select().from(stepContent);
  }

  async createStepContent(
    insertStepContent: InsertStepContent
  ): Promise<StepContent> {
    const [step] = await db
      .insert(stepContent)
      .values(insertStepContent)
      .returning();
    return step;
  }

  async updateStepContent(
    id: number,
    updates: Partial<StepContent>
  ): Promise<StepContent | undefined> {
    const [step] = await db
      .update(stepContent)
      .set(updates)
      .where(eq(stepContent.id, id))
      .returning();
    return step || undefined;
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id));
    return template || undefined;
  }

  async getTemplatesByCategory(category: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.category, category));
  }

  async getTemplatesByStep(stepNumber: number): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.stepNumber, stepNumber));
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateTemplate(
    id: number,
    updates: Partial<Template>
  ): Promise<Template | undefined> {
    const [template] = await db
      .update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    return template || undefined;
  }

  async getSalesPagesByUser(userId: number): Promise<SalesPage[]> {
    return await db
      .select()
      .from(salesPages)
      .where(eq(salesPages.userId, userId.toString()));
  }

  async createSalesPage(insertSalesPage: InsertSalesPage): Promise<SalesPage> {
    const [salesPage] = await db
      .insert(salesPages)
      .values(insertSalesPage)
      .returning();
    return salesPage;
  }

  async updateSalesPage(
    id: number,
    updates: Partial<SalesPage>
  ): Promise<SalesPage | undefined> {
    const [salesPage] = await db
      .update(salesPages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(salesPages.id, id))
      .returning();
    return salesPage || undefined;
  }

  // Funnel Copies
  async getFunnelCopyByUser(
    userId: number,
    offerNumber: number = 1
  ): Promise<FunnelCopy | undefined> {
    const [funnelCopy] = await db
      .select()
      .from(funnelCopies)
      .where(
        and(
          eq(funnelCopies.userId, userId),
          eq(funnelCopies.offerNumber, offerNumber)
        )
      );
    return funnelCopy;
  }

  async upsertFunnelCopy(
    insertFunnelCopy: InsertFunnelCopy
  ): Promise<FunnelCopy> {
    const userId = insertFunnelCopy.userId;
    const offerNumber = insertFunnelCopy.offerNumber || 1;

    // Check if funnel copy already exists
    const existing = await this.getFunnelCopyByUser(userId, offerNumber);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(funnelCopies)
        .set({
          ...insertFunnelCopy,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(funnelCopies.userId, userId),
            eq(funnelCopies.offerNumber, offerNumber)
          )
        )
        .returning();
      return updated;
    } else {
      // Insert new
      const [created] = await db
        .insert(funnelCopies)
        .values(insertFunnelCopy)
        .returning();
      return created;
    }
  }

  async getTripwireTemplatesByOffer(
    userId: number,
    offerId: number
  ): Promise<SalesPage[]> {
    const pages = await db
      .select()
      .from(salesPages)
      .where(eq(salesPages.userId, userId.toString()));
    return pages.filter((page) => {
      const inputs = page.inputs as any;
      return (
        inputs &&
        inputs.pageType &&
        inputs.pageType.startsWith("tripwire_") &&
        inputs.offerId === offerId
      );
    });
  }

  async getTripwireTemplateByType(
    userId: number,
    offerId: number,
    pageType: string
  ): Promise<SalesPage | undefined> {
    const pages = await db
      .select()
      .from(salesPages)
      .where(eq(salesPages.userId, userId.toString()));
    return pages.find((page) => {
      const inputs = page.inputs as any;
      return (
        inputs && inputs.pageType === pageType && inputs.offerId === offerId
      );
    });
  }

  async getUserProgressByStep(
    userId: number,
    stepNumber: number
  ): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId.toString()),
          eq(userProgress.stepNumber, stepNumber)
        )
      );
    return progress || undefined;
  }

  async getCustomerExperiencePlansByUser(
    userId: number
  ): Promise<CustomerExperiencePlan[]> {
    return await db
      .select()
      .from(customerExperiencePlans)
      .where(eq(customerExperiencePlans.userId, userId.toString()))
      .orderBy(desc(customerExperiencePlans.createdAt));
  }

  async updateUserStripeInfo(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId?: string
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: stripeSubscriptionId ? "active" : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return user;
  }

  async createCustomerExperiencePlan(
    insertPlan: InsertCustomerExperiencePlan
  ): Promise<CustomerExperiencePlan> {
    const [plan] = await db
      .insert(customerExperiencePlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updateCustomerExperiencePlan(
    id: number,
    updates: Partial<CustomerExperiencePlan>
  ): Promise<CustomerExperiencePlan | undefined> {
    const [plan] = await db
      .update(customerExperiencePlans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(customerExperiencePlans.id, id))
      .returning();
    return plan || undefined;
  }

  async deleteCustomerExperiencePlan(id: number): Promise<boolean> {
    const result = await db
      .delete(customerExperiencePlans)
      .where(eq(customerExperiencePlans.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Customer Experience (simplified for dual-write migration)
  async createCustomerExperience(data: {
    userId: number;
    responses: any;
    todos: any;
  }): Promise<{ id: number; success: boolean }> {
    // Store as a simple backup in customer experience plans table
    const planData = {
      userId: data.userId.toString(),
      title: "Auto-saved Customer Experience",
      content: JSON.stringify(data.responses || {}),
      deliveryMethod: "Auto-saved",
      duration: "Ongoing",
      communicationFrequency: "As needed",
      feedbackMethod: "Auto-feedback",
      sections: data.todos || [],
    };

    const plan = await this.createCustomerExperiencePlan(planData);
    return { id: plan.id, success: true };
  }

  // ICA Interview Transcripts
  async getInterviewTranscriptsByUser(
    userId: number
  ): Promise<IcaInterviewTranscript[]> {
    return await db
      .select()
      .from(icaInterviewTranscripts)
      .where(eq(icaInterviewTranscripts.userId, userId.toString()));
  }

  async getInterviewTranscript(
    id: number
  ): Promise<IcaInterviewTranscript | undefined> {
    const [transcript] = await db
      .select()
      .from(icaInterviewTranscripts)
      .where(eq(icaInterviewTranscripts.id, id));
    return transcript || undefined;
  }

  async createInterviewTranscript(
    insertTranscript: InsertIcaInterviewTranscript
  ): Promise<IcaInterviewTranscript> {
    const [transcript] = await db
      .insert(icaInterviewTranscripts)
      .values(insertTranscript)
      .returning();
    return transcript;
  }

  async updateInterviewTranscript(
    id: number,
    updates: Partial<IcaInterviewTranscript>
  ): Promise<IcaInterviewTranscript | undefined> {
    // Clean up updates - ensure Date objects are valid or set to null
    // Also remove any fields that shouldn't be updated
    const cleanUpdates: any = {};

    // Only copy allowed fields
    const allowedFields = [
      "title",
      "customerName",
      "rawTranscript",
      "interviewDate",
      "platform",
      "duration",
      "tags",
      "notes",
      "status",
      "extractedInsights",
    ];

    for (const field of allowedFields) {
      if (updates[field as keyof typeof updates] !== undefined) {
        cleanUpdates[field] = updates[field as keyof typeof updates];
      }
    }

    // Build final update object with only valid fields
    const finalUpdates: any = {};

    // Copy all fields except interviewDate first
    for (const key in cleanUpdates) {
      if (key !== "interviewDate") {
        finalUpdates[key] = cleanUpdates[key];
      }
    }

    // Handle interviewDate separately - CRITICAL: Only accept Date object or null
    if (cleanUpdates.interviewDate !== undefined) {
      const dateValue = cleanUpdates.interviewDate;

      // Check if it's a valid Date object
      if (dateValue instanceof Date) {
        // Valid Date object - check if it's a valid date (not NaN)
        if (!isNaN(dateValue.getTime())) {
          // Valid Date - include it
          finalUpdates.interviewDate = dateValue;
          console.log(
            `[STORAGE] Setting interviewDate to valid Date: ${dateValue.toISOString()}`
          );
        } else {
          // Invalid Date (NaN) - set to null
          console.warn(
            `[STORAGE] Invalid Date object (NaN), setting interviewDate to null`
          );
          finalUpdates.interviewDate = null;
        }
      } else if (dateValue === null) {
        // Explicit null is fine
        finalUpdates.interviewDate = null;
        console.log(`[STORAGE] Setting interviewDate to null`);
      } else if (typeof dateValue === "string") {
        // String date - try to convert
        if (dateValue.trim()) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            finalUpdates.interviewDate = date;
            console.log(
              `[STORAGE] Converted date string to Date: ${date.toISOString()}`
            );
          } else {
            // Invalid date string - set to null
            console.warn(
              `[STORAGE] Invalid date string: ${dateValue}, setting to null`
            );
            finalUpdates.interviewDate = null;
          }
        } else {
          // Empty string - set to null
          console.warn(
            `[STORAGE] Empty date string, setting interviewDate to null`
          );
          finalUpdates.interviewDate = null;
        }
      } else {
        // Unknown/invalid type - remove it completely, don't update the field
        console.error(
          `[STORAGE] Invalid interviewDate type: ${typeof dateValue}, value:`,
          dateValue,
          "- removing from updates (field won't be updated)"
        );
        // Don't include it in finalUpdates - field won't be updated
      }
    }

    // Always update updatedAt
    finalUpdates.updatedAt = new Date();

    // Final safety check: ensure interviewDate is only Date or null if present
    if (finalUpdates.interviewDate !== undefined) {
      if (
        finalUpdates.interviewDate !== null &&
        !(finalUpdates.interviewDate instanceof Date)
      ) {
        console.error(
          `[STORAGE] CRITICAL: interviewDate is not Date or null! Type: ${typeof finalUpdates.interviewDate}, Value:`,
          finalUpdates.interviewDate,
          "- removing from updates"
        );
        delete finalUpdates.interviewDate;
      }
    }

    // Final validation: Check ALL timestamp fields before sending to DB
    const timestampFields = ["interviewDate", "createdAt", "updatedAt"];
    for (const field of timestampFields) {
      if (finalUpdates[field] !== undefined) {
        const value = finalUpdates[field];
        if (value !== null && !(value instanceof Date)) {
          console.error(
            `[STORAGE] CRITICAL ERROR: ${field} is not a Date or null! Type: ${typeof value}, Value:`,
            value,
            "- removing from updates"
          );
          delete finalUpdates[field];
        } else if (value instanceof Date && isNaN(value.getTime())) {
          console.error(
            `[STORAGE] CRITICAL ERROR: ${field} is an invalid Date (NaN)! Setting to null`
          );
          finalUpdates[field] = null;
        }
      }
    }

    // Ensure updatedAt is always a valid Date
    if (
      !(finalUpdates.updatedAt instanceof Date) ||
      isNaN(finalUpdates.updatedAt.getTime())
    ) {
      console.error(
        `[STORAGE] CRITICAL: updatedAt is invalid! Creating new Date`
      );
      finalUpdates.updatedAt = new Date();
    }

    console.log(`[STORAGE] Final updates being sent to DB:`, {
      keys: Object.keys(finalUpdates),
      interviewDate:
        finalUpdates.interviewDate instanceof Date
          ? finalUpdates.interviewDate.toISOString()
          : finalUpdates.interviewDate === null
          ? "null"
          : "NOT PRESENT",
      interviewDateType:
        finalUpdates.interviewDate instanceof Date
          ? "Date"
          : typeof finalUpdates.interviewDate,
      updatedAt:
        finalUpdates.updatedAt instanceof Date
          ? finalUpdates.updatedAt.toISOString()
          : "INVALID!",
    });

    // Wrap in try-catch to catch any remaining errors
    try {
      const [transcript] = await db
        .update(icaInterviewTranscripts)
        .set(finalUpdates)
        .where(eq(icaInterviewTranscripts.id, id))
        .returning();
      return transcript || undefined;
    } catch (error: any) {
      console.error(`[STORAGE] Database update error:`, error);
      console.error(
        `[STORAGE] Updates that caused error:`,
        JSON.stringify(finalUpdates, null, 2)
      );
      console.error(
        `[STORAGE] Field types:`,
        Object.keys(finalUpdates).map((key) => ({
          key,
          type: typeof finalUpdates[key],
          isDate: finalUpdates[key] instanceof Date,
          value: finalUpdates[key],
        }))
      );
      throw error;
    }
  }

  async deleteInterviewTranscript(id: number): Promise<boolean> {
    const result = await db
      .delete(icaInterviewTranscripts)
      .where(eq(icaInterviewTranscripts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Issue Reports implementation
  async getAllIssueReports(): Promise<IssueReport[]> {
    return await db
      .select()
      .from(issueReports)
      .orderBy(desc(issueReports.createdAt));
  }

  async getIssueReport(id: number): Promise<IssueReport | undefined> {
    const [report] = await db
      .select()
      .from(issueReports)
      .where(eq(issueReports.id, id));
    return report || undefined;
  }

  async createIssueReport(
    insertReport: InsertIssueReport
  ): Promise<IssueReport> {
    const [report] = await db
      .insert(issueReports)
      .values(insertReport)
      .returning();
    return report;
  }

  async updateIssueReport(
    id: number,
    updates: Partial<IssueReport>
  ): Promise<IssueReport | undefined> {
    const [report] = await db
      .update(issueReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(issueReports.id, id))
      .returning();
    return report;
  }

  async deleteIssueReport(id: number): Promise<boolean> {
    const result = await db.delete(issueReports).where(eq(issueReports.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Notifications implementation
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
    return result[0]?.count || 0;
  }

  async createNotification(
    insertNotification: InsertNotification
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Messaging Strategies
  async getMessagingStrategiesByUser(
    userId: number
  ): Promise<MessagingStrategy[]> {
    return await db
      .select()
      .from(messagingStrategies)
      .where(eq(messagingStrategies.userId, userId))
      .orderBy(desc(messagingStrategies.createdAt));
  }

  async getAllMessagingStrategies(): Promise<MessagingStrategy[]> {
    return await db
      .select()
      .from(messagingStrategies)
      .orderBy(desc(messagingStrategies.createdAt));
  }

  async getActiveMessagingStrategy(
    userId: number
  ): Promise<MessagingStrategy | undefined> {
    const [strategy] = await db
      .select()
      .from(messagingStrategies)
      .where(
        and(
          eq(messagingStrategies.userId, userId),
          eq(messagingStrategies.isActive, true)
        )
      );
    return strategy || undefined;
  }

  async createMessagingStrategy(
    insertStrategy: InsertMessagingStrategy
  ): Promise<MessagingStrategy> {
    // If this strategy should be active, deactivate all other strategies for this user first
    if (insertStrategy.isActive) {
      await db
        .update(messagingStrategies)
        .set({ isActive: false })
        .where(eq(messagingStrategies.userId, insertStrategy.userId));
    }

    const [strategy] = await db
      .insert(messagingStrategies)
      .values({
        ...insertStrategy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return strategy;
  }

  async updateMessagingStrategy(
    id: number,
    updates: Partial<MessagingStrategy>
  ): Promise<MessagingStrategy | undefined> {
    // If this update sets isActive to true, deactivate all other strategies for this user first
    if (updates.isActive === true) {
      // Get the user ID for this strategy first
      const [currentStrategy] = await db
        .select({ userId: messagingStrategies.userId })
        .from(messagingStrategies)
        .where(eq(messagingStrategies.id, id));
      if (currentStrategy) {
        await db
          .update(messagingStrategies)
          .set({ isActive: false })
          .where(
            and(
              eq(messagingStrategies.userId, currentStrategy.userId),
              not(eq(messagingStrategies.id, id))
            )
          );
      }
    }

    const [strategy] = await db
      .update(messagingStrategies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messagingStrategies.id, id))
      .returning();
    return strategy;
  }

  async deleteMessagingStrategy(id: number): Promise<boolean> {
    const result = await db
      .delete(messagingStrategies)
      .where(eq(messagingStrategies.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setActiveMessagingStrategy(
    userId: number,
    strategyId: number
  ): Promise<boolean> {
    // First deactivate all strategies for the user
    await db
      .update(messagingStrategies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(messagingStrategies.userId, userId));

    // Then activate the specified strategy
    const result = await db
      .update(messagingStrategies)
      .set({ isActive: true, updatedAt: new Date() })
      .where(
        and(
          eq(messagingStrategies.id, strategyId),
          eq(messagingStrategies.userId, userId)
        )
      );

    return (result.rowCount ?? 0) > 0;
  }

  // Workbook Responses
  async getWorkbookResponsesByUser(
    userId: number
  ): Promise<WorkbookResponse[]> {
    return await db
      .select()
      .from(workbookResponses)
      .where(eq(workbookResponses.userId, userId))
      .orderBy(desc(workbookResponses.updatedAt));
  }

  async getWorkbookResponsesByStep(
    userId: number,
    stepNumber: number,
    offerNumber: number = 1
  ): Promise<WorkbookResponse[]> {
    return await db
      .select()
      .from(workbookResponses)
      .where(
        and(
          eq(workbookResponses.userId, userId),
          eq(workbookResponses.stepNumber, stepNumber),
          eq(workbookResponses.offerNumber, offerNumber)
        )
      )
      .orderBy(workbookResponses.questionKey);
  }

  async getWorkbookResponse(
    userId: number,
    stepNumber: number,
    questionKey: string
  ): Promise<WorkbookResponse | undefined> {
    const [response] = await db
      .select()
      .from(workbookResponses)
      .where(
        and(
          eq(workbookResponses.userId, userId),
          eq(workbookResponses.stepNumber, stepNumber),
          eq(workbookResponses.questionKey, questionKey)
        )
      );
    return response || undefined;
  }

  async getWorkbookResponsesWithContent(
    userId: number,
    stepNumber: number,
    offerNumber: number = 1
  ): Promise<WorkbookResponse[]> {
    return await db
      .select()
      .from(workbookResponses)
      .where(
        and(
          eq(workbookResponses.userId, userId),
          eq(workbookResponses.stepNumber, stepNumber),
          eq(workbookResponses.offerNumber, offerNumber),
          // Exclude empty strings but allow null values
          or(
            sql`${workbookResponses.responseText} IS NULL`,
            sql`${workbookResponses.responseText} != ''`
          )
        )
      )
      .orderBy(workbookResponses.questionKey);
  }

  async upsertWorkbookResponse(
    insertResponse: InsertWorkbookResponse
  ): Promise<WorkbookResponse> {
    // CRITICAL FIX: Add debugging to track text persistence
    console.log(
      `[TEXT PERSISTENCE] Database upsert ${insertResponse.questionKey}:`,
      {
        responseText: insertResponse.responseText,
        textLength: insertResponse.responseText?.length || 0,
        isEmptyString: insertResponse.responseText === "",
        userId: insertResponse.userId,
        stepNumber: insertResponse.stepNumber,
        offerNumber: insertResponse.offerNumber || 1,
      }
    );

    const [response] = await db
      .insert(workbookResponses)
      .values({
        ...insertResponse,
        // Ensure offerNumber is included (default to 1 for backward compatibility)
        offerNumber: insertResponse.offerNumber || 1,
        // CRITICAL FIX: Ensure empty strings are properly handled
        responseText: insertResponse.responseText, // Allow empty strings for cleared content
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        // CRITICAL FIX: Include offerNumber in conflict resolution to prevent cross-offer overwrites
        target: [
          workbookResponses.userId,
          workbookResponses.offerNumber,
          workbookResponses.stepNumber,
          workbookResponses.questionKey,
        ],
        set: {
          // CRITICAL FIX: Always update responseText, including empty strings
          responseText: insertResponse.responseText,
          sectionTitle: insertResponse.sectionTitle,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(
      `[TEXT PERSISTENCE] Database upsert successful for ${insertResponse.questionKey}`
    );
    return response;
  }

  async deleteWorkbookResponse(
    userId: number,
    stepNumber: number,
    questionKey: string
  ): Promise<boolean> {
    const result = await db
      .delete(workbookResponses)
      .where(
        and(
          eq(workbookResponses.userId, userId),
          eq(workbookResponses.stepNumber, stepNumber),
          eq(workbookResponses.questionKey, questionKey)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Strategy Interview Links
  async getStrategyInterviewLinks(
    strategyId: number
  ): Promise<StrategyInterviewLink[]> {
    return await db
      .select()
      .from(strategyInterviewLinks)
      .where(eq(strategyInterviewLinks.strategyId, strategyId))
      .orderBy(strategyInterviewLinks.createdAt);
  }

  async createStrategyInterviewLink(
    insertLink: InsertStrategyInterviewLink
  ): Promise<StrategyInterviewLink> {
    const [link] = await db
      .insert(strategyInterviewLinks)
      .values({
        ...insertLink,
        createdAt: new Date(),
      })
      .returning();
    return link;
  }

  async deleteStrategyInterviewLink(
    strategyId: number,
    transcriptId: number
  ): Promise<boolean> {
    const result = await db
      .delete(strategyInterviewLinks)
      .where(
        and(
          eq(strategyInterviewLinks.strategyId, strategyId),
          eq(strategyInterviewLinks.transcriptId, transcriptId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // User Offer Outlines
  async getUserOfferOutlinesByUser(
    userId: number
  ): Promise<UserOfferOutline[]> {
    try {
      return await db
        .select()
        .from(userOfferOutlines)
        .where(eq(userOfferOutlines.userId, userId))
        .orderBy(desc(userOfferOutlines.createdAt));
    } catch (error) {
      console.log("Legacy query for backward compatibility:", error);
      // Backward compatibility - use old schema if new columns don't exist yet
      return await db
        .select({
          id: userOfferOutlines.id,
          userId: userOfferOutlines.userId,
          title: userOfferOutlines.title,
          offerId: sql<number | null>`NULL`.as("offerId"),
          offerNumber: sql<number>`1`.as("offerNumber"),
          content: userOfferOutlines.content,
          version: userOfferOutlines.version,
          isActive: userOfferOutlines.isActive,
          sourceData: userOfferOutlines.sourceData,
          completionPercentage: userOfferOutlines.completionPercentage,
          missingInformation: userOfferOutlines.missingInformation,
          recommendations: userOfferOutlines.recommendations,
          createdAt: userOfferOutlines.createdAt,
          updatedAt: userOfferOutlines.updatedAt,
        })
        .from(userOfferOutlines)
        .where(eq(userOfferOutlines.userId, userId))
        .orderBy(desc(userOfferOutlines.createdAt));
    }
  }

  async getActiveUserOfferOutline(
    userId: number
  ): Promise<UserOfferOutline | undefined> {
    try {
      // Get the most recently activated outline when multiple can be active
      const [outline] = await db
        .select()
        .from(userOfferOutlines)
        .where(
          and(
            eq(userOfferOutlines.userId, userId),
            eq(userOfferOutlines.isActive, true)
          )
        )
        .orderBy(desc(userOfferOutlines.updatedAt));
      return outline || undefined;
    } catch (error) {
      console.log("Legacy query for backward compatibility:", error);
      // Backward compatibility - use old schema if new columns don't exist yet
      const [outline] = await db
        .select({
          id: userOfferOutlines.id,
          userId: userOfferOutlines.userId,
          title: userOfferOutlines.title,
          offerId: sql<number | null>`NULL`.as("offerId"),
          offerNumber: sql<number>`1`.as("offerNumber"),
          content: userOfferOutlines.content,
          version: userOfferOutlines.version,
          isActive: userOfferOutlines.isActive,
          sourceData: userOfferOutlines.sourceData,
          completionPercentage: userOfferOutlines.completionPercentage,
          missingInformation: userOfferOutlines.missingInformation,
          recommendations: userOfferOutlines.recommendations,
          createdAt: userOfferOutlines.createdAt,
          updatedAt: userOfferOutlines.updatedAt,
        })
        .from(userOfferOutlines)
        .where(
          and(
            eq(userOfferOutlines.userId, userId),
            eq(userOfferOutlines.isActive, true)
          )
        )
        .orderBy(desc(userOfferOutlines.updatedAt));
      return outline || undefined;
    }
  }

  async createUserOfferOutline(
    insertOutline: InsertUserOfferOutline
  ): Promise<UserOfferOutline> {
    // If this outline should be active, deactivate other outlines for the same user and offer number
    if (insertOutline.isActive) {
      await db
        .update(userOfferOutlines)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(userOfferOutlines.userId, insertOutline.userId),
            eq(userOfferOutlines.offerNumber, insertOutline.offerNumber || 1)
          )
        );
    }

    const [outline] = await db
      .insert(userOfferOutlines)
      .values({
        ...insertOutline,
        offerNumber: insertOutline.offerNumber || 1, // Ensure offerNumber is set
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return outline;
  }

  async updateUserOfferOutline(
    id: number,
    updates: Partial<UserOfferOutline>
  ): Promise<UserOfferOutline | undefined> {
    // If setting isActive to true, deactivate other outlines for the same user and offer number
    if (updates.isActive === true) {
      // Get the current outline to determine userId and offerNumber
      const [currentOutline] = await db
        .select()
        .from(userOfferOutlines)
        .where(eq(userOfferOutlines.id, id));

      if (currentOutline) {
        await db
          .update(userOfferOutlines)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(userOfferOutlines.userId, currentOutline.userId),
              eq(userOfferOutlines.offerNumber, currentOutline.offerNumber),
              ne(userOfferOutlines.id, id) // Don't deactivate the current outline
            )
          );
      }
    }

    const [outline] = await db
      .update(userOfferOutlines)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userOfferOutlines.id, id))
      .returning();
    return outline;
  }

  async deleteUserOfferOutline(id: number): Promise<boolean> {
    const result = await db
      .delete(userOfferOutlines)
      .where(eq(userOfferOutlines.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User Offers - Multi-offer system
  async getUserOffers(userId: number): Promise<UserOffer[]> {
    return await db
      .select()
      .from(userOffers)
      .where(eq(userOffers.userId, userId))
      .orderBy(desc(userOffers.createdAt));
  }

  async getUserOffer(id: number): Promise<UserOffer | undefined> {
    const [offer] = await db
      .select()
      .from(userOffers)
      .where(eq(userOffers.id, id));
    return offer || undefined;
  }

  async getActiveUserOffer(userId: number): Promise<UserOffer | undefined> {
    // Get the most recently activated offer when multiple can be active
    const [offer] = await db
      .select()
      .from(userOffers)
      .where(and(eq(userOffers.userId, userId), eq(userOffers.isActive, true)))
      .orderBy(desc(userOffers.updatedAt));
    return offer || undefined;
  }

  async createUserOffer(insertOffer: InsertUserOffer): Promise<UserOffer> {
    const [offer] = await db
      .insert(userOffers)
      .values({
        ...insertOffer,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return offer;
  }

  async updateUserOffer(
    id: number,
    updates: Partial<UserOffer>
  ): Promise<UserOffer | undefined> {
    const [offer] = await db
      .update(userOffers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userOffers.id, id))
      .returning();
    return offer;
  }

  async deleteUserOffer(id: number): Promise<boolean> {
    const result = await db.delete(userOffers).where(eq(userOffers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setActiveUserOffer(id: number): Promise<UserOffer | undefined> {
    // Set this offer as active without deactivating others
    const [activeOffer] = await db
      .update(userOffers)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(userOffers.id, id))
      .returning();

    return activeOffer;
  }

  async setActiveUserOfferOutline(
    userId: number,
    outlineId: number
  ): Promise<boolean> {
    // First get the outline to determine its offerNumber
    const [targetOutline] = await db
      .select()
      .from(userOfferOutlines)
      .where(
        and(
          eq(userOfferOutlines.id, outlineId),
          eq(userOfferOutlines.userId, userId)
        )
      );

    if (!targetOutline) {
      return false;
    }

    // Deactivate all other outlines for the same user and offer number
    await db
      .update(userOfferOutlines)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(userOfferOutlines.userId, userId),
          eq(userOfferOutlines.offerNumber, targetOutline.offerNumber),
          ne(userOfferOutlines.id, outlineId)
        )
      );

    // Activate the specified outline
    const result = await db
      .update(userOfferOutlines)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(userOfferOutlines.id, outlineId));

    return (result.rowCount ?? 0) > 0;
  }

  // Core Offer Coaching Sessions
  async getCoreCoachingSession(
    userId: number,
    questionKey: string
  ): Promise<CoreOfferCoachingSession | undefined> {
    const [session] = await db
      .select()
      .from(coreOfferCoachingSessions)
      .where(
        and(
          eq(coreOfferCoachingSessions.userId, userId),
          eq(coreOfferCoachingSessions.questionKey, questionKey)
        )
      )
      .orderBy(desc(coreOfferCoachingSessions.updatedAt));
    return session || undefined;
  }

  async getCoreCoachingSessions(
    userId: number
  ): Promise<CoreOfferCoachingSession[]> {
    return await db
      .select()
      .from(coreOfferCoachingSessions)
      .where(eq(coreOfferCoachingSessions.userId, userId))
      .orderBy(desc(coreOfferCoachingSessions.updatedAt));
  }

  async createCoreCoachingSession(
    insertSession: InsertCoreOfferCoachingSession
  ): Promise<CoreOfferCoachingSession> {
    const [session] = await db
      .insert(coreOfferCoachingSessions)
      .values({
        ...insertSession,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return session;
  }

  async updateCoreCoachingSession(
    id: number,
    updates: Partial<CoreOfferCoachingSession>
  ): Promise<CoreOfferCoachingSession | undefined> {
    const [session] = await db
      .update(coreOfferCoachingSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(coreOfferCoachingSessions.id, id))
      .returning();
    return session;
  }

  // Sales Page Drafts
  async getSalesPageDraftsByUser(userId: number): Promise<SalesPageDraft[]> {
    return await db
      .select()
      .from(salesPageDrafts)
      .where(eq(salesPageDrafts.userId, userId))
      .orderBy(desc(salesPageDrafts.createdAt));
  }

  async getActiveSalesPageDrafts(userId: number): Promise<SalesPageDraft[]> {
    return await db
      .select()
      .from(salesPageDrafts)
      .where(
        and(
          eq(salesPageDrafts.userId, userId),
          eq(salesPageDrafts.isActive, true)
        )
      )
      .orderBy(desc(salesPageDrafts.updatedAt));
  }

  async createSalesPageDraft(
    insertDraft: InsertSalesPageDraft
  ): Promise<SalesPageDraft> {
    const [draft] = await db
      .insert(salesPageDrafts)
      .values({
        ...insertDraft,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return draft;
  }

  async updateSalesPageDraft(
    id: number,
    updates: Partial<SalesPageDraft>
  ): Promise<SalesPageDraft | undefined> {
    const [draft] = await db
      .update(salesPageDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(salesPageDrafts.id, id))
      .returning();
    return draft;
  }

  async deleteSalesPageDraft(id: number): Promise<boolean> {
    const result = await db
      .delete(salesPageDrafts)
      .where(eq(salesPageDrafts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteSalesPageDraftsByUser(userId: number): Promise<boolean> {
    const result = await db
      .delete(salesPageDrafts)
      .where(eq(salesPageDrafts.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async setActiveSalesPageDraft(
    userId: number,
    draftId: number
  ): Promise<boolean> {
    // First, deactivate all existing drafts for this user
    await db
      .update(salesPageDrafts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesPageDrafts.userId, userId));

    // Then activate the specified draft
    const result = await db
      .update(salesPageDrafts)
      .set({ isActive: true, updatedAt: new Date() })
      .where(
        and(eq(salesPageDrafts.id, draftId), eq(salesPageDrafts.userId, userId))
      );

    return (result.rowCount ?? 0) > 0;
  }

  // Password reset token methods
  async createPasswordResetToken(
    data: InsertPasswordResetToken
  ): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(data)
      .returning();
    return token;
  }

  async getPasswordResetToken(
    token: string
  ): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async markTokenAsUsed(id: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, id));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(
        or(
          lt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.used, true)
        )
      );
  }

  // User login tracking
  async recordUserLogin(data: InsertUserLogin): Promise<UserLogin> {
    const [login] = await db.insert(userLogins).values(data).returning();
    return login;
  }

  async getUserLoginHistory(userId: number, limit = 50): Promise<UserLogin[]> {
    return await db
      .select()
      .from(userLogins)
      .where(eq(userLogins.userId, userId))
      .orderBy(desc(userLogins.loginAt))
      .limit(limit);
  }

  async getAllUserLogins(limit = 100): Promise<UserLogin[]> {
    return await db
      .select()
      .from(userLogins)
      .orderBy(desc(userLogins.loginAt))
      .limit(limit);
  }

  // Section Completions operations
  async getSectionCompletions(userId: number): Promise<SectionCompletion[]> {
    return await db
      .select()
      .from(sectionCompletions)
      .where(eq(sectionCompletions.userId, userId));
  }

  async markSectionComplete(
    completion: InsertSectionCompletion
  ): Promise<SectionCompletion> {
    // Check if completion already exists
    const [existing] = await db
      .select()
      .from(sectionCompletions)
      .where(
        and(
          eq(sectionCompletions.userId, completion.userId),
          eq(sectionCompletions.stepNumber, completion.stepNumber),
          eq(sectionCompletions.sectionTitle, completion.sectionTitle),
          eq(sectionCompletions.offerNumber, completion.offerNumber || 1)
        )
      );

    if (existing) {
      // Update existing completion
      const [updated] = await db
        .update(sectionCompletions)
        .set({ updatedAt: new Date() })
        .where(eq(sectionCompletions.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new completion
      const [sectionCompletion] = await db
        .insert(sectionCompletions)
        .values({
          ...completion,
          offerNumber: completion.offerNumber || 1,
        })
        .returning();
      return sectionCompletion;
    }
  }

  async unmarkSectionComplete(
    userId: number,
    stepNumber: number,
    sectionTitle: string,
    offerNumber?: number
  ): Promise<boolean> {
    const conditions = [
      eq(sectionCompletions.userId, userId),
      eq(sectionCompletions.stepNumber, stepNumber),
      eq(sectionCompletions.sectionTitle, sectionTitle),
    ];

    if (offerNumber !== undefined) {
      conditions.push(eq(sectionCompletions.offerNumber, offerNumber));
    }

    const result = await db
      .delete(sectionCompletions)
      .where(and(...conditions));
    return (result.rowCount || 0) > 0;
  }

  // Checklist items methods
  async getChecklistItems(
    userId: number,
    sectionKey: string
  ): Promise<ChecklistItem[]> {
    return await db
      .select()
      .from(checklistItems)
      .where(
        and(
          eq(checklistItems.userId, userId),
          eq(checklistItems.sectionKey, sectionKey)
        )
      );
  }

  async upsertChecklistItem(
    userId: number,
    sectionKey: string,
    itemKey: string,
    isCompleted: boolean
  ): Promise<ChecklistItem> {
    // Check if item already exists
    const [existing] = await db
      .select()
      .from(checklistItems)
      .where(
        and(
          eq(checklistItems.userId, userId),
          eq(checklistItems.sectionKey, sectionKey),
          eq(checklistItems.itemKey, itemKey)
        )
      );

    if (existing) {
      // Update existing item
      const [updated] = await db
        .update(checklistItems)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(checklistItems.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new item
      const [item] = await db
        .insert(checklistItems)
        .values({
          userId,
          sectionKey,
          itemKey,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        })
        .returning();
      return item;
    }
  }

  // Create coaching event (for AI coaching monitor)
  async createCoachingEvent(eventData: any): Promise<any> {
    // For now, just log the event - can be enhanced to store in database later
    console.log("🎯 Coaching Event:", eventData);
    return { success: true, eventId: Date.now() };
  }

  // Content Strategy methods
  async getContentStrategyResponse(
    userId: number
  ): Promise<ContentStrategyResponse | undefined> {
    const [response] = await db
      .select()
      .from(contentStrategyResponses)
      .where(eq(contentStrategyResponses.userId, userId))
      .orderBy(desc(contentStrategyResponses.createdAt));
    return response || undefined;
  }

  async createContentStrategyResponse(
    response: InsertContentStrategyResponse
  ): Promise<ContentStrategyResponse> {
    const [created] = await db
      .insert(contentStrategyResponses)
      .values(response)
      .returning();
    return created;
  }

  async updateContentStrategyResponse(
    id: number,
    updates: Partial<ContentStrategyResponse>
  ): Promise<ContentStrategyResponse | undefined> {
    const [updated] = await db
      .update(contentStrategyResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentStrategyResponses.id, id))
      .returning();
    return updated || undefined;
  }

  async getGeneratedContentStrategiesByUser(
    userId: number
  ): Promise<GeneratedContentStrategy[]> {
    return await db
      .select()
      .from(generatedContentStrategies)
      .where(eq(generatedContentStrategies.userId, userId))
      .orderBy(desc(generatedContentStrategies.createdAt));
  }

  async getActiveGeneratedContentStrategy(
    userId: number
  ): Promise<GeneratedContentStrategy | undefined> {
    const [strategy] = await db
      .select()
      .from(generatedContentStrategies)
      .where(
        and(
          eq(generatedContentStrategies.userId, userId),
          eq(generatedContentStrategies.isActive, true)
        )
      )
      .orderBy(desc(generatedContentStrategies.createdAt));
    return strategy || undefined;
  }

  async createGeneratedContentStrategy(
    strategy: InsertGeneratedContentStrategy
  ): Promise<GeneratedContentStrategy> {
    const [created] = await db
      .insert(generatedContentStrategies)
      .values(strategy)
      .returning();
    return created;
  }

  async updateGeneratedContentStrategy(
    id: number,
    updates: Partial<GeneratedContentStrategy>
  ): Promise<GeneratedContentStrategy | undefined> {
    const [updated] = await db
      .update(generatedContentStrategies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(generatedContentStrategies.id, id))
      .returning();
    return updated || undefined;
  }

  async setActiveGeneratedContentStrategy(
    userId: number,
    strategyId: number
  ): Promise<boolean> {
    try {
      // Deactivate all existing strategies for this user
      await db
        .update(generatedContentStrategies)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(generatedContentStrategies.userId, userId));

      // Activate the specified strategy
      const [updated] = await db
        .update(generatedContentStrategies)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          and(
            eq(generatedContentStrategies.id, strategyId),
            eq(generatedContentStrategies.userId, userId)
          )
        )
        .returning();

      return !!updated;
    } catch (error) {
      console.error("Error setting active content strategy:", error);
      return false;
    }
  }

  // Email Tracking operations
  async getEmailTrackingByUser(userId: number): Promise<EmailTracking[]> {
    return await db
      .select()
      .from(emailTracking)
      .where(eq(emailTracking.userId, userId))
      .orderBy(desc(emailTracking.date));
  }

  async getEmailTrackingByDate(
    userId: number,
    date: string
  ): Promise<EmailTracking[]> {
    return await db
      .select()
      .from(emailTracking)
      .where(
        and(eq(emailTracking.userId, userId), eq(emailTracking.date, date))
      )
      .orderBy(desc(emailTracking.createdAt));
  }

  async getEmailTrackingByLaunch(
    userId: number,
    liveLaunchId: number
  ): Promise<EmailTracking[]> {
    return await db
      .select()
      .from(emailTracking)
      .where(
        and(
          eq(emailTracking.userId, userId),
          eq(emailTracking.liveLaunchId, liveLaunchId)
        )
      )
      .orderBy(desc(emailTracking.date));
  }

  async createEmailTracking(
    insertEmail: InsertEmailTracking
  ): Promise<EmailTracking> {
    const [email] = await db
      .insert(emailTracking)
      .values(insertEmail)
      .returning();
    return email;
  }

  async updateEmailTracking(
    id: number,
    updates: Partial<EmailTracking>
  ): Promise<EmailTracking | undefined> {
    const [email] = await db
      .update(emailTracking)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTracking.id, id))
      .returning();
    return email || undefined;
  }

  async deleteEmailTracking(id: number): Promise<boolean> {
    const result = await db
      .delete(emailTracking)
      .where(eq(emailTracking.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Live Launch Management operations
  async getLiveLaunchesByUser(userId: number): Promise<LiveLaunch[]> {
    return await db
      .select()
      .from(liveLaunches)
      .where(eq(liveLaunches.userId, userId))
      .orderBy(desc(liveLaunches.createdAt));
  }

  async getLiveLaunch(id: number): Promise<LiveLaunch | undefined> {
    const [launch] = await db
      .select()
      .from(liveLaunches)
      .where(eq(liveLaunches.id, id));
    return launch || undefined;
  }

  async createLiveLaunch(insertLaunch: InsertLiveLaunch): Promise<LiveLaunch> {
    const [launch] = await db
      .insert(liveLaunches)
      .values(insertLaunch)
      .returning();
    return launch;
  }

  async updateLiveLaunch(
    id: number,
    updates: Partial<LiveLaunch>
  ): Promise<LiveLaunch | undefined> {
    const [launch] = await db
      .update(liveLaunches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liveLaunches.id, id))
      .returning();
    return launch || undefined;
  }

  async deleteLiveLaunch(id: number): Promise<boolean> {
    const result = await db.delete(liveLaunches).where(eq(liveLaunches.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Live Launch Optimization Suggestions operations
  async getLiveLaunchOptimizationSuggestions(
    liveLaunchId: number
  ): Promise<LiveLaunchOptimizationSuggestion[]> {
    return await db
      .select()
      .from(liveLaunchOptimizationSuggestions)
      .where(eq(liveLaunchOptimizationSuggestions.liveLaunchId, liveLaunchId))
      .orderBy(desc(liveLaunchOptimizationSuggestions.createdAt));
  }

  async createLiveLaunchOptimizationSuggestion(
    data: InsertLiveLaunchOptimizationSuggestion
  ): Promise<LiveLaunchOptimizationSuggestion> {
    const [suggestion] = await db
      .insert(liveLaunchOptimizationSuggestions)
      .values(data)
      .returning();
    return suggestion;
  }

  async saveLiveLaunchOptimizationSuggestions(
    liveLaunchId: number,
    userId: number,
    suggestions: Array<{
      type: string;
      title: string;
      issue: string;
      actions: string[];
    }>
  ): Promise<void> {
    // Clear existing suggestions for this launch
    await this.clearLiveLaunchOptimizationSuggestions(liveLaunchId);

    // Insert new suggestions
    if (suggestions.length > 0) {
      await db.insert(liveLaunchOptimizationSuggestions).values(
        suggestions.map((s) => ({
          userId,
          liveLaunchId,
          suggestionType: s.type,
          title: s.title,
          issue: s.issue,
          actions: s.actions,
          metricsSnapshot: null,
        }))
      );
    }
  }

  async clearLiveLaunchOptimizationSuggestions(
    liveLaunchId: number
  ): Promise<void> {
    await db
      .delete(liveLaunchOptimizationSuggestions)
      .where(eq(liveLaunchOptimizationSuggestions.liveLaunchId, liveLaunchId));
  }

  // Live Launch Funnel Metrics operations
  async getFunnelMetricsByLaunch(
    liveLaunchId: number
  ): Promise<LiveLaunchFunnelMetric[]> {
    return await db
      .select()
      .from(liveLaunchFunnelMetrics)
      .where(eq(liveLaunchFunnelMetrics.liveLaunchId, liveLaunchId))
      .orderBy(desc(liveLaunchFunnelMetrics.date));
  }

  async getFunnelMetricByDateAndType(
    liveLaunchId: number,
    date: string,
    metricType: string
  ): Promise<LiveLaunchFunnelMetric | undefined> {
    const [metric] = await db
      .select()
      .from(liveLaunchFunnelMetrics)
      .where(
        and(
          eq(liveLaunchFunnelMetrics.liveLaunchId, liveLaunchId),
          eq(liveLaunchFunnelMetrics.date, date),
          eq(liveLaunchFunnelMetrics.metricType, metricType)
        )
      );
    return metric || undefined;
  }

  async upsertFunnelMetric(
    metric: InsertLiveLaunchFunnelMetric
  ): Promise<LiveLaunchFunnelMetric> {
    const [result] = await db
      .insert(liveLaunchFunnelMetrics)
      .values(metric)
      .onConflictDoUpdate({
        target: [
          liveLaunchFunnelMetrics.liveLaunchId,
          liveLaunchFunnelMetrics.date,
          liveLaunchFunnelMetrics.metricType,
        ],
        set: { value: metric.value, goal: metric.goal, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async updateFunnelMetric(
    id: number,
    updates: Partial<LiveLaunchFunnelMetric>
  ): Promise<LiveLaunchFunnelMetric | undefined> {
    const [metric] = await db
      .update(liveLaunchFunnelMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liveLaunchFunnelMetrics.id, id))
      .returning();
    return metric || undefined;
  }

  // Live Launch Organic Metrics operations
  async getOrganicMetricsByLaunch(
    liveLaunchId: number
  ): Promise<LiveLaunchOrganicMetric[]> {
    return await db
      .select()
      .from(liveLaunchOrganicMetrics)
      .where(eq(liveLaunchOrganicMetrics.liveLaunchId, liveLaunchId))
      .orderBy(desc(liveLaunchOrganicMetrics.date));
  }

  async getOrganicMetricByDateAndType(
    liveLaunchId: number,
    date: string,
    metricType: string
  ): Promise<LiveLaunchOrganicMetric | undefined> {
    const [metric] = await db
      .select()
      .from(liveLaunchOrganicMetrics)
      .where(
        and(
          eq(liveLaunchOrganicMetrics.liveLaunchId, liveLaunchId),
          eq(liveLaunchOrganicMetrics.date, date),
          eq(liveLaunchOrganicMetrics.metricType, metricType)
        )
      );
    return metric || undefined;
  }

  async upsertOrganicMetric(
    metric: InsertLiveLaunchOrganicMetric
  ): Promise<LiveLaunchOrganicMetric> {
    const [result] = await db
      .insert(liveLaunchOrganicMetrics)
      .values(metric)
      .onConflictDoUpdate({
        target: [
          liveLaunchOrganicMetrics.liveLaunchId,
          liveLaunchOrganicMetrics.date,
          liveLaunchOrganicMetrics.metricType,
        ],
        set: { value: metric.value, goal: metric.goal, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async updateOrganicMetric(
    id: number,
    updates: Partial<LiveLaunchOrganicMetric>
  ): Promise<LiveLaunchOrganicMetric | undefined> {
    const [metric] = await db
      .update(liveLaunchOrganicMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(liveLaunchOrganicMetrics.id, id))
      .returning();
    return metric || undefined;
  }

  // IGNITE Documents operations
  async createIgniteDocument(
    document: InsertIgniteDocument
  ): Promise<IgniteDocument> {
    const [doc] = await db.insert(igniteDocuments).values(document).returning();
    return doc;
  }

  async getIgniteDocumentsByUser(userId: number): Promise<IgniteDocument[]> {
    return await db
      .select()
      .from(igniteDocuments)
      .where(eq(igniteDocuments.userId, userId))
      .orderBy(desc(igniteDocuments.createdAt));
  }

  async updateIgniteDocument(
    id: number,
    updates: Partial<IgniteDocument>
  ): Promise<IgniteDocument | undefined> {
    const [doc] = await db
      .update(igniteDocuments)
      .set(updates)
      .where(eq(igniteDocuments.id, id))
      .returning();
    return doc || undefined;
  }

  // Video Script Generator State operations
  async upsertVideoScriptGeneratorState(
    state: InsertVideoScriptGeneratorState
  ): Promise<VideoScriptGeneratorState> {
    const [result] = await db
      .insert(videoScriptGeneratorState)
      .values(state)
      .onConflictDoUpdate({
        target: [videoScriptGeneratorState.userId],
        set: {
          landingPageUrl: state.landingPageUrl,
          manualContent: state.manualContent,
          inputMethod: state.inputMethod,
          generatedScripts: state.generatedScripts,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getVideoScriptGeneratorState(
    userId: number
  ): Promise<VideoScriptGeneratorState | undefined> {
    const [state] = await db
      .select()
      .from(videoScriptGeneratorState)
      .where(eq(videoScriptGeneratorState.userId, userId));
    return state || undefined;
  }

  // Launch Registration Funnel Data operations
  async upsertLaunchRegistrationFunnelData(
    data: InsertLaunchRegistrationFunnelData
  ): Promise<LaunchRegistrationFunnelData> {
    const [result] = await db
      .insert(launchRegistrationFunnelData)
      .values(data)
      .onConflictDoUpdate({
        target: [launchRegistrationFunnelData.userId],
        set: {
          launchDateTime: data.launchDateTime,
          experienceType: data.experienceType,
          transformationResult: data.transformationResult,
          topThreeOutcomes: data.topThreeOutcomes,
          specificProblem: data.specificProblem,
          urgentProblem: data.urgentProblem,
          uniqueExperience: data.uniqueExperience,
          showUpBonus: data.showUpBonus,
          thankYouAction: data.thankYouAction,
          painPoints: data.painPoints,
          quickWin: data.quickWin,
          objections: data.objections,
          socialProofResults: data.socialProofResults,
          salesPageAction: data.salesPageAction,
          salesPageUrgency: data.salesPageUrgency,
          salesPageOfferName: data.salesPageOfferName,
          salesPageOfferPrice: data.salesPageOfferPrice,
          salesPageCorePromise: data.salesPageCorePromise,
          salesPageWhatsIncluded: data.salesPageWhatsIncluded,
          salesPageUniqueApproach: data.salesPageUniqueApproach,
          emailInviteHooks: data.emailInviteHooks,
          emailInviteFOMO: data.emailInviteFOMO,
          emailConfirmationDetails: data.emailConfirmationDetails,
          emailPreEventActions: data.emailPreEventActions,
          emailNurtureContent: data.emailNurtureContent,
          emailLiveAttendanceValue: data.emailLiveAttendanceValue,
          emailMythsBeliefs: data.emailMythsBeliefs,
          emailSalesStories: data.emailSalesStories,
          emailFinalPush: data.emailFinalPush,
          generatedOptInPage: data.generatedOptInPage,
          generatedThankYouPage: data.generatedThankYouPage,
          generatedSalesPageCopy: data.generatedSalesPageCopy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getLaunchRegistrationFunnelData(
    userId: number
  ): Promise<LaunchRegistrationFunnelData | undefined> {
    const [data] = await db
      .select()
      .from(launchRegistrationFunnelData)
      .where(eq(launchRegistrationFunnelData.userId, userId));
    return data || undefined;
  }

  // Launch Email Sequences operations
  async createLaunchEmailSequence(
    sequence: InsertLaunchEmailSequence
  ): Promise<LaunchEmailSequence> {
    const [result] = await db
      .insert(launchEmailSequences)
      .values(sequence)
      .returning();
    return result;
  }

  async getLaunchEmailSequencesByUserId(
    userId: number
  ): Promise<LaunchEmailSequence[]> {
    return await db
      .select()
      .from(launchEmailSequences)
      .where(eq(launchEmailSequences.userId, userId))
      .orderBy(
        launchEmailSequences.emailType,
        launchEmailSequences.emailNumber
      );
  }

  async updateLaunchEmailSequence(
    id: number,
    userId: number,
    updates: Partial<LaunchEmailSequence>
  ): Promise<LaunchEmailSequence | undefined> {
    const [result] = await db
      .update(launchEmailSequences)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(launchEmailSequences.id, id),
          eq(launchEmailSequences.userId, userId)
        )
      )
      .returning();
    return result || undefined;
  }

  async deleteLaunchEmailSequencesByUserId(userId: number): Promise<boolean> {
    await db
      .delete(launchEmailSequences)
      .where(eq(launchEmailSequences.userId, userId));
    return true;
  }

  // Funnel Tracker Data operations
  async getFunnelTrackerData(
    userId: number
  ): Promise<FunnelTrackerData | undefined> {
    const [data] = await db
      .select()
      .from(funnelTrackerData)
      .where(eq(funnelTrackerData.userId, userId));
    return data || undefined;
  }

  async upsertFunnelTrackerData(
    data: InsertFunnelTrackerData
  ): Promise<FunnelTrackerData> {
    const [result] = await db
      .insert(funnelTrackerData)
      .values(data)
      .onConflictDoUpdate({
        target: [funnelTrackerData.userId],
        set: {
          tripwireProductCost: data.tripwireProductCost,
          funnelData: data.funnelData,
          organicFunnelData: data.organicFunnelData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Optimization Suggestions operations
  async getOptimizationSuggestions(
    userId: number
  ): Promise<OptimizationSuggestions | undefined> {
    const [data] = await db
      .select()
      .from(optimizationSuggestions)
      .where(eq(optimizationSuggestions.userId, userId));
    return data || undefined;
  }

  async upsertOptimizationSuggestions(
    data: InsertOptimizationSuggestions
  ): Promise<OptimizationSuggestions> {
    const [result] = await db
      .insert(optimizationSuggestions)
      .values(data)
      .onConflictDoUpdate({
        target: [optimizationSuggestions.userId],
        set: {
          suggestions: data.suggestions,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Implementation Checkboxes operations
  async getImplementationCheckboxes(
    userId: number,
    pageIdentifier: string
  ): Promise<ImplementationCheckbox | undefined> {
    const [data] = await db
      .select()
      .from(implementationCheckboxes)
      .where(
        and(
          eq(implementationCheckboxes.userId, userId),
          eq(implementationCheckboxes.pageIdentifier, pageIdentifier)
        )
      );
    return data || undefined;
  }

  async upsertImplementationCheckboxes(
    data: InsertImplementationCheckbox
  ): Promise<ImplementationCheckbox> {
    const [result] = await db
      .insert(implementationCheckboxes)
      .values(data)
      .onConflictDoUpdate({
        target: [
          implementationCheckboxes.userId,
          implementationCheckboxes.pageIdentifier,
        ],
        set: {
          checkboxStates: data.checkboxStates,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Analytics and monitoring
  async getSystemHealth(): Promise<any> {
    return {
      status: "ok",
      timestamp: new Date(),
      database: "connected",
    };
  }

  // Forum Categories
  async getForumCategories(): Promise<ForumCategory[]> {
    const categories = await db
      .select()
      .from(forumCategories)
      .orderBy(
        sql`CASE WHEN slug = 'celebrating' THEN 0 ELSE ${forumCategories.id} END`
      );

    // Get thread counts and last activity for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const threadCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(forumThreads)
          .where(eq(forumThreads.categoryId, category.id));

        const lastActivity = await db
          .select({ lastActivity: forumThreads.lastActivityAt })
          .from(forumThreads)
          .where(eq(forumThreads.categoryId, category.id))
          .orderBy(desc(forumThreads.lastActivityAt))
          .limit(1);

        return {
          ...category,
          threadCount: threadCount[0]?.count || 0,
          lastActivityAt: lastActivity[0]?.lastActivity || null,
        } as ForumCategory & {
          threadCount: number;
          lastActivityAt: Date | null;
        };
      })
    );

    return categoriesWithCounts;
  }

  // Forum Threads
  async getThreadsByCategorySlug(
    slug: string,
    page: number = 1,
    size: number = 20
  ): Promise<{ threads: ForumThread[]; total: number }> {
    const offset = (page - 1) * size;

    // Get category by slug
    const [category] = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, slug));
    if (!category) {
      return { threads: [], total: 0 };
    }

    // Get threads with user info
    const threadsResult = await db
      .select({
        id: forumThreads.id,
        categoryId: forumThreads.categoryId,
        userId: forumThreads.userId,
        title: forumThreads.title,
        body: forumThreads.body,
        attachments: forumThreads.attachments,
        replyCount: forumThreads.replyCount,
        lastActivityAt: forumThreads.lastActivityAt,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
        authorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        authorEmail: users.email,
      })
      .from(forumThreads)
      .leftJoin(users, eq(forumThreads.userId, users.id))
      .where(eq(forumThreads.categoryId, category.id))
      .orderBy(desc(forumThreads.lastActivityAt))
      .limit(size)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumThreads)
      .where(eq(forumThreads.categoryId, category.id));

    // Map to ForumThread type (excluding authorName and authorEmail which are not part of ForumThread)
    const threads: ForumThread[] = threadsResult.map((thread) => ({
      id: thread.id,
      categoryId: thread.categoryId,
      userId: thread.userId,
      title: thread.title,
      body: thread.body,
      attachments: thread.attachments,
      replyCount: thread.replyCount,
      lastActivityAt: thread.lastActivityAt,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      authorName: thread.authorName,
      authorEmail: thread.authorEmail,
    }));

    return {
      threads,
      total: totalResult[0]?.count || 0,
    };
  }

  async createThread(
    categorySlug: string,
    userId: number,
    data: InsertForumThread
  ): Promise<ForumThread> {
    // Get category by slug
    const [category] = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, categorySlug));
    if (!category) {
      throw new Error(`Category with slug "${categorySlug}" not found`);
    }

    // Create the thread
    const [thread] = await db
      .insert(forumThreads)
      .values({
        ...data,
        categoryId: category.id,
        userId: userId,
      })
      .returning();

    return thread;
  }

  async getThreadWithPosts(
    threadId: number
  ): Promise<
    | { thread: ForumThread; posts: ForumPost[]; category: ForumCategory }
    | undefined
  > {
    // Get thread with category info
    const threadResult = await db
      .select({
        thread: forumThreads,
        category: forumCategories,
        authorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        authorEmail: users.email,
      })
      .from(forumThreads)
      .leftJoin(
        forumCategories,
        eq(forumThreads.categoryId, forumCategories.id)
      )
      .leftJoin(users, eq(forumThreads.userId, users.id))
      .where(eq(forumThreads.id, threadId));

    if (!threadResult[0]) {
      return undefined;
    }

    // Get posts for this thread
    const postsResult = await db
      .select({
        id: forumPosts.id,
        threadId: forumPosts.threadId,
        userId: forumPosts.userId,
        parentId: forumPosts.parentId,
        body: forumPosts.body,
        attachments: forumPosts.attachments,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        authorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        authorEmail: users.email,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .where(eq(forumPosts.threadId, threadId))
      .orderBy(forumPosts.createdAt);

    // Map to ForumPost type (excluding authorName and authorEmail which are not part of ForumPost)
    const posts: ForumPost[] = postsResult.map((post) => ({
      id: post.id,
      threadId: post.threadId,
      userId: post.userId,
      parentId: post.parentId,
      body: post.body,
      attachments: post.attachments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      authorName: post.authorName,
      authorEmail: post.authorEmail,
    }));

    return {
      thread: {
        ...threadResult[0].thread,
        authorName: threadResult[0].authorName,
        authorEmail: threadResult[0].authorEmail,
      } as ForumThread,
      posts,
      category: threadResult[0].category!,
    };
  }

  // Forum Posts
  async createPost(
    threadId: number,
    userId: number,
    data: InsertForumPost,
    parentId?: number
  ): Promise<ForumPost> {
    // Create the post in a transaction to also update thread reply count and last activity
    const result = await db.transaction(async (tx) => {
      // Insert the post
      const [post] = await tx
        .insert(forumPosts)
        .values({
          ...data,
          threadId: threadId,
          userId: userId,
          parentId: parentId || null,
        })
        .returning();

      // Update thread reply count and last activity
      await tx
        .update(forumThreads)
        .set({
          replyCount: sql`${forumThreads.replyCount} + 1`,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(forumThreads.id, threadId));

      return post;
    });

    return result;
  }

  async deletePost(postId: number, userId: number): Promise<boolean> {
    // First check if the post exists and belongs to the user
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId));

    if (!post) {
      throw new Error("Post not found");
    }

    if (post.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own posts");
    }

    // Delete in a transaction: delete the post and update thread reply count
    await db.transaction(async (tx) => {
      // Delete the post
      await tx.delete(forumPosts).where(eq(forumPosts.id, postId));

      // Update thread reply count
      await tx
        .update(forumThreads)
        .set({
          replyCount: sql`GREATEST(0, ${forumThreads.replyCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(forumThreads.id, post.threadId));
    });

    return true;
  }

  async deleteThread(threadId: number, userId: number): Promise<boolean> {
    // First check if the thread exists and belongs to the user
    const [thread] = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId));

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You can only delete your own threads");
    }

    // Delete in a transaction: first delete all posts, then the thread
    await db.transaction(async (tx) => {
      // Delete all posts in the thread
      await tx.delete(forumPosts).where(eq(forumPosts.threadId, threadId));

      // Delete the thread
      await tx.delete(forumThreads).where(eq(forumThreads.id, threadId));
    });

    return true;
  }

  // Forum Notifications
  async createForumReplyNotification(
    threadId: number,
    threadOwnerId: number,
    replierUserId: number,
    postId: number
  ): Promise<void> {
    // Don't create notification if the user is replying to their own thread
    if (threadOwnerId === replierUserId) {
      return;
    }

    // Get thread info
    const [thread] = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId));
    if (!thread) return;

    // Get replier info
    const [replier] = await db
      .select()
      .from(users)
      .where(eq(users.id, replierUserId));
    if (!replier) return;

    const replierName =
      `${replier.firstName || ""} ${replier.lastName || ""}`.trim() ||
      replier.email;

    // Create notification
    await this.createNotification({
      userId: threadOwnerId,
      type: "forum_reply",
      title: "New reply to your thread",
      message: `${replierName} replied to "${thread.title}"`,
      link: `/forum/thread/${threadId}#post-${postId}`,
      isRead: false,
      metadata: { threadId, postId, replierUserId },
    });
  }

  async createForumMentionNotifications(
    postBody: string,
    postAuthorId: number,
    threadId: number,
    postId: number
  ): Promise<void> {
    // Find all @mentions in the post body
    // Supports: letters, numbers, hyphens, periods, underscores, apostrophes (2-30 chars)
    // Examples: @John, @Mary-Jane, @O'Neil, @john.smith, @user_123
    const mentionRegex = /@([a-zA-Z0-9._'-]{2,30})/g;
    let match;
    const mentions: string[] = [];

    while ((match = mentionRegex.exec(postBody)) !== null) {
      mentions.push(match[1].toLowerCase());
    }

    if (mentions.length === 0) {
      return;
    }

    // Get thread info
    const [thread] = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId));
    if (!thread) return;

    // Get post author info
    const [author] = await db
      .select()
      .from(users)
      .where(eq(users.id, postAuthorId));
    if (!author) return;

    const authorName =
      `${author.firstName || ""} ${author.lastName || ""}`.trim() ||
      author.email;

    // Remove duplicates
    const uniqueHandles = [...new Set(mentions)];

    // Track notified users to prevent duplicate notifications
    const notifiedUserIds = new Set<number>();

    // Find users by firstName, lastName, or email username match
    for (const handle of uniqueHandles) {
      const mentionedUsers = await db
        .select()
        .from(users)
        .where(
          or(
            // Match firstName (case-insensitive, exact)
            sql`LOWER(${users.firstName}) = ${handle}`,
            // Match lastName (case-insensitive, exact)
            sql`LOWER(${users.lastName}) = ${handle}`,
            // Match email username (part before @, case-insensitive, exact)
            sql`LOWER(SPLIT_PART(${users.email}, '@', 1)) = ${handle}`,
            // Match normalized firstName (ignoring punctuation, lowercased)
            sql`LOWER(REGEXP_REPLACE(${users.firstName}, '[^a-zA-Z0-9]', '', 'g')) = LOWER(REGEXP_REPLACE(${handle}, '[^a-zA-Z0-9]', '', 'g'))`,
            // Match normalized lastName (ignoring punctuation, lowercased)
            sql`LOWER(REGEXP_REPLACE(${users.lastName}, '[^a-zA-Z0-9]', '', 'g')) = LOWER(REGEXP_REPLACE(${handle}, '[^a-zA-Z0-9]', '', 'g'))`
          )
        );

      // Limit to prevent abuse: max 5 users per mention token
      const limitedUsers = mentionedUsers.slice(0, 5);

      // Create notification for each mentioned user (except the post author and already notified)
      for (const mentionedUser of limitedUsers) {
        // Skip self-mentions
        if (mentionedUser.id === postAuthorId) continue;
        // Skip if already notified (prevents duplicate notifications)
        if (notifiedUserIds.has(mentionedUser.id)) continue;

        await this.createNotification({
          userId: mentionedUser.id,
          type: "forum_mention",
          title: "You were mentioned",
          message: `${authorName} mentioned you in "${thread.title}"`,
          link: `/forum/thread/${threadId}#post-${postId}`,
          isRead: false,
          metadata: { threadId, postId, authorId: postAuthorId },
        });

        notifiedUserIds.add(mentionedUser.id);
      }
    }
  }

  async searchUsersForMentions(query: string): Promise<
    Array<{
      id: number;
      firstName: string | null;
      lastName: string | null;
      email: string;
    }>
  > {
    const searchTerm = query.toLowerCase().trim();

    // If no query, return all users (limited to 10 for performance)
    if (!searchTerm) {
      const results = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .orderBy(sql`COALESCE(${users.firstName}, ${users.email})`)
        .limit(10);

      return results;
    }

    // Search users by firstName, lastName, or email username
    // Limit to 10 results for performance
    const results = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(
        or(
          // Match firstName (case-insensitive, starts with)
          sql`LOWER(${users.firstName}) LIKE ${searchTerm + "%"}`,
          // Match lastName (case-insensitive, starts with)
          sql`LOWER(${users.lastName}) LIKE ${searchTerm + "%"}`,
          // Match email username (part before @, case-insensitive, starts with)
          sql`LOWER(SPLIT_PART(${users.email}, '@', 1)) LIKE ${
            searchTerm + "%"
          }`,
          // Match full name (case-insensitive, starts with)
          sql`LOWER(${users.firstName} || ' ' || ${users.lastName}) LIKE ${
            searchTerm + "%"
          }`
        )
      )
      .limit(10);

    return results;
  }

  async getRecentForumActivity(limit: number = 10): Promise<any[]> {
    // Get recent threads (new posts)
    const recentThreads = await db
      .select({
        id: forumThreads.id,
        type: sql<string>`'thread'`,
        title: forumThreads.title,
        userId: forumThreads.userId,
        userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        userInitials: sql<string>`COALESCE(SUBSTRING(${users.firstName}, 1, 1) || SUBSTRING(${users.lastName}, 1, 1), SUBSTRING(${users.email}, 1, 2))`,
        categoryName: forumCategories.name,
        categorySlug: forumCategories.slug,
        createdAt: forumThreads.createdAt,
      })
      .from(forumThreads)
      .leftJoin(users, eq(forumThreads.userId, users.id))
      .leftJoin(
        forumCategories,
        eq(forumThreads.categoryId, forumCategories.id)
      )
      .orderBy(desc(forumThreads.createdAt))
      .limit(limit);

    // Get recent posts (replies)
    const recentPosts = await db
      .select({
        id: forumPosts.id,
        type: sql<string>`'post'`,
        title: forumThreads.title,
        userId: forumPosts.userId,
        userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        userInitials: sql<string>`COALESCE(SUBSTRING(${users.firstName}, 1, 1) || SUBSTRING(${users.lastName}, 1, 1), SUBSTRING(${users.email}, 1, 2))`,
        categoryName: forumCategories.name,
        categorySlug: forumCategories.slug,
        createdAt: forumPosts.createdAt,
        threadId: forumPosts.threadId,
      })
      .from(forumPosts)
      .leftJoin(forumThreads, eq(forumPosts.threadId, forumThreads.id))
      .leftJoin(users, eq(forumPosts.userId, users.id))
      .leftJoin(
        forumCategories,
        eq(forumThreads.categoryId, forumCategories.id)
      )
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit);

    // Combine and sort by most recent
    const combined = [...recentThreads, ...recentPosts]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);

    return combined;
  }

  // Weekly Accountability Threads
  async getActiveAccountabilityThread(): Promise<
    WeeklyAccountabilityThread | undefined
  > {
    const [thread] = await db
      .select()
      .from(weeklyAccountabilityThreads)
      .where(eq(weeklyAccountabilityThreads.isActive, true))
      .orderBy(desc(weeklyAccountabilityThreads.createdAt))
      .limit(1);
    return thread || undefined;
  }

  async createWeeklyAccountabilityThread(
    threadId: number,
    weekStartDate: Date,
    weekEndDate: Date
  ): Promise<WeeklyAccountabilityThread> {
    const [thread] = await db
      .insert(weeklyAccountabilityThreads)
      .values({
        threadId,
        weekStartDate,
        weekEndDate,
        isActive: true,
      })
      .returning();
    return thread;
  }

  async markPreviousThreadsInactive(): Promise<void> {
    await db
      .update(weeklyAccountabilityThreads)
      .set({ isActive: false })
      .where(eq(weeklyAccountabilityThreads.isActive, true));
  }

  async getUserParticipation(
    weeklyThreadId: number,
    userId: number
  ): Promise<AccountabilityThreadParticipation | undefined> {
    const [participation] = await db
      .select()
      .from(accountabilityThreadParticipation)
      .where(
        and(
          eq(accountabilityThreadParticipation.weeklyThreadId, weeklyThreadId),
          eq(accountabilityThreadParticipation.userId, userId)
        )
      );
    return participation || undefined;
  }

  async markUserAsParticipated(
    weeklyThreadId: number,
    userId: number
  ): Promise<AccountabilityThreadParticipation> {
    // Try to update existing record first
    const existing = await this.getUserParticipation(weeklyThreadId, userId);

    if (existing) {
      const [updated] = await db
        .update(accountabilityThreadParticipation)
        .set({
          hasParticipated: true,
          participatedAt: new Date(),
        })
        .where(eq(accountabilityThreadParticipation.id, existing.id))
        .returning();
      return updated;
    }

    // Otherwise create new record
    const [participation] = await db
      .insert(accountabilityThreadParticipation)
      .values({
        weeklyThreadId,
        userId,
        hasParticipated: true,
        participatedAt: new Date(),
      })
      .returning();
    return participation;
  }

  // Content Management - Training Videos
  async getAllTrainingVideos(): Promise<TrainingVideo[]> {
    return await db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.isActive, true))
      .orderBy(trainingVideos.orderIndex, trainingVideos.createdAt);
  }

  async getTrainingVideosBySection(
    sectionKey: string
  ): Promise<TrainingVideo[]> {
    return await db
      .select()
      .from(trainingVideos)
      .where(
        and(
          eq(trainingVideos.sectionKey, sectionKey),
          eq(trainingVideos.isActive, true)
        )
      )
      .orderBy(trainingVideos.orderIndex);
  }

  async getTrainingVideo(id: number): Promise<TrainingVideo | undefined> {
    const [video] = await db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.id, id));
    return video || undefined;
  }

  async createTrainingVideo(
    video: InsertTrainingVideo
  ): Promise<TrainingVideo> {
    const [newVideo] = await db
      .insert(trainingVideos)
      .values(video)
      .returning();
    return newVideo;
  }

  async updateTrainingVideo(
    id: number,
    updates: Partial<TrainingVideo>
  ): Promise<TrainingVideo | undefined> {
    const [updated] = await db
      .update(trainingVideos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trainingVideos.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTrainingVideo(id: number): Promise<boolean> {
    const result = await db
      .update(trainingVideos)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(trainingVideos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Content Management - Platform Resources
  async getAllPlatformResources(): Promise<PlatformResource[]> {
    return await db
      .select()
      .from(platformResources)
      .where(eq(platformResources.isActive, true))
      .orderBy(desc(platformResources.createdAt));
  }

  async getPlatformResourcesBySection(
    sectionKey: string
  ): Promise<PlatformResource[]> {
    return await db
      .select()
      .from(platformResources)
      .where(
        and(
          eq(platformResources.sectionKey, sectionKey),
          eq(platformResources.isActive, true)
        )
      )
      .orderBy(desc(platformResources.createdAt));
  }

  async getPlatformResource(id: number): Promise<PlatformResource | undefined> {
    const [resource] = await db
      .select()
      .from(platformResources)
      .where(eq(platformResources.id, id));
    return resource || undefined;
  }

  async createPlatformResource(
    resource: InsertPlatformResource
  ): Promise<PlatformResource> {
    const [newResource] = await db
      .insert(platformResources)
      .values(resource)
      .returning();
    return newResource;
  }

  async updatePlatformResource(
    id: number,
    updates: Partial<PlatformResource>
  ): Promise<PlatformResource | undefined> {
    const [updated] = await db
      .update(platformResources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(platformResources.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePlatformResource(id: number): Promise<boolean> {
    const result = await db
      .update(platformResources)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(platformResources.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Content Management - Checklist Step Definitions
  async getAllChecklistStepDefinitions(): Promise<ChecklistStepDefinition[]> {
    return await db
      .select()
      .from(checklistStepDefinitions)
      .where(eq(checklistStepDefinitions.isActive, true))
      .orderBy(checklistStepDefinitions.sectionTitle);
  }

  async getChecklistStepDefinition(
    sectionKey: string
  ): Promise<ChecklistStepDefinition | undefined> {
    const [definition] = await db
      .select()
      .from(checklistStepDefinitions)
      .where(eq(checklistStepDefinitions.sectionKey, sectionKey));
    return definition || undefined;
  }

  async createChecklistStepDefinition(
    definition: InsertChecklistStepDefinition
  ): Promise<ChecklistStepDefinition> {
    const [newDefinition] = await db
      .insert(checklistStepDefinitions)
      .values(definition)
      .returning();
    return newDefinition;
  }

  async updateChecklistStepDefinition(
    id: number,
    updates: Partial<ChecklistStepDefinition>
  ): Promise<ChecklistStepDefinition | undefined> {
    const [updated] = await db
      .update(checklistStepDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(checklistStepDefinitions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteChecklistStepDefinition(id: number): Promise<boolean> {
    const result = await db
      .update(checklistStepDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(checklistStepDefinitions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
export async function getWorkbookResponsesByUserAndStep(
  userId: number,
  step: number
): Promise<WorkbookResponse[]> {
  try {
    const responses = await db
      .select()
      .from(workbookResponses)
      .where(
        and(
          eq(workbookResponses.userId, userId),
          eq(workbookResponses.stepNumber, step)
        )
      )
      .orderBy(workbookResponses.createdAt);

    console.log(
      `[DEBUG] User ${userId} Step ${step} responses:`,
      responses.length,
      "found"
    );
    console.log(
      `[DEBUG] Response questions:`,
      responses.map((r) => r.questionKey)
    );

    return responses;
  } catch (error) {
    console.error("Error fetching workbook responses:", error);
    throw error;
  }
}
