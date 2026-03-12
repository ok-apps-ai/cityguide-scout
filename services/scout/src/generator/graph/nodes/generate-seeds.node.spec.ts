import { generateSeedsNode } from "./generate-seeds.node";
import { PlaceCategory } from "../../../place/place.entity";
import { RouteTheme } from "../../../route/route.entity";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { ICluster, IWeightedPlace, RouteGenerationState } from "../state";

const createPlace = (id: string, category: PlaceCategory) =>
  ({ id, category }) as unknown as ICluster["places"][0];

const createCluster = (id: number, places: ICluster["places"], seedPlace: ICluster["places"][0]): ICluster => ({
  id,
  places,
  centroidLat: 0,
  centroidLng: 0,
  seedPlace,
});

describe("generateSeedsNode", () => {
  it("creates seeds only when cluster has >= minThemePlaces theme-matching places", async () => {
    const park1 = createPlace("p1", PlaceCategory.PARK);
    const park2 = createPlace("p2", PlaceCategory.PARK);
    const park3 = createPlace("p3", PlaceCategory.PARK);
    const cluster = createCluster(0, [park1, park2, park3], park1);

    const weightedPlaces: IWeightedPlace[] = [
      { place: park1, weight: 10 },
      { place: park2, weight: 8 },
      { place: park3, weight: 6 },
    ];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minThemePlaces: 3 },
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const result = await generateSeedsNode(state);

    const natureSeeds = result.seeds!.filter(s => s.theme === RouteTheme.NATURE);
    expect(natureSeeds.length).toBeGreaterThan(0);
    expect(natureSeeds[0].startPlace.category).toEqual(PlaceCategory.PARK);
  });

  it("skips seeds when cluster has fewer than minThemePlaces theme-matching places", async () => {
    const park1 = createPlace("p1", PlaceCategory.PARK);
    const park2 = createPlace("p2", PlaceCategory.PARK);
    const store1 = createPlace("s1", PlaceCategory.STORE);
    const cluster = createCluster(0, [park1, park2, store1], park1);

    const weightedPlaces: IWeightedPlace[] = [
      { place: park1, weight: 10 },
      { place: park2, weight: 8 },
      { place: store1, weight: 5 },
    ];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minThemePlaces: 3 },
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const result = await generateSeedsNode(state);

    const natureSeeds = result.seeds!.filter(s => s.theme === RouteTheme.NATURE);
    expect(natureSeeds).toHaveLength(0);

    const shoppingSeeds = result.seeds!.filter(s => s.theme === RouteTheme.SHOPPING);
    expect(shoppingSeeds).toHaveLength(0);
  });

  it("respects minThemePlaces from routeGenerationOptions when provided", async () => {
    const park1 = createPlace("p1", PlaceCategory.PARK);
    const park2 = createPlace("p2", PlaceCategory.PARK);
    const cluster = createCluster(0, [park1, park2], park1);

    const weightedPlaces: IWeightedPlace[] = [
      { place: park1, weight: 10 },
      { place: park2, weight: 8 },
    ];

    const stateWithMin2: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minThemePlaces: 2 },
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const resultMin2 = await generateSeedsNode(stateWithMin2);
    const natureSeedsMin2 = resultMin2.seeds!.filter(s => s.theme === RouteTheme.NATURE);
    expect(natureSeedsMin2.length).toBeGreaterThan(0);

    const stateWithMin3: RouteGenerationState = {
      ...stateWithMin2,
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minThemePlaces: 3 },
    };

    const resultMin3 = await generateSeedsNode(stateWithMin3);
    const natureSeedsMin3 = resultMin3.seeds!.filter(s => s.theme === RouteTheme.NATURE);
    expect(natureSeedsMin3).toHaveLength(0);
  });

  it("uses highest-weighted theme-matching place as startPlace", async () => {
    const park1 = createPlace("p1", PlaceCategory.PARK);
    const park2 = createPlace("p2", PlaceCategory.PARK);
    const park3 = createPlace("p3", PlaceCategory.PARK);
    const cluster = createCluster(0, [park1, park2, park3], park1);

    const weightedPlaces: IWeightedPlace[] = [
      { place: park1, weight: 5 },
      { place: park2, weight: 12 },
      { place: park3, weight: 8 },
    ];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const result = await generateSeedsNode(state);

    const natureSeed = result.seeds!.find(s => s.theme === RouteTheme.NATURE);
    expect(natureSeed).toBeDefined();
    expect(natureSeed!.startPlace.id).toEqual("p2");
  });

  it("produces no seeds when cluster has no theme-relevant places", async () => {
    const store1 = createPlace("s1", PlaceCategory.STORE);
    const store2 = createPlace("s2", PlaceCategory.STORE);
    const store3 = createPlace("s3", PlaceCategory.STORE);
    const cluster = createCluster(0, [store1, store2, store3], store1);

    const weightedPlaces: IWeightedPlace[] = [
      { place: store1, weight: 10 },
      { place: store2, weight: 8 },
      { place: store3, weight: 6 },
    ];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const result = await generateSeedsNode(state);

    const natureSeeds = result.seeds!.filter(s => s.theme === RouteTheme.NATURE);
    expect(natureSeeds).toHaveLength(0);

    const shoppingSeeds = result.seeds!.filter(s => s.theme === RouteTheme.SHOPPING);
    expect(shoppingSeeds.length).toBeGreaterThan(0);
  });

  it("prefers shopping mall over store for Shopping theme when store has higher global weight (theme flavor overrides)", async () => {
    const mall = createPlace("mall", PlaceCategory.SHOPPING_MALL);
    const store1 = createPlace("s1", PlaceCategory.STORE);
    const store2 = createPlace("s2", PlaceCategory.STORE);
    const cluster = createCluster(0, [mall, store1, store2], mall);

    const weightedPlaces: IWeightedPlace[] = [
      { place: mall, weight: 7 },
      { place: store1, weight: 8 },
      { place: store2, weight: 6 },
    ];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minThemePlaces: 3 },
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const result = await generateSeedsNode(state);

    const shoppingSeed = result.seeds!.find(s => s.theme === RouteTheme.SHOPPING);
    expect(shoppingSeed).toBeDefined();
    expect(shoppingSeed!.startPlace.id).toEqual("mall");
  });
});
