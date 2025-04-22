import React from "react";
import { Link, useNavigate } from "react-router-dom"; 
import { signOut } from "firebase/auth";             
import { auth } from "@/config/firebase";              
import {
  FiHome,
  FiUsers,
  FiHelpCircle,
  FiCheckCircle,
  FiBook,
  FiUserPlus,
  FiLogOut,
  FiClipboard, 
} from "react-icons/fi";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out");
      navigate("/"); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="w-64 bg-[#373643] text-white h-screen p-6 flex flex-col">
      {/* Logo / Title */}
      <div className="mb-8">
        <Link to="/dashboard">
          <img
            src="/images/logos/side.png"
            alt="Stratum Logo"
            className="w-48 h-auto object-contain mx-auto"
          />
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col space-y-4">
        <Link to="/dashboard" className="flex items-center space-x-2 hover:text-gray-300">
          <FiHome />
          <span>Dashboard</span>
        </Link>
        <Link to="/students" className="flex items-center space-x-2 hover:text-gray-300">
          <FiUsers />
          <span>Students</span>
        </Link>
        <Link to="/courses" className="flex items-center space-x-2 hover:text-gray-300">
          <FiBook />
          <span>Courses</span>
        </Link>
        <Link to="/assignments" className="flex items-center space-x-2 hover:text-gray-300">
          <FiClipboard />
          <span>Assignments</span>
        </Link>
        <Link to="/help-requests" className="flex items-center space-x-2 hover:text-gray-300">
          <FiHelpCircle />
          <span>Help Requests</span>
        </Link>
        <Link to="/tasks" className="flex items-center space-x-2 hover:text-gray-300">
          <FiCheckCircle />
          <span>My Tasks</span>
        </Link>

      </nav>

      <button onClick={handleLogout} className="mt-auto flex items-center space-x-2 hover:text-gray-300">
        <FiLogOut />
        <span>Logout</span>
      </button>
    </div>
  );
}
