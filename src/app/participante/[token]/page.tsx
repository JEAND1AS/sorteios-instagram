import { Personal } from '@/components/personal';
export const metadata = { title: 'Minha participação', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <Personal token={(await params).token} />;
}
