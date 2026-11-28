/* Iron Horse Gun & Archery Club — demo app.
 *
 * DATA LAYER: every screen talks to DB.* methods. In DEMO_MODE the store
 * is localStorage (nothing leaves the browser). With DEMO_MODE false the
 * same methods call Supabase (see supabase/schema.sql + SETUP.md) — the
 * screens never know which one is active.
 *
 * PAYMENT RULE (from the 2026–2027 rule book): dues are paid by CHECK OR
 * CASH, in person, at orientation (new members) or to the membership chair
 * (renewals). The demo preserves that exactly. There is no card checkout.
 * Card/Stripe appears only as a clearly-marked OPTIONAL add-on box on the
 * dues page, off by default, for the owner to decide on later.
 */
"use strict";

/* ---------- tiny helpers ---------- */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);
const todayISO = () => new Date().toISOString().slice(0, 10);
function fmtDate(iso){ if(!iso) return "—"; const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : "")); return d.toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", year:"numeric"}); }
function ageOn(dobISO){ const d = new Date(dobISO), n = new Date(); let a = n.getFullYear() - d.getFullYear(); const m = n.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--; return a; }
function nextSaturdays(n){ const out = []; const d = new Date(); d.setDate(d.getDate() + 1); while (out.length < n){ if (d.getDay() === 6) out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate() + 1); } return out; }
const SLOT_TIMES = ["10:00 AM", "11:30 AM", "1:00 PM"];

/* ---------- dues math — exactly the rule book ---------- */
/* New member: $25 application fee per member + $225 individual / $325 family.
 * After July 4: −$100 (new members only). Renewal: $225 / $325, and
 * −$25 for active/retired first responders, military, veterans (renewals only). */
function computeDues(o){
  const lines = [];
  const feeMembers = o.type === "family" ? (o.familyCount || 2) : 1;
  let total = 0;
  if (o.isNew){
    lines.push({label: "New member application fee — $" + CONFIG.DUES.applicationFee + " × " + feeMembers + (feeMembers > 1 ? " members" : " member"), amount: CONFIG.DUES.applicationFee * feeMembers});
    total += CONFIG.DUES.applicationFee * feeMembers;
  }
  const base = o.type === "family" ? CONFIG.DUES.family : CONFIG.DUES.individual;
  lines.push({label: (o.isNew ? "Annual membership" : "Annual renewal") + (o.type === "family" ? " — family" : " — individual"), amount: base});
  total += base;
  const d = new Date(o.date || todayISO());
  const july4 = new Date(d.getFullYear(), 6, 4);
  if (o.isNew && d > july4){
    lines.push({label: "New member discount — joined after July 4", amount: -CONFIG.DUES.july4Discount});
    total -= CONFIG.DUES.july4Discount;
  }
  if (!o.isNew && o.firstResponder){
    lines.push({label: "First responder / military / veteran renewal discount", amount: -CONFIG.DUES.responderDiscount});
    total -= CONFIG.DUES.responderDiscount;
  }
  return {lines, total};
}

/* ---------- seed data (clearly marked DEMO) ---------- */
function seed(){
  return {
    seq: {app: 1043, pay: 2007, email: 31},
    applications: [
      {id:"IHGC-2026-1042", type:"individual", firstName:"Michael", lastName:"Torres", mi:"J", dob:"1988-04-14", sex:"Male", usCitizen:"Yes",
       street:"412 Chestnut Ave", city:"Sicklerville", state:"NJ", zip:"08081", homePhone:"", cellPhone:"856-555-0142", email:"m.torres@example.com",
       occupation:"Electrician", emergency:"Maria Torres — 856-555-0143", nraMember:"Yes", nraNumber:"NRA-8841207", nraExpiry:"2027-03-31",
       fid:"FL-2291047", dl:"T1234-56789-01234", q1:"No", q2:"No",
       docs:{fid:"NJ-FID-Torres.pdf", dl:"DL-Torres.jpg", nra:"NRA-card-Torres.jpg", photo:"ID-photo-Torres.jpg"},
       familyMembers:[], status:"received", submittedAt:"2026-11-24", notes:"", orientation:null, signature:"M. Torres"},
      {id:"IHGC-2026-1041", type:"family", firstName:"Sarah", lastName:"Kim", mi:"", dob:"1990-09-02", sex:"Female", usCitizen:"Yes",
       street:"18 Willow Ct", city:"Blackwood", state:"NJ", zip:"08012", homePhone:"856-555-0119", cellPhone:"856-555-0118", email:"s.kim@example.com",
       occupation:"Teacher", emergency:"David Kim — 856-555-0117", nraMember:"Yes", nraNumber:"NRA-7710932", nraExpiry:"2026-12-31",
       fid:"FL-1988220", dl:"K9876-54321-09876", q1:"No", q2:"No",
       docs:{fid:"NJ-FID-Kim.pdf", dl:"DL-Kim.jpg", nra:"NRA-card-Kim.jpg", photo:"ID-photo-Kim.jpg"},
       familyMembers:["David Kim (spouse)"], status:"approved", submittedAt:"2026-11-20", notes:"Family of 2 — spouse David applies separately per the rules.",
       orientation:{date:"2026-12-05", time:"10:00 AM", by:"Dean"}, signature:"S. Kim"}
    ],
    members: [
      {id:"M-101", name:"Dean R.", email:"IronHorseGunClub@gmail.com", phone:"856-535-8622", type:"individual", memberSince:2019, duesYear:2026, duesStatus:"paid", duesPaid:225, nraExpiry:"2027-06-30", badge:"Issued", armband:"Issued", gateCard:"Issued", role:"Board"},
      {id:"M-102", name:"James Whitfield", email:"j.whitfield@example.com", phone:"856-555-0188", type:"individual", memberSince:2021, duesYear:2026, duesStatus:"paid", duesPaid:225, nraExpiry:"2027-03-15", badge:"Issued", armband:"Issued", gateCard:"Issued", role:"Member"},
      {id:"M-103", name:"Robert Chen", email:"r.chen@example.com", phone:"609-555-0176", type:"individual", memberSince:2023, duesYear:2026, duesStatus:"overdue", duesPaid:0, nraExpiry:"2026-11-30", badge:"Issued", armband:"Issued", gateCard:"Issued", role:"Member"},
      {id:"M-104", name:"Angela + Tom Ruiz", email:"ruiz.family@example.com", phone:"856-555-0121", type:"family", memberSince:2022, duesYear:2026, duesStatus:"paid", duesPaid:325, nraExpiry:"2027-01-31", badge:"Issued", armband:"Issued", gateCard:"Issued", role:"Member"},
      {id:"M-105", name:"Kevin O'Brien", email:"k.obrien@example.com", phone:"856-555-0164", type:"individual", memberSince:2024, duesYear:2026, duesStatus:"due", duesPaid:0, nraExpiry:"2027-08-31", badge:"Issued", armband:"—", gateCard:"—", role:"Member"}
    ],
    payments: [
      {id:"R-2006", who:"James Whitfield", memberId:"M-102", year:2026, type:"individual", method:"Check", checkNo:"1842", receivedBy:"Dean", amount:225, date:"2026-01-10"},
      {id:"R-2005", who:"Angela + Tom Ruiz", memberId:"M-104", year:2026, type:"family", method:"Cash", checkNo:"", receivedBy:"Sue", amount:325, date:"2026-01-04"}
    ],
    emails: [
      {id:"E-30", to:"All members", subject:"November newsletter — range closed Thanksgiving Day", template:"newsletter", sentAt:"2026-11-18 09:02", status:"sent"},
      {id:"E-29", to:"s.kim@example.com", subject:"Your Iron Horse application is approved — pick an orientation slot", template:"application-approved", sentAt:"2026-11-21 14:20", status:"sent"},
      {id:"E-28", to:"m.torres@example.com", subject:"We received your Iron Horse membership application", template:"application-received", sentAt:"2026-11-24 10:41", status:"sent"},
      {id:"E-27", to:"r.chen@example.com", subject:"Your 2026 dues are overdue", template:"renewal-expired", sentAt:"2026-11-02 08:15", status:"sent"}
    ],
    subscribers: [
      {email:"j.whitfield@example.com", name:"James Whitfield", at:"2026-01-10"},
      {email:"ruiz.family@example.com", name:"Angela Ruiz", at:"2026-01-04"},
      {email:"m.torres@example.com", name:"Michael Torres", at:"2026-11-24"}
    ]
  };
}

