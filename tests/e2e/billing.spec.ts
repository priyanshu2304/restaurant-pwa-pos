import { test, expect } from '@playwright/test';

test('CSV upload -> add items -> finalize -> print preview shows totals', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.fill('input[maxlength="4"]', '0000');
  await page.click('text=Enter');

  await page.click('text=CSV Upload');
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('input[type="file"]');
  const fc = await fileChooserPromise;
  await fc.setFiles('sample-menu.csv');
  await page.click('text=Upload');
  await expect(page.getByText('Imported OK', { exact: false })).toBeVisible();

  await page.click('text=Billing');

  await page.fill('input[placeholder="Item ID"]', '101');
  await page.fill('input[placeholder="Qty"]', '2');
  await page.click('text=Add');

  await page.fill('input[placeholder="Item ID"]', '103');
  await page.fill('input[placeholder="Qty"]', '3');
  await page.click('text=Add');

  await expect(page.getByText('Grand Total')).toBeVisible();
  await expect(page.getByText('₹405', { exact: false })).toBeVisible();

  await page.click('text=Finalize & Print');
  await expect(page.getByText(/Inv:/)).toBeVisible();
  await expect(page.getByText(/Grand Total/)).toBeVisible();
  await expect(page.getByText(/405/)).toBeVisible();
});
