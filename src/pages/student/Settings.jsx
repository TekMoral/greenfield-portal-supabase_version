import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { auth, db } from "../../firebase/config";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch current phone number
  useEffect(() => {
    const fetchContact = async () => {
      if (!user?.uid) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setContact(userSnap.data().contact || "");
      }
      setLoading(false);
    };
    fetchContact();
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid || !contact) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { contact });
      setMessage("Contact updated successfully.");
    } catch (err) {
      setMessage("Failed to update contact.");
      console.error(err);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Update Contact Info */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Contact Phone Number</h2>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="border rounded w-full p-2 mb-3"
          placeholder="Enter phone number"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Update Contact"}
        </button>
        {message && <p className="text-sm mt-2 text-green-600">{message}</p>}
      </div>

      {/* Password Reset */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Reset Password</h2>
        <p className="text-sm text-gray-600 mb-4">
          A reset link will be sent to your email address.
        </p>
        <button
          onClick={() => auth.sendPasswordResetEmail(user.email)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Send Reset Email
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
    </div>
  );
};

export default Settings;
