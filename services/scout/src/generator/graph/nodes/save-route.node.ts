import { EventEmitter2 } from "@nestjs/event-emitter";

import { RouteService } from "../../../route/route.service";
import { PLACE_ACCEPTED } from "../../../place/place.patterns";
import { RouteGenerationState } from "../state";

export const makeSaveRouteNode = (routeService: RouteService, eventEmitter: EventEmitter2) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.builtRoute) {
      return {};
    }

    const { name, theme, routeMode, durationMinutes, distanceKm, priceLevel, startPlaceId, routeGeometryWkt, stops } =
      state.builtRoute;
    const { minPoints, maxPoints, minDurationMinutes, maxDurationMinutes, minDistanceKm, maxDistanceKm } =
      state.routeGenerationOptions;

    const durationOk =
      (minDurationMinutes == null || durationMinutes >= minDurationMinutes) &&
      (maxDurationMinutes == null || durationMinutes <= maxDurationMinutes);
    const minDist = minDistanceKm[routeMode];
    const maxDist = maxDistanceKm[routeMode];
    const distanceOk = (minDist == null || distanceKm >= minDist) && (maxDist == null || distanceKm <= maxDist);

    if (stops.length < minPoints || stops.length > maxPoints || !durationOk || !distanceOk) {
      return {
        builtRoute: null,
        currentSeed: null,
        candidatePlaces: [],
        scoredPlaces: [],
        orderedStops: [],
        trimmedStops: [],
      };
    }

    const saved = await routeService.create({
      cityId: state.cityId,
      name,
      theme,
      routeMode,
      durationMinutes,
      distanceKm,
      priceLevel,
      startPlaceId,
      routeGeometryWkt,
      stops: stops.map(s => ({
        placeId: s.place.id,
        orderIndex: s.orderIndex,
        visitDurationMinutes: s.visitDurationMinutes,
      })),
    });

    const placeIds = [...new Set(stops.map(s => s.place.id))];
    eventEmitter.emit(PLACE_ACCEPTED, { placeIds });

    return {
      savedRoutes: [saved.id],
      builtRoute: null,
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
    };
  };
};
