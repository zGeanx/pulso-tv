"use client";

import { useEffect } from "react";
import { ADS_CONFIG } from "../../lib/ads-config";

function loadAdScript(src: string, placement: string) {
  const selector = `script[data-ad-placement="${placement}"]`;
  if (document.querySelector(selector)) return;

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.dataset.adPlacement = placement;
  document.body.appendChild(script);
}

export function AdNetworkScripts() {
  useEffect(() => {
    if (!ADS_CONFIG.globalEnabled) return;

    // Popunder and third-party social bars place a click-capturing layer over
    // the page. On touch devices that layer can consume the tap meant for the
    // embedded player's play control, so these formats stay desktop-only.
    const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const loadDesktopFormats = () => {
      if (!desktopPointer.matches) return;

      if (ADS_CONFIG.popunder?.enabled && ADS_CONFIG.popunder.scriptUrl) {
        loadAdScript(ADS_CONFIG.popunder.scriptUrl, "popunder");
      }

      if (ADS_CONFIG.socialBar?.enabled && ADS_CONFIG.socialBar.scriptUrl) {
        loadAdScript(ADS_CONFIG.socialBar.scriptUrl, "social-bar");
      }
    };

    loadDesktopFormats();
    desktopPointer.addEventListener("change", loadDesktopFormats);

    return () => desktopPointer.removeEventListener("change", loadDesktopFormats);
  }, []);

  return null;
}
