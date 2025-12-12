import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface FunnelCopyInput {
  // Lead Magnet
  leadMagnetTitle: string;
  resourceType: string;
  transformation: string;
  problemSolved: string;
  urgency: string;
  uniqueness: string;
  painPoints: string;
  quickWin: string;
  objections: string;
  bulletPoints: string;
  socialProof: string;
  
  // Tripwire
  tripwireTitle: string;
  tripwireType: string;
  tripwireOutcome: string;
  tripwireConnection: string;
  tripwirePrice: string;
  noBrainer: string;
  regularPrice: string;
  tripwireProblem: string;
  tripwireDifferent: string;
  tripwireWins: string;
  tripwireObjections: string;
  overcomingObjections: string;
  riskRemoval: string;
  testimonials: string;
  authority: string;
  
  // Email Sequence
  coreBeliefShift: string;
  objectionsDoubts: string;
  storiesExamples: string;
  contentHighlight: string;
  contentOrder: string;
  
  // User's messaging strategy voice
  messagingStrategyVoice?: string;
}

interface FunnelCopyOutput {
  optInPage: string;
  tripwirePage: string;
  checkoutPage: string;
  confirmationPage: string;
}

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on validation/parsing errors, only on API/network errors
      if (error instanceof SyntaxError || (error as any).message?.includes('Failed to parse')) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[FUNNEL COPY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function generateFunnelCopy(input: FunnelCopyInput): Promise<FunnelCopyOutput> {
  // Check if input contains interview-enhanced fields
  const hasInterviewData = input && typeof input === 'object' && (
    (input as any).frustrations || (input as any).nighttime_worries || (input as any).secret_fears ||
    (input as any).magic_solution || (input as any).failed_solutions || (input as any).blockers ||
    (input as any).decision_making || (input as any).investment_criteria || (input as any).success_measures
  );

  const prompt = `You are an expert funnel copywriter specializing in high-converting sales pages. Generate complete funnel copy for all 4 pages based on the user's inputs.

USER'S MESSAGING STRATEGY VOICE:
${input.messagingStrategyVoice || "Professional and conversion-focused"}

${hasInterviewData ? `\n⭐ CRITICAL: This input data contains INTERVIEW-ENHANCED insights from customer interview transcripts.
These fields (frustrations, nighttime_worries, secret_fears, magic_solution, etc.) contain the customer's EXACT WORDS and authentic emotional expressions.

YOU MUST:
1. Use CINEMATIC, MOMENT-BY-MOMENT language from these interview insights in your funnel copy
2. Include customer's exact words, internal dialogue, and emotional progression
3. Add SPECIFIC, TANGIBLE outcomes with numbers, timeframes, and observable details
4. Show sensory details and specific moments from their actual experience
5. Make copy VISCERAL and AUTHENTIC - like you're talking directly to the customer using their own language

EXAMPLE TRANSFORMATION:
❌ Generic: "They feel stuck and overwhelmed"
✅ Interview-enhanced: "They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'"

PRIORITIZE these interview-enhanced fields. Use the customer's exact language throughout your funnel copy.\n` : ''}

USER'S INPUT DATA:
Lead Magnet:
- Title: ${input.leadMagnetTitle}
- Type: ${input.resourceType}
- Transformation: ${input.transformation}
- Problem Solved: ${input.problemSolved}
- Urgency: ${input.urgency}
- Uniqueness: ${input.uniqueness}
- Pain Points: ${input.painPoints}
- Quick Win: ${input.quickWin}
- Objections: ${input.objections}
- Bullet Points: ${input.bulletPoints}
- Social Proof: ${input.socialProof}

Tripwire Offer:
- Title: ${input.tripwireTitle}
- Type: ${input.tripwireType}
- Outcome: ${input.tripwireOutcome}
- Connection to Lead Magnet: ${input.tripwireConnection}
- Price: ${input.tripwirePrice}
- Regular Price: ${input.regularPrice}
- No-Brainer Positioning: ${input.noBrainer}
- Problem It Solves: ${input.tripwireProblem}
- What Makes It Different: ${input.tripwireDifferent}
- Quick Wins: ${input.tripwireWins}
- Objections: ${input.tripwireObjections}
- Overcoming Objections: ${input.overcomingObjections}
- Risk Removal: ${input.riskRemoval}
- Testimonials: ${input.testimonials}
- Authority: ${input.authority}

WRITING DIRECTIVES:
Voice & Tone:
- Mirror the user's messaging strategy voice
- Write conversationally with rhythm and emotion
- Use contractions and everyday phrasing ("you'll," "you're," "here's how")
- Avoid academic, generic, or overly formal language

Emotional Arc (for each page):
1️⃣ Connection (I get you) → 2️⃣ Authority (I can help you) → 3️⃣ Action (Here's what to do next)

Formatting:
- Keep paragraphs under 3 lines
- Use bullets and bold key phrases for scannability
- Include emojis or visual dividers if appropriate to brand voice

Generate copy for all 4 pages following these EXACT structures and HTML formatting:

PART 1 — OPT-IN PAGE COPY
Goal: Turn awareness into action — the reader must feel instantly understood and see the lead magnet as the missing solution to their current struggle.

Structure:
1. Headline (Hook)
   - Directly name the transformation or benefit
   - Use the audience's voice: "Stop [pain] and start [desired result]"
   - Example: "Workers: Stop Getting Talked Over, Ignored, and Passed By" or "Nail Your Newsletter — Create Sales-Generating Emails in 60 Minutes or Less"

2. Subheadline / Secondary Hook
   - Add one short sentence that amplifies the result
   - Example: "Use these exact words to finally get taken seriously at work"

3. Pain-to-Solution Paragraph
   - Call out their frustration using emotional and specific language
   - Transition to hope — "Until now…"

4. What's Inside (Bullet List)
   - List 3–5 benefits or deliverables from form answers
   - Make each bullet an outcome (not just a feature)
   - Examples: "Know exactly what to say to get credit at work" or "Save hours every week writing emails that actually sell"

5. CTA Section
   - Include a strong action verb and a reason to click
   - Example: "YES! Send Me the Scripts" or "Get the Free Template Now"

6. Mini Bio or Authority Line
   - 2–3 sentences establishing credibility
   - Tie authority to the audience's benefit, not credentials alone

7. Social Proof (If Provided)
   - Add 1–2 short testimonials or success metrics

🧩 PART 2 — TRIPWIRE PAGE COPY
🎯 Goal: Offer a low-ticket "next step" that deepens the transformation started by the lead magnet.

🧱 Structure:
1. Headline (Thank You + Transition)
   - Example: "Your [Lead Magnet] Is On the Way!" or "Thank You for Downloading the Checklist!"

2. Bridge Sentence
   - "Before you go…" or "While you're here…"
   - Introduce the tripwire as the next logical step that solves the next big pain
   - Example: "Access the 5 Steps Jennifer Used to Triple Her Salary"

3. Product Overview
   - Include: name, what it helps them do, and for whom
   - Example: "Sprint to your next promotion and pay raise with these 5 proven steps"

4. Key Benefits (3–5 Bullets)
   - Use bullets to highlight tangible outcomes
   - Examples: "Get your boss to notice you" or "Learn how to talk about your wins"

5. Price + Value Framing
   - Always contrast regular vs. special price ("Normally $197 — today $27")
   - Keep the offer framed as exclusive or one-time

6. Social Proof / Results
   - Include brief testimonials or transformation stories
   - Example: "Jennifer tripled her salary in 3 years" or "Many participants see visible changes in 5 days"

7. Urgency Line (Optional)
   - "Only available on this page" or "Expires when you leave"

8. CTA
   - Action-first button text: "Yes! Add This to My Order" or "Get Instant Access for $37"

🧩 PART 3 — CHECKOUT PAGE COPY
🎯 Goal: Reinforce decision confidence and reduce friction.

🧱 Structure:
1. Headline
   - "You're One Step Away from [Result]"

2. Offer Recap
   - 1–2 sentences summarizing what they're buying and the transformation
   - Example: "The Win at Work Sprint gives you 5 proven steps to get noticed and land your next promotion"

3. Short Bullet List (Optional)
   - Restate key inclusions or reassurance points

4. Price Display
   - Bold and clear: "Today's Price: $27"

5. Trust Lines
   - "Secure checkout • Instant access • Your information is safe"

🧩 PART 4 — CONFIRMATION PAGE COPY
🎯 Goal: Celebrate their decision, reinforce momentum, and guide next steps.

🧱 Structure:
1. Headline
   - "You Did It!" / "Congrats! You're In!"

2. Welcome Paragraph
   - Celebrate action: "You're officially in. You're not on the sidelines anymore—you're on the field"

3. Next Steps List
   - "Check your email for login details"
   - "Access your PDF below"
   - "Clear your calendar"

4. Encouragement Line
   - Tie back to identity or motivation
   - Examples: "You've just invested in yourself and your future" or "Action wins. See you inside"

CRITICAL FORMATTING INSTRUCTIONS:
Use HTML tags to format the content EXACTLY as shown below. Follow this structure precisely for all 4 pages.

HTML FORMATTING RULES:
- Page heading: <h2 style="font-size: 1.8em;"><strong>PART X — PAGE NAME COPY</strong></h2>
- Numbered sections: <p style="font-size: 1.25em;"><strong>1. Section Name:</strong><br>
- Sub-items: <span style="margin-left: 2em; font-size: 1.05em;">○ [text]</span><br>
- Examples in quotes: <em>"example text"</em>
- Nested bullets: <span style="margin-left: 4em; font-size: 1.05em;">■ [text]</span><br>

CRITICAL: Do NOT include "Goal:" or "Structure:" sections in the output. Start directly with the numbered sections after the part heading.

EXACT TEMPLATE FOR PART 1 (OPT-IN PAGE):
<h2 style="font-size: 1.8em;"><strong>PART 1 — OPT-IN PAGE COPY</strong></h2>

<p style="font-size: 1.25em;"><strong>1. Headline (Hook)</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Directly name the transformation or benefit.</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Use the audience's voice: "Stop [pain] and start [desired result]."</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Example: <em>"Workers: Stop Getting Talked Over, Ignored, and Passed By"</em> or <em>"Nail Your Newsletter — Create Sales-Generating Emails in 60 Minutes or Less"</em></span></p>

<p style="font-size: 1.25em;"><strong>2. Subheadline / Secondary Hook</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Add one short sentence that amplifies the result:</span><br>
<span style="margin-left: 4em; font-size: 1.05em;"><em>"Use these exact words to finally get taken seriously at work."</em></span></p>

<p style="font-size: 1.25em;"><strong>3. Pain-to-Solution Paragraph</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Call out their frustration using emotional and specific language ("You've got the answers, but nobody listens").</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Transition to hope — <em>"Until now..."</em></span></p>

<p style="font-size: 1.25em;"><strong>4. What's Inside (Bullet List)</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ List 3–5 benefits or deliverables from form answers.</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Make each bullet an outcome (not just a feature):</span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Know exactly what to say to get credit at work."</em></span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Save hours every week writing emails that actually sell."</em></span></p>

<p style="font-size: 1.25em;"><strong>5. CTA Section</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Include a strong action verb and a reason to click.</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Example: <em>"YES! Send Me the Scripts"</em> or <em>"Get the Free Template Now."</em></span></p>

<p style="font-size: 1.25em;"><strong>6. Mini Bio or Authority Line</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ 2–3 sentences establishing credibility (e.g., Tammy's $1.35/hour to boardroom story or Jenn's mission-driven intro).</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Tie authority to the audience's benefit, not credentials alone.</span></p>

<p style="font-size: 1.25em;"><strong>7. Social Proof (If Provided)</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Add 1–2 short testimonials or success metrics.</span></p>

EXACT TEMPLATE FOR PART 2 (TRIPWIRE PAGE):
<h2 style="font-size: 1.8em;"><strong>PART 2 — TRIPWIRE PAGE COPY</strong></h2>

<p style="font-size: 1.25em;"><strong>1. Headline (Thank You + Transition)</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Example: <em>"Your [Lead Magnet] Is On the Way!"</em> or <em>"Thank You for Downloading the Checklist!"</em></span></p>

<p style="font-size: 1.25em;"><strong>2. Bridge Sentence</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"Before you go..."</em> or <em>"While you're here..."</em></span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Introduce the tripwire as the <em>next logical step</em> that solves the next big pain.</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Ex: <em>"Access the 5 Steps Jennifer Used to Triple Her Salary"</em></span></p>

<p style="font-size: 1.25em;"><strong>3. Product Overview</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Include: name, what it helps them do, and for whom.</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Ex: <em>"Sprint to your next promotion and pay raise with these 5 proven steps."</em></span></p>

<p style="font-size: 1.25em;"><strong>4. Key Benefits (3–5 Bullets)</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Use bullets to highlight tangible outcomes:</span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Get your boss to notice you."</em></span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Learn how to talk about your wins."</em></span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Feel confident in your body again."</em></span></p>

<p style="font-size: 1.25em;"><strong>5. Price + Value Framing</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Always contrast regular vs. special price (<em>"Normally $197 — today $27"</em>).</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Keep the offer framed as exclusive or one-time.</span></p>

<p style="font-size: 1.25em;"><strong>6. Social Proof / Results</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Include brief testimonials or transformation stories:</span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Jennifer tripled her salary in 3 years."</em></span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Many participants see visible changes in 5 days."</em></span></p>

<p style="font-size: 1.25em;"><strong>7. Urgency Line (Optional)</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"Only available on this page"</em> or <em>"Expires when you leave."</em></span></p>

<p style="font-size: 1.25em;"><strong>8. CTA</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Action-first button text: <em>"Yes! Add This to My Order"</em> or <em>"Get Instant Access for $37."</em></span></p>

<p style="font-size: 1.25em;"><strong>🧩 Tone Examples:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">• <strong>Tammy Sherger:</strong> Bold, motivational, movement-style</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">• <strong>Nurit Raich:</strong> Confident, expert, aspirational</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">• <strong>Brittany Lamb:</strong> Compassionate, trustworthy, service-based</span></p>

EXACT TEMPLATE FOR PART 3 (CHECKOUT PAGE):
<h2 style="font-size: 1.8em;"><strong>PART 3 — CHECKOUT PAGE COPY</strong></h2>

<p style="font-size: 1.25em;"><strong>1. Headline:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"You're One Step Away from [Result]."</em></span></p>

<p style="font-size: 1.25em;"><strong>2. Offer Recap:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ 1–2 sentences summarizing what they're buying and the transformation.</span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Ex: <em>"The Win at Work Sprint gives you 5 proven steps to get noticed and land your next promotion."</em></span></p>

<p style="font-size: 1.25em;"><strong>3. Short Bullet List (Optional):</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Restate key inclusions or reassurance points.</span></p>

<p style="font-size: 1.25em;"><strong>4. Price Display:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Bold and clear: <em>"Today's Price: $27."</em></span></p>

<p style="font-size: 1.25em;"><strong>5. Trust Lines:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"Secure checkout • Instant access • Your information is safe."</em></span></p>

EXACT TEMPLATE FOR PART 4 (CONFIRMATION PAGE):
<h2 style="font-size: 1.8em;"><strong>PART 4 — CONFIRMATION PAGE COPY</strong></h2>

<p style="font-size: 1.25em;"><strong>1. Headline:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"You Did It!"</em> / <em>"Congrats! You're In!"</em></span></p>

<p style="font-size: 1.25em;"><strong>2. Welcome Paragraph:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Celebrate action: <em>"You're officially in. You're not on the sidelines anymore—you're on the field."</em></span></p>

<p style="font-size: 1.25em;"><strong>3. Next Steps List:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"Check your email for login details."</em></span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"Access your PDF below."</em></span><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ <em>"Clear your calendar."</em></span></p>

<p style="font-size: 1.25em;"><strong>4. Encouragement Line:</strong><br>
<span style="margin-left: 2em; font-size: 1.05em;">○ Tie back to identity or motivation:</span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"You've just invested in yourself and your future."</em></span><br>
<span style="margin-left: 4em; font-size: 1.05em;">■ <em>"Action wins. See you inside."</em></span></p>

CRITICAL: You MUST respond with a valid JSON object containing these exact keys:
{
  "optInPage": "HTML formatted copy following the exact structure above for PART 1",
  "tripwirePage": "HTML formatted copy following the exact structure above for PART 2",
  "checkoutPage": "HTML formatted copy following the exact structure above for PART 3",
  "confirmationPage": "HTML formatted copy following the exact structure above for PART 4"
}

Generate actual copy content based on the user's inputs, but maintain this EXACT HTML formatting structure. Respond ONLY with the JSON object, no other text.`;

  // Use retry logic for better reliability
  return retryWithBackoff(async () => {
    try {
      console.log('[FUNNEL COPY] Starting Claude API call...');
      
      const userPromptWithJson = prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
      
      const responseObj = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        temperature: 0.8,
        system: "You are an expert funnel copywriter. You MUST respond with valid JSON only. Do not include any text outside the JSON object.",
        messages: [
          {
            role: "user",
            content: userPromptWithJson,
          },
        ],
      });

      const contentText = responseObj.content[0]?.type === "text" ? responseObj.content[0].text : "";
      
      if (!contentText) {
        throw new Error("Empty response from Anthropic");
      }
      
      let responseText = contentText.trim();
      if (responseText.includes('```json')) {
        responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (responseText.includes('```')) {
        responseText = responseText.replace(/```.*?\n/, '').replace(/```\s*$/, '');
      }
      
      console.log('[FUNNEL COPY] Received response, parsing JSON...');
      
      // Parse JSON response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[FUNNEL COPY] JSON parse error:', parseError);
        console.error('[FUNNEL COPY] Response text:', responseText.substring(0, 500));
        throw new Error("Failed to parse AI response as JSON");
      }
      
      // Validate required fields
      if (!result.optInPage || !result.tripwirePage || !result.checkoutPage || !result.confirmationPage) {
        console.error('[FUNNEL COPY] Missing required fields:', {
          hasOptIn: !!result.optInPage,
          hasTripwire: !!result.tripwirePage,
          hasCheckout: !!result.checkoutPage,
          hasConfirmation: !!result.confirmationPage
        });
        throw new Error("AI response missing required pages");
      }
      
      console.log('[FUNNEL COPY] Successfully generated all 4 pages');
      
      // Post-process to remove any unwanted content
      const cleanContent = (text: string) => {
        return text
          // Remove email addresses
          .replace(/support@emilyhirsh\.com/gi, '')
          .replace(/Email\s+support@emilyhirsh\.com\s+for\s+any\s+help\s+you\s+need\.?/gi, '')
          // Remove Goal section (with any content until the next paragraph)
          .replace(/<p[^>]*>\s*<strong>Goal:<\/strong>[\s\S]*?<\/p>/gi, '')
          // Remove Structure section
          .replace(/<p[^>]*>\s*<strong>Structure:<\/strong>\s*<\/p>/gi, '')
          // Clean up extra whitespace
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      return {
        optInPage: cleanContent(result.optInPage),
        tripwirePage: cleanContent(result.tripwirePage),
        checkoutPage: cleanContent(result.checkoutPage),
        confirmationPage: cleanContent(result.confirmationPage),
      };
    } catch (error) {
      console.error('[FUNNEL COPY] Generation error:', error);
      throw error;
    }
  }, 3, 2000); // 3 retries with 2 second initial delay
}
