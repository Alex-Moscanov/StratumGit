import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  limit,
  orderBy
} from "firebase/firestore";
import { firestore } from "@/config/firebase";

/**
 * Get all enrollments for a student with course progress information
 * @param {string} studentId - ID of the student
 * @returns {Promise<Array>} - Array of enrollment data with progress information
 */
export const getStudentEnrollmentsWithProgress = async (studentId) => {
  try {
    // Get all enrollments for this student
    const enrollmentsQuery = query(
      collection(firestore, "enrollments"),
      where("studentId", "==", studentId)
    );
    
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    const enrollments = enrollmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt?.toDate() || new Date()
    }));
    
    // Get course details for each enrollment
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = enrollment.courseId;
        let courseData = { title: "Unknown Course" };
        
        // Get course details
        try {
          const courseDoc = await getDoc(doc(firestore, "courses", courseId));
          if (courseDoc.exists()) {
            courseData = {
              id: courseDoc.id,
              ...courseDoc.data()
            };
          }
        } catch (err) {
          console.error(`Error fetching course ${courseId}:`, err);
        }
        
        // Get lesson completions for this student and course
        const completionsQuery = query(
          collection(firestore, "lessonCompletions"),
          where("studentId", "==", studentId),
          where("courseId", "==", courseId)
        );
        
        const completionsSnapshot = await getDocs(completionsQuery);
        const completedLessonsArray = completionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          completedAt: doc.data().completedAt?.toDate() || new Date()
        }));
        
        // Get total lessons for this course
        let totalLessons = 0;
        try {
          const lessonsQuery = query(
            collection(firestore, "lessons"),
            where("courseId", "==", courseId)
          );
          
          const lessonsSnapshot = await getDocs(lessonsQuery);
          totalLessons = lessonsSnapshot.size;
        } catch (err) {
          console.error(`Error fetching lessons for course ${courseId}:`, err);
        }
        
        // Calculate progress percentage based on completed lessons vs total lessons
        let progress = 0;
        let completedLessonsCount = completedLessonsArray.length;
        
        // First check if there's a stored progress value in the enrollment
        if (enrollment.progress !== undefined && enrollment.progress !== null) {
          // Use the stored progress value from the enrollment
          progress = enrollment.progress;
          
          // If we have a progress value but no lessons, set reasonable lesson counts
          if (totalLessons === 0) {
            totalLessons = 10; // Assume 10 lessons for display purposes
            completedLessonsCount = Math.round((progress / 100) * totalLessons);
          }
        } else if (totalLessons > 0) {
          // Calculate progress based on completed lessons
          progress = Math.round((completedLessonsCount / totalLessons) * 100);
        }
        
        // Get last activity date from completions
        let lastActivityDate = null;
        if (completedLessonsArray.length > 0) {
          // Sort completions by date (newest first)
          const sortedCompletions = [...completedLessonsArray].sort((a, b) => 
            b.completedAt.getTime() - a.completedAt.getTime()
          );
          lastActivityDate = sortedCompletions[0].completedAt;
        }
        
        // Also check for activity logs for more recent activity
        try {
          const activityQuery = query(
            collection(firestore, "activityLogs"),
            where("studentId", "==", studentId),
            where("courseId", "==", courseId),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          
          const activitySnapshot = await getDocs(activityQuery);
          if (!activitySnapshot.empty) {
            const latestActivity = activitySnapshot.docs[0].data();
            const activityDate = latestActivity.timestamp?.toDate();
            
            // Update lastActivityDate if this activity is more recent
            if (activityDate && (!lastActivityDate || activityDate > lastActivityDate)) {
              lastActivityDate = activityDate;
            }
          }
        } catch (err) {
          console.error(`Error fetching activity logs for student ${studentId}:`, err);
        }
        
        return {
          ...enrollment,
          course: courseData,
          completedLessons: completedLessonsCount,
          totalLessons,
          progress,
          lastActivityDate
        };
      })
    );
    
    return enrichedEnrollments;
  } catch (error) {
    console.error("Error getting student enrollments with progress:", error);
    throw error;
  }
};

/**
 * Get progress details for a specific student enrollment
 * @param {string} enrollmentId - ID of the enrollment
 * @returns {Promise<Object>} - Enrollment data with progress information
 */
export const getEnrollmentProgress = async (enrollmentId) => {
  try {
    const enrollmentDoc = await getDoc(doc(firestore, "enrollments", enrollmentId));
    
    if (!enrollmentDoc.exists()) {
      throw new Error("Enrollment not found");
    }
    
    const enrollment = {
      id: enrollmentDoc.id,
      ...enrollmentDoc.data(),
      enrolledAt: enrollmentDoc.data().enrolledAt?.toDate() || new Date()
    };
    
    const studentId = enrollment.studentId;
    const courseId = enrollment.courseId;
    
    // Get course details
    let courseData = { title: "Unknown Course" };
    try {
      const courseDoc = await getDoc(doc(firestore, "courses", courseId));
      if (courseDoc.exists()) {
        courseData = {
          id: courseDoc.id,
          ...courseDoc.data()
        };
      }
    } catch (err) {
      console.error(`Error fetching course ${courseId}:`, err);
    }
    
    // Get lesson completions for this student and course
    const completionsQuery = query(
      collection(firestore, "lessonCompletions"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    
    const completionsSnapshot = await getDocs(completionsQuery);
    const completedLessons = completionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      completedAt: doc.data().completedAt?.toDate() || new Date()
    }));
    
    // Get total lessons for this course
    let totalLessons = 0;
    try {
      const lessonsQuery = query(
        collection(firestore, "lessons"),
        where("courseId", "==", courseId)
      );
      
      const lessonsSnapshot = await getDocs(lessonsQuery);
      totalLessons = lessonsSnapshot.size;
    } catch (err) {
      console.error(`Error fetching lessons for course ${courseId}:`, err);
    }
    
    // Calculate progress percentage
    let progress = 0;
    let completedLessonsCount = completedLessons.length;
    
    // First check if there's a stored progress value in the enrollment
    if (enrollment.progress !== undefined && enrollment.progress !== null) {
      // Use the stored progress value from the enrollment
      progress = enrollment.progress;
      
      // If we have a progress value but no lessons, set reasonable lesson counts
      if (totalLessons === 0) {
        totalLessons = 10; // Assume 10 lessons for display purposes
        completedLessonsCount = Math.round((progress / 100) * totalLessons);
      }
    } else if (totalLessons > 0) {
      // Calculate progress based on completed lessons
      progress = Math.round((completedLessonsCount / totalLessons) * 100);
    }
    
    return {
      ...enrollment,
      course: courseData,
      completedLessons: completedLessonsCount,
      totalLessons,
      progress
    };
  } catch (error) {
    console.error("Error getting enrollment progress:", error);
    throw error;
  }
};
