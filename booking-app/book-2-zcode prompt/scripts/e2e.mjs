// Reproducible e2e harness: money + booking paths, incl. the judge-flagged fixes.
//   node scripts/e2e.mjs      (requires dev server on :3456 + local Supabase + Stripe test)
// v3: money paths driven by the LIVE grouped catalog (real variant ids), not old tier ids.
import puppeteer from "puppeteer-core";
import Stripe from "stripe";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const BASE = "http://localhost:3456";
const OWNER = env.NEXT_PUBLIC_STYLIST_ID || "11111111-1111-1111-1111-111111111111";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
let pass=0, fail=0; const fails=[];
const ok=(name,cond,detail="")=>{ if(cond){pass++;console.log(`  ✓ ${name}`);} else {fail++;fails.push(name);console.log(`  ✗ ${name}  ${detail}`);} };

const salonDay = (offset=0)=>{ const t=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"})); t.setDate(t.getDate()+offset); return t.toLocaleDateString("en-CA"); };

// ── Resolve real variants from the live grouped catalog ──────────────────────
const cat = await (await fetch(`${BASE}/api/catalog?stylistId=${OWNER}`)).json();
const groups = cat.groups || [];
const findGroup = (pred)=> groups.find(pred);
const stdGroup = findGroup(g=>g.slug==="adult-braids") || findGroup(g=>g.kind==="standard");
const stdSvc = (stdGroup?.services||[]).find(s=>/box braids/i.test(s.name)) || (stdGroup?.services||[])[0];
const stdVar = (stdSvc?.variants||[]).find(v=>!v.price_from) || (stdSvc?.variants||[])[0];
const customGroup = findGroup(g=>g.kind==="custom");
const customSvc = (customGroup?.services||[])[0];
const customVar = (customSvc?.variants||[])[0];
if(!stdVar || !customVar){ console.error("Could not resolve catalog variants", {stdSvc:stdSvc?.name, customSvc:customSvc?.name}); process.exit(2); }
const STD_PRICE = stdVar.price_cents;                 // service total for the standard variant
const STD_MIN = stdVar.duration_minutes || stdSvc.duration_minutes;
const DEPOSIT = cat.policy?.deposit_cents ?? stdSvc.deposit_flat_cents ?? 5000;   // configurable deposit
const TAX = Math.round(DEPOSIT * (stdSvc.tax_rate ?? 0.0825));                      // tax on deposit only
const CHARGED = DEPOSIT + TAX;
console.log(`catalog: standard "${stdSvc.name} / ${stdVar.label}" $${STD_PRICE/100} (${STD_MIN}m)  |  custom "${customSvc.name} / ${customVar.label}"`);

// First actually-open slot for a variant on a date (robust against foreign holds).
async function firstSlot(serviceId, variantId, date, minutes){
  const a = await (await fetch(`${BASE}/api/availability?date=${date}&serviceId=${serviceId}&variantId=${variantId}&minutes=${minutes}`)).json();
  return (a.slots||[])[0];
}

// ── Book a deposit appointment via hold → Stripe confirm → confirm ───────────
const addDaysStr=(dateStr,n)=>{const t=new Date(`${dateStr}T00:00:00Z`);t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
// start may be null → scan forward from `date` for the first day that has a real
// open slot for this variant (handles long services that don't fit short-hours days).
async function bookDeposit(email, serviceId, variantId, date, start, photos=[], minutes){
  let bookDate=date, slot=start;
  if(!slot){
    for(let i=0;i<14 && !slot;i++){ const d=addDaysStr(date,i); const s=await firstSlot(serviceId, variantId, d, minutes ?? STD_MIN); if(s){ bookDate=d; slot=s; } }
  }
  if(!slot) return { error:"no open slot", hold:{} };
  const hold = await (await fetch(`${BASE}/api/bookings/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId,variantId,tierId:null,addonIds:[],date:bookDate,startTime:slot,clientName:"E2E "+email.split("@")[0],clientEmail:email,clientPhone:"+15551234567",notes:"",intake:[],inspirationPhotos:photos,policyConsented:true})})).json();
  if(!hold.paymentIntentId) return { error: hold.error||"hold failed", hold };
  await stripe.paymentIntents.confirm(hold.paymentIntentId,{payment_method:"pm_card_visa",return_url:BASE});
  const conf = await (await fetch(`${BASE}/api/bookings/confirm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentIntentId:hold.paymentIntentId})})).json();
  return { appointmentId: conf.appointmentId, amounts: hold.amounts };
}

