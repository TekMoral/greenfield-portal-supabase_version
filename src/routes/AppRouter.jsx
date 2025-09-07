import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import RoleBasedRoute from "../components/RoleBasedRoute";
import Home from "../pages/Home";
import About from "../pages/About";
import Admission from "../pages/Admission";
import NewsEvents from "../pages/NewsEvents";
import Contact from "../pages/Contact";
import Apply from "../pages/Apply";
import Curriculum from "../pages/academics/Curriculum";
import Subjects from "../pages/academics/Subjects";
import Examinations from "../pages/academics/Examinations";
import AcademicCalendar from "../pages/academics/AcademicCalendar";
import DashboardLayout from "../layouts/DashboardLayout";
import StudentLayout from "../layouts/StudentLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import lazyWithRetry from "../utils/lazyWithRetry";

// Lazy loaded components with retry handling
const Login = lazyWithRetry(() => import("../pages/Login"));
const Unauthorized = lazyWithRetry(() => import("../pages/Unauthorized"));
const CreateAdmin = lazyWithRetry(() => import("../pages/CreateAdmin"));

// Debug/Test components (temporary for migration)
const AuthSessionDebug = lazyWithRetry(() =>
  import("../components/debug/AuthSessionDebug")
);
const TeacherTestComponent = lazyWithRetry(() =>
  import("../components/debug/TeacherTestComponent")
);
const NewsSchemaTest = lazyWithRetry(() =>
  import("../components/debug/NewsSchemaTest")
);

const StudentDashboard = lazyWithRetry(() => import("../pages/student/Dashboard"));
const Profile = lazyWithRetry(() => import("../pages/student/Profile"));
const Results = lazyWithRetry(() => import("../pages/student/Results"));
const Timetable = lazyWithRetry(() => import("../pages/student/Timetable"));
const StudentSubjects = lazyWithRetry(() => import("../pages/student/Subjects"));
const StudentAssignments = lazyWithRetry(() => import("../pages/student/Assignments"));
const StudentExamResults = lazyWithRetry(() => import("../pages/student/ExamResults"));
const StudentAttendance = lazyWithRetry(() => import("../pages/student/Attendance"));

// Teacher routes
const TeacherDashboard = lazyWithRetry(() =>
  import("../pages/dashboard/teacher/Dashboard")
);
const MyClasses = lazyWithRetry(() => import("../pages/dashboard/teacher/MyClasses"));
const TeacherStudents = lazyWithRetry(() =>
  import("../pages/dashboard/teacher/Students")
);
const Grades = lazyWithRetry(() => import("../pages/dashboard/teacher/Grades"));
const Assignments = lazyWithRetry(() =>
  import("../pages/dashboard/teacher/Assignments")
);
const TeacherTimetable = lazyWithRetry(() =>
  import("../pages/dashboard/teacher/Timetable")
);
const TeacherAttendance = lazyWithRetry(() =>
  import("../pages/dashboard/teacher/Attendance")
);
const TeacherReports = lazyWithRetry(() => import("../pages/dashboard/teacher/Reports"));
const TeacherProfile = lazyWithRetry(() => import("../pages/dashboard/teacher/Profile"));
const TeacherExamResults = lazyWithRetry(() =>
  import("../pages/dashboard/teacher/ExamResults")
);

//Admin Dashboard routes
const Overview = lazyWithRetry(() => import("../pages/dashboard/Overview"));
const Students = lazyWithRetry(() => import("../pages/dashboard/Students"));
const Teachers = lazyWithRetry(() => import("../pages/dashboard/Teachers"));
const Classes = lazyWithRetry(() => import("../pages/dashboard/Classes"));
const ClassStudents = lazyWithRetry(() => import("../pages/dashboard/ClassStudents"));

const Admins = lazyWithRetry(() => import("../pages/dashboard/Admins"));
const Settings = lazyWithRetry(() => import("../pages/dashboard/Settings"));
const AdminSubjects = lazyWithRetry(() => import("../pages/dashboard/Subjects"));
const AdminReports = lazyWithRetry(() => import("../pages/dashboard/Reports"));
const AdminStudentReports = lazyWithRetry(() => import("../pages/dashboard/AdminStudentReports"));
const ManageResults = lazyWithRetry(() => import("../pages/dashboard/ManageResults"));
const AdminAttendance = lazyWithRetry(() => import("../pages/dashboard/AdminAttendance"));

