"use strict";
(function () {
  const items = [
    { key: "home", href: "index.html", label: "خانه", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5h5v5"/></svg>' },
    { key: "news", href: "news.html", label: "اخبار", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4.5h13v15H6a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4.5"/></svg>' },
    { key: "community", href: "community.html", label: "کامیونیتی", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a2.5 2.5 0 1 1 0 5M15.5 15.5a4.5 4.5 0 0 1 5 4.5"/></svg>' },
    { key: "chat", href: "chat-v2.html", label: "چت", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.8-.8L4 20l1.1-3.5A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/></svg>' },
    { key: "profile", href: "profile.html", label: "پروفایل", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>' }
  ];

  function pageKey() {
    const path = location.pathname.toLowerCase().split("/").pop() || "index.html";
    if (path.includes("community") || path.includes("group")) return "community";
    if (path.includes("news")) return "news";
    if (path.includes("chat")) return "chat";
    if (path.includes("profile")) return "profile";
    return "home";
  }

  function loadNavigationStyles() {
    if (document.querySelector('link[data-vexora-navigation-css]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "navigation.css?v=20261002";
    link.dataset.vexoraNavigationCss = "1";
    document.head.appendChild(link);
  }

  function render() {
    if (!document.body) return;

    loadNavigationStyles();

    document.querySelectorAll("[data-vexora-nav]").forEach(node => node.remove());

    const active = pageKey();
    const links = items.map(item => {
      const isActive = item.key === active;
      return '<a class="vexora-nav__link' + (isActive ? ' is-active' : '') +
        '" href="' + item.href + '" aria-label="' + item.label + '"' +
        (isActive ? ' aria-current="page"' : '') + ' title="' + item.label + '">' +
        '<span class="vexora-nav__icon">' + item.icon + '</span>' +
        '<span class="vexora-nav__label">' + item.label + '</span></a>';
    }).join("");

    const nav = document.createElement("nav");
    nav.className = "vexora-nav";
    nav.dataset.vexoraNav = "1";
    nav.setAttribute("aria-label", "ناوبری اصلی");
    nav.innerHTML = '<div class="vexora-nav__inner">' + links + '</div>';

    document.body.appendChild(nav);
    document.body.classList.add("has-vexora-navigation");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render, { once: true });
  } else {
    render();
  }
}());
