# WeatherApp

A lightweight, single-page weather application built with vanilla HTML/CSS/JavaScript. It fetches current conditions and forecasts with graceful fallbacks and displays responsive, animated weather visuals.

## Live Demo

Visit the deployed app here: https://weathertoday-nine.vercel.app/

## Features

- Current weather with feels-like, humidity, wind, sunrise/sunset
- Five-day forecast and a compact hourly strip
- UV index (via Open-Meteo hourly data)
- Location search with robust geocoding
- Use current location (browser Geolocation API) with reverse geocoding to a human-friendly label
- Smart fallbacks when the primary API is unavailable
- Responsive layout and subtle animated weather effects (rain, snow, clouds, sun rays)
- Works without a build step; just open `index.html`

## Tech Stack

- HTML5, CSS3 (no frameworks)
- Vanilla JavaScript (no runtime dependencies)
- Data sources:
  - OpenWeatherMap (current weather, 5-day forecast)
  - Open-Meteo (current weather fallback, UV index)
  - OpenStreetMap Nominatim (search + reverse geocoding)

## Getting Started

### Prerequisites

- A modern browser with JavaScript enabled
- Optional but recommended: an OpenWeatherMap API key

### Run Locally

1. Clone or download the project.
2. Open `index.html` directly in your browser.
   - Tip on Windows: Right-click `index.html` → Open With → your browser.

No build step or server is required. All network requests are made from the browser.

## Configuration

The app can use your OpenWeatherMap API key if provided. A default key is present for convenience and demos.

- Option A: Replace the default key in `script.js` by editing `DEFAULT_API_KEY`.
- Option B: If you have UI inputs for a key in a fork, enter the key there. In this version, UI for API key storage is disabled, so Option A is the way to go.

If no valid OpenWeatherMap key is available, the app automatically falls back to Open-Meteo for current conditions and forecast, with some data (like humidity) omitted when not provided by the fallback endpoint.

## Usage

- Search a city in the input field and press “Tìm” (Search).
- Click the arrow button to use the current device location.
- The background and subtle effects adapt to conditions: rain, snow, clouds, sunny.

Notes:
- The UI labels are in Vietnamese by default.
- The app may request location permission to provide current-location weather.

## Project Structure

- `index.html` — Markup and root containers
- `style.css` — Responsive layout and animated weather effects
- `script.js` — Fetching, rendering, geocoding, fallbacks, and utilities
- `weather.png`, `cloud.png` — Icons/assets for branding and cloud effects

## Data & Fallback Strategy

1. When an OpenWeatherMap API key is available:
   - Fetch current weather and 5-day forecast from OpenWeatherMap
   - Fetch UV index from Open-Meteo hourly data
2. On errors or when no key is configured:
   - Use Open-Meteo for current weather and 5-day daily forecast
   - UV may still be derived from Open-Meteo hourly data when available

Location resolution:
- City search: OpenStreetMap Nominatim → coordinates and a clean display label
- Reverse geocoding (current location): Nominatim → city/province/country label

## Accessibility & Performance

- Semantic roles, ARIA live regions for status updates
- Reduced motion respected via `prefers-reduced-motion`
- Responsive grid; mobile-first refinements

## Privacy

- If you enable geolocation, the browser shares approximate coordinates with the app to fetch weather. Coordinates are not sent anywhere other than the weather/geocoding providers used to retrieve results.
- Some lightweight usage of `localStorage` is used (e.g., last coordinates cache). Clear your browser storage to remove cached values.

## Troubleshooting

- Empty or partial data: Check network tab for API errors or rate limits.
- Location not available: Ensure browser permissions allow geolocation, or enter a city manually.
- UV index shows “—” or 0.0: It may be outside provider coverage or not available for the current hour.

## Acknowledgements

- Weather data by OpenWeatherMap and Open-Meteo
- Geocoding by OpenStreetMap Nominatim


