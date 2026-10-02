"use strict";

/* صفحه جزئیات خبر — سبک اینستاگرام: لایک، کامنت، فالو */

document.addEventListener("DOMContentLoaded", () => {

  const api = window.torexRequest || (async () => { throw new Error("سرور TOREX در دسترس نیست."); });

  const user = JSON.parse(localStorage.getItem("torexUser") || "null");
  const me = user ? user.username : "";

  const params = new URLSearchParams(location.search);
  const newsId = params.get("id") || "";

  const $ = id => document.getElementById(id);

  let currentNews = null;

  function toast(message) {
    if (typeof showToast === "function") return showToast(message);
    alert(message);
  }

  function timeAgo(value) {
    const diff = (Date.now() - new Date(value).getTime()) / 1000;
    if (diff < 60) return "همین حالا";
    if (diff < 3600) return Math.floor(diff / 60) + " دقیقه پیش";
    if (diff < 86400) return Math.floor(diff / 3600) + " ساعت پیش";
    return new Intl.DateTimeFormat("fa-IR").format(new Date(value));
  }

  function renderAuthor(profile) {
    $("postAvatar").textContent = profile.avatar || (profile.name || "T")[0];
    $("postAuthorName").innerHTML = "";
    const name = document.createElement("span");
    name.textContent = profile.name || profile.username;
    $("postAuthorName").append(name);
    if (profile.verified) {
      const tick = document.createElement("span");
      tick.className = "torex-verified";
      tick.textContent = "✓";
      tick.title = "حساب معتبر";
      $("postAuthorName").append(" ", tick);
    }
    $("postAuthorHandle").textContent = "@" + profile.username;
    syncFollow(profile.isFollowing);
  }

  let followState = false;

  function syncFollow(state) {
    followState = !!state;
    const button = $("followButton");
    button.textContent = followState ? "دنبال می‌کنید ✓" : "دنبال کردن";
    button.classList.toggle("following", followState);
  }

  function renderComments(comments) {
    const list = $("commentsList");
    list.replaceChildren();
    if (!comments.length) {
      const empty = document.createElement("p");
      empty.className = "insta-comments__empty";
      empty.textContent = "هنوز نظری ثبت نشده — اولین نفر باش!";
      list.append(empty);
      return;
    }
    comments.forEach((comment, index) => {
      const row = document.createElement("div");
      row.className = "insta-comment" + (comment.replyTo ? " insta-comment--reply" : "");
      if (comment.replyTo) row.style.marginInlineStart = "36px";

      const avatar = document.createElement("span");
      avatar.className = "torex-author__avatar";
      avatar.textContent = (comment.name || comment.user || "T")[0];

      const body = document.createElement("div");

      const head = document.createElement("strong");
      head.textContent = comment.name || comment.user || "کاربر";
      if (comment.replyTo) head.textContent += " ← " + (comment.replyToName || comment.replyTo);

      const text = document.createElement("p");
      text.textContent = comment.text;

      const time = document.createElement("small");
      time.textContent = timeAgo(comment.createdAt);

      const replyButton = document.createElement("button");
      replyButton.type = "button";
      replyButton.textContent = "پاسخ";
      replyButton.style.cssText = "background:none;border:0;color:#a29bfe;cursor:pointer;font-size:12px;padding:0;margin-top:4px";
      replyButton.addEventListener("click", () => {
        const input = $("commentInput");
        input.value = "@" + (comment.user || "") + " ";
        input.focus();
        input.dataset.replyIndex = String(index);
        input.dataset.replyUser = comment.user || "";
      });

      body.append(head, text, time, replyButton);
      row.append(avatar, body);
      list.append(row);
    });
  }

  function syncLikes(likes, liked) {
    $("likeCount").textContent = Number(likes).toLocaleString("fa-IR");
    $("likeButton").classList.toggle("liked", !!liked);
    const icon = $("likeButton").querySelector("i");
    icon.className = liked ? "fa-solid fa-heart" : "fa-regular fa-heart";
  }

  async function load() {
    if (!newsId) { $("postTitle").textContent = "خبر پیدا نشد."; return; }
    try {
      const result = await api("/news/" + encodeURIComponent(newsId) + "?user=" + encodeURIComponent(me));
      currentNews = result.news;

      $("postTitle").textContent = currentNews.title;
      $("postText").textContent = currentNews.text;
      $("postTime").textContent = timeAgo(currentNews.createdAt);
      $("postCategory").textContent = (currentNews.tags || ["TOREX"])[0] || "TOREX";

      const image = $("postImage");
      if (currentNews.image) {
        image.replaceChildren();
        const img = document.createElement("img");
        img.src = currentNews.image;
        img.alt = currentNews.title;
        image.append(img);
      }

      const tags = $("postTags");
      tags.replaceChildren();
      (currentNews.tags || []).forEach(tag => {
        const chip = document.createElement("span");
        chip.textContent = "#" + tag;
        tags.append(chip);
      });

      syncLikes(currentNews.likes, currentNews.liked);
      $("commentCount").textContent = Number((currentNews.comments || []).length).toLocaleString("fa-IR");
      renderComments(currentNews.comments || []);

      try {
        const profileResult = await api("/users/" + encodeURIComponent(currentNews.author) + "?follower=" + encodeURIComponent(me));
        renderAuthor(profileResult.profile);
      } catch { renderAuthor({ username: currentNews.author, name: currentNews.authorName, verified: currentNews.verified }); }
    } catch (error) {
      $("postTitle").textContent = "خطا در دریافت خبر";
      $("postText").textContent = error.message;
    }
  }

  $("likeButton")?.addEventListener("click", async () => {
    if (!currentNews) return;
    try {
      const result = await api("/news/" + encodeURIComponent(currentNews.id) + "/like", { method: "POST", body: JSON.stringify({}) });
      syncLikes(result.likes, result.liked);
    } catch (error) { toast(error.message); }
  });

  $("followButton")?.addEventListener("click", async () => {
    if (!user) { toast("برای دنبال کردن ابتدا وارد شوید."); location.href = "login.html"; return; }
    if (!currentNews) return;
    try {
      const result = await api("/follow", { method: "POST", body: JSON.stringify({ follower: user.username, target: currentNews.author }) });
      syncFollow(result.following);
      toast(result.following ? "کاربر دنبال شد." : "دنبال کردن لغو شد.");
    } catch (error) { toast(error.message); }
  });

  $("viewProfileButton")?.addEventListener("click", () => { if (currentNews && typeof openProfile === "function") openProfile(currentNews.author); });
  $("postAuthor")?.addEventListener("click", () => { if (currentNews && typeof openProfile === "function") openProfile(currentNews.author); });

  $("commentFocus")?.addEventListener("click", () => $("commentInput")?.focus());

  $("shareButton")?.addEventListener("click", async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: currentNews?.title || "VEXORA CHAT", url });
      else { await navigator.clipboard.writeText(url); toast("لینک خبر کپی شد."); }
    } catch { /* لغو شده توسط کاربر */ }
  });

  $("commentForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentNews) return;
    const input = $("commentInput");
    const text = input.value.replace(/@\S+\s?/, "").trim() || input.value.trim();
    if (!text) return;
    if (!user) { toast("برای ثبت نظر ابتدا وارد شوید."); location.href = "login.html"; return; }
    try {
      const replyIndex = input.dataset.replyIndex;
      const url = replyIndex != null && input.dataset.replyUser
        ? "/news/" + encodeURIComponent(currentNews.id) + "/comment/" + replyIndex
        : "/news/" + encodeURIComponent(currentNews.id) + "/comment";
      const result = await api(url, { method: "POST", body: JSON.stringify({ text }) });
      currentNews.comments = currentNews.comments || [];
      currentNews.comments.push(result.comment);
      $("commentCount").textContent = Number(currentNews.comments.length).toLocaleString("fa-IR");
      renderComments(currentNews.comments);
      input.value = "";
      delete input.dataset.replyIndex;
      delete input.dataset.replyUser;
      toast("نظر شما ثبت شد.");
    } catch (error) { toast(error.message); }
  });

  load();
});
