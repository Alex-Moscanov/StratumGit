import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/config/firebase";

export default function InstructorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      const user = userCredential.user;
      
      // Verify that the user is an instructor
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      
      if (userDoc.exists() && (userDoc.data().role === "instructor" || userDoc.data().isInstructor === true)) {
        console.log("Instructor verified:", user.uid);
        // Navigate to instructor dashboard
        navigate("/instructor/dashboard");
      } else {
        // If user is not an instructor, sign them out
        await auth.signOut();
        setError("Access denied. This login is for instructors only.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setError("Invalid email or password");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-6 shadow-lg rounded">
        {/* Center Image */}
        <div className="flex justify-center mb-4">
          <img
            src="/images/logos/lightextb.png"
            alt="Stratum"
            className="h-20 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold mb-4">Instructor Sign In</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
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
          
          <button
            type="submit"
            className={`bg-black text-white py-2 rounded ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p>
            Don't have an instructor account?{" "}
            <Link to="/instructor-registration" className="text-blue-600 hover:underline">
              Register as Instructor
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
