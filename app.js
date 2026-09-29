// Home OS จด: a thin phone front for the Home OS Google Sheet. Reads/writes through the Apps Script web app (export/apps_script/Web.gs).
"use strict";
const $ = id => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem("hos." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hos." + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const OWNER = { st: "ตัง", nan: "แนน", both: "ร่วม", "": "ร่วม" };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const baht = n => n == null || isNaN(n) ? "–" : Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const shortDate = s => s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

let cfg = LS.get("cfg", null);            // {url, key, me}
let S = LS.get("state", null);            // last state from the Sheet (choices + balances), shown offline too
const ui = LS.get("ui", { view: "money", type: "จ่าย", pocket: {}, part: "ของใช้", act: "ใช้", bact: "นั่ง", pack: 35 });
const saveUi = () => LS.set("ui", ui);

// ---------- network ----------
async function api(body) {
  const r = body
    ? await fetch(cfg.url, { method: "POST", body: JSON.stringify(Object.assign({ key: cfg.key }, body)) }) // text/plain: no CORS preflight
    : await fetch(cfg.url + "?key=" + encodeURIComponent(cfg.key), { cache: "no-store" });
  const j = await r.json();
  if (!j.ok) throw Object.assign(new Error(j.error || "ผิดพลาด"), { server: true });
  return j;
}
function gotState(j) { S = j; LS.set("state", j); renderAll(); }
async function load() {
  if (!cfg) return;
  $("refresh").classList.add("spin");
  try { gotState(await api()); await flushQueue(); }
  catch (e) { toast(e.server ? e.message : "ออฟไลน์ · แสดงข้อมูลล่าสุดที่มี", true); }
  $("refresh").classList.remove("spin");
}

// entries that could not be sent (no signal) wait here; the server drops repeats by id
const queue = () => LS.get("queue", []);
function setQueue(q) { LS.set("queue", q); const el = $("queue"); el.textContent = "รอส่ง " + q.length; el.classList.toggle("hidden", !q.length); }
async function flushQueue() {
  let q = queue();
  while (q.length) {
    try { gotState(await api(q[0])); }
    catch (e) {
      if (!e.server) break;                     // still offline: keep the rest
      toast("ส่งรายการค้างไม่ได้: " + e.message, true);
    }
    q = q.slice(1); setQueue(q);
  }
}
async function send(entry, btn) {
  entry.id = uid();
  btn.disabled = true;
  try { gotState(await api(entry)); toast("บันทึกแล้ว ✓"); return true; }
  catch (e) {
    if (e.server) { toast(e.message, true); return false; }
    setQueue(queue().concat([entry])); toast("ไม่มีสัญญาณ · เก็บไว้ส่งทีหลัง"); return true;
  } finally { btn.disabled = false; }
}

let toastT;
function toast(msg, err) {
  const t = $("toast"); t.textContent = msg; t.className = "toast" + (err ? " err" : "");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add("hidden"), err ? 4000 : 2000);
}

// ---------- small builders ----------
function seg(el, items, cur, onPick) {
  el.innerHTML = items.map(v => `<button type="button" data-v="${esc(v)}" class="${v === cur ? "on" : ""}">${esc(v)}</button>`).join("");
  el.onclick = e => { const b = e.target.closest("button"); if (b) onPick(b.dataset.v); };
}
function options(sel, items, cur, blank) {
  sel.innerHTML = (blank ? `<option value="">${esc(blank)}</option>` : "") +
    items.map(v => { const [val, text] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}"${val === cur ? " selected" : ""}>${esc(text)}</option>`; }).join("");
}
const who = () => (cfg && cfg.me) || "ตัง";
const num = v => { const n = Number(String(v).replace(/,/g, "").trim()); return String(v).trim() === "" || isNaN(n) ? null : n; };

// ---------- views ----------
function show(view) {
  if (!cfg) view = "setup";
  ui.view = view === "setup" ? ui.view : view; saveUi();
  ["setup", "money", "log", "bal"].forEach(v => $("v-" + v).classList.toggle("hidden", v !== view));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.view === view));
  if (view === "setup") renderSetup();
}

