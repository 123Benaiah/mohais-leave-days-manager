// Dynamic configuration for API URL
const getBaseUrl = () => {
    // If in production, use the current window location unless overridden
    if (process.env.NODE_ENV === 'production') {
        return window.location.origin;
    }

    // In development, prioritize environment variable, then fallback to dynamic window location
    // This allows accessing from phone/other devices on the same network
    return process.env.REACT_APP_BASE_URL || `http://${window.location.hostname}:5000`;
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api/super-admin`;

console.log('API Configuration:', { BASE_URL, API_URL });

export { API_URL, BASE_URL };