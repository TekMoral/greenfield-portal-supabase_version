import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { getAdminProfile } from '../../services/supabase/adminService';

const AdminProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const res = await getAdminProfile(user.id);
      if (!res?.success || !res.data) throw new Error(res?.error || 'Failed to fetch admin profile');
      return res.data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => { if (data) setProfile(data); }, [data]);

  if (isLoading) {
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
            {[...Array(4)].map((_, i) => (<div key={i} className="h-4 bg-slate-200 rounded"></div>))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 overflow-hidden p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Unable to Load Profile</h3>
          <p className="text-gray-600 mb-6">{error?.message || 'Failed to load admin profile.'}</p>
          <button onClick={() => refetch()} className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">My Profile</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold">
              {(profile?.full_name || '').slice(0,1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.full_name || 'Admin'}</h2>
              <p className="text-slate-200 capitalize">{profile?.role?.replace('_',' ') || 'admin'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-500">Email</label>
                <p className="text-slate-800">{profile?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">User ID</label>
                <p className="text-slate-800">{profile?.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Active</label>
                <p className="text-slate-800">{profile?.is_active ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Role</label>
                <p className="text-slate-800">{profile?.role}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Timestamps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-500">Created</label>
                <p className="text-slate-800">{profile?.created_at ? new Date(profile.created_at).toLocaleString() : '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Updated</label>
                <p className="text-slate-800">{profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
