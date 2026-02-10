import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent } from "../utils/ai-response";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface InterviewInsight {
  question: string;
  response: string;
  category: string;
}

interface MessagingStrategyMapping {
  [key: string]: {
    messagingQuestion: string;
    relevantInterviewCategories: string[];
    synthesisPrompt: string;
  };
}

const STRATEGY_MAPPING: MessagingStrategyMapping = {
  "What makes you uniquely qualified to help your customers?": {
    messagingQuestion: "What makes you uniquely qualified to help your customers?",
    relevantInterviewCategories: ["credentials", "expertise", "results", "methodology"],
    synthesisPrompt:
      "Focus on your unique qualifications and track record that address the specific problems customers mentioned.",
  },
  "What is your ideal customer's biggest frustration?": {
    messagingQuestion: "What is your ideal customer's biggest frustration?",
    relevantInterviewCategories: ["frustrations", "painPoints", "problems", "challenges"],
    synthesisPrompt:
      "Synthesize the common frustrations customers expressed in their own words, maintaining emotional authenticity.",
  },
  "What are their deepest fears and anxieties about their situation?": {
    messagingQuestion: "What are their deepest fears and anxieties about their situation?",
    relevantInterviewCategories: [
      "secretFears",
      "nighttime_worries",
      "anxieties",
      "emotional_pain",
    ],
    synthesisPrompt:
      "Extract the deeper emotional fears customers revealed, focusing on vulnerability and emotional truth.",
  },
  "If they could wave a magic wand, what would their perfect day look like?": {
    messagingQuestion:
      "If they could wave a magic wand, what would their perfect day look like?",
    relevantInterviewCategories: ["perfectDay", "ideal_outcome", "dreams", "goals"],
    synthesisPrompt:
      "Paint a vivid picture of their ideal transformation based on what customers actually described wanting.",
  },
  "What solutions have they already tried that didn't work?": {
    messagingQuestion: "What solutions have they already tried that didn't work?",
    relevantInterviewCategories: [
      "failedSolutions",
      "previous_attempts",
      "what_didnt_work",
    ],
    synthesisPrompt:
      "List the specific solutions customers tried and why they failed, showing you understand their journey.",
  },
  "What's blocking them from solving this themselves?": {
    messagingQuestion: "What's blocking them from solving this themselves?",
    relevantInterviewCategories: ["obstacles", "barriers", "blockers", "limitations"],
    synthesisPrompt:
      "Identify the real barriers customers face, both external and internal, that prevent self-solution.",
  },
};

export async function synthesizeInterviewsIntoStrategy(
  allInterviewInsights: Record<string, string>,
  existingResponses: Record<string, string>
): Promise<Record<string, string>> {
  const synthesizedStrategy: Record<string, string> = { ...existingResponses };

  for (const [messagingQuestion, mapping] of Object.entries(STRATEGY_MAPPING)) {
    const relevantInsights: string[] = [];

    for (const category of mapping.relevantInterviewCategories) {
      if (allInterviewInsights[category]) {
        relevantInsights.push(`${category}: ${allInterviewInsights[category]}`);
      }
    }

    if (relevantInsights.length === 0) continue;

    const existingResponse = existingResponses[messagingQuestion] || "";
    const synthesizedResponse = await synthesizeResponse(
      messagingQuestion,
      relevantInsights,
      existingResponse,
      mapping.synthesisPrompt
    );

    synthesizedStrategy[messagingQuestion] = synthesizedResponse;
  }

  return synthesizedStrategy;
}

async function synthesizeResponse(
  messagingQuestion: string,
  relevantInsights: string[],
  existingResponse: string,
  synthesisPrompt: string
): Promise<string> {
  try {
    const prompt = `<prompt>
  <task>Synthesize customer interview insights into an authentic messaging strategy response.</task>
  
  <inputs>
    <messaging_question>${messagingQuestion}</messaging_question>
    <relevant_interview_insights>
      ${relevantInsights.map(insight => `<insight><![CDATA[${insight}]]></insight>`).join('\n      ')}
    </relevant_interview_insights>
    <existing_response>
      <![CDATA[
${existingResponse}
      ]]>
    </existing_response>
    <synthesis_instructions>${synthesisPrompt}</synthesis_instructions>
  </inputs>
  
  <guidelines>
    <guideline number="1">Create a comprehensive response that combines interview insights with existing content</guideline>
    <guideline number="2">Remove any repetition - if the existing response already covers something, don't repeat it</guideline>
    <guideline number="3">Use the customers' actual language and emotional tone when possible</guideline>
    <guideline number="4">Build a cohesive narrative that flows naturally</guideline>
    <guideline number="5">Focus on specific, concrete details from the interviews</guideline>
    <guideline number="6">Maintain third-person perspective ("They feel..." not "I feel...")</guideline>
    <guideline number="7">If existing response is empty, create a complete answer from interview insights</guideline>
    <guideline number="8">If existing response exists, intelligently enhance it with new interview data</guideline>
  </guidelines>
  
  <output>
    <format>Single comprehensive response</format>
    <requirement>Intelligently combine all relevant information without repetition</requirement>
  </output>
</prompt>`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const contentText = getTextFromAnthropicContent(response.content);
    return contentText.trim() || existingResponse;
  } catch (error) {
    console.error("Error synthesizing response:", error);
    return existingResponse;
  }
}

export function detectRelevantMessagingQuestions(
  interviewResponse: string
): string[] {
  const response = interviewResponse.toLowerCase();
  const relevantQuestions: string[] = [];

  if (
    response.includes("frustrat") ||
    response.includes("annoyed") ||
    response.includes("problem")
  ) {
    relevantQuestions.push(
      "What is your ideal customer's biggest frustration?"
    );
  }

  if (
    response.includes("fear") ||
    response.includes("worried") ||
    response.includes("anxious") ||
    response.includes("scared")
  ) {
    relevantQuestions.push(
      "What are their deepest fears and anxieties about their situation?"
    );
  }

  if (
    response.includes("dream") ||
    response.includes("perfect") ||
    response.includes("ideal") ||
    response.includes("wish")
  ) {
    relevantQuestions.push(
      "If they could wave a magic wand, what would their perfect day look like?"
    );
  }

  if (
    response.includes("tried") ||
    response.includes("attempted") ||
    response.includes("didn't work") ||
    response.includes("failed")
  ) {
    relevantQuestions.push(
      "What solutions have they already tried that didn't work?"
    );
  }

  if (
    response.includes("can't") ||
    response.includes("unable") ||
    response.includes("difficult") ||
    response.includes("hard to")
  ) {
    relevantQuestions.push(
      "What's blocking them from solving this themselves?"
    );
  }

  return relevantQuestions;
}



