import React from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiUsers, FiLayers, FiShield, FiSettings, FiGlobe } from "react-icons/fi";

const LearnMorePage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <Link to="/">
            <img
              src="/images/logos/lightextb.png"
              alt="Stratum"
              className="h-16 object-contain"
            />
          </Link>
        </div>
        <div className="flex items-center space-x-5">
          <Link to="/" className="hover:underline">
            Home
          </Link>

          <Link
            to="/student-login"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Student Log In
          </Link>

          <Link
            to="/instructor-login"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Instructor Log In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 md:px-8 max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">
          Empower Your Coaching Business with Stratum
        </h1>
        <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
          A white-label platform built to be fully branded and customized by individual course creators or coaching teams.
        </p>
        <div className="flex justify-center">
          <img
            src="/images/courses.png"
            alt="Stratum Platform"
            className="w-full max-w-4xl rounded-lg shadow-xl"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 md:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Designed for Course Creators and Coaching Teams
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <FiLayers className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">White-Label Platform</h3>
              <p className="text-gray-600">
                Fully branded and customized for your business, maintaining your unique identity throughout the learning experience.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <FiUsers className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
              <p className="text-gray-600">
                Configure instructor roles, permissions, and visibility according to your internal workflows and team structure.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <FiShield className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Data Privacy</h3>
              <p className="text-gray-600">
                Help requests, tasks, and course content remain fully isolated and secure within your organization.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <FiCheckCircle className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor student progress, completion rates, and engagement to optimize your course delivery.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <FiSettings className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Customizable Workflows</h3>
              <p className="text-gray-600">
                Adapt the platform to match your specific teaching methodology and student interaction preferences.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <FiGlobe className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Private Instances</h3>
              <p className="text-gray-600">
                Each client gets their own private branded instance, ensuring complete separation of data and experiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 md:px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">
          How Stratum Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Brand & Customize</h3>
            <p className="text-gray-600">
              Set up your branded instance with your logo, colors, and custom domain.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Create & Organize</h3>
            <p className="text-gray-600">
              Build your courses, set up modules, and create engaging content for your students.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">Teach & Monitor</h3>
            <p className="text-gray-600">
              Launch your courses, interact with students, and track their progress in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 px-4 md:px-8 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Experience Stratum Today
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            In this demonstration environment, all instructors have visibility into all student help requests and course activity to showcase the platform's full feature set.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">

          </div>
        </div>
      </section>

      {/* Real-World Use Cases Section */}
      <section className="py-16 px-4 md:px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Real-World Use Cases
        </h2>
        
        <div className="bg-gray-50 p-8 rounded-lg mb-8">
          <h3 className="text-2xl font-semibold mb-4">Private Branded Instances</h3>
          <p className="text-gray-600 mb-4">
            In real-world deployments, each high-ticket coaching business gets their own private branded instance of Stratum. This ensures:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start">
              <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Only instructors within the same organization have access to their students' data</span>
            </li>
            <li className="flex items-start">
              <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Help requests, tasks, and course content remain fully isolated and secure</span>
            </li>
            <li className="flex items-start">
              <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span>Clients can configure instructor roles, permissions, and visibility according to their internal workflows</span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 md:px-8 bg-blue-600 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Coaching Business?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join the growing community of course creators and coaching teams who are scaling their businesses with Stratum.
          </p>
          <Link
            to="/pricing"
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-medium text-lg hover:bg-gray-100 inline-block"
          >
            View Pricing Options
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <img
                src="/images/logos/lightextb.png"
                alt="Stratum"
                className="h-12 object-contain"
              />
              <p className="text-gray-600 mt-2">
                Turning your expertise into revenue
              </p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <h3 className="font-semibold mb-3">Platform</h3>
                <ul className="space-y-2">
                  <li><Link to="/learn-more" className="text-gray-600 hover:text-gray-900">Features</Link></li>
                  <li><Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Company</h3>
                <ul className="space-y-2">
                  <li><Link to="/about" className="text-gray-600 hover:text-gray-900">About Us</Link></li>
                  <li><Link to="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Resources</h3>
                <ul className="space-y-2">
                  <li><Link to="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link></li>
                  <li><Link to="/support" className="text-gray-600 hover:text-gray-900">Support</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} Stratum. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LearnMorePage;
