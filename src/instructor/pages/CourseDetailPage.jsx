// src/instructor/pages/CourseDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiArrowLeft, FiEdit, FiUsers, FiTag, FiCalendar, FiImage, FiCheckSquare } from "react-icons/fi";
import StudentEnrollment from "@/components/course/StudentEnrollment";
import CoursePreview from "@/components/course/CoursePreview";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEnrollment, setShowEnrollment] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
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
        }
      } catch (err) {
        console.error("Error fetching course:", err);
        setError("Failed to load course. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  // Format date to a readable string
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  if (error) {
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

  if (!course) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/instructor/courses" className="text-blue-500 hover:text-blue-700 flex items-center">
          <FiArrowLeft className="mr-2" /> Back to Courses
        </Link>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowEnrollment(!showEnrollment)}
            className={`px-4 py-2 rounded flex items-center ${
              showEnrollment 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FiUsers className="mr-2" /> {showEnrollment ? "Hide Enrollment" : "Manage Students"}
          </button>
          <Link
            to={`/instructor/courses/${courseId}/tasks`}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
          >
            <FiCheckSquare className="mr-2" /> Course Tasks
          </Link>
          <Link
            to={`/instructor/courses/${courseId}/edit`}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          >
            <FiEdit className="mr-2" /> Edit Course
          </Link>
        </div>
      </div>

      {/* Course status badge */}
      <div className="mb-4 flex flex-wrap gap-2">
        {course.published !== undefined && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            course.published 
              ? "bg-green-100 text-green-800" 
              : "bg-yellow-100 text-yellow-800"
          }`}>
            {course.published ? "Published" : "Draft"}
          </div>
        )}
        {course.category && (
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center">
            <FiTag className="mr-1" /> {course.category}
          </div>
        )}
      </div>

      {/* Course Information */}
      <div className="mb-4">
        <div className="flex flex-wrap text-sm text-gray-500 mb-2">
          <div className="mr-6 mb-2 flex items-center">
            <FiCalendar className="mr-1" />
            <span className="font-medium">Created:</span> {formatDate(course.createdAt)}
          </div>
          <div className="mr-6 mb-2 flex items-center">
            <FiCalendar className="mr-1" />
            <span className="font-medium">Last Updated:</span> {formatDate(course.updatedAt)}
          </div>
          <div className="mb-2 flex items-center">
            <FiImage className="mr-1" />
            <span className="font-medium">Media Files:</span> {course.mediaFiles?.length || 0}
          </div>
        </div>
      </div>

      {/* Use the CoursePreview component */}
      <CoursePreview 
        title={course.title}
        description={course.description}
        content={course.content}
        category={course.category}
        mediaFiles={course.mediaFiles}
      />

      {/* Student Enrollment Section */}
      {showEnrollment && (
        <div className="mt-6">
          <StudentEnrollment courseId={courseId} />
        </div>
      )}
    </div>
  );
}
