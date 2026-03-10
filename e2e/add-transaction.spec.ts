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
});
