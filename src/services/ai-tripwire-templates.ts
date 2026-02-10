import Anthropic from '@anthropic-ai/sdk';
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { tripwireFunnelPagesSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY, SYSTEM_FUNNEL_JSON } from "../shared/prompts";

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
  
  const prompt = `<prompt>
  <task>Create a complete Tripwire Funnel with THREE separate funnel pages using the Tripwire Offer Outline.</task>
  
  <inputs>
    <tripwire_offer_outline>
      <![CDATA[
${outlineText}
      ]]>
    </tripwire_offer_outline>
  </inputs>
  
  <mapping_guide>
    <mapping category="Offer Snapshot">
      <source>Offer Name/Product</source>
      <target>Tripwire Page (productName), Checkout Page (offerRecap), Confirmation (deliveryInstructions)</target>
    </mapping>
    <mapping category="Offer Snapshot">
      <source>Big Promise (One-Sentence Result)</source>
      <target>Tripwire Page (quickTransformation), Checkout headline</target>
    </mapping>
    <mapping category="Offer Snapshot">
      <source>Quick Win/Transformation</source>
      <target>Tripwire Page (quickTransformation), Checkout (whatsIncluded)</target>
    </mapping>
    <mapping category="Core Problem & Urgency">
      <source>Problem It Solves</source>
      <target>Tripwire Page (transition - bridge copy showing pain it fixes)</target>
    </mapping>
    <mapping category="Core Problem & Urgency">
      <source>Why This Matters Now</source>
      <target>Tripwire Page (urgency/scarcity)</target>
    </mapping>
    <mapping category="Core Problem & Urgency">
      <source>Why Different from Free Alternatives</source>
      <target>Tripwire Page (benefits)</target>
    </mapping>
    <mapping category="Target Audience & Pain Points">
      <source>Key Frustrations</source>
      <target>Tripwire Page (transition - problem intro)</target>
    </mapping>
    <mapping category="Target Audience & Pain Points">
      <source>I've Tried Everything Problem</source>
      <target>Tripwire Page (quickTransformation)</target>
    </mapping>
    <mapping category="Target Audience & Pain Points">
      <source>Objections + How Overcome</source>
      <target>Checkout (trustElements)</target>
    </mapping>
    <mapping category="Features & Benefits">
      <source>What's Included (Features)</source>
      <target>Tripwire Page (benefits - bulleted), Checkout (whatsIncluded)</target>
    </mapping>
    <mapping category="Features & Benefits">
      <source>Direct Benefits</source>
      <target>Tripwire Page (benefits - clear outcomes)</target>
    </mapping>
    <mapping category="Features & Benefits">
      <source>Biggest Emotional Benefit</source>
      <target>Tripwire headline, Confirmation (encouragement)</target>
    </mapping>
    <mapping category="Proof & Authority">
      <source>Expertise/Credentials/Story</source>
      <target>Tripwire Page (socialProof)</target>
    </mapping>
    <mapping category="Proof & Authority">
      <source>Testimonials/Case Studies</source>
      <target>Tripwire Page (socialProof)</target>
    </mapping>
    <mapping category="Proof & Authority">
      <source>Personal Story</source>
      <target>Tripwire Page (transition - story-driven)</target>
    </mapping>
    <mapping category="Structure & Delivery">
      <source>Format & Delivery Method</source>
      <target>Tripwire (productName description), Checkout (offerRecap), Confirmation (deliveryInstructions)</target>
    </mapping>
    <mapping category="Structure & Delivery">
      <source>Time Commitment</source>
      <target>Tripwire benefits, Checkout reassurance</target>
    </mapping>
    <mapping category="Structure & Delivery">
      <source>Tools/Platforms Required</source>
      <target>Confirmation (deliveryInstructions - access info)</target>
    </mapping>
    <mapping category="Pricing & Positioning">
      <source>Tripwire Price</source>
      <target>Tripwire Page (price "Get it for $X today"), Checkout ("Today's Price: $X")</target>
    </mapping>
    <mapping category="Pricing & Positioning">
      <source>Regular Price Comparison</source>
      <target>Tripwire Page (price anchor "Normally $X")</target>
    </mapping>
    <mapping category="Pricing & Positioning">
      <source>Value Positioning</source>
      <target>Tripwire (price/value framing), Checkout (offerRecap)</target>
    </mapping>
  </mapping_guide>
  
  <output_format>
    <format>JSON</format>
    <structure>
      <![CDATA[
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
      ]]>
    </structure>
  </output_format>
  
  <requirements>
    <requirement>FOLLOW THE MAPPING EXACTLY: Extract information from the specified outline sections</requirement>
    <requirement>Use persuasive, benefit-driven language</requirement>
    <requirement>Keep copy concise and action-oriented</requirement>
    <requirement>Extract ALL specific details from the outline (prices, features, delivery, etc.)</requirement>
    <requirement>Benefits must be tangible and specific from "What's Included" section</requirement>
    <requirement>Price must include both Tripwire Price and Regular Price if available</requirement>
    <requirement>Transition/Bridge Copy should combine: Problem + Key Frustration + Story</requirement>
    <requirement>Social proof is optional - omit if no testimonials/credentials in outline</requirement>
    <requirement>Trust Elements should address "Objections + How Overcome" from outline</requirement>
    <requirement>Delivery Instructions must specify Format & Delivery Method + Tools/Platforms</requirement>
    <requirement>Next Steps should be specific to the delivery format (not generic)</requirement>
    <requirement>Maintain consistent voice across all pages</requirement>
    <requirement>Use second-person ("you", "your") throughout</requirement>
    <requirement>Extract value positioning for price framing</requirement>
  </requirements>
  
  <output>
    <instruction>Return ONLY the JSON object, nothing else</instruction>
    <instruction>No markdown, no explanations</instruction>
  </output>
</prompt>`;

  try {
    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      system: SYSTEM_FUNNEL_JSON,
      messages: [
        {
          role: 'user',
          content: userPromptWithJson
        }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content).trim();
    if (!contentText) {
      return generateFallbackPages(productName);
    }
    return parseAndValidateAiJson(contentText, tripwireFunnelPagesSchema, {
      context: "tripwire funnel pages",
      fallback: undefined,
    }) as TripwireFunnelPages;
    
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

