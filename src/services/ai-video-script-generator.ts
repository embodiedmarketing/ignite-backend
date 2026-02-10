import Anthropic from "@anthropic-ai/sdk";
import type { IStorage } from "./storage.service";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { videoScriptOutputSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY } from "../shared/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface VideoScriptInput {
  userId: number;
  landingPageUrl: string;
  storage: IStorage;
}

interface VideoScriptOutput {
  script1: {
    title: string;
    content: string;
  };
  script2: {
    title: string;
    content: string;
  };
  script3: {
    title: string;
    content: string;
  };
}

/**
 * Generate three video scripts using Claude with messaging from Build Your Strategy
 */
export async function generateVideoScripts(input: VideoScriptInput): Promise<VideoScriptOutput> {
  // Fetch existing messaging from Build Your Strategy section
  console.log("[VIDEO SCRIPT GENERATOR] Fetching Build Your Strategy messaging for user:", input.userId);
  
  const [funnelCopy, salesPages, emailSequences, messagingStrategy] = await Promise.all([
    input.storage.getFunnelCopyByUser(input.userId).catch(() => null),
    input.storage.getSalesPageDraftsByUser(input.userId).catch(() => []),
    input.storage.getLaunchEmailSequencesByUserId(input.userId).catch(() => []),
    input.storage.getActiveMessagingStrategy(input.userId).catch(() => null)
  ]);

  console.log("[VIDEO SCRIPT GENERATOR] Retrieved messaging data:", {
    hasFunnelCopy: !!funnelCopy,
    salesPagesCount: salesPages.length,
    emailsCount: emailSequences.length,
    hasMessagingStrategy: !!messagingStrategy
  });

  // Build comprehensive messaging context
  let messagingContext = "";
  
  if (messagingStrategy) {
    messagingContext += `\n## MESSAGING STRATEGY\n${messagingStrategy.content}\n`;
  }
  
  if (funnelCopy) {
    messagingContext += `\n## LAUNCH REGISTRATION FUNNEL MESSAGING\n`;
    if (funnelCopy.optInPage) messagingContext += `**Opt-In Page:**\n${funnelCopy.optInPage}\n\n`;
    if (funnelCopy.tripwirePage) messagingContext += `**Tripwire Page:**\n${funnelCopy.tripwirePage}\n\n`;
  }
  
  if (salesPages.length > 0) {
    const activeSalesPage = salesPages.find((sp: any) => sp.isActive) || salesPages[0];
    if (activeSalesPage) {
      messagingContext += `\n## SALES PAGE COPY\n${activeSalesPage.content}\n`;
    }
  }
  
  if (emailSequences.length > 0) {
    messagingContext += `\n## LAUNCH EMAIL SEQUENCE\n`;
    emailSequences.slice(0, 3).forEach((email: any, idx: number) => {
      messagingContext += `**Email ${idx + 1}: ${email.subject}**\n${email.body}\n\n`;
    });
  }

  const systemPrompt = `You are an expert video ad scriptwriter specializing in creating short-form video ads (under 60 seconds) for lead generation offers. Your scripts are conversational, emotionally engaging, and designed to stop the scroll and drive action.

KEY PRINCIPLES:
- Natural, conversational tone - sound like a real person talking on camera
- Emotionally engaging without being salesy
- Focus on connection, transformation, and curiosity
- Each script must follow the exact structure: Hook → Problem & Pain → Transformation or Promise → Soft CTA
- Scripts should be under 60 seconds when read aloud
- Use the same voice and tone as the brand messaging provided from their existing strategy
- Each script should have a different angle to test different messaging approaches
- MUST align with and incorporate elements from the user's existing messaging strategy, funnel copy, sales page, and email sequences

CRITICAL REQUIREMENT: You MUST generate EXACTLY 3 distinct video scripts following the template structure provided. The scripts must have different hooks and angles as specified.`;

    const userPrompt = `<prompt>
  <task>Create 3 short video ad scripts for a landing page, customized using the user's existing messaging strategy.</task>
  
  <inputs>
    <landing_page_url>${input.landingPageUrl}</landing_page_url>
    <messaging_context>
      <![CDATA[
${messagingContext || "No existing messaging strategy found - create scripts based on landing page URL only."}
      ]]>
    </messaging_context>
  </inputs>
  
  <script_requirements>
    <script number="1" hook_type="Problem-Focused">
      Start with the viewer's struggle, frustration, or pain point (drawn from the messaging strategy above).
    </script>
    <script number="2" hook_type="Desire/Curiosity-Focused">
      Start with the possibility, transformation, or curiosity (using language from sales page and emails above).
    </script>
    <script number="3" hook_type="Social Proof/Authority">
      Start with credibility, social proof, or unique positioning (leveraging positioning from messaging strategy above).
    </script>
  </script_requirements>
  
  <script_structure>
    <element name="Title/Angle">Brief catchy title describing the hook angle</element>
    <element name="Hook">Opening line that grabs attention - emotionally charged question or statement</element>
    <element name="Problem & Pain">Identify the viewer's frustration or pain point. Explain what's not working for them and why they feel stuck.</element>
    <element name="Transformation or Promise">Describe what becomes possible when they use the lead magnet. Connect to the core benefit/result from the landing page.</element>
    <element name="Soft CTA">Invite them to download the resource, take the quiz, or watch the training. Make it feel like an invitation, not pressure.</element>
  </script_structure>
  
  <customization_rules>
    <rule>CUSTOMIZE every script using the user's existing messaging from Build Your Strategy section</rule>
    <rule>Pull authentic language, pain points, and transformations directly from their funnel copy, sales page, and email sequences</rule>
    <rule>Each script's content must be written line-by-line as if spoken on camera</rule>
    <rule>Start each section with [Hook], [Problem & Pain], [Transformation or Promise], or [Soft CTA] in square brackets</rule>
    <rule>Put each section label on its own line</rule>
    <rule>Use quotation marks around the actual spoken content</rule>
    <rule>Add double line breaks (\n\n) between sections for readability</rule>
    <rule>Make sure each script sounds natural when read aloud and is emotionally engaging</rule>
    <rule>Maintain the brand's voice and tone from their existing messaging strategy</rule>
    <rule>Each of the 3 scripts should test a different messaging angle while staying true to the user's authentic voice</rule>
  </customization_rules>
  
  <output_format>
    <format>JSON</format>
    <structure>
      <![CDATA[
{
  "script1": {
    "title": "[Custom title for Script 1 - Problem-Focused]",
    "content": "[Hook]\n\"[Hook question/statement using pain points from their messaging strategy]\"\n\n[Problem & Pain]\n\"[Specific pain point from their funnel copy/sales page. 2-3 sentences using their customer's language.]\"\n\n[Transformation or Promise]\n\"[Transformation from their sales page/emails. What becomes possible with this offer.]\"\n\n[Soft CTA]\n\"[Invitation using CTA language from their landing page/funnel copy.]\""
  },
  "script2": {
    "title": "[Custom title for Script 2 - Desire/Curiosity]", 
    "content": "[Hook]\n\"[Curiosity/desire hook using transformation language from their emails]\"\n\n[Problem & Pain]\n\"[Different pain angle from their messaging strategy. 2-3 sentences.]\"\n\n[Transformation or Promise]\n\"[Promise/benefit from their sales page using different language than Script 1.]\"\n\n[Soft CTA]\n\"[Soft invitation using language from their email sequence.]\""
  },
  "script3": {
    "title": "[Custom title for Script 3 - Social Proof/Authority]",
    "content": "[Hook]\n\"[Authority/credibility hook using positioning from their messaging strategy]\"\n\n[Problem & Pain]\n\"[Third angle on pain point from their strategy. 2-3 sentences.]\"\n\n[Transformation or Promise]\n\"[Unique positioning/promise from their messaging strategy.]\"\n\n[Soft CTA]\n\"[Compelling invitation aligned with their brand voice.]\""
  }
}
      ]]>
    </structure>
    <requirement>Generate EXACTLY 3 video scripts</requirement>
    <requirement>Do NOT use generic examples - customize using user's messaging strategy</requirement>
  </output_format>
</prompt>`;

  try {
    console.log("[VIDEO SCRIPT GENERATOR] Calling Claude Sonnet 4 for script generation");
    
    const userPromptWithJson = userPrompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const parsedResponse = parseAndValidateAiJson(contentText, videoScriptOutputSchema, {
      context: "video scripts",
    });
    console.log("[VIDEO SCRIPT GENERATOR] Successfully generated video scripts");
    return parsedResponse as VideoScriptOutput;
  } catch (error) {
    console.error("[VIDEO SCRIPT GENERATOR] Error generating scripts:", error);
    throw new Error("Failed to generate video scripts. Please try again.");
  }
}
