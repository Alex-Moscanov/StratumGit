import React, { useState } from "react";
import { FiTag, FiChevronDown, FiChevronUp } from "react-icons/fi";

const CoursePreview = ({ title, description, content, category, mediaFiles }) => {
  const [expandedLessons, setExpandedLessons] = useState({});
  
  let parsedContent = { overview: "", lessons: [] };
  try {
    if (typeof content === 'string') {
      parsedContent = JSON.parse(content);
    } else if (typeof content === 'object') {
      parsedContent = content;
    }
    
    if (parsedContent.modules && !parsedContent.lessons) {
      parsedContent.lessons = parsedContent.modules;
      delete parsedContent.modules;
    }
  } catch (error) {
    console.error("Error parsing course content:", error);
  }

  const toggleLesson = (lessonIndex) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonIndex]: !prev[lessonIndex]
    }));
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        
        {category && (
          <div className="mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <FiTag className="mr-1" /> {category}
            </span>
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700">{description}</p>
        </div>
        
        {/* Course Overview */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Course Overview</h2>
          <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
            <div dangerouslySetInnerHTML={{ 
              __html: formatContent(parsedContent.overview)
            }} />
          </div>
        </div>
        
        {/* Course Lessons */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Course Lessons</h2>
          
          {parsedContent.lessons && parsedContent.lessons.map((lesson, lessonIndex) => (
            <div key={lessonIndex} className="border rounded-lg mb-4 overflow-hidden">
              {/* Lesson Header */}
              <div 
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                onClick={() => toggleLesson(lessonIndex)}
              >
                <h3 className="font-medium text-lg">{lesson.title}</h3>
                <button className="text-gray-500">
                  {expandedLessons[lessonIndex] ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>
              
              {/* Lesson Content */}
              {expandedLessons[lessonIndex] && (
                <div className="p-4">
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: formatContent(lesson.content)
                    }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {mediaFiles && mediaFiles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Media Files</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mediaFiles.map((media) => (
                <div key={media.id} className="border rounded-lg overflow-hidden">
                  {media.type === "image" ? (
                    <div>
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-32 object-cover"
                      />
                      <p className="p-2 text-sm text-gray-500">{media.name}</p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="bg-gray-100 rounded p-2 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-500 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm">{media.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePreview;
