import { IRouteSeed, RouteGenerationState } from "../state";
import { THEME_CATEGORIES } from "../../theme-categories";

export const generateSeedsNode = (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
  const seeds: IRouteSeed[] = [];
  const { theme } = state;
  const { minThemePlaces, routeMode, durationPresetsMinutes, seedsPerCluster } = state.routeGenerationOptions;
  const allowedCategories = THEME_CATEGORIES[theme] ?? [];

  for (const cluster of state.clusters) {
    const themePlaces = cluster.places.filter(p => allowedCategories.includes(p.category));

    if (themePlaces.length < minThemePlaces) {
      continue;
    }

    const sortedByWeight = [...themePlaces].sort((a, b) => {
      const aw = state.weightedPlaces.find(w => w.place.id === a.id)?.weight ?? 0;
      const bw = state.weightedPlaces.find(w => w.place.id === b.id)?.weight ?? 0;
      return bw - aw;
    });
    const startPlaces = sortedByWeight.slice(0, seedsPerCluster);

    for (const startPlace of startPlaces) {
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

  return Promise.resolve({ seeds });
};
