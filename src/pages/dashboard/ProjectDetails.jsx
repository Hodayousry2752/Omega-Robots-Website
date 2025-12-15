import { useEffect, useState } from "react";
import {
  Trash2,
  Edit3,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getData } from "@/services/getServices";
import { deleteData } from "@/services/deleteServices";
import RobotImg from "../../assets/Robot1.jpeg";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import mqtt from "mqtt"; // Import MQTT directly

// ConfirmDeleteModal component (unchanged)
function ConfirmDeleteModal({
  robot = null,
  deleteAll = false,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
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
                  all robots
                </span>
                ? This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-main-color">
                  {robot?.RobotName || "-"}
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
              onClick={onConfirm}
              className="bg-red-500 text-white hover:bg-white hover:text-red-500 border border-red-500 px-6 rounded-xl transition-all cursor-pointer"
            >
              Confirm
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Function to create MQTT client for specific credentials
const createMqttClient = (mqttUrl, mqttUsername, mqttPassword) => {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(`wss://${mqttUrl}:8884/mqtt`, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `clientId-${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 0, // No auto-reconnect for one-time operations
    });

    client.on('connect', () => {
      resolve(client);
    });

    client.on('error', (error) => {
      reject(error);
    });

    // Timeout after 10 seconds
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
        client.end(); // Always close connection after publish
        
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      // Timeout for publish operation
      setTimeout(() => {
        client.end();
        reject(new Error('Publish timeout'));
      }, 5000);
    });
  } catch (error) {
    throw error;
  }
};

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;

  const [project, setProject] = useState(null);
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [robotToDelete, setRobotToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [buttonsWithColors, setButtonsWithColors] = useState([]);
  const [isSettingTime, setIsSettingTime] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Fetch buttons colors
  useEffect(() => {
    const fetchButtons = async () => {
      try {
        const res = await fetch(`${BASE_URL}/buttons`);
        const data = await res.json();
        setButtonsWithColors(data || []);
      } catch (err) {}
    };
    fetchButtons();
  }, [BASE_URL]);

  useEffect(() => {
    const fetchProjectAndRobots = async () => {
      try {
        setLoading(true);

        const projectData = await getData(`${BASE_URL}/projects/${id}`);
        setProject(projectData || {});

        const allRobots = await getData(`${BASE_URL}/robots`);
        if (Array.isArray(allRobots)) {
          const projectRobots = allRobots.filter((robot) => {
            const possibleProjectIds = [
              robot.projectId,
              robot.project_id,
              robot.ProjectId,
              robot.projectID,
              robot.ProjectID,
            ];
            return possibleProjectIds.some(
              (pid) => pid != null && String(pid) === String(id)
            );
          });
          setRobots(projectRobots);
        } else {
          setRobots([]);
        }
      } catch (error) {
        toast.error("Failed to load project details.");
        setProject({});
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndRobots();
  }, [id, BASE_URL]);

  useEffect(() => {
    if (location.state?.shouldRefresh) {
      const refreshData = async () => {
        try {
          const allRobots = await getData(`${BASE_URL}/robots`);
          if (Array.isArray(allRobots)) {
            const projectRobots = allRobots.filter((robot) => {
              const possibleProjectIds = [
                robot.projectId,
                robot.project_id,
                robot.ProjectId,
                robot.projectID,
                robot.ProjectID,
              ];
              return possibleProjectIds.some(
                (pid) => pid != null && String(pid) === String(id)
              );
            });
            setRobots(projectRobots);
          }
        } catch (error) {}
      };

      refreshData();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, id, BASE_URL]);

  const handleDeleteRobot = async (robotId) => {
    try {
      await deleteData(`${BASE_URL}/robots/${robotId}`);
      setRobots((prev) => prev.filter((r) => r.id !== robotId));
      toast.success("Robot deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete robot.");
    } finally {
      setRobotToDelete(null);
    }
  };

  const handleDeleteAllRobots = async () => {
    try {
      for (const robot of robots) {
        await deleteData(`${BASE_URL}/robots/${robot.id}`);
      }
      setRobots([]);
      toast.success("All robots deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete all robots.");
    } finally {
      setShowDeleteAllModal(false);
    }
  };

  const handleSetRobotsTime = async () => {
    if (robots.length === 0) {
      toast.warning("No robots available to set time for");
      return;
    }

    setIsSettingTime(true);

    const now = new Date();
    const dateString = now.toLocaleDateString("en-GB");
    const timeString = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const message = `set_time_${dateString.replace(/\//g, "-")}_${timeString.replace(/:/g, "-")}`;

    let results = {
      mainTopics: 0,
      carTopics: 0,
      errors: 0,
      robotDetails: [],
    };

    try {
      // Process each robot sequentially to avoid too many simultaneous connections
      for (const robot of robots) {
        const robotResult = {
          name: robot.RobotName || "Unnamed Robot",
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
        let successMessage = `🕒 Time set for ${totalSuccess} topic(s) across ${robots.length} robot(s)`;

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

  const getButtonColor = (btnName) => {
    const btnData = buttonsWithColors.find(
      (b) => b.BtnName?.toLowerCase() === btnName.toLowerCase()
    );
    return btnData?.Color || "#4F46E5"; // default
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 mb-4 text-lg">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <div className="text-second-color text-lg">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:px-10 lg:px-14">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          onClick={() => navigate(-1)}
          className="cursor-pointer flex items-center gap-2 bg-main-color text-white border border-main-color hover:bg-white hover:text-main-color transition-colors px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </Button>
      </div>

      {/* Project Card */}
      <Card className="mb-8 shadow-lg rounded-xl border border-gray-200 pt-0">
        <CardHeader className="bg-linear-to-r from-main-color to-second-color text-white rounded-t-xl">
          <CardTitle className="text-2xl font-bold py-2">
            {project.ProjectName || "-"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-600 mb-4 text-lg">
            {project.Description || "-"}
          </p>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="font-semibold">Location:</span>
            <span>{project.Location || "-"}</span>
          </div>

          {project.Image && project.Image !== "Array" ? (
            <img
              src={
                project.Image
                  ? `${UPLOADS_URL}/${project.Image}?t=${Date.now()}`
                  : RobotImg
              }
              alt={project.ProjectName || "-"}
              className="h-64 w-full object-cover rounded-lg mt-4"
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Robots Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Project Robots</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 cursor-pointer bg-main-color text-white border border-main-color hover:bg-white hover:text-main-color px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
          >
            <PlusCircle size={18} /> Add Robot
          </Button>

          {robots.length > 0 && (
            <>
              <Button
                onClick={handleSetRobotsTime}
                disabled={isSettingTime || robots.length === 0}
                className="flex items-center gap-2 cursor-pointer bg-green-600 text-white border border-green-600 hover:bg-white hover:text-green-600 px-4 py-2 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock size={18} />
                {isSettingTime ? "Setting Time..." : `Set Time (${robots.length} robots)`}
              </Button>

              <Button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-2 cursor-pointer bg-second-color text-white border border-second-color hover:bg-white hover:text-second-color px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
              >
                <Trash2 size={18} /> Delete All Robots
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Robots Grid */}
      {robots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...robots].reverse().map((robot) => (
            <Card
              key={robot.id || Math.random()}
              className="overflow-hidden shadow-lg pt-0 hover:shadow-xl transition rounded-xl border border-gray-200"
            >
              {/* Robot Image */}
              <img
                src={
                  robot.Image
                    ? `${UPLOADS_URL}/${robot.Image}?t=${Date.now()}`
                    : RobotImg
                }
                alt={robot.RobotName || "-"}
                className="h-56 w-full object-cover"
              />

              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-xl font-semibold text-gray-800">
                  {robot.RobotName || "-"}
                </CardTitle>

                {/* Robot Stats */}
                <CardDescription className="text-gray-600 mt-1">
                  Voltage: {robot.Sections?.main?.Voltage || "-"}V — Cycles:{" "}
                  {robot.Sections?.main?.Cycles || "-"}
                </CardDescription>
                <div className="text-gray-500 text-sm mt-1">
                  Status:{" "}
                  <span
                    className={`font-semibold ${robot.Sections?.main?.Status === "Running" ? "text-green-600" : "text-second-color"}`}
                  >
                    {robot.Sections?.main?.Status || "-"}
                  </span>
                </div>

                {/* MQTT Topics Info */}
                <div className="text-gray-500 text-sm mt-1 space-y-1">
                  <div className="flex items-start">
                    <span className="min-w-12">Main:</span>
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded break-all">
                      {robot.Sections?.main?.Topic_main || "Not configured"}
                    </span>
                  </div>
                  {robot.isTrolley && (
                    <div className="flex items-start">
                      <span className="min-w-12">Car:</span>
                      <span className="font-mono text-xs bg-gray-100 px-1 rounded break-all">
                        {robot.Sections?.car?.Topic_main || "Not configured"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Trolley Status */}
                <div className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                  <span>Trolley:</span>
                  <span className="font-semibold">
                    {robot.isTrolley ? (
                      <span className="text-green-600 flex items-center gap-1">
                        🟢 Yes
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        🔴 No
                      </span>
                    )}
                  </span>
                </div>
              </CardHeader>

              {/* Robot Actions */}
              <CardContent className="px-4 pb-4 flex gap-2 mt-2">
                <Button
                  variant="outline"
                  className="cursor-pointer p-2 w-10 h-10 flex items-center justify-center rounded-md bg-gray-600 text-white hover:bg-white hover:text-gray-600 transition-colors"
                  onClick={() =>
                    navigate(`/homeDashboard/robotDetails/${robot.id}`)
                  }
                >
                  <ArrowRight size={16} />
                </Button>

                <Button
                  variant="outline"
                  className="cursor-pointer p-2 w-10 h-10 flex items-center justify-center rounded-md bg-main-color text-white hover:bg-white hover:text-main-color transition-colors"
                  onClick={() =>
                    navigate(`/homeDashboard/editRobot/${robot.id}`, {
                      state: {
                        projectId: id,
                        projectName: project.ProjectName || "-",
                      },
                    })
                  }
                >
                  <Edit3 size={16} />
                </Button>

                <Button
                  variant="outline"
                  className="cursor-pointer p-2 w-10 h-10 flex items-center justify-center rounded-md bg-second-color text-white hover:bg-white hover:text-second-color transition-colors"
                  onClick={() => setRobotToDelete(robot)}
                >
                  <Trash2 size={16} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 italic mt-20 text-lg">
          No robots available for this project.
        </div>
      )}

      {/* Confirm Delete Modals */}
      {robotToDelete && (
        <ConfirmDeleteModal
          robot={robotToDelete}
          onConfirm={() => handleDeleteRobot(robotToDelete.id)}
          onCancel={() => setRobotToDelete(null)}
        />
      )}
      {showDeleteAllModal && (
        <ConfirmDeleteModal
          deleteAll={true}
          onConfirm={handleDeleteAllRobots}
          onCancel={() => setShowDeleteAllModal(false)}
        />
      )}

      {/* Add Robot Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Choose Robot Type
              </h2>
              <p className="text-gray-600 mb-6">
                Please select the type of robot you want to add.
              </p>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    navigate(`/homeDashboard/addRobotw/${id}`, {
                      state: {
                        projectId: id,
                        projectName: project.ProjectName || "-",
                        type: "withTrolley",
                      },
                    });
                  }}
                  className="bg-main-color text-white border border-main-color hover:bg-white hover:text-main-color px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Add Robot with Trolley
                </Button>

                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    navigate(`/homeDashboard/addRobotOnly/${id}`, {
                      state: {
                        projectId: id,
                        projectName: project.ProjectName || "-",
                        type: "robotOnly",
                      },
                    });
                  }}
                  className="bg-second-color text-white border border-second-color hover:bg-white hover:text-second-color px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Add Robot Only
                </Button>

                <Button
                  onClick={() => setShowAddModal(false)}
                  className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 px-6 py-3 rounded-xl transition-all"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}