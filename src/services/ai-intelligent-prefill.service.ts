import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { validateAnthropicResponse } from "../utils/anthropic-validator";

// Using Claude Sonnet 4 (claude-sonnet-4-20250514) for high-quality prefill generation
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface IntelligentPrefillResult {
  prefillText: string;
  reasoning: string;
}

export async function generateIntelligentPrefill(
  questionText: string,
  messagingStrategy: string,
  userId: string = "anonymous"
): Promise<IntelligentPrefillResult> {
  
  try {
    // Analyze the question type to determine the appropriate prefill approach
    const questionType = analyzeQuestionType(questionText);
    
    const prompt = `You are an expert business coach helping an entrepreneur create perfect offer foundation responses. 

USER'S COMPLETED MESSAGING STRATEGY:
${messagingStrategy}

CURRENT QUESTION: "${questionText}"

QUESTION TYPE ANALYSIS: ${questionType.type}
REQUIRED FORMAT: ${questionType.format}
KEY ELEMENTS: ${questionType.elements.join(", ")}

YOUR TASK:
Create a PERFECT, READY-TO-USE response for this specific question using their messaging strategy data. Follow these critical guidelines:

${questionType.instructions}

CRITICAL REQUIREMENTS:
1. Extract relevant information from their messaging strategy above
2. Format it exactly as the question requires (${questionType.format})
3. Use their customer's language and perspective when appropriate
4. Make it specific, compelling, and conversion-focused
5. Ensure it flows naturally and feels authentic to their voice

EXAMPLES OF PERFECT RESPONSES:
${questionType.examples}

Create the response now. Return ONLY the response text that should be placed in the text area - no additional commentary, explanations, or quotation marks.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    // Validate text response structure
    const TextResponseSchema = z.object({
      content: z.array(z.object({
        type: z.literal("text"),
        text: z.string()
      })).min(1)
    });
    
    const validatedResponse = validateAnthropicResponse(
      response,
      TextResponseSchema,
      "INTELLIGENT_PREFILL"
    );
    
    const prefillText = validatedResponse.content[0].text.trim();
    
    return {
      prefillText,
      reasoning: `Generated ${questionType.type} response using messaging strategy insights`
    };

  } catch (error: any) {
    console.error("Intelligent prefill error:", error);
    
    // Handle rate limit errors gracefully
    if (error?.status === 429) {
      return {
        prefillText: generateFallbackPrefill(questionText),
        reasoning: "Generated fallback response due to API rate limits"
      };
    }
    
    throw new Error("Failed to generate intelligent prefill");
  }
}

function analyzeQuestionType(questionText: string): {
  type: string;
  format: string;
  elements: string[];
  instructions: string;
  examples: string;
} {
  const question = questionText.toLowerCase();
  
  // Transformation question (requires clear transformation statement from provider perspective)
  if (question.includes("main transformation") || question.includes("transformation you help")) {
    return {
      type: "transformation-statement",
      format: "Clear statement of what transformation you provide (provider perspective)",
      elements: ["specific transformation", "measurable outcome", "customer benefit"],
      instructions: `- Write from YOUR perspective as the provider describing what you help achieve
- Make it specific and measurable, not vague
- Focus on the transformation/outcome you deliver
- Should read naturally when customer says "I want [this transformation]"
- Examples: "Build a consistent $10K/month business" NOT "I want to build..."`,
      examples: `"Build a consistent $10K/month business working 25 hours per week"
"Transform from stressed overwhelmed entrepreneur to confident industry authority"
"Go from chasing clients to having a waitlist of premium prospects"`
    };
  }
  
  // Problem-solution mapping question
  if (question.includes("specific problem") && question.includes("how your offer will solve")) {
    return {
      type: "problem-solution-mapping",
      format: "List of specific problems paired with exact solutions",
      elements: ["customer pain points", "specific solutions", "clear problem-solution pairs"],
      instructions: `- Extract customer frustrations, pain points, and challenges from their messaging strategy
- For each problem, create a specific solution that their offer provides
- Use the format: "Problem: [specific issue] → Solution: [how offer addresses it]"
- Focus on both emotional problems (overwhelm, fear) and practical problems (time, tools)
- Make solutions concrete and specific, not vague promises`,
      examples: `"Problem: Overwhelmed by social media posting → Solution: 30 days of done-for-you content templates
Problem: Don't know what to post → Solution: Step-by-step content calendar with proven post types
Problem: Inconsistent engagement → Solution: Audience-tested engagement strategies that get responses"`
    };
  }

  // Dream/magic wand question (requires one sentence, aspirational)
  if (question.includes("dream") && question.includes("making come true")) {
    return {
      type: "dream-statement",
      format: "One powerful sentence describing the ultimate customer dream",
      elements: ["aspirational outcome", "emotional fulfillment", "customer language"],
      instructions: `- Create ONE sentence describing their customer's ultimate dream/aspiration
- Use inspirational, aspirational language that captures their deepest desire
- Focus on the transformation of their entire life/business, not just solving a problem
- Make it emotionally compelling and motivating`,
      examples: `"To be recognized as the go-to expert in their field while working fewer hours"
"To build a thriving business that gives them complete freedom and fulfillment"
"To become the authority everyone seeks out for their unique expertise"`
    };
  }
  
  // Differentiation question (requires specific approach/methodology)
  if (question.includes("makes your approach different") || question.includes("differentiation")) {
    return {
      type: "differentiation-statement",
      format: "Clear explanation of unique methodology or approach",
      elements: ["unique method", "specific process", "competitive advantage"],
      instructions: `- Extract their unique positioning and methodology from the messaging strategy
- Focus on what makes their approach specifically different from competitors
- Include their unique background, experience, or methodology if mentioned
- Make it concrete and specific, not generic claims`,
      examples: `"My 'Authority Without Exhaustion' methodology focuses on strategic positioning rather than working harder"
"Unlike other coaches who teach theory, I combine Fortune 500 experience with trauma-informed coaching"
"My system helps clients build expertise-based businesses through relationship-building instead of traditional marketing"`
    };
  }
  
  // Compelling offer headline (requires benefit-focused, numbers, urgency)
  if (question.includes("compelling offer headline") || question.includes("offer headline")) {
    return {
      type: "offer-headline",
      format: "Compelling headline with transformation, timeline, and specificity",
      elements: ["specific outcome", "timeframe", "target audience", "unique method"],
      instructions: `- Create a headline that focuses on the transformation/outcome, not the process
- Include specific numbers, timeframes, or measurable results when possible
- Use their target customer language and pain points from messaging strategy
- Make it benefit-focused and urgency-driven
- Format: [Specific Outcome] + [Timeline] + [For Target Audience] + [Using Unique Method]
- Examples: "Get Your First 100 Paying Customers in 90 Days" vs "Marketing Masterclass"`,
      examples: `"Transform Your Expertise Into a $10K/Month Business in 6 Weeks"
"Go From Overwhelmed Freelancer to Booked-Out Authority in 90 Days"
"Build a Waitlist of Premium Clients While Working 25 Hours Per Week"
"The Authority Framework: Turn Your Knowledge Into a $100K Coaching Business"`
    };
  }
  
  // Default for other offer foundation questions
  return {
    type: "general-offer-response",
    format: "Clear, specific response that builds on messaging strategy",
    elements: ["specific details", "customer focus", "value proposition"],
    instructions: `- Extract relevant information from their messaging strategy
- Make it specific and detailed rather than generic
- Focus on customer benefits and outcomes
- Use confident, authoritative language`,
    examples: `Specific examples based on their unique situation and messaging strategy`
  };
}

function generateFallbackPrefill(questionText: string): string {
  const question = questionText.toLowerCase();
  
  if (question.includes("specific problem") && question.includes("how your offer will solve")) {
    return `Problem: Lack clear direction and strategy → Solution: Step-by-step roadmap with proven framework
Problem: Overwhelmed by too many options → Solution: Simplified approach focusing on what actually works
Problem: Struggling to see consistent results → Solution: Systematic process with measurable milestones
Problem: Don't know what steps to take next → Solution: Clear action plan with prioritized next steps`;
  }
  
  if (question.includes("main transformation")) {
    return "Transform from feeling stuck and uncertain to confident and achieving consistent results";
  }
  
  if (question.includes("dream") && question.includes("making come true")) {
    return "To achieve the success and fulfillment they've always envisioned for themselves";
  }
  
  if (question.includes("makes your approach different")) {
    return "My unique combination of proven strategies and personalized guidance that addresses both mindset and practical implementation";
  }
  
  return "Based on your customer's specific needs and your unique expertise, craft a response that demonstrates clear value and differentiation.";
}