import { ApiError, getAnime, getAnimeDetail } from "./api.js";
import { accountRequest, accountError } from "./account-api.js";

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const typeInput = document.querySelector("#entity-type");
const genreInput = document.querySelector("#genre");
const yearInput = document.querySelector("#year");
const resultsElement = document.querySelector("#results");
const statusElement = document.querySelector("#status");
const countElement = document.querySelector("#result-count");
const moreButton = document.querySelector("#load-more");
const retryButton = document.querySelector("#retry");
const dialog = document.querySelector("#detail-dialog");
const detailTitle = document.querySelector("#detail-title");
const detailDescription = document.querySelector("#detail-description");
const detailFields = document.querySelector("#detail-fields");
const sourceLink = document.querySelector("#source-link");
const detailClose = document.querySelector("#close-detail");
const retryDetailButton = document.querySelector("#retry-detail");

const params = new URLSearchParams(window.location.search);
queryInput.value = params.get("q") || "";
typeInput.value = params.get("entityType") || "";
yearInput.value = params.get("year") || "";
let initialGenreId = params.get("genreId") || "";

const state = {
  facets: [],
  facetsForQuery: null,
  cursor: null,
  items: [],
  controller: null,
  retryList: null,
  detailId: null,
  detailController: null,
  criteria: null,
};

function errorText(error) {
  if (error.code === "RATE_LIMITED") return "Nguồn dữ liệu đang giới hạn truy cập. Vui lòng thử lại sau.";
  if (error.code === "PROVIDER_TIMEOUT") return "Nguồn dữ liệu phản hồi quá lâu. Hãy thử lại.";
  if (error.code === "PROVIDER_UNAVAILABLE" || error.code === "SERVICE_UNAVAILABLE") return "Hiện chưa thể tải dữ liệu. Hãy thử lại sau.";
  if (error.code === "INVALID_REQUEST") return "Bộ lọc không hợp lệ hoặc thể loại không nằm trong danh sách của truy vấn này.";
  return "Đã xảy ra lỗi khi tải dữ liệu.";
}

function currentFilters() {
  return {
    entityType: typeInput.value || null,
    genreId: genreInput.value || null,
    year: yearInput.value.trim() || null,
  };
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("is-error", isError);
}

function updateGenreOptions(genres, selectedId = "") {
  genreInput.replaceChildren(new Option("Tất cả thể loại", ""));
  for (const genre of genres) genreInput.add(new Option(genre.label, genre.id));
  genreInput.value = selectedId;
}

function writeUrl(q, filters) {
  const next = new URLSearchParams();
  if (q) next.set("q", q);
  if (filters.entityType) next.set("entityType", filters.entityType);
  if (filters.genreId) next.set("genreId", filters.genreId);
  if (filters.year) next.set("year", filters.year);
  const query = next.toString();
  history.replaceState(null, "", query ? `/?${query}` : "/");
}

function addText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

function typeLabel(entityType) {
  return entityType === "anime_film" ? "Phim" : "Truyền hình";
}

function renderCards(items, append = false) {
  if (!append) resultsElement.replaceChildren();
  if (!items.length && !append) {
    const empty = addText(resultsElement, "p", "empty-state", "Không tìm thấy kết quả phù hợp.");
    empty.setAttribute("role", "note");
    countElement.textContent = "0 kết quả";
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "anime-card";
    const meta = document.createElement("div");
    meta.className = "card-meta";
    addText(meta, "span", "tag", typeLabel(item.entityType));
    if (item.year) addText(meta, "span", "tag tag-muted", String(item.year));
    card.append(meta);

    const title = addText(card, "button", "card-title", item.title);
    title.type = "button";
    title.addEventListener("click", () => openDetail(item.id));
    if (item.description) addText(card, "p", "card-description", item.description);

    const footer = document.createElement("div");
    footer.className = "card-footer";
    for (const genre of item.genres.slice(0, 4)) addText(footer, "span", "genre-chip", genre.label);
    card.append(footer);
    resultsElement.append(card);
  }
  countElement.textContent = `${resultsElement.querySelectorAll(".anime-card").length} kết quả trong trang`;
}

function renderDetail(anime) {
  detailTitle.textContent = anime.title;
  detailDescription.textContent = anime.description || "Chưa có mô tả tiếng Nhật.";
  detailFields.replaceChildren();
  const values = [
    ["Định dạng", typeLabel(anime.entityType)],
    ["Năm", anime.year ? String(anime.year) : "Chưa có dữ liệu"],
    ["Thể loại", anime.genres.length ? anime.genres.map(item => item.label).join(" · ") : "Chưa có dữ liệu"],
  ];
  if (anime.releaseDate?.year) {
    const date = [anime.releaseDate.year, anime.releaseDate.month, anime.releaseDate.day].filter(Boolean).join("-");
    values.push(["Ngày phát hành", date]);
  }
  if (Number.isInteger(anime.episodeCount)) values.push(["Số tập", String(anime.episodeCount)]);
  for (const [label, value] of values) {
    addText(detailFields, "dt", "", label);
    addText(detailFields, "dd", "", value);
  }
  sourceLink.href = anime.source.uri;
}

