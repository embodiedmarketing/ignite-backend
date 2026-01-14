import type { Request, Response } from "express";
import { storage } from "../services/storage.service";
import { db } from "../config/db";
import { sql, eq, desc } from "drizzle-orm";
import {
  users,
  messagingStrategies,
  userOfferOutlines,
  salesPageDrafts,
  igniteDocuments,
  userLogins,
  sectionCompletions,
  workbookResponses,
  funnelCopies,
  generatedContentStrategies,
  videoScriptGeneratorState,
  forumThreads,
  forumPosts,
} from "../models";
import { loginUserSchema } from "../models";
import { hashPassword, verifyPassword } from "../services/auth.service";
import { insertTrainingVideoSchema, insertPlatformResourceSchema, insertChecklistStepDefinitionSchema } from "../models";
import { z } from "zod";

/**
 * Admin login
 */
export async function adminLogin(req: Request, res: Response) {
  try {
    const validatedData = loginUserSchema.parse(req.body);

    const user = await storage.getUserByEmail(validatedData.email);
    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.passwordHash
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(200).json({ 
        message: "Your account has been deactivated. Please contact support." , user: user
      });
    }

    await storage.updateUser(user.id, { lastLoginAt: new Date() });

    await storage.recordUserLogin({
      userId: user.id,
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    });

    req.session!.userId = user.id;

    res.json({
      message: "Admin login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: true,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
}

/**
 * Get all users for admin dashboard
 */
// export async function getAdminUsers(req: Request, res: Response) {
//   try {
//     const usersList = await db
//       .select({
//         id: sql`users.id`,
//         email: sql`users.email`,
//         firstName: sql`users.first_name`,
//         lastName: sql`users.last_name`,
//         isActive: sql`users.is_active`,
//         businessName: sql`users.business_name`,
//         subscriptionStatus: sql`users.subscription_status`,
//         lastLoginAt: sql`users.last_login_at`,
//         createdAt: sql`users.created_at`,
//         completedSections: sql`COUNT(DISTINCT section_completions.id)::int`,
//       })
//       .from(sql`users`)
//       .leftJoin(
//         sql`section_completions`,
//         sql`section_completions.user_id = users.id`
//       )
//       // .where(sql`users.is_admin = false`)
//       .groupBy(sql`users.id`)
//       .orderBy(sql`users.created_at DESC`);

//     res.json(usersList);
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ message: "Failed to fetch users" });
//   }
// }


export async function getAdminUsers(req: Request, res: Response) {
  try {
    const usersList = await db
      .select({
        id: sql`users.id`,
        email: sql`users.email`,
        firstName: sql`users.first_name`,
        lastName: sql`users.last_name`,
        isActive: sql`users.is_active`,
        isAdmin: sql`users.is_admin`,
        businessName: sql`users.business_name`,
        subscriptionStatus: sql`users.subscription_status`,
        lastLoginAt: sql`users.last_login_at`,
        createdAt: sql`users.created_at`,
        completedSections: sql`COUNT(DISTINCT section_completions.id)::int`,
      })
      .from(sql`users`)
      .leftJoin(
        sql`section_completions`,
        sql`section_completions.user_id = users.id`
      )
      .groupBy(sql`users.id`)
      .orderBy(sql`users.created_at DESC`);

    res.json(usersList);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}



export async function toggleUserActive(req: Request, res: Response) {
  try {

    console.log(`[DEBUG] Toggling user active:`, { userId: req.params.userId },req.body);
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await storage.updateUser(userId, { 
      isActive: req.body.isActive, 
    });
    

console.log(`[DEBUG] Updated user:`, { updatedUser });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "User Status Updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error toggling user active:", error);
    res.status(500).json({ message: "Failed to toggle user active" });
  }
}

/**
 * Toggle user admin status
 */
