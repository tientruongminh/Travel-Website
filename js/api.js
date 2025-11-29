// API Client for Travel Website
// Centralized API calls with error handling and fallback

class TravelAPI {
    constructor() {
        this.baseURL = window.CONFIG?.API_URL || 'http://localhost:8787';
        this.useAPI = window.CONFIG?.USE_API || false;
        this.fallbackToLocal = window.CONFIG?.FALLBACK_TO_LOCAL !== false;
        this.cache = new Map();
        this.cacheDuration = window.CONFIG?.CACHE_DURATION || 5 * 60 * 1000;
    }

    // Generic fetch with error handling
    async fetch(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        try {
            window.debugLog?.(`Fetching: ${url}`);

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Get all spots with caching
    async getSpots(params = {}) {
        if (!this.useAPI) {
            return this.getLocalSpots();
        }

        const cacheKey = 'spots-' + JSON.stringify(params);

        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheDuration) {
                window.debugLog?.('Using cached spots');
                return cached.data;
            }
        }

        try {
            const query = new URLSearchParams(params).toString();
            const result = await this.fetch(`/api/spots${query ? '?' + query : ''}`);

            // Cache result
            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now(),
            });

            return result.data;
        } catch (error) {
            if (this.fallbackToLocal) {
                console.warn('API failed, falling back to local data');
                return this.getLocalSpots();
            }
            throw error;
        }
    }

    // Get single spot
    async getSpot(id) {
        if (!this.useAPI) {
            return this.getLocalSpot(id);
        }

        try {
            const result = await this.fetch(`/api/spots/${id}`);
            return result.data;
        } catch (error) {
            if (this.fallbackToLocal) {
                return this.getLocalSpot(id);
            }
            throw error;
        }
    }

    // Create new spot
    async createSpot(spotData) {
        if (!this.useAPI) {
            return this.saveLocalSpot(spotData);
        }

        try {
            const result = await this.fetch('/api/spots', {
                method: 'POST',
                body: JSON.stringify(spotData),
            });

            // Clear cache
            this.clearCache();

            return result;
        } catch (error) {
            if (this.fallbackToLocal) {
                return this.saveLocalSpot(spotData);
            }
            throw error;
        }
    }

    // Get reviews for a spot
    async getReviews(spotId) {
        if (!this.useAPI) {
            return this.getLocalReviews(spotId);
        }

        try {
            const result = await this.fetch(`/api/reviews/${spotId}`);
            return result.data;
        } catch (error) {
            if (this.fallbackToLocal) {
                return this.getLocalReviews(spotId);
            }
            throw error;
        }
    }

    // Create review
    async createReview(spotId, reviewData) {
        if (!this.useAPI) {
            return this.saveLocalReview(spotId, reviewData);
        }

        try {
            const result = await this.fetch(`/api/reviews/${spotId}`, {
                method: 'POST',
                body: JSON.stringify(reviewData),
            });
            return result;
        } catch (error) {
            if (this.fallbackToLocal) {
                return this.saveLocalReview(spotId, reviewData);
            }
            throw error;
        }
    }

    // Upload image
    async uploadImage(file) {
        if (!this.useAPI) {
            return this.convertToBase64(file);
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseURL}/api/upload/image`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            return result.data;
        } catch (error) {
            if (this.fallbackToLocal) {
                return this.convertToBase64(file);
            }
            throw error;
        }
    }

    // ============================================
    // LOCAL FALLBACK METHODS
    // ============================================

    async getLocalSpots() {
        const response = await fetch('data/spots.json');
        const spots = await response.json();

        // Merge with user spots from localStorage
        const userSpots = JSON.parse(localStorage.getItem('qn_user_spots') || '[]');
        return [...spots, ...userSpots];
    }

    async getLocalSpot(id) {
        const spots = await this.getLocalSpots();
        return spots.find(s => s.id === id);
    }

    saveLocalSpot(spotData) {
        const userSpots = JSON.parse(localStorage.getItem('qn_user_spots') || '[]');
        userSpots.push(spotData);
        localStorage.setItem('qn_user_spots', JSON.stringify(userSpots));
        return { success: true, data: spotData };
    }

    getLocalReviews(spotId) {
        const reviews = JSON.parse(localStorage.getItem(`reviews_${spotId}`) || '[]');
        return reviews;
    }

    saveLocalReview(spotId, reviewData) {
        const reviews = JSON.parse(localStorage.getItem(`reviews_${spotId}`) || '[]');
        reviews.push({
            ...reviewData,
            created_at: new Date().toISOString(),
        });
        localStorage.setItem(`reviews_${spotId}`, JSON.stringify(reviews));
        return { success: true };
    }

    convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ url: e.target.result, type: 'image' });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
}

// Create global instance
window.TravelAPI = new TravelAPI();
