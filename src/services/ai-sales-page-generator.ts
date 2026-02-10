import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, validateAiText } from "../utils/ai-response";
import { SYSTEM_SALES_PAGE_COPYWRITER, SALES_PAGE_STRUCTURE } from "../shared/prompts";
import { salesPageOutputSchema } from "../utils/ai-response-schemas";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SalesPageData {
  messagingStrategy?: any;
  offerOutline?: any;
  salesPageInputs?: any;
  offerType?: string;
  userId?: string;
}

interface SalesPageResult {
  salesPageContent: string;
  missingElements: MissingElement[];
  suggestions: string[];
  completeness: number;
}

interface MissingElement {
  section: string;
  field: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestions: string[];
}

export async function generateSalesPage(salesPageData: SalesPageData): Promise<SalesPageResult> {
  const { messagingStrategy: messaging, offerOutline: offer, offerType = "course" } = salesPageData;
  
  console.log('🎯 Generating sales page for user:', salesPageData.userId || 'unknown');
  
  const missingElements = identifyMissingElements(salesPageData);
  const completeness = calculateCompleteness(salesPageData);
  
  console.log('📊 Calculated completeness:', completeness);

  let salesPageContent: string;
  
  try {
    console.log('🎯 Generating emotional sales page with new template');
    salesPageContent = await generateEmotionalSalesPage(messaging, offer, offerType);
  } catch (error: any) {
    console.error('Error generating sales page:', error);
    console.log('🔄 Using enhanced fallback template');
    salesPageContent = generateEnhancedFallbackSalesPage(messaging, offer, offerType);
  }

  const suggestions = generateImprovementSuggestions(missingElements, offerType);

  return {
    salesPageContent,
    missingElements,
    suggestions,
    completeness
  };
}

async function generateEmotionalSalesPage(messaging: any, offer: any, offerType: string): Promise<string> {
  // Check if messaging strategy contains interview-enhanced fields
  const hasInterviewData = messaging && typeof messaging === 'object' && (
    messaging.frustrations || messaging.nighttime_worries || messaging.secret_fears ||
    messaging.magic_solution || messaging.failed_solutions || messaging.blockers ||
    messaging.decision_making || messaging.investment_criteria || messaging.success_measures
  );

  // Optimized prompt: concise structure reference + content instructions
  const interviewInstructions = hasInterviewData ? `
⭐ INTERVIEW DATA DETECTED: Use customer's EXACT WORDS from frustrations, nighttime_worries, secret_fears, magic_solution.
- Show moments, not descriptions: "They've been posting for months — still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'"
- Include specific numbers, timeframes, sensory details
- Make it visceral and raw, like talking to a friend
` : '';

    const userPrompt = `<prompt>
  <task>Write a complete sales page using the provided messaging strategy and offer outline data.</task>
  
  <inputs>
    <messaging_strategy>
      <![CDATA[
${JSON.stringify(messaging, null, 2)}
      ]]>
    </messaging_strategy>
    
    <offer_outline>
      <![CDATA[
${JSON.stringify(offer, null, 2)}
      ]]>
    </offer_outline>
    
    ${hasInterviewData ? `<interview_instructions>
      <![CDATA[
${interviewInstructions}
      ]]>
    </interview_instructions>` : ''}
  </inputs>
  
  <structure>
    <section number="1" name="Current Desires + Struggles">
      Outcome-driven headline, expand desired outcome, current feelings/problem, why problem is worse, bridge to solution (~300-400 words)
    </section>
    <section number="2" name="The Solution">
      Introduce offer, 3-5 core pillars (what they learn + why it matters + what changes) (~300-400 words)
    </section>
    <section number="3" name="Authority">
      Storytelling testimonials, about creator (personal truth + credentials) (~300-400 words)
    </section>
    <section number="4" name="Offer Specifics">
      What's included (features→outcomes), bonuses, pricing/CTA, guarantee (~300-400 words)
    </section>
    <section number="5" name="Breakthrough Resistance">
      Address objections, breakthrough visualization, review everything, FAQ (4-6), final CTA (~300-400 words)
    </section>
  </structure>
  
  <writing_rules>
    <rule>Use &lt;strong&gt; for headings, plain text with line breaks</rule>
    <rule>Lead with emotion, close with logic</rule>
    <rule>Turn features into outcomes ("6 calls → clarity and accountability")</rule>
    <rule>Use "so that..." phrasing for benefits</rule>
    <rule>Write actual copy, not templates</rule>
  </writing_rules>
  
  <output>
    <format>Plain text sales page copy</format>
    <instruction>Output ONLY the sales page copy, no additional commentary</instruction>
  </output>
</prompt>`;

  // Use Promise.race for timeout handling (30 seconds instead of 15)
  const timeoutMs = 30000; // 30 seconds for long generations
  
  const apiCall = anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    temperature: 0.7,
    system: SYSTEM_SALES_PAGE_COPYWRITER,
    messages: [
      { role: "user", content: userPrompt }
    ],
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Sales page generation timed out after 30 seconds")), timeoutMs);
  });

  try {
    const response = await Promise.race([apiCall, timeoutPromise]);
    const contentText = getTextFromAnthropicContent(response.content);
    
    // Validate output with Zod schema
    const validatedContent = salesPageOutputSchema.parse(contentText.trim());
    return validatedContent;
  } catch (error) {
    if (error instanceof Error && error.message.includes("timed out")) {
      console.error("Sales page generation timed out, using fallback");
      throw error; // Let caller handle fallback
    }
    // If Zod validation fails, log but return the content anyway (with warning)
    if (error && typeof error === 'object' && 'issues' in error) {
      console.warn("Sales page validation warning:", error);
      const contentText = getTextFromAnthropicContent((await apiCall).content);
      return contentText.trim(); // Return unvalidated but still usable content
    }
    throw error;
  }
}

