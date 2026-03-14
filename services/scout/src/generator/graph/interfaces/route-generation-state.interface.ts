import type { IPlace, IRouteOptions } from "@framework/types";

import type { IWeightedPlace } from "./weighted-place.interface";
import type { ICluster } from "./cluster.interface";
import type { IRouteSeed } from "./route-seed.interface";
import type { IRouteStop } from "./route-stop.interface";
import type { IBuiltRoute } from "./built-route.interface";

// eslint-disable-next-line @typescript-eslint/naming-convention -- LangGraph state type
export interface RouteGenerationState {
  cityId: string;
  routeGenerationOptions: IRouteOptions;
  places: IPlace[];
  weightedPlaces: IWeightedPlace[];
  clusters: ICluster[];
  seeds: IRouteSeed[];
  currentSeed: IRouteSeed | null;
  candidatePlaces: IPlace[];
  scoredPlaces: IWeightedPlace[];
  orderedStops: IRouteStop[];
  trimmedStops: IRouteStop[];
  builtRoute: IBuiltRoute | null;
  savedRoutes: string[];
  error: string | null;
}