/* ---------- data layer ---------- */
const STORE_KEY = "ihgc_demo_v1";
const DB = {
  _data: null,
  load(){
    if (this._data) return this._data;
    if (CONFIG.DEMO_MODE){
      try { this._data = JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch(e){ this._data = null; }
      if (!this._data){ this._data = seed(); this.save(); }
      return this._data;
    }
    /* Real mode: the Supabase client is created lazily in supabaseClient().
       All reads below go through it; localStorage is never used. */
    throw new Error("Real Supabase mode is not wired to a project yet — see supabase/SETUP.md.");
  },
  save(){ if (CONFIG.DEMO_MODE) localStorage.setItem(STORE_KEY, JSON.stringify(this._data)); },
  reset(){ this._data = seed(); this.save(); },

  /* -- applications -- */
  listApplications(){ return this.load().applications.slice().reverse(); },
  getApplication(id){ return this.load().applications.find(a => a.id === id); },
  addApplication(app){
    const d = this.load();
    app.id = "IHGC-" + new Date().getFullYear() + "-" + (d.seq.app++);
    app.status = "received"; app.submittedAt = todayISO(); app.orientation = null; app.notes = "";
    d.applications.push(app); this.save(); return app;
  },
  updateApplication(id, patch){
    const a = this.getApplication(id); if (!a) return null;
    Object.assign(a, patch); this.save(); return a;
  },

  /* -- members -- */
  listMembers(){ return this.load().members.slice(); },
  getMember(id){ return this.load().members.find(m => m.id === id); },
  addMember(m){ const d = this.load(); d.members.push(m); this.save(); return m; },
  updateMember(id, patch){ const m = this.getMember(id); if (!m) return null; Object.assign(m, patch); this.save(); return m; },

  /* -- payments (check/cash, recorded at orientation or renewal) -- */
  listPayments(){ return this.load().payments.slice().reverse(); },
  recordPayment(p){
    const d = this.load();
    p.id = "R-" + (d.seq.pay++);
    p.date = todayISO();
    d.payments.unshift(p); this.save(); return p;
  },

  /* -- email log -- */
  listEmails(){ return this.load().emails.slice(); },
  logEmail(e){
    const d = this.load();
    e.id = "E-" + (d.seq.email++);
    e.sentAt = new Date().toLocaleString("en-US", {month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit"});
    e.status = CONFIG.DEMO_MODE ? "sent (preview — shown under Emails, not actually sent)" : "sent";
    d.emails.unshift(e); this.save(); return e;
  },

  listSubscribers(){ return this.load().subscribers.slice(); },
  addSubscriber(s){ const d = this.load(); if (!d.subscribers.some(x => x.email === s.email)){ d.subscribers.push(s); this.save(); } }
};

/* Supabase client (real mode only — loaded on demand, never in demo mode).
   Swap in your project URL + anon key in config.js, set DEMO_MODE false,
   and replace the demo-store methods above with these calls:
   - listApplications: supabase.from("applications").select("*, documents(*)").order("submitted_at", {ascending:false})
   - addApplication:  supabase.from("applications").insert(app).select().single()
   - recordPayment:   supabase.from("dues_payments").insert(p)
   - logEmail:        supabase.from("email_log").insert(e)
   Full table + RLS definitions: ../supabase/schema.sql
*/
let _sb = null;
async function supabaseClient(){
  if (_sb) return _sb;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = res; s.onerror = () => rej(new Error("Could not load the Supabase client."));
    document.head.appendChild(s);
  });
  _sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return _sb;
}

/* ---------- email templates (the same text Resend would send live) ---------- */
function emailBody(t, ctx){
  const head = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">'
    + '<div style="background:#141414;color:#fff;padding:16px 20px"><b style="font-size:17px">IRON HORSE</b> <span style="color:#c9a227;font-size:12px;letter-spacing:2px">GUN &amp; ARCHERY CLUB</span></div><div style="padding:20px">';
  const foot = '</div><div style="border-top:1px solid #e2e0d9;padding:14px 20px;font-size:12px;color:#6b675c">Iron Horse Gun &amp; Archery Club · 2685 Garwood Rd, Sicklerville, NJ 08081 · P.O. Box 340, Blackwood, NJ 08012<br>IronHorseGunClub@gmail.com · Range open only when an RSO is on duty.</div></div>';
  const b = {
    "application-received": `<h2 style="margin-top:0">We received your application</h2><p>Hi ${esc(ctx.name)},</p><p>Your membership application <b>${esc(ctx.appId)}</b> is in. The board reviews applications in the order they arrive — usually within a week.</p><p><b>What happens next:</b> if approved, we will email you to pick an orientation slot. Bring the originals of your documents and a check or cash for dues to orientation. If your application is not approved, your payment is refunded.</p><p>Questions? Reply to this email or call Dean at 856-535-8622.</p>`,
    "application-approved": `<h2 style="margin-top:0">Your application is approved</h2><p>Hi ${esc(ctx.name)},</p><p>Good news — your application <b>${esc(ctx.appId)}</b> is approved. The last step is the in-person new member orientation.</p><p><b>Pick your orientation slot</b> on the club site, and bring with you:</p><ul><li>The originals of your NJ Firearms ID Card, driver's license, NRA card, and ID photo</li><li>A check or cash for dues — <b>${money(ctx.amountDue || 0)}</b></li></ul><p>You cannot use the range until orientation is complete.</p>`,
    "orientation-reminder": `<h2 style="margin-top:0">Orientation reminder</h2><p>Hi ${esc(ctx.name)},</p><p>Your new member orientation is <b>${esc(ctx.when || "")}</b> at 2685 Garwood Rd, Sicklerville.</p><p>Bring the originals of your documents and a check or cash for dues (<b>${money(ctx.amountDue || 0)}</b>). Please arrive 10 minutes early and check in with the RSO on duty.</p>`,
    "dues-receipt": `<h2 style="margin-top:0">Dues receipt — ${esc(ctx.year || "")}</h2><p>Hi ${esc(ctx.name)},</p><p>Thank you. We received your ${esc(ctx.year || "")} dues payment.</p><table style="border-collapse:collapse"><tr><td style="padding:4px 12px 4px 0">Amount:</td><td><b>${money(ctx.amount || 0)}</b></td></tr><tr><td style="padding:4px 12px 4px 0">Method:</td><td>${esc(ctx.method || "")}${ctx.checkNo ? " — check #" + esc(ctx.checkNo) : ""}</td></tr><tr><td style="padding:4px 12px 4px 0">Received by:</td><td>${esc(ctx.receivedBy || "")}</td></tr><tr><td style="padding:4px 12px 4px 0">Receipt:</td><td>${esc(ctx.receipt || "")}</td></tr></table><p>Your membership is good through December 31, ${esc(ctx.year || "")}. Remember to send the membership chair a copy of your NRA card showing its expiration date each year.</p>`,
    "renewal-30": `<h2 style="margin-top:0">Your ${esc(ctx.year || "")} dues are due soon</h2><p>Hi ${esc(ctx.name)},</p><p>Membership runs January 1 to December 31. Your ${esc(ctx.year || "")} dues of <b>${money(ctx.amount || 0)}</b> are due January 1.</p><p>Pay the membership chair by check or cash, or bring it to the range. Active/retired first responders, military and veterans: your $25 renewal discount is already applied above. Please also send a copy of your NRA card showing its expiration date.</p>`,
    "renewal-7": `<h2 style="margin-top:0">One week left — ${esc(ctx.year || "")} dues</h2><p>Hi ${esc(ctx.name)},</p><p>Your ${esc(ctx.year || "")} dues of <b>${money(ctx.amount || 0)}</b> are due in one week (January 1). After that date your badge is inactive until dues are paid. Pay the membership chair by check or cash.</p>`,
    "renewal-expired": `<h2 style="margin-top:0">Your dues are overdue</h2><p>Hi ${esc(ctx.name)},</p><p>Your ${esc(ctx.year || "")} dues of <b>${money(ctx.amount || 0)}</b> are overdue. Your badge is inactive until dues are paid — please bring a check or cash to the membership chair, or contact the board. If you are leaving the club, please let us know and return your badge to P.O. Box 340, Blackwood, NJ 08012.</p>`,
    "gate-code": `<h2 style="margin-top:0">Your gate code</h2><p>Hi ${esc(ctx.name)},</p><p>The board has approved your safety observation. Your gate code is <b>${esc(ctx.code || "—")}</b>. It is yours alone — do not share it. The gate must always be left closed (not locked) behind you, and the lock itself left in the locked position.</p><p>Range hours: Monday–Saturday 9:00 am to 30 minutes before sundown; Sunday 1:00 pm to 30 minutes before sundown. The range is open only when an RSO is on duty — check the calendar before you drive out.</p>`,
    "newsletter": `<h2 style="margin-top:0">Iron Horse — ${esc(ctx.title || "club update")}</h2><p>Hi ${esc(ctx.name || "member")},</p><p>${esc(ctx.text || "")}</p>`
  }[t] || "<p>(No preview for this template.)</p>";
  return head + b + foot;
}
function sendEmail(template, to, subject, ctx){
  const e = DB.logEmail({to, subject, template, body: emailBody(template, ctx || {})});
  return e;
}

/* ---------- router ---------- */
const routes = {};
function route(name, fn){ routes[name] = fn; }
function currentRoute(){
  const h = location.hash.replace(/^#\/?/, "");
  const [name, query] = h.split("?");
  const params = {};
  if (query) query.split("&").forEach(p => { const [k, v] = p.split("="); params[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
  return {name: name || "", params};
}
function render(){
  const {name, params} = currentRoute();
  const fn = routes[name] || routes[""];
  window.scrollTo(0, 0);
  $("#view").innerHTML = "";
  fn($("#view"), params);
  $$("#nav a").forEach(a => a.classList.toggle("active", (a.dataset.route || "") === name));
}
window.addEventListener("hashchange", render);

/* ---------- shared bits ---------- */
function duesTableHTML(){
  const D = CONFIG.DUES;
  return `<table>
    <tr><th>Membership</th><th>Per year</th><th>Notes</th></tr>
    <tr><td><b>Individual</b></td><td><b>$${D.individual}</b></td><td>Plus $${D.applicationFee} application fee for new members</td></tr>
    <tr><td><b>Family</b></td><td><b>$${D.family}</b></td><td>Same address; each member applies and meets the same requirements</td></tr>
    <tr><td>New member, after July 4</td><td>−$${D.july4Discount}</td><td>New members only — no discount on renewals</td></tr>
    <tr><td>Renewal — first responder / military / veteran</td><td>−$${D.responderDiscount}</td><td>Active and retired; renewals only</td></tr>
  </table>
  <p class="small muted">Membership year: January 1 – December 31. If an application is not approved, payment is refunded. Pay by check or cash at orientation (new members) or to the membership chair (renewals).</p>`;
}

/* ---------- home ---------- */
route("", (el) => {
  el.innerHTML = `
  <div class="hero"><div class="wrap grid">
    <div>
      <p class="kicker" style="color:var(--gold)">Private · Members-only · Est. 1947</p>
      <h1>Iron Horse Gun &amp; <em>Archery</em> Club</h1>
      <p class="lede">Outdoor rifle, pistol, shotgun and archery ranges in Sicklerville, New Jersey — a safe, welcoming place for responsible firearms owners and archery enthusiasts, run by volunteers since 1947.</p>
      <div class="btn-row">
        <a class="btn" href="#/apply">Apply to join</a>
        <a class="btn ghost" href="#/membership" style="background:transparent;color:#fff;border-color:#666">Membership &amp; dues</a>
      </div>
      <p class="small" style="color:#9a978c">Range open to members only — an RSO must be on duty. <a href="#/calendar" style="color:var(--gold)">Check the RSO calendar</a> before you drive out.</p>
    </div>
    <div class="badge-img"><img src="images/logo-900.png" alt="Iron Horse Gun and Archery Club badge — gold triangle with a locomotive" width="900" height="752"></div>
  </div></div>

  <section class="block"><div class="wrap">
    <p class="kicker">The ranges</p>
    <h2>Four disciplines, one outdoor range</h2>
    <div class="cards">
      <div class="card"><h3>Rifle</h3><p>25, 50 and 100-yard ranges. The 100-yard range is bench-rest shooting only.</p></div>
      <div class="card"><h3>Pistol</h3><p>25-yard pistol range. No holster draws without an NJ Permit to Carry or law-enforcement credentials.</p></div>
      <div class="card"><h3>Shotgun</h3><p>Buckshot on the 25 and 50-yard ranges only — not on the 100-yard range.</p></div>
      <div class="card"><h3>Archery</h3><p>Dedicated archery range. Target or field points only; no firearms on the archery range.</p></div>
    </div>
    <div class="notice mt"><h3>Range hours — from the rule book</h3>
      <p style="margin-bottom:0"><b>Monday–Saturday:</b> 9:00 am to 30 minutes before sundown. <b>Sunday:</b> 1:00 pm to 30 minutes before sundown, no exceptions. No shooting after dark. Closed Easter, Thanksgiving, Christmas and Timber Creek High School Graduation.</p>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <p class="kicker">Membership</p>
    <h2>Joining takes three steps</h2>
    <div class="cards">
      <div class="card"><h3>1 · Apply online</h3><p>Fill out the application and upload your NJ Firearms ID Card, driver's license, NRA card and ID photo. Takes about 10 minutes — no PDF, no email attachments.</p></div>
      <div class="card"><h3>2 · Board review</h3><p>The board reviews your application and emails you. If approved, you pick an orientation slot.</p></div>
      <div class="card"><h3>3 · Orientation</h3><p>Come to the range, bring your originals, and bring a check or cash for dues. After orientation you get your badge — and the range is yours.</p></div>
    </div>
    <div class="btn-row"><a class="btn" href="#/apply">Start your application</a><a class="btn ghost" href="#/membership">See dues &amp; requirements</a></div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="two-col">
      <div>
        <p class="kicker">About the club</p>
        <h2>Volunteer-run since 1947</h2>
        <p>Founded in 1947, the Iron Horse Gun &amp; Archery Club is dedicated to the sport of shooting and archery. Our facility is comprised of target practice areas that offer varying distances to target. We are an outdoor range, located right in Sicklerville, Camden County, New Jersey.</p>
        <p>The primary use of the club is for individual shooting by our members and their guests. There are many ongoing organized shooting activities and events.</p>
        <p>The club fosters honesty, good fellowship, self discipline, and personal responsibility — and proudly supports the National Rifle Association.</p>
      </div>
      <div>
        <p class="kicker">NRA</p>
        <h2>Members must hold NRA membership</h2>
        <img class="nra" src="images/nra-logo.jpg" alt="National Rifle Association logo" width="300" height="284" loading="lazy">
        <p class="mt">Continuous NRA membership is required to remain a member in good standing. Join through the club and save $10 on your NRA membership.</p>
        <a class="btn small" href="${CONFIG.CLUB.nraJoinUrl}" target="_blank" rel="noopener">Join the NRA — save $10</a>
      </div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <p class="kicker">Training</p>
    <h2>Learn here</h2>
    <div class="two-col">
      <div>
        <p>NRA Basic Pistol, USCCA and NJ Permit-to-Carry (CCARE) qualifications are run at the club. Email the club for dates and details.</p>
        <p class="muted">US Law Shield members: discount code <b>IronHorse1</b>.</p>
        <a class="btn ghost" href="mailto:${CONFIG.CLUB.email}">Email about training</a>
      </div>
      <div>
        <img src="images/shoot-safe-nj.jpg" alt="Shoot Safe NJ LLC — Brian Nolder, USCCA / NRA firearms instructor and Range Safety Officer" width="520" height="912" loading="lazy" style="max-width:300px">
        <p class="small muted mt">Shoot Safe NJ LLC — Brian Nolder, 856-471-7229, Brian@ShootSafeNJ.com. USCCA / NRA instructor &amp; RSO.</p>
      </div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <p class="kicker">Friends of Iron Horse</p>
    <h2>Pine Valley Gun Club</h2>
    <p>Located in Berlin, NJ, Pine Valley Gun Club has been supporting the South Jersey shooting community since 1937 — trap shooting, competitions, and a welcoming environment for shooting enthusiasts of all experience levels.</p>
    <p><a href="https://www.pinevalleygunclub.org/" target="_blank" rel="noopener">pinevalleygunclub.org →</a></p>
    <div class="notice"><h3>Range photos</h3><p style="margin-bottom:0">The club's current site has no photos of the actual range — only the badge and NRA graphics. This redesign is built to show real range photos as soon as the club supplies them. If you have photos from the Facebook group, send them and they go here.</p></div>
  </div></section>`;
});

/* ---------- membership ---------- */
route("membership", (el) => {
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <p class="kicker">Membership</p>
    <h1>Join Iron Horse</h1>
    <p style="max-width:62ch">A private, members-only club. Membership runs January 1 to December 31. You must be 18 or older, a U.S. citizen, an NRA member (or applying), and hold a valid NJ Firearms ID Card.</p>
    <div class="btn-row"><a class="btn" href="#/apply">Apply online</a><a class="btn ghost" href="#/pay">What do I owe? — dues calculator</a></div>
  </div></section>

  <section class="block"><div class="wrap">
    <h2>Dues — from the 2026–2027 rule book</h2>
    ${duesTableHTML()}
    <div class="cards mt">
      <div class="card"><h3>New individual</h3><p class="price">$250 <small>first year</small></p><p>$25 application fee + $225 annual dues. Join after July 4 and it's $150.</p></div>
      <div class="card"><h3>New family</h3><p class="price">$325 <small>/ year + fees</small></p><p>$325 annual dues + $25 application fee per member. Same address; each member applies.</p></div>
      <div class="card"><h3>Renewal</h3><p class="price">$225 <small>/ $325 family</small></p><p>$25 off for active/retired first responders, military and veterans.</p></div>
    </div>
    <div class="notice"><h3>How you pay</h3><p style="margin-bottom:0">By <b>check or cash</b>, in person — at orientation for new members, to the membership chair for renewals. The club is volunteer-run and keeps payment simple: the amount, the check number, and who received it are recorded on your record. <a href="#/pay">See the dues page →</a></p></div>
  </div></section>

  <section class="block"><div class="wrap">
    <h2>What you need</h2>
    <div class="cards">
      <div class="card"><h3>1 · NRA membership</h3><p>Current NRA card (or an application in progress). You show the card, with its expiration date, to the membership chair each year when you pay dues. <a href="${CONFIG.CLUB.nraJoinUrl}" target="_blank" rel="noopener">Join through the club — save $10 →</a></p></div>
      <div class="card"><h3>2 · NJ Firearms ID Card</h3><p>A valid NJ Firearms ID Card (out-of-state: hunter education, a carry permit, or another firearms ID card). Upload a copy; bring the original to orientation.</p></div>
      <div class="card"><h3>3 · Photo ID</h3><p>A copy of your driver's license or government ID, plus a 1″ × 1.25″ color photo for your range ID card.</p></div>
      <div class="card"><h3>4 · The waiver</h3><p>You sign the club's Release and Waiver of Liability as part of the application, and agree to abide by the range rules.</p></div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <h2>How it works now</h2>
    <div class="cards">
      <div class="card"><h3>1 · Apply</h3><p>Complete the online application and upload your four documents. You get a confirmation email with your application number.</p></div>
      <div class="card"><h3>2 · Review</h3><p>The board reviews it — usually within a week — and emails you the decision. If it isn't approved, any payment is refunded.</p></div>
      <div class="card"><h3>3 · Orientation</h3><p>Pick a Saturday slot. Bring your originals and a check or cash for dues. After orientation, your badge, armband and gate card are issued.</p></div>
      <div class="card"><h3>4 · Range use</h3><p>Members shoot only when a volunteer RSO is on duty. After your RSO safety observation is approved, you receive your gate code for independent access.</p></div>
    </div>
    <p class="muted small mt">The old way still works: download the paper application (PDF) from the <a href="#/rules">rules page</a>. The online form asks for exactly the same information.</p>
  </div></section>`;
});

/* ---------- rules ---------- */
route("rules", (el) => {
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <p class="kicker">Range rules &amp; etiquette</p>
    <h1>Range safety &amp; forms</h1>
    <p style="max-width:62ch">The full rule book governs. Below are the rules members ask about most — the complete text is in the PDF.</p>
    <div class="btn-row">
      <a class="btn" href="downloads/Iron-Horse-Rule-Book-2026-2027.pdf">Rule book 2026–2027 (PDF)</a>
      <a class="btn ghost" href="downloads/Iron-Horse-Membership-Application.pdf">Membership application (PDF)</a>
      <a class="btn ghost" href="downloads/Iron-Horse-Guest-Waiver.pdf">Guest waiver (PDF)</a>
      <a class="btn ghost" href="downloads/Member-Firearm-Safety-Observation.pdf">Safety observation (PDF)</a>
    </div>
  </div></section>
  <section class="block"><div class="wrap">
    <div class="two-col">
      <div>
        <h2>The short version</h2>
        <div class="rule"><b>Wear your photo ID badge.</b> Sign in when you arrive, sign out when you leave.</div>
        <div class="rule"><b>Anyone can call a cease fire.</b> If you see something unsafe, call it and report it to a Range Officer.</div>
        <div class="rule"><b>Ear and eye protection</b> for everyone on the firing line and in staging areas.</div>
        <div class="rule"><b>Red flag = hot, green flag = cold.</b> No firearm handling during a cease fire or while anyone is downrange.</div>
        <div class="rule"><b>2 seconds between shots.</b> No rapid fire. Misfire: keep the muzzle downrange for 30 seconds.</div>
        <div class="rule"><b>Paper targets only.</b> No steel or explosive targets — town ordinance. Rounds must hit the berm.</div>
        <div class="rule"><b>Clean up.</b> Brass in the buckets, targets in the trash, stands back behind the firing line.</div>
      </div>
      <div>
        <h2>Firearms &amp; ammunition</h2>
        <p>Only New Jersey-legal firearms and ammunition. Prohibited: .50 BMG, automatic firearms, binary triggers, forced-reset triggers, steel-core, armor-piercing, tracer and incendiary rounds. Buckshot only on the 25 and 50-yard ranges.</p>
        <p>Firearms must be unloaded arriving and leaving, and stay unloaded until at the shooting line pointed downrange — except law enforcement (active/retired) and NJ Permit to Carry holders. No holster draws without a carry permit or LE credentials.</p>
        <h2>Guests</h2>
        <p>One guest at a time, sharing your port, under your supervision. Guests sign in and out and fill out a guest pass and waiver. Guests under 18 must be under your direct supervision at all times; no guests under 12 unless the board approves or an instructor supervises. No one under 21 may shoot a handgun without supervision by someone over 21.</p>
        <h2>Safety videos</h2>
        <p>“Safety At a Public Range” — MidwayUSA · “Mastering Gun Range Etiquette” — Ted Write. Links are on the club's current site; ask the board for the links.</p>
      </div>
    </div>
  </div></section>`;
});

/* ---------- calendar ---------- */
route("calendar", (el) => {
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <p class="kicker">Calendar</p>
    <h1>RSO schedule &amp; events</h1>
    <p style="max-width:62ch">The range is open <b>only when a volunteer RSO is on duty</b>. RSOs are volunteers — check this calendar before you drive out, and re-check for last-minute changes.</p>
    <div class="notice"><h3>Before you drive out</h3><p style="margin-bottom:0">Hours: Mon–Sat 9:00 am to 30 minutes before sundown; Sunday 1:00 pm to 30 minutes before sundown. Closed Easter, Thanksgiving, Christmas and Timber Creek High School Graduation. If no RSO is on site, the range is closed.</p></div>
    <iframe class="cal" title="Iron Horse RSO calendar" src="https://calendar.google.com/calendar/embed?height=1200&wkst=1&ctz=America%2FNew_York&showPrint=0&showNav=0&showTitle=0&showTz=0&mode=MONTH&title=RSO&showCalendars=0&showTabs=0&src=aXJvbmhvcnNlZ3VuY2x1YkBnbWFpbC5jb20&src=YWJmN2JlZGE4NzQ4YWViNTBhMmQwM2VjY2E1MDgyNzY4YjZmODYxNTQ4NTRmZTA4YjIxYTVlMWY1MWQ3MDYxOEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23039be5&color=%23d50000" loading="lazy"></iframe>
    <p class="small muted mt">Calendar source: the club's Google Calendar (same embed as the current site). Sunset times: the club's weather widget uses Open-Meteo; check it on the current site until it is rebuilt here.</p>
  </div></section>`;
});

/* ---------- training ---------- */
route("training", (el) => {
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <p class="kicker">Training</p>
    <h1>Training at Iron Horse</h1>
    <div class="two-col">
      <div>
        <h2>Courses</h2>
        <p><b>NRA Basic Pistol</b><br><b>USCCA</b> concealed-carry courses<br><b>NJ Permit to Carry — CCARE</b> shooting qualification</p>
        <p>Courses are run at the club by certified instructors. Email the club for the next dates and prices.</p>
        <p><a class="btn" href="mailto:${CONFIG.CLUB.email}">Email about training</a></p>
        <p class="muted small">US Law Shield discount code: <b>IronHorse1</b>.</p>
        <h2 class="mt">Instructors</h2>
        <p>Club firearm instructors are approved in writing by the club and hold a current recognized instructor certification and instructor liability insurance. No training for profit without prior board approval.</p>
      </div>
      <div>
        <img src="images/shoot-safe-nj.jpg" alt="Shoot Safe NJ LLC — Brian Nolder, USCCA / NRA firearms instructor and Range Safety Officer" width="520" height="912" loading="lazy" style="max-width:320px">
        <p class="small muted mt">Shoot Safe NJ LLC — Brian Nolder, 856-471-7229 · Brian@ShootSafeNJ.com · <a href="https://www.shootsafenj.com" target="_blank" rel="noopener">shootsafenj.com</a><br>USCCA / NRA Firearms Instructor &amp; Range Safety Officer. Concealed Carry, Home Defense, Firearm Safety, CPR &amp; First Aid. One-on-one live fire &amp; electronic range simulation.</p>
      </div>
    </div>
  </div></section>`;
});

/* ---------- apply ---------- */
let APPLY = null;
function freshApply(){
  return {step: 1, type: "individual", familyCount: 2, familyMembers: "",
    firstName: "", lastName: "", mi: "", dob: "", sex: "", usCitizen: "",
    street: "", city: "", state: "NJ", zip: "", homePhone: "", cellPhone: "", email: "",
    occupation: "", emergency: "",
    nraMember: "", nraNumber: "", nraExpiry: "", nraApplied: false,
    fid: "", dl: "",
    docs: {fid: null, dl: null, nra: null, photo: null},
    q1: "", q2: "", signature: "", sigTyped: "", agreeWaiver: false, agreeRules: false};
}
const WAIVER_HTML = `
<p><b>Release and Waiver of Liability, Assumption of Risk and Indemnity Agreement.</b> Read carefully. By signing, you give up legal rights, including the right to sue. (Condensed from the club's rule book, page 5 — the full text is in the <a href="downloads/Iron-Horse-Rule-Book-2026-2027.pdf" target="_blank">rule book PDF</a>.)</p>
<h4>1 · Released parties</h4><p>The Club, the owners of the range property, its officers, directors and board members, range safety officers, instructors, members, volunteers, agents and employees, and each of their heirs, successors and assigns.</p>
<h4>2 · Assumption of risk</h4><p>Shooting, archery and related activities involve inherent and serious risks, including serious bodily injury, permanent disability, loss of hearing or vision, death and property damage — from your own actions, the actions of others, malfunction of firearms or equipment, ricochets, lead and noise exposure, weather, and the condition of the premises. You knowingly and voluntarily assume all such risks, known and unknown.</p>
<h4>3 · Release and waiver</h4><p>To the fullest extent permitted by law, you release and waive claims against the Released Parties for personal injury, death or property damage arising from your membership or use of the property, including claims arising from ordinary negligence. This does not apply to gross negligence, recklessness or intentional misconduct.</p>
<h4>4 · Indemnification</h4><p>You will indemnify, defend and hold harmless the Released Parties from claims, losses and expenses (including reasonable attorneys' fees) arising from your acts or omissions, your violation of the rules or of any law, or the acts of any guest you bring.</p>
<h4>5 · Guests</h4><p>You are responsible for your guests. Each guest must sign the guest release before entering the firing line; for a guest under 18, a parent or legal guardian signs.</p>
<h4>6 · Compliance &amp; medical</h4><p>You confirm you are legally permitted to possess firearms and agree to follow the club's rules, RSO directions, and all applicable laws. You consent to emergency medical treatment if injured and unable to consent, and are responsible for its cost.</p>
<h4>7 · Governing law</h4><p>New Jersey law. If any part is held invalid, the remainder stands. This agreement binds you and your heirs and remains in effect for the duration of your membership and any renewals.</p>
<p><b>I have read this agreement, I understand it, and I sign it voluntarily. I understand that by signing I am giving up substantial legal rights, including my right to sue.</b></p>`;

route("apply", (el, params) => {
  if (!APPLY) APPLY = freshApply();
  const a = APPLY;
  const step = a.step;
  const stepsBar = [1,2,3,4].map(n =>
    `<span class="${n === step ? "on" : (n < step ? "done" : "")}">${n}. ${["Your details","Credentials & documents","Questions & waiver","Review"][n-1]}</span>`).join("");
  let body = "";
  if (step === 1){
    body = `
    <div class="field-row">
      <div class="field"><label>Membership type <span class="req">*</span></label>
        <select id="f-type"><option value="individual" ${a.type==="individual"?"selected":""}>Individual — $225 / year</option><option value="family" ${a.type==="family"?"selected":""}>Family — $325 / year</option></select>
        <p class="hint">Family: everyone lives at the same address, and each member applies and meets the same requirements.</p></div>
      <div class="field" id="wrap-famcount" style="display:${a.type==="family"?"block":"none"}"><label>How many family members are applying (including you)?</label>
        <input type="number" id="f-famcount" min="2" max="6" value="${a.familyCount}">
        <p class="hint">Application fee is $25 per member.</p></div>
    </div>
    <div id="wrap-fammembers" style="display:${a.type==="family"?"block":"none"}">
      <label>Other family members applying (one per line — name + relationship)</label>
      <textarea id="f-fammembers" rows="2" placeholder="David Kim (spouse)">${esc(a.familyMembers)}</textarea>
      <p class="hint">Each family member submits their own application. List them here and the board links the applications.</p>
    </div>
    <div class="field-row three">
      <div class="field"><label>Last name <span class="req">*</span></label><input type="text" id="f-last" value="${esc(a.lastName)}"><div class="err">Required.</div></div>
      <div class="field"><label>First name <span class="req">*</span></label><input type="text" id="f-first" value="${esc(a.firstName)}"><div class="err">Required.</div></div>
      <div class="field"><label>MI</label><input type="text" id="f-mi" maxlength="1" value="${esc(a.mi)}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Street address <span class="req">*</span></label><input type="text" id="f-street" value="${esc(a.street)}"><div class="err">Required.</div></div>
      <div class="field"><label>City <span class="req">*</span></label><input type="text" id="f-city" value="${esc(a.city)}"><div class="err">Required.</div></div>
    </div>
    <div class="field-row three">
      <div class="field"><label>State <span class="req">*</span></label><input type="text" id="f-state" value="${esc(a.state)}"><div class="err">Required.</div></div>
      <div class="field"><label>ZIP <span class="req">*</span></label><input type="text" id="f-zip" value="${esc(a.zip)}"><div class="err">Required.</div></div>
      <div class="field"><label>Date of birth <span class="req">*</span></label><input type="date" id="f-dob" value="${esc(a.dob)}"><div class="err">You must be at least 18.</div></div>
    </div>
    <div class="field-row three">
      <div class="field"><label>Cell phone <span class="req">*</span></label><input type="tel" id="f-cell" value="${esc(a.cellPhone)}"><div class="err">Required.</div></div>
      <div class="field"><label>Home phone</label><input type="tel" id="f-home" value="${esc(a.homePhone)}"></div>
      <div class="field"><label>Email <span class="req">*</span></label><input type="email" id="f-email" value="${esc(a.email)}"><div class="err">Enter a valid email.</div></div>
    </div>
    <div class="field-row three">
      <div class="field"><label>U.S. citizen <span class="req">*</span></label>
        <div class="radio-row"><label><input type="radio" name="f-cit" value="Yes" ${a.usCitizen==="Yes"?"checked":""}> Yes</label><label><input type="radio" name="f-cit" value="No" ${a.usCitizen==="No"?"checked":""}> No</label></div>
        <div class="err">U.S. citizenship is required for membership.</div></div>
      <div class="field"><label>Sex</label>
        <div class="radio-row"><label><input type="radio" name="f-sex" value="Male" ${a.sex==="Male"?"checked":""}> Male</label><label><input type="radio" name="f-sex" value="Female" ${a.sex==="Female"?"checked":""}> Female</label></div></div>
      <div class="field"><label>Occupation</label><input type="text" id="f-occ" value="${esc(a.occupation)}"></div>
    </div>
    <div class="field"><label>Emergency contact (name + phone) <span class="req">*</span></label><input type="text" id="f-emerg" value="${esc(a.emergency)}" placeholder="Name — phone"><div class="err">Required.</div></div>`;
  }
  if (step === 2){
    const doc = (key, label, hint, accept) => `
      <div class="field"><label>${label} <span class="req">*</span></label>
        <input type="file" id="doc-${key}" accept="${accept}">
        <p class="hint">${hint}${a.docs[key] ? ` <b style="color:var(--green)">Attached: ${esc(a.docs[key].name)} (${Math.round(a.docs[key].size/1024)} KB)</b>` : ""}</p>
        <div class="err">Please attach this document.</div></div>`;
    body = `
    <p>All four documents are required — the board cannot approve an application without them. In the live system these upload to secure club storage; this preview records the file name only.</p>
    <div class="field-row">
      <div class="field"><label>NRA member # <span class="req">*</span></label><input type="text" id="f-nranum" value="${esc(a.nraNumber)}" placeholder="e.g. NRA-1234567"><div class="err">Required — or apply for NRA membership below.</div></div>
      <div class="field"><label>NRA expiration date <span class="req">*</span></label><input type="date" id="f-nraexp" value="${esc(a.nraExpiry)}"><div class="err">Required.</div></div>
    </div>
    <div class="field"><label>Are you an NRA member? <span class="req">*</span></label>
      <div class="radio-row"><label><input type="radio" name="f-nra" value="Yes" ${a.nraMember==="Yes"?"checked":""}> Yes, I'm a member</label><label><input type="radio" name="f-nra" value="Applied" ${a.nraMember==="Applied"?"checked":""}> Not yet — I've applied</label></div>
      <p class="hint">NRA membership is required and must stay current. <a href="${CONFIG.CLUB.nraJoinUrl}" target="_blank" rel="noopener">Join through the club and save $10 →</a></p></div>
    <div class="field-row">
      <div class="field"><label>NJ Firearms ID Card # <span class="req">*</span></label><input type="text" id="f-fid" value="${esc(a.fid)}"><div class="err">Required. Out-of-state: hunter education, carry permit, or another firearms ID card.</div></div>
      <div class="field"><label>Driver's license # <span class="req">*</span></label><input type="text" id="f-dl" value="${esc(a.dl)}"><div class="err">Required.</div></div>
    </div>
    ${doc("fid", "Copy of NJ Firearms ID Card", "NJ residents. Out-of-state: hunter education, carry permit, or other firearms ID.", "image/*,.pdf")}
    ${doc("dl", "Color copy of driver's license", "Or other government ID.", "image/*,.pdf")}
    ${doc("nra", "Copy of NRA card", "Showing your member number and expiration date. If you just applied, upload your confirmation.", "image/*,.pdf")}
    ${doc("photo", "1″ × 1.25″ color photo", "For your range ID card. A clear headshot against a plain background.", "image/*")}`;
  }
  if (step === 3){
    body = `
    <h3>Two questions — answer honestly</h3>
    <div class="field"><label>1. Have you ever been convicted of a crime or disorderly persons offense? <span class="req">*</span></label>
      <div class="radio-row"><label><input type="radio" name="f-q1" value="Yes" ${a.q1==="Yes"?"checked":""}> Yes</label><label><input type="radio" name="f-q1" value="No" ${a.q1==="No"?"checked":""}> No</label></div></div>
    <div class="field"><label>2. Have you ever had a permit to purchase a firearm or a firearms I.D. card refused or revoked? <span class="req">*</span></label>
      <div class="radio-row"><label><input type="radio" name="f-q2" value="Yes" ${a.q2==="Yes"?"checked":""}> Yes</label><label><input type="radio" name="f-q2" value="No" ${a.q2==="No"?"checked":""}> No</label></div>
      <p class="hint">A “yes” does not automatically reject your application — the board will contact you to discuss it.</p></div>
    <h3 class="mt">Release and Waiver of Liability</h3>
    <div class="waiver-box">${WAIVER_HTML}</div>
    <label class="checkline"><input type="checkbox" id="f-agree-waiver" ${a.agreeWaiver?"checked":""}><span>I have read the Release and Waiver of Liability above, I understand it, and I sign it voluntarily. <span class="req">*</span></span></label>
    <label class="checkline"><input type="checkbox" id="f-agree-rules" ${a.agreeRules?"checked":""}><span>I have read and agree to abide by the Iron Horse range rules, and I understand that failure to follow them may result in suspension or permanent revocation of my membership. <span class="req">*</span></span></label>
    <h3 class="mt">Your signature</h3>
    <p class="hint">Sign with your mouse or finger. In the live system this is a legally binding e-signature, stored with the application.</p>
    <div class="sig-wrap">
      <canvas class="sig" id="sig" width="520" height="140"></canvas>
      <button type="button" class="btn ghost small sig-clear" id="sig-clear">Clear</button>
    </div>
    <div class="field" style="max-width:520px"><label>Type your full name (must match your signature) <span class="req">*</span></label><input type="text" id="f-sigtyped" value="${esc(a.sigTyped)}"><div class="err">Type your full name.</div></div>`;
  }
  if (step === 4){
    const dues = computeDues({type: a.type, isNew: true, date: todayISO(), familyCount: a.familyCount});
    const rows = dues.lines.map(l => `<div class="row"><span>${esc(l.label)}</span><span class="${l.amount<0?"neg":""}">${money(l.amount)}</span></div>`).join("");
    const docRow = (k, label) => `<dt>${label}</dt><dd>${a.docs[k] ? "✓ " + esc(a.docs[k].name) : "<span style='color:var(--red)'>Missing</span>"}</dd>`;
    body = `
    <h3>Review your application</h3>
    <div class="detail"><dl>
      <dt>Name</dt><dd>${esc(a.firstName)} ${esc(a.mi)} ${esc(a.lastName)}</dd>
      <dt>Membership</dt><dd>${a.type === "family" ? "Family" : "Individual"}${a.type==="family" ? " — " + esc(a.familyMembers.split("\n").filter(Boolean).length + 1) + " members" : ""}</dd>
      <dt>Address</dt><dd>${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}</dd>
      <dt>Contact</dt><dd>${esc(a.cellPhone)} · ${esc(a.email)}</dd>
      <dt>Date of birth</dt><dd>${esc(a.dob)} (age ${a.dob ? ageOn(a.dob) : "—"}) · U.S. citizen: ${esc(a.usCitizen)}</dd>
      <dt>NRA</dt><dd>${a.nraMember === "Yes" ? "Member #" + esc(a.nraNumber) + ", expires " + esc(a.nraExpiry) : "Applied — membership in progress"}</dd>
      <dt>NJ Firearms ID</dt><dd>${esc(a.fid)}</dd>
      <dt>Driver's license</dt><dd>${esc(a.dl)}</dd>
      <dt>Emergency contact</dt><dd>${esc(a.emergency)}</dd>
      ${docRow("fid", "FID copy")}${docRow("dl", "License copy")}${docRow("nra", "NRA card")}${docRow("photo", "ID photo")}
      <dt>Background questions</dt><dd>Conviction: ${esc(a.q1)} · Permit refused/revoked: ${esc(a.q2)}</dd>
      <dt>Signature</dt><dd>${esc(a.sigTyped)} — signed electronically</dd>
    </dl></div>
    <h3>What you will owe at orientation</h3>
    <div class="lines">${rows}<div class="row total"><span>Total due at orientation</span><span>${money(dues.total)}</span></div></div>
    <div class="notice"><h3>Payment — check or cash, at orientation</h3><p style="margin-bottom:0">Bring <b>${money(dues.total)}</b> by check or cash to your orientation, along with the originals of your documents. Nothing is charged now. If your application is not approved, you owe nothing.</p></div>
    <p class="small muted">Submitting sends your application to the board and emails you a confirmation. This preview stores it in your browser only; the live system stores it in the club's Supabase database.</p>`;
  }
  el.innerHTML = `
  <section class="block"><div class="wrap" style="max-width:820px">
    <p class="kicker">Membership application</p>
    <h1>Apply to join Iron Horse</h1>
    <p class="muted">The same application as the paper form — online, in about 10 minutes. All fields marked * are required.</p>
    <div class="steps">${stepsBar}</div>
    <div class="progress"><i style="width:${step * 25}%"></i></div>
    <div id="form-error" class="notice red" style="display:none"></div>
    <form id="apply-form" novalidate>${body}</form>
    <div class="btn-row">
      ${step > 1 ? `<button class="btn ghost" id="btn-back">← Back</button>` : ""}
      ${step < 4 ? `<button class="btn" id="btn-next">Continue →</button>` : `<button class="btn" id="btn-submit">Submit application</button>`}
      <button class="btn ghost" id="btn-reset" type="button">Start over</button>
    </div>
    <p class="small muted">Preview note: this form stores the application in your browser only. <a href="#/admin">See it appear in the admin queue →</a></p>
  </div></section>`;

  /* ---- wire up ---- */
  const val = id => { const n = $("#" + id); return n ? n.value.trim() : ""; };
  const markInvalid = (id, bad) => { const f = $("#" + id); if (!f) return; const field = f.closest(".field"); if (field) field.classList.toggle("invalid", !!bad); };
  if (step === 1){
    $("#f-type").addEventListener("change", e => {
      a.type = e.target.value;
      $("#wrap-famcount").style.display = a.type === "family" ? "block" : "none";
      $("#wrap-fammembers").style.display = a.type === "family" ? "block" : "none";
    });
  }
  if (step === 2){
    ["fid","dl","nra","photo"].forEach(k => {
      const inp = $("#doc-" + k);
      inp.addEventListener("change", () => {
        if (inp.files && inp.files[0]){ a.docs[k] = {name: inp.files[0].name, size: inp.files[0].size}; const h = inp.closest(".field").querySelector(".hint"); if (h) h.innerHTML = h.innerHTML.split("<b")[0] + ` <b style="color:var(--green)">Attached: ${esc(a.docs[k].name)} (${Math.round(a.docs[k].size/1024)} KB)</b>`; }
        inp.closest(".field").classList.remove("invalid");
      });
    });
  }
  if (step === 3){
    const cv = $("#sig"), ctx = cv.getContext("2d");
    ctx.strokeStyle = "#141414"; ctx.lineWidth = 2; ctx.lineCap = "round";
    let drawing = false, signed = !!a.signature;
    if (a.signature){ const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = a.signature; }
    const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return {x: (t.clientX - r.left) * (cv.width / r.width), y: (t.clientY - r.top) * (cv.height / r.height)}; };
    const start = e => { e.preventDefault(); drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = e => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); signed = true; };
    const end = () => { drawing = false; if (signed) a.signature = cv.toDataURL(); };
    cv.addEventListener("pointerdown", start); cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", end); cv.addEventListener("pointerleave", end);
    $("#sig-clear").addEventListener("click", () => { ctx.clearRect(0, 0, cv.width, cv.height); signed = false; a.signature = ""; });
  }
  const collect = () => {
    if (step === 1){
      a.type = val("f-type"); a.familyCount = Math.max(2, parseInt(val("f-famcount") || "2", 10) || 2);
      a.familyMembers = val("f-fammembers");
      a.lastName = val("f-last"); a.firstName = val("f-first"); a.mi = val("f-mi");
      a.street = val("f-street"); a.city = val("f-city"); a.state = val("f-state"); a.zip = val("f-zip");
      a.dob = val("f-dob"); a.cellPhone = val("f-cell"); a.homePhone = val("f-home"); a.email = val("f-email");
      a.usCitizen = ($('input[name="f-cit"]:checked') || {}).value || "";
      a.sex = ($('input[name="f-sex"]:checked') || {}).value || "";
      a.occupation = val("f-occ"); a.emergency = val("f-emerg");
    }
    if (step === 2){
      a.nraMember = ($('input[name="f-nra"]:checked') || {}).value || "";
      a.nraNumber = val("f-nranum"); a.nraExpiry = val("f-nraexp");
      a.fid = val("f-fid"); a.dl = val("f-dl");
    }
    if (step === 3){
      a.q1 = ($('input[name="f-q1"]:checked') || {}).value || "";
      a.q2 = ($('input[name="f-q2"]:checked') || {}).value || "";
      a.agreeWaiver = $("#f-agree-waiver").checked; a.agreeRules = $("#f-agree-rules").checked;
      a.sigTyped = val("f-sigtyped");
    }
  };
  const formError = msg => {
    const d = $("#form-error");
    if (!msg){ if (d) d.style.display = "none"; return; }
    if (d){ d.textContent = msg; d.style.display = "block"; d.scrollIntoView({behavior: "smooth", block: "center"}); }
  };
  const valid = () => {
    let ok = true;
    formError(null);
    const need = (id, bad) => { markInvalid(id, bad); if (bad) ok = false; };
    if (step === 1){
      need("f-last", !a.lastName); need("f-first", !a.firstName);
      need("f-street", !a.street); need("f-city", !a.city); need("f-state", !a.state); need("f-zip", !a.zip);
      need("f-dob", !a.dob || ageOn(a.dob) < 18);
      need("f-cell", !a.cellPhone);
      need("f-email", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email));
      need("f-emerg", !a.emergency);
      const cit = document.querySelector('.field input[name="f-cit"]');
      if (a.usCitizen !== "Yes"){ ok = false; if (cit) cit.closest(".field").classList.add("invalid"); }
      else if (cit) cit.closest(".field").classList.remove("invalid");
    }
    if (step === 2){
      need("f-nranum", a.nraMember !== "Applied" && !a.nraNumber);
      need("f-nraexp", a.nraMember !== "Applied" && !a.nraExpiry);
      need("f-fid", !a.fid); need("f-dl", !a.dl);
      ["fid","dl","nra","photo"].forEach(k => {
        const inp = $("#doc-" + k);
        const bad = !a.docs[k];
        if (inp) inp.closest(".field").classList.toggle("invalid", bad);
        if (bad) ok = false;
      });
      if (!a.nraMember){ ok = false; formError("Please say whether you are an NRA member or have applied."); }
    }
    if (step === 3){
      if (!a.q1 || !a.q2){ ok = false; formError("Please answer both questions."); }
      if (!a.agreeWaiver || !a.agreeRules){ ok = false; formError("Please tick both agreement boxes — the waiver and the range rules."); }
      if (!a.signature){ ok = false; formError("Please sign in the signature box."); }
      need("f-sigtyped", !a.sigTyped);
    }
    return ok;
  };
  const back = $("#btn-back");
  if (back) back.addEventListener("click", () => { collect(); a.step--; render(); });
  const next = $("#btn-next");
  if (next) next.addEventListener("click", () => { collect(); if (valid()){ a.step++; render(); } else { window.scrollTo(0, 0); } });
  const reset = $("#btn-reset");
  if (reset) reset.addEventListener("click", () => { APPLY = freshApply(); render(); });
  const submit = $("#btn-submit");
  if (submit) submit.addEventListener("click", () => {
    const app = DB.addApplication({
      type: a.type, familyCount: a.familyCount, familyMembers: a.familyMembers.split("\n").map(s => s.trim()).filter(Boolean),
      firstName: a.firstName, lastName: a.lastName, mi: a.mi, dob: a.dob, sex: a.sex, usCitizen: a.usCitizen,
      street: a.street, city: a.city, state: a.state, zip: a.zip,
      homePhone: a.homePhone, cellPhone: a.cellPhone, email: a.email, occupation: a.occupation, emergency: a.emergency,
      nraMember: a.nraMember, nraNumber: a.nraNumber, nraExpiry: a.nraExpiry, fid: a.fid, dl: a.dl,
      q1: a.q1, q2: a.q2,
      docs: {fid: a.docs.fid && a.docs.fid.name, dl: a.docs.dl && a.docs.dl.name, nra: a.docs.nra && a.docs.nra.name, photo: a.docs.photo && a.docs.photo.name},
      signature: a.sigTyped
    });
    const dues = computeDues({type: a.type, isNew: true, date: todayISO(), familyCount: a.familyCount});
    sendEmail("application-received", a.email, "We received your Iron Horse membership application", {name: a.firstName + " " + a.lastName, appId: app.id});
    APPLY = null;
    el.innerHTML = `
    <section class="block"><div class="wrap" style="max-width:720px">
      <div class="notice green"><h3>Application submitted — ${esc(app.id)}</h3>
      <p style="margin-bottom:0">Thank you, ${esc(a.firstName)}. Your application is with the board. A confirmation email is on its way to <b>${esc(a.email)}</b> (in this preview, find it under <a href="#/emails">Emails</a>).</p></div>
      <h2>What happens next</h2>
      <div class="cards">
        <div class="card"><h3>1 · Board review</h3><p>Usually within a week. You will get an email with the decision.</p></div>
        <div class="card"><h3>2 · Pick orientation</h3><p>If approved, you choose a Saturday orientation slot by email link.</p></div>
        <div class="card"><h3>3 · Bring originals + payment</h3><p>Bring your original documents and <b>${money(dues.total)}</b> by check or cash. After orientation you get your badge.</p></div>
      </div>
      <div class="btn-row"><a class="btn" href="#/admin">See it in the admin queue →</a><button class="btn ghost" id="btn-again">Submit another application</button></div>
    </div></section>`;
    window.scrollTo(0, 0);
    $("#btn-again").addEventListener("click", () => { APPLY = null; location.hash = "#/apply"; render(); });
  });
});

/* ---------- admin ---------- */
let ADMIN_TAB = "apps";
let ADMIN_SEL = null;
route("admin", (el, params) => {
  if (params.tab) ADMIN_TAB = params.tab;
  if (params.app) ADMIN_SEL = params.app;
  const d = DB.load();
  const pending = d.applications.filter(a => a.status === "received").length;
  const overdue = d.members.filter(m => m.duesStatus === "overdue").length;
  const dueSoon = d.members.filter(m => m.duesStatus === "due").length;
  const paid2026 = d.payments.filter(p => p.year === 2026).reduce((s, p) => s + p.amount, 0);
  let body = "";
  if (ADMIN_TAB === "apps"){
    const rows = DB.listApplications().map(a => `
      <tr class="clickable" data-app="${a.id}">
        <td><b>${a.id}</b><br><span class="muted small">${fmtDate(a.submittedAt)}</span></td>
        <td>${esc(a.firstName)} ${esc(a.lastName)}<br><span class="muted small">${a.type === "family" ? "Family" : "Individual"} · ${esc(a.email)}</span></td>
        <td>${a.orientation ? fmtDate(a.orientation.date) + " " + esc(a.orientation.time) : "—"}</td>
        <td><span class="pill ${a.status}">${a.status}</span></td>
      </tr>`).join("");
    body = `<p class="muted">New applications land here the moment they are submitted. Approve, pick an orientation slot, then record payment and issue the badge — the paper form's “Official Use Only” box, digital.</p>
    <table><tr><th>Application</th><th>Applicant</th><th>Orientation</th><th>Status</th></tr>${rows}</table>
    <div id="app-detail"></div>`;
  }
  if (ADMIN_TAB === "members"){
    const rows = DB.listMembers().map(m => `
      <tr class="clickable" data-member="${m.id}">
        <td><b>${esc(m.name)}</b><br><span class="muted small">${m.role}${m.memberSince ? " · since " + m.memberSince : ""}</span></td>
        <td>${m.type === "family" ? "Family" : "Individual"}</td>
        <td>NRA exp. ${esc(m.nraExpiry)}</td>
        <td>Badge: ${esc(m.badge)} · Gate: ${esc(m.gateCard)}</td>
        <td><span class="pill ${m.duesStatus}">${m.duesStatus === "paid" ? "Paid " + m.duesYear : m.duesStatus === "due" ? "Dues due" : "Overdue"}</span></td>
      </tr>`).join("");
    body = `<p class="muted">One row per member: dues status, NRA expiry, badge and gate card. Renewal reminders go out automatically (see Emails).</p>
    <table><tr><th>Member</th><th>Type</th><th>NRA</th><th>Credentials</th><th>Dues ${new Date().getFullYear()}</th></tr>${rows}</table>
    <div id="member-detail"></div>`;
  }
  if (ADMIN_TAB === "dues"){
    const rows = DB.listPayments().map(p => `
      <tr><td><b>${p.id}</b><br><span class="muted small">${fmtDate(p.date)}</span></td><td>${esc(p.who)}</td><td>${p.year} · ${p.type}</td><td>${esc(p.method)}${p.checkNo ? " #" + esc(p.checkNo) : ""}<br><span class="muted small">by ${esc(p.receivedBy)}</span></td><td><b>${money(p.amount)}</b></td></tr>`).join("");
    body = `<p class="muted">Every dues payment the club has taken — check or cash, with the check number and who received it. This is the digital version of the paper form's payment box.</p>
    <div class="btn-row"><button class="btn" id="btn-remind">Send renewal reminders to due / overdue members</button><a class="btn ghost" href="#/pay">Record a payment →</a></div>
    <div id="remind-out"></div>
    <table><tr><th>Receipt</th><th>Member</th><th>Year</th><th>Method</th><th>Amount</th></tr>${rows}</table>`;
  }
  if (ADMIN_TAB === "emails"){
    const rows = DB.listEmails().map(e => `
      <tr><td><span class="muted small">${esc(e.sentAt)}</span></td><td>${esc(e.to)}</td><td>${esc(e.subject)}</td><td><span class="pill sent">${esc(e.status).split(" ")[0]}</span></td></tr>`).join("");
    body = `<p class="muted">Every email the system has sent — application confirmations, approvals, orientation invites, dues receipts, renewal reminders. <a href="#/emails">Open the email preview →</a></p>
    <table><tr><th>Sent</th><th>To</th><th>Subject</th><th>Status</th></tr>${rows}</table>`;
  }
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <p class="kicker">Board &amp; membership chair only</p>
    <h1>Membership admin</h1>
    <p class="muted">Sample data is labelled as such. In the live system this page is login-protected (board members only) and every action is written to the Supabase database.</p>
    <div class="stat-grid">
      <div class="stat"><b>${pending}</b><span>applications waiting</span></div>
      <div class="stat"><b>${d.members.length}</b><span>members</span></div>
      <div class="stat"><b>${dueSoon + overdue}</b><span>dues due / overdue</span></div>
      <div class="stat"><b>${money(paid2026)}</b><span>dues collected 2026 (sample)</span></div>
    </div>
    <div class="tabs">
      <button data-tab="apps" class="${ADMIN_TAB==="apps"?"on":""}">Applications (${pending} waiting)</button>
      <button data-tab="members" class="${ADMIN_TAB==="members"?"on":""}">Members</button>
      <button data-tab="dues" class="${ADMIN_TAB==="dues"?"on":""}">Dues &amp; payments</button>
      <button data-tab="emails" class="${ADMIN_TAB==="emails"?"on":""}">Email log</button>
      <button id="btn-reset-demo" style="margin-left:auto;color:var(--red)">Reset sample data</button>
    </div>
    ${body}
  </div></section>`;

  $$(".tabs button[data-tab]").forEach(b => b.addEventListener("click", () => { ADMIN_TAB = b.dataset.tab; ADMIN_SEL = null; render(); }));
  $("#btn-reset-demo").addEventListener("click", () => { if (confirm("Reset all sample data to the original?")){ DB.reset(); ADMIN_SEL = null; render(); } });
  if (ADMIN_TAB === "dues"){
    $("#btn-remind").addEventListener("click", () => {
      const year = new Date().getFullYear() + 1;
      const targets = DB.listMembers().filter(m => m.duesStatus !== "paid");
      targets.forEach(m => {
        const calc = computeDues({type: m.type, isNew: false, date: year + "-01-01", firstResponder: false});
        sendEmail(m.duesStatus === "overdue" ? "renewal-expired" : "renewal-30", m.email,
          m.duesStatus === "overdue" ? "Your " + (year - 1) + " dues are overdue" : "Your " + year + " dues are due soon",
          {name: m.name, year: m.duesStatus === "overdue" ? year - 1 : year, amount: calc.total});
      });
      $("#remind-out").innerHTML = `<div class="notice green"><h3>${targets.length} reminder${targets.length === 1 ? "" : "s"} sent</h3><p style="margin-bottom:0">Renewal emails went to ${targets.map(m => esc(m.name)).join(", ")}. See them in the <a href="#/emails">email preview</a>.</p></div>`;
    });
  }
  /* application rows */
  $$("tr[data-app]").forEach(tr => tr.addEventListener("click", () => { ADMIN_SEL = tr.dataset.app; showAppDetail(); }));
  $$("tr[data-member]").forEach(tr => tr.addEventListener("click", () => { ADMIN_SEL = tr.dataset.member; showMemberDetail(); }));
  if (ADMIN_SEL && ADMIN_TAB === "apps") showAppDetail();
  if (ADMIN_SEL && ADMIN_TAB === "members") showMemberDetail();

  function showAppDetail(){
    const a = DB.getApplication(ADMIN_SEL); if (!a) return;
    const host = $("#app-detail"); if (!host) return;
    const dues = computeDues({type: a.type, isNew: true, date: todayISO(), familyCount: (a.familyMembers || []).length + 1});
    const taken = DB.listApplications().filter(x => x.orientation && x.id !== a.id).map(x => x.orientation.date + "|" + x.orientation.time);
    const slots = nextSaturdays(4).map(d => SLOT_TIMES.map(t => {
      const isTaken = taken.includes(d + "|" + t);
      const sel = a.orientation && a.orientation.date === d && a.orientation.time === t;
      return `<div class="slot ${isTaken ? "taken" : ""} ${sel ? "sel" : ""}" data-date="${d}" data-time="${t}"><b>${fmtDate(d)}</b>${t}${isTaken ? " — taken" : ""}</div>`;
    }).join("")).join("");
    const docLine = (k, label) => `<dt>${label}</dt><dd>${a.docs && a.docs[k] ? "✓ " + esc(a.docs[k]) : "<span style='color:var(--red)'>Missing</span>"}</dd>`;
    host.innerHTML = `<div class="detail">
      <h3>${esc(a.firstName)} ${esc(a.lastName)} — ${a.id}</h3>
      <dl>
        <dt>Status</dt><dd><span class="pill ${a.status}">${a.status}</span> · submitted ${fmtDate(a.submittedAt)}</dd>
        <dt>Contact</dt><dd>${esc(a.cellPhone)} · ${esc(a.email)} · ${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}</dd>
        <dt>DOB / citizen</dt><dd>${esc(a.dob)} (age ${ageOn(a.dob)}) · U.S. citizen: ${esc(a.usCitizen)} · ${esc(a.sex)} · ${esc(a.occupation)}</dd>
        <dt>NRA</dt><dd>${a.nraMember === "Yes" ? "Member #" + esc(a.nraNumber) + ", expires " + esc(a.nraExpiry) : "Applied — in progress"}</dd>
        <dt>FID / license</dt><dd>${esc(a.fid)} / ${esc(a.dl)}</dd>
        <dt>Emergency contact</dt><dd>${esc(a.emergency)}</dd>
        ${docLine("fid", "FID copy")}${docLine("dl", "License copy")}${docLine("nra", "NRA card")}${docLine("photo", "ID photo")}
        <dt>Background Qs</dt><dd>Conviction: ${esc(a.q1)} · Permit refused/revoked: ${esc(a.q2)}</dd>
        <dt>Amount due</dt><dd><b>${money(dues.total)}</b> — check or cash at orientation</dd>
        ${a.notes ? `<dt>Notes</dt><dd>${esc(a.notes)}</dd>` : ""}
      </dl>
      ${a.status === "received" ? `<div class="btn-row">
          <button class="btn" id="btn-approve">Approve application</button>
          <button class="btn danger" id="btn-deny">Deny</button>
        </div>` : ""}
      ${a.status === "approved" || a.status === "oriented" ? `
        <h3 class="mt">Orientation slot</h3>
        <div class="slot-grid">${slots}</div>
        <p class="hint">Orientation is in person at the range, on a Saturday. Pick a slot — the applicant gets the invite email automatically.</p>
        <div class="btn-row">
          ${a.orientation ? `<button class="btn" id="btn-oriented">Mark orientation complete</button>` : ""}
          <a class="btn ghost" href="#/pay?app=${a.id}">Record payment (check / cash) →</a>
        </div>` : ""}
      ${a.status === "oriented" ? `
        <h3 class="mt">Issue credentials</h3>
        <p>After orientation: verify originals, record payment, then issue the badge, armband and gate card.</p>
        <div class="btn-row"><button class="btn" id="btn-activate">Issue badge &amp; activate membership</button></div>` : ""}
      ${a.status === "active" ? `<div class="notice green"><h3>Active member</h3><p style="margin-bottom:0">Badge, armband and gate card issued. The member can use the range when an RSO is on duty.</p></div>` : ""}
      ${a.status === "denied" ? `<div class="notice red"><h3>Denied</h3><p style="margin-bottom:0">${esc(a.notes || "No reason recorded.")} Any payment is refunded per the rule book.</p></div>` : ""}
    </div>`;
    host.scrollIntoView({behavior: "smooth", block: "nearest"});
    const ap = $("#btn-approve");
    if (ap) ap.addEventListener("click", () => {
      DB.updateApplication(a.id, {status: "approved"});
      sendEmail("application-approved", a.email, "Your Iron Horse application is approved — pick an orientation slot", {name: a.firstName + " " + a.lastName, appId: a.id, amountDue: dues.total});
      render();
    });
    const dn = $("#btn-deny");
    if (dn) dn.addEventListener("click", () => {
      const reason = prompt("Reason for denial (recorded on the application):", "");
      if (reason === null) return;
      DB.updateApplication(a.id, {status: "denied", notes: reason || "Denied by the board."});
      render();
    });
    $$(".slot:not(.taken)", host).forEach(s => s.addEventListener("click", () => {
      DB.updateApplication(a.id, {orientation: {date: s.dataset.date, time: s.dataset.time, by: "Dean"}});
      sendEmail("orientation-reminder", a.email, "Orientation reminder — " + fmtDate(s.dataset.date) + ", " + s.dataset.time, {name: a.firstName + " " + a.lastName, when: fmtDate(s.dataset.date) + " at " + s.dataset.time, amountDue: dues.total});
      render();
    }));
    const ob = $("#btn-oriented");
    if (ob) ob.addEventListener("click", () => { DB.updateApplication(a.id, {status: "oriented"}); render(); });
    const ac = $("#btn-activate");
    if (ac) ac.addEventListener("click", () => {
      DB.updateApplication(a.id, {status: "active"});
      const d = DB.load();
      const mid = "M-" + (100 + d.members.length + 1);
      DB.addMember({id: mid, name: a.firstName + " " + a.lastName, email: a.email, phone: a.cellPhone, type: a.type, memberSince: new Date().getFullYear(), duesYear: new Date().getFullYear(), duesStatus: "paid", duesPaid: dues.total, nraExpiry: a.nraExpiry, badge: "Issued", armband: "Issued", gateCard: "Issued", role: "Member"});
      sendEmail("newsletter", a.email, "Welcome to Iron Horse — your membership is active", {name: a.firstName, title: "welcome to the club", text: "Your orientation is complete and your badge is issued. The range is open when a volunteer RSO is on duty — check the calendar before you drive out. See you at the range."});
      render();
    });
  }
  function showMemberDetail(){
    const m = DB.getMember(ADMIN_SEL); if (!m) return;
    const host = $("#member-detail"); if (!host) return;
    const pays = DB.listPayments().filter(p => p.memberId === m.id);
    host.innerHTML = `<div class="detail">
      <h3>${esc(m.name)}</h3>
      <dl>
        <dt>Contact</dt><dd>${esc(m.phone)} · ${esc(m.email)}</dd>
        <dt>Member since</dt><dd>${m.memberSince} · ${m.type === "family" ? "Family" : "Individual"}</dd>
        <dt>Dues ${m.duesYear}</dt><dd><span class="pill ${m.duesStatus}">${m.duesStatus}</span> ${m.duesPaid ? "— paid " + money(m.duesPaid) : ""}</dd>
        <dt>NRA expiry</dt><dd>${esc(m.nraExpiry)}</dd>
        <dt>Credentials</dt><dd>Badge: ${esc(m.badge)} · Armband: ${esc(m.armband)} · Gate card: ${esc(m.gateCard)}</dd>
      </dl>
      <h3 class="mt">Payment history</h3>
      ${pays.length ? "<ul>" + pays.map(p => `<li>${fmtDate(p.date)} — ${money(p.amount)} by ${esc(p.method)}${p.checkNo ? " #" + esc(p.checkNo) : ""} (received by ${esc(p.receivedBy)}, receipt ${p.id})</li>`).join("") + "</ul>" : "<p class='muted'>No payments recorded yet.</p>"}
      <div class="btn-row">
        <a class="btn" href="#/pay?member=${m.id}">Record ${new Date().getFullYear() + 1} dues payment →</a>
        <button class="btn ghost" id="btn-nra-remind">Ask for updated NRA card</button>
      </div>
    </div>`;
    const nr = $("#btn-nra-remind");
    if (nr) nr.addEventListener("click", () => {
      sendEmail("newsletter", m.email, "Please send your updated NRA card", {name: m.name, title: "NRA card expiring", text: "Your NRA membership on file expires " + m.nraExpiry + ". Please send the membership chair a copy of your renewed card showing its new expiration date — continuous NRA membership is required to stay in good standing."});
      nr.textContent = "Reminder sent ✓"; nr.disabled = true;
    });
  }
});

/* ---------- dues & payment (check / cash — per the rule book) ---------- */
route("pay", (el, params) => {
  const d = DB.load();
  const app = params.app ? DB.getApplication(params.app) : null;
  const member = params.member ? DB.getMember(params.member) : null;
  const who = app ? app.firstName + " " + app.lastName : (member ? member.name : "");
  const isNew = !!app;
  const type = app ? app.type : (member ? member.type : "individual");
  const year = isNew ? new Date().getFullYear() : new Date().getFullYear() + 1;
  const calc = computeDues({type, isNew, date: todayISO(), familyCount: app ? (app.familyMembers || []).length + 1 : 2});
  const lines = calc.lines.map(l => `<div class="row"><span>${esc(l.label)}</span><span class="${l.amount < 0 ? "neg" : ""}">${money(l.amount)}</span></div>`).join("");
  el.innerHTML = `
  <section class="block"><div class="wrap" style="max-width:820px">
    <p class="kicker">Dues &amp; payment</p>
    <h1>What do I owe?</h1>
    <p class="muted">Dues follow the 2026–2027 rule book exactly. Membership year: January 1 – December 31.</p>

    <div class="field-row">
      <div class="field"><label>Who is this for?</label>
        <select id="pay-who">
          <option value="">— Pick an applicant or member —</option>
          ${d.applications.filter(a => a.status !== "denied").map(a => `<option value="app:${a.id}" ${app && app.id === a.id ? "selected" : ""}>${esc(a.firstName)} ${esc(a.lastName)} — new ${a.type} application ${a.id}</option>`).join("")}
          ${d.members.map(m => `<option value="member:${m.id}" ${member && member.id === m.id ? "selected" : ""}>${esc(m.name)} — ${m.type} member, ${m.duesStatus} for ${m.duesYear}</option>`).join("")}
        </select></div>
      <div class="field"><label>Membership type</label>
        <select id="pay-type"><option value="individual" ${type === "individual" ? "selected" : ""}>Individual — $225 / year</option><option value="family" ${type === "family" ? "selected" : ""}>Family — $325 / year</option></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>New member or renewal?</label>
        <select id="pay-kind"><option value="new" ${isNew ? "selected" : ""}>New member</option><option value="renewal" ${!isNew ? "selected" : ""}>Renewal</option></select></div>
      <div class="field"><label>Date (decides the July 4 discount)</label><input type="date" id="pay-date" value="${todayISO()}"></div>
    </div>
    <div class="field-row">
      <div class="field" id="wrap-fam" style="display:${type === "family" ? "block" : "none"}"><label>Family members applying (for the $25 fee each)</label><input type="number" id="pay-famcount" min="2" max="6" value="2"></div>
      <div class="field"><label class="checkline" style="margin-top:26px"><input type="checkbox" id="pay-fr" disabled><span>Active/retired first responder, military or veteran — $25 off (renewals only)</span></label></div>
    </div>

    <h2 class="mt">Amount due</h2>
    <div class="lines" id="pay-lines">${lines}<div class="row total"><span>Total</span><span>${money(calc.total)}</span></div></div>
    <p class="small muted">July 4 discount: new members joining after July 4 only. First-responder discount: renewals only. If an application is not approved, payment is refunded.</p>

    <div class="notice"><h3>How you pay — check or cash, in person</h3>
      <p>New members: bring <b id="pay-total-1">${money(calc.total)}</b> by check or cash to your orientation, with the originals of your documents. Renewals: pay the membership chair by check or cash, and bring a copy of your NRA card showing its expiration date.</p>
      <p style="margin-bottom:0">Make checks payable to <b>Iron Horse Gun &amp; Archery Club</b>. Your receipt is emailed to you and the payment is recorded against your membership.</p></div>

    <h2>Record a payment <span class="small muted">(board / membership chair)</span></h2>
    <p class="muted">This is the digital version of the paper form's “Payment $ / Check # / Received by” box. Fill it in when the check or cash is in hand.</p>
    <div id="pay-error" class="notice red" style="display:none"></div>
    <form id="pay-form" novalidate>
      <div class="field-row">
        <div class="field"><label>Method <span class="req">*</span></label>
          <div class="radio-row"><label><input type="radio" name="pay-method" value="Check" checked> Check</label><label><input type="radio" name="pay-method" value="Cash"> Cash</label></div></div>
        <div class="field"><label>Check # (if paying by check)</label><input type="text" id="pay-checkno" placeholder="e.g. 1842"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Amount received <span class="req">*</span></label><input type="text" id="pay-amount" value="${calc.total.toFixed(2)}"></div>
        <div class="field"><label>Received by <span class="req">*</span></label><input type="text" id="pay-by" placeholder="Board member name" value="Dean"></div>
      </div>
      <div class="btn-row"><button class="btn" id="btn-record-pay" type="submit">Record payment &amp; email receipt</button></div>
    </form>
    <div id="pay-done"></div>

    <div class="detail mt">
      <h3>Optional add-on — online card payments <span class="pill due">OFF BY DEFAULT · OWNER'S DECISION</span></h3>
      <p>The club's rules say check or cash, and this site keeps it that way. <b>Card payments are not part of this system.</b> If the owner ever wants them, that is a separate decision, because:</p>
      <ul>
        <li>Card processors charge roughly 2.9% + 30¢ per transaction — on $225 dues that's about $6.80 the club (or the member) absorbs.</li>
        <li>Major processors restrict firearms-related businesses. A gun club's dues are not a firearms sale, but accounts have been frozen or closed over category disputes — the club would need its bank/processor to confirm in writing before taking cards.</li>
        <li>Card payments split payment from the in-person orientation, which is where the club verifies originals and signatures. The refund rule ("payment will be refunded if not approved") is also harder with cards.</li>
      </ul>
      <p style="margin-bottom:0">If the owner says yes later, the same dues math plugs into Stripe Checkout with one extra screen — the schema already has a place for it (<code>dues_payments.method</code> accepts <code>card</code>). Nothing here takes a card today.</p>
    </div>
  </div></section>`;

  const recompute = () => {
    const t = $("#pay-type").value;
    const kind = $("#pay-kind").value;
    const isN = kind === "new";
    $("#pay-fr").disabled = isN;
    if (isN) $("#pay-fr").checked = false;
    $("#wrap-fam").style.display = t === "family" ? "block" : "none";
    const c = computeDues({type: t, isNew: isN, date: $("#pay-date").value || todayISO(), familyCount: parseInt($("#pay-famcount").value || "2", 10), firstResponder: $("#pay-fr").checked});
    $("#pay-lines").innerHTML = c.lines.map(l => `<div class="row"><span>${esc(l.label)}</span><span class="${l.amount < 0 ? "neg" : ""}">${money(l.amount)}</span></div>`).join("") + `<div class="row total"><span>Total</span><span>${money(c.total)}</span></div>`;
    $("#pay-total-1").textContent = money(c.total);
    $("#pay-amount").value = c.total.toFixed(2);
  };
  ["pay-type","pay-kind","pay-date","pay-famcount","pay-fr"].forEach(id => {
    const n = $("#" + id); if (n) n.addEventListener("change", recompute); if (n) n.addEventListener("input", recompute);
  });
  $("#pay-who").addEventListener("change", e => {
    const v = e.target.value;
    if (!v) return;
    const [kind, id] = v.split(":");
    location.hash = "#/pay?" + kind + "=" + id;
  });
  $("#pay-form").addEventListener("submit", e => {
    e.preventDefault();
    const method = ($('input[name="pay-method"]:checked') || {}).value || "Check";
    const checkNo = $("#pay-checkno").value.trim();
    const amount = parseFloat($("#pay-amount").value);
    const by = $("#pay-by").value.trim() || "Dean";
    const payError = msg => { const d = $("#pay-error"); if (d){ d.textContent = msg; d.style.display = "block"; } };
    if (!amount || amount <= 0){ payError("Enter the amount received."); return; }
    if (method === "Check" && !checkNo){ payError("Enter the check number — the paper form records it, and so does this."); return; }
    const p = DB.recordPayment({who: who || "Walk-in member", memberId: member ? member.id : null, year, type: $("#pay-type").value, method, checkNo, receivedBy: by, amount});
    if (member) DB.updateMember(member.id, {duesStatus: "paid", duesPaid: amount, duesYear: year});
    if (app){
      const em = app.email;
      sendEmail("dues-receipt", em, "Dues receipt — " + year, {name: app.firstName + " " + app.lastName, year, amount, method, checkNo, receivedBy: by, receipt: p.id});
    } else if (member){
      sendEmail("dues-receipt", member.email, "Dues receipt — " + year, {name: member.name, year, amount, method, checkNo, receivedBy: by, receipt: p.id});
    }
    $("#pay-done").innerHTML = `<div class="notice green"><h3>Payment recorded — receipt ${p.id}</h3>
      <p style="margin-bottom:0">${money(amount)} by ${esc(method)}${checkNo ? " (check #" + esc(checkNo) + ")" : ""}, received by ${esc(by)}. A receipt email was sent${app || member ? " to " + esc((app && app.email) || (member && member.email)) : ""} — see it in the <a href="#/emails">email preview</a>.</p></div>`;
    window.scrollTo(0, 0);
  });
});

/* ---------- emails ---------- */
let MAIL_SEL = null;
route("emails", (el) => {
  const list = DB.listEmails();
  if (!MAIL_SEL && list.length) MAIL_SEL = list[0].id;
  const sel = list.find(e => e.id === MAIL_SEL) || list[0];
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <p class="kicker">Member emails</p>
    <h1>The emails members would get</h1>
    <p class="muted">In the live system these go out automatically through Resend, from the club's own domain. In this preview they are written to the email log and shown here — nothing is actually sent.</p>
    <div class="mail">
      <div class="mail-list">
        ${list.map(e => `<div class="mail-item ${sel && e.id === sel.id ? "on" : ""}" data-mail="${e.id}"><b>${esc(e.subject)}</b><span>To ${esc(e.to)} · ${esc(e.sentAt)}</span></div>`).join("") || "<p class='muted' style='padding:14px'>No emails yet.</p>"}
      </div>
      <div class="mail-body">${sel ? `<div class="m-head"><b>${esc(sel.subject)}</b><br><span class="muted small">To: ${esc(sel.to)} · ${esc(sel.sentAt)} · Template: ${esc(sel.template)} · Status: ${esc(sel.status)}</span></div>${sel.body || ""}` : "<p class='muted'>Pick an email.</p>"}</div>
    </div>
    <h2 class="mt">What sends automatically</h2>
    <div class="cards">
      <div class="card"><h3>Application received</h3><p>Instantly, when an application is submitted — with the application number and what happens next.</p></div>
      <div class="card"><h3>Approved + orientation invite</h3><p>When the board approves — with the amount due and what to bring.</p></div>
      <div class="card"><h3>Orientation reminder</h3><p>When a slot is picked, and again the day before.</p></div>
      <div class="card"><h3>Dues receipt</h3><p>When a check/cash payment is recorded — amount, method, check #, receipt #.</p></div>
      <div class="card"><h3>Renewal reminders</h3><p>30 days before, 7 days before, and when overdue. Membership year is Jan 1 – Dec 31.</p></div>
      <div class="card"><h3>Gate code</h3><p>After the RSO safety observation is approved — the code goes by email, never posted publicly.</p></div>
    </div>
  </div></section>`;
  $$(".mail-item").forEach(i => i.addEventListener("click", () => { MAIL_SEL = i.dataset.mail; render(); }));
});

/* ---------- init ---------- */
render();

/* ---------- mobile menu ---------- */
(function(){
  const btn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  if (!btn || !nav) return;
  const close = () => { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  window.addEventListener("hashchange", close);
})();
