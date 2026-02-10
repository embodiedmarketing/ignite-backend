import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { topicIdeasResponseSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY } from "../shared/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface MessagingStrategy {
  [key: string]: string;
}

interface TopicIdea {
  title: string;
  description: string;
  emotionalHook: string;
  contentType: string;
  keyPoints: string[];
  reelIdeas: string[];
}

interface TopicIdeaResult {
  topicIdeas: TopicIdea[];
  strategicInsights: string[];
}

function validateMessagingStrategy(strategy: MessagingStrategy): { isValid: boolean; message: string } {
  if (!strategy || typeof strategy !== 'object') {
    return {
      isValid: false,
      message: "Please complete your Messaging Strategy in Step 1 first. We need your customer avatar and positioning information to generate relevant content ideas."
    };
  }

  // Get all strategy values and check if we have substantial content
  const allValues = Object.values(strategy);
  const substantialResponses = allValues.filter(value => 
    value && typeof value === 'string' && value.trim().length > 20
  );

  // Check for customer avatar related content (more flexible pattern matching)
  const avatarKeywords = ['customer', 'frustration', 'problem', 'pain', 'demographic', 'awake', 'worry', 'age', 'income', 'job', 'title'];
  const hasAvatarInfo = Object.entries(strategy).some(([key, value]) => {
    if (!value || typeof value !== 'string' || value.trim().length < 20) return false;
    const keyLower = key.toLowerCase();
    return avatarKeywords.some(keyword => keyLower.includes(keyword));
  });

  // Check for positioning/business info (more flexible pattern matching)
  const positioningKeywords = ['business', 'qualified', 'unique', 'start', 'values', 'company', 'why', 'positioning'];
  const hasPositioningInfo = Object.entries(strategy).some(([key, value]) => {
    if (!value || typeof value !== 'string' || value.trim().length < 20) return false;
    const keyLower = key.toLowerCase();
    return positioningKeywords.some(keyword => keyLower.includes(keyword));
  });

  // Require at least 3 substantial responses total
  if (substantialResponses.length < 3) {
    return {
      isValid: false,
      message: "Please complete more questions in Step 1 (Your Messaging). We need at least 3 substantial responses to generate relevant content ideas."
    };
  }

  if (!hasAvatarInfo) {
    return {
      isValid: false,
      message: "Please complete your Customer Avatar questions in Step 1 (Your Messaging). We need to understand your ideal customer to create relevant content ideas."
    };
  }

  if (!hasPositioningInfo) {
    return {
      isValid: false,
      message: "Please complete your Unique Positioning questions in Step 1 (Your Messaging). We need your positioning and values to generate strategic content ideas."
    };
  }

  return { isValid: true, message: "" };
}

export async function generateTopicIdeas(
  messagingStrategy: MessagingStrategy,
  userId: string
): Promise<TopicIdeaResult> {
  // First, validate that we have sufficient data
  const validationResult = validateMessagingStrategy(messagingStrategy);
  if (!validationResult.isValid) {
    throw new Error(`INSUFFICIENT_DATA: ${validationResult.message}`);
  }

  try {
    // Extract key insights from messaging strategy
    const customerAvatar = extractCustomerAvatar(messagingStrategy);
    const painPoints = extractPainPoints(messagingStrategy);
    const transformation = extractTransformation(messagingStrategy);
    const positioning = extractPositioning(messagingStrategy);

    const prompt = `<prompt>
  <task>Generate 6 highly specific, emotionally-driven content topic ideas based on messaging strategy.</task>
  
  <inputs>
    <customer_avatar>
      <![CDATA[
${customerAvatar}
      ]]>
    </customer_avatar>
    <pain_points_emotions>
      <![CDATA[
${painPoints}
      ]]>
    </pain_points_emotions>
    <transformation_outcomes>
      <![CDATA[
${transformation}
      ]]>
    </transformation_outcomes>
    <unique_positioning>
      <![CDATA[
${positioning}
      ]]>
    </unique_positioning>
  </inputs>
  
  <content_strategy_framework>
    <principle number="1">Focus on the emotional journey from pain → hope → transformation</principle>
    <principle number="2">Address specific fears, frustrations, and secret worries</principle>
    <principle number="3">Provide actionable value that builds trust and authority</principle>
    <principle number="4">Create content that feels like it was written specifically for them</principle>
    <principle number="5">Mix educational, inspirational, and behind-the-scenes content</principle>
  </content_strategy_framework>
  
  <topic_requirements>
    <requirement>Compelling title that hooks their attention</requirement>
    <requirement>Description of the content focus and value</requirement>
    <requirement>Specific emotional hook that connects to their pain/desire</requirement>
    <requirement>Content type (blog post, video, social post, email, etc.)</requirement>
    <requirement>3-4 key points to cover</requirement>
    <requirement>3-4 specific reel/short video ideas that bring this topic to life</requirement>
  </topic_requirements>
  
  <output_format>
    <format>JSON</format>
    <schema>
      <![CDATA[
{
  "topicIdeas": [
    {
      "title": "specific compelling title",
      "description": "what this content covers and why it matters",
      "emotionalHook": "the specific emotion/pain point this addresses",
      "contentType": "format recommendation",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
      "reelIdeas": ["specific reel concept 1", "specific reel concept 2", "specific reel concept 3"]
    }
  ],
  "strategicInsights": ["insight about their content strategy"]
}
      ]]>
    </schema>
    <requirement>Generate 6 topic ideas</requirement>
    <requirement>Make each topic idea feel personal and specific to their exact customer avatar and emotional landscape</requirement>
    <requirement>Avoid generic advice - make it feel like you understand their customer deeply</requirement>
  </output_format>
</prompt>`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt + PROMPT_JSON_ONLY }],
      max_tokens: 2000,
      temperature: 0.8
    });

    const contentText = getTextFromAnthropicContent(response.content);
    const result = parseAndValidateAiJson(contentText, topicIdeasResponseSchema, {
      context: "topic ideas",
      fallback: { topicIdeas: [], strategicInsights: [] },
    });
    return result;

  } catch (error) {
    console.error('Error generating topic ideas:', error);
    
    // Fallback with strategic topic templates
    return generateFallbackTopics(messagingStrategy);
  }
}

