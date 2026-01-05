import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  DataSourceValidator,
  UserContextData,
  ClientContextData,
} from "../utils/data-source-validator";
import { validateAnthropicJsonResponse } from "../utils/anthropic-validator";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface InterviewInsights {
  frustrations?: string;
  nighttime_worries?: string;
  secret_fears?: string;
  magic_solution?: string;
  demographics?: string;
  failed_solutions?: string;
  blockers?: string;
  info_sources?: string;
  decision_making?: string;
  investment_criteria?: string;
  success_measures?: string;
  referral_outcomes?: string;
  additional_insights?: string;
  [key: string]: string | undefined;
}

interface MessagingStrategyUpdate {
  [key: string]: string | any;
  dataSourceReport?: any;
}

// Zod schemas for AI response validation
const InterviewInsightsSchema = z.record(z.string().optional());

const MessagingStrategyUpdateSchema = z.object({
  positioning_enhancement: z.string().optional(),
  value_proposition_refinement: z.string().optional(),
  brand_voice_adjustment: z.string().optional(),
  key_messages_improvement: z.string().optional(),
  customer_avatar_refinement: z.string().optional(),
}).catchall(z.any());

export async function intelligentlyProcessInterviewTranscript(
  transcript: string,
  existingMessagingStrategy: Record<string, string> = {},
  userId: number = 0
): Promise<{ updates: MessagingStrategyUpdate; wasTruncated?: boolean }> {
  try {
    console.log(
      "[AI CONTAMINATION PREVENTION] Processing interview transcript with data source validation..."
    );
    console.log("Processing transcript:", transcript.substring(0, 100) + "...");
    console.log("Transcript length:", transcript.length, "characters");
    console.log(
      "Existing strategy keys:",
      Object.keys(existingMessagingStrategy)
    );

    const validatedTranscriptData = DataSourceValidator.validateDataSource(
      { transcript: transcript },
      "client_interview",
      userId,
      { source: "interview_transcript" }
    );

    const validatedStrategyData = DataSourceValidator.validateDataSource(
      existingMessagingStrategy,
      "user_business",
      userId,
      { source: "existing_messaging_strategy" }
    );

    const userContext = DataSourceValidator.createUserContext({
      ...validatedStrategyData,
    });

    const clientContext = DataSourceValidator.createClientContext({
      ...validatedTranscriptData,
    });

    const contaminationReport = DataSourceValidator.generateContaminationReport({
      ...validatedTranscriptData,
      ...validatedStrategyData,
    });

    console.log(
      "[DATA SOURCE VALIDATION] Contamination report:",
      contaminationReport
    );

    const transcriptConfidence =
      validatedTranscriptData.transcript?.metadata.confidence || 0;
    if (transcriptConfidence < 0.6) {
      console.warn(
        "[CONTAMINATION WARNING] Low confidence transcript detected"
      );
      return {
        updates: {
          dataSourceReport: contaminationReport,
        },
        wasTruncated: false,
      };
    }

    const MAX_TRANSCRIPT_LENGTH = 8000;

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      console.log("Large transcript detected, using chunking strategy");
      return await processLargeTranscriptInChunks(
        transcript,
        existingMessagingStrategy
      );
    }

    const { insights, wasTruncated } = await extractInterviewInsights(
      transcript
    );
    console.log("Extracted client insights:", insights);

    const messagingUpdates = await synthesizeInsightsToMessagingStrategy(
      insights,
      existingMessagingStrategy
    );
    console.log(
      "Final messaging updates (with correct keys):",
      messagingUpdates
    );

    return {
      updates: {
        ...messagingUpdates,
        dataSourceReport: contaminationReport,
      },
      wasTruncated,
    };
  } catch (error) {
    console.error("Error in intelligent interview processing:", error);
    throw new Error("Failed to process interview transcript intelligently");
  }
}

