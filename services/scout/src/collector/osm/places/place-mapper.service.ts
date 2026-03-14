import { Injectable } from "@nestjs/common";

import { PlaceCategory } from "@framework/types";
import type { IOverpassElement } from "@framework/types";

import { PLACE_VISIT_DURATION } from "../../../place/place.constants";
import { EXCLUDED_OSM_TAG_VALUES, INCLUDED_OSM_TAG_KEYS } from "./osm-place-types";

/**
 * Maps OSM tag values to PlaceCategory.
 * Reference: cityguide-backend Overpass queries (tourism, historic, amenity, leisure, natural, man_made, building, shop).
 */
const OSM_TAG_TO_CATEGORY: Record<string, PlaceCategory> = {
  // tourism
  museum: PlaceCategory.MUSEUM,
  gallery: PlaceCategory.ART_GALLERY,
  viewpoint: PlaceCategory.VIEWPOINT,
  attraction: PlaceCategory.TOURIST_ATTRACTION,
  theme_park: PlaceCategory.AMUSEMENT_PARK,
  zoo: PlaceCategory.AMUSEMENT_PARK,
  aquarium: PlaceCategory.TOURIST_ATTRACTION,
  artwork: PlaceCategory.TOURIST_ATTRACTION,
  // historic
  monument: PlaceCategory.MONUMENT,
  memorial: PlaceCategory.MONUMENT,
  castle: PlaceCategory.TOURIST_ATTRACTION,
  fort: PlaceCategory.TOURIST_ATTRACTION,
  city_gate: PlaceCategory.TOURIST_ATTRACTION,
  archaeological_site: PlaceCategory.TOURIST_ATTRACTION,
  ruins: PlaceCategory.TOURIST_ATTRACTION,
  // leisure
  park: PlaceCategory.PARK,
  garden: PlaceCategory.PARK,
  nature_reserve: PlaceCategory.NATURAL_FEATURE,
  picnic_site: PlaceCategory.PARK,
  square: PlaceCategory.SQUARE,
  // amenity
  place_of_worship: PlaceCategory.PLACE_OF_WORSHIP,
  theatre: PlaceCategory.TOURIST_ATTRACTION,
  cinema: PlaceCategory.TOURIST_ATTRACTION,
  fountain: PlaceCategory.TOURIST_ATTRACTION,
  marketplace: PlaceCategory.POINT_OF_INTEREST,
  cafe: PlaceCategory.POINT_OF_INTEREST,
  restaurant: PlaceCategory.POINT_OF_INTEREST,
  bar: PlaceCategory.POINT_OF_INTEREST,
  // natural
  beach: PlaceCategory.NATURAL_FEATURE,
  peak: PlaceCategory.VIEWPOINT,
  cliff: PlaceCategory.VIEWPOINT,
  spring: PlaceCategory.NATURAL_FEATURE,
  water: PlaceCategory.NATURAL_FEATURE,
  // man_made
  tower: PlaceCategory.VIEWPOINT,
  lighthouse: PlaceCategory.TOURIST_ATTRACTION,
  // building
  church: PlaceCategory.CHURCH,
  cathedral: PlaceCategory.CHURCH,
  mosque: PlaceCategory.PLACE_OF_WORSHIP,
  synagogue: PlaceCategory.PLACE_OF_WORSHIP,
  temple: PlaceCategory.PLACE_OF_WORSHIP,
  // shop
  mall: PlaceCategory.SHOPPING_MALL,
  // arts_centre (amenity)
  arts_centre: PlaceCategory.ART_GALLERY,
};

@Injectable()
export class OsmPlaceMapperService {
  public toPlaceCategory(element: IOverpassElement): PlaceCategory {
    const tags = element.tags ?? {};
    for (const key of INCLUDED_OSM_TAG_KEYS) {
      const value = tags[key];
      if (value && OSM_TAG_TO_CATEGORY[value]) {
        return OSM_TAG_TO_CATEGORY[value];
      }
    }
    return PlaceCategory.POINT_OF_INTEREST;
  }

  /** Converts OSM element tags to a types array for DB storage (e.g. ["tourism:museum"]). */
  public toTypes(element: IOverpassElement): string[] {
    const tags = element.tags ?? {};
    const result: string[] = [];
    for (const key of INCLUDED_OSM_TAG_KEYS) {
      const value = tags[key];
      if (value) {
        result.push(`${key}:${value}`);
      }
    }
    return result;
  }

  public toVisitDurationMinutes(category: PlaceCategory): number | null {
    return PLACE_VISIT_DURATION[category] ?? null;
  }

  public getLatLng(element: IOverpassElement): { lat: number; lng: number } | null {
    if (element.lat != null && element.lon != null) {
      return { lat: element.lat, lng: element.lon };
    }
    if (element.center) {
      return { lat: element.center.lat, lng: element.center.lon };
    }
    return null;
  }

  public getName(element: IOverpassElement): string {
    return element.tags?.name ?? "Unnamed";
  }

  public isExcluded(element: IOverpassElement): boolean {
    const tags = element.tags ?? {};
    for (const kv of EXCLUDED_OSM_TAG_VALUES) {
      const [key, value] = kv.split(":");
      if (tags[key] === value) return true;
    }
    return false;
  }
}
