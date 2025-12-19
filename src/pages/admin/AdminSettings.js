import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { adminAPI } from '../../services/api';
import Loader from '../../components/Loder';
import { Building2, CreditCard } from 'lucide-react';

const AdminSettings = () => {
  const queryClient = useQueryClient();
  
  const [general, setGeneral] = useState({
    appName: 'HMR Dashboard',
    companyName: 'Blocks',
    supportEmail: 'support@example.com',
    timezone: 'UTC',
  });

  const [theme, setTheme] = useState({
    defaultTheme: 'dark',
    density: 'compact',
    accent: '#00a6ff',
  });

  const [security, setSecurity] = useState({
    require2fa: false,
    sessionMinutes: 60,
    allowRegistration: false,
  });

  // Bank Account Settings
  const { data: bankAccountData, isLoading: loadingBankAccount } = useQuery(
    'bank-account-settings',
    () => adminAPI.getBankAccountSettings(),
    {
      retry: 1,
      onSuccess: (data) => {
        if (data?.data?.data) {
          setBankAccount(data.data.data);
        }
      },
    },
  );

  const [bankAccount, setBankAccount] = useState({
    accountName: '',
    accountNumber: '',
    iban: '',
    bankName: '',
    swiftCode: '',
    branch: '',
  });

  const updateBankAccountMutation = useMutation(
    (data) => adminAPI.updateBankAccountSettings(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('bank-account-settings');
        alert('Bank account details updated successfully!');
      },
      onError: (error) => {
        alert(`Failed to update: ${error.response?.data?.message || error.message}`);
      },
    },
  );

  const handleSaveBankAccount = () => {
    updateBankAccountMutation.mutate(bankAccount);
  };

  const handleSave = () => {
    // Persist settings via API in the future
    // For now, just provide feedback via console
    console.log('Saving settings', { general, theme, security });
    alert('Settings saved (demo)');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-card-foreground">Admin Settings</h2>
        <p className="text-muted-foreground">These settings apply to the entire admin application. They are not tied to specific users or properties.</p>
      </div>

      <Card className="p-6">
        <Card.Title>General</Card.Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">App Name</label>
            <input
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={general.appName}
              onChange={(e) => setGeneral({ ...general, appName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Company Name</label>
            <input
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={general.companyName}
              onChange={(e) => setGeneral({ ...general, companyName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Support Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={general.supportEmail}
              onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={general.timezone}
              onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
            >
              <option value="UTC">UTC</option>
              <option value="Asia/Karachi">Asia/Karachi</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Card.Title>Theme & UI</Card.Title>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Default Theme</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={theme.defaultTheme}
              onChange={(e) => setTheme({ ...theme, defaultTheme: e.target.value })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Density</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={theme.density}
              onChange={(e) => setTheme({ ...theme, density: e.target.value })}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Accent Color</label>
            <input
              type="color"
              className="w-full h-10 px-1 py-1 border border-input rounded-lg"
              value={theme.accent}
              onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Card.Title className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Bank Account Details
        </Card.Title>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Configure bank account details that users will see when making bank transfer deposits.
        </p>
        {loadingBankAccount ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Account Name *
              </label>
              <input
                className="w-full px-3 py-2 border border-input rounded-lg"
                value={bankAccount.accountName}
                onChange={(e) => setBankAccount({ ...bankAccount, accountName: e.target.value })}
                placeholder="Blocks Investment Platform"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Account Number *
              </label>
              <input
                className="w-full px-3 py-2 border border-input rounded-lg font-mono"
                value={bankAccount.accountNumber}
                onChange={(e) => setBankAccount({ ...bankAccount, accountNumber: e.target.value })}
                placeholder="PK12BLOCKS0001234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">IBAN</label>
              <input
                className="w-full px-3 py-2 border border-input rounded-lg font-mono"
                value={bankAccount.iban}
                onChange={(e) => setBankAccount({ ...bankAccount, iban: e.target.value })}
                placeholder="PK12BLOCKS0001234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bank Name *</label>
              <input
                className="w-full px-3 py-2 border border-input rounded-lg"
                value={bankAccount.bankName}
                onChange={(e) => setBankAccount({ ...bankAccount, bankName: e.target.value })}
                placeholder="Standard Chartered Bank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">SWIFT Code</label>
              <input
                className="w-full px-3 py-2 border border-input rounded-lg font-mono"
                value={bankAccount.swiftCode}
                onChange={(e) => setBankAccount({ ...bankAccount, swiftCode: e.target.value })}
                placeholder="SCBLPKKA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Branch</label>
              <input
                className="w-full px-3 py-2 border border-input rounded-lg"
                value={bankAccount.branch}
                onChange={(e) => setBankAccount({ ...bankAccount, branch: e.target.value })}
                placeholder="Main Branch, Karachi"
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveBankAccount}
            disabled={updateBankAccountMutation.isLoading || loadingBankAccount}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateBankAccountMutation.isLoading ? 'Saving...' : 'Save Bank Account Details'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <Card.Title>Auth & Security</Card.Title>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Require 2FA</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={security.require2fa ? 'yes' : 'no'}
              onChange={(e) => setSecurity({ ...security, require2fa: e.target.value === 'yes' })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Session Timeout (minutes)</label>
            <input
              type="number"
              min="15"
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={security.sessionMinutes}
              onChange={(e) => setSecurity({ ...security, sessionMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Public Registration</label>
            <select
              className="w-full px-3 py-2 border border-input rounded-lg"
              value={security.allowRegistration ? 'on' : 'off'}
              onChange={(e) => setSecurity({ ...security, allowRegistration: e.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">On (invite not required)</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>Reset</Button>
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
};

export default AdminSettings;


