import { PlaceCategory, RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import { computePlaceWeights, computeWeightsNode } from "./compute-weights.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { RouteGenerationState } from "../state";

const createPlace = (id: string, category: PlaceCategory, overrides?: Partial<IPlace>) =>
  ({
    id,
    category,
    rating: null,
    reviewCount: null,
    ...overrides,
  }) as unknown as IPlace;

describe("computePlaceWeights", () => {
  it("assigns base weight from category", () => {
    const places = [createPlace("p1", PlaceCategory.MUSEUM)];
    const result = computePlaceWeights(places);
    expect(result).toHaveLength(1);
    expect(result[0].place.id).toEqual("p1");
    expect(result[0].weight).toBeGreaterThanOrEqual(10);
  });

  it("uses default weight 5 for unknown category", () => {
    const places = [createPlace("p1", "unknown" as PlaceCategory)];
    const result = computePlaceWeights(places);
    expect(result[0].weight).toBeGreaterThanOrEqual(5);
  });

  it("adds rating bonus when rating present", () => {
    const withRating = createPlace("p1", PlaceCategory.PARK, { rating: 5 });
    const withoutRating = createPlace("p2", PlaceCategory.PARK);
    const result = computePlaceWeights([withRating, withoutRating]);
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });

  it("adds popularity bonus when reviewCount present", () => {
    const withReviews = createPlace("p1", PlaceCategory.PARK, { reviewCount: 100 });
    const withoutReviews = createPlace("p2", PlaceCategory.PARK);
    const result = computePlaceWeights([withReviews, withoutReviews]);
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });

  it("uses theme category weights when theme provided", () => {
    const mall = createPlace("m1", PlaceCategory.SHOPPING_MALL);
    const store = createPlace("s1", PlaceCategory.STORE);
    const withoutTheme = computePlaceWeights([mall, store]);
    const withShoppingTheme = computePlaceWeights([mall, store], RouteTheme.SHOPPING);

    expect(withShoppingTheme[0].weight).toBeGreaterThan(withShoppingTheme[1].weight);
    expect(withShoppingTheme[0].place.category).toEqual(PlaceCategory.SHOPPING_MALL);
    expect(withoutTheme[0].weight).not.toEqual(withShoppingTheme[0].weight);
  });
});

describe("computeWeightsNode", () => {
  it("returns weightedPlaces from state.places", async () => {
    const place = createPlace("p1", PlaceCategory.MUSEUM);
    const state: RouteGenerationState = {
      cityId: "city1",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [place],
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

    const result = await computeWeightsNode(state);

    expect(result.weightedPlaces).toBeDefined();
    expect(result.weightedPlaces).toHaveLength(1);
    expect(result.weightedPlaces![0].place.id).toEqual("p1");
    expect(result.weightedPlaces![0].weight).toBeDefined();
  });

  it("returns empty weightedPlaces when places is empty", async () => {
    const state: RouteGenerationState = {
      cityId: "city1",
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

    const result = await computeWeightsNode(state);

    expect(result.weightedPlaces).toEqual([]);
  });
});
