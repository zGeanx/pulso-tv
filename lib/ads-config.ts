export interface AffiliateAd {
  id: string;
  badge?: string;
  title: string;
  description: string;
  ctaText: string;
  targetUrl: string;
  imageUrl?: string;
  bgColor?: string;
  gradient?: string;
  highlightText?: string;
}

export interface AdsterraBannerConfig {
  enabled: boolean;
  key: string;
  width: number;
  height: number;
  scriptUrl: string;
}

export interface AdSlotConfig {
  enabled: boolean;
  type: "affiliate" | "adsense" | "script" | "custom_html" | "adsterra_banner";
  affiliateAds?: AffiliateAd[];
  adsenseSlotId?: string;
  customHtml?: string;
  scriptUrl?: string;
  adsterraBanner?: AdsterraBannerConfig;
}

export interface AdsConfig {
  globalEnabled: boolean;
  popunder?: {
    enabled: boolean;
    scriptUrl: string;
  };
  socialBar?: {
    enabled: boolean;
    scriptUrl: string;
  };
  banner300x250?: AdsterraBannerConfig;
  banner320x50?: AdsterraBannerConfig;
  smartlink?: {
    enabled: boolean;
    url: string;
  };
  slots: {
    playerBottom: AdSlotConfig;
    playerTop?: AdSlotConfig;
    homeFeed: AdSlotConfig;
  };
}

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? "";

const adsenseSlots = {
  playerBottom: process.env.NEXT_PUBLIC_ADSENSE_PLAYER_SLOT?.trim() ?? "",
  homeFeed: process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT?.trim() ?? "",
};

/**
 * CONFIGURAÇÃO GERAL DE ANÚNCIOS DO PULSO TV
 * 
 * DICA: Substitua os links abaixo (`targetUrl`) pelos seus links de afiliado
 * de plataformas como Betano, Superbet, NordVPN, Surfshark, Shopee, etc.
 * 
 * Se preferir usar rede de anúncios (ex: Adsterra, Monetag), mude `type` para "custom_html" ou "script"
 * e cole o código fornecido pela rede.
 */
export const ADS_CONFIG: AdsConfig = {
  globalEnabled: true,
  // Popunder global (ex: Adsterra)
  popunder: {
    enabled: true,
    scriptUrl: "https://pl31324629.profitableratecpmnetwork.com/8a/6d/9b/8a6d9b3505b0821b941dbc3f78cd77f7.js",
  },
  // Social Bar (ex: Adsterra)
  socialBar: {
    enabled: true,
    scriptUrl: "https://pl31324630.profitableratecpmnetwork.com/1e/8c/4e/1e8c4e4010164146ad86078a750447ad.js",
  },
  // Banner 300x250 (Adsterra)
  banner300x250: {
    enabled: true,
    key: "0a6a22dff53bb215588c8ca59641e1e8",
    width: 300,
    height: 250,
    scriptUrl: "https://www.highrevenueformat.com/0a6a22dff53bb215588c8ca59641e1e8/invoke.js",
  },
  // Banner 320x50 (Adsterra - Mobile Leaderboard)
  banner320x50: {
    enabled: true,
    key: "5c7c4ff6714a4997c734d07d9e2ed66d",
    width: 320,
    height: 50,
    scriptUrl: "https://www.highrevenueformat.com/5c7c4ff6714a4997c734d07d9e2ed66d/invoke.js",
  },
  // Smartlink / Direct Link (Adsterra)
  smartlink: {
    enabled: true,
    url: "https://www.profitableratecpmnetwork.com/raab6m7bi?key=4aacf31f5f386b81fb4ab99928708b34",
  },
  slots: {
    // Banner compacto no topo/acima dos controles do player (ideal para mobile e desktop)
    playerTop: {
      enabled: true,
      type: "adsterra_banner",
      adsterraBanner: {
        enabled: true,
        key: "5c7c4ff6714a4997c734d07d9e2ed66d",
        width: 320,
        height: 50,
        scriptUrl: "https://www.highrevenueformat.com/5c7c4ff6714a4997c734d07d9e2ed66d/invoke.js",
      },
    },

    // Anúncio exibido logo abaixo do player de vídeo (maior taxa de visualização)
    playerBottom: {
      enabled: true,
      type: "adsterra_banner",
      adsenseSlotId: adsenseSlots.playerBottom,
      affiliateAds: [
        {
          id: "bet-bonus",
          badge: "Patrocinado · Bônus Exclusivo",
          title: "Aposte nos jogos de hoje com 100% de Bônus",
          description: "Cadastre-se agora e dobre o seu primeiro depósito para apostar no seu time do coração.",
          ctaText: "Garantir Bônus Agora",
          targetUrl: "https://www.profitableratecpmnetwork.com/raab6m7bi?key=4aacf31f5f386b81fb4ab99928708b34",
          highlightText: "BÔNUS 100%",
          gradient: "linear-gradient(135deg, rgba(234, 88, 12, 0.25) 0%, rgba(220, 38, 38, 0.15) 100%)",
        },
        {
          id: "vpn-secure",
          badge: "Recomendação · Transmissão Fluida",
          title: "Assista sem travamentos e com máxima privacidade",
          description: "Proteja sua conexão com VPN de alta velocidade e desbloqueie transmissões com qualidade HD.",
          ctaText: "Proteger Conexão",
          targetUrl: "https://www.profitableratecpmnetwork.com/raab6m7bi?key=4aacf31f5f386b81fb4ab99928708b34",
          highlightText: "70% OFF",
          gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%)",
        }
      ],
    },

    // Anúncio exibido na página inicial entre as seções
    homeFeed: {
      enabled: true,
      type: "adsterra_banner",
      adsenseSlotId: adsenseSlots.homeFeed,
      affiliateAds: [
        {
          id: "home-promo-tvbox",
          badge: "Oferta Especial",
          title: "Transforme qualquer TV em Smart 4K",
          description: "Acesse centenas de canais, filmes e séries direto na sua TV com entrega rápida.",
          ctaText: "Ver Oferta com Desconto",
          targetUrl: "https://www.profitableratecpmnetwork.com/raab6m7bi?key=4aacf31f5f386b81fb4ab99928708b34",
          highlightText: "FRETE GRÁTIS",
          gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 95, 70, 0.2) 100%)",
        }
      ],
    },
  },
};
