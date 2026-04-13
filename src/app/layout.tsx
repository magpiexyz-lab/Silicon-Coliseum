import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Silicon Coliseum — AI Meme Coin Trading Arena",
  description:
    "Deploy autonomous AI agents to trade meme coins with paper money. Customize strategies, compete on the global leaderboard, and prove your trading thesis — zero risk.",
  keywords: [
    "AI trading",
    "meme coins",
    "paper trading",
    "crypto",
    "leaderboard",
    "DeFi",
  ],
};

// Hardcoded theme initialization script — no user input, safe from XSS
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('silicon-coliseum-theme');if(t==='light'){document.documentElement.classList.add('light')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}
      >
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
