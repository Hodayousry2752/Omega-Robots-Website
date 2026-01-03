import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import TabsHeader from "@/components/robots/TabsHeader";
import NotificationsTab from "@/components/robots/NotificationsTab";
import LogsTab from "@/components/robots/LogsTab";
import ScheduleSettings from "@/components/robots/ScheduleSettings";
import RobotMainPanelView from "@/components/robots/RobotPanelDetails";
import TrolleyPanelDetails from "@/components/robots/TrolleyPanelDetails";
import { toast } from "sonner";
import Loading from "@/pages/Loading";
import { getData } from "@/services/getServices";
import { useMqtt } from "@/context/MqttContext"; 

const ALL_BUTTONS = ["Forward", "Backward", "Stop", "Left", "Right"];

export default function RobotDetailsFull() {
  const { id } = useParams();
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;
  const [robot, setRobot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trolleyTab, setTrolleyTab] = useState("control");
  const [robotTab, setRobotTab] = useState("control");
  
  const { publishMessage, getConnectionStatus, activeConnections } = useMqtt();

  // Schedule state
  const [schedule, setSchedule] = useState({ days: [], hour: 8, minute: 0 });

  const fetchRobot = async () => {
    try {
      const data = await getData(`${BASE_URL}/robots.php/${id}`);
      setRobot(data || {});
      
      // Load schedule from robot data if available
      if (data?.schedule) {
        setSchedule(data.schedule);
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (id) {
        fetchRobot();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const loadRobot = async () => {
      try {
        setLoading(true);
        await fetchRobot();
      } catch (err) {
        toast.error("Failed to load robot data");
        setRobot({});
      } finally {
        setLoading(false);
      }
    };

    loadRobot();
  }, [id]);

  const robotConnectionStatus = getConnectionStatus(id, "main");
  const trolleyConnectionStatus = getConnectionStatus(id, "car");

  const handleRobotButtonClick = (btnName) => {
    const robotSection = robot?.Sections?.main;
    const topic = robotSection?.Topic_main;

    if (!topic) {
      toast.error("No topic configured for robot");
      return;
    }

    if (robotConnectionStatus !== 'connected') {
      toast.error("Robot MQTT not connected");
      return;
    }

    
    const success = publishMessage(id, "main", topic, btnName);
    if (success) {
      toast.success(`Robot: ${btnName}`);
    } else {
      toast.error("Cannot publish to robot");
    }
  };

  const handleTrolleyButtonClick = (btnName) => {
    const trolleySection = robot?.Sections?.car;
    const topic = trolleySection?.Topic_main;

    if (!topic) {
      toast.error("No topic configured for trolley");
      return;
    }

    if (trolleyConnectionStatus !== 'connected') {
      toast.error("Trolley MQTT not connected");
      return;
    }

    
    const success = publishMessage(id, "car", topic, btnName);
    if (success) {
      toast.success(`Trolley: ${btnName}`);
    } else {
      toast.error("Cannot publish to trolley");
    }
  };

  // Function to handle schedule updates
  const handleScheduleUpdate = (newSchedule) => {
    setSchedule(newSchedule);
    // Update robot state as well to keep consistency
    setRobot(prevRobot => ({
      ...prevRobot,
      schedule: newSchedule
    }));
  };

  if (loading) {
    return <Loading />;
  }

  if (!robot) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Robot not found.
      </div>
    );
  }

  const showTrolley = robot?.isTrolley == 1 || robot?.isTrolley === "true" || robot?.isTrolley === true;
  const hasRobotMqtt = robot.Sections?.main?.mqttUrl;
  const hasTrolleyMqtt = robot.Sections?.car?.mqttUrl;

  // Determine which section to use for schedule
  const scheduleSection = showTrolley && hasTrolleyMqtt ? "car" : "main";
  const scheduleMqttUrl = showTrolley && hasTrolleyMqtt 
    ? robot.Sections.car.mqttUrl 
    : robot.Sections.main.mqttUrl;

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 sm:p-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
          <div className="flex items-center gap-5 max-md:flex-col">
            <img
              src={
                robot?.Image && robot.Image !== "Array"
                  ? `${UPLOADS_URL}/${robot.Image}?t=${Date.now()}`
                  : "/assets/placeholder-robot.jpg"
              }
              alt="Robot"
              className="h-40 w-40 object-cover rounded-xl border shadow-md"
            />
            <div>
              <h1 className="text-3xl font-bold text-main-color">
                {robot.RobotName || "Robot Details"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Project ID: <span className="font-mono">{robot.projectId || "-"}</span>
              </p>
              
              {/* Connection Status */}
              <div className="flex flex-col gap-1 text-sm mt-2 text-xs">
                <div className="flex items-center gap-2 ">
                  <div className={`w-2 h-2 rounded-full  ${
                    robotConnectionStatus === 'connected' ? "bg-green-500" : 
                    robotConnectionStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <span className={
                    robotConnectionStatus === 'connected' ? "text-green-700 text-xs" : 
                    robotConnectionStatus === 'connecting' ? "text-yellow-700 text-xs" : "text-red-700"
                  }>
                    Robot:{robotConnectionStatus}
                    {hasRobotMqtt && ` (${robot.Sections.main.mqttUrl})`}
                  </span>
                </div>
                {showTrolley && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      trolleyConnectionStatus === 'connected' ? "bg-green-500" : 
                      trolleyConnectionStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                    <span className={
                      trolleyConnectionStatus === 'connected' ? "text-green-700 text-xs" : 
                      trolleyConnectionStatus === 'connecting' ? "text-yellow-700 text-xs" : "text-red-700"
                    }>
                      Trolley:{trolleyConnectionStatus}
                      {hasTrolleyMqtt && ` (${robot.Sections.car.mqttUrl})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button onClick={() => navigate(-1)} className="bg-white border text-main-color max-md:block max-md:flex-1">
            Back
          </Button>
        </div>

        {/* Trolley Section */}
        {showTrolley && hasTrolleyMqtt && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-4 max-md:flex-col">
              <div>
                <h2 className="text-xl font-semibold text-main-color">Trolley Control</h2>
                <p className="text-sm text-gray-500 mt-1">Trolley controls using contextMqtt</p>
                <p className="text-xs text-blue-600 mt-1">Broker: {robot.Sections.car.mqttUrl}</p>
              </div>
              <Button
                onClick={() => navigate(`/homeDashboard/trolleySettings/${robot.id}`)}
                className="bg-main-color text-white h-10 self-start"
              >
                Settings
              </Button>
            </div>

            <TabsHeader
              tabs={[
                { id: "control", label: "Control" },
                { id: "notifications", label: "Notifications and alerts" },
                { id: "logs", label: "Logs" },
              ]}
              active={trolleyTab}
              onChange={setTrolleyTab}
              accent="main"
            />

            <div className="mt-5 space-y-6">
              {trolleyTab === "control" && (
                <TrolleyPanelDetails
                  robotId={id}
                  imgSrc="/assets/placeholder-trolley.jpg"
                  trolleyData={robot}
                  publish={handleTrolleyButtonClick}
                  isConnected={trolleyConnectionStatus === 'connected'}
                />
              )}
              {trolleyTab === "notifications" && (
                <NotificationsTab
                  projectId={robot.projectId}
                  robotId={robot.id}
                  sectionName="car"
                />
              )}
              {trolleyTab === "logs" && (
                <LogsTab
                  projectId={robot.projectId}
                  robotId={robot.id}
                  sectionName="car"
                />
              )}
            </div>
          </section>
        )}

        {/* SCHEDULE SETTINGS SECTION - Different positioning based on trolley */}
        
        {/* For trolley robots: schedule appears between trolley and robot sections */}
        {showTrolley && hasTrolleyMqtt && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-main-color">
                  Schedule Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure robot and trolley schedule
                </p>
                {scheduleMqttUrl && (
                  <p className="text-xs text-blue-600 mt-1">
                    Using Trolley MQTT Broker: {scheduleMqttUrl}
                  </p>
                )}
              </div>
            </div>

            <ScheduleSettings
              schedule={schedule}
              setSchedule={handleScheduleUpdate}
              projectId={robot.projectId}
              section={scheduleSection}
              robotData={robot}
            />
          </section>
        )}

        {/* Robot Section */}
        {hasRobotMqtt && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-4 max-md:flex-col">
              <div>
                <h2 className="text-xl font-semibold text-main-color">Robot Control</h2>
                <p className="text-sm text-gray-500 mt-1">Robot controls using contextMqtt</p>
                <p className="text-xs text-blue-600 mt-1">Broker: {robot.Sections.main.mqttUrl}</p>
              </div>
              <Button
                onClick={() => navigate(`/homeDashboard/robotSettings/${robot.id}`)}
                className="bg-main-color text-white h-10 self-start"
              >
                Settings
              </Button>
            </div>

            <TabsHeader
              tabs={[
                { id: "control", label: "Control" },
                { id: "notifications", label: "Notifications and alerts" },
                { id: "logs", label: "Logs" },
              ]}
              active={robotTab}
              onChange={setRobotTab}
              accent="main"
            />

            <div className="mt-5 space-y-6">
              {robotTab === "control" && (
                <RobotMainPanelView
                  robot={robot}
                  setRobot={setRobot}
                  allButtons={ALL_BUTTONS}
                  publish={handleRobotButtonClick}
                  isConnected={robotConnectionStatus === 'connected'}
                />
              )}
              {robotTab === "notifications" && (
                <NotificationsTab
                  projectId={robot.projectId}
                  robotId={robot.id}
                  sectionName="main"
                />
              )}
              {robotTab === "logs" && (
                <LogsTab
                  projectId={robot.projectId}
                  robotId={robot.id}
                  sectionName="main"
                />
              )}
            </div>
          </section>
        )}

        {/* For non-trolley robots: schedule appears AFTER robot section */}
        {!showTrolley && hasRobotMqtt && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-main-color">
                  Schedule Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Configure robot schedule
                </p>
                {scheduleMqttUrl && (
                  <p className="text-xs text-blue-600 mt-1">
                    Using Robot MQTT Broker: {scheduleMqttUrl}
                  </p>
                )}
              </div>
            </div>

            <ScheduleSettings
              schedule={schedule}
              setSchedule={handleScheduleUpdate}
              projectId={robot.projectId}
              section={scheduleSection}
              robotData={robot}
            />
          </section>
        )}

        {/* Error Messages */}
        {!hasRobotMqtt && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-yellow-800">No Robot MQTT Configuration</h3>
            <p className="text-yellow-600 mt-1">Please check robot MQTT settings</p>
          </div>
        )}

        {showTrolley && !hasTrolleyMqtt && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-orange-800">No Trolley MQTT Configuration</h3>
            <p className="text-orange-600 mt-1">Trolley exists but MQTT is not configured</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}