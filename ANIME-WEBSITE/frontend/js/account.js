import { accountRequest, accountError } from "./account-api.js";
const $ = selector => document.querySelector(selector);
const status = $("#account-status");
let user = null;
let cursor = null;
let loadingFavorites = false;
let generation = 0;
let busy = false;

function showUser(value) {
  user = value;
  generation++;
  $("#login-form").hidden = Boolean(value);
  $("#signed-in").hidden = !value;
  $("#current-email").textContent = value?.email || "";
  $("#favorites").replaceChildren();
  $("#confirm-delete").checked = false;
  $("#more-favorites").hidden = true;
  cursor = null;
}
async function run(action) {
  if (busy) return;
  busy = true;
  const buttons = [...document.querySelectorAll("button")];
  buttons.forEach(button => button.disabled = true);
  try { await action(); } catch (error) { status.textContent = accountError(error); }
  finally { busy = false; buttons.forEach(button => button.disabled = false); }
}
async function refresh() {
  try {
    const result = await accountRequest("/me");
    showUser(result.user);
    status.textContent = "Đã đăng nhập.";
    await favorites();
  } catch (error) {
    if (error.code === "AUTH_REQUIRED") { showUser(null); status.textContent = "Đăng nhập để lưu yêu thích."; }
    else { showUser(null); status.textContent = accountError(error); }
  }
}
async function favorites(more = false) {
  if (!user || loadingFavorites) return;
  const current = generation;
  loadingFavorites = true;
  $("#favorite-status").textContent = "Đang tải…";
  $("#more-favorites").disabled = true;
  try {
    const result = await accountRequest(`/me/favorites${more && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
    if (current !== generation) return;
    if (!more) $("#favorites").replaceChildren();
    for (const item of result.items) {
      const li = document.createElement("li");
      if (item.anime) {
        const link = document.createElement("a");
        link.textContent = item.anime.title;
        link.href = `/?anime=${encodeURIComponent(item.animeId)}`;
        li.append(link);
      } else li.append(document.createTextNode("Anime hiện không còn dữ liệu khả dụng"));
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "button"; remove.textContent = "Bỏ yêu thích";
      remove.addEventListener("click", () => run(async () => {
        await accountRequest(`/me/favorites/${encodeURIComponent(item.animeId)}`, "DELETE");
        li.remove(); status.textContent = "Đã bỏ yêu thích.";
      }));
      li.append(remove); $("#favorites").append(li);
    }
    cursor = result.page.nextCursor;
    $("#more-favorites").hidden = !cursor;
    $("#favorite-status").textContent = $("#favorites").children.length ? "" : "Chưa có anime yêu thích.";
  } catch (error) {
    if (current === generation) $("#favorite-status").textContent = accountError(error);
  } finally { loadingFavorites = false; $("#more-favorites").disabled = false; }
}
$("#login-form").addEventListener("submit", event => {
  event.preventDefault();
  const mode = event.submitter.value;
  run(async () => {
    const data = { email: $("#email").value, password: $("#password").value };
    await accountRequest(`/auth/${mode}`, "POST", data);
    $("#password").value = "";
    if (mode === "register") { status.textContent = "Yêu cầu đã được xử lý. Hãy đăng nhập bằng email và mật khẩu của bạn."; return; }
    const next = new URLSearchParams(location.search).get("next");
    if (next && /^[A-Za-z0-9_-]{1,80}$/.test(next)) { location.assign(`/?anime=${encodeURIComponent(next)}`); return; }
    await refresh();
  });
});
$("#logout").addEventListener("click", () => run(async () => {
  await accountRequest("/auth/logout", "POST"); showUser(null); status.textContent = "Đã đăng xuất.";
}));
$("#password-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    await accountRequest("/auth/password", "POST", Object.fromEntries(new FormData(event.target)));
    event.target.reset(); status.textContent = "Đã đổi mật khẩu; các phiên khác đã đăng xuất.";
  });
});
$("#reauth-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    await accountRequest("/auth/login", "POST", { email: user.email, password: new FormData(event.target).get("password") });
    event.target.reset(); $("#confirm-delete").checked = false;
    status.textContent = "Đã xác thực. Nếu muốn xóa, hãy đánh dấu xác nhận và bấm Bước 2.";
  });
});
$("#delete-form").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    await accountRequest("/me", "DELETE", { confirm: $("#confirm-delete").checked });
    showUser(null); status.textContent = "Đã xóa tài khoản và yêu thích.";
  });
});
$("#retry-account").addEventListener("click", () => run(refresh));
$("#reload-favorites").addEventListener("click", () => favorites());
$("#more-favorites").addEventListener("click", () => favorites(true));
run(refresh);
