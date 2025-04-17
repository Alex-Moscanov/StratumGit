import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";

import { FiUser, FiMail, FiCalendar, FiUpload, FiLoader, FiCheck, FiX } from "react-icons/fi";

export default function ProfilePage() {
  const { user } = useOutletContext() || {};
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    photoURL: "",
    joinDate: null
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.fullName || user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        joinDate: user.createdAt ? new Date(user.createdAt.seconds * 1000) : null
      });
    }
  }, [user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadStatus('error');
      alert('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus('error');
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      setUploadStatus('uploading');

      // Instead of using Firebase Storage directly, using base64 approach to avoid CORS issues in development environment
      // Note: In a production app, you'd want to use Firebase Storage instead and configure CORS properly
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const base64Image = event.target.result;
        
        // Update user document in Firestore with base64 image

        try {
          await updateDoc(doc(firestore, "users", user.uid), {
            photoURL: base64Image
          });
          
          // Update local state
          setProfileData(prev => ({
            ...prev,
            photoURL: base64Image
          }));
          
          setUploadStatus('success');
        } catch (error) {
          console.error("Error updating profile photo:", error);
          setUploadStatus('error');
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        console.error("Error reading file");
        setUploadStatus('error');
        setLoading(false);
      };
      
      // Read the file as a data URL (base64)
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("Error handling profile photo:", error);
      setUploadStatus('error');
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Unknown";
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-600 mt-1">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Content */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row">
          {/* Profile Photo Section */}
          <div className="md:w-1/3 flex flex-col items-center mb-6 md:mb-0">
            <div className="relative">
              <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow">
                {profileData.photoURL ? (
                  <img 
                    src={profileData.photoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <FiUser className="text-gray-400 text-5xl" />
                  </div>
                )}
              </div>
              
              {/* Upload Status Indicator */}
              {uploadStatus === 'uploading' && (
                <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full">
                  <FiLoader className="animate-spin" />
                </div>
              )}
              {uploadStatus === 'success' && (
                <div className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full">
                  <FiCheck />
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="absolute bottom-0 right-0 bg-red-500 text-white p-2 rounded-full">
                  <FiX />
                </div>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
              accept="image/*"
            />
            
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <FiUpload className="mr-2" />
              {loading ? 'Uploading...' : 'Change Photo'}
            </button>
            
            <p className="text-xs text-gray-500 mt-2">
              JPEG, PNG or GIF. Max size 5MB.
            </p>
          </div>
          
          {/* Profile Details Section */}
          <div className="md:w-2/3 md:pl-8">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Full Name</label>
                <div className="flex items-center mt-1">
                  <FiUser className="text-gray-400 mr-2" />
                  <span className="text-gray-800 font-medium">{profileData.displayName || "Not provided"}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Email Address</label>
                <div className="flex items-center mt-1">
                  <FiMail className="text-gray-400 mr-2" />
                  <span className="text-gray-800">{profileData.email}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Member Since</label>
                <div className="flex items-center mt-1">
                  <FiCalendar className="text-gray-400 mr-2" />
                  <span className="text-gray-800">{formatDate(profileData.joinDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
