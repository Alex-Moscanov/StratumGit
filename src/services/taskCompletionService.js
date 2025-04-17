import { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp 
  } from "firebase/firestore";
  import { firestore } from "@/config/firebase";
  
  /**
   * Get task completion data for the last 7 days
   * @returns {Promise<Array>} - Array of daily task completion data
   */
  export const getTaskCompletionByDay = async () => {
    try {
      // Create an array for days of the week
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      // Get current date and determine the start of the current week (Monday)
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Adjust to make Monday the first day
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Get all student tasks
      const tasksQuery = query(
        collection(firestore, "studentTasks"),
        where("dueDate", ">=", Timestamp.fromDate(startOfWeek))
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      
      // Initialize data structure for each day
      const tasksByDay = daysOfWeek.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        
        return {
          day,
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          tasks: [] 
        };
      });
      
      // Process each task
      querySnapshot.forEach(doc => {
        const task = {
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate() || null,
          completedAt: doc.data().completedAt?.toDate() || null
        };
        
        if (task.dueDate) {
          // Get day of week index (0 = Monday, 6 = Sunday)
          const taskDay = task.dueDate.getDay();
          const dayIndex = taskDay === 0 ? 6 : taskDay - 1; // Adjust to make Monday index 0
          
          // Add task to the appropriate day
          tasksByDay[dayIndex].totalTasks++;
          if (task.completed) {
            tasksByDay[dayIndex].completedTasks++;
          }
          
          // Add detailed task info for hover
          tasksByDay[dayIndex].tasks.push({
            id: task.id,
            title: task.title,
            studentId: task.studentId,
            completed: task.completed,
            dueDate: task.dueDate
          });
        }
      });
      
      // Calculate completion rates
      tasksByDay.forEach(day => {
        day.completionRate = day.totalTasks > 0 
          ? Math.round((day.completedTasks / day.totalTasks) * 100) 
          : 0;
      });
      
      return tasksByDay;
    } catch (error) {
      console.error("Error getting task completion by day:", error);
      throw error;
    }
  };
  
  /**
   * Get student names for task details
   * @param {Array} studentIds - Array of student IDs
   * @returns {Promise<Object>} - Map of student IDs to names
   */
  export const getStudentNames = async (studentIds) => {
    try {
      const uniqueIds = [...new Set(studentIds)];
      const studentNames = {};
      
      // Process in batches to avoid large queries
      const batchSize = 10;
      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize);
        
        for (const studentId of batch) {
          const studentsQuery = query(
            collection(firestore, "users"),
            where("uid", "==", studentId)
          );
          
          const querySnapshot = await getDocs(studentsQuery);
          
          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const data = studentDoc.data();
            
            studentNames[studentId] = data.displayName || data.fullName || data.email || "Unknown Student";
          } else {
            studentNames[studentId] = "Unknown Student";
          }
        }
      }
      
      return studentNames;
    } catch (error) {
      console.error("Error getting student names:", error);
      throw error;
    }
  };
  