import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";

const root = resolve("dist");
const server = createServer(async (request, response) => {
  const path = resolve(
    root,
    `.${new URL(request.url, "http://localhost").pathname}`,
  );
  if (path !== root && !path.startsWith(`${root}/`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const file = path === root ? resolve(root, "index.html") : path;
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
    };
    response.setHeader(
      "Content-Type",
      types[extname(file)] ?? "application/octet-stream",
    );
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  assert.equal(
    await page.getByRole("heading", { name: "Request queue" }).count(),
    1,
  );
  assert.equal(await page.locator("tbody tr").count(), 8);
  await mkdir("docs", { recursive: true });
  await page.screenshot({ path: "docs/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.match(await page.locator(".pagination").innerText(), /Page 2 of 3/);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  assert.equal(await page.locator("tbody tr").count(), 2);
  await page
    .getByRole("button", { name: "Next", exact: true })
    .isDisabled()
    .then((value) => assert.equal(value, true));
  await page.getByRole("textbox", { name: "Search requests" }).fill("MAYA");
  assert.equal(await page.locator("tbody tr").count(), 1);
  assert.match(page.url(), /q=MAYA/);
  await page.reload();
  assert.equal(
    await page.getByRole("textbox", { name: "Search requests" }).inputValue(),
    "MAYA",
  );
  await page
    .getByRole("button", {
      name: "Checkout returns to cart after address edit",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("In progress");
  await page
    .getByRole("dialog")
    .getByLabel("Internal note")
    .fill("Confirmed the address update scenario.");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  assert.match(
    await page.locator(".activity").innerText(),
    /Confirmed the address update scenario/,
  );
  await page.screenshot({ path: "docs/ticket.png", fullPage: true });
  await page
    .getByRole("button", { name: "Close ticket", exact: true })
    .press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  assert.equal(
    await page
      .getByRole("button", {
        name: "Checkout returns to cart after address edit",
        exact: true,
      })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.reload();
  assert.match(await page.locator("tbody").innerText(), /In progress/);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Select visible requests", exact: true })
    .check();
  await page.getByLabel("New status", { exact: true }).selectOption("Resolved");
  await page.getByRole("button", { name: "Apply status", exact: true }).click();
  assert.equal(await page.locator("tbody .status.resolved").count(), 8);
  await page
    .getByRole("textbox", { name: "Search requests" })
    .fill("No matching customer");
  assert.equal(
    await page.getByRole("heading", { name: "No matching requests" }).count(),
    1,
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Import JSON", exact: true }).click();
  await page.getByLabel("Workspace JSON").fill("{broken");
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  assert.match(await page.getByRole("alert").innerText(), /Invalid JSON/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export workspace/ }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.tickets.length, 18);
  await page
    .getByRole("button", { name: "Reset sample data", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep changes", exact: true }).click();
  assert.equal(await page.locator("tbody .status.resolved").count(), 8);
  await page
    .getByRole("button", { name: "Reset sample data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  assert.equal(await page.locator("tbody .status.resolved").count(), 0);
  await page.getByRole("button", { name: "Import JSON", exact: true }).click();
  await page.getByLabel("Workspace JSON").fill(JSON.stringify(exported));
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  assert.equal(await page.locator("tbody .status.resolved").count(), 8);
  await page.getByRole("heading", { name: "Request queue" }).click();
  await page.keyboard.press("/");
  assert.equal(
    await page
      .getByRole("textbox", { name: "Search requests" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobile.goto(url);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.screenshot({ path: "docs/mobile.png", fullPage: true });
  await mobile
    .getByRole("button", {
      name: "Checkout returns to cart after address edit",
      exact: true,
    })
    .click();
  assert.equal(await mobile.getByRole("dialog").isVisible(), true);
  const recovery = await browser.newPage();
  await recovery.addInitScript(() =>
    localStorage.setItem("support-desk-workbench:v1", "{broken"),
  );
  await recovery.goto(url);
  assert.match(
    await recovery.getByRole("alert").innerText(),
    /could not be loaded/,
  );
  assert.equal(
    await recovery.evaluate(() =>
      localStorage.getItem("support-desk-workbench:v1"),
    ),
    "{broken",
  );
  const blockedStorage = await browser.newPage();
  await blockedStorage.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
  });
  await blockedStorage.goto(url);
  await blockedStorage
    .getByRole("button", {
      name: "Checkout returns to cart after address edit",
      exact: true,
    })
    .click();
  await blockedStorage
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("Resolved");
  await blockedStorage.getByRole("alert").waitFor();
  assert.match(
    await blockedStorage.getByRole("alert").innerText(),
    /storage is unavailable/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: pagination, URL filters, ticket editing, notes, focus, persistence, bulk update, empty state, import/export, reset, keyboard shortcut, mobile layout, corrupt and blocked storage.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
