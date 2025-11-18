import OpenAI from "openai";
import { DataSourceValidator, UserContextData, ClientContextData } from '../utils/data-source-validator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
}

// EMOTIONAL INSIGHTS EXTRACTION FUNCTION
async function extractEmotionalInsights(responses: WorkbookResponses): Promise<string> {
  const rawAnswers = Object.entries(responses)
    .filter(([_, value]) => value?.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n\n");

  if (!rawAnswers.trim()) {
    return "No user responses available for emotional insight extraction.";
  }

  const emotionalExtractionPrompt = `You are an expert at extracting emotional insights, authentic customer language, and powerful quotes from raw business questionnaire answers.

Your task is to analyze the user's answers and extract:
1. **Emotional Pain Points**: What frustrations, fears, and struggles do they describe (in their own words)?
2. **Deep Desires**: What do they really want? What transformation are they seeking?
3. **Customer Quotes**: Exact phrases or paraphrased language that feels authentic and human
4. **Situational Context**: Specific scenarios, details, or circumstances they mention
5. **Identity & Belief Shifts**: How do they see themselves? What beliefs are holding them back or driving them forward?
6. **Emotional Costs**: How do their problems affect their confidence, relationships, daily life, or sense of self?
7. **Emotional Rewards**: What would solving this problem mean to them emotionally?

RAW USER ANSWERS:
${rawAnswers}

EXTRACT AND ORGANIZE EMOTIONAL INSIGHTS:
Provide a structured summary of the emotional insights you found in the user's answers. Use their exact language wherever possible. Focus on emotions, authentic voice, specific details, and transformation.

Format your response as follows:

**EMOTIONAL PAIN POINTS:**
- [List specific frustrations, fears, struggles in customer's language]

**DEEP DESIRES & TRANSFORMATION:**
- [List what they want to achieve, become, or experience]

**POWERFUL CUSTOMER QUOTES:**
- "[Exact or paraphrased quotes that feel authentic]"

**SITUATIONAL CONTEXT:**
- [Specific scenarios, circumstances, or details they mentioned]

**IDENTITY & BELIEF SHIFTS:**
- [How they see themselves now vs. how they want to see themselves]

**EMOTIONAL COSTS:**
- [How problems affect confidence, relationships, daily life, identity]

**EMOTIONAL REWARDS:**
- [What solving the problem means to them emotionally]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert at extracting emotional insights and authentic customer language from raw questionnaire data." },
        { role: "user", content: emotionalExtractionPrompt }
      ],
      max_tokens: 3000,
      temperature: 0.5,
    });

    const extractedInsights = response.choices[0]?.message?.content || "";
    console.log('[EMOTIONAL INSIGHTS] Successfully extracted emotional insights');
    return extractedInsights;
  } catch (error) {
    console.error('[EMOTIONAL INSIGHTS] Error extracting insights:', error);
    return "Unable to extract emotional insights at this time.";
  }
}

export async function generateMessagingStrategy(
  workbookResponses: WorkbookResponses,
  interviewNotes?: Record<string, string>,
  userId: number = 0
): Promise<MessagingStrategyResult> {
  try {
    // CONTAMINATION PREVENTION: Validate and separate data sources
    console.log('[DATA SOURCE VALIDATION] Starting contamination prevention checks...');
    
    // Validate workbook responses as user business data
    const validatedUserData = DataSourceValidator.validateDataSource(
      workbookResponses,
      'user_business',
      userId,
      { source: 'workbook_responses' }
    );

    // Validate interview notes as client data (if provided)
    const validatedClientData = interviewNotes 
      ? DataSourceValidator.validateDataSource(
          interviewNotes,
          'client_interview', 
          userId,
          { source: 'interview_notes' }
        )
      : {};

    // Create isolated contexts - CRITICAL: Keep contexts separate
    const userContext = DataSourceValidator.createUserContext({
      ...validatedUserData
    });
    
    const clientContext = DataSourceValidator.createClientContext({
      ...validatedClientData
    });

    // Generate contamination report for debugging
    const contaminationReport = DataSourceValidator.generateContaminationReport({
      ...validatedUserData,
      ...validatedClientData
    });

    console.log('[DATA SOURCE VALIDATION] Contamination report:', contaminationReport);

    // Only proceed with high-confidence user business data
    const cleanUserResponses: WorkbookResponses = {};
    for (const [key, dataPoint] of Object.entries(validatedUserData)) {
      if (dataPoint.metadata.confidence > 0.7 && dataPoint.metadata.validationFlags.length === 0) {
        cleanUserResponses[key] = dataPoint.content;
      } else {
        console.warn(`[CONTAMINATION WARNING] Excluding low-confidence data point: ${key} (confidence: ${dataPoint.metadata.confidence}, flags: ${dataPoint.metadata.validationFlags.join(', ')})`);
      }
    }

    // Analyze completeness using only clean user data
    const missingInfo = identifyMissingInformation(cleanUserResponses);
    const completeness = calculateCompleteness(cleanUserResponses);

    // STEP 1: Extract emotional insights and customer quotes from raw answers using AI
    console.log('[EMOTIONAL INSIGHTS] Extracting emotional insights and customer quotes...');
    const emotionalInsights = await extractEmotionalInsights(cleanUserResponses);
    
    // STEP 2: Extract key insights from ONLY user business data
    const insights = extractKeyInsightsFromUserData(cleanUserResponses, userContext, emotionalInsights);

    const systemMessage = `You are an expert brand strategist and messaging consultant specializing in EMOTIONALLY DEEP, AUTHENTIC, CUSTOMER-VOICE messaging. Your job is to create a Messaging Strategy that feels personal, relatable, and written in the customer's voice—not corporate or generic.

CRITICAL: Your writing must be CINEMATIC, VISCERAL, and MOMENT-BY-MOMENT—like you're painting a vivid picture the reader can feel.

CRITICAL: Use TANGIBLE, REAL-WORLD OUTCOMES instead of vague benefits.

TONE COMPARISON (Learn from this example):

❌ BEFORE (Surface-level):
"They feel stuck and overwhelmed, saying things like, 'I feel invisible despite posting every day.' They lack clarity on what strategies to follow."

✅ AFTER (Emotionally deep - THIS IS YOUR TARGET):
"They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?' That quiet doubt has turned into exhaustion and second-guessing every move."

TANGIBILITY REQUIREMENT - ALWAYS USE CONCRETE OUTCOMES:

❌ VAGUE (Never write like this):
- "Achieve better work-life balance"
- "Grow your business"
- "Feel more confident"
- "Be more successful"
- "Scale your income"

✅ TANGIBLE (Always write like this - specific, real-world, observable):
- "Close your laptop at 5pm and have guilt-free family dinners"
- "Sign 3 new $2K clients every month without cold calling"
- "Wake up on Tuesday mornings excited instead of dreading your inbox"
- "Book 10 discovery calls per week from Instagram alone"
- "Replace your corporate salary within 6 months and work from your kitchen table"

CRITICAL CORE PRINCIPLES:

1. CINEMATIC STORYTELLING (NOT DESCRIPTION)
- Don't describe feelings — SHOW the moment when it happens
- Include specific actions, sensory details, and internal dialogue
- Show emotional PROGRESSION (how one feeling builds into another over time)
- Use active, present-tense language that puts the reader IN the moment
- Example: NOT "They feel overwhelmed" → YES "They close their laptop at midnight, exhausted, wondering why nothing's working"

2. CUSTOMER-LANGUAGE FIRST
- Always use the customer's own language wherever possible (exact quotes or paraphrased from user's answers)
- Avoid buzzwords, hypey adjectives, and vague terms like "maximize," "empower," "scale"
- Write as if speaking directly to the customer in a friendly, conversational tone—like a trusted friend

3. EMOTIONAL DEPTH & AUTHENTICITY
- Add small, real-life situational details and sensory descriptions (e.g., "sitting at your desk at 11pm, staring at the screen")
- Include internal dialogue: "wondering, 'What am I missing?'" or "asking yourself, 'Am I cut out for this?'"
- Show emotional PROGRESSION: "That quiet doubt has turned into exhaustion and second-guessing every move"
- Always name both the emotional cost AND the emotional reward
- Make it personal: how does this affect their confidence, relationships, daily experience, or sense of self?

4. SPECIFICITY OVER ABSTRACTION (MANDATORY)
- ALWAYS replace vague words with concrete, tangible, real-world outcomes
- BAD: "better work-life balance" → GOOD: "close your laptop at 5pm and have guilt-free weekends"
- BAD: "grow your business" → GOOD: "sign 5 new clients per month and hit consistent $10K revenue"
- BAD: "feel confident" → GOOD: "wake up Tuesday mornings excited, not dreading your inbox"
- BAD: "be successful" → GOOD: "book 15 sales calls per week without paid ads"
- Add specific moments: "Each time they open Instagram," "After another late night working," "When clients ghost them"
- Every frustration, desire, or promise should be something measurable, observable, or deeply relatable
- ALWAYS use numbers, timeframes (e.g., "within 90 days," "in 6 weeks," "by month 3"), and specific scenarios
- Make outcomes VISUAL - what does success actually look like in their day-to-day life?

5. VIVID BELIEF SHIFTS
- Make belief shifts visual and emotional: describe what they used to do or feel vs. what changes now
- Show the transformation in their daily life, not just as an abstract concept
- Use before/after language that paints a clear picture with MOMENTS
- Example: NOT "They used to feel stressed" → YES "They used to lie awake at 2am replaying every sales call, wondering what went wrong. Now they wake up confident, knowing exactly what to say."

6. OUTCOME-DRIVEN DIFFERENTIATORS
- Tie every differentiator and feature to a personal, emotional, or practical outcome
- Don't just list what makes you different—explain why it matters to the customer's experience IN A SPECIFIC MOMENT

7. CLARITY & SIMPLICITY
- Keep sentences short, simple, and emotionally grounded
- Avoid hype, buzzwords, and marketing fluff
- Messaging should be instantly understandable by someone outside the industry

8. CONSISTENCY ACROSS ASSETS
- Maintain consistency across all sections—every part should reinforce the same promise and emotional themes
- The same core promise, frustrations, and desires should appear throughout
- Do not introduce new ideas that aren't in the user's answers—refine what's there

GENERATION RULES (MANDATORY):
- If input is vague: rewrite it with TANGIBLE, SPECIFIC, REAL-WORLD outcomes (e.g., "grow my business" → "sign 5 new $2K clients per month, close your laptop at 5pm guilt-free, and stop second-guessing every decision")
- If jargon appears: replace with plain, concrete terms (e.g., "maximize ROI" → "make $15K per month from 10 hours of work instead of $5K from 60 hours")
- ALWAYS include specific numbers, timeframes, and observable outcomes
- Make the user's unique differentiator (framework, system, methodology) central to the promise
- Always tie back to the customer's core desires, frustrations, and identity
- Use exact customer quotes AND internal dialogue throughout
- Add sensory details and specific moments that make it FEEL REAL
- Show emotional PROGRESSION, not just emotional states
- No contradictions: all outputs must ladder back to the same core promise and emotional journey
- TANGIBLE OUTCOMES ARE NON-NEGOTIABLE: Every promise, outcome, and desire must be concrete and observable`;

    const userMessage = `USER'S RESPONSES:
${formatUserInsightsForPrompt(insights)}

CREATE A COMPLETE MESSAGING STRATEGY WITH THE FOLLOWING SECTIONS:

# MESSAGING STRATEGY

---

## 1. CORE PROMISE
Write 1-2 sentences using this formula: "We help [ideal customer] get [specific, tangible result] in [timeframe] without [major tradeoff] — using [your unique differentiator/framework/system]."

CRITICAL REQUIREMENTS:
- The result MUST be TANGIBLE and CONCRETE (real-life outcome they can picture)
- INCLUDE the user's unique differentiator, framework, or methodology in the promise
- Use SPECIFIC timeframes (e.g., "in 90 days," "within 6 weeks," "in 3 months")
- Replace vague benefits with observable outcomes

EXAMPLES OF TANGIBLE vs. VAGUE:
❌ VAGUE: "We help busy entrepreneurs achieve better work-life balance"
✅ TANGIBLE: "We help overwhelmed coaches close their laptop at 5pm and have guilt-free family dinners within 90 days using our Life Ecosystem framework"

❌ VAGUE: "We help businesses grow their revenue"
✅ TANGIBLE: "We help service providers sign 5 new $3K clients per month without cold calling in just 12 weeks through our Conversation-First Method"

❌ VAGUE: "We help you feel more confident"
✅ TANGIBLE: "We help first-time course creators launch to 50+ paying students in 6 weeks and wake up excited on Monday mornings using our Validation-First Launch System"

MUST use concrete, real-world language from the user's answers. Make it feel REAL and OBSERVABLE.

---

## 2. IDEAL CUSTOMER PROFILE (ICP SNAPSHOT)

**Who They Are:**
[Role, stage, situation - use everyday language, not demographic jargon. Make it VIVID and RELATABLE.]

**What They're Struggling With:**
[Use CINEMATIC, MOMENT-BY-MOMENT language. Show specific actions and emotional progression. Include sensory details and internal dialogue.
Example: NOT "They struggle with marketing" → YES "They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'"]

**What They Want Most:**
[Their deepest desires with SPECIFIC MOMENTS and emotional rewards they can picture themselves experiencing]

---

## 3. PROBLEMS, FRUSTRATIONS, FEARS (RANKED)

CRITICAL: Use CINEMATIC, VISCERAL language. Show the MOMENT and emotional PROGRESSION - don't just describe feelings.

List at least 3 problems. Each must be written in the CINEMATIC style (like the "After" example).

Required elements for each problem:
- The specific problem told as a VIVID MOMENT with actions, sensory details, and internal dialogue
- Emotional PROGRESSION (show how one feeling builds into another)
- Include exact customer quotes or internal dialogue
- Show specific scenarios and situations

Example format (FOLLOW THIS STYLE):
**Problem 1:** They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, "What am I missing?" That quiet doubt has turned into exhaustion and second-guessing every move.
- **Emotional Cost:** [Show how this PROGRESSES and affects their life in SPECIFIC MOMENTS]
- **Frustration:** "[Customer quote with emotional context]"
- **Fear:** "[Internal dialogue - what they're secretly asking themselves]"

---

## 4. DESIRES & SUCCESS OUTCOMES

List 3-5 specific outcomes the customer wants.
For each outcome, include:
- **Tangible Outcome:** [Specific, measurable result - money, time, clients, metrics with numbers]
- **Emotional Reward:** [How this makes them feel and why it matters to their life or identity]
- **Why It Matters:** [Connection to their deeper values, relationships, or sense of self]

Example:
- **Tangible Outcome:** Sign 5 new clients per month at $2K each
- **Emotional Reward:** Finally feel confident in your skills and proud to talk about your business at family gatherings
- **Why It Matters:** You can prove to yourself (and others) that this isn't just a hobby—it's a real, sustainable career

---

## 5. BELIEF SHIFTS

List 3-5 key mindset shifts required to buy.

Make these VIVID and VISUAL. Describe what they used to do or feel vs. what changes now in their daily experience.

Format each as:
- **Old Belief:** [What they currently believe that's holding them back]
- **What This Looked Like:** [Specific behavior or feeling - e.g., "You'd spend hours perfecting every post, then feel crushed when no one engaged"]
- **New Belief:** [What they need to believe to move forward]
- **What This Looks Like Now:** [How their daily experience changes - e.g., "Now you create content with confidence, knowing your message attracts the right people"]

Example:
- **Old Belief:** I need a big audience to make sales
- **What This Looked Like:** You'd obsess over follower counts and feel like a failure every time someone unfollowed you
- **New Belief:** I just need a clear message that speaks to the right people
- **What This Looks Like Now:** You focus on connection over numbers, and the clients who reach out are actually ready to buy

---

## 6. DIFFERENTIATORS

List 3-5 points that make this business unique, tied directly to the frustrations above.

For each differentiator, connect it to a PERSONAL, EMOTIONAL, or PRACTICAL outcome for the customer.
Don't just list what makes you different—explain why it matters to their experience, life, or results.

Format:
- **[Differentiator]:** [Brief description]
- **Why This Matters to You:** [Personal/emotional/practical impact on customer's life]

Example:
- **We Focus on Strategy Before Tactics:** Instead of throwing spaghetti at the wall, we help you build a clear plan first
- **Why This Matters to You:** You stop wasting time on "busy work" that doesn't move the needle, and finally know exactly what to do next without second-guessing yourself

---

## 7. MESSAGING PILLARS (3 CORE THEMES)

For each pillar, include:
- **Pillar Name:** [One-sentence thesis]
- **Talking Points:**
  1. [First talking point]
  2. [Second talking point]
  3. [Third talking point]

These are the core themes that all content and copy should reinforce.

---

## 8. HOOKS & ANGLES

List 5-10 short, punchy lines or angles they can use in copy.

Write these as if SPEAKING DIRECTLY TO THE CUSTOMER in a friendly, conversational tone.
Each hook should highlight a frustration, desire, or belief shift using customer language.

Make them feel personal and relatable—like you're talking to one person, not broadcasting to a crowd.

Examples (conversational, direct to customer):
- "You don't need a bigger audience. You need a clearer message."
- "What if your next client came from a conversation, not a complicated funnel?"
- "Stop posting every day and hoping someone notices. Here's what actually works."

---

## 9. OFFER SNAPSHOT

Write this in a CONVERSATIONAL, AUTHENTIC tone—NOT salesy or polished.

Paint a picture of how it works and what changes for them using CINEMATIC language with TANGIBLE OUTCOMES.
- Avoid curriculum-heavy descriptions and marketing jargon
- Focus on the transformation and CONCRETE outcomes, not features
- Make it feel like you're describing it to a friend
- MUST include the user's unique differentiator/framework/system name

END THIS SECTION with a vivid, SPECIFIC MOMENT of life after success.
Paint a scene they can SEE and FEEL with TANGIBLE, OBSERVABLE DETAILS:
- What does their Tuesday morning look like?
- What time do they close their laptop?
- How many clients/sales/income do they have?
- What specific emotions do they feel?
- What are they doing that they couldn't do before?

Example (CONVERSATIONAL with TANGIBLE outcomes):
"Picture this: In 12 weeks using our Life Ecosystem framework, you're signing 5 new $2K clients every month. You wake up Tuesday morning excited (not dreading your inbox), close your laptop at 5pm sharp, and actually enjoy family dinner without checking your phone. The clients you want are reaching out to YOU, and you finally hit that $10K month you've been dreaming about. This business is working FOR you, not against you."

---

## 10. OBJECTION-HANDLING FAQ SEEDS

List 5-7 Q&A pairs that reframe common doubts.

Format:
**Q:** [Common objection or concern]
**A:** [Reframe that addresses the concern and reinforces value]

Example:
**Q:** Do I have to post daily?
**A:** No. This system works by creating strategic content that attracts your ideal clients, not by overwhelming you with constant posting.

---

FINAL REMINDERS - CINEMATIC, MOMENT-BY-MOMENT, TANGIBLE STYLE:
- Write CINEMATICALLY: Show moments, actions, and emotional progression — don't just describe feelings
- USE TANGIBLE OUTCOMES EVERYWHERE: Replace every vague benefit with concrete, observable results (numbers, timeframes, specific actions)
- Include SENSORY DETAILS: What they see, hear, feel in specific moments
- Add INTERNAL DIALOGUE: "wondering, 'What am I missing?'" "asking themselves, 'Am I cut out for this?'"
- Show EMOTIONAL PROGRESSION: How one feeling builds into another over time ("That quiet doubt has turned into exhaustion")
- Use SPECIFIC MOMENTS: "Each time they open Instagram," "After another late night," "When they close their laptop at midnight"
- Make it VISCERAL and RAW: Not polished or corporate — authentic and relatable like talking to a friend
- Use customer's exact quotes or paraphrased language throughout
- Always name both emotional cost AND emotional reward
- Make belief shifts vivid with before/after MOMENTS (not just concepts)
- Tie differentiators to outcomes IN SPECIFIC MOMENTS
- INCLUDE user's unique differentiator/framework/system throughout (especially in Core Promise and Offer Snapshot)
- Write hooks conversationally, speaking directly to one person
- End Offer Snapshot with a vivid scene of life after success they can SEE and FEEL with TANGIBLE DETAILS
- Keep it simple, emotionally grounded—avoid all hype, buzzwords, jargon
- Everything must ladder back to the same core promise and emotional journey
- AUTHENTIC over polished. RAW over corporate. CINEMATIC over descriptive. TANGIBLE over vague.
- NO VAGUE BENEFITS ALLOWED: "better work-life balance" → "close laptop at 5pm"; "grow business" → "sign 5 clients/month at $2K each"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      max_tokens: 5000,
      temperature: 0.7,
    });

    const rawStrategy = response.choices[0]?.message?.content || "";

    // Remove unwanted AI-generated closing statements
    let cleanedStrategy = rawStrategy
      .replace(/Remember, the heart of this strategy is to connect with your audience on a deeply personal level, using their own words and experiences to guide them toward the transformation they desire\. Keep the language simple, the scenarios relatable, and the promises grounded in real outcomes\./gi, '')
      .trim();

    // CRITICAL: Validate AI output for contamination
    console.log('[AI OUTPUT VALIDATION] Checking for contamination...');
    const validationResult = DataSourceValidator.validateAIOutput(
      cleanedStrategy,
      userContext,
      clientContext
    );

    let cleanStrategy = cleanedStrategy;
    if (!validationResult.isClean) {
      console.warn('[CONTAMINATION DETECTED] Issues found in AI output:', validationResult.issues);
      
      // Use the cleaned strategy without displaying validation warnings to users
      cleanStrategy = cleanedStrategy;
    } else {
      console.log('[AI OUTPUT VALIDATION] ✅ Strategy is clean, no contamination detected');
    }

    return {
      strategy: cleanStrategy,
      missingInformation: missingInfo,
      completeness,
      recommendations: generateRecommendations(completeness, missingInfo),
      dataSourceReport: {
        ...contaminationReport,
        aiValidation: {
          isClean: validationResult.isClean,
          issues: validationResult.issues,
          timestamp: new Date().toISOString()
        }
      }
    };

  } catch (error) {
    console.error("Messaging strategy generation error:", error);
    throw new Error("Failed to generate messaging strategy");
  }
}

