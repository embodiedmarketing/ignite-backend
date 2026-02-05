import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent } from "../utils/ai-response";
import { 
  evaluateUniquePositioning, 
  evaluateBrandVoice, 
  evaluateCustomerAvatar, 
  evaluateOfferContent, 
  evaluateOfferTransformation, 
  evaluateGeneric,
  evaluateUniquePositioningWithContext,
  evaluateBrandVoiceWithContext,
  evaluateCustomerAvatarWithContext,
  evaluateOfferContentWithContext,
  evaluateOfferTransformationWithContext,
  evaluateGenericWithContext
} from './coaching-evaluators';
import { userMonitoring } from '../utils/user-monitoring';
import { storage } from './storage.service';
import { aiCoachingMonitor } from './ai-coaching-monitor';

// AI operations use a single provider (see config); all prompts use consistent expert-coach voice.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Enhanced rate limiting and caching for multi-user optimization
const responseCache = new Map<string, { response: any; timestamp: number }>();
const userRateLimit = new Map<string, { count: number; resetTime: number }>();

// Per-user rate limiting: 50 requests per hour for 100-user capacity
const RATE_LIMIT_REQUESTS = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Extended cache for 60 minutes to reduce API load with more users
const CACHE_DURATION = 60 * 60 * 1000;

// Force use of comprehensive evaluator for testing
const FORCE_COMPREHENSIVE_EVALUATOR = true;

// Question-specific evaluation (rule-based) mapped to section context.
function getQuestionSpecificEvaluation(section: string, response: string) {
  const sectionLower = section.toLowerCase();
  
  // POSITIONING QUESTIONS
  if (sectionLower.includes("unique positioning") || sectionLower.includes("positioning") || sectionLower.includes("qualified") || sectionLower.includes("expertise")) {
    return evaluateUniquePositioning(response);
  }
  
  // BRAND VOICE QUESTIONS  
  if (sectionLower.includes("brand voice") || sectionLower.includes("voice") || sectionLower.includes("personality") || sectionLower.includes("tone") || sectionLower.includes("communicate") || sectionLower.includes("company values") || sectionLower.includes("values")) {
    return evaluateBrandVoice(response);
  }
  
  // CUSTOMER AVATAR QUESTIONS
  if (sectionLower.includes("customer avatar") || sectionLower.includes("avatar") || sectionLower.includes("ideal customer") || sectionLower.includes("target") || sectionLower.includes("audience") || sectionLower.includes("who")) {
    return evaluateCustomerAvatar(response);
  }
  
  // OFFER TRANSFORMATION AND DREAM QUESTIONS (Foundation)
  if (sectionLower.includes("main transformation") || sectionLower.includes("dream are you making") || sectionLower.includes("transformation you help") || (sectionLower.includes("dream") && sectionLower.includes("customer"))) {
    return evaluateOfferTransformation(response);
  }
  
  // OFFER FOUNDATION QUESTIONS - Must come before generic offer questions
  if (sectionLower.includes("offer foundation") || sectionLower.includes("foundation")) {
    return evaluateOfferContent(response);
  }
  
  // OFFER/PROBLEM/SOLUTION QUESTIONS
  if (sectionLower.includes("offer") || sectionLower.includes("problem") || sectionLower.includes("solution") || sectionLower.includes("transformation") || sectionLower.includes("outcome") || sectionLower.includes("result") || sectionLower.includes("help") || sectionLower.includes("achieve") || sectionLower.includes("deliver")) {
    return evaluateOfferContent(response);
  }
  
  // PRICING QUESTIONS
  if (sectionLower.includes("pricing") || sectionLower.includes("price") || sectionLower.includes("cost") || sectionLower.includes("investment") || sectionLower.includes("value") || sectionLower.includes("worth")) {
    return evaluateOfferContent(response);
  }
  
  // CONTENT/CURRICULUM QUESTIONS
  if (sectionLower.includes("content") || sectionLower.includes("curriculum") || sectionLower.includes("material") || sectionLower.includes("teach") || sectionLower.includes("module") || sectionLower.includes("lesson")) {
    return evaluateOfferContent(response);
  }
  
  // SALES/MARKETING QUESTIONS
  if (sectionLower.includes("sales") || sectionLower.includes("marketing") || sectionLower.includes("promotion") || sectionLower.includes("launch") || sectionLower.includes("strategy") || sectionLower.includes("channel")) {
    return evaluateOfferContent(response);
  }
  
  // CUSTOMER EXPERIENCE QUESTIONS
  if (sectionLower.includes("experience") || sectionLower.includes("journey") || sectionLower.includes("onboarding") || sectionLower.includes("support") || sectionLower.includes("success") || sectionLower.includes("satisfaction")) {
    return evaluateOfferContent(response);
  }
  
  // GENERIC FALLBACK
  return evaluateGeneric(section, response);
}

