// Environment helper for database initialization
import { database } from './db';

// Cloudflare Pages/Workers environment
export interface CloudflareEnv {
  DB: any; // D1 database binding
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_PUBLIC_URL?: string;
  ADMIN_PASSWORD?: string;
}

// Initialize database based on environment
export function initializeDatabase(env?: CloudflareEnv) {
  if (env?.DB) {
    // Cloudflare D1 environment
    console.log('Initializing D1 database');
    database.initD1(env.DB);
  } else {
    // Local development or other environments
    console.log('Using local/memory database');
    // database.init() will be called automatically when needed
  }
}

// Helper to check if we're in Cloudflare environment
export function isCloudflareEnvironment(): boolean {
  return typeof process !== 'undefined' && (
    !!process.env.CF_PAGES ||
    !!process.env.CLOUDFLARE_WORKERS ||
    typeof globalThis !== 'undefined' && 'caches' in globalThis
  );
}