import type { CityEntity } from "../../../city/city.entity";
import type { PlaceEntity } from "../../place.entity";

export interface IEnrichmentContext {
  cityEntity: CityEntity;
}

export interface IEnrichmentProcedure {
  /** Returns true if this procedure should run (condition not met). */
  shouldRun(place: PlaceEntity): boolean;
  /** Runs the procedure, returns partial updates to apply. */
  run(place: PlaceEntity, context: IEnrichmentContext): Promise<Partial<Pick<PlaceEntity, "description" | "mediaUrl">>>;
}
