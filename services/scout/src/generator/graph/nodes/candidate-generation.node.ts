import { DataSource } from "typeorm";

import { ns } from "../../../common/constants";
import { RouteMode } from "../../../route/route.entity";
import { RouteGenerationState } from "../state";
import { PlaceEntity } from "../../../place/place.entity";
import { THEME_CATEGORIES } from "../../theme-categories";

const buildCandidateNode = (dataSource: DataSource, routeMode: RouteMode) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    if (!state.currentSeed) {
      return { candidatePlaces: [] };
    }

    const { startPlace, theme } = state.currentSeed;
    const { candidateRadiusMeters, minPoints } = state.routeGenerationOptions;
    const radiusMeters = candidateRadiusMeters[routeMode];
    const allowedCategories = (THEME_CATEGORIES[theme] ?? []).map(c => c as string);

    const rows: Array<{ id: string }> = await dataSource.query(
      `SELECT p.id::text
       FROM ${ns}.places p
       WHERE p.city_id = $1
         AND ST_DWithin(
           p.geom::geography,
           (SELECT geom::geography FROM ${ns}.places WHERE id = $2),
           $3
         )
         AND (cardinality($4::text[]) = 0 OR p.category::text = ANY($4::text[]))`,
      [state.cityId, startPlace.id, radiusMeters, allowedCategories],
    );

    if (rows.length < minPoints) {
      return { candidatePlaces: [] };
    }

    const idSet = new Set(rows.map(r => r.id));
    const candidatePlaces: PlaceEntity[] = state.places.filter(p => idSet.has(p.id));

    return { candidatePlaces };
  };
};

export const makeCandidateGenerationNode = (dataSource: DataSource) =>
  buildCandidateNode(dataSource, RouteMode.WALKING);

export const makeCandidateGenerationCyclingNode = (dataSource: DataSource) =>
  buildCandidateNode(dataSource, RouteMode.CYCLING);

export const makeCandidateGenerationDrivingNode = (dataSource: DataSource) =>
  buildCandidateNode(dataSource, RouteMode.DRIVING);
