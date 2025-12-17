import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, RefreshCcw, ArrowLeft, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { getData } from "@/services/getServices";
import { toast } from "sonner";
import axios from "axios";
import TabsHeader from "@/components/robots/TabsHeader";
import UserNotificationsTab from "@/components/robots/UserNotificationsTab";
import UserLogsTab from "@/components/robots/UserLogsTab";
import { useMqtt } from "@/context/MqttContext";
import ScheduleDisplay from "@/components/robots/ScheduleDisplay";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;

const getRobotImageSrc = (image) => {
  if (!image || image === "" || image === "Array" || image === "null") return "/default-robot.jpg";
  if (image.startsWith('http')) return image;
  return `${UPLOADS_URL}/${image}`;
};

function LazyImage({ src, alt, className, fallbackSrc }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
  };

  return <img src={currentSrc} alt={alt} className={className} onError={handleError} loading="lazy" />;
}

const loadButtonVisibility = (robotId, section) => {
  try {
    const storageKey = section === 'main' 
      ? `robot_${robotId}_button_visibility`
      : `robot_${robotId}_trolley_button_visibility`;
    
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error loading button visibility:", error);
    return {};
  }
};

const loadValueVisibility = (robotId, section) => {
  try {
    const storageKey = section === 'main' 
      ? `robot_${robotId}_value_visibility`
      : `robot_${robotId}_trolley_value_visibility`;
    
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error loading value visibility:", error);
    return {};
  }
};

const saveTimerEndTime = (robotId, endTime) => {
  try {
    const storageKey = `robot_${robotId}_timer_end`;
    localStorage.setItem(storageKey, endTime.toString());
  } catch (error) {
    console.error("Error saving timer end time:", error);
  }
};

const loadTimerEndTime = (robotId) => {
  try {
    const storageKey = `robot_${robotId}_timer_end`;
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : null;
  } catch (error) {
    console.error("Error loading timer end time:", error);
    return null;
  }
};

const loadRobotLockState = (robotId) => {
  try {
    const storageKey = `robot_${robotId}_main_locked`;
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : { locked: true, unlockedAt: null };
  } catch (error) {
    console.error("Error loading robot lock state:", error);
    return { locked: true, unlockedAt: null };
  }
};

const saveRobotLockState = (robotId, state) => {
  try {
    const storageKey = `robot_${robotId}_main_locked`;
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving robot lock state:", error);
  }
};

