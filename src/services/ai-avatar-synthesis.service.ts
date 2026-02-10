import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { avatarSynthesisSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY } from "../shared/prompts";

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

export async function synthesizeCustomerAvatar(interviewNotes: InterviewNotes): Promise<CustomerAvatarSynthesis> {
  try {
    const prompt = `<prompt>
  <task>Create a comprehensive customer avatar that captures the real voice and needs of potential customers based on interview insights.</task>
  
  <inputs>
    <interview_insights>
      <pain_points_frustrations>${interviewNotes.painPoints || 'Not provided'}</pain_points_frustrations>
      <failed_solutions>${interviewNotes.failedSolutions || 'Not provided'}</failed_solutions>
      <perfect_day_scenarios>${interviewNotes.perfectDay || 'Not provided'}</perfect_day_scenarios>
      <secret_fears>${interviewNotes.secretFears || 'Not provided'}</secret_fears>
      <language_they_use>${interviewNotes.language || 'Not provided'}</language_they_use>
      <decision_making_process>${interviewNotes.decisionMaking || 'Not provided'}</decision_making_process>
    </interview_insights>
  </inputs>
  
  <synthesis_requirements>
    <requirement>Use the actual language and phrases from the interviews when possible</requirement>
    <requirement>Be specific and authentic - avoid generic business speak</requirement>
    <requirement>Use first-person language when appropriate ("I feel...", "I need...")</requirement>
    <requirement>Include specific phrases from the interviews</requirement>
    <requirement>Be authentic and avoid marketing-speak</requirement>
    <requirement>If limited interview data, make reasonable inferences but mark them as such</requirement>
    <requirement>Focus on emotional drivers, not just functional needs</requirement>
  </synthesis_requirements>
  
  <output_format>
    <format>JSON</format>
    <schema>
      <![CDATA[
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
      ]]>
    </schema>
  </output_format>
</prompt>`;

    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: userPromptWithJson }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const contentText = getTextFromAnthropicContent(response.content);
    const result = parseAndValidateAiJson(contentText, avatarSynthesisSchema, {
      context: "avatar synthesis",
      fallback: {},
    });
    return {
      frustration: result.frustration || "No interview data available yet",
      fears: result.fears || "No interview data available yet", 
      perfectDay: result.perfectDay || "No interview data available yet",
      transformation: result.transformation || "No interview data available yet",
      uniqueApproach: result.uniqueApproach || "No interview data available yet",
      age: result.age || "Not determined from interviews",
      income: result.income || "Not determined from interviews",
      jobTitle: result.jobTitle || "Not determined from interviews", 
      previousSolutions: result.previousSolutions || "No interview data available yet",
      blockers: result.blockers || "No interview data available yet",
      informationSources: result.informationSources || "No interview data available yet",
      language: result.language || "No interview data available yet",
      decisionMaking: result.decisionMaking || "No interview data available yet",
      investmentCriteria: result.investmentCriteria || "No interview data available yet",
      successMeasures: result.successMeasures || "No interview data available yet",
      outcomes: result.outcomes || "No interview data available yet"
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