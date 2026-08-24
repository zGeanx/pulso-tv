import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://pulso-tv-ao-vivo.zgeanx.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Pulso TV — canais e eventos ao vivo",
  description: "Encontre canais, eventos esportivos e a programação que está ao vivo agora.",
  openGraph: {
    title: "Pulso TV — canais e eventos ao vivo",
    description: "Encontre canais, eventos esportivos e a programação que está ao vivo agora.",
    url: siteUrl,
    siteName: "Pulso TV",
    locale: "pt_BR",
    type: "website",
    images: [{ url: `${siteUrl}/og.png`, alt: "Pulso TV — canais e eventos ao vivo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulso TV — canais e eventos ao vivo",
    description: "Encontre canais, eventos esportivos e a programação que está ao vivo agora.",
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
