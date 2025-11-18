import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContentPreferences {
  platforms?: string[];
  contentTypes?: string[];
  postingFrequency?: string;
  desiredFeelings?: string;
  avoidFeelings?: string;
  brandAdjectives?: string;
  coreThemes?: string;
  problemsMyths?: string;
  valuesBeliefs?: string;
  contrarianTakes?: string;
  actionableTips?: string;
  commonObjections?: string;
  beliefShifts?: string;
  authenticTruths?: string;
  keyMessage?: string;
  authenticVoice?: string;
}

interface ContentPillar {
  name: string;
  explanation: string;
  connectionToOffer: string;
}

export interface ContentIdea {
  title: string;
  coreMessage: string;
  format: string;
  emotionalIntention: string;
  callToAction: string;
  category: 'contrarian' | 'emotional' | 'practical' | 'rooftop' | 'objection';
}

interface ContentStrategyResult {
  // Part 1: Content Strategy Overview
  corePlatform: string;
  postingFrequency: string;
  contentFormat: string;
  contentGoals: string[];
  emotionalToneSummary: string;
  brandVibe: string;
  contentPillars: ContentPillar[];
  disruptiveAngles: string[];
  voiceAuthenticityGuide: string[];
  
  // Metadata
  recommendations: string[];
  missingInformation: string[];
  completeness: number;
}

