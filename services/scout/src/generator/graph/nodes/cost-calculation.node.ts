import { PriceLevel, RouteTheme } from "@framework/types";

import { ROUTE_MODE_SPEED_KMH } from "../../route-mode-constants";
import { haversineMeters } from "../utils/haversine";
import { IBuiltRoute, RouteGenerationState } from "../state";

const PRICE_SCORE: Record<PriceLevel, number> = {
  [PriceLevel.FREE]: 0,
  [PriceLevel.INEXPENSIVE]: 1,
  [PriceLevel.MODERATE]: 2,
  [PriceLevel.EXPENSIVE]: 3,
  [PriceLevel.VERY_EXPENSIVE]: 4,
};

const THEME_NAMES: Record<RouteTheme, string> = {
  history: "Historic Walk",
  nature: "Nature Walk",
  viewpoints: "Viewpoints Route",
  shopping: "Shopping Route",
  evening: "Evening Walk",
  highlights: "City Highlights",
};

export const makeCostCalculationNode = (coordCache: Map<string, { lat: number; lng: number }>) => {
  return (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.currentSeed || state.trimmedStops.length === 0) {
      return Promise.resolve({ builtRoute: null });
    }

    const { theme, routeMode, startPlace } = state.currentSeed;
    const stops = state.trimmedStops;
    const speedKmh = ROUTE_MODE_SPEED_KMH[routeMode];

    let totalDurationMinutes = 0;
    let totalDistanceMeters = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const place = stop.place;

      totalDurationMinutes += stop.visitDurationMinutes;

      if (i > 0) {
        const prev = stops[i - 1];
        const c1 = coordCache.get(prev.place.id) ?? { lat: 0, lng: 0 };
        const c2 = coordCache.get(place.id) ?? { lat: 0, lng: 0 };
        const dist = haversineMeters(c1.lat, c1.lng, c2.lat, c2.lng);
        totalDistanceMeters += dist;
        totalDurationMinutes += dist / 1000 / (speedKmh / 60);
      }
    }

    let priceLevel: PriceLevel;
    if (theme !== RouteTheme.SHOPPING) {
      // Only restaurants, cafes, stores return price; other themes use FREE
      priceLevel = PriceLevel.FREE;
    } else {
      let totalScore = 0;
      for (const stop of stops) {
        const pl = stop.place.priceLevel ?? PriceLevel.FREE;
        totalScore += PRICE_SCORE[pl];
      }
      const avgScore = totalScore / stops.length;
      if (avgScore < 0.3) priceLevel = PriceLevel.FREE;
      else if (avgScore < 1.2) priceLevel = PriceLevel.INEXPENSIVE;
      else if (avgScore < 2.2) priceLevel = PriceLevel.MODERATE;
      else if (avgScore < 3.2) priceLevel = PriceLevel.EXPENSIVE;
      else priceLevel = PriceLevel.VERY_EXPENSIVE;
    }

    const coords = stops
      .map(s => coordCache.get(s.place.id))
      .filter(Boolean)
      .map(c => `${c!.lng} ${c!.lat}`)
      .join(", ");

    const parts = coords.split(", ");
    const routeGeometryWkt =
      parts.length >= 2
        ? `LINESTRING(${coords})`
        : parts.length === 1
          ? `LINESTRING(${parts[0]}, ${parts[0]})`
          : "LINESTRING(0 0, 0.001 0.001)";

    const builtRoute: IBuiltRoute = {
      name: THEME_NAMES[theme],
      theme,
      routeMode,
      durationMinutes: Math.round(totalDurationMinutes),
      distanceKm: Math.round((totalDistanceMeters / 1000) * 100) / 100,
      priceLevel,
      startPlaceId: startPlace.id,
      routeGeometryWkt,
      stops: stops.map((s, i) => ({ ...s, orderIndex: i })),
    };

    return Promise.resolve({ builtRoute });
  };
};
