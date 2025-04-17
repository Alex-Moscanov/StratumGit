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
   * Enroll a student in a course with a unique access code
   * @param {string} courseId - ID of the course
   * @param {string} email - Email of the student
   * @returns {Promise<Object>} - Enrollment data with generated access code
   */
  export const enrollStudent = async (courseId, email) => {
    try {
      // Generate a unique access code for this student
      const accessCode = generateAccessCode();
      
      // Create enrollment with access code
      const enrollmentData = {
        courseId,
        email: email.trim().toLowerCase(),
        accessCode,
        accessCodeCreatedAt: serverTimestamp(),
        enrolledAt: serverTimestamp(),
        status: "active",
        enrollmentMethod: "instructor",
        progress: 0
      };
      
      const docRef = await addDoc(collection(firestore, "enrollments"), enrollmentData);
      
      return {
        id: docRef.id,
        ...enrollmentData,
        accessCodeCreatedAt: new Date(),
        enrolledAt: new Date()
      };
    } catch (error) {
      console.error("Error enrolling student:", error);
      throw error;
    }
  };
  
  /**
   * Regenerate access code for a specific student enrollment
   * @param {string} enrollmentId - ID of the enrollment
   * @returns {Promise<string>} - New access code
   */
  export const regenerateStudentAccessCode = async (enrollmentId) => {
    try {
      const newAccessCode = generateAccessCode();
      
      await updateDoc(doc(firestore, "enrollments", enrollmentId), {
        accessCode: newAccessCode,
        accessCodeCreatedAt: serverTimestamp()
      });
      
      return newAccessCode;
    } catch (error) {
      console.error("Error regenerating student access code:", error);
      throw error;
    }
  };
  
  /**
   * Get all students enrolled in a course
   * @param {string} courseId - ID of the course
   * @returns {Promise<Array>} - Array of enrollment data
   */
  export const getEnrolledStudents = async (courseId) => {
    try {
      const enrollmentsQuery = query(
        collection(firestore, "enrollments"),
        where("courseId", "==", courseId)
      );
      
      const querySnapshot = await getDocs(enrollmentsQuery);
      const enrollmentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
        accessCodeCreatedAt: doc.data().accessCodeCreatedAt?.toDate() || new Date()
      }));
      
      return enrollmentsData;
    } catch (error) {
      console.error("Error getting enrolled students:", error);
      throw error;
    }
  };
  
  /**
   * Remove a student enrollment
   * @param {string} enrollmentId - ID of the enrollment to remove
   * @returns {Promise<void>}
   */
  export const removeEnrollment = async (enrollmentId) => {
    try {
      await deleteDoc(doc(firestore, "enrollments", enrollmentId));
    } catch (error) {
      console.error("Error removing enrollment:", error);
      throw error;
    }
  };
  
  /**
   * Enroll a student using an access code
   * @param {string} accessCode - The access code
   * @param {string} studentId - ID of the student
   * @param {string} studentEmail - Email of the student
   * @returns {Promise<Object>} - Enrollment and course data
   */
  export const enrollWithAccessCode = async (accessCode, studentId, studentEmail) => {
    try {
      // Find enrollment with matching access code
      const enrollmentsQuery = query(
        collection(firestore, "enrollments"),
        where("accessCode", "==", accessCode)
      );
      
      const querySnapshot = await getDocs(enrollmentsQuery);
      
      if (querySnapshot.empty) {
        throw new Error("Invalid access code. No matching enrollment found.");
      }
      
      const enrollmentDoc = querySnapshot.docs[0];
      const enrollmentData = enrollmentDoc.data();
      const courseId = enrollmentData.courseId;
      
      // Check if student is already enrolled in this course
      const existingEnrollmentQuery = query(
        collection(firestore, "enrollments"),
        where("courseId", "==", courseId),
        where("studentId", "==", studentId)
      );
      
      const existingEnrollmentSnapshot = await getDocs(existingEnrollmentQuery);
      
      if (!existingEnrollmentSnapshot.empty) {
        throw new Error("You are already enrolled in this course.");
      }
      
      // Get course details
      const courseDoc = await getDoc(doc(firestore, "courses", courseId));
      
      if (!courseDoc.exists()) {
        throw new Error("Course not found.");
      }
      
      const courseData = courseDoc.data();
      
      // Create new enrollment for the student
      const studentEnrollmentData = {
        courseId,
        studentId,
        email: studentEmail,
        enrolledAt: serverTimestamp(),
        status: "active",
        progress: 0,
        enrollmentMethod: "accessCode",
        originalEnrollmentId: enrollmentDoc.id
      };
      
      const studentEnrollmentRef = await addDoc(
        collection(firestore, "enrollments"), 
        studentEnrollmentData
      );
      
      return {
        id: studentEnrollmentRef.id,
        ...studentEnrollmentData,
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
  