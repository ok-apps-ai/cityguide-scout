import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { THEME_CATEGORY_WEIGHTS } from "../../theme-flavor-weights";
import { IWeightedPlace, RouteGenerationState } from "../state";

const THEME_CATEGORIES: Record<string, string[]> = {
  history: ["monument", "church", "museum", "square", "attraction"],
  nature: ["park", "waterfront", "bridge"],
  viewpoints: ["viewpoint", "bridge", "waterfront"],
  shopping: ["street", "square"],
  evening: ["square", "waterfront", "viewpoint", "street"],
  highlights: ["museum", "viewpoint", "monument", "attraction", "square"],
};

const rankingsSchema = z.object({
  rankings: z.array(
    z.object({
      index: z.number().describe("1-based index of the place"),
      bonus: z.number().min(0).max(5).describe("Bonus score 0-5 based on theme fit"),
    }),
  ),
});

export const makePoiScoringNode = (openaiApiKey: string) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.currentSeed || state.candidatePlaces.length === 0) {
      return { scoredPlaces: [] };
    }

    const { theme } = state.currentSeed;
    const themeCategories = THEME_CATEGORIES[theme] ?? [];

    const baseScored: IWeightedPlace[] = state.candidatePlaces.map(place => {
      const themeBase = THEME_CATEGORY_WEIGHTS[theme]?.[place.category];
      const globalWeight = state.weightedPlaces.find(w => w.place.id === place.id)?.weight ?? 1;
      const base = themeBase ?? globalWeight;
      const themeBonus = themeCategories.includes(place.category) ? 5 : 0;
      return { place, weight: base + themeBonus };
    });

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

      // @ts-expect-error — LangChain withStructuredOutput type instantiation is excessively deep
      const structured = model.withStructuredOutput(rankingsSchema);

      const placeList = top20
        .map((w, i) => `${i + 1}. ${w.place.name} (${w.place.category}, rating: ${w.place.rating ?? "n/a"})`)
        .join("\n");

      const result = await structured.invoke(
        `You are a tourist route expert. Given the theme "${theme}", score each place with a bonus (0-5) based on how well it fits the theme and tourist value.\n\nPlaces:\n${placeList}`,
      );

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
