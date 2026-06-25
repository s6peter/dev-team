import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";

const service = { id: "svc1", name: "Box Braids - Medium shoulder length", groupName: "Box Braids", optionName: "Medium shoulder length", size: "Medium", length: "Shoulder length", description: "Classic", price: "180", depositAmount: "45", durationMinutes: 120, category: "Braids", isActive: true };
const staff = { id: "staff1", displayName: "Nia", user: { firstName: "Nia", lastName: "Braider" } };
const booking = { id: "book1", status: "PENDING_PAYMENT", startTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 93600000).toISOString(), service, staff, customer: { id: "cus1", firstName: "Maya", lastName: "Cole", email: "maya@example.com", phone: "555" }, payment: { status: "UNPAID", depositAmount: "45", taxAmount: "4.50", totalAmount: "49.50" } };

beforeEach(() => {
  localStorage.setItem("token", "token");
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/services")) return response([service]);
    if (url.includes("/staff")) return response([staff]);
    if (url.includes("/availability/slots")) return response([booking.startTime]);
    if (url.includes("/bookings") && options?.method === "POST") return response(booking, 201);
    if (url.includes("/payments/create-intent")) return response({ clientSecret: "secret", amount: "49.50" });
    if (url.includes("/payments/webhook/test")) return response({ ...booking, status: "CONFIRMED", payment: { ...booking.payment, status: "PAID" } });
    if (url.includes("/dashboard/summary")) return response({ totalBookingsToday: 1, totalUpcomingBookings: 1, totalDepositsCollected: 49.5, totalRevenue: 49.5, recentBookings: [booking], popularServices: [] });
    if (url.includes("/bookings")) return response([booking]);
    if (url.includes("/customers")) return response([{ id: "cus1", firstName: "Maya", lastName: "Cole", email: "maya@example.com", phone: "555", bookings: [booking] }]);
    if (url.includes("/availability")) return response([{ id: "av1", staff, dayOfWeek: 1, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00", bufferMinutes: 15 }]);
    if (url.includes("/settings")) return response({ businessName: "Studio", businessEmail: "a@b.com", businessPhone: "555", address: "Here", cancellationPolicy: "24h", depositPolicy: "Deposit", depositTaxRate: "0.0825" });
    return response({});
  }));
});

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

function page(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

test("services display on booking page", async () => {
  page("/book");
  expect(await screen.findByText("Box Braids")).toBeInTheDocument();
  expect(await screen.findByLabelText("size")).toBeInTheDocument();
  expect(await screen.findByLabelText("length")).toBeInTheDocument();
  expect(screen.getAllByText((_, element) => element?.textContent?.includes("Deposit required: $45.00 plus tax") ?? false).length).toBeGreaterThan(0);
});

test("booking form validation works", async () => {
  page("/book");
  await userEvent.selectOptions(await screen.findByLabelText("size"), "Medium");
  await userEvent.selectOptions(await screen.findByLabelText("length"), "Shoulder length");
  await userEvent.click(await screen.findByRole("button", { name: /review and pay deposit/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/choose a service/i);
});

test("date/time selection and customer info form complete booking", async () => {
  page("/book");
  await userEvent.selectOptions(await screen.findByLabelText("size"), "Medium");
  await userEvent.selectOptions(await screen.findByLabelText("length"), "Shoulder length");
  await userEvent.selectOptions(screen.getByLabelText("staff"), "staff1");
  await waitFor(() => expect(screen.getByLabelText("time").querySelectorAll("option").length).toBeGreaterThan(1));
  await userEvent.selectOptions(screen.getByLabelText("time"), booking.startTime);
  await userEvent.type(screen.getByLabelText("firstName"), "Maya");
  await userEvent.type(screen.getByLabelText("lastName"), "Cole");
  await userEvent.type(screen.getByLabelText("email"), "maya@example.com");
  await userEvent.type(screen.getByLabelText("phone"), "5551234567");
  await userEvent.click(screen.getByRole("button", { name: /review and pay deposit/i }));
  expect(await screen.findByRole("button", { name: /pay \$49.50/i })).toBeInTheDocument();
});

test("admin services page loads", async () => {
  page("/admin/services");
  expect(await screen.findByRole("heading", { name: "Services" })).toBeInTheDocument();
  expect(await screen.findByText(/Box Braids/)).toBeInTheDocument();
});

test("admin bookings page loads", async () => {
  page("/admin/bookings");
  expect(await screen.findByRole("heading", { name: "Bookings" })).toBeInTheDocument();
  expect(await screen.findByText(/Maya Cole/)).toBeInTheDocument();
});
