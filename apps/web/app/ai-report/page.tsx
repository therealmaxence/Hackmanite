import dynamic from 'next/dynamic';

const AiReportClient = dynamic(() => import('@/components/pages/AiReportClient'), {
  ssr: false,
});

export default function AiReportPage() {
  return <AiReportClient />;
}