function renderSetup() {
  const c = cfg || {};
  $("s-url").value = c.url || ""; $("s-key").value = c.key || "";
  let me = c.me || "ตัง";
  const draw = () => seg($("s-me"), ["ตัง", "แนน"], me, v => { me = v; draw(); });
  draw();
  $("s-save").onclick = () => {
    const url = $("s-url").value.trim(), key = $("s-key").value.trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) return toast("ลิงก์ต้องขึ้นต้น https://script.google.com และจบด้วย /exec", true);
    if (!key) return toast("ใส่รหัส", true);
    cfg = { url, key, me }; LS.set("cfg", cfg);
    show(ui.view || "money"); load();
  };
}

function renderMoney() {
  if (!S) return;
  const t = ui.type;
  seg($("m-type"), S.txTypes, t, v => { ui.type = v; saveUi(); renderMoney(); });
  const cur = ui.pocket[who()] || "";
  const box = $("m-pocket");
  box.className = "chips";
  box.innerHTML = S.pockets.map(p => `<button type="button" data-v="${esc(p.name)}" class="${p.name === cur ? "on" : ""}">${esc(p.name)}<small>${baht(p.left)}</small></button>`).join("");
  box.onclick = e => { const b = e.target.closest("button"); if (!b) return; ui.pocket[who()] = b.dataset.v; saveUi(); renderMoney(); };
  document.querySelectorAll("#v-money [data-for]").forEach(l => l.classList.toggle("hidden", l.dataset.for.split(" ").indexOf(t) < 0));
  if (!$("m-card").options.length) options($("m-card"), S.cards, "", "— ไม่ระบุ —");
  if (!$("m-source").options.length) options($("m-source"), S.sources, "", "— ไม่ระบุ —");
  if (!$("m-debt").options.length) options($("m-debt"), S.debts, "", "— ไม่ใช่งวดหนี้ —");
  $("m-amount").placeholder = t === "หนี้" ? "+ กันเพิ่ม / − ลด เช่น -500" : "0";
  $("m-amount").inputMode = t === "หนี้" ? "text" : "decimal";   // iOS decimal pad has no minus key
  if (!$("m-who").options.length) options($("m-who"), S.people, who());
  if (!$("m-date").value) $("m-date").value = today();
}

$("m-send").onclick = async () => {
  const t = ui.type, amount = num($("m-amount").value), pocket = ui.pocket[who()], debt = $("m-debt").value;
  if (!pocket) return toast("เลือกกระเป๋า", true);
  if (amount == null || amount === 0 || (t !== "หนี้" && amount < 0)) return toast("ใส่จำนวนเงิน", true);
  if (t === "หนี้" && !debt) return toast("เลือกหนี้", true);
  const d = $("m-date").value;
  const ok = await send({
    kind: "tx", type: t, pocket, amount, note: $("m-note").value.trim(), who: $("m-who").value,
    date: d && d !== today() ? d : "",
    card: t === "จ่าย" ? $("m-card").value : "", source: t === "เติม" ? $("m-source").value : "", debt,
  }, $("m-send"));
  if (ok) { $("m-amount").value = ""; $("m-note").value = ""; $("m-card").value = ""; $("m-debt").value = ""; $("m-date").value = today(); }
};

const QTY_LABEL = { นับ: "ยังไม่เปิดเหลือกี่หน่วย", ซื้อ: "ซื้อกี่หน่วย", ใช้: "เปิดใช้กี่หน่วย", นั่ง: "นั่งกี่เที่ยว" };
function renderLog() {
  if (!S) return;
  const part = ui.part, bts = part === "BTS";
  seg($("l-part"), ["ของใช้", "BTS"], part, v => { ui.part = v; saveUi(); renderLog(); });
  $("l-supply").classList.toggle("hidden", bts); $("l-bts").classList.toggle("hidden", !bts);
  let act;
  if (!bts) {
    act = ui.act;
    seg($("l-act"), ["ใช้", "ซื้อ", "นับ"], act, v => { ui.act = v; saveUi(); renderLog(); });
    const sel = $("l-name"), keep = sel.value;
    options(sel, S.supplies.map(s => [s.name, s.name + (s.low ? " ⚠︎" : "")]), keep, "— เลือกของ —");
    const s = S.supplies.find(x => x.name === sel.value);
    $("l-left").textContent = s ? `เหลือ ${baht(s.left)} ${s.unit}` : "";
    sel.onchange = renderLog;
  } else {
    act = ui.bact;
    const b = S.bts || {};
    $("bts-card").innerHTML = `<b>เหลือ ${baht(b.left)} เที่ยว</b> · หมดอายุ ${esc(shortDate(b.expires))}<div class="hint">${esc(b.status)}</div>`;
    seg($("l-bact"), ["นั่ง", "ซื้อแพ็ก"], act, v => { ui.bact = v; saveUi(); renderLog(); });
    seg($("l-pack"), S.packs.map(String), String(ui.pack), v => { ui.pack = +v; saveUi(); renderLog(); });
    $("l-pack").className = "chips" + (act !== "ซื้อแพ็ก" ? " hidden" : "");
    if (act === "นั่ง" && !$("l-qty").value) $("l-qty").value = "2";
  }
  $("l-qty-l").classList.toggle("hidden", act === "ซื้อแพ็ก");
  $("l-qty-l").querySelector("span").textContent = QTY_LABEL[act] || "จำนวน";
  $("l-price-l").classList.toggle("hidden", act !== "ซื้อ" && act !== "ซื้อแพ็ก");
  if (!$("l-who").options.length) options($("l-who"), S.people, who());
  if (!$("l-date").value) $("l-date").value = today();
}

