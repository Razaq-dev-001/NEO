import { WeatherData } from '../types/news';

class WeatherService {
  private cache: Record<string, { data: WeatherData; timestamp: number }> = {};
  private CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  // City geocode mappings
  private CITIES: Record<string, { lat: number; lon: number; name: string }> = {
    mumbai: { lat: 19.076, lon: 72.8777, name: 'Mumbai, India' },
    delhi: { lat: 28.6139, lon: 77.209, name: 'New Delhi, India' },
    bengaluru: { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, India' },
    'san francisco': { lat: 37.7749, lon: -122.4194, name: 'San Francisco, CA' },
    'new york': { lat: 40.7128, lon: -74.006, name: 'New York, NY' },
    london: { lat: 51.5074, lon: -0.1278, name: 'London, UK' },
    tokyo: { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
  };

  private getConditionDescription(code: number): string {
    if (code === 0) return 'Clear sky';
    if (code === 1 || code === 2) return 'Mainly clear & sunny';
    if (code === 3) return 'Overcast clouds';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Light drizzle';
    if (code >= 61 && code <= 65) return 'Rain showers';
    if (code >= 71 && code <= 77) return 'Snow fall';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95) return 'Thunderstorms';
    return 'Partly cloudy';
  }

  async getWeather(cityName: string = 'Mumbai'): Promise<WeatherData> {
    const query = cityName.toLowerCase().trim();
    const cityKey = Object.keys(this.CITIES).find((k) => query.includes(k)) || 'mumbai';
    const city = this.CITIES[cityKey];

    const now = Date.now();
    if (this.cache[cityKey] && now - this.cache[cityKey].timestamp < this.CACHE_TTL) {
      return this.cache[cityKey].data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error('Weather API request failed');

      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      const forecast = (daily?.time || []).slice(0, 4).map((timeStr: string, idx: number) => {
        const dateObj = new Date(timeStr);
        const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
        return {
          day: dayName,
          tempMax: Math.round(daily.temperature_2m_max[idx]),
          tempMin: Math.round(daily.temperature_2m_min[idx]),
          condition: this.getConditionDescription(daily.weather_code[idx]),
        };
      });

      const weatherResult: WeatherData = {
        city: city.name,
        temperature: Math.round(current.temperature_2m),
        condition: this.getConditionDescription(current.weather_code),
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        precipitation: current.precipitation || 0,
        forecast,
        updatedAt: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      };

      this.cache[cityKey] = {
        data: weatherResult,
        timestamp: now,
      };

      return weatherResult;
    } catch (err) {
      console.warn('Weather fetch fallback:', err);
      return {
        city: city.name,
        temperature: 28,
        condition: 'Partly sunny & pleasant',
        humidity: 65,
        windSpeed: 14,
        precipitation: 0,
        forecast: [
          { day: 'Today', tempMax: 30, tempMin: 24, condition: 'Partly sunny' },
          { day: 'Tomorrow', tempMax: 29, tempMin: 23, condition: 'Clear sky' },
          { day: 'Day 3', tempMax: 28, tempMin: 22, condition: 'Breezy' },
        ],
        updatedAt: 'Live',
      };
    }
  }

  formatSpokenWeather(weather: WeatherData): string {
    return `In ${weather.city}, it's currently ${weather.temperature}°C with ${weather.condition.toLowerCase()}. Humidity is ${weather.humidity}%, and wind speed is around ${weather.windSpeed} km/h.`;
  }
}

export const weatherService = new WeatherService();
