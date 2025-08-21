import { useState, useEffect } from 'react';
import { getAllAdmins } from '../../services/supabase/adminService';
import edgeFunctionsService from '../../services/supabase/edgeFunctions';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { EditButton, DeleteButton, SuspendButton, ReactivateButton, CreateButton } from '../../components/ui/ActionButtons';

const Admins = () => {
  const { isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    phoneNumber: '', 
    department: '', 
    position: '' 
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [suspendConfirm, setSuspendConfirm] = useState({ isOpen: false, admin: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, admin: null });
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

  const fetchAdmins = async () => {
    try {
      const result = await getAllAdmins();
      if (result && result.success) {
        const list = (result.data || []).map((a) => ({
          ...a,
          name: a.full_name || a.name,
          isActive: typeof a.is_active === 'boolean' ? a.is_active : a.isActive,
        }));
        setAdmins(list);
      } else {
        throw new Error(result?.error || 'Failed to fetch admins');
      }
    } catch (err) {
      setError(err.message);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingStates(prev => ({ ...prev, creating: true }));
    
    try {
      const result = await edgeFunctionsService.createAdmin(formData);
      if (result.success) {
        setFormData({ 
          name: '', 
          email: '', 
          password: '', 
          phoneNumber: '', 
          department: '', 
          position: '' 
        });
        setShowForm(false);
        fetchAdmins();
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
    setDeleteConfirm({ isOpen: true, admin });
  };

  const confirmDeleteAdmin = async () => {
    const adminId = deleteConfirm.admin.id;
    setLoadingStates(prev => ({ ...prev, deleting: { ...prev.deleting, [adminId]: true } }));
    
    try {
      setError('');
      const result = await edgeFunctionsService.deleteAdmin(adminId);
      if (result.success) {
        fetchAdmins();
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
    setEditAdmin({
      id: admin.id,
      name: admin.name || admin.full_name,
      email: admin.email,
      phoneNumber: admin.phone_number || '',
      department: admin.department || '',
      position: admin.position || ''
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
        department: editAdmin.department,
        position: editAdmin.position
      };

      const result = await edgeFunctionsService.updateUser(editAdmin.id, 'admin', updateData);

      if (result && result.success) {
        fetchAdmins();
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
    setSuspendConfirm({ isOpen: true, admin });
  };

  const confirmSuspendAdmin = async () => {
    const adminId = suspendConfirm.admin.id;
    setLoadingStates(prev => ({ ...prev, suspending: { ...prev.suspending, [adminId]: true } }));
    
    try {
      setError('');
      const result = await edgeFunctionsService.suspendUser(
        adminId,
        'admin',
        'Suspended via admin panel'
      );
      if (result.success) {
        fetchAdmins();
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
        fetchAdmins();
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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Management</h1>
        {isSuperAdmin && (
          <CreateButton onClick={() => setShowForm(!showForm)}>
            Add Admin
          </CreateButton>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
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
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="border rounded px-3 py-2"
              required
            />
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
            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Department"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Position"
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className="border rounded px-3 py-2"
            />
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
              placeholder="Department"
              value={editAdmin.department}
              onChange={(e) => setEditAdmin({...editAdmin, department: e.target.value})}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Position"
              value={editAdmin.position}
              onChange={(e) => setEditAdmin({...editAdmin, position: e.target.value})}
              className="border rounded px-3 py-2"
            />
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id}>
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
                  <div className="text-sm text-gray-900">
                    {admin.department || '-'}
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
                    {isSuperAdmin && admin.role !== 'super_admin' && (
                      <>
                        <EditButton onClick={() => handleEditAdmin(admin)} />
                        {admin.status === 'suspended' ? (
                          <ReactivateButton onClick={() => handleReactivateAdmin(admin)} />
                        ) : (
                          <SuspendButton onClick={() => handleSuspendAdmin(admin)} />
                        )}
                        <DeleteButton onClick={() => handleDeleteAdmin(admin)} />
                      </>
                    )}
                    {!isSuperAdmin && (
                      <span className="text-gray-400 text-sm">No permissions</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default Admins;