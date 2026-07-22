import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Spinner from '@/components/ui/Spinner';

const EmailsClient = dynamic(() => import('@/components/pages/EmailsClient'), {
  ssr: false,
});

export default function EmailsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
          <Spinner size={32} />
        </div>
      }
    >
      <EmailsClient />
    </Suspense>
  );
}
