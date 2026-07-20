import PipelinesClient from '@/components/pages/PipelinesClient';

export const metadata = {
  title: 'Pipeline Studio | Hackmanite',
  description: 'Design and execute visual entity ETL pipelines using named nodes.',
};

export default function PipelinesPage() {
  return <PipelinesClient />;
}
