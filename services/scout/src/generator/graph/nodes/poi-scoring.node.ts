import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import { THEME_CATEGORIES } from "../../theme-categories";
import { THEME_CATEGORY_WEIGHTS } from "../../theme-flavor-weights";
import { IWeightedPlace, RouteGenerationState } from "../state";

export const computeBaseScoredPlaces = (
  candidatePlaces: IPlace[],
  weightedPlaces: IWeightedPlace[],
  theme: RouteTheme,
): IWeightedPlace[] => {
  const themeCategories = THEME_CATEGORIES[theme] ?? [];
  return candidatePlaces.map(place => {
    const themeBase = THEME_CATEGORY_WEIGHTS[theme]?.[place.category];
    const globalWeight = weightedPlaces.find(w => w.place.id === place.id)?.weight ?? 1;
    const base = themeBase ?? globalWeight;
    const themeBonus = themeCategories.includes(place.category) ? 5 : 0;
    return { place, weight: base + themeBonus };
  });
};

const rankingsSchema = z.object({
  rankings: z.array(
    z.object({
      index: z.number().describe("1-based index of the place"),
      bonus: z.number().min(0).max(5).describe("Bonus score 0-5 based on theme fit"),
    }),
  ),
});

/** Escapes pipe and newline so table structure is preserved. */
function escapeTableCell(value: string): string {
  return value.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

function buildPlacesTable(top20: IWeightedPlace[]): string {
  const header = "| Index | Name | Category | Rating | Review count | Description |";
  const separator = "|-------|------|----------|--------|---------------|-------------|";
  const rows = top20.map((w, i) => {
    const name = escapeTableCell(w.place.name);
    const category = String(w.place.category);
    const rating = w.place.rating != null ? String(w.place.rating) : "—";
    const reviewCount = w.place.reviewCount != null ? String(w.place.reviewCount) : "—";
    const description = w.place.description ? escapeTableCell(w.place.description) : "—";
    return `| ${i + 1} | ${name} | ${category} | ${rating} | ${reviewCount} | ${description} |`;
  });
  return [header, separator, ...rows].join("\n");
}

export const makePoiScoringNode = (openaiApiKey: string) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.currentSeed || state.candidatePlaces.length === 0) {
      return { scoredPlaces: [] };
    }

    const { theme } = state.currentSeed;
    const baseScored = computeBaseScoredPlaces(state.candidatePlaces, state.weightedPlaces, theme);

    const top20 = [...baseScored].sort((a, b) => b.weight - a.weight).slice(0, 20);

    if (!openaiApiKey || top20.length === 0) {
      return { scoredPlaces: baseScored };
    }

    try {
      const model = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        model: "gpt-4o-mini",
        temperature: 0,
      });

      const structured = model.withStructuredOutput(rankingsSchema);

      const placesTable = buildPlacesTable(top20);

      const prompt = `## Role
You are a tourist route expert.

## Context
Location: ${state.location}
Theme: ${theme}
Places to score:
${placesTable}

## Task
Score each place with a bonus (0-5) based on how well it fits the theme and tourist value. Use the description when available to assess relevance.

## Desired result
Return rankings with index and bonus for each place.`;

      const result = await structured.invoke(prompt);

      const bonusMap = new Map<number, number>(
        result.rankings.map((r: { index: number; bonus: number }) => [r.index - 1, r.bonus]),
      );

      const aiScored: IWeightedPlace[] = top20.map((w, i) => ({
        place: w.place,
        weight: w.weight + (bonusMap.get(i) ?? 0),
      }));

      const aiScoredIds = new Set(aiScored.map(w => w.place.id));
      const rest = baseScored.filter(w => !aiScoredIds.has(w.place.id));

      return { scoredPlaces: [...aiScored, ...rest] };
    } catch {
      return { scoredPlaces: baseScored };
    }
  };
};
