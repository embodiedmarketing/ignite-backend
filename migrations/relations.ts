import { relations } from "drizzle-orm/relations";
import { userOffers, coreOfferCoachingSessions, users, accountabilityThreadParticipation, weeklyAccountabilityThreads, checklistItems, forumThreads, forumPosts, liveLaunches, emailTracking, forumCategories, implementationCheckboxes, liveLaunchFunnelMetrics, liveLaunchOptimizationSuggestions, liveLaunchOrganicMetrics, interviewProcessingJobs, launchRegistrationFunnelData, notifications, sectionCompletions, passwordResetTokens, salesPages, userLogins, workbookResponses, userOfferOutlines } from "./schema";

export const coreOfferCoachingSessionsRelations = relations(coreOfferCoachingSessions, ({one}) => ({
	userOffer: one(userOffers, {
		fields: [coreOfferCoachingSessions.offerId],
		references: [userOffers.id]
	}),
}));

export const userOffersRelations = relations(userOffers, ({one, many}) => ({
	coreOfferCoachingSessions: many(coreOfferCoachingSessions),
	workbookResponses: many(workbookResponses),
	user: one(users, {
		fields: [userOffers.userId],
		references: [users.id]
	}),
	userOfferOutlines: many(userOfferOutlines),
}));

export const accountabilityThreadParticipationRelations = relations(accountabilityThreadParticipation, ({one}) => ({
	user: one(users, {
		fields: [accountabilityThreadParticipation.userId],
		references: [users.id]
	}),
	weeklyAccountabilityThread: one(weeklyAccountabilityThreads, {
		fields: [accountabilityThreadParticipation.weeklyThreadId],
		references: [weeklyAccountabilityThreads.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accountabilityThreadParticipations: many(accountabilityThreadParticipation),
	checklistItems: many(checklistItems),
	forumPosts: many(forumPosts),
	forumThreads: many(forumThreads),
	implementationCheckboxes: many(implementationCheckboxes),
	liveLaunchFunnelMetrics: many(liveLaunchFunnelMetrics),
	liveLaunchOptimizationSuggestions: many(liveLaunchOptimizationSuggestions),
	liveLaunchOrganicMetrics: many(liveLaunchOrganicMetrics),
	interviewProcessingJobs: many(interviewProcessingJobs),
	liveLaunches: many(liveLaunches),
	launchRegistrationFunnelData: many(launchRegistrationFunnelData),
	notifications: many(notifications),
	sectionCompletions: many(sectionCompletions),
	passwordResetTokens: many(passwordResetTokens),
	salesPages: many(salesPages),
	userLogins: many(userLogins),
	userOffers: many(userOffers),
}));

export const weeklyAccountabilityThreadsRelations = relations(weeklyAccountabilityThreads, ({one, many}) => ({
	accountabilityThreadParticipations: many(accountabilityThreadParticipation),
	forumThread: one(forumThreads, {
		fields: [weeklyAccountabilityThreads.threadId],
		references: [forumThreads.id]
	}),
}));

export const checklistItemsRelations = relations(checklistItems, ({one}) => ({
	user: one(users, {
		fields: [checklistItems.userId],
		references: [users.id]
	}),
}));

export const forumPostsRelations = relations(forumPosts, ({one}) => ({
	forumThread: one(forumThreads, {
		fields: [forumPosts.threadId],
		references: [forumThreads.id]
	}),
	user: one(users, {
		fields: [forumPosts.userId],
		references: [users.id]
	}),
}));

export const forumThreadsRelations = relations(forumThreads, ({one, many}) => ({
	forumPosts: many(forumPosts),
	forumCategory: one(forumCategories, {
		fields: [forumThreads.categoryId],
		references: [forumCategories.id]
	}),
	user: one(users, {
		fields: [forumThreads.userId],
		references: [users.id]
	}),
	weeklyAccountabilityThreads: many(weeklyAccountabilityThreads),
}));

export const emailTrackingRelations = relations(emailTracking, ({one}) => ({
	liveLaunch: one(liveLaunches, {
		fields: [emailTracking.liveLaunchId],
		references: [liveLaunches.id]
	}),
}));

export const liveLaunchesRelations = relations(liveLaunches, ({one, many}) => ({
	emailTrackings: many(emailTracking),
	liveLaunchFunnelMetrics: many(liveLaunchFunnelMetrics),
	liveLaunchOptimizationSuggestions: many(liveLaunchOptimizationSuggestions),
	liveLaunchOrganicMetrics: many(liveLaunchOrganicMetrics),
	user: one(users, {
		fields: [liveLaunches.userId],
		references: [users.id]
	}),
}));

export const forumCategoriesRelations = relations(forumCategories, ({many}) => ({
	forumThreads: many(forumThreads),
}));

export const implementationCheckboxesRelations = relations(implementationCheckboxes, ({one}) => ({
	user: one(users, {
		fields: [implementationCheckboxes.userId],
		references: [users.id]
	}),
}));

export const liveLaunchFunnelMetricsRelations = relations(liveLaunchFunnelMetrics, ({one}) => ({
	liveLaunch: one(liveLaunches, {
		fields: [liveLaunchFunnelMetrics.liveLaunchId],
		references: [liveLaunches.id]
	}),
	user: one(users, {
		fields: [liveLaunchFunnelMetrics.userId],
		references: [users.id]
	}),
}));

export const liveLaunchOptimizationSuggestionsRelations = relations(liveLaunchOptimizationSuggestions, ({one}) => ({
	liveLaunch: one(liveLaunches, {
		fields: [liveLaunchOptimizationSuggestions.liveLaunchId],
		references: [liveLaunches.id]
	}),
	user: one(users, {
		fields: [liveLaunchOptimizationSuggestions.userId],
		references: [users.id]
	}),
}));

export const liveLaunchOrganicMetricsRelations = relations(liveLaunchOrganicMetrics, ({one}) => ({
	liveLaunch: one(liveLaunches, {
		fields: [liveLaunchOrganicMetrics.liveLaunchId],
		references: [liveLaunches.id]
	}),
	user: one(users, {
		fields: [liveLaunchOrganicMetrics.userId],
		references: [users.id]
	}),
}));

export const interviewProcessingJobsRelations = relations(interviewProcessingJobs, ({one}) => ({
	user: one(users, {
		fields: [interviewProcessingJobs.userId],
		references: [users.id]
	}),
}));

export const launchRegistrationFunnelDataRelations = relations(launchRegistrationFunnelData, ({one}) => ({
	user: one(users, {
		fields: [launchRegistrationFunnelData.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const sectionCompletionsRelations = relations(sectionCompletions, ({one}) => ({
	user: one(users, {
		fields: [sectionCompletions.userId],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const salesPagesRelations = relations(salesPages, ({one}) => ({
	user: one(users, {
		fields: [salesPages.userId],
		references: [users.id]
	}),
}));

export const userLoginsRelations = relations(userLogins, ({one}) => ({
	user: one(users, {
		fields: [userLogins.userId],
		references: [users.id]
	}),
}));

export const workbookResponsesRelations = relations(workbookResponses, ({one}) => ({
	userOffer: one(userOffers, {
		fields: [workbookResponses.offerId],
		references: [userOffers.id]
	}),
}));

export const userOfferOutlinesRelations = relations(userOfferOutlines, ({one}) => ({
	userOffer: one(userOffers, {
		fields: [userOfferOutlines.offerId],
		references: [userOffers.id]
	}),
}));