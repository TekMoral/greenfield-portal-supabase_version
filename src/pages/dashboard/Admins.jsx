import { useState, useEffect } from 'react';
import { getAllAdmins } from '../../services/supabase/adminService';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { EditButton, DeleteButton, SuspendButton, ReactivateButton, CreateButton } from '../../components/ui/ActionButtons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadAdminImage } from '../../services/supabase/uploadService';

const Admins = () => {
  const { isSuperAdmin, user, role } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchAdminsQuery = async () => {
    const result = await getAllAdmins();
    if (result && result.success) {
      const list = (result.data || []).map((a) => ({
        ...a,
        name: a.full_name || a.name,
        isActive: typeof a.is_active === 'boolean' ? a.is_active : a.isActive,
      }));
      return list;
    }
    throw new Error(result?.error || 'Failed to fetch admins');
  };

  const { data: adminsData, isLoading: adminsLoading, error: rqError } = useQuery({ queryKey: ['admins'], queryFn: fetchAdminsQuery });

  useEffect(() => {
    if (adminsData) setAdmins(adminsData);
  }, [adminsData]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    phoneNumber: '', 
    position: '',
    gender: '',
    profileImageFile: null
  });
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');
  const [editImagePreview, setEditImagePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [suspendConfirm, setSuspendConfirm] = useState({ isOpen: false, admin: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, admin: null });
  const [imagePreviewModal, setImagePreviewModal] = useState({ open: false, src: '', alt: '' });
  const [loadingStates, setLoadingStates] = useState({
    creating: false,
    updating: false,
    deleting: {},
    suspending: {},
    reactivating: {}
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Build preview for selected image or URL
  useEffect(() => {
    let objUrl;
    if (formData.profileImageFile) {
      objUrl = URL.createObjectURL(formData.profileImageFile);
      setImagePreview(objUrl);
    } else {
      setImagePreview('');
    }
    return () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [formData.profileImageFile]);

  // Initialize edit image preview when selecting an admin to edit
  useEffect(() => {
    if (editAdmin) {
      setEditImagePreview(editAdmin.profileImageUrl || '');
    } else {
      setEditImagePreview('');
    }
  }, [editAdmin]);

  const fetchAdmins = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admins'] });
  };

  // Simple client-side validation
  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Valid email is required';
    if (!formData.password || formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (formData.confirmPassword !== formData.password) errs.confirmPassword = 'Passwords do not match';
    if (formData.phoneNumber && formData.phoneNumber.replace(/\D/g, '').length < 7) errs.phoneNumber = 'Phone number looks too short';
    if (!formData.gender) errs.gender = 'Gender is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormErrors({});
    setLoadingStates(prev => ({ ...prev, creating: true }));
    
    try {
      const errs = validateForm();
      if (Object.keys(errs).length) {
        setFormErrors(errs);
        return;
      }

      // Upload profile image first if provided
      let uploadedUrl = '';
      if (formData.profileImageFile) {
        const res = await uploadAdminImage(formData.profileImageFile);
        if (res?.success && res.data?.url) {
          uploadedUrl = res.data.url;
        } else if (res?.error) {
          toast.error(`Image upload failed: ${res.error}`);
        }
      }

      const payload = { 
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
        position: formData.position,
        gender: formData.gender,
        role: 'admin',
        profileImageUrl: uploadedUrl || undefined
      };

      const result = await edgeFunctionsService.createAdmin(payload);
      if (result.success) {
        const newAdminId = result?.data?.id || result?.data?.uid;
        if (newAdminId) {
          const updatePayload = {};
          if (uploadedUrl) updatePayload.profile_image = uploadedUrl;
          if (formData.gender) updatePayload.gender = formData.gender;
          if (Object.keys(updatePayload).length) {
            try {
              await edgeFunctionsService.updateUser(newAdminId, 'admin', updatePayload);
            } catch (e) {
              console.error('⚠️ Failed to update admin after creation:', e);
            }
          }
        }
        setFormData({ 
          name: '', 
          email: '', 
          password: '', 
          confirmPassword: '',
          phoneNumber: '', 
          position: '',
          profileImageFile: null
        });
        setFormErrors({});
        setImagePreview('');
        setShowForm(false);
        await fetchAdmins();
        toast.success('Admin created successfully!');
      } else {
        throw new Error(result.error || 'Failed to create admin');
      }
    } catch (err) {
      console.error('❌ Error creating admin:', err);
      setError(err.message);
      toast.error('Failed to create admin');
    } finally {
      setLoadingStates(prev => ({ ...prev, creating: false }));
    }
  };

  const handleDeleteAdmin = (admin) => {
    // Frontend guard: only super admins, cannot self-delete
    if (!isSuperAdmin) {
      toast.error('Only super admins can delete admins');
      return;
    }
    if (admin?.id === user?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (admin?.role === 'super_admin') {
      toast.error('Cannot delete super admin accounts');
      return;
    }
    setDeleteConfirm({ isOpen: true, admin });
  };

  const confirmDeleteAdmin = async () => {
    const adminId = deleteConfirm.admin.id;
    // Re-validate guard before action
    if (!isSuperAdmin || adminId === user?.id || deleteConfirm.admin?.role === 'super_admin') {
      toast.error('Operation not permitted');
      setDeleteConfirm({ isOpen: false, admin: null });
      return;
    }
    setLoadingStates(prev => ({ ...prev, deleting: { ...prev.deleting, [adminId]: true } }));
    
    try {
      setError('');
      const result = await edgeFunctionsService.deleteAdmin(adminId);
      if (result.success) {
        await fetchAdmins();
        setDeleteConfirm({ isOpen: false, admin: null });
        toast.success('Admin deleted successfully!');
      } else {
        throw new Error(result.error || 'Failed to delete admin');
      }
    } catch (err) {
      console.error('❌ Error deleting admin:', err);
      setError(err.message);
      toast.error('Failed to delete admin');
    } finally {
      setLoadingStates(prev => ({ 
        ...prev, 
        deleting: { ...prev.deleting, [adminId]: false } 
      }));
    }
  };

  
  const handleEditAdmin = (admin) => {
    // Only super admins can edit admins (optional UI rule)
    if (!isSuperAdmin) {
      toast.error('Only super admins can edit admin profiles');
      return;
    }
    setEditAdmin({
      id: admin.id,
      name: admin.name || admin.full_name,
      email: admin.email,
      phoneNumber: admin.phone_number || '',
      position: admin.position || '',
      gender: admin.gender || '',
      profileImageUrl: admin.profile_image || admin.profileImageUrl || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingStates(prev => ({ ...prev, updating: true }));
    
    try {
      const updateData = {
        full_name: editAdmin.name,
        email: editAdmin.email,
        phone_number: editAdmin.phoneNumber,
        position: editAdmin.position,
        gender: editAdmin.gender
      };

      // Upload profile image if a new one was selected
      if (editAdmin.profileImageFile) {
        try {
          await uploadAdminImage(editAdmin.profileImageFile, editAdmin.id);
        } catch (e) {
          console.error('❌ Error uploading admin image:', e);
          toast.error('Image upload failed, but other changes will be saved');
        }
      }
      const result = await edgeFunctionsService.updateUser(editAdmin.id, 'admin', updateData);

      if (result && result.success) {
        await fetchAdmins();
        setShowEditForm(false);
        setEditAdmin(null);
        toast.success('Admin updated successfully!');
      } else {
        throw new Error(result?.error || 'Failed to update admin');
      }
    } catch (err) {
      console.error('❌ Error updating admin:', err);
      setError(err.message);
      toast.error(`Failed to update admin: ${err.message}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, updating: false }));
    }
  };

  const handleSuspendAdmin = (admin) => {
    // Frontend guard: only super admins, cannot self-suspend, cannot suspend super admins
    if (!isSuperAdmin) {
      toast.error('Only super admins can suspend admins');
      return;
    }
    if (admin?.id === user?.id) {
      toast.error('You cannot suspend your own account');
      return;
    }
    if (admin?.role === 'super_admin') {
      toast.error('Cannot suspend super admin accounts');
      return;
    }
    setSuspendConfirm({ isOpen: true, admin });
  };

  const confirmSuspendAdmin = async () => {
    const adminId = suspendConfirm.admin.id;
    // Re-validate guard before action
    if (!isSuperAdmin || adminId === user?.id || suspendConfirm.admin?.role === 'super_admin') {
      toast.error('Operation not permitted');
      setSuspendConfirm({ isOpen: false, admin: null });
      return;
    }
    setLoadingStates(prev => ({ ...prev, suspending: { ...prev.suspending, [adminId]: true } }));
    
    try {
      setError('');
      const result = await edgeFunctionsService.suspendUser(
        adminId,
        'admin',
        'Suspended via admin panel'
      );
      if (result.success) {
        await fetchAdmins();
        setSuspendConfirm({ isOpen: false, admin: null });
        toast.success('Admin suspended successfully!');
      } else {
        throw new Error(result.error || 'Failed to suspend admin');
      }
    } catch (err) {
      console.error('❌ Error suspending admin:', err);
      setError(err.message);
      toast.error('Failed to suspend admin');
    } finally {
      setLoadingStates(prev => ({ 
        ...prev, 
        suspending: { ...prev.suspending, [adminId]: false } 
      }));
    }
  };

  const handleReactivateAdmin = async (admin) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can reactivate admins');
      return;
    }
    setLoadingStates(prev => ({ ...prev, reactivating: { ...prev.reactivating, [admin.id]: true } }));
    
    try {
      setError('');
      const result = await edgeFunctionsService.reactivateUser(
        admin.id,
        'admin',
        null,
        'Reactivated via admin panel'
      );
      if (result.success) {
        await fetchAdmins();
        toast.success('Admin reactivated successfully!');
      } else {
        throw new Error(result.error || 'Failed to reactivate admin');
      }
    } catch (err) {
      console.error('❌ Error reactivating admin:', err);
      setError(err.message);
      toast.error('Failed to reactivate admin');
    } finally {
      setLoadingStates(prev => ({ 
        ...prev, 
        reactivating: { ...prev.reactivating, [admin.id]: false } 
      }));
    }
  };

  const openImage = (src, alt) => {
    setImagePreviewModal({ open: true, src: src || '', alt: alt || 'Admin' });
  };
  const closeImage = () => setImagePreviewModal({ open: false, src: '', alt: '' });

  if (adminsLoading) return <div className="p-0">Loading...</div>;

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Management</h1>
        {isSuperAdmin && (
          <CreateButton onClick={() => setShowForm(!showForm)}>
            Add Admin
          </CreateButton>
        )}
      </div>

      {(error || rqError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || rqError?.message}
        </div>
      )}

      {isSuperAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Admin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="border rounded px-3 py-2"
              required
            />
            {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="border rounded px-3 py-2"
              required
            />
            {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="border rounded px-3 py-2 pr-10 w-full"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {formErrors.password && <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>}
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="border rounded px-3 py-2 w-full"
              required
            />
            {formErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{formErrors.confirmPassword}</p>}
            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              className="border rounded px-3 py-2"
            />
            {formErrors.phoneNumber && <p className="text-xs text-red-600 mt-1">{formErrors.phoneNumber}</p>}
                        <input
              type="text"
              placeholder="Position"
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="text-teal-600"
                  />
                  <span>Male</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="text-teal-600"
                  />
                  <span>Female</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={formData.gender === 'other'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="text-teal-600"
                  />
                  <span>Other</span>
                </label>
              </div>
              {formErrors.gender && <p className="text-xs text-red-600 mt-1">{formErrors.gender}</p>}
            </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image (optional)</label>
                <input
                  id="admin-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, profileImageFile: e.target.files?.[0] || null })}
                  className="hidden"
                />
                <label htmlFor="admin-image-upload" className="flex items-center justify-center border-2 border-dashed rounded-lg p-4 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                  <span>Click to upload</span>
                </label>
              </div>
              {imagePreview && (
                <div className="md:col-span-2 flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                    <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-full object-cover border" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, profileImageFile: null })}
                    className="px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <button 
              type="submit" 
              disabled={loadingStates.creating}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loadingStates.creating && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loadingStates.creating ? 'Creating...' : 'Create Admin'}
            </button>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              disabled={loadingStates.creating}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Edit Admin Form */}
      {isSuperAdmin && showEditForm && editAdmin && (
        <form onSubmit={handleUpdateAdmin} className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Edit Admin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={editAdmin.name}
              onChange={(e) => setEditAdmin({...editAdmin, name: e.target.value})}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={editAdmin.email}
              onChange={(e) => setEditAdmin({...editAdmin, email: e.target.value})}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={editAdmin.phoneNumber}
              onChange={(e) => setEditAdmin({...editAdmin, phoneNumber: e.target.value})}
              className="border rounded px-3 py-2"
            />
                        <input
              type="text"
              placeholder="Position"
              value={editAdmin.position}
              onChange={(e) => setEditAdmin({...editAdmin, position: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="editGender"
                    value="male"
                    checked={editAdmin.gender === 'male'}
                    onChange={(e) => setEditAdmin({ ...editAdmin, gender: e.target.value })}
                    className="text-teal-600"
                  />
                  <span>Male</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="editGender"
                    value="female"
                    checked={editAdmin.gender === 'female'}
                    onChange={(e) => setEditAdmin({ ...editAdmin, gender: e.target.value })}
                    className="text-teal-600"
                  />
                  <span>Female</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="editGender"
                    value="other"
                    checked={editAdmin.gender === 'other'}
                    onChange={(e) => setEditAdmin({ ...editAdmin, gender: e.target.value })}
                    className="text-teal-600"
                  />
                  <span>Other</span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
                <input
                  id="admin-edit-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setEditAdmin(prev => ({ ...prev, profileImageFile: file }));
                    if (file) {
                      const objUrl = URL.createObjectURL(file);
                      setEditImagePreview(objUrl);
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="admin-edit-image-upload" className="flex items-center justify-center border-2 border-dashed rounded-lg p-4 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                  <span>Click to upload</span>
                </label>
              </div>
              {editImagePreview && (
                <div className="md:col-span-2 flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                    <img src={editImagePreview} alt="Preview" className="h-24 w-24 rounded-full object-cover border" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditAdmin(prev => ({ ...prev, profileImageFile: null }));
                      setEditImagePreview('');
                    }}
                    className="px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <button 
              type="submit" 
              disabled={loadingStates.updating}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loadingStates.updating && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loadingStates.updating ? 'Updating...' : 'Update Admin'}
            </button>
            <button 
              type="button" 
              onClick={() => {setShowEditForm(false); setEditAdmin(null);}} 
              disabled={loadingStates.updating}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Mobile Cards (below md) */}
      <div className="md:hidden grid grid-cols-1 gap-3 mb-6">
        {admins.map((admin) => {
          const canManage = isSuperAdmin && admin.role !== 'super_admin' && admin.id !== user?.id;
          const roleBadge = admin.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
          const statusBadge = admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
          return (
            <div key={admin.id} className="bg-white rounded-2xl border border-gray-200 ring-1 ring-gray-100 p-4 shadow-sm flex flex-col h-full">
              <div className="flex items-start justify-between gap-3">
                {(() => { const nm = (admin.name || `${admin.firstName || ''} ${admin.surname || ''}`).trim(); const initials = (nm.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('') || 'A').toUpperCase(); const src = admin.profile_image || admin.profileImageUrl; return src ? (<img src={src} alt={nm || 'Admin'} className="h-16 w-16 rounded-full object-cover border cursor-zoom-in hover:ring-2 hover:ring-teal-400" onClick={() => openImage(src, nm || 'Admin')} />) : (<div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold cursor-zoom-in hover:ring-2 hover:ring-teal-400" onClick={() => openImage('', nm || 'Admin')}>{initials}</div>); })()}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{admin.name || `${admin.firstName || ''} ${admin.surname || ''}`.trim() || 'No Name'}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${roleBadge}`}>{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge}`}>{admin.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-sm text-gray-800">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  <span className="break-all">{admin.email}</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493A1 1 0 0011.72 9H19a2 2 0 012 2v7a2 2 0 01-2 2h-5"/></svg>
                  <span>{admin.phone_number || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a7 7 0 100-14 7 7 0 000 14z"/></svg>
                  <span className="capitalize">{admin.gender || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  <span>{admin.position || '-'}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                {canManage ? (
                  <div className="grid grid-cols-2 gap-2">
                    <EditButton onClick={() => handleEditAdmin(admin)} className="w-full" size="xs" />
                    {admin.status === 'suspended' ? (
                      <ReactivateButton onClick={() => handleReactivateAdmin(admin)} className="w-full" size="xs" />
                    ) : (
                      <SuspendButton onClick={() => handleSuspendAdmin(admin)} className="w-full" size="xs" />
                    )}
                    <DeleteButton onClick={() => handleDeleteAdmin(admin)} className="w-full col-span-2" size="xs" />
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">No permissions</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (md and up) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full table-auto">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => { const nm = (admin.name || `${admin.firstName || ''} ${admin.surname || ''}`).trim(); const initials = (nm.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('') || 'A').toUpperCase(); const src = admin.profile_image || admin.profileImageUrl; return src ? (<img src={src} alt={nm || 'Admin'} className="h-16 w-16 rounded-full object-cover border cursor-zoom-in hover:ring-2 hover:ring-teal-400" onClick={() => openImage(src, nm || 'Admin')} />) : (<div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold cursor-zoom-in hover:ring-2 hover:ring-teal-400" onClick={() => openImage('', nm || 'Admin')}>{initials}</div>); })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {admin.name || `${admin.firstName || ''} ${admin.surname || ''}`.trim() || 'No Name'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{admin.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {admin.phone_number || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">
                    {admin.gender || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {admin.position || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    admin.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {(() => {
                      const canManage = isSuperAdmin && admin.role !== 'super_admin' && admin.id !== user?.id;
                      if (!canManage) return <span className="text-gray-400 text-sm">No permissions</span>;
                      return (
                        <>
                          <EditButton onClick={() => handleEditAdmin(admin)} />
                          {admin.status === 'suspended' ? (
                            <ReactivateButton onClick={() => handleReactivateAdmin(admin)} />
                          ) : (
                            <SuspendButton onClick={() => handleSuspendAdmin(admin)} />
                          )}
                          <DeleteButton onClick={() => handleDeleteAdmin(admin)} />
                        </>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      {suspendConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Suspend Admin</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to suspend <span className="font-medium">{suspendConfirm.admin?.name}</span>? 
                They will not be able to access the system until reactivated.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSuspendConfirm({ isOpen: false, admin: null })}
                disabled={loadingStates.suspending[suspendConfirm.admin?.id]}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspendAdmin}
                disabled={loadingStates.suspending[suspendConfirm.admin?.id]}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loadingStates.suspending[suspendConfirm.admin?.id] && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loadingStates.suspending[suspendConfirm.admin?.id] ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Admin</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-medium">{deleteConfirm.admin?.name}</span>? 
                This action cannot be undone and will permanently remove their account and all associated data.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, admin: null })}
                disabled={loadingStates.deleting[deleteConfirm.admin?.id]}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAdmin}
                disabled={loadingStates.deleting[deleteConfirm.admin?.id]}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loadingStates.deleting[deleteConfirm.admin?.id] && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loadingStates.deleting[deleteConfirm.admin?.id] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {imagePreviewModal.open && (
        <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4" onClick={closeImage}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={imagePreviewModal.src || `https://ui-avatars.com/api/?name=${encodeURIComponent(imagePreviewModal.alt || 'Admin')}&size=512&background=random&color=fff&bold=true&format=png`}
              alt={imagePreviewModal.alt}
              className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl"
            />
            <button
              onClick={closeImage}
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full p-2 shadow-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;