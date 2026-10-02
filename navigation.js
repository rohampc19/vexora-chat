"use strict";
/* VEXORA Chat — shared floating glass navigation. */
(function () {
  const BRAND_NAME = "VEXORA Chat";
  const path = location.pathname.toLowerCase();

  const current =
    path.includes("community") || path.includes("groups") || path.includes("group.html") ? "community" :
    path.includes("news") ? "news" :
    path.includes("chat") ? "chat" :
    path.includes("profile") ? "profile" :
    "home";

  const pageTitles = {
    home: "خانه",
    news: "اخبار",
    community: "کامیونیتی",
    chat: "چت",
    profile: "پروفایل"
  };

  document.title = `${BRAND_NAME} | ${pageTitles[current] || ""}`;

  const items = [
    { key: "home", href: "index.html", label: "خانه" },
    { key: "news", href: "news.html", label: "اخبار" },
    { key: "community", href: "community.html", label: "کامیونیتی" },
    { key: "chat", href: "chat-v2.html", label: "چت" },
    { key: "profile", href: "profile.html", label: "پروفایل" }
  ];

  function loadPolish() {
    if (!document.querySelector('link[data-vexora-polish]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "mobile.css";
      link.dataset.vexoraPolish = "1";
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[data-button-system]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "button-system.css";
      link.dataset.buttonSystem = "1";
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[data-vexora-premium]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "premium-ui.css";
      link.dataset.vexoraPremium = "1";
      document.head.appendChild(link);
    }
  }

  function icon(key) {
    const icons = {
      home: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
      news: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4h13v16H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
      community: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a2.5 2.5 0 1 1 0 5"/><path d="M15 15a4.5 4.5 0 0 1 5.5 5"/></svg>',
      chat: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.7-.8L4 20l1.1-3.5A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/></svg>',
      profile: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>'
    };
    return icons[key];
  }

  function markup() {
    const links = items.map(item => {
      const active = item.key === current;
      return `<a class="global-nav__link${active ? " is-active" : ""}" data-page="${item.key}" href="${item.href}" aria-current="${active ? "page" : "false"}" aria-label="${item.label}" title="${item.label}">${icon(item.key)}<span>${item.label}</span></a>`;
    }).join("");

    return `<nav class="global-header" data-global-header aria-label="ناوبری اصلی"><div class="global-header__inner"><div class="global-nav">${links}</div></div></nav>`;
  }

  const LEGACY_SELECTORS = [
    ".mobile-nav",
    ".mobile-bottom-nav",
    ".mobile-chat-nav",
    ".community-mobile-nav",
    ".bottom-nav",
    ".home-header",
    ".site-header",
    ".profile-header",
    ".slim-nav",
    ".main-header"
  ];

  function bindFeatureCards() {
    document.querySelectorAll(".feature-card").forEach(card => {
      const destination = card.querySelector("a[href]");
      if (!destination || card.dataset.cardNavigationBound === "true") return;
      card.dataset.cardNavigationBound = "true";
      card.tabIndex = 0;
      card.addEventListener("click", event => {
        if (event.target.closest("a,button,input,textarea,select")) return;
        location.href = destination.href;
      });
      card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        location.href = destination.href;
      });
    });
  }

  function mount() {
    loadPolish();

    document.querySelectorAll("[data-global-header], .global-header").forEach(node => node.remove());
    LEGACY_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => node.remove());
    });

    if (!document.body) return;

    document.body.insertAdjacentHTML("afterbegin", markup());
    document.body.classList.add("has-global-navigation");
    bindFeatureCards();
  }

  window.WEXORAChatToast = function (message, type = "info") {
    let box = document.querySelector(".wexora-toast-container");
    if (!box) {
      box = document.createElement("div");
      box.className = "wexora-toast-container";
      document.body.appendChild(box);
    }
    const toast = document.createElement("div");
    toast.className = `wexora-toast wexora-toast--${type}`;
    toast.textContent = message;
    box.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 220);
    }, 2600);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
}());
