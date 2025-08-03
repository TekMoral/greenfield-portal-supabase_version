import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherByUid, updateTeacher } from "../../../services/supabase/teacherService";
import useAuditLog from "../../../hooks/useAuditLog";

const Profile = () => {
  const { user } = useAuth();
  const { logTeacherAction, AUDIT_ACTIONS } = useAuditLog();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    subject: "",
    qualification: "",
    dateHired: ""
  });

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const teacherData = await getTeacherByUid(user.uid);
        if (teacherData) {
          setProfile(teacherData);
          setFormData({
            name: teacherData.name || "",
            email: teacherData.email || "",
            phoneNumber: teacherData.phoneNumber || "",
            subject: teacherData.subject || "",
            qualification: teacherData.qualification || "",
            dateHired: teacherData.dateHired || ""
          });
        }
      } catch (error) {
        console.error('Error fetching teacher profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherProfile();
  }, [user?.uid]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Get the changes made
      const changes = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== profile[key]) {
          changes[key] = {
            from: profile[key],
            to: formData[key]
          };
        }
      });

      await updateTeacher(user.uid, formData);
      
      // Log teacher profile update
      await logTeacherAction(
        AUDIT_ACTIONS.TEACHER_UPDATE,
        user.uid,
        {
          teacherName: formData.name,
          email: formData.email,
          changes: changes,
          updatedFields: Object.keys(changes),
          updateType: 'profile_self_update'
        },
        `Teacher ${formData.name} updated their own profile (${Object.keys(changes).join(', ')})`
      );
      
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      console.log("Profile updated successfully");
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name || "",
      email: profile.email || "",
      phoneNumber: profile.phoneNumber || "",
      subject: profile.subject || "",
      qualification: profile.qualification || "",
      dateHired: profile.dateHired || ""
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-slate-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-slate-200 rounded w-48"></div>
              <div className="h-4 bg-slate-200 rounded w-32"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">
                {profile?.name?.split(' ').map(n => n[0]).join('') || 'T'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.name}</h2>
              <p className="text-slate-200">{profile?.subject} Teacher</p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date Hired</label>
                  <input
                    type="date"
                    value={formData.dateHired}
                    onChange={(e) => setFormData({...formData, dateHired: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="border border-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Email</label>
                    <p className="text-slate-800">{profile?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Phone</label>
                    <p className="text-slate-800">{profile?.phoneNumber}</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Subject</label>
                    <p className="text-slate-800">{profile?.subject}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Qualification</label>
                    <p className="text-slate-800">{profile?.qualification}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Date Hired</label>
                    <p className="text-slate-800">{profile?.dateHired}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Status</label>
                    <p className="text-slate-800">{profile?.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Created At</label>
                    <p className="text-slate-800">{profile?.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Last Updated</label>
                    <p className="text-slate-800">{profile?.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;