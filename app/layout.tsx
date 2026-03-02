import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/theme.css";
import "./styles/landing.css";
import DailyXpLoader from "./components/DailyXpLoader";
import GlobalXpSystem from "./components/GlobalXpSystem";
import { AchievementProvider } from "./components/AchievementContext";
import GlobalXpInterceptor from "./components/GlobalXpInterceptor";

/*import Navbar from "../components/Navbar";*/
/*import "../components/Navbar.css";*/
import { CreditsProvider } from "../components/CreditsContext";
import BackgroundFX from "../components/BackgroundFX";
import { NotificationsProvider } from "./dashboard/components/NotificationsContext";
import ScrollReset from "./components/ScrollReset";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata = {
  title: "BuyGain - Ganhe pontos Comprando",
  description: "Transforme qualquer compra em créditos para gift cards ou dinheiro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} theme-body`}>

        <ScrollReset />

        <CreditsProvider>
          <NotificationsProvider>
            <AchievementProvider>

              <BackgroundFX />

              <DailyXpLoader />
              <GlobalXpInterceptor />
              <GlobalXpSystem />

              <div className="theme-wrapper">
                {children}
              </div>

            </AchievementProvider>
          </NotificationsProvider>
        </CreditsProvider>

      </body>
    </html>
  );
}


