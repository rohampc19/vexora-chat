"use strict";

const TOREX_API = "/api";

async function torexRequest(path, options = {}) {
  const token = localStorage.getItem("torexToken");
  const headers = Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}, options.headers || {});
  const response = await fetch(TOREX_API + path, {
    headers,
    ...(options || {})
  }).catch(() => { throw new Error("ارتباط با سرور برقرار نشد — سرور را با دستور node server.js اجرا کن و صفحه را از http://localhost:3000 باز کن."); });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "ارتباط با سرور برقرار نشد.");
  return data;
}
window.torexRequest = torexRequest;

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = String(value == null ? "" : value);
  return element.innerHTML;
}
function getUser() {
  try { return JSON.parse(localStorage.getItem("torexUser") || "null"); }
  catch (_) { return null; }
}
function showToast(message) {
  let box = document.querySelector(".torex-toast-container");
  if (!box) { box = document.createElement("div"); box.className = "torex-toast-container"; document.body.append(box); }
  const toast = document.createElement("div");
  toast.className = "torex-toast";
  toast.textContent = message;
  box.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => { toast.classList.remove("is-visible"); setTimeout(() => toast.remove(), 200); }, 2800);
}
function addServicesLink() {
  /* Secondary pages may link to Services explicitly; navigation is not mutated at runtime. */
}
function showProfile(profile) {
  let dialog = document.getElementById("torexProfileDialog");
  if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "torexProfileDialog"; dialog.className = "torex-profile-dialog"; document.body.append(dialog); }
  dialog.innerHTML = '<div class="torex-profile-card"><div class="torex-profile-card__avatar">' + escapeHtml(profile.avatar || (profile.name || "T")[0]) + '</div><h2>' + escapeHtml(profile.name || "کاربر TOREX") + '</h2><p>@' + escapeHtml(profile.username) + (profile.verified ? ' <span class="torex-verified">✓</span>' : '') + '</p><p>' + escapeHtml(profile.favoriteGame || "گیمر VEXORA CHAT") + '</p><div class="torex-profile-card__stats"><div><b>' + Number(profile.followers || 0).toLocaleString("fa-IR") + '</b><span>دنبال‌کننده</span></div><div><b>' + Number(profile.following || 0).toLocaleString("fa-IR") + '</b><span>دنبال‌شونده</span></div><div><b>' + Number(profile.score || 0).toLocaleString("fa-IR") + '</b><span>امتیاز</span></div></div><button type="button">بستن</button></div>';
  dialog.querySelector("button").onclick = () => dialog.close();
  dialog.showModal();
}
function openProfile(username) {
  torexRequest("/users/" + encodeURIComponent(username)).then(result => showProfile(result.profile)).catch(error => showToast(error.message));
}
function authorHtml(author, name, verified) {
  return '<div class="torex-author"><span class="torex-author__avatar">' + escapeHtml((name || "T")[0]) + '</span><span>' + escapeHtml(name || "کاربر TOREX") + (verified ? ' <span class="torex-verified">✓</span>' : '') + '</span><button type="button" data-author="' + escapeHtml(author || "admin") + '">مشاهده پروفایل</button></div>';
}

