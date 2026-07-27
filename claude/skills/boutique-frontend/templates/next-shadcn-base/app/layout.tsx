import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// PLACEHOLDERS - replace with the project's chosen faces in Stage 0.
// The variable names stay; only the imports change.
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

export const metadata = {
  title: "{{BRAND}}",
  description: "{{BRAND}} - portfolio-grade mockup",
};

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
