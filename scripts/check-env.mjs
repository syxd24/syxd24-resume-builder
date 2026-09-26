import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const environmentPath = resolve(".env.local");

function fail(message) {
  console.error(`Environment check failed: ${message}`);
  process.exit(1);
}

if (!existsSync(environmentPath)) fail(".env.local is missing. Copy .env.example and add the server-only Supabase secret.");

const values = new Map();
for (const sourceLine of readFileSync(environmentPath, "utf8").split(/\r?\n/)) {
  const line = sourceLine.trim();
  if (!line || line.startsWith("#")) continue;
  const separator = line.indexOf("=");
  if (separator < 1) continue;
  const key = line.slice(0, separator).trim();
  const raw = line.slice(separator + 1).trim();
  const value = (/^(['"]).*\1$/.test(raw) ? raw.slice(1, -1) : raw).trim();
  values.set(key, value);
}

for (const key of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "APP_URL"]) {
  if (!values.get(key)) fail(`${key} is required in .env.local.`);
}

let supabaseUrl;
let appUrl;
try {
  supabaseUrl = new URL(values.get("SUPABASE_URL"));
  appUrl = new URL(values.get("APP_URL"));
} catch {
  fail("SUPABASE_URL and APP_URL must be valid absolute URLs.");
}

if (supabaseUrl.protocol !== "https:" || !supabaseUrl.hostname.endsWith(".supabase.co")) {
  fail("SUPABASE_URL must be the project's https://<project-ref>.supabase.co URL.");
}
if (!["http:", "https:"].includes(appUrl.protocol)) fail("APP_URL must use http or https.");

const secret = values.get("SUPABASE_SECRET_KEY");
let trustedServerKey = secret.startsWith("sb_secret_");
if (!trustedServerKey && secret.split(".").length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(secret.split(".")[1], "base64url").toString("utf8"));
    trustedServerKey = payload.role === "service_role";
  } catch {
    trustedServerKey = false;
  }
}
if (!trustedServerKey) fail("SUPABASE_SECRET_KEY must be a modern sb_secret_ key or legacy service_role JWT, never an anon/publishable key.");

for (const key of values.keys()) {
  if (/^NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE)/i.test(key)) fail(`${key} would expose privileged credentials to the browser.`);
}

console.log("Environment check passed: Supabase URL, server-only secret, and app URL are configured (values hidden).");