function extractCustomerAvatar(strategy: MessagingStrategy): string {
  const avatarFields = [
    'What are your ideal customer\'s demographics (age range, income level, job title, gender)?',
    'What does your ideal customer\'s frustration look like day-to-day?',
    'What keeps your ideal customer awake at night worrying?',
    'What is your ideal customer\'s secret fear?',
    'What would your ideal customer\'s perfect day look like after working with you?'
  ];
  
  const avatarInfo = avatarFields.map(field => {
    const value = strategy[field];
    return value ? `${field}: ${value}` : '';
  }).filter(Boolean).join('\n');

  return avatarInfo || 'Customer avatar information not fully defined';
}

function extractPainPoints(strategy: MessagingStrategy): string {
  const painFields = [
    'What does your ideal customer\'s frustration look like day-to-day?',
    'What keeps your ideal customer awake at night worrying?',
    'What is your ideal customer\'s secret fear?',
    'What have they tried before that hasn\'t worked?',
    'What stops your ideal customer from taking action?'
  ];
  
  const painInfo = painFields.map(field => {
    const value = strategy[field];
    return value ? `${field}: ${value}` : '';
  }).filter(Boolean).join('\n');

  return painInfo || 'Pain points not fully defined';
}

function extractTransformation(strategy: MessagingStrategy): string {
  const transformationFields = [
    'What would your ideal customer\'s perfect day look like after working with you?',
    'If you had a magic wand, what dream would you make come true for your customers?',
    'What transformation do you provide?',
    'What specific outcomes do your customers achieve?'
  ];
  
  const transformationInfo = transformationFields.map(field => {
    const value = strategy[field];
    return value ? `${field}: ${value}` : '';
  }).filter(Boolean).join('\n');

  return transformationInfo || 'Transformation outcomes not fully defined';
}

function extractPositioning(strategy: MessagingStrategy): string {
  const positioningFields = [
    'WHY did you start your business? What makes you uniquely qualified to help your customers?',
    'What are your company values that you\'d want to come through in your messaging?',
    'What makes you different from others in your space?',
    'What is your unique approach or method?'
  ];
  
  const positioningInfo = positioningFields.map(field => {
    const value = strategy[field];
    return value ? `${field}: ${value}` : '';
  }).filter(Boolean).join('\n');

  return positioningInfo || 'Unique positioning not fully defined';
}

