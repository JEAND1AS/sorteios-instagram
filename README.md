# Entre Nós

Sorteios para a família em português do Brasil, com Next.js, TypeScript, Tailwind CSS, PrimeReact, Drizzle e PostgreSQL/Supabase. Inclui amigo oculto, sorteio simples e divisão de times. Os resultados são consultados no site. Não há envio por email, SMS ou WhatsApp nem serviços de mensagens para configurar.

## Fluxo

1. O organizador cria o evento e guarda o acesso privado de administração.
2. Compartilha o convite `/convite/<slug>` com a família.
3. Cada pessoa cadastra **nome completo, email e celular com DDD**, todos obrigatórios, e suas preferências de presente.
4. O organizador fecha as inscrições. O prazo também fecha a lista automaticamente, mas não começa o sorteio.
5. Com pelo menos três participantes, o organizador clica em **Começar sorteio** e confirma digitando `COMEÇAR`.
6. Cada participante reabre o **mesmo convite**, escolhe **Já estou cadastrado** e entra usando **nome + email + celular OU apenas seu código de 4 números**.
7. Toca em **Sortear meu amigo**. O nome aparece imediatamente. Em sorteio simples e times, o botão mostra o resultado individual daquele tipo.
8. Voltar ou clicar novamente mostra o mesmo resultado. A página do organizador acompanha quem já visualizou, sem listar os pares.

O primeiro clique de um participante cria uma combinação válida para toda a turma dentro de uma transação. Só o resultado correspondente ao acesso é revelado. Isso evita nomes repetidos, autoatribuição e o último participante ficar sem alternativa. Restrições de pares valem nos dois sentidos. Se não existir solução, o início é recusado sem salvar resultados parciais.

**Duas formas alternativas de identificação:** nome, email e celular são comparados ao cadastro, ou o participante informa somente o código de quatro números gerado pelo site. O código é exclusivo dentro de cada evento, pode começar com zero, aparece na confirmação do cadastro e na própria página pessoal, e não aparece no painel do organizador. Inscrições antigas ou adicionadas manualmente recebem um código ao entrar pela primeira vez com os dados.

O código é derivado com HMAC e uma chave do servidor; somente um identificador HMAC é armazenado para localizar a inscrição, sem o código em texto puro no banco. A reserva usa bloqueio transacional do evento e índice único para impedir repetições. O endpoint limita tentativas por IP e evento, incluindo oito acessos por código por hora. O código é curto e funciona como alternativa de conveniência; não há confirmação de posse por email/SMS ou OTP. Quem conhecer o código **ou** os três dados pode acessar a participação. Por isso, o código alternativo não impede que um organizador que conhece os contatos use a entrada pelos dados.

## Rodar localmente

Pré-requisito: Node.js **22 LTS** e npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem `DATABASE_URL`, o desenvolvimento usa PostgreSQL embarcado (PGlite) em `.data/postgres`. Os diretórios e tabelas são criados automaticamente. Os dados persistem entre reinícios. Não execute duas instâncias sobre o mesmo diretório de banco local.

## Conectar seu Supabase

1. No projeto Supabase, clique em **Connect → Transaction pooler** e copie a conexão da porta **6543** para `DATABASE_URL`.
2. Substitua o exemplo de senha pela senha real do banco, **sem os colchetes**. Codifique caracteres especiais: `@` vira `%40`, `#` vira `%23` e `%` vira `%25`. A URL começa com `postgresql://`, não com `https://`.
3. Opcionalmente, copie a conexão **Session pooler** da porta **5432** para `DIRECT_URL`, usando a mesma senha. Ela é usada somente pelo comando de migração.
4. Gere duas chaves independentes com `npm run keys` e coloque os valores em `TOKEN_SECRET` e `DRAW_ENCRYPTION_KEY`. Não publique nem compartilhe `.env.local`.
5. Valide a conexão e aplique as migrações:

```bash
npm run db:check
npm run db:migrate
npm run dev
```

O script `db:check` faz somente `SELECT 1` e não exibe credenciais. `node scripts/check-db.mjs --fix` pode corrigir os delimitadores do exemplo, codificar a senha e preencher uma senha de exemplo em `DIRECT_URL` usando a senha da conexão da aplicação. Ele só salva o arquivo depois de validar as duas conexões e se o arquivo não tiver sido alterado durante a verificação.

