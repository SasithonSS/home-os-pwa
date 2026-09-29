// Home OS จด: a thin phone front for the Home OS Google Sheet, in the Home OS app's look (web/src).
// Reads and writes through the Apps Script web app (export/apps_script/Web.gs); every entry is typed in a bottom sheet.
"use strict";
const $ = id => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem("hos." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hos." + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

// ---------- look ----------
// line icons from web/src/ui/icons.ts
const ICONS = {
  home: "M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H3z M3 7a2 2 0 0 1 2-2h11v2 M16 13h5",
  food: "M5 3v7a3 3 0 0 0 3 3v8 M8 3v7 M11 3v7 M17 3a3 3 0 0 0-3 4v4h3v10",
  bag: "M6 8h12l1 12H5z M9 8V6a3 3 0 0 1 6 0v2",
  users: "M16 19v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M21 19v-2a4 4 0 0 0-3-3.9 M16 3.1a3.5 3.5 0 0 1 0 6.8",
  card: "M3 6h18v12H3z M3 10h18 M7 15h4",
  lock: "M6 11h12v10H6z M9 11V7a3 3 0 0 1 6 0v4",
  receipt: "M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z M9 8h6 M9 12h6 M9 16h3",
  cart: "M3 4h2l2 12h11l2-8H6 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  repeat: "M17 2l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3",
  task: "M9 11l3 3 8-8 M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9",
  sparkle: "M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z",
  bottle: "M9 3h6v3l2 3v12H7V9l2-3z",
  arrowUp: "M12 19V5 M5 12l7-7 7 7",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  x: "M6 6l12 12 M18 6L6 18",
  chevR: "M9 6l6 6-6 6",
  check: "M5 12l4 4 10-10",
};
const svg = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
const ico = (n, tone) => `<span class="ic ${tone || ""}">${svg(n)}</span>`;
// POCKET_ICON in web/src/money/MoneyTab.tsx, by the Sheet's pocket names
const POCKET = { food: ["food", "food"], spend: ["bag", "general"], family: ["users", "health"], loans: ["card", "money"], main: ["wallet", "money"], kept: ["lock", "money"] };
const pocketIco = name => POCKET[String(name).toLowerCase()] || ["wallet", "accent"];
// แนน does not see ตัง's Family and Loans pockets (NAN_HIDDEN in web/src/money/History.tsx)
const NAN_HIDDEN = ["family", "loans"];
const hidden = name => me() === "แนน" && NAN_HIDDEN.indexOf(String(name).toLowerCase()) >= 0;
const OWNER = { st: "ตัง", nan: "แนน", both: "ร่วม", "": "ร่วม" };

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const baht = n => n == null || isNaN(n) ? "–" : Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const thDate = s => { if (!isDay(s)) return String(s || ""); const [, m, d] = s.split("-").map(Number); return d + " " + MON[m - 1]; };
const relDate = s => { if (!isDay(s)) return String(s || ""); const t = today(); if (s === t) return "วันนี้"; const y = new Date(Date.parse(t) - 864e5).toISOString().slice(0, 10); return s === y ? "เมื่อวาน" : thDate(s); };
const daysTo = s => s ? Math.round((Date.parse(s) - Date.parse(today())) / 864e5) : null;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const num = v => { const t = String(v == null ? "" : v).replace(/,/g, "").trim(); const n = Number(t); return t === "" || isNaN(n) ? null : n; };

let cfg = LS.get("cfg", null);            // {url, key, me}
let base = LS.get("state", null);         // last state from the Sheet, shown offline too
let S = null;                             // base + the entries still on their way, what the screens show
const ui = Object.assign({ view: "money", pocket: {}, zone: "" }, LS.get("ui", {}));
const saveUi = () => LS.set("ui", ui);
const me = () => (cfg && cfg.me) || "ตัง";

// ---------- network ----------
async function api(body) {
  const r = body
    ? await fetch(cfg.url, { method: "POST", body: JSON.stringify(Object.assign({ key: cfg.key }, body)) }) // text/plain: no CORS preflight
    : await fetch(cfg.url + "?key=" + encodeURIComponent(cfg.key), { cache: "no-store" });
  const j = await r.json().catch(() => { throw new Error("ติดต่อ Sheet ไม่ได้ (" + r.status + ")"); });
  if (!j.ok) throw Object.assign(new Error(j.error || "ผิดพลาด"), { server: true });
  return j;
}
function gotState(j) { base = j; LS.set("state", j); refresh(); }
function refresh() { S = base && queue().reduce(applyEntry, JSON.parse(JSON.stringify(base))); render(); }

// what an entry does to the numbers, so the screen is right before the Sheet has it (the Sheet's formulas stay the truth)
const sameRow = (r, e) => r.ts === e.ts && (e.tab === "log"
  ? r.part === e.part && r.act === e.act && (r.name || "") === (e.name || "") && r.qty === e.qty
  : r.type === e.type && r.pocket === e.pocket && r.amount === e.amount && (r.note || "") === (e.note || ""));
function applyEntry(st, e) {
  const d = e.date || today();
  if (e.kind === "del") {
    const list = st.recent[e.tab], i = list.findIndex(r => sameRow(r, e));
    if (i >= 0) list.splice(i, 1);
    if (e.tab === "tx") {
      const p = st.pockets.find(x => x.name === e.pocket);
      if (p && e.type === "จ่าย") { p.left += e.amount; p.used = (p.used || 0) - e.amount; }
      if (p && e.type === "เติม") p.left -= e.amount;
    } else {
      const s = e.part === "ของใช้" && st.supplies.find(x => x.name === e.name);
      if (s && e.act !== "นับ") s.left = (s.left || 0) + (e.act === "ซื้อ" ? -e.qty : e.qty);
      if (e.part === "BTS" && e.act === "นั่ง" && st.bts) st.bts.left = (st.bts.left || 0) + e.qty;
    }
  } else if (e.kind === "tx") {
    const p = st.pockets.find(x => x.name === e.pocket);
    if (p && e.type === "จ่าย") { p.left -= e.amount; p.used = (p.used || 0) + e.amount; }
    if (p && e.type === "เติม") p.left += e.amount;
    st.recent.tx.unshift({ date: d, who: e.who, type: e.type, pocket: e.pocket, amount: e.amount, note: e.note, card: e.card, debt: e.debt, pending: true });
  } else {
    const s = e.part === "ของใช้" && st.supplies.find(x => x.name === e.name);
    if (s) s.left = e.act === "นับ" ? e.qty : (s.left || 0) + (e.act === "ซื้อ" ? e.qty : -e.qty);
    if (e.part === "BTS" && st.bts) st.bts.left = e.act === "ซื้อแพ็ก" ? e.qty : (st.bts.left || 0) - e.qty;
    st.recent.log.unshift({ date: d, part: e.part, name: e.name, act: e.act, qty: e.qty, price: e.price, pending: true });
  }
  return st;
}
let loading = false;
async function load() {
  if (!cfg || loading) return;
  loading = true; setBusy(true);
  try { gotState(await api()); flushQueue(); }
  catch (e) { toast(e.server ? e.message : "ออฟไลน์ · แสดงข้อมูลล่าสุดที่มี", true); }
  loading = false; setBusy(false);
}
function setBusy(on) { const a = document.querySelector(".hdr .avatar"); if (a) a.classList.toggle("spin", on); }

// entries that could not be sent (no signal) wait here; the server drops repeats by id
const queue = () => LS.get("queue", []);
let flushing = false, offline = false;
function setQueue(q) {
  LS.set("queue", q);
  const el = $("queue"); if (el) { el.textContent = (offline ? "รอส่ง " : "กำลังส่ง ") + q.length; el.classList.toggle("hidden", !q.length); }
}
async function flushQueue() {
  if (flushing || !cfg) return;
  flushing = true;
  let sent = false, q = queue();
  while (q.length) {
    try { await api(q[0]); offline = false; sent = true; }
    catch (e) {
      if (!e.server) { offline = true; break; }  // no signal: keep the rest for later
      toast("บันทึกไม่ได้: " + e.message, true);
    }
    q = queue().slice(1); setQueue(q);
  }
  flushing = false; setQueue(queue());
  if (sent && !q.length) setTimeout(load, 2500);   // the Sheet's own numbers, once its formulas have the rows
}
function send(entry, msg) {
  entry.id = uid();
  setQueue(queue().concat([entry])); refresh(); closeSheet();
  toast(msg || "บันทึกแล้ว");
  flushQueue();
}

let toastT;
function toast(msg, err) {
  const t = $("toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), err ? 3500 : 1800);
}

// ---------- screens ----------
function render() {
  const view = cfg ? ui.view : "setup";
  document.documentElement.dataset.tab = view === "money" ? "money" : view === "home" ? "home" : "";
  $("nav").classList.toggle("hidden", view === "setup");
  document.querySelectorAll("#nav .tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === view)));
  $("app").innerHTML = view === "setup" ? setupView() : `<div class="wrap"><main>${view === "money" ? moneyView() : homeView()}</main></div>`;
  if (view === "setup") bindSetup();
  setQueue(queue());
}

function header(title) {
  const d = new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
  return `<div class="hdr"><div><h1>${title}</h1><div class="d">${esc(d)}</div></div>
    <div class="acts"><span id="queue" class="pill hidden"></span><button class="avatar${loading ? " spin" : ""}" data-act="setup" aria-label="ตั้งค่า">${esc(me())}</button></div></div>`;
}
const waiting = () => `<div class="card"><div class="empty">กำลังโหลดจาก Google Sheet…</div></div>`;

function moneyView() {
  if (!S) return header("เงิน") + waiting();
  const main = S.pockets.find(p => p.name === "Main");
  const jars = S.pockets.filter(p => p.name !== "Main" && !hidden(p.name));
  const mainCard = main ? `<button class="card main-card" data-act="pay" data-pocket="Main">${ico("wallet", "money")}
      <div class="txt"><div class="lab">Main · เงินกลาง</div><div class="big">${baht(main.left)}</div>
      <div class="subline">ใช้รอบนี้ ${baht(main.used)}</div></div>${svg("chevR")}</button>` : "";
  const jar = p => {
    const [n, tone] = pocketIco(p.name), over = p.left < 0;
    const pct = p.budget > 0 ? Math.max(0, Math.min(100, p.left / p.budget * 100)) : 0;
    return `<button class="jar" data-act="pay" data-pocket="${esc(p.name)}">
      <div class="top">${ico(n, tone)}<span class="name">${esc(p.name)}</span><span class="plus">${svg("plus")}</span></div>
      <div class="left ${over ? "neg" : ""}">${over ? "เกิน " + baht(-p.left) : baht(p.left)}</div>
      <div class="l">${p.budget ? "งบ " + baht(p.budget) : "ไม่มีงบ"} · ${esc(OWNER[p.owner] || p.owner)}</div>
      ${p.budget > 0 ? `<div class="bar2"><i class="${pct < 15 ? "warn" : ""}" style="width:${pct}%"></i></div>` : ""}
      ${p.need ? `<span class="tag warn">ต้องเติม ${baht(p.need)}</span>` : ""}</button>`;
  };
  const rows = S.recent.tx.map((r, i) => [r, i]).filter(([r]) => !hidden(r.pocket)).map(([r, i]) => {
    const [n, tone] = pocketIco(r.pocket);
    const sign = r.type === "จ่าย" ? "−" : r.type === "เติม" ? "+" : "";
    const cls = r.type === "เติม" ? "pos" : "";
    return `<button class="row" data-act="entry" data-tab="tx" data-i="${i}">${ico(n, tone)}<div class="main"><div>${esc(r.note || r.debt || r.pocket)}</div>
      <div class="sub">${esc([r.who, r.pocket, relDate(r.date), r.card].filter(Boolean).join(" · "))}</div></div>
      <div class="amt ${cls}">${sign}${baht(r.amount)}${r.pending ? "<small>กำลังส่ง</small>" : r.type === "หนี้" ? "<small>ปรับหนี้</small>" : ""}</div></button>`;
  }).join("") || `<div class="empty">ยังไม่มีรายการ</div>`;
  return header("เงิน") + mainCard + `<div class="jars">${jars.map(jar).join("")}</div>`
    + `<div class="card"><h2>${ico("receipt", "money")}รายการล่าสุด</h2>${rows}</div>`;
}

function supplyRow(s) {
  const d = daysTo(s.runout);
  const when = s.runout ? (d <= 0 ? "หมดแล้ว" : d <= 14 ? `หมดใน ${d} วัน` : "หมด " + thDate(s.runout)) : "";
  const tag = s.urgent ? `<span class="tag danger">ด่วน</span>` : s.low ? `<span class="tag warn">ใกล้หมด</span>` : "";
  return `<button class="row" data-act="item" data-name="${esc(s.name)}">${ico("bottle", s.urgent ? "danger" : s.low ? "warn" : "home")}
    <div class="main"><div>${esc(s.name)}</div><div class="sub">${esc([when, s.buyBy ? "ซื้อก่อน " + thDate(s.buyBy) : ""].filter(Boolean).join(" · ") || s.zone)}</div></div>
    ${tag}<div class="amt">${baht(s.left)}<small>${esc(s.unit)}</small></div></button>`;
}

let lowOpen = false;
const LOG_ICON = { "ของใช้": "bottle", "BTS": "repeat", "ซักผ้า": "sparkle" };
function homeView() {
  if (!S) return header("ของใช้") + waiting();
  const b = S.bts || {};
  const btsCard = `<div class="card bts"><h2>${ico("repeat", "travel")}BTS แนน<span class="more">หมดอายุ ${esc(thDate(b.expires) || "–")}</span></h2>
    <div class="nums"><div class="big">${baht(b.left)}<small>เที่ยว</small></div></div>
    ${b.status ? `<div class="subline">${esc(b.status)}</div>` : ""}
    <div class="acts"><button class="btn" data-act="bts" data-bact="นั่ง">${svg("repeat")}นั่ง</button>
    <button class="btn no" data-act="bts" data-bact="ซื้อแพ็ก">${svg("receipt")}ซื้อแพ็ก</button></div></div>`;
  const low = S.supplies.filter(s => s.low || s.urgent).sort((a, b2) => (a.runout || "9").localeCompare(b2.runout || "9"));
  const lowCard = `<div class="card"><h2>${ico("cart", "warn")}ต้องซื้อเร็วๆ นี้<span class="more">${low.length} อย่าง</span></h2>
    ${low.slice(0, lowOpen ? low.length : 5).map(supplyRow).join("") || `<div class="empty">ยังไม่มีของใกล้หมด</div>`}
    ${low.length > 5 ? `<button class="fold" data-act="lowall" aria-expanded="${lowOpen}">${svg("chevR")}${lowOpen ? "ย่อ" : "ดูอีก " + (low.length - 5) + " อย่าง"}</button>` : ""}</div>`;
  const zones = [...new Set(S.supplies.map(s => s.zone).filter(Boolean))];
  if (ui.zone && zones.indexOf(ui.zone) < 0) ui.zone = "";
  const chips = `<div class="ztabs">${[""].concat(zones).map(z => `<button class="chip" data-act="zone" data-zone="${esc(z)}" aria-pressed="${z === ui.zone}">${esc(z || "ทั้งหมด")}
    <small>${S.supplies.filter(s => !z || s.zone === z).length}</small></button>`).join("")}</div>`;
  const list = S.supplies.filter(s => !ui.zone || s.zone === ui.zone).sort((a, b2) => (a.runout || "9").localeCompare(b2.runout || "9"));
  const logRows = S.recent.log.map((r, i) => `<button class="row" data-act="entry" data-tab="log" data-i="${i}">${ico(LOG_ICON[r.part] || "bottle", r.part === "BTS" ? "travel" : "home")}
    <div class="main"><div>${esc(r.part === "BTS" ? "BTS · " + r.act : [r.name, r.act].filter(Boolean).join(" · "))}</div>
    <div class="sub">${esc([r.who, relDate(r.date), r.price ? "฿" + baht(r.price) : ""].filter(Boolean).join(" · "))}</div></div>
    <div class="amt">${baht(r.qty)}${r.pending ? "<small>กำลังส่ง</small>" : ""}</div></button>`).join("") || `<div class="empty">ยังไม่มีบันทึก</div>`;
  return header("ของใช้") + btsCard + lowCard + `<div class="card"><h2>${ico("receipt", "home")}บันทึกล่าสุด</h2>${logRows}</div>`
    + chips + `<div class="card">${list.map(supplyRow).join("") || `<div class="empty">ไม่มี</div>`}</div>`;
}

function setupView() {
  const c = cfg || {}, who = c.me || "ตัง";
  return `<div class="login"><div class="box">
    <img class="logo" src="logo-login.png" alt="">
    <h1>Home OS จด</h1><div class="sub">จดเงินกับของใช้ลง Google Sheet ของบ้าน</div>
    <div class="who">${["ตัง", "แนน"].map(n => `<button data-who="${n}" aria-pressed="${n === who}"><span class="av">${n.slice(0, 1)}</span>${n}</button>`).join("")}</div>
    <div class="lbl">ลิงก์ Web app</div><input id="s-url" class="fld" type="url" autocomplete="off" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || "")}">
    <div class="lbl">รหัส</div><input id="s-key" class="fld" type="text" autocomplete="off" autocapitalize="off" value="${esc(c.key || "")}">
    <button id="s-save" class="btn big">เข้าใช้งาน</button>
    <div class="hint">ลิงก์กับรหัส: Google Sheet เมนู Home OS › รหัสแอปมือถือ</div>
    ${cfg ? `<button class="link back" data-act="back">กลับ</button>` : ""}
  </div></div>`;
}
function bindSetup() {
  let who = (cfg && cfg.me) || "ตัง";
  document.querySelectorAll(".who button").forEach(b => b.onclick = () => {
    who = b.dataset.who; document.querySelectorAll(".who button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  $("s-save").onclick = () => {
    const url = $("s-url").value.trim(), key = $("s-key").value.trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) return toast("ลิงก์ต้องขึ้นต้น https://script.google.com และจบด้วย /exec", true);
    if (!key) return toast("ใส่รหัส", true);
    const changed = !cfg || cfg.url !== url || cfg.key !== key;
    cfg = { url, key, me: who }; LS.set("cfg", cfg);
    render(); if (changed || !S) load();
  };
}

// ---------- sheets ----------
let sheetY = 0;   // where the page was scrolled when the first sheet opened
function openSheet(html, bind) {
  const body = document.body;
  if (!body.classList.contains("sheet-open")) { sheetY = window.scrollY; body.style.top = -sheetY + "px"; body.classList.add("sheet-open"); }
  $("sheet").innerHTML = `<div class="sheetwrap"><div class="sheet" role="dialog">${html}</div></div>`;
  const sh = $("sheet").firstChild.firstChild;
  dragToClose(sh);
  bind(sh);
}
function closeSheet() {
  const body = document.body;
  $("sheet").innerHTML = "";
  if (!body.classList.contains("sheet-open")) return;
  body.classList.remove("sheet-open"); body.style.top = ""; window.scrollTo(0, sheetY);
}
// no close button: pull the sheet down from its top to close it
function dragToClose(sh) {
  const wrap = sh.parentNode;
  let y0 = 0, t0 = 0, dy = 0, drag = false, can = false;
  sh.addEventListener("touchstart", e => {
    const el = e.target.closest("input,select,textarea");
    can = sh.scrollTop <= 0 && !(el && el === document.activeElement);
    y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; drag = false;
  }, { passive: true });
  sh.addEventListener("touchmove", e => {
    if (!can) return;
    dy = e.touches[0].clientY - y0;
    if (!drag) { if (dy <= 0 || sh.scrollTop > 0) { can = false; return; } drag = true; sh.classList.add("dragging"); }
    e.preventDefault();
    dy = Math.max(0, dy);
    sh.style.transform = `translateY(${dy}px)`;
    wrap.style.opacity = String(1 - Math.min(dy / sh.offsetHeight, 1) * .4);
  }, { passive: false });
  sh.addEventListener("touchend", () => {
    if (!drag) return;
    drag = false; sh.classList.remove("dragging");
    if (dy > 120 || dy / Math.max(1, Date.now() - t0) > .5) {
      sh.style.transform = ""; sh.classList.add("closing");
      const done = () => { if (sh.isConnected) closeSheet(); };
      sh.addEventListener("transitionend", done, { once: true }); setTimeout(done, 250);
    } else { sh.style.transform = ""; wrap.style.opacity = ""; }
  });
}
const sheetHead = (icon, tone, title, sub) => `<div class="sh">${ico(icon, tone)}<h3>${esc(title)}${sub ? `<small>${sub}</small>` : ""}</h3></div>`;
const segHtml = (items, cur, attr) => `<div class="seg" ${attr}>${items.map(v => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(v)}</button>`).join("")}</div>`;
const opts = (items, cur, blank) => (blank != null ? `<option value="">${esc(blank)}</option>` : "") +
  items.map(v => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(v)}</option>`).join("");
function bindSeg(el, onPick) {
  el.onclick = e => { const b = e.target.closest("button"); if (!b) return; el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); onPick(b.dataset.v); };
}
// ใคร + วันที่ under "เพิ่มเติม": the defaults (me, today) need no taps
const moreHtml = (extra, who) => `<button type="button" class="fold" aria-expanded="false">${svg("chevR")}เพิ่มเติม<span class="sum"></span></button>
  <div class="foldbody hidden">${extra || ""}<div class="two"><div><div class="lbl">ใคร</div><select class="fld" data-f="who">${opts(S.people, who)}</select></div>
  <div><div class="lbl">วันที่</div><input class="fld" type="date" data-f="date" value="${today()}" max="${today()}"></div></div></div>`;
