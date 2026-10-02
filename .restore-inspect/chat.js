"use strict";

/* چت VEXORA CHAT — متصل به سرور، امن (بدون innerHTML برای متن کاربر) */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("messageForm"),
    input = document.getElementById("messageInput"),
    list = document.getElementById("messages"),
    page = document.querySelector(".messenger-page"),
    search = document.getElementById("userSearch"),
    searchResult = document.getElementById("searchResult"),
    stickerButton = document.getElementById("stickerButton"),
    stickerPanel = document.getElementById("stickerPanel"),
    moreButton = document.getElementById("moreButton"),
    moreMenu = document.getElementById("chatMoreMenu"),
    blockButton = document.getElementById("blockUserButton"),
    profileButton = document.getElementById("profileButton");

  let blocked = sessionStorage.getItem("torexChatBlocked") === "1";
  let muted = sessionStorage.getItem("torexChatMuted") === "1";
  const user = JSON.parse(localStorage.getItem("torexUser") || "null");
  const api = window.torexRequest || (async () => { throw new Error("سرور TOREX در دسترس نیست."); });

  let activeUser = "roham";
  let pollTimer = null;
  let lastCount = 0;

  function notice(message) {
    if (typeof showToast === "function") return showToast(message);
    let item = document.getElementById("chatNotice");
    if (!item) { item = document.createElement("div"); item.id = "chatNotice"; item.className = "chat-notice"; document.body.append(item); }
    item.textContent = message;
    item.classList.add("show");
    clearTimeout(item.timer);
    item.timer = setTimeout(() => item.classList.remove("show"), 2600);
  }

  function timeText(value) {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value || Date.now()));
  }

  /* رندر امن پیام — متن کاربر فقط با textContent */
  function render(message) {
    if (!list) return;
    const mine = message.sender === "me" || (user && message.sender === user.username);
    const row = document.createElement("div");
    row.className = "message-row " + (mine ? "sent" : "received");

    if (!mine) {
      const avatar = document.createElement("div");
      avatar.className = "small-avatar";
      avatar.textContent = (message.sender || "T")[0].toUpperCase();
      row.append(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    const content = document.createElement("p");
    content.textContent = message.text; /* امن در برابر XSS */
    const time = document.createElement("span");
    time.textContent = timeText(message.createdAt) + (mine ? " ✓✓" : "");
    bubble.append(content, time);
    row.append(bubble);
    list.append(row);
  }

  async function load(initial) {
    if (!list) return;
    try {
      const result = await api("/messages?conversation=" + encodeURIComponent(activeUser));
      if (initial) { list.replaceChildren(); lastCount = 0; }
      const fresh = result.messages.slice(initial ? 0 : lastCount);
      if (initial || fresh.length) {
        fresh.forEach(render);
        lastCount = result.messages.length;
        list.scrollTop = list.scrollHeight;
      }
    } catch { /* در loadContacts پیام داده می‌شود */ }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => load(false), 3000);
  }

  async function send() {
    const text = input?.value.trim();
    if (!text || !input) return;
    if (blocked) return notice("این گفتگو مسدود شده است.");
    if (muted) return notice("اعلان‌های گفتگو بی‌صدا هستند؛ پیام ارسال نشد.");
    if (text.length > 500) return notice("هر پیام حداکثر ۵۰۰ کاراکتر است.");
    input.disabled = true;
    try {
      const result = await api("/messages", {
        method: "POST",
        body: JSON.stringify({ conversation: activeUser, sender: user?.username || "me", text })
      });
      render(result.message);
      lastCount++;
      input.value = "";
      list.scrollTop = list.scrollHeight;
    } catch (error) { notice(error.message); }
    finally { input.disabled = blocked; input.focus(); }
  }

  function syncBlocked() {
    if (!input) return;
    input.disabled = blocked;
    input.placeholder = blocked ? "این گفتگو مسدود شده است" : "پیامت رو بنویس...";
    const label = blockButton?.querySelector("span");
    if (label) label.textContent = blocked ? "رفع مسدودی" : "مسدود کردن";
  }

  /* بارگذاری مخاطب‌ها از سرور — همه‌ی کاربرهای تاییدشده سایت */
  async function loadContacts() {
    if (!list) return;
    const container = document.getElementById("chatList");
    if (!container) return;
    try {
      const result = await api("/users");
      const contacts = result.users.filter(u => !user || u.username !== user.username);
      container.replaceChildren();
      if (!contacts.length) {
        const empty = document.createElement("div");
        empty.className = "chat-empty";
        empty.innerHTML = "<div>💬</div><span>هنوز کاربری ثبت‌نام نکرده است</span>";
        container.append(empty);
        return;
      }
      contacts.forEach((contact, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-user" + (index === 0 ? " active" : "");
        button.dataset.user = contact.username;
        const avatar = document.createElement("div");
        avatar.className = "chat-avatar" + (index === 0 ? " online" : "");
        avatar.textContent = (contact.avatar || contact.name || "T")[0].toUpperCase();
        const info = document.createElement("div");
        info.className = "chat-user-info";
        const top = document.createElement("div");
        top.className = "chat-user-top";
        const name = document.createElement("strong");
        name.textContent = contact.name || contact.username;
        const bottom = document.createElement("div");
        bottom.className = "chat-user-bottom";
        const handle = document.createElement("span");
        handle.textContent = "@" + contact.username;
        top.append(name);
        bottom.append(handle);
        info.append(top, bottom);
        button.append(avatar, info);
        button.addEventListener("click", () => {
          document.querySelectorAll(".chat-user").forEach(x => x.classList.remove("active"));
          button.classList.add("active");
          activeUser = contact.username;
          lastCount = 0;
          page?.classList.add("conversation-open");
          syncHeader(contact);
          load(true);
        });
        container.append(button);
        if (index === 0) { activeUser = contact.username; syncHeader(contact); }
      });
      if (user) load(true);
      else notice("برای مشاهده و ارسال پیام، ابتدا وارد حساب شوید.");
    } catch {
      const empty = container.querySelector(".chat-empty span");
      if (empty) empty.textContent = "برای چت آنلاین، سرور را اجرا کنید (node server.js).";
    }
  }

  function syncHeader(contact) {
    const header = document.querySelector(".conversation-user strong");
    const handle = document.getElementById("conversationHandle");
    const avatar = document.getElementById("conversationAvatar");
    if (header) header.textContent = contact.name || contact.username;
    if (handle) handle.textContent = "@" + contact.username;
    if (avatar) avatar.textContent = (contact.avatar || (contact.name || "T")[0]).toUpperCase();
  }

  /* جستجوی کاربر از سرور — کلیک روی نتیجه: پروفایل */
  if (search) {
    let searchTimer = null;
    search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        const value = search.value.trim().replace(/^@/, "");
        if (value.length < 2) { searchResult?.setAttribute("hidden", ""); return; }
        try {
          const found = await api("/users?query=" + encodeURIComponent(value));
          const profile = found.users[0];
          if (!profile || !searchResult) return;
          searchResult.removeAttribute("hidden");
          const avatar = searchResult.querySelector(".search-result-avatar");
          if (avatar) avatar.textContent = profile.avatar || (profile.name || "T")[0];
          const strong = searchResult.querySelector("strong");
          if (strong) strong.textContent = "@" + profile.username;
          searchResult.onclick = () => { if (typeof openProfile === "function") openProfile(profile.username); };
        } catch { /* سرور در دسترس نیست */ }
      }, 250);
    });
  }

  profileButton?.addEventListener("click", () => {
    if (typeof openProfile === "function") openProfile(activeUser);
  });

  stickerButton?.addEventListener("click", event => { event.stopPropagation(); stickerPanel?.classList.toggle("show"); });
  document.getElementById("closeStickers")?.addEventListener("click", () => stickerPanel?.classList.remove("show"));
  document.querySelectorAll(".stickers button").forEach(button => button.addEventListener("click", () => {
    if (!input || blocked) return;
    input.value += button.textContent.trim();
    input.focus();
    stickerPanel?.classList.remove("show");
  }));
  document.querySelectorAll(".sticker-tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".sticker-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  }));

  moreButton?.addEventListener("click", event => { event.stopPropagation(); moreMenu?.classList.toggle("show"); });
  document.getElementById("muteUserButton")?.addEventListener("click", () => {
    muted = !muted;
    sessionStorage.setItem("torexChatMuted", muted ? "1" : "0");
    notice(muted ? "اعلان‌های گفتگو بی‌صدا شد." : "اعلان‌های گفتگو فعال شد.");
    moreMenu?.classList.remove("show");
  });
  blockButton?.addEventListener("click", () => {
    blocked = !blocked;
    sessionStorage.setItem("torexChatBlocked", blocked ? "1" : "0");
    syncBlocked();
    notice(blocked ? "گفتگو مسدود شد." : "مسدودی گفتگو برداشته شد.");
    moreMenu?.classList.remove("show");
  });

  document.getElementById("mobileBack")?.addEventListener("click", () => page?.classList.remove("conversation-open"));

  document.addEventListener("click", event => {
    if (!moreMenu?.contains(event.target) && event.target !== moreButton) moreMenu?.classList.remove("show");
    if (!stickerPanel?.contains(event.target) && event.target !== stickerButton) stickerPanel?.classList.remove("show");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { moreMenu?.classList.remove("show"); stickerPanel?.classList.remove("show"); }
  });

  syncBlocked();
  loadContacts();
  if (user) startPolling();
});
