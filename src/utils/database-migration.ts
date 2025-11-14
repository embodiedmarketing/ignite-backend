import { storage } from "../services/storage.service";
import type { InsertMessagingStrategy, InsertWorkbookResponse } from "@shared/schema";

/**
 * Database Migration Utility
 * Helps users transition from localStorage to database persistence
 */

export interface LocalStorageData {
  messagingStrategy?: string;
  workbookResponses?: Record<string, any>;
  completedSections?: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedStrategies: number;
  migratedResponses: number;
  errors: string[];
}

/**
 * Migrate messaging strategy from localStorage format to database
 */
export async function migrateMessagingStrategy(
  userId: number, 
  localData: string,
  title: string = "Messaging Strategy"
): Promise<boolean> {
  try {
    // Check if user already has an active strategy
    const existingStrategy = await storage.getActiveMessagingStrategy(userId);
    
    if (existingStrategy) {
      console.log(`User ${userId} already has an active messaging strategy, skipping migration`);
      return false;
    }

    const strategyData: InsertMessagingStrategy = {
      userId,
      title,
      content: localData,
      version: 1,
      isActive: true,
      sourceData: { migratedFromLocalStorage: true },
      completionPercentage: calculateCompletionPercentage(localData),
      missingInformation: null,
      recommendations: null
    };

    await storage.createMessagingStrategy(strategyData);
    console.log(`Successfully migrated messaging strategy for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error migrating messaging strategy for user ${userId}:`, error);
    return false;
  }
}

/**
 * Migrate workbook responses from localStorage format to database
 */
export async function migrateWorkbookResponses(
  userId: number,
  localResponses: Record<string, any>
): Promise<number> {
  let migratedCount = 0;

  try {
    for (const [key, value] of Object.entries(localResponses)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        // Parse step and question from localStorage key format
        const { stepNumber, sectionTitle, questionKey } = parseLocalStorageKey(key);
        
        const responseData: InsertWorkbookResponse = {
          userId,
          stepNumber,
          sectionTitle,
          questionKey,
          responseText: value.trim()
        };

        await storage.upsertWorkbookResponse(responseData);
        migratedCount++;
      }
    }

    console.log(`Successfully migrated ${migratedCount} workbook responses for user ${userId}`);
  } catch (error) {
    console.error(`Error migrating workbook responses for user ${userId}:`, error);
  }

  return migratedCount;
}

/**
 * Parse localStorage key to extract step, section, and question information
 */
function parseLocalStorageKey(key: string): {
  stepNumber: number;
  sectionTitle: string;
  questionKey: string;
} {
  // Handle various localStorage key formats
  if (key.startsWith('step1_') || key.includes('messaging')) {
    return {
      stepNumber: 1,
      sectionTitle: 'Your Messaging',
      questionKey: key
    };
  } else if (key.startsWith('step2_') || key.includes('offer')) {
    return {
      stepNumber: 2,
      sectionTitle: 'Create Your Offer',
      questionKey: key
    };
  } else if (key.startsWith('step3_') || key.includes('build')) {
    return {
      stepNumber: 3,
      sectionTitle: 'Build Your Offer',
      questionKey: key
    };
  } else if (key.startsWith('step4_') || key.includes('sell')) {
    return {
      stepNumber: 4,
      sectionTitle: 'Sell Your Offer',
      questionKey: key
    };
  }

  // Default fallback
  return {
    stepNumber: 1,
    sectionTitle: 'General',
    questionKey: key
  };
}

/**
 * Calculate completion percentage for messaging strategy
 */
function calculateCompletionPercentage(content: string): number {
  if (!content || content.trim().length === 0) return 0;
  
  try {
    const parsed = JSON.parse(content);
    const sections = Object.keys(parsed);
    const completedSections = sections.filter(section => {
      const sectionData = parsed[section];
      return sectionData && Object.values(sectionData).some(value => 
        typeof value === 'string' && value.trim().length > 20
      );
    });
    
    return Math.round((completedSections.length / Math.max(sections.length, 1)) * 100);
  } catch {
    // If not JSON, assume it's a text strategy
    return content.length > 100 ? 80 : 40;
  }
}

/**
 * Perform complete migration for a user
 */
export async function performCompleteMigration(
  userId: number,
  localStorageData: LocalStorageData
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedStrategies: 0,
    migratedResponses: 0,
    errors: []
  };

  try {
    // Migrate messaging strategy if present
    if (localStorageData.messagingStrategy) {
      const strategyMigrated = await migrateMessagingStrategy(
        userId,
        localStorageData.messagingStrategy
      );
      if (strategyMigrated) {
        result.migratedStrategies = 1;
      }
    }

    // Migrate workbook responses if present
    if (localStorageData.workbookResponses) {
      result.migratedResponses = await migrateWorkbookResponses(
        userId,
        localStorageData.workbookResponses
      );
    }

    console.log(`Migration completed for user ${userId}:`, result);
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    console.error(`Migration failed for user ${userId}:`, error);
  }

  return result;
}

/**
 * Check if user has any database persistence data
 */
export async function hasExistingDatabaseData(userId: number): Promise<boolean> {
  try {
    const strategy = await storage.getActiveMessagingStrategy(userId);
    const responses = await storage.getWorkbookResponsesByUser(userId);
    
    return !!(strategy || responses.length > 0);
  } catch (error) {
    console.error(`Error checking existing database data for user ${userId}:`, error);
    return false;
  }
}
