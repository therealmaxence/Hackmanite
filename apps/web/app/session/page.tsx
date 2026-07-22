import dynamic from 'next/dynamic';

const SessionClient = dynamic(() => import('@/components/pages/SessionClient'), {
  ssr: false,
});

export const metadata = {
  title: 'Session — EntityGraph',
  description: 'Export and import your analysis session as a portable JSON snapshot.',
};

export default function SessionPage() {
  return <SessionClient />;
}
