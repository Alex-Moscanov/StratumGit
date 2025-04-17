import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiUserPlus, FiUserMinus, FiMail, FiSearch, FiCheck, FiX, FiRefreshCw, FiCopy } from "react-icons/fi";
import { enrollStudent, getEnrolledStudents, removeEnrollment, regenerateStudentAccessCode } from "@/services/enrollmentService";

const StudentEnrollment = ({ courseId }) => {
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [courseData, setCourseData] = useState(null);
  const [copySuccess, setCopySuccess] = useState({});
  const [regeneratingCode, setRegeneratingCode] = useState("");

  useEffect(() => {
    const fetchCourseAndEnrollments = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        
        // Fetch course data
        const courseDoc = await getDoc(doc(firestore, "courses", courseId));
        if (courseDoc.exists()) {
          const data = courseDoc.data();
          setCourseData(data);
        }
        
        // Fetch enrolled students with their access codes
        const enrollmentsData = await getEnrolledStudents(courseId);
        setEnrolledStudents(enrollmentsData);
      } catch (err) {
        console.error("Error fetching course data:", err);
        setError("Failed to load course data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndEnrollments();
  }, [courseId]);

  // Enroll a student by email
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    
    try {
      setIsEnrolling(true);
      
      // Check if student is already enrolled
      const existingEnrollment = enrolledStudents.find(
        student => student.email.toLowerCase() === email.toLowerCase()
      );
      
      if (existingEnrollment) {
        setError("This student is already enrolled in this course.");
        setIsEnrolling(false);
        return;
      }
      
      // Enroll student with a unique access code
      const enrollment = await enrollStudent(courseId, email);
      
      // Add to local state
      setEnrolledStudents([
        ...enrolledStudents,
        enrollment
      ]);
      
      setEmail("");
      setError("");
    } catch (err) {
      console.error("Error enrolling student:", err);
      setError("Failed to enroll student. Please try again.");
    } finally {
      setIsEnrolling(false);
    }
  };

  // Remove a student enrollment
  const handleRemoveEnrollment = async (enrollmentId) => {
    try {
      await removeEnrollment(enrollmentId);
      
      // Update local state
      setEnrolledStudents(
        enrolledStudents.filter(student => student.id !== enrollmentId)
      );
    } catch (err) {
      console.error("Error removing enrollment:", err);
      setError("Failed to remove student enrollment. Please try again.");
    }
  };

  // Regenerate access code for a specific student
  const handleRegenerateStudentAccessCode = async (enrollmentId) => {
    try {
      setRegeneratingCode(enrollmentId);
      
      const newAccessCode = await regenerateStudentAccessCode(enrollmentId);
      
      setEnrolledStudents(
        enrolledStudents.map(student => 
          student.id === enrollmentId 
            ? { 
                ...student, 
                accessCode: newAccessCode,
                accessCodeCreatedAt: new Date()
              } 
            : student
        )
      );
      
      setError("");
    } catch (err) {
      console.error("Error regenerating access code:", err);
      setError("Failed to regenerate access code. Please try again.");
    } finally {
      setRegeneratingCode("");
    }
  };

  // Copy access code to clipboard
  const handleCopyAccessCode = (accessCode, enrollmentId) => {
    navigator.clipboard.writeText(accessCode)
      .then(() => {
        setCopySuccess({...copySuccess, [enrollmentId]: true});
        setTimeout(() => {
          setCopySuccess({...copySuccess, [enrollmentId]: false});
        }, 2000);
      })
      .catch(err => {
        console.error("Error copying access code:", err);
        setError("Failed to copy access code. Please try again.");
      });
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredStudents = searchQuery
    ? enrolledStudents.filter(student => 
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.studentName && student.studentName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : enrolledStudents;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold">Student Enrollment</h2>
        <p className="text-sm text-gray-600">Manage students enrolled in this course</p>
      </div>
      
      {/* Enroll new student form */}
      <div className="p-4 border-b">
        <form onSubmit={handleEnrollStudent} className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="student-email" className="sr-only">Student Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-gray-400" />
              </div>
              <input
                id="student-email"
                type="email"
                placeholder="Student email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            disabled={isEnrolling}
          >
            <FiUserPlus className="mr-2" />
            {isEnrolling ? "Enrolling..." : "Enroll Student"}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
      
      {/* Search and filter */}
      <div className="p-4 border-b">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search enrolled students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Enrolled students list */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchQuery 
              ? "No students match your search criteria." 
              : "No students enrolled in this course yet."}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled On
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.email}</div>
                    {student.studentName && (
                      <div className="text-sm text-gray-500">{student.studentName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="bg-gray-100 px-3 py-1 rounded-md font-mono text-sm">
                        {student.accessCode || "N/A"}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAccessCode(student.accessCode, student.id)}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                        title="Copy access code"
                        disabled={!student.accessCode}
                      >
                        {copySuccess[student.id] ? <FiCheck className="text-green-500" /> : <FiCopy />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateStudentAccessCode(student.id)}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center"
                        title="Regenerate access code"
                        disabled={regeneratingCode === student.id}
                      >
                        <FiRefreshCw className={regeneratingCode === student.id ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(student.enrolledAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {student.status === 'active' ? (
                        <><FiCheck className="mr-1" /> Active</>
                      ) : (
                        <><FiX className="mr-1" /> Inactive</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.enrollmentMethod === 'accessCode' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.enrollmentMethod === 'accessCode' ? 'Access Code' : 'Instructor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveEnrollment(student.id)}
                      className="text-red-600 hover:text-red-900 flex items-center ml-auto"
                    >
                      <FiUserMinus className="mr-1" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollment;
