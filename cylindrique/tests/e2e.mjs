// Authenticated E2E against a LOCAL Supabase stack + the app on :3000.
// Mints the @supabase/ssr auth cookie with the library itself (correct format),
// injects it into Playwright, then drives the real flows watching for crashes.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
//     APP_URL=http://localhost:3000 node tests/e2e.mjs

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP = process.env.APP_URL || "http://localhost:3000";

let failures = 0;
const errors = [];
function check(label, cond) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`);
  if (!cond) failures++;
}

async function makeSessionCookies(email) {
  const admin = createClient(URL, SERVICE, {
    auth: { persistSession: false },
  });
  await admin.auth.admin
    .createUser({ email, password: "password123", email_confirm: true })
    .catch(() => {});
  // Sign in, letting @supabase/ssr serialize the exact cookies the app expects.
  const captured = [];
  const ssr = createServerClient(URL, ANON, {
    cookies: { getAll: () => [], setAll: (cs) => captured.push(...cs) },
  });
  const { error } = await ssr.auth.signInWithPassword({
    email,
    password: "password123",
  });
  if (error) throw error;
  await ssr.auth.getUser(); // ensure persisted
  return captured.map((c) => ({
    name: c.name,
    value: c.value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: -1,
  }));
}

(async () => {
  const cookies = await makeSessionCookies(`e2e-${Date.now()}@test.dev`);
  check("minted auth cookies", cookies.length > 0);

  const browser = await chromium.launch();
  const ctx = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  ctx.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  await ctx.context().addCookies(cookies);

  const goto = () =>
    ctx.goto(APP + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  for (let i = 0; i < 8; i++) {
    try {
      await goto();
      break;
    } catch {
      await ctx.waitForTimeout(2000);
    }
  }
  await ctx.waitForTimeout(3500);

  check("authenticated (not redirected to /login)", !ctx.url().includes("/login"));

  // Create the first team via the empty-state CTA.
  await ctx.getByRole("button", { name: /New workspace/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(600);
  await ctx.getByPlaceholder(/e\.g\. Marketing/i).fill("E2E Team").catch(async () => {
    await ctx.getByLabel(/Team name/i).fill("E2E Team").catch(() => {});
  });
  await ctx.getByRole("button", { name: /^Create team$/i }).click().catch(() => {});
  await ctx.waitForTimeout(2500);
  check("no crash after creating team", !(await crashed(ctx)));

  // Navigate every sidebar view; assert no crash + header updates.
  for (const item of ["Projects", "Notes", "Teams", "Members", "Invitations", "Profile", "Dashboard"]) {
    await ctx.getByRole("button", { name: new RegExp(`^${item}$`, "i") }).first().click().catch(() => {});
    await ctx.waitForTimeout(900);
    check(`view "${item}" renders without crash`, !(await crashed(ctx)));
  }

  // Create a project.
  await ctx.getByRole("button", { name: /^Projects$/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(500);
  await ctx.getByRole("button", { name: /New project/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(500);
  await ctx.getByPlaceholder(/Website redesign/i).fill("E2E Project").catch(() => {});
  await ctx.getByRole("button", { name: /^Create project$/i }).click().catch(() => {});
  await ctx.waitForTimeout(2000);
  const projVisible = await ctx.getByText("E2E Project").first().isVisible().catch(() => false);
  check("project created + visible", projVisible);

  // Create a note.
  await ctx.getByRole("button", { name: /^Notes$/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(400);
  await ctx.getByRole("button", { name: /New note/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(500);
  await ctx.getByPlaceholder(/Give it a name/i).fill("E2E Note").catch(() => {});
  await ctx.getByRole("button", { name: /^Create note$/i }).click().catch(() => {});
  await ctx.waitForTimeout(2000);
  check("no crash after creating note", !(await crashed(ctx)));
  // Comments section should be present in the opened note editor.
  const commentsVisible = await ctx.getByText(/^Comments/i).first().isVisible().catch(() => false);
  check("note editor shows Comments section", commentsVisible);

  // Open the invite dialog.
  await ctx.getByRole("button", { name: /^Members$/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(600);
  await ctx.getByRole("button", { name: /Invite people/i }).first().click().catch(() => {});
  await ctx.waitForTimeout(700);
  check("invite dialog opens without crash", !(await crashed(ctx)));

  console.log("\n=== PAGE ERRORS ===");
  console.log(errors.join("\n") || "none");
  console.log(
    failures === 0 && errors.length === 0
      ? "\nE2E PASSED ✅"
      : `\nE2E: ${failures} check failure(s), ${errors.length} page error(s) ❌`,
  );
  await browser.close();
  process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
})();

async function crashed(page) {
  const t = await page.evaluate(() => document.body.innerText).catch(() => "");
  return /couldn.?t load|application error|something went wrong|unhandled/i.test(t);
}
