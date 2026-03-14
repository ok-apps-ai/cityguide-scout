import { PlaceCategory, RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import { makeLoadPoiNode } from "./load-poi.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { RouteGenerationState } from "../state";

const createPlace = (id: string): IPlace =>
  ({
    id,
    category: PlaceCategory.PARK,
    name: "Test Place",
  }) as unknown as IPlace;

describe("makeLoadPoiNode", () => {
  it("calls placeService.findByCityId and returns places", async () => {
    const places = [createPlace("p1"), createPlace("p2")];
    const findByCityId = jest.fn().mockResolvedValue(places);
    const placeService = { findByCityId } as unknown as Parameters<typeof makeLoadPoiNode>[0];

    const state: RouteGenerationState = {
      cityId: "city-123",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeLoadPoiNode(placeService);
    const result = await node(state);

    expect(findByCityId).toHaveBeenCalledTimes(1);
    expect(findByCityId).toHaveBeenCalledWith("city-123");
    expect(result.places).toEqual(places);
    expect(result.places).toHaveLength(2);
  });

  it("returns empty places when service returns empty array", async () => {
    const findByCityId = jest.fn().mockResolvedValue([]);
    const placeService = { findByCityId } as unknown as Parameters<typeof makeLoadPoiNode>[0];

    const state: RouteGenerationState = {
      cityId: "city-456",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeLoadPoiNode(placeService);
    const result = await node(state);

    expect(result.places).toEqual([]);
  });
});
