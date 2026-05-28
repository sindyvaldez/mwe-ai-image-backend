import OpenAI from "openai";

/*
 * Serverless API endpoint for generating marketing images.
 *
 * This function is designed to run in a serverless environment (e.g. Vercel, Netlify).  It expects a
 * POST request with a JSON body containing `prompt`, `imageType`, `style`, and `accessCode`.
 *
 * The function validates the access code, constructs a branded prompt, sends a request to the
 * OpenAI image API (GPT‑image‑2), and returns a JSON response containing a base64‑encoded PNG.
 *
 * Environment variables expected:
 *   OPENAI_API_KEY – your OpenAI API key (do not commit this to version control)
 *   ACCESS_CODE    – a secret string used to gate access to the generator
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Build a prompt for the image API based on user input.
 * The goal is to keep the output business-friendly, white‑label, and suitable for marketing use.
 */
function buildPrompt({ prompt, imageType, style }) {
  return `Create a ${imageType} for a business marketing use case.

Brand direction:
- White‑label marketing imagery
- Professional and commercially usable
- Style: ${style}
- Clean composition
- Avoid clutter or busy backgrounds
- Avoid fake logos or contact information

User request:
${prompt}`;
}

export default async function handler(req, res) {
  // Allow CORS for any origin (if you want to restrict to a specific domain, set it here)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Return early for CORS preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, imageType, style, accessCode } = req.body;

    // Validate access code
    if (!accessCode || accessCode !== process.env.ACCESS_CODE) {
      return res.status(401).json({ error: "Invalid access code" });
    }

    // Validate prompt length
    if (!prompt || prompt.length < 10) {
      return res.status(400).json({ error: "Please provide a more detailed prompt." });
    }
    if (prompt.length > 1500) {
      return res.status(400).json({ error: "Please keep the prompt under 1,500 characters." });
    }

    const finalPrompt = buildPrompt({ prompt, imageType, style });

    // Request an image from OpenAI.  We request a single image with medium quality at 1024×1024.
    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
    });

    const imageData = result.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error("Failed to retrieve image data from OpenAI");
    }

    // Return the image data as a data URI
    const dataUri = `data:image/png;base64,${imageData}`;
    return res.status(200).json({ image: dataUri });
  } catch (err) {
    console.error("Image generation error:", err);
    return res.status(500).json({ error: "An error occurred while generating the image" });
  }
}