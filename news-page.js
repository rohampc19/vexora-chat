"use strict";

(function () {
  const api = window.PERFASHINALRequest;
  const grid = document.getElementById("newsGrid");
  const categories = document.getElementById("newsCategories");
  const featured = document.querySelector(".featured-news");
  if (!grid) return;

  let activeCategory = "all";
  const labels = { all: "همه", gaming: "Gaming", esports: "Esports" };
  const localNews = () => typeof getLocalDemoNews === "function" ? getLocalDemoNews() : [];
  const articleHref = item => `news-detail.html?id=${encodeURIComponent(item.id)}`;
  const safeDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? new Date(0) : date; };
  const safeText = value => String(value || "");
  function breakingRank(item) { return (item.isOfficial ? 1000000 : 0) + (item.isBreaking ? 500000 : 0) + Number(item.views || 0) * 10 + safeDate(item.publishedAt || item.createdAt).getTime() / 1000000; }

  function renderBreaking(items) {
    const target = document.getElementById("breakingNewsGrid");
    if (!target) return;
    target.replaceChildren();
    items.slice().sort((a, b) => breakingRank(b) - breakingRank(a)).slice(0, 3).forEach(item => {
      const card = document.createElement("article"); card.className = "breaking-card"; card.dataset.articleId = item.id;
      const top = document.createElement("div"); top.className = "breaking-card__top";
      const badge = document.createElement("span"); badge.textContent = item.isBreaking ? "خبر فوری" : "پربازدید"; top.append(badge);
      if (item.isOfficial) { const official = document.createElement("b"); official.textContent = "✓ رسمی"; top.append(official); }
      const title = document.createElement("h3"); title.textContent = safeText(item.title);
      const excerpt = document.createElement("p"); excerpt.textContent = safeText(item.excerpt || safeText(item.text).slice(0, 140));
      const link = document.createElement("a"); link.className = "news-read-btn"; link.href = articleHref(item); link.textContent = "ادامه اخبار ←"; link.addEventListener("click", event => event.stopPropagation());
      const open = () => { location.href = articleHref(item); };
      card.addEventListener("click", open);
      card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
      card.tabIndex = 0;
      card.append(top, title, excerpt, link); target.append(card);
    });
  }

  function formatDate(value) { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(safeDate(value)); }
  function card(item) {
    const article = document.createElement("article"); article.className = "news-card"; article.dataset.articleId = item.id; article.tabIndex = 0;
    const imageBox = document.createElement("div"); imageBox.className = "news-card-image";
    if (item.image) { const img = document.createElement("img"); img.src = item.image; img.alt = safeText(item.title); img.loading = "lazy"; img.onerror = () => { img.remove(); imageBox.innerHTML = '<i class="fa-solid fa-newspaper"></i>'; }; imageBox.append(img); } else imageBox.innerHTML = '<i class="fa-solid fa-newspaper"></i>';
    const content = document.createElement("div"); content.className = "news-card-content";
    const top = document.createElement("div"); top.className = "news-card-top";
    const category = document.createElement("span"); category.className = "card-category"; category.textContent = labels[item.category] || item.category || "خبر"; top.append(category);
    if (item.isOfficial) { const official = document.createElement("span"); official.className = "official-label"; official.textContent = "✓ رسمی"; top.append(official); }
    const title = document.createElement("h3"); title.textContent = safeText(item.title);
    const excerpt = document.createElement("p"); excerpt.textContent = safeText(item.excerpt || safeText(item.text).slice(0, 140));
    const author = document.createElement("button"); author.type = "button"; author.className = "news-card-author"; author.setAttribute("aria-label", "مشاهده پروفایل نویسنده");
    const avatar = document.createElement("span"); avatar.textContent = safeText(item.authorName || item.author || "A")[0] || "A";
    const authorName = document.createElement("b"); authorName.textContent = item.authorName || item.author || "ادمین";
    const handle = document.createElement("small"); handle.textContent = "@" + (item.author || "admin"); author.append(avatar, authorName, handle);
    author.addEventListener("click", event => { event.stopPropagation(); location.href = `profile.html?user=${encodeURIComponent(item.author || "admin")}`; });
    const footer = document.createElement("div"); footer.className = "card-footer";
    [formatDate(item.publishedAt || item.createdAt), item.game || labels[item.category] || "خبر", `${Number(item.views || 0).toLocaleString("fa-IR")} بازدید`].forEach(value => { const span = document.createElement("span"); span.textContent = value; footer.append(span); });
    const link = document.createElement("a"); link.className = "news-read-btn"; link.href = articleHref(item); link.textContent = "ادامه اخبار ←"; link.addEventListener("click", event => event.stopPropagation());
    content.append(top, title, excerpt, author, footer, link); article.append(imageBox, content);
    const open = () => { location.href = articleHref(item); };
    article.addEventListener("click", open); article.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
    return article;
  }

  function renderFeatured(item) {
    if (!featured || !item) return;
    const image = featured.querySelector(".featured-image"); const title = featured.querySelector("h2"); const text = featured.querySelector("p"); const tag = featured.querySelector(".news-tag"); const meta = featured.querySelector(".news-meta"); const link = featured.querySelector(".news-read-btn");
    if (image) { image.replaceChildren(); if (item.image) { const img = document.createElement("img"); img.src = item.image; img.alt = safeText(item.title); img.onerror = () => img.remove(); image.append(img); } }
    if (title) title.textContent = safeText(item.title); if (text) text.textContent = safeText(item.excerpt || safeText(item.text).slice(0, 180)); if (tag) tag.textContent = item.isOfficial ? "✓ رسماً توسط ادمین منتشر شده" : (labels[item.category] || "خبر ویژه");
    if (meta) { meta.replaceChildren(); [["🎮 ", item.game || labels[item.category] || "خبر"], ["🕐 ", formatDate(item.publishedAt || item.createdAt)], ["👁️ ", `${Number(item.views || 0).toLocaleString("fa-IR")} بازدید`]].forEach(([prefix, value]) => { const span = document.createElement("span"); span.textContent = prefix + value; meta.append(span); }); }
    if (link) { link.href = articleHref(item); link.addEventListener("click", event => event.stopPropagation()); }
    const open = () => { location.href = articleHref(item); };
    featured.addEventListener("click", open); featured.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }); featured.tabIndex = 0;
  }

  async function load() {
    grid.replaceChildren(); const loading = document.createElement("p"); loading.className = "empty-state"; loading.textContent = "در حال دریافت اخبار..."; grid.append(loading);
    try {
      const query = new URLSearchParams({ category: activeCategory }); let result;
      try { if (!api) throw new Error("local demo"); result = await api(`/news?${query}`); }
      catch (_) { const news = localNews().filter(item => activeCategory === "all" || item.category === activeCategory); result = { featured: news.slice().sort((a, b) => breakingRank(b) - breakingRank(a))[0], news }; }
      const items = Array.isArray(result?.news) ? result.news : [];
      grid.replaceChildren(); renderBreaking(items); renderFeatured(result?.featured || items[0]);
      if (!items.length) { const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "خبری با این مشخصات پیدا نشد."; grid.append(empty); return; }
      items.forEach(item => grid.append(card(item)));
    } catch (error) { grid.replaceChildren(); const state = document.createElement("p"); state.className = "error-state"; state.textContent = error.message || "دریافت اخبار ناموفق بود."; const retry = document.createElement("button"); retry.type = "button"; retry.textContent = "تلاش دوباره"; retry.addEventListener("click", load); state.append(" ", retry); grid.append(state); }
  }

  function buildCategories() { if (!categories) return; categories.replaceChildren(); Object.entries(labels).forEach(([key, label]) => { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = "category" + (key === activeCategory ? " active" : ""); button.setAttribute("role", "tab"); button.setAttribute("aria-selected", String(key === activeCategory)); button.addEventListener("click", () => { activeCategory = key; categories.querySelectorAll("button").forEach(x => { x.classList.toggle("active", x === button); x.setAttribute("aria-selected", String(x === button)); }); load(); }); categories.append(button); }); }
  buildCategories(); load();
}());