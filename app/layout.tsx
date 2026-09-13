import type { Metadata } from "next";
import "./globals.css";
import { ADS_CONFIG, ADSENSE_CLIENT_ID } from "../lib/ads-config";
import { EMBED_FRAME_CSP } from "../lib/reidoscanais/embed-security";
import { AdblockNotice } from "./components/adblock-notice";

const siteUrl = "https://pulso-tv-ao-vivo.zgeanx.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pulso TV | Canais e eventos ao vivo",
    template: "%s | Pulso TV",
  },
  description: "Encontre canais, eventos esportivos e a programação que está ao vivo agora.",
  openGraph: {
    title: "Pulso TV | Canais e eventos ao vivo",
    description: "Encontre canais, eventos esportivos e a programação que está ao vivo agora.",
    url: siteUrl,
    siteName: "Pulso TV",
    locale: "pt_BR",
    type: "website",
    images: [{ url: `${siteUrl}/og.png`, alt: "Pulso TV | Canais e eventos ao vivo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulso TV | Canais e eventos ao vivo",
    description: "Encontre canais, eventos esportivos e a programação que está ao vivo agora.",
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={EMBED_FRAME_CSP} />
        {/* Keep icons in the initial head even when channel metadata streams later. */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT_ID)}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        {children}
        <AdblockNotice />
        {ADS_CONFIG.globalEnabled && ADS_CONFIG.popunder?.enabled && ADS_CONFIG.popunder.scriptUrl && (
          <script
            type="text/javascript"
            src={ADS_CONFIG.popunder.scriptUrl}
          />
        )}
        {ADS_CONFIG.globalEnabled && ADS_CONFIG.socialBar?.enabled && ADS_CONFIG.socialBar.scriptUrl && (
          <script
            type="text/javascript"
            src={ADS_CONFIG.socialBar.scriptUrl}
          />
        )}
      </body>
    </html>
  );
}
