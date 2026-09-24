export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  MAIL: SendEmail;
  APP_URL: string;
  MAIL_FROM: string;
  /** Comma-separated addresses allowed to sign in. Set with `wrangler secret put ALLOWED_EMAILS`. */
  ALLOWED_EMAILS: string;
  /** Local only (.dev.vars): act as this address and skip sign-in. */
  DEV_EMAIL?: string;
  /** Local only (.dev.vars): return the sign-in code in the response, for testing. */
  DEV_SHOW_CODE?: string;
}
