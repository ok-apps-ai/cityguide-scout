import { ROUTE_MODE_SPEED_KMH } from "../../route-mode-constants";
import { IRouteStop, RouteGenerationState } from "../state";
import { PlaceEntity } from "../../../place/place.entity";
// import { PLACE_VISIT_DURATION } from "../../../place/place.constants";

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface ICoord {
  lat: number;
  lng: number;
}

const getCoord = (place: PlaceEntity, coordCache: Map<string, ICoord>): ICoord => {
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

    const visited = new Set<string>();
    const ordered: PlaceEntity[] = [startPlace];
    visited.add(startPlace.id);

    let current = startPlace;
    let elapsedMinutes = 0;
    // Time: only walking distance; no default visit times per place
    // const visitDuration = (p: PlaceEntity) => p.visitDurationMinutes ?? PLACE_VISIT_DURATION[p.category] ?? 15;
    const visitDuration = (): number => 0;

    elapsedMinutes += visitDuration();

    while (ordered.length < top.length && elapsedMinutes < durationBudgetMinutes) {
      const currentCoord = getCoord(current, coordCache);

      let bestPlace: PlaceEntity | null = null;
      let bestDist = Infinity;

      for (const candidate of top) {
        if (visited.has(candidate.id)) continue;
        const coord = getCoord(candidate, coordCache);
        const dist = haversineMeters(currentCoord.lat, currentCoord.lng, coord.lat, coord.lng);
        const travelMin = (dist / 1000) / (speedKmh / 60);
        const totalAdd = travelMin + visitDuration();

        if (elapsedMinutes + totalAdd > durationBudgetMinutes) continue;
        if (dist < bestDist) {
          bestDist = dist;
          bestPlace = candidate;
        }
      }

      if (!bestPlace) break;

      const coord = getCoord(bestPlace, coordCache);
      const startCoord = getCoord(current, coordCache);
      const dist = haversineMeters(startCoord.lat, startCoord.lng, coord.lat, coord.lng);
      elapsedMinutes += (dist / 1000) / (speedKmh / 60) + visitDuration();

      ordered.push(bestPlace);
      visited.add(bestPlace.id);
      current = bestPlace;
    }

    const orderedStops: IRouteStop[] = ordered.map((place, i) => ({
      place,
      orderIndex: i,
      visitDurationMinutes: visitDuration(),
    }));

    return Promise.resolve({ orderedStops });
  };
};
