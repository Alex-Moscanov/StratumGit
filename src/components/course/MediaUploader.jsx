import React, { useState } from "react";
import { FiUpload, FiX, FiCheck } from "react-icons/fi";
import { uploadFile, generateFilePath } from "@/services/storageService";

const MediaUploader = ({ onUploadComplete, mediaType }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Validate file type
    if (mediaType === "image" && !selectedFile.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    
    if (mediaType === "video" && !selectedFile.type.startsWith("video/")) {
      setError("Please select a video file");
      return;
    }
    
    setFile(selectedFile);
    setError("");
    
    // Create preview for images
    if (mediaType === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Generate a unique path for the file
      const filePath = generateFilePath(file.name, mediaType);
      
      // Upload the file to Firebase Storage
      const downloadURL = await uploadFile(file, filePath, (progress) => {
        setUploadProgress(progress);
      });
      
      // Pass the file info back to parent component
      onUploadComplete({
        file,
        type: mediaType,
        url: downloadURL,
        name: file.name,
        path: filePath
      });
      
      // Reset the component
      setFile(null);
      setPreview(null);
      setUploadProgress(0);
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  
  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setUploadProgress(0);
  };
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium mb-2">
        Upload {mediaType === "image" ? "Image" : "Video"}
      </h3>
      
      {!file ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-100"
             onClick={() => document.getElementById(`${mediaType}-upload`).click()}>
          <FiUpload className="text-gray-400 text-3xl mb-2" />
          <p className="text-sm text-gray-500">
            Click to select a {mediaType === "image" ? "image" : "video"} file
          </p>
          <input
            type="file"
            id={`${mediaType}-upload`}
            className="hidden"
            accept={mediaType === "image" ? "image/*" : "video/*"}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {mediaType === "image" && preview && (
            <div className="relative w-full h-40 bg-gray-200 rounded overflow-hidden">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {mediaType === "video" && (
            <div className="flex items-center space-x-2 p-2 bg-gray-200 rounded">
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <FiUpload className="text-white" />
              </div>
              <span className="text-sm truncate flex-1">{file.name}</span>
            </div>
          )}
          
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}% uploaded</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="animate-spin mr-1">⟳</span> Uploading...
                </>
              ) : (
                <>
                  <FiCheck className="mr-1" /> Upload
                </>
              )}
            </button>
            <button
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
              onClick={handleCancel}
              disabled={uploading}
            >
              <FiX className="mr-1" /> Cancel
            </button>
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default MediaUploader;
