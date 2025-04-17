// src/instructor/pages/CourseEditPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import CourseContentManager from "@/components/course/CourseContentManager";
import MediaUploader from "@/components/course/MediaUploader";
import CoursePreview from "@/components/course/CoursePreview";
import { FiArrowLeft, FiSave } from "react-icons/fi";

export default function CourseEditPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [courseStructure, setCourseStructure] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [currentStep, setCurrentStep] = useState("edit"); // edit, review
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseDoc = await getDoc(doc(firestore, "courses", courseId));
        
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          setTitle(courseData.title || "");
          setDescription(courseData.description || "");
          setCategory(courseData.category || "");
          
          // Parse the content JSON
          try {
            if (courseData.content) {
              let parsedContent = typeof courseData.content === 'string' 
                ? JSON.parse(courseData.content) 
                : courseData.content;
              
              // Handle old format (modules) if needed
              if (parsedContent.modules && !parsedContent.lessons) {
                parsedContent.lessons = parsedContent.modules;
                delete parsedContent.modules;
              }
              
              setCourseStructure(parsedContent);
            } else {
              setCourseStructure({
                overview: "",
                lessons: [
                  {
                    title: "Lesson 1: Introduction",
                    content: "Enter lesson content here..."
                  }
                ]
              });
            }
          } catch (err) {
            console.error("Error parsing course content:", err);
            // If parsing fails, create a default structure with the content as overview
            setCourseStructure({
              overview: courseData.content || "",
              lessons: [
                {
                  title: "Lesson 1: Introduction",
                  content: "Enter lesson content here..."
                }
              ]
            });
          }
          
          setMediaFiles(courseData.mediaFiles || []);
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

  const handleMediaAdd = (file, type) => {
    setMediaFiles(prev => [...prev, {
      id: Date.now().toString(),
      file,
      type,
      name: file.name,
      url: URL.createObjectURL(file) // Create a temporary URL for preview
    }]);
  };

  const handleMediaUploadComplete = (mediaInfo) => {
    setMediaFiles(prev => [...prev, {
      id: Date.now().toString(),
      ...mediaInfo
    }]);
  };

  const handleRemoveMedia = (mediaId) => {
    setMediaFiles(prev => prev.filter(media => media.id !== mediaId));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !courseStructure) {
      setError("All fields are required.");
      return;
    }
    
    setSaving(true);
    
    try {
      // Update the course document in Firestore
      await updateDoc(doc(firestore, "courses", courseId), {
        title: title.trim(),
        description: description.trim(),
        category: category,
        content: JSON.stringify(courseStructure),
        mediaFiles: mediaFiles.map(media => ({
          id: media.id,
          type: media.type,
          name: media.name,
          url: media.url,
          path: media.path || null
        })),
        updatedAt: serverTimestamp(),
      });
      
      alert("Course updated successfully!");
      navigate(`/instructor/courses/${courseId}`);
    } catch (err) {
      console.error("Error updating course:", err);
      setError("Failed to update course. Please try again.");
    } finally {
      setSaving(false);
    }
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

  if (error && !title) {
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

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <Link to={`/instructor/courses/${courseId}`} className="text-blue-500 hover:text-blue-700 flex items-center">
          <FiArrowLeft className="mr-2" /> Back to Course
        </Link>
        <h1 className="text-2xl font-bold">Edit Course</h1>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {currentStep === "edit" ? (
          <>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="p-2 border rounded w-full"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="p-2 border rounded w-full h-24"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  id="category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="p-2 border rounded w-full"
                />
              </div>
            </div>
            
            {courseStructure && (
              <CourseContentManager 
                initialContent={courseStructure} 
                onSave={setCourseStructure}
                courseTitle={title}
                courseDescription={description}
              />
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <MediaUploader 
                onUploadComplete={handleMediaUploadComplete}
                mediaType="image"
              />
              <MediaUploader 
                onUploadComplete={handleMediaUploadComplete}
                mediaType="video"
              />
            </div>
            
            {/* Media Files Preview */}
            {mediaFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-2">Media Files</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {mediaFiles.map(media => (
                    <div key={media.id} className="relative border rounded-lg overflow-hidden">
                      {media.type === "image" ? (
                        <img 
                          src={media.url} 
                          alt={media.name} 
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                          <span className="text-sm">Video: {media.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        onClick={() => handleRemoveMedia(media.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setCurrentStep("review")}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Review Changes
              </button>
            </div>
          </>
        ) : (
          <>
            <CoursePreview 
              title={title}
              description={description}
              content={courseStructure}
              category={category}
              mediaFiles={mediaFiles}
            />
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                disabled={saving}
              >
                <FiSave className="mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep("edit")}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={saving}
              >
                Back to Edit
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
