// Configuration for API integration
const CONFIG = {
    // Feature flags - HYBRID ARCHITECTURE
    USE_API: false, // Static spots from local JSON (fast, free)
    USE_API_FOR_DYNAMIC: true, // Reviews, uploads, users from database

    // API Configuration
    API_URL: 'https://travel-api.truongminhtien07122005.workers.dev', // Production Workers URL

    // Fallback to local data if API fails
    FALLBACK_TO_LOCAL: true,

    // Cache settings
    CACHE_ENABLED: true,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    // Debug mode
    DEBUG: window.location.hostname === 'localhost',
};

// Helper function to log only in debug mode
window.debugLog = function (...args) {
    if (CONFIG.DEBUG) {
        console.log('[DEBUG]', ...args);
    }
};

// Export config
window.CONFIG = CONFIG;
