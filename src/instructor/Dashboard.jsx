import React from "react";
import HelpRequests from "@/components/dashboard/HelpRequestsTable";
import StatsCards from "@/components/dashboard/StatsCards";
import TaskCompletionGraph from "@/components/dashboard/TaskCompletionGraph";
import TaskList from "@/components/dashboard/TaskList";
import CleanTaskCompletionGraph from "@/components/dashboard/CleanTaskCompletionGraph.jsx";
import InstructorNotificationBell from "@/components/dashboard/InstructorNotificationBell";
import InstructorNotificationsPanel from "@/components/dashboard/InstructorNotificationsPanel";


export default function InstructorDashboard() {
  return (
    <div className="space-y-6 relative">
      {/* Notification Bell - Positioned absolutely in the top right */}
      <div className="absolute top-0 right-0 p-4">
        <InstructorNotificationBell />
      </div>
      
      {/* Welcome Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome to your dashboard, Alex!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's a quick overview of your current tasks and stats.
        </p>
      </div>

      {/* Top Section: Help Requests */}
      <HelpRequests />

      {/* Middle Section: Stats + Graph + Notifications */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <StatsCards />
          <CleanTaskCompletionGraph />
        </div>
        <div className="col-span-4">
          <InstructorNotificationsPanel />
        </div>
      </div>

      {/* Bottom Section: Task List */}
      <TaskList />
    </div>
  );
}
