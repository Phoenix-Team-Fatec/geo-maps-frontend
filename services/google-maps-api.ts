import { SearchResult } from "@/types/location";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface DirectionsResponse {
  routes: Array<{
    overview_polyline: {
      points: string;
    };
    legs: Array<{
      steps: Array<{
        polyline: {
          points: string;
        };
      }>;
    }>;
  }>;
}

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

  static async getDirections(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<{ latitude: number; longitude: number }[]> {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data: DirectionsResponse = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = this.decodePolyline(route.overview_polyline.points);
        return points;
      }

      // Fallback to straight line if no route found
      return [origin, destination];
    } catch (error) {
      console.error('Directions error:', error);
      // Fallback to straight line on error
      return [origin, destination];
    }
  }

  private static decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
    const points: { latitude: number; longitude: number }[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }
}