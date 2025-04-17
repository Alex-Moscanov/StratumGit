import React, { useState, useEffect } from "react";
import { firestore } from "@/config/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp, 
  updateDoc, 
  doc, 
  getDoc, 
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FiCheckCircle, FiCircle, FiClipboard, FiPlus, FiX, FiCalendar, FiClock } from "react-icons/fi";

const TaskList = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskDueTime, setNewTaskDueTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        console.log("Fetching tasks for dashboard...");
        
        // Try to get the current user
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.log("No user authenticated yet, showing empty task list");
          setTasks([]);
          setLoading(false);
          return;
        }
        
        console.log("Fetching tasks for user:", currentUser.uid);
        
        // Fetch tasks from Firestore
        const tasksQuery = query(
          collection(firestore, "tasks"),
          where("instructorId", "==", currentUser.uid),
          where("completed", "==", false),
          orderBy("dueDate", "asc"),
          limit(5)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = [];
        
        tasksSnapshot.forEach(doc => {
          tasksData.push({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate() || new Date(Date.now() + 86400000) // default to tomorrow
          });
        });
        
        console.log(`Found ${tasksData.length} tasks`);
        
        // Set tasks directly without adding any default tasks
        setTasks(tasksData);
        
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setError("Failed to load tasks");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
  }, []);

  const toggleTaskCompletion = async (taskId) => {
    try {
      // Update local state first for immediate UI feedback
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed } 
          : task
      ));
      
      // Check if it's a real task (not a placeholder)
      if (!taskId.startsWith('default-') && !taskId.startsWith('help-')) {
        // Update Firestore
        try {
          const taskRef = doc(firestore, "tasks", taskId);
          const taskDoc = await getDoc(taskRef);
          
          if (taskDoc.exists()) {
            console.log(`Updating task ${taskId} completion status`);
            await updateDoc(taskRef, {
              completed: !taskDoc.data().completed,
              updatedAt: serverTimestamp()
            });
            console.log(`Task ${taskId} updated successfully`);
          } else {
            console.log(`Task ${taskId} does not exist in Firestore`);
          }
        } catch (error) {
          console.error(`Error updating task ${taskId}:`, error);
        }
      } else {
        console.log(`Task ${taskId} is a placeholder, not updating Firestore`);
      }
    } catch (error) {
      console.error("Error toggling task completion:", error);
      // Revert the local state change if the update fails
      setTasks(tasks);
    }
  };
  
  // Add a new task
  const addTask = async (e) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log("No user authenticated, cannot add task");
        return;
      }
      
      // Combine date and time for the due date
      let dueDateTime = null;
      if (newTaskDueDate) {
        const dateObj = new Date(newTaskDueDate);
        
        if (newTaskDueTime) {
          const [hours, minutes] = newTaskDueTime.split(':');
          dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        } else {
          // Default to 11:59 PM if no time specified
          dateObj.setHours(23, 59);
        }
        
        dueDateTime = dateObj;
      } else {
        dueDateTime = new Date();
        dueDateTime.setDate(dueDateTime.getDate() + 1);
        dueDateTime.setHours(23, 59);
      }
      
      // Create new task in Firestore
      const taskData = {
        title: newTaskTitle,
        completed: false,
        dueDate: Timestamp.fromDate(dueDateTime),
        instructorId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(firestore, "tasks"), taskData);
      console.log("Task added with ID:", docRef.id);
      
      // Add to local state
      const newTask = {
        id: docRef.id,
        ...taskData,
        dueDate: dueDateTime
      };
      
      setTasks([...tasks, newTask]);
      
      // Reset form
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskDueTime("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">My Task List</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center">
              <div className="h-4 w-4 bg-gray-200 rounded-full mr-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">My Task List</h2>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <FiPlus className="mr-1" /> Add Task
        </button>
      </div>
      
      {/* Add Task Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Add New Task</h3>
            <button 
              onClick={() => {
                setShowAddForm(false);
                setNewTaskTitle("");
                setNewTaskDueDate("");
                setNewTaskDueTime("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX />
            </button>
          </div>
          
          <form onSubmit={addTask}>
            <div className="mb-3">
              <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title
              </label>
              <input
                type="text"
                id="taskTitle"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  <FiCalendar className="inline mr-1" /> Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
                  <FiClock className="inline mr-1" /> Due Time
                </label>
                <input
                  type="time"
                  id="dueTime"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTaskDueTime}
                  onChange={(e) => setNewTaskDueTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                className="mr-2 px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle("");
                  setNewTaskDueDate("");
                  setNewTaskDueTime("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={submitting || !newTaskTitle.trim()}
              >
                {submitting ? (
                  <span className="inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <FiPlus className="mr-1" />
                )}
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}
      
      {error ? (
        <div className="text-center py-4">
          <p className="text-red-500">{error}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8">
          <FiClipboard className="mx-auto text-4xl text-gray-300 mb-2" />
          <p className="text-gray-500">No tasks to display</p>
        </div>
      ) : (
        <div>
          <ul className="space-y-3">
            {tasks.map(task => (
              <li 
                key={task.id}
                className="flex items-start py-2"
              >
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
                  <p className={`text-gray-800 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-xs text-gray-500">
                      Due: {task.dueDate.toLocaleDateString()} {task.dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskList;
