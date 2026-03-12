/**
 * Google Places API — place types for the collector.
 *
 * NEARBY_SEARCH_TYPES is the source of truth for which place types are
 * queried when collecting tourist POIs. Edit this list to add/remove types.
 * The collector uses Places API (New) — places:searchNearby.
 *
 * GOOGLE_TYPE_TO_PLACE_CATEGORY maps each type to a PlaceCategory for DB storage.
 * AREA_GEOMETRY_TYPES and LINEAR_GEOMETRY_TYPES define geometry handling (polygon vs line).
 */

import { PlaceCategory } from "./place.entity";

/** All Table A place types from Google Places API (New) documentation */
export const GOOGLE_PLACE_TYPES = [
  // Automotive
  "car_dealer",
  "car_rental",
  "car_repair",
  "car_wash",
  "ebike_charging_station",
  "electric_vehicle_charging_station",
  "gas_station",
  "parking",
  "parking_garage",
  "parking_lot",
  "rest_stop",
  "tire_shop",
  "truck_dealer",
  // Business
  "business_center",
  "corporate_office",
  "coworking_space",
  "farm",
  "manufacturer",
  "ranch",
  "supplier",
  "television_studio",
  // Culture
  "art_gallery",
  "art_museum",
  "art_studio",
  "auditorium",
  "castle",
  "cultural_landmark",
  "fountain",
  "historical_place",
  "history_museum",
  "monument",
  "museum",
  "performing_arts_theater",
  "sculpture",
  // Education
  "academic_department",
  "educational_institution",
  "library",
  "preschool",
  "primary_school",
  "research_institute",
  "school",
  "secondary_school",
  "university",
  // Entertainment and Recreation
  "adventure_sports_center",
  "amphitheatre",
  "amusement_center",
  "amusement_park",
  "aquarium",
  "banquet_hall",
  "barbecue_area",
  "botanical_garden",
  "bowling_alley",
  "casino",
  "childrens_camp",
  "city_park",
  "comedy_club",
  "community_center",
  "concert_hall",
  "convention_center",
  "cultural_center",
  "cycling_park",
  "dance_hall",
  "dog_park",
  "event_venue",
  "ferris_wheel",
  "garden",
  "go_karting_venue",
  "hiking_area",
  "historical_landmark",
  "indoor_playground",
  "internet_cafe",
  "karaoke",
  "live_music_venue",
  "marina",
  "miniature_golf_course",
  "movie_rental",
  "movie_theater",
  "national_park",
  "night_club",
  "observation_deck",
  "off_roading_area",
  "opera_house",
  "paintball_center",
  "park",
  "philharmonic_hall",
  "picnic_ground",
  "planetarium",
  "plaza",
  "roller_coaster",
  "skateboard_park",
  "state_park",
  "tourist_attraction",
  "video_arcade",
  "vineyard",
  "visitor_center",
  "water_park",
  "wedding_venue",
  "wildlife_park",
  "wildlife_refuge",
  "zoo",
  // Facilities
  "public_bath",
  "public_bathroom",
  "stable",
  // Finance
  "accounting",
  "atm",
  "bank",
  // Food and Drink (subset — full list has 200+ restaurant types)
  "bakery",
  "bar",
  "cafe",
  "ice_cream_shop",
  "meal_delivery",
  "meal_takeaway",
  "restaurant",
  "winery",
  // Geographical Areas
  "administrative_area_level_1",
  "administrative_area_level_2",
  "country",
  "locality",
  "postal_code",
  "school_district",
  // Government
  "city_hall",
  "courthouse",
  "embassy",
  "fire_station",
  "government_office",
  "local_government_office",
  "police",
  "post_office",
  // Health and Wellness
  "chiropractor",
  "dental_clinic",
  "dentist",
  "doctor",
  "drugstore",
  "general_hospital",
  "hospital",
  "massage",
  "massage_spa",
  "medical_center",
  "medical_clinic",
  "medical_lab",
  "pharmacy",
  "physiotherapist",
  "sauna",
  "skin_care_clinic",
  "spa",
  "tanning_studio",
  "wellness_center",
  "yoga_studio",
  // Housing
  "apartment_building",
  "apartment_complex",
  "condominium_complex",
  "housing_complex",
  // Lodging
  "bed_and_breakfast",
  "budget_japanese_inn",
  "campground",
  "camping_cabin",
  "cottage",
  "extended_stay_hotel",
  "farmstay",
  "guest_house",
  "hostel",
  "hotel",
  "inn",
  "japanese_inn",
  "lodging",
  "mobile_home_park",
  "motel",
  "private_guest_room",
  "resort_hotel",
  "rv_park",
  // Natural Features
  "beach",
  "island",
  "lake",
  "mountain_peak",
  "nature_preserve",
  "river",
  "scenic_spot",
  "woods",
  // Places of Worship
  "buddhist_temple",
  "church",
  "hindu_temple",
  "mosque",
  "shinto_shrine",
  "synagogue",
  // Services
  "cemetery",
  "tour_agency",
  "tourist_information_center",
  "travel_agency",
  // Shopping (tourism-relevant)
  "book_store",
  "gift_shop",
  "market",
  "shopping_mall",
  "store",
  // Sports
  "arena",
  "golf_course",
  "ski_resort",
  "stadium",
  // Transportation
  "airport",
  "bus_station",
  "ferry_terminal",
  "train_station",
] as const;

