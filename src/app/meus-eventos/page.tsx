import { SavedEvents } from '@/components/saved-events';
export const metadata = { title: 'Meus eventos', robots: { index: false, follow: false } };
export default function Page() {
  return <SavedEvents />;
}
