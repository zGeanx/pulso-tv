"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ADS_CONFIG, ADSENSE_CLIENT_ID, type AdSlotConfig, type AffiliateAd } from "../../lib/ads-config";
import { ArrowRightIcon } from "./icons";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdBannerProps {
  slot: "playerBottom" | "homeFeed";
  className?: string;
  variant?: "horizontal" | "compact" | "card";
}

export function AdBanner({ slot, className = "", variant = "horizontal" }: AdBannerProps) {
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const containerId = useId();
  const adRequested = useRef(false);

  const slotConfig: AdSlotConfig | undefined = ADS_CONFIG.slots[slot];

  useEffect(() => {
    if (slotConfig?.type !== "adsense" || !ADSENSE_CLIENT_ID || !slotConfig.adsenseSlotId || adRequested.current) {
      return;
    }

    adRequested.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("AdSense could not initialize this slot.", error);
      }
    }
  }, [slotConfig]);

  // Se anúncios estiverem desativados globalmente ou no slot
  if (!ADS_CONFIG.globalEnabled || !slotConfig || !slotConfig.enabled) {
    return null;
  }

  if (slotConfig.type === "adsense" && ADSENSE_CLIENT_ID && slotConfig.adsenseSlotId) {
    return (
      <aside className={`ad-network-slot ${variant} ${className}`} aria-label="Publicidade">
        <span className="ad-network-label">Publicidade</span>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotConfig.adsenseSlotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  // Renderização de Script/HTML customizado (Redes como Adsterra, Monetag, etc.)
  if (slotConfig.type === "custom_html" && slotConfig.customHtml) {
    return (
      <div
        id={`ad-slot-${containerId}`}
        className={`ad-container ad-custom-html ${className}`}
        dangerouslySetInnerHTML={{ __html: slotConfig.customHtml }}
      />
    );
  }

  // Renderização de Anúncios de Afiliados
  const ads: AffiliateAd[] = slotConfig.affiliateAds || [];
  if (ads.length === 0) return null;

  const currentAd = ads[activeAdIndex % ads.length];

  return (
    <div className={`ad-card-wrapper ${variant} ${className}`}>
      <a
        href={currentAd.targetUrl}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="ad-card"
        style={{
          background: currentAd.gradient || "linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)",
        }}
      >
        <div className="ad-card-glow" />

        <div className="ad-content">
          <div className="ad-header-row">
            <span className="ad-badge">
              <span className="ad-badge-dot" />
              {currentAd.badge || "Patrocinado"}
            </span>

            {currentAd.highlightText && (
              <span className="ad-highlight-tag">{currentAd.highlightText}</span>
            )}
          </div>

          <div className="ad-body">
            <h4 className="ad-title">{currentAd.title}</h4>
            <p className="ad-description">{currentAd.description}</p>
          </div>
        </div>

        <div className="ad-action">
          <span className="ad-cta-btn">
            <span>{currentAd.ctaText}</span>
            <ArrowRightIcon style={{ width: 14, height: 14 }} />
          </span>
          <span className="ad-disclaimer">Publicidade · 18+</span>
        </div>
      </a>

      {ads.length > 1 && (
        <div className="ad-indicators">
          {ads.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`ad-dot ${idx === activeAdIndex ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveAdIndex(idx);
              }}
              aria-label={`Ver anúncio ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
