"use client";

import { useEffect, useRef, useState } from "react";
import { ADS_CONFIG, type AdsterraBannerConfig } from "../../lib/ads-config";
import { FlameIcon, ArrowRightIcon } from "./icons";

const AD_RENDER_FAILED_EVENT = "pulso:ad-render-failed";

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
  const frameRef = useRef<HTMLDivElement>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [bannerScale, setBannerScale] = useState(1);
  const bannerConfig = config || ADS_CONFIG.banner300x250;
  const width = bannerConfig?.width || 300;
  const height = bannerConfig?.height || 250;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = () => {
      setBannerScale(Math.min(1, frame.clientWidth / width));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);

    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    if (!containerRef.current || !ADS_CONFIG.globalEnabled || !bannerConfig?.enabled) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = "";
    setIsBlocked(false);

    let failureReported = false;
    const reportRenderFailure = () => {
      if (failureReported) return;
      failureReported = true;
      setIsBlocked(true);
      window.dispatchEvent(new CustomEvent(AD_RENDER_FAILED_EVENT));
    };

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
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Falha ao inicializar o banner Adsterra:", err);
      }
      reportRenderFailure();
    }

    // Uma resposta de rede não garante que a peça foi renderizada: filtros
    // cosméticos podem remover o conteúdo depois que o script carregou.
    const renderTimer = window.setTimeout(() => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        const body = doc?.body;
        const creatives = Array.from(
          body?.querySelectorAll<HTMLElement>(
            "a, iframe, img, video, object, embed, canvas, svg",
          ) ?? [],
        );
        const visibleElement = creatives.find((element) => {
          const rect = element.getBoundingClientRect();
          const style = doc?.defaultView?.getComputedStyle(element);
          return rect.width > 1
            && rect.height > 1
            && style?.display !== "none"
            && style?.visibility !== "hidden"
            && style?.opacity !== "0";
        });

        if (!visibleElement) {
          reportRenderFailure();
        }
      } catch {
        reportRenderFailure();
      }
    }, 4500);

    return () => window.clearTimeout(renderTimer);
  }, [bannerConfig, label]);

  if (!ADS_CONFIG.globalEnabled || !bannerConfig?.enabled) {
    return null;
  }

  const isCompact = height <= 100;
  const smartlinkUrl = ADS_CONFIG.smartlink?.url;

  // Divulgação própria exibida quando a peça externa não é renderizada.
  if (isBlocked && ADS_CONFIG.smartlink?.enabled && smartlinkUrl) {
    return (
      <aside
        className={`house-placement format-${width}x${height} ${isCompact ? "compact" : ""} ${className}`}
        aria-label={label}
      >
        <a
          href={smartlinkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="house-placement-link"
        >
          <div className="house-placement-header">
            <span className="house-placement-label">
              <span className="ad-badge-dot" />
              Patrocinado · Pulso TV
            </span>
            <span className="house-placement-tag">4K VIP</span>
          </div>

          <div className="house-placement-content">
            <div className="house-placement-icon">
              <FlameIcon style={{ width: isCompact ? 18 : 26, height: isCompact ? 18 : 26, color: "#f97316" }} />
            </div>
            <div className="house-placement-copy">
              <strong className="house-placement-title">
                {isCompact ? "Sinal Rápido sem travamentos" : "Liberar Transmissão em Alta Definição"}
              </strong>
              {!isCompact && (
                <p className="house-placement-description">
                  Assista a todos os jogos e canais com conexão otimizada e velocidade máxima.
                </p>
              )}
            </div>
          </div>

          <div className="house-placement-action">
            <span>Acessar Sinal</span>
            <ArrowRightIcon style={{ width: 14, height: 14 }} />
          </div>
        </a>
      </aside>
    );
  }

  return (
    <aside
      className={`adsterra-banner-card format-${width}x${height} ${isCompact ? "compact" : ""} ${className}`}
      aria-label={label}
    >
      <div
        ref={frameRef}
        className="adsterra-banner-frame"
        style={{ maxWidth: width, height: height * bannerScale }}
      >
        <div
          className="adsterra-banner-viewport"
          style={{
            width,
            height,
            transform: `translateX(-50%) scale(${bannerScale})`,
          }}
          ref={containerRef}
        />
      </div>
    </aside>
  );
}
