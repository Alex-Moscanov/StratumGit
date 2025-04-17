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
    serverTimestamp 
  } from "firebase/firestore";
  import { firestore } from "@/config/firebase";
  import { generateAccessCode } from "@/utils/accessCodeGenerator";


  
  /**
   * Create a new course with an automatically generated access code
   * @param {Object} courseData - Course data
   * @param {string} instructorId - ID of the instructor creating the course
   * @returns {Promise<string>} - ID of the created course
   */
  export const createCourse = async (courseData, instructorId) => {
    try {
      // Generate access code for the course
      const accessCode = generateAccessCode();
      
      // Add course to Firestore with access code
      const docRef = await addDoc(collection(firestore, "courses"), {
        ...courseData,
        instructorId,
        accessCode,
        accessCodeCreatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "draft"
      });
      
      return docRef.id;
    } catch (error) {
      console.error("Error creating course:", error);
      throw error;
    }
  };
  
  /**
   * Regenerate access code for a course
   * @param {string} courseId - ID of the course
   * @returns {Promise<string>} - New access code
   */
  export const regenerateAccessCode = async (courseId) => {
    try {
      const newAccessCode = generateAccessCode();
      
      await updateDoc(doc(firestore, "courses", courseId), {
        accessCode: newAccessCode,
        accessCodeCreatedAt: serverTimestamp()
      });
      
      return newAccessCode;
    } catch (error) {
      console.error("Error regenerating access code:", error);
      throw error;
    }
  };
  
  /**
   * Enroll a student in a course using an access code
   * @param {string} accessCode - The access code
   * @param {string} studentId - ID of the student
   * @param {string} studentEmail - Email of the student
   * @returns {Promise<Object>} - Enrollment data
   */
  export const enrollWithAccessCode = async (accessCode, studentId, studentEmail) => {
    try {
      // Find course with matching access code
      const coursesQuery = query(
        collection(firestore, "courses"),
        where("accessCode", "==", accessCode)
      );
      
      const querySnapshot = await getDocs(coursesQuery);
      
      if (querySnapshot.empty) {
        throw new Error("Invalid access code. No matching course found.");
      }
      
      const courseDoc = querySnapshot.docs[0];
      const courseId = courseDoc.id;
      const courseData = courseDoc.data();
      
      // Check if student is already enrolled
      const enrollmentsQuery = query(
        collection(firestore, "enrollments"),
        where("courseId", "==", courseId),
        where("studentId", "==", studentId)
      );
      
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      if (!enrollmentsSnapshot.empty) {
        throw new Error("You are already enrolled in this course.");
      }
      
      // Create new enrollment
      const enrollmentData = {
        courseId,
        studentId,
        email: studentEmail,
        enrolledAt: serverTimestamp(),
        status: "active",
        progress: 0,
        enrollmentMethod: "accessCode"
      };
      
      const enrollmentRef = await addDoc(collection(firestore, "enrollments"), enrollmentData);
      
      return {
        id: enrollmentRef.id,
        ...enrollmentData,
        course: {
          id: courseId,
          title: courseData.title,
          description: courseData.description
        }
      };
    } catch (error) {
      console.error("Error enrolling with access code:", error);
      throw error;
    }
  };
  
  /**
   * Get all courses a student is enrolled in
   * @param {string} studentId - ID of the student
   * @returns {Promise<Array>} - Array of course data
   */
  export const getEnrolledCourses = async (studentId) => {
    try {
      // Get all enrollments for the student
      const enrollmentsQuery = query(
        collection(firestore, "enrollments"),
        where("studentId", "==", studentId)
      );
      
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const enrollments = [];
      
      enrollmentsSnapshot.forEach(doc => {
        enrollments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Get course details for each enrollment
      const courses = [];
      
      for (const enrollment of enrollments) {
        const courseDoc = await getDoc(doc(firestore, "courses", enrollment.courseId));
        
        if (courseDoc.exists()) {
          courses.push({
            id: courseDoc.id,
            ...courseDoc.data(),
            progress: enrollment.progress || 0,
            enrollmentId: enrollment.id,
            enrollmentStatus: enrollment.status
          });
        }
      }
      
      return courses;
    } catch (error) {
      console.error("Error getting enrolled courses:", error);
      throw error;
    }
  };
  