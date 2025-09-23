export interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface PlaceDetails {
  lat: number;
  lng: number;
}

export interface SearchLocation {
  placeId: string;
  description: string;
  coordinates?: LocationCoords;
}