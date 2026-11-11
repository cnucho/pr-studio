import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const output = process.argv[2];
if (!output) throw new Error('Output directory required');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await context.addInitScript(() => sessionStorage.setItem('conjoint.centralSessionToken', `session_${'a'.repeat(32)}`));
const page = await context.newPage();
await page.route('http://127.0.0.1:9999/**', async route => {
  const pathname = new URL(route.request().url()).pathname;
  if (pathname === '/api/v1/my/projects') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [
      { id: '11111111-1111-4111-8111-111111111111', name: '사용법 시연 프로젝트', projectKey: 'DEMO-001' },
    ] }) });
  } else {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  }
});

async function shot(name, action) {
  if (action) await action();
  await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' });
  console.log(name);
}

await page.goto('http://127.0.0.1:4177/', { waitUntil: 'networkidle' });
await shot('01-workspace');
await page.getByRole('button', { name: '내 프로젝트 불러오기' }).click();
await shot('02-project', () => page.getByLabel('접근 가능한 프로젝트').scrollIntoViewIfNeeded());
await shot('03-card-xlsx', () => page.getByText('카드 엑셀 읽기').scrollIntoViewIfNeeded());
await shot('04-profile-long', () => page.getByText('단일 profile-long CSV 자동 변환').scrollIntoViewIfNeeded());
await shot('05-four-files', () => page.getByLabel('정규화 자료 4개 한 번에 선택').scrollIntoViewIfNeeded());
await page.getByRole('button', { name: 'Design', exact: true }).click();
await shot('06-design', () => page.getByText('새 실험 설계 생성').scrollIntoViewIfNeeded());
await page.getByRole('button', { name: 'Tasks', exact: true }).click();
await shot('07-tasks', () => page.getByRole('heading', { name: '실제 설문 문항과 선택 카드' }).scrollIntoViewIfNeeded());
await page.getByRole('button', { name: 'Analysis', exact: true }).click();
await shot('08-analysis', () => page.getByRole('heading', { name: '분석 결과' }).scrollIntoViewIfNeeded());
await page.getByRole('button', { name: 'Report', exact: true }).click();
await shot('09-report', () => page.getByRole('heading', { name: '결과 해석과 보고서' }).scrollIntoViewIfNeeded());
await shot('10-jobs', () => page.getByRole('heading', { name: '설계·분석 계산 작업' }).scrollIntoViewIfNeeded());
await shot('11-simulator', () => page.getByRole('heading', { name: '연구자 시장 시뮬레이터' }).scrollIntoViewIfNeeded());

await page.goto('http://127.0.0.1:4177/prototype', { waitUntil: 'networkidle' });
await shot('12-prototype-design');
await page.getByRole('button', { name: '응답자 모바일' }).click();
await shot('13-prototype-respondent');
await page.getByRole('button', { name: '시장 시뮬레이터' }).click();
await shot('14-prototype-simulator');

await browser.close();
