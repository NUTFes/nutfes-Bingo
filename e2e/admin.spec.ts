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

test("shows continued publication after an invalid survey update", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "アンケート配信" })).toBeVisible();

  await page.getByRole("textbox", { name: "タイトル" }).fill("回答のお願い");
  await page.getByRole("textbox", { name: "説明" }).fill("回答してください");
  await page.getByRole("textbox", { name: "ボタン文言" }).fill("回答する");
  const url = page.getByRole("textbox", { name: "URL" });
  await url.fill("https://example.com/live");
  await page.getByRole("button", { name: "配信する" }).click();
  await expect(page.getByText("アンケートを送信しました。")).toBeVisible();

  await url.fill("http://example.com/draft");
  const rejected = page.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/api/command") &&
      response.request().method() === "POST" &&
      response.status() === 400,
  );
  await page.getByRole("button", { name: "配信する" }).click();
  const { error } = (await (await rejected).json()) as { error: string };
  const status = page.getByText(/配信は継続中/);
  await expect(status).toBeVisible();
  await expect(status).toContainText(error);

  await page.getByRole("button", { name: "配信を停止する" }).click();
  await expect(page.getByText("アンケートを停止しました。")).toBeVisible();
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
test("reconciles a stale prize after its won-state update fails", async ({ page }) => {
  const prizeName = `E2E stale switch ${Date.now()}`;
  let createdPrizeId: number | null = null;

  try {
    await page.goto("/admin/prizes/new");
    await page.getByRole("textbox", { name: "景品名（日本語）", exact: true }).fill(prizeName);
    await page
      .getByRole("textbox", { name: "景品名（英語）", exact: true })
      .fill("E2E stale switch");

    const createResponsePromise = page.waitForResponse((response) => {
      const request = response.request();
      return (
        response.url().endsWith("/admin/api/command") &&
        request.method() === "POST" &&
        request.postDataJSON()?.type === "createPrize"
      );
    });
    await page.getByRole("button", { name: "景品を登録", exact: true }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(200);
    const createdBody = (await createResponse.json()) as { data: { id: number } };
    createdPrizeId = createdBody.data.id;

    await page.goto("/admin/prizes");
    const stalePrizeSwitch = page.getByRole("switch", {
      name: `${prizeName}の当選状態`,
      exact: true,
    });
    await expect(stalePrizeSwitch).toBeVisible();

    const deleteStatus = await page.evaluate(async (id) => {
      const response = await fetch("/admin/api/command", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deletePrize", id }),
      });
      return response.status;
    }, createdPrizeId);
    expect(deleteStatus).toBe(200);

    const stateGetStatuses: number[] = [];
    page.on("response", (response) => {
      const request = response.request();
      if (new URL(response.url()).pathname === "/admin/api/state" && request.method() === "GET") {
        stateGetStatuses.push(response.status());
      }
    });
    const failedToggleResponse = page.waitForResponse((response) => {
      const request = response.request();
      return (
        response.url().endsWith("/admin/api/command") &&
        request.method() === "POST" &&
        request.postDataJSON()?.type === "togglePrizeWon" &&
        response.status() === 404
      );
    });
    await stalePrizeSwitch.focus();
    await page.keyboard.press("Space");
    await failedToggleResponse;

    await expect(page.getByText("景品状態の更新に失敗しました。", { exact: true })).toBeVisible();
    await expect(stalePrizeSwitch).toHaveCount(0);
    expect(stateGetStatuses).toEqual([200]);
  } finally {
    if (createdPrizeId !== null) {
      const cleanupStatus = await page.evaluate(async (id) => {
        const response = await fetch("/admin/api/command", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ type: "deletePrize", id }),
        });
        return response.status;
      }, createdPrizeId);
      expect([200, 404]).toContain(cleanupStatus);
    }
  }
});
