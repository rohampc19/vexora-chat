"use strict";

(function () {
  const api = window.torexRequest;
  const grid = document.getElementById("newsGrid");
  const categories = document.getElementById("newsCategories");
  const search = document.getElementById("newsSearch");
  const featured = document.querySelector(".featured-news");
  if (!api || !grid || !categories || !search) return;

  let activeCategory = "all";
  let searchTimer;
  const labels = { all: "همه", gaming: "گیمینگ", esports: "ورزش الکترونیک", updates: "به‌روزرسانی", hardware: "سخت‌افزار", pc: "PC", playstation: "PlayStation", xbox: "Xbox", nintendo: "Nintendo", mobile: "موبایل" };

  function formatDate(value) { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value)); }
  function card(item) {
    const article = document.createElement("article");
    article.className = "news-card";
    article.tabIndex = 0;
    article.innerHTML = `<div class="news-card-image">${item.image ? `<img src="${item.image}" alt="">` : ""}</div><div class="news-card-content"><span class="card-category">${labels[item.category] || item.category || "TOREX"}</span><h3></h3><p></p><div class="card-footer"><span></span><span></span></div></div>`;
    article.querySelector("h3").textContent = item.title;
    article.querySelector("p").textContent = item.excerpt || item.text.slice(0, 140);
    const footer = article.querySelectorAll(".card-footer span");
    footer[0].textContent = formatDate(item.publishedAt || item.createdAt);
    footer[1].textContent = `${Number(item.views || 0).toLocaleString("fa-IR")} بازدید`;
    const open = () => { location.href = `news-detail.html?id=${encodeURIComponent(item.id)}`; };
    article.addEventListener("click", open);
    article.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
    return article;
  }
  function renderFeatured(item) {
    if (!featured || !item) return;
    const image = featured.querySelector(".featured-image");
    const title = featured.querySelector("h2");
    const text = featured.querySelector("p");
    const tag = featured.querySelector(".news-tag");
    const link = featured.querySelector(".news-read-btn");
    image.replaceChildren();
    if (item.image) { const img = new Image(); img.src = item.image; img.alt = item.title; image.append(img); }
    title.textContent = item.title; text.textContent = item.excerpt || item.text.slice(0, 180); tag.textContent = labels[item.category] || "خبر ویژه";
    link.href = `news-detail.html?id=${encodeURIComponent(item.id)}`;
  }
  async function load() {
    grid.innerHTML = '<p class="empty-state">در حال دریافت اخبار...</p>';
    try {
      const query = new URLSearchParams({ category: activeCategory, q: search.value.trim() });
      const result = await api(`/news?${query}`);
      grid.replaceChildren();
      renderFeatured(result.featured);
      if (!result.news.length) { grid.innerHTML = '<p class="empty-state">خبری با این مشخصات پیدا نشد.</p>'; return; }
      result.news.forEach(item => grid.append(card(item)));
    } catch (error) { grid.innerHTML = `<p class="error-state">${error.message} <button type="button">تلاش دوباره</button></p>`; grid.querySelector("button")?.addEventListener("click", load); }
  }
  function buildCategories() { Object.entries(labels).forEach(([key, label]) => { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = "category" + (key === activeCategory ? " active" : ""); button.setAttribute("role", "tab"); button.addEventListener("click", () => { activeCategory = key; categories.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === button)); load(); }); categories.append(button); }); }
  buildCategories(); search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 250); }); load();
}());