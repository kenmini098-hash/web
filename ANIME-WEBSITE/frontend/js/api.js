const API_ROOT = "/api/v1";

export class ApiError extends Error {
  constructor(code, requestId) {
    super(code);
    this.code = code;
    this.requestId = requestId;
  }
}

async function request(path, signal) {
  let response;
  try {
    response = await fetch(path, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("SERVICE_UNAVAILABLE", "");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("SERVICE_UNAVAILABLE", response.headers.get("X-Request-ID") || "");
  }
  if (!response.ok) {
    throw new ApiError(body?.error?.code || "SERVICE_UNAVAILABLE", body?.error?.requestId || "");
  }
  return body;
}

export function getAnime({ q, filters = {}, limit = 20, cursor = null, signal } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  else params.set("mode", "browse");
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.genreId) params.set("genreId", filters.genreId);
  if (filters.year) params.set("year", filters.year);
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return request(`${API_ROOT}/anime?${params}`, signal);
}

export function getAnimeDetail(id, signal) {
  return request(`${API_ROOT}/anime/${encodeURIComponent(id)}`, signal);
}