const b = await puppeteer.launch({executablePath:"/usr/bin/google-chrome",headless:"new",args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]});
const p = (await b.pages())[0];
// admin login (for authed admin API calls via page context)
await p.goto(`${BASE}/admin`,{waitUntil:"domcontentloaded"}); await sleep(1000);
if(await p.$('input[type=email]')){ await p.type('input[type=email]',"queengbraids@gmail.com"); await p.type('input[type=password]',"QueenG!admin2026"); await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Sign in")?.click()); await sleep(2500); }
const adminFetch = (path, init) => p.evaluate(async (path, init) => { const r = await fetch(path, init); let j=null; try{j=await r.json()}catch{} return { status:r.status, json:j }; }, path, init);
const adminOk = (await adminFetch("/api/admin/appointments")).status === 200;
ok("admin session established", adminOk);

console.log("\n[1] Booking + card-on-file (standard variant, money from the variant)");
const bk = await bookDeposit("e2e_card@example.com", stdSvc.id, stdVar.id, salonDay(6), null);
ok("deposit booking created", !!bk.appointmentId, JSON.stringify(bk).slice(0,160));
ok(`amounts: $${DEPOSIT/100} flat deposit, tax-on-deposit only ($${(TAX/100).toFixed(2)}), balance = price-deposit ($${(STD_PRICE-DEPOSIT)/100})`,
   bk.amounts && bk.amounts.depositCents===DEPOSIT && bk.amounts.taxCents===TAX && bk.amounts.serviceTotalCents===STD_PRICE && bk.amounts.balanceDueCents===STD_PRICE-DEPOSIT && bk.amounts.chargedNowCents===CHARGED,
   JSON.stringify(bk.amounts));

console.log("\n[1b] Custom group: deposit-only (balance 0), inspiration photo attached");
const bkC = await bookDeposit("e2e_custom@example.com", customSvc.id, customVar.id, salonDay(10), null, ["https://example.com/inspo.jpg"], customVar.duration_minutes||customSvc.duration_minutes);
ok("custom booking created", !!bkC.appointmentId, JSON.stringify(bkC).slice(0,160));
ok(`custom: $${DEPOSIT/100} deposit, tax $${(TAX/100).toFixed(2)}, balance 0 (deposit-only)`,
   bkC.amounts && bkC.amounts.depositCents===DEPOSIT && bkC.amounts.taxCents===TAX && bkC.amounts.balanceDueCents===0 && bkC.amounts.chargedNowCents===CHARGED,
   JSON.stringify(bkC.amounts));

console.log("\n[2] No-show fee: deposit-netting + idempotency guard");
await adminFetch("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.appointmentId,action:"confirm"})});
const preview = await adminFetch(`/api/admin/fees?appointmentId=${bk.appointmentId}&kind=no_show`);
ok(`fee preview nets deposit (gross $${STD_PRICE/100} - $${DEPOSIT/100} = $${(STD_PRICE-DEPOSIT)/100})`,
   preview.json && preview.json.grossCents===STD_PRICE && preview.json.depositHeldCents===DEPOSIT && preview.json.feeCents===STD_PRICE-DEPOSIT,
   JSON.stringify(preview.json));
const charge1 = await adminFetch("/api/admin/fees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.appointmentId,kind:"no_show"})});
ok("fee charged once (succeeded)", charge1.json && charge1.json.ok && charge1.json.status==="succeeded", JSON.stringify(charge1.json));
const charge2 = await adminFetch("/api/admin/fees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.appointmentId,kind:"no_show"})});
ok("second fee blocked (no double-charge)", charge2.status===409, `status=${charge2.status} ${JSON.stringify(charge2.json)}`);

console.log("\n[3] Reschedule: server-side availability re-validation (variant-duration aware)");
const bk2 = await bookDeposit("e2e_resch@example.com", stdSvc.id, stdVar.id, salonDay(7), null);
ok("reschedule seed booking created", !!bk2.appointmentId, JSON.stringify(bk2).slice(0,160));
await adminFetch("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk2.appointmentId,action:"confirm"})});
const badMove = await adminFetch("/api/admin/appointments",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk2.appointmentId,date:salonDay(8),startTime:"03:00"})}); // 3am = outside hours
ok("reschedule to out-of-hours 03:00 rejected (409)", badMove.status===409, `status=${badMove.status} ${JSON.stringify(badMove.json)}`);
// Scan forward for a day that actually has an open slot for this variant
// (skips closed days like non-open weekdays and days already full of real bookings).
let moveDate=null, validSlot=null;
for(let d=8; d<=21 && !validSlot; d++){
  const dt=salonDay(d);
  const s=await firstSlot(stdSvc.id, stdVar.id, dt, STD_MIN);
  if(s){ moveDate=dt; validSlot=s; }
}
const goodMove = await adminFetch("/api/admin/appointments",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk2.appointmentId,date:moveDate,startTime:validSlot})});
ok(`reschedule to a real open slot (${moveDate} ${validSlot}) accepted (200)`, goodMove.status===200, `status=${goodMove.status} date=${moveDate} slot=${validSlot} ${JSON.stringify(goodMove.json)}`);

console.log("\n[4] Decline -> auto-refund");
const bk3 = await bookDeposit("e2e_decline@example.com", stdSvc.id, stdVar.id, salonDay(9), null);
const decline = await adminFetch("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk3.appointmentId,action:"decline"})});
ok("decline returns refunded:true", decline.json && decline.json.refunded===true, JSON.stringify(decline.json));

console.log("\n[5] .ics calendar invite");
const icsBad = await (await fetch(`${BASE}/api/ics/00000000-0000-0000-0000-000000000000`)).status;
ok(".ics route responds (404 for unknown token)", icsBad===404, `status=${icsBad}`);

console.log("\n[6] Cron reminders idempotency");
const c1 = await (await fetch(`${BASE}/api/cron/reminders`,{method:"POST",headers:{Authorization:`Bearer ${env.CRON_SECRET}`}})).json();
const c2 = await (await fetch(`${BASE}/api/cron/reminders`,{method:"POST",headers:{Authorization:`Bearer ${env.CRON_SECRET}`}})).json();
ok("cron 2nd run sends no duplicate 24h reminders", c2 && c2.sent24h===0, JSON.stringify(c2));
const cNoAuth = await (await fetch(`${BASE}/api/cron/reminders`,{method:"POST"})).status;
ok("cron rejects without secret (401)", cNoAuth===401, `status=${cNoAuth}`);

await b.close();
console.log(`\n==== E2E RESULT: ${pass} passed, ${fail} failed ====`);
if(fail) console.log("FAILED:", fails.join(", "));
process.exit(fail? 1 : 0);
