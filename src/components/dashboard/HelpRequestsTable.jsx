import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiAlertTriangle, FiInfo, FiSend, FiX } from "react-icons/fi";
import { getAllHelpRequests, submitInstructorResponse } from "@/services/helpRequestService";
import { formatDistanceToNow } from "date-fns";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/config/firebase";

const HelpRequestsTable = () => {
  const [loading, setLoading] = useState(true);
  const [helpRequests, setHelpRequests] = useState([]);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState({});

  useEffect(() => {
    const fetchHelpRequests = async () => {
      try {
        setLoading(true);
        console.log("Fetching help requests for dashboard...");
        
        // Fetch all help requests using the service
        const helpRequestsData = await getAllHelpRequests();
        console.log("Help requests fetched:", helpRequestsData);
        
        // Filter to show only unresolved requests (pending or answered)
        const unresolvedRequests = helpRequestsData.filter(
          request => request.status === "pending" || request.status === "answered"
        );
        console.log("Unresolved requests:", unresolvedRequests.length);
        
        // Sort by priority 
        const sortedRequests = unresolvedRequests.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          // If same priority, sort by date (newest first)
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        // Limit to 5 most important requests for dashboard
        const topRequests = sortedRequests.slice(0, 5);
        console.log("Top requests for dashboard:", topRequests);
        
        // Get unique student IDs from help requests
        const studentIds = [...new Set(topRequests.map(request => request.studentId).filter(Boolean))];
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
        
        setHelpRequests(topRequests);
        setError("");
      } catch (error) {
        console.error("Error fetching help requests:", error);
        setError("Failed to load help requests");
        setHelpRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpRequests();
  }, []);

  // Handle submitting a response to a help request
  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    
    if (!selectedRequest || !response.trim()) {
      return;
    }
    
    setSubmitting(true);
    
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
      
      setResponse("");
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error submitting response:", error);
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
    
    return request.studentDisplayName || request.studentFullName || request.studentEmail || request.studentName || "Student";
  };

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
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Help Requests</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Help Requests</h2>
        <Link to="/instructor/help-requests" className="text-blue-600 hover:underline text-sm">
          View all
        </Link>
      </div>

      {error ? (
        <div className="text-center py-4">
          <p className="text-red-500">{error}</p>
        </div>
      ) : helpRequests.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No pending help requests</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {helpRequests.map(request => {
                const priorityInfo = getPriorityLabel(request.priority);
                const studentName = getStudentName(request);
                
                return (
                  <tr key={request.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRequest(request)}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {studentName}
                      </div>
                      {request.studentId && (
                        <div className="text-xs text-gray-500">
                          ID: {request.studentId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.issueType || "Task Issue"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                        {getPriorityIcon(request.priority)}
                        <span className="ml-1">{priorityInfo.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        request.status === "pending" 
                          ? "bg-yellow-100 text-yellow-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {request.status === "pending" ? "Unresolved" : "Answered"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {request.description || request.question || "No description provided"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
                  }}
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Course:</p>
                  <p className="font-medium">{selectedRequest.courseTitle || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lesson:</p>
                  <p className="font-medium">{selectedRequest.lessonTitle || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted:</p>
                  <p className="font-medium">
                    {selectedRequest.createdAt ? formatDistanceToNow(new Date(selectedRequest.createdAt), { addSuffix: true }) : "Unknown"}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityLabel(selectedRequest.priority).color} mr-2`}>
                    {getPriorityIcon(selectedRequest.priority)}
                    <span className="ml-1">{getPriorityLabel(selectedRequest.priority).label} Priority</span>
                  </span>
                  <span className="text-gray-500 text-sm">
                    {selectedRequest.status === "pending" ? "Awaiting response" : "Answered"}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Student Question:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>{selectedRequest.question || selectedRequest.description || "No question provided"}</p>
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
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="mr-2 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setSelectedRequest(null);
                        setResponse("");
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

export default HelpRequestsTable;
