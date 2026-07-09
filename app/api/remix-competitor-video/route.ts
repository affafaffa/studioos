import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import type { CompetitorVideo } from "@/types/competitor";

type KeywordRow = {
  id: number;
  keyword: string;
  category: string | null;
  market_stage: string | null;
  trend_score: number | null;
  opportunity_score: number | null;
  breakout_score: number | null;
  growth_score: number | null;
  adoption_score: number | null;
  total_views: number | null;
  total_views_per_day: number | null;
  video_count: number | null;
  channel_count: number | null;
  discovery_reason: string | null;
  keyword_rank: number | null;
};

type KeywordMatchRow = {
  keyword_id: number | null;
  keyword: string;
  match_source: string | null;
  view_count: number | null;
  views_per_day: number | null;
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

  source_keywords: string[];
  keyword_strategy: string;
  market_angle: string;
  search_intent: string;
  differentiation_note: string;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function formatKeyword(keyword: KeywordRow) {
  return {
    keyword: keyword.keyword,
    category: keyword.category || "Discovered Phrase",
    market_stage: keyword.market_stage || "Watch",
    trend_score: Number(keyword.trend_score || 0),
    opportunity_score: Number(keyword.opportunity_score || 0),
    breakout_score: Number(keyword.breakout_score || 0),
    growth_score: Number(keyword.growth_score || 0),
    adoption_score: Number(keyword.adoption_score || 0),
    total_views: Number(keyword.total_views || 0),
    views_per_day: Number(keyword.total_views_per_day || 0),
    video_count: Number(keyword.video_count || 0),
    channel_count: Number(keyword.channel_count || 0),
    discovery_reason: keyword.discovery_reason || "",
  };
}

function uniqueStrings(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function pickTopKeywords(
  keywords: KeywordRow[],
  predicate: (keyword: KeywordRow) => boolean,
  limit: number
) {
  return keywords
    .filter(predicate)
    .sort((a, b) => {
      const scoreA =
        Number(a.trend_score || 0) * 0.4 +
        Number(a.opportunity_score || 0) * 0.35 +
        Number(a.breakout_score || 0) * 0.25;

      const scoreB =
        Number(b.trend_score || 0) * 0.4 +
        Number(b.opportunity_score || 0) * 0.35 +
        Number(b.breakout_score || 0) * 0.25;

      return scoreB - scoreA;
    })
    .slice(0, limit);
}

function extractJsonObject(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI response did not contain JSON.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function getMockIdea({
  video,
  keywordPack,
}: {
  video: CompetitorVideo;
  keywordPack: {
    selectedKeywords: string[];
  };
}): RemixIdea {
  const selectedKeywords =
    keywordPack.selectedKeywords.length > 0
      ? keywordPack.selectedKeywords
      : ["Poor vs Rich", "Princess Makeover", "Secret Room Challenge"];

  const mainKeyword = selectedKeywords[0] || "Poor vs Rich";
  const secondKeyword = selectedKeywords[1] || "Transformation";
  const thirdKeyword = selectedKeywords[2] || "Secret Room";

  return {
    title: `${mainKeyword} ${secondKeyword}: The Hidden ${thirdKeyword} Twist`,
    theme: video.theme || "Market Remix",
    language: "EN",
    hook: `A high-contrast story that opens with ${mainKeyword}, then adds ${secondKeyword} and ${thirdKeyword} as the unexpected market hook.`,
    thumbnail_prompt: `Bright split-screen thumbnail. Left side shows the low-status version, right side shows the upgraded version. Add clear visual contrast, emotional faces, dramatic arrow, and objects that hint at ${thirdKeyword}. Do not copy the competitor thumbnail.`,
    storyline: `Start with a clear ${mainKeyword} conflict. Introduce a character who discovers a hidden opportunity connected to ${thirdKeyword}. Midway, add a transformation/payoff moment using ${secondKeyword}. End with a surprising reversal that makes the audience want to compare before vs after.`,
    notes: `Remix V2 mock idea generated from Keyword Radar. Use these keyword clusters as market direction, not as copied titles: ${selectedKeywords.join(", ")}.`,
    score: 90,

    source_keywords: selectedKeywords,
    keyword_strategy: `Fuse ${selectedKeywords.slice(0, 4).join(" + ")} into one original concept.`,
    market_angle: `Use currently rising competitor keyword clusters to make the idea feel closer to what the market is clicking on now.`,
    search_intent: `Audience likely searches for contrast, transformation, secret build, fandom or makeover-based story ideas.`,
    differentiation_note:
      "Do not copy the competitor title, characters, thumbnail layout, or exact scenes. Only reuse the market signal.",
  };
}

async function getVideoFromBody(body: Record<string, unknown>) {
  const competitorVideoId = Number(body.competitorVideoId || 0);

  if (competitorVideoId) {
    const { data, error } = await supabase
      .from("competitor_videos")
      .select("*")
      .eq("id", competitorVideoId)
      .single();

    if (!error && data) {
      return data as CompetitorVideo;
    }
  }

  return {
    id: competitorVideoId || 0,
    competitor_channel_id: null,
    group_id: null,

    youtube_video_id: "",
    video_url: null,

    title: cleanText(body.title),
    description: null,
    channel_title: cleanText(body.channel_name),
    published_at: null,

    thumbnail_url: null,
    thumbnail_default_url: null,
    thumbnail_medium_url: null,
    thumbnail_high_url: null,
    thumbnail_standard_url: null,
    thumbnail_maxres_url: null,

    duration: null,
    category_id: null,
    tags: null,

    view_count: Number(body.view_count || 0),
    like_count: 0,
    comment_count: 0,

    theme: cleanText(body.theme),
    idea_type: cleanText(body.idea_type),
    hook_type: cleanText(body.hook_type),
    title_formula: cleanText(body.title_formula),
    thumbnail_style: cleanText(body.thumbnail_style),
    ai_summary: null,

    performance_score: 0,
    raw_snippet: null,
    raw_statistics: null,
    raw_content_details: null,

    last_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: null,
  } as CompetitorVideo;
}

async function getKeywordPack(video: CompetitorVideo) {
  const [matchesResult, keywordsResult] = await Promise.all([
    video.id
      ? supabase
          .from("competitor_keyword_video_matches")
          .select("keyword_id, keyword, match_source, view_count, views_per_day")
          .eq("competitor_video_id", video.id)
          .order("views_per_day", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from("competitor_keywords")
      .select(
        "id, keyword, category, market_stage, trend_score, opportunity_score, breakout_score, growth_score, adoption_score, total_views, total_views_per_day, video_count, channel_count, discovery_reason, keyword_rank"
      )
      .order("keyword_rank", { ascending: true })
      .limit(120),
  ]);

  if (keywordsResult.error) {
    throw keywordsResult.error;
  }

  const allKeywords = (keywordsResult.data || []) as KeywordRow[];
  const videoMatches = (matchesResult.data || []) as KeywordMatchRow[];

  const videoKeywordNames = uniqueStrings(
    videoMatches.map((match) => match.keyword)
  ).slice(0, 8);

  const breakoutKeywords = pickTopKeywords(
    allKeywords,
    (keyword) =>
      keyword.market_stage === "Single-Channel Breakout" ||
      Number(keyword.breakout_score || 0) >= 75,
    8
  );

  const growthKeywords = pickTopKeywords(
    allKeywords,
    (keyword) =>
      keyword.market_stage === "Accelerating" ||
      Number(keyword.growth_score || 0) >= 65,
    8
  );

  const adoptionKeywords = pickTopKeywords(
    allKeywords,
    (keyword) =>
      keyword.market_stage === "Cross-Channel Adoption" ||
      Number(keyword.adoption_score || 0) >= 55,
    8
  );

  const contrastKeywords = pickTopKeywords(
    allKeywords,
    (keyword) =>
      String(keyword.category || "").includes("Contrast") ||
      keyword.keyword.toLowerCase().includes(" vs "),
    8
  );

  const transformationKeywords = pickTopKeywords(
    allKeywords,
    (keyword) =>
      String(keyword.category || "").includes("Transformation") ||
      keyword.keyword.toLowerCase().includes("makeover") ||
      keyword.keyword.toLowerCase().includes("transformation"),
    8
  );

  const fandomKeywords = pickTopKeywords(
    allKeywords,
    (keyword) =>
      String(keyword.category || "").includes("Fandom") ||
      keyword.keyword.toLowerCase().includes("kpop") ||
      keyword.keyword.toLowerCase().includes("huntrix") ||
      keyword.keyword.toLowerCase().includes("demon hunters"),
    8
  );

  const selectedKeywords = uniqueStrings([
    ...videoKeywordNames,
    ...breakoutKeywords.map((item) => item.keyword),
    ...growthKeywords.map((item) => item.keyword),
    ...adoptionKeywords.map((item) => item.keyword),
    ...contrastKeywords.map((item) => item.keyword),
    ...transformationKeywords.map((item) => item.keyword),
    ...fandomKeywords.map((item) => item.keyword),
  ]).slice(0, 15);

  return {
    videoKeywordNames,
    selectedKeywords,

    breakoutKeywords: breakoutKeywords.map(formatKeyword),
    growthKeywords: growthKeywords.map(formatKeyword),
    adoptionKeywords: adoptionKeywords.map(formatKeyword),
    contrastKeywords: contrastKeywords.map(formatKeyword),
    transformationKeywords: transformationKeywords.map(formatKeyword),
    fandomKeywords: fandomKeywords.map(formatKeyword),

    topKeywords: allKeywords.slice(0, 20).map(formatKeyword),
  };
}

function buildPrompt({
  video,
  channelName,
  groupName,
  keywordPack,
}: {
  video: CompetitorVideo;
  channelName: string;
  groupName: string;
  keywordPack: Awaited<ReturnType<typeof getKeywordPack>>;
}) {
  return `
You are StudioOS, a YouTube market research and creative strategy assistant.

Task:
Create ONE original remix idea from the competitor video and Keyword Radar signals.

Important:
- Do NOT copy the competitor title.
- Do NOT copy the competitor thumbnail.
- Do NOT copy characters, exact scenes, brand names, or channel names.
- Use Keyword Radar as market signal only.
- The new idea must combine 3 to 5 market phrases.
- Prefer phrase-level keywords like "Poor vs Rich", "Kpop Demon Hunters", "Huntrix", "Princess Makeover", "Secret Room Challenge".
- Avoid generic weak keywords like "story", "visual story", "baby doll" alone, "comedy", "movie", "recap".
- Make the idea more strategic than a simple title rewrite.

Competitor source:
Title: ${video.title}
Channel: ${channelName || video.channel_title || "-"}
Group: ${groupName || "-"}
Theme: ${video.theme || "-"}
Idea type: ${video.idea_type || "-"}
Hook type: ${video.hook_type || "-"}
Thumbnail style: ${video.thumbnail_style || "-"}
Views: ${Number(video.view_count || 0).toLocaleString("en-US")}

Keyword Radar selected phrases:
${keywordPack.selectedKeywords.map((item) => `- ${item}`).join("\n")}

Breakout keywords:
${keywordPack.breakoutKeywords
  .map(
    (item) =>
      `- ${item.keyword} | stage=${item.market_stage} | breakout=${item.breakout_score} | views/day=${item.views_per_day}`
  )
  .join("\n")}

Growth keywords:
${keywordPack.growthKeywords
  .map(
    (item) =>
      `- ${item.keyword} | growth=${item.growth_score} | reason=${item.discovery_reason}`
  )
  .join("\n")}

Adoption keywords:
${keywordPack.adoptionKeywords
  .map(
    (item) =>
      `- ${item.keyword} | adoption=${item.adoption_score} | channels=${item.channel_count}`
  )
  .join("\n")}

Return valid JSON only.
No markdown.
No explanation outside JSON.

JSON schema:
{
  "title": "new original YouTube title",
  "theme": "short theme",
  "language": "EN",
  "hook": "1-2 sentence hook",
  "thumbnail_prompt": "specific thumbnail prompt",
  "storyline": "structured storyline",
  "notes": "research notes",
  "score": 0-100,
  "source_keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "keyword_strategy": "how the keywords are fused",
  "market_angle": "why this angle can work now",
  "search_intent": "what audience/search intent this targets",
  "differentiation_note": "how to stay original and avoid copying"
}
`;
}

function normalizeIdea(value: Partial<RemixIdea>, fallback: RemixIdea) {
  return {
    title: cleanText(value.title) || fallback.title,
    theme: cleanText(value.theme) || fallback.theme,
    language: cleanText(value.language) || "EN",
    hook: cleanText(value.hook) || fallback.hook,
    thumbnail_prompt:
      cleanText(value.thumbnail_prompt) || fallback.thumbnail_prompt,
    storyline: cleanText(value.storyline) || fallback.storyline,
    notes: cleanText(value.notes) || fallback.notes,
    score: Math.max(0, Math.min(100, Number(value.score || fallback.score))),

    source_keywords:
      Array.isArray(value.source_keywords) &&
      value.source_keywords.length > 0
        ? uniqueStrings(value.source_keywords.map(String)).slice(0, 8)
        : fallback.source_keywords,

    keyword_strategy:
      cleanText(value.keyword_strategy) || fallback.keyword_strategy,
    market_angle: cleanText(value.market_angle) || fallback.market_angle,
    search_intent: cleanText(value.search_intent) || fallback.search_intent,
    differentiation_note:
      cleanText(value.differentiation_note) || fallback.differentiation_note,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const video = await getVideoFromBody(body);

    if (!video.title) {
      return NextResponse.json(
        {
          error: "Missing competitor video title.",
        },
        {
          status: 400,
        }
      );
    }

    const channelName = cleanText(body.channel_name) || video.channel_title || "";
    const groupName = cleanText(body.group_name);

    const keywordPack = await getKeywordPack(video);

    const fallbackIdea = getMockIdea({
      video,
      keywordPack,
    });

    const shouldUseMock =
      process.env.OPENAI_MOCK_MODE === "true" ||
      !process.env.OPENAI_API_KEY;

    if (shouldUseMock) {
      return NextResponse.json({
        idea: fallbackIdea,
        keywordPack,
        mode: "mock",
      });
    }

    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        messages: [
          {
            role: "system",
            content:
              "You generate original YouTube idea remixes from competitor research and keyword radar data. Always return valid JSON only.",
          },
          {
            role: "user",
            content: buildPrompt({
              video,
              channelName,
              groupName,
              keywordPack,
            }),
          },
        ],
      });

      const content = completion.choices[0]?.message?.content || "";
      const parsed = JSON.parse(extractJsonObject(content)) as Partial<RemixIdea>;

      const idea = normalizeIdea(parsed, fallbackIdea);

      return NextResponse.json({
        idea,
        keywordPack,
        mode: "ai",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown OpenAI remix error";

      return NextResponse.json({
        idea: fallbackIdea,
        keywordPack,
        mode: "fallback",
        warning: message,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown remix error";

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