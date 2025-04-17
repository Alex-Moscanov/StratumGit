// src/instructor/pages/HelpRequestsPage.jsx
import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FiHelpCircle, FiMessageSquare, FiCheckCircle, FiClock, FiAlertCircle, FiAlertTriangle, FiInfo, FiSend, FiX } from "react-icons/fi";
import { getAllHelpRequests, submitInstructorResponse } from "@/services/helpRequestService";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/config/firebase";

const HelpRequestsPage = () => {
  // Try to get user from context, but fallback to direct auth if context is undefined
  const outletContext = useOutletContext();
  const [user, setUser] = useState(outletContext?.user || null);
  const [loading, setLoading] = useState(true);
  const [helpRequests, setHelpRequests] = useState([]);
  const [filter, setFilter] = useState("all"); // all, pending, answered, resolved
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [studentData, setStudentData] = useState({});

  useEffect(() => {
    const fetchHelpRequests = async () => {
      try {
        setLoading(true);
        
        // If user is null, try to get current user from Firebase Auth
        if (!user) {
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            console.log("Got current user from Firebase Auth:", currentUser.uid);
            setUser(currentUser);
          } else {
            console.log("No user found in Firebase Auth");
            // Instead of showing error immediately, try to fetch help requests anyway
            // This allows the page to work even if auth context isn't fully loaded yet
          }
        }
        
        console.log("Fetching help requests...");
        // Fetch all help requests using the service
        const helpRequestsData = await getAllHelpRequests();
        console.log("Help requests fetched:", helpRequestsData);
        
        if (helpRequestsData.length === 0) {
          console.log("No help requests found or user not authenticated");
          setHelpRequests([]);
          setLoading(false);
          return;
        }
        
        // Get unique student IDs from help requests
        const studentIds = [...new Set(helpRequestsData.map(request => request.studentId).filter(Boolean))];
        console.log("Student IDs to fetch:", studentIds);
        
        // Fetch student data directly from users collection
        if (studentIds.length > 0) {
          const studentDataMap = {};
          
          // Process in smaller batches if there are many students
          const batchSize = 10;
          for (let i = 0; i < studentIds.length; i += batchSize) {
            const batch = studentIds.slice(i, i + batchSize);
            
            for (const studentId of batch) {
              try {
                const studentQuery = query(
                  collection(firestore, "users"),
                  where("uid", "==", studentId)
                );
                
                const studentSnapshot = await getDocs(studentQuery);
                
                if (!studentSnapshot.empty) {
                  const studentDoc = studentSnapshot.docs[0];
                  const data = studentDoc.data();
                  
                  studentDataMap[studentId] = {
                    displayName: data.displayName,
                    fullName: data.fullName,
                    email: data.email
                  };
                  
                  console.log(`Found student data for ${studentId}:`, 
                    data.displayName || data.fullName || data.email);
                } else {
                  console.log(`No user document found for student ID: ${studentId}`);
                }
              } catch (err) {
                console.error(`Error fetching student ${studentId}:`, err);
              }
            }
          }
          
          setStudentData(studentDataMap);
        }
        
        // Force loading to false even if data is empty
        setHelpRequests(helpRequestsData || []);
        setError("");
        setLoading(false);
      } catch (error) {
        console.error("Error fetching help requests:", error);
        setError("Failed to load help requests. Please try again later.");
        setHelpRequests([]);
        setLoading(false);
      }
    };

    fetchHelpRequests();
  }, [user]);

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    
    if (!selectedRequest || !response.trim()) {
      setError("Please enter a response");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      // Update the help request using the service
      await submitInstructorResponse(selectedRequest.id, response);
      
      // Update local state
      setHelpRequests(helpRequests.map(request => 
        request.id === selectedRequest.id 
          ? { 
              ...request, 
              instructorResponse: response, 
              status: "answered", 
              updatedAt: new Date() 
            } 
          : request
      ));
      
      // Reset form
      setResponse("");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error submitting response:", error);
      setError("Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Get student name from student data map
  const getStudentName = (request) => {
    if (request.studentId && studentData[request.studentId]) {
      const student = studentData[request.studentId];
      return student.displayName || student.fullName || student.email || "Student";
    }
    
    // Fallback to data in the request itself
    return request.studentDisplayName || request.studentFullName || request.studentEmail || "Student";
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
          View and respond to student help requests for all courses.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded ${
              filter === "all" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("all")}
          >
            All Requests
          </button>
          <button
            className={`px-3 py-1 rounded ${
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
            className={`px-3 py-1 rounded ${
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

      {/* Help Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <FiHelpCircle className="mx-auto text-4xl text-gray-300 mb-2" />
            <h2 className="text-xl font-semibold text-gray-700">No help requests found</h2>
            <p className="text-gray-500 mt-1">
              {filter === "all" 
                ? "There are no help requests at this time." 
                : `There are no ${filter} help requests.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course / Lesson
                  </th>
                  <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getStudentName(request)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {request.studentId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.courseTitle}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.lessonTitle}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityLabel(request.priority).color}`}>
                        {getPriorityIcon(request.priority)}
                        <span className="ml-1">{getPriorityLabel(request.priority).label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className="ml-1 text-sm text-gray-900">{getStatusText(request.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {request.question}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className={`text-blue-600 hover:text-blue-900 ${
                          request.status === "pending" ? "font-bold" : ""
                        }`}
                        onClick={() => setSelectedRequest(request)}
                      >
                        {request.status === "pending" ? "Respond" : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Response Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">Help Request Details</h2>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setSelectedRequest(null);
                    setResponse("");
                    setError("");
                  }}
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Student:</p>
                  <p className="font-medium">{getStudentName(selectedRequest)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Course:</p>
                  <p className="font-medium">{selectedRequest.courseTitle || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lesson:</p>
                  <p className="font-medium">{selectedRequest.lessonTitle || "Not specified"}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityLabel(selectedRequest.priority).color} mr-2`}>
                    {getPriorityIcon(selectedRequest.priority)}
                    <span className="ml-1">{getPriorityLabel(selectedRequest.priority).label} Priority</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    {getStatusText(selectedRequest.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Submitted {formatDistanceToNow(selectedRequest.createdAt, { addSuffix: true })}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Student Question:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>{selectedRequest.description || selectedRequest.question || "No description provided"}</p>
                </div>
              </div>

              {selectedRequest.instructorResponse ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Your Response:</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p>{selectedRequest.instructorResponse}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitResponse}>
                  <div className="mb-4">
                    <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Response
                    </label>
                    <textarea
                      id="response"
                      rows="4"
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your response to the student's question..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      disabled={submitting}
                    ></textarea>
                    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="mr-2 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setSelectedRequest(null);
                        setResponse("");
                        setError("");
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ${
                        submitting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Response"}
                      {!submitting && <FiSend className="ml-2" />}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpRequestsPage;