$("l-send").onclick = async () => {
  const bts = ui.part === "BTS", act = bts ? ui.bact : ui.act;
  const qty = act === "ซื้อแพ็ก" ? ui.pack : num($("l-qty").value);
  const name = bts ? "" : $("l-name").value;
  if (!bts && !name) return toast("เลือกของ", true);
  if (qty == null || qty < 0 || (act !== "นับ" && qty === 0)) return toast("ใส่จำนวน", true);
  const price = (act === "ซื้อ" || act === "ซื้อแพ็ก") ? num($("l-price").value) : null;
  const d = $("l-date").value;
  const ok = await send({ kind: "log", part: ui.part, act, name, qty, price: price == null ? "" : price, who: $("l-who").value,
    date: d && d !== today() ? d : "" }, $("l-send"));
  if (ok) { $("l-qty").value = ""; $("l-price").value = ""; $("l-date").value = today(); renderLog(); }
};

function renderBal() {
  if (!S) return;
  const groups = {};
  S.pockets.forEach(p => { const g = OWNER[p.owner] || p.owner; (groups[g] = groups[g] || []).push(p); });
  $("b-pockets").innerHTML = Object.keys(groups).map(g => `<div class="group">${esc(g)}</div><div class="pockets">` +
    groups[g].map(p => `<div class="pocket"><div class="n">${esc(p.name)}</div><div class="v ${p.left < 0 ? "neg" : ""}">${baht(p.left)}</div>` +
      `<div class="s">${p.used ? "ใช้ " + baht(p.used) : ""}${p.need ? " · ต้องเติม " + baht(p.need) : ""}</div></div>`).join("") + `</div>`).join("");
  const li = (d, t, a, cls) => `<li><span class="d">${esc(shortDate(d))}</span><span class="t">${t}</span><span class="a ${cls || ""}">${a}</span></li>`;
  const empty = '<li class="empty">ไม่มี</li>';
  const low = S.supplies.filter(s => s.low);
  $("b-low").innerHTML = low.map(s => li("", esc(s.name), esc(baht(s.left) + " " + s.unit))).join("") || empty;
  $("b-tx").innerHTML = S.recent.tx.map(r => li(r.date, esc([r.who, r.pocket, r.note || r.debt].filter(Boolean).join(" · ")),
    (r.type === "จ่าย" ? "−" : r.type === "เติม" ? "+" : "หนี้ ") + baht(r.amount), r.type === "จ่าย" ? "neg" : r.type === "เติม" ? "pos" : "")).join("") || empty;
  $("b-log").innerHTML = S.recent.log.map(r => li(r.date, esc([r.part, r.act, r.name].filter(Boolean).join(" · ")),
    esc(baht(r.qty) + (r.price ? " · ฿" + baht(r.price) : "")))).join("") || empty;
}

function renderAll() { renderMoney(); renderLog(); renderBal(); }

// ---------- start ----------
document.querySelector("nav").onclick = e => { const b = e.target.closest("button"); if (b) show(b.dataset.view); };
$("refresh").onclick = load;
$("b-setup").onclick = () => show("setup");
window.addEventListener("online", flushQueue);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
setQueue(queue());
renderAll();
show(ui.view || "money");
load();