export type GooglePlaceType = (typeof GOOGLE_PLACE_TYPES)[number];

// =============================================================================
// NEARBY SEARCH TYPES — Places API (New) Table A
// =============================================================================
// Source: https://developers.google.com/maps/documentation/places/web-service/place-types
// =============================================================================

export const INCLUDED_SEARCH_TYPES: readonly GooglePlaceType[] = [
  // Culture
  "art_gallery",
  "art_museum",
  "art_studio",
  "auditorium",
  "castle",
  "cultural_landmark",
  "fountain",
  "historical_place",
  "history_museum",
  "monument",
  "museum",
  "performing_arts_theater",
  "sculpture",
  // Entertainment and Recreation
  "adventure_sports_center",
  "amphitheatre",
  "amusement_center",
  "amusement_park",
  "aquarium",
  "botanical_garden",
  "city_park",
  "concert_hall",
  "cultural_center",
  "dog_park",
  "event_venue",
  "garden",
  "go_karting_venue",
  "hiking_area",
  "historical_landmark",
  "marina",
  "national_park",
  "night_club",
  "observation_deck",
  "opera_house",
  "park",
  "philharmonic_hall",
  "planetarium",
  "plaza",
  "roller_coaster",
  "state_park",
  "tourist_attraction",
  "vineyard",
  "water_park",
  "wildlife_park",
  "zoo",
  "restaurant",
  "winery",
  // Government
  "city_hall",
  // Natural Features
  "beach",
  "island",
  "lake",
  "mountain_peak",
  "nature_preserve",
  "river",
  "scenic_spot",
  "woods",
  // Places of Worship
  "buddhist_temple",
  "church",
  "hindu_temple",
  "mosque",
  "shinto_shrine",
  "synagogue",
  // Shopping (tourism-relevant)
  "shopping_mall",
  // Sports
  "stadium",
];

/** Types to exclude from search. Must not overlap with NEARBY_SEARCH_TYPES (API rejects conflicts). */
export const EXCLUDED_SEARCH_TYPES: readonly string[] = [
  "hotel",
  "lodging",
  "cafeteria",
  "guest_house",
  "hostel",
  "gym",
  "supermarket",
  "pharmacy",
  "store",
];

// =============================================================================
// AREA / LINEAR TYPES — geometry handling for places with viewport
// =============================================================================
// Subsets of NEARBY_SEARCH_TYPES. Area types use ST_MakeEnvelope;
// linear types use ST_MakeLine. Others use ST_MakePoint.
// =============================================================================

export const AREA_GEOMETRY_TYPES = new Set<GooglePlaceType>([
  "park",
  "plaza",
  "garden",
  "botanical_garden",
  "city_park",
  "national_park",
  "state_park",
  "beach",
  "lake",
  "nature_preserve",
  "woods",
  "dog_park",
]);

export const LINEAR_GEOMETRY_TYPES = new Set<GooglePlaceType>(["hiking_area"]);

// =============================================================================
// MAPPING: Google type -> PlaceCategory (for DB storage)
// =============================================================================
// Must have an entry for every type in NEARBY_SEARCH_TYPES. Used when
// upserting places from Google API results.
// =============================================================================

