import { test, expect } from "@playwright/test";

// TODO: Clerk signed-in onboarding (dashboard approved/waitlist) is out of
// scope for e2e — it needs a seeded Clerk session. Those paths are covered by
// the useOnboarding unit tests instead.

test("anonymous landing tour: auto-start, persistence, help button, ESC", async ({
  page,
}) => {
  // Fresh Playwright context starts with empty localStorage ("cleared").
  await page.goto("/");

  const popover = page.locator(".driver-popover");
  await expect(popover).toBeVisible();

  // Click "Next" through every landing step; the final button reads "Got it".
  // Wait briefly between clicks so driver.js finishes each transition.
  for (let i = 0; i < 12; i += 1) {
    const next = page.locator(".driver-popover-next-btn");
    if ((await next.count()) === 0) {
      break;
    }
    const label = (await next.textContent())?.trim();
    // force: the driver.js spotlight animates continuously, so skip the
    // actionability "stable" wait.
    await next.click({ force: true });
    await page.waitForTimeout(350);
    if (label === "Got it") {
      break;
    }
  }

  // Finishing removes the popover from the DOM.
  await expect(popover).toHaveCount(0);

  // Reload — the tour must NOT auto-appear again (completion persisted).
  await page.reload();
  await page.waitForTimeout(1600); // past the Clerk-load grace window
  await expect(page.locator(".driver-popover")).toHaveCount(0);

  // The "?" help button re-opens the tour.
  await page.getByTestId("onboarding-help-button").click();
  await expect(page.locator(".driver-popover")).toBeVisible();

  // ESC dismisses it.
  await page.keyboard.press("Escape");
  await expect(page.locator(".driver-popover")).toHaveCount(0);
});
