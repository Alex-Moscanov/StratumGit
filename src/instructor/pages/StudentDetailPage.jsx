import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  FiUser, 
  FiMail, 
  FiCalendar, 
  FiArrowLeft, 
  FiLoader, 
  FiBook,
  FiCheckCircle
} from "react-icons/fi";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { getStudentEnrollmentsWithProgress } from "@/services/studentProgressService";

const StudentDetailPage = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Fetch student details
        const studentDoc = await getDoc(doc(firestore, "users", studentId));
        
        if (!studentDoc.exists()) {
          setError("Student not found");
          setLoading(false);
          return;
        }
        
        const studentData = {
          id: studentDoc.id,
          ...studentDoc.data(),
          createdAt: studentDoc.data().createdAt?.toDate() || new Date()
        };
        
        setStudent(studentData);
        
        // Fetch student enrollments with progress
        const enrollmentsData = await getStudentEnrollmentsWithProgress(studentId);
        setEnrollments(enrollmentsData);
        
      } catch (err) {
        console.error("Error fetching student data:", err);
        setError("Failed to load student data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [studentId]);

  // Format date to readable string
  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString();
  };

  // Get display name for student
  const getDisplayName = (student) => {
    if (!student) return "Unknown Student";
    return student.displayName || student.fullName || student.email || "Unknown Student";
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <div className="p-6">
      {/* Back button */}
      <Link to="/instructor/user-management" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <FiArrowLeft className="mr-2" />
        Back to Students
      </Link>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FiLoader className="animate-spin text-4xl text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          {/* Student Profile */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                {getInitials(getDisplayName(student))}
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {getDisplayName(student)}
                </h1>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center text-gray-600">
                    <FiMail className="mr-2" />
                    {student.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiCalendar className="mr-2" />
                    Joined {formatDate(student.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enrolled Courses */}
          <div className="mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Enrolled Courses
              </h2>
            </div>
            
            {enrollments.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Not enrolled in any courses</h3>
                <p className="text-gray-500">This student hasn't enrolled in any courses yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {enrollment.course?.title || "Unknown Course"}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {enrollment.course?.description || "No description available"}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm font-medium text-gray-700">{enrollment.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${enrollment.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Completed lessons */}
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <FiCheckCircle className="mr-2 text-green-500" />
                        {enrollment.completedLessons || 0} of {enrollment.totalLessons || 0} lessons completed
                      </div>
                      

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDetailPage;
