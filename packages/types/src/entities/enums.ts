export enum PlaceCategory {
  MUSEUM = "museum",
  TOURIST_ATTRACTION = "tourist_attraction",
  PARK = "park",
  SHOPPING_MALL = "shopping_mall",
  STORE = "store",
  POINT_OF_INTEREST = "point_of_interest",
  CHURCH = "church",
  PLACE_OF_WORSHIP = "place_of_worship",
  NATURAL_FEATURE = "natural_feature",
  ART_GALLERY = "art_gallery",
  AMUSEMENT_PARK = "amusement_park",
  HIKING_AREA = "hiking_area",
  STREET = "route",
  SQUARE = "plaza",
  VIEWPOINT = "scenic_spot",
  MONUMENT = "monument",
}

export enum PlaceSource {
  GOOGLE = "google",
  OSM = "osm",
}

/** Matches Google Places API price_level: 0=free, 1=inexpensive, 2=moderate, 3=expensive, 4=very_expensive */
export enum PriceLevel {
  FREE = "free",
  INEXPENSIVE = "inexpensive",
  MODERATE = "moderate",
  EXPENSIVE = "expensive",
  VERY_EXPENSIVE = "very_expensive",
}

/** Matches google.maps.TravelMode for Directions API. */
export enum RouteMode {
  WALKING = "WALKING",
  BICYCLING = "BICYCLING",
  DRIVING = "DRIVING",
}

export enum RouteTheme {
  HISTORY = "history",
  NATURE = "nature",
  VIEWPOINTS = "viewpoints",
  SHOPPING = "shopping",
  EVENING = "evening",
  HIGHLIGHTS = "highlights",
}
