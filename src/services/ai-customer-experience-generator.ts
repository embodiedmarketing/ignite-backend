import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { jsonObjectSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY } from "../shared/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CustomerExperienceData {
  offerOutline?: any;
  messagingStrategy?: any;
  experienceQuestions: {
    deliveryMethod: string;
    offerDuration: string;
    communicationFrequency: string;
    feedbackMethod: string;
    onboardingElements: string[];
    customOnboardingInfo?: string;
  };
}

interface ComprehensiveExperiencePlan {
  onboarding: OnboardingPlan;
  delivery: DeliveryPlan;
  communication: CommunicationPlan;
  feedback: FeedbackPlan;
}

interface OnboardingPlan {
  welcomeSequence: EmailTemplate[];
  clearNextSteps: string[];
  avoidOverwhelm: string[];
  keyInformation: string[];
}

interface DeliveryPlan {
  contentList: ContentItem[];
  creationTimeline: string[];
  deliveryMethods: string[];
  qualityStandards: string[];
}

interface CommunicationPlan {
  emailSchedule: EmailTemplate[];
  checkInCadence: string[];
  valueAdds: string[];
  retentionStrategy: string[];
}

interface FeedbackPlan {
  collectionMethods: string[];
  timing: string[];
  questions: string[];
  implementation: string[];
}

interface EmailTemplate {
  subject: string;
  timing: string;
  purpose: string;
  keyPoints: string[];
  callToAction: string;
}

interface ContentItem {
  type: string;
  title: string;
  description: string;
  estimatedTime: string;
  priority: "high" | "medium" | "low";
  dependencies?: string[];
}

export async function generateComprehensiveCustomerExperience(
  data: CustomerExperienceData
): Promise<ComprehensiveExperiencePlan> {
  const { offerOutline, messagingStrategy, experienceQuestions } = data;
  
  try {
    // Generate intelligent plans using AI
    const onboarding = await generateOnboardingPlan(offerOutline, experienceQuestions);
    const delivery = await generateDeliveryPlan(offerOutline, experienceQuestions);
    const communication = await generateCommunicationPlan(offerOutline, messagingStrategy, experienceQuestions);
    const feedback = await generateFeedbackPlan(offerOutline, experienceQuestions);

    return {
      onboarding,
      delivery,
      communication,
      feedback
    };
  } catch (error) {
    console.error('Error generating comprehensive customer experience:', error);
    console.log('🔄 Using fallback comprehensive plan due to AI generation failure');
    // Return fallback structure
    return generateFallbackPlan(data);
  }
}

async function generateOnboardingPlan(
  offerOutline: any,
  experienceQuestions: any
): Promise<OnboardingPlan> {
  const prompt = `Based on this offer and delivery method, create a comprehensive onboarding plan:

OFFER: ${JSON.stringify(offerOutline)}
DELIVERY METHOD: ${experienceQuestions.deliveryMethod}
DURATION: ${experienceQuestions.offerDuration}
ONBOARDING ELEMENTS: ${experienceQuestions.onboardingElements?.join(', ')}

Create a detailed onboarding plan with:
1. Welcome email sequence (3-4 emails) with specific subjects, timing, and key points
2. Clear next steps to prevent confusion
3. Strategies to avoid overwhelming new customers
4. Key information they need upfront

Focus on making buyers feel confident and clear about what to expect. Return as JSON.`;

  const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    messages: [{ role: "user", content: userPromptWithJson }],
    max_tokens: 800,
    temperature: 0.7,
  });

  const contentText = getTextFromAnthropicContent(response.content);
  const result = parseAndValidateAiJson(contentText, jsonObjectSchema, {
    context: "onboarding plan",
    fallback: {},
  }) as Record<string, unknown>;
  return {
    welcomeSequence: (result.welcomeSequence as string[]) || [],
    clearNextSteps: (result.clearNextSteps as string[]) || [],
    avoidOverwhelm: (result.avoidOverwhelm as string[]) || [],
    keyInformation: (result.keyInformation as string[]) || []
  };
}