const AdminReview = lazyWithRetry(() => import("../pages/dashboard/AdminReview"));
const CarouselManagement = lazyWithRetry(() =>
  import("../pages/dashboard/CarouselManagement")
);
const NewsManagement = lazyWithRetry(() => import("../pages/dashboard/NewsManagement"));
const ActivityLogs = lazyWithRetry(() => import("../pages/dashboard/ActivityLogs"));
const LogCleanup = lazyWithRetry(() => import("../pages/dashboard/LogCleanup"));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
    <Route path="/admission" element={<Admission />} />
    <Route path="/news" element={<NewsEvents />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/apply" element={<Apply />} />

    {/* Academic Pages */}
    <Route path="/academics/curriculum" element={<Curriculum />} />
    <Route path="/academics/subjects" element={<Subjects />} />
    <Route path="/academics/examinations" element={<Examinations />} />
    <Route path="/academics/calendar" element={<AcademicCalendar />} />

    <Route
      path="/login"
      element={
        <Suspense fallback={<LoadingFallback />}>
          <Login />
        </Suspense>
      }
    />

    <Route
      path="/create-admin"
      element={
        <Suspense fallback={<LoadingFallback />}>
          <CreateAdmin />
        </Suspense>
      }
    />

    {/* Admin Dashboard Routes */}
    <Route
      path="/dashboard"
      element={
        <RoleBasedRoute allowedRoles={["admin", "super_admin"]}>
          <DashboardLayout />
        </RoleBasedRoute>
      }
    >
      <Route
        index
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Overview />
          </Suspense>
        }
      />
      <Route
        path="students"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Students />
          </Suspense>
        }
      />
      <Route
        path="teachers"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Teachers />
          </Suspense>
        }
      />
      <Route
        path="classes"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Classes />
          </Suspense>
        }
      />
      <Route
        path="classes/:slug/students"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <ClassStudents />
          </Suspense>
        }
      />
      <Route
        path="subjects"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminSubjects />
          </Suspense>
        }
      />
      <Route
      path="reports"
      element={
      <Suspense fallback={<LoadingFallback />}>
      <AdminReports />
      </Suspense>
      }
      />
      <Route
      path="student-reports"
      element={
      <RoleBasedRoute allowedRoles={["admin", "super_admin"]}>
      <Suspense fallback={<LoadingFallback />}>
      <AdminStudentReports />
      </Suspense>
      </RoleBasedRoute>
      }
      />
      <Route
        path="attendance"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminAttendance />
          </Suspense>
        }
      />
      <Route
        path="admin-review"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminReview />
          </Suspense>
        }
      />
      <Route
        path="admins"
        element={
          <RoleBasedRoute allowedRoles={["super_admin"]}>
            <Suspense fallback={<LoadingFallback />}>
              <Admins />
            </Suspense>
          </RoleBasedRoute>
        }
      />
      <Route
        path="settings"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Settings />
          </Suspense>
        }
      />
      <Route
        path="classes/:classId"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <ClassStudents />
          </Suspense>
        }
      />
      <Route
        path="exams/:examId/manage-results"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <ManageResults />
          </Suspense>
        }
      />
      <Route
        path="carousel"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <CarouselManagement />
          </Suspense>
        }
      />
      <Route
        path="news"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <NewsManagement />
          </Suspense>
        }
      />
      <Route
        path="activity-logs"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <ActivityLogs />
          </Suspense>
        }
      />
      <Route
        path="log-cleanup"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <LogCleanup />
          </Suspense>
        }
      />
    </Route>

    {/* Teacher Routes */}
    <Route
      path="/teacher"
      element={
        <RoleBasedRoute allowedRoles={["teacher", "admin", "super_admin"]}>
          <TeacherLayout />
        </RoleBasedRoute>
      }
    >
      <Route
        index
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherDashboard />
          </Suspense>
        }
      />
      <Route
        path="classes"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <MyClasses />
          </Suspense>
        }
      />
      <Route
        path="students"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherStudents />
          </Suspense>
        }
      />
      <Route
        path="grades"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Grades />
          </Suspense>
        }
      />
      <Route
        path="assignments"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Assignments />
          </Suspense>
        }
      />
      <Route
        path="timetable"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherTimetable />
          </Suspense>
        }
      />
      <Route
        path="attendance"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherAttendance />
          </Suspense>
        }
      />
      <Route
        path="reports"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherReports />
          </Suspense>
        }
      />
            <Route
        path="profile"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherProfile />
          </Suspense>
        }
      />
      <Route
        path="subjects/:subjectName/students"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <MyClasses />
          </Suspense>
        }
      />
      <Route
        path="subjects/:subjectName/assignments"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Assignments />
          </Suspense>
        }
      />
      <Route
        path="exam-results"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <TeacherExamResults />
          </Suspense>
        }
      />
                </Route>

    {/* Student Portal Routes (Nested) */}
    <Route
      path="/student"
      element={
        <RoleBasedRoute allowedRoles={["student", "admin", "super_admin"]}>
          <StudentLayout />
        </RoleBasedRoute>
      }
    >
      <Route
        index
        element={
          <Suspense fallback={<LoadingFallback />}>
            <StudentDashboard />
          </Suspense>
        }
      />
      <Route
        path="profile"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Profile />
          </Suspense>
        }
      />
      <Route
        path="subjects"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <StudentSubjects />
          </Suspense>
        }
      />
      <Route
        path="results"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Results />
          </Suspense>
        }
      />
      <Route
        path="exam-results"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <StudentExamResults />
          </Suspense>
        }
      />
      <Route
        path="timetable"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <Timetable />
          </Suspense>
        }
      />
      <Route
        path="assignments"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <StudentAssignments />
          </Suspense>
        }
      />
      <Route
        path="attendance"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <StudentAttendance />
          </Suspense>
        }
      />
    </Route>

    {/* Unauthorized Route */}
    <Route
      path="/unauthorized"
      element={
        <Suspense fallback={<LoadingFallback />}>
          <Unauthorized />
        </Suspense>
      }
    />

    {/* Debug/Test Routes (temporary) */}
    <Route
      path="/debug/auth"
      element={
        <Suspense fallback={<LoadingFallback />}>
          <AuthSessionDebug />
        </Suspense>
      }
    />
    <Route
      path="/debug/teachers"
      element={
        <Suspense fallback={<LoadingFallback />}>
          <TeacherTestComponent />
        </Suspense>
      }
    />
    <Route
      path="/debug/news-schema"
      element={
        <Suspense fallback={<LoadingFallback />}>
          <NewsSchemaTest />
        </Suspense>
      }
    />
  </Routes>
);

export default AppRouter;