export default function RobotDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userName } = useAuth();
  
  const [robot, setRobot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buttonColors, setButtonColors] = useState({});
  const [activeTab, setActiveTab] = useState("controls");
  const [activeTrolleyTab, setActiveTrolleyTab] = useState("controls");
  const [isResetting, setIsResetting] = useState(false);
  const [buttonsWithColors, setButtonsWithColors] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  
  const [robotSectionLocked, setRobotSectionLocked] = useState(true);
  const [robotPasswordInput, setRobotPasswordInput] = useState("");
  const [robotPasswordLoading, setRobotPasswordLoading] = useState(false);
  const [userRobotPassword, setUserRobotPassword] = useState(null);
  const [passwordError, setPasswordError] = useState(false);
  const [userPasswordLoading, setUserPasswordLoading] = useState(true);
  
  const [showPassword, setShowPassword] = useState(false);
  
  const [displayTime, setDisplayTime] = useState("24:00:00");
  const timerRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { publishButtonMessage, getConnectionStatus } = useMqtt();
  const [scheduleButton, setScheduleButton] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const isControlsTab = (tab) => tab === "controls";
  
  const shouldShowTrolleySection = () => {
    return isControlsTab(activeTrolleyTab) && isControlsTab(activeTab);
  };

  const shouldShowScheduleSection = () => {
    const hasTrolley = robot?.isTrolley == 1 || robot?.isTrolley === "true" || robot?.isTrolley === true;
    return isControlsTab(activeTab) && isControlsTab(activeTrolleyTab) && hasTrolley;
  };

  const shouldShowRobotSection = () => {
    return isControlsTab(activeTab) && isControlsTab(activeTrolleyTab);
  };

  const isInNonControlsView = () => {
    return !isControlsTab(activeTab) || !isControlsTab(activeTrolleyTab);
  };

  const getActiveNonControlsSection = () => {
    if (!isControlsTab(activeTab)) return "robot";
    if (!isControlsTab(activeTrolleyTab)) return "trolley";
    return null;
  };

  const fetchUserRobotPassword = useCallback(async () => {
    if (!userName) {
      console.log("❌ No userName available, skipping robot password fetch");
      return;
    }
    
    try {
      setUserPasswordLoading(true);
      console.log("🔐 Fetching robot password for user:", userName);
      
      const users = await getData(`${BASE_URL}/users.php`);
      console.log("📋 All users:", users);
      
      const currentUser = users.find(user => 
        user.Username && user.Username.trim().toLowerCase() === userName.trim().toLowerCase()
      );
      
      console.log("👤 Current user found:", currentUser);
      
      if (currentUser) {
        const password = currentUser.mainrobot_password;
        setUserRobotPassword(password);
        console.log("✅ Robot password loaded for user:", userName, password ? `Has password: ${password}` : "No password");
        
        if (!password || password.trim() === "") {
          console.log("🔓 Auto-unlocking robot section (no password required)");
          setRobotSectionLocked(false);
          saveRobotLockState(id, { locked: false, unlockedAt: Date.now() });
        }
      } else {
        console.warn("❌ Current user not found in users list");
        console.log("Available usernames:", users.map(u => u.Username));
      }
    } catch (error) {
      console.error("❌ Failed to fetch user robot password:", error);
    } finally {
      setUserPasswordLoading(false);
    }
  }, [userName, BASE_URL, id]);

  useEffect(() => {
    const lockState = loadRobotLockState(id);
    console.log("🔒 Loaded lock state for robot:", id, lockState);
    
    if (lockState.locked === false && lockState.unlockedAt) {
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const timeSinceUnlock = Date.now() - lockState.unlockedAt;
      
      if (timeSinceUnlock < twentyFourHours) {
        setRobotSectionLocked(false);
        console.log("🔓 Robot section already unlocked (within 24h)");
      } else {
        console.log("⏰ Lock expired, re-locking robot section");
        setRobotSectionLocked(true);
        saveRobotLockState(id, { locked: true, unlockedAt: null });
      }
    }
  }, [id]);

  const publishStatusMessages = useCallback(() => {
    console.log("🔄 Publishing status messages via MQTT Context");
    
    let statusSent = false;
    
    const robotSection = robot?.Sections?.main;
    if (robotSection?.Topic_main) {
      console.log("🤖 Sending status to robot section:", robotSection.Topic_main);
      const success = publishButtonMessage(id, "main", robotSection.Topic_main, "status");
      if (success) {
        statusSent = true;
      } else {
        console.log("❌ Failed to send status to robot");
      }
    } else {
      console.log("❌ Robot MQTT topic not available for status message");
    }
    
    const trolleySection = robot?.Sections?.car;
    if (trolleySection?.Topic_main) {
      console.log("🚗 Sending status to trolley section:", trolleySection.Topic_main);
      const success = publishButtonMessage(id, "car", trolleySection.Topic_main, "status");
      if (success) {
        statusSent = true;
      } else {
        console.log("❌ Failed to send status to trolley");
      }
    } else {
      console.log("❌ Trolley MQTT topic not available for status message");
    }
    
    if (statusSent) {
      toast.success("Status requests sent");
    } else {
      toast.error("No MQTT topics configured or connection failed");
    }
  }, [robot, id, publishButtonMessage]);

  const fetchRobotData = useCallback(async () => {
    try {
      console.log("🔄 Fetching robot data for ID:", id);
      
      let robotData;
      if (location.state?.robot) {
        robotData = await getData(`${BASE_URL}/robots/${id}`);
        if (!robotData) {
          console.warn("Robot not found in API");
          return null;
        }
      } else {
        robotData = await getData(`${BASE_URL}/robots/${id}`);
        if (!robotData) {
          toast.error("Robot not found in API");
          return null;
        }
      }
      
      console.log("✅ Robot data fetched:", robotData);
      setRobot(robotData);
      
      const robotConnectionStatus = getConnectionStatus(id, "main");
      const trolleyConnectionStatus = getConnectionStatus(id, "car");
      
      console.log("🤖 Robot MQTT Connection Status:", robotConnectionStatus);
      console.log("🚗 Trolley MQTT Connection Status:", trolleyConnectionStatus);
      
      return robotData;
    } catch (error) {
      console.error("❌ Failed to load robot details:", error);
      return null;
    }
  }, [id, location.state, BASE_URL, getConnectionStatus]);

  const fetchButtonColors = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/buttons.php`);
      const colorsMap = {};
      const buttonsData = res.data || [];
      
      buttonsData.forEach(btn => {
        colorsMap[btn.BtnID] = btn.Color;
      });
      setButtonColors(colorsMap);
      setButtonsWithColors(buttonsData);
      console.log("✅ Button colors updated");
    } catch (err) {
      console.error("❌ Failed to load button colors:", err);
    }
  }, [BASE_URL]);

  const fetchAllData = useCallback(async () => {
    try {
      console.log("🔄 Auto-refreshing all data...");
      
      const updatedRobot = await fetchRobotData();
      await fetchButtonColors();
      await fetchScheduleData();
      
      console.log("✅ All data refreshed successfully");
      
      return updatedRobot;
    } catch (error) {
      console.error("❌ Error in auto-refresh:", error);
      return null;
    }
  }, [fetchRobotData, fetchButtonColors]);

  const findScheduleButton = async (robotData = null) => {
    try {
      setScheduleLoading(true);
      
      const targetRobot = robotData || robot;
      if (!targetRobot) return;
      
      const carSection = targetRobot?.Sections?.car;
      if (!carSection || !carSection.ActiveBtns) {
        setScheduleButton(null);
        return;
      }

      let activeBtns = [];
      try {
        if (Array.isArray(carSection.ActiveBtns)) {
          activeBtns = carSection.ActiveBtns;
        } else if (typeof carSection.ActiveBtns === "string") {
          activeBtns = JSON.parse(carSection.ActiveBtns);
        }
      } catch {
        activeBtns = [];
      }

      const scheduleBtn = activeBtns.find(btn => 
        btn?.Name?.toLowerCase().includes('schedule')
      );

      if (scheduleBtn && scheduleBtn.id) {
        const buttonDetails = await getData(`${BASE_URL}/buttons/${scheduleBtn.id}`);
        setScheduleButton(buttonDetails);
      } else {
        setScheduleButton(null);
      }
    } catch (error) {
      console.error("Error fetching schedule button:", error);
      setScheduleButton(null);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (robot) {
      const hasTrolley = robot?.isTrolley == 1 || robot?.isTrolley === "true" || robot?.isTrolley === true;
      if (hasTrolley) {
        findScheduleButton();
      } else {
        setScheduleButton(null);
      }
    }
  }, [robot]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        await fetchUserRobotPassword();
        
        await fetchRobotData();
        await fetchButtonColors();
        await fetchScheduleData();
        
      } catch (error) {
        console.error("❌ Error loading initial data:", error);
        toast.error("Failed to load robot details");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    startTimer();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(() => {
      if (id && !loading) {
        console.log(" Auto-refreshing all robot data...");
        fetchAllData();
      }
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [id, loading, fetchAllData]);

  const fetchScheduleData = async () => {
    try {
      const hasTrolley = robot?.isTrolley == 1 || robot?.isTrolley === "true" || robot?.isTrolley === true;
      if (hasTrolley) {
        const scheduleRes = await getData(`${BASE_URL}/schedule/${id}`);
        setScheduleData(scheduleRes || {
          days: [],
          hour: 8,
          minute: 0,
          active: true
        });
      } else {
        setScheduleData(null);
      }
    } catch (error) {
      console.error("Failed to load schedule data:", error);
      setScheduleData({
        days: [],
        hour: 8,
        minute: 0,
        active: true
      });
    }
  };

  const handleResetTimer = async () => {
    setIsResetting(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    publishStatusMessages();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await fetchAllData();
    
    setRobot(prev => prev ? {...prev} : null);
    
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    saveTimerEndTime(id, endTime);
    
    startTimer();
    
    setTimeout(() => {
      setIsResetting(false);
    }, 600);
  };

  const handleRobotPasswordSubmit = () => {
    setRobotPasswordLoading(true);
    setPasswordError(false);
    
    setTimeout(() => {
      if (robotPasswordInput === userRobotPassword) {
        setRobotSectionLocked(false);
        saveRobotLockState(id, { locked: false, unlockedAt: Date.now() });
        toast.success("Robot section unlocked successfully!");
        setRobotPasswordInput("");
        setShowPassword(false); 
      } else {
        setPasswordError(true);
        toast.error("Incorrect password. Please try again.");
      }
      setRobotPasswordLoading(false);
    }, 500);
  };

  const handleLockRobotSection = () => {
    setRobotSectionLocked(true);
    saveRobotLockState(id, { locked: true, unlockedAt: null });
    toast.info("Robot section has been locked");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let endTime = loadTimerEndTime(id);
    
    if (!endTime) {
      endTime = Date.now() + 24 * 60 * 60 * 1000;
      saveTimerEndTime(id, endTime);
    }

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = endTime - now;
      
      if (remainingMs > 0) {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        setDisplayTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        console.log("⏰ 24-hour timer completed, sending automatic status messages...");
        publishStatusMessages();
        
        setTimeout(() => {
          fetchAllData();
        }, 2000);
        
        endTime = Date.now() + 24 * 60 * 60 * 1000;
        saveTimerEndTime(id, endTime);
        
        const hours = 24;
        const minutes = 0;
        const seconds = 0;
        setDisplayTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    
    timerRef.current = setInterval(updateTimer, 1000);
  };

  useEffect(() => {
    if (robot) {
      console.log("🤖 Robot data updated:", {
        robotVoltage: robot.Sections?.main?.Voltage,
        robotStatus: robot.Sections?.main?.Status,
        robotCycles: robot.Sections?.main?.Cycles,
        trolleyVoltage: robot.Sections?.car?.Voltage,
        trolleyStatus: robot.Sections?.car?.Status,
        trolleyCycles: robot.Sections?.car?.Cycles,
        isTrolley: robot.isTrolley 
      });
    }
  }, [robot]);

  const handleRobotButtonClick = (btnName) => {
    const robotSection = robot?.Sections?.main;
    const topic = robotSection?.Topic_main;
    
    if (!topic) {
      console.error("No topic found for robot section");
      toast.error("No topic configured for robot section");
      return;
    }
    
    const success = publishButtonMessage(id, "main", topic, btnName);
    
    if (success) {
      toast.success(`Robot: ${btnName}`);
      
      setTimeout(() => {
        fetchAllData();
      }, 2000);
    } else {
      console.log(`Failed to publish to robot ${topic}: ${btnName}`);
      toast.error("Failed to send command via MQTT Check internet connection or contact support");
    }
  };

  const handleTrolleyButtonClick = (btnName) => {
    const trolleySection = robot?.Sections?.car;
    const topic = trolleySection?.Topic_main;
    
    if (!topic) {
      console.error("No topic found for trolley section");
      toast.error("No topic configured for trolley section");
      return;
    }
    
    const success = publishButtonMessage(id, "car", topic, btnName);
    
    if (success) {
      toast.success(`Trolley: ${btnName}`);
      
      setTimeout(() => {
        fetchAllData();
      }, 2000);
    } else {
      console.log(`Failed to publish to trolley ${topic}: ${btnName}`);
      toast.error("Failed to send command via MQTT Check internet connection or contact support");
    }
  };

  const tabs = [
    { id: "controls", label: "Controls" },
    { id: "notifications", label: "Notifications and alerts" },
    { id: "logs", label: "Logs" },
  ];

  const trolleyTabs = [
    { id: "controls", label: "Controls" },
    { id: "notifications", label: "Notifications and alerts" },
    { id: "logs", label: "Logs" },
  ];

  const getActiveButtons = (section, sectionType = "main") => {
    if (!section || !section.ActiveBtns) return [];

    let activeBtns = [];
    try {
      if (Array.isArray(section.ActiveBtns)) {
        activeBtns = section.ActiveBtns;
      } else if (typeof section.ActiveBtns === "string") {
        activeBtns = JSON.parse(section.ActiveBtns);
      }
    } catch {
      activeBtns = [];
    }

    const visibilityMap = loadButtonVisibility(id, sectionType);

    const filteredBtns = activeBtns.filter(btn => {
      const btnName = btn?.Name || btn?.name || '';
      const btnId = btn.id || btnName;
      
      const isVisible = visibilityMap[btnId] !== false;
      
      if (sectionType === "car") {
        return isVisible && !btnName.toLowerCase().includes('schedule');
      }
      
      return isVisible;
    });

    return filteredBtns.map((btn, i) => {
      const btnLabel = btn?.Name || btn?.name || `Button ${i + 1}`;
      const btnColor = buttonColors[btn.id] || "#4F46E5";
      
      return (
        <button
          key={btn?.id || i}
          onClick={() => sectionType === "main" ? handleRobotButtonClick(btnLabel) : handleTrolleyButtonClick(btnLabel)}
          className="px-4 py-3 rounded-xl text-base font-semibold text-white border shadow-lg transition-all duration-300 transform hover:scale-105 hover:opacity-90 min-w-[120px] sm:min-w-[180px] lg:min-w-[200px] cursor-pointer text-center"
          style={{ backgroundColor: btnColor, borderColor: btnColor }}
        >
          {btnLabel} 
        </button>
      );
    });
  };

  const renderRobotPasswordPrompt = () => {
    if (userPasswordLoading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-3xl shadow-lg p-8 mb-8 border border-gray-100"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-color mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading robot password...</p>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-lg p-8 mb-8 border border-gray-100"
      >
        <div className="flex flex-col items-center justify-center">
          <Lock className="w-16 h-16 text-main-color mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Robot Section Locked
          </h3>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            This robot section requires authentication. Please enter the robot password to access controls.
          </p>
          
          {userRobotPassword === null || userRobotPassword === "" ? (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-6 w-full max-w-md">
              <p className="text-yellow-800 font-medium">
                Your account doesn't have a robot password configured.
              </p>
              <p className="text-yellow-600 text-sm mt-1">
                Please contact your administrator to set a robot password for your account.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <div className="space-y-2">
                <label htmlFor="robotPassword" className="text-gray-700 font-medium block">
                  Robot Password
                </label>
                <div className="relative">
                  <Input
                    id="robotPassword"
                    type={showPassword ? "text" : "password"}
                    value={robotPasswordInput}
                    onChange={(e) => {
                      setRobotPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="Enter robot password"
                    className={`w-full h-12 border ${passwordError ? 'border-red-500' : 'border-gray-300'} focus:border-main-color focus:ring-main-color rounded-xl pr-10`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRobotPasswordSubmit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>
              
              <Button
                onClick={handleRobotPasswordSubmit}
                disabled={robotPasswordLoading || !robotPasswordInput.trim()}
                className="w-full h-12 bg-main-color text-white hover:bg-main-color/90 rounded-xl text-lg font-medium"
              >
                {robotPasswordLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  <>
                    <Unlock className="w-5 h-5 mr-2" />
                    Unlock Robot Section
                  </>
                )}
              </Button>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              User: <span className="font-medium text-gray-700">{userName}</span>
            </p>
            <p className="text-gray-500 text-sm mt-1">
              This password is configured in your user profile as "Main Robot Password".
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderRobotControls = () => {
    if (!robot) return null;
    
    if (robotSectionLocked) {
      return renderRobotPasswordPrompt();
    }
    
    const { Sections = {} } = robot;
    const mainSection = Sections?.main || {};

    const valueVisibility = loadValueVisibility(id, 'main');

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* {!robotSectionLocked && userRobotPassword && userRobotPassword.trim() !== "" && (
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleLockRobotSection}
              variant="outline"
              className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full"
            >
              <Lock className="w-4 h-4" />
              Lock Robot Section
            </Button>
          </div>
        )} */}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex flex-col text-left text-base sm:text-lg font-medium text-gray-800 gap-2">
            {valueVisibility["voltage"] !== false && (
              <div>Voltage: <span className="font-semibold">{mainSection.Voltage || "0"}V</span></div>
            )}
            {valueVisibility["cycles"] !== false && (
              <div>Cycles: <span className="font-semibold">{mainSection.Cycles || "0"}</span></div>
            )}
            {valueVisibility["status"] !== false && (
              <div className="flex items-center gap-2">
                <RotateCcw className={`w-5 h-5 ${mainSection.Status === "Running" ? "text-gray-800 animate-spin-slow" : "text-gray-800"}`} />
                <span>Status: <span className={`font-semibold ml-1 ${mainSection.Status === "Running" ? "text-gray-800" : mainSection.Status === "Idle" ? "text-gray-800" : "text-gray-800"}`}>
                  {mainSection.Status || "Unknown"}
                </span></span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-sm font-medium text-gray-600">Auto-refresh in</span>
            <div className="flex items-center gap-3 text-lg sm:text-2xl font-bold text-gray-900">
              <span>⏱ {displayTime}</span>
              <RefreshCcw 
                className={`w-6 sm:w-8 h-6 sm:h-8 text-main-color cursor-pointer hover:text-main-color/70 transition-transform duration-600 ${
                  isResetting ? 'rotate-180' : ''
                }`}
                onClick={handleResetTimer}
                title="Reset timer and send status messages"
              />
            </div>
          </div>
        </div>

        {mainSection.ActiveBtns && mainSection.ActiveBtns.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 justify-items-center">
              {getActiveButtons(mainSection, "main")}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderTrolleyControls = () => {
    if (!robot) return null;
    
    const { Sections = {} } = robot;
    const carSection = Sections?.car || {};

    const valueVisibility = loadValueVisibility(id, 'car');

    return (
      <motion.div 
        className="bg-white p-6 sm:p-10 pt-0" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex flex-col text-left text-base sm:text-lg font-medium text-gray-800 gap-2">
            {valueVisibility["voltage-trolley"] !== false && (
              <div>Voltage: <span className="font-semibold">{carSection.Voltage || "0"}V</span></div>
            )}
            {valueVisibility["cycles-trolley"] !== false && (
              <div>Cycles: <span className="font-semibold">{carSection.Cycles || "0"}</span></div>
            )}
            {valueVisibility["status-trolley"] !== false && (
              <div className="flex items-center gap-2">
                <RotateCcw className={`w-5 h-5 ${carSection.Status === "Running" ? "text-green-500 animate-spin-slow" : "text-gray-400"}`} />
                <span>Status: <span className={`font-semibold ml-1 ${carSection.Status === "Running" ? "text-green-600" : carSection.Status === "Idle" ? "text-yellow-600" : "text-gray-600"}`}>
                  {carSection.Status || "Unknown"}
                </span></span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-sm font-medium text-gray-600">Auto-refresh in</span>
            <div className="flex items-center gap-3 text-lg sm:text-2xl font-bold text-gray-900">
              <span>⏱ {displayTime}</span>
              <RefreshCcw 
                className={`w-6 sm:w-8 h-6 sm:h-8 text-second-color cursor-pointer hover:text-second-color/70 transition-transform duration-600 ${
                  isResetting ? 'rotate-180' : ''
                }`}
                onClick={handleResetTimer}
                title="Reset timer and send status messages"
              />
            </div>
          </div>
        </div>

        {carSection.ActiveBtns && carSection.ActiveBtns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 justify-items-center">
            {getActiveButtons(carSection, "car")}
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-linear-to-b from-white to-gray-50">
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-3xl mx-auto text-center bg-white rounded-3xl shadow-lg p-10 border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-color mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading robot details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="flex flex-col min-h-screen bg-linear-to-b from-white to-gray-50">
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-3xl mx-auto text-center bg-white rounded-3xl shadow-lg p-10 border border-gray-100">
            <p className="text-gray-500 text-lg">Robot not found</p>
            <Button
              onClick={() => navigate("/robots")}
              className="mt-4 border-main-color text-main-color hover:bg-main-color hover:text-white rounded-full px-6 py-3"
            >
              Back to Robots
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { Sections = {} } = robot;
  const hasTrolleyData = Sections?.car && (
    Sections.car.Voltage || 
    Sections.car.Cycles || 
    Sections.car.Status || 
    (Sections.car.ActiveBtns && Sections.car.ActiveBtns.length > 0)
  );

  const isTrolleyEnabled = robot?.isTrolley == 1 || robot?.isTrolley === "true" || robot?.isTrolley === true;

  const activeNonControlsSection = getActiveNonControlsSection();

  return (
    <div className="flex flex-col min-h-screen bg-linear-to-b from-white to-gray-50">
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Button
          onClick={() => navigate(-1)}
          className="left-0 flex my-5 items-center gap-2 bg-transparent text-main-color border border-main-color hover:bg-main-color/10 cursor-pointer"
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        
        <motion.div 
          className="max-w-6xl mx-auto relative" 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-wider mb-6 text-gray-900 text-center">
            {robot.RobotName || "Unnamed Robot"}
          </h1>

          <div className="relative mb-12 flex justify-center">
            <LazyImage 
              src={getRobotImageSrc(robot.Image)} 
              alt={robot.RobotName || "Robot"} 
              className="w-full max-w-md h-48 sm:h-56 object-cover rounded-2xl shadow-md" 
              fallbackSrc="/default-robot.jpg" 
            />
          </div>

          {isInNonControlsView() ? (
            <>
              {activeNonControlsSection === "trolley" && hasTrolleyData && isTrolleyEnabled && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-second-color text-center">
                      Trolley Section
                    </h2>
                  </div>

                  <div className="bg-white rounded-t-3xl shadow-lg p-6 ">
                    <TabsHeader 
                      tabs={trolleyTabs} 
                      active={activeTrolleyTab} 
                      onChange={setActiveTrolleyTab} 
                      accent="second" 
                    />
                  </div>

                  <div className="bg-white rounded-b-3xl shadow-lg p-6 sm:p-10 border border-gray-100 border-t-0">
                    {activeTrolleyTab === "notifications" && (
                      <UserNotificationsTab 
                        robotId={id} 
                        sectionName="car" 
                        publish={(topic, message) => publishButtonMessage(id, "car", topic, message)}
                      />
                    )}
                    
                    {activeTrolleyTab === "logs" && (
                      <UserLogsTab 
                        sectionName="car" 
                        publish={(topic, message) => publishButtonMessage(id, "car", topic, message)}
                      />
                    )}
                  </div>
                </>
              )}

              {activeNonControlsSection === "robot" && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-main-color text-center">
                      Robot Section
                    </h2>
                  </div>

                  <div className="bg-white rounded-t-3xl shadow-lg p-6 ">
                    <TabsHeader 
                      tabs={tabs} 
                      active={activeTab} 
                      onChange={setActiveTab} 
                      accent="main" 
                    />
                  </div>

                  <div className="bg-white rounded-b-3xl shadow-lg p-6 sm:p-10 border border-gray-100 border-t-0">
                    {activeTab === "notifications" && (
                      <UserNotificationsTab 
                        robotId={id} 
                        sectionName="main" 
                        publish={(topic, message) => publishButtonMessage(id, "main", topic, message)}
                      />
                    )}
                    
                    {activeTab === "logs" && (
                      <UserLogsTab 
                        sectionName="main" 
                        publish={(topic, message) => publishButtonMessage(id, "main", topic, message)}
                      />
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {shouldShowTrolleySection() && hasTrolleyData && isTrolleyEnabled && (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-second-color text-center">
                      Trolley Section
                    </h2>
                  </div>

                  <div className="bg-white rounded-t-3xl shadow-lg p-6 ">
                    <TabsHeader 
                      tabs={trolleyTabs} 
                      active={activeTrolleyTab} 
                      onChange={setActiveTrolleyTab} 
                      accent="second" 
                    />
                  </div>

                  <div className="bg-white rounded-b-3xl shadow-lg p-6 sm:p-10 border border-gray-100 border-t-0">
                    {activeTrolleyTab === "controls" && renderTrolleyControls()}
                    
                    {activeTrolleyTab === "notifications" && (
                      <UserNotificationsTab 
                        robotId={id} 
                        sectionName="car" 
                        publish={(topic, message) => publishButtonMessage(id, "car", topic, message)}
                      />
                    )}
                    
                    {activeTrolleyTab === "logs" && (
                      <UserLogsTab 
                        sectionName="car" 
                        publish={(topic, message) => publishButtonMessage(id, "car", topic, message)}
                      />
                    )}
                  </div>
                </>
              )}

              {shouldShowScheduleSection() && (
                <>
                  <div className="mb-6 mt-16">
                    <h2 className="text-2xl sm:text-3xl font-bold text-green-600 text-center">
                      Schedule Settings
                    </h2>
                  </div>

                  <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-10 border border-gray-100">
                    <ScheduleDisplay
                      scheduleButton={scheduleButton}
                      publish={(topic, message) => publishButtonMessage(id, "car", topic, message)}
                      topic={robot?.Sections?.car?.Topic_main}
                      loading={scheduleLoading}
                    />
                  </div>
                </>
              )}

              {shouldShowRobotSection() && (
                <>
                  <div className="mb-6 mt-16">
                    <h2 className="text-2xl sm:text-3xl font-bold text-main-color text-center">
                      Robot Section
                    </h2>
                  </div>

                  <div className="bg-white rounded-t-3xl shadow-lg p-6 ">
                    <TabsHeader 
                      tabs={tabs} 
                      active={activeTab} 
                      onChange={setActiveTab} 
                      accent="main" 
                    />
                  </div>

                  <div className="bg-white rounded-b-3xl shadow-lg p-6 sm:p-10 border border-gray-100 border-t-0">
                    {activeTab === "controls" && renderRobotControls()}
                    
                    {activeTab === "notifications" && (
                      <UserNotificationsTab 
                        robotId={id} 
                        sectionName="main" 
                        publish={(topic, message) => publishButtonMessage(id, "main", topic, message)}
                      />
                    )}
                    
                    {activeTab === "logs" && (
                      <UserLogsTab 
                        sectionName="main" 
                        publish={(topic, message) => publishButtonMessage(id, "main", topic, message)}
                      />
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/robots")} 
              className="border-main-color text-main-color hover:bg-main-color hover:text-white rounded-full px-8 py-4 text-lg font-semibold transition-all"
            >
              Back to Robots
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}