import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, getDoc, doc as firestoreDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiPlus, FiFilter, FiCalendar, FiClock, FiCheckCircle, FiAlertTriangle, FiLoader, FiUser, FiBook, FiX, FiCheck, FiRefreshCw, FiClock as FiClockIcon, FiInfo } from "react-icons/fi";
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
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, completed, overdue

  const fetchAssignmentsAndCourses = async () => {
    try {
      setLoading(true);
      setError("");
      
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setError("You must be logged in to view assignments");
        setLoading(false);
        return;
      }

      // Fetch all courses first
      try {
        const coursesQuery = query(
          collection(firestore, "courses"),
          where("instructorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesData = [];

        coursesSnapshot.forEach(docSnapshot => {
          try {
            const courseData = docSnapshot.data();
            coursesData.push({
              id: docSnapshot.id,
              ...courseData,
              createdAt: courseData.createdAt?.toDate() || new Date(),
              updatedAt: courseData.updatedAt?.toDate() || new Date(),
              title: courseData.title || "Untitled Course"
            });
          } catch (courseErr) {
            console.error(`Error processing course ${docSnapshot.id}:`, courseErr);
          }
        });

        setCourses(coursesData);

        // Create a map of course IDs to course names for faster lookup
        const courseMap = {};
        coursesData.forEach(course => {
          courseMap[course.id] = course.title || "Untitled Course";
        });

        // Fetch all tasks (assignments)
        const tasksQuery = query(
          collection(firestore, "tasks"),
          where("instructorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = [];

        // Process each task and add course information
        for (const docSnapshot of tasksSnapshot.docs) {
          try {
            const taskData = docSnapshot.data();
            const task = {
              id: docSnapshot.id,
              ...taskData,
              createdAt: taskData.createdAt?.toDate() || new Date(),
              updatedAt: taskData.updatedAt?.toDate() || new Date(),
              dueDate: taskData.dueDate?.toDate() || null,
              completionStatus: {
                total: 0,
                completed: 0,
                overdue: 0,
                rate: 0
              }
            };

            // Skip tasks that are clearly not assignments (e.g., personal tasks)
            if (task.type === "personal") {
              continue;
            }

            // Find the course this task belongs to using the courseMap
            if (task.courseId && courseMap[task.courseId]) {
              task.courseName = courseMap[task.courseId];
            } else if (task.courseId) {
              // If we have a courseId but no matching course in our map,
              // try to fetch the course directly
              try {
                const courseDocRef = firestoreDoc(firestore, "courses", task.courseId);
                const courseDoc = await getDoc(courseDocRef);
                if (courseDoc.exists()) {
                  task.courseName = courseDoc.data().title || "Untitled Course";
                  // Update our map for future lookups
                  courseMap[task.courseId] = task.courseName;
                } else {
                  task.courseName = "Course Not Found";
                }
              } catch (err) {
                console.error(`Error fetching course ${task.courseId}:`, err);
                task.courseName = "Error Loading Course";
              }
            } else {
              task.courseName = "Personal Task";
            }

            tasksData.push(task);
          } catch (taskErr) {
            console.error(`Error processing task:`, taskErr);
          }
        }

        // Fetch student tasks to calculate completion statistics for each assignment
        try {
          const studentTasksQuery = query(
            collection(firestore, "studentTasks"),
            where("instructorId", "==", user.uid)
          );

          const studentTasksSnapshot = await getDocs(studentTasksQuery);
          
          // Group student tasks by master task ID
          const tasksByMasterId = {};
          
          studentTasksSnapshot.forEach(docSnapshot => {
            try {
              const task = docSnapshot.data();
              const masterTaskId = task.masterTaskId;
              
              if (!masterTaskId) return;
              
              if (!tasksByMasterId[masterTaskId]) {
                tasksByMasterId[masterTaskId] = {
                  total: 0,
                  completed: 0,
                  overdue: 0
                };
              }
              
              tasksByMasterId[masterTaskId].total++;
              
              if (task.completed) {
                tasksByMasterId[masterTaskId].completed++;
              } else if (task.dueDate) {
                // Check if task is overdue (past due date and not completed)
                try {
                  const dueDate = task.dueDate.toDate();
                  if (dueDate < new Date()) {
                    tasksByMasterId[masterTaskId].overdue++;
                  }
                } catch (dateErr) {
                  console.warn("Invalid date format in task:", task.id);
                }
              }
            } catch (taskErr) {
              console.error(`Error processing student task:`, taskErr);
            }
          });
          
          // Update each assignment with its completion statistics
          tasksData.forEach(task => {
            const stats = tasksByMasterId[task.id] || { total: 0, completed: 0, overdue: 0 };
            task.completionStatus = {
              total: stats.total,
              completed: stats.completed,
              overdue: stats.overdue,
              rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
            };
            
            // Set assignment status based on completion statistics
            if (stats.total === 0) {
              task.status = "unassigned";
            } else if (stats.completed === stats.total) {
              task.status = "completed";
            } else if (stats.overdue > 0) {
              task.status = "overdue";
            } else {
              task.status = "pending";
            }
          });
          
          // Calculate overall statistics
          let totalTasks = 0;
          let completedTasks = 0;
          let overdueTasks = 0;
          
          Object.values(tasksByMasterId).forEach(stats => {
            totalTasks += stats.total;
            completedTasks += stats.completed;
            overdueTasks += stats.overdue;
          });
          
          const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          
          setStats({
            totalTasks,
            completedTasks,
            overdueTasks,
            completionRate
          });
        } catch (statsErr) {
          console.error("Error calculating statistics:", statsErr);
          setStats({
            totalTasks: tasksData.length,
            completedTasks: 0,
            overdueTasks: 0,
            completionRate: 0
          });
        }

        setAssignments(tasksData);
        
        // Apply current filters
        applyFilters(tasksData, selectedCourse, statusFilter);
      } catch (fetchErr) {
        console.error("Error fetching courses or tasks:", fetchErr);
        setError("Failed to load courses or assignments. Please try again later.");
      }
    } catch (err) {
      console.error("Error in fetchAssignmentsAndCourses:", err);
      setError("Failed to load assignments. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignmentsAndCourses();
  }, []);

  // Apply both course and status filters
  const applyFilters = (assignments, courseFilter, statusFilter) => {
    let filtered = [...assignments];
    
    // Apply course filter
    if (courseFilter !== "all") {
      filtered = filtered.filter(assignment => assignment.courseId === courseFilter);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(assignment => assignment.status === statusFilter);
    }
    
    setFilteredAssignments(filtered);
  };

  // Filter assignments when selected course or status changes
  useEffect(() => {
    applyFilters(assignments, selectedCourse, statusFilter);
  }, [selectedCourse, statusFilter, assignments]);

  // Handle course filter change
  const handleCourseFilterChange = (e) => {
    setSelectedCourse(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssignmentsAndCourses();
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

  // Get status badge for an assignment
  const getStatusBadge = (assignment) => {
    if (!assignment) return null;
    
    switch (assignment.status) {
      case "completed":
        return (
          <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1" />
            Completed
          </span>
        );
      case "overdue":
        return (
          <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <FiAlertTriangle className="mr-1" />
            Overdue
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            <FiClockIcon className="mr-1" />
            Pending
          </span>
        );
      case "unassigned":
        return (
          <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            <FiInfo className="mr-1" />
            Unassigned
          </span>
        );
      default:
        return null;
    }
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
      try {
        const usersQuery = query(collection(firestore, "users"));
        const usersSnapshot = await getDocs(usersQuery);

        // Create a map of user data for quick lookup
        const usersMap = {};
        usersSnapshot.forEach(docSnapshot => {
          try {
            usersMap[docSnapshot.id] = docSnapshot.data();
          } catch (userErr) {
            console.error(`Error processing user ${docSnapshot.id}:`, userErr);
          }
        });

        // Process each student task
        for (const docSnapshot of studentTasksSnapshot.docs) {
          try {
            const taskData = docSnapshot.data();
            const studentTask = {
              id: docSnapshot.id,
              ...taskData,
              createdAt: taskData.createdAt?.toDate() || new Date(),
              updatedAt: taskData.updatedAt?.toDate() || new Date(),
              dueDate: taskData.dueDate?.toDate() || null,
              completedAt: taskData.completedAt?.toDate() || null
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
          } catch (taskErr) {
            console.error(`Error processing student task:`, taskErr);
          }
        }

        setAssignmentDetails({
          students: studentTasksData,
          loading: false,
          error: ""
        });
      } catch (usersErr) {
        console.error("Error fetching users:", usersErr);
        setAssignmentDetails({
          students: [],
          loading: false,
          error: "Failed to load student information. Please try again."
        });
      }
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

  if (loading && !refreshing) {
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
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 rounded-full hover:bg-gray-100 ${refreshing ? 'opacity-50' : ''}`}
            title="Refresh assignments"
          >
            <FiRefreshCw className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
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
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <FiAlertTriangle className="mr-2" />
            {error}
          </div>
          <button 
            onClick={handleRefresh}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <FiRefreshCw className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Try Again
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded ${
              statusFilter === "all" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleStatusFilterChange("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded flex items-center ${
              statusFilter === "pending" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleStatusFilterChange("pending")}
          >
            <FiClockIcon className="mr-1" />
            Pending
          </button>
          <button
            className={`px-3 py-1 rounded flex items-center ${
              statusFilter === "completed" 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleStatusFilterChange("completed")}
          >
            <FiCheckCircle className="mr-1" />
            Completed
          </button>
          <button
            className={`px-3 py-1 rounded flex items-center ${
              statusFilter === "overdue" 
                ? "bg-red-100 text-red-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleStatusFilterChange("overdue")}
          >
            <FiAlertTriangle className="mr-1" />
            Overdue
          </button>
          
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Assignments</h2>
          <p className="text-sm text-gray-600">
            {selectedCourse === "all"
              ? "Assignments across all courses"
              : `Assignments for ${courses.find(c => c.id === selectedCourse)?.title || "selected course"}`}
            {statusFilter !== "all" && ` - ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
          </p>
        </div>

        {refreshing && (
          <div className="p-4 bg-blue-50 text-blue-700 flex items-center justify-center">
            <FiRefreshCw className="animate-spin mr-2" />
            Refreshing assignments...
          </div>
        )}

        {filteredAssignments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiCheckCircle className="text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No assignments found</h3>
            <p className="text-gray-500 mb-4">
              {statusFilter !== "all"
                ? `No ${statusFilter} assignments found.`
                : selectedCourse === "all"
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
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-800">{assignment.title}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(assignment)}
                        <span className="text-sm text-gray-500">
                          {assignment.completionStatus.completed}/{assignment.completionStatus.total} completed
                        </span>
                      </div>
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
                        <span className={`flex items-center ${isOverdue(assignment) ? 'text-red-500' : 'text-gray-500'
                          }`}>
                          <FiCalendar className="mr-1" />
                          {formatDate(assignment.dueDate)}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {assignment.completionStatus.total > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              assignment.completionStatus.rate === 100 
                                ? 'bg-green-500' 
                                : assignment.completionStatus.rate > 0 
                                  ? 'bg-blue-500' 
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${assignment.completionStatus.rate}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
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
                    <p className={`flex items-center ${isOverdue(selectedAssignment) ? 'text-red-500' : 'text-gray-500'
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
              
              {/* Status summary */}
              <div className="mt-4 flex flex-wrap gap-3">
                {getStatusBadge(selectedAssignment)}
                <div className="text-sm">
                  <span className="font-medium">{selectedAssignment.completionStatus.completed}</span> of <span className="font-medium">{selectedAssignment.completionStatus.total}</span> tasks completed 
                  (<span className="font-medium">{selectedAssignment.completionStatus.rate}%</span>)
                </div>
                {selectedAssignment.completionStatus.overdue > 0 && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">{selectedAssignment.completionStatus.overdue}</span> tasks overdue
                  </div>
                )}
              </div>
              
              {/* Progress bar */}
              {selectedAssignment.completionStatus.total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        selectedAssignment.completionStatus.rate === 100 
                          ? 'bg-green-500' 
                          : selectedAssignment.completionStatus.rate > 0 
                            ? 'bg-blue-500' 
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedAssignment.completionStatus.rate}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {assignmentDetails.loading ? (
                <div className="flex justify-center items-center h-64">
                  <FiLoader className="animate-spin text-3xl text-blue-500" />
                </div>
              ) : assignmentDetails.error ? (
                <div className="bg-red-50 text-red-500 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <FiAlertTriangle className="inline mr-2" />
                    {assignmentDetails.error}
                  </div>
                  <button 
                    onClick={() => handleViewDetails(selectedAssignment)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <FiRefreshCw className="mr-1" />
                    Try Again
                  </button>
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
                          Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignmentDetails.students.map(student => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <FiUser className="text-gray-500" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                                <div className="text-sm text-gray-500">{student.studentEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.completed ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Completed
                              </span>
                            ) : student.dueDate && new Date() > student.dueDate ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Overdue
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
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
              <div className="flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
