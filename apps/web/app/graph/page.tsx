import dynamic from 'next/dynamic';

const GraphClient = dynamic(() => import('@/components/pages/GraphClient'), {
  ssr: false,
});

export default function GraphPage() {
  return <GraphClient />;
}
