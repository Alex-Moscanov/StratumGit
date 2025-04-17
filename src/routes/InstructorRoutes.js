import { Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import InstructorLayout from "../layouts/InstructorLayout";
import Dashboard from "../instructor/Dashboard";
import Tasks from "../instructor/pages/Tasks";
import Students from "../instructor/pages/Students";

const InstructorRoutes = () => {
  return (
    <Routes>
      <Route element={<PrivateRoute requiredRole="instructor" />}>
        <Route element={<InstructorLayout />}>
          <Route path="/instructor/dashboard" element={<Dashboard />} />
          <Route path="/instructor/tasks" element={<Tasks />} />
          <Route path="/instructor/students" element={<Students />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default InstructorRoutes;
