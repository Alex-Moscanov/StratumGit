// src/layouts/StudentLayout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { auth, firestore } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import StudentSidebar from "@/components/student/StudentSidebar";
import NotificationBell from "@/components/student/NotificationBell";

export default function StudentLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
          
          if (userDoc.exists() && userDoc.data().role === "student") {
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              ...userDoc.data()
            });
          } else {
            // If user is not a student, sign them out and redirect
            await auth.signOut();
            navigate("/student-login");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // No user is signed in
        navigate("/student-login");
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <StudentSidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end h-16 items-center">
              <div className="ml-4 flex items-center md:ml-6">
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}
