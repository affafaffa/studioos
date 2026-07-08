import type { Idea } from "@/types/idea";

export type DuplicateResult = {
  idea: Idea | null;
  score: number;
  percentage: number;
  isDuplicate: boolean;
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(text: string) {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 1);
}

function getBigrams(words: string[]) {
  const bigrams: string[] = [];

  for (let index = 0; index < words.length - 1; index++) {
    bigrams.push(`${words[index]} ${words[index + 1]}`);
  }

  return bigrams;
}

function jaccardSimilarity(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = new Set(
    [...setA].filter((item) => setB.has(item))
  );

  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

export function calculateTitleSimilarity(
  titleA: string,
  titleB: string
) {
  const wordsA = getWords(titleA);
  const wordsB = getWords(titleB);

  const wordScore = jaccardSimilarity(wordsA, wordsB);

  const bigramsA = getBigrams(wordsA);
  const bigramsB = getBigrams(wordsB);

  const bigramScore = jaccardSimilarity(bigramsA, bigramsB);

  return wordScore * 0.65 + bigramScore * 0.35;
}

export function findMostSimilarIdea(
  title: string,
  ideas: Idea[]
): DuplicateResult {
  if (!title.trim() || ideas.length === 0) {
    return {
      idea: null,
      score: 0,
      percentage: 0,
      isDuplicate: false,
    };
  }

  let bestIdea: Idea | null = null;
  let bestScore = 0;

  for (const idea of ideas) {
    const score = calculateTitleSimilarity(title, idea.title);

    if (score > bestScore) {
      bestScore = score;
      bestIdea = idea;
    }
  }

  const percentage = Math.round(bestScore * 100);

  return {
    idea: bestIdea,
    score: bestScore,
    percentage,
    isDuplicate: percentage >= 65,
  };
}