import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between p-6 border-b-0 shadow-none">

        <div>
          <img
            src="/images/logos/lightextb.png"
            alt="Stratum"
            className="h-20 object-contain"
          />
        </div>

        <div className="flex items-center space-x-5">
          <Link to="/learn-more" className="hover:underline">
            Learn More
          </Link>
          <Link to="/pricing" className="hover:underline">
            Pricing
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <h1 className="text-3xl font-bold mt-19 mb-4 text-center">
          Turning your expertise into revenue just got easier
        </h1>
        <p className="text-gray-700 text-center mb-8 max-w-xl">
          From Expertise to Earnings: Create Courses, Monitor Progress, and Inspire Success.
        </p>
        
        <div className="flex space-x-4 my-4">
          <Link
            to="/student-login"
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
          >
            Student Log In
          </Link>
          <Link
            to="/instructor-login"
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
          >
            Instructor Log In
          </Link>
        </div>

        {
        <div className="my-1">
          <img
            src="/images/mac.png"
            alt="Laptop screenshot"
            className="w-full max-w-5xl h-auto"
          />
        </div>
        }

      </main>
    </div>
  );
}
