import { NextResponse } from "next/server";

type ImproveBriefInput = {
  title: string;
  theme: string;
  language: string;
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
};

type ImprovedBrief = {
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
};

function buildMockImprovedBrief(
  input: ImproveBriefInput
): ImprovedBrief {
  const title = input.title || "Untitled Idea";
  const theme = input.theme || "visual story";

  return {
    hook: `${title} creates a stronger emotional contrast, a clearer transformation promise, and an easy-to-understand visual conflict for the audience.`,

    thumbnail_prompt: `A high-click YouTube thumbnail for "${title}", featuring expressive animated characters, strong before-and-after contrast, magical glow effects, bright cinematic lighting, clean background, dramatic facial expressions, clear ${theme} identity, and one bold visual focal point.`,

    storyline: `The main character enters a ${theme} challenge and faces a clear visual conflict. At first, they are underestimated or placed at a disadvantage. A magical transformation changes their appearance, confidence, and role in the story. The conflict escalates through competition, surprise reveals, and emotional choices before ending with a satisfying win and a strong final transformation moment.`,

    notes: `Improved brief. Stronger hook, clearer thumbnail direction, more structured storyline, and better fit for long-form animated visual storytelling.`,
  };
}

function parseImprovedBrief(text: string): ImprovedBrief | null {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      hook: String(parsed.hook || ""),
      thumbnail_prompt: String(parsed.thumbnail_prompt || ""),
      storyline: String(parsed.storyline || ""),
      notes: String(parsed.notes || ""),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/improve-brief",
    message: "Improve brief API is working.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const input: ImproveBriefInput = {
      title: String(body.title || ""),
      theme: String(body.theme || ""),
      language: String(body.language || "EN"),
      hook: String(body.hook || ""),
      thumbnail_prompt: String(body.thumbnail_prompt || ""),
      storyline: String(body.storyline || ""),
      notes: String(body.notes || ""),
    };

    const useMockMode =
      process.env.OPENAI_MOCK_MODE !== "false" ||
      !process.env.OPENAI_API_KEY;

    if (useMockMode) {
      return NextResponse.json({
        brief: buildMockImprovedBrief(input),
        warning: "Using mock AI mode.",
      });
    }

    const OpenAI = (await import("openai")).default;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are StudioOS, an AI creative strategist for a YouTube animated storytelling studio.

Your task:
Improve the creative brief for one YouTube video idea.

Content style:
- Kids/family-friendly animated visual stories.
- Themes: Huntrix, Mermaid, Princess, School, Fashion, Rainbow, Magic.
- Strong hooks: Gold vs Silver, Rich vs Poor, Angel vs Demon, Mermaid Transformation, Princess Makeover, Fashion Battle, School Challenge, Secret Room, Wedding, Baby Mermaid, Diamond vs Ruby.
- The improved brief should be more clickable, more visual, more specific, and easier for thumbnail/story production.

Original idea:
Title: ${input.title}
Theme: ${input.theme}
Language: ${input.language}

Current Hook:
${input.hook}

Current Thumbnail Prompt:
${input.thumbnail_prompt}

Current Storyline:
${input.storyline}

Current Notes:
${input.notes}

Improve these 4 fields:
1. hook
2. thumbnail_prompt
3. storyline
4. notes

Rules:
- Keep it family-friendly.
- Make the hook clearer and more emotional.
- Make the thumbnail prompt detailed enough for a thumbnail designer or AI image tool.
- Make the storyline structured but not too long.
- Do not change the title.
- Return ONLY valid JSON.

Return format:

{
  "hook": "Improved hook here",
  "thumbnail_prompt": "Improved thumbnail prompt here",
  "storyline": "Improved storyline here",
  "notes": "Improved notes here"
}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: prompt,
    });

    const brief = parseImprovedBrief(response.output_text);

    if (!brief) {
      return NextResponse.json({
        brief: buildMockImprovedBrief(input),
        warning:
          "AI returned invalid JSON. Using mock improved brief instead.",
      });
    }

    return NextResponse.json({ brief });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown API error";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}