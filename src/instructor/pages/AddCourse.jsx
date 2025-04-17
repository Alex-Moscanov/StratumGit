// src/instructor/pages/AddCourse.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { firestore, auth } from "@/config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import CourseContentManager from "@/components/course/CourseContentManager";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";

const CATEGORIES = [
  "Business", "Technology", "Design", "Marketing", 
  "Health & Fitness", "Personal Development", "Education",
  "Arts & Crafts", "Music", "Cooking", "Other"
];

export default function AddCourse() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [courseStructure, setCourseStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const generateOutline = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call the backend endpoint to generate the course outline with lessons
      const response = await fetch("/api/generate-course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description, category }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate course outline.");
      }

      const data = await response.json();
      console.log("API Success Response: ", data);

      // Set the course structure from the parsed outline
      setCourseStructure(data.parsedOutline || {
        overview: data.outline,
        modules: [
          {
            title: "Module 1: Introduction",
            lessons: [
              {
                title: "Lesson 1: Getting Started",
                content: data.outline.split('\n')
              }
            ]
          }
        ]
      });

      // Move to the next step
      setStep(2);
    } catch (err) {
      console.error("Error generating course outline:", err);
      setError("Error generating course outline. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async (updatedCourseStructure) => {
    setLoading(true);
    setError("");

    try {
      // Get the current user
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to save a course.");
      }

      // Prepare the course data
      const courseData = {
        title,
        description,
        category,
        content: JSON.stringify(updatedCourseStructure),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        published: false,
        mediaFiles: [],
      };

      // Save to Firestore
      const docRef = await addDoc(collection(firestore, "courses"), courseData);
      console.log("Course saved with ID: ", docRef.id);

      setSuccess(true);
      // Navigate to the courses page after a short delay
      setTimeout(() => {
        navigate("/courses");
      }, 1500);
    } catch (err) {
      console.error("Error saving course:", err);
      setError("Error saving course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Create New Course</h1>
      
      <form onSubmit={generateOutline} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Course Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter course title"
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
            className="w-full p-2 border rounded h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter course description"
            required
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        
        {error && <p className="text-red-500">{error}</p>}
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="mr-2">Generating...</span>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
              </>
            ) : (
              <>
                <span className="mr-2">Generate Course</span>
                <FiArrowRight />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderStepTwo = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Course Content</h1>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
        >
          <FiArrowLeft className="mr-2" />
          Back to Details
        </button>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-gray-600">{description}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {category}
        </span>
      </div>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && (
        <p className="text-green-500 mb-4">
          Course saved successfully! Redirecting to courses page...
        </p>
      )}
      
      <CourseContentManager
        initialContent={courseStructure}
        onSave={handleSaveCourse}
        courseTitle={title}
        courseDescription={description}
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {step === 1 && renderStepOne()}
      {step === 2 && renderStepTwo()}
    </div>
  );
}
