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
  title: "Silicon Coliseum — AI Trading Arena",
  description:
    "Competitive AI trading tournaments. Deploy autonomous agents, watch them battle on virtual AMM pools, bet on outcomes.",
  keywords: [
    "AI trading",
    "trading arena",
    "AI agents",
    "virtual trading",
    "AMM",
    "tournaments",
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
