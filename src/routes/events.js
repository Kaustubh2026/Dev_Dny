const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const weatherService = require('../services/weatherService');

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

        // Get weather data for the event
        const weatherData = await weatherService.getWeatherByLocation(location, date);
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
                    temperature: weatherData.temperature,
                    humidity: weatherData.humidity,
                    wind_speed: weatherData.wind_speed,
                    precipitation: weatherData.precipitation,
                    weather_condition: weatherData.weather_description,
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

        if (error) throw error;

        res.json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
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

            const weatherData = await weatherService.getWeatherByLocation(newLocation, newDate);
            const suitability = weatherService.calculateSuitabilityScore(weatherData, newEventType);

            // Update weather data
            await supabase
                .from('weather_data')
                .update({
                    temperature: weatherData.temperature,
                    humidity: weatherData.humidity,
                    wind_speed: weatherData.wind_speed,
                    precipitation: weatherData.precipitation,
                    weather_condition: weatherData.weather_description,
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

        if (error) throw error;

        res.json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get weather suitability for an event
router.get('/:id/suitability', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                weather_data (*),
                event_weather_analysis (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Error getting event suitability:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
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

        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !event) {
            console.error('Event not found or DB error:', error);
            return res.status(404).json({
                status: 'error',
                message: 'Event not found'
            });
        }

        let alternatives = [];
        try {
            alternatives = await weatherService.getAlternativeDates(
                event.location,
                start_date,
                end_date,
                event.event_type
            );
        } catch (weatherError) {
            console.error('Weather API error:', weatherError);
            return res.status(502).json({
                status: 'error',
                message: 'Weather service error: ' + weatherError.message
            });
        }

        if (!alternatives || alternatives.length === 0) {
            return res.status(200).json({
                status: 'success',
                data: [],
                message: 'No suitable alternative dates found for this event.'
            });
        }

        res.json({
            status: 'success',
            data: alternatives
        });
    } catch (error) {
        console.error('Error getting alternative dates:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Unknown error occurred.'
        });
    }
});

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
        const weatherData = await weatherService.getWeatherByLocation(event.location, event.date);
        const suitability = weatherService.calculateSuitabilityScore(weatherData, event.event_type);

        // Update weather_data
        await supabase
            .from('weather_data')
            .update({
                temperature: weatherData.temperature,
                humidity: weatherData.humidity,
                wind_speed: weatherData.wind_speed,
                precipitation: weatherData.precipitation,
                weather_condition: weatherData.weather_description,
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