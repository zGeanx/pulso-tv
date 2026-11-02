import gsap from "gsap";
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function smoothHorizontalScroll(
  container: HTMLElement | null,
  distance: number,
  duration = 0.45,
) {
  if (!container) return;
  const target = container.scrollLeft + distance;
  if (prefersReducedMotion()) {
    container.scrollTo({ left: target, behavior: "smooth" });
    return;
  }
  gsap.to(container, {
    scrollLeft: target,
    duration,
    ease: "power2.out",
    overwrite: "auto",
  });
}
export function staggerEntrance(
  targets: string | Element[] | NodeListOf<Element>,
  options?: {
    y?: number;
    stagger?: number;
    duration?: number;
  },
) {
  const isReduced = prefersReducedMotion();
  const y = isReduced ? 0 : (options?.y ?? 10);
  const stagger = isReduced ? 0 : (options?.stagger ?? 0.025);
  const duration = isReduced ? 0.15 : (options?.duration ?? 0.28);
  return gsap.from(targets, {
    opacity: 0,
    y,
    duration,
    stagger,
    ease: "power1.out",
    clearProps: "opacity,transform",
  });
}
