import puppeteer from "puppeteer-core";
import Stripe from "stripe";
import { readFileSync } from "node:fs";
const env=Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const stripe=new Stripe(env.STRIPE_SECRET_KEY); const BASE="http://localhost:3456";
const OWNER=env.NEXT_PUBLIC_STYLIST_ID||"11111111-1111-1111-1111-111111111111";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); let pass=0,fail=0;const F=[];
const ok=(n,c,d="")=>{c?(pass++,console.log("  ✓ "+n)):(fail++,F.push(n),console.log("  ✗ "+n+"  "+d));};
const salonDay=(o=0)=>{const t=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"}));t.setDate(t.getDate()+o);return t.toLocaleDateString("en-CA");};

// Resolve a real standard service + variant from the live grouped catalog.
const cat=await(await fetch(`${BASE}/api/catalog?stylistId=${OWNER}`)).json();
const stdGroup=(cat.groups||[]).find(g=>g.slug==="adult-braids")||(cat.groups||[]).find(g=>g.kind==="standard");
const SVC=(stdGroup?.services||[]).find(s=>/box braids/i.test(s.name))||(stdGroup?.services||[])[0];
const VAR=(SVC?.variants||[]).find(v=>!v.price_from)||(SVC?.variants||[])[0];
if(!VAR){console.error("no catalog variant");process.exit(2);}
const PRICE=VAR.price_cents, MIN=VAR.duration_minutes||SVC.duration_minutes, BAL=PRICE-5000;
console.log(`catalog: "${SVC.name} / ${VAR.label}" $${PRICE/100} (${MIN}m) balance $${BAL/100}`);

async function firstSlot(date){const a=await(await fetch(`${BASE}/api/availability?date=${date}&serviceId=${SVC.id}&variantId=${VAR.id}&minutes=${MIN}`)).json();return(a.slots||[])[0];}
async function book(email,date,start){
  if(!start) start=await firstSlot(date);
  if(!start) return {error:"no open slot"};
  const h=await(await fetch(`${BASE}/api/bookings/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId:SVC.id,variantId:VAR.id,tierId:null,addonIds:[],date,startTime:start,clientName:"Feat "+email.split("@")[0],clientEmail:email,clientPhone:"+15551111",notes:"",intake:[],inspirationPhotos:[],policyConsented:true})})).json();
  if(!h.paymentIntentId)return{error:h.error};
  await stripe.paymentIntents.confirm(h.paymentIntentId,{payment_method:"pm_card_visa",return_url:BASE});
  const c=await(await fetch(`${BASE}/api/bookings/confirm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentIntentId:h.paymentIntentId})})).json();
  return{id:c.appointmentId,start,amounts:h.amounts};
}
const b=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",headless:"new",args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]});
const p=(await b.pages())[0]; await p.goto(`${BASE}/admin`,{waitUntil:"domcontentloaded"}); await sleep(1000);
if(await p.$('input[type=email]')){await p.type('input[type=email]',"queengbraids@gmail.com");await p.type('input[type=password]',"QueenG!admin2026");await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Sign in")?.click());await sleep(2500);}
const af=(path,init)=>p.evaluate(async(path,init)=>{const r=await fetch(path,init);let j=null;try{j=await r.json()}catch{}return{status:r.status,json:j};},path,init);

console.log("\n[A] Pay balance + tip");
const bk=await book("feat_bal@example.com",salonDay(20));
ok("balance booking created",!!bk.id,JSON.stringify(bk).slice(0,140));
await af("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.id,action:"confirm"})});
const prev=await af(`/api/admin/charge-balance?appointmentId=${bk.id}`);
ok(`balance preview (balance $${BAL/100}, card on file, unpaid)`,prev.json&&prev.json.balanceCents===BAL&&prev.json.hasCard&&!prev.json.alreadyPaid,JSON.stringify(prev.json));
const ch=await af("/api/admin/charge-balance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.id,tipCents:1000})});
ok(`charge balance+$10 tip = $${(BAL+1000)/100} (succeeded)`,ch.json&&ch.json.ok&&ch.json.chargedCents===BAL+1000&&ch.json.status==="succeeded",JSON.stringify(ch.json));
const ch2=await af("/api/admin/charge-balance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.id,tipCents:0})});
ok("second balance charge blocked (409)",ch2.status===409,`status=${ch2.status}`);

console.log("\n[B] Recurring appointments");
const recSlot=await firstSlot(salonDay(25));
const rec=await af("/api/admin/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientName:"Recur Client",clientEmail:"feat_recur@example.com",serviceId:SVC.id,date:salonDay(25),startTime:recSlot,status:"confirmed",depositPaidCents:0,recurrence:{everyWeeks:1,count:3}})});
ok("recurring created 3 sessions",rec.json&&rec.json.created===3,JSON.stringify(rec.json));

console.log("\n[C] Waitlist auto-notify on cancel");
const wlDate=salonDay(30);
const bk2=await book("feat_hold@example.com",wlDate); // occupies a slot on wlDate
ok("waitlist seed booking created",!!bk2.id,JSON.stringify(bk2).slice(0,140));
await fetch(`${BASE}/api/waitlist`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId:SVC.id,clientName:"WL Person",clientEmail:"feat_wl@example.com",clientPhone:"+15552222",desiredDate:wlDate,flexibility:"plus_minus_3"})});
await af("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk2.id,action:"cancel"})});
await sleep(800);
const wl=await af("/api/admin/waitlist");
const notified=(wl.json?.entries||[]).find(e=>e.client_email==="feat_wl@example.com");
ok("waitlist entry auto-notified after cancel",notified&&notified.status==="notified",JSON.stringify(notified?.status));

console.log("\n[D] CSV export");
const csv=await p.evaluate(async()=>{const r=await fetch("/api/admin/export");return{status:r.status,text:(await r.text()).slice(0,60)};});
ok("CSV export 200 + header",csv.status===200&&csv.text.startsWith("Date,Time,Status,Service,Client"),csv.text);

console.log("\n[E] Admin image upload");
const up=await p.evaluate(async()=>{const png=Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),c=>c.charCodeAt(0));const fd=new FormData();fd.append("file",new Blob([png],{type:"image/png"}),"t.png");const r=await fetch("/api/admin/upload",{method:"POST",body:fd});return await r.json();});
ok("upload returns a public URL",Boolean(up.url&&up.url.includes("/gallery/")),JSON.stringify(up));

await b.close();
console.log(`\n==== FEATURES E2E: ${pass} passed, ${fail} failed ====`);
if(fail)console.log("FAILED:",F.join(", "));
process.exit(fail?1:0);
