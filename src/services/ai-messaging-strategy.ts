import {
  DataSourceValidator,
  UserContextData,
  ClientContextData,
} from "../utils/data-source-validator";
import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, validateAiText } from "../utils/ai-response";
import {
  SYSTEM_MESSAGING_EMOTIONAL_INSIGHTS,
  SYSTEM_MESSAGING_STRATEGY,
  SYSTEM_MESSAGING_STRATEGY_REGENERATION,
  MESSAGING_REGENERATION_PREFIX,
} from "@backend/shared";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface WorkbookResponses {
  [key: string]: string;
}

interface MessagingStrategyResult {
  strategy: string;
  missingInformation: string[];
  completeness: number;
  recommendations: string[];
  dataSourceReport?: any; // For debugging contamination issues
  alignmentScore?: number; // Score showing how aligned the strategy is to source data
  improvementNotes?: string[]; // Notes on what was improved from previous version
}

interface RegenerationOptions {
  previousStrategy?: string;
  feedbackNotes?: string;
  focusAreas?: string[];
}

// EMOTIONAL INSIGHTS EXTRACTION FUNCTION
async function extractEmotionalInsights(
  responses: WorkbookResponses
): Promise<string> {
  const rawAnswers = Object.entries(responses)
    .filter(([_, value]) => value?.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n\n");

  if (!rawAnswers.trim()) {
    return "No user responses available for emotional insight extraction.";
  }

  const emotionalExtractionPrompt = `<prompt>
  <task>Extract emotional insights, authentic language, and quotes from business questionnaire answers.</task>

  <inputs>
    <raw_answers><![CDATA[
${rawAnswers}
    ]]></raw_answers>
  </inputs>

  <extraction_categories>
    <category name="EMOTIONAL PAIN POINTS">Frustrations, fears, struggles in their own words</category>
    <category name="DEEP DESIRES & TRANSFORMATION">What they want to achieve, become, or experience</category>
    <category name="POWERFUL CUSTOMER QUOTES">Exact or paraphrased authentic quotes</category>
    <category name="SITUATIONAL CONTEXT">Specific scenarios, details, circumstances mentioned</category>
    <category name="IDENTITY & BELIEF SHIFTS">How they see themselves now vs. desired self</category>
    <category name="EMOTIONAL COSTS">How problems affect confidence, relationships, daily life, identity</category>
    <category name="EMOTIONAL REWARDS">What solving the problem means emotionally</category>
  </extraction_categories>

  <output_format>
    <structure>**EMOTIONAL PAIN POINTS:**\n- [List in customer's language]\n\n**DEEP DESIRES & TRANSFORMATION:**\n- [List outcomes]\n\n**POWERFUL CUSTOMER QUOTES:**\n- "[Quotes]"\n\n**SITUATIONAL CONTEXT:**\n- [Scenarios/details]\n\n**IDENTITY & BELIEF SHIFTS:**\n- [Current vs. desired self]\n\n**EMOTIONAL COSTS:**\n- [Impact on life]\n\n**EMOTIONAL REWARDS:**\n- [Emotional meaning]</structure>
    <rules>Use exact language where possible. Focus on emotions, authentic voice, specific details, transformation.</rules>
  </output_format>
</prompt>`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200, // Reduced from 2000 - emotional extraction doesn't need that much
      temperature: 0.5,
      system: SYSTEM_MESSAGING_EMOTIONAL_INSIGHTS,
      messages: [
        {
          role: "user",
          content: emotionalExtractionPrompt,
        },
      ],
    });
    

    const raw = getTextFromAnthropicContent(response.content);
    const extractedInsights = validateAiText(raw, {
      context: "emotional insights",
      fallback: "Unable to extract emotional insights at this time.",
    });
    console.log(
      "[EMOTIONAL INSIGHTS] Successfully extracted emotional insights"
    );
    return extractedInsights;
  } catch (error) {
    console.error("[EMOTIONAL INSIGHTS] Error extracting insights:", error);
    return "Unable to extract emotional insights at this time.";
  }
}

