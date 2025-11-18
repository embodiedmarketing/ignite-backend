import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (error?.status === 429 && attempt < maxRetries) {
        const retryAfterMs = error?.headers?.['retry-after-ms'] 
          ? parseInt(error.headers['retry-after-ms']) 
          : baseDelay * Math.pow(2, attempt);
        
        console.log(`[RATE LIMIT] Waiting ${retryAfterMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(retryAfterMs);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

interface LaunchEmailInputData {
  // User inputs from form
  inviteHooks: string;
  inviteFOMO: string;
  confirmationDetails: string;
  preEventActions: string;
  nurtureContent: string;
  liveAttendanceValue: string;
  mythsBeliefs: string;
  salesStories: string;
  finalPush: string;
  
  // From system data
  messagingStrategy: any;
  liveLaunchDetails: any;
  coreOfferOutline?: any;
  salesPageUrgency: string;
  showUpBonus?: string;
}

interface GeneratedEmail {
  emailType: 'registration_invite' | 'confirmation' | 'nurture' | 'reminder' | 'sales';
  emailNumber: number;
  subject: string;
  body: string;
}

interface LaunchEmailSequenceResult {
  emails: GeneratedEmail[];
  totalEmails: number;
}

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function extractMessagingStrategyEssentials(strategy: any): string {
  const content = strategy?.content || '';
  
  const sections = {
    corePromise: '',
    uniquePositioning: '',
    targetAudience: '',
    transformation: '',
    brandVoice: ''
  };
  
  if (content.includes('## 1. CORE PROMISE')) {
    const corePromiseMatch = content.match(/## 1\. CORE PROMISE\n(.+?)(?=\n##|$)/s);
    if (corePromiseMatch) sections.corePromise = corePromiseMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 2. UNIQUE POSITIONING')) {
    const positioningMatch = content.match(/## 2\. UNIQUE POSITIONING\n(.+?)(?=\n##|$)/s);
    if (positioningMatch) sections.uniquePositioning = positioningMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 3. TARGET AUDIENCE')) {
    const audienceMatch = content.match(/## 3\. TARGET AUDIENCE\n(.+?)(?=\n##|$)/s);
    if (audienceMatch) sections.targetAudience = audienceMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 4. TRANSFORMATION')) {
    const transformationMatch = content.match(/## 4\. TRANSFORMATION\n(.+?)(?=\n##|$)/s);
    if (transformationMatch) sections.transformation = transformationMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 5. BRAND VOICE')) {
    const voiceMatch = content.match(/## 5\. BRAND VOICE\n(.+?)(?=\n##|$)/s);
    if (voiceMatch) sections.brandVoice = voiceMatch[1].substring(0, 200).trim();
  }
  
  return `Core Promise: ${sections.corePromise}
Unique Positioning: ${sections.uniquePositioning}
Target Audience: ${sections.targetAudience}
Transformation: ${sections.transformation}
Brand Voice: ${sections.brandVoice}`;
}

function extractOfferEssentials(offer: any): string {
  const content = offer?.content || '';
  
  if (!content) return 'No core offer details available';
  
  const sections = {
    overview: '',
    purpose: '',
    outcomes: ''
  };
  
  if (content.includes('## 1️⃣ OFFER OVERVIEW')) {
    const overviewMatch = content.match(/## 1️⃣ OFFER OVERVIEW\n(.+?)(?=\n##|$)/s);
    if (overviewMatch) sections.overview = overviewMatch[1].substring(0, 400).trim();
  }
  
  if (content.includes('## 2️⃣ PURPOSE')) {
    const purposeMatch = content.match(/## 2️⃣ PURPOSE.+?\n(.+?)(?=\n##|$)/s);
    if (purposeMatch) sections.purpose = purposeMatch[1].substring(0, 400).trim();
  }
  
  if (content.includes('## 7️⃣ OUTCOMES')) {
    const outcomesMatch = content.match(/## 7️⃣ OUTCOMES.+?\n(.+?)(?=\n##|$)/s);
    if (outcomesMatch) sections.outcomes = outcomesMatch[1].substring(0, 400).trim();
  }
  
  return `Offer Overview: ${sections.overview}
Purpose: ${sections.purpose}
Outcomes: ${sections.outcomes}`;
}

export async function generateLaunchEmailSequence(inputData: LaunchEmailInputData): Promise<LaunchEmailSequenceResult> {
  console.log('[LAUNCH EMAILS] Starting email sequence generation');
  
  const compactInputData = {
    ...inputData,
    messagingStrategyEssentials: extractMessagingStrategyEssentials(inputData.messagingStrategy),
    offerEssentials: inputData.coreOfferOutline ? extractOfferEssentials(inputData.coreOfferOutline) : ''
  };
  
  const emails: GeneratedEmail[] = [];
  
  try {
    // Generate emails sequentially to avoid rate limits
    console.log('[LAUNCH EMAILS] Generating 5 registration invite emails');
    const registrationEmails = await generateRegistrationInviteEmails(compactInputData);
    emails.push(...registrationEmails);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating confirmation email');
    const confirmationEmail = await generateConfirmationEmail(compactInputData);
    emails.push(confirmationEmail);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating 3 nurture emails');
    const nurtureEmails = await generateNurtureEmails(compactInputData);
    emails.push(...nurtureEmails);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating 3 reminder emails');
    const reminderEmails = await generateReminderEmails(compactInputData);
    emails.push(...reminderEmails);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating 5 sales emails');
    const salesEmails = await generateSalesEmails(compactInputData);
    emails.push(...salesEmails);
    
    console.log(`[LAUNCH EMAILS] Successfully generated ${emails.length} emails`);
    
    return {
      emails,
      totalEmails: emails.length
    };
  } catch (error) {
    console.error('[LAUNCH EMAILS] Error generating email sequence:', error);
    throw new Error('Failed to generate email sequence');
  }
}

async function generateRegistrationInviteEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 5 registration invite emails');
  
  const systemPrompt = `You are an expert email copywriter who writes compelling, conversion-focused emails for live launch experiences. You write in a conversational, human tone with short sentences and natural rhythm. You lead with emotion and close with logic.`;
  
  const userPrompt = `Generate 5 unique registration invite emails to promote the user's upcoming live launch experience.

MESSAGING STRATEGY:
${inputData.messagingStrategyEssentials}

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

USER PROVIDED:
- Main hooks and promises: ${truncateText(inputData.inviteHooks, 1000)}
- What they miss if they don't attend: ${truncateText(inputData.inviteFOMO, 500)}

REQUIREMENTS:
Each email should focus on a different core angle:
1. Pain-based hook (highlight frustration or problem)
2. Desire-based hook (highlight dream outcome)
3. Unique mechanism hook (what makes this launch different)
4. Authority hook (personal or client story)
5. Urgency hook (final reminder, limited spots)

For each email:
- Start with a strong emotional hook or curiosity-driven statement
- Reinforce the transformation and core promise of attending
- Weave in emotional storytelling and relatable tone
- End with a clear CTA to register for the live event
- Keep subject lines friendly like they're from a friend (e.g., "RE: Your strategy" or "Quick heads-up about tomorrow")

OUTPUT FORMAT (JSON):
Return a JSON array of 5 emails, each with:
{
  "subjectLine": "friendly subject line here",
  "emailBody": "full email body with proper line breaks (\\n\\n for paragraphs)"
}

Make copy skimmable with short paragraphs. Avoid corporate or templated formatting.`;

  const completion = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
  );
  
  const response = JSON.parse(completion.choices[0].message.content || '{"emails": []}');
  const emailsArray = response.emails || [];
  
  return emailsArray.slice(0, 5).map((email: any, index: number) => ({
    emailType: 'registration_invite' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || `Register for ${inputData.liveLaunchDetails?.topic || 'Our Live Experience'}`,
    body: email.emailBody || ''
  }));
}

async function generateConfirmationEmail(inputData: any): Promise<GeneratedEmail> {
  console.log('[LAUNCH EMAILS] Generating confirmation email');
  
  const systemPrompt = `You are an expert email copywriter who writes warm, welcoming confirmation emails that get people excited to show up.`;
  
  const userPrompt = `Write a friendly confirmation email for registrants of the live launch experience.

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

USER PROVIDED:
- Key details registrants need: ${truncateText(inputData.confirmationDetails, 500)}
- Pre-event actions: ${truncateText(inputData.preEventActions, 500)}
${inputData.showUpBonus ? `- Show-up bonus: ${truncateText(inputData.showUpBonus, 300)}` : ''}

Include:
- The event name, date, time, and timezone
- Direct link to access or join (placeholder: [JOIN LINK HERE])
- A short reminder of the transformation or promise of the event
- Optional next step (add to calendar, join community, etc.)

Keep tone casual, warm, and excited — under 200 words.

OUTPUT FORMAT (JSON):
{
  "subjectLine": "friendly confirmation subject",
  "emailBody": "full email body with proper line breaks"
}`;

  const completion = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  );
  
  const response = JSON.parse(completion.choices[0].message.content || '{}');
  
  return {
    emailType: 'confirmation',
    emailNumber: 1,
    subject: response.subjectLine || "You're confirmed! Here's what to expect...",
    body: response.emailBody || ''
  };
}

async function generateNurtureEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 3 nurture emails');
  
  const systemPrompt = `You are an expert email copywriter who writes warm, story-driven nurture emails that build trust and excitement.`;
  
  const userPrompt = `Write 3 nurture emails for registrants leading up to the live launch.

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

MESSAGING STRATEGY:
${inputData.messagingStrategyEssentials}

USER PROVIDED:
- Stories, tips, or insights: ${truncateText(inputData.nurtureContent, 800)}
- Why show up live: ${truncateText(inputData.liveAttendanceValue, 500)}
- Myths or limiting beliefs to break down: ${truncateText(inputData.mythsBeliefs, 500)}
${inputData.showUpBonus ? `- Show-up bonus: ${truncateText(inputData.showUpBonus, 300)}` : ''}

Each email should:
- Tell a story or share an insight that builds anticipation
- Reconnect readers to their core desire or the problem this event solves
- Break down a limiting belief or false assumption
- Reinforce date/time/link clearly
${inputData.showUpBonus ? '- Tease the show-up bonus as extra reason to attend live' : ''}
- Keep tone warm, conversational, and focused on connection

OUTPUT FORMAT (JSON):
Return a JSON array of 3 emails:
{
  "emails": [
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."}
  ]
}`;

  const completion = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
  );
  
  const response = JSON.parse(completion.choices[0].message.content || '{"emails": []}');
  const emailsArray = response.emails || [];
  
  return emailsArray.slice(0, 3).map((email: any, index: number) => ({
    emailType: 'nurture' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || `Getting ready for ${inputData.liveLaunchDetails?.topic || 'the live event'}`,
    body: email.emailBody || ''
  }));
}

async function generateReminderEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 3 reminder emails');
  
  const systemPrompt = `You are an expert email copywriter who writes short, urgent, energetic reminder emails.`;
  
  const userPrompt = `Write 3 reminder emails for the live launch experience at these intervals:
1. 24 hours before
2. 1 hour before  
3. Live now

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

Each email should:
- Open with excitement ("It's almost time!", "We're going live soon!")
- Include the event name, exact time, and timezone
- Put the JOIN LINK at the top and again near the bottom (use placeholder: [JOIN LINK HERE])
- Keep it short (under 120 words), urgent, and easy to skim
- Use energetic, friendly tone

OUTPUT FORMAT (JSON):
{
  "emails": [
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."}
  ]
}`;

  const completion = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  );
  
  const response = JSON.parse(completion.choices[0].message.content || '{"emails": []}');
  const emailsArray = response.emails || [];
  
  return emailsArray.slice(0, 3).map((email: any, index: number) => ({
    emailType: 'reminder' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || ['Tomorrow!', 'Starting in 1 hour', 'We\'re live!'][index],
    body: email.emailBody || ''
  }));
}

async function generateSalesEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 5 sales emails');
  
  const systemPrompt = `You are an expert sales email copywriter who converts attendees into buyers using emotion, proof, and urgency.`;
  
  const userPrompt = `Write 5 sales emails to promote the user's core offer after the live launch.

MESSAGING STRATEGY:
${inputData.messagingStrategyEssentials}
${inputData.offerEssentials ? `
CORE OFFER OUTLINE:
${inputData.offerEssentials}
` : ''}
SALES PAGE URGENCY:
${truncateText(inputData.salesPageUrgency, 500)}

USER PROVIDED:
- Stories for sales emails: ${truncateText(inputData.salesStories, 800)}
- Final push for fence-sitters: ${truncateText(inputData.finalPush, 500)}

Each email should focus on a distinct conversion angle:
1. Emotional recap of the live event + open cart announcement
2. Transformation-focused story (what's possible after joining)
3. Objection handling (time, cost, belief — include proof or perspective)
4. Proof and credibility (client success, testimonials, guarantee)
5. Final urgency push (bonuses expiring, cart closing, limited spots)

Each email should:
- Start with a hook that resonates emotionally
- Highlight the offer's unique approach and transformation
- Reinforce urgency and deadlines
- Include one clear CTA to buy or join
- Maintain a natural, confident tone focused on opportunity — not pressure

OUTPUT FORMAT (JSON):
{
  "emails": [
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."}
  ]
}`;

  const completion = await retryWithBackoff(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
  );
  
  const response = JSON.parse(completion.choices[0].message.content || '{"emails": []}');
  const emailsArray = response.emails || [];
  
  return emailsArray.slice(0, 5).map((email: any, index: number) => ({
    emailType: 'sales' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || `About ${inputData.coreOfferOutline?.title || 'the offer'}`,
    body: email.emailBody || ''
  }));
}