/* باز کردن خبر → صفحه‌ی جدید به سبک اینستاگرام */
function openNews(item) {
  if (item && item.id) { location.href = "news-detail.html?id=" + encodeURIComponent(item.id); return; }
  let dialog = document.getElementById("torexNewsDialog");
  if (!dialog) { dialog = document.createElement("dialog"); dialog.id = "torexNewsDialog"; dialog.className = "torex-news-dialog"; document.body.append(dialog); }
  const tags = (item.tags || []).map(tag => '<span>#' + escapeHtml(tag) + '</span>').join("");
  dialog.innerHTML = '<article class="torex-news-detail"><button class="torex-dialog-close" type="button">×</button>' + (item.image ? '<img src="' + item.image + '" alt="">' : '') + '<span class="card-category">' + escapeHtml((item.tags || [item.category || "TOREX"])[0]) + '</span><h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.text) + '</p><p class="torex-news-tags">' + tags + '</p>' + authorHtml(item.author, item.authorName, item.verified) + '</article>';
  dialog.querySelector(".torex-dialog-close").onclick = () => dialog.close();
  dialog.querySelector("[data-author]")?.addEventListener("click", () => openProfile(item.author || "admin"));
  dialog.showModal();
}
function staticNews(card) {
  return {
    title: card.querySelector("h2,h3")?.textContent.trim() || "خبر VEXORA CHAT",
    text: card.querySelector("p")?.textContent.trim() || "",
    category: card.querySelector(".news-tag,.card-category")?.textContent.trim() || "TOREX",
    author: "admin", authorName: "ادمین TOREX", verified: true, tags: [],
    image: card.querySelector("img")?.src || ""
  };
}
function createNewsCard(item) {
  const card = document.createElement("article");
  card.className = "news-card torex-user-news torex-openable";
  card.tabIndex = 0;
  card.innerHTML = '<div class="news-card-image">' + (item.image ? '<img src="' + item.image + '" alt="">' : '') + '</div><div class="news-card-content"><span class="card-category">' + escapeHtml((item.tags || ["TOREX"])[0]) + '</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.text) + '</p>' + authorHtml(item.author, item.authorName, item.verified) + '<div class="card-footer"><span>همین حالا</span><span>👁️ ' + Number(item.views || 0).toLocaleString("fa-IR") + '</span></div></div>';
  card.addEventListener("click", event => {
    if (event.target.closest("[data-author]")) return;
    if (item.id) { location.href = "news-detail.html?id=" + encodeURIComponent(item.id); return; }
    openNews(item);
  });
  card.querySelector("[data-author]").addEventListener("click", event => { event.stopPropagation(); openProfile(item.author); });
  return card;
}
function bindStaticNews() {
  /* کارت‌های استاتیک حذف شدند — اخبار فقط از سرور رندر می‌شوند */
  torexRequest("/news").then(result => {
    const grid = document.getElementById("newsGrid");
    if (!grid) return;
    grid.replaceChildren();
    if (!result.news.length) {
      const empty = document.createElement("p");
      empty.className = "torex-search-empty";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = "هنوز خبری منتشر نشده — اولین خبر را تو بگذار! 📰";
      grid.append(empty);
      return;
    }
    result.news.slice().reverse().forEach(item => grid.append(createNewsCard(item)));
  }).catch(() => {});
}
function createComposer() {
  const section = document.createElement("section");
  section.className = "torex-news-composer";
  section.innerHTML = '<span class="torex-kicker">TOREX NEWS DESK</span><h2>خبرت را منتشر کن</h2><p>عنوان، متن، هشتگ و تصویر خبر را وارد کن.</p><form><label>عنوان خبر<input name="title" required maxlength="140" placeholder="عنوان خبر"></label><label>متن خبر<textarea name="text" required maxlength="3000" placeholder="متن خبر"></textarea></label><label>هشتگ‌ها<input name="tags" maxlength="200" placeholder="#گیم #TOREX"></label><div class="torex-news-composer__row"><label class="torex-upload-control">آپلود عکس<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label><span class="torex-file-name">تصویری انتخاب نشده</span><button>انتشار خبر</button></div><img class="torex-image-preview" alt="" hidden></form>';
  return section;
}
function imageData(file) {
  if (!file) return Promise.resolve("");
  if (file.size > 650000) return Promise.reject(new Error("حجم تصویر باید کمتر از ۶۵۰ کیلوبایت باشد."));
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود.")); reader.readAsDataURL(file); });
}
function initNews() {
  if (!location.pathname.endsWith("news.html")) return;
  const heading = document.querySelector(".news-heading"), grid = document.querySelector(".news-grid");
  if (!heading || !grid) return;
  bindStaticNews();
  const composer = createComposer(); heading.after(composer);
  const form = composer.querySelector("form"), input = form.elements.image, name = composer.querySelector(".torex-file-name"), preview = composer.querySelector(".torex-image-preview");
  input.addEventListener("change", () => imageData(input.files[0]).then(src => { name.textContent = input.files[0]?.name || "تصویری انتخاب نشده"; preview.src = src; preview.hidden = !src; }).catch(error => { input.value = ""; preview.hidden = true; showToast(error.message); }));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const user = getUser();
    if (!user) { showToast("برای انتشار خبر ابتدا وارد شوید."); location.href = "login.html"; return; }
    const data = new FormData(form);
    try {
      const image = await imageData(input.files[0]);
      const result = await torexRequest("/news", { method: "POST", body: JSON.stringify({ title: data.get("title"), text: data.get("text"), tags: data.get("tags"), image, author: user.username }) });
      const empty = document.querySelector("#newsGrid .torex-search-empty");
      if (empty) empty.remove();
      document.getElementById("newsGrid")?.prepend(createNewsCard(result.news)); form.reset(); preview.hidden = true; name.textContent = "تصویری انتخاب نشده"; showToast("خبر با موفقیت منتشر شد.");
    } catch (error) { showToast(error.message); }
  });
}

