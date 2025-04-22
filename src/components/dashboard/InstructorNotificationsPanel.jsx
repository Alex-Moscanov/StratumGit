import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FiBell, FiCheck, FiAlertCircle, FiClock, FiUser, FiBookOpen } from "react-icons/fi";
import { getInstructorNotifications, markNotificationRead, markAllNotificationsRead } from "@/services/notificationService";

const InstructorNotificationsPanel = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authInitialized, setAuthInitialized] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    
    // Use onAuthStateChanged to properly handle authentication state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthInitialized(true);
      
      if (!user) {
        setError("You must be logged in to view notifications");
        setLoading(false);
        return;
      }
      
      try {
        const instructorId = user.uid;
        const notificationsData = await getInstructorNotifications(instructorId);
        setNotifications(notificationsData);
        setError("");
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications. Please try again later.");
      } finally {
        setLoading(false);
      }
    });

    // Clean up the subscription when the component unmounts
    return () => unsubscribe();
  }, []);

  // Effect to handle select all checkbox state
  useEffect(() => {
    if (selectAll) {
      const allSelected = notifications.reduce((acc, notification) => {
        if (!notification.read) {
          acc[notification.id] = true;
        }
        return acc;
      }, {});
      setSelectedNotifications(allSelected);
    } else if (Object.keys(selectedNotifications).length === notifications.filter(n => !n.read).length && 
               Object.keys(selectedNotifications).length > 0) {
      // If all unread notifications are manually selected, update selectAll state
      setSelectAll(true);
    }
  }, [selectAll, notifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
      
      // Remove from selected notifications
      const updatedSelected = { ...selectedNotifications };
      delete updatedSelected[notificationId];
      setSelectedNotifications(updatedSelected);
      
      // Update selectAll state if needed
      if (selectAll && Object.keys(updatedSelected).length < notifications.filter(n => !n.read).length - 1) {
        setSelectAll(false);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    try {
      const selectedIds = Object.keys(selectedNotifications);
      if (selectedIds.length === 0) return;
      
      // Use markAllNotificationsRead instead of individual calls
      await markAllNotificationsRead(selectedIds);
      
      // Update local state for all notifications, including virtual ones
      setNotifications(notifications.map(notification => 
        selectedNotifications[notification.id] 
          ? { ...notification, read: true } 
          : notification
      ));
      
      // Clear selections
      setSelectedNotifications({});
      setSelectAll(false);
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const handleToggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      // Select all unread notifications
      const allSelected = notifications.reduce((acc, notification) => {
        if (!notification.read) {
          acc[notification.id] = true;
        }
        return acc;
      }, {});
      setSelectedNotifications(allSelected);
    } else {
      // Deselect all
      setSelectedNotifications({});
    }
  };

  const handleToggleSelect = (notificationId) => {
    setSelectedNotifications(prev => {
      const updated = { ...prev };
      if (updated[notificationId]) {
        delete updated[notificationId];
      } else {
        updated[notificationId] = true;
      }
      return updated;
    });
  };

  const formatDate = (date) => {
    if (!date) return "";
    
    const now = new Date();
    const notificationDate = date instanceof Date ? date : new Date(date);
    const diff = now - notificationDate;
    
    // Less than a minute
    if (diff < 60 * 1000) {
      return "Just now";
    }
    
    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    // Otherwise, return the date
    return notificationDate.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "help-request":
        return <FiAlertCircle className="text-red-500" />;
      case "enrollment":
        return <FiUser className="text-green-500" />;
      case "course-update":
        return <FiBookOpen className="text-blue-500" />;
      case "upcoming_task":
        return <FiClock className="text-yellow-500" />;
      case "task_completed":
        return <FiCheck className="text-green-500" />;
      default:
        return <FiBell className="text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const selectedCount = Object.keys(selectedNotifications).length;

  return (
    <div className=" mt-2 w-80 bg-white rounded-lg shadow-lg z-40 w-full overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      
      {/* Select All and Mark as Read controls */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="select-all"
              checked={selectAll}
              onChange={handleToggleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
              Select All ({unreadCount})
            </label>
          </div>
          {selectedCount > 0 && (
            <button
              onClick={handleMarkSelectedAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <FiCheck className="mr-1" /> Mark {selectedCount} as read
            </button>
          )}
        </div>
      )}
      
      <div className="max-h-96 overflow-y-auto">
        {!authInitialized || loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-4">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiBell className="text-gray-400 text-xl" />
            </div>
            <p className="text-gray-500">You don't have any notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map(notification => (
              <li 
                key={notification.id} 
                className={`py-4 px-4 ${notification.read ? 'opacity-75' : 'bg-blue-50'}`}
              >
                <div className="flex items-start">
                  {!notification.read && (
                    <div className="flex-shrink-0 mr-2">
                      <input
                        type="checkbox"
                        checked={!!selectedNotifications[notification.id]}
                        onChange={() => handleToggleSelect(notification.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                    </div>
                  )}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title || "Notification"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <FiCheck className="mr-1" /> Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InstructorNotificationsPanel;
