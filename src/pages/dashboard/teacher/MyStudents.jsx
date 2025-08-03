import React, { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

const MyStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockClasses = [
      { id: "10a-math", name: "Mathematics - Grade 10A" },
      { id: "11b-physics", name: "Physics - Grade 11B" },
      { id: "9c-math", name: "Mathematics - Grade 9C" }
    ];

    const mockStudents = [
      {
        id: 1,
        name: "John Smith",
        admissionNumber: "2024001",
        email: "john.smith@student.com",
        classId: "10a-math",
        className: "Grade 10A",
        subject: "Mathematics",
        avatar: "JS"
      },
      {
        id: 2,
        name: "Sarah Johnson",
        admissionNumber: "2024002",
        email: "sarah.johnson@student.com",
        classId: "10a-math",
        className: "Grade 10A",
        subject: "Mathematics",
        avatar: "SJ"
      },
      {
        id: 3,
        name: "Mike Wilson",
        admissionNumber: "2024003",
        email: "mike.wilson@student.com",
        classId: "11b-physics",
        className: "Grade 11B",
        subject: "Physics",
        avatar: "MW"
      },
      {
        id: 4,
        name: "Emma Davis",
        admissionNumber: "2024004",
        email: "emma.davis@student.com",
        classId: "9c-math",
        className: "Grade 9C",
        subject: "Mathematics",
        avatar: "ED"
      }
    ];

    setTimeout(() => {
      setClasses(mockClasses);
      setStudents(mockStudents);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredStudents = selectedClass === "all" 
    ? students 
    : students.filter(student => student.classId === selectedClass);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-teal-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow h-16"></div>
          ))}
        </div>
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
                      <span className="text-teal-700 font-semibold text-sm">
                        {student.avatar}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{student.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>ID: {student.admissionNumber}</span>
                        <span>•</span>
                        <span>{student.className}</span>
                        <span>•</span>
                        <span>{student.subject}</span>
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