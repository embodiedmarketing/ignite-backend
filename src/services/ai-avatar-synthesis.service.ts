import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { validateAnthropicJsonResponse } from "../utils/anthropic-validator";

// Using Claude Sonnet 4 (claude-sonnet-4-20250514) for all AI operations
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface InterviewNotes {
  painPoints?: string;
  failedSolutions?: string;
  perfectDay?: string;
  secretFears?: string;
  language?: string;
  decisionMaking?: string;
}

interface CustomerAvatarSynthesis {
  frustration: string;
  fears: string;
  perfectDay: string;
  transformation: string;
  uniqueApproach: string;
  age: string;
  income: string;
  jobTitle: string;
  previousSolutions: string;
  blockers: string;
  informationSources: string;
  language: string;
  decisionMaking: string;
  investmentCriteria: string;
  successMeasures: string;
  outcomes: string;
}

// Zod schema for CustomerAvatarSynthesis validation
const CustomerAvatarSynthesisSchema = z.object({
  frustration: z.string(),
  fears: z.string(),
  perfectDay: z.string(),
  transformation: z.string(),
  uniqueApproach: z.string(),
  age: z.string(),
  income: z.string(),
  jobTitle: z.string(),
  previousSolutions: z.string(),
  blockers: z.string(),
  informationSources: z.string(),
  language: z.string(),
  decisionMaking: z.string(),
  investmentCriteria: z.string(),
  successMeasures: z.string(),
  outcomes: z.string(),
});

export async function synthesizeCustomerAvatar(interviewNotes: InterviewNotes): Promise<CustomerAvatarSynthesis> {
  try {
    const prompt = `
You are an expert customer research analyst. Based on the following interview insights, create a comprehensive customer avatar that captures the real voice and needs of these potential customers.

Interview Insights:
- Pain Points & Frustrations: ${interviewNotes.painPoints || 'Not provided'}
- Failed Solutions: ${interviewNotes.failedSolutions || 'Not provided'}
- Perfect Day Scenarios: ${interviewNotes.perfectDay || 'Not provided'}
- Secret Fears: ${interviewNotes.secretFears || 'Not provided'}
- Language They Use: ${interviewNotes.language || 'Not provided'}
- Decision Making Process: ${interviewNotes.decisionMaking || 'Not provided'}

Create a detailed customer avatar by synthesizing these insights into the following format. Use the actual language and phrases from the interviews when possible. Be specific and authentic - avoid generic business speak.

Respond in JSON format with these fields:
{
  "frustration": "Their biggest frustration (use their actual words/phrases)",
  "fears": "What keeps them up at night (from secret fears insights)",
  "perfectDay": "Their ideal scenario when problem is solved (synthesized from perfect day)",
  "transformation": "The complete transformation they want to achieve",
  "uniqueApproach": "What unique approach they need based on failed solutions",
  "age": "Estimated age range based on context clues",
  "income": "Estimated income level based on context",
  "jobTitle": "Likely job title/role based on insights",
  "previousSolutions": "What they've tried before (from failed solutions)",
  "blockers": "What's preventing them from success",
  "informationSources": "Where they typically look for solutions",
  "language": "Key phrases and language they use",
  "decisionMaking": "How they make purchasing decisions",
  "investmentCriteria": "What they need to see to invest money",
  "successMeasures": "How they'll measure success",
  "outcomes": "Specific outcomes they want to achieve"
}

Guidelines:
- Use first-person language when appropriate ("I feel...", "I need...")
- Include specific phrases from the interviews
- Be authentic and avoid marketing-speak
- If limited interview data, make reasonable inferences but mark them as such
- Focus on emotional drivers, not just functional needs
`;

    const userPromptWithJson = prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: userPromptWithJson }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const validated = validateAnthropicJsonResponse(
      response,
      CustomerAvatarSynthesisSchema,
      "AVATAR_SYNTHESIS"
    );
    
    // Provide defaults for missing fields (Zod will ensure they exist, but handle gracefully)
    return {
      frustration: validated.frustration || "No interview data available yet",
      fears: validated.fears || "No interview data available yet", 
      perfectDay: validated.perfectDay || "No interview data available yet",
      transformation: validated.transformation || "No interview data available yet",
      uniqueApproach: validated.uniqueApproach || "No interview data available yet",
      age: validated.age || "Not determined from interviews",
      income: validated.income || "Not determined from interviews",
      jobTitle: validated.jobTitle || "Not determined from interviews", 
      previousSolutions: validated.previousSolutions || "No interview data available yet",
      blockers: validated.blockers || "No interview data available yet",
      informationSources: validated.informationSources || "No interview data available yet",
      language: validated.language || "No interview data available yet",
      decisionMaking: validated.decisionMaking || "No interview data available yet",
      investmentCriteria: validated.investmentCriteria || "No interview data available yet",
      successMeasures: validated.successMeasures || "No interview data available yet",
      outcomes: validated.outcomes || "No interview data available yet"
    };
  } catch (error) {
    console.error("Customer avatar synthesis failed:", error);
    return {
      frustration: "Unable to synthesize from interview data. Please try again.",
      fears: "Unable to synthesize from interview data. Please try again.",
      perfectDay: "Unable to synthesize from interview data. Please try again.",
      transformation: "Unable to synthesize from interview data. Please try again.",
      uniqueApproach: "Unable to synthesize from interview data. Please try again.",
      age: "Unable to determine from interviews",
      income: "Unable to determine from interviews", 
      jobTitle: "Unable to determine from interviews",
      previousSolutions: "Unable to synthesize from interview data. Please try again.",
      blockers: "Unable to synthesize from interview data. Please try again.",
      informationSources: "Unable to synthesize from interview data. Please try again.",
      language: "Unable to synthesize from interview data. Please try again.",
      decisionMaking: "Unable to synthesize from interview data. Please try again.",
      investmentCriteria: "Unable to synthesize from interview data. Please try again.",
      successMeasures: "Unable to synthesize from interview data. Please try again.",
      outcomes: "Unable to synthesize from interview data. Please try again."
    };
  }
}