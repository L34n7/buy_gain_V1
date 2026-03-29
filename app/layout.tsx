import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./styles/theme.css";
import "./styles/landing.css";
import { AchievementProvider } from "./components/AchievementContext";

/*import Navbar from "../components/Navbar";*/
/*import "../components/Navbar.css";*/
import { CreditsProvider } from "../components/CreditsContext";
import BackgroundFX from "../components/BackgroundFX";
import { NotificationsProvider } from "./dashboard/components/NotificationsContext";
import ScrollReset from "./components/ScrollReset";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuyGain - Cupons compatíveis com sua compra e pontos que valem dinheiro",
  description:
    "Encontre cupons compatíveis com a sua compra. A BuyGain filtra automaticamente os melhores cupons e ainda te dá pontos e gift cards.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} theme-body`}>
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "BuyGain",
              url: "https://buygain.com.br",
              logo: "https://buygain.com.br/logo.png",
            }),
          }}
        />

        <ScrollReset />

        <CreditsProvider>
          <NotificationsProvider>
            <AchievementProvider>
              <BackgroundFX />

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