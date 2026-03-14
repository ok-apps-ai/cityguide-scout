import { ROUTE_MODE_SPEED_KMH } from "../../route-mode-constants";
import { haversineMeters } from "../utils/haversine";
import { IRouteStop, RouteGenerationState } from "../state";

export const makeDurationLimitingNode = (coordCache: Map<string, { lat: number; lng: number }>) => {
  return (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.currentSeed) {
      return Promise.resolve({ trimmedStops: [] });
    }

    const { durationBudgetMinutes, routeMode } = state.currentSeed;
    const speedKmh = ROUTE_MODE_SPEED_KMH[routeMode];
    const { minPoints } = state.routeGenerationOptions;
    let elapsed = 0;
    const trimmed: IRouteStop[] = [];

    for (let i = 0; i < state.orderedStops.length; i++) {
      const stop = state.orderedStops[i];
      let travelMin = 0;

      if (i > 0) {
        const prev = state.orderedStops[i - 1];
        const c1 = coordCache.get(prev.place.id) ?? { lat: 0, lng: 0 };
        const c2 = coordCache.get(stop.place.id) ?? { lat: 0, lng: 0 };
        const dist = haversineMeters(c1.lat, c1.lng, c2.lat, c2.lng);
        travelMin = dist / 1000 / (speedKmh / 60);
      }

      const add = travelMin + stop.visitDurationMinutes;
      if (elapsed + add > durationBudgetMinutes && trimmed.length >= minPoints) break;
      elapsed += add;
      trimmed.push(stop);
    }

    return Promise.resolve({ trimmedStops: trimmed });
  };
};
