/*
 * NOAA SWPC solar wind speed summary.
 * https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json
 *
 * The feed used to be an object, {"WindSpeed": "429", "TimeStamp": "..."}.
 * It is now a one-row list, [{"proton_speed": 429, "time_tag": "..."}].
 * Read either, and return null for anything else so nothing is shown.
 */
export function parseSolarWindSpeed(data: unknown): string | null {
  const row: unknown = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const fields = row as Record<string, unknown>;
  const raw = fields.proton_speed ?? fields.WindSpeed;
  if (raw === null || raw === undefined || raw === '') return null;
  const speed = Number(raw);
  if (!Number.isFinite(speed) || speed <= 0) return null;
  return `${Math.round(speed)} km/s`;
}
