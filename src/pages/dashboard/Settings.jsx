import React, { useState, useEffect, useMemo } from 'react';
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

  // Derive display helpers
  const initials = useMemo(() => {
    const s = user?.email || '';
    return s ? s[0]?.toUpperCase?.() : 'U';
  }, [user?.email]);

  const roleChip = useMemo(() => {
    if (!userRole) return null;
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium border';
    const tone = userRole.includes('super')
      ? 'bg-emerald-50 text-white/90 border-white/30 bg-white/10'
      : 'bg-white/10 text-white border-white/20';
    return <span className={`${base} ${tone}`}>{userRole}</span>;
  }, [userRole]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
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
    showToast('Changes reverted to last saved settings', 'success');
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
    { id: 'general', name: 'General', icon: '⚙️', desc: 'School identity and contact details' },
    { id: 'academic', name: 'Academic', icon: '🎓', desc: 'Year, term and academic preferences' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-xl overflow-hidden border border-emerald-600/20 shadow-sm bg-gradient-to-r from-emerald-600 to-blue-600">
        <div className="px-6 py-6 sm:px-8 sm:py-7 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">System Settings</h1>
              </div>
              <p className="text-white/90 mt-1 text-sm sm:text-base">Configure your school management system</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                  {initials}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-medium">{user?.email}</div>
                  <div className="text-xs text-white/80">Logged in</div>
                </div>
                {roleChip}
              </div>
              {/* Compact on mobile */}
              <div className="sm:hidden text-xs text-white/90">
                Logged in as: {user?.email}{userRole ? ` (${userRole})` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-4 sm:px-6 pt-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    `inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors ` +
                    (active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
                  }
                  title={tab.desc}
                >
                  <span>{tab.icon}</span>
                  {tab.name}
                </button>
              );
            })}
          </div>
          <div className="pb-4 text-sm text-slate-500 mt-1">
            {tabs.find(t => t.id === activeTab)?.desc}
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">School Identity</h3>
                  <label className="block text-sm font-medium text-slate-700 mb-2">School Name</label>
                  <input
                    type="text"
                    value={settings.schoolName}
                    onChange={(e) => handleSettingChange('schoolName', e.target.value)}
                    disabled={!isSuperAdminUser}
                    placeholder="e.g., Victory International College"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                  <p className="text-xs text-slate-500 mt-1">Displayed across reports and documents</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">School Contact</h3>
                  <label className="block text-sm font-medium text-slate-700 mb-2">School Email</label>
                  <input
                    type="email"
                    value={settings.schoolEmail}
                    onChange={(e) => handleSettingChange('schoolEmail', e.target.value)}
                    disabled={!isSuperAdminUser}
                    placeholder="e.g., info@school.edu.ng"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">School Phone</label>
                      <input
                        type="tel"
                        value={settings.schoolPhone}
                        onChange={(e) => handleSettingChange('schoolPhone', e.target.value)}
                        disabled={!isSuperAdminUser}
                        placeholder="e.g., +234 800 000 0000"
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">School Address</h3>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <textarea
                    value={settings.schoolAddress}
                    onChange={(e) => handleSettingChange('schoolAddress', e.target.value)}
                    rows={3}
                    disabled={!isSuperAdminUser}
                    placeholder="Street, City, State, Country"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  />
                  <p className="text-xs text-slate-500 mt-1">Used for official correspondence and report cards</p>
                </div>
              </div>
            </div>
          )}

          {/* Academic Settings */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Academic Session</h3>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
                  <select
                    value={settings.academicYear}
                    onChange={(e) => handleSettingChange('academicYear', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
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

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Current Term</h3>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
                  <select
                    value={settings.currentTerm}
                    onChange={(e) => handleSettingChange('currentTerm', e.target.value)}
                    disabled={!isSuperAdminUser}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${!isSuperAdminUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                  >
                    <option value="1st Term">1st Term</option>
                    <option value="2nd Term">2nd Term</option>
                    <option value="3rd Term">3rd Term</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Academic Calendar</h4>
                <p className="text-sm text-blue-700">Configure term dates and examination periods in the Academic Calendar section.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500">Only Super Admin can save system settings.</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={settingsLoading || !isSuperAdminUser}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${!isSuperAdminUser ? 'bg-white text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                title={!isSuperAdminUser ? 'Only Super Admin can modify settings' : 'Revert changes'}
              >
                Reset Changes
              </button>
              <button
                onClick={handleSave}
                disabled={loading || settingsLoading || !isSuperAdminUser}
                title={!isSuperAdminUser ? 'Only Super Admin can save system settings' : ''}
                className={`px-5 py-2 rounded-lg text-white text-sm font-medium shadow-sm ${
                  (loading || settingsLoading || !isSuperAdminUser)
                    ? 'bg-emerald-600/60 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
