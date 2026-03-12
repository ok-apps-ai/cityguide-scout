import { Injectable } from "@nestjs/common";

import { PlaceCategory, PriceLevel } from "../../../place/place.entity";
import { PLACE_VISIT_DURATION } from "../../../place/place.constants";
import {
  AREA_GEOMETRY_TYPES,
  LINEAR_GEOMETRY_TYPES,
  GOOGLE_TYPE_TO_PLACE_CATEGORY,
  type GooglePlaceType,
} from "../../../place/google-place-types";
import type { INearbyPlace } from "../fetcher/types";

const GOOGLE_PRICE_TO_ENUM: Record<number, PriceLevel> = {
  0: PriceLevel.FREE,
  1: PriceLevel.INEXPENSIVE,
  2: PriceLevel.MODERATE,
  3: PriceLevel.EXPENSIVE,
  4: PriceLevel.VERY_EXPENSIVE,
};

@Injectable()
export class GooglePlaceMapperService {
  public buildGeomExpression(place: INearbyPlace, inferredType: string): string {
    const { location, viewport } = place.geometry;

    if (viewport && AREA_GEOMETRY_TYPES.has(inferredType as GooglePlaceType)) {
      const { southwest: sw, northeast: ne } = viewport;
      return `ST_MakeEnvelope(${sw.lng}, ${sw.lat}, ${ne.lng}, ${ne.lat}, 4326)`;
    }

    if (
      viewport &&
      (LINEAR_GEOMETRY_TYPES.has(inferredType as GooglePlaceType) ||
        inferredType === "route" ||
        inferredType === "street_address")
    ) {
      const { southwest: sw, northeast: ne } = viewport;
      return `ST_SetSRID(ST_MakeLine(ST_MakePoint(${sw.lng}, ${sw.lat}), ST_MakePoint(${ne.lng}, ${ne.lat})), 4326)`;
    }

    return `ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)`;
  }

  public inferCategoryFromTypes(place: INearbyPlace): PlaceCategory {
    for (const t of place.types) {
      const category = GOOGLE_TYPE_TO_PLACE_CATEGORY[t];
      if (category) return category;
    }
    return PlaceCategory.POINT_OF_INTEREST;
  }

  public inferGeometryType(place: INearbyPlace): string {
    return (
      place.types.find(
        t =>
          AREA_GEOMETRY_TYPES.has(t as GooglePlaceType) ||
          LINEAR_GEOMETRY_TYPES.has(t as GooglePlaceType) ||
          t === "route" ||
          t === "street_address",
      ) ??
      place.types[0] ??
      ""
    );
  }

  public toPriceLevel(priceLevel: number | undefined): PriceLevel | null {
    if (priceLevel == null) return null;
    return GOOGLE_PRICE_TO_ENUM[priceLevel] ?? null;
  }

  public toVisitDurationMinutes(category: PlaceCategory): number | null {
    return PLACE_VISIT_DURATION[category] ?? null;
  }
}
