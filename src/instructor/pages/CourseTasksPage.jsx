// src/instructor/pages/CourseTasksPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiArrowLeft, FiPlus, FiCalendar, FiClock, FiCheckCircle, FiAlertTriangle, FiLoader, FiUser, FiUsers, FiCheck } from "react-icons/fi";
import { assignCourseTask, getInstructorCourseTasks, getCourseTaskStats } from "@/services/studentTaskService";
import { getEnrolledStudents } from "@/services/enrollmentService";

export default function CourseTasksPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); // Add success state
  const [tasks, setTasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showStudentSelection, setShowStudentSelection] = useState(false);

  useEffect(() => {
    const fetchCourseAndTasks = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          setError("You must be logged in to view course tasks");
          setLoading(false);
          return;
        }
        
        // Fetch course data
        const courseDoc = await getDoc(doc(firestore, "courses", courseId));
        
        if (courseDoc.exists()) {
          setCourse({
            id: courseDoc.id,
            ...courseDoc.data(),
            createdAt: courseDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: courseDoc.data().updatedAt?.toDate() || new Date(),
          });
        } else {
          setError("Course not found");
          setLoading(false);
          return;
        }
        
        // Fetch tasks for this course
        const courseTasks = await getInstructorCourseTasks(user.uid);
        const filteredTasks = courseTasks.filter(task => task.courseId === courseId);
        setTasks(filteredTasks);
        
        // Fetch task statistics
        const stats = await getCourseTaskStats(courseId);
        setTaskStats(stats);
        
        setError("");
      } catch (err) {
        console.error("Error fetching course tasks:", err);
        setError("Failed to load course tasks. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndTasks();
  }, [courseId]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchEnrolledStudents = async () => {
    try {
      setLoadingStudents(true);
      const students = await getEnrolledStudents(courseId);
      
      // Filter to only include students with studentId (fully enrolled)
      const activeStudents = students.filter(student => student.studentId && student.status === "active");
      
      setEnrolledStudents(activeStudents);
      setLoadingStudents(false);
    } catch (err) {
      console.error("Error fetching enrolled students:", err);
      setError("Failed to load enrolled students. Please try again later.");
      setLoadingStudents(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAllStudents = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(enrolledStudents.map(student => student.studentId));
    }
    setSelectAll(!selectAll);
  };

  const handleShowAddForm = () => {
    setShowAddForm(true);
    setShowStudentSelection(false);
    setSuccess(""); // Clear any previous success messages
    fetchEnrolledStudents();
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      setError("Task title is required");
      return;
    }
    
    if (selectedStudents.length === 0) {
      setError("Please select at least one student");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setError("You must be logged in to add tasks");
        setSubmitting(false);
        return;
      }
      
      // Combine date and time or use defaults
      let dueDate = null;
      
      if (newTask.dueDate) {
        dueDate = new Date(newTask.dueDate);
        
        if (newTask.dueTime) {
          const [hours, minutes] = newTask.dueTime.split(':');
          dueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        } else {
          // Default to end of day if no time specified
          dueDate.setHours(23, 59, 59);
        }
      }
      
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        dueDate,
        courseId,
        selectedStudentIds: selectedStudents // Pass selected student IDs
      };
      
      // Assign task to selected students in the course
      const createdTask = await assignCourseTask(taskData, user.uid);
      
      // Add to local state
      setTasks(prev => [createdTask, ...prev]);
      
      // Reset form
      setNewTask({
        title: "",
        description: "",
        dueDate: "",
        dueTime: ""
      });
      
      setSelectedStudents([]);
      setSelectAll(false);
      setShowAddForm(false);
      setShowStudentSelection(false);
      
      // Update task stats
      setTaskStats(prev => ({
        ...prev,
        totalTasks: prev.totalTasks + createdTask.assignedCount
      }));
      
      // Set success message
      setSuccess(`Task "${createdTask.title}" successfully assigned to ${createdTask.assignedCount} student${createdTask.assignedCount !== 1 ? 's' : ''}.`);
      
    } catch (err) {
      console.error("Error adding course task:", err);
      setError("Failed to assign task to students. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display - Fixed to handle invalid date values
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

  // Check if a task is overdue - Fixed to handle invalid date values
  const isOverdue = (task) => {
    if (!task.dueDate) return false;
    
    // Check if dueDate is a valid Date object
    if (!(task.dueDate instanceof Date) || isNaN(task.dueDate.getTime())) {
      return false;
    }
    
    return new Date() > task.dueDate;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <Link to="/instructor/courses" className="text-blue-500 hover:text-blue-700 flex items-center">
            <FiArrowLeft className="mr-2" /> Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link to={`/instructor/courses/${courseId}`} className="text-blue-500 hover:text-blue-700 flex items-center">
            <FiArrowLeft className="mr-2" /> Back to Course
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            {course?.title} - Tasks
          </h1>
        </div>
        <button
          onClick={handleShowAddForm}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
        >
          <FiPlus className="mr-2" /> Assign New Task
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 flex items-center">
          <FiCheckCircle className="mr-2" />
          <p>{success}</p>
        </div>
      )}

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
          <p className="text-2xl font-bold">{taskStats.totalTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{taskStats.completedTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Overdue</h3>
          <p className="text-2xl font-bold text-red-600">{taskStats.overdueTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
          <p className="text-2xl font-bold">{taskStats.completionRate.toFixed(1)}%</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          {!showStudentSelection ? (
            <>
              <h2 className="text-lg font-semibold mb-4">Assign New Task</h2>
              <form>
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title*
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newTask.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newTask.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description (optional)"
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                      <FiCalendar className="inline mr-1" /> Due Date
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      value={newTask.dueDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
                      <FiClock className="inline mr-1" /> Due Time
                    </label>
                    <input
                      type="time"
                      id="dueTime"
                      name="dueTime"
                      value={newTask.dueTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStudentSelection(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <FiUsers className="mr-2" />
                    Select Students
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Select Students for Task: {newTask.title}</h2>
                <button
                  type="button"
                  onClick={() => setShowStudentSelection(false)}
                  className="text-blue-500 hover:text-blue-700 flex items-center"
                >
                  <FiArrowLeft className="mr-1" /> Back to Task Details
                </button>
              </div>
              
              {loadingStudents ? (
                <div className="flex justify-center items-center h-32">
                  <FiLoader className="animate-spin text-3xl text-blue-500" />
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="text-center py-8">
                  <FiUsers className="mx-auto text-4xl text-gray-400 mb-2" />
                  <p className="text-gray-500">No students enrolled in this course yet.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAllStudents}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-gray-700">Select All Students ({enrolledStudents.length})</span>
                    </label>
                    <span className="ml-auto text-sm text-gray-500">
                      {selectedStudents.length} of {enrolledStudents.length} selected
                    </span>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto border rounded-md mb-4">
                    <ul className="divide-y divide-gray-200">
                      {enrolledStudents.map(student => (
                        <li key={student.id} className="p-3 hover:bg-gray-50">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.studentId)}
                              onChange={() => handleStudentSelection(student.studentId)}
                              className="form-checkbox h-5 w-5 text-blue-600 rounded"
                            />
                            <div className="ml-3">
                              <div className="flex items-center">
                                <FiUser className="text-gray-400 mr-2" />
                                <span className="text-gray-800">
                                  {student.studentName || student.email}
                                </span>
                              </div>
                              {student.studentName && (
                                <span className="text-sm text-gray-500">{student.email}</span>
                              )}
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentSelection(false);
                        setSelectedStudents([]);
                        setSelectAll(false);
                      }}
                      className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      disabled={submitting || selectedStudents.length === 0}
                    >
                      {submitting ? (
                        <>
                          <FiLoader className="animate-spin mr-2" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <FiCheck className="mr-2" />
                          Assign Task to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Assigned Tasks</h2>
          <p className="text-sm text-gray-600">Tasks assigned to students in this course</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FiLoader className="animate-spin text-4xl text-blue-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiCheckCircle className="text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No tasks assigned yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't assigned any tasks to students in this course.
            </p>
            <button
              onClick={handleShowAddForm}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center"
            >
              <FiPlus className="mr-2" /> Assign Your First Task
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tasks.map(task => (
              <li key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium text-gray-800">{task.title}</h3>
                      <span className="text-sm text-gray-500">
                        Assigned to {task.assignedCount || 0} students
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 mt-1">{task.description}</p>
                    )}
                    
                    <div className="mt-2 flex items-center text-sm">
                      {task.dueDate && (
                        <span className={`flex items-center ${
                          isOverdue(task) ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          <FiCalendar className="mr-1" />
                          {formatDate(task.dueDate)}
                          {isOverdue(task) && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                              Overdue
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
