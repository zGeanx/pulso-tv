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

export interface AdSlotConfig {
  enabled: boolean;
  type: "affiliate" | "adsense" | "script" | "custom_html";
  affiliateAds?: AffiliateAd[];
  adsenseSlotId?: string;
  customHtml?: string;
  scriptUrl?: string;
}

export interface AdsConfig {
  globalEnabled: boolean;
  slots: {
    playerBottom: AdSlotConfig;
    homeFeed: AdSlotConfig;
  };
}

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? "";

const adsenseSlots = {
  playerBottom: process.env.NEXT_PUBLIC_ADSENSE_PLAYER_SLOT?.trim() ?? "",
  homeFeed: process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT?.trim() ?? "",
};

function configuredType(slotId: string): "adsense" | "affiliate" {
  return ADSENSE_CLIENT_ID && slotId ? "adsense" : "affiliate";
}

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
  slots: {
    // Anúncio exibido logo abaixo do player de vídeo (maior taxa de visualização)
    playerBottom: {
      enabled: true,
      type: configuredType(adsenseSlots.playerBottom),
      adsenseSlotId: adsenseSlots.playerBottom,
      affiliateAds: [
        {
          id: "bet-bonus",
          badge: "Patrocinado · Bônus Exclusivo",
          title: "Aposte nos jogos de hoje com 100% de Bônus",
          description: "Cadastre-se agora e dobre o seu primeiro depósito para apostar no seu time do coração.",
          ctaText: "Garantir Bônus Agora",
          targetUrl: "https://betano.com", // Substitua pelo seu link de afiliado
          highlightText: "BÔNUS 100%",
          gradient: "linear-gradient(135deg, rgba(234, 88, 12, 0.25) 0%, rgba(220, 38, 38, 0.15) 100%)",
        },
        {
          id: "vpn-secure",
          badge: "Recomendação · Transmissão Fluida",
          title: "Assista sem travamentos e com máxima privacidade",
          description: "Proteja sua conexão com VPN de alta velocidade e desbloqueie transmissões com qualidade HD.",
          ctaText: "Proteger Conexão",
          targetUrl: "https://nordvpn.com", // Substitua pelo seu link de afiliado
          highlightText: "70% OFF",
          gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%)",
        }
      ],
    },

    // Anúncio exibido na página inicial entre as seções
    homeFeed: {
      enabled: true,
      type: configuredType(adsenseSlots.homeFeed),
      adsenseSlotId: adsenseSlots.homeFeed,
      affiliateAds: [
        {
          id: "home-promo-tvbox",
          badge: "Oferta Especial",
          title: "Transforme qualquer TV em Smart 4K",
          description: "Acesse centenas de canais, filmes e séries direto na sua TV com entrega rápida.",
          ctaText: "Ver Oferta com Desconto",
          targetUrl: "https://shopee.com.br", // Substitua pelo seu link de afiliado
          highlightText: "FRETE GRÁTIS",
          gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 95, 70, 0.2) 100%)",
        }
      ],
    },
  },
};
