import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import RobotCard from "../components/RobotCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getData } from "@/services/getServices";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, X } from "lucide-react";

export default function Robots() {
  const navigate = useNavigate();
  const { projectName, userName } = useAuth();
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const modalRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsImageModalOpen(false);
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isImageModalOpen]);

  // Close modal on escape key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsImageModalOpen(false);
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isImageModalOpen]);

  const fetchRobotsFromAPI = async () => {
    try {
      setLoading(true);

      const allRobots = await getData(`${BASE_URL}/robots`);

      if (!allRobots) {
        toast.error("No data received from API");
        setRobots([]);
        return;
      }

      const robotsArray = Array.isArray(allRobots) ? allRobots : [allRobots];
      
      let filteredRobots = robotsArray;
      
      if (projectName) {
        const projects = await getData(`${BASE_URL}/projects`);
        const projectsArray = Array.isArray(projects) ? projects : [projects];
        
        const foundProject = projectsArray.find(
          project => project.ProjectName?.trim() === projectName.trim()
        );

        if (foundProject) {
          const projectId = foundProject.id || foundProject.projectId;
          filteredRobots = robotsArray.filter(robot => {
            const robotProjectId = robot.projectId || robot.project_id;
            return robotProjectId == projectId;
          });
          setCurrentProject(foundProject);
        }
      }

      setRobots(filteredRobots);
      
      if (filteredRobots.length === 0) {
        toast.info("No robots found in API");
      } else {
        toast.success(`Loaded ${filteredRobots.length} robots`);
      }

    } catch (error) {
      toast.error("Failed to load robots from API");
      setRobots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRobotsFromAPI();
  }, [projectName]);

  const handleViewDetails = (robot) => {
    navigate(`/robots/${robot.id}`, { state: { robot } });
  };

  const handleImageClick = () => {
    if (currentProject?.Image) {
      setIsImageModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-6 pt-36 pb-24">
          
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-color mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading robots from API...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="container mx-auto px-6 py-24 relative">
        <motion.h2
          className="text-4xl font-bold text-gray-900 mb-4 text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Omega Cleaning Robots
        </motion.h2>

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-lg text-gray-600 mb-4">
            {projectName ? (
              <>Project: <span className="font-semibold text-main-color">{projectName}</span></>
            ) : (
              <span className="font-semibold text-main-color">All Projects</span>
            )}
          </p>
          
          {projectName && currentProject && currentProject.Image && (
            <motion.div
              className="relative w-full max-w-2xl mx-auto px-4 lg:px-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Lock Icon */}
              <div className="relative flex justify-center mb-2">
                <Lock 
                  className="w-6 h-6 text-gray-400 hover:text-main-color transition-colors cursor-pointer" 
                  title="Click image to view"
                  onClick={handleImageClick}
                />
              </div>

              <div 
                className="relative w-full lg:w-4/5 mx-auto aspect-[3/2] overflow-hidden rounded-xl shadow-md bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer group"
                onClick={handleImageClick}
              >
                <img
                  src={`${UPLOADS_URL}/${currentProject.Image}`}
                  alt={projectName}
                  className="w-full h-3/4 object-contain p-3 transition-all duration-500 ease-in-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 rounded-xl"></div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Click to enlarge
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {robots.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-gray-500 text-lg mb-4">No robots found in API.</p>
            <button
              onClick={fetchRobotsFromAPI}
              className="px-4 py-2 bg-main-color text-white rounded-lg hover:bg-second-color transition"
            >
              Reload from API
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...robots].reverse().map((robot, index) => (
              <motion.div
                key={robot.id || index}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
              >
                <RobotCard
                  robot={robot} 
                  onView={() => handleViewDetails(robot)}
                />
              </motion.div>
            ))}
          </div>
        )}
       
      </section>

      {/* Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && currentProject?.Image && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/80 z-50"
              onClick={() => setIsImageModalOpen(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setIsImageModalOpen(false)}
            >
              <div 
                ref={modalRef}
                className="relative w-full max-w-5xl h-auto max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
                  aria-label="Close modal"
                >
                  <X className="w-8 h-8" />
                </button>

                {/* Lock icon above image */}
                {/* <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                  <Lock className="w-8 h-8 text-white" />
                </div> */}

                {/* Image container */}
                <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={`${UPLOADS_URL}/${currentProject.Image}`}
                    alt={projectName}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                  
                  {/* Project info at bottom */}
                  {/* <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="text-white">
                      <h3 className="text-xl font-bold">{projectName}</h3>
                      {currentProject.Location && (
                        <p className="text-sm text-gray-300">Location: {currentProject.Location}</p>
                      )}
                    </div>
                  </div> */}

                  {/* Click outside hint */}
                  {/* <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full">
                    Click outside to close
                  </div> */}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}