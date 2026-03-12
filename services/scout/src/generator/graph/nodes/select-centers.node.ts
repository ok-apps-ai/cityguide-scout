import { ICluster, RouteGenerationState } from "../state";

export const selectCentersNode = (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
  const sorted = [...state.clusters].sort((a, b) => {
    const aWeight = a.places.reduce((sum, p) => {
      return sum + (state.weightedPlaces.find(w => w.place.id === p.id)?.weight ?? 0);
    }, 0);
    const bWeight = b.places.reduce((sum, p) => {
      return sum + (state.weightedPlaces.find(w => w.place.id === p.id)?.weight ?? 0);
    }, 0);
    return bWeight - aWeight;
  });

  const { maxClusters } = state.routeGenerationOptions;
  const topClusters: ICluster[] = sorted.slice(0, maxClusters);

  return Promise.resolve({ clusters: topClusters });
};
