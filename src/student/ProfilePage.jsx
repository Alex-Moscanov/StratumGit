import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

import { 
  FiUser, 
  FiMail, 
  FiCalendar, 
  FiUpload, 
  FiLoader, 
  FiCheck, 
  FiX, 
  FiLock, 
  FiEdit, 
  FiSave, 
  FiAlertTriangle,
  FiBell,
  FiShield,
  FiEye,
  FiLink
} from "react-icons/fi";

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
  const [editMode, setEditMode] = useState(false);
  const [editableProfileData, setEditableProfileData] = useState({
    displayName: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    assignmentReminders: true,
    courseUpdates: true,
    accountAlerts: true
  });
  const [securityOptions, setSecurityOptions] = useState({
    twoFactorEnabled: false
  });
  const [privacySettings, setPrivacySettings] = useState({
    showProfileToOtherStudents: true,
    showProgressToInstructors: true
  });
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.fullName || user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        joinDate: user.createdAt ? new Date(user.createdAt.seconds * 1000) : null
      });
      
      setEditableProfileData({
        displayName: user.fullName || user.displayName || ""
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
      // Note: In a production app, I will use Firebase Storage instead and configure CORS properly
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
          calculateProfileCompleteness();
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
  
  const handleEditProfile = () => {
    setEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditableProfileData({
      displayName: profileData.displayName
    });
  };
  
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      await updateDoc(doc(firestore, "users", user.uid), {
        fullName: editableProfileData.displayName,
        displayName: editableProfileData.displayName
      });
      
      // Update local state
      setProfileData(prev => ({
        ...prev,
        displayName: editableProfileData.displayName
      }));
      
      setEditMode(false);
      setLoading(false);
      calculateProfileCompleteness();
    } catch (error) {
      console.error("Error updating profile:", error);
      setLoading(false);
    }
  };
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Reset states
    setPasswordError("");
    setPasswordSuccess(false);
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    
    try {
      setLoading(true);
      
      const auth = getAuth();
      const user = auth.currentUser;
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Change password
      await updatePassword(user, passwordData.newPassword);
      
      // Clear form and show success
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      setPasswordSuccess(true);
      setLoading(false);
      calculateProfileCompleteness();
    } catch (error) {
      console.error("Error changing password:", error);
      
      if (error.code === 'auth/wrong-password') {
        setPasswordError("Current password is incorrect");
      } else if (error.code === 'auth/weak-password') {
        setPasswordError("Password is too weak");
      } else {
        setPasswordError("Failed to change password. Please try again.");
      }
      
      setLoading(false);
    }
  };
  
  const handleNotificationChange = (setting) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handleSecurityChange = (setting) => {
    setSecurityOptions(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handlePrivacyChange = (setting) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
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
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FiUser className="inline mr-2" />
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "security"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FiLock className="inline mr-2" />
              Security
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "notifications"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FiBell className="inline mr-2" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "privacy"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FiEye className="inline mr-2" />
              Privacy
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Information Tab */}
          {activeTab === "profile" && (
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Profile Information</h2>
                  {!editMode ? (
                    <button
                      onClick={handleEditProfile}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center text-sm"
                    >
                      <FiEdit className="mr-1" /> Edit
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"
                      >
                        {loading ? (
                          <FiLoader className="animate-spin mr-1" />
                        ) : (
                          <FiSave className="mr-1" />
                        )}
                        Save
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Full Name</label>
                    {!editMode ? (
                      <div className="flex items-center mt-1">
                        <FiUser className="text-gray-400 mr-2" />
                        <span className="text-gray-800 font-medium">{profileData.displayName || "Not provided"}</span>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={editableProfileData.displayName}
                          onChange={(e) => setEditableProfileData({...editableProfileData, displayName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
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
          )}
          
          {/* Security Tab */}
          {activeTab === "security" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
              
              {/* Password Change Section */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                
                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-start">
                    <FiCheck className="text-green-500 mt-0.5 mr-2" />
                    <span>Your password has been successfully updated.</span>
                  </div>
                )}
                
                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
                    <FiAlertTriangle className="text-red-500 mt-0.5 mr-2" />
                    <span>{passwordError}</span>
                  </div>
                )}
                
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters long.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <FiLoader className="animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FiLock className="mr-2" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              
            </div>
          )}
          
          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-800">Email Notifications</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive notifications via email
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPreferences.emailNotifications}
                        onChange={() => handleNotificationChange('emailNotifications')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-800">Assignment Reminders</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Get reminders about upcoming assignments and deadlines
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPreferences.assignmentReminders}
                        onChange={() => handleNotificationChange('assignmentReminders')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-800">Course Updates</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive notifications when courses are updated or new content is added
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPreferences.courseUpdates}
                        onChange={() => handleNotificationChange('courseUpdates')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-800">Account Alerts</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Get notified about important account-related activities
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPreferences.accountAlerts}
                        onChange={() => handleNotificationChange('accountAlerts')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Save Preferences
                </button>
              </div>
            </div>
          )}
          
          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Privacy Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-800">Profile Visibility</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Allow other students to see your profile information
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={privacySettings.showProfileToOtherStudents}
                        onChange={() => handlePrivacyChange('showProfileToOtherStudents')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-800">Progress Visibility</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Allow instructors to see your detailed progress and activity
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={privacySettings.showProgressToInstructors}
                        onChange={() => handlePrivacyChange('showProgressToInstructors')}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Save Privacy Settings
                </button>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data & Privacy</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You can request a copy of your data or delete your account at any time.
                </p>
                <div className="flex space-x-4">
                  <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Request Data Export
                  </button>
                  <button className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
