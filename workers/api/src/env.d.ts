// Environment bindings for Cloudflare Workers
export interface Env {
    // D1 Database
    DB: D1Database;

    // R2 Storage for images
    IMAGES?: R2Bucket;

    // KV for sessions/cache
    KV: KVNamespace;

    // Secrets
    JWT_SECRET: string;
    STREAM_API_KEY?: string;
    STREAM_ACCOUNT_ID?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;

    // Variables
    ENVIRONMENT: string;
    FRONTEND_URL: string;
}

// JWT Payload type
export interface JwtPayload {
    userId: number;
    email: string;
    name?: string;
    avatar?: string;
    role: 'user' | 'admin';
    exp: number;
}

// Context variables type
export type ContextVariables = {
    user?: JwtPayload;
};

// Database types
export interface Spot {
    id: string;
    name: string;
    category: 'tour' | 'service' | 'event';
    type: 'play' | 'eat' | 'stay';
    lat: number;
    lng: number;
    address?: string;
    hours?: string;
    description?: string;
    thumbnail?: string;
    created_by?: number;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    email: string;
    password_hash?: string;
    name?: string;
    avatar?: string;
    google_id?: string;
    provider: 'email' | 'google';
    email_verified: boolean;
    last_login?: string;
    role: 'user' | 'admin';
    created_at: string;
    updated_at: string;
}

export interface Review {
    id: number;
    user_id: number;
    spot_id: string;
    rating: number;
    text?: string;
    created_at: string;
    updated_at: string;
}

export interface Media {
    id: number;
    type: 'image' | 'video' | 'youtube';
    url: string;
    r2_key?: string;
    stream_id?: string;
    spot_id?: string;
    review_id?: number;
    uploaded_by?: number;
    created_at: string;
}

// API Response types
export interface SpotWithMedia extends Spot {
    media?: Media[];
    reviews?: Review[];
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
