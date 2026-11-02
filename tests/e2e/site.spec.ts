import { test, expect } from '@playwright/test';
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
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .format(new Date(Date.now() + days * 86400000))
      .replace(',', '');
  const deadline = page.getByLabel(/^Inscrições até/);
  await deadline.fill(future(10));
  await deadline.press('Tab');
  const exchange = page.getByLabel(/^Data e hora do encontro/);
  await exchange.fill(future(15));
  await exchange.press('Tab');
  await expect(page.locator('.p-calendar')).toHaveCount(2);
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
  for (const [name, email, phone] of people) {
    await page.goto(created.invitePath);
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
  }
  await page.goto(created.adminPath);
  await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
  const dialog = page.getByRole('dialog');
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
  await page.getByRole('dialog').getByRole('textbox').fill('COMEÇAR');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
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
