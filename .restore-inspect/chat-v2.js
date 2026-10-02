"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const api = window.torexRequest;
  const user = getUser();
  const page = document.querySelector(".messenger-page");
  const list = document.getElementById("chatList");
  const messages = document.getElementById("messages");
  const form = document.getElementById("messageForm");
  const input = document.getElementById("messageInput");
  const search = document.getElementById("userSearch");
  const result = document.getElementById("searchResult");
  let contacts = [], active = null, timer;

  const time = value => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  function setState(text, type = "empty-state") { messages.replaceChildren(); const box = document.createElement("p"); box.className = type; box.textContent = text; messages.append(box); }
  function renderMessage(item) { const mine = item.sender === user?.username; const row = document.createElement("div"); row.className = `message-row ${mine ? "sent" : "received"}`; if (!mine) { const avatar = document.createElement("span"); avatar.className = "small-avatar"; avatar.textContent = item.sender[0].toUpperCase(); row.append(avatar); } const bubble = document.createElement("div"); bubble.className = "message-bubble"; const text = document.createElement("p"); text.textContent = item.text; const stamp = document.createElement("span"); stamp.textContent = time(item.createdAt) + (mine ? " ✓" : ""); bubble.append(text, stamp); row.append(bubble); messages.append(row); }
  async function loadMessages() { if (!active || !user) return; setState("در حال دریافت پیام‌ها..."); try { const data = await api(`/messages?conversation=${encodeURIComponent(active.username)}`); messages.replaceChildren(); if (!data.messages.length) setState("هنوز پیامی در این گفتگو نیست."); else data.messages.forEach(renderMessage); messages.scrollTop = messages.scrollHeight; } catch (error) { setState(error.message, "error-state"); } }
  function activate(contact) { active = contact; document.querySelectorAll(".chat-user").forEach(item => item.classList.toggle("active", item.dataset.user === contact.username)); document.getElementById("conversationAvatar").textContent = (contact.avatar || contact.name || "T")[0].toUpperCase(); document.getElementById("conversationName").textContent = contact.name || contact.username; document.getElementById("conversationHandle").textContent = `@${contact.username}`; input.disabled = !user; page.classList.add("conversation-open"); loadMessages(); }
  function renderContacts(filtered = contacts) { list.replaceChildren(); if (!filtered.length) { list.innerHTML = '<div class="chat-empty">گفتگویی پیدا نشد.</div>'; return; } filtered.forEach(contact => { const button = document.createElement("button"); button.type = "button"; button.className = "chat-user"; button.dataset.user = contact.username; button.innerHTML = `<span class="chat-avatar">${(contact.avatar || contact.name || "T")[0]}</span><span class="chat-user-info"><span class="chat-user-top"><strong></strong></span><span class="chat-user-bottom"><span>@${contact.username}</span></span></span>`; button.querySelector("strong").textContent = contact.name || contact.username; button.addEventListener("click", () => activate(contact)); list.append(button); }); }
  async function loadContacts() { if (!api) return setState("سرویس چت در دسترس نیست.", "error-state"); try { const data = await api("/users"); contacts = data.users.filter(contact => contact.username !== user?.username); document.getElementById("messageCount").textContent = contacts.length.toLocaleString("fa-IR"); renderContacts(); if (user && contacts[0]) activate(contacts[0]); else if (!user) setState("برای دیدن و ارسال پیام وارد حساب شوید."); } catch (error) { list.innerHTML = `<p class="error-state">${error.message}</p>`; } }
  form.addEventListener("submit", async event => { event.preventDefault(); const text = input.value.trim(); if (!user) return location.href = "login.html"; if (!active || !text) return; input.disabled = true; try { const data = await api("/messages", { method: "POST", body: JSON.stringify({ conversation: active.username, text }) }); input.value = ""; renderMessage(data.message); messages.scrollTop = messages.scrollHeight; } catch (error) { showToast(error.message); } finally { input.disabled = false; input.focus(); } });
  search.addEventListener("input", () => { const value = search.value.trim().toLowerCase().replace(/^@/, ""); renderContacts(contacts.filter(contact => !value || contact.username.includes(value) || String(contact.name || "").toLowerCase().includes(value))); const match = contacts.find(contact => contact.username.includes(value)); result.hidden = !value || !match; if (match) { result.querySelector(".search-result-avatar").textContent = (match.avatar || match.name || "T")[0]; result.querySelector("strong").textContent = match.name || match.username; result.onclick = () => activate(match); } });
  document.getElementById("mobileBack").addEventListener("click", () => page.classList.remove("conversation-open"));
  document.getElementById("profileButton").addEventListener("click", () => active && openProfile(active.username));
  document.getElementById("clearButton").addEventListener("click", () => active && setState("برای دریافت دوباره پیام‌ها، گفتگو را دوباره باز کنید."));
  document.getElementById("stickerButton").addEventListener("click", () => { if (!input.disabled) { input.value += " 🙂"; input.focus(); } });
  window.addEventListener("beforeunload", () => clearInterval(timer));
  loadContacts(); if (user) timer = setInterval(loadMessages, 5000);
});