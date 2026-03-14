import type { IPlace } from "@framework/types";

import { ROUTE_MODE_SPEED_KMH } from "../../route-mode-constants";
import { haversineMeters } from "../utils/haversine";
import { IRouteStop, RouteGenerationState } from "../state";
// import { PLACE_VISIT_DURATION } from "../../../place/place.constants";

interface ICoord {
  lat: number;
  lng: number;
}

const getCoord = (place: IPlace, coordCache: Map<string, ICoord>): ICoord => {
  return coordCache.get(place.id) ?? { lat: 0, lng: 0 };
};

export const makeRouteOptimizationNode = (coordCache: Map<string, ICoord>) => {
  return (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.currentSeed || state.scoredPlaces.length === 0) {
      return Promise.resolve({ orderedStops: [] });
    }

    const { startPlace, durationBudgetMinutes, routeMode } = state.currentSeed;
    const { maxPoints } = state.routeGenerationOptions;
    const speedKmh = ROUTE_MODE_SPEED_KMH[routeMode];

    const top = state.scoredPlaces
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxPoints)
      .map(w => w.place);

    const startCoord = getCoord(startPlace, coordCache);

    // Find nearest-to-start; reserve it for the end so user finishes close to start
    let nearestToStart: IPlace | null = null;
    let nearestDist = Infinity;
    for (const p of top) {
      if (p.id === startPlace.id) continue;
      const coord = getCoord(p, coordCache);
      const d = haversineMeters(startCoord.lat, startCoord.lng, coord.lat, coord.lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestToStart = p;
      }
    }

    const visited = new Set<string>();
    const ordered: IPlace[] = [startPlace];
    visited.add(startPlace.id);
    if (nearestToStart) visited.add(nearestToStart.id);

    let current = startPlace;
    let elapsedMinutes = 0;
    const visitDuration = (): number => 0;

    elapsedMinutes += visitDuration();

    const middleCandidates = nearestToStart ? top.filter(p => p.id !== nearestToStart.id) : top;

    while (ordered.length < middleCandidates.length && elapsedMinutes < durationBudgetMinutes) {
      const currentCoord = getCoord(current, coordCache);

      let bestPlace: IPlace | null = null;
      let bestDist = Infinity;

      const nearestCoord = nearestToStart ? getCoord(nearestToStart, coordCache) : null;

      for (const candidate of middleCandidates) {
        if (visited.has(candidate.id)) continue;
        const coord = getCoord(candidate, coordCache);
        const dist = haversineMeters(currentCoord.lat, currentCoord.lng, coord.lat, coord.lng);
        const travelMin = dist / 1000 / (speedKmh / 60);
        const travelBackMin =
          nearestCoord && nearestToStart
            ? haversineMeters(coord.lat, coord.lng, nearestCoord.lat, nearestCoord.lng) / 1000 / (speedKmh / 60)
            : 0;
        const totalAdd = travelMin + visitDuration() + travelBackMin;

        if (elapsedMinutes + totalAdd > durationBudgetMinutes) continue;
        if (dist < bestDist) {
          bestDist = dist;
          bestPlace = candidate;
        }
      }

      if (!bestPlace) break;

      const coord = getCoord(bestPlace, coordCache);
      const dist = haversineMeters(
        getCoord(current, coordCache).lat,
        getCoord(current, coordCache).lng,
        coord.lat,
        coord.lng,
      );
      elapsedMinutes += dist / 1000 / (speedKmh / 60) + visitDuration();

      ordered.push(bestPlace);
      visited.add(bestPlace.id);
      current = bestPlace;
    }

    if (nearestToStart) {
      ordered.push(nearestToStart);
    }

    const orderedStops: IRouteStop[] = ordered.map((place, i) => ({
      place,
      orderIndex: i,
      visitDurationMinutes: visitDuration(),
    }));

    return Promise.resolve({ orderedStops });
  };
};