async function generateDeliveryPlan(
  offerOutline: any,
  experienceQuestions: any
): Promise<DeliveryPlan> {
  const prompt = `Based on this offer outline, create a comprehensive content delivery plan:

OFFER: ${JSON.stringify(offerOutline)}
DELIVERY METHOD: ${experienceQuestions.deliveryMethod}
DURATION: ${experienceQuestions.offerDuration}

Create a detailed delivery plan with:
1. Complete list of all content that needs to be created (videos, worksheets, templates, etc.)
2. Creation timeline with priorities
3. Delivery methods and platforms
4. Quality standards and requirements

Focus on breaking down EXACTLY what content needs to be created for this offer to be complete. Return as JSON.`;

  const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    messages: [{ role: "user", content: userPromptWithJson }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const contentText = getTextFromAnthropicContent(response.content);
  const result = parseAndValidateAiJson(contentText, jsonObjectSchema, {
    context: "delivery plan",
    fallback: {},
  }) as Record<string, unknown>;
  return {
    contentList: (result.contentList as string[]) || [],
    creationTimeline: (result.creationTimeline as string[]) || [],
    deliveryMethods: (result.deliveryMethods as string[]) || [],
    qualityStandards: (result.qualityStandards as string[]) || []
  };
}

async function generateCommunicationPlan(
  offerOutline: any,
  messagingStrategy: any,
  experienceQuestions: any
): Promise<CommunicationPlan> {
  const prompt = `Create an ongoing communication strategy for customers:

OFFER: ${JSON.stringify(offerOutline)}
MESSAGING STRATEGY: ${JSON.stringify(messagingStrategy)}
COMMUNICATION FREQUENCY: ${experienceQuestions.communicationFrequency}
DURATION: ${experienceQuestions.offerDuration}

Create a detailed communication plan with:
1. Email schedule with specific subjects and timing
2. Check-in cadence throughout the program
3. Value-add content to send regularly
4. Retention strategy to keep customers engaged

Focus on maintaining engagement and providing ongoing value. Return as JSON.`;

  const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    messages: [{ role: "user", content: userPromptWithJson }],
    max_tokens: 800,
    temperature: 0.7,
  });

  const contentText = getTextFromAnthropicContent(response.content);
  const result = parseAndValidateAiJson(contentText, jsonObjectSchema, {
    context: "communication plan",
    fallback: {},
  }) as Record<string, unknown>;
  return {
    emailSchedule: (result.emailSchedule as string[]) || [],
    checkInCadence: (result.checkInCadence as string[]) || [],
    valueAdds: (result.valueAdds as string[]) || [],
    retentionStrategy: (result.retentionStrategy as string[]) || []
  };
}

async function generateFeedbackPlan(
  offerOutline: any,
  experienceQuestions: any
): Promise<FeedbackPlan> {
  const prompt = `Create a comprehensive feedback collection strategy:

OFFER: ${JSON.stringify(offerOutline)}
FEEDBACK METHOD: ${experienceQuestions.feedbackMethod}
DURATION: ${experienceQuestions.offerDuration}

Create a detailed feedback plan with:
1. Collection methods based on their chosen approach
2. Optimal timing for feedback requests
3. Specific questions to ask at different stages
4. Implementation strategy for using feedback

Focus on gathering actionable feedback that improves the offer and creates testimonials. Return as JSON.`;

  const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
  
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    messages: [{ role: "user", content: userPromptWithJson }],
    max_tokens: 600,
    temperature: 0.7,
  });

  const contentText = getTextFromAnthropicContent(response.content);
  const result = parseAndValidateAiJson(contentText, jsonObjectSchema, {
    context: "feedback plan",
    fallback: {},
  }) as Record<string, unknown>;
  return {
    collectionMethods: (result.collectionMethods as string[]) || [],
    timing: (result.timing as string[]) || [],
    questions: (result.questions as string[]) || [],
    implementation: (result.implementation as string[]) || []
  };
}

function generateFallbackPlan(data: CustomerExperienceData): ComprehensiveExperiencePlan {
  const { experienceQuestions } = data;
  
  return {
    onboarding: {
      welcomeSequence: [
        {
          subject: "Welcome! Your transformation begins now",
          timing: "Immediately after purchase",
          purpose: "Welcome and set expectations",
          keyPoints: ["Confirm purchase", "Set expectations", "Provide login details"],
          callToAction: "Access your materials now"
        },
        {
          subject: "Your roadmap to success (start here)",
          timing: "24 hours after purchase",
          purpose: "Provide clear next steps",
          keyPoints: ["Step-by-step getting started guide", "Timeline overview", "Success tips"],
          callToAction: "Begin lesson 1"
        }
      ],
      clearNextSteps: [
        "Check email for login credentials within 5 minutes",
        "Complete welcome survey to personalize experience",
        "Download getting started guide",
        "Schedule first milestone in calendar"
      ],
      avoidOverwhelm: [
        "Focus on one lesson at a time",
        "Don't skip ahead until current step is complete",
        "Use provided templates instead of starting from scratch",
        "Schedule specific times for program work"
      ],
      keyInformation: [
        "Program duration and timeline",
        "Support contact information",
        "Technical requirements",
        "Expected time commitment per week"
      ]
    },
    delivery: {
      contentList: [
        {
          type: "Video Training",
          title: "Core curriculum videos",
          description: "Main teaching content for each module",
          estimatedTime: "2-3 hours recording per hour of content",
          priority: "high"
        },
        {
          type: "Worksheets",
          title: "Implementation worksheets",
          description: "Practical exercises for each lesson",
          estimatedTime: "30 minutes per worksheet",
          priority: "high"
        },
        {
          type: "Templates",
          title: "Ready-to-use templates",
          description: "Tools customers can customize",
          estimatedTime: "1 hour per template",
          priority: "medium"
        }
      ],
      creationTimeline: [
        "Week 1-2: Create module 1 content",
        "Week 3-4: Create module 2 content", 
        "Week 5-6: Create supporting materials",
        "Week 7-8: Review and polish all content"
      ],
      deliveryMethods: [
        experienceQuestions.deliveryMethod || "Online course platform",
        "Email delivery for worksheets",
        "Private member portal access"
      ],
      qualityStandards: [
        "HD video quality (1080p minimum)",
        "Clear audio without background noise",
        "Professional slide design",
        "Mobile-friendly formats"
      ]
    },
    communication: {
      emailSchedule: [
        {
          subject: "Week 1 check-in: How's it going?",
          timing: "End of week 1",
          purpose: "Check progress and provide support",
          keyPoints: ["Celebrate early wins", "Address common questions", "Provide motivation"],
          callToAction: "Continue to week 2"
        }
      ],
      checkInCadence: [
        `${experienceQuestions.communicationFrequency || 'Weekly'} progress emails`,
        "Midpoint check-in call or survey",
        "Monthly office hours or Q&A sessions"
      ],
      valueAdds: [
        "Weekly tips and insights",
        "Case studies from successful students",
        "Bonus resources and tools",
        "Industry updates and trends"
      ],
      retentionStrategy: [
        "Celebrate milestone achievements",
        "Create peer connection opportunities",
        "Provide ongoing support after completion",
        "Offer advanced training opportunities"
      ]
    },
    feedback: {
      collectionMethods: [
        experienceQuestions.feedbackMethod || "Email surveys",
        "End-of-program interviews",
        "Progress check-in forms"
      ],
      timing: [
        "Midpoint feedback at 50% completion",
        "Final feedback within 1 week of completion",
        "Follow-up feedback 30 days post-completion"
      ],
      questions: [
        "What has been most valuable so far?",
        "What challenges are you facing?",
        "What would you change about the program?",
        "How has this impacted your [specific outcome]?"
      ],
      implementation: [
        "Send feedback surveys via automated email",
        "Compile responses monthly for program improvements",
        "Use positive feedback for testimonials and case studies",
        "Address common issues in updated content"
      ]
    }
  };
}

