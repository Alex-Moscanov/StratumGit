// src/student/TasksPage.jsx
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { FiCheckCircle, FiCircle, FiPlus, FiCalendar, FiClock, FiFilter, FiLoader, FiBook } from "react-icons/fi";
import { getStudentTasks, updateStudentTaskCompletion } from "@/services/studentTaskService";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";

export default function TasksPage() {
  const outletContext = useOutletContext();
  const [user, setUser] = useState(outletContext?.user || null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, completed, upcoming
  const [courseNames, setCourseNames] = useState({});

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        // If user is null, try to get current user from Firebase Auth
        if (!user) {
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            setUser(currentUser);
          } else {
            setError("You must be logged in to view tasks");
            setLoading(false);
            return;
          }
        }
        
        // Fetch tasks for the current student
        const studentId = user.uid;
        const tasksData = await getStudentTasks(studentId);
        
        // Get unique course IDs from tasks
        const courseIds = [...new Set(tasksData.map(task => task.courseId))];
        
        // Fetch course names for each course ID
        const courseNamesMap = {};
        for (const courseId of courseIds) {
          try {
            const courseDoc = await getDoc(doc(firestore, "courses", courseId));
            if (courseDoc.exists()) {
              courseNamesMap[courseId] = courseDoc.data().title;
            } else {
              courseNamesMap[courseId] = "Unknown Course";
            }
          } catch (err) {
            console.error(`Error fetching course name for ${courseId}:`, err);
            courseNamesMap[courseId] = "Unknown Course";
          }
        }
        
        setCourseNames(courseNamesMap);
        setTasks(tasksData);
        setError("");
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  const toggleTaskCompletion = async (taskId) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) return;
      
      const newCompletedStatus = !taskToUpdate.completed;
      
      // Update in Firestore
      await updateStudentTaskCompletion(taskId, newCompletedStatus);
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: newCompletedStatus } 
          : task
      ));
    } catch (err) {
      console.error("Error toggling task completion:", err);
      setError("Failed to update task. Please try again.");
    }
  };

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    if (filter === "completed") return task.completed;
    if (filter === "upcoming") return !task.completed;
    return true;
  });

  // Sort tasks: incomplete and upcoming first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // First sort by completion status
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Then sort by due date
    if (a.dueDate && b.dueDate) {
      return a.dueDate - b.dueDate;
    }
    
    // Handle cases where dueDate might be null
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "No due date";
    
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

  // Check if a task is overdue
  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;
    return new Date() > task.dueDate;
  };

  // Calculate completion percentage
  const completionPercentage = tasks.length > 0
    ? Math.round((tasks.filter(task => task.completed).length / tasks.length) * 100)
    : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <div className="flex items-center">
          <div className="mr-4">
            <div className="text-sm text-gray-500 mb-1">Completion</div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="text-lg font-semibold">{completionPercentage}%</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center space-x-2">
          <FiFilter className="text-gray-500" />
          <span className="text-sm text-gray-500 mr-2">Filter:</span>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              filter === "all" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("all")}
          >
            All Tasks
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              filter === "upcoming" 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              filter === "completed" 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("completed")}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FiLoader className="animate-spin text-4xl text-blue-500" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiCheckCircle className="text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-4">
              {filter === "all" 
                ? "You don't have any tasks yet." 
                : filter === "upcoming" 
                  ? "You don't have any upcoming tasks." 
                  : "You don't have any completed tasks."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sortedTasks.map(task => (
              <li key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start">
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className="mt-0.5 mr-3 flex-shrink-0 text-gray-400 hover:text-blue-500 focus:outline-none"
                  >
                    {task.completed ? (
                      <FiCheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <FiCircle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className={`text-gray-800 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </p>
                      {task.courseId && courseNames[task.courseId] && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                          <FiBook className="mr-1" />
                          {courseNames[task.courseId]}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    )}
                    {task.dueDate && (
                      <p className={`text-xs mt-1 flex items-center ${
                        isOverdue(task) ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        <FiCalendar className="mr-1" />
                        {formatDate(task.dueDate)}
                        {isOverdue(task) && !task.completed && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                            Overdue
                          </span>
                        )}
                      </p>
                    )}
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
