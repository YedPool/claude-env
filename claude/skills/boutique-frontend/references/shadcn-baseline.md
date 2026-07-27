# shadcn + Tailwind v4 Baseline

The canonical token + font + dark-mode setup for boutique mockups.

This is **stratum** - the single source of truth for design tokens. No
`tailwind.config.ts` token entries. No second source. shadcn primitives,
v0 output, and (mostly) Magic output all reference these CSS variable names
natively, so seeding this once means later components flip automatically
when you change a value.

## `app/globals.css` (the source of truth)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-boutique-sans);
  --font-serif: var(--font-boutique-serif);
  --font-mono: var(--font-boutique-mono);
}

:root {
  --radius: 0.625rem;
  /* REPLACE THESE with the boutique palette for the project. Defaults
     are shadcn's OKLCH starting point - DO NOT SHIP THEM. */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* mirror all the above tokens for dark mode */
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground font-sans; }
}
```

## `app/layout.tsx` (font wiring)

```tsx
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// REPLACE these three with the project's chosen faces. Never ship the
// defaults below. The names below are placeholders for the wiring pattern.
const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-boutique-sans",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-boutique-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-boutique-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## `tailwind.config.ts` (deliberately empty of tokens)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // theme.extend is INTENTIONALLY EMPTY. All tokens live in globals.css
  // via @theme inline. Two sources of truth = drift.
};

export default config;
```

## `components.json` (shadcn config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  }
}
```

## Why this layout

- **Token override propagates everywhere.** Change a `--color-primary` in
  globals.css and every shadcn primitive, every v0-emitted component, and
  every Tailwind utility class (`bg-primary`, etc.) flips automatically.
- **Font override is one place.** `font-sans` Tailwind utility resolves to
  `--font-sans` -> `--font-boutique-sans` -> the `next/font` import. Generators
  that emit `font-sans` flip to your face without any rewrites.
- **Dark mode is one strategy.** shadcn's `.dark` class on `<html>`, toggled
  by `next-themes`. Magic's occasional `[data-theme="dark"]` is rewritten to
  `.dark` by the normalize script.
- **No tailwind.config token drift.** v3 split tokens between config and CSS;
  v4 + shadcn collapsed them into CSS only. We honor that.

## Dark variant mirror (template)

When you set the boutique palette, you MUST mirror every token in the `.dark`
block. Copy this pattern:

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
```