export async function generateContentStrategy(
  preferences: ContentPreferences,
  messagingStrategy?: string,
  userId: number = 0
): Promise<ContentStrategyResult> {
  try {
    // Calculate completeness based on provided preferences
    const completeness = calculateCompleteness(preferences);
    
    // Identify missing information
    const missingInfo = identifyMissingInformation(preferences);
    
    // If completion is too low, return early with guidance
    if (completeness < 0.4) {
      return {
        corePlatform: "",
        postingFrequency: "",
        contentFormat: "",
        contentGoals: [],
        emotionalToneSummary: "",
        brandVibe: "",
        contentPillars: [],
        disruptiveAngles: [],
        voiceAuthenticityGuide: [],
        recommendations: generateRecommendations(completeness, missingInfo),
        missingInformation: missingInfo,
        completeness
      };
    }

    // Extract insights from preferences and parse Messaging Strategy
    const insights = extractContentInsights(preferences, messagingStrategy);
    const messagingData = parseMessagingStrategy(messagingStrategy);
    
    const prompt = `You are an expert content strategist creating a specific, emotionally resonant, and disruptive content strategy. Use the client's Messaging Strategy (core promise, values, tone, differentiators) and their Content Strategy answers to generate a focused, authority-driven content plan.

USER'S CONTENT STRATEGY ANSWERS:
${formatInsightsForPrompt(insights)}

${messagingData.corePromise ? `
CLIENT'S MESSAGING STRATEGY:

**Core Promise:** ${messagingData.corePromise}

**Ideal Customer:** ${messagingData.idealCustomer}

**Differentiators:**
${messagingData.differentiators.map((d: string) => `- ${d}`).join('\n')}

**Belief Shifts:**
${messagingData.beliefShifts.map((bs: any) => `- Old: ${bs.oldBelief} → New: ${bs.newBelief}`).join('\n')}

**Messaging Pillars:**
${messagingData.messagingPillars.map((p: any) => `- ${p.name}\n  ${p.talkingPoints.map((tp: string) => `  • ${tp}`).join('\n')}`).join('\n')}
` : ''}

Generate a CONTENT STRATEGY PLAN with the following 9 sections. Use language tied directly to the Messaging Strategy. Be short, specific, emotionally intelligent, and strategic. Make it feel custom and personal — not generic AI text.

## PART 1: CONTENT STRATEGY OVERVIEW

### 1. Core Platform
State their one core platform: ${insights.platforms[0] || 'their primary platform'}

### 2. Posting Frequency
State their committed posting frequency: ${insights.frequency || 'their chosen frequency'}

### 3. Content Format
State their consistent weekly content format: ${insights.contentTypes?.join(', ') || 'their chosen format'}

### 4. Content Goals
Summarize 2–3 goals based on their business and audience stage. Examples: build trust and visibility, nurture warm leads, drive conversion through authority content.
${messagingData.corePromise ? `Reference their core promise: ${messagingData.corePromise}` : ''}

### 5. Emotional Tone Summary
Describe how their audience should feel when engaging with their content, and what feelings they want to avoid.
- Desired feelings: ${insights.desiredFeelings}
- Avoid feelings: ${insights.avoidFeelings}

### 6. Brand Vibe
Write a short, powerful statement blending their 3–5 brand adjectives. Example format: "Bold yet grounded. Inspiring but real. Strategic and human."
- Brand adjectives: ${insights.brandAdjectives}
${messagingData.differentiators.length > 0 ? `- Reference differentiators: ${messagingData.differentiators.join(', ')}` : ''}

### 7. Content Pillars
${messagingData.messagingPillars.length > 0 ? `
**CRITICAL: Pull 3–4 content pillars DIRECTLY from the Messaging Strategy Pillars provided above.**
For each pillar:
- Use the exact pillar name from Messaging Strategy
- Write a 1-sentence explanation of what it represents
- Connect it back to their offer or transformation
` : `
**IMPORTANT: These are BUSINESS PILLARS/CATEGORIES — the foundational themes that underpin their entire brand and business, NOT individual content topics or post ideas.**

Think of pillars as the 3–4 core categories that organize ALL their content and represent what their business stands for.

Examples of good business pillars:
- "Mindset Mastery" (not "5 mindset tips")
- "Strategic Visibility" (not "how to grow on Instagram")
- "Offer Creation" (not "writing sales pages")
- "Authority Building" (not "posting consistently")

Based on their answers to "themes or truths your audience needs to understand before buying" (${insights.coreThemes}), identify 3–4 broad business pillars.

For each pillar:
- Give it a short, memorable category name (2-3 words max)
- Write a 1-sentence explanation of what this pillar represents as a business category
- Connect it to their offer or transformation showing why this pillar matters to their business
`}

### 8. Disruptive Angles
${messagingData.beliefShifts.length > 0 ? `
List 3–5 contrarian or bold truths drawn from the Belief Shifts in the Messaging Strategy and from their answers to Q7 and Q11.
Transform each belief shift into a disruptive content angle that challenges the status quo, debunks myths, or calls out outdated industry thinking.
` : `
List 3–5 contrarian or bold truths drawn from their answers to Q7 (contrarian takes) and Q11 (authentic truths).
These should challenge the status quo, debunk myths, or call out outdated industry thinking.
`}

### 9. Voice & Authenticity Guide
Include 3 short bullets on how to keep their content tone aligned with their authentic voice.
${messagingData.corePromise ? `Reference their Messaging Strategy tone and values.` : ''}
From their answer: ${insights.authenticVoice}

Example format:
- Speak like a mentor, not a guru
- Mix empathy with directness
- Use stories and real examples over theory

IMPORTANT FORMATTING INSTRUCTIONS:
- Use clear section headers with numbers (1., 2., 3., etc.)
- Keep each section concise and actionable
- Use the exact data provided (platforms, frequency, adjectives)
- Reference Messaging Strategy elements directly when available
- Make the tone match their brand voice
- Do NOT add extra commentary or sections beyond these 9

Output the complete Content Strategy Plan now.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5000,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";
    
    if (!content || content.trim().length < 100) {
      throw new Error("Generated content too short or empty");
    }

    // Parse the AI response into structured data
    const parsedStrategy = parseContentStrategy(content);
    
    return {
      corePlatform: parsedStrategy.corePlatform || "",
      postingFrequency: parsedStrategy.postingFrequency || "",
      contentFormat: parsedStrategy.contentFormat || "",
      contentGoals: parsedStrategy.contentGoals || [],
      emotionalToneSummary: parsedStrategy.emotionalToneSummary || "",
      brandVibe: parsedStrategy.brandVibe || "",
      contentPillars: parsedStrategy.contentPillars || [],
      disruptiveAngles: parsedStrategy.disruptiveAngles || [],
      voiceAuthenticityGuide: parsedStrategy.voiceAuthenticityGuide || [],
      recommendations: generateRecommendations(completeness, missingInfo),
      missingInformation: missingInfo,
      completeness
    };

  } catch (error) {
    console.error("Error generating content strategy:", error);
    
    // Calculate fallback values
    const fallbackCompleteness = calculateCompleteness(preferences);
    const fallbackMissingInfo = identifyMissingInformation(preferences);
    
    // Return fallback strategy with basic recommendations
    return {
      corePlatform: "",
      postingFrequency: "",
      contentFormat: "",
      contentGoals: [],
      emotionalToneSummary: "",
      brandVibe: "",
      contentPillars: [],
      disruptiveAngles: [],
      voiceAuthenticityGuide: [],
      recommendations: [
        "Complete the strategic content questions to get a personalized strategy",
        "Define how you want people to feel when they see your content",
        "Clarify your brand adjectives and authentic voice",
        "Identify core themes your audience needs to understand",
        "Choose 1-2 primary platforms to focus on initially"
      ],
      missingInformation: fallbackMissingInfo,
      completeness: fallbackCompleteness
    };
  }
}

function calculateCompleteness(preferences: ContentPreferences): number {
  let score = 0;
  let totalCriteria = 16; // All the strategic fields

  if (preferences.platforms && preferences.platforms.length > 0) score += 1;
  if (preferences.contentTypes && preferences.contentTypes.length > 0) score += 1;
  if (preferences.postingFrequency) score += 1;
  if (preferences.desiredFeelings && preferences.desiredFeelings.trim().length > 10) score += 1;
  if (preferences.avoidFeelings && preferences.avoidFeelings.trim().length > 5) score += 1;
  if (preferences.brandAdjectives && preferences.brandAdjectives.trim().length > 10) score += 1;
  if (preferences.coreThemes && preferences.coreThemes.trim().length > 20) score += 1;
  if (preferences.problemsMyths && preferences.problemsMyths.trim().length > 20) score += 1;
  if (preferences.valuesBeliefs && preferences.valuesBeliefs.trim().length > 15) score += 1;
  if (preferences.contrarianTakes && preferences.contrarianTakes.trim().length > 20) score += 1;
  if (preferences.actionableTips && preferences.actionableTips.trim().length > 15) score += 1;
  if (preferences.commonObjections && preferences.commonObjections.trim().length > 15) score += 1;
  if (preferences.beliefShifts && preferences.beliefShifts.trim().length > 20) score += 1;
  if (preferences.authenticTruths && preferences.authenticTruths.trim().length > 20) score += 1;
  if (preferences.keyMessage && preferences.keyMessage.trim().length > 15) score += 1;
  if (preferences.authenticVoice && preferences.authenticVoice.trim().length > 15) score += 1;

  return score / totalCriteria;
}

function identifyMissingInformation(preferences: ContentPreferences): string[] {
  const missing: string[] = [];

  if (!preferences.platforms || preferences.platforms.length === 0) {
    missing.push("Select your preferred social media platforms");
  }
  if (!preferences.contentTypes || preferences.contentTypes.length === 0) {
    missing.push("Choose your preferred content formats");
  }
  if (!preferences.postingFrequency) {
    missing.push("Set your ideal posting frequency");
  }
  if (!preferences.desiredFeelings || preferences.desiredFeelings.trim().length < 10) {
    missing.push("Describe how you want people to feel");
  }
  if (!preferences.avoidFeelings || preferences.avoidFeelings.trim().length < 5) {
    missing.push("Describe what you don't want people to feel");
  }
  if (!preferences.brandAdjectives || preferences.brandAdjectives.trim().length < 10) {
    missing.push("List your brand adjectives");
  }
  if (!preferences.coreThemes || preferences.coreThemes.trim().length < 20) {
    missing.push("Define core themes your audience needs to understand");
  }
  if (!preferences.problemsMyths || preferences.problemsMyths.trim().length < 20) {
    missing.push("Identify problems, mistakes, or myths to address");
  }
  if (!preferences.valuesBeliefs || preferences.valuesBeliefs.trim().length < 15) {
    missing.push("Define values and beliefs to reinforce");
  }
  if (!preferences.contrarianTakes || preferences.contrarianTakes.trim().length < 20) {
    missing.push("Share your contrarian or disruptive takes");
  }
  if (!preferences.actionableTips || preferences.actionableTips.trim().length < 15) {
    missing.push("Provide actionable tips and frameworks");
  }
  if (!preferences.commonObjections || preferences.commonObjections.trim().length < 15) {
    missing.push("Describe common questions or objections");
  }
  if (!preferences.beliefShifts || preferences.beliefShifts.trim().length < 20) {
    missing.push("Define belief shifts your audience needs");
  }
  if (!preferences.authenticTruths || preferences.authenticTruths.trim().length < 20) {
    missing.push("Share your authentic truth that scares you to say");
  }
  if (!preferences.keyMessage || preferences.keyMessage.trim().length < 15) {
    missing.push("Define your key message");
  }
  if (!preferences.authenticVoice || preferences.authenticVoice.trim().length < 15) {
    missing.push("Describe how to communicate authentically");
  }

  return missing;
}

function generateRecommendations(completeness: number, missingInfo: string[]): string[] {
  const recommendations: string[] = [];

  if (completeness < 0.4) {
    recommendations.push("Complete the content preferences form to get a personalized strategy");
  }
  
  if (missingInfo.includes("Select your preferred social media platforms")) {
    recommendations.push("Focus on 1-2 platforms initially to build consistent presence");
  }
  
  if (missingInfo.includes("Define your areas of expertise more clearly")) {
    recommendations.push("List 3-5 topics you could teach or advise others about");
  }
  
  if (missingInfo.includes("Describe what your audience asks you about")) {
    recommendations.push("Think about questions you get in conversations, emails, or comments");
  }

  return recommendations;
}

function extractContentInsights(preferences: ContentPreferences, messagingStrategy?: string) {
  return {
    platforms: preferences.platforms || [],
    contentTypes: preferences.contentTypes || [],
    frequency: preferences.postingFrequency || "",
    desiredFeelings: preferences.desiredFeelings || "",
    avoidFeelings: preferences.avoidFeelings || "",
    brandAdjectives: preferences.brandAdjectives || "",
    coreThemes: preferences.coreThemes || "",
    problemsMyths: preferences.problemsMyths || "",
    valuesBeliefs: preferences.valuesBeliefs || "",
    contrarianTakes: preferences.contrarianTakes || "",
    actionableTips: preferences.actionableTips || "",
    commonObjections: preferences.commonObjections || "",
    beliefShifts: preferences.beliefShifts || "",
    authenticTruths: preferences.authenticTruths || "",
    keyMessage: preferences.keyMessage || "",
    authenticVoice: preferences.authenticVoice || "",
    messagingStrategy: messagingStrategy || ""
  };
}

function formatInsightsForPrompt(insights: any): string {
  const sections: string[] = [];

  if (insights.platforms.length > 0) {
    sections.push(`PREFERRED PLATFORMS: ${insights.platforms.join(", ")}`);
  }
  
  if (insights.contentTypes.length > 0) {
    sections.push(`PREFERRED CONTENT TYPES: ${insights.contentTypes.join(", ")}`);
  }
  
  if (insights.frequency) {
    sections.push(`POSTING FREQUENCY: ${insights.frequency}`);
  }
  
  if (insights.desiredFeelings) {
    sections.push(`DESIRED FEELINGS: ${insights.desiredFeelings}`);
  }
  
  if (insights.avoidFeelings) {
    sections.push(`AVOID FEELINGS: ${insights.avoidFeelings}`);
  }
  
  if (insights.brandAdjectives) {
    sections.push(`BRAND ADJECTIVES: ${insights.brandAdjectives}`);
  }
  
  if (insights.coreThemes) {
    sections.push(`CORE THEMES: ${insights.coreThemes}`);
  }
  
  if (insights.problemsMyths) {
    sections.push(`PROBLEMS/MYTHS TO ADDRESS: ${insights.problemsMyths}`);
  }
  
  if (insights.valuesBeliefs) {
    sections.push(`VALUES & BELIEFS: ${insights.valuesBeliefs}`);
  }
  
  if (insights.contrarianTakes) {
    sections.push(`CONTRARIAN TAKES: ${insights.contrarianTakes}`);
  }
  
  if (insights.actionableTips) {
    sections.push(`ACTIONABLE TIPS: ${insights.actionableTips}`);
  }
  
  if (insights.commonObjections) {
    sections.push(`COMMON OBJECTIONS: ${insights.commonObjections}`);
  }
  
  if (insights.beliefShifts) {
    sections.push(`BELIEF SHIFTS: ${insights.beliefShifts}`);
  }
  
  if (insights.authenticTruths) {
    sections.push(`AUTHENTIC TRUTHS: ${insights.authenticTruths}`);
  }
  
  if (insights.keyMessage) {
    sections.push(`KEY MESSAGE: ${insights.keyMessage}`);
  }
  
  if (insights.authenticVoice) {
    sections.push(`AUTHENTIC VOICE: ${insights.authenticVoice}`);
  }

  return sections.join("\n\n");
}

function parseMessagingStrategy(messagingStrategy?: string): any {
  if (!messagingStrategy) {
    return {
      corePromise: "",
      idealCustomer: "",
      differentiators: [],
      beliefShifts: [],
      messagingPillars: [],
      brandAdjectives: [],
      hooksAndAngles: [],
      objectionHandlingFAQSeeds: []
    };
  }

  const result: any = {
    corePromise: "",
    idealCustomer: "",
    differentiators: [],
    beliefShifts: [],
    messagingPillars: [],
    brandAdjectives: [],
    hooksAndAngles: [],
    objectionHandlingFAQSeeds: []
  };

  // Extract Core Promise
  const corePromiseMatch = messagingStrategy.match(/##\s*1\.\s*CORE PROMISE\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (corePromiseMatch) {
    result.corePromise = corePromiseMatch[1].trim();
  }

  // Extract Ideal Customer
  const idealCustomerMatch = messagingStrategy.match(/##\s*2\.\s*IDEAL CUSTOMER[^\n]*\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (idealCustomerMatch) {
    result.idealCustomer = idealCustomerMatch[1].trim();
  }

  // Extract Differentiators
  const differentiatorsMatch = messagingStrategy.match(/##\s*6\.\s*DIFFERENTIATORS\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (differentiatorsMatch) {
    const diffText = differentiatorsMatch[1];
    const diffLines = diffText.split('\n').filter(line => line.trim().match(/^[-*]\s*/));
    result.differentiators = diffLines.map(line => line.replace(/^[-*]\s*/, '').trim());
  }

  // Extract Belief Shifts
  const beliefShiftsMatch = messagingStrategy.match(/##\s*5\.\s*BELIEF SHIFTS\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (beliefShiftsMatch) {
    const shiftsText = beliefShiftsMatch[1];
    const shiftBlocks = shiftsText.split(/[-*]\s*\*\*Old Belief:\*\*/i).slice(1);
    result.beliefShifts = shiftBlocks.map(block => {
      const parts = block.split(/\*\*New Belief:\*\*/i);
      return {
        oldBelief: parts[0]?.trim() || "",
        newBelief: parts[1]?.split('\n')[0]?.trim() || ""
      };
    });
  }

  // Extract Messaging Pillars
  const pillarsMatch = messagingStrategy.match(/##\s*7\.\s*MESSAGING PILLARS[^\n]*\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (pillarsMatch) {
    const pillarsText = pillarsMatch[1];
    const pillarBlocks = pillarsText.split(/[-*]\s*\*\*Pillar/i).slice(1);
    result.messagingPillars = pillarBlocks.map(block => {
      const nameMatch = block.match(/(?:Name:|[0-9]+:)\s*\*\*\s*([^*\n]+)/i);
      const talkingPointsMatch = block.match(/\*\*Talking Points:\*\*\s*\n([\s\S]*?)(?=\n[-*]\s*\*\*|$)/i);
      
      const name = nameMatch ? nameMatch[1].trim() : "";
      const talkingPoints = talkingPointsMatch 
        ? talkingPointsMatch[1].split('\n').filter(line => line.trim().match(/^[0-9.)\-*]\s*/)).map(line => line.replace(/^[0-9.)\-*]\s*/, '').trim())
        : [];
      
      return {
        name,
        talkingPoints
      };
    });
  }

  // Extract Hooks & Angles
  const hooksMatch = messagingStrategy.match(/##\s*8\.\s*HOOKS\s*&?\s*ANGLES[^\n]*\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (hooksMatch) {
    const hooksText = hooksMatch[1];
    const hookLines = hooksText.split('\n').filter(line => line.trim().match(/^[-*]\s*/));
    result.hooksAndAngles = hookLines.map(line => line.replace(/^[-*]\s*/, '').trim()).filter(h => h.length > 0);
  }

  // Extract Objection Handling FAQ Seeds
  const objectionsMatch = messagingStrategy.match(/##\s*9\.\s*OBJECTION HANDLING[^\n]*\s*\n\n([\s\S]*?)(?=\n##|$)/i);
  if (objectionsMatch) {
    const objectionsText = objectionsMatch[1];
    const objectionLines = objectionsText.split('\n').filter(line => line.trim().match(/^[-*]\s*/));
    result.objectionHandlingFAQSeeds = objectionLines.map(line => line.replace(/^[-*]\s*/, '').trim()).filter(o => o.length > 0);
  }

  return result;
}

function parseContentStrategy(content: string): Partial<ContentStrategyResult> {
  const result: Partial<ContentStrategyResult> = {
    corePlatform: "",
    postingFrequency: "",
    contentFormat: "",
    contentGoals: [],
    emotionalToneSummary: "",
    brandVibe: "",
    contentPillars: [],
    disruptiveAngles: [],
    voiceAuthenticityGuide: []
  };

  // Extract Core Platform
  const corePlatformMatch = content.match(/###?\s*1\.\s*Core Platform[:\s]*\n+([^\n#]+)/i);
  if (corePlatformMatch) {
    result.corePlatform = corePlatformMatch[1].trim();
  }

  // Extract Posting Frequency
  const postingFrequencyMatch = content.match(/###?\s*2\.\s*Posting Frequency[:\s]*\n+([^\n#]+)/i);
  if (postingFrequencyMatch) {
    result.postingFrequency = postingFrequencyMatch[1].trim();
  }

  // Extract Content Format
  const contentFormatMatch = content.match(/###?\s*3\.\s*Content Format[:\s]*\n+([^\n#]+)/i);
  if (contentFormatMatch) {
    result.contentFormat = contentFormatMatch[1].trim();
  }

  // Extract Content Goals
  const contentGoalsMatch = content.match(/###?\s*4\.\s*Content Goals[:\s]*\n+([\s\S]*?)(?=###?\s*5\.|$)/i);
  if (contentGoalsMatch) {
    const goalsText = contentGoalsMatch[1];
    const goals = goalsText.split(/[-•]\s+/)
      .map(g => g.trim())
      .filter(g => g.length > 10 && g.length < 200);
    if (goals.length > 0) {
      result.contentGoals = goals.slice(0, 3);
    } else {
      // Try extracting as numbered list or paragraphs
      const lines = goalsText.split('\n').filter(l => l.trim().length > 10);
      result.contentGoals = lines.slice(0, 3).map(l => l.trim());
    }
  }

  // Extract Emotional Tone Summary
  const emotionalToneMatch = content.match(/###?\s*5\.\s*Emotional Tone Summary[:\s]*\n+([\s\S]*?)(?=###?\s*6\.|$)/i);
  if (emotionalToneMatch) {
    result.emotionalToneSummary = emotionalToneMatch[1].trim();
  }

  // Extract Brand Vibe
  const brandVibeMatch = content.match(/###?\s*6\.\s*Brand Vibe[:\s]*\n+([\s\S]*?)(?=###?\s*7\.|$)/i);
  if (brandVibeMatch) {
    const vibeText = brandVibeMatch[1].trim();
    // Remove any bullets or extra formatting
    result.brandVibe = vibeText.split('\n').filter(l => !l.match(/^[-•*]/) || l.length > 30)[0]?.trim() || vibeText.trim();
  }

  // Extract Content Pillars
  const contentPillarsMatch = content.match(/###?\s*7\.\s*Content Pillars[:\s]*\n+([\s\S]*?)(?=###?\s*8\.|$)/i);
  
  if (contentPillarsMatch) {
    const pillarsText = contentPillarsMatch[1];
    console.log('📊 Content Pillars section extracted, length:', pillarsText.length);
    console.log('📊 First 500 chars of pillars text:', pillarsText.substring(0, 500));
    
    // Try multiple parsing strategies
    const pillars: ContentPillar[] = [];
    
    // Strategy 1: Match "**1. Name**" format with description
    let matches = Array.from(pillarsText.matchAll(/\*\*([0-9]+)\.\s*([^*\n]+)\*\*\s*\n([^\n]+(?:\n(?!\*\*[0-9]+\.)[^\n]+)*)/gm));
    console.log('📊 Strategy 1 (bold number) matches:', matches.length);
    
    if (matches.length > 0) {
      for (const match of matches) {
        const name = match[2]?.trim();
        const description = match[3]?.trim();
        if (name && description) {
          const lines = description.split('\n').map(l => l.trim()).filter(l => l);
          pillars.push({
            name,
            explanation: lines[0] || description,
            connectionToOffer: lines[1] || ""
          });
        }
      }
    }
    
    // Strategy 2: Match "1. **Name**" format with description
    if (pillars.length === 0) {
      matches = Array.from(pillarsText.matchAll(/(?:^|\n)([0-9]+)\.\s*\*\*([^*\n]+)\*\*\s*\n([^\n]+(?:\n(?![0-9]+\.)[^\n]+)*)/gm));
      console.log('📊 Strategy 2 (number then bold) matches:', matches.length);
      
      for (const match of matches) {
        const name = match[2]?.trim();
        const description = match[3]?.trim();
        if (name && description) {
          const lines = description.split('\n').map(l => l.trim()).filter(l => l);
          pillars.push({
            name,
            explanation: lines[0] || description,
            connectionToOffer: lines[1] || ""
          });
        }
      }
    }
    
    // Strategy 3: Match "- **Name**" format with description
    if (pillars.length === 0) {
      matches = Array.from(pillarsText.matchAll(/(?:^|\n)[-•*]\s*\*\*([^*\n]+)\*\*\s*\n([^\n]+(?:\n(?![-•*])[^\n]+)*)/gm));
      console.log('📊 Strategy 3 (bullet bold) matches:', matches.length);
      
      for (const match of matches) {
        const name = match[1]?.trim();
        const description = match[2]?.trim();
        if (name && description) {
          const lines = description.split('\n').map(l => l.trim()).filter(l => l);
          pillars.push({
            name,
            explanation: lines[0] || description,
            connectionToOffer: lines[1] || ""
          });
        }
      }
    }
    
    console.log('📊 Total pillars parsed:', pillars.length);
    if (pillars.length > 0) {
      console.log('📊 First pillar:', pillars[0]);
      result.contentPillars = pillars;
    } else {
      console.log('⚠️ No pillars parsed - raw text structure:', pillarsText.split('\n').slice(0, 10));
    }
  } else {
    console.log('⚠️ No Content Pillars section found in response');
  }

  // Extract Disruptive Angles
  const disruptiveAnglesMatch = content.match(/###?\s*8\.\s*Disruptive Angles[:\s]*\n+([\s\S]*?)(?=###?\s*9\.|$)/i);
  if (disruptiveAnglesMatch) {
    const anglesText = disruptiveAnglesMatch[1];
    const angles = anglesText.split(/[-•*]\s+/)
      .map(a => a.trim())
      .filter(a => a.length > 15 && a.length < 300)
      .slice(0, 5);
    result.disruptiveAngles = angles.length > 0 ? angles : [anglesText.trim()];
  }

  // Extract Voice & Authenticity Guide
  const voiceGuideMatch = content.match(/###?\s*9\.\s*Voice\s*&?\s*Authenticity Guide[:\s]*\n+([\s\S]*?)(?=###?|$)/i);
  if (voiceGuideMatch) {
    const guideText = voiceGuideMatch[1];
    const bullets = guideText.split(/[-•*]\s+/)
      .map(b => b.trim())
      .filter(b => b.length > 10 && b.length < 200)
      .slice(0, 3);
    result.voiceAuthenticityGuide = bullets.length > 0 ? bullets : guideText.split('\n').filter(l => l.trim().length > 10).slice(0, 3);
  }

  return result;
}

export async function generateContentIdeas(
  messagingStrategy: string,
  contentPreferences?: ContentPreferences
): Promise<ContentIdea[]> {
  try {
    const messagingData = parseMessagingStrategy(messagingStrategy);
    
    const prompt = `You are an expert content strategist creating 10 specific, disruptive, and emotionally grounded content ideas.

CLIENT'S MESSAGING STRATEGY:

**Core Promise:** ${messagingData.corePromise}

**Ideal Customer:** ${messagingData.idealCustomer}

**Differentiators:**
${messagingData.differentiators.map((d: string) => `- ${d}`).join('\n')}

**Belief Shifts:**
${messagingData.beliefShifts.map((bs: any) => `- Old: ${bs.oldBelief} → New: ${bs.newBelief}`).join('\n')}

**Messaging Pillars:**
${messagingData.messagingPillars.map((p: any) => `- ${p.name}\n  ${p.talkingPoints.map((tp: string) => `  • ${tp}`).join('\n')}`).join('\n')}

**Hooks & Angles:**
${messagingData.hooksAndAngles.join('\n- ')}

**Objection Handling:**
${messagingData.objectionHandlingFAQSeeds.join('\n- ')}

${contentPreferences ? `
**Content Preferences:**
- Platform: ${contentPreferences.platforms?.join(', ')}
- Content Format: ${contentPreferences.contentTypes?.join(', ')}
- Contrarian Takes: ${contentPreferences.contrarianTakes}
- Common Objections: ${contentPreferences.commonObjections}
- Belief Shifts: ${contentPreferences.beliefShifts}
- Authentic Truths: ${contentPreferences.authenticTruths}
` : ''}

Generate 10 content ideas that align with the strategy above. Each idea must include all 5 elements:

1. **Title / Hook**: A scroll-stopping headline or video intro line
2. **Core Message**: The key belief, truth, or myth being addressed
3. **Format Suggestion**: e.g., carousel, reel, video, podcast, story, email
4. **Emotional Intention**: What the audience should feel (safe, seen, challenged, motivated, etc.)
5. **Call-to-Action / Next Step**: Simple and natural (e.g., "Save this," "DM me for details," "Watch the full training")

**REQUIRED DISTRIBUTION:**
- 3+ must be contrarian or disruptive takes that challenge norms
- 2+ must be emotional storytelling or belief-shift pieces
- 2+ must be practical, actionable tip/framework posts
- 1 must be a bold "rooftop truth"
- 1 must rebut a common objection or misconception

**QUALITY STANDARDS:**
✅ Be specific — avoid vague prompts like "share your story" or "talk about mindset"
✅ Be emotionally grounded — tie each idea to how the audience feels or what belief it shifts
✅ Be disruptive — expose myths, challenge assumptions, or say what others are afraid to
✅ Be connected to the offer — naturally reinforce the transformation or philosophy behind the user's program
✅ Be authentic — reflect the brand's voice, not generic advice

**OUTPUT FORMAT:**
Return exactly 10 ideas in this JSON format:
[
  {
    "title": "Title / Hook here",
    "coreMessage": "Core message here",
    "format": "Format suggestion here",
    "emotionalIntention": "Emotional intention here",
    "callToAction": "CTA here",
    "category": "contrarian" | "emotional" | "practical" | "rooftop" | "objection"
  }
]

Make sure to label each idea with its category (contrarian, emotional, practical, rooftop, or objection) and ensure the distribution requirements are met.

Return ONLY the JSON array, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const responseContent = completion.choices[0]?.message?.content || "[]";
    
    // Try to extract JSON from the response
    let jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // If no JSON found, try to parse the entire response
      jsonMatch = [responseContent];
    }
    
    const ideas: ContentIdea[] = JSON.parse(jsonMatch[0]);
    
    // Validate and ensure we have exactly 10 ideas
    if (ideas.length !== 10) {
      throw new Error("Expected 10 content ideas");
    }
    
    return ideas;
    
  } catch (error) {
    console.error("Error generating content ideas:", error);
    throw new Error("Failed to generate content ideas");
  }
}

