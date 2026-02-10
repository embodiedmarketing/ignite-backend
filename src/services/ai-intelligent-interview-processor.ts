import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { jsonObjectSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY, SYSTEM_CUSTOMER_RESEARCH_ANALYST, SYSTEM_MESSAGING_SYNTHESIS } from "../shared/prompts";
import {
  DataSourceValidator,
  UserContextData,
  ClientContextData,
} from "../utils/data-source-validator";

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
  const prompt = `<prompt>
  <task>Extract ONLY what was explicitly stated in this interview transcript.</task>
  
  <critical_rules>
    <rule number="1">ONLY extract information that is EXPLICITLY stated in the transcript</rule>
    <rule number="2">DO NOT make up, infer, guess, or assume ANY information</rule>
    <rule number="3">DO NOT add details that weren't mentioned (e.g., don't mention "dad's health" if it wasn't discussed)</rule>
    <rule number="4">If information is NOT in the transcript, return "N/A" (not empty string, not inferred info)</rule>
    <rule number="5">Keep responses CONCISE - 1-2 sentences maximum per field</rule>
    <rule number="6">Convert first-person to third-person: "I" → "they", "my" → "their", "me" → "them"</rule>
    <rule number="7">Use the customer's EXACT words when possible - just change pronouns</rule>
    <rule number="8">If a question was asked but not answered, return "N/A"</rule>
    <rule number="9">DO NOT combine information from different contexts - if it wasn't explicitly connected, don't connect it</rule>
  </critical_rules>
  
  <transcript>
    <![CDATA[
${transcript}
    ]]>
  </transcript>
  
  <extraction_fields>
    <field key="frustrations">Their exact words about pain points (if stated, else "N/A")</field>
    <field key="nighttime_worries">What keeps them awake (if stated, else "N/A")</field>
    <field key="secret_fears">Their hidden fears (if stated, else "N/A")</field>
    <field key="magic_solution">Their ideal outcomes (if stated, else "N/A")</field>
    <field key="demographics">Age, income, role (if stated, else "N/A" - format: "46, earning about 75K" or "N/A")</field>
    <field key="failed_solutions">What they tried that didn't work (if stated, else "N/A")</field>
    <field key="blockers">Current obstacles (if stated, else "N/A")</field>
    <field key="info_sources">Where they go for advice (if stated, else "N/A")</field>
    <field key="decision_making">How they make decisions (if stated, else "N/A")</field>
    <field key="investment_criteria">What they need to invest (if stated, else "N/A")</field>
    <field key="success_measures">How they measure success (if stated, else "N/A")</field>
    <field key="referral_outcomes">What makes them recommend (if stated, else "N/A")</field>
  </extraction_fields>
  
  <extraction_logic>
    <logic>If the information IS in the transcript: Extract it (1-2 sentences max, converted to third-person)</logic>
    <logic>If the information is NOT in the transcript: Return "N/A"</logic>
  </extraction_logic>
  
  <validation_check>
    <check>For each field, ask yourself: "Is this information EXPLICITLY stated in the transcript?"</check>
    <check>If YES: Extract it (convert pronouns to third-person)</check>
    <check>If NO: Return "N/A"</check>
    <check>DO NOT infer connections (e.g., don't connect "dad" mentioned elsewhere to "nighttime worries" unless explicitly connected)</check>
    <check>DO NOT add details from context clues - only use explicit statements</check>
  </validation_check>
  
  <output_format>
    <format>JSON</format>
    <example>
      <![CDATA[
{
  "frustrations": "They feel spread too thin" OR "N/A",
  "nighttime_worries": "They worry about their family" OR "N/A",
  "demographics": "46, earning about 75K" OR "N/A"
}
      ]]>
    </example>
    <rule>Use "N/A" for fields where information was NOT explicitly stated</rule>
    <rule>Return ONLY valid JSON</rule>
  </output_format>
</prompt>`;

  try {
    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0.1,
      system: SYSTEM_CUSTOMER_RESEARCH_ANALYST,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No content received from Anthropic");
    }
    let cleanedResponse = contentText.trim();
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```(json)?\s*/, "")
        .replace(/\s*```\s*$/, "");
    }
    let wasTruncated = false;
    if (!cleanedResponse.endsWith("}")) {
      wasTruncated = true;
      const lastCompleteField = cleanedResponse.lastIndexOf('",');
      if (lastCompleteField > 0) {
        cleanedResponse =
          cleanedResponse.substring(0, lastCompleteField + 1) + "\n}";
      }
    }
    const parsed = parseAndValidateAiJson(cleanedResponse, jsonObjectSchema, {
      context: "interview insights extraction",
    }) as Record<string, unknown>;

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

  const prompt = `<prompt>
  <task>Suggest ENHANCEMENTS to the business owner's existing messaging strategy based on client interview insights.</task>
  
  <inputs>
    <validated_business_owner_context>
      <business>${userContext.businessName || "Business owner"}</business>
      <industry>${userContext.industry || "Professional services"}</industry>
      <user_id>${userContext.userId}</user_id>
    </validated_business_owner_context>
    <existing_owner_messaging_to_enhance>
      ${Object.entries(existingMessagingStrategy)
        .map(([key, value]) => `<field key="${key}">
        <![CDATA[
${value}
        ]]>
      </field>`).join("\n      ")}
    </existing_owner_messaging_to_enhance>
    <client_research_insights>
      <purpose>For Pattern Analysis Only</purpose>
      ${Object.entries(insights)
        .filter(([_, value]) => value && value.trim())
        .map(([key, value]) => `<insight key="${key}">
        <![CDATA[
${value}
        ]]>
      </insight>`).join("\n      ")}
    </client_research_insights>
  </inputs>
  
  <critical_contamination_prevention_rules>
    <rule>You are ENHANCING the business owner's messaging, NOT replacing it with client quotes</rule>
    <rule>Use client insights to INSPIRE improvements to the owner's messaging approach</rule>
    <rule>NEVER directly copy client demographics, quotes, or personal details into the messaging strategy</rule>
    <rule>Focus on PATTERNS and THEMES from client insights that can inform the owner's positioning</rule>
    <rule>The final messaging must sound like it comes from the BUSINESS OWNER, not the client</rule>
  </critical_contamination_prevention_rules>
  
  <enhancement_focus>
    <focus number="1">How the owner can better communicate their unique value based on what clients actually struggle with</focus>
    <focus number="2">Language refinements that would resonate more with the target audience</focus>
    <focus number="3">Positioning adjustments that address the real concerns clients expressed</focus>
    <focus number="4">Messaging gaps that could be filled based on client feedback patterns</focus>
  </enhancement_focus>
  
  <output_format>
    <format>JSON</format>
    <schema>
      <![CDATA[
{
  "positioning_enhancement": "Enhanced positioning statement based on client needs patterns",
  "value_proposition_refinement": "Refined value prop that addresses client pain points",
  "brand_voice_adjustment": "Voice adjustments based on client communication preferences",
  "key_messages_improvement": "Key message improvements based on client priorities",
  "customer_avatar_refinement": "Avatar refinements based on actual client insights"
}
      ]]>
    </schema>
    <validation>Ensure your suggestions sound like they come from the business owner about their approach, NOT like client testimonials or client quotes</validation>
  </output_format>
</prompt>`;

  try {
    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      temperature: 0.4,
      system: SYSTEM_MESSAGING_SYNTHESIS,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No content received from Anthropic");
    }
    let cleanedResponse = contentText.trim();
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```(json)?\s*/, "")
        .replace(/\s*```\s*$/, "");
    }
    const parsed = parseAndValidateAiJson(cleanedResponse, jsonObjectSchema, {
      context: "messaging synthesis",
    }) as Record<string, unknown>;

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



