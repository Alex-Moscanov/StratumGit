import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
//import { firestore } from "@/config/firebase";

import { firestore } from "../config/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { getEnrolledCourses } from "@/services/courseService";
import { getStudentNotifications } from "@/services/notificationService";
import ProgressStats from "@/components/student/ProgressStats";
import TodoList from "@/components/student/TodoList";
import NotificationsPanel from "@/components/student/NotificationsPanel";
import EnrolledCoursesList from "@/components/student/EnrolledCoursesList";





const StudentDashboard = () => {
  const { user } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    overallProgress: 0
  });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        console.log("Fetching dashboard data for user:", user.uid);
        console.log("User object:", JSON.stringify(user, null, 2));
        setLoading(true);
        
        // 1. Use the courseService to fetch enrolled courses
        const coursesData = await getEnrolledCourses(user.uid);
        console.log("Enrolled courses from service:", coursesData);
        
        // Process courses to add nextLesson information
        const processedCourses = [];
        
        for (const course of coursesData) {
          // Find the next lesson for this course
          let nextLesson = "No upcoming lessons";
          
          // If progress is less than 100%, try to find the next lesson
          if (course.progress < 100) {
            // Fetch modules for this course
            const modulesQuery = query(
              collection(firestore, "modules"),
              where("courseId", "==", course.id),
              orderBy("order", "asc")
            );
            
            const modulesSnapshot = await getDocs(modulesQuery);
            const modules = [];
            
            modulesSnapshot.forEach(doc => {
              modules.push({ id: doc.id, ...doc.data() });
            });
            
            // For each module, fetch lessons
            for (const module of modules) {
              const lessonsQuery = query(
                collection(firestore, "lessons"),
                where("moduleId", "==", module.id),
                orderBy("order", "asc")
              );
              
              const lessonsSnapshot = await getDocs(lessonsQuery);
              const lessons = [];
              
              lessonsSnapshot.forEach(doc => {
                lessons.push({ id: doc.id, ...doc.data() });
              });
              
              // Find the first lesson that hasn't been completed
              // This is simplified - in a real app, you'd track completed lessons
              if (lessons.length > 0) {
                nextLesson = lessons[0].title;
                break;
              }
            }
          }
          
          processedCourses.push({
            ...course,
            nextLesson
          });
        }
        
        setEnrolledCourses(processedCourses);
        
        // Calculate stats
        const completedCourses = coursesData.filter(course => course.progress === 100).length;
        
        // Calculate overall progress
        const overallProgress = coursesData.length > 0 
          ? coursesData.reduce((sum, course) => sum + (course.progress || 0), 0) / coursesData.length 
          : 0;
        
        //  Fetch tasks for this user
        const tasksQuery = query(
          collection(firestore, "tasks"),
          where("userId", "==", user.uid)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        let totalTasks = 0;
        let completedTasks = 0;
        
        tasksSnapshot.forEach(doc => {
          totalTasks++;
          if (doc.data().completed) {
            completedTasks++;
          }
        });
        
        setStats({
          coursesEnrolled: coursesData.length,
          coursesCompleted: completedCourses,
          tasksCompleted: completedTasks,
          tasksTotal: totalTasks,
          overallProgress
        });
        
        if (coursesData.length === 0) {
          // No enrolled courses
          setEnrolledCourses([]);
          setStats({
            coursesEnrolled: 0,
            coursesCompleted: 0,
            tasksCompleted: 0,
            tasksTotal: 0,
            overallProgress: 0
          });
        }

        // Fetch notifications using the notificationService
        try {
          const notificationsData = await getStudentNotifications(user.uid, 5);
          setNotifications(notificationsData);
        } catch (notificationError) {
          console.error("Error fetching notifications:", notificationError);
          setNotifications([]);
          
          // Fallback to direct query if the service fails
          try {
            // Try both studentId and userId to ensure we get all notifications
            const notificationsQuery1 = query(
              collection(firestore, "notifications"),
              where("studentId", "==", user.uid),
              orderBy("createdAt", "desc"),
              limit(5)
            );
            
            const notificationsSnapshot1 = await getDocs(notificationsQuery1);
            const notificationsData1 = [];
            
            notificationsSnapshot1.forEach(doc => {
              const data = doc.data();
              notificationsData1.push({ 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt?.toDate() || new Date()
              });
            });
            
            setNotifications(notificationsData1);
          } catch (fallbackError) {
            console.error("Error in fallback notification fetch:", fallbackError);
            setNotifications([]);
          }
        }

        // 4. Fetch recent help requests
        const helpRequestsQuery = query(
          collection(firestore, "helpRequests"),
          where("studentId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        
        const helpRequestsSnapshot = await getDocs(helpRequestsQuery);
        const helpRequestsData = [];
        
        helpRequestsSnapshot.forEach(doc => {
          const data = doc.data();
          helpRequestsData.push({ 
            id: doc.id, 
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          });
        });
        
        setHelpRequests(helpRequestsData);
        
        console.log("Dashboard data fetched successfully");
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Don't use placeholder data anymore - show empty state instead
        setStats({
          coursesEnrolled: 0,
          coursesCompleted: 0,
          tasksCompleted: 0,
          tasksTotal: 0,
          overallProgress: 0
        });
        
        setEnrolledCourses([]);
        setNotifications([]);
        setHelpRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome to your dashboard, {user?.displayName || user?.fullName || "Student"}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's a quick overview of your progress and upcoming tasks.
        </p>
      </div>

      {/* Progress Stats */}
      <ProgressStats stats={stats} />

      {/* Middle Section: Enrolled Courses + Todo List */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <EnrolledCoursesList courses={enrolledCourses} />
        </div>
        <div className="col-span-4 space-y-6">
          <TodoList userId={user?.uid} />
          
          {/* Notifications Panel placed under Todo List */}
          <NotificationsPanel notifications={notifications} />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;