// Enhanced evaluation function with comprehensive user context for better AI analysis
function getQuestionSpecificEvaluationWithContext(section: string, response: string, userContext: any) {
  const sectionLower = section.toLowerCase();
  
  // POSITIONING QUESTIONS
  if (sectionLower.includes("unique positioning") || sectionLower.includes("positioning") || sectionLower.includes("qualified") || sectionLower.includes("expertise")) {
    return evaluateUniquePositioningWithContext(response, userContext);
  }
  
  // BRAND VOICE QUESTIONS  
  if (sectionLower.includes("brand voice") || sectionLower.includes("voice") || sectionLower.includes("personality") || sectionLower.includes("tone") || sectionLower.includes("communicate") || sectionLower.includes("company values") || sectionLower.includes("values")) {
    return evaluateBrandVoiceWithContext(response, userContext);
  }
  
  // CUSTOMER AVATAR QUESTIONS
  if (sectionLower.includes("customer avatar") || sectionLower.includes("avatar") || sectionLower.includes("ideal customer") || sectionLower.includes("target") || sectionLower.includes("audience") || sectionLower.includes("who")) {
    return evaluateCustomerAvatarWithContext(response, userContext);
  }
  
  // OFFER TRANSFORMATION AND DREAM QUESTIONS (Foundation)
  if (sectionLower.includes("main transformation") || sectionLower.includes("dream are you making") || sectionLower.includes("transformation you help") || (sectionLower.includes("dream") && sectionLower.includes("customer"))) {
    return evaluateOfferTransformationWithContext(response, userContext);
  }
  
  // OFFER FOUNDATION QUESTIONS - Must come before generic offer questions
  if (sectionLower.includes("offer foundation") || sectionLower.includes("foundation")) {
    return evaluateOfferContentWithContext(response, userContext);
  }
  
  // OFFER/PROBLEM/SOLUTION QUESTIONS
  if (sectionLower.includes("offer") || sectionLower.includes("problem") || sectionLower.includes("solution") || sectionLower.includes("transformation") || sectionLower.includes("outcome") || sectionLower.includes("result") || sectionLower.includes("help") || sectionLower.includes("achieve") || sectionLower.includes("deliver")) {
    return evaluateOfferContentWithContext(response, userContext);
  }
  
  // PRICING QUESTIONS
  if (sectionLower.includes("pricing") || sectionLower.includes("price") || sectionLower.includes("cost") || sectionLower.includes("investment") || sectionLower.includes("value") || sectionLower.includes("worth")) {
    return evaluateOfferContentWithContext(response, userContext);
  }
  
  // CONTENT/CURRICULUM QUESTIONS
  if (sectionLower.includes("content") || sectionLower.includes("curriculum") || sectionLower.includes("material") || sectionLower.includes("teach") || sectionLower.includes("module") || sectionLower.includes("lesson")) {
    return evaluateOfferContentWithContext(response, userContext);
  }
  
  // SALES/MARKETING QUESTIONS
  if (sectionLower.includes("sales") || sectionLower.includes("marketing") || sectionLower.includes("promotion") || sectionLower.includes("launch") || sectionLower.includes("strategy") || sectionLower.includes("channel")) {
    return evaluateOfferContentWithContext(response, userContext);
  }
  
  // CUSTOMER EXPERIENCE QUESTIONS
  if (sectionLower.includes("experience") || sectionLower.includes("journey") || sectionLower.includes("onboarding") || sectionLower.includes("support") || sectionLower.includes("success") || sectionLower.includes("satisfaction")) {
    return evaluateOfferContentWithContext(response, userContext);
  }
  
  // GENERIC FALLBACK WITH CONTEXT
  return evaluateGenericWithContext(section, response, userContext);
}

const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_PER_HOUR = 50; // Increased for 100-user capacity

function getCacheKey(section: string, prompt: string, response: string): string {
  return `${section}-${prompt.slice(0, 50)}-${response.slice(0, 100)}`;
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = userRequestCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_PER_HOUR) {
    console.log(`Rate limit exceeded for user ${userId}: ${userLimit.count}/${RATE_LIMIT_PER_HOUR}`);
    return false;
  }
  
  userLimit.count++;
  return true;
}

