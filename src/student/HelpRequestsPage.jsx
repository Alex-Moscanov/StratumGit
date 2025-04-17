import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FiHelpCircle, FiMessageSquare, FiCheckCircle, FiClock, FiAlertCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";
import { getStudentHelpRequests, markHelpRequestAsResolved } from "@/services/helpRequestService";



const HelpRequestsPage = () => {
  const { user } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [helpRequests, setHelpRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHelpRequests = async () => {
      try {
        setLoading(true);
        
        console.log("Current user object:", user);
        
        if (!user) {
          setError("You must be logged in to view help requests");
          setLoading(false);
          return;
        }
        
        // Get the user ID from wherever it's available in your user object
        const userId = user.uid || user.id || user._id || user.userId;
        
        if (!userId) {
          console.error("Could not determine user ID from user object:", user);
          setError("Could not determine your user ID. Please try logging in again.");
          setLoading(false);
          return;
        }
        
        console.log("Fetching student help requests for:", userId);
        const helpRequestsData = await getStudentHelpRequests(userId);
        console.log("Student help requests fetched:", helpRequestsData);
        
        setHelpRequests(helpRequestsData || []);
        setError("");
      } catch (error) {
        console.error("Error fetching student help requests:", error);
        setError("Failed to load help requests. Please try again later.");
        setHelpRequests([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHelpRequests();
  }, [user]);
  
  

  const handleMarkAsResolved = async (requestId) => {
    try {
      setLoading(true);
      await markHelpRequestAsResolved(requestId);
      
      // Update local state
      setHelpRequests(helpRequests.map(request => 
        request.id === requestId 
          ? { ...request, status: "resolved", updatedAt: new Date() } 
          : request
      ));
    } catch (error) {
      console.error("Error marking help request as resolved:", error);
      setError("Failed to update help request. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  

  const filteredRequests = helpRequests.filter(request => {
    if (filter === "all") return true;
    return request.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <FiClock className="text-yellow-500" />;
      case "answered":
        return <FiMessageSquare className="text-blue-500" />;
      case "resolved":
        return <FiCheckCircle className="text-green-500" />;
      default:
        return <FiAlertCircle className="text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Awaiting response";
      case "answered":
        return "Answered";
      case "resolved":
        return "Resolved";
      default:
        return "Unknown";
    }
  };

  // Get priority icon based on priority level
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return <FiAlertCircle className="text-red-500" />;
      case "medium":
        return <FiAlertTriangle className="text-yellow-500" />;
      case "low":
        return <FiInfo className="text-blue-500" />;
      default:
        return <FiInfo className="text-blue-500" />;
    }
  };

  // Get priority label and color
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "high":
        return { label: "High", color: "text-red-700 bg-red-100" };
      case "medium":
        return { label: "Medium", color: "text-yellow-700 bg-yellow-100" };
      case "low":
        return { label: "Low", color: "text-blue-700 bg-blue-100" };
      default:
        return { label: "Medium", color: "text-yellow-700 bg-yellow-100" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <FiAlertCircle className="mx-auto text-4xl text-red-500 mb-2" />
        <h2 className="text-xl font-semibold text-gray-700">Error Loading Help Requests</h2>
        <p className="text-gray-500 mt-1">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-2">
          <FiHelpCircle className="text-blue-500 mr-2 text-xl" />
          <h1 className="text-2xl font-bold text-gray-800">Help Requests</h1>
        </div>
        <p className="text-gray-600">
          View and manage your help requests for all courses.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded ${
              filter === "all" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("all")}
          >
            All Requests
          </button>
          <button
            className={`px-4 py-2 rounded ${
              filter === "pending" 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`px-4 py-2 rounded ${
              filter === "answered" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("answered")}
          >
            Answered
          </button>
          <button
            className={`px-4 py-2 rounded ${
              filter === "resolved" 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("resolved")}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Help Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <FiHelpCircle className="mx-auto text-4xl text-gray-300 mb-2" />
            <h2 className="text-xl font-semibold text-gray-700">No help requests found</h2>
            <p className="text-gray-500 mt-1">
              {filter === "all" 
                ? "You haven't submitted any help requests yet." 
                : `You don't have any ${filter} help requests.`}
            </p>
            <Link 
              to="/student/courses" 
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Courses
            </Link>
          </div>
        ) : (
          filteredRequests.map(request => (
            <div key={request.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{request.lessonTitle}</h2>
                  <p className="text-sm text-gray-500">
                    {request.courseTitle} • {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Priority Badge */}
                  <div className={`px-2 py-1 rounded text-xs font-medium flex items-center ${getPriorityLabel(request.priority).color}`}>
                    {getPriorityIcon(request.priority)}
                    <span className="ml-1">{getPriorityLabel(request.priority).label}</span>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center">
                    {getStatusIcon(request.status)}
                    <span className="ml-1 text-sm">{getStatusText(request.status)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h3 className="font-medium text-gray-700">Your Question:</h3>
                <p className="mt-1">{request.question}</p>
              </div>
              
              {request.instructorResponse && (
                <div className="mt-4 p-4 bg-blue-50 rounded">
                  <h3 className="font-medium text-blue-700">Instructor Response:</h3>
                  <p className="mt-1">{request.instructorResponse}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Responded {formatDistanceToNow(request.updatedAt, { addSuffix: true })}
                  </p>
                </div>
              )}
              
              <div className="mt-4 flex justify-between">
                <Link
                  to={`/student/courses/${request.courseId}`}
                  className="text-blue-600 hover:underline"
                >
                  Go to Course
                </Link>
                
                {request.status === "answered" && (
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                    onClick={() => handleMarkAsResolved(request.id)}
                  >
                    <FiCheckCircle className="mr-2" />
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HelpRequestsPage;