function bindMore(sh) {
  const f = sh.querySelector(".fold"), body = sh.querySelector(".foldbody"), sum = f.querySelector(".sum");
  const who = sh.querySelector('[data-f="who"]'), date = sh.querySelector('[data-f="date"]');
  const upd = () => { sum.textContent = who.value + " · " + (date.value === today() ? "วันนี้" : thDate(date.value)); };
  f.onclick = () => { const open = body.classList.toggle("hidden"); f.setAttribute("aria-expanded", String(!open)); };
  who.onchange = upd; date.onchange = upd; upd();
  return () => ({ who: who.value, date: date.value || today() });
}

const PAY_ICON = { "โอน": "repeat", "เงินสด": "wallet", "บัตร": "card" };
const TYPE_LOOK = { "จ่าย": ["receipt", "money"], "เติม": ["arrowUp", "money"], "หนี้": ["card", "money"] };
function moneySheet(type, pocket) {
  type = type || "จ่าย";
  const key = t => me() + ":" + t;
  let cur = pocket || ui.pocket[key(type)] || "";
  let minus = false;
  const payWith = S.payWith || ["โอน", "เงินสด"], last = (ui.pay || {})[me()] || payWith[0];
  let payCur = payWith.indexOf(last) >= 0 ? last : "บัตร", cardCur = payCur === "บัตร" ? last : "";
  const pocketChips = () => S.pockets.filter(p => !hidden(p.name) || p.name === cur).map(p => { const [n, tone] = pocketIco(p.name);
    return `<button type="button" class="chip" data-v="${esc(p.name)}" aria-pressed="${p.name === cur}">${ico(n, tone)}${esc(p.name)}<small>${baht(p.left)}</small></button>`; }).join("");
  openSheet(`${sheetHead(TYPE_LOOK[type][0], TYPE_LOOK[type][1], type, "")}
    ${segHtml(S.txTypes, type, 'data-f="type"')}
    <div style="height:12px"></div>
    <div class="amount"><button type="button" class="sign hidden">+</button><span class="cur">฿</span>
      <input data-f="amount" inputmode="decimal" placeholder="0" autocomplete="off"></div>
    <div class="lbl">กระเป๋า</div><div class="chips" data-f="pocket">${pocketChips()}</div>
    <div class="lbl">รายละเอียด</div><input class="fld" data-f="note" placeholder="เช่น กาแฟ ข้าวเที่ยง" autocomplete="off">
    <div data-show="จ่าย"><div class="lbl">จ่ายด้วย</div><div class="chips" data-f="pay">${payWith.concat("บัตร").map(v =>
      `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${v === payCur}">${ico(PAY_ICON[v] || "card", "money")}${esc(v)}</button>`).join("")}</div>
      <select class="fld${payCur === "บัตร" ? "" : " hidden"}" data-f="card" style="margin-top:8px">${opts(S.cards, cardCur, "— เลือกบัตร —")}</select></div>
    <div data-show="หนี้"><div class="lbl">หนี้</div><select class="fld" data-f="debt1">${opts(S.debts, "", "— เลือกหนี้ —")}</select></div>
    ${moreHtml(`<div data-show="เติม"><div class="lbl">ที่มา</div><select class="fld" data-f="source">${opts(S.sources, "", "— ไม่ระบุ —")}</select></div>
      <div data-show="เติม จ่าย"><div class="lbl">งวดหนี้ (ถ้ามี)</div><select class="fld" data-f="debt2">${opts(S.debts, "", "— ไม่ใช่งวดหนี้ —")}</select></div>`, me())}
    <button class="btn big" data-f="save">บันทึก</button>`, sh => {
    const f = n => sh.querySelector(`[data-f="${n}"]`);
    const title = sh.querySelector(".sh h3"), icon = sh.querySelector(".sh .ic"), sign = sh.querySelector(".sign");
    const sub = () => { const p = S.pockets.find(x => x.name === cur);
      title.innerHTML = esc(type) + (p ? `<small>${type === "เติม" ? "เข้า" : "จาก"} ${esc(p.name)} · เหลือ ${baht(p.left)}</small>` : "<small>เลือกกระเป๋า</small>"); };
    const show = () => {
      sh.querySelectorAll("[data-show]").forEach(el => el.classList.toggle("hidden", el.dataset.show.split(" ").indexOf(type) < 0));
      sign.classList.toggle("hidden", type !== "หนี้");
      icon.innerHTML = svg(TYPE_LOOK[type][0]); sub();
    };
    bindSeg(f("type"), v => { type = v; if (!pocket) { cur = ui.pocket[key(type)] || cur; f("pocket").innerHTML = pocketChips(); } show(); });
    f("pocket").onclick = e => { const b = e.target.closest("button"); if (!b) return; cur = b.dataset.v;
      f("pocket").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); sub(); };
    f("pay").onclick = e => { const b = e.target.closest("button"); if (!b) return; payCur = b.dataset.v;
      f("pay").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      f("card").classList.toggle("hidden", payCur !== "บัตร"); };
    sign.onclick = () => { minus = !minus; sign.textContent = minus ? "−" : "+"; sign.classList.toggle("minus", minus); };
    const more = bindMore(sh);
    show();
    f("amount").focus();
    f("save").onclick = () => {
      let amount = num(f("amount").value);
      if (amount == null || amount <= 0) return toast("ใส่จำนวนเงิน", true);
      if (!cur) return toast("เลือกกระเป๋า", true);
      const debt = type === "หนี้" ? f("debt1").value : f("debt2").value;
      if (type === "หนี้" && !debt) return toast("เลือกหนี้", true);
      if (type === "หนี้" && minus) amount = -amount;
      const card = type !== "จ่าย" ? "" : payCur === "บัตร" ? f("card").value : payCur;
      if (type === "จ่าย" && !card) return toast("เลือกบัตร", true);
      ui.pocket[key(type)] = cur; if (type === "จ่าย") { ui.pay = ui.pay || {}; ui.pay[me()] = card; } saveUi();
      const m = more();
      send({ kind: "tx", type, pocket: cur, amount, note: f("note").value.trim(), who: m.who, date: m.date,
        card, source: type === "เติม" ? f("source").value : "", debt });
    };
  });
}

const ACT_LABEL = { "ใช้": "เปิดของใหม่กี่", "ซื้อ": "ซื้อมากี่", "นับ": "ยังไม่เปิดเหลือกี่" };
function itemSheet(name, act) {
  const s = S.supplies.find(x => x.name === name); if (!s) return;
  act = act || "ใช้";
  const sub = `เหลือ ${baht(s.left)} ${esc(s.unit)}${s.runout ? " · หมด " + thDate(s.runout) : ""}`;
  openSheet(`${sheetHead("bottle", s.low ? "warn" : "home", s.name, sub)}
    ${segHtml(["ใช้", "ซื้อ", "นับ"], act, 'data-f="act"')}
    <div class="lbl" data-f="qlabel"></div>
    <div class="step"><button type="button" data-f="dec">${svg("minus")}</button><input data-f="qty" inputmode="decimal"><button type="button" data-f="inc">${svg("plus")}</button></div>
    <div data-f="pricebox"><div class="lbl">ราคารวม (บาท)</div><input class="fld" data-f="price" inputmode="decimal" placeholder="ไม่ใส่ก็ได้"></div>
    ${moreHtml("", me())}
    <button class="btn big" data-f="save">บันทึก</button>`, sh => {
    const f = n => sh.querySelector(`[data-f="${n}"]`);
    const set = () => {
      f("qlabel").textContent = ACT_LABEL[act] + (s.unit || "ชิ้น");
      f("qty").value = act === "นับ" ? (s.left == null ? 0 : s.left) : 1;
      f("pricebox").classList.toggle("hidden", act !== "ซื้อ");
    };
    bindSeg(f("act"), v => { act = v; set(); });
    const step = d => { const q = num(f("qty").value) || 0; f("qty").value = Math.max(0, q + d); };
    f("dec").onclick = () => step(-1); f("inc").onclick = () => step(1);
    const more = bindMore(sh); set();
    f("save").onclick = () => {
      const qty = num(f("qty").value);
      if (qty == null || qty < 0 || (act !== "นับ" && qty === 0)) return toast("ใส่จำนวน", true);
      const m = more(), price = act === "ซื้อ" ? num(f("price").value) : null;
      send({ kind: "log", part: "ของใช้", act, name: s.name, qty, price: price == null ? "" : price, who: m.who, date: m.date });
    };
  });
}

function pickSheet(act) {
  const list = S.supplies.slice().sort((a, b) => (b.low - a.low) || a.name.localeCompare(b.name, "th"));
  openSheet(`${sheetHead(act === "ซื้อ" ? "cart" : act === "นับ" ? "task" : "sparkle", "home", act === "ใช้" ? "เปิดของใหม่" : act + "ของ", "เลือกของ")}
    <input class="fld" data-f="q" placeholder="ค้นหา" autocomplete="off">
    <div data-f="list" style="margin-top:6px"></div>`, sh => {
    const f = n => sh.querySelector(`[data-f="${n}"]`);
    const draw = () => { const q = f("q").value.trim().toLowerCase();
      f("list").innerHTML = list.filter(s => !q || s.name.toLowerCase().indexOf(q) >= 0).map(supplyRow).join("") || `<div class="empty">ไม่พบ</div>`; };
    f("q").oninput = draw; draw();
    f("list").onclick = e => { const b = e.target.closest("[data-name]"); if (b) { e.stopPropagation(); itemSheet(b.dataset.name, act); } };
  });
}

function btsSheet(bact) {
  const b = S.bts || {};
  let pack = S.packs[0];
  openSheet(`${sheetHead("repeat", "travel", "BTS", `เหลือ ${baht(b.left)} เที่ยว · หมดอายุ ${esc(thDate(b.expires) || "–")}`)}
    ${segHtml(["นั่ง", "ซื้อแพ็ก"], bact, 'data-f="act"')}
    <div data-show="นั่ง"><div class="lbl">นั่งกี่เที่ยว</div>
      <div class="step"><button type="button" data-f="dec">${svg("minus")}</button><input data-f="qty" inputmode="numeric" value="2"><button type="button" data-f="inc">${svg("plus")}</button></div></div>
    <div data-show="ซื้อแพ็ก"><div class="lbl">แพ็ก</div><div class="chips" data-f="pack">${S.packs.map(p => `<button type="button" class="chip" data-v="${p}" aria-pressed="${p === pack}">${p} เที่ยว</button>`).join("")}</div>
      <div class="lbl">ราคา (บาท)</div><input class="fld" data-f="price" inputmode="decimal" placeholder="ไม่ใส่ก็ได้"></div>
    ${moreHtml("", me())}
    <button class="btn big" data-f="save">บันทึก</button>`, sh => {
    const f = n => sh.querySelector(`[data-f="${n}"]`);
    const show = () => sh.querySelectorAll("[data-show]").forEach(el => el.classList.toggle("hidden", el.dataset.show !== bact));
    bindSeg(f("act"), v => { bact = v; show(); });
    f("pack").onclick = e => { const x = e.target.closest("button"); if (!x) return; pack = +x.dataset.v;
      f("pack").querySelectorAll("button").forEach(y => y.setAttribute("aria-pressed", String(y === x))); };
    const step = d => { f("qty").value = Math.max(1, (num(f("qty").value) || 0) + d); };
    f("dec").onclick = () => step(-1); f("inc").onclick = () => step(1);
    const more = bindMore(sh); show();
    f("save").onclick = () => {
      const qty = bact === "ซื้อแพ็ก" ? pack : num(f("qty").value);
      if (!qty || qty < 0) return toast("ใส่จำนวนเที่ยว", true);
      const m = more(), price = bact === "ซื้อแพ็ก" ? num(f("price").value) : null;
      send({ kind: "log", part: "BTS", act: bact, name: "", qty, price: price == null ? "" : price, who: m.who, date: m.date });
    };
  });
}

function entrySheet(tab, i) {
  const r = S.recent[tab][i]; if (!r) return;
  if (r.pending) return toast("รายการนี้ยังส่งไม่เสร็จ รอสักครู่แล้วค่อยลบ", true);
  const isTx = tab === "tx";
  const [n, tone] = isTx ? pocketIco(r.pocket) : [LOG_ICON[r.part] || "bottle", r.part === "BTS" ? "travel" : "home"];
  const title = isTx ? (r.type === "จ่าย" ? "−" : r.type === "เติม" ? "+" : "") + baht(r.amount) + " บาท" : (r.part === "BTS" ? "BTS · " + r.act : r.name + " · " + r.act);
  const facts = isTx
    ? [["ประเภท", r.type], ["กระเป๋า", r.pocket], ["รายละเอียด", r.note], ["จ่ายด้วย", r.card], ["หนี้", r.debt], ["ใคร", r.who], ["วันที่", thDate(r.date)]]
    : [["ส่วน", r.part], ["จำนวน", baht(r.qty)], ["ราคา", r.price ? baht(r.price) + " บาท" : ""], ["ใคร", r.who], ["วันที่", thDate(r.date)]];
  openSheet(`${sheetHead(n, tone, title, esc(relDate(r.date)))}
    <div class="card" style="box-shadow:none">${facts.filter(f => f[1]).map(f => `<div class="row"><div class="main sub">${esc(f[0])}</div><div class="amt">${esc(f[1])}</div></div>`).join("")}</div>
    <button class="btn big danger" data-f="del">${svg("x")}ลบรายการนี้</button>
    <div class="hint" style="text-align:center">ลบออกจาก Google Sheet ด้วย · ${isTx ? "ยอดกระเป๋าจะคืนตาม" : "ตัวเลขของใช้จะคำนวณใหม่"}</div>`, sh => {
    const b = sh.querySelector('[data-f="del"]'); let armed = false;
    b.onclick = () => {
      if (!armed) { armed = true; b.classList.add("armed"); b.lastChild.textContent = "แตะอีกครั้งเพื่อยืนยันลบ"; return; }
      send(isTx ? { kind: "del", tab, ts: r.ts, type: r.type, pocket: r.pocket, amount: r.amount, note: r.note || "" }
                : { kind: "del", tab, ts: r.ts, part: r.part, act: r.act, name: r.name || "", qty: r.qty }, "ลบแล้ว");
    };
  });
}

function addSheet() {
  const btn = (act, icon, tone, label, extra) => `<button data-act="${act}" ${extra || ""}>${ico(icon, tone)}${label}</button>`;
  openSheet(`${sheetHead("plus", "accent", "จดอะไรดี", "")}
    <div class="shortcuts">
      <div class="sec">เงิน</div><div class="grid">
        ${btn("pay", "receipt", "money", "จ่าย", 'data-type="จ่าย"')}${btn("pay", "arrowUp", "money", "เติมเงิน", 'data-type="เติม"')}${btn("pay", "card", "money", "หนี้", 'data-type="หนี้"')}</div>
      <div class="sec">ของใช้</div><div class="grid">
        ${btn("pick", "sparkle", "home", "เปิดของใหม่", 'data-pact="ใช้"')}${btn("pick", "cart", "home", "ซื้อของ", 'data-pact="ซื้อ"')}${btn("pick", "task", "home", "นับของ", 'data-pact="นับ"')}</div>
      <div class="sec">BTS</div><div class="grid">
        ${btn("bts", "repeat", "travel", "นั่ง BTS", 'data-bact="นั่ง"')}${btn("bts", "receipt", "travel", "ซื้อแพ็ก", 'data-bact="ซื้อแพ็ก"')}</div>
    </div>`, () => {});
}

// ---------- taps ----------
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
  if (a === "setup") { closeSheet(); $("app").innerHTML = setupView(); $("nav").classList.add("hidden"); document.documentElement.dataset.tab = ""; bindSetup(); return; }
  if (a === "back") return render();
  if (!S) return toast("ยังโหลดข้อมูลไม่เสร็จ", true);
  if (a === "pay") moneySheet(b.dataset.type || (b.dataset.pocket === "Main" ? "จ่าย" : ""), b.dataset.pocket);
  else if (a === "item") itemSheet(b.dataset.name);
  else if (a === "entry") entrySheet(b.dataset.tab, +b.dataset.i);
  else if (a === "pick") pickSheet(b.dataset.pact);
  else if (a === "bts") btsSheet(b.dataset.bact);
  else if (a === "lowall") { lowOpen = !lowOpen; render(); }
  else if (a === "zone") { ui.zone = b.dataset.zone; saveUi(); render(); }
});

// ---------- start ----------
document.querySelectorAll("#nav .tab").forEach(t => {
  t.innerHTML = svg(t.dataset.view === "money" ? "wallet" : "home") + (t.dataset.view === "money" ? "เงิน" : "ของใช้");
  t.onclick = () => { ui.view = t.dataset.view; saveUi(); render(); window.scrollTo(0, 0); };
});
$("add").innerHTML = svg("plus");
$("add").onclick = () => S ? addSheet() : toast("ยังโหลดข้อมูลไม่เสร็จ", true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("sheet").firstChild) closeSheet(); });
window.addEventListener("online", flushQueue);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
if (ui.view !== "money" && ui.view !== "home") ui.view = "money";
refresh();
load();
