import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";

import { PlaceOsmResolutionService } from "../../place/place-osm-resolution.service";
import { PlaceService } from "../../place/place.service";
import { RouteService } from "../../route/route.service";
import { IBuiltRoute, ICluster, IRouteSeed, IRouteStop, IWeightedPlace } from "./state";
import { PlaceEntity } from "../../place/place.entity";
import { RouteMode } from "../../route/route.entity";
import { makeLoadPoiNode } from "./nodes/load-poi.node";
import { makePopulateCoordCacheNode } from "./nodes/populate-coord-cache.node";
import { computeWeightsNode } from "./nodes/compute-weights.node";
import { makeSpatialClusteringNode } from "./nodes/spatial-clustering.node";
import { selectCentersNode } from "./nodes/select-centers.node";
import { generateSeedsNode } from "./nodes/generate-seeds.node";
import {
  makeCandidateGenerationNode,
  makeCandidateGenerationCyclingNode,
  makeCandidateGenerationDrivingNode,
} from "./nodes/candidate-generation.node";
import { makePoiScoringNode } from "./nodes/poi-scoring.node";
import { makeRouteOptimizationNode } from "./nodes/route-optimization.node";
import { makeDurationLimitingNode } from "./nodes/duration-limiting.node";
import { makeCostCalculationNode } from "./nodes/cost-calculation.node";
import { makeResolveOsmPlacesNode } from "./nodes/resolve-osm-places.node";
import { makeSaveRouteNode } from "./nodes/save-route.node";

export interface IGraphDeps {
  placeService: PlaceService;
  placeOsmResolutionService: PlaceOsmResolutionService;
  routeService: RouteService;
  dataSource: DataSource;
  openaiApiKey: string;
  eventEmitter: EventEmitter2;
}

const StateAnnotation = Annotation.Root({
  cityId: Annotation<string>,
  routeGenerationOptions: Annotation<import("../generator.options").IRouteOptions>(),
  places: Annotation<PlaceEntity[]>,
  weightedPlaces: Annotation<IWeightedPlace[]>,
  clusters: Annotation<ICluster[]>,
  seeds: Annotation<IRouteSeed[]>,
  currentSeed: Annotation<IRouteSeed | null>,
  candidatePlaces: Annotation<PlaceEntity[]>,
  scoredPlaces: Annotation<IWeightedPlace[]>,
  orderedStops: Annotation<IRouteStop[]>,
  trimmedStops: Annotation<IRouteStop[]>,
  builtRoute: Annotation<IBuiltRoute | null>,
  savedRoutes: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  error: Annotation<string | null>,
});

type GraphState = typeof StateAnnotation.State;

const pickNextSeedNode = (state: GraphState): Promise<Partial<GraphState>> => {
  if (state.seeds.length === 0) {
    return Promise.resolve({ currentSeed: null });
  }

  const [next, ...remaining] = state.seeds;
  return Promise.resolve({ currentSeed: next, seeds: remaining });
};

const shouldContinue = (state: GraphState): "pickNextSeed" | typeof END => {
  return state.seeds.length > 0 ? "pickNextSeed" : END;
};

type CandidateNode = "candidateGeneration" | "candidateGenerationCycling" | "candidateGenerationDriving";

const routeModeBranch = (state: GraphState): CandidateNode => {
  const mode = state.currentSeed?.routeMode;
  if (mode === RouteMode.DRIVING) return "candidateGenerationDriving";
  if (mode === RouteMode.BICYCLING) return "candidateGenerationCycling";
  return "candidateGeneration";
};

export const buildRouteGraph = (deps: IGraphDeps) => {
  const { placeService, placeOsmResolutionService, routeService, dataSource, openaiApiKey, eventEmitter } = deps;

  const coordCache = new Map<string, { lat: number; lng: number }>();

  const graph = new StateGraph(StateAnnotation)
    .addNode("loadPoi", makeLoadPoiNode(placeService))
    .addNode("populateCoordCache", makePopulateCoordCacheNode(dataSource, coordCache))
    .addNode("computeWeights", computeWeightsNode)
    .addNode("spatialClustering", makeSpatialClusteringNode(dataSource))
    .addNode("selectCenters", selectCentersNode)
    .addNode("generateSeeds", generateSeedsNode)
    .addNode("pickNextSeed", pickNextSeedNode)
    .addNode("candidateGeneration", makeCandidateGenerationNode(dataSource))
    .addNode("candidateGenerationCycling", makeCandidateGenerationCyclingNode(dataSource))
    .addNode("candidateGenerationDriving", makeCandidateGenerationDrivingNode(dataSource))
    .addNode("poiScoring", makePoiScoringNode(openaiApiKey))
    .addNode("routeOptimization", makeRouteOptimizationNode(coordCache))
    .addNode("durationLimiting", makeDurationLimitingNode(coordCache))
    .addNode("costCalculation", makeCostCalculationNode(coordCache))
    .addNode("resolveOsmPlaces", makeResolveOsmPlacesNode(placeOsmResolutionService))
    .addNode("saveRoute", makeSaveRouteNode(routeService, eventEmitter))
    .addEdge(START, "loadPoi")
    .addEdge("loadPoi", "populateCoordCache")
    .addEdge("populateCoordCache", "computeWeights")
    .addEdge("computeWeights", "spatialClustering")
    .addEdge("spatialClustering", "selectCenters")
    .addEdge("selectCenters", "generateSeeds")
    .addEdge("generateSeeds", "pickNextSeed")
    .addConditionalEdges("pickNextSeed", routeModeBranch, {
      candidateGeneration: "candidateGeneration",
      candidateGenerationCycling: "candidateGenerationCycling",
      candidateGenerationDriving: "candidateGenerationDriving",
    })
    .addEdge("candidateGeneration", "poiScoring")
    .addEdge("candidateGenerationCycling", "poiScoring")
    .addEdge("candidateGenerationDriving", "poiScoring")
    .addEdge("poiScoring", "routeOptimization")
    .addEdge("routeOptimization", "durationLimiting")
    .addEdge("durationLimiting", "costCalculation")
    .addEdge("costCalculation", "resolveOsmPlaces")
    .addEdge("resolveOsmPlaces", "saveRoute")
    .addConditionalEdges("saveRoute", shouldContinue, {
      pickNextSeed: "pickNextSeed",
      [END]: END,
    });

  return graph.compile();
};