function generateEnhancedFallbackSalesPage(messaging: any, offer: any, offerType: string): string {
  const findValue = (obj: any, keywords: string[], fallback: string) => {
    if (!obj) return fallback;
    
    const values = Object.entries(obj).filter(([key, value]) => 
      value && typeof value === 'string' && value.trim().length > 15 &&
      keywords.some(keyword => key.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    return values.length > 0 ? values[0][1] as string : fallback;
  };

  const positioning = findValue(messaging, ['positioning', 'qualified', 'unique'], "15+ years helping entrepreneurs break through to 6-figure success");
  const painPoints = findValue(messaging, ['struggling', 'pain', 'frustration'], "trapped in the daily grind, working harder but feeling like you're spinning your wheels");
  const fears = findValue(messaging, ['afraid', 'fear', 'worry'], "that you'll waste another year without making real progress toward your dreams");
  const dreamOutcome = findValue(messaging, ['perfect', 'dream', 'transformation'], "waking up excited about your work, having the freedom and income you've always wanted");
  const transformation = findValue(offer, ['transformation', 'provide', 'help'], "build a profitable business that gives you true freedom");
  const components = findValue(offer, ['components', 'structure', 'include'], "step-by-step system, proven strategies, templates, and ongoing support");
  const pricing = findValue(offer, ['pricing', 'investment', 'value'], "$2,997 - less than most people spend on a vacation, but this transforms your entire life");
  const guarantee = findValue(offer, ['guarantee', 'promise', 'risk'], "100% money-back guarantee - if you don't see results in 90 days, get every penny back");

  return `# Stop Trading Your Dreams for a Paycheck
*The Life-Changing System That Transforms Everything in 90 Days*

## The Brutal Truth About Why You're Still Stuck

If you're reading this, something inside you is screaming for change.

Maybe you're lying awake at 3 AM, staring at the ceiling, wondering if this is really all there is. Maybe you're exhausted from ${painPoints}, watching others live the life you want while you're trapped in the same routine.

**The worst part?** You know you're capable of so much more.

You've tried everything: productivity apps, morning routines, weekend side hustles. Yet here you are, still feeling stuck, still watching others succeed while you struggle.

**What if I told you the problem isn't your work ethic or your skills?**

## Here's What I Know About You

You're not lazy. You're not lacking talent. You're just trapped in a system that was never designed for your success.

You dream of ${dreamOutcome}, but every day feels like Groundhog Day - the same routine, the same frustrations, the same quiet desperation.

**You're afraid ${fears}.** I get it. I've been there.

## My Story: From Stuck to Unstoppable

Three years ago, I was exactly where you are now. ${positioning.includes('15+') ? 'Despite having 15+ years of experience' : 'Despite all my efforts'}, I felt like I was running on a hamster wheel - lots of motion, zero progress.

Then I discovered something that changed everything...

**The breakthrough moment:** I realized I wasn't missing information. I was missing the RIGHT system. A system that actually works in today's world.

## The Solution That Changes Everything

This isn't another "follow your passion" fantasy. This is a proven system that helps you ${transformation}.

**Here's what makes this different:**

✅ **No more guessing** - You'll have a clear, step-by-step roadmap
✅ **Real results fast** - See progress in the first 30 days
✅ **Built for busy people** - Works even if you only have 1-2 hours per day
✅ **Failure-proof system** - Removes the guesswork that keeps most people stuck

### What You'll Get: ${components}

**Module 1: Foundation Blueprint** - Discover your unique profit pathway and eliminate the confusion that's been keeping you paralyzed

**Module 2: Rapid Results System** - The exact 30-day framework that gets you moving from stuck to unstoppable 

**Module 3: Scale & Systemize** - How to build momentum that compounds, so each day gets easier (not harder)

**Module 4: Breakthrough Barriers** - The mindset shifts that separate those who dream from those who achieve

## Strengthen Your Success With These Power Moves

**POWER MOVE #1: Make Your Headlines Magnetic**
Your current headline might be killing your conversions. The strongest headlines tap into deep emotional pain first, then promise specific transformation. Instead of generic promises, lead with the exact frustration your audience feels at 3 AM.

**POWER MOVE #2: Tell Stories That Sell**
Generic success stories don't convert. Your stories need specific details: exact numbers, real struggles, the moment everything changed. Paint the picture so vividly that prospects see themselves in your transformation.

**POWER MOVE #3: Handle Objections Before They Think Them**
The best sales pages address doubts before they surface. "You might be thinking this won't work for someone like me..." Then demolish that objection with proof, logic, and empathy.

**POWER MOVE #4: Create Irresistible Urgency**
Fake urgency backfires. Real urgency comes from genuine consequences. Show them exactly what staying stuck costs them - in money, time, relationships, and dreams deferred.

**POWER MOVE #5: Stack Value Like a Pro**
Don't just list features. Build a value tower where each element solves a specific problem and the total value towers over your price. Make the decision feel like the bargain of a lifetime.

## The Investment That Changes Everything

**${pricing}**

Think about it: What's the cost of staying exactly where you are for another year? Another five years? 

Most people spend more on things that depreciate than they do on themselves. This investment appreciates every single day for the rest of your life.

**${guarantee}**

I'm so confident this works that I'm taking all the risk. Try it for 90 full days. If you don't see real progress, get every penny back. But here's what I know: once you start seeing results, you'll wonder why you waited so long.

## What Happens If You Don't Take Action Today?

Let me paint you a picture of two different futures...

**Future #1:** You close this page, tell yourself you'll "think about it," and go back to the same routine. Six months from now, you're having this exact same conversation with yourself. Still frustrated. Still stuck. Still dreaming of change but not making it happen.

**Future #2:** You make the decision that everything changes TODAY. Ninety days from now, you're living proof that transformation is possible. You're the person others look up to, wondering how you finally broke free.

The only difference between these futures is the decision you make in the next 60 seconds.

## Your Moment of Truth

This is your moment. The moment when you stop being a victim of circumstances and start being the author of your own story.

You can choose safety and stay exactly where you are...

Or you can choose courage and step into the life you've been dreaming about.

The door is open. The path is clear. The only question is:

**Are you finally ready to walk through it?**`;
}

function calculateCompleteness(salesPageData: SalesPageData): number {
  const { messagingStrategy, offerOutline } = salesPageData;
  
  let messagingScore = 0;
  let offerScore = 0;
  
  // Calculate messaging strategy completeness (0-50 points)
  if (messagingStrategy) {
    const messagingResponses = Object.values(messagingStrategy).filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 15
    );
    
    // Score based on content quality and quantity
    messagingScore = messagingResponses.reduce((score: number, response: string) => {
      const length = response.length;
      if (length > 200) return score + 8; // Excellent depth
      if (length > 100) return score + 5; // Good detail
      if (length > 50) return score + 3;  // Basic content
      return score + 1; // Minimal content
    }, 0);
    
    messagingScore = Math.min(50, messagingScore);
  }
  
  // Calculate offer outline completeness (0-50 points)
  if (offerOutline) {
    const offerResponses = Object.values(offerOutline).filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 15
    );
    
    // Score based on content quality and quantity
    offerScore = offerResponses.reduce((score: number, response: string) => {
      const length = response.length;
      if (length > 200) return score + 10; // Excellent depth
      if (length > 100) return score + 7;  // Good detail
      if (length > 50) return score + 4;   // Basic content
      return score + 2; // Minimal content
    }, 0);
    
    offerScore = Math.min(50, offerScore);
  }
  
  const totalCompleteness = messagingScore + offerScore;
  
  console.log('📊 Sales Page Completeness Analysis:', {
    messagingResponses: messagingStrategy ? Object.values(messagingStrategy).filter(v => v && typeof v === 'string' && v.trim().length > 15).length : 0,
    offerResponses: offerOutline ? Object.values(offerOutline).filter(v => v && typeof v === 'string' && v.trim().length > 15).length : 0,
    messagingScore: `${messagingScore}/50`,
    offerScore: `${offerScore}/50`,
    totalCompleteness: `${totalCompleteness}%`
  });
  
  return Math.max(20, Math.min(100, totalCompleteness));
}