function getCachedResponse(cacheKey: string): any | null {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📋 Using cached response');
    return cached.response;
  }
  return null;
}

function setCachedResponse(cacheKey: string, response: any): void {
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
}

const podcastInsights = new Map<string, { bestPractices: string[], commonMistakes: string[] }>();

export function addPodcastInsights(section: string, insights: { bestPractices?: string[], commonMistakes?: string[] }) {
  const existing = podcastInsights.get(section) || { bestPractices: [], commonMistakes: [] };
  if (insights.bestPractices) existing.bestPractices.push(...insights.bestPractices);
  if (insights.commonMistakes) existing.commonMistakes.push(...insights.commonMistakes);
  podcastInsights.set(section, existing);
}

interface FeedbackAnalysis {
  level: "needs-more-detail" | "good-start" | "excellent-depth";
  levelDescription: string;
  feedback: string;
  suggestions: string[];
  specificIssues: string[];
  encouragement: string;
  followUpQuestions?: string[];
  interactivePrompts?: string[];
  examples?: string[];
  nextSteps?: string[];
}

const TRAINING_CONTEXT = {
  "Your Unique Positioning": {
    bestPractices: [
      'Share specific credentials, certifications, or years of experience in your field',
      'Tell a personal story about how you developed your unique approach or expertise',
      "Mention specific methodologies, frameworks, or techniques you've developed or mastered",
      "Include concrete results you've achieved that demonstrate your expertise",
      'Explain your unconventional background or path that gives you a different perspective',
      'Connect your unique experience directly to the specific problems your customers face',
      'Use specific numbers, timeframes, or measurable achievements',
      "Mention any notable clients, companies, or projects you've worked with"
    ],
    commonMistakes: [
      "Generic statements like 'I'm passionate about helping people' without specific context",
      'Listing skills or services without explaining your unique approach to them',
      "Being too broad - saying you help 'everyone' instead of being specific",
      'Not providing concrete examples or proof points of your expertise',
      'Failing to connect your background to customer benefits',
      "Using vague language like 'years of experience' without specific details",
      'Not explaining what makes your approach different from competitors'
    ]
  },
  "Brand Voice Development": {
    bestPractices: [
      'Use personality words that are specific and memorable',
      "Ensure your tone matches your target audience's preferences",
      'Be authentic - your voice should feel natural to you',
      "Test your 'I help' statement for clarity and specificity",
      'Include emotional elements that resonate with your audience'
    ],
    commonMistakes: [
      'Using corporate jargon instead of authentic personality',
      "Being too vague in the 'I help' statement",
      'Not considering how your audience wants to be spoken to',
      "Copying someone else's voice instead of finding your own"
    ]
  },
  "Customer Avatar Deep Dive": {
    bestPractices: [
      'Focus on what your customer wants most simply - usually wealth, relationships, or health',
      'Make a detailed list of what your ideal customer says they want in conversation',
      "Ask 'why do they feel they need this?' to understand deeper motivations",
      'Connect surface desires to deeper emotional drivers and pain points',
      'Go beyond demographics to deep emotional drivers and secret fears',
      'Identify specific pain points that keep them awake at night',
      'Understand their perfect day scenario and success vision in detail',
      'Map their complete emotional transformation journey',
      'Know their decision-making process and purchasing behavior',
      'Include specific demographics: age, income, job title for targeting',
      "Understand what they've tried before and why it didn't work",
      'Identify current obstacles blocking their success',
      'Know their information sources and the exact language they use',
      'Define measurable success outcomes and referral triggers',
      "Remember customers judge everything by 'what's in it for me' - always tie back to outcomes"
    ],
    commonMistakes: [
      'Leading with what customers need instead of what they want',
      'Making assumptions about customer motivations without validation',
      'Focusing on features rather than emotional outcomes',
      'Not connecting surface-level wants to deeper transformation needs',
      'Only listing surface-level demographics without emotional depth',
      'Generic pain points that could apply to anyone',
      'Missing the secret fears and confidence triggers',
      'Not understanding their decision-making and purchasing patterns',
      "Forgetting to ask what they've already tried",
      'Missing current obstacles and blockers',
      'Not identifying specific information sources they trust',
      'Using your language instead of their actual words and phrases',
      'Vague success metrics instead of specific, measurable outcomes',
      'Not defining what would make them refer others'
    ]
  },
  "Offer Foundation": {
    bestPractices: [
      'Define the specific transformation you provide - be concrete about the before and after',
      'Connect your offer directly to your customer avatar\'s deepest desires and pain points',
      'Focus on the emotional outcome, not just the tactical steps',
      'Use your customer\'s language when describing the problem and solution',
      'Make the transformation time-bound and measurable for credibility',
      'Connect your unique positioning to why your offer works differently',
      'Address the "why now" - what makes this the right time for this transformation'
    ],
    commonMistakes: [
      'Describing what you do instead of what they get',
      'Being vague about outcomes or timeline',
      'Not connecting to customer avatar insights',
      'Copying other people\'s transformation language',
      'Focusing on features instead of emotional benefits',
      'Not explaining why your approach is different or better'
    ]
  },
  "Offer Structure": {
    bestPractices: [
      'Design delivery method based on customer preferences, not your convenience',
      'Include both core content and implementation support',
      'Build in accountability and progress tracking',
      'Offer multiple ways to engage with the material',
      'Balance high value with realistic delivery capabilities',
      'Create clear milestones and progress markers',
      'Include support systems that ensure success'
    ],
    commonMistakes: [
      'Over-complicating the delivery mechanism',
      'Not considering customer learning preferences',
      'Promising more than you can realistically deliver',
      'Focusing on features instead of experience',
      'Missing accountability and support elements',
      'Not planning for different learning styles'
    ]
  },
  "Pricing Strategy": {
    bestPractices: [
      'Price based on value delivered, not time spent',
      'Consider what they currently spend on the problem',
      'Factor in the cost of NOT solving the problem',
      'Test price points with real potential customers',
      'Prepare confident responses to price objections',
      'Anchor pricing to the transformation value',
      'Consider payment plans that remove financial barriers'
    ],
    commonMistakes: [
      'Underpricing based on your own financial situation',
      'Not researching what customers pay for similar outcomes',
      'Competing on price instead of value',
      'Not testing pricing assumptions',
      'Apologizing for or justifying your prices',
      'Not considering the full customer lifetime value'
    ]
  },
  "Offer Presentation": {
    bestPractices: [
      'Lead with the problem they desperately want solved',
      'Use their language from customer interviews',
      'Address objections before they think them',
      'Include social proof and success stories',
      'Create urgency through scarcity or timing',
      'Paint a clear picture of their transformation',
      'Make the next step obvious and easy'
    ],
    commonMistakes: [
      'Starting with credentials instead of customer problems',
      'Using industry jargon instead of customer language',
      'Not addressing obvious concerns upfront',
      'Weak or generic calls to action',
      'Missing emotional connection in the presentation',
      'Not providing clear next steps'
    ]
  }
};

