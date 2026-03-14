import { RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import { IRouteSeed, RouteGenerationState } from "../state";
import { CATEGORY_BASE_WEIGHT } from "./compute-weights.node";
import { THEME_CATEGORY_WEIGHTS } from "../../theme-flavor-weights";
import { THEME_CATEGORIES } from "../../theme-categories";

const getThemeWeight = (place: IPlace, theme: RouteTheme, globalWeight: number): number => {
  const themeBase = THEME_CATEGORY_WEIGHTS[theme]?.[place.category] ?? CATEGORY_BASE_WEIGHT[place.category] ?? 5;
  const globalBase = CATEGORY_BASE_WEIGHT[place.category] ?? 5;
  const delta = globalWeight - globalBase;
  return themeBase + delta;
};

const THEMES = [
  RouteTheme.HISTORY,
  RouteTheme.NATURE,
  RouteTheme.VIEWPOINTS,
  RouteTheme.SHOPPING,
  RouteTheme.HIGHLIGHTS,
  RouteTheme.EVENING,
];

export const generateSeedsNode = (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
  const seeds: IRouteSeed[] = [];
  const { minThemePlaces, routeModes, durationPresetsMinutes, seedsPerCluster } = state.routeGenerationOptions;

  for (const cluster of state.clusters) {
    for (const theme of THEMES) {
      const allowedCategories = THEME_CATEGORIES[theme] ?? [];
      const themePlaces = cluster.places.filter(p => allowedCategories.includes(p.category));

      if (themePlaces.length < minThemePlaces) {
        continue;
      }

      const sortedByWeight = [...themePlaces].sort((a, b) => {
        const aw = state.weightedPlaces.find(w => w.place.id === a.id)?.weight ?? 0;
        const bw = state.weightedPlaces.find(w => w.place.id === b.id)?.weight ?? 0;
        const aTheme = getThemeWeight(a, theme, aw);
        const bTheme = getThemeWeight(b, theme, bw);
        return bTheme - aTheme;
      });
      const startPlaces = sortedByWeight.slice(0, seedsPerCluster);

      for (const startPlace of startPlaces) {
        for (const routeMode of routeModes) {
          for (const durationBudgetMinutes of durationPresetsMinutes) {
            seeds.push({
              theme,
              routeMode,
              durationBudgetMinutes,
              startPlace,
              cluster,
            });
          }
        }
      }
    }
  }

  return Promise.resolve({ seeds });
};
