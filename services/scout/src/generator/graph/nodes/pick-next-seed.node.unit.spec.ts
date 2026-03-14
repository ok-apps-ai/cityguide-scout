import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";

import { pickNextSeed, routeModeBranch, shouldContinue } from "./pick-next-seed.node";
import type { ICluster, IRouteSeed } from "../state";

const createPlace = (id: string) => ({ id, category: PlaceCategory.PARK }) as unknown as IRouteSeed["startPlace"];

const createSeed = (overrides?: Partial<IRouteSeed>): IRouteSeed => ({
  theme: RouteTheme.HIGHLIGHTS,
  routeMode: RouteMode.WALKING,
  durationBudgetMinutes: 60,
  startPlace: createPlace("p1"),
  cluster: {} as ICluster,
  ...overrides,
});

describe("pickNextSeed", () => {
  it("returns first seed and remaining when seeds non-empty", () => {
    const seed1 = createSeed();
    const seed2 = createSeed();
    const { currentSeed, seeds } = pickNextSeed([seed1, seed2]);

    expect(currentSeed).toEqual(seed1);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual(seed2);
  });

  it("returns null and empty array when seeds empty", () => {
    const { currentSeed, seeds } = pickNextSeed([]);

    expect(currentSeed).toBeNull();
    expect(seeds).toEqual([]);
  });

  it("returns single seed and empty remaining when one seed", () => {
    const seed = createSeed();
    const { currentSeed, seeds } = pickNextSeed([seed]);

    expect(currentSeed).toEqual(seed);
    expect(seeds).toEqual([]);
  });
});

describe("shouldContinue", () => {
  it("returns true when seeds non-empty", () => {
    expect(shouldContinue([createSeed()])).toBe(true);
    expect(shouldContinue([createSeed(), createSeed()])).toBe(true);
  });

  it("returns false when seeds empty", () => {
    expect(shouldContinue([])).toBe(false);
  });
});

describe("routeModeBranch", () => {
  it("returns candidateGenerationDriving for DRIVING", () => {
    expect(routeModeBranch(RouteMode.DRIVING)).toEqual("candidateGenerationDriving");
  });

  it("returns candidateGenerationCycling for BICYCLING", () => {
    expect(routeModeBranch(RouteMode.BICYCLING)).toEqual("candidateGenerationCycling");
  });

  it("returns candidateGeneration for WALKING", () => {
    expect(routeModeBranch(RouteMode.WALKING)).toEqual("candidateGeneration");
  });

  it("returns candidateGeneration for undefined", () => {
    expect(routeModeBranch(undefined)).toEqual("candidateGeneration");
  });
});
