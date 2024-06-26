import { expect, test, galata } from '@jupyterlab/galata';
import path from 'path';

test.use({ autoGoto: false });

test.describe('UI Test', () => {
  const fileList = ['A320.vsp3'];

  test.describe('Extension activation test', () => {
    test('should emit an activation console message', async ({
      page,
      request
    }) => {
      const logs: string[] = [];

      page.on('console', message => {
        logs.push(message.text());
      });

      await page.goto();

      expect(
        logs.filter(s => s === 'jupytercad_openvsp:plugin is activated!')
      ).toHaveLength(1);
    });
  });

  test.describe('File rendering test', () => {
    test.beforeAll(async ({ request }) => {
      const content = galata.newContentsHelper(request);
      await content.deleteDirectory('/examples');
      await content.uploadDirectory(
        path.resolve(__dirname, '../../examples'),
        '/examples'
      );
    });
    let errors = 0;
    test.beforeEach(async ({ page }) => {
      page.setViewportSize({ width: 1920, height: 1080 });
      page.on('console', message => {
        if (message.type() === 'error') {
          errors += 1;
        }
      });
    });

    test.afterEach(async ({ page }) => {
      errors = 0;
    });

    for (const file of fileList) {
      test(`Should be able to render ${file} without error`, async ({
        page
      }) => {
        await page.goto();
        const fullPath = `examples/${file}`;
        await page.notebook.openByPath(fullPath);
        await page.notebook.activate(fullPath);
        await page.locator('div.jpcad-Spinner').waitFor({ state: 'hidden' });

        await page
          .getByRole('tablist', { name: 'main sidebar' })
          .getByRole('tab', { name: 'JupyterCad Control Panel' })
          .click();
        await page
          .getByRole('tablist', { name: 'alternate sidebar' })
          .getByRole('tab', { name: 'JupyterCad Control Panel' })
          .click();
        await page.waitForTimeout(1000);
        const main = await page.$('#jp-main-split-panel');
        expect(errors).toBe(0);
        if (main) {
          expect(await main.screenshot()).toMatchSnapshot({
            name: `Render-${file}.png`,
            maxDiffPixelRatio: 0.01
          });
        }
      });
    }
  });
});
