import { PlaceService } from "../../../place/place.service";
import { RouteGenerationState } from "../state";

export const makeLoadPoiNode = (placeService: PlaceService) => {
  return async (state: RouteGenerationState): Promise<Partial<RouteGenerationState>> => {
    const places = await placeService.findByCityId(state.cityId);
    return { places };
  };
};
