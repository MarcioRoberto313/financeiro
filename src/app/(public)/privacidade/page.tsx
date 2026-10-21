import Link from "next/link";
import { APP_NAME, POLICY_UPDATED_AT, contactEmail } from "@/lib/site";

export const metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  const email = contactEmail();
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-muted">Última atualização: {POLICY_UPDATED_AT}</p>
      <p>
        Esta política explica quais dados o {APP_NAME} coleta, como eles são usados e quais são os seus direitos, de
        acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><b>Dados de cadastro:</b> nome e e-mail.</li>
        <li>
          <b>Senha:</b> guardada apenas como código protegido (hash bcrypt). Nós não conseguimos ver a sua senha.
        </li>
        <li>
          <b>Dados financeiros que você informa:</b> contas, categorias, lançamentos, orçamentos e metas, digitados por
          você ou importados de arquivos (OFX, CSV ou Excel).
        </li>
        <li>
          <b>Arquivos importados:</b> são lidos no seu próprio navegador. Só os lançamentos que você confirma são
          enviados e guardados; o arquivo em si não é armazenado.
        </li>
        <li>
          <b>Dados técnicos:</b> registros de acesso do servidor (como endereço IP, data e página acessada), usados para
          segurança e correção de erros.
        </li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e proteger a sua conta, confirmar o seu e-mail e permitir a recuperação de senha.</li>
        <li>Mostrar os seus relatórios, orçamento, DRE e metas.</li>
        <li>Manter o serviço funcionando com segurança.</li>
      </ul>
      <p>
        Não vendemos, alugamos nem compartilhamos os seus dados para publicidade. O {APP_NAME} não exibe anúncios e não
        usa ferramentas de rastreamento ou análise de terceiros.
      </p>

      <h2>3. Cookies</h2>
      <p>
        Usamos apenas um cookie essencial de sessão, que mantém você conectado. Sem a opção “Manter conectado”, ele é
        apagado ao fechar o navegador.
      </p>

      <h2>4. Onde os dados ficam</h2>
      <p>Para funcionar, o {APP_NAME} usa os seguintes serviços, que podem armazenar dados fora do Brasil:</p>
      <ul>
        <li><b>Supabase</b> – banco de dados onde ficam a sua conta e os seus dados financeiros (Estados Unidos).</li>
        <li><b>Vercel</b> – hospedagem do aplicativo e registros técnicos de acesso.</li>
        <li><b>Google (Gmail)</b> – envio dos e-mails de confirmação de cadastro e de recuperação de senha.</li>
      </ul>
      <p>As conexões são feitas por HTTPS (criptografadas).</p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Os seus dados ficam guardados enquanto a sua conta existir. Cadastros não confirmados são descartados. Ao excluir
        a conta, os dados são apagados do banco de dados imediatamente; cópias de segurança mantidas pelos provedores
        podem levar alguns dias para serem eliminadas.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD, você pode:</p>
      <ul>
        <li>Acessar e exportar os seus dados (em Relatórios › Exportar CSV).</li>
        <li>Corrigir dados, editando-os no próprio aplicativo.</li>
        <li>
          Excluir a sua conta e todos os dados a qualquer momento, em Configurações › Excluir minha conta (
          <Link href="/excluir-conta" className="text-primary underline">veja como</Link>).
        </li>
        <li>Pedir informações sobre o uso dos seus dados.</li>
      </ul>

      <h2>7. Contato</h2>
      <p>
        Dúvidas ou pedidos sobre privacidade:{" "}
        {email ? (
          <a href={`mailto:${email}`} className="text-primary underline">{email}</a>
        ) : (
          "pelo e-mail de suporte informado na página do aplicativo."
        )}
      </p>

      <h2>8. Mudanças nesta política</h2>
      <p>Se esta política mudar, a data de “última atualização” no topo será alterada.</p>
    </>
  );
}
