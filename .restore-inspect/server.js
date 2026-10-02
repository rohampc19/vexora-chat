"use strict";

// VEXORA CHAT development server. It deliberately uses only Node's standard
// library, so the project can run without installing packages.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

// Force UTF-8 output so non-ASCII text does not render as boxes
try { require("child_process").execSync("chcp 65001 >nul", { shell: "cmd.exe" }); } catch {}

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(ROOT, "torex-data.json");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };

const initialData = {
  users: [
    { id: "u-admin", username: "admin", name: "ادمین TOREX", phone: "09120000000", password: "admin-demo", score: 9999, favoriteGame: "VEXORA CHAT", avatar: "T", role: "admin", status: "approved" }
  ],
  messages: [],
  news: [],
  follows: [],
  notifications: [],
  sessions: []
};

const seedNews = [
  { id: "n-gta6", title: "جزئیات تازه از یکی از موردانتظارترین بازی‌های سال", excerpt: "نگاهی به خبرهای مهم این هفته از دنیای بازی و به‌روزرسانی‌های استودیوها.", text: "تازه‌ترین گزارش‌ها از روند توسعه و برنامه‌های آینده منتشر شده است. این خبر با تمرکز بر اطلاعات قابل بررسی و بدون شایعه‌پردازی گردآوری شده است.", category: "gaming", tags: ["Gaming", "Updates"], author: "admin", authorName: "ادمین TOREX", verified: true, image: "", likes: [], comments: [], createdAt: new Date().toISOString(), publishedAt: new Date().toISOString(), views: 2400, status: "published" },
  { id: "n-esports", title: "تقویم رقابت‌های مهم ورزش‌های الکترونیک", excerpt: "مسابقات مهم این ماه را از دست ندهید؛ برنامه و نتایج در VEXORA CHAT دنبال می‌شود.", text: "از رقابت‌های تیمی تا مسابقات انفرادی، رویدادهای مهم ماه را در دسته ورزش الکترونیک دنبال کنید.", category: "esports", tags: ["Esports", "TOREX"], author: "admin", authorName: "ادمین TOREX", verified: true, image: "", likes: [], comments: [], createdAt: new Date(Date.now() - 86400000).toISOString(), publishedAt: new Date(Date.now() - 86400000).toISOString(), views: 980, status: "published" },
  { id: "n-hardware", title: "راهنمای کوتاه ارتقای سیستم برای بازی روان‌تر", excerpt: "قبل از خرید قطعه جدید، این نکات را برای انتخاب هوشمندانه بررسی کنید.", text: "ارتقای سیستم همیشه به معنای خرید گران‌ترین قطعه نیست. ابتدا گلوگاه سیستم را پیدا کنید و سپس اولویت ارتقا را مشخص کنید.", category: "hardware", tags: ["Hardware", "PC"], author: "admin", authorName: "ادمین TOREX", verified: true, image: "", likes: [], comments: [], createdAt: new Date(Date.now() - 172800000).toISOString(), publishedAt: new Date(Date.now() - 172800000).toISOString(), views: 640, status: "published" }
];
function loadData() { try { const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); if (!Array.isArray(data.news) || !data.news.length) data.news = structuredClone(seedNews); return data; } catch { const data = structuredClone(initialData); data.news = structuredClone(seedNews); return data; } }
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8"); }
function reply(res, code, body) { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let value = ""; req.on("data", c => { value += c; if (value.length > 1e6) req.destroy(); }); req.on("end", () => { try { resolve(value ? JSON.parse(value) : {}); } catch { reject(new Error("بدنهٔ درخواست نامعتبر است.")); } }); }); }
function token() { return crypto.randomBytes(24).toString("hex"); }
function publicUser(user) { const { password, phone, ...safe } = user; return safe; }
function sessionUser(data, req) { const header = String(req.headers.authorization || ""); const value = header.startsWith("Bearer ") ? header.slice(7) : ""; const session = data.sessions.find(item => item.token === value); return session ? data.users.find(user => user.id === session.userId) : null; }
function requireUser(data, req, res) { const user = sessionUser(data, req); if (!user) { reply(res, 401, { error: "برای این عملیات باید وارد شوید." }); return null; } return user; }
function requireAdmin(data, req, res) { const user = requireUser(data, req, res); if (!user) return null; if (user.role !== "admin") { reply(res, 403, { error: "دسترسی مدیر لازم است." }); return null; } return user; }
function isAdmin(req, body) { const key = String((body && body.adminKey) || url2key(req) || ""); return key === "torex-admin-2026"; }
function url2key(req) { try { return new URL(req.url, "http://x").searchParams.get("adminKey") || ""; } catch { return ""; } }
function notify(data, username, type, from, text) { data.notifications = data.notifications || []; data.notifications.push({ id: `no-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, user: username, type, from, text, read: false, createdAt: new Date().toISOString() }); }

/* Registration approval from the terminal - y: approve, n: reject */
const rl = process.stdin.isTTY
  ? readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "" })
  : null;
if (rl) rl.on("SIGINT", () => { rl.close(); process.exit(0); });
function askRegistration(username) {
  if (!rl) {
    console.log("[INFO] Pending registration: " + username + " (approve from admin.html)");
    return;
  }
  process.stdout.write("\n[NEW] New registration request: \"" + username + "\"\nApprove? (y = approve / n = reject): ");
  rl.once("line", answer => {
    const data = loadData();
    const user = data.users.find(u => u.username === username && u.status === "pending");
    if (!user) { console.log("[!] This request no longer exists."); return; }
    if (answer.trim().toLowerCase() === "y") {
      user.status = "approved";
      notify(data, username, "approved", "admin", "Your registration was approved. Welcome to VEXORA CHAT!");
      saveData(data);
      console.log("\n[OK] Approved! User \"" + username + "\" can now log in.");
    } else {
      data.users = data.users.filter(u => u.username !== username);
      saveData(data);
      console.log("[X] Request for \"" + username + "\" was rejected and removed.");
    }
  });
}

async function api(req, res, url) {
  const data = loadData();
  const viewer = sessionUser(data, req);
  const me = viewer ? viewer.username : "";
  if (req.method === "GET" && url.pathname === "/api/news") {
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();
    const category = (url.searchParams.get("category") || "all").trim().toLowerCase();
    const list = (data.news || []).filter(item => item.status !== "draft").filter(item => category === "all" || String(item.category || "gaming").toLowerCase() === category).filter(item => !query || [item.title, item.text, item.excerpt, ...(item.tags || [])].join(" ").toLowerCase().includes(query)).map(item => ({ ...item, verified: true, likes: (item.likes || []).length, liked: !!me && (item.likes || []).includes(me), comments: (item.comments || []).length })).sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    return reply(res, 200, { featured: list[0] || null, news: list });
  }
  const newsMatch = url.pathname.match(/^\/api\/news\/([^/]+)$/);
  if (req.method === "GET" && newsMatch) { const item = (data.news || []).find(entry => entry.id === newsMatch[1]); if (!item || item.status === "draft") return reply(res, 404, { error: "خبر پیدا نشد." }); item.views = Number(item.views || 0) + 1; saveData(data); const related = (data.news || []).filter(entry => entry.id !== item.id && entry.status !== "draft" && entry.category === item.category).slice(0, 3); return reply(res, 200, { news: { ...item, verified: true, likes: (item.likes || []).length, liked: !!me && (item.likes || []).includes(me), related } }); }
  if (req.method === "GET" && url.pathname === "/api/users") { const query = (url.searchParams.get("query") || "").trim().toLowerCase().replace(/^@/, ""); const list = data.users.filter(u => u.status !== "pending").map(publicUser).filter(user => !query || user.username.toLowerCase().includes(query) || String(user.name || "").toLowerCase().includes(query)).slice(0, 12); return reply(res, 200, { users: list }); }
  if (req.method === "POST" && url.pathname === "/api/news") { const owner = requireUser(data, req, res); if (!owner) return; const body = await readBody(req); const title = String(body.title || "").trim(); const text = String(body.text || "").trim(); const author = owner.username; if (!title || title.length > 140 || !text || text.length > 3000 || !owner) return reply(res, 400, { error:"عنوان، متن و حساب کاربری معتبر لازم است." }); const image = String(body.image || ""); if (image && (!image.startsWith("data:image/") || image.length > 900000)) return reply(res, 400, { error:"تصویر معتبر نیست یا حجم آن بیش از حد مجاز است." }); const tags = String(body.tags || "").split(/\s+/).filter(value => value.startsWith("#")).slice(0, 8).map(value => value.slice(1, 33)); const item = { id:`n-${Date.now()}`, title, text, tags, author:owner.username, authorName:owner.name, verified:true, image, likes:[], comments:[], createdAt:new Date().toISOString(), views:0 }; data.news = data.news || []; data.news.push(item); saveData(data); return reply(res, 201, { news:{ ...item, likes:0, liked:false } }); }
  const likeMatch = url.pathname.match(/^\/api\/news\/([^/]+)\/like$/);
  if (req.method === "POST" && likeMatch) { const viewer = requireUser(data, req, res); if (!viewer) return; const item = (data.news || []).find(entry => entry.id === likeMatch[1]); if (!item) return reply(res, 404, { error:"خبر پیدا نشد." }); item.likes = item.likes || []; const username = viewer.username; const index = item.likes.indexOf(username); if (index >= 0) item.likes.splice(index, 1); else item.likes.push(username); saveData(data); return reply(res, 200, { likes:item.likes.length, liked:index < 0 }); }
  const commentMatch = url.pathname.match(/^\/api\/news\/([^/]+)\/comment$/);
  if (req.method === "POST" && commentMatch) { const user = requireUser(data, req, res); if (!user) return; const body = await readBody(req); const item = (data.news || []).find(entry => entry.id === commentMatch[1]); const text = String(body.text || "").trim(); if (!item || !text || text.length > 300 || !user) return reply(res, 400, { error:"متن نظر یا حساب کاربری معتبر نیست." }); const comment = { id:`c-${Date.now()}`, user:user.username, name:user.name, text, createdAt:new Date().toISOString() }; item.comments = item.comments || []; item.comments.push(comment); if (item.author && item.author !== user.username) notify(data, item.author, "comment", user.username, "@" + user.username + " روی خبر شما نظر داد: " + text.slice(0, 60)); saveData(data); return reply(res, 201, { comment }); }
  if (req.method === "POST" && url.pathname === "/api/follow") { const viewer = requireUser(data, req, res); if (!viewer) return; const body = await readBody(req); const follower = viewer.username; const target = String(body.target || "").toLowerCase(); if (follower === target || !data.users.some(u => u.username === follower) || !data.users.some(u => u.username === target)) return reply(res, 400, { error:"درخواست فالو معتبر نیست." }); const index = data.follows.findIndex(entry => entry.follower === follower && entry.target === target); if (index >= 0) { data.follows.splice(index, 1); saveData(data); return reply(res, 200, { following:false }); } data.follows.push({ follower, target, createdAt:new Date().toISOString() }); notify(data, target, "follow", follower, "@" + follower + " شما را دنبال کرد."); saveData(data); return reply(res, 200, { following:true }); }
  const replyMatch = url.pathname.match(/^\/api\/news\/([^/]+)\/comment\/(\d+)$/);
  if (req.method === "POST" && replyMatch) { const user = requireUser(data, req, res); if (!user) return; const body = await readBody(req); const item = (data.news || []).find(entry => entry.id === replyMatch[1]); const parentIndex = Number(replyMatch[2]); const parent = item && (item.comments || [])[parentIndex]; const text = String(body.text || "").trim(); if (!item || !parent || !text || text.length > 300 || !user) return reply(res, 400, { error:"متن پاسخ یا حساب کاربری معتبر نیست." }); const comment = { id:`c-${Date.now()}`, user:user.username, name:user.name, text, replyTo: parent.user, replyToName: parent.name, createdAt:new Date().toISOString() }; item.comments.push(comment); if (parent.user && parent.user !== user.username) notify(data, parent.user, "reply", user.username, "@" + user.username + " به نظر شما پاسخ داد: " + text.slice(0, 60)); saveData(data); return reply(res, 201, { comment }); }
  if (req.method === "GET" && /^\/api\/users\/[^/]+$/.test(url.pathname)) { const username = decodeURIComponent(url.pathname.split("/").pop()).replace(/^@/, "").toLowerCase(); const user = data.users.find(item => item.username.toLowerCase() === username); if (!user) return reply(res, 404, { error:"کاربر پیدا نشد." }); return reply(res, 200, { profile:{ ...publicUser(user), followers: data.follows.filter(entry => entry.target === user.username).length + Math.max(120, Math.round(user.score * .72)), following: data.follows.filter(entry => entry.follower === user.username).length + Math.max(8, Math.round(user.score / 190)), verified:true, isFollowing: !!me && data.follows.some(entry => entry.follower === me && entry.target === user.username) } }); }
  if (req.method === "GET" && url.pathname === "/api/messages") { const viewer = requireUser(data, req, res); if (!viewer) return; const conversation = (url.searchParams.get("conversation") || "roham").toLowerCase().replace(/^@/, ""); const messages = data.messages.filter(m => m.conversation === conversation); if (url.searchParams.get("after")) { const after = url.searchParams.get("after"); return reply(res, 200, { messages: messages.filter(m => m.id > `m-${after}` || new Date(m.createdAt) > new Date(Number(after) || 0)) }); } return reply(res, 200, { messages }); }
  if (req.method === "POST" && url.pathname === "/api/messages") { const viewer = requireUser(data, req, res); if (!viewer) return; const body = await readBody(req); const text = String(body.text || "").trim(); const conversation = String(body.conversation || "").toLowerCase().replace(/^@/, ""); if (!text || text.length > 500 || !conversation || conversation === viewer.username) return reply(res, 400, { error: "پیام یا گفتگو معتبر نیست." }); if (!data.users.some(user => user.username === conversation && user.status === "approved")) return reply(res, 404, { error: "کاربر گفتگو پیدا نشد." }); const message = { id: `m-${Date.now()}`, conversation, sender: viewer.username, text, createdAt: new Date().toISOString(), read: false }; data.messages.push(message); saveData(data); return reply(res, 201, { message }); }
  if (req.method === "GET" && url.pathname === "/api/register/status") { const username = (url.searchParams.get("username") || "").trim().toLowerCase(); const user = data.users.find(u => u.username === username); if (!user) return reply(res, 200, { status: "rejected" }); let value = null; if (user.status === "approved") { value = token(); data.sessions.push({ token: value, userId: user.id, createdAt: new Date().toISOString() }); saveData(data); } return reply(res, 200, { status: user.status, token: value, user: user.status === "approved" ? publicUser(user) : null }); }
  if (req.method === "POST" && url.pathname === "/api/register") { const body = await readBody(req); const username = String(body.username || "").trim().toLowerCase(); const phone = String(body.phone || "").trim(); const password = String(body.password || ""); if (!/^[a-z0-9_]{3,24}$/i.test(username) || !/^09\d{9}$/.test(phone) || password.length < 8) return reply(res, 400, { error: "اطلاعات ثبت‌نام معتبر نیست." }); if (data.users.some(u => u.username === username || u.phone === phone)) return reply(res, 409, { error: "این نام کاربری یا شماره پیش‌تر ثبت شده است." }); const user = { id: `u-${crypto.randomUUID()}`, username, name: username, phone, password, score: 0, favoriteGame: "—", avatar: username[0].toUpperCase(), status: "pending" }; data.users.push(user); saveData(data);
  console.log("\n===============================");
  console.log("New registration request:");
  console.log("  Username : " + username);
  console.log("  Phone    : " + phone);
  console.log("  Password : [hidden]");
  console.log("===============================");
  askRegistration(username); return reply(res, 201, { user: publicUser(user), pending: true, message: "ثبت‌نام انجام شد؛ بزودی ورود شما توسط ادمین تایید خواهد شد." }); }
  if (req.method === "GET" && url.pathname === "/api/admin/pending") { const admin = requireAdmin(data, req, res); if (!admin) return; return reply(res, 200, { pending: data.users.filter(u => u.status === "pending").map(publicUser) }); }
  if (req.method === "POST" && url.pathname === "/api/admin/approve") { const admin = requireAdmin(data, req, res); if (!admin) return; const body = await readBody(req); const username = String(body.username || "").toLowerCase(); const user = data.users.find(u => u.username === username); if (!user) return reply(res, 404, { error: "کاربر پیدا نشد." }); if (body.reject === true) { data.users = data.users.filter(u => u.username !== username); saveData(data); return reply(res, 200, { rejected: true }); } user.status = "approved"; notify(data, username, "approved", "admin", "ثبت‌نام شما تایید شد؛ به VEXORA CHAT خوش آمدی! 🎮"); saveData(data); return reply(res, 200, { approved: true, user: publicUser(user) }); }
  if (url.pathname === "/api/admin/stats" && req.method === "GET") { const admin = requireAdmin(data, req, res); if (!admin) return; return reply(res, 200, { stats: { users: data.users.length, pendingUsers: data.users.filter(user => user.status === "pending").length, news: (data.news || []).length, publishedNews: (data.news || []).filter(item => item.status !== "draft").length, drafts: (data.news || []).filter(item => item.status === "draft").length, messages: (data.messages || []).length } }); }
  if (url.pathname === "/api/admin/news" && req.method === "GET") { const admin = requireAdmin(data, req, res); if (!admin) return; return reply(res, 200, { news: data.news || [] }); }
  const adminNewsMatch = url.pathname.match(/^\/api\/admin\/news\/([^/]+)$/);
  if (adminNewsMatch && ["PUT", "PATCH", "DELETE"].includes(req.method)) { const admin = requireAdmin(data, req, res); if (!admin) return; const item = (data.news || []).find(entry => entry.id === adminNewsMatch[1]); if (!item) return reply(res, 404, { error: "خبر پیدا نشد." }); if (req.method === "DELETE") { data.news = data.news.filter(entry => entry.id !== item.id); saveData(data); return reply(res, 200, { deleted: true }); } const body = await readBody(req); Object.assign(item, { title: String(body.title ?? item.title).trim(), excerpt: String(body.excerpt ?? item.excerpt ?? "").trim(), text: String(body.text ?? item.text).trim(), category: String(body.category ?? item.category ?? "gaming").trim().toLowerCase(), tags: Array.isArray(body.tags) ? body.tags.slice(0, 8).map(String) : item.tags || [], status: body.status === "draft" ? "draft" : "published", image: String(body.image ?? item.image ?? ""), updatedAt: new Date().toISOString() }); if (item.status === "published" && !item.publishedAt) item.publishedAt = new Date().toISOString(); saveData(data); return reply(res, 200, { news: item }); }
  if (url.pathname === "/api/admin/news" && req.method === "POST") { const admin = requireAdmin(data, req, res); if (!admin) return; const body = await readBody(req); const title = String(body.title || "").trim(); const text = String(body.text || "").trim(); if (!title || !text) return reply(res, 400, { error: "عنوان و متن خبر الزامی است." }); const now = new Date().toISOString(); const item = { id: `n-${crypto.randomUUID()}`, title, excerpt: String(body.excerpt || "").trim(), text, category: String(body.category || "gaming").trim().toLowerCase(), tags: Array.isArray(body.tags) ? body.tags.slice(0, 8).map(String) : [], author: admin.username, authorName: admin.name, verified: true, image: String(body.image || ""), likes: [], comments: [], createdAt: now, publishedAt: body.status === "draft" ? null : now, views: 0, status: body.status === "draft" ? "draft" : "published" }; data.news = data.news || []; data.news.unshift(item); saveData(data); return reply(res, 201, { news: item }); }
  if (req.method === "GET" && url.pathname === "/api/notifications") { const viewer = requireUser(data, req, res); if (!viewer) return; return reply(res, 200, { notifications: (data.notifications || []).filter(n => n.user === viewer.username).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }); }
  if (req.method === "POST" && url.pathname === "/api/notifications/read") { const viewer = requireUser(data, req, res); if (!viewer) return; (data.notifications || []).forEach(n => { if (n.user === viewer.username) n.read = true; }); saveData(data); return reply(res, 200, { ok: true }); }
  if (req.method === "POST" && url.pathname === "/api/login") { const body = await readBody(req); const user = data.users.find(u => u.phone === String(body.phone || "").trim() && u.password === String(body.password || "")); if (!user) return reply(res, 401, { error: "شماره موبایل یا رمز عبور نادرست است." }); if (user.status === "pending") return reply(res, 403, { error: "حساب شما هنوز توسط ادمین تایید نشده است." }); const value = token(); data.sessions.push({ token: value, userId: user.id, createdAt: new Date().toISOString() }); saveData(data); return reply(res, 200, { token: value, user: publicUser(user) }); }
  return reply(res, 404, { error: "مسیر API پیدا نشد." });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    const aliases = { "/chat": "/chat-v2.html", "/chat.html": "/chat-v2.html", "/admin.html": "/admin-panel.html", "/admin": "/admin-panel.html" };
    let requested = decodeURIComponent(aliases[url.pathname] || (url.pathname === "/" ? "/index.html" : url.pathname));
    const file = path.resolve(ROOT, `.${requested}`);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (error) { reply(res, 500, { error: "خطای داخلی سرور", detail: error.message }); }
});
/* بدون قفل‌شدن روی IPv4 یا IPv6، هر دو آدرس localhost و 127.0.0.1 را قبول کن. */
server.listen(PORT, "::", () => {
  console.log(`VEXORA CHAT is running at http://localhost:${PORT}`);
  console.log("Pending registrations can be approved from admin.html.");
  if (rl) {
    const pend = loadData().users.filter(u => u.status === "pending");
    pend.forEach(u => askRegistration(u.username));
  }
});
