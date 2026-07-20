import SettingsClient from '@/components/pages/SettingsClient';

export const metadata = {
  title: 'Settings — EntityGraph Explorer',
  description: 'Manage session character window sizing and default co-occurrence filter thresholds.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
