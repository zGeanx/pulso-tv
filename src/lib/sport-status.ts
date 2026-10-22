export type ApiSportStatus = "live" | "upcoming" | "finished";

export const EVENT_STATUS_ORDER: Record<ApiSportStatus, number> = {
  live: 0,
  upcoming: 1,
  finished: 2,
};

/** Match window duration: ~2h30m (150 minutes). Matches past this window are treated as finished. */
export const MATCH_DURATION_SECONDS = 150 * 60;

export function getEventEffectiveStatus(
  event: { status: ApiSportStatus; start_timestamp?: number },
  nowSeconds = Date.now() / 1000,
): ApiSportStatus {
  if (event.status === "finished") return "finished";
  if (!event.start_timestamp || !Number.isFinite(event.start_timestamp)) return event.status;

  if (nowSeconds >= event.start_timestamp + MATCH_DURATION_SECONDS) {
    return "finished";
  }
  if (nowSeconds >= event.start_timestamp) {
    return "live";
  }
  return "upcoming";
}

export function isEventFinished(
  event: { status: ApiSportStatus; start_timestamp?: number },
  nowSeconds = Date.now() / 1000,
): boolean {
  return getEventEffectiveStatus(event, nowSeconds) === "finished";
}
