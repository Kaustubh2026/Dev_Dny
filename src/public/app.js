// API URL
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const eventForm = document.getElementById('eventForm');
const eventsList = document.getElementById('eventsList');
const loadingIndicator = document.getElementById('loadingIndicator');
const alternativesModal = document.getElementById('alternativesModal');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    // Modal close button event
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('alternativesModal').classList.add('hidden');
        });
    }
});

eventForm.addEventListener('submit', handleEventSubmit);

// Handle event form submission
async function handleEventSubmit(e) {
    e.preventDefault();
    showLoading();

    const formData = {
        name: document.getElementById('eventName').value,
        location: document.getElementById('location').value,
        date: document.getElementById('date').value,
        event_type: document.getElementById('eventType').value,
        category: document.getElementById('category').value
    };

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Event created:', result);
        
        // Clear form
        this.reset();
        
        // Reload events
        await loadEvents();
        
        // Show success message
        showNotification('Event created successfully!', 'success');
    } catch (error) {
        console.error('Error creating event:', error);
        showNotification('Error creating event: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Load events
async function loadEvents() {
    showLoading();
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';

        data.data.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-card';
            eventElement.innerHTML = createEventCard(event);
            eventsList.appendChild(eventElement);
        });
    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Error loading events: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Display events
function displayEvents(events) {
    if (!events || events.length === 0) {
        eventsList.innerHTML = '<p class="text-center text-gray-500">No events found</p>';
        return;
    }

    eventsList.innerHTML = events.map(event => createEventCard(event)).join('');
}

// Create event card
function createEventCard(event) {
    const weatherData = event.weather_data?.[0];
    const analysis = event.event_weather_analysis?.[0];
    let suitabilityLabel = '';
    let suitabilityClass = '';
    if (analysis) {
        if (analysis.weather_score >= 80) {
            suitabilityLabel = 'Good';
            suitabilityClass = 'suitability-badge suitability-good';
        } else if (analysis.weather_score >= 50) {
            suitabilityLabel = 'Okay';
            suitabilityClass = 'suitability-badge suitability-okay';
        } else {
            suitabilityLabel = 'Poor';
            suitabilityClass = 'suitability-badge suitability-poor';
        }
    }
    return `
        <div class="event-card">
            <div class="event-header">
                <h3 class="event-title">${event.name}</h3>
                ${analysis ? `<span class="${suitabilityClass}">${suitabilityLabel}</span>` : ''}
            </div>
            <div class="event-details">
                <div>${event.location}</div>
                <div>${new Date(event.date).toLocaleString()}</div>
                <div>Type: ${event.event_type}</div>
                <div>Category: ${event.category}</div>
            </div>
            ${weatherData ? `
                <div class="weather-grid">
                    <div><span class="weather-label">Temperature</span><br><span class="weather-value">${weatherData.temperature}°C</span></div>
                    <div><span class="weather-label">Precipitation</span><br><span class="weather-value">${weatherData.precipitation}%</span></div>
                    <div><span class="weather-label">Wind Speed</span><br><span class="weather-value">${weatherData.wind_speed} km/h</span></div>
                    <div><span class="weather-label">Conditions</span><br><span class="weather-value">${weatherData.weather_condition}</span></div>
                </div>
            ` : ''}
            ${analysis ? `
                <div class="analysis">${analysis.analysis_text}</div>
            ` : ''}
            <button onclick="checkAlternatives(${event.id})" class="btn">Check Alternatives</button>
        </div>
    `;
}

// Check alternative dates
async function checkAlternatives(eventId) {
    showLoading();
    try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const response = await fetch(
            `${API_URL}/events/${eventId}/alternatives?` +
            `start_date=${startDate.toISOString()}&` +
            `end_date=${endDate.toISOString()}`
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to get alternatives');
        }

        if (result.data.length === 0) {
            displayAlternatives([]);
            showNotification(result.message || 'No suitable alternatives found.', 'info');
        } else {
            displayAlternatives(result.data);
            alternativesModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error checking alternatives:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Display alternatives
function displayAlternatives(alternatives) {
    const alternativesList = document.getElementById('alternativesList');
    if (!alternatives || alternatives.length === 0) {
        alternativesList.innerHTML = '<p class="text-center text-gray-500">No suitable alternatives found</p>';
        return;
    }

    alternativesList.innerHTML = alternatives.map(alt => `
        <div class="bg-white rounded-lg shadow-md p-4 mb-2">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-semibold">${new Date(alt.date).toLocaleString()}</p>
                    <p class="text-sm text-gray-600">${alt.analysis}</p>
                </div>
                <div class="text-right">
                    <div class="inline-block px-3 py-1 rounded-full text-sm font-semibold
                        ${alt.score >= 80 ? 'bg-green-100 text-green-800' :
                        alt.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}">
                        Score: ${alt.score}
                    </div>
                </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                    <p class="text-gray-600">Temperature</p>
                    <p class="font-semibold">${alt.weather_data.temperature}°C</p>
                </div>
                <div>
                    <p class="text-gray-600">Precipitation</p>
                    <p class="font-semibold">${alt.weather_data.precipitation}%</p>
                </div>
                <div>
                    <p class="text-gray-600">Wind Speed</p>
                    <p class="font-semibold">${alt.weather_data.wind_speed} km/h</p>
                </div>
                <div>
                    <p class="text-gray-600">Conditions</p>
                    <p class="font-semibold">${alt.weather_data.weather_condition}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    } text-white`;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Show loading indicator
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

// Hide loading indicator
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
} 