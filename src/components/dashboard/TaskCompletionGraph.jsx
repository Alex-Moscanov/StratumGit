import React, { useState, useEffect } from "react";
import { getTaskCompletionByDay, getStudentNames } from "@/services/taskCompletionService";
import { FiBarChart2, FiLoader, FiInfo } from "react-icons/fi";

const TaskCompletionGraph = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskData, setTaskData] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [hoveredDay, setHoveredDay] = useState(null);
  
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setLoading(true);
        console.log("Fetching task completion data...");
        
        const completionData = await getTaskCompletionByDay();
        console.log("Task completion data:", completionData);
        
        const studentIds = [];
        completionData.forEach(day => {
          day.tasks.forEach(task => {
            if (task.studentId) {
              studentIds.push(task.studentId);
            }
          });
        });
        
        // Get student names if there are any student IDs
        if (studentIds.length > 0) {
          const names = await getStudentNames(studentIds);
          setStudentNames(names);
        }
        
        setTaskData(completionData);
        setError("");
      } catch (error) {
        console.error("Error fetching task completion data:", error);
        setError("Failed to load task completion data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskData();
  }, []);

  // Get color based on completion rate
  const getBarColor = (completionRate) => {
    if (completionRate >= 75) return "bg-green-500 hover:bg-green-600";
    if (completionRate >= 25) return "bg-amber-400 hover:bg-amber-500";
    return "bg-red-500 hover:bg-red-600";
  };
  
  // Format task details for tooltip
  const formatTaskDetails = (day) => {
    if (!day || day.totalTasks === 0) return "No tasks due on this day";
    
    const completionText = `${day.completedTasks} of ${day.totalTasks} tasks completed (${day.completionRate}%)`;
    
    const taskDetails = day.tasks.map(task => {
      const studentName = studentNames[task.studentId] || "Unknown Student";
      const status = task.completed ? "✓ Completed" : "❌ Incomplete";
      return `${task.title} - ${studentName} - ${status}`;
    }).join("\n");
    
    return `${completionText}\n\nTasks:\n${taskDetails}`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Set Task Score Tracker</h2>
        <div className="text-sm text-gray-500 flex items-center">
          <FiBarChart2 className="mr-1" />
          Task Completion Rate / Day
        </div>
      </div>
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <FiLoader className="animate-spin text-4xl text-blue-500" />
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <div className="h-64 flex flex-col">
          {/* Y-axis label */}
          <div className="flex h-full">
            <div className="w-10 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            
            {/* Chart */}
            <div className="flex-1">
              {/* Grid lines */}
              <div className="h-full relative border-l border-b border-gray-200">
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '25%' }}></div>
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '50%' }}></div>
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '75%' }}></div>
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '100%' }}></div>
                
                {/* Bars */}
                <div className="absolute inset-0 flex justify-around items-end px-2">
                  {taskData.map((day, index) => {
                    // Use completion rate directly for height percentage
                    const heightPercent = day.completionRate;
                    const barColor = getBarColor(day.completionRate);
                    const hasNoTasks = day.totalTasks === 0;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex flex-col items-center w-1/7 h-full"
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        <div className="w-full px-1 relative h-full">
                          {/* Container for both bars */}
                          <div className="absolute bottom-0 left-0 right-0 w-full">
                            {/* The colored bar representing completion rate */}
                            <div 
                              className={`w-full ${barColor} rounded-t transition-all duration-200`}
                              style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '4px' : '0' }}
                            ></div>
                          </div>
                          
                          {/* Gray bar for remaining percentage */}
                          <div 
                            className="w-full bg-gray-400 absolute top-0 left-0 right-0 rounded-t"
                            style={{ 
                              height: `${100 - heightPercent}%`,
                              opacity: hasNoTasks ? 1 : 0.3
                            }}
                          ></div>
                        </div>
                        <p className="text-xs mt-2 text-gray-600">{day.day}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tooltip for hovered day */}
          {hoveredDay && (
            <div className="absolute bg-white border border-gray-200 shadow-lg rounded p-3 z-10 max-w-xs whitespace-pre-line text-sm">
              <div className="font-semibold mb-1 flex items-center">
                <FiInfo className="mr-1" />
                {hoveredDay.day} ({hoveredDay.date})
              </div>
              <div>
                {formatTaskDetails(hoveredDay)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCompletionGraph;
