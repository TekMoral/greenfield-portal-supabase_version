import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherStudentList } from "../../../services/supabase/teacherStudentService";
import { getFullName, getInitials } from "../../../utils/nameUtils";
import { supabase } from "../../../lib/supabaseClient";

const MyStudents = () => {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("all");

  // Fetch teacher classes and all students using React Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher', 'all-students', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user logged in');
      
      // Get all students from teacher's assigned classes via service
      const res = await getTeacherStudentList(user.id);
      const students = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);

      if (!students || students.length === 0) {
        return { classes: [], students: [] };
      }

      // Derive class IDs from returned students
      const classIds = [...new Set(students.map(s => s.classId).filter(Boolean))];

      // Get class details for enriching student data
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds);

      if (classError) {
        console.error('Error fetching class details:', classError);
        throw new Error('Failed to fetch class details');
      }

      // Enrich students with class information
      const enrichedStudents = students.map(student => {
        const studentClass = classDetails.find(cls => String(cls.id) === String(student.class_id));
        return {
          ...student,
          // Maintain a normalized classId for UI logic if needed
          classId: student.class_id,
          className: studentClass?.name || 'Unknown',
          classLevel: studentClass?.level || 'Unknown',
          classCategory: studentClass?.category || 'Unknown'
        };
      });

      // Create simplified class list for filtering
      const simplifiedClasses = classDetails.map(cls => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        category: cls.category
      }));

      return { 
        classes: simplifiedClasses, 
        students: enrichedStudents 
      };
    },
    enabled: !!user?.id,
  });

  const classes = data?.classes || [];
  const students = data?.students || [];

  const filteredStudents = selectedClass === "all" 
    ? students 
    : students.filter(student => String(student.class_id || student.classId) === String(selectedClass));

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center mx-2 sm:mx-0">
        <div className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4">⚠️</div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Error Loading Students</h2>
        <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">{error?.message || 'Failed to load your students. Please try again.'}</p>
        <button
          onClick={() => refetch()}
          className="bg-slate-800 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Students</h1>
        <div className="text-sm text-gray-600">
          {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
        </div>
      </div>

      {/* Class Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by Class:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="all">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Students List</h2>
        </div>
        
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <p>No students found for the selected class.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <div key={student.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      {student.profileImageUrl ? (
                        <img 
                          src={student.profileImageUrl} 
                          alt={getFullName(student)}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-teal-700 font-semibold text-sm">
                          {getInitials(student)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{getFullName(student)}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>ID: {student.admission_number}</span>
                        <span>•</span>
                        <span>{student.className}</span>
                        <span>•</span>
                        <span>{student.classLevel}</span>
                        {student.classCategory && (
                          <>
                            <span>•</span>
                            <span>{student.classCategory}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
                      View Profile
                    </button>
                    <button className="border border-teal-600 text-teal-600 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium">
                      Grades
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;