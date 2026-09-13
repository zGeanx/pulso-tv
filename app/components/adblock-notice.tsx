"use client";

import { useEffect, useState } from "react";
import { ADS_CONFIG } from "../../lib/ads-config";
import { ShieldCheckIcon, CloseIcon, FlameIcon, ArrowRightIcon } from "./icons";

const DISMISS_KEY = "pulso_adblock_dismissed";
const POP_FIRED_KEY = "pulso_native_pop_fired";
const SOCIAL_BAR_DISMISSED_KEY = "pulso_social_bar_dismissed";

export function AdblockNotice() {
  const [detected, setDetected] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(true);
  const [showNativeSocialBar, setShowNativeSocialBar] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;
    let initialDismissed = false;

    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        initialDismissed = true;
      }
    } catch {
      // Silencioso
    }

    async function checkAdblock() {
      let isBlocked = false;

      // Teste 1: Elemento DOM com classes visadas por filtros cosméticos
      try {
        const bait = document.createElement("div");
        bait.className = "pub_300x250 pub_300x250m pub_728x90 text-ad textAds banner-ad text-ad-links";
        bait.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;";
        document.body.appendChild(bait);

        const computed = window.getComputedStyle(bait);
        if (bait.offsetHeight === 0 || computed.display === "none" || computed.visibility === "hidden") {
          isBlocked = true;
        }
        bait.remove();
      } catch {
        // Silencioso
      }

      // Teste 2: Sonda de rede (Network probe)
      if (!isBlocked) {
        try {
          await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-store",
          });
        } catch {
          // Bloqueio de rede detectado (ERR_BLOCKED_BY_CLIENT / Brave Shields)
          isBlocked = true;
        }
      }

      // Teste 3: Checagem específica do Brave Browser
      if (!isBlocked) {
        try {
          const nav = navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } };
          if (typeof nav.brave?.isBrave === "function") {
            const isBrave = await nav.brave.isBrave();
            if (isBrave) {
              try {
                await fetch("https://www.highrevenueformat.com/0a6a22dff53bb215588c8ca59641e1e8/invoke.js", {
                  method: "HEAD",
                  mode: "no-cors",
                  cache: "no-store",
                });
              } catch {
                isBlocked = true;
              }
            }
          }
        } catch {
          // Silencioso
        }
      }

      if (!isMounted) return;

      if (isBlocked) {
        setDetected(true);
        if (!initialDismissed) {
          setNoticeDismissed(false);
        }

        // ─── BYPASS 1: Popunder Nativo com Smartlink ───
        // No primeiro clique espontâneo do usuário na página, se o Smartlink estiver ativo e ainda não tiver disparado nesta sessão:
        const smartlink = ADS_CONFIG.smartlink?.url;
        if (ADS_CONFIG.globalEnabled && smartlink) {
          const onFirstClick = (e: MouseEvent) => {
            try {
              if (sessionStorage.getItem(POP_FIRED_KEY) === "1") return;
              // Não dispara se clicou em fechar modais/avisos
              if ((e.target as HTMLElement)?.closest(".site-support-close, .site-support-btn-dismiss, .native-social-bar-close")) {
                return;
              }
              sessionStorage.setItem(POP_FIRED_KEY, "1");
              window.open(smartlink, "_blank");
            } catch {
              // Silencioso
            }
          };

          window.addEventListener("click", onFirstClick, { once: true });
        }

        // ─── BYPASS 2: Social Bar Nativa ───
        // Exibe uma barra flutuante após 5 segundos se a rede de anúncios foi bloqueada
        try {
          if (sessionStorage.getItem(SOCIAL_BAR_DISMISSED_KEY) !== "1") {
            setTimeout(() => {
              if (isMounted) setShowNativeSocialBar(true);
            }, 5000);
          }
        } catch {
          // Silencioso
        }
      }
    }

    const timer = setTimeout(checkAdblock, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleDismissNotice = () => {
    setNoticeDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Silencioso
    }
  };

  const handleDismissSocialBar = () => {
    setShowNativeSocialBar(false);
    try {
      sessionStorage.setItem(SOCIAL_BAR_DISMISSED_KEY, "1");
    } catch {
      // Silencioso
    }
  };

  const smartlinkUrl = ADS_CONFIG.smartlink?.url;

  return (
    <>
      {/* Social Bar Nativa (Imune a Adblock) */}
      {showNativeSocialBar && smartlinkUrl && (
        <aside className="native-social-bar" role="complementary" aria-label="Notificação de transmissão">
          <div className="native-social-bar-content">
            <span className="native-social-bar-live-dot" />
            <span className="native-social-bar-icon">⚡</span>
            <div className="native-social-bar-text">
              <strong>Servidor VIP 4K Ativado</strong>
              <small>Transmissão em alta velocidade sem travamentos disponível</small>
            </div>
          </div>
          <div className="native-social-bar-actions">
            <a
              href={smartlinkUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="native-social-bar-cta"
              onClick={handleDismissSocialBar}
            >
              <span>Acessar</span>
              <ArrowRightIcon style={{ width: 12, height: 12 }} />
            </a>
            <button
              type="button"
              className="native-social-bar-close"
              onClick={handleDismissSocialBar}
              aria-label="Fechar notificação"
            >
              <CloseIcon style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </aside>
      )}

      {/* Mini Janela de Aviso de Adblock / Brave */}
      {detected && !noticeDismissed && (
        <aside
          className="site-support-notice"
          role="dialog"
          aria-label="Aviso de bloqueador de anúncios"
        >
          <div className="site-support-card">
            {/* Botão de fechar */}
            <button
              type="button"
              className="site-support-close"
              onClick={handleDismissNotice}
              aria-label="Fechar aviso"
            >
              <CloseIcon style={{ width: 14, height: 14 }} />
            </button>

            <div className="site-support-header">
              <div className="site-support-icon-wrap">
                <ShieldCheckIcon style={{ width: 22, height: 22, color: "#f97316" }} />
              </div>
              <div className="site-support-titles">
                <span className="site-support-tag">Apoie o Pulso TV</span>
                <h3 className="site-support-heading">Bloqueador de Anúncios Ativo</h3>
              </div>
            </div>

            <p className="site-support-desc">
              Nosso site é <strong>100% gratuito</strong> e os anúncios ajudam a manter os servidores e sinais ao vivo funcionando.
            </p>

            <div className="site-support-brave-tip">
              <span className="site-support-brave-icon">🦁</span>
              <p>
                <strong>Usa o navegador Brave?</strong> Clique no ícone do leão ao lado da barra de endereço e <em>desative os escudos</em> para este site.
              </p>
            </div>

            <div className="site-support-actions">
              {smartlinkUrl && (
                <a
                  href={smartlinkUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="site-support-btn-vip"
                  onClick={handleDismissNotice}
                >
                  <FlameIcon style={{ width: 14, height: 14, color: "#f97316" }} />
                  <span>Entrar com Sinal VIP</span>
                </a>
              )}

              <button
                type="button"
                className="site-support-btn-dismiss"
                onClick={handleDismissNotice}
              >
                Já desativei / Continuar
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
