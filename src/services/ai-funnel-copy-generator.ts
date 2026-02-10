import Anthropic from '@anthropic-ai/sdk';
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { funnelCopyPagesSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY, SYSTEM_FUNNEL_JSON } from "../shared/prompts";

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

  const prompt = `<prompt>
  <task>Generate complete funnel copy for all 4 pages based on the user's inputs as an expert funnel copywriter specializing in high-converting sales pages.</task>
  
  <inputs>
    <messaging_strategy_voice>${input.messagingStrategyVoice || "Professional and conversion-focused"}</messaging_strategy_voice>
    ${hasInterviewData ? `<interview_enhanced_insights critical="true">
      <instruction>This input data contains INTERVIEW-ENHANCED insights from customer interview transcripts. These fields (frustrations, nighttime_worries, secret_fears, magic_solution, etc.) contain the customer's EXACT WORDS and authentic emotional expressions.</instruction>
      <requirements>
        <requirement number="1">Use CINEMATIC, MOMENT-BY-MOMENT language from these interview insights in your funnel copy</requirement>
        <requirement number="2">Include customer's exact words, internal dialogue, and emotional progression</requirement>
        <requirement number="3">Add SPECIFIC, TANGIBLE outcomes with numbers, timeframes, and observable details</requirement>
        <requirement number="4">Show sensory details and specific moments from their actual experience</requirement>
        <requirement number="5">Make copy VISCERAL and AUTHENTIC - like you're talking directly to the customer using their own language</requirement>
      </requirements>
      <example_transformation>
        <bad>Generic: "They feel stuck and overwhelmed"</bad>
        <good>Interview-enhanced: "They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'"</good>
      </example_transformation>
      <priority>PRIORITIZE these interview-enhanced fields. Use the customer's exact language throughout your funnel copy.</priority>
    </interview_enhanced_insights>` : ''}
    <lead_magnet>
      <title>${input.leadMagnetTitle}</title>
      <type>${input.resourceType}</type>
      <transformation>${input.transformation}</transformation>
      <problem_solved>${input.problemSolved}</problem_solved>
      <urgency>${input.urgency}</urgency>
      <uniqueness>${input.uniqueness}</uniqueness>
      <pain_points>${input.painPoints}</pain_points>
      <quick_win>${input.quickWin}</quick_win>
      <objections>${input.objections}</objections>
      <bullet_points>${input.bulletPoints}</bullet_points>
      <social_proof>${input.socialProof}</social_proof>
    </lead_magnet>
    <tripwire_offer>
      <title>${input.tripwireTitle}</title>
      <type>${input.tripwireType}</type>
      <outcome>${input.tripwireOutcome}</outcome>
      <connection_to_lead_magnet>${input.tripwireConnection}</connection_to_lead_magnet>
      <price>${input.tripwirePrice}</price>
      <regular_price>${input.regularPrice}</regular_price>
      <no_brainer_positioning>${input.noBrainer}</no_brainer_positioning>
      <problem_it_solves>${input.tripwireProblem}</problem_it_solves>
      <what_makes_it_different>${input.tripwireDifferent}</what_makes_it_different>
      <quick_wins>${input.tripwireWins}</quick_wins>
      <objections>${input.tripwireObjections}</objections>
      <overcoming_objections>${input.overcomingObjections}</overcoming_objections>
      <risk_removal>${input.riskRemoval}</risk_removal>
      <testimonials>${input.testimonials}</testimonials>
      <authority>${input.authority}</authority>
    </tripwire_offer>
  </inputs>
  
  <writing_directives>
    <voice_tone>
      <directive>Mirror the user's messaging strategy voice</directive>
      <directive>Write conversationally with rhythm and emotion</directive>
      <directive>Use contractions and everyday phrasing ("you'll," "you're," "here's how")</directive>
      <directive>Avoid academic, generic, or overly formal language</directive>
    </voice_tone>
    <emotional_arc>Connection (I get you) → Authority (I can help you) → Action (Here's what to do next)</emotional_arc>
    <formatting>
      <rule>Keep paragraphs under 3 lines</rule>
      <rule>Use bullets and bold key phrases for scannability</rule>
      <rule>Include emojis or visual dividers if appropriate to brand voice</rule>
    </formatting>
  </writing_directives>
  
  <page_structures>
    <page number="1" name="OPT-IN PAGE COPY">
      <goal>Turn awareness into action — the reader must feel instantly understood and see the lead magnet as the missing solution to their current struggle.</goal>
      <structure>
        <section number="1" name="Headline (Hook)">
          <instruction>Directly name the transformation or benefit</instruction>
          <instruction>Use the audience's voice: "Stop [pain] and start [desired result]"</instruction>
          <example>"Workers: Stop Getting Talked Over, Ignored, and Passed By" or "Nail Your Newsletter — Create Sales-Generating Emails in 60 Minutes or Less"</example>
        </section>
        <section number="2" name="Subheadline / Secondary Hook">
          <instruction>Add one short sentence that amplifies the result</instruction>
          <example>"Use these exact words to finally get taken seriously at work"</example>
        </section>
        <section number="3" name="Pain-to-Solution Paragraph">
          <instruction>Call out their frustration using emotional and specific language</instruction>
          <instruction>Transition to hope — "Until now…"</instruction>
        </section>
        <section number="4" name="What's Inside (Bullet List)">
          <instruction>List 3–5 benefits or deliverables from form answers</instruction>
          <instruction>Make each bullet an outcome (not just a feature)</instruction>
          <example>"Know exactly what to say to get credit at work" or "Save hours every week writing emails that actually sell"</example>
        </section>
        <section number="5" name="CTA Section">
          <instruction>Include a strong action verb and a reason to click</instruction>
          <example>"YES! Send Me the Scripts" or "Get the Free Template Now"</example>
        </section>
        <section number="6" name="Mini Bio or Authority Line">
          <instruction>2–3 sentences establishing credibility</instruction>
          <instruction>Tie authority to the audience's benefit, not credentials alone</instruction>
        </section>
        <section number="7" name="Social Proof (If Provided)">
          <instruction>Add 1–2 short testimonials or success metrics</instruction>
        </section>
      </structure>
    </page>
    
    <page number="2" name="TRIPWIRE PAGE COPY">
      <goal>Offer a low-ticket "next step" that deepens the transformation started by the lead magnet.</goal>
      <structure>
        <section number="1" name="Headline (Thank You + Transition)">
          <example>"Your [Lead Magnet] Is On the Way!" or "Thank You for Downloading the Checklist!"</example>
        </section>
        <section number="2" name="Bridge Sentence">
          <instruction>"Before you go…" or "While you're here…"</instruction>
          <instruction>Introduce the tripwire as the next logical step that solves the next big pain</instruction>
          <example>"Access the 5 Steps Jennifer Used to Triple Her Salary"</example>
        </section>
        <section number="3" name="Product Overview">
          <instruction>Include: name, what it helps them do, and for whom</instruction>
          <example>"Sprint to your next promotion and pay raise with these 5 proven steps"</example>
        </section>
        <section number="4" name="Key Benefits (3–5 Bullets)">
          <instruction>Use bullets to highlight tangible outcomes</instruction>
          <example>"Get your boss to notice you" or "Learn how to talk about your wins"</example>
        </section>
        <section number="5" name="Price + Value Framing">
          <instruction>Always contrast regular vs. special price ("Normally $197 — today $27")</instruction>
          <instruction>Keep the offer framed as exclusive or one-time</instruction>
        </section>
        <section number="6" name="Social Proof / Results">
          <instruction>Include brief testimonials or transformation stories</instruction>
          <example>"Jennifer tripled her salary in 3 years" or "Many participants see visible changes in 5 days"</example>
        </section>
        <section number="7" name="Urgency Line (Optional)">
          <example>"Only available on this page" or "Expires when you leave"</example>
        </section>
        <section number="8" name="CTA">
          <instruction>Action-first button text</instruction>
          <example>"Yes! Add This to My Order" or "Get Instant Access for $37"</example>
        </section>
      </structure>
    </page>
    
    <page number="3" name="CHECKOUT PAGE COPY">
      <goal>Reinforce decision confidence and reduce friction.</goal>
      <structure>
        <section number="1" name="Headline">
          <example>"You're One Step Away from [Result]"</example>
        </section>
        <section number="2" name="Offer Recap">
          <instruction>1–2 sentences summarizing what they're buying and the transformation</instruction>
          <example>"The Win at Work Sprint gives you 5 proven steps to get noticed and land your next promotion"</example>
        </section>
        <section number="3" name="Short Bullet List (Optional)">
          <instruction>Restate key inclusions or reassurance points</instruction>
        </section>
        <section number="4" name="Price Display">
          <instruction>Bold and clear</instruction>
          <example>"Today's Price: $27"</example>
        </section>
        <section number="5" name="Trust Lines">
          <example>"Secure checkout • Instant access • Your information is safe"</example>
        </section>
      </structure>
    </page>
    
    <page number="4" name="CONFIRMATION PAGE COPY">
      <goal>Celebrate their decision, reinforce momentum, and guide next steps.</goal>
      <structure>
        <section number="1" name="Headline">
          <example>"You Did It!" / "Congrats! You're In!"</example>
        </section>
        <section number="2" name="Welcome Paragraph">
          <instruction>Celebrate action</instruction>
          <example>"You're officially in. You're not on the sidelines anymore—you're on the field"</example>
        </section>
        <section number="3" name="Next Steps List">
          <example>"Check your email for login details"</example>
          <example>"Access your PDF below"</example>
          <example>"Clear your calendar"</example>
        </section>
        <section number="4" name="Encouragement Line">
          <instruction>Tie back to identity or motivation</instruction>
          <example>"You've just invested in yourself and your future" or "Action wins. See you inside"</example>
        </section>
      </structure>
    </page>
  </page_structures>
  
  <html_formatting_rules>
    <rule>Page heading: &lt;h2 style="font-size: 1.8em;"&gt;&lt;strong&gt;PART X — PAGE NAME COPY&lt;/strong&gt;&lt;/h2&gt;</rule>
    <rule>Numbered sections: &lt;p style="font-size: 1.25em;"&gt;&lt;strong&gt;1. Section Name:&lt;/strong&gt;&lt;br&gt;</rule>
    <rule>Sub-items: &lt;span style="margin-left: 2em; font-size: 1.05em;"&gt;○ [text]&lt;/span&gt;&lt;br&gt;</rule>
    <rule>Examples in quotes: &lt;em&gt;"example text"&lt;/em&gt;</rule>
    <rule>Nested bullets: &lt;span style="margin-left: 4em; font-size: 1.05em;"&gt;■ [text]&lt;/span&gt;&lt;br&gt;</rule>
    <critical>Do NOT include "Goal:" or "Structure:" sections in the output. Start directly with the numbered sections after the part heading.</critical>
  </html_formatting_rules>
  
  <output_format>
    <format>JSON</format>
    <structure>
      <![CDATA[
{
  "optInPage": "HTML formatted copy following the exact structure above for PART 1",
  "tripwirePage": "HTML formatted copy following the exact structure above for PART 2",
  "checkoutPage": "HTML formatted copy following the exact structure above for PART 3",
  "confirmationPage": "HTML formatted copy following the exact structure above for PART 4"
}
      ]]>
    </structure>
    <instruction>Generate actual copy content based on the user's inputs, but maintain this EXACT HTML formatting structure</instruction>
    <instruction>Respond ONLY with the JSON object, no other text</instruction>
  </output_format>
</prompt>`;

  // Use retry logic for better reliability
  return retryWithBackoff(async () => {
    try {
      console.log('[FUNNEL COPY] Starting Claude API call...');
      
      const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
      
      const responseObj = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        temperature: 0.8,
        system: SYSTEM_FUNNEL_JSON,
        messages: [
          {
            role: "user",
            content: userPromptWithJson,
          },
        ],
      });

      const contentText = getTextFromAnthropicContent(responseObj.content);
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
      const result = parseAndValidateAiJson(responseText, funnelCopyPagesSchema, {
        context: "funnel copy pages",
      });
      
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
