// services/routes-client.ts
import axios from "axios";

export type LocationCoords = { latitude: number; longitude: number };

function decodePolyline(encoded: string): LocationCoords[] {
  const points: LocationCoords[] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b = 0, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/**
 * Chama o backend FastAPI (endpoint de rotas)
 * compatível com o schema.py: DirectionsRequest
 */
export async function traceRoute(
  origin: LocationCoords,
  destination: LocationCoords,
  mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
): Promise<{ coords: LocationCoords[]; rawRoute: any }> {
  try {
    const payload = {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode,
      units: "metric",
      language: "pt-BR",
    };

    const response = await axios.post("/rotas/", payload);
    const routes = response.data;

    if (!routes || !routes.length) throw new Error("Nenhuma rota retornada");
    const overview = routes[0]?.overview_polyline?.points;
    if (!overview) throw new Error("Polyline ausente na resposta");

    return {
      coords: decodePolyline(overview),
      rawRoute: routes[0],
    };
  } catch (err) {
    console.error("Erro em traceRoute:", err);
    throw err;
  }
}
