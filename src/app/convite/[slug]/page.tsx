import { Invite } from '@/components/invite';
export const metadata = { title: 'Um convite para você', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Invite slug={(await params).slug} />;
}
