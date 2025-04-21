import React, { useState, useEffect } from "react";
import HelpRequests from "@/components/dashboard/HelpRequestsTable";
import StatsCards from "@/components/dashboard/StatsCards";
import TaskList from "@/components/dashboard/TaskList";
import CleanTaskCompletionGraph from "@/components/dashboard/CleanTaskCompletionGraph.jsx";
import InstructorNotificationBell from "@/components/dashboard/InstructorNotificationBell";
import InstructorNotificationsPanel from "@/components/dashboard/InstructorNotificationsPanel";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";

export default function InstructorDashboard() {
  const [instructorName, setInstructorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // First try to get the name from the user object
          if (user.displayName) {
            setInstructorName(user.displayName);
            setLoading(false);
            return;
          }
          
          // If no display name, fetch from Firestore
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Try different name fields that might exist
            const name = userData.displayName || userData.fullName || userData.firstName || 
                         userData.name || user.email.split('@')[0];
            
            setInstructorName(name);
          } else {
            // Fallback to email username if no user document
            setInstructorName(user.email.split('@')[0]);
          }
        } catch (error) {
          console.error("Error fetching instructor data:", error);
          // Fallback to generic greeting if there's an error
          setInstructorName("Instructor");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    // Clean up the subscription when the component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 relative">
      {/* Notification Bell - Positioned absolutely in the top right */}
      <div className="absolute top-0 right-0 p-4">
        <InstructorNotificationBell />
      </div>
      
      {/* Welcome Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">
          {loading ? "Welcome to your dashboard!" : `Welcome to your dashboard, ${instructorName}!`}
        </h1>
        <p className="text-gray-600 mt-2">
          Here's a quick overview of your current tasks and stats.
        </p>
      </div>

      {/* Top Section: Help Requests */}
      <HelpRequests />

      {/* Middle Section: Stats + Graph + Notifications */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 space-y-6">
          <StatsCards />
          <CleanTaskCompletionGraph />
        </div>
        <div className="col-span-5">
          {/* Notifications Panel - Made bigger and closer to the left */}
          <div className="bg-white rounded-lg shadow">
            <InstructorNotificationsPanel />
          </div>
        </div>
      </div>

      {/* Bottom Section: Task List */}
      <TaskList />
    </div>
  );
}
