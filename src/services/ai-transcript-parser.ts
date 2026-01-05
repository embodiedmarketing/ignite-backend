import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { validateAnthropicJsonResponse } from "../utils/anthropic-validator";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedAnswers {
  [key: string]: string;
}

// Zod schema for ParsedAnswers - flexible object with string values
const ParsedAnswersSchema = z.record(z.string());

export async function parseInterviewTranscript(
  transcript: string
): Promise<ParsedAnswers> {
  try {
    const prompt = `You are an expert interview analyst. I need you to analyze this customer interview transcript and extract specific answers to predefined questions.

Please extract the customer's responses to these specific questions from the transcript:

1. "frustrations" - Their biggest frustration/challenge
2. "nighttime_worries" - What keeps them awake at night
3. "secret_fears" - What they're secretly afraid of
4. "magic_solution" - Their ideal solution/perfect day scenario
5. "demographics" - Age range, income level, job title/role
6. "failed_solutions" - What they've tried that didn't work
7. "blockers" - What's currently blocking them
8. "info_sources" - Where they go for advice/information
9. "decision_making" - How they make purchasing decisions
10. "investment_criteria" - What would make them invest in a solution
11. "success_measures" - How they would measure success
12. "referral_outcomes" - What would make them recommend to others
13. "additional_insights" - Any other important information they shared

TRANSCRIPT:
${transcript}

INSTRUCTIONS:
1. Extract the customer's actual words and responses for each category
2. If a specific answer isn't found, return an empty string for that key
3. Preserve the customer's original language and tone
4. Focus on emotional and specific details
5. Return only the customer's responses, not the interviewer's questions

Return a JSON object with the extracted answers using the keys listed above.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0.3,
      system: "You are an expert interview analyst who extracts specific customer responses from interview transcripts. Always return valid JSON with the requested structure.",
      messages: [
        {
          role: "user",
          content: prompt + "\n\nIMPORTANT: Return ONLY valid JSON with the requested structure. Do not include any markdown formatting or code blocks.",
        },
      ],
    });

    const validated = validateAnthropicJsonResponse(
      response,
      ParsedAnswersSchema,
      "TRANSCRIPT_PARSER"
    );
    return validated;
  } catch (error) {
    console.error("Error parsing interview transcript:", error);

    if (
      error instanceof Error &&
      (error.message.includes("Rate limit") ||
        error.message.includes("429") ||
        error.message.includes("quota"))
    ) {
      console.log(
        "Anthropic rate limit hit, providing intelligent fallback parsing"
      );
      return intelligentFallbackParsing(transcript);
    }

    console.log(
      "Anthropic API error, using intelligent fallback:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return intelligentFallbackParsing(transcript);
  }
}

// Intelligent fallback parsing when AI is unavailable
function intelligentFallbackParsing(transcript: string): ParsedAnswers {
  const responses: ParsedAnswers = {};

  // First, try to parse structured Q&A format
  const structuredAnswers = parseStructuredQA(transcript);
  if (Object.keys(structuredAnswers).length > 0) {
    return structuredAnswers;
  }

  // Fallback to pattern matching if structured parsing fails
  const text = transcript.toLowerCase();

  // Extract frustrations
  if (
    text.includes("frustrat") ||
    text.includes("annoying") ||
    text.includes("struggle") ||
    text.includes("problem")
  ) {
    const frustrationMatch = transcript.match(
      /(?:frustrat|annoying|struggle|problem|challenge).{0,200}/i
    );
    responses.frustrations = frustrationMatch ? frustrationMatch[0].trim() : "";
  }

  // Extract fears/worries
  if (
    text.includes("afraid") ||
    text.includes("fear") ||
    text.includes("worry") ||
    text.includes("scared")
  ) {
    const fearMatch = transcript.match(
      /(?:afraid|fear|worry|scared|anxious).{0,200}/i
    );
    responses.secret_fears = fearMatch ? fearMatch[0].trim() : "";
  }

  // Extract magic solution/perfect day
  if (
    text.includes("perfect") ||
    text.includes("ideal") ||
    text.includes("dream") ||
    text.includes("magic")
  ) {
    const magicMatch = transcript.match(
      /(?:perfect|ideal|dream|magic|wish|want).{0,200}/i
    );
    responses.magic_solution = magicMatch ? magicMatch[0].trim() : "";
  }

  // Extract demographics (age, income, job)
  const ageMatch = transcript.match(
    /(\d+\s*years?\s*old|\d+s|twenties|thirties|forties|fifties)/i
  );
  const incomeMatch = transcript.match(/(\$[\d,]+k?|\d+k|six.figure|seven.figure)/i);
  const jobMatch = transcript.match(
    /(entrepreneur|consultant|coach|manager|director|owner|freelancer|specialist)/i
  );

  if (ageMatch || incomeMatch || jobMatch) {
    const demographics = [ageMatch?.[0], incomeMatch?.[0], jobMatch?.[0]]
      .filter(Boolean)
      .join(", ");
    responses.demographics = demographics;
  }

  // Extract failed solutions
  if (
    text.includes("tried") ||
    text.includes("attempt") ||
    text.includes("didn't work") ||
    text.includes("failed")
  ) {
    const failedMatch = transcript.match(
      /(?:tried|attempt|didn't work|failed|unsuccessful).{0,200}/i
    );
    responses.failed_solutions = failedMatch ? failedMatch[0].trim() : "";
  }

  // If we found some content, return it; otherwise return the full transcript as fallback
  const foundResponses = Object.values(responses).filter(Boolean).length;
  if (foundResponses === 0) {
    responses.frustrations = transcript.substring(0, 500);
  }

  return responses;
}

// Parse structured Question/Answer format documents
function parseStructuredQA(transcript: string): ParsedAnswers {
  const responses: ParsedAnswers = {};

  // Split transcript into question-answer pairs
  const qaPairs = transcript
    .split(/(?=Question \d+:)/i)
    .filter((section) => section.trim());

  console.log(`Found ${qaPairs.length} Q&A pairs in transcript`);

  for (const pair of qaPairs) {
    const lines = pair
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    let question = "";
    let answer = "";

    for (const line of lines) {
      if (line.match(/^Question \d+:/i)) {
        question = line.replace(/^Question \d+:\s*/i, "").trim();
      } else if (line.match(/^Answer:/i)) {
        answer = line.replace(/^Answer:\s*/i, "").trim();
        break;
      }
    }

    if (question && answer) {
      const category = mapQuestionToCategory(question);
      if (category) {
        responses[category] = answer;
        console.log(
          `Mapped "${question}" to category "${category}": ${answer.substring(
            0,
            50
          )}...`
        );
      }
    }
  }

  return responses;
}

// Map interview questions to expected response categories
function mapQuestionToCategory(question: string): string | null {
  const q = question.toLowerCase();

  if (q.includes("biggest frustration") || q.includes("frustrat")) {
    return "frustrations";
  }
  if (q.includes("keeps you awake") || q.includes("awake at night")) {
    return "nighttime_worries";
  }
  if (q.includes("secretly afraid") || q.includes("secret") || q.includes("afraid")) {
    return "secret_fears";
  }
  if (
    q.includes("magic wand") ||
    q.includes("solve this problem") ||
    q.includes("perfect") ||
    q.includes("ideal")
  ) {
    return "magic_solution";
  }
  if (
    q.includes("age range") ||
    q.includes("income level") ||
    q.includes("job title") ||
    q.includes("demographics")
  ) {
    return "demographics";
  }
  if (
    q.includes("already tried") ||
    q.includes("tried") ||
    q.includes("didn't work")
  ) {
    return "failed_solutions";
  }
  if (
    q.includes("blocking you") ||
    q.includes("currently blocking") ||
    q.includes("preventing you")
  ) {
    return "blockers";
  }
  if (
    q.includes("go for advice") ||
    q.includes("information") ||
    q.includes("where do you go")
  ) {
    return "info_sources";
  }
  if (
    q.includes("purchasing decisions") ||
    q.includes("make decisions") ||
    q.includes("decide to buy")
  ) {
    return "decision_making";
  }
  if (
    q.includes("invest in a solution") ||
    q.includes("investment") ||
    q.includes("what would need to happen")
  ) {
    return "investment_criteria";
  }
  if (
    q.includes("measure success") ||
    q.includes("success") ||
    q.includes("know it works")
  ) {
    return "success_measures";
  }
  if (
    q.includes("recommend") ||
    q.includes("refer") ||
    q.includes("tell others")
  ) {
    return "referral_outcomes";
  }
  if (
    q.includes("anything else") ||
    q.includes("should know") ||
    q.includes("additional")
  ) {
    return "additional_insights";
  }

  return null;
}



