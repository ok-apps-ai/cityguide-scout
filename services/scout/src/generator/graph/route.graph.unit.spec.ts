import { END } from "@langchain/langgraph";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";

import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import {
  buildRouteGraph,
  pickNextSeedNode,
  routeModeBranchNode,
  savedRoutesReducer,
  shouldContinueBranch,
} from "./route.graph";
import { PlaceService } from "../../place/place.service";
import { PlaceOsmResolutionService } from "../../place/place-osm-resolution.service";
import { RouteService } from "../../route/route.service";
import type { ICluster, IRouteSeed } from "./state";

const createPlace = (id: string): IPlace => ({ id, category: PlaceCategory.PARK, name: "Test" }) as unknown as IPlace;

const createCluster = (id: number, places: IPlace[]): ICluster => ({
  id,
  places,
  centroidLat: 0,
  centroidLng: 0,
  seedPlace: places[0],
});

const createSeed = (overrides: Partial<IRouteSeed> = {}): IRouteSeed => ({
  theme: RouteTheme.HIGHLIGHTS,
  routeMode: RouteMode.WALKING,
  durationBudgetMinutes: 60,
  startPlace: createPlace("p1"),
  cluster: createCluster(1, [createPlace("p1")]),
  ...overrides,
});

describe("buildRouteGraph", () => {
  it("compiles and returns a graph with invoke method", () => {
    const deps = {
      placeService: {} as PlaceService,
      placeOsmResolutionService: {} as PlaceOsmResolutionService,
      routeService: {} as RouteService,
      dataSource: {} as DataSource,
      openaiApiKey: "test-key",
      eventEmitter: {} as EventEmitter2,
    };

    const graph = buildRouteGraph(deps);

    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toEqual("function");
  });
});

describe("pickNextSeedNode", () => {
  it("picks first seed and returns remaining", async () => {
    const seed1 = createSeed();
    const seed2 = createSeed({ theme: RouteTheme.NATURE });
    const state = { seeds: [seed1, seed2] };

    const result = await pickNextSeedNode(state as never);

    expect(result.currentSeed).toEqual(seed1);
    expect(result.seeds).toHaveLength(1);
    expect(result.seeds![0]).toEqual(seed2);
  });

  it("returns null currentSeed when seeds empty", async () => {
    const state = { seeds: [] };

    const result = await pickNextSeedNode(state as never);

    expect(result.currentSeed).toBeNull();
    expect(result.seeds).toEqual([]);
  });
});

describe("shouldContinueBranch", () => {
  it("returns pickNextSeed when seeds remain", () => {
    const state = { seeds: [createSeed()] };

    const result = shouldContinueBranch(state as never);

    expect(result).toEqual("pickNextSeed");
  });

  it("returns END when no seeds remain", () => {
    const state = { seeds: [] };

    const result = shouldContinueBranch(state as never);

    expect(result).toEqual(END);
  });
});

describe("routeModeBranchNode", () => {
  it("returns candidateGeneration for WALKING", () => {
    const state = { currentSeed: createSeed({ routeMode: RouteMode.WALKING }) };

    expect(routeModeBranchNode(state as never)).toEqual("candidateGeneration");
  });

  it("returns candidateGenerationCycling for BICYCLING", () => {
    const state = { currentSeed: createSeed({ routeMode: RouteMode.BICYCLING }) };

    expect(routeModeBranchNode(state as never)).toEqual("candidateGenerationCycling");
  });

  it("returns candidateGenerationDriving for DRIVING", () => {
    const state = { currentSeed: createSeed({ routeMode: RouteMode.DRIVING }) };

    expect(routeModeBranchNode(state as never)).toEqual("candidateGenerationDriving");
  });

  it("returns candidateGeneration when currentSeed routeMode undefined", () => {
    const state = { currentSeed: null };

    expect(routeModeBranchNode(state as never)).toEqual("candidateGeneration");
  });
});

describe("savedRoutesReducer", () => {
  it("merges saved route ids", () => {
    const result = savedRoutesReducer(["id1"], ["id2"]);

    expect(result).toEqual(["id1", "id2"]);
  });

  it("handles empty arrays", () => {
    expect(savedRoutesReducer([], ["id1"])).toEqual(["id1"]);
    expect(savedRoutesReducer(["id1"], [])).toEqual(["id1"]);
  });
});
