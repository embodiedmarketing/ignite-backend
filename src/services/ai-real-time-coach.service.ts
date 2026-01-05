import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { validateAnthropicResponse } from "../utils/anthropic-validator";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RealTimeFeedback {
  status: "typing" | "good-start" | "developing" | "strong";
  encouragement: string;
  suggestions?: string[];
  examples?: string[];
  rewording?: string;
  reasoning?: string;
  nextSteps?: string[];
}

/**
 * Provides real-time, collaborative AI coaching feedback for Strategic Messaging questions.
 * This replaces the button-triggered "Expand with AI Coach" model with live, constructive feedback.
 */
export async function getRealTimeFeedback(
  question: string,
  userResponse: string,
  sectionContext: string
): Promise<RealTimeFeedback> {
  // Don't provide feedback for very short responses (user is still typing)
  if (userResponse.trim().length < 20) {
    return {
      status: "typing",
      encouragement: "Keep going! Share your thoughts...",
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      temperature: 0.7,
      system: `You are a supportive, encouraging AI coach helping entrepreneurs develop their strategic messaging. Your role is to provide real-time, collaborative feedback as they write their responses.

TONE & APPROACH:
- Be warm, encouraging, and constructive (never judgmental or critical)
- Celebrate what's working before suggesting improvements
- Use "I notice..." and "Have you considered..." instead of "You should..." or "This needs..."
- Make users feel like they're thinking alongside an expert, not being corrected

FEEDBACK STRUCTURE:
1. Start with genuine encouragement about what's strong in their response
2. Offer 2-3 specific, actionable suggestions for deepening their answer
3. Provide concrete examples or rewording to illustrate your suggestions
4. Explain WHY the suggestions matter (connect to customer impact)
5. End with a motivating next step

EXAMPLES OF GOOD FEEDBACK:
"Great start! I can see you understand your customer's pain point. To make this even more compelling, consider adding: (1) A specific story or scenario that shows this pain in action, and (2) The emotional impact it has on them. For example: 'They're not just stressed about deadlines - they're lying awake at 3am wondering if they'll lose clients.'"

"I love how specific you're being here! This is strong. One way to deepen it: connect your unique approach to a tangible outcome. Instead of just saying what you do differently, show what that difference creates for the customer."

AVOID:
- Generic "this needs to be better" comments
- Overwhelming lists of problems
- Academic or overly formal language
- Implying their work is wrong or inadequate

Remember: You're a collaborator helping them refine great ideas, not a teacher grading their work.`,
      messages: [
        {
          role: "user",
          content: `Question Context: ${sectionContext}

Question: ${question}

User's Response:
${userResponse}

Provide encouraging, constructive feedback that helps them deepen and refine their response. Include specific examples, rewording suggestions, and explain your reasoning. Make it feel collaborative, not corrective.`,
        },
      ],
    });

    // Validate response structure (text response)
    const TextResponseSchema = z.object({
      content: z.array(z.object({
        type: z.literal("text"),
        text: z.string().min(1)
      })).min(1)
    });
    
    const validatedResponse = validateAnthropicResponse(
      response,
      TextResponseSchema,
      "REAL_TIME_COACH"
    );
    
    const feedbackText = validatedResponse.content[0].text;

    // Parse the AI response into structured feedback
    const feedback = parseFeedbackResponse(feedbackText, userResponse);
    
    return feedback;
  } catch (error) {
    console.error("[REAL-TIME COACH] Error generating feedback:", error);
    
    // Return encouraging fallback feedback
    return {
      status: "good-start",
      encouragement: "You're on the right track! Keep developing your thoughts.",
      suggestions: ["Add more specific details about your unique approach", "Consider including an example or story"],
    };
  }
}

/**
 * Parse the AI's feedback response into structured format
 */
function parseFeedbackResponse(feedbackText: string, userResponse: string): RealTimeFeedback {
  // Determine status based on response length and depth
  let status: "typing" | "good-start" | "developing" | "strong" = "good-start";
  
  if (userResponse.length > 200) {
    status = "developing";
  }
  if (userResponse.length > 400) {
    status = "strong";
  }

  // Extract encouragement (usually the first sentence or paragraph)
  const lines = feedbackText.split('\n').filter(line => line.trim());
  const encouragement = lines[0] || "Great work developing your strategic messaging!";

  // Extract suggestions (look for numbered lists or bullet points)
  const suggestions: string[] = [];
  const examples: string[] = [];
  let rewording = "";
  let reasoning = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for suggestions (numbered or bulleted)
    if (line.match(/^\d+\.|^-|^•|consider|try|you could|have you thought/i)) {
      const suggestion = line.replace(/^\d+\.\s*|^-\s*|^•\s*/g, '').trim();
      if (suggestion.length > 10 && !line.toLowerCase().includes('example:')) {
        suggestions.push(suggestion);
      }
    }

    // Look for examples (usually prefixed with "For example", "Like:", etc.)
    if (line.toLowerCase().includes('example:') || line.toLowerCase().includes('like:') || line.includes('"')) {
      const exampleText = line.replace(/.*example:/i, '').replace(/.*like:/i, '').trim();
      if (exampleText.length > 10) {
        examples.push(exampleText);
      }
    }

    // Look for rewording suggestions (usually in quotes)
    const quotedText = line.match(/"([^"]+)"/);
    if (quotedText && quotedText[1].length > 20 && !rewording) {
      rewording = quotedText[1];
    }

    // Look for reasoning (usually contains "because", "this matters", "why")
    if (line.toLowerCase().includes('because') || line.toLowerCase().includes('this matters') || line.toLowerCase().includes('why')) {
      reasoning = line.trim();
    }
  }

  // Extract next steps (usually at the end)
  const nextSteps: string[] = [];
  const lastParagraph = lines[lines.length - 1];
  if (lastParagraph && (lastParagraph.toLowerCase().includes('next') || lastParagraph.toLowerCase().includes('try'))) {
    nextSteps.push(lastParagraph);
  }

  return {
    status,
    encouragement,
    suggestions: suggestions.slice(0, 3), // Limit to top 3 suggestions
    examples: examples.slice(0, 2), // Limit to 2 examples
    rewording: rewording || undefined,
    reasoning: reasoning || undefined,
    nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
  };
}

/**
 * Cache for real-time feedback to reduce API calls for identical responses
 */
const feedbackCache = new Map<string, { feedback: RealTimeFeedback; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(question: string, response: string): string {
  return `${question.slice(0, 50)}-${response.slice(0, 100)}`;
}

export function getCachedFeedback(question: string, response: string): RealTimeFeedback | null {
  const key = getCacheKey(question, response);
  const cached = feedbackCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.feedback;
  }
  
  return null;
}

export function cacheFeedback(question: string, response: string, feedback: RealTimeFeedback): void {
  const key = getCacheKey(question, response);
  feedbackCache.set(key, { feedback, timestamp: Date.now() });
}
