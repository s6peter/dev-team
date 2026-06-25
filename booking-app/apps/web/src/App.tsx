import { PaymentElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CalendarDays, Check, Clock, CreditCard, Image, LayoutDashboard, LogOut, MapPin, Phone, Scissors, Settings, Sparkles, Star, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, Booking, formatDateTime, formatMoney, Service, Staff, token } from "./lib/api";

type User = { id: string; email: string; role: "ADMIN" | "STAFF" | "CUSTOMER"; firstName: string };
type PaymentIntentResponse = { paymentIntentId: string; clientSecret: string; provider: "stripe" | "mock"; amount: string; depositAmount: string; taxAmount: string };
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;
function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loader().then((value) => alive && setData(value)).catch((err) => alive && setError(err.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, deps);
  return { data, error, loading, setData };
}

function Shell({ children }: { children: React.ReactNode }) {
  const isLoggedIn = Boolean(token());
  return (
    <div>
      <header className="border-b border-pink/30 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-3 text-lg font-black">
            <img src="/brand/queeng-logo.png" alt="QueenG Braids logo" className="h-11 w-11 rounded-full border border-ink object-cover" />
            <span>QueenG Braids</span>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="btn-secondary" to="/book">Book</Link>
            <Link className="btn-secondary" to="/login">Login</Link>
            <Link className="btn-secondary" to={isLoggedIn ? "/admin/dashboard" : "/login"}>Admin</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  return token() ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const nav = [
    ["/admin/dashboard", LayoutDashboard, "Dashboard"],
    ["/admin/calendar", CalendarDays, "Calendar"],
    ["/admin/bookings", Clock, "Bookings"],
    ["/admin/waitlist", Users, "Waitlist"],
    ["/admin/services", Scissors, "Services"],
    ["/admin/customers", Users, "Customers"],
    ["/admin/availability", CalendarDays, "Availability"],
    ["/admin/settings", Settings, "Settings"]
  ] as const;
  return (
    <Shell>
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="card h-fit space-y-2">
          {nav.map(([href, Icon, label]) => <Link key={href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-blush" to={href}><Icon size={16} /> {label}</Link>)}
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-blush" onClick={() => { localStorage.clear(); location.href = "/login"; }}><LogOut size={16} /> Logout</button>
        </aside>
        <section>{children}</section>
      </div>
    </Shell>
  );
}

function statusClass(status: string) {
  return status === "CONFIRMED" ? "bg-success/15 text-success" : status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-pink/20 text-ink";
}

const homeTabs = ["Home", "Our Services", "Testimonials", "Gallery", "Salon Policies", "Contact Us"] as const;

const featuredServices = ["Tree Braids", "Knotless Braids", "Box Braids", "Senegalese Twist"];
const sizeOrder = ["Large", "Medium", "Small", "Extra Small"];
const lengthOrder = ["Shoulder length", "Midback length", "Waist length", "Butt length"];

function serviceCategoryLabel(category: string) {
  if (category === "Braids") return "Braids";
  if (category === "Twists") return "Twists";
  if (category === "Kids") return "Kids";
  if (category === "Men") return "Men";
  if (category === "Locs" || category === "Wigs") return "Locs & Wigs";
  return "Other Services";
}

function serviceGroupName(service: Service) {
  return service.groupName || service.name;
}

function serviceOptionName(service: Service) {
  return service.optionName || service.name;
}

function orderedValues(values: Array<string | null | undefined>, order: string[]) {
  const set = new Set(values.filter(Boolean) as string[]);
  return order.filter((value) => set.has(value));
}

function Home() {
  const [activeTab, setActiveTab] = useState<(typeof homeTabs)[number]>("Home");
  const renderTab = () => {
    switch (activeTab) {
      case "Our Services":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            {["Braids", "Twists", "Kids Styles", "Men's Braids", "Locs & Wigs", "Other Services"].map((item) => (
              <div className="rounded-lg border border-pink/30 bg-white p-5" key={item}>
                <Scissors className="mb-3 text-hotpink" size={22} />
                <h3 className="text-lg font-black">{item}</h3>
                <p className="mt-2 text-sm text-stone-600">Browse pricing, deposit details, duration, and booking policy before choosing your appointment time.</p>
              </div>
            ))}
          </div>
        );
      case "Testimonials":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            {["My parts were so clean and the vibe was luxury.", "Booking was easy, and I loved seeing the deposit up front.", "QueenG made my daughter feel comfortable the whole time."].map((quote) => (
              <blockquote className="rounded-lg border border-pink/30 bg-white p-5" key={quote}>
                <div className="mb-3 flex gap-1 text-hotpink">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill="currentColor" />)}</div>
                <p className="font-semibold">"{quote}"</p>
              </blockquote>
            ))}
          </div>
        );
      case "Gallery":
        return (
          <div className="grid gap-4 md:grid-cols-[1.4fr_.6fr]">
            <img alt="QueenG salon gallery" className="h-80 w-full rounded-lg border border-pink/30 object-cover" src="/brand/queeng-salon-concept.png" />
            <div className="grid gap-4">
              <div className="rounded-lg bg-ink p-5 text-white"><Image className="mb-3 text-pink" /><p className="font-black">Black, pink, polished.</p><p className="mt-2 text-sm text-pink/80">A photo-ready space for braids, confidence, and QueenG energy.</p></div>
              <div className="rounded-lg border border-pink/30 bg-white p-5"><Sparkles className="mb-3 text-hotpink" /><p className="font-black">More style photos can be added here as your portfolio grows.</p></div>
            </div>
          </div>
        );
      case "Salon Policies":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card"><h3 className="font-black">Deposit Required</h3><p className="mt-2 text-sm text-stone-600">Appointments are confirmed after the required non-refundable deposit is paid.</p></div>
            <div className="card"><h3 className="font-black">Hair Prep</h3><p className="mt-2 text-sm text-stone-600">Please arrive detangled and ready for service. Some styles require customer-provided hair.</p></div>
            <div className="card"><h3 className="font-black">Cancel or Reschedule</h3><p className="mt-2 text-sm text-stone-600">Customers may cancel or reschedule before the policy cutoff. Admin can always adjust bookings.</p></div>
          </div>
        );
      case "Contact Us":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card"><Phone className="mb-3 text-hotpink" /><h3 className="font-black">Contact QueenG Braids</h3><p className="mt-2 text-stone-600">Call or text: 555-0199</p><p className="text-stone-600">Email: hello@queengbraids.test</p></div>
            <div className="card"><MapPin className="mb-3 text-hotpink" /><h3 className="font-black">Salon Address</h3><p className="mt-2 text-stone-600">123 QueenG Way, Chicago, IL</p><p className="text-sm text-stone-600">Address can be updated in admin settings.</p></div>
          </div>
        );
      default:
        return (
          <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-5">
              <img src="/brand/queeng-logo.png" alt="QueenG Braids logo" className="h-24 w-24 rounded-full border-4 border-ink object-cover shadow-sm" />
              <p className="text-sm font-bold uppercase tracking-wide text-hotpink">Where braids tell a story</p>
              <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">QueenG Braids</h1>
              <p className="max-w-xl text-lg text-stone-700">Book luxury braid styles, pay your deposit, and step into a black and pink salon experience made for beauty, comfort, and confidence.</p>
              <Link className="inline-flex rounded-lg bg-hotpink px-8 py-4 text-lg font-black uppercase text-white shadow-lg shadow-pink/30 transition hover:bg-ink" to="/book/services">Book Now</Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-pink/40 bg-white">
              <img alt="QueenG Braids salon concept" className="h-full min-h-80 w-full object-cover" src="/brand/queeng-salon-concept.png" />
            </div>
          </div>
        );
    }
  };

  return (
    <Shell>
      <section className="space-y-6">
        <div className="overflow-x-auto border-b border-pink/30 bg-white">
          <div className="flex min-w-max justify-center gap-2 px-2 py-3">
            {homeTabs.map((tab) => (
              <button
                className={`rounded-md px-4 py-2 text-xs font-black uppercase tracking-wide ${activeTab === tab ? "bg-ink text-white" : "text-ink hover:bg-blush"}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {renderTab()}
      </section>
    </Shell>
  );
}

function BookingFlow() {
  const { data: services, loading } = useAsync<Service[]>(() => api("/services"));
  const { data: staff } = useAsync<Staff[]>(() => api("/staff"));
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedLength, setSelectedLength] = useState("");
  const [cardHeldForNoShow, setCardHeldForNoShow] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [error, setError] = useState("");
  const selectedService = services?.find((s) => s.id === serviceId);
  const serviceTabs = useMemo(() => Array.from(new Set((services || []).map(serviceGroupName))), [services]);
  const [serviceTab, setServiceTab] = useState("");
  const visibleServices = useMemo(() => (services || []).filter((service) => serviceGroupName(service) === serviceTab), [services, serviceTab]);
  const activeServiceGroup = visibleServices[0];
  const sizeOptions = useMemo(() => orderedValues(visibleServices.map((service) => service.size), sizeOrder), [visibleServices]);
  const lengthOptions = useMemo(() => orderedValues(visibleServices.filter((service) => !selectedSize || service.size === selectedSize).map((service) => service.length || service.optionName), lengthOrder), [visibleServices, selectedSize]);

  useEffect(() => {
    if (!serviceTab && serviceTabs.length) setServiceTab(serviceTabs[0]);
  }, [serviceTab, serviceTabs]);

  useEffect(() => {
    if (!visibleServices.length) return;
    const first = visibleServices[0];
    setSelectedSize(first.size || "");
    setSelectedLength(first.length || first.optionName || "");
    setServiceId(first.id);
    setSlot("");
  }, [serviceTab, services]);

  useEffect(() => {
    if (!visibleServices.length) return;
    const match = visibleServices.find((service) => {
      const sizeMatches = sizeOptions.length ? service.size === selectedSize : true;
      const lengthMatches = lengthOptions.length ? (service.length || service.optionName) === selectedLength : true;
      return sizeMatches && lengthMatches;
    });
    if (match && match.id !== serviceId) {
      setServiceId(match.id);
      setSlot("");
    }
  }, [selectedSize, selectedLength, visibleServices, sizeOptions.length, lengthOptions.length, serviceId]);

  useEffect(() => {
    setSlot("");
    if (serviceId && staffId && date) api<string[]>(`/availability/slots?serviceId=${serviceId}&staffId=${staffId}&date=${date}`).then(setSlots).catch(() => setSlots([]));
  }, [serviceId, staffId, date]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!serviceId || !staffId || !slot || !customer.firstName || !customer.lastName || !customer.email || !customer.phone) {
      setError("Choose a service, staff member, time, and enter your contact details.");
      return;
    }
    try {
      const created = await api<Booking>("/bookings", { method: "POST", body: JSON.stringify({ serviceId, staffId, startTime: slot, customer, notes: customer.notes, cardHeldForNoShow }) });
      setBooking(created);
      setPaymentIntent(await api<PaymentIntentResponse>("/payments/create-intent", { method: "POST", body: JSON.stringify({ bookingId: created.id }) }));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function joinWaitlist() {
    setError("");
    setWaitlistMessage("");
    if (!serviceId || !date || !customer.firstName || !customer.lastName || !customer.email || !customer.phone) {
      setError("Enter your name, email, and phone before joining the waitlist.");
      return;
    }
    try {
      await api("/waitlist", { method: "POST", body: JSON.stringify({ serviceId, staffId: staffId || undefined, preferredDate: date, firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone, notes: customer.notes }) });
      setWaitlistMessage("You're on the waitlist. QueenG Braids will reach out when a matching spot opens.");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function pay() {
    if (!booking) return;
    const confirmed = await api<Booking>("/payments/webhook/test", { method: "POST", body: JSON.stringify({ bookingId: booking.id, status: "succeeded" }) });
    setBooking(confirmed);
  }

  if (booking?.status === "CONFIRMED") {
    return <Shell><div className="card mx-auto max-w-2xl text-center"><Check className="mx-auto text-hotpink" size={44} /><h1 className="mt-3 text-3xl font-black">Appointment confirmed</h1><p className="mt-2 text-stone-600">{booking.service.name} with {booking.staff.displayName} on {formatDateTime(booking.startTime)}.</p><p className="mt-4 font-semibold">Deposit paid: {formatMoney(booking.payment?.totalAmount || 0)}</p></div></Shell>;
  }

  if (booking) {
    return (
      <Shell>
        <div className="grid gap-5 md:grid-cols-[1fr_360px]">
          <div className="card">
            <h1 className="text-2xl font-black">Pay deposit</h1>
            <p className="mt-2 text-stone-600">Use Stripe test card 4242 4242 4242 4242 with any future expiration, CVC, and ZIP.</p>
            {paymentIntent?.provider === "stripe" && paymentIntent.clientSecret && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#ec4899", colorText: "#111111", borderRadius: "8px" } } }}>
                <StripeDepositForm bookingId={booking.id} paymentIntentId={paymentIntent.paymentIntentId} onConfirmed={setBooking} />
              </Elements>
            ) : (
              <button className="btn-primary mt-5" onClick={pay}><CreditCard size={16} /> Pay {formatMoney(booking.payment?.totalAmount || 0)}</button>
            )}
          </div>
          <Summary service={booking.service} slot={booking.startTime} customer={booking.customer} tax={booking.payment?.taxAmount} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-lg bg-ink p-5 text-white">
            <p className="text-sm font-bold uppercase tracking-wide text-pink">Book your QueenG appointment</p>
            <h1 className="mt-2 text-3xl font-black">Choose a service first</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">Select a service category, choose the style you want, then pick your staff member, date, time, and pay the required deposit.</p>
          </section>
          <section className="card">
            <div className="flex flex-wrap gap-2">
              {serviceTabs.map((tab) => (
                <button className={`rounded-md px-4 py-2 text-sm font-black ${serviceTab === tab ? "bg-ink text-white" : "bg-blush text-ink hover:bg-pink/30"}`} key={tab} onClick={() => setServiceTab(tab)} type="button">{tab}</button>
              ))}
            </div>
            {loading && <p className="mt-4">Loading services...</p>}
            {activeServiceGroup && <div className="mt-6 max-w-3xl">
              <h2 className="text-2xl font-black">{serviceTab}</h2>
              <p className="mt-2 text-sm font-semibold text-stone-700">Price varies · {Math.floor(Math.min(...visibleServices.map((service) => service.durationMinutes)) / 60)} hr+</p>
              <p className="mt-4 text-sm text-stone-700">{activeServiceGroup.description}</p>
              <div className="mt-3 text-sm text-stone-700">
                <p className="font-bold">👸🏾 Extension color</p>
                <p>Please tell us which extension color you'd like.</p>
                <p className="mt-2 font-bold text-ink">💳 Booking & Cancellation Policy</p>
                <p className="italic">To confirm your appointment, a non-refundable deposit is required. This deposit goes toward your total service cost. No appointment is confirmed without it.</p>
              </div>
              <h3 className="mt-8 text-xl font-black">Choose size and length</h3>
            </div>}
            {activeServiceGroup && <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Size</span>
                <select aria-label="size" className="field mt-1" value={selectedSize} onChange={(e) => { setSelectedSize(e.target.value); const next = visibleServices.find((service) => service.size === e.target.value); setSelectedLength(next?.length || next?.optionName || ""); }}>
                  {sizeOptions.length ? sizeOptions.map((size) => <option key={size} value={size}>{size}</option>) : <option value="">Standard</option>}
                </select>
              </label>
              <label>
                <span className="label">Length</span>
                <select aria-label="length" className="field mt-1" value={selectedLength} onChange={(e) => setSelectedLength(e.target.value)}>
                  {lengthOptions.map((length) => <option key={length} value={length}>{length}</option>)}
                </select>
              </label>
              {selectedService && <div className="rounded-lg border border-pink/30 bg-blush p-4 md:col-span-2">
                <p className="text-lg font-black">{serviceOptionName(selectedService)}</p>
                <p className="mt-1 text-sm text-stone-700">{formatMoney(selectedService.price)} · {Math.floor(selectedService.durationMinutes / 60)} hr{selectedService.durationMinutes % 60 ? ` ${selectedService.durationMinutes % 60} min` : ""}</p>
                <p className="mt-1 text-xs font-semibold text-stone-600">Deposit required: {formatMoney(selectedService.depositAmount)} plus tax.</p>
              </div>}
            </div>}
          </section>
          {selectedService && <section className="card grid gap-4 md:grid-cols-3"><label><span className="label">Staff</span><select aria-label="staff" className="field mt-1" value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">Select</option>{staff?.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label><label><span className="label">Date</span><input aria-label="date" className="field mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label><span className="label">Time</span><select aria-label="time" className="field mt-1" value={slot} onChange={(e) => setSlot(e.target.value)}><option value="">Select</option>{slots.map((value) => <option key={value} value={value}>{new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</option>)}</select></label>{serviceId && staffId && slots.length === 0 && <div className="rounded-lg border border-pink/40 bg-blush p-4 md:col-span-3"><p className="font-black">No times showing for that date.</p><p className="mt-1 text-sm text-stone-700">Join the waitlist and we will contact you if a spot opens.</p><button className="btn-secondary mt-3" type="button" onClick={joinWaitlist}>Join waitlist</button>{waitlistMessage && <p className="mt-2 text-sm font-semibold text-success">{waitlistMessage}</p>}</div>}</section>}
          {selectedService && <section className="card"><h2 className="text-xl font-black">Your information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{(["firstName", "lastName", "email", "phone"] as const).map((key) => <label key={key}><span className="label">{key.replace(/[A-Z]/g, " $&")}</span><input aria-label={key} className="field mt-1" value={customer[key]} onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })} /></label>)}<label className="sm:col-span-2"><span className="label">Notes</span><textarea aria-label="notes" className="field mt-1" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} /></label><label className="flex items-start gap-3 rounded-lg border border-pink/30 bg-blush p-3 sm:col-span-2"><input className="mt-1" type="checkbox" checked={cardHeldForNoShow} onChange={(e) => setCardHeldForNoShow(e.target.checked)} /><span><span className="font-bold">Hold card for no-show protection</span><span className="block text-sm text-stone-600">Local test mode records consent only. Admin settings control the no-show fee.</span></span></label></div>{error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}<button className="btn-primary mt-4">Review and pay deposit</button></section>}
        </div>
        <Summary service={selectedService} slot={slot} customer={customer} />
      </form>
    </Shell>
  );
}

function Summary({ service, slot, customer, tax }: { service?: Service; slot?: string; customer?: any; tax?: string }) {
  return <aside className="card h-fit"><h2 className="font-black">Booking summary</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-stone-500">Service</dt><dd className="font-semibold">{service?.name || "Not selected"}</dd></div><div><dt className="text-stone-500">When</dt><dd className="font-semibold">{slot ? formatDateTime(slot) : "Not selected"}</dd></div><div><dt className="text-stone-500">Customer</dt><dd className="font-semibold">{customer?.firstName ? `${customer.firstName} ${customer.lastName}` : "Not entered"}</dd></div><div><dt className="text-stone-500">Deposit</dt><dd className="font-semibold">{service ? formatMoney(service.depositAmount) : "$0.00"}{tax ? ` + ${formatMoney(tax)} tax` : " plus tax"}</dd></div></dl></aside>;
}

function StripeDepositForm({ bookingId, paymentIntentId, onConfirmed }: { bookingId: string; paymentIntentId: string; onConfirmed: (booking: Booking) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!stripe || !elements) return;
    setProcessing(true);
    const result = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (result.error) {
      setError(result.error.message || "Payment failed. Please check your card details.");
      setProcessing(false);
      return;
    }
    try {
      const confirmed = await api<Booking>("/payments/confirm", { method: "POST", body: JSON.stringify({ bookingId, paymentIntentId }) });
      onConfirmed(confirmed);
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <PaymentElement />
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <button className="btn-primary w-full" disabled={!stripe || processing}>{processing ? "Processing..." : "Pay deposit"}</button>
    </form>
  );
}

function Login() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      localStorage.setItem("token", res.token); localStorage.setItem("user", JSON.stringify(res.user));
      navigate(res.user.role === "CUSTOMER" ? "/customer/bookings" : "/admin/dashboard");
    } catch (err: any) { setError(err.message); }
  }
  return <Shell><form onSubmit={submit} className="card mx-auto max-w-md space-y-4"><h1 className="text-2xl font-black">Login</h1><label><span className="label">Email</span><input className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label><span className="label">Password</span><input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button className="btn-primary w-full">Login</button></form></Shell>;
}

function Register() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await api<{ token: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify(form) });
    localStorage.setItem("token", res.token); localStorage.setItem("user", JSON.stringify(res.user)); navigate("/customer/bookings");
  }
  return <Shell><form onSubmit={submit} className="card mx-auto max-w-md space-y-4"><h1 className="text-2xl font-black">Register</h1>{Object.keys(form).map((key) => <label key={key}><span className="label">{key}</span><input className="field mt-1" type={key === "password" ? "password" : "text"} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<button className="btn-primary w-full">Create account</button></form></Shell>;
}

function Dashboard() {
  const { data, error, loading } = useAsync<any>(() => api("/dashboard/summary"));
  return <AdminLayout><h1 className="mb-4 text-3xl font-black">Dashboard</h1>{loading ? <p>Loading...</p> : error ? <div className="card"><p className="font-bold text-red-700">{error}</p><Link className="btn-primary mt-4" to="/login">Log in again</Link></div> : data ? <><div className="grid gap-4 md:grid-cols-4">{[["Today", data.totalBookingsToday], ["Upcoming", data.totalUpcomingBookings], ["Deposits", formatMoney(data.totalDepositsCollected)], ["Revenue", formatMoney(data.totalRevenue)]].map(([label, value]) => <div className="card" key={label}><p className="text-sm text-stone-500">{label}</p><p className="text-2xl font-black">{value}</p></div>)}</div><BookingTable bookings={data.recentBookings} title="Recent bookings" /></> : <p>No dashboard data yet.</p>}</AdminLayout>;
}

function BookingTable({ bookings, title }: { bookings: Booking[]; title: string }) {
  return <section className="card mt-5 overflow-x-auto"><h2 className="mb-3 text-xl font-black">{title}</h2><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Time</th><th>Customer</th><th>Service</th><th>Status</th><th>Payment</th><th></th></tr></thead><tbody>{bookings?.map((b) => <tr key={b.id} className="border-b last:border-0"><td className="py-3">{formatDateTime(b.startTime)}</td><td>{b.customer.firstName} {b.customer.lastName}</td><td>{b.service.name}</td><td><span className={`badge ${statusClass(b.status)}`}>{b.status}</span></td><td>{b.payment?.status}</td><td><Link className="font-semibold text-hotpink" to={`/admin/bookings/${b.id}`}>Open</Link></td></tr>)}</tbody></table></section>;
}

function AdminBookings() {
  const { data, setData } = useAsync<Booking[]>(() => api("/bookings"));
  async function act(id: string, action: string) {
    await api(`/bookings/${id}/${action}`, { method: "PUT", body: JSON.stringify({ reason: "Admin update" }) });
    setData((await api("/bookings")) as Booking[]);
  }
  return <AdminLayout><h1 className="mb-4 text-3xl font-black">Bookings</h1><div className="space-y-3">{data?.map((b) => <div className="card flex flex-wrap items-center justify-between gap-3" key={b.id}><div><p className="font-bold">{b.customer.firstName} {b.customer.lastName} · {b.service.name}</p><p className="text-sm text-stone-600">{formatDateTime(b.startTime)} · {b.status}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => act(b.id, "complete")}>Complete</button><button className="btn-secondary" onClick={() => act(b.id, "no-show")}>No-show</button><button className="btn-secondary" onClick={() => act(b.id, "cancel")}>Cancel</button></div></div>)}</div></AdminLayout>;
}

function CalendarView() {
  const { data } = useAsync<Booking[]>(() => api("/bookings"));
  const grouped = useMemo(() => (data || []).reduce<Record<string, Booking[]>>((acc, b) => { const key = b.startTime.slice(0, 10); (acc[key] ||= []).push(b); return acc; }, {}), [data]);
  return <AdminLayout><h1 className="mb-4 text-3xl font-black">Calendar</h1><div className="grid gap-4 md:grid-cols-3">{Object.entries(grouped).map(([date, bookings]) => <section className="card" key={date}><h2 className="font-black">{new Date(`${date}T00:00:00`).toLocaleDateString()}</h2><div className="mt-3 space-y-2">{bookings.map((b) => <Link to={`/admin/bookings/${b.id}`} className="block rounded-md border border-stone-200 p-3 hover:bg-stone-50" key={b.id}><p className="font-semibold">{new Date(b.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {b.customer.firstName}</p><p className="text-sm text-stone-600">{b.service.name} · {b.status}</p></Link>)}</div></section>)}</div></AdminLayout>;
}

function ServicesAdmin() {
  const blank = { name: "", description: "", price: 0, depositAmount: 0, durationMinutes: 60, category: "", isActive: true };
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const { data, setData } = useAsync<Service[]>(() => api("/services?active=false"));
  async function save(e: FormEvent) { e.preventDefault(); await api(editing ? `/services/${editing}` : "/services", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) }); setForm(blank); setEditing(null); setData((await api("/services?active=false")) as Service[]); }
  async function remove(id: string) { await api(`/services/${id}`, { method: "DELETE" }); setData((await api("/services?active=false")) as Service[]); }
  return <AdminLayout><h1 className="mb-4 text-3xl font-black">Services</h1><form onSubmit={save} className="card grid gap-3 md:grid-cols-4">{Object.keys(blank).map((key) => key === "isActive" ? <label className="flex items-center gap-2" key={key}><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label> : <input key={key} aria-label={key} className="field" placeholder={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: ["price", "depositAmount", "durationMinutes"].includes(key) ? Number(e.target.value) : e.target.value })} />)}<button className="btn-primary">{editing ? "Update" : "Create"} service</button></form><div className="mt-5 grid gap-3 md:grid-cols-2">{data?.map((s) => <div className="card" key={s.id}><p className="font-bold">{s.name}</p><p className="text-sm text-stone-600">{formatMoney(s.price)} · deposit {formatMoney(s.depositAmount)} · {s.durationMinutes} min</p><div className="mt-3 flex gap-2"><button className="btn-secondary" onClick={() => { setEditing(s.id); setForm({ ...s, price: Number(s.price), depositAmount: Number(s.depositAmount) }); }}>Edit</button><button className="btn-secondary" onClick={() => remove(s.id)}>Delete</button></div></div>)}</div></AdminLayout>;
}

function Customers() {
  const { data } = useAsync<any[]>(() => api("/customers"));
  return <AdminLayout><h1 className="mb-4 text-3xl font-black">Customers</h1><div className="grid gap-3 md:grid-cols-2">{data?.map((c) => <div className="card" key={c.id}><p className="font-bold">{c.firstName} {c.lastName}</p><p className="text-sm text-stone-600">{c.email} · {c.phone}</p><p className="mt-2 text-sm">{c.bookings.length} bookings</p></div>)}</div></AdminLayout>;
}

function WaitlistAdmin() {
  const { data, setData } = useAsync<any[]>(() => api("/waitlist"));
  async function update(id: string, status: string) {
    await api(`/waitlist/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    setData((await api("/waitlist")) as any[]);
  }
  return (
    <AdminLayout>
      <h1 className="mb-4 text-3xl font-black">Waitlist</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((entry) => (
          <div className="card" key={entry.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{entry.firstName} {entry.lastName}</p>
                <p className="text-sm text-stone-600">{entry.service.name} · {entry.preferredDate?.slice(0, 10) || "Any date"}</p>
                <p className="mt-2 text-sm">{entry.email} · {entry.phone}</p>
              </div>
              <span className={`badge ${entry.status === "OPEN" ? "bg-pink/20 text-ink" : "bg-stone-100 text-stone-700"}`}>{entry.status}</span>
            </div>
            {entry.notes && <p className="mt-3 text-sm text-stone-700">{entry.notes}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {["CONTACTED", "BOOKED", "CLOSED"].map((status) => <button className="btn-secondary" key={status} onClick={() => update(entry.id, status)}>{status.toLowerCase()}</button>)}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

function Availability() {
  const { data: staff } = useAsync<Staff[]>(() => api("/staff"));
  const { data, setData } = useAsync<any[]>(() => api("/availability"));
  const [form, setForm] = useState({ staffId: "", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00", bufferMinutes: 15 });
  async function save(e: FormEvent) { e.preventDefault(); await api("/availability", { method: "POST", body: JSON.stringify(form) }); setData((await api("/availability")) as any[]); }
  return <AdminLayout><h1 className="mb-4 text-3xl font-black">Availability</h1><form onSubmit={save} className="card grid gap-3 md:grid-cols-4"><select className="field" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}><option value="">Staff</option>{staff?.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}</select>{Object.entries(form).filter(([k]) => k !== "staffId").map(([key, value]) => <input key={key} aria-label={key} className="field" placeholder={key} value={value as any} onChange={(e) => setForm({ ...form, [key]: ["dayOfWeek", "bufferMinutes"].includes(key) ? Number(e.target.value) : e.target.value })} />)}<button className="btn-primary">Set availability</button></form><div className="mt-5 grid gap-3 md:grid-cols-2">{data?.map((a) => <div className="card" key={a.id}><p className="font-bold">{a.staff.displayName} · day {a.dayOfWeek}</p><p className="text-sm">{a.startTime}-{a.endTime}, break {a.breakStart}-{a.breakEnd}, buffer {a.bufferMinutes}m</p></div>)}</div></AdminLayout>;
}

function SettingsPage() {
  const { data, setData } = useAsync<any>(() => api("/settings"));
  const [form, setForm] = useState<any>({});
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (data) setForm({
      businessName: data.businessName,
      businessPhone: data.businessPhone,
      businessEmail: data.businessEmail,
      address: data.address,
      cancellationPolicy: data.cancellationPolicy,
      depositPolicy: data.depositPolicy,
      bookingNoticeMinimumHours: data.bookingNoticeMinimumHours,
      maxDaysAhead: data.maxDaysAhead,
      depositTaxRate: data.depositTaxRate,
      paymentPolicy: data.paymentPolicy || "REQUIRE_DEPOSIT",
      noShowFeeType: data.noShowFeeType || "FLAT",
      noShowFeeAmount: data.noShowFeeAmount || 30,
      dailyAppointmentLimit: data.dailyAppointmentLimit || "",
      allowCustomerSelfCancel: Boolean(data.allowCustomerSelfCancel),
      allowCustomerSelfReschedule: Boolean(data.allowCustomerSelfReschedule),
      enableWaitlist: Boolean(data.enableWaitlist)
    });
  }, [data]);
  async function save(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      bookingNoticeMinimumHours: Number(form.bookingNoticeMinimumHours),
      maxDaysAhead: Number(form.maxDaysAhead),
      depositTaxRate: Number(form.depositTaxRate),
      noShowFeeAmount: Number(form.noShowFeeAmount),
      dailyAppointmentLimit: form.dailyAppointmentLimit === "" ? null : Number(form.dailyAppointmentLimit)
    };
    const updated = await api("/settings", { method: "PUT", body: JSON.stringify(payload) });
    setData(updated as any);
    setMessage("Settings saved.");
  }
  return (
    <AdminLayout>
      <h1 className="mb-4 text-3xl font-black">Settings</h1>
      {data && <form onSubmit={save} className="card space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {["businessName", "businessPhone", "businessEmail", "address"].map((key) => <label key={key}><span className="label">{key}</span><input className="field mt-1" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
          <label className="md:col-span-2"><span className="label">Cancellation policy</span><textarea className="field mt-1" value={form.cancellationPolicy || ""} onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })} /></label>
          <label className="md:col-span-2"><span className="label">Deposit policy</span><textarea className="field mt-1" value={form.depositPolicy || ""} onChange={(e) => setForm({ ...form, depositPolicy: e.target.value })} /></label>
          <label><span className="label">Payment policy</span><select className="field mt-1" value={form.paymentPolicy || "REQUIRE_DEPOSIT"} onChange={(e) => setForm({ ...form, paymentPolicy: e.target.value })}><option value="NO_REQUIREMENT">No requirement</option><option value="REQUIRE_DEPOSIT">Require deposit</option><option value="REQUIRE_FULL_PREPAYMENT">Require full prepay</option><option value="HOLD_CARD_FOR_NO_SHOW">Hold card for no-show</option></select></label>
          <label><span className="label">No-show fee type</span><select className="field mt-1" value={form.noShowFeeType || "FLAT"} onChange={(e) => setForm({ ...form, noShowFeeType: e.target.value })}><option value="FLAT">Flat fee</option><option value="PERCENT">Percent of service</option></select></label>
          {["noShowFeeAmount", "depositTaxRate", "bookingNoticeMinimumHours", "maxDaysAhead", "dailyAppointmentLimit"].map((key) => <label key={key}><span className="label">{key}</span><input className="field mt-1" value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
          {[["allowCustomerSelfCancel", "Customers can cancel online"], ["allowCustomerSelfReschedule", "Customers can reschedule online"], ["enableWaitlist", "Enable waitlist"]].map(([key, label]) => <label className="flex items-center gap-3 rounded-lg border border-pink/30 p-3" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /><span className="font-semibold">{label}</span></label>)}
        </div>
        <button className="btn-primary">Save settings</button>
        {message && <p className="text-sm font-semibold text-success">{message}</p>}
      </form>}
    </AdminLayout>
  );
}

function CustomerBookings() {
  const { data } = useAsync<Booking[]>(() => api("/bookings"));
  return <Shell><h1 className="mb-4 text-3xl font-black">My bookings</h1><div className="space-y-3">{data?.map((b) => <div className="card" key={b.id}><p className="font-bold">{b.service.name}</p><p>{formatDateTime(b.startTime)} · {b.status}</p></div>)}</div></Shell>;
}

function BookingDetail() {
  return <AdminBookings />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/book" element={<BookingFlow />} />
      <Route path="/book/services" element={<BookingFlow />} />
      <Route path="/book/service" element={<BookingFlow />} />
      <Route path="/book/date-time" element={<BookingFlow />} />
      <Route path="/book/customer-info" element={<BookingFlow />} />
      <Route path="/book/payment" element={<BookingFlow />} />
      <Route path="/book/confirmation" element={<BookingFlow />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/admin/calendar" element={<RequireAuth><CalendarView /></RequireAuth>} />
      <Route path="/admin/bookings" element={<RequireAuth><AdminBookings /></RequireAuth>} />
      <Route path="/admin/bookings/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
      <Route path="/admin/waitlist" element={<RequireAuth><WaitlistAdmin /></RequireAuth>} />
      <Route path="/admin/services" element={<RequireAuth><ServicesAdmin /></RequireAuth>} />
      <Route path="/admin/customers" element={<RequireAuth><Customers /></RequireAuth>} />
      <Route path="/admin/availability" element={<RequireAuth><Availability /></RequireAuth>} />
      <Route path="/admin/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
      <Route path="/customer/bookings" element={<RequireAuth><CustomerBookings /></RequireAuth>} />
      <Route path="/customer/bookings/:id" element={<RequireAuth><CustomerBookings /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
