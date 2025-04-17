import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { FiLock, FiArrowRight, FiArrowLeft } from "react-icons/fi";
import { enrollWithAccessCode } from "@/services/enrollmentService";
import { validateAccessCodeFormat } from "@/utils/accessCodeGenerator";



const AccessCodeEntry = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enrolledCourse, setEnrolledCourse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError("");
    setSuccess(false);
    
    // Validate access code format
    if (!validateAccessCodeFormat(accessCode)) {
      setError("Please enter a valid access code (6-8 characters, uppercase letters and numbers)");
      return;
    }
    
    setLoading(true);
    
    try {
      // Attempt to enroll with the access code
      const enrollment = await enrollWithAccessCode(
        accessCode,
        user.uid,
        user.email
      );
      
      // Set success state
      setSuccess(true);
      setEnrolledCourse(enrollment.course);
      
      // Clear the form
      setAccessCode("");
      
      // After 2 seconds, redirect to the course
      setTimeout(() => {
        navigate(`/student/courses/${enrollment.course.id}`);
      }, 2000);
    } catch (err) {
      console.error("Error enrolling with access code:", err);
      setError(err.message || "Failed to enroll in course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Enter Course Access Code</h1>
        </div>
        
        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Successfully enrolled!</p>
            <p>You have been enrolled in {enrolledCourse?.title}.</p>
            <p className="text-sm mt-2">Redirecting to course...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Enter the access code provided by your instructor to enroll in a course.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Access Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="accessCode"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Enter access code (e.g., ABC123)"
                    className="block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={8}
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Access codes are 6-8 characters long and contain uppercase letters and numbers.
                </p>
              </div>
              
              <button
                type="submit"
                className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                {loading ? (
                  "Enrolling..."
                ) : (
                  <>
                    Enroll in Course <FiArrowRight className="ml-2" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AccessCodeEntry;
