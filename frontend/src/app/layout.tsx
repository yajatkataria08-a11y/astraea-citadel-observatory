import type { Metadata } from "next";
import { Cinzel, Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/navigation/AuthGate";
import { ApiStatusBanner } from "@/components/ui/ApiStatusBanner";
import { CosmicStarfield } from "@/components/astronomy/CosmicStarfield";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASTRÆA Citadel Observatory // Exoplanet & Sky Change Explorer",
  description: "Next-Generation Astrometric Vetting, SPHEREx 102-Channel Spectrophotometry, TESS/Kepler Vetting & SHAP AI Attribution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark jungo" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('exo-theme')||'jungo';document.documentElement.classList.remove('dark','light','jungo','urja');if(t==='jungo'){document.documentElement.classList.add('dark','jungo');}else if(t==='urja'){document.documentElement.classList.add('light','urja');}else{document.documentElement.classList.add(t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${cinzel.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col font-sans selection:bg-amber-500/25 selection:text-amber-300`}
      >
        <ThemeProvider>
          <AuthProvider>
          {/* Ambient Cosmic Mesh Nebulae (GPU Accelerated) */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute -top-32 left-1/4 size-[600px] rounded-full bg-[#DDD6FE]/35 dark:bg-[#1E2761]/35 blur-[120px] animate-nebula transform-gpu" />
            <div className="absolute top-1/3 -right-20 size-[500px] rounded-full bg-[#DDD6FE]/25 dark:bg-[#5C1D42]/25 blur-[130px] animate-nebula transform-gpu" style={{ animationDelay: "-5s" }} />
            <div className="absolute -bottom-20 left-10 size-[550px] rounded-full bg-[#3B82F6]/10 dark:bg-[#2E4A9E]/20 blur-[140px] animate-nebula transform-gpu" style={{ animationDelay: "-10s" }} />
          </div>

          {/* Real-time Dynamic Starfield with Glowing Twinkles & Random Shooting Stars */}
          <CosmicStarfield />

          <Navbar />
          <div className="flex-1 flex flex-col relative z-10">
            <AuthGate>{children}</AuthGate>
          </div>
          <ApiStatusBanner />
          <Footer />
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
