import { test, expect, type Locator, type Page } from '@playwright/test';

async function expectCentered(dialog: Locator, page: Page) {
  await expect(dialog).toBeVisible();
  await expect(async () => {
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - viewport!.width / 2)).toBeLessThan(3);
    expect(Math.abs(box!.y + box!.height / 2 - viewport!.height / 2)).toBeLessThan(3);
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.y).toBeGreaterThanOrEqual(8);
  }).toPass();
}

test('convite compartilhado, cadastro, fechamento, começo e identificação em outro dispositivo', async ({
  page,
  browser,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Criar meu sorteio', exact: true }).click();
  await page.getByLabel('Nome do evento *', { exact: true }).fill('Amigo oculto da família');
  await page.getByLabel('Quem está organizando? *', { exact: true }).fill('Marina');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const future = (days: number) =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(Date.now() + days * 86400000),
    );
  await page.getByLabel('Inscrições até: data', { exact: true }).fill(future(10));
  await page.getByLabel('Inscrições até: hora', { exact: true }).selectOption('18');
  await page.getByLabel('Inscrições até: minutos', { exact: true }).selectOption('05');
  await page.getByLabel('Data e hora do encontro: data', { exact: true }).fill(future(15));
  await page.getByLabel('Data e hora do encontro: hora', { exact: true }).selectOption('19');
  await page.getByLabel('Data e hora do encontro: minutos', { exact: true }).selectOption('30');
  await expect(page.locator('input[type="date"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const creation = page.waitForResponse(
    (r) => r.url().endsWith('/api/events') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Criar meu sorteio', exact: true }).click();
  const created = (await (await creation).json()) as { adminPath: string; invitePath: string };
  await expect(page.getByRole('heading', { name: 'Seu encontro já tem lugar.' })).toBeVisible();
  const people = [
    ['Ana Souza', 'ana@example.com', '11999990001'],
    ['Bruno Lima', 'bruno@example.com', '11999990002'],
    ['Carla Ramos', 'carla@example.com', '11999990003'],
  ];
  const links: string[] = [];
  const accessCodes: string[] = [];
  for (const [index, [name, email, phone]] of people.entries()) {
    if (index === 0) await page.goto(created.invitePath);
    await page.getByLabel('Nome completo *', { exact: true }).fill(name);
    await page.getByLabel('Email *', { exact: true }).fill(email);
    await page.getByLabel('Celular com DDD *', { exact: true }).fill(phone);
    const response = page.waitForResponse(
      (r) => r.url().includes('/api/invite/') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Confirmar minha participação' }).click();
    const result = await response;
    expect(result.status()).toBe(201);
    const registration = await result.json();
    links.push(registration.personalPath);
    accessCodes.push(registration.accessCode);
    await expect(page.getByRole('heading', { name: 'Presença confirmada!' })).toBeVisible();
    if (index < people.length - 1) {
      await page.getByRole('button', { name: 'Cadastrar outra pessoa', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Vem fazer parte.' })).toBeVisible();
    }
  }
  await page.goto(created.adminPath);
  await page.getByRole('tab', { name: 'Combinados', exact: true }).click();
  await expect(page.getByLabel('Inscrições até: data', { exact: true })).toHaveValue(future(10));
  await expect(page.getByLabel('Inscrições até: hora', { exact: true })).toHaveValue('18');
  await expect(page.getByLabel('Inscrições até: minutos', { exact: true })).toHaveValue('05');
  await page.getByLabel('Data e hora do encontro: minutos', { exact: true }).selectOption('35');
  await page.getByRole('button', { name: 'Salvar combinados', exact: true }).click();
  await expect(page.getByText('Alteração salva.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Combinados', exact: true }).click();
  await expect(page.getByLabel('Data e hora do encontro: minutos', { exact: true })).toHaveValue(
    '35',
  );
  await page.getByRole('tab', { name: 'Participantes', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
  const dialog = page.getByRole('dialog');
  await expectCentered(dialog, page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCentered(dialog, page);
  await page.screenshot({ path: 'test-results/adicionar-pessoa-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog.getByLabel('Nome completo *', { exact: true }).fill('Diego Costa');
  await dialog.getByLabel('Email *', { exact: true }).fill('diego@example.com');
  await dialog.getByLabel('Celular com DDD *', { exact: true }).fill('11999990004');
  await dialog.getByRole('button', { name: 'Adicionar participante' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('tab', { name: 'Restrições', exact: true }).click();
  await page.getByLabel('Primeira pessoa').selectOption({ label: 'Ana Souza' });
  await page.getByLabel('Segunda pessoa').selectOption({ label: 'Bruno Lima' });
  await page.getByRole('button', { name: 'Adicionar restrição' }).click();
  await expect(page.locator('.restriction-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fechar inscrições', exact: true }).click();
  await expect(page.getByText('Inscrições encerradas', { exact: true })).toBeVisible();
  await page.goto(links[0]);
  await expect(page.getByRole('button', { name: 'Sortear meu amigo', exact: true })).toHaveCount(0);
  await expect(page.getByText(/Aguarde o organizador fechar/)).toBeVisible();
  await page.goto(created.adminPath);
  await page.getByRole('button', { name: 'Começar sorteio', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expectCentered(confirmation, page);
  await expect(confirmation.getByRole('heading', { name: 'Começar o sorteio?' })).toBeVisible();
  await expect(confirmation.getByRole('textbox')).toHaveCount(0);
  await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Começar sorteio', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Começar sorteio', exact: true }).click();
  // Uma falha mantém a janela aberta e permite tentar novamente.
  await page.route('/api' + created.adminPath, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ status: 500, json: { error: 'Falha temporária. Tente novamente.' } });
    await page.unroute('/api' + created.adminPath);
  });
  await confirmation.getByRole('button', { name: 'Começar sorteio', exact: true }).click();
  await expect(confirmation).toContainText('Falha temporária. Tente novamente.');
  await confirmation.getByRole('button', { name: 'Começar sorteio', exact: true }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(page.getByText('Sorteio liberado', { exact: true })).toBeVisible();
  const participantContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const visitor = await participantContext.newPage();
  visitor.on('pageerror', (e) => errors.push(e.message));
  await visitor.goto(created.invitePath);
  await expect(visitor.getByRole('tab', { name: 'Já estou cadastrado' })).toBeVisible();
  await visitor.getByLabel('Nome completo *', { exact: true }).fill('Ana Souza');
  await visitor.getByLabel('Email *', { exact: true }).fill('ana@example.com');
  await visitor.getByLabel('Celular com DDD *', { exact: true }).fill('11999998888');
  await visitor.getByRole('button', { name: 'Entrar na minha página' }).click();
  await expect(visitor.locator('.notice-error')).toContainText('dados ou o código');
  await visitor.getByLabel('Celular com DDD *', { exact: true }).fill('(11) 99999-0001');
  await visitor.getByRole('button', { name: 'Entrar na minha página' }).click();
  await expect(visitor).toHaveURL(/\/participante\//);
  await expect(
    visitor.getByRole('link', { name: 'Voltar ao convite', exact: true }),
  ).toHaveAttribute('href', created.invitePath);
  await visitor.goto(created.invitePath);
  await visitor.getByRole('button', { name: 'Usar meu código', exact: true }).click();
  await visitor.getByLabel('Código de acesso *', { exact: true }).fill(accessCodes[0]);
  await visitor.getByRole('button', { name: 'Entrar na minha página' }).click();
  await expect(visitor).toHaveURL(/\/participante\//);
  await visitor.getByRole('button', { name: 'Sortear meu amigo', exact: true }).click();
  await expect(visitor.locator('.result-card h2')).toHaveText(/Carla Ramos|Diego Costa/);
  const name = await visitor.locator('.result-card h2').innerText();
  await visitor.reload();
  await visitor.getByRole('button', { name: 'Ver meu amigo novamente' }).click();
  await expect(visitor.locator('.result-card h2')).toHaveText(name);
  await expect(
    visitor.getByRole('button', { name: /WhatsApp|email|Reenviar|Enviar pendentes/i }),
  ).toHaveCount(0);
  await visitor.screenshot({ path: 'test-results/resultado-mobile.png', fullPage: true });
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  const admin = await (await request.get('/api' + created.adminPath)).json();
  expect(admin).not.toHaveProperty('quota');
  for (const person of admin.participants) {
    expect(person).not.toHaveProperty('result');
    expect(person).not.toHaveProperty('nonce');
    expect(person).not.toHaveProperty('delivery');
  }
  await page.goto(created.adminPath);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Visualizou', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/painel-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await participantContext.close();
  expect(errors).toEqual([]);
});
test('telas principais e calendários cabem no celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/', '/novo', '/como-funciona', '/privacidade', '/meus-eventos']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Overflow em ' + path,
    ).toBe(true);
  }
});

test('esquecer atalho no celular permite cancelar ou confirmar sem digitar', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'entre-nos-events',
      JSON.stringify([
        {
          name: 'Encontro da turma',
          adminPath: '/admin/teste-swal',
          invitePath: '/convite/teste-swal',
          createdAt: new Date().toISOString(),
        },
      ]),
    );
  });
  await page.goto('/meus-eventos');
  await page.getByRole('button', { name: 'Esquecer este atalho' }).click();
  const confirmation = page.getByRole('dialog');
  await expectCentered(confirmation, page);
  await expect(confirmation.getByRole('textbox')).toHaveCount(0);
  await expect(confirmation.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/confirmacao-mobile.png', fullPage: true });
  await confirmation.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('heading', { name: 'Encontro da turma' })).toBeVisible();
  await page.getByRole('button', { name: 'Esquecer este atalho' }).click();
  await confirmation.getByRole('button', { name: 'Esquecer atalho', exact: true }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'A próxima boa história é sua.' })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('entre-nos-events') || '[]')),
  ).toEqual([]);
});

test('datas no celular bloqueiam dias passados e oferecem minutos de cinco em cinco', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/novo');
  await page.getByLabel('Nome do evento *', { exact: true }).fill('Festa da turma');
  await page.getByLabel('Quem está organizando? *', { exact: true }).fill('Marina');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const { today, yesterday } = await page.evaluate(() => {
    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { today: format(now), yesterday: format(yesterday) };
  });
  for (const label of ['Inscrições até', 'Data e hora do encontro']) {
    const date = page.getByLabel(`${label}: data`, { exact: true });
    await expect(date).toHaveAttribute('min', today);
    await date.fill(yesterday);
    await expect(date).toHaveValue('');
    await date.fill(today);
    await expect(date).toHaveValue(today);
    const minutes = page.getByLabel(`${label}: minutos`, { exact: true });
    expect(
      await minutes
        .locator('option:not([disabled])')
        .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value)),
    ).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
    await page.getByLabel(`${label}: hora`, { exact: true }).selectOption('23');
    await minutes.selectOption('55');
    await expect(date).toHaveValue(today);
  }
  await page.getByRole('group', { name: 'Inscrições até', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/datas-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
