import { Annotation, BaseCheckpointSaver, END, START, StateGraph } from "@langchain/langgraph";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";

import type { IPlace, IRouteOptions, RouteTheme } from "@framework/types";

import { PlaceOsmResolutionService } from "../../place/place-osm-resolution.service";
import { PlaceService } from "../../place/place.service";
import { RouteService } from "../../route/route.service";
import { IBuiltRoute, ICluster, IRouteSeed, IRouteStop, IWeightedPlace } from "./state";
import { makeLoadPoiNode } from "./nodes/load-poi.node";
import { makePopulateCoordCacheNode } from "./nodes/populate-coord-cache.node";
import { pickNextSeed, routeModeBranch, shouldContinue } from "./nodes/pick-next-seed.node";
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

export interface IGraphCompileOptions {
  checkpointer?: BaseCheckpointSaver;
}

export const savedRoutesReducer = (a: string[], b: string[]): string[] => [...a, ...b];

const StateAnnotation = Annotation.Root({
  cityId: Annotation<string>,
  theme: Annotation<RouteTheme>(),
  routeGenerationOptions: Annotation<IRouteOptions>(),
  places: Annotation<IPlace[]>,
  weightedPlaces: Annotation<IWeightedPlace[]>,
  clusters: Annotation<ICluster[]>,
  seeds: Annotation<IRouteSeed[]>,
  currentSeed: Annotation<IRouteSeed | null>,
  candidatePlaces: Annotation<IPlace[]>,
  scoredPlaces: Annotation<IWeightedPlace[]>,
  orderedStops: Annotation<IRouteStop[]>,
  trimmedStops: Annotation<IRouteStop[]>,
  builtRoute: Annotation<IBuiltRoute | null>,
  savedRoutes: Annotation<string[]>({
    reducer: savedRoutesReducer,
    default: () => [],
  }),
  error: Annotation<string | null>,
});

type GraphState = typeof StateAnnotation.State;

export const pickNextSeedNode = (state: GraphState): Promise<Partial<GraphState>> => {
  const { currentSeed, seeds } = pickNextSeed(state.seeds);
  return Promise.resolve({ currentSeed, seeds });
};

export const shouldContinueBranch = (state: GraphState): "pickNextSeed" | typeof END => {
  return shouldContinue(state.seeds) ? "pickNextSeed" : END;
};

export const routeModeBranchNode = (state: GraphState) => routeModeBranch(state.currentSeed?.routeMode);

export const buildRouteGraph = (deps: IGraphDeps, compileOptions?: IGraphCompileOptions) => {
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
    .addConditionalEdges("pickNextSeed", routeModeBranchNode, {
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
    .addConditionalEdges("saveRoute", shouldContinueBranch, {
      pickNextSeed: "pickNextSeed",
      [END]: END,
    });

  return graph.compile(compileOptions ?? {});
};
