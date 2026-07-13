import React, { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  Lock,
  Slack,
  Settings,
  Server,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Save,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface SystemInfo {
  version: string;
  environment: string;
  nodeVersion: string;
  uptime: string;
}

interface AdminConfig {
  companyName: string;
  contactEmail: string;
  timezone: string;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const defaultConfig: AdminConfig = {
  companyName: 'SISG Platform',
  contactEmail: 'admin@sisg.io',
  timezone: 'UTC',
};

const defaultSystemInfo: SystemInfo = {
  version: 'dev',
  environment: 'development',
  nodeVersion: 'unknown',
  uptime: '0d 0h 0m',
};

const AdminSettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [config, setConfig] = useState<AdminConfig>(defaultConfig);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(defaultSystemInfo);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('sisg_admin_token') : null;

  useEffect(() => {
    const fetchPageData = async () => {
      if (!token) {
        return;
      }

      try {
        const [statsResponse, configResponse] = await Promise.all([
          fetch('/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/admin/config', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setSystemInfo({
            version: stats.version || defaultSystemInfo.version,
            environment: stats.environment || defaultSystemInfo.environment,
            nodeVersion: stats.nodeVersion || defaultSystemInfo.nodeVersion,
            uptime: stats.uptime || defaultSystemInfo.uptime,
          });
        }

        if (configResponse.ok) {
          const nextConfig = await configResponse.json();
          setConfig({
            companyName: nextConfig.companyName || defaultConfig.companyName,
            contactEmail: nextConfig.contactEmail || defaultConfig.contactEmail,
            timezone: nextConfig.timezone || defaultConfig.timezone,
          });
        }
      } catch (error) {
        console.error('Error fetching admin settings context:', error);
        toast.error('Failed to load admin settings');
      }
    };

    void fetchPageData();
  }, [token]);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMessage('');

    if (!token) {
      setPasswordError('Authentication token not found');
      toast.error('Authentication token not found');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      toast.error('New password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);
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

      const payload = await response.json().catch(() => null);

      if (response.ok) {
        setPasswordMessage('Password changed successfully. You may need to sign in again on other devices.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Password changed successfully');
      } else {
        const errorMessage = payload?.error || 'Failed to change password';
        setPasswordError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      setPasswordError('Error changing password');
      toast.error('Error changing password');
      console.error(error);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsMessage('');

    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    setSavingSettings(true);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload) {
        setConfig({
          companyName: payload.companyName || config.companyName,
          contactEmail: payload.contactEmail || config.contactEmail,
          timezone: payload.timezone || config.timezone,
        });
        setSettingsMessage('Settings saved successfully');
        toast.success('Settings saved successfully');
      } else {
        toast.error(payload?.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      localStorage.removeItem('sisg_admin_token');
      window.location.href = '/login';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-sora text-xl sm:text-3xl font-bold mb-2">Admin Settings</h1>
          <p className="text-gray-400">Manage system configuration and operator security.</p>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
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
              disabled={changingPassword}
              className="w-full bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold transition-all disabled:opacity-50"
            >
              {changingPassword ? 'Updating Password...' : 'Change Password'}
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ delay: 0.1 }}
          className="tech-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Slack className="w-5 h-5 text-[#00d4ff]" />
            <h2 className="font-sora text-xl font-bold">Slack Integration</h2>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-4 h-4 text-[#ffb800]" />
              <span className="font-mono text-sm font-semibold">Dashboard test controls are not shipped</span>
            </div>
            <p className="text-sm text-gray-400">
              Webhook routing is still managed outside this admin route surface. The previous per-webhook
              test buttons were calling missing backend endpoints, so they have been intentionally
              de-scoped until a real status and test API exists.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
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
                value={config.companyName}
                onChange={e => setConfig(current => ({ ...current, companyName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={config.contactEmail}
                onChange={e => setConfig(current => ({ ...current, contactEmail: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                Timezone
              </label>
              <select
                value={config.timezone}
                onChange={e => setConfig(current => ({ ...current, timezone: e.target.value }))}
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
              disabled={savingSettings}
              className="w-full bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ delay: 0.3 }}
          className="tech-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-5 h-5 text-[#00e5a0]" />
            <h2 className="font-sora text-xl font-bold">System Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
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

            <div className="rounded-lg border border-[#ff3b3b]/30 bg-[#ff3b3b]/10 p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-[#ff3b3b] mb-2">
                Destructive actions
              </p>
              <p className="text-sm text-gray-300">
                Bulk data reset is intentionally unavailable from this dashboard. The old
                clear-all-data control pointed at a missing destructive endpoint and has been removed
                rather than replaced with an unsafe shortcut.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

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
                onClick={() => {
                  void handleLogout();
                }}
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
    </DashboardLayout>
  );
};

export default AdminSettings;
