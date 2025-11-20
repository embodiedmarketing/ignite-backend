import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  // Add timeout and error handling for OpenAI API calls
  const timeout = 15000; // 15 second timeout
  
  const systemPrompt = `You are an expert sales copywriter who writes compelling, conversion-focused sales pages. You write ONLY actual sales copy using simple text formatting with proper line breaks. You NEVER output structure templates, guidelines, or instructions.`;
  
  // Check if messaging strategy contains interview-enhanced fields
  const hasInterviewData = messaging && typeof messaging === 'object' && (
    messaging.frustrations || messaging.nighttime_worries || messaging.secret_fears ||
    messaging.magic_solution || messaging.failed_solutions || messaging.blockers ||
    messaging.decision_making || messaging.investment_criteria || messaging.success_measures
  );

  const userPrompt = `Write a complete sales page for this user's offer using their messaging strategy and offer outline data.

USER'S MESSAGING STRATEGY:
${JSON.stringify(messaging, null, 2)}

${hasInterviewData ? `\n⭐ CRITICAL: This messaging strategy contains INTERVIEW-ENHANCED insights from customer interview transcripts. 
These fields (frustrations, nighttime_worries, secret_fears, magic_solution, etc.) contain the customer's EXACT WORDS and authentic emotional expressions.

YOU MUST:
1. Use CINEMATIC, MOMENT-BY-MOMENT language from these interview insights (show the moment, don't just describe)
2. Include customer's exact words, internal dialogue, and emotional progression
3. Add SPECIFIC, TANGIBLE outcomes with numbers, timeframes, and observable details
4. Show sensory details and specific moments from their actual experience
5. Make it VISCERAL and RAW - authentic like talking to a friend

EXAMPLE TRANSFORMATION:
❌ Generic: "They feel stuck and overwhelmed"
✅ Interview-enhanced: "They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?' That quiet doubt has turned into exhaustion and second-guessing every move."

PRIORITIZE these interview-enhanced fields over generic messaging. Use the customer's exact language and emotional depth.\n` : ''}

USER'S OFFER OUTLINE:
${JSON.stringify(offer, null, 2)}

WRITE A SALES PAGE WITH THESE 5 SECTIONS using this EXACT TEXT FORMAT (write actual compelling copy, not templates):

<strong>📄 STRUCTURE & WRITING RULES</strong>

<strong>SECTION 1: CURRENT DESIRES + STRUGGLES</strong>

<strong>Purpose:</strong> Build instant resonance. Make readers feel seen before you ever mention the offer.

1. <strong>Headline – Desired Outcome</strong>
   - Make it emotionally specific and outcome-driven.
   - Avoid vague promises ("reach your potential") — instead, use concrete results.
   - Example: "Book Consistent Clients Without Burning Out or Playing the Algorithm Game."

2. <strong>Expand on Their Desired Outcome</strong>
   - Use emotional imagery and sensory language.
   - Speak to what life feels like when their goal becomes real.
   - Include lifestyle examples that show freedom, time, confidence, or presence.

3. <strong>Current Feelings / Problem</strong>
   - Mirror the reader's internal dialogue — what they're thinking but not saying.
   - Call out both surface frustrations ("I'm posting all the time") and deeper emotional costs ("I'm starting to lose faith in myself").
   - Keep tone empathetic, not pitying.

4. <strong>Why the Problem Is Worse Than Expected</strong>
   - Contrast what they thought would happen vs. what actually happens when this problem persists.
   - Example: "You thought working harder would mean more clients — but now you're exhausted and still invisible."
   - Add urgency through consequence storytelling (health, family, identity, burnout).

5. <strong>Bridge: Their Desired Outcome Is Possible</strong>
   - Transition with hope, energy, and authority.
   - Keep this short — one to two lines that introduce the solution naturally.

─────────────────────────────────────────────

<strong>SECTION 2: THE SOLUTION (YOUR OFFER)</strong>

<strong>Purpose:</strong> Position the offer as the natural bridge between pain and possibility.

1. <strong>Introduce the Offer</strong>
   - Format: "Introducing {offer_name} — the proven system to {core_promise} without {main_pain_point}."
   - Keep this warm, confident, and simple (not over-hyped).

2. <strong>Core Pillars / Learnings</strong>
   - List 3–5 pillars, each written as:
     • What they'll learn/do
     • Why it matters
     • What changes as a result
   - Example: "Clarify Your Message so dream clients instantly understand what makes you different."

<strong>BEST PRACTICES FROM TRANSCRIPTS:</strong>
• Every pillar should build belief — not just list modules.
• Use "so that..." phrasing for every benefit.
• Connect the process to their emotional journey (e.g., confidence, momentum, self-trust).

─────────────────────────────────────────────

<strong>SECTION 3: AUTHORITY</strong>

<strong>Purpose:</strong> Build trust through credibility + relatability.

1. <strong>Testimonials</strong>
   - Use storytelling testimonials (before → after → feeling).
   - Prioritize transformation over metrics.
   - Include at least one that mirrors the reader's current struggle.

2. <strong>About the Creator</strong>
   - Share your "why" through a moment of personal truth or past failure.
   - Include emotional resonance before listing credentials.
   - Example: "I built this because I know how it feels to work endlessly and still question your worth."
   - Keep it human, not résumé-style.

─────────────────────────────────────────────

<strong>SECTION 4: OFFER SPECIFICS</strong>

<strong>Purpose:</strong> Move the reader from belief to action by detailing what's included, bonuses, pricing, and proof.

1. <strong>What's Included</strong>
   - Turn features into outcomes: "6 coaching calls → personalized clarity and accountability."
   - Use bullet sections for readability and emphasize what each inclusion helps them do.

2. <strong>Bonuses</strong>
   - Only include bonuses that feel essential or urgency-driven.
   - Tie each bonus to a key objection ("no time," "need accountability," "fear of failure").

3. <strong>Pricing & CTA</strong>
   - Position the price as an investment not an expense.
   - Use "value stack" comparisons sparingly — emphasize results, not math.
   - Add multiple CTAs throughout the section using {desired_action} language.
   - Insert {urgency} details naturally ("Doors close Sunday," "Only 20 seats available").

4. <strong>Guarantee</strong>
   - Reinforce trust and remove risk: "If you show up and do the work, we'll keep working with you until you see results."
   - Keep tone confident and integrity-driven.

─────────────────────────────────────────────

<strong>SECTION 5: BREAKTHROUGH RESISTANCE</strong>

<strong>Purpose:</strong> Reframe objections, reignite belief, and close with inspiration.

1. <strong>Address Objections</strong>
   - Name them directly using the reader's inner voice: "You're thinking — what if this doesn't work for me?"
   - Respond with calm authority, not hype.
   - Show empathy and logic (proof + reassurance).

2. <strong>Big Breakthrough Visualization</strong>
   - Use sensory, present-tense storytelling ("Imagine waking up to...").
   - Focus on emotional payoff: relief, clarity, confidence, peace.

3. <strong>Review of Everything They Get</strong>
   - Bullet all inclusions + bonuses with value if appropriate.
   - Example: "Total Value = $7,885 / Your Price = $997."
   - End with CTA button and brief reminder of {urgency}.

4. <strong>FAQ</strong>
   - Write 4–6 questions that handle practical concerns (timeline, access, refund, fit).
   - Use friendly tone ("Great question!" "Here's how it works...").

5. <strong>Decision Note / Final CTA</strong>
   - Close like a personal letter.
   - Use the "two paths" framing (stay stuck vs. step forward).
   - Bring it back to the reader's identity — who they want to become.
   - End with emotional certainty and direct CTA: "It's your turn to {core_promise} — click below to {desired_action}."

CRITICAL FORMATTING RULES:
- Use <strong></strong> for bold headings and key terms
- Use plain text with proper line breaks
- Use dashes (─) to separate major sections
- Use numbered lists (1., 2., 3.) for main points
- Use dashes (-) and bullets (•) for sub-points
- Keep formatting clean and simple
- Write actual compelling sales copy using their data, NOT the structure template above

OUTPUT ONLY THE SALES PAGE COPY - NO META INSTRUCTIONS.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  return response.choices[0].message.content || "";
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