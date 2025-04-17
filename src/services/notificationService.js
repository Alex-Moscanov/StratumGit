// src/services/notificationService.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  or
} from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { getOverdueTasks, markTaskNotified } from "@/services/studentTaskService";

/**
 * Create a notification for a student
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} - Created notification
 */
export const createNotification = async (notificationData) => {
  try {
    const notification = {
      ...notificationData,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(firestore, "notifications"), notification);
    
    return {
      id: docRef.id,
      ...notification,
      createdAt: new Date()
    };
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Get notifications for a specific student
 * @param {string} studentId - ID of the student
 * @param {number} limit - Maximum number of notifications to retrieve
 * @returns {Promise<Array>} - Array of notifications
 */
export const getStudentNotifications = async (studentId, maxResults = 20) => {
  try {
    const notificationsQuery = query(
      collection(firestore, "notifications"),
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc"),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
    
    return notifications;
  } catch (error) {
    console.error("Error getting student notifications:", error);
    throw error;
  }
};

/**
 * Get notifications for a specific instructor
 * @param {string} instructorId - ID of the instructor
 * @param {number} maxResults - Maximum number of notifications to retrieve
 * @returns {Promise<Array>} - Array of notifications
 */
export const getInstructorNotifications = async (instructorId, maxResults = 20) => {
  try {
    // First try to get notifications specifically for this instructor
    const notificationsQuery = query(
      collection(firestore, "notifications"),
      where("instructorId", "==", instructorId),
      orderBy("createdAt", "desc"),
      limit(maxResults)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
    
    // If we have enough notifications, return them
    if (notifications.length >= maxResults) {
      return notifications;
    }
    
    // Otherwise, also look for help requests to generate notifications
    const remainingResults = maxResults - notifications.length;
    
    // Get pending help requests
    const helpRequestsQuery = query(
      collection(firestore, "helpRequests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(remainingResults)
    );
    
    const helpRequestsSnapshot = await getDocs(helpRequestsQuery);
    const helpRequestNotifications = [];
    
    helpRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      helpRequestNotifications.push({
        id: `help-${doc.id}`,
        title: "Help Request",
        message: `New help request from ${data.studentEmail || "a student"}`,
        createdAt: data.createdAt?.toDate() || new Date(),
        type: "help-request",
        read: false,
        helpRequestId: doc.id,
        studentId: data.studentId,
        courseId: data.courseId
      });
    });
    
    // Get recent enrollments
    const enrollmentsQuery = query(
      collection(firestore, "enrollments"),
      orderBy("enrolledAt", "desc"),
      limit(remainingResults)
    );
    
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    const enrollmentNotifications = [];
    
    enrollmentsSnapshot.forEach(doc => {
      const data = doc.data();
      enrollmentNotifications.push({
        id: `enrollment-${doc.id}`,
        title: "New Enrollment",
        message: `${data.email || "A student"} enrolled in a course`,
        createdAt: data.enrolledAt?.toDate() || new Date(),
        type: "enrollment",
        read: false,
        enrollmentId: doc.id,
        courseId: data.courseId
      });
    });
    
    // Combine all notifications, sort by date, and limit to maxResults
    const allNotifications = [
      ...notifications,
      ...helpRequestNotifications,
      ...enrollmentNotifications
    ].sort((a, b) => b.createdAt - a.createdAt)
     .slice(0, maxResults);
    
    return allNotifications;
  } catch (error) {
    console.error("Error getting instructor notifications:", error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - ID of the notification
 * @returns {Promise<void>}
 */
export const markNotificationRead = async (notificationId) => {
  try {
    // Check if this is a real notification ID or a generated one
    if (notificationId.startsWith('help-') || notificationId.startsWith('enrollment-')) {
      // For generated notifications, we don't need to update anything
      return;
    }
    
    await updateDoc(doc(firestore, "notifications", notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Create notifications for all overdue tasks
 * This function would typically be called by a scheduled Cloud Function
 * @returns {Promise<number>} - Number of notifications created
 */
export const createOverdueTaskNotifications = async () => {
  try {
    // Get all overdue tasks that haven't been notified yet
    const overdueTasks = await getOverdueTasks();
    
    let notificationCount = 0;
    
    // Create a notification for each overdue task
    for (const task of overdueTasks) {
      // Create notification
      const notificationData = {
        type: "overdue_task",
        title: "Task Overdue",
        message: `Your task "${task.title}" is overdue. It was due on ${task.dueDate.toLocaleDateString()} at ${task.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        studentId: task.studentId,
        courseId: task.courseId,
        taskId: task.id,
        priority: "high"
      };
      
      await createNotification(notificationData);
      
      // Mark the task as notified
      await markTaskNotified(task.id);
      
      notificationCount++;
    }
    
    return notificationCount;
  } catch (error) {
    console.error("Error creating overdue task notifications:", error);
    throw error;
  }
};

/**
 * Get unread notification count for a student
 * @param {string} studentId - ID of the student
 * @returns {Promise<number>} - Number of unread notifications
 */
export const getUnreadNotificationCount = async (studentId) => {
  try {
    const notificationsQuery = query(
      collection(firestore, "notifications"),
      where("studentId", "==", studentId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    throw error;
  }
};

/**
 * Get unread notification count for an instructor
 * @param {string} instructorId - ID of the instructor
 * @returns {Promise<number>} - Number of unread notifications
 */
export const getInstructorUnreadCount = async (instructorId) => {
  try {
    // Get unread notifications for this instructor
    const notificationsQuery = query(
      collection(firestore, "notifications"),
      where("instructorId", "==", instructorId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    let count = querySnapshot.size;
    
    // Also count pending help requests as unread notifications
    const helpRequestsQuery = query(
      collection(firestore, "helpRequests"),
      where("status", "==", "pending")
    );
    
    const helpRequestsSnapshot = await getDocs(helpRequestsQuery);
    count += helpRequestsSnapshot.size;
    
    // Get recent enrollments from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const enrollmentsQuery = query(
      collection(firestore, "enrollments"),
      where("enrolledAt", ">=", Timestamp.fromDate(oneDayAgo))
    );
    
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    count += enrollmentsSnapshot.size;
    
    return count;
  } catch (error) {
    console.error("Error getting instructor unread notification count:", error);
    throw error;
  }
};

/**
 * Simulate the scheduled function that would run to create notifications
 * In a production environment, this would be a Cloud Function triggered by a schedule
 * @returns {Promise<number>} - Number of notifications created
 */
export const simulateScheduledNotifications = async () => {
  try {
    return await createOverdueTaskNotifications();
  } catch (error) {
    console.error("Error simulating scheduled notifications:", error);
    throw error;
  }
};
