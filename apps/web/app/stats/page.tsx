import dynamic from 'next/dynamic';

const StatsClient = dynamic(() => import('@/components/pages/StatsClient'), {
  ssr: false,
});

export default function StatsPage() {
  return <StatsClient />;
}