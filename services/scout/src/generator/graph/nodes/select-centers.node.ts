import { ICluster, IWeightedPlace, RouteGenerationState } from "../state";

export const selectTopClusters = (
  clusters: ICluster[],
  weightedPlaces: IWeightedPlace[],
  maxClusters: number,
): ICluster[] => {
  const sorted = [...clusters].sort((a, b) => {
    const aWeight = a.places.reduce((sum, p) => sum + (weightedPlaces.find(w => w.place.id === p.id)?.weight ?? 0), 0);
    const bWeight = b.places.reduce((sum, p) => sum + (weightedPlaces.find(w => w.place.id === p.id)?.weight ?? 0), 0);
    return bWeight - aWeight;
  });
  return sorted.slice(0, maxClusters);
};

export const selectCentersNode = (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
  const topClusters = selectTopClusters(state.clusters, state.weightedPlaces, state.routeGenerationOptions.maxClusters);
  return Promise.resolve({ clusters: topClusters });
};