export async function generateMessagingStrategy(
  workbookResponses: WorkbookResponses,
  interviewNotes?: Record<string, string>,
  userId: number = 0,
  regenerationOptions?: RegenerationOptions
): Promise<MessagingStrategyResult> {
  try {
    // CONTAMINATION PREVENTION: Validate and separate data sources
    console.log(
      "[DATA SOURCE VALIDATION] Starting contamination prevention checks..."
    );

    // Validate workbook responses as user business data
    const validatedUserData = DataSourceValidator.validateDataSource(
      workbookResponses,
      "user_business",
      userId,
      { source: "workbook_responses" }
    );

    // Validate interview notes as client data (if provided)
    const validatedClientData = interviewNotes
      ? DataSourceValidator.validateDataSource(
          interviewNotes,
          "client_interview",
          userId,
          { source: "interview_notes" }
        )
      : {};

    // Create isolated contexts - CRITICAL: Keep contexts separate
    const userContext = DataSourceValidator.createUserContext({
      ...validatedUserData,
    });

    const clientContext = DataSourceValidator.createClientContext({
      ...validatedClientData,
    });

    // Generate contamination report for debugging
    const contaminationReport = DataSourceValidator.generateContaminationReport(
      {
        ...validatedUserData,
        ...validatedClientData,
      }
    );

    console.log(
      "[DATA SOURCE VALIDATION] Contamination report:",
      contaminationReport
    );

    // Only proceed with high-confidence user business data
    const cleanUserResponses: WorkbookResponses = {};
    for (const [key, dataPoint] of Object.entries(validatedUserData)) {
      if (
        (dataPoint as any).metadata.confidence > 0.7 &&
        (dataPoint as any).metadata.validationFlags.length === 0
      ) {
        cleanUserResponses[key] = (dataPoint as any).content;
      } else {
        console.warn(
          `[CONTAMINATION WARNING] Excluding low-confidence data point: ${key} (confidence: ${
            (dataPoint as any).metadata.confidence
          }, flags: ${(dataPoint as any).metadata.validationFlags.join(", ")})`
        );
      }
    }

    // Analyze completeness using only clean user data
    const missingInfo = identifyMissingInformation(cleanUserResponses);
    const completeness = calculateCompleteness(cleanUserResponses);

    // STEP 1: Extract emotional insights and customer quotes from raw answers using AI
    const responseCount = Object.keys(cleanUserResponses).length;
    const totalResponseLength = Object.values(cleanUserResponses).join(' ').length;

    let emotionalInsights = "";
    if (responseCount >= 3 && totalResponseLength > 200) {
      console.log(
        "[EMOTIONAL INSIGHTS] Extracting emotional insights and customer quotes..."
      );
      const startTime = Date.now();
      emotionalInsights = await extractEmotionalInsights(
        cleanUserResponses
      );
      const extractionTime = Date.now() - startTime;
      console.log(`[EMOTIONAL INSIGHTS] Extraction completed in ${extractionTime}ms`);
    } else {
      console.log(
        `[EMOTIONAL INSIGHTS] Insufficient data for extraction (responses: ${responseCount}, length: ${totalResponseLength}) - using fallback`
      );
      emotionalInsights = Object.entries(cleanUserResponses)
        .filter(([_, value]) => value?.trim())
        .slice(0, 5)
        .map(([key, value]) => `${key}: ${value.substring(0, 200)}`)
        .join('\n\n');
    }

    // STEP 2: Extract key insights from ONLY user business data
    const insights = extractKeyInsightsFromUserData(
      cleanUserResponses,
      userContext,
      emotionalInsights
    );

    // STEP 3: Extract and format client interview insights (if provided)
    const hasInterviewInsights =
      interviewNotes && Object.keys(interviewNotes).length > 0;
    let clientInterviewContext = "";
    let interviewDataStructure: any = null;

    if (hasInterviewInsights) {
      console.log(
        "[INTERVIEW ENHANCEMENT] Interview insights detected - enhancing strategy generation"
      );
      const extractedInsights = extractInterviewDataStructure(interviewNotes);
      interviewDataStructure = extractedInsights.structure;

      // Format as machine-readable JSON for the AI
      clientInterviewContext = JSON.stringify(
        extractedInsights.structure,
        null,
        2
      );

      // Log enhancement metrics (sanitized)
      console.log("[INTERVIEW ENHANCEMENT] Metrics:", {
        totalInsights: extractedInsights.metrics.totalInsights,
        quoteCount: extractedInsights.metrics.quoteCount,
        categoriesWithData: extractedInsights.metrics.categoriesWithData,
        sampleInsight: extractedInsights.metrics.sampleInsight,
      });
    } else {
      console.log(
        "[INTERVIEW ENHANCEMENT] No interview insights provided - using workbook data only"
      );
    }

    // REGENERATION MODE: Use separate system prompt optimized for enhancement
    const isRegeneration = regenerationOptions?.previousStrategy?.trim();
    const systemMessage = isRegeneration 
      ? SYSTEM_MESSAGING_STRATEGY_REGENERATION 
      : SYSTEM_MESSAGING_STRATEGY;

    // Add unique variation to ensure different outputs each time
    const uniquePromptId = Date.now();
    const variationNote = `[Generation Request #${uniquePromptId} - ${new Date().toISOString()}]`;

    // REGENERATION MODE: Build focused regeneration context
    let regenerationContext = "";
    if (isRegeneration && regenerationOptions) {
      console.log("[REGENERATION MODE] Using regeneration-optimized system prompt");
      const prevStrategy = regenerationOptions.previousStrategy || "";
      const feedbackNotes = regenerationOptions.feedbackNotes || "";
      const focusAreas = regenerationOptions.focusAreas || [];
      regenerationContext = `

${MESSAGING_REGENERATION_PREFIX}

**PREVIOUS STRATEGY TO ENHANCE:**
${prevStrategy}
${feedbackNotes ? `\n**USER FEEDBACK:** ${feedbackNotes}` : ""}
${focusAreas.length > 0 ? `\n**FOCUS AREAS:** ${focusAreas.join(", ")}` : ""}

`;
    }

    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Optimized concise XML prompt
    const userMessage = `<prompt>
  <task>Generate messaging strategy from workbook responses${hasInterviewInsights ? ' + interview insights' : ''}${isRegeneration ? ' (regeneration mode)' : ''}.</task>

  ${isRegeneration && regenerationOptions ? `
  <regeneration>
    <previous><![CDATA[${regenerationOptions.previousStrategy || ''}]]></previous>
    ${regenerationOptions.feedbackNotes ? `<feedback><![CDATA[${regenerationOptions.feedbackNotes}]]></feedback>` : ''}
    ${regenerationOptions.focusAreas?.length ? `<focus>${regenerationOptions.focusAreas.join(', ')}</focus>` : ''}
  </regeneration>
  ` : ''}

  <inputs>
    <user_data><![CDATA[${formatUserInsightsForPrompt(insights)}]]></user_data>
    ${hasInterviewInsights ? `<interview_data format="json"><![CDATA[${clientInterviewContext}]]></interview_data>
    <interview_usage>Core Promise: outcomes | Ideal Customer: quotes+scenes | Problems/Fears: quotes+scenes | Desires: outcomes+quotes | Belief Shifts: quotes</interview_usage>` : ''}
  </inputs>

  <sections>
    <s n="1" name="CORE PROMISE">1-2 sentences: "We help [customer] get [result] in [timeframe] using [framework]." Include timeframe + methodology name.</s>
    <s n="2" name="IDEAL CUSTOMER PROFILE">Start: "We serve [person/situation]." + "They're ready for [transformation], but [blocker]." Then: who they are, struggles (customer language), what they want.</s>
    <s n="3" name="BRAND VOICE GUIDELINES">Core personality, What We Believe, How We Sound (DO/DON'T), Signature Phrases, Billboard message. All from Brand Voice answers.</s>
    <s n="4" name="PROBLEMS, FRUSTRATIONS, FEARS">Min 3 problems: specific language, emotional cost, customer quotes/internal thoughts. Use exact problems.</s>
    <s n="5" name="DESIRES & SUCCESS OUTCOMES">3-5 outcomes. Each: tangible (numbers/timeframes), emotional reward, why it matters. From stated transformation.</s>
    <s n="6" name="BELIEF SHIFTS">3-5 shifts. Each: Old Belief, what it looked like, New Belief, what it looks like now. Specific & relatable.</s>
    <s n="7" name="DIFFERENTIATORS">3-5 points tied to frustrations. Each: differentiator + why it matters (personal/emotional/practical).</s>
    <s n="8" name="MESSAGING PILLARS">3 pillars. Each: name (one-sentence thesis in their voice) + 3 talking points. Core themes.</s>
    <s n="9" name="HOOKS & ANGLES">5-10 short lines in owner's voice. Address frustrations/desires. Sound like them, not generic marketing.</s>
    <s n="10" name="OFFER SNAPSHOT">Conversational. How it works, what changes, include framework name. End with vivid after-success moment.</s>
    <s n="11" name="OBJECTION-HANDLING FAQ SEEDS">5-7 Q&A pairs. Reframe doubts in owner's authentic voice.</s>
  </sections>

  <rules>
    <r>Use ONLY data provided — no assumptions</r>
    <r>No generic entrepreneur/coach language</r>
    <r>Use exact section headings: ## 1. CORE PROMISE, ## 2. IDEAL CUSTOMER PROFILE, etc.</r>
    <r>Use customer's exact language/quotes</r>
    <r>Authentic voice — sound like owner, not marketing</r>
    <r>Include numbers, timeframes, tangible outcomes</r>
    <r>Trusted advisor tone, not promotional</r>
  </rules>

  <output>
    <format>Markdown</format>
    <structure># MESSAGING STRATEGY\n\n---\n\n## 1. CORE PROMISE\n[Content]\n\n---\n\n## 2. IDEAL CUSTOMER PROFILE (ICP SNAPSHOT)\n[Content]\n\n## 3. BRAND VOICE GUIDELINES\n[Content]\n\n## 4. PROBLEMS, FRUSTRATIONS, FEARS (RANKED)\n[Content]\n\n## 5. DESIRES & SUCCESS OUTCOMES\n[Content]\n\n## 6. BELIEF SHIFTS\n[Content]\n\n## 7. DIFFERENTIATORS\n[Content]\n\n## 8. MESSAGING PILLARS (3 CORE THEMES)\n[Content]\n\n## 9. HOOKS & ANGLES\n[Content]\n\n## 10. OFFER SNAPSHOT\n[Content]\n\n## 11. OBJECTION-HANDLING FAQ SEEDS\n[Content]</structure>
    <requirements>Complete document, all 11 sections, no meta-commentary, fresh original content</requirements>
  </output>
</prompt>`;

    console.log(
      `[MESSAGING STRATEGY] Starting generation (ID: ${generationId}) at ${timestamp}`
    );
    
    const strategyStartTime = Date.now();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3500, // Reduced from 4000 - still sufficient for 11 sections but faster
      temperature: 0.7, // Reduced from 0.8 - slightly faster, still creative
      system: systemMessage,
      messages: [
        { role: "user", content: userMessage },
      ],
    });

    const strategyGenerationTime = Date.now() - strategyStartTime;
    console.log(`[MESSAGING STRATEGY] Strategy generation completed in ${strategyGenerationTime}ms`);

    const rawStrategy = validateAiText(getTextFromAnthropicContent(response.content), {
      context: "messaging strategy",
      minLength: 50,
    });

    // Log generation details to verify uniqueness
    const strategyHash = rawStrategy
      .substring(0, 200)
      .replace(/\s+/g, " ")
      .trim();
    console.log(
      `[MESSAGING STRATEGY] Generated strategy preview (first 200 chars): "${strategyHash}..."`
    );
    console.log(
      `[MESSAGING STRATEGY] Strategy length: ${rawStrategy.length} characters`
    );
    console.log(`[MESSAGING STRATEGY] Generation ID: ${generationId}`);

    // PER-SECTION VALIDATION: Verify interview insights were used in the generated strategy
    if (hasInterviewInsights && interviewDataStructure) {
      console.log(
        "[INTERVIEW INSIGHT VALIDATION] Checking if interview insights were integrated into strategy..."
      );

      const strategyLower = rawStrategy.toLowerCase();
      let quotesFound = 0;
      let outcomesFound = 0;
      let scenesFound = 0;

      // Check each section for interview data usage
      const allQuotes = [
        ...interviewDataStructure.corePromise.quotes,
        ...interviewDataStructure.idealCustomer.quotes,
        ...interviewDataStructure.problemsFears.quotes,
        ...interviewDataStructure.desires.quotes,
        ...interviewDataStructure.beliefShifts.quotes,
      ];

      const allOutcomes = [
        ...interviewDataStructure.corePromise.outcomes,
        ...interviewDataStructure.desires.outcomes,
      ];

      const allScenes = [
        ...interviewDataStructure.idealCustomer.sceneBeats,
        ...interviewDataStructure.problemsFears.sceneBeats,
      ];

      // Count how many quotes appear in the strategy (fuzzy match - first 30 chars)
      allQuotes.forEach((quote) => {
        const quoteSnippet = quote.substring(0, 30).toLowerCase();
        if (strategyLower.includes(quoteSnippet)) {
          quotesFound++;
        }
      });

      // Count how many outcomes appear in the strategy
      allOutcomes.forEach((outcome) => {
        const outcomeSnippet = outcome.substring(0, 30).toLowerCase();
        if (strategyLower.includes(outcomeSnippet)) {
          outcomesFound++;
        }
      });

      // Count how many scene beats appear in the strategy
      allScenes.forEach((scene) => {
        const sceneSnippet = scene.substring(0, 30).toLowerCase();
        if (strategyLower.includes(sceneSnippet)) {
          scenesFound++;
        }
      });

      console.log("[INTERVIEW INSIGHT VALIDATION] Results:", {
        quotesFound: `${quotesFound}/${allQuotes.length}`,
        outcomesFound: `${outcomesFound}/${allOutcomes.length}`,
        scenesFound: `${scenesFound}/${allScenes.length}`,
        usageRate: `${Math.round(
          ((quotesFound + outcomesFound + scenesFound) /
            (allQuotes.length + allOutcomes.length + allScenes.length)) *
            100
        )}%`,
      });

      if (quotesFound === 0 && outcomesFound === 0 && scenesFound === 0) {
        console.warn(
          "[INTERVIEW INSIGHT VALIDATION] ⚠️ WARNING: No interview insights detected in generated strategy!"
        );
      } else if (quotesFound + outcomesFound + scenesFound < 3) {
        console.warn(
          "[INTERVIEW INSIGHT VALIDATION] ⚠️ WARNING: Low interview insight usage detected"
        );
      } else {
        console.log(
          "[INTERVIEW INSIGHT VALIDATION] ✅ Interview insights successfully integrated into strategy"
        );
      }
    }

    // Remove unwanted AI-generated closing statements
    let cleanedStrategy = rawStrategy
      .replace(
        /Remember, the heart of this strategy is to connect with your audience on a deeply personal level, using their own words and experiences to guide them toward the transformation they desire\. Keep the language simple, the scenarios relatable, and the promises grounded in real outcomes\./gi,
        ""
      )
      .trim();

    // CRITICAL: Validate AI output for contamination
    console.log("[AI OUTPUT VALIDATION] Checking for contamination...");
    const validationResult = DataSourceValidator.validateAIOutput(
      cleanedStrategy,
      userContext,
      clientContext
    );

    let cleanStrategy = cleanedStrategy;
    if (!validationResult.isClean) {
      console.warn(
        "[CONTAMINATION DETECTED] Issues found in AI output:",
        validationResult.issues
      );

      // Use the cleaned strategy without displaying validation warnings to users
      cleanStrategy = cleanedStrategy;
    } else {
      console.log(
        "[AI OUTPUT VALIDATION] ✅ Strategy is clean, no contamination detected"
      );
    }

    console.log(
      `[MESSAGING STRATEGY] ✅ NEW strategy generated successfully (${cleanStrategy.length} characters, ID: ${generationId})`
    );

    // Calculate alignment score
    const alignmentResult = calculateAlignmentScore(
      cleanStrategy,
      cleanUserResponses,
      emotionalInsights
    );

    console.log(`[ALIGNMENT] Strategy alignment score: ${alignmentResult.score}%`);
    if (isRegeneration) {
      console.log(`[REGENERATION] This is an improved version of a previous strategy`);
    }

    return {
      strategy: cleanStrategy,
      missingInformation: missingInfo,
      completeness,
      recommendations: generateRecommendations(completeness, missingInfo),
      alignmentScore: alignmentResult.score,
      improvementNotes: alignmentResult.improvementNotes,
      dataSourceReport: {
        ...contaminationReport,
        aiValidation: {
          isClean: validationResult.isClean,
          issues: validationResult.issues,
          timestamp: new Date().toISOString(),
        },
        generationMetadata: {
          generationId,
          generatedAt: timestamp,
          isNewGeneration: !isRegeneration,
          isRegeneration: !!isRegeneration,
          temperature: 0.85,
        },
        alignmentDetails: alignmentResult.details,
      },
    };
  } catch (error) {
    console.error("Messaging strategy generation error:", error);
    throw new Error("Failed to generate messaging strategy");
  }
}

