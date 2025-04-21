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
  or,
  writeBatch,
  setDoc
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
    
    // Check which help requests have already been marked as read
    const readHelpRequestsQuery = query(
      collection(firestore, "virtualNotificationsRead"),
      where("instructorId", "==", instructorId),
      where("type", "==", "help-request")
    );
    const readHelpRequestsSnapshot = await getDocs(readHelpRequestsQuery);
    const readHelpRequestIds = new Set();
    readHelpRequestsSnapshot.forEach(doc => {
      readHelpRequestIds.add(doc.data().originalId);
    });
    
    helpRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      helpRequestNotifications.push({
        id: `help-${doc.id}`,
        title: "Help Request",
        message: `New help request from ${data.studentEmail || "a student"}`,
        createdAt: data.createdAt?.toDate() || new Date(),
        type: "help-request",
        read: readHelpRequestIds.has(doc.id), // Check if this help request has been marked as read
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
    
    // Check which enrollments have already been marked as read
    const readEnrollmentsQuery = query(
      collection(firestore, "virtualNotificationsRead"),
      where("instructorId", "==", instructorId),
      where("type", "==", "enrollment")
    );
    const readEnrollmentsSnapshot = await getDocs(readEnrollmentsQuery);
    const readEnrollmentIds = new Set();
    readEnrollmentsSnapshot.forEach(doc => {
      readEnrollmentIds.add(doc.data().originalId);
    });
    
    enrollmentsSnapshot.forEach(doc => {
      const data = doc.data();
      enrollmentNotifications.push({
        id: `enrollment-${doc.id}`,
        title: "New Enrollment",
        message: `${data.email || "A student"} enrolled in a course`,
        createdAt: data.enrolledAt?.toDate() || new Date(),
        type: "enrollment",
        read: readEnrollmentIds.has(doc.id), // Check if this enrollment has been marked as read
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
    if (notificationId.startsWith('help-')) {
      // For help request notifications, store the read status
      const helpRequestId = notificationId.substring(5); // Remove 'help-' prefix
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;
      
      await setDoc(doc(firestore, "virtualNotificationsRead", `help-${helpRequestId}`), {
        originalId: helpRequestId,
        type: "help-request",
        instructorId: user.uid,
        readAt: serverTimestamp()
      });
      
      return;
    } else if (notificationId.startsWith('enrollment-')) {
      // For enrollment notifications, store the read status
      const enrollmentId = notificationId.substring(11); // Remove 'enrollment-' prefix
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;
      
      await setDoc(doc(firestore, "virtualNotificationsRead", `enrollment-${enrollmentId}`), {
        originalId: enrollmentId,
        type: "enrollment",
        instructorId: user.uid,
        readAt: serverTimestamp()
      });
      
      return;
    }
    
    // For regular notifications, update the notification document
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
 * Mark all notifications as read for a user
 * @param {Array<string>} notificationIds - Array of notification IDs to mark as read
 * @returns {Promise<void>}
 */
export const markAllNotificationsRead = async (notificationIds) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) return;
    
    // Separate real notifications from virtual ones
    const realNotificationIds = [];
    const helpRequestIds = [];
    const enrollmentIds = [];
    
    notificationIds.forEach(id => {
      if (id.startsWith('help-')) {
        helpRequestIds.push(id.substring(5)); // Remove 'help-' prefix
      } else if (id.startsWith('enrollment-')) {
        enrollmentIds.push(id.substring(11)); // Remove 'enrollment-' prefix
      } else {
        realNotificationIds.push(id);
      }
    });
    
    // Process real notifications
    if (realNotificationIds.length > 0) {
      const batch = writeBatch(firestore);
      
      realNotificationIds.forEach(id => {
        const notificationRef = doc(firestore, "notifications", id);
        batch.update(notificationRef, {
          read: true,
          readAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    }
    
    // Process help request notifications
    const helpRequestBatch = writeBatch(firestore);
    helpRequestIds.forEach(helpRequestId => {
      const docId = `help-${helpRequestId}`;
      helpRequestBatch.set(doc(firestore, "virtualNotificationsRead", docId), {
        originalId: helpRequestId,
        type: "help-request",
        instructorId: user.uid,
        readAt: serverTimestamp()
      });
    });
    
    // Process enrollment notifications
    enrollmentIds.forEach(enrollmentId => {
      const docId = `enrollment-${enrollmentId}`;
      helpRequestBatch.set(doc(firestore, "virtualNotificationsRead", docId), {
        originalId: enrollmentId,
        type: "enrollment",
        instructorId: user.uid,
        readAt: serverTimestamp()
      });
    });
    
    // Commit the batch if there are any virtual notifications
    if (helpRequestIds.length > 0 || enrollmentIds.length > 0) {
      await helpRequestBatch.commit();
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
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
    
    // Get help requests that have been marked as read
    const readHelpRequestsQuery = query(
      collection(firestore, "virtualNotificationsRead"),
      where("instructorId", "==", instructorId),
      where("type", "==", "help-request")
    );
    const readHelpRequestsSnapshot = await getDocs(readHelpRequestsQuery);
    const readHelpRequestIds = new Set();
    readHelpRequestsSnapshot.forEach(doc => {
      readHelpRequestIds.add(doc.data().originalId);
    });
    
    // Get pending help requests
    const helpRequestsQuery = query(
      collection(firestore, "helpRequests"),
      where("status", "==", "pending")
    );
    
    const helpRequestsSnapshot = await getDocs(helpRequestsQuery);
    // Only count help requests that haven't been marked as read
    helpRequestsSnapshot.forEach(doc => {
      if (!readHelpRequestIds.has(doc.id)) {
        count++;
      }
    });
    
    // Get enrollments that have been marked as read
    const readEnrollmentsQuery = query(
      collection(firestore, "virtualNotificationsRead"),
      where("instructorId", "==", instructorId),
      where("type", "==", "enrollment")
    );
    const readEnrollmentsSnapshot = await getDocs(readEnrollmentsQuery);
    const readEnrollmentIds = new Set();
    readEnrollmentsSnapshot.forEach(doc => {
      readEnrollmentIds.add(doc.data().originalId);
    });
    
    // Get recent enrollments from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const enrollmentsQuery = query(
      collection(firestore, "enrollments"),
      where("enrolledAt", ">=", Timestamp.fromDate(oneDayAgo))
    );
    
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    // Only count enrollments that haven't been marked as read
    enrollmentsSnapshot.forEach(doc => {
      if (!readEnrollmentIds.has(doc.id)) {
        count++;
      }
    });
    
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

// Import Firebase Auth
import { getAuth } from "firebase/auth";
