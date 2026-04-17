export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  /** Comma-separated allowed origins, e.g. http://localhost:4321,https://www.example.com */
  CORS_ORIGIN?: string;
  META_ACCESS_TOKEN?: string;
  INSTAGRAM_USER_ID?: string;
};
