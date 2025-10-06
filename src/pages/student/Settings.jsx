import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import { useSettings } from "../../contexts/SettingsContext";
import { formatSessionBadge } from "../../utils/sessionUtils";

// Student Settings page reimplemented without Firebase
// Provides sign-out and a simple placeholder for contact update flow.
const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { academicYear: settingsYear, currentTerm } = useSettings();

  const handleLogout = async () => {
    const res = await signOut();
    if (!res?.success) {
      showToast(res?.error || "Failed to sign out", "error");
      return;
    }
    navigate("/login");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>
      <div className="text-sm text-slate-500 mt-1">{formatSessionBadge(settingsYear, currentTerm)}</div>

      {/* Contact Update Placeholder (migrate to Supabase profile updates) */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Contact Phone Number</h2>
        <p className="text-sm text-slate-600">
          This app no longer uses Firebase. Implement profile updates via Supabase user_profiles
          using the Auth context and supabase client.
        </p>
      </div>

      {/* Password Reset */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Reset Password</h2>
        <p className="text-sm text-gray-600 mb-4">
          Use the Reset Password page to request a password reset.
        </p>
        <button
          onClick={() => navigate("/reset-password")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Go to Reset Password
        </button>
      </div>

      {/* Logout */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Logout</h2>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="text-xs text-slate-500">
        User ID: {user?.id || "-"}
      </div>
    </div>
  );
};

export default Settings;
