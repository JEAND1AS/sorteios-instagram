import { PageTop } from '@/components/ui';
export const metadata = { title: 'Privacidade e segurança' };
export default function Page() {
  return (
    <div className="container prose page-space">
      <PageTop eyebrow="TRANSPARÊNCIA SOBRE O ACESSO" title="Seus dados e sua participação." />
      <h2>Identificação pelo convite.</h2>
      <p>
        Para entrar novamente, informe o mesmo nome completo, email e celular usados no cadastro, ou
        apenas seu código de 4 números. O site gera o código no cadastro e também o exibe na página
        pessoal. Não há verificação por mensagem ou código de uso único. Quem conhecer os três dados
        ou o código pode acessar a participação, inclusive um organizador que conheça os dados de
        cadastro. Tentativas são limitadas no servidor. Esse modelo é pensado para uso familiar e
        não equivale a autenticação forte.
      </p>
      <h2>Quem vê os dados?</h2>
      <p>
        O organizador vê nomes, emails, celulares e preferências para gerenciar a lista. O painel
        não lista os pares nem fornece tokens pessoais. No amigo oculto, a página individual mostra
        o nome e as preferências da pessoa sorteada, sem expor seus contatos.
      </p>
      <h2>Resultado somente no site.</h2>
      <p>
        Não enviamos resultados ou acessos por email, SMS ou WhatsApp. Emails e celulares servem
        para identificação. A página só revela o resultado após uma ação explícita de sortear ou
        consultar; abrir o convite não conta como visualização.
      </p>
      <h2>Proteção dos resultados.</h2>
      <p>
        Os resultados são criptografados com AES-256-GCM e vinculados ao evento, participante e
        versão da rodada. Os dados ficam em PostgreSQL com acesso pelo servidor. O dono da
        infraestrutura, com a chave de criptografia e o banco, pode tecnicamente ler os resultados.
      </p>
      <h2>Links pessoais e navegador.</h2>
      <p>
        Quem tiver o link pessoal pode abrir a participação sem digitar os dados novamente. Guarde-o
        com cuidado. O navegador pode salvar o acesso para facilitar a volta pelo convite; em
        dispositivo compartilhado, confira o nome antes de continuar. Não usamos publicidade ou
        analytics de terceiros.
      </p>
      <h2>Alterações e exclusão.</h2>
      <p>
        Os dados podem ser editados enquanto as inscrições estiverem abertas. Depois do início,
        alterações na lista exigem reabertura e invalidação dos resultados. Reiniciar apaga os
        resultados atuais, inclusive os já vistos. Excluir o evento remove os dados do banco, mas
        não elimina capturas de tela nem backups externos do provedor.
      </p>
    </div>
  );
}