function identifyMissingInformation(responses: WorkbookResponses): string[] {
  const missing: string[] = [];
  
  // Check for critical positioning information
  const positioningKeys = Object.keys(responses).filter(key => key.includes('positioning'));
  if (positioningKeys.length === 0 || !positioningKeys.some(key => responses[key]?.trim())) {
    missing.push("Unique positioning and what makes you different");
  }

  // Check for customer avatar information
  const customerKeys = Object.keys(responses).filter(key => key.includes('customer-avatar'));
  if (customerKeys.length < 3 || !customerKeys.some(key => responses[key]?.trim())) {
    missing.push("Detailed customer avatar and target audience insights");
  }

  // Check for brand voice information
  const brandKeys = Object.keys(responses).filter(key => key.includes('brand-voice'));
  if (brandKeys.length === 0 || !brandKeys.some(key => responses[key]?.trim())) {
    missing.push("Brand voice and personality definition");
  }

  // Check for offer/problem information
  const offerKeys = Object.keys(responses).filter(key => key.includes('offer') || key.includes('problem'));
  if (offerKeys.length === 0 || !offerKeys.some(key => responses[key]?.trim())) {
    missing.push("Core offer and problem you solve");
  }

  return missing;
}

function calculateCompleteness(responses: WorkbookResponses): number {
  const totalPossibleSections = 15; // Estimate based on typical workbook
  const completedSections = Object.values(responses).filter(response => 
    response && response.trim().length > 20
  ).length;
  
  return Math.min(100, (completedSections / totalPossibleSections) * 100);
}

