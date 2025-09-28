
import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { getStudentById as getStudent } from "../../services/supabase/studentService";
import ProfileImage from "../../components/common/ProfileImage";
import { formatFullClassName } from "../../utils/classNameFormatter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchStudentProfile = async () => {
    const result = await getStudent(user.id);
    if (result?.success && result.data) {
      const s = result.data;
      const fullName = s.full_name || '';
      const first = fullName.split(' ')[0] || fullName || (user.email?.split('@')[0] || 'Student');
      const rest = fullName.split(' ').slice(1).join(' ');
      const cls = s.classes || null;
      return {
        firstName: first,
        surname: rest,
        admissionNumber: s.admission_number,
        class: cls?.name || 'N/A',
        level: cls?.level || '',
        category: cls?.category || '',
        status: s.status || (s.is_active === false ? 'inactive' : 'active'),
        gender: s.gender || '-',
        dateOfBirth: s.date_of_birth || '-',
        academicYear: new Date().getFullYear(),
        guardianName: s.guardian_name || '-',
        contact: s.phone_number || s.guardian_phone || '-',
        email: s.email || user.email,
        address: s.address || '',
        profileImageUrl: s.profile_image || null,
        image: s.profile_image || null,
      };
    }
    return null;
  };

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: fetchStudentProfile,
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{error?.message || 'Failed to load student profile.'}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['student', 'profile', user?.id] })}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-blue-600 text-4xl mb-4">👤</div>
          <p className="text-blue-600 font-medium">Student not found.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-red-100 text-red-800 border-red-200',
      suspended: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
      <div className="max-w-4xl -mx-3 sm:mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your personal information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white shadow-xl rounded-none sm:rounded-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-6 sm:px-8 sm:py-10">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg p-1">
                  <ProfileImage
                    src={student.profileImageUrl || student.image}
                    alt="Profile"
                    size="xl"
                    fallbackName={`${student.firstName} ${student.surname}`}
                    className="ring-4 ring-white ring-opacity-50"
                  />
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white">
                  {student.firstName} {student.surname}
                </h2>
                <p className="text-green-100 text-lg">
                  {formatFullClassName(student.class, student.level, student.category)}
                </p>
                <div className="mt-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(student.status)}`}>
                    {student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  📋 Personal Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600">🆔</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Admission Number</p>
                      <p className="font-semibold text-gray-900">{student.admissionNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600">👤</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-semibold text-gray-900">{student.gender}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <span className="text-pink-600">🎂</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-semibold text-gray-900">{student.dateOfBirth}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600">🎓</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Class & Level</p>
                      <p className="font-semibold text-gray-900">{formatFullClassName(student.class, student.level, student.category)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-600">📅</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Academic Year</p>
                      <p className="font-semibold text-gray-900">{student.academicYear || new Date().getFullYear()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  📞 Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600">👨‍👩‍👧‍👦</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Guardian</p>
                      <p className="font-semibold text-gray-900">{student.guardianName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600">📱</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-semibold text-gray-900">{student.contact}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600">📧</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-semibold text-gray-900">{student.email}</p>
                    </div>
                  </div>
                  {student.address && (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-600">🏠</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-semibold text-gray-900">{student.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
