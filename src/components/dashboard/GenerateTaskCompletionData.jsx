import React, { useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { 
  collection, 
  addDoc, 
  Timestamp,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc
} from "firebase/firestore";
import { firestore } from "@/config/firebase";

const GenerateTaskCompletionData = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const generateSampleTaskData = async () => {
    try {
      console.log("Generating sample task completion data...");
      
      // Get all students
      const studentsSnapshot = await getDocs(collection(firestore, "users"));
      const students = studentsSnapshot.docs
        .filter(doc => doc.data().role === "student")
        .map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (students.length === 0) {
        console.warn("No students found to generate sample data");
        return false;
      }
      
      // Get all courses
      const coursesSnapshot = await getDocs(collection(firestore, "courses"));
      const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (courses.length === 0) {
        console.warn("No courses found to generate sample data");
        return false;
      }
      
      // Create sample tasks for each day of the week
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Adjust to make Monday the first day
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Sample task titles
      const taskTitles = [
        "Complete Chapter Review",
        "Submit Assignment",
        "Watch Tutorial Video",
        "Prepare Presentation",
        "Take Practice Quiz",
        "Read Research Paper",
        "Participate in Discussion"
      ];
      
      // For each day of the week
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        
        // Select a random course
        const course = courses[Math.floor(Math.random() * courses.length)];
        
        // Create a master task for this day
        const taskTitle = `${taskTitles[Math.floor(Math.random() * taskTitles.length)]} - ${daysOfWeek[i]}`;
        
        const masterTaskData = {
          title: taskTitle,
          description: `Sample task for ${daysOfWeek[i]}`,
          dueDate: Timestamp.fromDate(dayDate),
          courseId: course.id,
          instructorId: "tj9AzbBnklW7Wf8Z74eH95cZmkH2", // Alex's ID
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          type: "course"
        };
        
        const masterTaskRef = await addDoc(collection(firestore, "tasks"), masterTaskData);
        const masterTaskId = masterTaskRef.id;
        
        // Assign to students
        const assignmentPromises = [];
        let assignedCount = 0;
        
        // Get students enrolled in this course
        const enrollmentsQuery = query(
          collection(firestore, "enrollments"),
          where("courseId", "==", course.id),
          where("status", "==", "active")
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        if (enrollmentsSnapshot.empty) {
          // If no enrollments, assign to all students
          for (const student of students) {
            // Randomly decide if this student completes the task (based on day of week)
            // Higher completion rates for Monday, Tuesday, Saturday
            // Lower for Wednesday, Thursday, Sunday
            // Very low for Friday
            let completionChance;
            switch(i) {
              case 0: // Monday
              case 1: // Tuesday
              case 5: // Saturday
                completionChance = 0.8; // 80% chance
                break;
              case 2: // Wednesday
              case 3: // Thursday
              case 6: // Sunday
                completionChance = 0.6; // 60% chance
                break;
              case 4: // Friday
                completionChance = 0.4; // 40% chance
                break;
              default:
                completionChance = 0.5;
            }
            
            const completed = Math.random() < completionChance;
            
            const studentTaskData = {
              masterTaskId,
              title: taskTitle,
              description: `Sample task for ${daysOfWeek[i]}`,
              dueDate: Timestamp.fromDate(dayDate),
              courseId: course.id,
              studentId: student.id,
              instructorId: "tj9AzbBnklW7Wf8Z74eH95cZmkH2", // Alex's ID
              completed,
              completedAt: completed ? Timestamp.fromDate(dayDate) : null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              notified: false
            };
            
            const promise = addDoc(collection(firestore, "studentTasks"), studentTaskData);
            assignmentPromises.push(promise);
            assignedCount++;
          }
        } else {
          // Assign to enrolled students
          enrollmentsSnapshot.forEach(doc => {
            const enrollment = doc.data();
            const studentId = enrollment.studentId;
            
            // Skip if no studentId
            if (!studentId) return;
            
            // Randomly decide if this student completes the task
            let completionChance;
            switch(i) {
              case 0: // Monday
              case 1: // Tuesday
              case 5: // Saturday
                completionChance = 0.8; // 80% chance
                break;
              case 2: // Wednesday
              case 3: // Thursday
              case 6: // Sunday
                completionChance = 0.6; // 60% chance
                break;
              case 4: // Friday
                completionChance = 0.4; // 40% chance
                break;
              default:
                completionChance = 0.5;
            }
            
            const completed = Math.random() < completionChance;
            
            const studentTaskData = {
              masterTaskId,
              title: taskTitle,
              description: `Sample task for ${daysOfWeek[i]}`,
              dueDate: Timestamp.fromDate(dayDate),
              courseId: course.id,
              studentId,
              instructorId: "tj9AzbBnklW7Wf8Z74eH95cZmkH2", // Alex's ID
              completed,
              completedAt: completed ? Timestamp.fromDate(dayDate) : null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              notified: false
            };
            
            const promise = addDoc(collection(firestore, "studentTasks"), studentTaskData);
            assignmentPromises.push(promise);
            assignedCount++;
          });
        }
        
        // Wait for all student task assignments to complete
        await Promise.all(assignmentPromises);
        
        // Update the master task with the count of assigned students
        await updateDoc(doc(firestore, "tasks", masterTaskId), {
          assignedCount,
          updatedAt: serverTimestamp()
        });
      }
      
      console.log("Sample task completion data generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating sample task completion data:", error);
      throw error;
    }
  };

  const handleGenerateData = async () => {
    try {
      setLoading(true);
      setSuccess(false);
      setError('');
      
      await generateSampleTaskData();
      
      setSuccess(true);
      // Reload the page after 1 second to show the new data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Error generating sample data:', err);
      setError('Failed to generate sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleGenerateData}
        disabled={loading}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <FiRefreshCw className="animate-spin mr-2" />
            Generating...
          </>
        ) : (
          <>
            <FiRefreshCw className="mr-2" />
            Generate Sample Data
          </>
        )}
      </button>
      
      {success && (
        <p className="text-green-600 mt-2">
          Sample data generated successfully! Reloading...
        </p>
      )}
      
      {error && (
        <p className="text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
};

export default GenerateTaskCompletionData;
