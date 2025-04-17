import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    Timestamp,
    serverTimestamp,
    updateDoc,
    doc,
    getDoc
  } from "firebase/firestore";
  import { firestore } from "@/config/firebase";
  import { logLessonCompletion } from "@/services/engagementService";
  
  /**
   * Mark a lesson as completed by a student
   * @param {string} studentId - ID of the student
   * @param {string} courseId - ID of the course
   * @param {string} lessonId - ID of the lesson
   * @returns {Promise<Object>} - Created completion record
   */
  export const markLessonCompleted = async (studentId, courseId, lessonId) => {
    try {
      // Check if the lesson is already completed
      const existingQuery = query(
        collection(firestore, "lessonCompletions"),
        where("studentId", "==", studentId),
        where("lessonId", "==", lessonId)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Lesson already completed, return existing record
        const existingDoc = existingSnapshot.docs[0];
        return {
          id: existingDoc.id,
          ...existingDoc.data(),
          completedAt: existingDoc.data().completedAt?.toDate() || new Date()
        };
      }
      
      // Create new completion record
      const completionData = {
        studentId,
        courseId,
        lessonId,
        completedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, "lessonCompletions"), completionData);
      
      // Log the completion for engagement tracking
      await logLessonCompletion(studentId, courseId, lessonId);
      
      // Update course progress
      await updateCourseProgress(studentId, courseId);
      
      return {
        id: docRef.id,
        ...completionData,
        completedAt: new Date()
      };
    } catch (error) {
      console.error("Error marking lesson as completed:", error);
      throw error;
    }
  };
  
  /**
   * Check if a lesson is completed by a student
   * @param {string} studentId - ID of the student
   * @param {string} lessonId - ID of the lesson
   * @returns {Promise<boolean>} - Whether the lesson is completed
   */
  export const isLessonCompleted = async (studentId, lessonId) => {
    try {
      const completionsQuery = query(
        collection(firestore, "lessonCompletions"),
        where("studentId", "==", studentId),
        where("lessonId", "==", lessonId)
      );
      
      const completionsSnapshot = await getDocs(completionsQuery);
      return !completionsSnapshot.empty;
    } catch (error) {
      console.error("Error checking if lesson is completed:", error);
      throw error;
    }
  };
  
  /**
   * Get completed lessons for a student in a course
   * @param {string} studentId - ID of the student
   * @param {string} courseId - ID of the course
   * @returns {Promise<Array>} - Array of completed lesson IDs
   */
  export const getCompletedLessons = async (studentId, courseId) => {
    try {
      const completionsQuery = query(
        collection(firestore, "lessonCompletions"),
        where("studentId", "==", studentId),
        where("courseId", "==", courseId)
      );
      
      const completionsSnapshot = await getDocs(completionsQuery);
      
      return completionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || new Date(),
        lessonId: doc.data().lessonId
      }));
    } catch (error) {
      console.error("Error getting completed lessons:", error);
      throw error;
    }
  };
  
  /**
   * Update course progress for a student
   * @param {string} studentId - ID of the student
   * @param {string} courseId - ID of the course
   * @returns {Promise<void>}
   */
  export const updateCourseProgress = async (studentId, courseId) => {
    try {
      // Get total lessons in the course
      const lessonsQuery = query(
        collection(firestore, "lessons"),
        where("courseId", "==", courseId)
      );
      
      const lessonsSnapshot = await getDocs(lessonsQuery);
      const totalLessons = lessonsSnapshot.size;
      
      if (totalLessons === 0) return;
      
      // Get completed lessons
      const completedLessons = await getCompletedLessons(studentId, courseId);
      const completedCount = completedLessons.length;
      
      // Calculate progress percentage
      const progressPercentage = Math.round((completedCount / totalLessons) * 100);
      
      // Update enrollment record
      const enrollmentsQuery = query(
        collection(firestore, "enrollments"),
        where("studentId", "==", studentId),
        where("courseId", "==", courseId)
      );
      
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (!enrollmentsSnapshot.empty) {
        const enrollmentDoc = enrollmentsSnapshot.docs[0];
        
        await updateDoc(doc(firestore, "enrollments", enrollmentDoc.id), {
          progress: progressPercentage,
          completedLessons: completedCount,
          totalLessons,
          lastActivityAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error updating course progress:", error);
      throw error;
    }
  };
  
  /**
   * Get course progress for a student
   * @param {string} studentId - ID of the student
   * @param {string} courseId - ID of the course
   * @returns {Promise<Object>} - Progress information
   */
  export const getCourseProgress = async (studentId, courseId) => {
    try {
      const enrollmentsQuery = query(
        collection(firestore, "enrollments"),
        where("studentId", "==", studentId),
        where("courseId", "==", courseId)
      );
      
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (enrollmentsSnapshot.empty) {
        return {
          progress: 0,
          completedLessons: 0,
          totalLessons: 0
        };
      }
      
      const enrollmentData = enrollmentsSnapshot.docs[0].data();
      
      return {
        progress: enrollmentData.progress || 0,
        completedLessons: enrollmentData.completedLessons || 0,
        totalLessons: enrollmentData.totalLessons || 0,
        lastActivityAt: enrollmentData.lastActivityAt?.toDate() || null
      };
    } catch (error) {
      console.error("Error getting course progress:", error);
      throw error;
    }
  };

  /**
   * Generate sample lesson completion data for testing and demonstration
   * @returns {Promise<void>}
   */
  export const generateSampleLessonCompletionData = async () => {
    try {
      console.log("Generating sample lesson completion data...");
      
      // Get all students
      const studentsSnapshot = await getDocs(collection(firestore, "users"));
      const students = studentsSnapshot.docs
        .filter(doc => doc.data().role === "student")
        .map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (students.length === 0) {
        console.warn("No students found to generate sample data");
        return;
      }
      
      // Get all courses
      const coursesSnapshot = await getDocs(collection(firestore, "courses"));
      const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (courses.length === 0) {
        console.warn("No courses found to generate sample data");
        return;
      }
      
      // For each course, get lessons
      for (const course of courses) {
        const lessonsSnapshot = await getDocs(
          query(collection(firestore, "lessons"), where("courseId", "==", course.id))
        );
        
        const lessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (lessons.length === 0) continue;
        
        // For each student, randomly complete some lessons
        for (const student of students) {
          // Check if student is enrolled in this course
          const enrollmentQuery = query(
            collection(firestore, "enrollments"),
            where("studentId", "==", student.id),
            where("courseId", "==", course.id)
          );
          
          const enrollmentSnapshot = await getDocs(enrollmentQuery);
          
          if (enrollmentSnapshot.empty) continue; 
          
          const lessonsToComplete = Math.floor(Math.random() * (lessons.length + 1));
          
          const selectedLessons = [...lessons]
            .sort(() => 0.5 - Math.random())
            .slice(0, lessonsToComplete);
          
          // Generate completion dates within the last 30 days
          for (const lesson of selectedLessons) {
            // Check if completion already exists
            const existingQuery = query(
              collection(firestore, "lessonCompletions"),
              where("studentId", "==", student.id),
              where("lessonId", "==", lesson.id)
            );
            
            const existingSnapshot = await getDocs(existingQuery);
            
            if (!existingSnapshot.empty) continue; // Skip if already completed
            
            // Generate random date within last 30 days
            const daysAgo = Math.floor(Math.random() * 30);
            const completedAt = new Date();
            completedAt.setDate(completedAt.getDate() - daysAgo);
            
            // Create completion record
            const completionData = {
              studentId: student.id,
              courseId: course.id,
              lessonId: lesson.id,
              completedAt: Timestamp.fromDate(completedAt)
            };
            
            await addDoc(collection(firestore, "lessonCompletions"), completionData);
            
            // Log the completion for engagement tracking
            await logLessonCompletion(student.id, course.id, lesson.id);
          }
          
          // Update course progress
          await updateCourseProgress(student.id, course.id);
        }
      }
      
      console.log("Sample lesson completion data generated successfully");
    } catch (error) {
      console.error("Error generating sample lesson completion data:", error);
      throw error;
    }
  };

  
