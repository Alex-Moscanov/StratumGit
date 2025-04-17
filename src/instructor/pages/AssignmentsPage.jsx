// src/instructor/pages/AssignmentsPage.jsx
import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, getDoc, doc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiPlus, FiFilter, FiCalendar, FiClock, FiCheckCircle, FiAlertTriangle, FiLoader, FiUser, FiBook, FiX, FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentDetails, setAssignmentDetails] = useState({
    students: [],
    loading: false,
    error: ""
  });
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });

  useEffect(() => {
    const fetchAssignmentsAndCourses = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          setError("You must be logged in to view assignments");
          setLoading(false);
          return;
        }
        
        // Fetch all courses first
        const coursesQuery = query(
          collection(firestore, "courses"),
          where("instructorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        
        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesData = [];
        
        coursesSnapshot.forEach(doc => {
          coursesData.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          });
        });
        
        setCourses(coursesData);
        
        // Fetch all tasks (assignments)
        const tasksQuery = query(
          collection(firestore, "tasks"),
          where("instructorId", "==", user.uid),
          where("type", "==", "course"),
          orderBy("createdAt", "desc")
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = [];
        
        // Process each task and add course information
        for (const doc of tasksSnapshot.docs) {
          const task = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            dueDate: doc.data().dueDate?.toDate() || null
          };
          
          // Find the course this task belongs to
          const course = coursesData.find(c => c.id === task.courseId);
          if (course) {
            task.courseName = course.title;
          } else {
            task.courseName = "Unknown Course";
          }
          
          tasksData.push(task);
        }
        
        setAssignments(tasksData);
        setFilteredAssignments(tasksData);
        
        // Calculate statistics
        let totalTasks = 0;
        let completedTasks = 0;
        let overdueTasks = 0;
        
        // Fetch student tasks to calculate completion statistics
        const studentTasksQuery = query(
          collection(firestore, "studentTasks"),
          where("instructorId", "==", user.uid)
        );
        
        const studentTasksSnapshot = await getDocs(studentTasksQuery);
        
        studentTasksSnapshot.forEach(doc => {
          const task = doc.data();
          totalTasks++;
          
          if (task.completed) {
            completedTasks++;
          }
          
          if (!task.completed && task.dueDate && task.dueDate.toDate() < new Date()) {
            overdueTasks++;
          }
        });
        
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        setStats({
          totalTasks,
          completedTasks,
          overdueTasks,
          completionRate
        });
        
      } catch (err) {
        console.error("Error fetching assignments:", err);
        setError("Failed to load assignments. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentsAndCourses();
  }, []);
  
  // Filter assignments when selected course changes
  useEffect(() => {
    if (selectedCourse === "all") {
      setFilteredAssignments(assignments);
    } else {
      const filtered = assignments.filter(assignment => assignment.courseId === selectedCourse);
      setFilteredAssignments(filtered);
    }
  }, [selectedCourse, assignments]);
  
  // Handle course filter change
  const handleCourseFilterChange = (e) => {
    setSelectedCourse(e.target.value);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return "No due date";
    
    // Check if date is a valid Date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn("Invalid date value:", date);
      return "Invalid date";
    }
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };
  
  // Check if an assignment is overdue
  const isOverdue = (assignment) => {
    if (!assignment.dueDate) return false;
    
    // Check if dueDate is a valid Date object
    if (!(assignment.dueDate instanceof Date) || isNaN(assignment.dueDate.getTime())) {
      return false;
    }
    
    return new Date() > assignment.dueDate;
  };
  
  // Handle view details click
  const handleViewDetails = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowModal(true);
    setAssignmentDetails({
      students: [],
      loading: true,
      error: ""
    });
    
    try {
      // Fetch student tasks for this assignment
      const studentTasksQuery = query(
        collection(firestore, "studentTasks"),
        where("masterTaskId", "==", assignment.id)
      );
      
      const studentTasksSnapshot = await getDocs(studentTasksQuery);
      const studentTasksData = [];
      
      // Fetch all users at once to improve performance
      const usersQuery = query(collection(firestore, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      
      // Create a map of user data for quick lookup
      const usersMap = {};
      usersSnapshot.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
      
      // Process each student task
      for (const doc of studentTasksSnapshot.docs) {
        const studentTask = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          dueDate: doc.data().dueDate?.toDate() || null,
          completedAt: doc.data().completedAt?.toDate() || null
        };
        
        // Get student information from the users map
        const userData = usersMap[studentTask.studentId];
        if (userData) {
          studentTask.studentName = userData.displayName || userData.fullName || "No name provided";
          studentTask.studentEmail = userData.email || "No email";
        } else {
          studentTask.studentName = "Unknown Student";
          studentTask.studentEmail = "No email";
        }
        
        studentTasksData.push(studentTask);
      }
      
      setAssignmentDetails({
        students: studentTasksData,
        loading: false,
        error: ""
      });
      
    } catch (err) {
      console.error("Error fetching assignment details:", err);
      setAssignmentDetails({
        students: [],
        loading: false,
        error: "Failed to load assignment details. Please try again."
      });
    }
  };
  
  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAssignment(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Assignments</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <div className="flex items-center space-x-4">
          {/* Course Filter */}
          <div className="flex items-center">
            <FiFilter className="mr-2 text-gray-500" />
            <select
              value={selectedCourse}
              onChange={handleCourseFilterChange}
              className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          
          {/* Create New Assignment Button */}
          {selectedCourse !== "all" ? (
            <Link
              to={`/instructor/courses/${selectedCourse}/tasks`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <FiPlus className="mr-2" /> Create Assignment
            </Link>
          ) : (
            <button
              className="px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed flex items-center"
              disabled
              title="Select a course to create an assignment"
            >
              <FiPlus className="mr-2" /> Create Assignment
            </button>
          )}
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
          <p className="text-2xl font-bold">{stats.totalTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Overdue</h3>
          <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
          <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Assignments</h2>
          <p className="text-sm text-gray-600">
            {selectedCourse === "all" 
              ? "Assignments across all courses" 
              : `Assignments for ${courses.find(c => c.id === selectedCourse)?.title || "selected course"}`}
          </p>
        </div>
        
        {filteredAssignments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiCheckCircle className="text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No assignments found</h3>
            <p className="text-gray-500 mb-4">
              {selectedCourse === "all" 
                ? "You haven't created any assignments yet." 
                : `You haven't created any assignments for this course yet.`}
            </p>
            {selectedCourse !== "all" && (
              <Link
                to={`/instructor/courses/${selectedCourse}/tasks`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center"
              >
                <FiPlus className="mr-2" /> Create Your First Assignment
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredAssignments.map(assignment => (
              <li key={assignment.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium text-gray-800">{assignment.title}</h3>
                      <span className="text-sm text-gray-500">
                        Assigned to {assignment.assignedCount || 0} students
                      </span>
                    </div>
                    
                    <div className="flex items-center mt-1">
                      <FiBook className="text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">{assignment.courseName}</span>
                    </div>
                    
                    {assignment.description && (
                      <p className="text-gray-600 mt-2">{assignment.description}</p>
                    )}
                    
                    <div className="mt-2 flex items-center text-sm">
                      {assignment.dueDate && (
                        <span className={`flex items-center ${
                          isOverdue(assignment) ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          <FiCalendar className="mr-1" />
                          {formatDate(assignment.dueDate)}
                          {isOverdue(assignment) && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                              Overdue
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleViewDetails(assignment)}
                    className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md hover:bg-blue-50"
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Assignment Details Modal */}
      {showModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">{selectedAssignment.title} - Student Details</h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-gray-600">
                    <FiBook className="inline mr-1" /> 
                    {selectedAssignment.courseName}
                  </p>
                  {selectedAssignment.description && (
                    <p className="text-gray-700 mt-1">{selectedAssignment.description}</p>
                  )}
                </div>
                <div className="mt-2 md:mt-0">
                  {selectedAssignment.dueDate && (
                    <p className={`flex items-center ${
                      isOverdue(selectedAssignment) ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      <FiCalendar className="mr-1" />
                      Due: {formatDate(selectedAssignment.dueDate)}
                      {isOverdue(selectedAssignment) && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                          Overdue
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {assignmentDetails.loading ? (
                <div className="flex justify-center items-center h-64">
                  <FiLoader className="animate-spin text-3xl text-blue-500" />
                </div>
              ) : assignmentDetails.error ? (
                <div className="bg-red-50 text-red-500 p-4 rounded-lg">
                  {assignmentDetails.error}
                </div>
              ) : assignmentDetails.students.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No student details found for this assignment.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignmentDetails.students.map(student => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {student.studentName && student.studentName !== "No name provided" && student.studentName !== "Unknown Student" ? (
                                  <span className="text-gray-600 font-medium">
                                    {student.studentName.split(' ').map(name => name.charAt(0)).join('')}
                                  </span>
                                ) : (
                                  <FiUser className="text-gray-500" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.studentName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {student.studentEmail}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.completed ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                <FiCheck className="mr-1" /> Completed
                              </span>
                            ) : student.dueDate && student.dueDate < new Date() ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                <FiAlertTriangle className="mr-1" /> Overdue
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.dueDate ? formatDate(student.dueDate) : "No due date"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.completedAt ? formatDate(student.completedAt) : "Not completed"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