function identifyMissingInformation(responses: WorkbookResponses): string[] {
  const missing: string[] = [];

  // Check for critical positioning information
  const positioningKeys = Object.keys(responses).filter((key) =>
    key.includes("positioning")
  );
  if (
    positioningKeys.length === 0 ||
    !positioningKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Unique positioning and what makes you different");
  }

  // Check for customer avatar information
  const customerKeys = Object.keys(responses).filter((key) =>
    key.includes("customer-avatar")
  );
  if (
    customerKeys.length < 3 ||
    !customerKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Detailed customer avatar and target audience insights");
  }

  // Check for brand voice information
  const brandKeys = Object.keys(responses).filter((key) =>
    key.includes("brand-voice")
  );
  if (
    brandKeys.length === 0 ||
    !brandKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Brand voice and personality definition");
  }

  // Check for offer/problem information
  const offerKeys = Object.keys(responses).filter(
    (key) => key.includes("offer") || key.includes("problem")
  );
  if (
    offerKeys.length === 0 ||
    !offerKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Core offer and problem you solve");
  }

  return missing;
}

function calculateCompleteness(responses: WorkbookResponses): number {
  const totalPossibleSections = 15; // Estimate based on typical workbook
  const completedSections = Object.values(responses).filter(
    (response) => response && response.trim().length > 20
  ).length;

  return Math.min(100, (completedSections / totalPossibleSections) * 100);
}

