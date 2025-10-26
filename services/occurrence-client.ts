import axios from 'axios';

export interface OccurrenceCoordinate {
  latitude: number;
  longitude: number;
}

export interface Occurrence {
  _id?: string;
  tipo: string;
  gravidade: string;
  coordinate: OccurrenceCoordinate;
  area?: any[];
  data_registro: string;
}

export interface OccurrenceResponse {
  status: string;
  id: string;
}

/**
 * Fetch all active occurrences from the backend
 */
export async function fetchActiveOccurrences(): Promise<Occurrence[]> {
  try {
    const response = await axios.get('/ocorrencia/listar');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching occurrences:', error);
    return [];
  }
}

/**
 * Register a new occurrence
 */
export async function registerOccurrence(
  tipo: string,
  gravidade: string,
  coordinate: OccurrenceCoordinate,
  userCoordinate: OccurrenceCoordinate
): Promise<OccurrenceResponse> {
  const data = {
    ocorrencia: {
      tipo: tipo.toLowerCase(),
      gravidade: gravidade.toLowerCase(),
      coordinate: {
        longitude: coordinate.longitude,
        latitude: coordinate.latitude,
      },
    },
    area: [],
    data_registro: new Date().toISOString(),
    user_coordinate: {
      longitude: userCoordinate.longitude,
      latitude: userCoordinate.latitude,
    },
  };

  const response = await axios.post('/ocorrencia/adicionar', data);
  return response.data;
}