async function openDetail(id) {
  document.querySelector("#save-favorite").hidden = true;
  document.querySelector("#favorite-feedback").textContent = "";
  state.detailController?.abort();
  const controller = new AbortController();
  state.detailController = controller;
  state.detailId = id;
  if (!dialog.open) dialog.showModal();
  detailTitle.textContent = "Đang tải chi tiết…";
  detailDescription.textContent = "";
  detailFields.replaceChildren();
  sourceLink.hidden = true;
  retryDetailButton.hidden = true;
  try {
    const detail = await getAnimeDetail(id, controller.signal);
    if (controller.signal.aborted || state.detailController !== controller) return;
    renderDetail(detail);
    document.querySelector("#save-favorite").hidden = false;
    sourceLink.hidden = false;
  } catch (error) {
    if (error.name === "AbortError" || controller.signal.aborted || state.detailController !== controller) return;
    detailTitle.textContent = "Không thể tải chi tiết";
    detailDescription.textContent = errorText(error);
    retryDetailButton.hidden = false;
  } finally {
    if (state.detailController === controller) state.detailController = null;
  }
}

async function ensureFacets(q, controller) {
  if (state.facetsForQuery === q) return state.facets;
  const base = await getAnime({ q, filters: {}, signal: controller.signal });
  if (controller.signal.aborted || state.controller !== controller) throw new DOMException("Aborted", "AbortError");
  state.facets = base.facets.genres;
  state.facetsForQuery = q;
  return state.facets;
}

async function loadFirstPage() {
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  const q = queryInput.value.trim();
  const filters = currentFilters();
  if (initialGenreId && !filters.genreId) filters.genreId = initialGenreId;
  const selectedGenre = filters.genreId;
  let notice = "";
  retryButton.hidden = true;
  resultsElement.setAttribute("aria-busy", "true");
  setStatus("Đang tải dữ liệu từ Wikidata…");

  try {
    if ((filters.entityType || filters.genreId || filters.year) && state.facetsForQuery !== q) {
      const genres = await ensureFacets(q, controller);
      if (selectedGenre && !genres.some(genre => genre.id === selectedGenre)) {
        genreInput.value = "";
        filters.genreId = null;
        initialGenreId = "";
        notice = "Thể loại đã chọn không có trong danh sách của truy vấn này; đã bỏ bộ lọc thể loại.";
      }
    }

    const result = await getAnime({ q, filters, signal: controller.signal });
    if (controller.signal.aborted || state.controller !== controller) return;
    if (!filters.entityType && !filters.genreId && !filters.year) {
      state.facets = result.facets.genres;
      state.facetsForQuery = q;
    }
    updateGenreOptions(state.facets, filters.genreId || "");
    state.items = result.items;
    state.cursor = result.page.nextCursor;
    state.criteria = { q, filters: { ...filters } };
    renderCards(state.items);
    moreButton.hidden = !state.cursor;
    if (notice) setStatus(notice);
    else if (state.items.length) setStatus("");
    else setStatus("Không có mục phù hợp trong trang dữ liệu hiện tại.");
    initialGenreId = "";
    writeUrl(q, filters);
  } catch (error) {
    if (error.name !== "AbortError" && !controller.signal.aborted && state.controller === controller) {
      state.retryList = loadFirstPage;
      retryButton.hidden = false;
      setStatus(errorText(error), true);
    }
  } finally {
    if (state.controller === controller) {
      state.controller = null;
      resultsElement.setAttribute("aria-busy", "false");
    }
  }
}

async function loadMore() {
  if (!state.cursor || !state.criteria || state.controller) return;
  const controller = new AbortController();
  state.controller = controller;
  const { q, filters } = state.criteria;
  const cursor = state.cursor;
  moreButton.disabled = true;
  retryButton.hidden = true;
  setStatus("Đang tải thêm…");
  try {
    const result = await getAnime({
      q,
      filters,
      cursor,
      signal: controller.signal,
    });
    if (controller.signal.aborted || state.controller !== controller) return;
    state.items = [...state.items, ...result.items];
    state.cursor = result.page.nextCursor;
    renderCards(result.items, true);
    moreButton.hidden = !state.cursor;
    setStatus("");
  } catch (error) {
    if (error.name !== "AbortError" && !controller.signal.aborted && state.controller === controller) {
      state.retryList = loadMore;
      retryButton.hidden = false;
      setStatus(errorText(error), true);
    }
  } finally {
    if (state.controller === controller) {
      state.controller = null;
      moreButton.disabled = false;
    }
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  loadFirstPage();
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  typeInput.value = "";
  genreInput.value = "";
  yearInput.value = "";
  loadFirstPage();
});

moreButton.addEventListener("click", loadMore);
retryButton.addEventListener("click", () => state.retryList?.());
retryDetailButton.addEventListener("click", () => state.detailId && openDetail(state.detailId));
detailClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  state.detailController?.abort();
  state.detailController = null;
  state.detailId = null;
});

document.querySelector("#save-favorite").addEventListener("click", async event => {
  const id = state.detailId;
  if (!id) return;
  event.target.disabled = true;
  try {
    await accountRequest(`/me/favorites/${encodeURIComponent(id)}`, "PUT");
    if (state.detailId === id) document.querySelector("#favorite-feedback").textContent = "Đã lưu yêu thích.";
  } catch (error) {
    if (state.detailId !== id) return;
    if (error.code === "AUTH_REQUIRED") location.assign(`/account.html?next=${encodeURIComponent(id)}`);
    else document.querySelector("#favorite-feedback").textContent = accountError(error);
  } finally { event.target.disabled = false; }
});
loadFirstPage();
const requestedAnime = params.get("anime");
if (requestedAnime && /^[A-Za-z0-9_-]{1,80}$/.test(requestedAnime)) openDetail(requestedAnime);
