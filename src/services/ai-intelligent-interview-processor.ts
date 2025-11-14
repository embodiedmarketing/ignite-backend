import OpenAI from "openai";
import {
  DataSourceValidator,
  UserContextData,
  ClientContextData,
} from "../utils/data-source-validator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  const prompt = `You are a customer research analyst. Extract insights from this interview transcript.

MANDATORY RULE: Copy the customer's exact words. Use "I", "my", "me" exactly as they spoke. Do NOT change to "they", "their", "them".

TRANSCRIPT:
${transcript}

Extract these insights using the customer's EXACT first-person words:

1. frustrations - Copy their exact words about pain points
2. nighttime_worries - Copy their exact words about what keeps them awake  
3. secret_fears - Copy their exact words about hidden fears
4. magic_solution - Copy their exact words about ideal outcomes
5. demographics - Copy EXACTLY what they said about their demographics without changing anything
6. failed_solutions - Copy their exact words about what didn't work
7. blockers - Copy their exact words about current obstacles
8. info_sources - Copy their exact words about where they get advice
9. decision_making - Copy their exact words about how they decide
10. investment_criteria - Copy their exact words about investment needs
11. success_measures - Copy their exact words about measuring success
12. referral_outcomes - Copy their exact words about referral criteria
13. additional_insights - Any other exact quotes

WRONG: "they worry about covering payroll"
RIGHT: "I worry about covering payroll"

Return only JSON with exact customer quotes. For demographics, copy their complete sentence exactly:
{
  "frustrations": "exact customer words here",
  "nighttime_worries": "exact customer words here", 
  "secret_fears": "exact customer words here",
  "demographics": "exact customer words here"
}`;

  try {
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a customer research analyst. CRITICAL: Copy customer's exact first-person words. Never change 'I' to 'they' or 'my' to 'their'. Return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      },
      {
        timeout: 90000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("Raw AI response:", content);
    let cleanedResponse = content.trim();

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

    console.log("Cleaned response:", cleanedResponse);
    const parsed = JSON.parse(cleanedResponse);

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
          flattened[key] = `${demo.age || ""}-year-old ${
            demo.job_title || "professional"
          } earning $${demo.income || "unknown"} annually`.trim();
        } else {
          flattened[key as keyof InterviewInsights] = JSON.stringify(value);
        }
      } else {
        flattened[key as keyof InterviewInsights] = String(value || "");
      }
    }

    return { insights: flattened, wasTruncated };
  } catch (parseError) {
    console.error("Failed to parse OpenAI response:", parseError);
    throw new Error("Invalid JSON response from AI");
  }
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
      insightValue = cleanDemographicsText(insightValue);
    }

    if (insightValue && insightValue.trim()) {
      if (existingResponse && existingResponse.trim()) {
        console.log(`Merging content for ${mapping.strategyKey}`);
        try {
          messagingUpdates[mapping.strategyKey] =
            await intelligentlyMergeContent(
              existingResponse,
              insightValue,
              mapping.question
            );
          console.log(`Successfully merged content for ${mapping.strategyKey}`);
        } catch (error) {
          console.error(
            `Error merging content for ${mapping.strategyKey}:`,
            error
          );
          messagingUpdates[mapping.strategyKey] = insightValue;
        }
      } else {
        messagingUpdates[mapping.strategyKey] = insightValue;
      }
    }
  }

  if (insights.additional_insights && insights.additional_insights.trim()) {
    messagingUpdates["additional_insights"] = insights.additional_insights;
  }

  return messagingUpdates;
}

async function intelligentlyMergeContent(
  existingContent: string,
  newInsight: string,
  questionContext: string
): Promise<string> {
  console.log(`Merging content for context: ${questionContext}`);
  console.log(`Existing content length: ${existingContent.length}`);
  console.log(`New insight: ${newInsight}`);

  const prompt = `You are an expert business strategist helping merge customer insights into messaging strategy.

CONTEXT: ${questionContext}

EXISTING CONTENT:
${existingContent}

NEW CUSTOMER INSIGHT:
${newInsight}

TASK: Intelligently merge the new customer insight with the existing content to create a richer, more comprehensive response. 

GUIDELINES:
- Preserve the best elements from both sources
- Add depth and specificity from the new insight
- Maintain third-person perspective (they/them, not I/me)
- Create a flowing narrative that doesn't feel duplicated
- Keep the response focused and concise (2-3 sentences max)
- If the new insight contradicts existing content, favor the more specific/emotional version

Return only the merged content, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert business strategist who merges customer insights into cohesive messaging strategy content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    const mergedContent =
      response.choices[0]?.message?.content?.trim() || existingContent;
    console.log(`Merge result: ${mergedContent}`);
    return mergedContent;
  } catch (error) {
    console.error("Error in intelligentlyMergeContent:", error);
    return `${existingContent}\n\n${newInsight}`.trim();
  }
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
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You enhance business messaging based on client research patterns. Never copy client quotes directly. Focus on helping the business owner refine their approach based on client insights.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1200,
        temperature: 0.4,
      },
      {
        timeout: 90000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from AI");
    }

    let cleanedResponse = content.trim();
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse
        .replace(/^```(json)?\s*/, "")
        .replace(/\s*```\s*$/, "");
    }

    const parsed = JSON.parse(cleanedResponse);

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