function initAuth() {
  const login = document.getElementById("loginForm");
  if (login) login.addEventListener("submit", async event => {
    event.preventDefault(); event.stopImmediatePropagation();
    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value || "";
    const box = document.getElementById("loginError");
    try {
      const result = await torexRequest("/login", { method: "POST", body: JSON.stringify({ phone, password }) });
      localStorage.setItem("torexUser", JSON.stringify(result.user));
      localStorage.setItem("torexLoggedIn", "true");
      localStorage.setItem("torexToken", result.token);
      location.href = "index.html";
    } catch (error) { if (box) { box.textContent = error.message; box.classList.add("show"); } }
  }, true);
  const register = document.getElementById("registerForm");
  if (register) register.addEventListener("submit", async event => {
    event.preventDefault(); event.stopImmediatePropagation();
    const username = document.getElementById("username")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";
    const repeat = document.getElementById("confirmPassword")?.value || "";
    const accepted = document.getElementById("terms")?.checked;
    const box = document.getElementById("registerError");
    const submit = register.querySelector("button[type=submit]");
    function fail(message) { if (box) { box.textContent = message; box.classList.add("show"); box.classList.remove("success"); } if (submit) submit.disabled = false; }
    try {
      if (location.protocol === "file:") throw new Error("برای ثبت‌نام باید سرور اجرا باشد و صفحه را از http://localhost:3000/register.html باز کنی (نه با دابل‌کلیک روی فایل).");
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error("نام کاربری باید ۳ تا ۲۴ کاراکتر انگلیسی، عدد یا _ باشد.");
      if (!/^09\d{9}$/.test(phone)) throw new Error("شماره موبایل معتبر نیست. مثال: 09123456789");
      if (password.length < 8) throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      if (password !== repeat) throw new Error("رمز عبور و تکرار آن یکسان نیست.");
      if (!accepted) throw new Error("پذیرفتن قوانین سایت الزامی است.");
      if (submit) submit.disabled = true;
      await torexRequest("/register", { method: "POST", body: JSON.stringify({ username, phone, password }) });
      if (box) { box.textContent = "⏳ ثبت‌نام انجام شد. منتظر تایید ادمین بمان..."; box.classList.add("show", "success"); }
      showToast?.("درخواست شما برای ادمین ارسال شد؛ منتظر تایید بمان.");
      register.reset();
      if (submit) submit.disabled = true;
      // هر ۲ ثانیه وضعیت تایید را از سرور چک می‌کنیم؛ به محض تایید ادمین کاربر وارد می‌شود
      const pollTimer = setInterval(async () => {
        try {
          const result = await torexRequest("/register/status?username=" + encodeURIComponent(username));
          if (result.status === "rejected") { clearInterval(pollTimer); if (box) { box.textContent = "درخواست شما رد شد. دوباره تلاش کن."; box.classList.remove("success"); } if (submit) submit.disabled = false; return; }
          if (result.status !== "approved") return;
          clearInterval(pollTimer);
          localStorage.setItem("torexUser", JSON.stringify(result.user));
          localStorage.setItem("torexLoggedIn", "true");
          if (result.token) localStorage.setItem("torexToken", result.token);
          if (box) { box.textContent = "✅ ثبت‌نام شما تایید شد! در حال ورود..."; box.classList.add("show", "success"); }
          showToast?.("تایید شد! خوش آمدی 🎮");
          setTimeout(() => { location.href = "index.html"; }, 1200);
        } catch {}
      }, 2000);
    } catch (error) { fail(error.message); }
  }, true);
}
/* بار اول که کاربر سایت را می‌بیند، به صفحه خوش‌آمدگویی هدایت می‌شود */
function initWelcomeRedirect() {
  /* صفحه‌ی خانه دیگر خودکار به welcom.html فرستاده نمی‌شود.
     کاربر باید خودش صفحه‌ی خوش‌آمدگویی را انتخاب کند. */
  localStorage.setItem("torexVisited", "true");
}
document.addEventListener("DOMContentLoaded", () => { initWelcomeRedirect(); addServicesLink(); initAuth(); });
