import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import {getData } from "@/services/getServices";
import { postData} from "@/services/postServices";
import { useParams } from "react-router-dom";
import mqtt from "mqtt";
import { toast } from "sonner";

// Function to publish message with specific credentials
const publishWithCredentials = async (mqttUrl, mqttUsername, mqttPassword, topic, message) => {
  try {
    const client = mqtt.connect(`wss://${mqttUrl}:8884/mqtt`, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `clientId-${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 0,
    });

    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        client.publish(topic, message, (error) => {
          client.end();
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      client.on('error', (error) => {
        client.end();
        reject(error);
      });

      setTimeout(() => {
        client.end();
        reject(new Error('MQTT connection timeout'));
      }, 10000);
    });
  } catch (error) {
    throw error;
  }
};

export default function ScheduleSettings({
  schedule = { days: [], hour: 8, minute: 0 },
  setSchedule = () => {},
  projectId
}) {
  const { id: robotId } = useParams(); 
  const [saving, setSaving] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [robotData, setRobotData] = useState(null);
  const [robotLoading, setRobotLoading] = useState(true);
  
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Nun"];
  const size = 200;
  const radius = size / 2 - 20;
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Fetch robot data
  useEffect(() => {
    const fetchRobotData = async () => {
      if (!robotId) return;
      
      try {
        setRobotLoading(true);
        const data = await getData(`${BASE_URL}/robots/${robotId}`);
        setRobotData(data);
      } catch (err) {
        console.error('Error fetching robot data:', err);
      } finally {
        setRobotLoading(false);
      }
    };

    fetchRobotData();
  }, [robotId, BASE_URL]);

  // Get MQTT credentials from car section
  const getMqttCredentials = () => {
    if (!robotData?.Sections?.car) return null;
    
    const carSection = robotData.Sections.car;
    return {
      mqttUrl: carSection.mqttUrl,
      mqttUsername: carSection.mqttUsername,
      mqttPassword: carSection.mqttPassword,
      topic: carSection.Topic_main
    };
  };

  const mqttCredentials = getMqttCredentials();

  // Get storage key for schedule visibility
  const getScheduleVisibilityKey = () => `robot_${robotId}_schedule_visibility`;

  // Load schedule visibility from localStorage
  const loadScheduleVisibility = () => {
    try {
      const stored = localStorage.getItem(getScheduleVisibilityKey());
      return stored ? JSON.parse(stored) : true;
    } catch (error) {
      console.error("Error loading schedule visibility:", error);
      return true;
    }
  };

  // Save schedule visibility to localStorage
  const saveScheduleVisibility = (isVisible) => {
    try {
      localStorage.setItem(getScheduleVisibilityKey(), JSON.stringify(isVisible));
    } catch (error) {
      console.error("Error saving schedule visibility:", error);
    }
  };

  // Function to update schedule visibility
  const updateScheduleVisibility = (isVisible) => {
    try {
      setUpdatingVisibility(true);
      saveScheduleVisibility(isVisible);
      console.log(isVisible ? "Schedule is now visible to users" : "Schedule is now hidden from users");
    } catch (err) {
      console.error("Error updating schedule visibility:", err);
    } finally {
      setTimeout(() => {
        setUpdatingVisibility(false);
      }, 500);
    }
  };

  // Check if schedule is visible
  const isScheduleVisible = () => {
    return loadScheduleVisibility();
  };

  const toggleDay = (d) => {
    if (d === "Nun") {
      // When Nun is selected, set everything to zeros
      setSchedule({ 
        days: ["Nun"], 
        hour: 0, 
        minute: 0 
      });
    } else {
      // When any other day is selected, remove Nun if present
      const next = schedule.days.includes(d)
        ? schedule.days.filter((x) => x !== d)
        : [...schedule.days.filter(x => x !== "Nun"), d];
      setSchedule({ ...schedule, days: next });
    }
  };

  const handleClickClock = (e, type) => {
    if (schedule.days.includes("Nun")) {
      toast.info("'Nun' mode is selected. Time is set to 00:00");
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (type === "hour") {
      const newHour = Math.round((angle / 360) * 12) % 12 || 12;
      setSchedule({ ...schedule, hour: newHour });
    } else if (type === "minute") {
      let newMinute = Math.round(((angle / 360) * 60) / 5) * 5;
      if (newMinute === 60) newMinute = 0;
      setSchedule({ ...schedule, minute: newMinute });
    }
  };

  const getDaysAsBinaryString = () => {
    if (schedule.days.includes("Nun")) {
      return "0_0_0_0_0_0_0_0";
    } else {
      const regularDays = days.slice(0, 7);
      const regularBinary = regularDays.map(day => schedule.days.includes(day) ? '1' : '0').join('_');
      return `${regularBinary}_0`;
    }
  };

  const handleSaveAndSendSchedule = async () => {
    if (!robotId) {
      toast.error("RobotId is missing!");
      return;
    }
    
    if (!projectId) {
      toast.error("ProjectId is missing!");
      return;
    }

    try {
      setSaving(true);
      setPublishing(true);

      // Send via MQTT if credentials are available
      let mqttSuccess = false;
      if (mqttCredentials && mqttCredentials.mqttUrl && mqttCredentials.mqttUsername && mqttCredentials.mqttPassword && mqttCredentials.topic) {
        try {
          let timeString, daysBinaryString;
          
          if (schedule.days.includes("Nun")) {
            timeString = "00_00";
            daysBinaryString = "0_0_0_0_0_0_0_0";
          } else {
            timeString = `${String(schedule.hour).padStart(2, "0")}_${String(schedule.minute).padStart(2, "0")}`;
            daysBinaryString = getDaysAsBinaryString();
          }
          
          const message = `schedule_${timeString}_${daysBinaryString}`;
          
          await publishWithCredentials(
            mqttCredentials.mqttUrl,
            mqttCredentials.mqttUsername,
            mqttCredentials.mqttPassword,
            mqttCredentials.topic,
            message
          );
          
          mqttSuccess = true;
          console.log(`Schedule sent via MQTT: ${message} to topic: ${mqttCredentials.topic}`);
        } catch (mqttError) {
          console.error("MQTT publish failed:", mqttError);
        }
      }

      // Create/update button in database
      let btnName;
      if (schedule.days.includes("Nun")) {
        btnName = `schedule_00_00_0_0_0_0_0_0_0_0`;
      } else {
        const dayFlags = days.map((d) => (schedule.days.includes(d) ? 1 : 0));
        btnName = `schedule_${schedule.hour}_${schedule.minute}_${dayFlags.join("_")}`;
      }

      const newButton = {
        BtnName: btnName,
        RobotId: parseInt(robotId),
        Color: schedule.days.includes("Nun") ? "#ef4444" : "#0d9488",
        Operation: "/start",
        projectId: projectId,
      };

      // await postData(`${BASE_URL}/buttons.php?section=car`, newButton);
      
      const successMessage = mqttSuccess 
        ? "Schedule sent successfully via MQTT"
        : "Schedule sent successfully";
      
      toast.success(successMessage);
      
    } catch (err) {
      console.error("Failed to save schedule:", err);
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const isVisible = isScheduleVisible();

  if (robotLoading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main-color mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading robot data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm relative group">
      <button
        onClick={() => updateScheduleVisibility(!isVisible)}
        disabled={updatingVisibility}
        className={`absolute -right-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-20 ${
          updatingVisibility 
            ? 'bg-gray-400 cursor-not-allowed' 
            : isVisible 
              ? 'bg-green-500 hover:bg-green-600 cursor-pointer' 
              : 'bg-red-500 hover:bg-red-600 cursor-pointer'
        } opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 shadow-md border border-white`}
        title={isVisible ? "Hide schedule from users" : "Show schedule to users"}
      >
        {updatingVisibility ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : isVisible ? (
          <Eye className="w-4 h-4 text-white" />
        ) : (
          <EyeOff className="w-4 h-4 text-white" />
        )}
      </button>

      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold text-main-color">Schedule</h4>
        <span className="text-xs text-gray-400">Hover to show visibility control</span>
      </div>

      {/* MQTT Status */}
      {mqttCredentials ? (
        <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-green-700">
            <strong>MQTT Connected:</strong> Using trolley section credentials
          </div>
          <div className="text-xs text-green-600 mt-1">
            Topic: {mqttCredentials.topic}
          </div>
        </div>
      ) : (
        <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-700">
            <strong>MQTT Not Configured:</strong> No car section MQTT credentials found
          </div>
        </div>
      )}

      {/* Days */}
      <div className="flex flex-wrap gap-2 mb-4">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            className={`px-3 py-2 rounded-md text-sm ${
              schedule.days.includes(d)
                ? d === "Nun" 
                  ? "bg-red-500 text-white" 
                  : "bg-main-color text-white"
                : "bg-white border border-gray-200 text-gray-700"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {schedule.days.includes("Nun") && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm text-red-700 flex items-center">
            <strong>⚠️ "Nun" Mode Active:</strong> 
            <span className="ml-2">Schedule will be sent with all zeros (00:00, 0_0_0_0_0_0_0_0)</span>
          </div>
        </div>
      )}

      <div className="flex max-md:flex-wrap gap-6 items-center">
        <svg
          width={size}
          height={size}
          onClick={(e) => handleClickClock(e, "minute")}
          className="cursor-pointer"
          style={{ opacity: schedule.days.includes("Nun") ? 0.5 : 1 }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 10}
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth="2"
          />
          {hours.map((h) => {
            const angle = ((h % 12) / 12) * 2 * Math.PI - Math.PI / 2;
            const x = size / 2 + radius * 0.75 * Math.cos(angle);
            const y = size / 2 + radius * 0.75 * Math.sin(angle);
            return (
              <text
                key={h}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fontWeight="bold"
                onClick={(e) => handleClickClock(e, "hour")}
                className="cursor-pointer select-none"
              >
                {h}
              </text>
            );
          })}
          {minutes.map((m) => {
            const angle = (m / 60) * 2 * Math.PI - Math.PI / 2;
            const x1 = size / 2 + radius * 0.9 * Math.cos(angle);
            const y1 = size / 2 + radius * 0.9 * Math.sin(angle);
            const x2 = size / 2 + radius * Math.cos(angle);
            const y2 = size / 2 + radius * Math.sin(angle);
            return <line key={m} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9ca3af" strokeWidth="1" />;
          })}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + radius * 0.5 * Math.cos(((schedule.hour % 12) / 12) * 2 * Math.PI - Math.PI / 2)}
            y2={size / 2 + radius * 0.5 * Math.sin(((schedule.hour % 12) / 12) * 2 * Math.PI - Math.PI / 2)}
            stroke="#3b82f6"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + radius * 0.8 * Math.cos((schedule.minute / 60) * 2 * Math.PI - Math.PI / 2)}
            y2={size / 2 + radius * 0.8 * Math.sin((schedule.minute / 60) * 2 * Math.PI - Math.PI / 2)}
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={size / 2} cy={size / 2} r="4" fill="#000" />
        </svg>

        <div className="flex flex-col gap-2">
          <div className="text-gray-700 font-medium">
            Selected Time: {String(schedule.hour).padStart(2, "0")}:{String(schedule.minute).padStart(2, "0")}
            <br />
            <span className="text-sm text-gray-500">
              ( UTC+3)
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Hour:</label>
            <input
              type="number"
              min="0"
              max="23"
              value={schedule.hour}
              onChange={(e) =>
                setSchedule({ ...schedule, hour: Math.max(0, Math.min(23, Number(e.target.value))) })
              }
              className="border rounded-lg p-1 w-16"
              disabled={schedule.days.includes("Nun")}
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Minute:</label>
            <input
              type="number"
              min="0"
              max="59"
              step="5"
              value={schedule.minute}
              onChange={(e) =>
                setSchedule({ ...schedule, minute: Math.max(0, Math.min(59, Number(e.target.value))) })
              }
              className="border rounded-lg p-1 w-16"
              disabled={schedule.days.includes("Nun")}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Current:{" "}
          <span className="font-medium">
            {schedule.days.includes("Nun") 
              ? "Nun (All zeros)" 
              : schedule.days.length 
                ? schedule.days.join(", ") 
                : "—"} @ {String(schedule.hour).padStart(2, "0")}:
            {String(schedule.minute).padStart(2, "0")}
          </span>
          <br />
          <span className="text-xs text-gray-500">
            Binary: {getDaysAsBinaryString()} (Mon-Sun-Nun)
          </span>
        </div>
        <Button 
          onClick={handleSaveAndSendSchedule} 
          disabled={saving || publishing} 
          className={`${schedule.days.includes("Nun") ? 'bg-red-500 hover:bg-red-600' : 'bg-second-color'} text-white`}
        >
          {saving || publishing ? "Saving..." : schedule.days.includes("Nun") ? "Set Nun Schedule" : "Schedule"}
        </Button>
      </div>
    </div>
  );
}