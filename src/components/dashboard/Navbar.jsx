import React from "react";
import { FiSearch, FiBell } from "react-icons/fi";

export default function Navbar() {
  return (
    <div className="bg-white shadow p-4 flex justify-between items-center">
      {/* Search Bar */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-3 text-gray-500" />
        <input
          type="text"
          placeholder="Search for a user"
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200"
        />
      </div>

      {/* Notifications + Profile */}
      <div className="flex items-center space-x-4">
        <FiBell className="text-gray-700 hover:text-blue-500 cursor-pointer" />
        {/* Placeholder for a profile avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-400" />
      </div>
    </div>
  );
}
