import Anthropic from '@anthropic-ai/sdk';
import { getTextFromAnthropicContent, parseAndValidateAiJson, stripJsonMarkdown } from "../utils/ai-response";
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
  <task>Generate complete funnel copy for all 4 pages from the user's inputs. Expert funnel copywriter, high-converting sales pages.</task>
  <inputs>
    <messaging_strategy_voice>${input.messagingStrategyVoice || "Professional and conversion-focused"}</messaging_strategy_voice>
    ${hasInterviewData ? `<interview_enhanced_insights critical="true">Input contains INTERVIEW-ENHANCED fields (frustrations, secret_fears, magic_solution, etc.) with customer's EXACT words. Use CINEMATIC, moment-by-moment language; include exact words and internal dialogue; add SPECIFIC outcomes with numbers/timeframes; show sensory details; make copy VISCERAL and AUTHENTIC. Example: not "They feel stuck" but "They've been showing up for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram they wonder, 'What am I missing?'" PRIORITIZE these fields throughout.</interview_enhanced_insights>` : ''}
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
  <writing_directives>Mirror messaging voice. Conversational, rhythm, emotion; contractions ("you'll," "here's how"). Connection → Authority → Action. Paragraphs under 3 lines; bullets and bold; emojis/dividers if on-brand. No academic or generic tone.</writing_directives>
  <page_structures>
    <page number="1" name="OPT-IN PAGE COPY">Goal: Turn awareness into action; reader feels understood, lead magnet = missing solution.
      <sections>1. Headline (Hook): transformation/benefit, audience voice "Stop [pain] and start [result]". 2. Subheadline: one sentence that amplifies result. 3. Pain-to-Solution: emotional frustration → "Until now…" hope. 4. What's Inside: 3–5 outcome bullets from inputs. 5. CTA: strong action verb + reason to click. 6. Mini Bio/Authority: 2–3 sentences, tie to benefit. 7. Social Proof: 1–2 testimonials or metrics if provided.</sections>
    </page>
    <page number="2" name="TRIPWIRE PAGE COPY">Goal: Low-ticket next step that deepens lead-magnet transformation.
      <sections>1. Headline: Thank you + transition ("Your [Lead Magnet] Is On the Way!"). 2. Bridge: "Before you go…" introduce tripwire as next step. 3. Product Overview: name, what it does, for whom. 4. Key Benefits: 3–5 bullets, tangible outcomes. 5. Price + Value: contrast regular vs. special ("Normally $197 — today $27"), exclusive frame. 6. Social Proof: brief testimonials/transformations. 7. Urgency (optional). 8. CTA: action-first button.</sections>
    </page>
    <page number="3" name="CHECKOUT PAGE COPY">Goal: Reinforce confidence, reduce friction.
      <sections>1. Headline ("You're One Step Away from [Result]"). 2. Offer Recap: 1–2 sentences, what they're buying + transformation. 3. Short bullet list (optional). 4. Price: bold, clear. 5. Trust: "Secure checkout • Instant access • Your information is safe".</sections>
    </page>
    <page number="4" name="CONFIRMATION PAGE COPY">Goal: Celebrate decision, momentum, next steps.
      <sections>1. Headline ("You Did It!" / "Congrats! You're In!"). 2. Welcome: celebrate action. 3. Next Steps: email, access PDF, clear calendar. 4. Encouragement: identity/motivation line.</sections>
    </page>
  </page_structures>
  <html_formatting_rules>
    Page heading: &lt;h2 style="font-size: 1.8em;"&gt;&lt;strong&gt;PART X — PAGE NAME COPY&lt;/strong&gt;&lt;/h2&gt;
    Sections: &lt;p style="font-size: 1.25em;"&gt;&lt;strong&gt;1. Section Name:&lt;/strong&gt;&lt;br&gt; Sub-items: &lt;span style="margin-left: 2em; font-size: 1.05em;"&gt;○ [text]&lt;/span&gt;&lt;br&gt; Quotes: &lt;em&gt;"text"&lt;/em&gt; Nested: &lt;span style="margin-left: 4em; font-size: 1.05em;"&gt;■ [text]&lt;/span&gt;&lt;br&gt;
    Do NOT output "Goal:" or "Structure:" — start with numbered sections after part heading.
  </html_formatting_rules>
  <output_format>JSON with keys: "optInPage", "tripwirePage", "checkoutPage", "confirmationPage". Each value = full HTML for that page using the structure above. Generate real copy from inputs; keep EXACT HTML formatting. Respond ONLY with the JSON object.</output_format>
</prompt>`;

  // Use retry logic for better reliability
  return retryWithBackoff(async () => {
    try {
      console.log('[FUNNEL COPY] Starting Claude API call...');
      
      const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
      
      const responseObj = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        temperature: 0.7,
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
      const responseText = stripJsonMarkdown(contentText.trim());
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
