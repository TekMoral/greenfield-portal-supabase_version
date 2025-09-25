import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { useSettings } from '../../contexts/SettingsContext';

const Settings = () => {
  const { user, userRole, isSuperAdminUser } = useAuth();
  const { showToast } = useToast();
  const { settings: ctxSettings, updateSettings, loading: settingsLoading } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    schoolName: 'Victory International College',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    academicYear: '2024/2025',
    currentTerm: '1st Term',
    enableNotifications: true,
    enableAuditLogs: true,
    maxFileSize: '10MB',
    allowedFileTypes: 'PDF, DOC, DOCX, JPG, PNG',
  });

  const [loading, setLoading] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Persist only known system settings to the global settings store
      const payload = {
        schoolName: settings.schoolName,
        schoolAddress: settings.schoolAddress,
        schoolPhone: settings.schoolPhone,
        schoolEmail: settings.schoolEmail,
        academicYear: settings.academicYear,
        currentTerm: settings.currentTerm,
      };
      const res = await updateSettings(payload);
      if (res?.success) {
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast(res?.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      showToast(error?.message || 'Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sync local editable state with context settings whenever they load/update
  useEffect(() => {
    if (!ctxSettings) return;
    setSettings(prev => ({
      ...prev,
      schoolName: ctxSettings.schoolName || prev.schoolName,
      schoolAddress: ctxSettings.schoolAddress || prev.schoolAddress,
      schoolPhone: ctxSettings.schoolPhone || prev.schoolPhone,
      schoolEmail: ctxSettings.schoolEmail || prev.schoolEmail,
      academicYear: ctxSettings.academicYear || prev.academicYear,
      currentTerm: ctxSettings.currentTerm || prev.currentTerm,
    }));
  }, [ctxSettings]);

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'academic', name: 'Academic', icon: '🎓' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-1">Configure your school management system</p>
          </div>
          <div className="text-sm text-gray-500">
            Logged in as: {user?.email} ({userRole})
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">School Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={settings.schoolName}
                    onChange={(e) => handleSettingChange('schoolName', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Email
                  </label>
                  <input
                    type="email"
                    value={settings.schoolEmail}
                    onChange={(e) => handleSettingChange('schoolEmail', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.schoolPhone}
                    onChange={(e) => handleSettingChange('schoolPhone', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Address
                  </label>
                  <textarea
                    value={settings.schoolAddress}
                    onChange={(e) => handleSettingChange('schoolAddress', e.target.value)}
                    rows={3}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Academic Settings */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Academic Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year
                  </label>
                  <select
                    value={settings.academicYear}
                    onChange={(e) => handleSettingChange('academicYear', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  >
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                    <option value="2028/2029">2028/2029</option>
                    <option value="2029/2030">2029/2030</option>
                    <option value="2030/2031">2030/2031</option>
                    <option value="2031/2032">2031/2032</option>
                    <option value="2032/2033">2032/2033</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Term
                  </label>
                  <select
                    value={settings.currentTerm}
                    onChange={(e) => handleSettingChange('currentTerm', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  >
                    <option value="1st Term">1st Term</option>
                    <option value="2nd Term">2nd Term</option>
                    <option value="3rd Term">3rd Term</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Academic Calendar</h4>
                <p className="text-sm text-blue-700">
                  Configure term dates, and examination periods in the Academic Calendar section.
                </p>
              </div>
            </div>
          )}

          
          
          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading || settingsLoading || !isSuperAdminUser}
              title={!isSuperAdminUser ? 'Only Super Admin can save system settings' : ''}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;