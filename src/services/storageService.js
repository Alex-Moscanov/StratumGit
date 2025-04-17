import { storage } from "@/config/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The path in storage where the file should be saved
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<string>} - A promise that resolves with the download URL
 */
export const uploadFile = (file, path, progressCallback = null) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        
        if (progressCallback) {
          progressCallback(progress);
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Upload failed:", error);
        reject(error);
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);
          resolve(downloadURL);
        } catch (error) {
          console.error("Error getting download URL:", error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Generate a unique file path for storage
 * @param {string} fileName - Original file name
 * @param {string} fileType - Type of file (image, video, etc.)
 * @param {string} courseId - ID of the course (optional)
 * @returns {string} - A unique path for the file in storage
 */
export const generateFilePath = (fileName, fileType, courseId = null) => {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop();
  const basePath = courseId ? `courses/${courseId}/${fileType}s` : `courses/temp/${fileType}s`;
  
  return `${basePath}/${timestamp}_${fileName}`;
};
