import { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp, 
    orderBy, 
    limit,
    addDoc,
    serverTimestamp
  } from "firebase/firestore";
  import { firestore } from "@/config/firebase";
  
  /**
   * Log a lesson completion event
   * @param {string} studentId - ID of the student
   * @param {string} courseId - ID of the course
   * @param {string} lessonId - ID of the lesson
   * @returns {Promise<Object>} - Created log entry
   */
  export const logLessonCompletion = async (studentId, courseId, lessonId) => {
    try {
      const logData = {
        type: "lesson_completion",
        studentId,
        courseId,
        lessonId,
        timestamp: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, "activityLogs"), logData);
      
      return {
        id: docRef.id,
        ...logData,
        timestamp: new Date()
      };
    } catch (error) {
      console.error("Error logging lesson completion:", error);
      throw error;
    }
  };
  
  /**
   * Get lesson completion data for the last 7 days
   * @returns {Promise<Array>} - Array of daily lesson completion counts
   */
  export const getLessonCompletionData = async () => {
    try {
      // Create an array of the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i)); // Start from 6 days ago to today
        return date;
      });
      
      const completionData = [];
      
      // For each day, fetch lesson completion data
      for (const date of last7Days) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        try {
          // Query activityLogs for lesson completions on this day
          const logsQuery = query(
            collection(firestore, "activityLogs"),
            where("type", "==", "lesson_completion"),
            where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
            where("timestamp", "<=", Timestamp.fromDate(endOfDay))
          );
          
          const logsSnapshot = await getDocs(logsQuery);
          
          const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          
          completionData.push({
            date: formattedDate,
            count: logsSnapshot.size,
            value: logsSnapshot.size || 0
          });
        } catch (error) {
          console.error(`Error fetching lesson completion data for ${date.toLocaleDateString()}:`, error);
          
          // If there's an error, use 0 as the value
          const formattedDate = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          
          completionData.push({
            date: formattedDate,
            count: 0,
            value: 0
          });
        }
      }
      
      return completionData;
    } catch (error) {
      console.error("Error fetching lesson completion data:", error);
      throw error;
    }
  };
  
  /**
   * Get total lessons completed by a student
   * @param {string} studentId - ID of the student
   * @returns {Promise<number>} - Number of lessons completed
   */
  export const getStudentLessonsCompleted = async (studentId) => {
    try {
      const logsQuery = query(
        collection(firestore, "activityLogs"),
        where("type", "==", "lesson_completion"),
        where("studentId", "==", studentId)
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      return logsSnapshot.size;
    } catch (error) {
      console.error("Error getting student lessons completed:", error);
      throw error;
    }
  };
  
  /**
   * Get total lessons completed for a course
   * @param {string} courseId - ID of the course
   * @returns {Promise<number>} - Number of lessons completed
   */
  export const getCourseLessonsCompleted = async (courseId) => {
    try {
      const logsQuery = query(
        collection(firestore, "activityLogs"),
        where("type", "==", "lesson_completion"),
        where("courseId", "==", courseId)
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      return logsSnapshot.size;
    } catch (error) {
      console.error("Error getting course lessons completed:", error);
      throw error;
    }
  };
  
  /**
   * Get most active students based on lesson completions
   * @param {number} limit - Maximum number of students to retrieve
   * @returns {Promise<Array>} - Array of student IDs and their completion counts
   */
  export const getMostActiveStudents = async (maxResults = 5) => {
    try {
      const logsQuery = query(
        collection(firestore, "activityLogs"),
        where("type", "==", "lesson_completion")
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      
      // Group by student ID and count completions
      const studentCompletions = {};
      
      logsSnapshot.forEach(doc => {
        const data = doc.data();
        const studentId = data.studentId;
        
        if (studentId) {
          if (!studentCompletions[studentId]) {
            studentCompletions[studentId] = 0;
          }
          
          studentCompletions[studentId]++;
        }
      });
      
      // Convert to array and sort by completion count
      const sortedStudents = Object.entries(studentCompletions)
        .map(([studentId, count]) => ({ studentId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, maxResults);
      
      return sortedStudents;
    } catch (error) {
      console.error("Error getting most active students:", error);
      throw error;
    }
  };
  