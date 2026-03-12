import type { PlaceEntity } from "../../../place/place.entity";
import type { IRouteOptions } from "../../dto";
import type { IWeightedPlace } from "./weighted-place.interface";
import type { ICluster } from "./cluster.interface";
import type { IRouteSeed } from "./route-seed.interface";
import type { IRouteStop } from "./route-stop.interface";
import type { IBuiltRoute } from "./built-route.interface";

// eslint-disable-next-line @typescript-eslint/naming-convention -- LangGraph state type
export interface RouteGenerationState {
  cityId: string;
  routeGenerationOptions: IRouteOptions;
  places: PlaceEntity[];
  weightedPlaces: IWeightedPlace[];
  clusters: ICluster[];
  seeds: IRouteSeed[];
  currentSeed: IRouteSeed | null;
  candidatePlaces: PlaceEntity[];
  scoredPlaces: IWeightedPlace[];
  orderedStops: IRouteStop[];
  trimmedStops: IRouteStop[];
  builtRoute: IBuiltRoute | null;
  savedRoutes: string[];
  error: string | null;
}
