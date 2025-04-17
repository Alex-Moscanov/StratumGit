// src/components/instructor/InstructorNotificationBell.jsx
import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { FiBell } from "react-icons/fi";
import { getInstructorUnreadCount } from "@/services/notificationService";
import InstructorNotificationsPanel from "./InstructorNotificationsPanel";

const InstructorNotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) return;
        
        const instructorId = user.uid;
        const count = await getInstructorUnreadCount(instructorId);
        setUnreadCount(count);
      } catch (err) {
        console.error("Error fetching unread notification count:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();
    
    // Set up an interval to check for new notifications every minute
    const intervalId = setInterval(fetchUnreadCount, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Add click event listener to close notifications when clicking outside
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    
    // Reset unread count when opening notifications
    if (!showNotifications) {
      setUnreadCount(0);
    }
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={toggleNotifications}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifications"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <InstructorNotificationsPanel onClose={closeNotifications} />
      )}
    </div>
  );
};

export default InstructorNotificationBell;
