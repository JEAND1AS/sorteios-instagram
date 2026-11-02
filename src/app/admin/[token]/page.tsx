import { Admin } from '@/components/admin';
export const metadata = { title: 'Painel do organizador', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <Admin token={(await params).token} />;
}
