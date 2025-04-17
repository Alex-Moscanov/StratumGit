import React, { useState } from "react";
import LessonEditor from "./LessonEditor";
import { FiPlus, FiSave } from "react-icons/fi";

const CourseContentManager = ({ initialContent, onSave, courseTitle, courseDescription }) => {
  const [courseStructure, setCourseStructure] = useState(
    initialContent || {
      overview: "",
      lessons: [
        {
          title: "Lesson 1: Introduction",
          content: "Enter your lesson content here..."
        }
      ]
    }
  );

  const handleLessonChange = (lessonIndex, updatedLesson) => {
    const updatedLessons = [...courseStructure.lessons];
    updatedLessons[lessonIndex] = updatedLesson;
    
    setCourseStructure({
      ...courseStructure,
      lessons: updatedLessons
    });
  };

  const handleOverviewChange = (e) => {
    setCourseStructure({
      ...courseStructure,
      overview: e.target.value
    });
  };

  const addNewLesson = () => {
    const lessonNumber = courseStructure.lessons.length + 1;
    const newLesson = {
      title: `Lesson ${lessonNumber}: New Lesson`,
      content: "Enter lesson content here..."
    };
    
    setCourseStructure({
      ...courseStructure,
      lessons: [...courseStructure.lessons, newLesson]
    });
  };

  const removeLesson = (lessonIndex) => {
    // Don't allow removing the last lesson
    if (courseStructure.lessons.length <= 1) {
      alert("You must have at least one lesson in your course.");
      return;
    }
    
    const updatedLessons = courseStructure.lessons.filter((_, i) => i !== lessonIndex);
    
    setCourseStructure({
      ...courseStructure,
      lessons: updatedLessons
    });
  };

  const handleSave = () => {
    onSave(courseStructure);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">Course Overview</h2>
        <textarea
          className="w-full h-32 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={courseStructure.overview}
          onChange={handleOverviewChange}
          placeholder="Enter a brief overview of your course..."
        />
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Course Lessons</h2>
        
        {courseStructure.lessons.map((lesson, lessonIndex) => (
          <LessonEditor
            key={lessonIndex}
            lessonData={lesson}
            onChange={handleLessonChange}
            onRemove={removeLesson}
            index={lessonIndex}
            courseTitle={courseTitle}
            courseDescription={courseDescription}
          />
        ))}
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={addNewLesson}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FiPlus className="mr-2" />
            Add Lesson
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <FiSave className="mr-2" />
            Save Course
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseContentManager;
