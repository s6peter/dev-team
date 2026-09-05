import puppeteer from "puppeteer-core";
import Stripe from "stripe";
import { readFileSync } from "node:fs";
const env=Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const stripe=new Stripe(env.STRIPE_SECRET_KEY); const BASE="http://localhost:3456"; const SVC="22222222-0000-0000-0000-000000000003"; // cornrows
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); let pass=0,fail=0;const F=[];
const ok=(n,c,d="")=>{c?(pass++,console.log("  ✓ "+n)):(fail++,F.push(n),console.log("  ✗ "+n+"  "+d));};
const salonDay=(o=0)=>{const t=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"}));t.setDate(t.getDate()+o);return t.toLocaleDateString("en-CA");};
async function book(email,date,start){const h=await(await fetch(`${BASE}/api/bookings/hold`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId:SVC,tierId:null,addonIds:[],date,startTime:start,clientName:"Feat "+email.split("@")[0],clientEmail:email,clientPhone:"+15551111",notes:"",intake:[],inspirationPhotos:[],policyConsented:true})})).json();if(!h.paymentIntentId)return{error:h.error};await stripe.paymentIntents.confirm(h.paymentIntentId,{payment_method:"pm_card_visa",return_url:BASE});const c=await(await fetch(`${BASE}/api/bookings/confirm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentIntentId:h.paymentIntentId})})).json();return{id:c.appointmentId,amounts:h.amounts};}
const b=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",headless:"new",args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]});
const p=(await b.pages())[0]; await p.goto(`${BASE}/admin`,{waitUntil:"domcontentloaded"}); await sleep(1000);
if(await p.$('input[type=email]')){await p.type('input[type=email]',"queengbraids@gmail.com");await p.type('input[type=password]',"QueenG!admin2026");await p.evaluate(()=>[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="Sign in")?.click());await sleep(2500);}
const af=(path,init)=>p.evaluate(async(path,init)=>{const r=await fetch(path,init);let j=null;try{j=await r.json()}catch{}return{status:r.status,json:j};},path,init);

console.log("\n[A] Pay balance + tip");
const bk=await book("feat_bal@example.com",salonDay(10),"09:00");
await af("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.id,action:"confirm"})});
const prev=await af(`/api/admin/charge-balance?appointmentId=${bk.id}`);
ok("balance preview (balance $40, card on file, unpaid)",prev.json&&prev.json.balanceCents===4000&&prev.json.hasCard&&!prev.json.alreadyPaid,JSON.stringify(prev.json));
const ch=await af("/api/admin/charge-balance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.id,tipCents:1000})});
ok("charge balance+$10 tip = $50 (succeeded)",ch.json&&ch.json.ok&&ch.json.chargedCents===5000&&ch.json.status==="succeeded",JSON.stringify(ch.json));
const ch2=await af("/api/admin/charge-balance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appointmentId:bk.id,tipCents:0})});
ok("second balance charge blocked (409)",ch2.status===409,`status=${ch2.status}`);

console.log("\n[B] Recurring appointments");
const rec=await af("/api/admin/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientName:"Recur Client",clientEmail:"feat_recur@example.com",serviceId:SVC,date:salonDay(11),startTime:"09:00",status:"confirmed",depositPaidCents:0,recurrence:{everyWeeks:1,count:3}})});
ok("recurring created 3 sessions",rec.json&&rec.json.created===3,JSON.stringify(rec.json));

console.log("\n[C] Waitlist auto-notify on cancel");
const wlDate=salonDay(12);
const bk2=await book("feat_hold@example.com",wlDate,"09:00"); // occupies the slot
await fetch(`${BASE}/api/waitlist`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId:SVC,clientName:"WL Person",clientEmail:"feat_wl@example.com",clientPhone:"+15552222",desiredDate:wlDate,flexibility:"plus_minus_3"})});
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
