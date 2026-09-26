import { expect, test } from "@playwright/test";

test("root redirects to the resume library shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/resumes$/);
  await expect(page.getByRole("heading", { name: "My Resumes" })).toBeVisible();
});
