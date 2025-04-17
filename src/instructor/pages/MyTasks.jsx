import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { getAuth } from "firebase/auth";
import { FiCheckCircle, FiCircle, FiPlus, FiCalendar, FiClock, FiFilter, FiLoader } from "react-icons/fi";

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, completed, upcoming
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: "",
    dueTime: "",
    completed: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          setError("You must be logged in to view tasks");
          setLoading(false);
          return;
        }
        
        // Query tasks for the current instructor that are NOT course assignments
        const tasksQuery = query(
          collection(firestore, "tasks"),
          where("instructorId", "==", user.uid),
          where("type", "!=", "course"), // Only show instructor personal tasks
          orderBy("type"), // Required for inequality filter
          orderBy("dueDate", "asc")
        );
        
        const querySnapshot = await getDocs(tasksQuery);
        const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate() || null
        }));
        
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
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for time input to enforce 30-minute intervals
    if (name === "dueTime" && value) {
      const [hours, minutes] = value.split(':');
      const roundedMinutes = Math.round(parseInt(minutes, 10) / 30) * 30;
      const formattedMinutes = roundedMinutes === 60 ? "00" : roundedMinutes.toString().padStart(2, '0');
      const adjustedHours = roundedMinutes === 60 ? 
        (parseInt(hours, 10) + 1) % 24 : 
        parseInt(hours, 10);
      const formattedHours = adjustedHours.toString().padStart(2, '0');
      
      setNewTask(prev => ({
        ...prev,
        [name]: `${formattedHours}:${formattedMinutes}`
      }));
    } else {
      setNewTask(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      setError("Task title is required");
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
      } else {
        // Default to tomorrow if no date specified
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        dueDate.setHours(23, 59, 59);
      }
      
      const taskData = {
        title: newTask.title.trim(),
        dueDate,
        completed: false,
        instructorId: user.uid,
        type: "personal", // Mark as personal task to distinguish from course assignments
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, "tasks"), taskData);
      
      // Add to local state
      setTasks(prev => [
        ...prev, 
        { 
          id: docRef.id, 
          ...taskData,
          createdAt: new Date()
        }
      ]);
      
      // Reset form
      setNewTask({
        title: "",
        dueDate: "",
        dueTime: "",
        completed: false
      });
      
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Failed to add task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      
      if (!taskToUpdate) return;
      
      const newCompletedStatus = !taskToUpdate.completed;
      
      // Update in Firestore
      await updateDoc(doc(firestore, "tasks", taskId), {
        completed: newCompletedStatus,
        completedAt: newCompletedStatus ? serverTimestamp() : null
      });
      
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

  // Generate time options in 30-minute intervals
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center"
        >
          <FiPlus className="mr-2" /> Add Task
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
          <form onSubmit={handleAddTask}>
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
                  <FiClock className="inline mr-1" /> Due Time (30-min intervals)
                </label>
                <select
                  id="dueTime"
                  name="dueTime"
                  value={newTask.dueTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select time</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiPlus className="mr-2" />
                    Add Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-gray-700 flex items-center">
            <FiFilter className="mr-1" /> Filter:
          </span>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-md ${
              filter === "all" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`px-3 py-1 rounded-md ${
              filter === "upcoming" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1 rounded-md ${
              filter === "completed" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">No tasks found. Add a new task to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {sortedTasks.map(task => (
              <li 
                key={task.id} 
                className={`p-4 hover:bg-gray-50 ${
                  task.completed ? "bg-gray-50" : ""
                }`}
              >
                <div className="flex items-start">
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className="flex-shrink-0 mt-1"
                    aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {task.completed ? (
                      <FiCheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <FiCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${
                      task.completed ? "text-gray-500 line-through" : "text-gray-900"
                    }`}>
                      {task.title}
                    </p>
                    
                    <p className={`text-sm mt-1 flex items-center ${
                      isOverdue(task) ? "text-red-500" : "text-gray-500"
                    }`}>
                      <FiCalendar className="mr-1" />
                      {formatDate(task.dueDate)}
                      {isOverdue(task) && " (Overdue)"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