function generateFallbackTopics(strategy: MessagingStrategy): TopicIdeaResult {
  // Strategic fallback topics based on common entrepreneurial themes
  const fallbackTopics: TopicIdea[] = [
    {
      title: "The 3 Biggest Mistakes I See [Target Audience] Making (And How to Fix Them)",
      description: "Address common mistakes your ideal customers make, showing your expertise while providing immediate value",
      emotionalHook: "Fear of making costly mistakes and wasting time/money",
      contentType: "Educational blog post or video",
      keyPoints: [
        "Identify the most common mistakes in your field",
        "Explain why these mistakes happen (often emotional/mindset reasons)",
        "Provide specific, actionable solutions",
        "Share a client success story demonstrating the transformation"
      ],
      reelIdeas: [
        "Quick countdown: '3 mistakes that cost you money' with visual text overlays",
        "Before/after transformation showing client results from avoiding these mistakes",
        "POV: You're making these mistakes (relatable scenario acting)",
        "Behind-the-scenes of you helping a client fix these exact issues"
      ]
    },
    {
      title: "Behind the Scenes: My Personal Journey from [Pain Point] to [Transformation]",
      description: "Share your authentic story of overcoming the same challenges your customers face",
      emotionalHook: "Connection through shared experience and hope for transformation",
      contentType: "Personal story post or video",
      keyPoints: [
        "Be vulnerable about your struggles",
        "Detail the specific moment you decided to change",
        "Share the exact steps you took to transform",
        "Connect your journey to your customer's potential transformation"
      ],
      reelIdeas: [
        "Day in the life comparison: 'Then vs Now' showing your transformation",
        "Vulnerability moment: sharing your lowest point with authentic emotion",
        "Timeline reel: key moments in your transformation journey",
        "Get ready with me while sharing your story (relatable morning routine)"
      ]
    },
    {
      title: "What Nobody Tells You About [Customer's Goal] (The Real Truth)",
      description: "Reveal insider knowledge or uncomfortable truths about achieving their desired outcome",
      emotionalHook: "Frustration with surface-level advice and craving authentic guidance",
      contentType: "Authority-building educational content",
      keyPoints: [
        "Bust common myths in your industry",
        "Share what really works vs. what sounds good",
        "Address the emotional/mindset component",
        "Provide a realistic roadmap forward"
      ],
      reelIdeas: [
        "Reaction video to common industry advice with 'This is wrong because...'",
        "Split screen showing what people think vs reality",
        "Behind-the-scenes truth that no one talks about",
        "Quick myth-busting series with shocking statistics"
      ]
    },
    {
      title: "Why I Used to [Past Limiting Belief] and How It Nearly Cost Me Everything",
      description: "Share a transformative mindset shift that your customers also need to make",
      emotionalHook: "Recognition of their own limiting beliefs and desire for breakthrough",
      contentType: "Transformational story content",
      keyPoints: [
        "Describe the limiting belief you held",
        "Show how it was sabotaging your results",
        "Detail the moment of realization",
        "Explain how this shift changed everything"
      ],
      reelIdeas: [
        "Before/after mindset shift with powerful text overlay",
        "Recreating the exact moment of realization dramatically",
        "Reading old journal entries showing limiting beliefs",
        "Walking viewers through your thought process transformation"
      ]
    },
    {
      title: "[Customer Avatar]'s Guide to [Specific Outcome] in [Timeframe]",
      description: "Create a practical, step-by-step guide tailored specifically to their situation",
      emotionalHook: "Hope for achievable progress and customized guidance",
      contentType: "Comprehensive guide or tutorial",
      keyPoints: [
        "Address their specific starting point and challenges",
        "Break down the process into manageable steps",
        "Include potential obstacles and how to overcome them",
        "End with encouragement and next steps"
      ],
      reelIdeas: [
        "Step-by-step process breakdown with visual demonstrations",
        "Day in your life implementing these exact steps",
        "Quick wins they can achieve in the first week",
        "Common obstacles series with solutions for each"
      ]
    },
    {
      title: "The Day I Realized [Industry Standard] Was Completely Wrong",
      description: "Challenge conventional wisdom in your field with your unique perspective",
      emotionalHook: "Validation for feeling frustrated with standard approaches",
      contentType: "Thought leadership content",
      keyPoints: [
        "Identify the conventional wisdom you disagree with",
        "Share your contrarian perspective and why",
        "Provide evidence or examples supporting your view",
        "Guide them toward your better approach"
      ],
      reelIdeas: [
        "Controversial take with dramatic 'everyone does this wrong' opening",
        "Side-by-side comparison of standard vs your approach",
        "Results reveal showing why your way works better",
        "Industry insider exposing the truth behind common advice"
      ]
    }
  ];

  return {
    topicIdeas: fallbackTopics,
    strategicInsights: [
      "Focus on emotional connection before information sharing",
      "Share your authentic journey to build trust and relatability",
      "Address specific fears and frustrations rather than surface-level topics",
      "Mix educational value with personal vulnerability for maximum impact"
    ]
  };
}