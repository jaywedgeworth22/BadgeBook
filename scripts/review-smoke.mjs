import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const errors = [];
async function shot(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}`, fullPage: false });
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (err) => errors.push(String(err?.message || err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: /continue|open my address book/i }).waitFor({ timeout: 15000 });
  for (let i = 0; i < 4; i += 1) {
    const open = page.getByRole("button", { name: /open my address book/i });
    if (await open.count()) {
      await open.click();
      break;
    }
    const cont = page.getByRole("button", { name: /^continue$/i });
    if (await cont.count()) await cont.click();
    await page.waitForTimeout(200);
  }
  await page.getByRole("heading", { name: /contacts/i }).waitFor({ timeout: 10000 });

  await shot(page, "crest-home.png");

  const fill = page.getByRole("button", { name: /fill/i }).first();
  if (await fill.count()) await fill.click();
  else await page.getByText("Fill company photos").click();
  await page.waitForTimeout(400);
  await shot(page, "crest-scan-ready.png");

  const scan = page.getByRole("button", { name: /scan \d+/i });
  await scan.click();
  await page.getByRole("button", { name: /approve/i }).waitFor({ timeout: 120000 });
  await page.waitForTimeout(400);
  await shot(page, "crest-review.png");

  const body = await page.locator("body").innerText();
  const hasApprove = /approve/i.test(body);
  const hasRetry = /try another/i.test(body);
  const hasUpload = /upload/i.test(body);
  const hasSkip = /skip/i.test(body);

  await page.getByRole("button", { name: /approve/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "crest-review-next.png");

  console.log(
    JSON.stringify({ errors, hasApprove, hasRetry, hasUpload, hasSkip, bodySnippet: body.slice(0, 400) }, null, 2),
  );
  if (errors.length) process.exit(2);
  if (!hasApprove || !hasRetry || !hasUpload || !hasSkip) process.exit(3);
  process.exit(0);
} catch (err) {
  console.error(String(err?.message || err));
  process.exit(1);
} finally {
  await browser.close();
}
