import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Slack,
  Settings,
  Server,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Circle,
  Save,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface SystemInfo {
  version: string;
  environment: string;
  nodeVersion: string;
  uptime: string;
}

interface WebhookStatus {
  name: string;
  status: 'active' | 'inactive';
}

const AdminSettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [companyName, setCompanyName] = useState('SISG Platform');
  const [contactEmail, setContactEmail] = useState('admin@sisg.io');
  const [timezone, setTimezone] = useState('UTC');
  const [settingsMessage, setSettingsMessage] = useState('');

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    version: '1.0.0',
    environment: 'production',
    nodeVersion: '18.0.0',
    uptime: '45d 12h 34m',
  });

  const [webhookStatuses, setWebhookStatuses] = useState<WebhookStatus[]>([
    { name: 'Alerts', status: 'active' },
    { name: 'Forms', status: 'active' },
    { name: 'Activity', status: 'inactive' },
    { name: 'Deployments', status: 'active' },
  ]);

  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  const token = localStorage.getItem('sisg_admin_token');

  // Fetch system info
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSystemInfo(data);
        }
      } catch (error) {
        console.error('Error fetching system info:', error);
      }
    };

    if (token) {
      fetchSystemInfo();
    }
  }, [token]);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setPasswordMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError('Current password is incorrect');
      }
    } catch (error) {
      setPasswordError('Error changing password');
      console.error(error);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsMessage('');

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName,
          contactEmail,
          timezone,
        }),
      });

      if (response.ok) {
        setSettingsMessage('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleTestWebhook = async (webhookName: string) => {
    setTestingWebhook(webhookName);

    try {
      const response = await fetch(`/api/admin/webhooks/${webhookName}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedStatus = webhookStatuses.map(w =>
          w.name === webhookName ? { ...w, status: 'active' as const } : w
        );
        setWebhookStatuses(updatedStatus);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sisg_admin_token');
    window.location.href = '/login';
  };

  const handleClearData = async () => {
    try {
      const response = await fetch('/api/admin/data/clear', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setShowClearDataConfirm(false);
        alert('All data cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-sora text-3xl font-bold mb-2">Admin Settings</h1>
          <p className="text-gray-400">Manage system configuration and security</p>
        </div>

        {/* Password Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="tech-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-[#ff3b3b]" />
            <h2 className="font-sora text-xl font-bold">Password Management</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff3b3b]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff3b3b]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ff3b3b]"
              />
            </div>

            {passwordMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-[#00e5a0]/10 border border-[#00e5a0] rounded-lg text-[#00e5a0] text-sm flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {passwordMessage}
              </motion.div>
            )}

            {passwordError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-[#ff3b3b]/10 border border-[#ff3b3b] rounded-lg text-[#ff3b3b] text-sm flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                {passwordError}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleChangePassword}
              className="w-full bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all"
            >
              Change Password
            </motion.button>
          </div>
        </motion.div>

        {/* Slack Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="tech-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Slack className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="font-sora text-xl font-bold">Slack Integration</h2>
          </div>

          <div className="space-y-3">
            {webhookStatuses.map((webhook, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <motion.div animate={{ scale: 1 }}>
                    {webhook.status === 'active' ? (
                      <CheckCircle className="w-5 h-5 text-[#00e5a0]" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-500" />
                    )}
                  </motion.div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-white">
                      {webhook.name} Webhook
                    </p>
                    <p className="font-mono text-xs text-gray-400">
                      {webhook.status === 'active' ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTestWebhook(webhook.name)}
                  disabled={testingWebhook === webhook.name}
                  className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00d4ff]/90 text-black rounded-lg font-mono text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {testingWebhook === webhook.name ? 'Testing...' : 'Test'}
                </motion.button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Site Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="tech-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-[#8b5cf6]" />
            <h2 className="font-sora text-xl font-bold">Site Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST (UTC-5)</option>
                <option value="CST">CST (UTC-6)</option>
                <option value="MST">MST (UTC-7)</option>
                <option value="PST">PST (UTC-8)</option>
              </select>
            </div>

            {settingsMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-[#00e5a0]/10 border border-[#00e5a0] rounded-lg text-[#00e5a0] text-sm flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {settingsMessage}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveSettings}
              className="w-full bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </motion.button>
          </div>
        </motion.div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="tech-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-5 h-5 text-[#00e5a0]" />
            <h2 className="font-sora text-xl font-bold">System Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">
                Version
              </p>
              <p className="font-mono text-lg font-bold text-[#00e5a0]">
                {systemInfo.version}
              </p>
            </div>

            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">
                Environment
              </p>
              <p className="font-mono text-lg font-bold text-[#00d4ff]">
                {systemInfo.environment}
              </p>
            </div>

            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">
                Node Version
              </p>
              <p className="font-mono text-lg font-bold text-[#0066ff]">
                {systemInfo.nodeVersion}
              </p>
            </div>

            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">
                Uptime
              </p>
              <p className="font-mono text-lg font-bold text-[#ffb800]">
                {systemInfo.uptime}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="tech-card border-[#ff3b3b]"
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-[#ff3b3b]" />
            <h2 className="font-sora text-xl font-bold text-[#ff3b3b]">Danger Zone</h2>
          </div>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full bg-[#ff3b3b]/20 hover:bg-[#ff3b3b]/30 border border-[#ff3b3b] text-[#ff3b3b] px-6 py-3 rounded-lg font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowClearDataConfirm(true)}
              className="w-full bg-[#ff3b3b]/20 hover:bg-[#ff3b3b]/30 border border-[#ff3b3b] text-[#ff3b3b] px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all"
            >
              Clear All Data
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Logout Confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="tech-card w-full max-w-sm"
            >
              <h3 className="font-sora text-xl font-bold mb-2 text-[#ff3b3b]">
                Confirm Logout
              </h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to logout? You will need to sign in again.
              </p>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="flex-1 bg-[#ff3b3b] text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all"
                >
                  Logout
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Data Confirmation */}
      <AnimatePresence>
        {showClearDataConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowClearDataConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="tech-card w-full max-w-sm border-[#ff3b3b]"
            >
              <h3 className="font-sora text-xl font-bold mb-2 text-[#ff3b3b]">
                Clear All Data?
              </h3>
              <p className="text-gray-400 mb-6">
                This action is irreversible. All data including content, users, and settings will be permanently deleted.
              </p>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearData}
                  className="flex-1 bg-[#ff3b3b] text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all"
                >
                  Clear Data
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowClearDataConfirm(false)}
                  className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AdminSettings;
