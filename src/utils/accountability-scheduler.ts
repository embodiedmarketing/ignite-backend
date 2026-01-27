// TODO: Update when storage.service.ts is moved
import { storage } from "../services/storage.service";
import { format, startOfWeek, endOfWeek, addWeeks, isSameDay } from "date-fns";

// System user ID for creating accountability threads (using platform admin)
// const SYSTEM_USER_ID = 119; // morgan@embodiedmarketing.com
const SYSTEM_USER_ID =217; // team@embodiedmarketing.com

// Category slug for accountability threads
const ACCOUNTABILITY_CATEGORY_SLUG = "general"; // Adjust based on your forum category structure

/**
 * Gets the Monday of the current week at 00:00:00
 */
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Gets the Sunday of the current week at 23:59:59
 */
function getCurrentWeekSunday(): Date {
  const now = new Date();
  const sunday = endOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Checks if it's Monday and creates a new accountability thread if needed
 */
export async function checkAndCreateWeeklyThread(): Promise<void> {
  console.log('[ACCOUNTABILITY SCHEDULER] Checking and creating mintuesly thread' + new Date().toISOString());
  
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Only run on Mondays (0 = Sunday, 1 = Monday, etc.)
    if (dayOfWeek !== 1) {
      return;
    }
    
    const weekMonday = getCurrentWeekMonday();
    const weekSunday = getCurrentWeekSunday();
    
    // Check if we already have an active thread for this week
    const activeThread = await storage.getActiveAccountabilityThread();
    
    if (activeThread) {
      const activeThreadWeekStart = new Date(activeThread.weekStartDate);
      activeThreadWeekStart.setHours(0, 0, 0, 0);
      
      // If the active thread is for the current week, check if it has the correct userId 
      // if (isSameDay(activeThreadWeekStart, weekMonday)) {
        // Get the forum thread to check its userId
        const threadData = await storage.getThreadWithPosts(activeThread.threadId);
        
        if (threadData && threadData.thread.userId !== SYSTEM_USER_ID) {
          // Update the thread's userId to the correct system user
          await storage.updateAccountabilityThreadUserId(
            activeThread.threadId,
            SYSTEM_USER_ID
          );
          console.log(`[ACCOUNTABILITY SCHEDULER] Updated thread ${activeThread.threadId} userId to ${SYSTEM_USER_ID}`);
        } else {
          console.log('[ACCOUNTABILITY SCHEDULER] Thread already exists for this week');
        }
        return;
      // }
      
      // Mark previous threads as inactive
      await storage.markPreviousThreadsInactive();
    }
    
    // Create the thread title with the date
    const threadTitle = `${format(weekMonday, 'MMMM d, yyyy')} - Accountability Thread`;
    const weekRange = `${format(weekMonday, 'MMM d')} - ${format(weekSunday, 'MMM d')}`;
    const threadBody = `Welcome to this week's Accountability Thread! 🎯

Join this week's accountability thread (${weekRange}) and share your progress with us!

This is your space to share your progress and stay accountable to your goals with yourself and your coaches.

Please share:

1. Where are you in the program? 
   - What section are you currently working on?
   
2. What are your specific goals for this week? 
   - What do you want to accomplish by the end of the week?
   
3. Are you feeling stuck anywhere?
   - What challenges are you facing? We're here to help!

Remember: Progress over perfection. Every step forward counts! 💪

Drop your update in the comments below and let's support each other this week!`;

    // Create the forum thread
    const forumThread = await storage.createThread(
      ACCOUNTABILITY_CATEGORY_SLUG,
      SYSTEM_USER_ID,
      {
        title: threadTitle,
        body: threadBody,
      }
    );
    
    // Create the weekly accountability thread record
    const weeklyThread = await storage.createWeeklyAccountabilityThread(
      forumThread.id,
      weekMonday,
      weekSunday
    );
    
    console.log(`[ACCOUNTABILITY SCHEDULER] Created new accountability thread for week of ${format(weekMonday, 'MMMM d, yyyy')}`);
    console.log(`[ACCOUNTABILITY SCHEDULER] Thread ID: ${forumThread.id}, Weekly Thread ID: ${weeklyThread.id}`);
    
  } catch (error) {
    console.error('[ACCOUNTABILITY SCHEDULER] Error creating weekly accountability thread:', error);
  }
}

/**
 * Starts the scheduler to check every hour if a new thread needs to be created
 */
export function startAccountabilityScheduler(): void {
  // Check immediately on startup
  checkAndCreateWeeklyThread();
  
  // Then check every hour (3600000 ms = 1 hour)
  setInterval(() => {
    checkAndCreateWeeklyThread();
  }, 3600000);

  
  console.log('[ACCOUNTABILITY SCHEDULER] Scheduler started - checking every hour for Monday thread creation');
}

