// TODO: Update when storage.service.ts is moved
import { storage } from "../services/storage.service";
import { db } from "../config/db";
import { users, issueReports } from "../models";
import { eq, gte, and, desc } from "drizzle-orm";

interface UserActivityMetric {
  userId: number;
  email: string;
  sessionDuration: number;
  questionsAttempted: number;
  aiFeedbackRequests: number;
  errorRate: number;
  lastActivity: Date;
  frustrationIndicators: string[];
}

interface SystemHealthAlert {
  type: 'ai_feedback_failure' | 'user_abandonment' | 'error_spike' | 'low_completion_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedUsers: number;
  details: any;
  timestamp: Date;
}

class UserMonitoringService {
  private userSessions = new Map<number, {
    startTime: Date;
    questionsAttempted: number;
    aiFeedbackRequests: number;
    errors: string[];
    lastActivity: Date;
  }>();

  private aiFeedbackErrors = new Map<string, number>();
  private userFrustrationPatterns = new Map<number, string[]>();

  // Track user session activity
  trackUserActivity(userId: number, activityType: string, metadata?: any) {
    const session = this.userSessions.get(userId) || {
      startTime: new Date(),
      questionsAttempted: 0,
      aiFeedbackRequests: 0,
      errors: [],
      lastActivity: new Date()
    };

    session.lastActivity = new Date();

    switch (activityType) {
      case 'question_attempted':
        session.questionsAttempted++;
        break;
      case 'ai_feedback_requested':
        session.aiFeedbackRequests++;
        break;
      case 'ai_feedback_error':
        session.errors.push(metadata?.error || 'Unknown error');
        this.trackAIFeedbackError(metadata?.section, metadata?.error);
        break;
      case 'user_abandonment':
        this.trackUserFrustration(userId, 'abandoned_without_completion');
        break;
    }

    this.userSessions.set(userId, session);
  }

  // Track AI feedback system errors
  private trackAIFeedbackError(section: string, error: string) {
    const key = `${section}-${error}`;
    const count = this.aiFeedbackErrors.get(key) || 0;
    this.aiFeedbackErrors.set(key, count + 1);
  }

  // Track user frustration patterns
  private trackUserFrustration(userId: number, pattern: string) {
    const patterns = this.userFrustrationPatterns.get(userId) || [];
    patterns.push(pattern);
    this.userFrustrationPatterns.set(userId, patterns);
  }

  // Generate health alerts based on patterns
  async generateHealthAlerts(): Promise<SystemHealthAlert[]> {
    const alerts: SystemHealthAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check AI feedback error rate
    const totalAIErrors = Array.from(this.aiFeedbackErrors.values()).reduce((sum, count) => sum + count, 0);
    if (totalAIErrors > 10) {
      alerts.push({
        type: 'ai_feedback_failure',
        severity: totalAIErrors > 50 ? 'critical' : totalAIErrors > 25 ? 'high' : 'medium',
        message: `High AI feedback error rate detected: ${totalAIErrors} errors in the last hour`,
        affectedUsers: this.userSessions.size,
        details: Object.fromEntries(this.aiFeedbackErrors.entries()),
        timestamp: now
      });
    }

    // Check user abandonment rate
    const activeSessions = Array.from(this.userSessions.values()).filter(
      session => session.lastActivity > oneHourAgo
    );
    const abandonedSessions = activeSessions.filter(
      session => session.questionsAttempted > 0 && session.aiFeedbackRequests === 0
    );
    
    if (abandonedSessions.length > activeSessions.length * 0.3) {
      alerts.push({
        type: 'user_abandonment',
        severity: 'high',
        message: `High user abandonment rate: ${abandonedSessions.length}/${activeSessions.length} users abandoned after starting`,
        affectedUsers: abandonedSessions.length,
        details: { abandonmentRate: (abandonedSessions.length / activeSessions.length * 100).toFixed(1) + '%' },
        timestamp: now
      });
    }

    // Check for users with multiple frustration patterns
    const frustratedUsers = Array.from(this.userFrustrationPatterns.entries()).filter(
      ([userId, patterns]) => patterns.length >= 3
    );
    
    if (frustratedUsers.length > 0) {
      alerts.push({
        type: 'low_completion_rate',
        severity: 'medium',
        message: `${frustratedUsers.length} users showing frustration patterns`,
        affectedUsers: frustratedUsers.length,
        details: Object.fromEntries(frustratedUsers),
        timestamp: now
      });
    }

    return alerts;
  }

  // Get user activity metrics
  async getUserActivityMetrics(): Promise<UserActivityMetric[]> {
    const metrics: UserActivityMetric[] = [];
    
    for (const [userId, session] of this.userSessions.entries()) {
      try {
        const user = await storage.getUser(userId);
        if (!user) continue;

        const sessionDuration = new Date().getTime() - session.startTime.getTime();
        const errorRate = session.errors.length / Math.max(1, session.aiFeedbackRequests);
        const frustrationIndicators = this.userFrustrationPatterns.get(userId) || [];

        metrics.push({
          userId,
          email: user.email,
          sessionDuration: Math.round(sessionDuration / 1000), // seconds
          questionsAttempted: session.questionsAttempted,
          aiFeedbackRequests: session.aiFeedbackRequests,
          errorRate: Math.round(errorRate * 100), // percentage
          lastActivity: session.lastActivity,
          frustrationIndicators
        });
      } catch (error) {
        console.error(`Error getting metrics for user ${userId}:`, error);
      }
    }

    return metrics.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  // Auto-create issue reports for critical patterns
  async autoCreateIssueReports(): Promise<void> {
    const alerts = await this.generateHealthAlerts();
    
    for (const alert of alerts) {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        try {
          await storage.createIssueReport({
            userId: 1, // System user
            userEmail: 'system@launch.com',
            issueType: 'technical_issue',
            priority: alert.severity === 'critical' ? 'critical' : 'high',
            title: `Auto-detected: ${alert.type}`,
            description: `${alert.message}\n\nAffected users: ${alert.affectedUsers}\n\nDetails: ${JSON.stringify(alert.details, null, 2)}`,
            browserInfo: { source: 'automated_monitoring' },
            pageUrl: 'system_monitoring'
          });
        } catch (error) {
          console.error('Failed to create auto issue report:', error);
        }
      }
    }
  }

  // Reset daily metrics
  resetDailyMetrics() {
    this.aiFeedbackErrors.clear();
    this.userFrustrationPatterns.clear();
    // Keep user sessions but reset error counts
    for (const [userId, session] of this.userSessions.entries()) {
      session.errors = [];
    }
  }

  // Clean up old sessions (older than 24 hours)
  cleanupOldSessions() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [userId, session] of this.userSessions.entries()) {
      if (session.lastActivity < dayAgo) {
        this.userSessions.delete(userId);
      }
    }
  }
}

export const userMonitoring = new UserMonitoringService();

// Auto-cleanup and monitoring intervals
setInterval(() => {
  userMonitoring.cleanupOldSessions();
}, 60 * 60 * 1000); // Every hour

setInterval(() => {
  userMonitoring.autoCreateIssueReports();
}, 30 * 60 * 1000); // Every 30 minutes

setInterval(() => {
  userMonitoring.resetDailyMetrics();
}, 24 * 60 * 60 * 1000); // Every 24 hours

