import OpenAI from "openai";

/*
 * Serverless API endpoint for improving image prompts.
 *
 * This function:
 * - validates the hidden access code
 * - accepts the user's rough prompt and form settings
 * - calls OpenAI text generation
 * - returns a polished image-generation prompt
 *
 * Required Vercel environment variables:
 * OPENAI_API_KEY
 * ACCESS_CODE
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
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

    const roughPrompt = cleanText(prompt);

    if (!roughPrompt || roughPrompt.length < 5) {
      return res.status(400).json({
        error: "Please enter a quick idea first.",
      });
    }

    if (roughPrompt.length > 1200) {
      return res.status(400).json({
        error: "Please shorten the prompt before improving it.",
      });
    }

    const finalImageType = cleanText(imageType, "marketing image");
    const finalPlatform = cleanText(platform, "General marketing");
    const finalStyle = cleanText(style, "professional and polished");
    const finalTextPreference = cleanText(
      textPreference,
      "No text on the image. Leave room for text overlay later."
    );
    const finalAvoid = cleanText(
      avoid,
      "distorted hands, fake logos, messy text, clutter, low-quality details, awkward cropping"
    );
    const finalSize = cleanText(size, "1024x1024");

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "You are a marketing creative director and AI image prompt specialist. Rewrite rough user ideas into polished prompts for an AI image generator. The output must be practical, visually specific, and useful for business marketing. Do not include markdown, bullets, labels, or explanations. Return only the improved prompt.",
        },
        {
          role: "user",
          content: `
Rewrite this rough image idea into one polished AI image prompt.

Rough idea:
${roughPrompt}

Image type:
${finalImageType}

Platform or use:
${finalPlatform}

Requested size:
${finalSize}

Brand feel:
${finalStyle}

Text preference:
${finalTextPreference}

Avoid:
${finalAvoid}

Rules:
- Keep the user's original intent.
- Make the scene visually specific.
- Include composition guidance.
- Include mood, lighting, setting, subject, and marketing use.
- Respect the text preference.
- Do not ask questions.
- Do not mention OpenAI.
- Do not include quotation marks around the final prompt.
- Do not create fake logos, phone numbers, URLs, addresses, or unreadable text.
- Keep the improved prompt between 80 and 150 words.
`,
        },
      ],
    });

    const improvedPrompt = cleanText(response.output_text);

    if (!improvedPrompt) {
      throw new Error("No improved prompt returned.");
    }

    return res.status(200).json({
      improvedPrompt,
    });
  } catch (error) {
    console.error("Prompt improvement error:", error);

    return res.status(500).json({
      error: "An error occurred while improving the prompt.",
    });
  }
}