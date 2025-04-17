// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import InstructorDashboard from "./instructor/Dashboard";
import HelpRequestsPage from "./instructor/pages/HelpRequestsPage";
import CoursesPage from "./instructor/pages/CoursesPage";
import UserManagementPage from "./instructor/pages/UserManagementPage";

// Pages
import LandingPage from "./pages/LandingPage";
import InstructorLogin from "./auth/InstructorLogin";
import InstructorRegistration from "./auth/InstructorRegistration";
import AddCourse from "./instructor/pages/AddCourse";
import CourseDetailPage from "./instructor/pages/CourseDetailPage";
import CourseEditPage from "./instructor/pages/CourseEditPage";
import MyTasks from "./instructor/pages/MyTasks";
import CourseTasksPage from "./instructor/pages/CourseTasksPage"; 
import AssignmentsPage from "./instructor/pages/AssignmentsPage"; 
import StudentDetailPage from "./instructor/pages/StudentDetailPage";



// Student components
import StudentDashboard from "./student/Dashboard";
import StudentCourseView from "./student/CourseView";
import StudentHelpRequestsPage from "./student/HelpRequestsPage";
import StudentLogin from "./auth/StudentLogin";
import StudentRegistration from "./auth/StudentRegistration";
import StudentLayout from "./layouts/StudentLayout";
import AccessCodeEntry from "./student/AccessCodeEntry";
import StudentCoursesPage from "./student/CoursesPage"; 
import StudentTasksPage from "./student/TasksPage";
import StudentProfilePage from "./student/ProfilePage";

export default function App() {
 return (
   <Routes>
     {/* Landing Page */}
     <Route path="/" element={<LandingPage />} />
     
     {/* Login Pages */}
     <Route path="/instructor-login" element={<InstructorLogin />} />
     <Route path="/instructor-registration" element={<InstructorRegistration />} />
     <Route path="/student-login" element={<StudentLogin />} />
     <Route path="/student-registration" element={<StudentRegistration />} />
     
     {/* Instructor Routes */}
     <Route path="/instructor" element={<DashboardLayout />}>
       <Route path="dashboard" element={<InstructorDashboard />} />
       <Route path="help-requests" element={<HelpRequestsPage />} />
       <Route path="courses" element={<CoursesPage />} />
       <Route path="courses/:courseId" element={<CourseDetailPage />} />
       <Route path="courses/:courseId/edit" element={<CourseEditPage />} />
       <Route path="user-management" element={<UserManagementPage />} />
       <Route path="add-course" element={<AddCourse />} />
       <Route path="my-tasks" element={<MyTasks />} />
       <Route path="courses/:courseId/tasks" element={<CourseTasksPage />} /> 
       <Route path="assignments" element={<AssignmentsPage />} />
       <Route path="students/:studentId" element={<StudentDetailPage />} />
     </Route>
     
     {/* Routes for backward compatibility */}
     <Route path="/dashboard" element={<Navigate to="/instructor/dashboard" replace />} />
     <Route path="/help-requests" element={<Navigate to="/instructor/help-requests" replace />} />
     <Route path="/courses" element={<Navigate to="/instructor/courses" replace />} />
     <Route path="/courses/:courseId" element={<Navigate to="/instructor/courses/:courseId" replace />} />
     <Route path="/courses/:courseId/edit" element={<Navigate to="/instructor/courses/:courseId/edit" replace />} />
     <Route path="/add-course" element={<Navigate to="/instructor/add-course" replace />} />
     <Route path="/user-management" element={<Navigate to="/instructor/user-management" replace />} />
     <Route path="/students" element={<Navigate to="/instructor/user-management" replace />} />
     <Route path="/tasks" element={<Navigate to="/instructor/my-tasks" replace />} />
     <Route path="/courses/:courseId/tasks" element={<Navigate to="/instructor/courses/:courseId/tasks" replace />} /> 
     <Route path="/assignments" element={<Navigate to="/instructor/assignments" replace />} />


     {/* Student Routes */}
     <Route path="/student" element={<StudentLayout />}>
       <Route path="dashboard" element={<StudentDashboard />} />
       <Route path="courses" element={<StudentCoursesPage />} />
       <Route path="courses/:courseId" element={<StudentCourseView />} />
       <Route path="help-requests" element={<StudentHelpRequestsPage />} />
       <Route path="access-code" element={<AccessCodeEntry />} />
       <Route path="tasks" element={<StudentTasksPage />} />
       <Route path="profile" element={<StudentProfilePage />} />
     </Route>
   </Routes>
 );
}
