import { config } from "dotenv";
import path from "node:path";

// Loads local Supabase connection details for the integration tests. See
// .env.test.example for what this needs and how to get it. Silently does
// nothing if the file doesn't exist (e.g. in CI, where these would be set as
// real environment variables instead).
config({ path: path.resolve(import.meta.dirname, "../.env.test.local") });
