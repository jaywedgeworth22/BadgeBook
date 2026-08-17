import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (err) => errors.push(String(err?.message || err)));

  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
  await page.getByRole("button", { name: /continue|open my address book/i }).waitFor({ timeout: 15000 });
  for (let i = 0; i < 4; i += 1) {
    const open = page.getByRole("button", { name: /open my address book/i });
    if (await open.count()) {
      await open.click();
      break;
    }
    const cont = page.getByRole("button", { name: /^continue$/i });
    if (await cont.count()) await cont.click();
    await page.waitForTimeout(180);
  }
  await page.getByRole("heading", { name: /contacts/i }).waitFor();
  await page.getByRole("button", { name: /^fill$/i }).click();
  await page.getByRole("button", { name: /scan \d+/i }).click();
  await page.getByRole("button", { name: /approve/i }).waitFor({ timeout: 120000 });

  // skip to Delta if needed
  for (let i = 0; i < 6; i += 1) {
    const body = await page.locator("body").innerText();
    if (/delta/i.test(body)) break;
    const skip = page.getByRole("button", { name: /skip this one/i });
    if (await skip.count()) await skip.click();
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: "/workspace/screenshots/delta-before-upload.png" });
  const before = await page.locator("body").innerText();

  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.setInputFiles("/workspace/screenshots/delta-tri.png");
  await page.locator("p", { hasText: /approved — this is how it will look/i }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/delta-after-upload.png" });
  const after = await page.locator("body").innerText();
  const stayed = /delta/i.test(after) && /approved — this is how it will look/i.test(after);
  const jumped = /stripe|home depot|tesla/i.test(after) && !/delta/i.test(after);

  await page.getByRole("button", { name: /next company|finish/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/after-next.png" });

  await page.getByRole("button", { name: /^settings$/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/workspace/screenshots/settings-backup.png" });
  const settings = await page.locator("body").innerText();

  console.log(
    JSON.stringify(
      {
        errors,
        stayed,
        jumped,
        beforeName: before.split("\n").slice(0, 8),
        afterSnippet: after.slice(0, 280),
        hasBackup: /last backup/i.test(settings),
        hasImport: /import contact card/i.test(settings),
      },
      null,
      2,
    ),
  );
  if (errors.length) process.exit(2);
  if (!stayed || jumped) process.exit(3);
  if (!/last backup/i.test(settings)) process.exit(4);
  process.exit(0);
} catch (err) {
  console.error(String(err?.message || err));
  process.exit(1);
} finally {
  await browser.close();
}
