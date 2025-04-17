import React, { useState, useCallback } from "react";
import { FiUpload, FiVideo, FiImage, FiX } from "react-icons/fi";

const CourseEditor = ({ content, onContentChange, onMediaAdd }) => {
  const [activeTab, setActiveTab] = useState("content");
  const [selectedSection, setSelectedSection] = useState(null);
  
  // Parse the content into sections if it's a string
  const parseSections = useCallback(() => {
    if (!content || typeof content !== "string") return [];
    
    const sections = content.split(/(?=#{1,3}\s)/);
    return sections.map((section, index) => ({
      id: index,
      content: section.trim(),
    }));
  }, [content]);
  
  const sections = parseSections();
  
  // Set the first section as selected if none is selected and sections exist
  React.useEffect(() => {
    if (selectedSection === null && sections.length > 0) {
      setSelectedSection(0);
    }
  }, [sections, selectedSection]);
  
  const handleSectionClick = (sectionId) => {
    setSelectedSection(sectionId);
  };
  
  const handleSectionChange = (sectionId, newContent) => {
    const updatedSections = [...sections];
    updatedSections[sectionId].content = newContent;
    
    // Combine sections back into a single string
    const updatedContent = updatedSections.map(s => s.content).join("\n\n");
    onContentChange(updatedContent);
  };
  
  const handleMediaUpload = (type, e) => {
    // Prevent default to avoid any form submission
    e.preventDefault();
    e.stopPropagation();
    
    // This will be connected to the actual file upload functionality
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = type === "image" ? "image/*" : "video/*";
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        onMediaAdd(file, type, selectedSection);
      }
    };
    
    fileInput.click();
  };
  
  const handleTabChange = (tab, e) => {
    // Prevent default and stop propagation to avoid any form submission or bubbling
    e.preventDefault();
    e.stopPropagation();
    setActiveTab(tab);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Editor Tabs */}
      <div className="flex border-b">
        <button
          type="button"
          className={`px-4 py-2 ${
            activeTab === "content" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"
          }`}
          onClick={(e) => handleTabChange("content", e)}
        >
          Content
        </button>
        <button
          type="button"
          className={`px-4 py-2 ${
            activeTab === "preview" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"
          }`}
          onClick={(e) => handleTabChange("preview", e)}
        >
          Preview
        </button>
      </div>
      
      {/* Editor Content */}
      <div className="p-4">
        {activeTab === "content" ? (
          <div className="flex">
            {/* Sections Sidebar */}
            <div className="w-1/4 pr-4 border-r">
              <h3 className="font-bold mb-2">Sections</h3>
              <ul className="space-y-2">
                {sections.map((section, index) => (
                  <li 
                    key={section.id}
                    className={`p-2 rounded cursor-pointer ${
                      selectedSection === section.id ? "bg-blue-100" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleSectionClick(section.id)}
                  >
                    {section.content.split("\n")[0].replace(/#/g, "").trim() || `Section ${index + 1}`}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Editor Area */}
            <div className="w-3/4 pl-4">
              {selectedSection !== null ? (
                <div className="space-y-4">
                  <textarea
                    className="w-full h-64 p-2 border rounded"
                    value={sections[selectedSection].content}
                    onChange={(e) => handleSectionChange(selectedSection, e.target.value)}
                  />
                  
                  {/* Media Upload Buttons */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="flex items-center px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                      onClick={(e) => handleMediaUpload("image", e)}
                    >
                      <FiImage className="mr-1" /> Add Image
                    </button>
                    <button
                      type="button"
                      className="flex items-center px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                      onClick={(e) => handleMediaUpload("video", e)}
                    >
                      <FiVideo className="mr-1" /> Add Video
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded border border-dashed">
                  <p className="text-gray-500">Select a section to edit</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br />") }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseEditor;
