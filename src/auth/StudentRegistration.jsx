import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, firestore } from "@/config/firebase";

// Hardcoded access code for now
const VALID_ACCESS_CODE = "2025";

export default function StudentRegistration() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    if (accessCode !== VALID_ACCESS_CODE) {
      setError("Invalid access code");
      return false;
    }
    
    return true;
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        fullName,
        email,
        role: "student",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      navigate("/student/dashboard");
    } catch (error) {
      console.error("Error during registration:", error);
      
      if (error.code === "auth/email-already-in-use") {
        setError("Email is already in use");
      } else {
        setError("Failed to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-6 shadow-lg rounded">
        <h1 className="text-2xl font-bold mb-4">Student Registration</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegistration} className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="p-2 border rounded"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
          
          <input
            type="email"
            placeholder="Email"
            className="p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          
          <input
            type="password"
            placeholder="Password"
            className="p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          
          <input
            type="password"
            placeholder="Confirm Password"
            className="p-2 border rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          
          <input
            type="text"
            placeholder="Access Code"
            className="p-2 border rounded"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            disabled={loading}
          />
          
          <button
            type="submit"
            className={`bg-black text-white py-2 rounded ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p>
            Already have an account?{" "}
            <Link to="/student-login" className="text-blue-600 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
        
        <div className="mt-2 text-center">
          <Link to="/" className="text-gray-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