function identifyMissingElements(salesPageData: SalesPageData): MissingElement[] {
  const missing: MissingElement[] = [];
  const { messagingStrategy, offerOutline } = salesPageData;
  
  if (!messagingStrategy?.['customer-avatar-0']) {
    missing.push({
      section: "Customer Avatar",
      field: "pain-points",
      description: "Customer pain points and frustrations",
      priority: "high",
      suggestions: ["Describe specific problems your ideal customer faces daily"]
    });
  }
  
  if (!offerOutline?.['offer-foundation-0']) {
    missing.push({
      section: "Offer Foundation", 
      field: "transformation",
      description: "Clear transformation promise",
      priority: "high",
      suggestions: ["Define the specific outcome customers will achieve"]
    });
  }
  
  return missing;
}

function generateImprovementSuggestions(missingElements: MissingElement[], offerType: string): string[] {
  const suggestions = [];
  
  if (missingElements.length > 0) {
    suggestions.push(`Complete ${missingElements.length} missing sections for stronger sales page`);
  }
  
  suggestions.push(
    "Add specific testimonials with real names and results",
    "Include scarcity elements (limited spots, time-sensitive bonuses)", 
    "Strengthen your unique value proposition",
    "Add more emotional hooks in the opening section"
  );
  
  return suggestions;
}