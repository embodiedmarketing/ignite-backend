import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, validateAiText } from "../utils/ai-response";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface InterviewResponse {
  question: string;
  customerAnswer: string;
  workbookSection: string;
}

interface SynthesisResult {
  synthesizedContent: string;
  reasoning: string;
}

export async function synthesizeInterviewResponse(
  interviewResponse: InterviewResponse,
  existingMessagingStrategy: Record<string, string>
): Promise<SynthesisResult> {
  console.log("\n" + "=".repeat(80));
  console.log("🔄 INTELLIGENT SYNTHESIS ACTIVATED");
  console.log("=".repeat(80));
  console.log("📋 Interview Response Input:");
  console.log("   Question:", interviewResponse.question);
  console.log(
    "   Customer Answer Length:",
    interviewResponse.customerAnswer.length,
    "characters"
  );
  console.log("   Target Section:", interviewResponse.workbookSection);

  const { question, customerAnswer, workbookSection } = interviewResponse;

  const existingContent = existingMessagingStrategy[workbookSection];
  const hasExistingContent = existingContent && existingContent.trim().length > 0;

  console.log(
    "   Existing Content Length:",
    existingContent?.length || 0,
    "characters"
  );
  console.log("   Will Merge:", hasExistingContent ? "YES" : "NO (New Content)");

  const isDemographicsQuestion =
    question.toLowerCase().includes("age range") ||
    question.toLowerCase().includes("income level") ||
    question.toLowerCase().includes("job title");

  let basicTransform: string;

  if (isDemographicsQuestion) {
    const ageMatch = customerAnswer.match(
      /(\d+[-–]\d+|\d+\s*years?\s*old|age\s*\d+|in\s*their\s*\d+s)/i
    );
    const incomeMatch = customerAnswer.match(
      /(\$[\d,]+k?|\d+k\s*income|[\d,]+\s*salary)/i
    );
    const jobMatch = customerAnswer.match(
      /(consultant|manager|director|owner|entrepreneur|freelancer|coach|teacher|nurse|engineer|developer|designer|writer|marketer)/i
    );

    if (ageMatch || incomeMatch || jobMatch) {
      const demographics: string[] = [];
      if (ageMatch) demographics.push(`Age: ${ageMatch[1]}`);
      if (incomeMatch) demographics.push(`Income: ${incomeMatch[1]}`);
      if (jobMatch) demographics.push(`Role: ${jobMatch[1]}`);

      basicTransform =
        demographics.length > 0
          ? `They are ${demographics.join(", ").toLowerCase()}.`
          : customerAnswer
              .replace(/\bI\b/g, "They")
              .replace(/\bmy\b/g, "their")
              .replace(/\bme\b/g, "them")
              .replace(/\bmyself\b/g, "themselves")
              .replace(/\bam\b/g, "are")
              .replace(/\bwas\b/g, "were");
    } else {
      basicTransform = customerAnswer
        .replace(/\bI\b/g, "They")
        .replace(/\bmy\b/g, "their")
        .replace(/\bme\b/g, "them")
        .replace(/\bmyself\b/g, "themselves")
        .replace(/\bam\b/g, "are")
        .replace(/\bwas\b/g, "were");
    }
  } else {
    basicTransform = customerAnswer
      .replace(/\bI\b/g, "They")
      .replace(/\bmy\b/g, "their")
      .replace(/\bme\b/g, "them")
      .replace(/\bmyself\b/g, "themselves")
      .replace(/\bam\b/g, "are")
      .replace(/\bwas\b/g, "were");
  }

  if (hasExistingContent) {
    console.log("🤖 Using AI to intelligently merge and prevent repetition...");

    try {
      const mergedContent = await intelligentlyMergeContent(
        existingContent,
        basicTransform,
        question
      );

      console.log("\n📝 INTELLIGENT MERGE RESULT:");
      console.log("=".repeat(80));
      console.log(mergedContent);
      console.log("=".repeat(80));
      console.log("✅ Intelligent Merge Complete\n");

      return {
        synthesizedContent: mergedContent,
        reasoning:
          "Intelligently merged with existing content to prevent repetition",
      };
    } catch (error) {
      console.error("AI merge failed, falling back to basic transform:", error);
      return {
        synthesizedContent: basicTransform,
        reasoning: "AI merge failed, used basic transformation",
      };
    }
  }

  console.log("\n📝 BASIC SYNTHESIS RESULT:");
  console.log("=".repeat(80));
  console.log(basicTransform);
  console.log("=".repeat(80));
  console.log("✅ Basic Synthesis Complete\n");

  return {
    synthesizedContent: basicTransform,
    reasoning: "No existing content - used basic pronoun transformation",
  };
}

async function intelligentlyMergeContent(
  existingContent: string,
  newInsight: string,
  questionContext: string
): Promise<string> {
  console.log(`🤖 Merging content for: ${questionContext}`);
  console.log(`   Existing: ${existingContent.substring(0, 100)}...`);
  console.log(`   New: ${newInsight.substring(0, 100)}...`);

  const prompt = `You are an expert at merging customer insights without creating repetition.

CONTEXT: ${questionContext}

EXISTING MESSAGING STRATEGY CONTENT:
${existingContent}

NEW CUSTOMER INSIGHT TO ADD:
${newInsight}

TASK: Intelligently merge the new insight with the existing content. 

CRITICAL RULES TO PREVENT REPETITION:
1. If the new insight says essentially the same thing as existing content, DON'T add it - just return the existing content
2. If the new insight adds NEW information or details, weave it in naturally
3. Keep the response concise (2-3 sentences max)
4. Maintain third-person perspective (they/them, not I/me)
5. Create a flowing narrative - don't just append text
6. Remove duplicate ideas - prioritize the more specific/emotional version
7. If contradictory, favor the more recent/specific insight

EXAMPLES OF GOOD MERGING:
Existing: "They worry about covering payroll each month."
New: "They fear running out of cash and not being able to pay their team."
MERGED: "They worry about cash flow and fear not being able to cover payroll and pay their team each month."

Existing: "They are frustrated with inconsistent client bookings."
New: "They struggle with feast-or-famine cycles in their business."
MERGED: "They are frustrated with the feast-or-famine cycles of inconsistent client bookings that create revenue instability."

EXAMPLES OF PREVENTING REPETITION:
Existing: "They want financial freedom and time flexibility."
New: "They desire to have more free time and financial independence."
MERGED: "They want financial freedom and time flexibility." (No change - same idea)

Return ONLY the merged content, no explanations or meta-commentary.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      temperature: 0.7,
      system:
        "You are an expert at merging customer insights intelligently. You prevent repetition and create concise, cohesive narratives in third-person perspective.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const mergedContent = validateAiText(getTextFromAnthropicContent(response.content), {
      context: "interview synthesis merge",
      fallback: "",
    }).trim();
    if (!mergedContent) {
      throw new Error("No merged content received from AI");
    }

    console.log(`✅ AI Merge successful: ${mergedContent.substring(0, 100)}...`);
    return mergedContent;
  } catch (error) {
    console.error("Error in intelligentlyMergeContent:", error);
    return `${existingContent}\n\n${newInsight}`.trim();
  }
}

export async function synthesizeMultipleResponses(
  responses: InterviewResponse[],
  existingMessagingStrategy: Record<string, string>
): Promise<Record<string, SynthesisResult>> {
  const results: Record<string, SynthesisResult> = {};

  for (const response of responses) {
    results[response.workbookSection] = await synthesizeInterviewResponse(
      response,
      existingMessagingStrategy
    );
  }

  return results;
}



