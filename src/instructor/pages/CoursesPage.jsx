// src/instructor/pages/CoursesPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { FiEdit, FiTrash2, FiEye, FiPlus, FiCheck, FiX, FiTag } from "react-icons/fi";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesQuery = query(
          collection(firestore, "courses"),
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(coursesQuery);
        const coursesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        
        // Extract unique categories from courses
        const allCategories = coursesData
          .map(course => course.category)
          .filter(category => category); // Filter out undefined/null
        
        setCategories([...new Set(allCategories)]);
        setCourses(coursesData);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Format date to a readable string
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle course deletion
  const handleDeleteCourse = async (courseId) => {
    try {
      await deleteDoc(doc(firestore, "courses", courseId));
      setCourses(courses.filter(course => course.id !== courseId));
      setDeleteConfirmation(null);
    } catch (err) {
      console.error("Error deleting course:", err);
      setError("Failed to delete course. Please try again.");
    }
  };

  // Handle course publishing/unpublishing
  const handlePublishToggle = async (courseId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(firestore, "courses", courseId), {
        published: newStatus
      });
      
      // Update local state
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, published: newStatus } 
          : course
      ));
    } catch (err) {
      console.error("Error updating course publish status:", err);
      setError("Failed to update course status. Please try again.");
    }
  };

  // Filter courses by category
  const filteredCourses = selectedCategory === "all" 
    ? courses 
    : courses.filter(course => course.category === selectedCategory);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Link
          to="/instructor/add-course"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center"
        >
          <FiPlus className="mr-2" /> Add New Course
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === "all" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              All Courses
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={`px-3 py-1 rounded-full text-sm flex items-center ${
                  selectedCategory === category 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                <FiTag className="mr-1" /> {category}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No courses yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first course</p>
          <Link
            to="/instructor/add-course"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-flex items-center"
          >
            <FiPlus className="mr-2" /> Create Course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Course status badge */}
              <div className="relative">
                {course.published !== undefined && (
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                    course.published 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {course.published ? "Published" : "Draft"}
                  </div>
                )}
                {course.category && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
                    <FiTag className="mr-1" /> {course.category}
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2 mt-3 line-clamp-2">{course.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                
                {/* Course metadata */}
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>Created: {formatDate(course.createdAt)}</span>
                  <span>{course.mediaFiles?.length || 0} media files</span>
                </div>
                
                {/* Course actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Link
                    to={`/instructor/courses/${course.id}`}
                    className="text-blue-500 hover:text-blue-700 flex items-center"
                  >
                    <FiEye className="mr-1" /> View
                  </Link>
                  <Link
                    to={`/instructor/courses/${course.id}/edit`}
                    className="text-green-500 hover:text-green-700 flex items-center"
                  >
                    <FiEdit className="mr-1" /> Edit
                  </Link>
                  
                  {deleteConfirmation === course.id ? (
                    <div className="flex items-center space-x-1">
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        <FiCheck />
                      </button>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => setDeleteConfirmation(null)}
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="text-red-500 hover:text-red-700 flex items-center"
                      onClick={() => setDeleteConfirmation(course.id)}
                    >
                      <FiTrash2 className="mr-1" /> Delete
                    </button>
                  )}
                </div>
                
                {/* Publish/Unpublish toggle */}
                <div className="mt-4 pt-3 border-t">
                  <button
                    className={`w-full py-2 rounded text-sm font-medium ${
                      course.published 
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" 
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                    onClick={() => handlePublishToggle(course.id, course.published)}
                  >
                    {course.published ? "Unpublish Course" : "Publish Course"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
