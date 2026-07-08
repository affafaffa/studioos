import { NextResponse } from "next/server";

type RemixInput = {
  title: string;
  theme: string;
  idea_type: string;
  hook_type: string;
  title_formula: string;
  thumbnail_style: string;
  channel_name: string;
  group_name: string;
  view_count: number;
};

type RemixIdea = {
  title: string;
  theme: string;
  language: string;
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
  score: number;
};

function cleanJsonText(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function parseRemixIdea(text: string): RemixIdea | null {
  try {
    const parsed = JSON.parse(cleanJsonText(text));

    return {
      title: String(parsed.title || ""),
      theme: String(parsed.theme || "Competitor Remix"),
      language: String(parsed.language || "EN"),
      hook: String(parsed.hook || ""),
      thumbnail_prompt: String(parsed.thumbnail_prompt || ""),
      storyline: String(parsed.storyline || ""),
      notes: String(parsed.notes || ""),
      score: Number(parsed.score || 85),
    };
  } catch {
    return null;
  }
}

function detectSafeTheme(input: RemixInput) {
  const text = `${input.title} ${input.theme} ${input.idea_type}`.toLowerCase();

  if (text.includes("mermaid")) return "Mermaid";
  if (text.includes("princess")) return "Princess";
  if (text.includes("school")) return "School";
  if (text.includes("fashion")) return "Fashion";
  if (text.includes("rainbow")) return "Rainbow";
  if (text.includes("magic")) return "Magic";
  if (text.includes("doll") || text.includes("baby")) return "Baby Doll";
  if (text.includes("huntrix")) return "Huntrix";

  return input.theme || "Transformation";
}

function buildMockRemix(input: RemixInput): RemixIdea {
  const theme = detectSafeTheme(input);
  const ideaType = input.idea_type || "Transformation";
  const hookType = input.hook_type || "Contrast";

  let title = `Gold vs Trash ${theme} Transformation Story`;

  if (ideaType.toLowerCase().includes("rich")) {
    title = `Diamond vs Broken ${theme} Makeover Story`;
  }

  if (ideaType.toLowerCase().includes("angel")) {
    title = `Light Angel vs Dark Queen ${theme} Challenge`;
  }

  if (ideaType.toLowerCase().includes("mermaid")) {
    title = `Poor Mermaid vs Golden Princess Glow Up`;
  }

  if (ideaType.toLowerCase().includes("school")) {
    title = `Secret School Makeover Challenge`;
  }

  return {
    title,
    theme,
    language: "EN",
    hook: `${title} uses a clear ${hookType.toLowerCase()} hook with strong before-and-after emotion, making the audience curious about the final transformation.`,

    thumbnail_prompt: `Create an original high-click YouTube thumbnail for "${title}". Use a strong before-and-after composition, expressive animated characters, bright cinematic lighting, magical transformation effects, clear ${theme} identity, dramatic facial expressions, and one bold visual focal point. Do not copy the competitor thumbnail composition, character design, or exact scene.`,

    storyline: `The main character starts in a weak or underestimated position. A visual conflict appears and creates pressure. Through a magical ${theme.toLowerCase()} transformation, the character gains confidence and competes against a stronger rival. The story builds through surprise reveals, emotional choices, and a final satisfying transformation moment.`,

    notes: `Remixed from a competitor pattern, not copied. Source pattern: ${input.idea_type || "visual story"} / ${input.hook_type || "hook"} / ${input.title_formula || "title formula"}. Use this as an original StudioOS idea inspired by market signals.`,

    score: Math.min(
      98,
      Math.max(82, Math.round(Math.log10(Number(input.view_count || 0) + 1) * 18))
    ),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input: RemixInput = {
      title: String(body.title || ""),
      theme: String(body.theme || ""),
      idea_type: String(body.idea_type || ""),
      hook_type: String(body.hook_type || ""),
      title_formula: String(body.title_formula || ""),
      thumbnail_style: String(body.thumbnail_style || ""),
      channel_name: String(body.channel_name || ""),
      group_name: String(body.group_name || ""),
      view_count: Number(body.view_count || 0),
    };

    const useMockMode =
      process.env.OPENAI_MOCK_MODE !== "false" ||
      !process.env.OPENAI_API_KEY;

    if (useMockMode) {
      return NextResponse.json({
        idea: buildMockRemix(input),
        warning: "Using mock remix mode.",
      });
    }

    const OpenAI = (await import("openai")).default;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are StudioOS, an AI creative strategist for a YouTube animated storytelling studio.

Your job:
Create an ORIGINAL YouTube idea inspired by the market pattern of a competitor video.

Important rules:
- Do NOT copy the exact competitor title.
- Do NOT copy the exact thumbnail composition.
- Do NOT copy character designs, names, or scenes.
- Extract the winning pattern only.
- Make the result family-friendly and suitable for animated visual storytelling.
- Output ONLY valid JSON.

Competitor video:
Title: ${input.title}
Theme: ${input.theme}
Idea Type: ${input.idea_type}
Hook Type: ${input.hook_type}
Title Formula: ${input.title_formula}
Thumbnail Style: ${input.thumbnail_style}
Channel: ${input.channel_name}
Group: ${input.group_name}
Views: ${input.view_count}

Create:
1. original title
2. theme
3. language
4. hook
5. thumbnail_prompt
6. storyline
7. notes
8. score from 0 to 100

Return format:
{
  "title": "Original new title",
  "theme": "Theme",
  "language": "EN",
  "hook": "Hook",
  "thumbnail_prompt": "Thumbnail prompt",
  "storyline": "Storyline",
  "notes": "Notes",
  "score": 85
}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: prompt,
    });

    const parsed = parseRemixIdea(response.output_text);

    if (!parsed) {
      return NextResponse.json({
        idea: buildMockRemix(input),
        warning: "AI returned invalid JSON. Using mock remix.",
      });
    }

    return NextResponse.json({
      idea: parsed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown remix error";

    return NextResponse.json({
      idea: buildMockRemix({
        title: "Competitor Video",
        theme: "Transformation",
        idea_type: "Transformation",
        hook_type: "Contrast",
        title_formula: "",
        thumbnail_style: "",
        channel_name: "",
        group_name: "",
        view_count: 0,
      }),
      warning: message,
    });
  }
}