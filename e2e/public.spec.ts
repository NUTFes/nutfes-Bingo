import { expect, test } from "@playwright/test";

test("public pages support mobile keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("main", { name: "ビンゴコンテンツ" })).toBeVisible();

  const prizesButton = page.getByRole("button", { name: "Prizes", exact: true });
  await prizesButton.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/prizes$/);
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();

  const backButton = page.getByRole("button", { name: "Back", exact: true });
  await backButton.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);

  const settingsButton = page.getByRole("button", { name: "Settings", exact: true });
  await settingsButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "SETTINGS", exact: true })).toBeVisible();
});
