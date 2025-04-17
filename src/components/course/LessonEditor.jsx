import React, { useState } from "react";
import { FiEdit2, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";

const LessonEditor = ({ lessonData, onChange, onRemove, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(lessonData.title);

  const handleTitleChange = (e) => {
    setLessonTitle(e.target.value);
  };

  const saveTitle = () => {
    setIsEditingTitle(false);
    onChange(index, {
      ...lessonData,
      title: lessonTitle
    });
  };

  const handleContentChange = (e) => {
    onChange(index, {
      ...lessonData,
      content: e.target.value
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      {/* Lesson Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button 
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-2 text-gray-500 hover:text-gray-700"
            aria-label={isExpanded ? "Collapse lesson" : "Expand lesson"}
          >
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          
          {isEditingTitle ? (
            <div className="flex items-center">
              <input
                type="text"
                value={lessonTitle}
                onChange={handleTitleChange}
                className="border rounded px-2 py-1 text-lg font-semibold"
                autoFocus
                onBlur={saveTitle}
                onKeyPress={(e) => e.key === 'Enter' && saveTitle()}
              />
            </div>
          ) : (
            <h2 className="text-lg font-semibold">{lessonTitle}</h2>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="p-1 text-blue-500 hover:text-blue-700"
            title="Edit lesson title"
          >
            <FiEdit2 />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-red-500 hover:text-red-700"
            title="Remove lesson"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
      
      {/* Lesson Content */}
      {isExpanded && (
        <div className="pl-6">
          <textarea
            className="w-full h-64 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={lessonData.content || ""}
            onChange={handleContentChange}
            placeholder="Enter lesson content here..."
          />
        </div>
      )}
    </div>
  );
};

export default LessonEditor;
