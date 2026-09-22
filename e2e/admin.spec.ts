import { expect, test } from "@playwright/test";

const testNumber = 73;

test("keeps an out-of-range number from being submitted", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "番号の追加", exact: true })).toBeVisible();

  const numberInput = page.getByRole("textbox", { name: "登録する番号", exact: true });
  const addButton = page.getByRole("button", { name: "番号を追加", exact: true });
  await numberInput.fill("100");
  await expect(addButton).toBeDisabled();
  await expect(page.getByText("登録済み: 0 件", { exact: true })).toBeVisible();
});

test("publishes number changes live and preserves them after reload", async ({ page, context }) => {
  const publicPage = await context.newPage();
  await publicPage.goto("/");
  await expect(publicPage.getByRole("main", { name: "ビンゴコンテンツ" })).toBeVisible();
  await expect(publicPage.getByText(String(testNumber), { exact: true })).toHaveCount(0);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "番号の追加", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "登録する番号", exact: true }).fill(String(testNumber));
  await page.getByRole("button", { name: "番号を追加", exact: true }).click();

  await expect(page.getByText("登録済み: 1 件", { exact: true })).toBeVisible();
  await expect(publicPage.getByText(String(testNumber), { exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByText(String(testNumber), { exact: true })).toBeVisible();

  await page.getByRole("combobox", { name: "削除する番号", exact: true }).fill(String(testNumber));
  await page.getByRole("option", { name: String(testNumber), exact: true }).click();
  await page.getByRole("button", { name: "番号を削除", exact: true }).click();
  await expect(page.getByText("登録済み: 0 件", { exact: true })).toBeVisible();
  await expect(publicPage.getByText(String(testNumber), { exact: true })).toHaveCount(0);
  await publicPage.reload();
  await expect(publicPage.getByRole("main", { name: "ビンゴコンテンツ" })).toBeVisible();
  await expect(publicPage.getByText(String(testNumber), { exact: true })).toHaveCount(0);
});
