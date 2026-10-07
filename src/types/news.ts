export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  publishedAt: string;
}

export interface WeatherData {
  city: string;
  temperature: number; // Celsius
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  forecast: Array<{
    day: string;
    tempMax: number;
    tempMin: number;
    condition: string;
  }>;
  updatedAt: string;
}