export function formatComprehensivePlan(plan: ComprehensiveExperiencePlan): string {
  return `# Comprehensive Customer Experience Plan

## 1. ONBOARDING
*Making sure buyers are clear on next steps and not confused or overwhelmed*

### Welcome Email Sequence
${plan.onboarding.welcomeSequence.map((email, index) => 
  `**Email ${index + 1}: ${email.subject}**
- **Timing:** ${email.timing}
- **Purpose:** ${email.purpose}
- **Key Points:** ${email.keyPoints.join(', ')}
- **Call to Action:** ${email.callToAction}`
).join('\n\n')}

### Clear Next Steps for Buyers
${plan.onboarding.clearNextSteps.map(step => `• ${step}`).join('\n')}

### Strategies to Avoid Overwhelming Customers
${plan.onboarding.avoidOverwhelm.map(strategy => `• ${strategy}`).join('\n')}

### Key Information to Provide Upfront
${plan.onboarding.keyInformation.map(info => `• ${info}`).join('\n')}

---

## 2. DELIVERY
*Complete list of all content needed to create for the offer*

### Content Creation Checklist
${plan.delivery.contentList.map(item => 
  `**${item.type}: ${item.title}** (${item.priority} priority)
- Description: ${item.description}
- Estimated Time: ${item.estimatedTime}
${item.dependencies ? `- Dependencies: ${item.dependencies.join(', ')}` : ''}`
).join('\n\n')}

### Creation Timeline
${plan.delivery.creationTimeline.map(timeline => `• ${timeline}`).join('\n')}

### Delivery Methods & Platforms
${plan.delivery.deliveryMethods.map(method => `• ${method}`).join('\n')}

### Quality Standards
${plan.delivery.qualityStandards.map(standard => `• ${standard}`).join('\n')}

---

## 3. ONGOING COMMUNICATION
*Emails and communication to send to customers throughout the program*

### Email Communication Schedule
${plan.communication.emailSchedule.map((email, index) => 
  `**${email.subject}**
- **Timing:** ${email.timing}
- **Purpose:** ${email.purpose}
- **Key Points:** ${email.keyPoints.join(', ')}
- **Call to Action:** ${email.callToAction}`
).join('\n\n')}

### Regular Check-in Cadence
${plan.communication.checkInCadence.map(cadence => `• ${cadence}`).join('\n')}

### Value-Add Content to Share
${plan.communication.valueAdds.map(valueAdd => `• ${valueAdd}`).join('\n')}

### Customer Retention Strategy
${plan.communication.retentionStrategy.map(strategy => `• ${strategy}`).join('\n')}

---

## 4. FEEDBACK
*How to gather feedback based on chosen methods*

### Feedback Collection Methods
${plan.feedback.collectionMethods.map(method => `• ${method}`).join('\n')}

### Optimal Timing for Feedback
${plan.feedback.timing.map(timing => `• ${timing}`).join('\n')}

### Key Questions to Ask
${plan.feedback.questions.map(question => `• ${question}`).join('\n')}

### Implementation Strategy
${plan.feedback.implementation.map(strategy => `• ${strategy}`).join('\n')}

---

*This comprehensive plan ensures every aspect of the customer experience is thoughtfully designed and implemented for maximum satisfaction and results.*`;
}