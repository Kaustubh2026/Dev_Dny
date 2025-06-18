const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// Get weather for a specific location and date
router.get('/:location/:date', async (req, res) => {
  try {
    const { location, date } = req.params;
    const weatherData = await weatherService.getWeatherByLocation(location, date);

    res.json({
      status: 'success',
      data: weatherData
    });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Cache status endpoint
router.get('/cache-status', (req, res) => {
  try {
    const cache = require('../services/weatherService')._getCacheStatus?.();
    res.json({
      status: 'success',
      data: cache || 'Cache status not available'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router; 