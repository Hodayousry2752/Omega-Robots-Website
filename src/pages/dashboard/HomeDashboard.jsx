import { useState, useEffect } from "react";
import { Trash2, MapPin, ArrowRight, Edit3, XCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getData } from "@/services/getServices";
import { deleteData } from "@/services/deleteServices";
import { toast } from "sonner";
import mqtt from "mqtt";

// Function to create MQTT client for specific credentials
const createMqttClient = (mqttUrl, mqttUsername, mqttPassword) => {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(`wss://${mqttUrl}:8884/mqtt`, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `clientId-${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 0,
    });

    client.on('connect', () => {
      resolve(client);
    });

    client.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      reject(new Error('MQTT connection timeout'));
      client.end();
    }, 10000);
  });
};

// Function to publish message with specific credentials
const publishWithCredentials = async (mqttUrl, mqttUsername, mqttPassword, topic, message) => {
  try {
    const client = await createMqttClient(mqttUrl, mqttUsername, mqttPassword);
    
    return new Promise((resolve, reject) => {
      client.publish(topic, message, (error) => {
        client.end();
        
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      setTimeout(() => {
        client.end();
        reject(new Error('Publish timeout'));
      }, 5000);
    });
  } catch (error) {
    throw error;
  }
};

// Function to format time for MQTT
const formatTimeForMQTT = () => {
  const now = new Date();
  const pad = (num) => num.toString().padStart(2, '0');
  
  const year = now.getFullYear();
  const weekday = now.getDay(); // 0-6 (Sunday=0, Monday=1, etc.)
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());
  
  return `set_time_${year}_${weekday}_${month}_${day}_${hour}_${minute}_${second}`;
};

// Confirm Delete Modal
function ConfirmDeleteModal({
  project,
  onConfirm,
  onCancel,
  deleteAll = false,
}) {
  return (
    <AnimatePresence>
      {(project || deleteAll) && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl p-8 w-[90%] max-w-md text-center border border-gray-200"
          >
            <XCircle
              size={48}
              className="mx-auto text-red-500 mb-4 animate-pulse"
            />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Confirm Delete
            </h2>
            <p className="text-gray-600 mb-6">
              {deleteAll ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-main-color">
                    all projects
                  </span>
                  ? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-main-color">
                    {project?.ProjectName || "this project"}
                  </span>
                  ? This action cannot be undone.
                </>
              )}
            </p>

            <div className="flex justify-center gap-4">
              <Button
                onClick={onCancel}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-6 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onConfirm(deleteAll ? null : project?.projectId)}
                className="bg-red-500 text-white hover:bg-white hover:text-red-500 border border-red-500 px-6 rounded-xl transition-all cursor-pointer"
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main Component
export default function HomeDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allRobots, setAllRobots] = useState([]);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [isSettingTime, setIsSettingTime] = useState(false);

  // Fetch projects and all robots
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, robotsData] = await Promise.all([
          getData(`${BASE_URL}/projects`),
          getData(`${BASE_URL}/robots`)
        ]);
        
        setProjects(projectsData || []);
        setAllRobots(robotsData || []);
      } catch (error) {
        toast.error("Failed to load projects");
      }
    };
    fetchData();
  }, []);

  // Function to set time for ALL robots across ALL projects
  const handleSetAllRobotsTime = async () => {
    if (allRobots.length === 0) {
      toast.warning("No robots available to set time for");
      return;
    }

    setIsSettingTime(true);
    
    // Use the correct time format
    const message = formatTimeForMQTT();
    
    let results = {
      mainTopics: 0,
      carTopics: 0,
      errors: 0,
      robotDetails: [],
    };

    try {
      // Process each robot sequentially
      for (const robot of allRobots) {
        const robotResult = {
          name: robot.RobotName || "Unnamed Robot",
          project: robot.projectId || robot.project_id || "Unknown",
          main: { sent: false, topic: null, error: null },
          car: { sent: false, topic: null, error: null },
        };

        // Process main section
        const mainSection = robot.Sections?.main;
        if (mainSection?.Topic_main && mainSection.mqttUrl && mainSection.mqttUsername && mainSection.mqttPassword) {
          try {
            await publishWithCredentials(
              mainSection.mqttUrl,
              mainSection.mqttUsername,
              mainSection.mqttPassword,
              mainSection.Topic_main,
              message
            );
            robotResult.main = { 
              sent: true, 
              topic: mainSection.Topic_main,
              url: mainSection.mqttUrl
            };
            results.mainTopics++;
          } catch (error) {
            robotResult.main.error = error.message;
            results.errors++;
          }
        } else {
          robotResult.main.error = "Missing MQTT configuration";
          if (mainSection?.Topic_main) results.errors++;
        }

        // Process car section if robot is trolley
        if (robot.isTrolley) {
          const carSection = robot.Sections?.car;
          if (carSection?.Topic_main && carSection.mqttUrl && carSection.mqttUsername && carSection.mqttPassword) {
            try {
              await publishWithCredentials(
                carSection.mqttUrl,
                carSection.mqttUsername,
                carSection.mqttPassword,
                carSection.Topic_main,
                message
              );
              robotResult.car = { 
                sent: true, 
                topic: carSection.Topic_main,
                url: carSection.mqttUrl
              };
              results.carTopics++;
            } catch (error) {
              robotResult.car.error = error.message;
              results.errors++;
            }
          } else {
            robotResult.car.error = "Missing MQTT configuration";
            if (carSection?.Topic_main) results.errors++;
          }
        }

        results.robotDetails.push(robotResult);
      }

      const totalSuccess = results.mainTopics + results.carTopics;

      if (totalSuccess > 0) {
        let successMessage = `🕒 Time set for ${totalSuccess} topic(s) across ${allRobots.length} robot(s) in ${projects.length} project(s)`;

        if (results.mainTopics > 0 || results.carTopics > 0) {
          successMessage += ` - Main: ${results.mainTopics}, Car: ${results.carTopics}`;
        }

        toast.success(successMessage);
      }

      if (results.errors > 0) {
        toast.warning(`Failed to set time for ${results.errors} topic(s)`);
      }

      if (totalSuccess === 0 && results.errors > 0) {
        toast.error("Failed to set time for any robot topics");
      }
    } catch (err) {
      toast.error("Failed to set time for robots.");
    } finally {
      setIsSettingTime(false);
    }
  };

  // DELETE ALL projects
  const handleDeleteAll = async () => {
    try {
      const response = await deleteData(`${BASE_URL}/projects`);
      if (response?.success || response?.message?.includes("successfully")) {
        toast.success("All projects deleted successfully!");
        setProjects([]);
        setAllRobots([]);
      } else {
        toast.error(response?.message || "Failed to delete all projects.");
      }
    } catch (error) {
      toast.error("Error deleting all projects. Please try again.");
    } finally {
      setDeleteAll(false);
    }
  };

  // DELETE single project
  const handleDeleteSingleProject = async (id) => {
    try {
      const response = await deleteData(`${BASE_URL}/projects/${id}`);
      if (response?.success || response?.message?.includes("deleted")) {
        toast.success("Project deleted successfully!");
        setProjects((prev) => prev.filter((p) => p.projectId !== id));
        // Also remove robots belonging to this project
        setAllRobots((prev) => prev.filter((r) => {
          const possibleProjectIds = [
            r.projectId,
            r.project_id,
            r.ProjectId,
            r.projectID,
            r.ProjectID,
          ];
          return !possibleProjectIds.some(pid => pid != null && String(pid) === String(id));
        }));
      } else {
        toast.error(response?.message || "Failed to delete project.");
      }
    } catch (error) {
      toast.error("Error deleting project. Please try again.");
    } finally {
      setProjectToDelete(null);
    }
  };

  return (
    <div className="p-6 md:px-10 lg:px-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <h1 className="text-3xl font-bold text-gray-800">All Projects</h1>

        {projects.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleSetAllRobotsTime}
              disabled={isSettingTime || allRobots.length === 0}
              className="flex items-center gap-2 cursor-pointer bg-green-600 text-white border border-green-600 hover:bg-white hover:text-green-600 px-4 py-2 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock size={18} />
              {isSettingTime 
                ? "Setting Time..." 
                : `Set Time (${allRobots.length} robots)`}
            </Button>

            <Button
              className="flex items-center justify-center gap-2 cursor-pointer
                         bg-second-color text-white border border-second-color 
                         hover:bg-white hover:text-second-color transition-colors
                         px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
              onClick={() => setDeleteAll(true)}
            >
              <Trash2 size={18} />
              <span>Delete All</span>
            </Button>
          </div>
        )}
      </div>

      {/* Cards */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const imageUrl = project.Image
              ? `${import.meta.env.VITE_UPLOADS_URL}/${project.Image.replace(/^uploads\//, "")}`
              : `${import.meta.env.VITE_UPLOADS_URL}/default.png`;
              
            // Count robots for this project
            const projectRobotsCount = allRobots.filter((robot) => {
              const possibleProjectIds = [
                robot.projectId,
                robot.project_id,
                robot.ProjectId,
                robot.projectID,
                robot.ProjectID,
              ];
              return possibleProjectIds.some(
                (pid) => pid != null && String(pid) === String(project.projectId)
              );
            }).length;
            
            return (
              <Card
                key={project.projectId}
                className="overflow-hidden shadow-lg pt-0 hover:shadow-xl transition rounded-xl border border-gray-200"
              >
                <img
                  src={imageUrl}
                  alt={project.ProjectName || "Project Image"}
                  className="h-56 w-full object-cover"
                />

                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    {project.ProjectName || "Untitled Project"}
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    {project.Description || "No description available."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <MapPin size={16} className="text-main-color" />
                    <span>{project.Location || "Unknown Location"}</span>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-3">
                    <span className="font-medium">Robots:</span> {projectRobotsCount}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button
                      className="p-2 w-10 h-10 flex items-center cursor-pointer justify-center rounded-md bg-gray-600 text-white hover:bg-white hover:text-gray-600 hover:border-gray-600 transition-colors"
                      onClick={() =>
                        navigate(`projectDetails/${project.projectId}`)
                      }
                    >
                      <ArrowRight size={16} />
                    </Button>

                    <Button
                      className="p-2 w-10 h-10 flex items-center cursor-pointer justify-center rounded-md bg-main-color text-white hover:bg-white hover:text-main-color hover:border-main-color transition-colors"
                      onClick={() =>
                        navigate(`projectForm/${project.projectId}`)
                      }
                    >
                      <Edit3 size={16} />
                    </Button>

                    <Button
                      className="p-2 w-10 h-10 flex items-center cursor-pointer justify-center rounded-md bg-second-color text-white hover:bg-white hover:text-second-color hover:border-second-color transition-colors"
                      onClick={() => setProjectToDelete(project)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-500 italic mt-20 text-lg">
          No projects available.
        </div>
      )}

      {/* Confirm delete modals */}
      <ConfirmDeleteModal
        project={projectToDelete}
        onConfirm={handleDeleteSingleProject}
        onCancel={() => setProjectToDelete(null)}
      />

      <ConfirmDeleteModal
        deleteAll={deleteAll}
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAll(false)}
      />
    </div>
  );
}