const express = require('express');
const router = express.Router();
const axios = require('axios');

const OPENWEATHER_API_KEY = 'e67ccacc99704e84c8cc5bb3758f294b';

// Get current weather for a location
router.get('/:location', async (req, res) => {
    try {
        const { location } = req.params;
        
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                q: location,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });

        res.json({
            status: 'success',
            data: {
                location: response.data.name,
                temperature: response.data.main.temp,
                humidity: response.data.main.humidity,
                wind_speed: response.data.wind.speed,
                weather: response.data.weather[0].main,
                description: response.data.weather[0].description,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Weather API error:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch weather data'
        });
    }
});

// Get 5-day forecast for a location
router.get('/:location/forecast', async (req, res) => {
    try {
        const { location } = req.params;
        
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
            params: {
                q: location,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });

        // Process the forecast data to get daily averages
        const dailyForecasts = {};
        response.data.list.forEach(forecast => {
            const date = new Date(forecast.dt * 1000).toISOString().split('T')[0];
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    temperatures: [],
                    humidities: [],
                    wind_speeds: [],
                    weather_conditions: new Set()
                };
            }
            
            dailyForecasts[date].temperatures.push(forecast.main.temp);
            dailyForecasts[date].humidities.push(forecast.main.humidity);
            dailyForecasts[date].wind_speeds.push(forecast.wind.speed);
            dailyForecasts[date].weather_conditions.add(forecast.weather[0].main);
        });

        // Calculate averages and format response
        const formattedForecast = Object.entries(dailyForecasts).map(([date, data]) => ({
            date,
            temperature: {
                average: data.temperatures.reduce((a, b) => a + b) / data.temperatures.length,
                min: Math.min(...data.temperatures),
                max: Math.max(...data.temperatures)
            },
            humidity: {
                average: data.humidities.reduce((a, b) => a + b) / data.humidities.length,
                min: Math.min(...data.humidities),
                max: Math.max(...data.humidities)
            },
            wind_speed: {
                average: data.wind_speeds.reduce((a, b) => a + b) / data.wind_speeds.length,
                min: Math.min(...data.wind_speeds),
                max: Math.max(...data.wind_speeds)
            },
            weather_conditions: Array.from(data.weather_conditions)
        }));

        res.json({
            status: 'success',
            data: {
                location: response.data.city.name,
                forecast: formattedForecast
            }
        });
    } catch (error) {
        console.error('Weather API error:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch weather forecast'
        });
    }
});

module.exports = router; 