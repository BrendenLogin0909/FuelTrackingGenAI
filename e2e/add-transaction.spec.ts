import { test, expect } from "@playwright/test";

test.describe("Add transaction flow", () => {
  test("manual entry creates transaction", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Add transaction" }).click();
    await expect(page.getByRole("heading", { name: "Add fuel transaction" })).toBeVisible();

    await page.getByRole("button", { name: "Enter manually" }).click();
    await page.getByLabel("Litres").fill("45");
    await page.getByLabel("Total cost").fill("85.50");
    await page.getByLabel("Odometer").fill("125000");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("85.50")).toBeVisible();
  });

  test("manual entry does not persist before save is clicked", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "Enter manually" }).click();

    await page.getByLabel("Litres").fill("45");
    await page.getByLabel("Total cost").fill("85.50");
    await page.getByLabel("Odometer").fill("125000");
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("No transactions yet.")).toBeVisible();
  });

  test("dashboard shows empty state when no transactions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("No transactions yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Add your first transaction" })).toBeVisible();
  });

  test("can navigate to add and back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Add transaction" }).click();
    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL("/");
  });

  test("historical transactions are listed newest to oldest", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "Enter manually" }).click();
    await page.getByLabel("Date").fill("2026-03-01");
    await page.getByLabel("Litres").fill("40");
    await page.getByLabel("Total cost").fill("70.00");
    await page.getByLabel("Station name").fill("Older Station");
    await page.getByRole("button", { name: "Save" }).click();

    await page.getByRole("link", { name: "Add transaction" }).click();
    await page.getByRole("button", { name: "Enter manually" }).click();
    await page.getByLabel("Date").fill("2026-03-15");
    await page.getByLabel("Litres").fill("42");
    await page.getByLabel("Total cost").fill("75.00");
    await page.getByLabel("Station name").fill("Newer Station");
    await page.getByRole("button", { name: "Save" }).click();

    await page.goto("/transactions");

    const items = page.locator("ul > li");
    await expect(items.nth(0)).toContainText("Newer Station");
    await expect(items.nth(1)).toContainText("Older Station");
  });
});
