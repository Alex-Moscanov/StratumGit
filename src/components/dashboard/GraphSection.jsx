import React, { useState, useEffect } from "react";
import { getLessonCompletionData } from "@/services/engagementService";
import { FiBarChart2, FiLoader } from "react-icons/fi";
import GenerateEngagementData from "./GenerateEngagementData";

const GraphSection = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [engagementData, setEngagementData] = useState([]);
  
  useEffect(() => {
    const fetchEngagementData = async () => {
      try {
        setLoading(true);
        console.log("Fetching lesson completion data...");
        
        // Get lesson completion data from the service
        const completionData = await getLessonCompletionData();
        
        console.log("Lesson completion data:", completionData);
        setEngagementData(completionData);
        setError("");
      } catch (error) {
        console.error("Error fetching lesson completion data:", error);
        setError("Failed to load engagement data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEngagementData();
  }, []);

  // Find the maximum value for scaling
  const maxValue = Math.max(...engagementData.map(day => day.value), 5);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">7-Day Engagement Tracker</h2>
        <div className="text-sm text-gray-500 flex items-center">
          <FiBarChart2 className="mr-1" />
          Lessons Completed / Day
        </div>
      </div>
      
      {/* Generate Sample Data Button */}
      <GenerateEngagementData />
      
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
              <span>{maxValue}</span>
              <span>{Math.round(maxValue * 0.75)}</span>
              <span>{Math.round(maxValue * 0.5)}</span>
              <span>{Math.round(maxValue * 0.25)}</span>
              <span>0</span>
            </div>
            
            {/* Chart */}
            <div className="flex-1">
              {/* Grid lines */}
              <div className="h-full relative border-l border-b border-gray-200">
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '25%' }}></div>
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '50%' }}></div>
                <div className="absolute w-full border-t border-gray-200" style={{ bottom: '75%' }}></div>
                
                {/* Bars */}
                <div className="absolute inset-0 flex justify-around items-end px-2">
                  {engagementData.map((day, index) => {
                    // Calculate height percentage based on the maximum value
                    const heightPercent = day.value ? (day.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center w-1/7">
                        <div className="w-full px-1">
                          <div 
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all duration-200"
                            style={{ height: `${heightPercent}%` }}
                            title={`${day.value} lessons completed`}
                          ></div>
                        </div>
                        <p className="text-xs mt-2 text-gray-600">{day.date}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphSection;
