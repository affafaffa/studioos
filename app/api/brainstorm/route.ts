import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type GeneratedIdea = {
  title: string;
  theme: string;
  language: string;
  status: string;
  score: number;
  notes: string;
};

function buildMockIdeas(
  theme: string,
  language: string,
  count: number
): GeneratedIdea[] {
  const hooks = [
    "Gold vs Silver",
    "Rich vs Poor",
    "Angel vs Demon",
    "Rainbow Transformation",
    "Princess Makeover",
    "School Fashion Battle",
    "Mermaid Glow Up",
    "Magic Wedding",
    "Secret Room Challenge",
    "Diamond vs Ruby",
    "Baby Mermaid",
    "Lost Princess",
    "Dark Magic",
    "Color Swap",
    "Best Friend Betrayal",
  ];

  return hooks.slice(0, count).map((hook, index) => ({
    title: `${hook} ${theme} Story`,
    theme,
    language,
    status: "Idea",
    score: 85 + (index % 10),
    notes: `Mock idea for ${theme}. Strong visual hook, easy thumbnail contrast, suitable for testing StudioOS without OpenAI billing.`,
  }));
}

function parseIdeas(text: string): GeneratedIdea[] {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.ideas)) {
    return parsed.ideas;
  }

  return [];
}

export async function POST(request: Request) {
  const body = await request.json();

  const theme = String(body.theme || "Huntrix");
  const language = String(body.language || "EN");
  const count = Number(body.count || 10);

  if (process.env.OPENAI_MOCK_MODE === "true") {
    return NextResponse.json({
      ideas: buildMockIdeas(theme, language, count),
      warning: "Using mock AI mode.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ideas: buildMockIdeas(theme, language, count),
      warning: "Missing OPENAI_API_KEY. Using mock ideas.",
    });
  }

  try {
    const prompt = `
You are StudioOS, an AI assistant for a YouTube content studio.

Generate ${count} YouTube long-form video ideas.

Context:
- Target content themes: Huntrix, Mermaid, Princess, School, Fashion, Rainbow, Magic.
- User makes visual story/challenge/transformation content.
- Ideas should be catchy, simple, clickable, and suitable for kids/family-friendly animated content.
- Avoid boring generic titles.
- Each idea needs a title, theme, language, status, score, and notes.

Input:
Theme: ${theme}
Language: ${language}

Return ONLY valid JSON in this exact format:

{
  "ideas": [
    {
      "title": "Gold vs Silver Huntrix Mermaid Transformation",
      "theme": "Huntrix",
      "language": "EN",
      "status": "Idea",
      "score": 91,
      "notes": "Strong transformation hook with clear visual contrast."
    }
  ]
}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: prompt,
    });

    const ideas = parseIdeas(response.output_text);

    return NextResponse.json({ ideas });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI error";

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error
        ? Number((error as { status?: number }).status)
        : 0;

    const isQuotaError =
      status === 429 ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("billing");

    if (isQuotaError) {
      return NextResponse.json({
        ideas: buildMockIdeas(theme, language, count),
        warning:
          "OpenAI quota or billing limit reached. Using mock ideas for development.",
      });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}