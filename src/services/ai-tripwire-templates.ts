import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TripwireFunnelPages {
  thankyou: {
    headline: string;
    transition: string;
    productName: string;
    quickTransformation: string;
    price: string;
    benefits: string[];
    socialProof?: string;
    urgency?: string;
    ctaButton: string;
  };
  checkout: {
    headline: string;
    offerRecap: string;
    whatsIncluded: string[];
    price: string;
    trustElements: string[];
  };
  confirmation: {
    headline: string;
    deliveryInstructions: string;
    nextSteps: string[];
    encouragement: string;
    supportInfo?: string;
  };
}

export async function generateTripwireFunnelPages(
  outlineText: string,
  productName: string = "your offer"
): Promise<TripwireFunnelPages> {
  
  const prompt = `You are an expert copywriter creating a complete Tripwire Funnel for a customer.

You will receive a Tripwire Offer Outline (structured summary) and must generate THREE separate funnel pages with compelling, conversion-focused copy.

TRIPWIRE OFFER OUTLINE:
${outlineText}

YOUR TASK:
Generate a complete JSON object with three funnel pages. Follow the EXACT MAPPING below to extract information from the outline.

DETAILED MAPPING GUIDE (Outline → Funnel Pages):

1. OFFER SNAPSHOT:
   - Offer Name/Product → use in: Tripwire Page (productName), Checkout Page (offerRecap), Confirmation (deliveryInstructions)
   - Big Promise (One-Sentence Result) → use in: Tripwire Page (quickTransformation), Checkout headline
   - Quick Win/Transformation → use in: Tripwire Page (quickTransformation), Checkout (whatsIncluded)

2. CORE PROBLEM & URGENCY:
   - Problem It Solves → use in: Tripwire Page (transition - bridge copy showing pain it fixes)
   - Why This Matters Now → use in: Tripwire Page (urgency/scarcity)
   - Why Different from Free Alternatives → use in: Tripwire Page (benefits)

3. TARGET AUDIENCE & PAIN POINTS:
   - Key Frustrations → use in: Tripwire Page (transition - problem intro)
   - 'I've Tried Everything' Problem → use in: Tripwire Page (quickTransformation)
   - Objections + How Overcome → use in: Checkout (trustElements)

4. FEATURES & BENEFITS:
   - What's Included (Features) → use in: Tripwire Page (benefits - bulleted), Checkout (whatsIncluded)
   - Direct Benefits → use in: Tripwire Page (benefits - clear outcomes)
   - Biggest Emotional Benefit → use in: Tripwire headline, Confirmation (encouragement)

5. PROOF & AUTHORITY:
   - Expertise/Credentials/Story → use in: Tripwire Page (socialProof)
   - Testimonials/Case Studies → use in: Tripwire Page (socialProof)
   - Personal Story → use in: Tripwire Page (transition - story-driven)

6. STRUCTURE & DELIVERY:
   - Format & Delivery Method → use in: Tripwire (productName description), Checkout (offerRecap), Confirmation (deliveryInstructions)
   - Time Commitment → use in: Tripwire benefits, Checkout reassurance
   - Tools/Platforms Required → use in: Confirmation (deliveryInstructions - access info)

7. PRICING & POSITIONING:
   - Tripwire Price → use in: Tripwire Page (price "Get it for $X today"), Checkout ("Today's Price: $X")
   - Regular Price Comparison → use in: Tripwire Page (price anchor "Normally $X")
   - Value Positioning → use in: Tripwire (price/value framing), Checkout (offerRecap)

OUTPUT FORMAT (strict JSON - no markdown, no explanations):
{
  "thankyou": {
    "headline": "Your [lead magnet] is on its way! (Use biggest emotional benefit)",
    "transition": "Bridge copy: [Show the problem it solves + key frustration + personal story connection]",
    "productName": "[Offer Name from outline - include who it's for]",
    "quickTransformation": "[Big Promise/One-Sentence Result from outline - what they achieve immediately]",
    "price": "Get [product] for just $[Tripwire Price] today (normally $[Regular Price]). [Value positioning]",
    "benefits": [
      "[What's Included feature 1 → Direct Benefit outcome]",
      "[What's Included feature 2 → Direct Benefit outcome]", 
      "[What's Included feature 3 → Direct Benefit outcome]",
      "[Time commitment if applicable]"
    ],
    "socialProof": "[Testimonials/Case Studies from outline OR expertise/credentials - omit if none available]",
    "urgency": "[Why This Matters Now from outline - create scarcity]",
    "ctaButton": "Yes, I Want This!"
  },
  "checkout": {
    "headline": "You're One Step Away From [Big Promise/Result from outline]",
    "offerRecap": "[Offer Name] gives you [Format & Delivery] so you can [Big Promise/Result].",
    "whatsIncluded": [
      "[Feature 1 from What's Included + outcome]",
      "[Feature 2 from What's Included + outcome]",
      "[Feature 3 from What's Included + outcome]",
      "[Time Commitment reassurance if applicable]"
    ],
    "price": "Today's Price: $[Tripwire Price]",
    "trustElements": [
      "[How objections are overcome from outline]",
      "Secure checkout",
      "Instant access after purchase"
    ]
  },
  "confirmation": {
    "headline": "Congrats! You're In 🎉",
    "deliveryInstructions": "[Format & Delivery Method from outline - specify where/how they access]. [Tools/Platforms Required if any]",
    "nextSteps": [
      "[Specific step based on delivery format]",
      "[Specific step based on delivery format]",
      "[Specific step based on delivery format]"
    ],
    "encouragement": "[Use Biggest Emotional Benefit - You've invested in yourself message]",
    "supportInfo": "Need help? [Support contact if available in outline]"
  }
}

REQUIREMENTS:
- FOLLOW THE MAPPING EXACTLY: Extract information from the specified outline sections
- Use persuasive, benefit-driven language
- Keep copy concise and action-oriented  
- Extract ALL specific details from the outline (prices, features, delivery, etc.)
- Benefits must be tangible and specific from "What's Included" section
- Price must include both Tripwire Price and Regular Price if available
- Transition/Bridge Copy should combine: Problem + Key Frustration + Story
- Social proof is optional - omit if no testimonials/credentials in outline
- Trust Elements should address "Objections + How Overcome" from outline
- Delivery Instructions must specify Format & Delivery Method + Tools/Platforms
- Next Steps should be specific to the delivery format (not generic)
- Maintain consistent voice across all pages
- Use second-person ("you", "your") throughout
- Extract value positioning for price framing

Return ONLY the JSON object, nothing else.`;

  try {
    const userPromptWithJson = prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      system: 'You are an expert funnel copywriter. You generate conversion-focused sales copy in strict JSON format. Never include markdown formatting or explanations - only valid JSON.',
      messages: [
        {
          role: 'user',
          content: userPromptWithJson
        }
      ],
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    const responseText = contentText.trim();
    
    if (!responseText) {
      return generateFallbackPages(productName);
    }

    const parsedResponse = JSON.parse(responseText);
    
    // Validate structure
    if (!parsedResponse.thankyou || !parsedResponse.checkout || !parsedResponse.confirmation) {
      console.warn('Invalid AI response structure, using fallback');
      return generateFallbackPages(productName);
    }

    return parsedResponse as TripwireFunnelPages;
    
  } catch (error) {
    console.error('Error generating tripwire funnel pages:', error);
    return generateFallbackPages(productName);
  }
}

