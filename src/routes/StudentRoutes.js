import { Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import StudentLayout from "../layouts/StudentLayout";
import Home from "../student/pages/Home";
import Courses from "../student/pages/Courses";
import Tasks from "../student/pages/Tasks";

const StudentRoutes = () => {
  return (
    <Routes>
      <Route element={<PrivateRoute requiredRole="student" />}>
        <Route element={<StudentLayout />}>
          <Route path="/student/home" element={<Home />} />
          <Route path="/student/courses" element={<Courses />} />
          <Route path="/student/tasks" element={<Tasks />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default StudentRoutes;
