const axios = require('axios');
const supabase = require('../config/database');

// Cache configuration
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const weatherCache = new Map();

class WeatherService {
  constructor() {
    // Manually add your OpenWeatherMap API key here
    this.apiKey = 'e67ccacc99704e84c8cc5bb3758f294b'; // <-- Provided OpenWeatherMap API key
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  // Get weather data for a location and date
  async getWeatherByLocation(location, date) {
    try {
      const cacheKey = `${location}_${date}`;
      const cachedData = this.getCachedWeather(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Get coordinates for location
      const coordinates = await this.getCoordinates(location);
      if (!coordinates) {
        throw new Error('Location not found');
      }

      // Get weather data
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: coordinates.lat,
          lon: coordinates.lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const weatherData = this.transformWeatherData(response.data, date);
      this.cacheWeatherData(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.error('Error fetching weather:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  // Get coordinates for a location
  async getCoordinates(location) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: location,
          appid: this.apiKey
        }
      });
      return {
        lat: response.data.coord.lat,
        lon: response.data.coord.lon
      };
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  }

  // Transform weather data into our format
  transformWeatherData(data, targetDate) {
    const targetDateTime = new Date(targetDate);
    const forecast = data.list.find(item => {
      const itemDate = new Date(item.dt * 1000);
      return Math.abs(itemDate - targetDateTime) < 3 * 60 * 60 * 1000; // Within 3 hours
    });

    if (!forecast) {
      throw new Error('No weather data available for the specified date');
    }

    return {
      temperature: forecast.main.temp,
      humidity: forecast.main.humidity,
      wind_speed: forecast.wind.speed,
      precipitation: forecast.pop * 100, // Convert probability to percentage
      weather_description: forecast.weather[0].description,
      weather_icon: forecast.weather[0].icon,
      clouds: forecast.clouds.all,
      pressure: forecast.main.pressure,
      visibility: forecast.visibility,
      timestamp: new Date(forecast.dt * 1000).toISOString()
    };
  }

  // Calculate weather suitability score based on event type
  calculateSuitabilityScore(weatherData, eventType) {
    const scores = {
      'Outdoor Sports': this.calculateSportsScore(weatherData),
      'Wedding': this.calculateWeddingScore(weatherData),
      'Hiking': this.calculateHikingScore(weatherData),
      'Beach Day': this.calculateBeachScore(weatherData),
      'Picnic': this.calculatePicnicScore(weatherData),
      'Camping': this.calculateCampingScore(weatherData),
      'Outdoor Concert': this.calculateConcertScore(weatherData),
      'Party': this.calculatePartyScore(weatherData)
    };

    const score = scores[eventType] || this.calculateDefaultScore(weatherData);
    return {
      score,
      suitability: this.getSuitabilityLabel(score),
      analysis: this.generateAnalysisText(score, weatherData, eventType)
    };
  }

  // Event-specific scoring functions
  calculateSportsScore(weatherData) {
    let score = 0;
    
    // Temperature (15-30°C ideal)
    if (weatherData.temperature >= 15 && weatherData.temperature <= 30) {
      score += 30;
    } else if (weatherData.temperature >= 10 && weatherData.temperature <= 35) {
      score += 15;
    }

    // Precipitation (<20% ideal)
    if (weatherData.precipitation < 20) {
      score += 25;
    } else if (weatherData.precipitation < 40) {
      score += 10;
    }

    // Wind (<20km/h ideal)
    if (weatherData.wind_speed < 20) {
      score += 20;
    } else if (weatherData.wind_speed < 30) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds', 'scattered clouds'].includes(weatherData.weather_description)) {
      score += 25;
    } else if (['broken clouds', 'overcast clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculateWeddingScore(weatherData) {
    let score = 0;
    
    // Temperature (18-28°C ideal)
    if (weatherData.temperature >= 18 && weatherData.temperature <= 28) {
      score += 30;
    } else if (weatherData.temperature >= 15 && weatherData.temperature <= 32) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<15km/h ideal)
    if (weatherData.wind_speed < 15) {
      score += 25;
    } else if (weatherData.wind_speed < 25) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculateHikingScore(weatherData) {
    let score = 0;
    
    // Temperature (10-25°C ideal)
    if (weatherData.temperature >= 10 && weatherData.temperature <= 25) {
      score += 30;
    } else if (weatherData.temperature >= 5 && weatherData.temperature <= 30) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<15km/h ideal)
    if (weatherData.wind_speed < 15) {
      score += 25;
    } else if (weatherData.wind_speed < 25) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculateBeachScore(weatherData) {
    let score = 0;
    
    // Temperature (25-35°C ideal)
    if (weatherData.temperature >= 25 && weatherData.temperature <= 35) {
      score += 30;
    } else if (weatherData.temperature >= 20 && weatherData.temperature <= 38) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<20km/h ideal)
    if (weatherData.wind_speed < 20) {
      score += 25;
    } else if (weatherData.wind_speed < 30) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculatePicnicScore(weatherData) {
    let score = 0;
    
    // Temperature (20-30°C ideal)
    if (weatherData.temperature >= 20 && weatherData.temperature <= 30) {
      score += 30;
    } else if (weatherData.temperature >= 15 && weatherData.temperature <= 35) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<15km/h ideal)
    if (weatherData.wind_speed < 15) {
      score += 25;
    } else if (weatherData.wind_speed < 25) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculateCampingScore(weatherData) {
    let score = 0;
    
    // Temperature (15-25°C ideal)
    if (weatherData.temperature >= 15 && weatherData.temperature <= 25) {
      score += 30;
    } else if (weatherData.temperature >= 10 && weatherData.temperature <= 30) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<15km/h ideal)
    if (weatherData.wind_speed < 15) {
      score += 25;
    } else if (weatherData.wind_speed < 25) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculateConcertScore(weatherData) {
    let score = 0;
    
    // Temperature (20-30°C ideal)
    if (weatherData.temperature >= 20 && weatherData.temperature <= 30) {
      score += 30;
    } else if (weatherData.temperature >= 15 && weatherData.temperature <= 35) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<20km/h ideal)
    if (weatherData.wind_speed < 20) {
      score += 25;
    } else if (weatherData.wind_speed < 30) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculatePartyScore(weatherData) {
    let score = 0;
    
    // Temperature (20-30°C ideal)
    if (weatherData.temperature >= 20 && weatherData.temperature <= 30) {
      score += 30;
    } else if (weatherData.temperature >= 15 && weatherData.temperature <= 35) {
      score += 15;
    }

    // Precipitation (<10% ideal)
    if (weatherData.precipitation < 10) {
      score += 30;
    } else if (weatherData.precipitation < 20) {
      score += 15;
    }

    // Wind (<20km/h ideal)
    if (weatherData.wind_speed < 20) {
      score += 25;
    } else if (weatherData.wind_speed < 30) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 15;
    }

    return score;
  }

  calculateDefaultScore(weatherData) {
    let score = 0;
    
    // Temperature (20-30°C ideal)
    if (weatherData.temperature >= 20 && weatherData.temperature <= 30) {
      score += 30;
    } else if (weatherData.temperature >= 15 && weatherData.temperature <= 35) {
      score += 15;
    }

    // Precipitation (<20% ideal)
    if (weatherData.precipitation < 20) {
      score += 25;
    } else if (weatherData.precipitation < 40) {
      score += 10;
    }

    // Wind (<20km/h ideal)
    if (weatherData.wind_speed < 20) {
      score += 25;
    } else if (weatherData.wind_speed < 30) {
      score += 10;
    }

    // Weather conditions
    if (['clear sky', 'few clouds'].includes(weatherData.weather_description)) {
      score += 20;
    }

    return score;
  }

  // Get suitability label based on score
  getSuitabilityLabel(score) {
    if (score >= 80) return 'Good';
    if (score >= 50) return 'Okay';
    return 'Poor';
  }

  // Generate analysis text
  generateAnalysisText(score, weatherData, eventType) {
    const suitability = this.getSuitabilityLabel(score);
    const conditions = [];
    
    if (weatherData.temperature) {
      conditions.push(`Temperature: ${weatherData.temperature}°C`);
    }
    if (weatherData.precipitation) {
      conditions.push(`Precipitation: ${weatherData.precipitation}%`);
    }
    if (weatherData.wind_speed) {
      conditions.push(`Wind Speed: ${weatherData.wind_speed} km/h`);
    }
    if (weatherData.weather_description) {
      conditions.push(`Conditions: ${weatherData.weather_description}`);
    }

    return `Weather ${suitability.toLowerCase()} for ${eventType}. ${conditions.join(', ')}`;
  }

  // Get alternative dates with better weather
  async getAlternativeDates(location, startDate, endDate, eventType) {
    try {
      const coordinates = await this.getCoordinates(location);
      if (!coordinates) {
        throw new Error('Location not found');
      }

      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: coordinates.lat,
          lon: coordinates.lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const alternatives = [];
      const currentDate = new Date(startDate);
      const endDateTime = new Date(endDate);

      while (currentDate <= endDateTime) {
        const weatherData = this.transformWeatherData(response.data, currentDate.toISOString());
        const suitability = this.calculateSuitabilityScore(weatherData, eventType);

        if (suitability.score >= 50) { // Only include dates with at least "Okay" weather
          alternatives.push({
            date: currentDate.toISOString(),
            score: suitability.score,
            analysis: suitability.analysis,
            weather_data: weatherData
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return alternatives.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error getting alternative dates:', error);
      throw new Error('Failed to get alternative dates');
    }
  }

  // Cache management
  getCachedWeather(key) {
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  cacheWeatherData(key, data) {
    weatherCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of weatherCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        weatherCache.delete(key);
      }
    }
  }
}

// Expose cache status for debugging
function _getCacheStatus() {
  const status = [];
  for (const [key, value] of weatherCache.entries()) {
    status.push({
      key,
      ageMinutes: Math.round((Date.now() - value.timestamp) / 60000)
    });
  }
  return status;
}

module.exports = Object.assign(new WeatherService(), { _getCacheStatus }); 