export async function toggleUserAdmin(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Validate payload
    if (typeof req.body.isAdmin !== "boolean") {
      return res.status(400).json({ message: "isAdmin must be a boolean value" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await storage.updateUser(userId, { 
      isAdmin: req.body.isAdmin, 
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "User admin status updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error toggling user admin:", error);
    res.status(500).json({ message: "Failed to update user admin status" });
  }
}


/**
 * Get detailed user profile for admin
 */
export async function getAdminUserDetails(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Get user basic info
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userList || userList.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userList[0];

    // Get user's login history
    const logins = await db
      .select({
        id: userLogins.id,
        loginAt: userLogins.loginAt,
      })
      .from(userLogins)
      .where(eq(userLogins.userId, userId))
      .orderBy(desc(userLogins.loginAt))
      .limit(100);

    // Get user's documents
    const documents = await db
      .select({
        id: igniteDocuments.id,
        docType: igniteDocuments.docType,
        title: igniteDocuments.title,
        createdAt: igniteDocuments.createdAt,
      })
      .from(igniteDocuments)
      .where(eq(igniteDocuments.userId, userId))
      .orderBy(desc(igniteDocuments.createdAt));

    // Get user's created threads
    const createdThreads = await db
      .select({
        id: forumThreads.id,
        title: forumThreads.title,
        categoryId: forumThreads.categoryId,
        replyCount: forumThreads.replyCount,
        createdAt: forumThreads.createdAt,
      })
      .from(forumThreads)
      .where(eq(forumThreads.userId, userId))
      .orderBy(desc(forumThreads.createdAt));

    // Get user's posts/comments
    const posts = await db
      .select({
        id: forumPosts.id,
        threadId: forumPosts.threadId,
        threadTitle: forumThreads.title,
        body: forumPosts.body,
        createdAt: forumPosts.createdAt,
      })
      .from(forumPosts)
      .innerJoin(forumThreads, eq(forumPosts.threadId, forumThreads.id))
      .where(eq(forumPosts.userId, userId))
      .orderBy(desc(forumPosts.createdAt));

    // Get user's completed sections
    const completedSections = await db
      .select({
        id: sectionCompletions.id,
        stepNumber: sectionCompletions.stepNumber,
        sectionTitle: sectionCompletions.sectionTitle,
        offerNumber: sectionCompletions.offerNumber,
        completedAt: sectionCompletions.completedAt,
      })
      .from(sectionCompletions)
      .where(eq(sectionCompletions.userId, userId))
      .orderBy(desc(sectionCompletions.completedAt));

    res.json({
      user,
      logins,
      documents,
      createdThreads,
      posts,
      completedSections,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
}

/**
 * Get all messaging strategies for admin
 */
export async function getAdminMessagingStrategies(req: Request, res: Response) {
  try {
    const strategies = await db
      .select({
        id: messagingStrategies.id,
        userId: messagingStrategies.userId,
        title: messagingStrategies.title,
        content: messagingStrategies.content,
        version: messagingStrategies.version,
        isActive: messagingStrategies.isActive,
        sourceData: messagingStrategies.sourceData,
        completionPercentage: messagingStrategies.completionPercentage,
        missingInformation: messagingStrategies.missingInformation,
        recommendations: messagingStrategies.recommendations,
        createdAt: messagingStrategies.createdAt,
        updatedAt: messagingStrategies.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(messagingStrategies)
      .leftJoin(users, eq(messagingStrategies.userId, users.id))
      .orderBy(desc(messagingStrategies.createdAt));

    res.json(strategies);
  } catch (error) {
    console.error("Error fetching messaging strategies:", error);
    res.status(500).json({ message: "Failed to fetch messaging strategies" });
  }
}

/**
 * Get single messaging strategy by ID for admin
 */
export async function getAdminMessagingStrategy(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid strategy ID" });
    }

    const result = await db
      .select({
        id: messagingStrategies.id,
        userId: messagingStrategies.userId,
        title: messagingStrategies.title,
        content: messagingStrategies.content,
        version: messagingStrategies.version,
        isActive: messagingStrategies.isActive,
        sourceData: messagingStrategies.sourceData,
        completionPercentage: messagingStrategies.completionPercentage,
        missingInformation: messagingStrategies.missingInformation,
        recommendations: messagingStrategies.recommendations,
        createdAt: messagingStrategies.createdAt,
        updatedAt: messagingStrategies.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(messagingStrategies)
      .leftJoin(users, eq(messagingStrategies.userId, users.id))
      .where(eq(messagingStrategies.id, id))
      .limit(1);

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "Messaging strategy not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching messaging strategy:", error);
    res.status(500).json({ message: "Failed to fetch messaging strategy" });
  }
}

/**
 * Get single core offer outline by ID for admin
 */
export async function getAdminOfferOutline(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid outline ID" });
    }

    const result = await db
      .select({
        id: userOfferOutlines.id,
        userId: userOfferOutlines.userId,
        offerId: userOfferOutlines.offerId,
        offerNumber: userOfferOutlines.offerNumber,
        title: userOfferOutlines.title,
        content: userOfferOutlines.content,
        version: userOfferOutlines.version,
        isActive: userOfferOutlines.isActive,
        sourceData: userOfferOutlines.sourceData,
        completionPercentage: userOfferOutlines.completionPercentage,
        missingInformation: userOfferOutlines.missingInformation,
        recommendations: userOfferOutlines.recommendations,
        createdAt: userOfferOutlines.createdAt,
        updatedAt: userOfferOutlines.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(userOfferOutlines)
      .leftJoin(users, eq(userOfferOutlines.userId, users.id))
      .where(eq(userOfferOutlines.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: "Offer outline not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching offer outline:", error);
    res.status(500).json({ message: "Failed to fetch offer outline" });
  }
}

/**
 * Get single sales page draft by ID for admin
 */
export async function getAdminSalesPage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid sales page ID" });
    }

    const result = await db
      .select({
        id: salesPageDrafts.id,
        userId: salesPageDrafts.userId,
        title: salesPageDrafts.title,
        content: salesPageDrafts.content,
        draftNumber: salesPageDrafts.draftNumber,
        isActive: salesPageDrafts.isActive,
        sourceData: salesPageDrafts.sourceData,
        inputs: salesPageDrafts.inputs,
        completeness: salesPageDrafts.completeness,
        missingElements: salesPageDrafts.missingElements,
        status: salesPageDrafts.status,
        createdAt: salesPageDrafts.createdAt,
        updatedAt: salesPageDrafts.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(salesPageDrafts)
      .leftJoin(users, eq(salesPageDrafts.userId, users.id))
      .where(eq(salesPageDrafts.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: "Sales page not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching sales page:", error);
    res.status(500).json({ message: "Failed to fetch sales page" });
  }
}

/**
 * Get single IGNITE document by ID for admin
 */
export async function getAdminIgniteDoc(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const result = await db
      .select({
        id: igniteDocuments.id,
        userId: igniteDocuments.userId,
        docType: igniteDocuments.docType,
        title: igniteDocuments.title,
        contentMarkdown: igniteDocuments.contentMarkdown,
        sourcePayload: igniteDocuments.sourcePayload,
        createdAt: igniteDocuments.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(igniteDocuments)
      .leftJoin(users, eq(igniteDocuments.userId, users.id))
      .where(eq(igniteDocuments.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: "IGNITE document not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching IGNITE document:", error);
    res.status(500).json({ message: "Failed to fetch IGNITE document" });
  }
}

/**
 * Get all user logins for admin analytics
 */
export async function getAdminLoginHistory(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logins = await storage.getAllUserLogins(limit);

    // Join with user data for display
    const loginsWithUsers = await Promise.all(
      logins.map(async (login) => {
        const user = await storage.getUser(login.userId);
        return {
          ...login,
          userEmail: user?.email,
          userFirstName: user?.firstName,
          userLastName: user?.lastName,
        };
      })
    );

    res.json(loginsWithUsers);
  } catch (error) {
    console.error("Error fetching login history:", error);
    res.status(500).json({ message: "Failed to fetch login history" });
  }
}

/**
 * Get login history for specific user
 */
export async function getUserLoginHistory(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const logins = await storage.getUserLoginHistory(userId, limit);

    res.json(logins);
  } catch (error) {
    console.error("Error fetching user login history:", error);
    res.status(500).json({ message: "Failed to fetch user login history" });
  }
}

/**
 * Get usage statistics for admin analytics
 */
export async function getAdminUsageStats(req: Request, res: Response) {
  try {
    // Get overall usage statistics
    const stats = await db
      .select({
        totalUsers: sql`COUNT(DISTINCT users.id)::int`,
        activeUsers: sql`COUNT(DISTINCT CASE WHEN users.subscription_status = 'active' THEN users.id END)::int`,
        totalCompletions: sql`COUNT(DISTINCT section_completions.id)::int`,
        totalResponses: sql`COUNT(DISTINCT workbook_responses.id)::int`,
        totalStrategies: sql`COUNT(DISTINCT messaging_strategies.id)::int`,
        totalOfferOutlines: sql`COUNT(DISTINCT user_offer_outlines.id)::int`,
        totalLogins: sql`COUNT(DISTINCT user_logins.id)::int`,
        loginsLast7Days: sql`COUNT(DISTINCT CASE WHEN user_logins.login_at > NOW() - INTERVAL '7 days' THEN user_logins.id END)::int`,
        loginsLast30Days: sql`COUNT(DISTINCT CASE WHEN user_logins.login_at > NOW() - INTERVAL '30 days' THEN user_logins.id END)::int`,
      })
      .from(sql`users`)
      .leftJoin(
        sql`section_completions`,
        sql`section_completions.user_id = users.id`
      )
      .leftJoin(
        sql`workbook_responses`,
        sql`workbook_responses.user_id = users.id`
      )
      .leftJoin(
        sql`messaging_strategies`,
        sql`messaging_strategies.user_id = users.id`
      )
      .leftJoin(
        sql`user_offer_outlines`,
        sql`user_offer_outlines.user_id = users.id`
      )
      .leftJoin(sql`user_logins`, sql`user_logins.user_id = users.id`)
      .where(sql`users.is_admin = false`);

    // Get user-level completion statistics
    const userCompletionStats = await db
      .select({
        userId: sql`users.id`,
        userEmail: sql`users.email`,
        firstName: sql`users.first_name`,
        lastName: sql`users.last_name`,
        completedSections: sql`COUNT(DISTINCT section_completions.id)::int`,
        totalResponses: sql`COUNT(DISTINCT workbook_responses.id)::int`,
        hasMessagingStrategy: sql`COUNT(DISTINCT messaging_strategies.id) > 0`,
        hasOfferOutline: sql`COUNT(DISTINCT user_offer_outlines.id) > 0`,
        loginCount: sql`COUNT(DISTINCT user_logins.id)::int`,
        lastLogin: sql`MAX(user_logins.login_at)`,
      })
      .from(sql`users`)
      .leftJoin(
        sql`section_completions`,
        sql`section_completions.user_id = users.id`
      )
      .leftJoin(
        sql`workbook_responses`,
        sql`workbook_responses.user_id = users.id`
      )
      .leftJoin(
        sql`messaging_strategies`,
        sql`messaging_strategies.user_id = users.id`
      )
      .leftJoin(
        sql`user_offer_outlines`,
        sql`user_offer_outlines.user_id = users.id`
      )
      .leftJoin(sql`user_logins`, sql`user_logins.user_id = users.id`)
      .where(sql`users.is_admin = false`)
      .groupBy(sql`users.id`)
      .orderBy(sql`users.created_at DESC`);

    // Get detailed section completions for each user
    const sectionDetails = await db
      .select({
        userId: sectionCompletions.userId,
        sectionTitle: sectionCompletions.sectionTitle,
        stepNumber: sectionCompletions.stepNumber,
        completedAt: sectionCompletions.completedAt,
      })
      .from(sectionCompletions)
      .innerJoin(users, eq(sectionCompletions.userId, users.id))
      .where(eq(users.isAdmin, false))
      .orderBy(desc(sectionCompletions.completedAt));

    // Get all messaging strategies for all users
    const allMessagingStrategies = await db
      .select({
        id: messagingStrategies.id,
        userId: messagingStrategies.userId,
        title: messagingStrategies.title,
        version: messagingStrategies.version,
        isActive: messagingStrategies.isActive,
        createdAt: messagingStrategies.createdAt,
      })
      .from(messagingStrategies)
      .innerJoin(users, eq(messagingStrategies.userId, users.id))
      .where(eq(users.isAdmin, false))
      .orderBy(desc(messagingStrategies.createdAt));

    // Get all offer outlines for all users
    const allOfferOutlines = await db
      .select({
        id: userOfferOutlines.id,
        userId: userOfferOutlines.userId,
        title: userOfferOutlines.title,
        offerNumber: userOfferOutlines.offerNumber,
        isActive: userOfferOutlines.isActive,
        createdAt: userOfferOutlines.createdAt,
      })
      .from(userOfferOutlines)
      .innerJoin(users, eq(userOfferOutlines.userId, users.id))
      .where(eq(users.isAdmin, false))
      .orderBy(desc(userOfferOutlines.createdAt));

    // Get all sales page drafts for all users
    const allSalesPages = await db
      .select({
        id: salesPageDrafts.id,
        userId: salesPageDrafts.userId,
        draftNumber: salesPageDrafts.draftNumber,
        isActive: salesPageDrafts.isActive,
        createdAt: salesPageDrafts.createdAt,
      })
      .from(salesPageDrafts)
      .innerJoin(users, eq(salesPageDrafts.userId, users.id))
      .where(eq(users.isAdmin, false))
      .orderBy(desc(salesPageDrafts.createdAt));

    // Get all IGNITE docs for all users
    const allIgniteDocs = await db
      .select({
        id: igniteDocuments.id,
        userId: igniteDocuments.userId,
        title: igniteDocuments.title,
        docType: igniteDocuments.docType,
        createdAt: igniteDocuments.createdAt,
      })
      .from(igniteDocuments)
      .innerJoin(users, eq(igniteDocuments.userId, users.id))
      .where(eq(users.isAdmin, false))
      .orderBy(desc(igniteDocuments.createdAt));

    // Map section details and documents to users
    const userStatsWithSections = userCompletionStats.map((user) => ({
      ...user,
      completedSectionsList: sectionDetails
        .filter((section) => section.userId === user.userId)
        .map((section) => ({
          title: section.sectionTitle,
          stepNumber: section.stepNumber,
          completedAt: section.completedAt,
        })),
      messagingStrategies: allMessagingStrategies
        .filter((strategy) => strategy.userId === user.userId)
        .map((strategy) => ({
          id: strategy.id,
          title: strategy.title,
          version: strategy.version,
          isActive: strategy.isActive,
          createdAt: strategy.createdAt,
        })),
      offerOutlines: allOfferOutlines
        .filter((outline) => outline.userId === user.userId)
        .map((outline) => ({
          id: outline.id,
          title: outline.title,
          offerNumber: outline.offerNumber,
          isActive: outline.isActive,
          createdAt: outline.createdAt,
        })),
      salesPages: allSalesPages
        .filter((page) => page.userId === user.userId)
        .map((page) => ({
          id: page.id,
          draftNumber: page.draftNumber,
          isActive: page.isActive,
          createdAt: page.createdAt,
        })),
      igniteDocs: allIgniteDocs
        .filter((doc) => doc.userId === user.userId)
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          docType: doc.docType,
          createdAt: doc.createdAt,
        })),
    }));

    res.json({
      overall: stats[0],
      userStats: userStatsWithSections,
    });
  } catch (error) {
    console.error("Error fetching usage statistics:", error);
    res.status(500).json({ message: "Failed to fetch usage statistics" });
  }
}

/**
 * Get detailed user progress by module
 */
export async function getUserProgress(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Get all user workbook responses grouped by step
    const workbookProgress = await db
      .select({
        stepNumber: workbookResponses.stepNumber,
        questionKey: workbookResponses.questionKey,
        responseText: workbookResponses.responseText,
        updatedAt: workbookResponses.updatedAt,
      })
      .from(workbookResponses)
      .where(eq(workbookResponses.userId, userId))
      .orderBy(workbookResponses.stepNumber, workbookResponses.questionKey);

    // Get messaging strategies
    const strategies = await db
      .select()
      .from(messagingStrategies)
      .where(eq(messagingStrategies.userId, userId))
      .orderBy(desc(messagingStrategies.createdAt));

    // Get offer outlines
    const offers = await db
      .select()
      .from(userOfferOutlines)
      .where(eq(userOfferOutlines.userId, userId))
      .orderBy(desc(userOfferOutlines.createdAt));

    // Get funnel copy
    const funnelCopy = await db
      .select()
      .from(funnelCopies)
      .where(eq(funnelCopies.userId, userId))
      .limit(1);

    // Get content strategies
    const contentStrategies = await db
      .select()
      .from(generatedContentStrategies)
      .where(eq(generatedContentStrategies.userId, userId))
      .orderBy(desc(generatedContentStrategies.createdAt));

    // Get video script generator state
    const videoScripts = await db
      .select()
      .from(videoScriptGeneratorState)
      .where(eq(videoScriptGeneratorState.userId, userId))
      .limit(1);

    // Get live launches
    const launches = await db
      .select()
      .from(sql`live_launches`)
      .where(sql`user_id = ${userId}`)
      .orderBy(sql`created_at DESC`);

    // Get section completions
    const completions = await db
      .select()
      .from(sectionCompletions)
      .where(eq(sectionCompletions.userId, userId))
      .orderBy(desc(sectionCompletions.completedAt));

    // Get implementation checkboxes
    const checkboxes = await db.execute(
      sql`SELECT * FROM implementation_checkboxes WHERE user_id = ${userId}`
    );

    // Get user for userStats
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user-level completion statistics (matching format from getAdminUsageStats)
    const userCompletionStats = await db
      .select({
        userId: sql`users.id`,
        userEmail: sql`users.email`,
        firstName: sql`users.first_name`,
        lastName: sql`users.last_name`,
        completedSections: sql`COUNT(DISTINCT section_completions.id)::int`,
        totalResponses: sql`COUNT(DISTINCT workbook_responses.id)::int`,
        hasMessagingStrategy: sql`COUNT(DISTINCT messaging_strategies.id) > 0`,
        hasOfferOutline: sql`COUNT(DISTINCT user_offer_outlines.id) > 0`,
        loginCount: sql`COUNT(DISTINCT user_logins.id)::int`,
        lastLogin: sql`MAX(user_logins.login_at)`,
      })
      .from(sql`users`)
      .leftJoin(sql`section_completions`, sql`section_completions.user_id = users.id`)
      .leftJoin(sql`workbook_responses`, sql`workbook_responses.user_id = users.id`)
      .leftJoin(sql`messaging_strategies`, sql`messaging_strategies.user_id = users.id`)
      .leftJoin(sql`user_offer_outlines`, sql`user_offer_outlines.user_id = users.id`)
      .leftJoin(sql`user_logins`, sql`user_logins.user_id = users.id`)
      .where(sql`users.id = ${userId}`)
      .groupBy(sql`users.id`);

    // Get detailed section completions
    const sectionDetails = await db
      .select({
        userId: sectionCompletions.userId,
        sectionTitle: sectionCompletions.sectionTitle,
        stepNumber: sectionCompletions.stepNumber,
        completedAt: sectionCompletions.completedAt,
      })
      .from(sectionCompletions)
      .where(eq(sectionCompletions.userId, userId))
      .orderBy(desc(sectionCompletions.completedAt));

    // Get all messaging strategies for this user
    const allMessagingStrategies = await db
      .select({
        id: messagingStrategies.id,
        userId: messagingStrategies.userId,
        title: messagingStrategies.title,
        version: messagingStrategies.version,
        isActive: messagingStrategies.isActive,
        createdAt: messagingStrategies.createdAt,
      })
      .from(messagingStrategies)
      .where(eq(messagingStrategies.userId, userId))
      .orderBy(desc(messagingStrategies.createdAt));

    // Get all offer outlines for this user
    const allOfferOutlines = await db
      .select({
        id: userOfferOutlines.id,
        userId: userOfferOutlines.userId,
        title: userOfferOutlines.title,
        offerNumber: userOfferOutlines.offerNumber,
        isActive: userOfferOutlines.isActive,
        createdAt: userOfferOutlines.createdAt,
      })
      .from(userOfferOutlines)
      .where(eq(userOfferOutlines.userId, userId))
      .orderBy(desc(userOfferOutlines.createdAt));

    // Get all sales page drafts for this user
    const allSalesPages = await db
      .select({
        id: salesPageDrafts.id,
        userId: salesPageDrafts.userId,
        draftNumber: salesPageDrafts.draftNumber,
        isActive: salesPageDrafts.isActive,
        createdAt: salesPageDrafts.createdAt,
      })
      .from(salesPageDrafts)
      .where(eq(salesPageDrafts.userId, userId))
      .orderBy(desc(salesPageDrafts.createdAt));

    // Get all IGNITE docs for this user
    const allIgniteDocs = await db
      .select({
        id: igniteDocuments.id,
        userId: igniteDocuments.userId,
        title: igniteDocuments.title,
        docType: igniteDocuments.docType,
        createdAt: igniteDocuments.createdAt,
      })
      .from(igniteDocuments)
      .where(eq(igniteDocuments.userId, userId))
      .orderBy(desc(igniteDocuments.createdAt));

    // Build userStats in the same format as getAdminUsageStats
    const userStatsData = userCompletionStats[0];
    const userStats = userStatsData ? {
      ...userStatsData,
      completedSectionsList: sectionDetails.map((section) => ({
        title: section.sectionTitle,
        stepNumber: section.stepNumber,
        completedAt: section.completedAt,
      })),
      messagingStrategies: allMessagingStrategies.map((strategy) => ({
        id: strategy.id,
        title: strategy.title,
        version: strategy.version,
        isActive: strategy.isActive,
        createdAt: strategy.createdAt,
      })),
      offerOutlines: allOfferOutlines.map((outline) => ({
        id: outline.id,
        title: outline.title,
        offerNumber: outline.offerNumber,
        isActive: outline.isActive,
        createdAt: outline.createdAt,
      })),
      salesPages: allSalesPages.map((page) => ({
        id: page.id,
        draftNumber: page.draftNumber,
        isActive: page.isActive,
        createdAt: page.createdAt,
      })),
      igniteDocs: allIgniteDocs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        docType: doc.docType,
        createdAt: doc.createdAt,
      })),
    } : null;

    res.json({
      workbookProgress,
      strategies,
      offers,
      funnelCopy: funnelCopy[0] || null,
      contentStrategies,
      videoScripts: videoScripts[0] || null,
      liveLaunches: launches,
      sectionCompletions: completions,
      checkboxes: checkboxes.rows,
      userStats,
    });
  } catch (error) {
    console.error("Error fetching user progress:", error);
    res.status(500).json({ message: "Failed to fetch user progress" });
  }
}

