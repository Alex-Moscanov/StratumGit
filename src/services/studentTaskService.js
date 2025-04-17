import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    orderBy,
    Timestamp,
    serverTimestamp 
  } from "firebase/firestore";
  import { firestore } from "@/config/firebase";
  import { createNotification } from "@/services/notificationService";
  
  /**
   * Assign a task to specific students enrolled in a course
   * @param {Object} taskData - Task data including title, description, dueDate, courseId, selectedStudentIds
   * @param {string} instructorId - ID of the instructor assigning the task
   * @returns {Promise<Object>} - Created task data
   */
  export const assignCourseTask = async (taskData, instructorId) => {
    try {
      // Create the master task
      const masterTaskData = {
        title: taskData.title,
        description: taskData.description || "",
        dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
        courseId: taskData.courseId,
        instructorId: instructorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        type: "course"
      };
      
      const masterTaskRef = await addDoc(collection(firestore, "tasks"), masterTaskData);
      const masterTaskId = masterTaskRef.id;
      
      const assignmentPromises = [];
      const notificationPromises = [];
      let assignedCount = 0;
      
      // Get course information for notifications
      const courseDoc = await getDoc(doc(firestore, "courses", taskData.courseId));
      const courseTitle = courseDoc.exists() ? courseDoc.data().title : "your course";
      
      // Check if specific students are selected
      if (taskData.selectedStudentIds && taskData.selectedStudentIds.length > 0) {
        // Create individual student task assignments for selected students
        for (const studentId of taskData.selectedStudentIds) {
          const studentTaskData = {
            masterTaskId,
            title: taskData.title,
            description: taskData.description || "",
            dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
            courseId: taskData.courseId,
            studentId,
            instructorId,
            completed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            notified: false
          };
          
          const promise = addDoc(collection(firestore, "studentTasks"), studentTaskData);
          assignmentPromises.push(promise);
          
          // Create notification for the student
          const notificationData = {
            type: "new_task",
            title: "New Task Assigned",
            message: `You have a new task "${taskData.title}" in ${courseTitle}.${taskData.dueDate ? ` Due on ${new Date(taskData.dueDate).toLocaleDateString()}.` : ''}`,
            studentId,
            courseId: taskData.courseId,
            taskId: masterTaskId,
            priority: "medium"
          };
          
          const notificationPromise = createNotification(notificationData);
          notificationPromises.push(notificationPromise);
          
          assignedCount++;
        }
      } else {
        // Fallback to assigning to all enrolled students if no specific students selected
        const enrollmentsQuery = query(
          collection(firestore, "enrollments"),
          where("courseId", "==", taskData.courseId),
          where("status", "==", "active")
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        // Create individual student task assignments
        enrollmentsSnapshot.forEach(doc => {
          const enrollment = doc.data();
          const studentId = enrollment.studentId;
          
          // Skip if no studentId (e.g., invitation-only enrollments)
          if (!studentId) return;
          
          const studentTaskData = {
            masterTaskId,
            title: taskData.title,
            description: taskData.description || "",
            dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
            courseId: taskData.courseId,
            studentId,
            instructorId,
            completed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            notified: false
          };
          
          const promise = addDoc(collection(firestore, "studentTasks"), studentTaskData);
          assignmentPromises.push(promise);
          
          // Create notification for the student
          const notificationData = {
            type: "new_task",
            title: "New Task Assigned",
            message: `You have a new task "${taskData.title}" in ${courseTitle}.${taskData.dueDate ? ` Due on ${new Date(taskData.dueDate).toLocaleDateString()}.` : ''}`,
            studentId,
            courseId: taskData.courseId,
            taskId: masterTaskId,
            priority: "medium"
          };
          
          const notificationPromise = createNotification(notificationData);
          notificationPromises.push(notificationPromise);
          
          assignedCount++;
        });
      }
      
      // Create a notification for the instructor as well
      const instructorNotificationData = {
        type: "task_assigned",
        title: "Task Assignment Successful",
        message: `You successfully assigned the task "${taskData.title}" to ${assignedCount} student${assignedCount !== 1 ? 's' : ''} in ${courseTitle}.`,
        instructorId,
        courseId: taskData.courseId,
        taskId: masterTaskId,
        priority: "low"
      };
      
      const instructorNotificationPromise = createNotification(instructorNotificationData);
      notificationPromises.push(instructorNotificationPromise);
      
      // Wait for all student task assignments to complete
      await Promise.all(assignmentPromises);
      
      // Wait for all notifications to be created
      await Promise.all(notificationPromises);
      
      // Update the master task with the count of assigned students
      await updateDoc(doc(firestore, "tasks", masterTaskId), {
        assignedCount: assignedCount,
        updatedAt: serverTimestamp()
      });
      
      return {
        id: masterTaskId,
        ...masterTaskData,
        assignedCount: assignedCount,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Error assigning course task:", error);
      throw error;
    }
  };
  
  /**
   * Get all course tasks assigned by an instructor
   * @param {string} instructorId - ID of the instructor
   * @returns {Promise<Array>} - Array of course tasks
   */
  export const getInstructorCourseTasks = async (instructorId) => {
    try {
      const tasksQuery = query(
        collection(firestore, "tasks"),
        where("instructorId", "==", instructorId),
        where("type", "==", "course"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate() || null
      }));
      
      return tasks;
    } catch (error) {
      console.error("Error getting instructor course tasks:", error);
      throw error;
    }
  };
  
  /**
   * Get all tasks assigned to a specific student
   * @param {string} studentId - ID of the student
   * @returns {Promise<Array>} - Array of student tasks
   */
  export const getStudentTasks = async (studentId) => {
    try {
      const tasksQuery = query(
        collection(firestore, "studentTasks"),
        where("studentId", "==", studentId),
        orderBy("dueDate", "asc")
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate() || null
      }));
      
      return tasks;
    } catch (error) {
      console.error("Error getting student tasks:", error);
      throw error;
    }
  };
  
  /**
   * Mark a student task as completed
   * @param {string} taskId - ID of the student task
   * @param {boolean} completed - Completion status
   * @returns {Promise<void>}
   */
  export const updateStudentTaskCompletion = async (taskId, completed) => {
    try {
      await updateDoc(doc(firestore, "studentTasks", taskId), {
        completed,
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating student task completion:", error);
      throw error;
    }
  };
  
  /**
   * Get all overdue tasks that haven't been notified yet
   * @returns {Promise<Array>} - Array of overdue tasks
   */
  export const getOverdueTasks = async () => {
    try {
      const now = new Date();
      
      const tasksQuery = query(
        collection(firestore, "studentTasks"),
        where("completed", "==", false),
        where("notified", "==", false),
        where("dueDate", "<", Timestamp.fromDate(now))
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate() || null
      }));
      
      return tasks;
    } catch (error) {
      console.error("Error getting overdue tasks:", error);
      throw error;
    }
  };
  
  /**
   * Mark a task as notified
   * @param {string} taskId - ID of the student task
   * @returns {Promise<void>}
   */
  export const markTaskNotified = async (taskId) => {
    try {
      await updateDoc(doc(firestore, "studentTasks", taskId), {
        notified: true,
        notifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error marking task as notified:", error);
      throw error;
    }
  };
  
  /**
   * Get task completion statistics for a course
   * @param {string} courseId - ID of the course
   * @returns {Promise<Object>} - Task completion statistics
   */
  export const getCourseTaskStats = async (courseId) => {
    try {
      const tasksQuery = query(
        collection(firestore, "studentTasks"),
        where("courseId", "==", courseId)
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      let totalTasks = 0;
      let completedTasks = 0;
      let overdueTasks = 0;
      const now = new Date();
      
      querySnapshot.forEach(doc => {
        const task = doc.data();
        totalTasks++;
        
        if (task.completed) {
          completedTasks++;
        }
        
        if (!task.completed && task.dueDate && task.dueDate.toDate() < now) {
          overdueTasks++;
        }
      });
      
      return {
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      };
    } catch (error) {
      console.error("Error getting course task stats:", error);
      throw error;
    }
  };