function generateRecommendations(
  completeness: number,
  missingInfo: string[]
): string[] {
  const recommendations: string[] = [];

  if (completeness < 80) {
    recommendations.push(
      "Complete additional workbook sections for a more comprehensive strategy"
    );
  }

  if (missingInfo.length > 0) {
    recommendations.push(`Focus on: ${missingInfo.join(", ")}`);
  }

  if (completeness > 80) {
    recommendations.push(
      "Consider conducting customer interviews to add depth and authenticity"
    );
    recommendations.push("Test key messages with your target audience");
    recommendations.push("Refine based on market feedback and results");
  }

  return recommendations;
}

// NEW CONTAMINATION-SAFE FUNCTIONS

function extractKeyInsightsFromUserData(
  responses: WorkbookResponses,
  userContext: UserContextData,
  emotionalInsights?: string
) {
  return {
    // AI-extracted emotional insights (prioritized)
    emotionalInsights: emotionalInsights || "",

    // Structured data from workbook
    positioning: Object.entries(responses)
      .filter(([key]) => key.includes("positioning"))
      .map(([key, value]) => ({ key, value })),
    customerAvatar: Object.entries(responses)
      .filter(([key]) => key.includes("customer-avatar"))
      .map(([key, value]) => ({ key, value })),
    brandVoice: Object.entries(responses)
      .filter(([key]) => key.includes("brand-voice"))
      .map(([key, value]) => ({ key, value })),
    offer: Object.entries(responses)
      .filter(([key]) => key.includes("offer") || key.includes("problem"))
      .map(([key, value]) => ({ key, value })),
    other: Object.entries(responses)
      .filter(
        ([key]) =>
          !key.includes("positioning") &&
          !key.includes("customer-avatar") &&
          !key.includes("brand-voice") &&
          !key.includes("offer") &&
          !key.includes("problem")
      )
      .map(([key, value]) => ({ key, value })),
    businessContext: {
      name: userContext.businessName,
      industry: userContext.industry,
      stage: userContext.businessStage,
    },
  };
}

