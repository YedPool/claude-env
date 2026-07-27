import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // theme.extend is INTENTIONALLY EMPTY. All tokens live in app/globals.css
  // via @theme inline. Two sources of truth = drift.
};

export default config;
