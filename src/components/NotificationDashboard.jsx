import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { 
  Loader, 
  Bell, 
  AlertTriangle, 
  Info, 
  RefreshCw,
  ArrowLeft,
  Filter,
  Search,
  X,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useMqtt } from "@/context/MqttContext";

export default function NotificationCenter({ 
  onClose, 
  mode = "dropdown",
  position = "header"
}) {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [robots, setRobots] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentProject, setCurrentProject] = useState(null);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  
  //  MQTT Context
  const { 
    notifications: mqttNotifications, 
    activeConnections,
    connectionCount,
    connectedCount,
    reconnectAll,
    reconnectRobot
  } = useMqtt();
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Function to convert Egypt time to Jordan time
  const convertToJordanTime = (date, time) => {
    if (!date || !time) return { date: "Unknown", time: "Unknown" };
    
    try {
      // Create date object assuming the input is in Egypt time (Africa/Cairo)
      const egyptTime = new Date(`${date}T${time}`);
      
      // Convert to Jordan time (Asia/Amman)
      const options = {
        timeZone: 'Asia/Amman',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(egyptTime);
      
      const getPart = (type) => parts.find(part => part.type === type)?.value;
      
      return {
        date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
        time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`
      };
    } catch (err) {
      return { date, time }; // Return original if conversion fails
    }
  };

  // Function to convert timestamp to Jordan time
  const convertTimestampToJordanTime = (timestamp) => {
    if (!timestamp) return { date: "Unknown", time: "Unknown" };
    
    try {
      const date = new Date(timestamp);
      
      // Convert to Jordan time (Asia/Amman)
      const options = {
        timeZone: 'Asia/Amman',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
      
      const getPart = (type) => parts.find(part => part.type === type)?.value;
      
      return {
        date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
        time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`
      };
    } catch (err) {
      return { date: "Unknown", time: "Unknown" };
    }
  };

  useEffect(() => {
    const fetchAndMergeNotifications = async () => {
      try {
        setLoading(true);
        
        const serverRes = await axios.get(`${API_BASE}/notifications.php`, {
          headers: { "Content-Type": "application/json" },
        });
        
        let serverNotifications = Array.isArray(serverRes.data) ? serverRes.data : [];
        
        // Convert server notifications to Jordan time
        serverNotifications = serverNotifications.map(note => {
          const jordanTime = convertToJordanTime(note.date, note.time);
          return {
            ...note,
            jordanDate: jordanTime.date,
            jordanTime: jordanTime.time
          };
        });
        
        const enhancedServerNotifications = enhanceNotificationsWithRobotInfo(serverNotifications);
        
        // Convert MQTT notifications to Jordan time
        const mqttNotificationsJordan = mqttNotifications.map(note => {
          const jordanTime = note.timestamp ? convertTimestampToJordanTime(note.timestamp) : convertToJordanTime(note.date, note.time);
          return {
            ...note,
            jordanDate: jordanTime.date,
            jordanTime: jordanTime.time,
            isMqtt: true
          };
        });
        
        const allNotifications = [
          ...mqttNotificationsJordan,
          ...enhancedServerNotifications
        ];
        
        const uniqueNotifications = removeDuplicates(allNotifications);
        
        const sortedNotifications = uniqueNotifications.sort((a, b) => {
          try {
            const dateA = a.timestamp || new Date(`${a.date}T${a.time}`).getTime();
            const dateB = b.timestamp || new Date(`${b.date}T${b.time}`).getTime();
            return dateB - dateA;
          } catch {
            return 0;
          }
        });
        
        setNotifications(sortedNotifications);
        setError(null);
        
      } catch (err) {
        setError("Failed to load notifications: " + (err.message || "Unknown error"));
        
        const mqttNotificationsJordan = mqttNotifications.map(note => {
          const jordanTime = note.timestamp ? convertTimestampToJordanTime(note.timestamp) : convertToJordanTime(note.date, note.time);
          return {
            ...note,
            jordanDate: jordanTime.date,
            jordanTime: jordanTime.time,
            isMqtt: true
          };
        });
        
        const sortedMqtt = [...mqttNotificationsJordan].sort((a, b) => {
          try {
            return (b.timestamp || 0) - (a.timestamp || 0);
          } catch {
            return 0;
          }
        });
        setNotifications(sortedMqtt);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAndMergeNotifications();
  }, [mqttNotifications, API_BASE]);

  useEffect(() => {
    applyFilters();
  }, [notifications, searchTerm, filterType, activeTab]);

  const removeDuplicates = (notificationsArray) => {
    const seen = new Set();
    return notificationsArray.filter(notif => {
      const key = `${notif.topic_main}-${notif.message}-${notif.date}-${notif.time}-${notif.robotId || 'no-robot'}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const getProjectNameFromCookie = () => {
    try {
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "projectName") {
          return decodeURIComponent(value);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const fetchProjectByName = async (projectName) => {
    try {
      if (!projectName) return null;

      const res = await axios.get(`${API_BASE}/projects.php`);
      const projects = Array.isArray(res.data) ? res.data : [];

      const project = projects.find(
        (proj) =>
          proj.ProjectName &&
          proj.ProjectName.trim().toLowerCase() === projectName.trim().toLowerCase()
      );

      return project || null;
    } catch (err) {
      return null;
    }
  };

  const fetchAllRobots = async () => {
    try {
      const res = await axios.get(`${API_BASE}/robots.php`);
      const robotsArray = Array.isArray(res.data) ? res.data : [];
      setRobots(robotsArray);
      return robotsArray;
    } catch (err) {
      return [];
    }
  };

  const isAlertNotification = (note) => {
    if (!note || !note.message) return false;
    
    const message = note.message.toLowerCase();
    const alertKeywords = ['alert', 'error', 'warning', 'critical', 'fail', 'stopped', 'emergency', 'fault', 'issue', 'problem'];
    const infoKeywords = ['info', 'information', 'started', 'running', 'completed', 'success', 'ready'];
    
    const hasAlertKeyword = alertKeywords.some(keyword => message.includes(keyword));
    const hasInfoKeyword = infoKeywords.some(keyword => message.includes(keyword));
    
    return hasAlertKeyword && !hasInfoKeyword;
  };

  const findSectionByTopic = (topicMain, robot) => {
    if (!topicMain || !robot.Sections) return null;
    
    const sectionEntry = Object.entries(robot.Sections).find(
      ([sectionName, section]) => section.Topic_main === topicMain
    );

    return sectionEntry ? sectionEntry[0] : null;
  };

  const findRobotByTopic = (topicMain) => {
    if (!topicMain || !robots.length) return null;
    
    for (const robot of robots) {
      if (!robot.Sections) continue;
      
      for (const [sectionName, section] of Object.entries(robot.Sections)) {
        if (section.Topic_main === topicMain) {
          return robot;
        }
      }
    }
    
    return null;
  };

  const getRobotNameByRobotId = (robotId) => {
    if (!robotId || !robots.length) {
      return null;
    }
    
    const searchId = robotId.toString().trim();
    
    const robot = robots.find(r => {
      return r.id != null && r.id.toString() === searchId;
    });
    
    if (robot) {
      const robotName = robot.RobotName || robot.robotName || robot.name || 'Unknown Robot';
      return robotName;
    }
    
    return null;
  };

  const getSectionNameFromTopic = (topic) => {
    if (!topic) return null;
    
    const parts = topic.split('/');
    if (parts.length >= 2) {
      const sectionType = parts[1];
      if (sectionType === 'car') {
        return 'trolley';
      } else if (sectionType === 'main') {
        return 'robot';
      }
      return sectionType;
    }
    return null;
  };

  const getRobotNameFromTopic = (topic) => {
    if (!topic) return null;
    
    const parts = topic.split('/');
    if (parts.length > 0) {
      const robotNameFromTopic = parts[0];
      if (robotNameFromTopic && robotNameFromTopic !== 'robot') {
        return robotNameFromTopic;
      }
    }
    return null;
  };

  const getProjectNameForRobot = (robotId) => {
    if (!robotId || !robots.length) return null;
    
    const robot = robots.find(r => r.id != null && r.id.toString() === robotId.toString());
    if (robot && robot.projectId) {
      return currentProject ? currentProject.ProjectName : null;
    }
    
    return null;
  };

  const getRobotAndProjectInfo = (note) => {
    if (!note) return { robotName: null, sectionName: null, projectName: null };
    
    let robotName = null;
    let sectionName = null;
    let projectName = null;

    if (note.RobotId) {
      robotName = getRobotNameByRobotId(note.RobotId);
      projectName = getProjectNameForRobot(note.RobotId);
    }

    if (!robotName && note.topic_main) {
      const robotFromTopic = findRobotByTopic(note.topic_main);
      if (robotFromTopic) {
        robotName = robotFromTopic.RobotName || robotFromTopic.robotName;
        projectName = currentProject ? currentProject.ProjectName : null;
      }
    }

    if (!robotName && note.topic_main) {
      robotName = getRobotNameFromTopic(note.topic_main);
      projectName = currentProject ? currentProject.ProjectName : null;
    }

    if (note.topic_main) {
      sectionName = getSectionNameFromTopic(note.topic_main);
    }

    if (!projectName && currentProject) {
      projectName = currentProject.ProjectName;
    }

    return { robotName, sectionName, projectName };
  };

  const extractActualMessageContent = (message) => {
    if (!message) return "New message";
    
    const patterns = [
      /^.+\([^)]+\):\s*(.+)$/, // "new car (main): 000000"
      /^.+:\s*(.+)$/,          // "new car: 000000"
      /^.+-\s*(.+)$/,          // "new car - 000000"
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return message;
  };

  const enhanceNotificationsWithRobotInfo = (notificationsArray) => {
    return notificationsArray.map((note) => {
      const { robotName, sectionName, projectName } = getRobotAndProjectInfo(note);
      
      const actualMessage = extractActualMessageContent(note.message);
      
      return {
        ...note,
        robotName: robotName || "Unknown Robot",
        sectionName: sectionName,
        projectName: projectName || "All Projects",
        displayMessage: actualMessage
      };
    });
  };

  const fetchCurrentProjectAndNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const projectName = getProjectNameFromCookie();
      const project = await fetchProjectByName(projectName);
      
      await fetchAllRobots();

      const res = await axios.get(`${API_BASE}/notifications.php`, {
        headers: { "Content-Type": "application/json" },
      });
      
      let allNotifications = Array.isArray(res.data) ? res.data : [];

      // Convert to Jordan time
      allNotifications = allNotifications.map(note => {
        const jordanTime = convertToJordanTime(note.date, note.time);
        return {
          ...note,
          jordanDate: jordanTime.date,
          jordanTime: jordanTime.time
        };
      });

      const sortedNotifications = allNotifications.sort((a, b) => {
        try {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateB - dateA;
        } catch {
          return 0;
        }
      });

      const enhancedNotifications = enhanceNotificationsWithRobotInfo(sortedNotifications);
      
      // Convert MQTT notifications to Jordan time
      const mqttNotificationsJordan = mqttNotifications.map(note => {
        const jordanTime = note.timestamp ? convertTimestampToJordanTime(note.timestamp) : convertToJordanTime(note.date, note.time);
        return {
          ...note,
          jordanDate: jordanTime.date,
          jordanTime: jordanTime.time,
          isMqtt: true
        };
      });
      
      const mergedNotifications = [
        ...mqttNotificationsJordan,
        ...enhancedNotifications
      ];
      
      const uniqueNotifications = removeDuplicates(mergedNotifications);
      
      const sortedMerged = uniqueNotifications.sort((a, b) => {
        try {
          const dateA = a.timestamp || new Date(`${a.date}T${a.time}`).getTime();
          const dateB = b.timestamp || new Date(`${b.date}T${b.time}`).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      });
      
      setNotifications(sortedMerged);
      setCurrentProject(project);
      
    } catch (err) {
      setError("Failed to load notifications: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(note => {
        return (
          (note.message && note.message.toLowerCase().includes(searchTermLower)) ||
          (note.topic_main && note.topic_main.toLowerCase().includes(searchTermLower)) ||
          (note.robotName && note.robotName.toLowerCase().includes(searchTermLower)) ||
          (note.sectionName && note.sectionName.toLowerCase().includes(searchTermLower)) ||
          (note.projectName && note.projectName.toLowerCase().includes(searchTermLower)) ||
          (note.displayMessage && note.displayMessage.toLowerCase().includes(searchTermLower))
        );
      });
    }

    // Apply type filter
    if (filterType === "alerts") {
      filtered = filtered.filter(note => isAlertNotification(note));
    } else if (filterType === "info") {
      filtered = filtered.filter(note => !isAlertNotification(note));
    }

    // Apply tab filter
    if (activeTab === "realtime") {
      filtered = filtered.filter(note => note.isMqtt || note.source === 'mqtt');
    } else if (activeTab === "history") {
      filtered = filtered.filter(note => !note.isMqtt && note.source !== 'mqtt');
    }

    setFilteredNotifications(filtered);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setActiveTab("all");
  };

  const handleClickNotification = async (note) => {
    try {
      let robotId = note.RobotId;
      let sectionName = note.sectionName;
      let robotName = note.robotName;

      if (!robotId && note.topic_main) {
        const robotFromTopic = findRobotByTopic(note.topic_main);
        if (robotFromTopic) {
          robotId = robotFromTopic.id;
          robotName = robotFromTopic.RobotName;
          sectionName = findSectionByTopic(note.topic_main, robotFromTopic);
        }
      }

      if (!robotId) {
        alert("Cannot open this robot. Missing RobotId or cannot find associated robot.");
        return;
      }

      navigate(`/homeDashboard/robotDetails/${robotId}`, {
        state: {
          section: sectionName,
          fromNotification: true,
          notificationData: note,
          robotName: robotName
        },
      });

      if (onClose) onClose();
    } catch (error) {
      alert("Error opening robot details. Please try again.");
    }
  };

  const getNotificationClasses = (note) => {
    const isAlert = isAlertNotification(note);
    const base = "mb-2 p-3 hover:shadow-md cursor-pointer transition-all duration-200 border rounded-lg";
    
    if (isAlert) return `${base} bg-red-50 border-red-200 hover:border-red-300`;
    return `${base} bg-blue-50 border-blue-200 hover:border-blue-300`;
  };

  const getTitleColor = (note) => {
    if (isAlertNotification(note)) return "text-red-800";
    return "text-blue-800";
  };

  const getNotificationIcon = (note) => {
    if (isAlertNotification(note))
      return <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />;
    return <Info className="w-4 h-4 text-blue-500 mr-2" />;
  };

  const getNotificationType = (note) => {
    return isAlertNotification(note) ? "Alert" : "Info";
  };

  const handleBackToDashboard = () => {
    navigate("/homeDashboard");
  };

  const getPositionClasses = () => {
    if (position === "sidebar") {
      return "left-0";
    } else {
      return "right-0";
    }
  };

  const renderMqttStatus = () => {
    const connected = activeConnections.filter(conn => conn.connected).length;
    const total = activeConnections.length;
    
    if (total === 0) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <WifiOff className="w-3 h-3" />
          <span>No MQTT connections</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          {connected === total ? (
            <>
              <Wifi className="w-3 h-3 text-green-500" />
              <span className="text-green-600 font-medium">{total} connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600 font-medium">{connected}/{total} connected</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderConnectionStatusPanel = () => (
    <Card className="mb-4 border-gray-200">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            MQTT Connections
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reconnectAll()}
            className="h-7 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reconnect All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {activeConnections.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No active MQTT connections
            </div>
          ) : (
            activeConnections.map((conn, idx) => (
              <div
                key={conn.robotId || idx}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  {conn.connected ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{conn.robotName || `Robot ${conn.robotId}`}</p>
                    <p className="text-xs text-gray-500">
                      {conn.connected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                {!conn.connected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reconnectRobot(conn.robotId)}
                    className="h-7 text-xs"
                  >
                    Reconnect
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const total = notifications.length;
    const alerts = notifications.filter(note => isAlertNotification(note)).length;
    const info = total - alerts;
    const realtime = notifications.filter(note => note.isMqtt).length;
    const history = total - realtime;
    
    return { total, alerts, info, realtime, history };
  }, [notifications]);

  // Render different layouts based on mode
  if (mode === "page") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 border-main-color text-main-color hover:bg-main-color hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-main-color" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Notifications Dashboard</h1>
                  <p className="text-gray-600">Real-time & historical notifications • Times in Jordan Time</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnectionStatus(!showConnectionStatus)}
                className="flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                {connectedCount}/{connectionCount} Connected
              </Button>
              <Button
                onClick={fetchCurrentProjectAndNotifications}
                className="flex items-center gap-2 bg-main-color hover:bg-second-color text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          {showConnectionStatus && renderConnectionStatusPanel()}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border-l-4 border-l-main-color">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                  </div>
                  <Bell className="w-8 h-8 text-main-color" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Alert Notifications</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.alerts}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Info Notifications</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.info}</p>
                  </div>
                  <Info className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Real-time</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.realtime}</p>
                  </div>
                  <Wifi className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="all">All Notifications</TabsTrigger>
              <TabsTrigger value="realtime">
                <span className="flex items-center gap-2">
                  <Wifi className="w-3 h-3" />
                  Real-time
                </span>
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="alerts">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  Alerts
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 text-gray-700 focus:border-main-color focus:ring-main-color"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                  className={`flex items-center gap-2 ${
                    filterType === "all" 
                      ? "bg-main-color text-white hover:bg-second-color" 
                      : "border-main-color text-main-color hover:bg-main-color hover:text-white"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  All Types
                </Button>
                <Button
                  variant={filterType === "alerts" ? "default" : "outline"}
                  onClick={() => setFilterType("alerts")}
                  className={`flex items-center gap-2 ${
                    filterType === "alerts" 
                      ? "bg-red-600 text-white hover:bg-red-700" 
                      : "border-red-200 text-red-700 hover:bg-red-50"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alerts Only
                </Button>
                <Button
                  variant={filterType === "info" ? "default" : "outline"}
                  onClick={() => setFilterType("info")}
                  className={`flex items-center gap-2 ${
                    filterType === "info" 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "border-blue-200 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  <Info className="w-4 h-4" />
                  Info Only
                </Button>
              </div>

              {(searchTerm || filterType !== "all" || activeTab !== "all") && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-lg shadow-sm border">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 animate-spin text-main-color mr-3" />
                <span className="text-gray-500 text-lg">Loading notifications...</span>
              </div>
            )}

            {error && (
              <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500 text-lg mb-4">{error}</p>
                <Button
                  onClick={fetchCurrentProjectAndNotifications}
                  className="bg-main-color hover:bg-second-color text-white"
                >
                  Try Again
                </Button>
              </div>
            )}

            {!loading && !error && filteredNotifications.length === 0 && (
              <div className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">
                  {searchTerm || filterType !== "all" || activeTab !== "all"
                    ? "No notifications match your filters" 
                    : "No notifications found"}
                </p>
                {(searchTerm || filterType !== "all" || activeTab !== "all") && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="mt-2 border-main-color text-main-color hover:bg-main-color hover:text-white"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {!loading && !error && filteredNotifications.length > 0 && (
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-gray-600">
                    Showing {filteredNotifications.length} of {notifications.length} notifications
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm bg-main-color text-white">
                      Sorted by: Newest First
                    </Badge>
                    <Badge variant="outline" className="text-sm border-green-500 text-green-600">
                      UTC+3
                    </Badge>
                    {activeTab === "realtime" && (
                      <Badge variant="outline" className="text-sm border-green-500 text-green-600">
                        <Wifi className="w-3 h-3 mr-1" />
                        Real-time
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredNotifications.map((note, i) => {
                    const isAlert = isAlertNotification(note);
                    const isRealtime = note.isMqtt;
                    
                    return (
                      <Card
                        key={note.notificationId || i}
                        className={getNotificationClasses(note)}
                        onClick={() => handleClickNotification(note)}
                      >
                        <CardHeader className="p-0 pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle
                              className={`text-base font-semibold line-clamp-2 flex items-start ${getTitleColor(
                                note
                              )}`}
                            >
                              {getNotificationIcon(note)}
                              <span className="flex-1">
                                {note.displayMessage}
                              </span>
                            </CardTitle>
                            <div className="flex gap-2">
                              {isRealtime && (
                                <Badge
                                  variant="outline"
                                  className="border-green-500 text-green-600 bg-green-50"
                                >
                                  <Wifi className="w-3 h-3 mr-1" />
                                  Live
                                </Badge>
                              )}
                              <Badge
                                variant={isAlert ? "destructive" : "secondary"}
                                className={`${
                                  isAlert 
                                    ? "bg-red-100 text-red-800 hover:bg-red-200" 
                                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                }`}
                              >
                                {getNotificationType(note)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-0">
                          <div className="flex justify-between items-center">
                            <p
                              className={`text-sm ${
                                isAlert ? "text-red-600" : "text-blue-600"
                              }`}
                            >
                              {note.jordanDate} • {note.jordanTime}
                              {isRealtime && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  Just now
                                </span>
                              )}
                            </p>

                            {note.topic_main && (
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  isAlert
                                    ? "bg-red-200 text-red-800"
                                    : "bg-blue-200 text-blue-800"
                                }`}
                              >
                                {note.topic_main.split('/').slice(-1)[0]}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="flex flex-wrap gap-4">
                              {note.robotName && note.robotName !== "Unknown Robot" && (
                                <p className="text-sm text-gray-500">
                                  <strong>Robot:</strong> {note.robotName}
                                </p>
                              )}
                              {note.sectionName && (
                                <p className="text-sm text-gray-500">
                                  <strong>Section:</strong> {note.sectionName}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              {isAlert && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  <span className="text-sm text-red-600 font-medium">Priority Alert</span>
                                </div>
                              )}
                              {isRealtime && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  <span className="text-sm text-green-600">Active</span>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`text-xs ${
                                isAlert 
                                  ? "border-red-300 text-red-700 hover:bg-red-50" 
                                  : "border-blue-300 text-blue-700 hover:bg-blue-50"
                              }`}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className={`
        fixed md:absolute 
        top-16 md:top-full 
        right-4 md:right-0
        left-4 md:left-auto
        h-[75vh] md:h-auto 
        w-[calc(100%-2rem)] md:w-80 lg:w-96 
        md:max-h-[80vh] 
        bg-white 
        shadow-2xl rounded-lg 
        border border-gray-200 
        overflow-hidden 
        z-50
        transform transition-all duration-300 ease-in-out
        ${position === "sidebar" ? "md:left-0 md:right-auto" : "md:right-0"}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-main-color text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <h3 className="text-lg font-semibold">Notifications</h3>
              <p className="text-sm text-white/80">
                {activeConnections.length > 0 
                  ? `${connectedCount}/${connectionCount} connected` 
                  : 'All Projects'}
              </p>
              <p className="text-xs text-white/60">
                Times in Jordan Time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCurrentProjectAndNotifications}
              className="text-white hover:text-gray-200 transition-colors p-1"
              title="Refresh notifications"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1"
              title="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm h-9 border-gray-300 text-gray-700 focus:border-main-color focus:ring-main-color"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className={`flex-1 text-xs h-8 ${
                filterType === "all" 
                  ? "bg-main-color text-white hover:bg-second-color" 
                  : "border-main-color text-main-color hover:bg-main-color hover:text-white"
              }`}
            >
              All
            </Button>
            <Button
              variant={filterType === "alerts" ? "default" : "outline"}
              onClick={() => setFilterType("alerts")}
              className={`flex-1 text-xs h-8 ${
                filterType === "alerts" 
                  ? "bg-red-600 text-white hover:bg-red-700" 
                  : "border-red-200 text-red-700 hover:bg-red-50"
              }`}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Alerts
            </Button>
            <Button
              variant={filterType === "info" ? "default" : "outline"}
              onClick={() => setFilterType("info")}
              className={`flex-1 text-xs h-8 ${
                filterType === "info" 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "border-blue-200 text-blue-700 hover:bg-blue-50"
              }`}
            >
              <Info className="w-3 h-3 mr-1" />
              Info
            </Button>
          </div>

          {(searchTerm || filterType !== "all") && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="text-xs h-7 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X className="w-3 h-3 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-1 p-3 bg-white border-b text-sm">
        <div className="text-center">
          <p className="text-lg font-bold text-main-color">{stats.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{stats.alerts}</p>
          <p className="text-xs text-gray-600">Alerts</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-500">{stats.info}</p>
          <p className="text-xs text-gray-600">Info</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">{stats.realtime}</p>
          <p className="text-xs text-gray-600">Live</p>
        </div>
      </div>

      {/* MQTT Status */}
      <div className="px-3 py-2 border-b bg-gray-50">
        {renderMqttStatus()}
      </div>

      {/* Content */}
      <div className="h-[calc(75vh-280px)] md:max-h-[55vh] overflow-y-auto">
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin text-main-color mr-2" />
            <span className="text-gray-500 text-sm">Loading notifications...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button
              onClick={fetchCurrentProjectAndNotifications}
              className="text-main-color text-sm hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && filteredNotifications.length === 0 && (
          <div className="p-6 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">
              {searchTerm || filterType !== "all" 
                ? "No notifications match your filters" 
                : "No notifications found"}
            </p>
            {(searchTerm || filterType !== "all") && (
              <button
                onClick={handleClearFilters}
                className="text-main-color text-sm hover:underline font-medium mt-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredNotifications.length > 0 && (
          <div className="p-3">
            <div className="mb-3 flex justify-between items-center">
              <p className="text-gray-600 text-xs">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </p>
              <Badge variant="secondary" className="text-xs bg-main-color text-white">
                UTC+3
              </Badge>
            </div>

            <div className="space-y-2">
              {filteredNotifications.map((note, i) => {
                const isAlert = isAlertNotification(note);
                const isRealtime = note.isMqtt;
                
                return (
                  <Card
                    key={note.notificationId || i}
                    className={getNotificationClasses(note)}
                    onClick={() => handleClickNotification(note)}
                  >
                    <CardHeader className="p-0 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle
                          className={`text-sm font-semibold line-clamp-2 flex items-start ${
                            isAlert ? "text-red-800" : "text-blue-800"
                          }`}
                        >
                          {getNotificationIcon(note)}
                          <span className="flex-1">
                            {note.displayMessage}
                          </span>
                        </CardTitle>
                        <div className="flex gap-1">
                          {isRealtime && (
                            <Badge
                              variant="outline"
                              className="text-xs border-green-500 text-green-600 bg-green-50"
                            >
                              <Wifi className="w-2 h-2 mr-1" />
                              Live
                            </Badge>
                          )}
                          <Badge
                            variant={isAlert ? "destructive" : "secondary"}
                            className={`text-xs ${
                              isAlert 
                                ? "bg-red-100 text-red-800 hover:bg-red-200" 
                                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            }`}
                          >
                            {getNotificationType(note)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="flex justify-between items-center mb-2">
                        <p
                          className={`text-xs ${
                            isAlert ? "text-red-600" : "text-blue-600"
                          }`}
                        >
                          {note.jordanDate} • {note.jordanTime}
                          {isRealtime && (
                            <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                              now
                            </span>
                          )}
                        </p>

                        {note.topic_main && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isAlert
                                ? "bg-red-200 text-red-800"
                                : "bg-blue-200 text-blue-800"
                            }`}
                          >
                            {note.topic_main.split('/').pop()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2">
                          {note.robotName && note.robotName !== "Unknown Robot" && (
                            <p className="text-xs text-gray-500">
                              <strong>Robot:</strong> {note.robotName}
                            </p>
                          )}
                          {note.sectionName && (
                            <p className="text-xs text-gray-500">
                              <strong>Section:</strong> {note.sectionName}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          {isAlert && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">Priority</span>
                            </div>
                          )}
                          {isRealtime && (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs text-green-600">Active</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`text-xs h-7 ${
                            isAlert 
                              ? "border-red-300 text-red-700 hover:bg-red-50" 
                              : "border-blue-300 text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!loading && filteredNotifications.length > 0 && (
        <div className="border-t p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={fetchCurrentProjectAndNotifications}
              className="text-center text-sm text-main-color hover:text-second-color font-medium py-1 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowConnectionStatus(!showConnectionStatus)}
              className="text-center text-sm text-gray-600 hover:text-gray-800 font-medium py-1 flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              {connectedCount}/{connectionCount}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}