O driver valida a cadeia TLS e o hostname do Supabase com os certificados padrão do Node e o certificado público oficial em `certs/supabase-ca.crt`. Não é usado `rejectUnauthorized: false`. O certificado foi obtido do [repositório de downloads do Supabase](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). Consulte a [documentação de SSL](https://supabase.com/docs/guides/platform/ssl-enforcement) se o provedor atualizar seu certificado.

As migrações atuais são idempotentes, aplicadas em ordem e em uma única transação:

- `0001_init.sql`: estrutura inicial.
- `0002_supabase_security.sql`: ativa RLS e revoga acesso de `anon`, `authenticated` e `PUBLIC` às tabelas.
- `0003_participant_access.sql`: separa o início do sorteio do fechamento e mantém compatibilidade com registros anteriores.
- `0004_access_code.sql`: identificador e índice único dos códigos alternativos de acesso.

O navegador acessa somente as API routes do Next.js. Não habilite policies públicas para as tabelas. Use a conexão PostgreSQL de servidor fornecida pelo Supabase; não são necessárias chaves `anon`, `publishable` ou `service_role` no frontend.

Os campos e tabelas antigos de entrega permanecem no banco por compatibilidade, sem uso pelo aplicativo. A atualização não apaga eventos nem dados históricos. Eventos que já foram sorteados continuam acessíveis. Inscrições antigas sem email ou celular precisam ter os dados completados para permitir a identificação pelo convite.

Apontar `DATABASE_URL` para o Supabase não transfere os eventos criados no banco local. Preserve `.data` se ainda precisar desses dados.

## Publicar na Vercel Hobby

1. Suba o código para um repositório pessoal, sem `.env.local` ou `.data`.
2. Importe na Vercel com preset Next.js, raiz do repositório e Node.js 22.x.
3. Use `npm ci` na instalação e `npm run build` no build.
4. Configure as variáveis de servidor abaixo e aplique as migrações no Supabase antes de liberar o site.
5. Publique e teste o fluxo com três participantes.

| Variável              | Valor                                                  |
| --------------------- | ------------------------------------------------------ |
| `DATABASE_URL`        | Transaction pooler do Supabase, porta 6543             |
| `DIRECT_URL`          | Opcional: Session pooler, porta 5432, para migrações   |
| `APP_URL`             | URL HTTPS do site, sem barra final                     |
| `TOKEN_SECRET`        | Chave de 64 caracteres hexadecimais                    |
| `DRAW_ENCRYPTION_KEY` | Outra chave independente de 64 caracteres hexadecimais |

Nunca use o prefixo `NEXT_PUBLIC_` para essas credenciais. Não são necessárias variáveis SMTP, Brevo, email ou WhatsApp. Guarde as duas chaves: trocar a primeira invalida links e códigos pessoais; trocar a segunda impede ler resultados antigos.

A Vercel Hobby atende ao uso pessoal e não comercial. Use um projeto Supabase Free para evitar cobrança. O Supabase pode pausar projetos com pouca atividade por sete dias: antes de compartilhar um convite depois de um período parado, abra o painel e use **Resume project**, se necessário. Não há cron ou mecanismo de manutenção artificial de atividade. Veja os limites nos sites da [Vercel](https://vercel.com/docs/plans/hobby) e do [Supabase](https://supabase.com/pricing).

O site também pode ser hospedado como aplicação Node.js usando `npm run build` e `npm start`. Uma futura mudança para Discloud ou outro provedor não exige trocar o PostgreSQL, desde que a hospedagem suporte a versão de Node e o Next.js utilizados.

## PrimeReact e personalização

O tema atual é `lara-light-green`, importado em `src/app/layout.tsx`. O provider e a localização em português estão em `src/components/providers.tsx`. Os componentes compartilhados `Button` e `DateTimeInput` estão em `src/components/controls.tsx`; o segundo usa `Calendar` com data e hora. Formulários usam também `InputText` e `InputTextarea`.

Para trocar o visual, altere o tema do PrimeReact e as variáveis de cor e classes em `src/app/globals.css`. Os calendários usam o fuso do navegador ao preencher; os horários do evento são exibidos no fuso de Brasília.

## Testes

```bash
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Os testes de navegador usam uma cópia temporária do site e um banco isolado na porta 3100. Não leem seu `.env.local` e não alteram o banco Supabase. Em Linux sem as bibliotecas do Chromium, siga a orientação do Playwright para instalar as dependências do navegador.

## Regras e privacidade

- Até 200 participantes, com nome, email e celular obrigatórios. Email e telefone não podem se repetir no mesmo evento.
- Após **Começar sorteio**, participantes e restrições ficam bloqueados mesmo antes do primeiro sorteio individual.
- **Reabrir inscrições** após o início exige `REABRIR E INVALIDAR`, prazo futuro e um novo começo.
- **Reiniciar sorteio** exige `REFAZER SORTEIO`, apaga resultados e exige clicar em Começar novamente.
- **Encerrar** bloqueia o evento. **Excluir** remove evento, participantes, restrições e resultados por cascata.
- Resultados são criptografados com AES-256-GCM e associados ao evento, participante e versão. A API do painel não retorna resultados, tokens pessoais ou ciphertexts.
- O dono da infraestrutura, com o banco e a chave de criptografia, pode tecnicamente ler os resultados. O modelo de identificação por três dados também tem a limitação descrita acima.
- Links pessoais são chaves de acesso. Podem ficar salvos no navegador e nos logs da hospedagem. O aplicativo usa `Referrer-Policy: no-referrer`, respostas de API sem cache e não usa analytics.
- Não há envio de resultados ou acessos por qualquer canal externo, nem logs de mensagens com tokens.
# sorteios-instagram
