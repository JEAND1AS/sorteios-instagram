import Link from 'next/link';
import { PageTop } from '@/components/ui';
export const metadata = { title: 'Como funciona' };
export default function Page() {
  return (
    <div className="container prose page-space">
      <PageTop
        eyebrow="SIMPLES PARA A FAMÍLIA TODA"
        title="Um convite, cada um com sua surpresa."
      />
      <h2>1. Crie e compartilhe.</h2>
      <p>
        O organizador cria o evento, define os combinados e compartilha o convite com a turma. O
        link privado de administração fica guardado só com ele.
      </p>
      <h2>2. A turma se cadastra.</h2>
      <p>
        Cada pessoa informa nome completo, email e celular com DDD. Os três dados são obrigatórios e
        serão usados para identificar a participação quando ela voltar ao convite. As preferências
        de presente são opcionais.
      </p>
      <h2>3. Feche a lista e comece.</h2>
      <p>
        Depois de todos se cadastrarem, o organizador fecha as inscrições e clica em{' '}
        <strong>Começar sorteio</strong>. É preciso ter pelo menos três participantes. O fim do
        prazo fecha a lista, mas ainda é necessário clicar para começar.
      </p>
      <h2>4. Volte pelo mesmo convite.</h2>
      <p>
        O participante reabre o link, escolhe <strong>Já estou cadastrado</strong> e informa o mesmo
        nome, email e celular, ou usa apenas o código de 4 números mostrado no cadastro. Depois de
        entrar, toca em <strong>Sortear meu amigo</strong> e o nome aparece na hora.
      </p>
      <h2>5. Guarde a surpresa.</h2>
      <p>
        O resultado fica salvo e não muda ao consultar novamente. Não há envio por email, SMS ou
        WhatsApp. O painel acompanha quem já viu o resultado, sem mostrar os pares.
      </p>
      <p>
        Essa identificação não confirma a posse do email ou do celular. Quem souber os três dados ou
        o código poderá acessar aquela participação. Veja os detalhes em{' '}
        <Link href="/privacidade">Privacidade</Link>.
      </p>
      <Link href="/novo" className="button">
        Criar meu evento
      </Link>
    </div>
  );
}