/**
 * Reset user progress
 */
export async function resetUserProgress(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const { resetType } = req.body; // 'all', 'workbook', 'completions', 'strategies', 'offers'

    if (resetType === "all" || resetType === "workbook") {
      await db
        .delete(workbookResponses)
        .where(eq(workbookResponses.userId, userId));
    }

    if (resetType === "all" || resetType === "completions") {
      await db
        .delete(sectionCompletions)
        .where(eq(sectionCompletions.userId, userId));
      await db.execute(
        sql`DELETE FROM implementation_checkboxes WHERE user_id = ${userId}`
      );
    }

    if (resetType === "all" || resetType === "strategies") {
      await db
        .delete(messagingStrategies)
        .where(eq(messagingStrategies.userId, userId));
    }

    if (resetType === "all" || resetType === "offers") {
      await db
        .delete(userOfferOutlines)
        .where(eq(userOfferOutlines.userId, userId));
    }

    res.json({
      success: true,
      message: `User progress reset successfully (${resetType})`,
    });
  } catch (error) {
    console.error("Error resetting user progress:", error);
    res.status(500).json({ message: "Failed to reset user progress" });
  }
}

/**
 * Get module completion statistics
 */
export async function getModuleStats(req: Request, res: Response) {
  try {
    // Get completion stats for each module (step)
    const moduleStats = await db
      .select({
        stepNumber: sectionCompletions.stepNumber,
        sectionTitle: sectionCompletions.sectionTitle,
        completionCount: sql`COUNT(DISTINCT ${sectionCompletions.userId})::int`,
      })
      .from(sectionCompletions)
      .groupBy(sectionCompletions.stepNumber, sectionCompletions.sectionTitle)
      .orderBy(sectionCompletions.stepNumber);

    // Get total non-admin users for percentage calculations
    const [{ totalUsers }] = await db
      .select({
        totalUsers: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(eq(users.isAdmin, false));

    const moduleStatsWithPercentage = moduleStats.map((stat) => ({
      ...stat,
      completionPercentage:
        totalUsers > 0
          ? ((Number(stat.completionCount) / totalUsers) * 100).toFixed(1)
          : "0",
    }));

    res.json({ modules: moduleStatsWithPercentage, totalUsers });
  } catch (error) {
    console.error("Error fetching module statistics:", error);
    res.status(500).json({ message: "Failed to fetch module statistics" });
  }
}

/**
 * Get learning and progress tracking
 */
export async function getLearningProgress(req: Request, res: Response) {
  try {
    // Get all users with their progress stats
    const usersData = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        businessName: users.businessName,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.isAdmin, false))
      .orderBy(desc(users.createdAt));

    // Get completion counts per user
    const completionCounts = await db
      .select({
        userId: sectionCompletions.userId,
        completedSections: sql<number>`COUNT(DISTINCT CONCAT(${sectionCompletions.stepNumber}, '-', ${sectionCompletions.sectionTitle}))::int`,
        firstCompletionAt: sql<Date | null>`MIN(${sectionCompletions.completedAt})`,
        lastCompletionAt: sql<Date | null>`MAX(${sectionCompletions.completedAt})`,
      })
      .from(sectionCompletions)
      .groupBy(sectionCompletions.userId);

    // Get checklist completion counts per user
    const checklistCounts = await db.execute<{
      userId: number;
      totalChecked: number;
    }>(
      sql`SELECT user_id as "userId", COUNT(*)::int as "totalChecked" 
        FROM checklist_items 
        WHERE is_completed = true 
        GROUP BY user_id`
    );

    // Get workbook response counts per user
    const workbookCounts = await db
      .select({
        userId: workbookResponses.userId,
        responseCount: sql<number>`COUNT(DISTINCT ${workbookResponses.questionKey})::int`,
      })
      .from(workbookResponses)
      .groupBy(workbookResponses.userId);

    // Combine all data
    const learningProgress = usersData.map((user) => {
      const completion = completionCounts.find((c) => c.userId === user.id);
      const checklist = checklistCounts.rows.find(
        (c: any) => c.userId === user.id
      );
      const workbook = workbookCounts.find((w) => w.userId === user.id);

      // Calculate time spent (days between first completion and last completion)
      let daysActive = 0;
      if (completion?.firstCompletionAt && completion?.lastCompletionAt) {
        const firstDate = new Date(completion.firstCompletionAt);
        const lastDate = new Date(completion.lastCompletionAt);
        daysActive = Math.max(
          1,
          Math.ceil(
            (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
      }

      // Calculate estimated time to finish
      const totalSections = 35; // Approximate total sections
      const completedSections = Number(completion?.completedSections || 0);
      const sectionsRemaining = totalSections - completedSections;
      const pacePerDay = daysActive > 0 ? completedSections / daysActive : 0;
      const estimatedDaysToFinish =
        pacePerDay > 0 ? Math.ceil(sectionsRemaining / pacePerDay) : 0;

      return {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        joinedAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        completedSections: completedSections,
        totalChecklistItemsChecked: Number(checklist?.totalChecked || 0),
        workbookResponsesCount: Number(workbook?.responseCount || 0),
        firstCompletionAt: completion?.firstCompletionAt || null,
        lastCompletionAt: completion?.lastCompletionAt || null,
        daysActive,
        estimatedDaysToFinish,
        completionPercentage: (
          (completedSections / totalSections) *
          100
        ).toFixed(1),
      };
    });

    res.json(learningProgress);
  } catch (error) {
    console.error("Error fetching learning progress:", error);
    res.status(500).json({ message: "Failed to fetch learning progress" });
  }
}

/**
 * Get tool outputs for admin review
 */
export async function getToolOutputs(req: Request, res: Response) {
  try {
    // Get all messaging strategies with user info
    const strategies = await db
      .select({
        id: messagingStrategies.id,
        userId: messagingStrategies.userId,
        title: messagingStrategies.title,
        content: messagingStrategies.content,
        version: messagingStrategies.version,
        completionPercentage: messagingStrategies.completionPercentage,
        createdAt: messagingStrategies.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(messagingStrategies)
      .leftJoin(users, eq(messagingStrategies.userId, users.id))
      .orderBy(desc(messagingStrategies.createdAt))
      .limit(100);

    // Get all funnel copies with user info
    const funnelTemplates = await db
      .select({
        id: funnelCopies.id,
        userId: funnelCopies.userId,
        offerNumber: funnelCopies.offerNumber,
        optInPage: funnelCopies.optInPage,
        tripwirePage: funnelCopies.tripwirePage,
        checkoutPage: funnelCopies.checkoutPage,
        confirmationPage: funnelCopies.confirmationPage,
        createdAt: funnelCopies.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(funnelCopies)
      .leftJoin(users, eq(funnelCopies.userId, users.id))
      .orderBy(desc(funnelCopies.createdAt))
      .limit(100);

    // Get all content strategies with user info
    const contentStrategies = await db
      .select({
        id: generatedContentStrategies.id,
        userId: generatedContentStrategies.userId,
        contentPillars: generatedContentStrategies.contentPillars,
        contentIdeas: generatedContentStrategies.contentIdeas,
        postingCadence: generatedContentStrategies.postingCadence,
        version: generatedContentStrategies.version,
        createdAt: generatedContentStrategies.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(generatedContentStrategies)
      .leftJoin(users, eq(generatedContentStrategies.userId, users.id))
      .orderBy(desc(generatedContentStrategies.createdAt))
      .limit(100);

    // Get all video scripts with user info
    const videoScripts = await db
      .select({
        id: videoScriptGeneratorState.id,
        userId: videoScriptGeneratorState.userId,
        inputMethod: videoScriptGeneratorState.inputMethod,
        landingPageUrl: videoScriptGeneratorState.landingPageUrl,
        generatedScripts: videoScriptGeneratorState.generatedScripts,
        createdAt: videoScriptGeneratorState.createdAt,
        updatedAt: videoScriptGeneratorState.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(videoScriptGeneratorState)
      .leftJoin(users, eq(videoScriptGeneratorState.userId, users.id))
      .orderBy(desc(videoScriptGeneratorState.updatedAt))
      .limit(100);

    // Get usage statistics
    const stats = {
      totalMessagingStrategies: strategies.length,
      totalFunnelTemplates: funnelTemplates.length,
      totalContentStrategies: contentStrategies.length,
      totalVideoScripts: videoScripts.length,
    };

    res.json({
      stats,
      messagingStrategies: strategies,
      funnelTemplates,
      contentStrategies,
      videoScripts,
    });
  } catch (error) {
    console.error("Error fetching tool outputs:", error);
    res.status(500).json({ message: "Failed to fetch tool outputs" });
  }
}

/**
 * Get all training videos
 */
export async function getTrainingVideos(req: Request, res: Response) {
  try {
    const videos = await storage.getAllTrainingVideos();
    res.json(videos);
  } catch (error) {
    console.error("Error fetching training videos:", error);
    res.status(500).json({ message: "Failed to fetch training videos" });
  }
}

/**
 * Create training video
 */
export async function createTrainingVideo(req: Request, res: Response) {
  try {
    const validatedData = insertTrainingVideoSchema.parse(req.body);
    const video = await storage.createTrainingVideo(validatedData);
    res.status(201).json(video);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", errors: error.errors });
    }
    console.error("Error creating training video:", error);
    res.status(500).json({ message: "Failed to create training video" });
  }
}

/**
 * Update training video
 */
export async function updateTrainingVideo(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }
    const validatedData = insertTrainingVideoSchema.partial().parse(req.body);
    const video = await storage.updateTrainingVideo(id, validatedData);
    if (!video) {
      return res.status(404).json({ message: "Training video not found" });
    }
    res.json(video);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", errors: error.errors });
    }
    console.error("Error updating training video:", error);
    res.status(500).json({ message: "Failed to update training video" });
  }
}

/**
 * Delete training video
 */
export async function deleteTrainingVideo(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }
    const success = await storage.deleteTrainingVideo(id);
    if (!success) {
      return res.status(404).json({ message: "Training video not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting training video:", error);
    res.status(500).json({ message: "Failed to delete training video" });
  }
}

/**
 * Get all platform resources
 */
export async function getPlatformResources(req: Request, res: Response) {
  try {
    const resources = await storage.getAllPlatformResources();
    res.json(resources);
  } catch (error) {
    console.error("Error fetching platform resources:", error);
    res.status(500).json({ message: "Failed to fetch platform resources" });
  }
}

/**
 * Create platform resource
 */
export async function createPlatformResource(req: Request, res: Response) {
  try {
    const validatedData = insertPlatformResourceSchema.parse(req.body);
    const resource = await storage.createPlatformResource(validatedData);
    res.status(201).json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", errors: error.errors });
    }
    console.error("Error creating platform resource:", error);
    res.status(500).json({ message: "Failed to create platform resource" });
  }
}

/**
 * Update platform resource
 */
export async function updatePlatformResource(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid resource ID" });
    }
    const validatedData = insertPlatformResourceSchema
      .partial()
      .parse(req.body);
    const resource = await storage.updatePlatformResource(id, validatedData);
    if (!resource) {
      return res.status(404).json({ message: "Platform resource not found" });
    }
    res.json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", errors: error.errors });
    }
    console.error("Error updating platform resource:", error);
    res.status(500).json({ message: "Failed to update platform resource" });
  }
}

/**
 * Delete platform resource
 */
export async function deletePlatformResource(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid resource ID" });
    }
    const success = await storage.deletePlatformResource(id);
    if (!success) {
      return res.status(404).json({ message: "Platform resource not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting platform resource:", error);
    res.status(500).json({ message: "Failed to delete platform resource" });
  }
}

/**
 * Get all checklist step definitions
 */
export async function getChecklistDefinitions(req: Request, res: Response) {
  try {
    const definitions = await storage.getAllChecklistStepDefinitions();
    res.json(definitions);
  } catch (error) {
    console.error("Error fetching checklist definitions:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch checklist definitions" });
  }
}

/**
 * Create checklist step definition
 */
export async function createChecklistDefinition(req: Request, res: Response) {
  try {
    const validatedData = insertChecklistStepDefinitionSchema.parse(req.body);
    const definition = await storage.createChecklistStepDefinition(
      validatedData
    );
    res.status(201).json(definition);
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", errors: error.errors });
    }

    // Handle database constraint violations (duplicate key errors)
    // PostgreSQL error code 23505 = unique_violation, 23503 = foreign_key_violation
    const pgError = error as any;
    if (pgError?.code === "23505" || pgError?.code === "23503") {
      const constraint = pgError?.constraint || "";
      const detail = pgError?.detail || "";
      
      // Extract field name from constraint or detail
      let fieldName = "field";
      let duplicateValue = "";
      
      if (detail) {
        // Parse detail like: "Key (section_key)=(launch-your-ads-lead-generation) already exists."
        const match = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
        if (match) {
          fieldName = match[1];
          duplicateValue = match[2];
        }
      } else if (constraint.includes("section_key")) {
        fieldName = "section_key";
        duplicateValue = validatedData?.sectionKey || "";
      }

      return res.status(409).json({
        message: `A checklist definition with this ${fieldName} already exists`,
        error: "DUPLICATE_KEY",
        field: fieldName,
        duplicateValue: duplicateValue,
        detail: detail || `The ${fieldName} "${duplicateValue}" is already in use`,
      });
    }

    // Handle other database errors
    if (pgError?.code) {
      console.error("Database error creating checklist definition:", error);
      return res.status(400).json({
        message: "Database error occurred",
        error: pgError.code,
        detail: pgError.detail || pgError.message || "Unknown database error",
      });
    }

    // Generic error handler
    console.error("Error creating checklist definition:", error);
    res
      .status(500)
      .json({ message: "Failed to create checklist definition" });
  }
}

/**
 * Update checklist step definition
 */
export async function updateChecklistDefinition(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid definition ID" });
    }
    const validatedData = insertChecklistStepDefinitionSchema
      .partial()
      .parse(req.body);
    const definition = await storage.updateChecklistStepDefinition(
      id,
      validatedData
    );
    if (!definition) {
      return res
        .status(404)
        .json({ message: "Checklist definition not found" });
    }
    res.json(definition);
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", errors: error.errors });
    }

    // Handle database constraint violations (duplicate key errors)
    // PostgreSQL error code 23505 = unique_violation, 23503 = foreign_key_violation
    const pgError = error as any;
    if (pgError?.code === "23505" || pgError?.code === "23503") {
      const constraint = pgError?.constraint || "";
      const detail = pgError?.detail || "";
      
      // Extract field name from constraint or detail
      let fieldName = "field";
      let duplicateValue = "";
      
      if (detail) {
        // Parse detail like: "Key (section_key)=(launch-your-ads-lead-generation) already exists."
        const match = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
        if (match) {
          fieldName = match[1];
          duplicateValue = match[2];
        }
      } else if (constraint.includes("section_key")) {
        fieldName = "section_key";
        duplicateValue = validatedData?.sectionKey || "";
      }

      return res.status(409).json({
        message: `A checklist definition with this ${fieldName} already exists`,
        error: "DUPLICATE_KEY",
        field: fieldName,
        duplicateValue: duplicateValue,
        detail: detail || `The ${fieldName} "${duplicateValue}" is already in use`,
      });
    }

    // Handle other database errors
    if (pgError?.code) {
      console.error("Database error updating checklist definition:", error);
      return res.status(400).json({
        message: "Database error occurred",
        error: pgError.code,
        detail: pgError.detail || pgError.message || "Unknown database error",
      });
    }

    // Generic error handler
    console.error("Error updating checklist definition:", error);
    res
      .status(500)
      .json({ message: "Failed to update checklist definition" });
  }
}

/**
 * Delete checklist step definition
 */
export async function deleteChecklistDefinition(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid definition ID" });
    }
    const success = await storage.deleteChecklistStepDefinition(id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Checklist definition not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist definition:", error);
    res
      .status(500)
      .json({ message: "Failed to delete checklist definition" });
  }
}

