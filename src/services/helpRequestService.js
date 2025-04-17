import { firestore } from "@/config/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * Create a new help request
 * @param {Object} helpRequestData - Help request data
 * @returns {Promise<string>} - ID of the created help request
 */
export const createHelpRequest = async (helpRequestData) => {
  try {
    // If we have user data, add displayName and fullName to the help request
    if (helpRequestData.user) {
      helpRequestData.studentDisplayName = helpRequestData.user.displayName;
      helpRequestData.studentFullName = helpRequestData.user.fullName;
    }
    
    const docRef = await addDoc(collection(firestore, "helpRequests"), {
      ...helpRequestData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "pending"
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating help request:", error);
    throw error;
  }
};

/**
 * Get all help requests for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} - Array of help requests
 */
export const getStudentHelpRequests = async (studentId) => {
  try {
    const helpRequestsQuery = query(
      collection(firestore, "helpRequests"),
      where("studentId", "==", studentId),
      orderBy("updatedAt", "desc")
    );
    
    const helpRequestsSnapshot = await getDocs(helpRequestsQuery);
    const helpRequestsData = [];
    
    helpRequestsSnapshot.forEach(doc => {
      helpRequestsData.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      });
    });
    
    return helpRequestsData;
  } catch (error) {
    console.error("Error fetching student help requests:", error);
    throw error;
  }
};

// Hardcoded student data map for known student IDs
const STUDENT_DATA = {
  "tj9AzbBnklW7Wf8Z74eH95cZmkH2": {
    displayName: "Alex Moscanov",
    fullName: "Alex Moscanov",
    email: "alex.moscanov@example.com"
  }
  // Add more students as needed
};

/**
 * Get all help requests for instructors
 * @returns {Promise<Array>} - Array of help requests
 */
export const getAllHelpRequests = async () => {
  try {
    console.log("getAllHelpRequests: Starting to fetch help requests");
    const helpRequestsQuery = query(
      collection(firestore, "helpRequests"),
      orderBy("createdAt", "desc")
    );
    
    console.log("getAllHelpRequests: Query created, fetching documents");
    const helpRequestsSnapshot = await getDocs(helpRequestsQuery);
    console.log("getAllHelpRequests: Documents fetched, count:", helpRequestsSnapshot.size);
    
    const helpRequestsData = [];
    
    // First pass: collect all help requests and apply hardcoded student data
    helpRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log("getAllHelpRequests: Processing document:", doc.id);
      
      // Handle potential null timestamp values
      const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
      const updatedAt = data.updatedAt ? data.updatedAt.toDate() : new Date();
      
      // Apply hardcoded student data if available
      let studentInfo = {};
      if (data.studentId && STUDENT_DATA[data.studentId]) {
        console.log(`Using hardcoded data for student ${data.studentId}: ${STUDENT_DATA[data.studentId].displayName}`);
        studentInfo = {
          studentDisplayName: STUDENT_DATA[data.studentId].displayName,
          studentFullName: STUDENT_DATA[data.studentId].fullName,
          studentEmail: STUDENT_DATA[data.studentId].email
        };
      }
      
      const helpRequest = { 
        id: doc.id, 
        ...data,
        ...studentInfo, // Add hardcoded student info
        createdAt: createdAt,
        updatedAt: updatedAt
      };
      
      helpRequestsData.push(helpRequest);
    });
    
    // Only attempt to fetch from users collection if we don't have hardcoded data
    const studentIdsToFetch = new Set();
    const helpRequestsByStudentId = new Map();
    
    helpRequestsData.forEach(helpRequest => {
      if (helpRequest.studentId && !STUDENT_DATA[helpRequest.studentId] && 
          (!helpRequest.studentDisplayName && !helpRequest.studentFullName)) {
        studentIdsToFetch.add(helpRequest.studentId);
        
        // Group help requests by student ID for easier updating later
        if (!helpRequestsByStudentId.has(helpRequest.studentId)) {
          helpRequestsByStudentId.set(helpRequest.studentId, []);
        }
        helpRequestsByStudentId.get(helpRequest.studentId).push(helpRequest);
      }
    });
    
    // Second pass: fetch student information only for help requests without hardcoded data
    if (studentIdsToFetch.size > 0) {
      console.log("getAllHelpRequests: Fetching student information for", studentIdsToFetch.size, "students");
      
      // Create a map to store student information by ID
      const studentInfoMap = new Map();
      
      // Fetch student information in batches to avoid large queries
      const studentIdsArray = Array.from(studentIdsToFetch);
      
      // Process in smaller batches if there are many students
      const batchSize = 10;
      for (let i = 0; i < studentIdsArray.length; i += batchSize) {
        const batch = studentIdsArray.slice(i, i + batchSize);
        
        // Create queries for each student ID in the batch
        const studentQueries = batch.map(studentId => {
          return getDocs(query(
            collection(firestore, "users"),
            where("uid", "==", studentId)
          ));
        });
        
        // Wait for all queries to complete
        const results = await Promise.all(studentQueries);
        
        // Process results
        results.forEach((querySnapshot, index) => {
          const studentId = batch[index];
          if (!querySnapshot.empty) {
            const studentData = querySnapshot.docs[0].data();
            studentInfoMap.set(studentId, {
              displayName: studentData.displayName,
              fullName: studentData.fullName,
              email: studentData.email
            });
            console.log(`Found student info for ${studentId}:`, studentData.displayName || studentData.fullName || studentData.email);
          } else {
            console.log(`No user document found for student ID: ${studentId}`);
          }
        });
      }
      
      // Update help requests with student information
      for (const [studentId, requests] of helpRequestsByStudentId.entries()) {
        const studentInfo = studentInfoMap.get(studentId);
        if (studentInfo) {
          // Update all help requests for this student
          requests.forEach(helpRequest => {
            helpRequest.studentDisplayName = studentInfo.displayName;
            helpRequest.studentFullName = studentInfo.fullName;
            helpRequest.studentEmail = studentInfo.email;
            console.log(`Updated help request ${helpRequest.id} with student name: ${studentInfo.displayName || studentInfo.fullName || studentInfo.email}`);
          });
        }
      }
    }
    
    console.log("getAllHelpRequests: Processed all documents, returning data");
    return helpRequestsData;
  } catch (error) {
    console.error("Error fetching all help requests:", error);
    return [];
  }
};

/**
 * Update a help request
 * @param {string} requestId - Help request ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateHelpRequest = async (requestId, updateData) => {
  try {
    await updateDoc(doc(firestore, "helpRequests", requestId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating help request:", error);
    throw error;
  }
};

/**
 * Mark a help request as resolved
 * @param {string} requestId - Help request ID
 * @returns {Promise<void>}
 */
export const markHelpRequestAsResolved = async (requestId) => {
  try {
    await updateDoc(doc(firestore, "helpRequests", requestId), {
      status: "resolved",
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error marking help request as resolved:", error);
    throw error;
  }
};

/**
 * Submit instructor response to a help request
 * @param {string} requestId - Help request ID
 * @param {string} response - Instructor response
 * @returns {Promise<void>}
 */
export const submitInstructorResponse = async (requestId, response) => {
  try {
    await updateDoc(doc(firestore, "helpRequests", requestId), {
      instructorResponse: response,
      status: "answered",
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error submitting instructor response:", error);
    throw error;
  }
};
