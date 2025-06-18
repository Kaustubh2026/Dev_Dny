const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const weatherService = require('../services/weatherService');

// Initialize Supabase client
const supabaseUrl = 'https://vcpgstlpfrmnadjuxipj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcGdzdGxwZnJtbmFkanV4aXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDkzNzksImV4cCI6MjA2NTgyNTM3OX0.fQWmfrMEM2kbqrF47dknzVmRGZ4lZSaATwijQn07uc0';
const OPENWEATHER_API_KEY = 'e67ccacc99704e84c8cc5bb3758f294b';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get weather data
async function getWeatherData(location, date) {
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
            params: {
                q: location,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Weather API error:', error.response?.data || error.message);
        throw new Error('Failed to fetch weather data');
    }
}

// Create a new event
router.post('/', async (req, res) => {
    try {
        const { name, location, date, event_type, category } = req.body;

        if (!name || !location || !date || !event_type || !category) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Validate date format
        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid date format'
            });
        }

        // Get weather data for the event
        const weatherData = await getWeatherData(location, date);
        const suitability = weatherService.calculateSuitabilityScore(weatherData, event_type);

        // Start a transaction
        const { data: event, error: eventError } = await supabase
            .from('events')
            .insert([
                {
                    name,
                    location,
                    date,
                    event_type,
                    category
                }
            ])
            .select()
            .single();

        if (eventError) throw eventError;

        // Insert weather data
        const { error: weatherError } = await supabase
            .from('weather_data')
            .insert([
                {
                    event_id: event.id,
                    temperature: weatherData.list[0].main.temp,
                    humidity: weatherData.list[0].main.humidity,
                    wind_speed: weatherData.list[0].wind.speed,
                    precipitation: weatherData.list[0].pop,
                    weather_condition: weatherData.list[0].weather[0].main,
                    timestamp: new Date(date).toISOString()
                }
            ]);

        if (weatherError) throw weatherError;

        // Insert weather analysis
        const { error: analysisError } = await supabase
            .from('event_weather_analysis')
            .insert([
                {
                    event_id: event.id,
                    weather_score: suitability.score,
                    analysis_text: suitability.analysis
                }
            ]);

        if (analysisError) throw analysisError;

        // Get the complete event data with weather information
        const { data: completeEvent, error: fetchError } = await supabase
            .from('events')
            .select(`
                *,
                weather_data (*),
                event_weather_analysis (*)
            `)
            .eq('id', event.id)
            .single();

        if (fetchError) throw fetchError;

        res.status(201).json({
            status: 'success',
            data: completeEvent
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                weather_data (*),
                event_weather_analysis (*)
            `)
            .order('date', { ascending: true });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        res.json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch events'
        });
    }
});

// Get event by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found'
            });
        }

        res.json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch event'
        });
    }
});

// Update event
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, date, event_type, category } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (location) updateData.location = location;
        if (date) updateData.date = date;
        if (event_type) updateData.event_type = event_type;
        if (category) updateData.category = category;

        // If location or date changed, update weather data
        if (location || date) {
            const event = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single();

            if (event.error) throw event.error;

            const newLocation = location || event.data.location;
            const newDate = date || event.data.date;
            const newEventType = event_type || event.data.event_type;

            const weatherData = await getWeatherData(newLocation, newDate);
            const suitability = weatherService.calculateSuitabilityScore(weatherData, newEventType);

            // Update weather data
            await supabase
                .from('weather_data')
                .update({
                    temperature: weatherData.list[0].main.temp,
                    humidity: weatherData.list[0].main.humidity,
                    wind_speed: weatherData.list[0].wind.speed,
                    precipitation: weatherData.list[0].pop,
                    weather_condition: weatherData.list[0].weather[0].main,
                    timestamp: new Date(newDate).toISOString()
                })
                .eq('event_id', id);

            // Update weather analysis
            await supabase
                .from('event_weather_analysis')
                .update({
                    weather_score: suitability.score,
                    analysis_text: suitability.analysis
                })
                .eq('event_id', id);
        }

        const { data, error } = await supabase
            .from('events')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                weather_data (*),
                event_weather_analysis (*)
            `)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found'
            });
        }

        res.json({
            status: 'success',
            data: data[0]
        });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update event'
        });
    }
});

// Get weather suitability for an event
router.get('/:id/suitability', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (eventError) {
            console.error('Supabase error:', eventError);
            throw eventError;
        }

        if (!event) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found'
            });
        }

        // Get weather data
        const weatherData = await getWeatherData(event.location, event.date);
        
        // Analyze weather suitability
        const suitability = weatherService.calculateSuitabilityScore(weatherData, event.event_type);

        res.json({
            status: 'success',
            data: {
                event,
                weather: weatherData,
                suitability
            }
        });
    } catch (error) {
        console.error('Get suitability error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get weather suitability'
        });
    }
});

// Get alternative dates for an event
router.get('/:id/alternatives', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                status: 'error',
                message: 'Start date and end date are required'
            });
        }

        // Get event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (eventError) {
            console.error('Supabase error:', eventError);
            throw eventError;
        }

        if (!event) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found'
            });
        }

        // Get weather data for the date range
        const weatherData = await getWeatherData(event.location, start_date);
        
        // Find alternative dates
        const alternatives = findAlternativeDates(weatherData, event.event_type, start_date, end_date);

        res.json({
            status: 'success',
            data: {
                event,
                alternatives
            }
        });
    } catch (error) {
        console.error('Get alternatives error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get alternative dates'
        });
    }
});

// Helper function to find alternative dates
function findAlternativeDates(weatherData, eventType, startDate, endDate) {
    const alternatives = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    weatherData.list.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        if (forecastDate >= start && forecastDate <= end) {
            const suitability = weatherService.calculateSuitabilityScore({ list: [forecast] }, eventType);
            if (suitability.score === 'Good') {
                alternatives.push({
                    date: forecastDate.toISOString().split('T')[0],
                    weather: forecast.weather[0].main,
                    temperature: forecast.main.temp,
                    suitability: suitability.analysis
                });
            }
        }
    });

    return alternatives;
}

// Weather check for an existing event
router.post('/:id/weather-check', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch event
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();
        if (eventError || !event) throw eventError || new Error('Event not found');

        // Get new weather data
        const weatherData = await getWeatherData(event.location, event.date);
        const suitability = weatherService.calculateSuitabilityScore(weatherData, event.event_type);

        // Update weather_data
        await supabase
            .from('weather_data')
            .update({
                temperature: weatherData.list[0].main.temp,
                humidity: weatherData.list[0].main.humidity,
                wind_speed: weatherData.list[0].wind.speed,
                precipitation: weatherData.list[0].pop,
                weather_condition: weatherData.list[0].weather[0].main,
                timestamp: new Date(event.date).toISOString()
            })
            .eq('event_id', id);

        // Update event_weather_analysis
        await supabase
            .from('event_weather_analysis')
            .update({
                weather_score: suitability.score,
                analysis_text: suitability.analysis
            })
            .eq('event_id', id);

        // Return updated event
        const { data: updatedEvent, error: fetchError } = await supabase
            .from('events')
            .select(`*, weather_data (*), event_weather_analysis (*)`)
            .eq('id', id)
            .single();
        if (fetchError) throw fetchError;

        res.json({
            status: 'success',
            data: updatedEvent
        });
    } catch (error) {
        console.error('Error in weather-check:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router; 