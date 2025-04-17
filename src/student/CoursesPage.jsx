import React, { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { FiBook, FiLock, FiFilter, FiSearch } from "react-icons/fi";
import { getEnrolledCourses } from "@/services/courseService";

const CoursesPage = () => {
  const { user } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const enrolledCourses = await getEnrolledCourses(user.uid);
        setCourses(enrolledCourses);
        setFilteredCourses(enrolledCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  // Apply filters and search
  useEffect(() => {
    let result = [...courses];
    
    // Apply progress filter
    if (filter === "in-progress") {
      result = result.filter(course => course.progress > 0 && course.progress < 100);
    } else if (filter === "completed") {
      result = result.filter(course => course.progress === 100);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        course => 
          course.title.toLowerCase().includes(query) || 
          (course.description && course.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredCourses(result);
  }, [courses, filter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">My Courses</h1>
        <p className="text-gray-600 mt-2">
          View and manage all your enrolled courses
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FiFilter className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Courses</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white p-6 rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <FiBook className="mx-auto text-5xl text-gray-300 mb-4" />
            {courses.length === 0 ? (
              <>
                <p className="text-gray-500 text-lg">You're not enrolled in any courses yet.</p>
                <p className="text-gray-500 mt-2">
                  Contact your instructor for an access code or enroll in a course.
                </p>
                <Link
                  to="/student/access-code"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FiLock className="mr-2" />
                  Enter Course Access Code
                </Link>
              </>
            ) : (
              <p className="text-gray-500 text-lg">No courses match your search criteria.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <div key={course.id} className="border rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 flex-1">
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 border-t">
                  <Link
                    to={`/student/courses/${course.id}`}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {course.progress === 0 ? "Start Course" : "Continue Learning"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Access Code Button */}
      <div className="md:hidden fixed bottom-4 right-4">
        <Link
          to="/student/access-code"
          className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
        >
          <FiLock size={24} />
        </Link>
      </div>
    </div>
  );
};

export default CoursesPage;
