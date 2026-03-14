import { RouteMode } from "@framework/types";

import { IRouteSeed } from "../state";

export const pickNextSeed = (seeds: IRouteSeed[]): { currentSeed: IRouteSeed | null; seeds: IRouteSeed[] } => {
  if (seeds.length === 0) {
    return { currentSeed: null, seeds: [] };
  }
  const [next, ...remaining] = seeds;
  return { currentSeed: next, seeds: remaining };
};

export const shouldContinue = (seeds: IRouteSeed[]): boolean => seeds.length > 0;

export type CandidateNode = "candidateGeneration" | "candidateGenerationCycling" | "candidateGenerationDriving";

export const routeModeBranch = (mode: RouteMode | undefined): CandidateNode => {
  if (mode === RouteMode.DRIVING) return "candidateGenerationDriving";
  if (mode === RouteMode.BICYCLING) return "candidateGenerationCycling";
  return "candidateGeneration";
};
