import { PlaceSource } from "@framework/types";

import { PlaceOsmResolutionService } from "../../../place/osm-resolution/place-osm-resolution.service";
import { IBuiltRoute, IRouteStop, RouteGenerationState } from "../state";

export const makeResolveOsmPlacesNode = (placeOsmResolutionService: PlaceOsmResolutionService) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.builtRoute) {
      return {};
    }

    const { builtRoute, routeGenerationOptions } = state;
    const { minPoints } = routeGenerationOptions;
    const { stops } = builtRoute;

    const resolvedStops: IRouteStop[] = [];
    for (const stop of stops) {
      const place = stop.place;
      if (place.source !== PlaceSource.OSM) {
        resolvedStops.push(stop);
        continue;
      }

      const resolved = await placeOsmResolutionService.resolveOsmPlaceToGoogle(place);
      if (!resolved) {
        continue;
      }

      resolvedStops.push({
        ...stop,
        place: resolved,
      });
    }

    if (resolvedStops.length < minPoints) {
      return {
        builtRoute: null,
        currentSeed: null,
        candidatePlaces: [],
        scoredPlaces: [],
        orderedStops: [],
        trimmedStops: [],
      };
    }

    const updatedBuiltRoute: IBuiltRoute = {
      ...builtRoute,
      stops: resolvedStops.map((s, i) => ({ ...s, orderIndex: i })),
    };

    return { builtRoute: updatedBuiltRoute };
  };
};
