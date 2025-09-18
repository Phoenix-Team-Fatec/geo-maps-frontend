import { SearchResult } from "@/types/location";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;


export class GoogleMapsAPI {
  static async searchPlaces(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      console.error("Search error:", error);
      throw new Error("Failed to search places");
    }
  }

  static async getPlaceDetails(placeId: string): Promise<{ lat: number, lng: number } | null> {
    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`);
        const data = await response.json();

        if (data.result?.geometry?.location) {
            const { lat, lng } = data.result.geometry.location;
            return { lat, lng };
        }
        return null;
    } catch (error) {
        console.error('Place details error:', error);
        throw new Error('Failed to get place details');
    }
  }
}