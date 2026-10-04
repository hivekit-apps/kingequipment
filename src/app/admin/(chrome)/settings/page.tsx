import { requireAdminRole } from '@/lib/require-role';
import { loadSettings } from '@/lib/settings';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdminRole();
  const settings = await loadSettings();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">Discounts, tax rate, delivery fees, e-transfer recipient.</p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