function generateFallbackPages(productName: string): TripwireFunnelPages {
  return {
    thankyou: {
      headline: `Your free resource is on its way to your inbox!`,
      transition: `Before you go, here's a special offer just for you!`,
      productName: `${productName}`,
      quickTransformation: `Get instant access to the complete system that helps you achieve your goals faster.`,
      price: `Get ${productName} for just $17 today. This is the missing piece to your success.`,
      benefits: [
        'Immediate access to all materials',
        'Step-by-step implementation guide',
        'Exclusive bonus resources'
      ],
      urgency: 'This special offer is only available on this page.',
      ctaButton: 'Yes, I Want This!'
    },
    checkout: {
      headline: `You're One Step Away From Your Transformation`,
      offerRecap: `${productName} gives you everything you need to achieve your goals quickly and efficiently.`,
      whatsIncluded: [
        'Complete training materials',
        'Implementation resources',
        'Ongoing support'
      ],
      price: 'Today\'s Price: $17',
      trustElements: [
        'Secure checkout',
        'Instant access after purchase',
        'Your information is safe with us'
      ]
    },
    confirmation: {
      headline: `Congrats! You're In 🎉`,
      deliveryInstructions: `An email with your access details is on its way. If you don't see it in 10 minutes, check your spam folder.`,
      nextSteps: [
        'Check your email for access details',
        'Log into your account',
        'Start with the quick-start guide'
      ],
      encouragement: `You've just invested in yourself and your future. Take a moment to celebrate this step forward!`,
      supportInfo: 'Need help? Contact our support team.'
    }
  };
}

