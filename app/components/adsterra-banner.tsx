"use client";

import { useEffect, useRef } from "react";
import { ADS_CONFIG, type AdsterraBannerConfig } from "../../lib/ads-config";

interface AdsterraBannerProps {
  className?: string;
  label?: string;
  config?: AdsterraBannerConfig;
}

export function AdsterraBanner({
  className = "",
  label = "Publicidade",
  config,
}: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bannerConfig = config || ADS_CONFIG.banner300x250;

  useEffect(() => {
    if (!containerRef.current || !ADS_CONFIG.globalEnabled || !bannerConfig?.enabled) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.title = label;
    iframe.width = String(bannerConfig.width || 300);
    iframe.height = String(bannerConfig.height || 250);
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.display = "block";
    iframe.style.margin = "0 auto";
    iframe.setAttribute("scrolling", "no");

    container.appendChild(iframe);

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <base target="_blank">
            <style>
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background: transparent;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
              }
            </style>
          </head>
          <body>
            <script type="text/javascript">
              atOptions = {
                'key' : '${bannerConfig.key}',
                'format' : 'iframe',
                'height' : ${bannerConfig.height || 250},
                'width' : ${bannerConfig.width || 300},
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="${bannerConfig.scriptUrl}"></script>
          </body>
          </html>
        `);
        doc.close();
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Falha ao inicializar o banner Adsterra 300x250:", err);
      }
    }
  }, [bannerConfig, label]);

  if (!ADS_CONFIG.globalEnabled || !bannerConfig?.enabled) {
    return null;
  }

  const width = bannerConfig.width || 300;
  const height = bannerConfig.height || 250;
  const isCompact = height <= 100;

  return (
    <aside
      className={`adsterra-banner-card format-${width}x${height} ${isCompact ? "compact" : ""} ${className}`}
      aria-label={label}
    >
      <div className="adsterra-banner-header" style={{ width, maxWidth: "100%" }}>
        <span className="adsterra-banner-badge">
          <span className="ad-badge-dot" />
          {label}
        </span>
        <span className="adsterra-banner-format">{width}×{height}</span>
      </div>
      <div
        className="adsterra-banner-viewport"
        style={{ width, height, minWidth: width, minHeight: height }}
        ref={containerRef}
      />
    </aside>
  );
}
