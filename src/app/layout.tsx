import type { Metadata } from 'next';
import { Header, Footer } from '@/components/ui';
import { Providers } from '@/components/providers';
import 'primereact/resources/themes/lara-light-green/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Entre Nós — Sorteios que aproximam', template: '%s · Entre Nós' },
  description:
    'Organize seu amigo oculto, sorteio ou divisão de times. Grátis, com acesso individual e resultado no site.',
  icons: { icon: '/icon.svg' },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
