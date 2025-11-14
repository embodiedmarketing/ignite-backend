// Real-time AI coaching monitoring system
import { storage } from "./storage.service";

interface CoachingEvent {
  id?: number;
  userId: number;
  userEmail: string;
  timestamp: Date;
  section: string;
  questionContext: string;
  userResponse: string;
  aiLevel: string;
  aiLevelDescription: string;
  aiFeedback: string;
  responseLength: number;
  sessionId?: string;
}

class AICoachingMonitor {
  private events: CoachingEvent[] = [];
  private recentEvents: Map<string, CoachingEvent[]> = new Map();

  async logCoachingEvent(event: Omit<CoachingEvent, 'id' | 'timestamp'>) {
    const fullEvent: CoachingEvent = {
      ...event,
      timestamp: new Date()
    };

    // Store in memory for real-time monitoring
    this.events.push(fullEvent);
    
    // Keep recent events by user for quick access
    const userKey = `${event.userId}`;
    if (!this.recentEvents.has(userKey)) {
      this.recentEvents.set(userKey, []);
    }
    
    const userEvents = this.recentEvents.get(userKey)!;
    userEvents.push(fullEvent);
    
    // Keep only last 20 events per user
    if (userEvents.length > 20) {
      userEvents.shift();
    }

    // Store in database for permanent tracking
    try {
      await storage.createCoachingEvent(fullEvent);
    } catch (error) {
      console.error("Failed to store coaching event:", error);
    }

    // Log to console for immediate visibility
    this.logEventToConsole(fullEvent);
  }

  private logEventToConsole(event: CoachingEvent) {
    const timestamp = event.timestamp.toLocaleTimeString();
    const level = event.aiLevel.toUpperCase();
    const levelEmoji = this.getLevelEmoji(event.aiLevel);
    
    console.log(`\n${levelEmoji} AI COACHING EVENT [${timestamp}] ${levelEmoji}`);
    console.log(`User: ${event.userEmail} (ID: ${event.userId})`);
    console.log(`Section: ${event.section}`);
    console.log(`Question: ${event.questionContext.substring(0, 80)}...`);
    console.log(`Response Length: ${event.responseLength} chars`);
    console.log(`Response Preview: "${event.userResponse.substring(0, 60)}..."`);
    console.log(`AI Level: ${level} - ${event.aiLevelDescription}`);
    console.log(`AI Feedback: ${event.aiFeedback.substring(0, 100)}...`);
    console.log(`${'='.repeat(80)}`);
  }

  private getLevelEmoji(level: string): string {
    switch (level) {
      case 'excellent-depth': return '🟢';
      case 'good-start': return '🟡';
      case 'needs-more-detail': return '🔴';
      default: return '⚪';
    }
  }

  getTodaysEvents(): CoachingEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.events.filter(event => event.timestamp >= today);
  }

  getTodaysStats() {
    const todaysEvents = this.getTodaysEvents();
    const total = todaysEvents.length;
    
    const byLevel = {
      'excellent-depth': todaysEvents.filter(e => e.aiLevel === 'excellent-depth').length,
      'good-start': todaysEvents.filter(e => e.aiLevel === 'good-start').length,
      'needs-more-detail': todaysEvents.filter(e => e.aiLevel === 'needs-more-detail').length
    };

    const bySection = todaysEvents.reduce((acc, event) => {
      acc[event.section] = (acc[event.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageResponseLength = total > 0 
      ? Math.round(todaysEvents.reduce((sum, e) => sum + e.responseLength, 0) / total)
      : 0;

    const uniqueUsers = new Set(todaysEvents.map(e => e.userId)).size;

    return {
      total,
      uniqueUsers,
      byLevel,
      bySection,
      averageResponseLength,
      successRate: total > 0 ? Math.round(((byLevel['excellent-depth'] + byLevel['good-start']) / total) * 100) : 0
    };
  }

  getUserRecentEvents(userId: number): CoachingEvent[] {
    return this.recentEvents.get(userId.toString()) || [];
  }

  getRecentProblematicEvents(limit: number = 10): CoachingEvent[] {
    return this.events
      .filter(event => event.aiLevel === 'needs-more-detail')
      .slice(-limit)
      .reverse();
  }

  generateRealTimeReport(): string {
    const stats = this.getTodaysStats();
    const problematic = this.getRecentProblematicEvents(5);
    
    let report = `\n📊 AI COACHING REAL-TIME MONITORING REPORT\n`;
    report += `📅 Date: ${new Date().toLocaleDateString()}\n`;
    report += `⏰ Last Updated: ${new Date().toLocaleTimeString()}\n\n`;
    
    report += `📈 TODAY'S STATISTICS:\n`;
    report += `• Total Events: ${stats.total}\n`;
    report += `• Unique Users: ${stats.uniqueUsers}\n`;
    report += `• Success Rate: ${stats.successRate}% (excellent + good ratings)\n`;
    report += `• Average Response Length: ${stats.averageResponseLength} characters\n\n`;
    
    report += `🎯 RESPONSE QUALITY BREAKDOWN:\n`;
    report += `• 🟢 Excellent Depth: ${stats.byLevel['excellent-depth']} (${stats.total > 0 ? Math.round((stats.byLevel['excellent-depth'] / stats.total) * 100) : 0}%)\n`;
    report += `• 🟡 Good Start: ${stats.byLevel['good-start']} (${stats.total > 0 ? Math.round((stats.byLevel['good-start'] / stats.total) * 100) : 0}%)\n`;
    report += `• 🔴 Needs More Detail: ${stats.byLevel['needs-more-detail']} (${stats.total > 0 ? Math.round((stats.byLevel['needs-more-detail'] / stats.total) * 100) : 0}%)\n\n`;
    
    if (Object.keys(stats.bySection).length > 0) {
      report += `📚 ACTIVITY BY SECTION:\n`;
      Object.entries(stats.bySection)
        .sort(([,a], [,b]) => b - a)
        .forEach(([section, count]) => {
          report += `• ${section}: ${count} responses\n`;
        });
      report += `\n`;
    }
    
    if (problematic.length > 0) {
      report += `⚠️  RECENT "NEEDS MORE DETAIL" RESPONSES:\n`;
      problematic.forEach((event, index) => {
        report += `${index + 1}. ${event.userEmail} - ${event.section}\n`;
        report += `   "${event.userResponse.substring(0, 50)}..."\n`;
        report += `   AI: ${event.aiFeedback.substring(0, 60)}...\n\n`;
      });
    }
    
    return report;
  }
}

export const aiCoachingMonitor = new AICoachingMonitor();