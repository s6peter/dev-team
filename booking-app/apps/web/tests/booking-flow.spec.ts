import { expect, test } from "@playwright/test";

test("complete booking flow and admin sees booking", async ({ page }) => {
  await page.goto("/book");
  await page.getByRole("button", { name: "Box Braids", exact: true }).click();
  await page.getByLabel("size").selectOption("Large");
  await page.getByLabel("length").selectOption("Shoulder length");
  await page.getByLabel("staff").selectOption({ label: "Nia" });
  await page.getByLabel("date").fill(nextMondayDate());
  await expect.poll(async () => await page.getByLabel("time").locator("option").count()).toBeGreaterThan(1);
  await page.getByLabel("time").selectOption({ index: 1 });
  await page.getByLabel("firstName").fill("E2E");
  await page.getByLabel("lastName").fill("Client");
  await page.getByLabel("email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("phone").fill("5551234567");
  await page.getByRole("button", { name: /review and pay deposit/i }).click();
  await expect(page.getByRole("heading", { name: /pay deposit/i })).toBeVisible();
  await page.getByRole("button", { name: /^Pay \$/ }).click();
  await expect(page.getByText(/appointment confirmed/i)).toBeVisible();

  await page.goto("/login");
  await page.locator("input").first().fill("admin@example.com");
  await page.locator("input[type='password']").fill("Admin123!");
  await page.getByRole("button", { name: /login/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/E2E Client/)).toBeVisible();
  await page.goto("/admin/calendar");
  await expect(page.getByText(/Box Braids/)).toBeVisible();
});

function nextMondayDate() {
  const date = new Date();
  const diff = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