function mapSectionToContext(sectionTitle: string): string {
  const cleanTitle = sectionTitle.trim();
  if (cleanTitle in TRAINING_CONTEXT) return cleanTitle;
  
  const titleMap: Record<string, string> = {
    "positioning": "Your Unique Positioning",
    "unique positioning": "Your Unique Positioning",
    "brand voice": "Brand Voice Development",
    "voice": "Brand Voice Development",
    "customer avatar": "Customer Avatar Deep Dive",
    "avatar": "Customer Avatar Deep Dive",
    "target customer": "Customer Avatar Deep Dive"
  };
  
  const lowerTitle = cleanTitle.toLowerCase();
  for (const [key, value] of Object.entries(titleMap)) {
    if (lowerTitle.includes(key)) return value;
  }
  
  return cleanTitle;
}

export async function analyzeResponse(
  section: string,
  prompt: string,
  response: string,
  questionType: string,
  userId: string
): Promise<FeedbackAnalysis> {
  // Track user activity
  userMonitoring.trackUserActivity(parseInt(userId), 'ai_feedback_requested', { section, responseLength: response.length });

  // Skip analysis for very short responses
  if (response.trim().length < 3) {
    console.log("Response too short, returning needs-more-detail");
    userMonitoring.trackUserActivity(parseInt(userId), 'ai_feedback_error', { 
      section, 
      error: 'response_too_short',
      responseLength: response.length 
    });
    return {
      level: "needs-more-detail",
      levelDescription: "Response too brief",
      feedback: "Please provide a more detailed response to get meaningful feedback.",
      suggestions: ["Add more specific details", "Share your thoughts more completely"],
      specificIssues: ["Response is too short"],
      encouragement: "Don't worry - just share more of your thinking!"
    };
  }

  console.log("=== ANALYZING RESPONSE ===");
  console.log("Section:", `"${section}"`);
  console.log("Response length:", response.length);
  console.log("User ID:", userId);
  console.log("Response text:", response.substring(0, 200) + "...");

  try {
    // Gather comprehensive user information for enhanced AI analysis
    let userContext = {};
    try {
      const { storage } = await import('../services/storage.service');
      const userObj = await storage.getUser(parseInt(userId));
      
      if (userObj) {
        // Get user profile information
        userContext = {
          email: userObj.email,
          firstName: userObj.firstName,
          lastName: userObj.lastName,
          businessName: '', // businessName not available in current schema
          industry: '' // industry not available in current schema
        };

        // Get user's other responses for context
        const allResponses = await storage.getWorkbookResponsesByUser(parseInt(userId));
        const messagingStrategy = await storage.getActiveMessagingStrategy(parseInt(userId));
        const offerOutlines = await storage.getUserOfferOutlinesByUser(parseInt(userId));
        
        // Add response history context
        if (allResponses && allResponses.length > 0) {
          userContext = {
            ...userContext,
            previousResponses: allResponses.slice(-10), // Last 10 responses for context
            totalResponseCount: allResponses.length
          };
        }

        // Add messaging strategy context
        if (messagingStrategy) {
          userContext = {
            ...userContext,
            messagingStrategy: {
              content: messagingStrategy.content?.substring(0, 500) + '...', // Truncated for token efficiency
              completionPercentage: messagingStrategy.completionPercentage
            }
          };
        }

        // Add offer outline context
        if (offerOutlines && offerOutlines.length > 0) {
          const activeOutline = offerOutlines.find((o: any) => o.isActive) || offerOutlines[0];
          userContext = {
            ...userContext,
            offerOutline: {
              title: activeOutline.title,
              content: activeOutline.content?.substring(0, 300) + '...', // Truncated for token efficiency
              completionPercentage: activeOutline.completionPercentage
            }
          };
        }
      }
    } catch (contextError) {
      console.log("Could not gather user context:", contextError);
    }

    // Always use comprehensive question evaluator with enhanced context
    console.log("Using comprehensive question evaluator with user context for enhanced results");
    const result = getQuestionSpecificEvaluationWithContext(section, response, userContext);
    
    console.log("Evaluation result level:", result.level);
    console.log("Evaluation result feedback:", result.feedback.substring(0, 100) + "...");
    
    // Track successful feedback
    userMonitoring.trackUserActivity(parseInt(userId), 'ai_feedback_success', { 
      section, 
      level: result.level,
      responseLength: response.length 
    });

    // Log coaching event for real-time monitoring
    if (userId && userId !== "anonymous") {
      try {
        // Import storage dynamically to avoid circular dependency
        const { storage } = await import('../services/storage.service');
        const userObj = await storage.getUser(parseInt(userId));
        if (userObj) {
          await aiCoachingMonitor.logCoachingEvent({
            userId: userObj.id,
            userEmail: userObj.email,
            section,
            questionContext: prompt, // Use prompt since questionContext isn't defined here
            userResponse: response,
            aiLevel: result.level,
            aiLevelDescription: result.levelDescription,
            aiFeedback: result.feedback,
            responseLength: response.length
          });
        }
      } catch (monitorError) {
        console.error("Failed to log coaching event:", monitorError);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error in AI feedback analysis:", error);
    userMonitoring.trackUserActivity(parseInt(userId), 'ai_feedback_error', { 
      section, 
      error: error instanceof Error ? error.message : 'unknown_error',
      responseLength: response.length 
    });
    
    // Return fallback response
    return {
      level: "good-start",
      levelDescription: "Analysis temporarily unavailable",
      feedback: "Your response shows good thinking. AI analysis is temporarily unavailable, but you're on the right track.",
      suggestions: ["Continue developing your thoughts", "Add more specific details when possible"],
      specificIssues: [],
      encouragement: "Keep going - you're making progress!"
    };
  }
}

export async function expandAndDeepen(initialResponse: string, questionContext: string, questionType: string): Promise<string> {
  try {
    const contextKey = mapSectionToContext(questionType);
    const trainingData = TRAINING_CONTEXT[contextKey as keyof typeof TRAINING_CONTEXT];
    
    const bestPractices = trainingData?.bestPractices || [];

    const prompt = `
You are an expert business coach helping entrepreneurs develop deeper, more compelling responses. Help them expand their thoughts with depth and emotion.

Question: "${questionContext}"
Section: "${questionType}"
Initial Response: "${initialResponse}"

Best Practices for this question:
${bestPractices.join('\n- ')}

COMPREHENSIVE USER CONTEXT (use this information to provide highly personalized and relevant expansion):
- User Profile: This entrepreneur is building their business strategy and messaging
- Business Development Stage: Currently working through their foundational business elements
- Response History: Part of a systematic approach to developing their business positioning
- Goal: Create authentic, compelling content that resonates with their ideal customers

Your task is to help them expand this response with much more depth and emotion by:

1. PULL OUT THE STORY: Ask follow-up questions in your mind and then answer them based on what they started. What's the personal story behind this? What specific moment or experience shaped this?

2. ADD EMOTIONAL DEPTH: What emotions drive this? What fears, desires, or motivations are underneath? Help them connect to the emotional core.

3. GET SPECIFIC: Replace any vague language with concrete examples, numbers, timeframes, and specific details.

4. SHOW DON'T TELL: Instead of saying "I'm experienced," show through specific examples and stories.

5. CONNECT TO CUSTOMER VALUE: How does this specifically help their ideal customer? What transformation does it create?

6. ADD VULNERABILITY: What challenges did they overcome? What did they learn the hard way?

Expand their response to be 3-4x longer with rich detail, specific examples, personal stories, and emotional depth. Write in their voice but make it much more compelling and complete.

Return only the expanded response, ready to use.
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const contentText = getTextFromAnthropicContent(response.content);
    return contentText.trim() || initialResponse;
  } catch (error) {
    console.error("Response expansion failed:", error);
    
    // Provide helpful expansion guidance when AI is unavailable
    const expandedResponse = `${initialResponse}

AI expansion is temporarily unavailable, but here are some ways you could deepen this response:

• Add specific examples from your experience
• Include quantifiable results or timeframes
• Explain the "why" behind your approach
• Share a brief story that illustrates your point
• Connect this to how it benefits your ideal customer

Consider expanding your response with these elements to make it more compelling and specific.`;
    
    return expandedResponse;
  }
}

export async function cleanupAudioTranscript(transcript: string, questionContext: string): Promise<string> {
  try {
    const prompt = `
You are an expert editor helping entrepreneurs refine their verbal responses. Clean up this audio transcript while preserving the speaker's authentic voice and key insights.

Question Context: "${questionContext}"
Raw Transcript: "${transcript}"

Your task:
1. Fix grammar, remove filler words (um, uh, like), and improve sentence structure
2. Maintain the speaker's authentic voice and personality
3. Preserve all key insights and specific details
4. Organize thoughts into clear, coherent paragraphs
5. Keep the conversational, personal tone but make it professional
6. Don't add information that wasn't mentioned
7. If the response seems incomplete for the question, preserve what was said but don't fabricate

Return only the cleaned-up text, ready to be used as their written response.
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const contentText = getTextFromAnthropicContent(response.content);
    return contentText.trim() || transcript;
  } catch (error) {
    console.error("Audio transcript cleanup failed:", error);
    // Return cleaned transcript with basic cleanup
    return transcript
      .replace(/\b(um|uh|like|you know|so|well)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export async function generateImprovementSuggestions(
  section: string,
  currentResponse: string
): Promise<string[]> {
  const contextKey = mapSectionToContext(section);
  const context = TRAINING_CONTEXT[contextKey as keyof typeof TRAINING_CONTEXT];
  
  if (!context) {
    return [
      "Add more specific details and examples",
      "Include personal experience or stories",
      "Connect to customer benefits and outcomes"
    ];
  }

  // Generate context-aware suggestions
  const suggestions = [];
  
  if (!currentResponse.match(/\d+/)) {
    suggestions.push("Include specific numbers, timeframes, or quantifiable results");
  }
  
  if (!currentResponse.includes("story") && !currentResponse.includes("experience")) {
    suggestions.push("Share a personal story or experience that illustrates your point");
  }
  
  if (currentResponse.length < 100) {
    suggestions.push("Expand with more detailed explanation and examples");
  }
  
  // Add 1-2 best practices as suggestions
  suggestions.push(...context.bestPractices.slice(0, 2));
  
  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

// Export responseCache for health monitoring
export { responseCache };