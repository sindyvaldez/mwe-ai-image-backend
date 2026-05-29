import OpenAI from "openai";

/*
 * Serverless API endpoint for the Club AI Plus Creative Studio.
 *
 * This function:
 * - validates the hidden access code
 * - accepts size and quality from Squarespace
 * - blocks unsupported size/quality values
 * - builds a stronger marketing image prompt
 * - sends the request to the OpenAI image API
 * - returns a base64 PNG image to Squarespace
 *
 * Required Vercel environment variables:
 * OPENAI_API_KEY
 * ACCESS_CODE
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_SIZES = ["1024x1024", "1536x1024", "1024x1536"];
const ALLOWED_QUALITIES = ["low", "medium", "high"];

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function normalizeSize(size) {
  if (ALLOWED_SIZES.includes(size)) {
    return size;
  }

  return "1024x1024";
}

function normalizeQuality(quality) {
  if (ALLOWED_QUALITIES.includes(quality)) {
    return quality;
  }

  return "medium";
}

function getFormatInstruction(size) {
  if (size === "1536x1024") {
    return `
This is a landscape image.
Use a wide horizontal composition.
Make it suitable for website banners, blog headers, email headers, and horizontal marketing placements.
Keep important subjects away from the far left and far right edges.
Leave visual breathing room for cropping or text overlay.
`;
  }

  if (size === "1024x1536") {
    return `
This is a portrait image.
Use a vertical composition.
Make it suitable for Stories, Reels covers, Pinterest pins, vertical ads, and mobile-first placements.
Keep the main subject centered vertically and avoid cutting off key details.
Leave room near the top or lower third for optional text overlay.
`;
  }

  return `
This is a square image.
Use a balanced 1:1 composition.
Make it suitable for Instagram, Facebook, LinkedIn, and general social media posts.
Keep the main subject centered and avoid crowding the edges.
`;
}

function buildPrompt({
  prompt,
  imageType,
  platform,
  style,
  textPreference,
  avoid,
  size,
}) {
  const formatInstruction = getFormatInstruction(size);

  return `
Create a ${imageType || "marketing image"} for a business marketing use case.

Output format:
- Exact requested image size: ${size}
${formatInstruction}

Platform or use:
- ${platform || "General marketing"}

Brand direction:
- Brand feel: ${style || "professional and polished"}
- Professional and commercially usable
- Clean composition
- Strong lighting
- Clear focal point
- Polished marketing quality
- Avoid cluttered backgrounds
- Avoid fake logos, fake phone numbers, fake addresses, and messy unreadable text

Text direction:
- ${textPreference || "No text on the image. Leave room for text overlay later."}

Avoid:
- ${avoid || "distorted hands, fake logos, messy text, clutter, low-quality details, awkward cropping"}

User request:
${prompt}
`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const {
      prompt,
      imageType,
      platform,
      style,
      textPreference,
      avoid,
      size,
      quality,
      accessCode,
    } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Server configuration error. Missing OpenAI API key.",
      });
    }

    if (!process.env.ACCESS_CODE) {
      return res.status(500).json({
        error: "Server configuration error. Missing access code.",
      });
    }

    if (!accessCode || accessCode !== process.env.ACCESS_CODE) {
      return res.status(401).json({
        error: "Unauthorized request.",
      });
    }

    const cleanedPrompt = cleanText(prompt);

    if (!cleanedPrompt || cleanedPrompt.length < 10) {
      return res.status(400).json({
        error: "Please provide a more detailed prompt.",
      });
    }

    if (cleanedPrompt.length > 3000) {
      return res.status(400).json({
        error: "Please keep the prompt shorter.",
      });
    }

    const finalSize = normalizeSize(size);
    const finalQuality = normalizeQuality(quality);

    const finalPrompt = buildPrompt({
      prompt: cleanedPrompt,
      imageType: cleanText(imageType, "marketing image"),
      platform: cleanText(platform, "General marketing"),
      style: cleanText(style, "professional and polished"),
      textPreference: cleanText(
        textPreference,
        "No text on the image. Leave room for text overlay later."
      ),
      avoid: cleanText(
        avoid,
        "distorted hands, fake logos, messy text, clutter, low-quality details, awkward cropping"
      ),
      size: finalSize,
    });

    console.log("Generating image with:", {
      size: finalSize,
      quality: finalQuality,
      imageType,
      platform,
    });

    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: finalPrompt,
      n: 1,
      size: finalSize,
      quality: finalQuality,
    });

    const imageData = result.data?.[0]?.b64_json;

    if (!imageData) {
      throw new Error("Failed to retrieve image data from OpenAI.");
    }

    return res.status(200).json({
      image: `data:image/png;base64,${imageData}`,
      metadata: {
        size: finalSize,
        quality: finalQuality,
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return res.status(500).json({
      error: "An error occurred while generating the image.",
    });
  }
}