function extractKeyInsightsFromUserData(responses: WorkbookResponses, userContext: UserContextData, emotionalInsights?: string) {
  return {
    // AI-extracted emotional insights (prioritized)
    emotionalInsights: emotionalInsights || "",
    
    // Structured data from workbook
    positioning: Object.entries(responses)
      .filter(([key]) => key.includes('positioning'))
      .map(([key, value]) => ({ key, value })),
    customerAvatar: Object.entries(responses)
      .filter(([key]) => key.includes('customer-avatar'))
      .map(([key, value]) => ({ key, value })),
    brandVoice: Object.entries(responses)
      .filter(([key]) => key.includes('brand-voice'))
      .map(([key, value]) => ({ key, value })),
    offer: Object.entries(responses)
      .filter(([key]) => key.includes('offer') || key.includes('problem'))
      .map(([key, value]) => ({ key, value })),
    other: Object.entries(responses)
      .filter(([key]) => !key.includes('positioning') && !key.includes('customer-avatar') && 
                         !key.includes('brand-voice') && !key.includes('offer') && !key.includes('problem'))
      .map(([key, value]) => ({ key, value })),
    businessContext: {
      name: userContext.businessName,
      industry: userContext.industry,
      stage: userContext.businessStage
    }
  };
}

function formatUserInsightsForPrompt(insights: any): string {
  let formatted = "";
  
  // PRIORITY #1: AI-extracted emotional insights (most important for messaging)
  if (insights.emotionalInsights?.trim()) {
    formatted += "===== EMOTIONAL INSIGHTS & CUSTOMER LANGUAGE (EXTRACTED BY AI) =====\n";
    formatted += "Use this emotional intelligence as your PRIMARY SOURCE for creating authentic, deep messaging.\n\n";
    formatted += insights.emotionalInsights;
    formatted += "\n\n===== ADDITIONAL STRUCTURED DATA FROM WORKBOOK =====\n\n";
  }
  
  formatted += "BUSINESS OWNER'S VALIDATED RESPONSES:\n\n";
  
  if (insights.positioning.length > 0) {
    formatted += "UNIQUE POSITIONING & EXPERTISE:\n";
    insights.positioning.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- Business Owner States: "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.customerAvatar.length > 0) {
    formatted += "TARGET CUSTOMER UNDERSTANDING (From Owner's Perspective):\n";
    insights.customerAvatar.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- Owner's Insight: "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.brandVoice.length > 0) {
    formatted += "BRAND VOICE & PERSONALITY (Owner's Style):\n";
    insights.brandVoice.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- Owner's Voice: "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.offer.length > 0) {
    formatted += "OFFER & PROBLEM SOLUTION (Owner's Approach):\n";
    insights.offer.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- Owner's Method: "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.other.length > 0) {
    formatted += "ADDITIONAL BUSINESS INSIGHTS:\n";
    insights.other.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- Owner Input: "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  return formatted;
}

function generateRecommendations(completeness: number, missingInfo: string[]): string[] {
  const recommendations: string[] = [];
  
  if (completeness < 80) {
    recommendations.push("Complete additional workbook sections for a more comprehensive strategy");
  }
  
  if (missingInfo.length > 0) {
    recommendations.push(`Focus on: ${missingInfo.join(", ")}`);
  }
  
  if (completeness > 80) {
    recommendations.push("Consider conducting customer interviews to add depth and authenticity");
    recommendations.push("Test key messages with your target audience");
    recommendations.push("Refine based on market feedback and results");
  }
  
  return recommendations;
}

