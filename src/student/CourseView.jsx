import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { firestore } from "@/config/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore";
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiClock } from "react-icons/fi";
import HelpRequestForm from "@/components/student/HelpRequestForm";


const StudentCourseView = () => {
  const { courseId } = useParams();
  const { user } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState(0);
  const [enrollment, setEnrollment] = useState(null);

  // Format content with markdown-like syntax 
  const formatContent = (text) => {
    if (!text) return "";
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;" />')
      .replace(/- (.*?)(?:\n|$)/g, '<li>$1</li>')
      .replace(/<li>(.*?)<\/li>/g, '<ul>$&</ul>')
      .replace(/<\/ul><ul>/g, '')
      .replace(/\n/g, '<br />');
  };

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId || !user) return;

      try {
        // Fetch course data
        const courseDoc = await getDoc(doc(firestore, "courses", courseId));
        
        if (!courseDoc.exists()) {
          console.error("Course not found");
          setLoading(false);
          return;
        }
        
        const courseData = { id: courseDoc.id, ...courseDoc.data() };
        setCourse(courseData);
        
        // Fetch enrollment data to get completion status
        const enrollmentsQuery = query(
          collection(firestore, "enrollments"),
          where("courseId", "==", courseId),
          where("studentId", "==", user.uid)
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        let enrollmentData = null;
        let completedLessons = {};
        
        if (!enrollmentsSnapshot.empty) {
          enrollmentData = { 
            id: enrollmentsSnapshot.docs[0].id, 
            ...enrollmentsSnapshot.docs[0].data() 
          };
          setEnrollment(enrollmentData);
          
          // Get completed lessons from enrollment data
          completedLessons = enrollmentData.completedLessons || {};
        }
        
        // Parse course content to get actual lessons
        let parsedContent = { overview: "", lessons: [] };
        try {
          if (typeof courseData.content === 'string') {
            parsedContent = JSON.parse(courseData.content);
          } else if (typeof courseData.content === 'object') {
            parsedContent = courseData.content;
          }
          
          // Handle old format (modules) if needed
          if (parsedContent.modules && !parsedContent.lessons) {
            parsedContent.lessons = parsedContent.modules;
            delete parsedContent.modules;
          }
        } catch (error) {
          console.error("Error parsing course content:", error);
        }
        
        // Transform lessons to include completion status
        const transformedLessons = parsedContent.lessons.map((lesson, index) => ({
          id: `lesson-${index}`,
          title: lesson.title,
          description: lesson.description || "Lesson " + (index + 1),
          content: lesson.content,
          order: index + 1,
          completed: completedLessons[`lesson-${index}`] === true
        }));
        
        setLessons(transformedLessons);
        
        // Set current lesson to the first incomplete lesson, or the last lesson if all are complete
        const firstIncompleteLesson = transformedLessons.find(lesson => !lesson.completed);
        setCurrentLesson(firstIncompleteLesson || transformedLessons[transformedLessons.length - 1]);
        
        // Calculate progress
        const completedCount = transformedLessons.filter(lesson => lesson.completed).length;
        const progressPercentage = transformedLessons.length > 0 
          ? Math.round((completedCount / transformedLessons.length) * 100)
          : 0;
        setProgress(progressPercentage);
        
      } catch (error) {
        console.error("Error fetching course data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user]);

  const handleLessonSelect = (lesson) => {
    setCurrentLesson(lesson);
  };

  const handleMarkAsComplete = async () => {
    if (!currentLesson || !enrollment) return;
    
    try {
      // Update the completed lessons in the enrollment document
      const enrollmentRef = doc(firestore, "enrollments", enrollment.id);
      const updatedCompletedLessons = {
        ...enrollment.completedLessons,
        [currentLesson.id]: true
      };
      
      await updateDoc(enrollmentRef, {
        completedLessons: updatedCompletedLessons,
        progress: Math.round(((Object.keys(updatedCompletedLessons).length) / lessons.length) * 100)
      });
      
      // Update local state
      setLessons(prevLessons => 
        prevLessons.map(lesson => 
          lesson.id === currentLesson.id 
            ? { ...lesson, completed: true } 
            : lesson
        )
      );
      
      setCurrentLesson(prev => ({ ...prev, completed: true }));
      
      // Recalculate progress
      const completedCount = lessons.filter(lesson => 
        lesson.id === currentLesson.id || lesson.completed
      ).length;
      setProgress(Math.round((completedCount / lessons.length) * 100));
      
      // Update enrollment state
      setEnrollment(prev => ({
        ...prev,
        completedLessons: updatedCompletedLessons,
        progress: Math.round((completedCount / lessons.length) * 100)
      }));
      
    } catch (error) {
      console.error("Error marking lesson as complete:", error);
    }
  };

  const handleNextLesson = () => {
    const currentIndex = lessons.findIndex(lesson => lesson.id === currentLesson.id);
    if (currentIndex < lessons.length - 1) {
      setCurrentLesson(lessons[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Course Not Found</h2>
        <p className="text-gray-600 mb-6">The course you're looking for doesn't exist or you don't have access to it.</p>
        <Link to="/student/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Link to="/student/dashboard" className="text-blue-600 hover:underline flex items-center">
            <FiArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800">{course.title}</h1>
        <p className="text-gray-600 mt-2">{course.description}</p>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Course Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Lesson Navigation */}
        <div className="col-span-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Lessons</h2>
            
            <div className="space-y-2">
              {lessons.map(lesson => (
                <button
                  key={lesson.id}
                  className={`w-full text-left p-3 rounded flex items-center ${
                    currentLesson?.id === lesson.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-gray-200"
                  }`}
                  onClick={() => handleLessonSelect(lesson)}
                >
                  <div className="mr-3">
                    {lesson.completed ? (
                      <FiCheckCircle className="text-green-500" />
                    ) : (
                      <FiClock className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{lesson.title}</h3>
                    <p className="text-sm text-gray-500">{lesson.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Lesson Content */}
        <div className="col-span-8 space-y-6">
          {currentLesson && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <FiBookOpen className="text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold">{currentLesson.title}</h2>
              </div>
              
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ 
                  __html: formatContent(currentLesson.content)
                }} />
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  className={`px-4 py-2 rounded ${
                    currentLesson.completed
                      ? "bg-gray-200 text-gray-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  disabled={currentLesson.completed}
                  onClick={handleMarkAsComplete}
                >
                  {currentLesson.completed ? "Completed" : "Mark as Complete"}
                </button>
                
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  onClick={handleNextLesson}
                  disabled={currentLesson.id === lessons[lessons.length - 1]?.id}
                >
                  Next Lesson
                </button>
              </div>
            </div>
          )}
          
          {/* Help Request Form */}
          <HelpRequestForm
            userId={user?.uid}
            studentEmail={user?.email}
            courseId={courseId}
            courseTitle={course.title}
            lessonId={currentLesson?.id}
            lessonTitle={currentLesson?.title}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentCourseView;