function formatUserInsightsForPrompt(insights: any): string {
  let formatted = "";

  // PRIORITY #1: AI-extracted emotional insights (most important for messaging)
  if (insights.emotionalInsights?.trim()) {
    formatted +=
      "===== EMOTIONAL INSIGHTS & CUSTOMER LANGUAGE (EXTRACTED BY AI) =====\n";
    formatted +=
      "Use this emotional intelligence as your PRIMARY SOURCE for creating authentic, deep messaging.\n\n";
    formatted += insights.emotionalInsights;
    formatted += "\n\n===== STRUCTURED DATA FROM WORKBOOK =====\n\n";
  }

  formatted += "BUSINESS OWNER'S VALIDATED RESPONSES:\n\n";

  // PRIORITY #2: BRAND VOICE (moved to top - this is CRITICAL for the new Brand Voice Guidelines section)
  if (insights.brandVoice.length > 0) {
    formatted +=
      "⭐ BRAND VOICE & PERSONALITY (CRITICAL - Use these answers to create the Brand Voice Guidelines section):\n";
    insights.brandVoice.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted +=
      "\nYou MUST use these brand voice answers to create a detailed, authentic Brand Voice Guidelines section that captures their unique personality, beliefs, and communication style.\n\n";
  }

  if (insights.positioning.length > 0) {
    formatted += "UNIQUE POSITIONING & EXPERTISE:\n";
    insights.positioning.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.customerAvatar.length > 0) {
    formatted += "TARGET CUSTOMER UNDERSTANDING:\n";
    insights.customerAvatar.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.offer.length > 0) {
    formatted += "OFFER & PROBLEM SOLUTION:\n";
    insights.offer.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.other.length > 0) {
    formatted += "ADDITIONAL BUSINESS INSIGHTS:\n";
    insights.other.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  return formatted;
}


function extractInterviewDataStructure(
  interviewNotes: Record<string, string>
): {
  structure: any;
  metrics: {
    totalInsights: number;
    quoteCount: number;
    categoriesWithData: number;
    sampleInsight: string;
  };
} {
  const structure = {
    corePromise: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    idealCustomer: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    problemsFears: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    desires: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    beliefShifts: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
  };

  const sectionKeyMappings = {
    corePromise: ["magic_solution", "success_measures"],
    idealCustomer: [
      "frustrations",
      "nighttime_worries",
      "demographics",
      "blockers",
    ],
    problemsFears: ["frustrations", "nighttime_worries", "secret_fears"],
    desires: ["magic_solution", "success_measures", "referral_outcomes"],
    beliefShifts: ["failed_solutions", "blockers", "investment_criteria"],
  };

  let totalInsights = 0;
  let quoteCount = 0;
  let sampleInsight = "";
  let categoriesWithData = 0;

  // Process each interview note
  for (const [key, value] of Object.entries(interviewNotes)) {
    if (!value || !value.trim()) continue;

    totalInsights++;
    if (!sampleInsight) {
      sampleInsight =
        value.substring(0, 120) + (value.length > 120 ? "..." : "");
    }

    // Map to appropriate sections
    for (const [sectionName, keys] of Object.entries(sectionKeyMappings)) {
      if (keys.includes(key)) {
        const section = structure[sectionName as keyof typeof structure];

        // Always add as quote (customer's own words)
        section.quotes.push(value);
        quoteCount++;

        // Add to sceneBeats if it contains cinematic elements
        if (hasSceneElements(value)) {
          section.sceneBeats.push(value);
        }

        // Add to outcomes if it contains tangible results
        if (hasTangibleOutcome(value)) {
          section.outcomes.push(value);
        }
      }
    }
  }

  // Count categories with data
  for (const section of Object.values(structure)) {
    if (
      section.quotes.length > 0 ||
      section.sceneBeats.length > 0 ||
      section.outcomes.length > 0
    ) {
      categoriesWithData++;
    }
  }

  return {
    structure,
    metrics: {
      totalInsights,
      quoteCount,
      categoriesWithData,
      sampleInsight,
    },
  };
}

function hasSceneElements(text: string): boolean {
  // Check for cinematic/scene elements (actions, sensory details, moments)
  const sceneIndicators = [
    /\b(sitting|standing|walking|lying|staring|watching|looking|feeling|wondering)\b/i,
    /\b(at \d+[ap]m|midnight|morning|evening|night)\b/i,
    /\b(desk|computer|screen|phone|laptop|office|home|kitchen)\b/i,
    /\b(each time|every time|when|after|before)\b/i,
  ];

  return sceneIndicators.some((pattern) => pattern.test(text));
}

function hasTangibleOutcome(text: string): boolean {
  // Check for tangible outcomes (numbers, timeframes, specific results)
  const outcomeIndicators = [
    /\$\d+/, // Money
    /\d+\s*(clients?|customers?|sales?|leads?)/i, // Client numbers
    /\d+\s*(days?|weeks?|months?|hours?)/i, // Timeframes
    /\b\d+[ap]m\b/i, // Specific times
    /\bincrease|decrease|grow|earn|save|gain|reach\b/i, // Result verbs
  ];

  return outcomeIndicators.some((pattern) => pattern.test(text));
}

// ALIGNMENT SCORING FUNCTION
function calculateAlignmentScore(
  strategy: string,
  workbookResponses: WorkbookResponses,
  emotionalInsights: string
): { score: number; details: string[]; improvementNotes: string[] } {
  const strategyLower = strategy.toLowerCase();
  let totalPoints = 0;
  let maxPoints = 0;
  const details: string[] = [];
  const improvementNotes: string[] = [];

  // 1. Check for direct quote usage (20 points max)
  maxPoints += 20;
  const allResponses = Object.values(workbookResponses).filter(r => r?.trim());
  let quotesFound = 0;
  
  allResponses.forEach(response => {
    if (!response) return;
    // Check for significant phrases (5+ words) from responses
    const words = response.split(/\s+/).filter(w => w.length > 3);
    const significantPhrases = [];
    
    for (let i = 0; i < words.length - 4; i++) {
      const phrase = words.slice(i, i + 5).join(' ').toLowerCase();
      if (strategyLower.includes(phrase)) {
        quotesFound++;
        break; // Count each response once
      }
    }
  });
  
  const quoteScore = Math.min(20, (quotesFound / Math.max(1, allResponses.length)) * 40);
  totalPoints += quoteScore;
  details.push(`Direct quotes usage: ${quotesFound}/${allResponses.length} responses referenced (${Math.round(quoteScore)} pts)`);
  
  if (quoteScore < 15) {
    improvementNotes.push("Include more EXACT language and phrases from the workbook responses");
  }

  // 2. Check for proprietary framework/method mentions (15 points max)
  maxPoints += 15;
  const frameworkPatterns = [
    /framework/gi,
    /method/gi,
    /system/gi,
    /process/gi,
    /approach/gi,
    /→|->|step\s*\d/gi, // Arrow patterns or numbered steps
  ];
  
  let frameworkMentions = 0;
  frameworkPatterns.forEach(pattern => {
    const matches = strategy.match(pattern);
    if (matches) frameworkMentions += matches.length;
  });
  
  const frameworkScore = Math.min(15, frameworkMentions * 3);
  totalPoints += frameworkScore;
  details.push(`Proprietary method integration: ${frameworkMentions} mentions (${Math.round(frameworkScore)} pts)`);
  
  if (frameworkScore < 10) {
    improvementNotes.push("Integrate the owner's proprietary framework/method more prominently throughout");
  }

  // 3. Check for generic cliché avoidance (15 points max - lose points for clichés)
  maxPoints += 15;
  const genericClichés = [
    "transform your life",
    "unlock your potential",
    "take it to the next level",
    "maximize your",
    "empowered",
    "uplevel",
    "game-changer",
    "breakthrough",
    "skyrocket",
    "supercharge",
    "crushing it",
    "living your best life",
  ];
  
  let clichéCount = 0;
  genericClichés.forEach(cliché => {
    if (strategyLower.includes(cliché.toLowerCase())) {
      clichéCount++;
    }
  });
  
  const clichéScore = Math.max(0, 15 - (clichéCount * 3));
  totalPoints += clichéScore;
  details.push(`Generic cliché avoidance: ${clichéCount} clichés found (${Math.round(clichéScore)} pts)`);
  
  if (clichéScore < 12) {
    improvementNotes.push("Remove generic industry clichés and replace with owner-specific language");
  }

  // 3b. Check for AUDIENCE DRIFT (10 points max - CRITICAL for alignment)
  maxPoints += 10;
  const driftIndicators = [
    // Generic entrepreneur/business language that may not match actual avatar
    { term: "entrepreneur", penalty: 2, note: "generic 'entrepreneur' language" },
    { term: "business owner", penalty: 1, note: "generic 'business owner' language" },
    { term: "scale your business", penalty: 3, note: "hustle/scale language" },
    { term: "6-figure", penalty: 3, note: "income claim language" },
    { term: "7-figure", penalty: 3, note: "income claim language" },
    { term: "crushing it", penalty: 2, note: "hustle culture language" },
    { term: "hustle", penalty: 2, note: "hustle language" },
    { term: "grind", penalty: 2, note: "grind culture language" },
    { term: "boss babe", penalty: 3, note: "cliché audience term" },
    { term: "girlboss", penalty: 3, note: "cliché audience term" },
    { term: "solopreneur", penalty: 1, note: "generic audience term" },
    { term: "side hustle", penalty: 2, note: "hustle language" },
    { term: "passive income", penalty: 2, note: "generic promise" },
    { term: "work from anywhere", penalty: 1, note: "generic promise" },
    { term: "fire your boss", penalty: 3, note: "aggressive language" },
    { term: "quit your 9-5", penalty: 2, note: "generic positioning" },
  ];
  
  let driftPenalty = 0;
  const driftIssues: string[] = [];
  
  driftIndicators.forEach(indicator => {
    const regex = new RegExp(indicator.term, 'gi');
    const matches = strategyLower.match(regex);
    if (matches && matches.length > 0) {
      driftPenalty += indicator.penalty * matches.length;
      driftIssues.push(`${indicator.note} (${matches.length}x)`);
    }
  });
  
  const driftScore = Math.max(0, 10 - driftPenalty);
  totalPoints += driftScore;

  details.push(`Audience drift check: ${driftPenalty} drift penalty (${Math.round(driftScore)} pts)`);
  
  if (driftScore < 7) {
    improvementNotes.push(`DRIFT DETECTED: Strategy may have drifted from source data. Issues: ${driftIssues.slice(0, 3).join(', ')}`);
    improvementNotes.push("Re-read the workbook answers and use THEIR exact audience description, not generic terms");
  }

  // 3c. Check for PROMOTIONAL/HYPEY TONE (10 points max)
  maxPoints += 10;
  const promotionalIndicators = [
    { term: "transform", penalty: 1, note: "promotional language" },
    { term: "powerful", penalty: 1, note: "hypey adjective" },
    { term: "amazing", penalty: 2, note: "hypey adjective" },
    { term: "incredible", penalty: 2, note: "hypey adjective" },
    { term: "revolutionary", penalty: 3, note: "over-promotional" },
    { term: "game-changing", penalty: 2, note: "cliché promotional" },
    { term: "life-changing", penalty: 1, note: "promotional language" },
    { term: "finally!", penalty: 2, note: "sales pressure language" },
    { term: "imagine if", penalty: 1, note: "sales technique" },
    { term: "what if i told you", penalty: 3, note: "salesy opener" },
    { term: "secret", penalty: 2, note: "clickbait language" },
    { term: "proven", penalty: 1, note: "promotional claim" },
    { term: "guaranteed", penalty: 2, note: "promotional claim" },
    { term: "exclusive", penalty: 1, note: "promotional language" },
    { term: "limited time", penalty: 3, note: "urgency sales tactic" },
    { term: "act now", penalty: 3, note: "urgency sales tactic" },
    { term: "don't miss", penalty: 2, note: "urgency sales tactic" },
  ];
  
  let promotionalPenalty = 0;
  const promotionalIssues: string[] = [];
  
  promotionalIndicators.forEach(indicator => {
    const regex = new RegExp(indicator.term, 'gi');
    const matches = strategyLower.match(regex);
    if (matches && matches.length > 0) {
      promotionalPenalty += indicator.penalty * matches.length;
      promotionalIssues.push(`${indicator.note} (${matches.length}x)`);
    }
  });
  
  const promotionalScore = Math.max(0, 10 - promotionalPenalty);
  totalPoints += promotionalScore;
  details.push(`Promotional tone check: ${promotionalPenalty} promotional penalty (${Math.round(promotionalScore)} pts)`);
  
  if (promotionalScore < 7) {
    improvementNotes.push(`PROMOTIONAL TONE DETECTED: Strategy sounds too salesy. Issues: ${promotionalIssues.slice(0, 3).join(', ')}`);
    improvementNotes.push("Use grounded, trusted advisor tone — not promotional marketing language");
  }

  // 3d. Check for VERBOSITY (5 points max)
  maxPoints += 5;
  const fillerWords = [
    "really", "very", "truly", "deeply", "absolutely", "actually", 
    "basically", "literally", "definitely", "certainly", "obviously",
    "simply", "just", "quite", "rather", "somewhat"
  ];
  
  let fillerCount = 0;
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = strategy.match(regex);
    if (matches) fillerCount += matches.length;
  });
  
  // Penalize excessive filler words (more than 5 is verbose)
  const verbosityPenalty = Math.max(0, fillerCount - 5);
  const verbosityScore = Math.max(0, 5 - verbosityPenalty);
  totalPoints += verbosityScore;
  details.push(`Verbosity check: ${fillerCount} filler words (${Math.round(verbosityScore)} pts)`);
  
  if (verbosityScore < 3) {
    improvementNotes.push(`VERBOSITY DETECTED: ${fillerCount} filler words found. Remove: really, very, truly, deeply, etc.`);
    improvementNotes.push("Be more concise — say more with fewer words");
  }

  // 4. Check for emotional insights integration (20 points max)
  maxPoints += 20;
  if (emotionalInsights?.trim()) {
    const insightKeywords = emotionalInsights
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 5)
      .slice(0, 50); // Sample 50 significant words
    
    let insightsUsed = 0;
    insightKeywords.forEach(keyword => {
      if (strategyLower.includes(keyword)) {
        insightsUsed++;
      }
    });
    
    const insightScore = Math.min(20, (insightsUsed / Math.max(1, insightKeywords.length)) * 40);
    totalPoints += insightScore;
    details.push(`Emotional insights integration: ${insightsUsed}/${insightKeywords.length} keywords (${Math.round(insightScore)} pts)`);
    
    if (insightScore < 15) {
      improvementNotes.push("Weave more emotional insights and customer language throughout the strategy");
    }
  } else {
    totalPoints += 10; // Partial points if no insights available
    details.push("Emotional insights: Not available (10 pts default)");
  }

  // 5. Check for specificity (tangible outcomes) (15 points max)
  maxPoints += 15;
  const tangiblePatterns = [
    /\$\d+/g, // Money amounts
    /\d+\s*(clients?|customers?|sales?|leads?|students?)/gi, // Numbers
    /\d+\s*(days?|weeks?|months?|hours?|minutes?)/gi, // Timeframes
    /\d+[ap]m/gi, // Specific times
    /\d+%/g, // Percentages
  ];
  
  let tangibleCount = 0;
  tangiblePatterns.forEach(pattern => {
    const matches = strategy.match(pattern);
    if (matches) tangibleCount += matches.length;
  });
  
  const tangibleScore = Math.min(15, tangibleCount * 2);
  totalPoints += tangibleScore;
  details.push(`Tangible specificity: ${tangibleCount} specific numbers/outcomes (${Math.round(tangibleScore)} pts)`);
  
  if (tangibleScore < 10) {
    improvementNotes.push("Add more specific numbers, timeframes, and measurable outcomes");
  }

  // 6. Check for section completeness (15 points max)
  maxPoints += 15;
  const requiredSections = [
    "core promise",
    "ideal customer",
    "brand voice",
    "problems",
    "desires",
    "belief shifts",
    "differentiators",
    "messaging pillars",
    "hooks",
    "offer snapshot",
    "objection",
  ];
  
  let sectionsFound = 0;
  requiredSections.forEach(section => {
    if (strategyLower.includes(section)) {
      sectionsFound++;
    }
  });
  
  const sectionScore = Math.round((sectionsFound / requiredSections.length) * 15);
  totalPoints += sectionScore;
  details.push(`Section completeness: ${sectionsFound}/${requiredSections.length} sections (${sectionScore} pts)`);
  
  if (sectionScore < 13) {
    improvementNotes.push("Ensure all required sections are present and properly labeled");
  }

  const finalScore = Math.round((totalPoints / maxPoints) * 100);
  
  console.log(`[ALIGNMENT SCORE] Final score: ${finalScore}% (${totalPoints}/${maxPoints} points)`);
  details.forEach(d => console.log(`  - ${d}`));

  return {
    score: finalScore,
    details,
    improvementNotes: improvementNotes.length > 0 ? improvementNotes : ["Strategy is well-aligned with source data"],
  };
}