async function extractInterviewInsights(
  transcript: string
): Promise<{ insights: InterviewInsights; wasTruncated: boolean }> {
  const prompt = `You are a customer research analyst. Extract ONLY what was explicitly stated in this interview transcript.

CRITICAL RULES - READ CAREFULLY:
1. ONLY extract information that is EXPLICITLY stated in the transcript
2. DO NOT make up, infer, guess, or assume ANY information
3. DO NOT add details that weren't mentioned (e.g., don't mention "dad's health" if it wasn't discussed)
4. If information is NOT in the transcript, return "N/A" (not empty string, not inferred info)
5. Keep responses CONCISE - 1-2 sentences maximum per field
6. Convert first-person to third-person: "I" → "they", "my" → "their", "me" → "them"
7. Use the customer's EXACT words when possible - just change pronouns
8. If a question was asked but not answered, return "N/A"
9. DO NOT combine information from different contexts - if it wasn't explicitly connected, don't connect it

TRANSCRIPT:
${transcript}

Extract ONLY what was explicitly stated. For each field:
- If the information IS in the transcript: Extract it (1-2 sentences max, converted to third-person)
- If the information is NOT in the transcript: Return "N/A"

1. frustrations - Their exact words about pain points (if stated, else "N/A")
2. nighttime_worries - What keeps them awake (if stated, else "N/A")
3. secret_fears - Their hidden fears (if stated, else "N/A")
4. magic_solution - Their ideal outcomes (if stated, else "N/A")
5. demographics - Age, income, role (if stated, else "N/A" - format: "46, earning about 75K" or "N/A")
6. failed_solutions - What they tried that didn't work (if stated, else "N/A")
7. blockers - Current obstacles (if stated, else "N/A")
8. info_sources - Where they go for advice (if stated, else "N/A")
9. decision_making - How they make decisions (if stated, else "N/A")
10. investment_criteria - What they need to invest (if stated, else "N/A")
11. success_measures - How they measure success (if stated, else "N/A")
12. referral_outcomes - What makes them recommend (if stated, else "N/A")

VALIDATION CHECK BEFORE RETURNING:
- For each field, ask yourself: "Is this information EXPLICITLY stated in the transcript?"
- If YES: Extract it (convert pronouns to third-person)
- If NO: Return "N/A"
- DO NOT infer connections (e.g., don't connect "dad" mentioned elsewhere to "nighttime worries" unless explicitly connected)
- DO NOT add details from context clues - only use explicit statements

Return ONLY valid JSON. Use "N/A" for fields where information was NOT explicitly stated:
{
  "frustrations": "They feel spread too thin" OR "N/A",
  "nighttime_worries": "They worry about their family" OR "N/A",
  "demographics": "46, earning about 75K" OR "N/A"
}`;

  try {
    const userPromptWithJson = prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0.1,
      system: "You are a strict customer research analyst. CRITICAL RULES: 1) ONLY extract information EXPLICITLY stated in the transcript - DO NOT make up, infer, guess, or assume. 2) If information is NOT in the transcript, return \"N/A\" (never empty string or inferred info). 3) DO NOT add details that weren't mentioned (e.g., don't mention family details if not discussed). 4) Keep responses concise - 1-2 sentences maximum. 5) Convert first-person to third-person (I→they, my→their, me→them). 6) Use customer's exact words when possible. 7) If a question wasn't answered in the transcript, return \"N/A\". Return only valid JSON with \"N/A\" for missing information.",
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!contentText) {
      throw new Error("No content received from Anthropic");
    }

    console.log("Raw AI response:", contentText);
    
    // Detect truncation from raw content text (before validation)
    const wasTruncated = !contentText.trim().endsWith("}");
    
    // Validate and parse using Zod
    const parsed = validateAnthropicJsonResponse(
      response,
      InterviewInsightsSchema,
      "INTERVIEW_INSIGHTS"
    );

    const flattened: InterviewInsights = {};

    if (wasTruncated) {
      console.log(
        "WARNING: AI response was truncated - some insights may be incomplete"
      );
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "object" && value !== null) {
        if (key === "demographics") {
          const demo = value as any;
          // Check if we have actual data or if it should be N/A
          if (!demo.age && !demo.income && !demo.job_title) {
            flattened[key] = "N/A";
          } else {
            let demoText = `${demo.age || ""}-year-old ${
              demo.job_title || "professional"
            } earning $${demo.income || "unknown"} annually`.trim();
            // Only convert if it's not essentially empty (all fields unknown)
            if (
              (!demo.age && !demo.job_title) ||
              (demo.income === "unknown" && !demo.age && !demo.job_title)
            ) {
              flattened[key] = "N/A";
            } else {
              // Convert demographics to third person too
              demoText = convertToThirdPerson(demoText);
              flattened[key] = demoText;
            }
          }
        } else {
          let jsonText = JSON.stringify(value);
          // Check if it's essentially empty/null - convert to N/A
          if (!jsonText || jsonText === "{}" || jsonText === "null" || jsonText === '""') {
            flattened[key as keyof InterviewInsights] = "N/A";
          } else {
            jsonText = convertToThirdPerson(jsonText);
            flattened[key as keyof InterviewInsights] = jsonText;
          }
        }
      } else {
        let text = String(value || "");
        // Convert empty strings, null, undefined, or whitespace-only to "N/A"
        if (
          !text ||
          text.trim() === "" ||
          text.trim().toLowerCase() === "null" ||
          text.trim().toLowerCase() === "undefined"
        ) {
          flattened[key as keyof InterviewInsights] = "N/A";
        } else {
          // Check if it's already "N/A" (case-insensitive)
          if (text.trim().toUpperCase() === "N/A") {
            flattened[key as keyof InterviewInsights] = "N/A";
          } else {
            // Convert first person to third person
            text = convertToThirdPerson(text);
            flattened[key as keyof InterviewInsights] = text;
          }
        }
      }
    }

    // Double-check: Convert any remaining first-person references to third-person (skip N/A)
    for (const key in flattened) {
      const value = flattened[key as keyof InterviewInsights];
      if (value && value !== "N/A" && key !== "demographics") {
        flattened[key as keyof InterviewInsights] = convertToThirdPerson(value);
      }
    }

    return { insights: flattened, wasTruncated };
  } catch (parseError) {
    console.error("Failed to parse Anthropic response:", parseError);
    throw new Error("Invalid JSON response from AI");
  }
}