export const GOOGLE_TYPE_TO_PLACE_CATEGORY: Record<string, PlaceCategory> = {
  // Culture
  art_gallery: PlaceCategory.ART_GALLERY,
  art_museum: PlaceCategory.MUSEUM,
  art_studio: PlaceCategory.ART_GALLERY,
  auditorium: PlaceCategory.TOURIST_ATTRACTION,
  castle: PlaceCategory.TOURIST_ATTRACTION,
  cultural_landmark: PlaceCategory.TOURIST_ATTRACTION,
  fountain: PlaceCategory.POINT_OF_INTEREST,
  historical_place: PlaceCategory.TOURIST_ATTRACTION,
  historical_landmark: PlaceCategory.TOURIST_ATTRACTION,
  history_museum: PlaceCategory.MUSEUM,
  monument: PlaceCategory.MONUMENT,
  museum: PlaceCategory.MUSEUM,
  performing_arts_theater: PlaceCategory.TOURIST_ATTRACTION,
  sculpture: PlaceCategory.POINT_OF_INTEREST,
  // Entertainment
  adventure_sports_center: PlaceCategory.TOURIST_ATTRACTION,
  amphitheatre: PlaceCategory.TOURIST_ATTRACTION,
  amusement_center: PlaceCategory.AMUSEMENT_PARK,
  amusement_park: PlaceCategory.AMUSEMENT_PARK,
  aquarium: PlaceCategory.TOURIST_ATTRACTION,
  botanical_garden: PlaceCategory.PARK,
  city_park: PlaceCategory.PARK,
  concert_hall: PlaceCategory.TOURIST_ATTRACTION,
  cultural_center: PlaceCategory.TOURIST_ATTRACTION,
  dog_park: PlaceCategory.PARK,
  event_venue: PlaceCategory.TOURIST_ATTRACTION,
  garden: PlaceCategory.PARK,
  go_karting_venue: PlaceCategory.AMUSEMENT_PARK,
  hiking_area: PlaceCategory.HIKING_AREA,
  marina: PlaceCategory.TOURIST_ATTRACTION,
  national_park: PlaceCategory.PARK,
  night_club: PlaceCategory.TOURIST_ATTRACTION,
  observation_deck: PlaceCategory.VIEWPOINT,
  opera_house: PlaceCategory.TOURIST_ATTRACTION,
  park: PlaceCategory.PARK,
  philharmonic_hall: PlaceCategory.TOURIST_ATTRACTION,
  planetarium: PlaceCategory.TOURIST_ATTRACTION,
  plaza: PlaceCategory.SQUARE,
  roller_coaster: PlaceCategory.AMUSEMENT_PARK,
  state_park: PlaceCategory.PARK,
  tourist_attraction: PlaceCategory.TOURIST_ATTRACTION,
  vineyard: PlaceCategory.TOURIST_ATTRACTION,
  water_park: PlaceCategory.AMUSEMENT_PARK,
  wildlife_park: PlaceCategory.TOURIST_ATTRACTION,
  zoo: PlaceCategory.TOURIST_ATTRACTION,
  // Food & drink
  restaurant: PlaceCategory.STORE,
  winery: PlaceCategory.TOURIST_ATTRACTION,
  // Government
  city_hall: PlaceCategory.TOURIST_ATTRACTION,
  // Natural features
  beach: PlaceCategory.NATURAL_FEATURE,
  island: PlaceCategory.NATURAL_FEATURE,
  lake: PlaceCategory.NATURAL_FEATURE,
  mountain_peak: PlaceCategory.VIEWPOINT,
  nature_preserve: PlaceCategory.NATURAL_FEATURE,
  river: PlaceCategory.NATURAL_FEATURE,
  scenic_spot: PlaceCategory.VIEWPOINT,
  woods: PlaceCategory.NATURAL_FEATURE,
  // Worship
  buddhist_temple: PlaceCategory.PLACE_OF_WORSHIP,
  church: PlaceCategory.CHURCH,
  hindu_temple: PlaceCategory.PLACE_OF_WORSHIP,
  mosque: PlaceCategory.PLACE_OF_WORSHIP,
  shinto_shrine: PlaceCategory.PLACE_OF_WORSHIP,
  synagogue: PlaceCategory.PLACE_OF_WORSHIP,
  // Shopping
  shopping_mall: PlaceCategory.SHOPPING_MALL,
  // Sports
  stadium: PlaceCategory.TOURIST_ATTRACTION,
  // Table B types (may appear in response but cannot be used in searchNearby includedTypes)
  route: PlaceCategory.STREET,
  street_address: PlaceCategory.STREET,
};
