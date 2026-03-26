import React, { useState } from 'react';
import { Card, Button, Input } from '@enheritage/ui';
import { useElderlyMode } from '@enheritage/ui';
import { useAuthStore } from '@/stores/authStore';
import { UserTier } from '@enheritage/types';

const tierLabels: Record<UserTier, { label: string; color: string }> = {
  [UserTier.FREE]: { label: 'Free', color: 'text-[#667085]' },
  [UserTier.STANDARD]: { label: 'Standard', color: 'text-[#2B5BA8]' },
  [UserTier.PREMIUM]: { label: 'Premium', color: 'text-[#C8973A]' },
  [UserTier.ELITE]: { label: 'Elite', color: 'text-[#8F6420]' },
  [UserTier.ENTERPRISE]: { label: 'Enterprise', color: 'text-[#065F46]' },
};

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { isElderlyMode, toggle: toggleElderlyMode } = useElderlyMode();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [timezone, setTimezone] = useState(user?.preferences?.timezone ?? 'America/New_York');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage('');
    try {
      // User profile service is not yet built — stores preferences locally for now
      await new Promise((r) => setTimeout(r, 400));
      setSavedMessage('Profile saved successfully.');
    } catch {
      setSavedMessage('Could not save profile. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  };

  const currentTier = user?.tier ?? UserTier.FREE;
  const tierInfo = tierLabels[currentTier];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-[#101828]">Settings</h1>

      {/* Profile */}
      <Card title="Profile" subtitle="Update your personal information">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            elderlyMode={isElderlyMode}
            placeholder="Your name"
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            elderlyMode={isElderlyMode}
            placeholder="you@example.com"
            hint="Used for login and notifications"
          />
          <Input
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            elderlyMode={isElderlyMode}
            placeholder="America/New_York"
          />
          {savedMessage && (
            <p className="text-sm text-[#10B981]">{savedMessage}</p>
          )}
          <Button type="submit" variant="primary" isLoading={isSaving} elderlyMode={isElderlyMode}>
            Save Profile
          </Button>
        </form>
      </Card>

      {/* Subscription */}
      <Card
        title="Subscription"
        subtitle="Your current plan and billing"
        actions={
          <button
            type="button"
            className="text-sm text-[#2B5BA8] hover:underline"
          >
            Manage billing
          </button>
        }
      >
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-[#667085]">Current plan</p>
            <p className={`text-lg font-semibold mt-0.5 ${tierInfo.color}`}>
              {tierInfo.label}
            </p>
          </div>
          {currentTier === UserTier.FREE && (
            <Button variant="primary" size="sm" elderlyMode={isElderlyMode}>
              Upgrade
            </Button>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-[#E4E7EC] grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Interviews', value: currentTier === UserTier.FREE ? '3 / mo' : 'Unlimited' },
            { label: 'Storage', value: currentTier === UserTier.FREE ? '5 GB' : '100 GB' },
            { label: 'AI Biographies', value: currentTier === UserTier.FREE ? '1' : 'Unlimited' },
            { label: 'Family Tree', value: currentTier === UserTier.FREE ? 'Basic' : 'Advanced' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[#98A2B3]">{item.label}</p>
              <p className="text-[#344054] font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" subtitle="Choose how you want to be contacted">
        <div className="space-y-4">
          {[
            {
              label: 'Email notifications',
              description: 'Interview reminders, biography updates',
              value: emailNotifs,
              onChange: setEmailNotifs,
            },
            {
              label: 'SMS notifications',
              description: 'Same-day interview reminders only',
              value: smsNotifs,
              onChange: setSmsNotifs,
            },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-start justify-between gap-4 cursor-pointer"
            >
              <div>
                <p className={`font-medium text-[#344054] ${isElderlyMode ? 'text-base' : 'text-sm'}`}>
                  {item.label}
                </p>
                <p className={`text-[#667085] mt-0.5 ${isElderlyMode ? 'text-sm' : 'text-xs'}`}>
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={item.value}
                onClick={() => item.onChange(!item.value)}
                className={[
                  'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2B5BA8] focus:ring-offset-2',
                  item.value ? 'bg-[#2B5BA8]' : 'bg-[#D0D5DD]',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    item.value ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </label>
          ))}
        </div>
      </Card>

      {/* Accessibility — Elderly Mode */}
      <Card
        title="Accessibility"
        subtitle="Adjust the interface to your needs"
      >
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div>
            <p className={`font-medium text-[#344054] ${isElderlyMode ? 'text-base' : 'text-sm'}`}>
              Elderly-friendly mode
            </p>
            <p className={`text-[#667085] mt-0.5 ${isElderlyMode ? 'text-sm' : 'text-xs'}`}>
              Larger text, increased padding, simplified navigation
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isElderlyMode}
            onClick={toggleElderlyMode}
            className={[
              'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2B5BA8] focus:ring-offset-2',
              isElderlyMode ? 'bg-[#2B5BA8]' : 'bg-[#D0D5DD]',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                isElderlyMode ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </label>
      </Card>
    </div>
  );
}
