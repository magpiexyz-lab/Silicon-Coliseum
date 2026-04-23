import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
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
          // Safe: hardcoded string constant, no user input
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}
      >
        <AuthProvider>
          <Navbar />
          <main className="pt-14">{children}</main>
        </AuthProvider>
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
