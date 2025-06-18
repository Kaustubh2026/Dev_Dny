# Smart Event Planner Backend

A backend service that helps users plan outdoor events by integrating weather forecasts and providing intelligent recommendations for optimal event timing and locations.

## Features

- Weather API integration with OpenWeatherMap
- Event management system with weather analysis
- Weather suitability scoring for different event types
- Alternative date recommendations based on weather conditions
- Supabase database integration for data persistence

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- OpenWeatherMap API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-event-planner
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
OPENWEATHER_API_KEY=your_openweather_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase database:
   - Create a new project in Supabase
   - Create a table named `events` with the following schema:
   ```sql
   create table events (
     id uuid default uuid_generate_v4() primary key,
     name text not null,
     location text not null,
     date date not null,
     event_type text not null,
     weather_data jsonb,
     suitability_score text,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null
   );
   ```

5. Start the server:
```bash
npm run dev
```

## API Endpoints

### Event Management

- `POST /events` - Create a new event
  ```json
  {
    "name": "Cricket Tournament",
    "location": "Mumbai",
    "date": "2024-03-16",
    "event_type": "cricket"
  }
  ```

- `GET /events` - List all events
- `PUT /events/:id` - Update event details
- `GET /events/:id/suitability` - Get weather suitability for an event
- `GET /events/:id/alternatives` - Get alternative dates with better weather
  ```
  Query parameters:
  - start_date: YYYY-MM-DD
  - end_date: YYYY-MM-DD
  ```

### Weather Integration

- `GET /weather/:location/:date` - Get weather for specific location and date

## Event Types and Weather Requirements

The system supports different event types with specific weather requirements:

1. Cricket/Sports Events:
   - Temperature: 15-30°C
   - Precipitation: < 20%
   - Wind Speed: < 20 km/h
   - Weather: Clear/Partly cloudy

2. Wedding/Formal Events:
   - Temperature: 18-28°C
   - Precipitation: < 10%
   - Wind Speed: < 15 km/h
   - Weather: Clear/Partly cloudy

3. Hiking Events:
   - Temperature: 10-25°C
   - Precipitation: < 15%
   - Wind Speed: < 25 km/h
   - Weather: Clear/Partly cloudy

## Error Handling

The API includes comprehensive error handling for:
- Invalid input data
- API rate limits
- Weather service errors
- Database errors

## Testing

You can test the API using the provided Postman collection or any API testing tool. Example test scenarios:

1. Create a cricket tournament in Mumbai
2. Create a wedding event in Goa
3. Create a hiking trip in Lonavala
4. Check weather suitability for each event
5. Get alternative dates for events with poor weather

## 🚀 Deployment (Render)

1. **Push your code to GitHub.**
2. **Create a free account at [https://render.com/](https://render.com/)**
3. **Click "New +" > "Web Service" and connect your GitHub repo.**
4. **Configure:**
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variables:
     - `OPENWEATHER_API_KEY` (from your OpenWeatherMap account)
     - `SUPABASE_URL` (from your Supabase project)
     - `SUPABASE_ANON_KEY` (from your Supabase project)
   - (Optional) Use the provided `render.yaml` for auto-setup.
5. **Deploy and get your public URL!**
6. **Update your Postman collection to use the new URL.**

## 🧪 Postman Testing Instructions

1. Open Postman (desktop or web).
2. Import the file `WeatherEventPlanner.postman_collection.json`.
3. If running locally, use `http://localhost:3000`. If deployed, use your Render URL (e.g., `https://your-app.onrender.com`).
4. Run the requests in each folder:
   - Event Management: Create, list, update events
   - Weather Integration: Get weather, check suitability, alternatives, cache status
   - Error Handling: Try invalid locations, simulate API downtime
5. Check the responses for correct weather-based recommendations and error handling.

---

**For any issues, check your Render logs and make sure your environment variables are set correctly!**

## License

MIT 