/**
 * Convert first-person language to third-person language
 */
function convertToThirdPerson(text: string): string {
  if (!text || typeof text !== "string") return text;

  // Convert pronouns (case-sensitive word boundaries)
  let converted = text;

  // "I " → "they " (at start of sentence or after punctuation)
  converted = converted.replace(/\bI\b/g, "they");
  
  // "my " → "their "
  converted = converted.replace(/\bmy\b/g, "their");
  
  // " me " → " them " (with word boundaries)
  converted = converted.replace(/\bme\b/g, "them");
  
  // "we " → "they "
  converted = converted.replace(/\bwe\b/g, "they");
  
  // "our " → "their "
  converted = converted.replace(/\bour\b/g, "their");
  
  // "us " → "them "
  converted = converted.replace(/\bus\b/g, "them");
  
  // "myself" → "themselves"
  converted = converted.replace(/\bmyself\b/g, "themselves");
  
  // "ourselves" → "themselves"
  converted = converted.replace(/\bourselves\b/g, "themselves");

  // Fix verb conjugations: "I am" → "they are", "I was" → "they were"
  converted = converted.replace(/\bI am\b/g, "they are");
  converted = converted.replace(/\bI'm\b/g, "they're");
  converted = converted.replace(/\bI was\b/g, "they were");
  converted = converted.replace(/\bI have\b/g, "they have");
  converted = converted.replace(/\bI've\b/g, "they've");
  converted = converted.replace(/\bI will\b/g, "they will");
  converted = converted.replace(/\bI'll\b/g, "they'll");
  converted = converted.replace(/\bI would\b/g, "they would");
  converted = converted.replace(/\bI'd\b/g, "they'd");

  // Fix possessive: "my" → "their" (already done above, but handle contractions)
  converted = converted.replace(/\bmy\b/g, "their");

  return converted;
}

function cleanDemographicsText(text: string): string {
  return text
    .replace(/years old-year-old/g, "years old")
    .replace(/-year-old/g, "")
    .replace(/earning \$\$/g, "earning $")
    .replace(/annually annually/g, "annually")
    .replace(/\$unknown annually/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function synthesizeInsightsToMessagingStrategy(
  insights: InterviewInsights,
  existingStrategy: Record<string, string>
): Promise<MessagingStrategyUpdate> {
  const messagingUpdates: MessagingStrategyUpdate = {};

  const insightMappings = [
    {
      insightKey: "frustrations",
      strategyKey: "frustrations",
      question: "What is your biggest frustration right now in [your field]?",
    },
    {
      insightKey: "nighttime_worries",
      strategyKey: "nighttime_worries",
      question: "What keeps you awake at night about this situation?",
    },
    {
      insightKey: "secret_fears",
      strategyKey: "secret_fears",
      question:
        "What are you secretly afraid of that you won't admit to others?",
    },
    {
      insightKey: "magic_solution",
      strategyKey: "magic_solution",
      question:
        "If I could wave a magic wand and solve this problem, what would that look like?",
    },
    {
      insightKey: "demographics",
      strategyKey: "demographics",
      question:
        "What is your age range, income level, and job title or role?",
    },
    {
      insightKey: "failed_solutions",
      strategyKey: "failed_solutions",
      question:
        "What have you already tried to solve this that didn't work?",
    },
    {
      insightKey: "blockers",
      strategyKey: "blockers",
      question:
        "What's currently blocking you from getting the results you want?",
    },
    {
      insightKey: "info_sources",
      strategyKey: "info_sources",
      question: "Where do you go for advice and information about this?",
    },
    {
      insightKey: "decision_making",
      strategyKey: "decision_making",
      question: "How do you typically make purchasing decisions?",
    },
    {
      insightKey: "investment_criteria",
      strategyKey: "investment_criteria",
      question: "What would need to happen for you to invest in a solution?",
    },
    {
      insightKey: "success_measures",
      strategyKey: "success_measures",
      question: "How would you measure success after solving this?",
    },
    {
      insightKey: "referral_outcomes",
      strategyKey: "referral_outcomes",
      question:
        "What specific outcomes would make you recommend a solution to others?",
    },
  ];

  for (const mapping of insightMappings) {
    let insightValue =
      insights[mapping.insightKey as keyof InterviewInsights];
    const existingResponse = existingStrategy[mapping.strategyKey];

    console.log(
      `Processing mapping: ${mapping.insightKey} -> ${mapping.strategyKey}`
    );
    console.log(`Insight value: ${insightValue}`);
    console.log(
      `Existing response length: ${existingResponse?.length || 0}`
    );

    if (mapping.strategyKey === "demographics" && insightValue) {
      // Don't clean if it's N/A
      if (insightValue.trim().toUpperCase() !== "N/A") {
        insightValue = cleanDemographicsText(insightValue);
      }
    }

    // Transfer directly without AI synthesis/merging - just use extracted insights as-is
    if (insightValue && insightValue.trim() && insightValue.trim().toUpperCase() !== "N/A") {
      // Direct transfer: Use the extracted insight as-is, no AI merging
      messagingUpdates[mapping.strategyKey] = insightValue;
      console.log(`[DIRECT TRANSFER] ${mapping.strategyKey}: ${insightValue.substring(0, 50)}...`);
    }
  }

  if (insights.additional_insights && insights.additional_insights.trim()) {
    messagingUpdates["additional_insights"] = insights.additional_insights;
  }

  return messagingUpdates;
}


async function processLargeTranscriptInChunks(
  transcript: string,
  existingMessagingStrategy: Record<string, string> = {}
): Promise<{ updates: MessagingStrategyUpdate; wasTruncated?: boolean }> {
  const CHUNK_SIZE = 6000;
  const chunks: string[] = [];

  let currentChunk = "";
  const sentences = transcript.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + ".";
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  console.log(`Processing ${chunks.length} chunks from large transcript`);

  const allInsights: InterviewInsights = {};
  let anyTruncated = false;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    try {
      const { insights, wasTruncated } = await extractInterviewInsights(
        chunks[i]
      );

      if (wasTruncated) {
        anyTruncated = true;
      }

      for (const [key, value] of Object.entries(insights)) {
        if (value && value.trim()) {
          if (
            !allInsights[key as keyof InterviewInsights] ||
            value.length >
              (allInsights[key as keyof InterviewInsights]?.length || 0)
          ) {
            allInsights[key as keyof InterviewInsights] = value;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
    }
  }

  const messagingUpdates = await synthesizeInsightsToMessagingStrategy(
    allInsights,
    existingMessagingStrategy
  );

  return { updates: messagingUpdates, wasTruncated: anyTruncated };
}

async function processLargeTranscriptInChunksWithValidation(
  transcript: string,
  existingMessagingStrategy: Record<string, string>,
  userId: number
): Promise<{ updates: MessagingStrategyUpdate; wasTruncated: boolean }> {
  console.log(
    "[CONTAMINATION-SAFE] Processing large transcript in validated chunks..."
  );

  const result = await intelligentlyProcessInterviewTranscript(
    transcript.substring(0, 8000),
    existingMessagingStrategy,
    userId
  );

  return {
    updates: result.updates,
    wasTruncated: result.wasTruncated || false,
  };
}

async function synthesizeInsightsToMessagingStrategyWithValidation(
  insights: InterviewInsights,
  existingMessagingStrategy: Record<string, string>,
  userContext: UserContextData,
  clientContext: ClientContextData
): Promise<MessagingStrategyUpdate> {
  console.log(
    "[CONTAMINATION-SAFE] Synthesizing insights with data source validation..."
  );

  const prompt = `You are a customer research specialist focused on helping business owners understand their customers better. Your task is to suggest ENHANCEMENTS to the business owner's existing messaging strategy based on client interview insights.

CRITICAL CONTAMINATION PREVENTION RULES:
- You are ENHANCING the business owner's messaging, NOT replacing it with client quotes
- Use client insights to INSPIRE improvements to the owner's messaging approach
- NEVER directly copy client demographics, quotes, or personal details into the messaging strategy  
- Focus on PATTERNS and THEMES from client insights that can inform the owner's positioning
- The final messaging must sound like it comes from the BUSINESS OWNER, not the client

VALIDATED BUSINESS OWNER CONTEXT:
Business: ${userContext.businessName || "Business owner"}
Industry: ${userContext.industry || "Professional services"}
User ID: ${userContext.userId}

EXISTING OWNER MESSAGING TO ENHANCE:
${Object.entries(existingMessagingStrategy)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

CLIENT RESEARCH INSIGHTS (For Pattern Analysis Only):
${Object.entries(insights)
  .filter(([_, value]) => value && value.trim())
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

TASK: Based on the client research patterns, suggest specific enhancements to the business owner's messaging. Focus on:

1. How the owner can better communicate their unique value based on what clients actually struggle with
2. Language refinements that would resonate more with the target audience  
3. Positioning adjustments that address the real concerns clients expressed
4. Messaging gaps that could be filled based on client feedback patterns

Return ONLY a JSON object with suggested messaging enhancements:
{
  "positioning_enhancement": "Enhanced positioning statement based on client needs patterns",
  "value_proposition_refinement": "Refined value prop that addresses client pain points", 
  "brand_voice_adjustment": "Voice adjustments based on client communication preferences",
  "key_messages_improvement": "Key message improvements based on client priorities",
  "customer_avatar_refinement": "Avatar refinements based on actual client insights"
}

VALIDATION CHECK: Ensure your suggestions sound like they come from the business owner about their approach, NOT like client testimonials or client quotes.`;

  try {
    const userPromptWithJson = prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      temperature: 0.4,
      system: "You enhance business messaging based on client research patterns. Never copy client quotes directly. Focus on helping the business owner refine their approach based on client insights.",
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!contentText) {
      throw new Error("No content received from Anthropic");
    }

    // Validate and parse using Zod
    const parsed = validateAnthropicJsonResponse(
      response,
      MessagingStrategyUpdateSchema,
      "MESSAGING_STRATEGY_UPDATE"
    );

    const aiOutputText = JSON.stringify(parsed);
    const validationResult = DataSourceValidator.validateAIOutput(
      aiOutputText,
      userContext,
      clientContext
    );

    if (!validationResult.isClean) {
      console.warn(
        "[CONTAMINATION DETECTED] Issues in AI messaging synthesis:",
        validationResult.issues
      );

      const cleanedParsed: any = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          cleanedParsed[key] = `⚠️ VALIDATION WARNING: Possible contamination detected. ${value}`;
        } else {
          cleanedParsed[key] = value;
        }
      }
      return cleanedParsed as MessagingStrategyUpdate;
    }

    console.log("[AI OUTPUT VALIDATION] ✅ Messaging synthesis is clean");
    return parsed as MessagingStrategyUpdate;
  } catch (error) {
    console.error("Error in contamination-safe synthesis:", error);
    return {
      error:
        "Failed to synthesize insights safely - contamination prevention system blocked processing",
    };
  }
}



