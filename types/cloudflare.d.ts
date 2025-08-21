// Cloudflare D1 and environment types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<any>[]>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first(): Promise<any>;
  all(): Promise<D1Result<any>>;
  run(): Promise<D1Result<any>>;
}

export interface D1Result<T = any> {
  success: boolean;
  results: T[];
  meta: {
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface CloudflareEnv {
  DB: D1Database;
  R2_BUCKET?: R2Bucket;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_PUBLIC_URL?: string;
  R2_REGION?: string;
  ADMIN_PASSWORD?: string;
}

export interface R2Bucket {
  put(key: string, value: ArrayBuffer | ArrayBufferView | string, options?: R2PutOptions): Promise<R2Object>;
  get(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}

export interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    contentLanguage?: string;
    cacheControl?: string;
  };
  customMetadata?: Record<string, string>;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
  };
}

// Make D1Database available globally
declare global {
  type D1Database = import('./cloudflare').D1Database;
  type CloudflareEnv = import('./cloudflare').CloudflareEnv;
}