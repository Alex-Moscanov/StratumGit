// src/instructor/pages/UserManagementPage.jsx
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiUser, FiSearch, FiMail, FiBook, FiLoader, FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [enrollmentData, setEnrollmentData] = useState({});
  
  // Navigate to student detail page
  const handleStudentClick = (studentId) => {
    navigate(`/instructor/students/${studentId}`);
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        // Query users with role "student"
        const usersQuery = query(
          collection(firestore, "users"),
          where("role", "==", "student"),
          orderBy("email")
        );
        
        const querySnapshot = await getDocs(usersQuery);
        const studentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        
        setStudents(studentsData);
        
        // Fetch enrollment data for each student
        const enrollmentsByStudent = {};
        
        // Get all enrollments
        const enrollmentsSnapshot = await getDocs(collection(firestore, "enrollments"));
        const enrollments = enrollmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Group enrollments by student ID or email
        enrollments.forEach(enrollment => {
          const studentId = enrollment.studentId || null;
          const studentEmail = enrollment.email?.toLowerCase() || null;
          
          if (studentId) {
            if (!enrollmentsByStudent[studentId]) {
              enrollmentsByStudent[studentId] = [];
            }
            enrollmentsByStudent[studentId].push(enrollment);
          } else if (studentEmail) {
            if (!enrollmentsByStudent[studentEmail]) {
              enrollmentsByStudent[studentEmail] = [];
            }
            enrollmentsByStudent[studentEmail].push(enrollment);
          }
        });
        
        // Fetch course details for each enrollment
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];
        const coursesData = {};
        
        for (const courseId of courseIds) {
          if (courseId) {
            try {
              const courseSnapshot = await getDocs(
                query(collection(firestore, "courses"), where("__name__", "==", courseId))
              );
              
              if (!courseSnapshot.empty) {
                const courseDoc = courseSnapshot.docs[0];
                coursesData[courseId] = {
                  id: courseDoc.id,
                  ...courseDoc.data()
                };
              }
            } catch (err) {
              console.error(`Error fetching course ${courseId}:`, err);
            }
          }
        }
        
        // Add course details to enrollments
        Object.keys(enrollmentsByStudent).forEach(studentKey => {
          enrollmentsByStudent[studentKey] = enrollmentsByStudent[studentKey].map(enrollment => {
            const courseId = enrollment.courseId;
            return {
              ...enrollment,
              course: coursesData[courseId] || { title: "Unknown Course" }
            };
          });
        });
        
        setEnrollmentData(enrollmentsByStudent);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.email?.toLowerCase().includes(searchLower) ||
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower)
    );
  });

  // Get enrollments for a student
  const getStudentEnrollments = (student) => {
    // Try to find enrollments by ID first, then by email
    return enrollmentData[student.id] || 
           enrollmentData[student.email?.toLowerCase()] || 
           [];
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <FiUser className="text-blue-500 mr-2 text-xl" />
          <h1 className="text-2xl font-bold">Students</h1>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search students..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FiLoader className="animate-spin text-4xl text-blue-500" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          {searchTerm ? (
            <>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No students found</h3>
              <p className="text-gray-500">Try a different search term</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No students yet</h3>
              <p className="text-gray-500">Students will appear here once they register</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrolled Courses
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map(student => {
                  const enrollments = getStudentEnrollments(student);
                  
                  return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Navigating to student detail:", student.id);
                        handleStudentClick(student.id);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {student.displayName || student.fullName ? (
                              <span className="text-gray-600 font-medium">
                                {(student.displayName || student.fullName).split(' ').map(name => name.charAt(0)).join('')}
                              </span>
                            ) : (
                              <FiUser className="text-gray-500" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.displayName || student.fullName || "No name provided"}
                            </div>
                          </div>
                          <div className="ml-auto text-gray-400">
                            <FiChevronRight />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <FiMail className="mr-2" />
                          {student.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {enrollments.length > 0 ? (
                          <div className="space-y-1 max-w-md">
                            {enrollments.map((enrollment, index) => (
                              <div key={enrollment.id || index} className="flex items-center text-sm">
                                <FiBook className="mr-2 text-blue-500 flex-shrink-0" />
                                <span className="truncate">
                                  {enrollment.course?.title || "Unknown Course"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not enrolled in any courses</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "Unknown"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
