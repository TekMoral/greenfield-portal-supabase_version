import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { studentService } from "../../services/supabase";
import { timetableService } from "../../services/supabase";

const Timetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      if (!user?.id) return;

      try {
        const studentData = await studentService.getStudentById(user.id);
    
        if (!studentData?.class || !studentData?.department) {
          throw new Error("Missing class or department in student profile.");
        }

        const data = await timetableService.getTimetableByClassAndDepartment(
          studentData.class,
          studentData.department
        );

        // Sort by day order
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const sortedData = data.sort(
          (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        );

        setTimetable(sortedData);
      } catch (err) {
        console.error("Error fetching timetable:", err);
        setError("Could not load timetable.");
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [user]);

  if (loading) return <div className="p-6">Loading timetable...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!timetable.length)
    return <div className="p-6 text-gray-500">No timetable found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📅 Weekly Timetable</h1>
      {timetable.map((day) => (
        <div key={day.id} className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-green-700">{day.day}</h2>
          <div className="border rounded-lg overflow-hidden">
            {day.periods.map((period, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center px-4 py-2 border-b text-sm bg-white hover:bg-gray-50"
              >
                <div className="font-medium w-1/3">{period.time}</div>
                <div className="w-1/3">{period.subject}</div>
                <div className="text-gray-500 text-sm w-1/3 text-right">{period.teacher}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timetable;
