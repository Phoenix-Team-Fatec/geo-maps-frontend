import axios from 'axios';

// Weather API response types based on OpenWeatherMap API
export interface WeatherCoordinates {
  lon: number;
  lat: number;
}

export interface WeatherMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherWind {
  speed: number;
  deg: number;
  gust?: number;
}

export interface WeatherClouds {
  all: number;
}

export interface WeatherRain {
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherSnow {
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherSys {
  type?: number;
  id?: number;
  country: string;
  sunrise: number;
  sunset: number;
}

export interface WeatherData {
  coord: WeatherCoordinates;
  weather: WeatherCondition[];
  base: string;
  main: WeatherMain;
  visibility: number;
  wind: WeatherWind;
  clouds: WeatherClouds;
  rain?: WeatherRain;
  snow?: WeatherSnow;
  dt: number;
  sys: WeatherSys;
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface WeatherError {
  error: string;
}

/**
 * Fetch current weather data from your backend (which calls OpenWeatherMap API)
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Weather data from OpenWeatherMap API via backend
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  try {
    const response = await axios.get('/weather', {
      params: { lat, lng },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching weather:', error);

    if (error.response?.status === 404) {
      throw new Error('Localização não encontrada.');
    } else if (error.response?.status === 500) {
      throw new Error('Erro no servidor ao buscar dados do clima.');
    } else if (error.response?.status === 504) {
      throw new Error('Tempo esgotado ao buscar clima. Tente novamente.');
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }

    throw new Error('Falha ao buscar dados do clima. Verifique sua conexão.');
  }
}

//Get weather icon URL from OpenWeatherMap
export function getWeatherIconUrl(iconCode: string, size: '1x' | '2x' | '4x' = '2x'): string {
  const sizeMap = {
    '1x': '',
    '2x': '@2x',
    '4x': '@4x',
  };
  return `https://openweathermap.org/img/wn/${iconCode}${sizeMap[size]}.png`;
}

//Convert temperature from Celsius to Fahrenheit
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}


//Format temperature with unit
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  const rounded = Math.round(temp);
  return `${rounded}�${unit}`;
}


//Get weather description (already comes in Portuguese from API with lang=pt_br)
export function getWeatherDescriptionPT(description: string): string {
  // API already returns Portuguese descriptions when lang=pt_br is set
  return description;
}


//Get weather severity level for alerts
export function getWeatherSeverity(weather: WeatherData): 'safe' | 'warning' | 'danger' {
  const mainCondition = weather.weather[0].main.toLowerCase();
  const windSpeed = weather.wind.speed;
  const hasRain = weather.rain && weather.rain['1h'] && weather.rain['1h'] > 0;
  const hasHeavyRain = weather.rain && weather.rain['1h'] && weather.rain['1h'] > 7.6; // > 7.6mm/h is heavy

  // Danger conditions
  if (
    mainCondition === 'thunderstorm' ||
    mainCondition === 'tornado' ||
    mainCondition === 'squall' ||
    hasHeavyRain ||
    windSpeed > 20 // > 72 km/h
  ) {
    return 'danger';
  }

  // Warning conditions
  if (
    mainCondition === 'rain' ||
    mainCondition === 'snow' ||
    hasRain ||
    windSpeed > 10 // > 36 km/h
  ) {
    return 'warning';
  }

  return 'safe';
}

//Check if weather conditions are suitable for travel
export function isSafeForTravel(weather: WeatherData): boolean {
  return getWeatherSeverity(weather) === 'safe';
}

//Get weather alert message in Portuguese
export function getWeatherAlertMessage(weather: WeatherData): string | null {
  const severity = getWeatherSeverity(weather);
  const condition = weather.weather[0].main.toLowerCase();
  const description = getWeatherDescriptionPT(weather.weather[0].description);

  if (severity === 'danger') {
    return `� PERIGO: ${description}. Evite viajar neste momento!`;
  }

  if (severity === 'warning') {
    return `� ATEN��O: ${description}. Dirija com cuidado.`;
  }

  return null;
}

//Format wind speed
export function formatWindSpeed(speed: number): string {
  const kmh = speed * 3.6; // m/s to km/h
  return `${Math.round(kmh)} km/h`;
}

//Get wind direction text
export function getWindDirection(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

//Format timestamp to time string
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
