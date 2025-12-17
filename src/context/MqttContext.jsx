import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import mqtt from "mqtt";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "./AuthContext";

const MqttContext = createContext();

export function MqttProvider({ children }) {
  const { userRole, projectName: projectNameFromCookie } = useAuth();
  
  const [clients, setClients] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [robotsData, setRobotsData] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const robotsDataRef = useRef([]);
  const projectsDataRef = useRef([]);
  const usersDataRef = useRef([]);
  const clientsRef = useRef({});
  
  const processingMessagesRef = useRef(new Map());
  const processedMessagesRef = useRef(new Map());
  const toastHistoryRef = useRef(new Map());

  const userRoleRef = useRef(userRole);
  const projectNameCookieRef = useRef(projectNameFromCookie);

  useEffect(() => {
    userRoleRef.current = userRole;
    projectNameCookieRef.current = projectNameFromCookie;
  }, [userRole, projectNameFromCookie]);

  const fetchInitialData = useCallback(async () => {
    try {
      console.log("🔄 Fetching initial data from API...");
      
      const robotsRes = await axios.get(`${API_BASE}/robots.php`);
      const robotsArray = Array.isArray(robotsRes.data) ? robotsRes.data : [];
      robotsDataRef.current = robotsArray;
      setRobotsData(robotsArray);
      
      console.log(`✅ Loaded ${robotsArray.length} robots`);
      
      try {
        const projectsRes = await axios.get(`${API_BASE}/projects.php`);
        const projectsArray = Array.isArray(projectsRes.data) ? projectsRes.data : [];
        setProjectsData(projectsArray);
        projectsDataRef.current = projectsArray;
        console.log(`✅ Loaded ${projectsArray.length} projects`);
      } catch (projectsError) {
        console.warn("Could not fetch projects:", projectsError.message);
        setProjectsData([]);
      }
      
      try {
        const usersRes = await axios.get(`${API_BASE}/users.php`);
        const usersArray = Array.isArray(usersRes.data) ? usersRes.data : [];
        setUsersData(usersArray);
        usersDataRef.current = usersArray;
        console.log(`✅ Loaded ${usersArray.length} users`);
      } catch (usersError) {
        console.warn("Could not fetch users:", usersError.message);
        setUsersData([]);
      }
      
      return robotsArray;
    } catch (error) {
      console.error("❌ Failed to fetch initial data:", error);
      return [];
    }
  }, [API_BASE]);

  const extractMqttConnectionsFromRobot = (robot) => {
    if (!robot || !robot.Sections) return [];
    
    const connections = [];
    const robotId = robot.id;
    const robotName = robot.RobotName || robot.robotName;
    
    Object.entries(robot.Sections).forEach(([sectionName, sectionData]) => {
      if (sectionData && sectionData.mqttUrl && sectionData.mqttUsername && sectionData.mqttPassword) {
        connections.push({
          robotId,
          robotName,
          sectionName,
          sectionData,
          host: sectionData.mqttUrl.replace(/^wss?:\/\//, '').split('/')[0],
          port: 8884,
          username: sectionData.mqttUsername,
          password: sectionData.mqttPassword,
          clientId: `robot-${robotId}-${sectionName}-${Date.now()}`,
          topicSubscribe: sectionData.Topic_subscribe,
          topicMain: sectionData.Topic_main,
          topics: [sectionData.Topic_subscribe]
        });
      }
    });
    
    return connections;
  };

  const isAlertMessage = (message) => {
    if (!message) return false;
    
    const messageLower = message.toLowerCase();
    const alertKeywords = [
      'error', 'alert', 'warning', 'critical', 'fatal',
      'fail', 'failed', 'stopped', 'emergency', 'fault',
      'danger', 'issue', 'problem', 'shutdown', 'offline',
      'error code', 'alarm', 'malfunction', 'broken'
    ];
    
    const infoKeywords = [
      'info', 'information', 'started', 'running', 'online',
      'completed', 'success', 'ready', 'normal', 'ok',
      'initialized', 'connected', 'active', 'operational'
    ];
    
    const hasAlert = alertKeywords.some(keyword => messageLower.includes(keyword));
    const hasInfo = infoKeywords.some(keyword => messageLower.includes(keyword));
    
    return hasAlert && !hasInfo;
  };

  const createMessageId = (topic, message) => {
    const normalizedMessage = message.trim().toLowerCase();
    return `${topic}:${btoa(normalizedMessage)}`;
  };

  const isMessageProcessing = (messageId) => {
    return processingMessagesRef.current.has(messageId);
  };

  const startMessageProcessing = (messageId) => {
    processingMessagesRef.current.set(messageId, Date.now());
  };

  const endMessageProcessing = (messageId) => {
    processingMessagesRef.current.delete(messageId);
    setTimeout(() => {
      processedMessagesRef.current.delete(messageId);
    }, 30000); // تنظيف بعد 30 ثانية
  };

  const isToastDuplicate = (messageId) => {
    return toastHistoryRef.current.has(messageId);
  };

  const markToastAsShown = (messageId) => {
    toastHistoryRef.current.set(messageId, Date.now());
    setTimeout(() => {
      toastHistoryRef.current.delete(messageId);
    }, 5000);
  };

  const findTopicMain = useCallback((topic_sub) => {
    for (const robot of robotsDataRef.current) {
      if (robot.Sections) {
        for (const sectionKey in robot.Sections) {
          const section = robot.Sections[sectionKey];
          if (section.Topic_subscribe === topic_sub) {
            return section.Topic_main;
          }
        }
      }
    }
    return topic_sub;
  }, []);

  const findRobotAndSectionByTopic = useCallback((topic) => {
    if (!robotsDataRef.current.length) return null;
    
    for (const robot of robotsDataRef.current) {
      if (robot.Sections) {
        for (const [sectionName, section] of Object.entries(robot.Sections)) {
          if (section.Topic_subscribe === topic) {
            return { 
              robot, 
              sectionName, 
              section,
              direction: 'fromRobot',
              topicType: 'subscribe'
            };
          }
        }
      }
    }
    return null;
  }, []);

  const shouldShowMessageToUser = useCallback(async (robotSectionInfo) => {
    try {
      const currentUserRole = userRoleRef.current;
      const currentProjectName = projectNameCookieRef.current;
      
      if (currentUserRole !== 'user') {
        return true;
      }

      if (!robotSectionInfo || !robotSectionInfo.robot) {
        return false;
      }

      const robotProjectId = robotSectionInfo.robot.projectId;
      
      if (!robotProjectId || !currentProjectName) {
        return false;
      }

      try {
        const projectsRes = await axios.get(`${API_BASE}/projects.php`);
        const projectsArray = Array.isArray(projectsRes.data) ? projectsRes.data : [];
        
        const userProject = projectsArray.find(project => {
          const projectName = project.ProjectName || project.projectName;
          return projectName && projectName.trim() === currentProjectName.trim();
        });

        if (!userProject) {
          return false;
        }

        const userProjectId = userProject.id || userProject.projectId;
        return String(robotProjectId) === String(userProjectId);
        
      } catch (error) {
        console.error("❌ Error fetching projects for comparison:", error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error in shouldShowMessageToUser:", error);
      return false;
    }
  }, [API_BASE]);

  const sendAlertEmail = useCallback(async (robotSectionInfo, alertMessage, robotName = null, isVoltageAlert = false) => {
    try {
      if (!robotSectionInfo || !robotSectionInfo.robot) {
        return;
      }

      const projectId = robotSectionInfo.robot.projectId;
      
      const project = projectsDataRef.current.find(p => p.projectId === projectId || p.id === projectId);
      if (!project) {
        return;
      }
      
      const projectName = project.ProjectName || project.projectName;
      const projectUsers = usersDataRef.current.filter(user => {
        const userProjectName = user.ProjectName || user.projectName;
        return userProjectName && userProjectName.trim() === projectName.trim();
      });
      
      if (projectUsers.length === 0) {
        return;
      }
      
      // Prepare email message based on alert type
      let emailMessage = alertMessage;
      if (robotName && !isVoltageAlert) {
        // Regular alert format: "Danger Alert: Robot "Robot Name" + message"
        emailMessage = `Danger Alert: Robot "${robotName}" ${alertMessage}`;
      }
      
      // Send email to each user
      for (const user of projectUsers) {
        if (user.Email || user.email) {
          const userEmail = user.Email || user.email;
          try {
            await axios.post(`${API_BASE}/sendEmail.php`, {
              email: userEmail,
              message: emailMessage,
              subject: `Alert: ${robotName || 'Robot'} Notification`
            });
          } catch (emailError) {
            console.error(`❌ Failed to send alert email to ${userEmail}:`, emailError);
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error in sendAlertEmail:", error);
    }
  }, [API_BASE]);

  const saveMessageToDatabase = async (finalMessageObj, robotSectionInfo) => {
    try {
      // Save notification ONLY ONCE
      const notificationResponse = await axios.post(`${API_BASE}/notifications.php`, finalMessageObj);
      console.log("✅ Notification saved to database:", finalMessageObj.message);

      // Save log ONLY ONCE
      try {
        await axios.post(`${API_BASE}/logs.php`, finalMessageObj);
        console.log("✅ Log saved to database");
      } catch (logError) {
        console.warn("Could not save to logs:", logError.message);
      }

      const newNotification = {
        ...finalMessageObj,
        notificationId: notificationResponse.data.notificationId || 
                       notificationResponse.data.id || 
                       `mqtt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().getTime(),
        isAlert: isAlertMessage(finalMessageObj.message) || finalMessageObj.type.toLowerCase() === 'alert' || finalMessageObj.type.toLowerCase() === 'error' || finalMessageObj.type.toLowerCase() === 'warning',
        isMqtt: true,
        source: 'mqtt',
        displayMessage: `${finalMessageObj.robotName || 'Unknown Robot'} (${finalMessageObj.sectionName || 'Unknown Section'}): ${finalMessageObj.message}`
      };

      setNotifications(prev => {
        const isDuplicate = prev.some(notif => 
          notif.topic_main === newNotification.topic_main && 
          notif.message === newNotification.message && 
          notif.date === newNotification.date && 
          notif.time === newNotification.time
        );
        
        if (isDuplicate) {
          return prev;
        }
        
        const updated = [newNotification, ...prev];
        return updated.slice(0, 1000);
      });

      // Send email for alert messages
      const isVoltageAlert = finalMessageObj.message.includes('voltage is critically low');
      if (newNotification.isAlert) {
        await sendAlertEmail(robotSectionInfo, finalMessageObj.message, finalMessageObj.robotName, isVoltageAlert);
      }

      return newNotification;
    } catch (error) {
      console.error("❌ Failed to save message to database:", error);
      throw error;
    }
  };

  const processAndSaveMessage = useCallback(async (topic, messageString, robotId, sectionName, isFromButton = false, buttonName = null, robotSectionInfo = null, robotName = null, messageType = "info") => {
    const messageId = createMessageId(topic, messageString);
    
    // Check if message is already being processed or was recently processed
    if (isMessageProcessing(messageId)) {
      console.log("⏭️ Message is already being processed:", messageId);
      return null;
    }
    
    if (processedMessagesRef.current.has(messageId)) {
      console.log("⏭️ Message was already processed recently:", messageId);
      return null;
    }
    
    try {
      // Start processing this message
      startMessageProcessing(messageId);
      
      const nowDate = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toISOString().slice(11, 19);

      let trimmed = (typeof messageString === "string") ? messageString.trim() : String(messageString);

      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = trimmed.slice(1, -1);
      }

      if (!robotSectionInfo) {
        robotSectionInfo = findRobotAndSectionByTopic(topic);
      }

      let topicMain;
      if (robotSectionInfo && robotSectionInfo.section && robotSectionInfo.section.Topic_main) {
        topicMain = robotSectionInfo.section.Topic_main;
      } else {
        topicMain = findTopicMain(topic);
      }

      const finalMessageObj = {
        topic_main: topicMain, 
        message: trimmed,
        type: messageType,
        date: nowDate,
        time: nowTime,
        RobotId: robotId || (robotSectionInfo?.robot?.id),
        robotName: robotName || robotSectionInfo?.robot?.RobotName || robotSectionInfo?.robot?.robotName,
        sectionName: sectionName || robotSectionInfo?.sectionName
      };

      console.log("💾 SAVING MESSAGE (ONCE):", finalMessageObj.message);

      const notification = await saveMessageToDatabase(finalMessageObj, robotSectionInfo);
      
      // Mark as processed successfully
      processedMessagesRef.current.set(messageId, Date.now());
      
      return finalMessageObj;
    } catch (err) {
      console.error("❌ Error in processAndSaveMessage:", err);
      return null;
    } finally {
      endMessageProcessing(messageId);
    }
  }, [API_BASE, findTopicMain, findRobotAndSectionByTopic, sendAlertEmail]);

  const sendLowVoltageAlert = useCallback(async (robotName, voltage, topic, robotSectionInfo) => {
    try {
      const messageString = `⚠️ Danger: Robot "${robotName}" voltage is critically low (${voltage}V)!`;
      const messageId = createMessageId(topic, messageString);
      
      if (isMessageProcessing(messageId) || processedMessagesRef.current.has(messageId)) {
        console.log("⏭️ Skipping duplicate voltage alert");
        return;
      }
      
      const shouldShow = await shouldShowMessageToUser(robotSectionInfo);
      
      if (shouldShow) {
        if (!isToastDuplicate(messageId)) {
          markToastAsShown(messageId);
          toast.error(`⚠️ Danger Alert: Robot "${robotName}" voltage is critically low (${voltage}V)!`, {
            duration: 10000,
          });
        }
      }
      
      const msgObj = await processAndSaveMessage(
        topic,
        messageString,
        robotSectionInfo?.robot?.id,
        robotSectionInfo?.sectionName,
        false,
        null,
        robotSectionInfo,
        robotName,
        "alert"
      );
      
      if (msgObj) {
        // Send email for low voltage alert
        await sendAlertEmail(robotSectionInfo, messageString, robotName, true);
      }
      
    } catch (error) {
      console.error("❌ Failed to send low voltage alert:", error);
    }
  }, [API_BASE, shouldShowMessageToUser, processAndSaveMessage, sendAlertEmail]);

  const handleHalfCycleFinished = useCallback(async (robotId, sectionName, topic, connection, robotSectionInfo) => {
    try {
      const messageString = `Half cycle finished`;
      const messageId = createMessageId(topic, messageString);
      
      if (isMessageProcessing(messageId) || processedMessagesRef.current.has(messageId)) {
        console.log("⏭️ Skipping duplicate half-cycle");
        return;
      }
      
      startMessageProcessing(messageId);
      
      let currentRobot;
      try {
        const response = await axios.get(`${API_BASE}/robots/${robotId}`);
        currentRobot = response.data;
      } catch (error) {
        console.error("❌ Failed to fetch robot data:", error);
        currentRobot = robotsDataRef.current.find(r => r.id === robotId);
      }
      
      if (!currentRobot || !currentRobot.Sections || !currentRobot.Sections[sectionName]) {
        endMessageProcessing(messageId);
        return;
      }
      
      const currentCycles = currentRobot.Sections[sectionName]?.Cycles || 0;
      const newCycles = parseFloat(currentCycles) + 0.5;
      
      const updatedSections = {
        ...currentRobot.Sections,
        [sectionName]: {
          ...currentRobot.Sections[sectionName],
          Cycles: newCycles
        }
      };
      
      const updatePayload = {
        ...currentRobot,
        Sections: updatedSections
      };
      
      try {
        await axios.put(`${API_BASE}/robots.php/${robotId}`, updatePayload);
        
        const updatedRobot = updatePayload;
        const index = robotsDataRef.current.findIndex(r => r.id === robotId);
        if (index !== -1) {
          robotsDataRef.current[index] = updatedRobot;
          setRobotsData(prev => {
            const newData = [...prev];
            newData[index] = updatedRobot;
            return newData;
          });
        }
        
        const shouldShow = await shouldShowMessageToUser(robotSectionInfo);
        
        if (shouldShow) {
          const msg = `Half cycle finished for ${currentRobot.RobotName}. Cycles: ${newCycles}`;
          
          await processAndSaveMessage(
            topic,
            msg,
            robotId,
            sectionName,
            false,
            null,
            robotSectionInfo,
            currentRobot.RobotName
          );
          
          if (!isToastDuplicate(createMessageId(topic, msg))) {
            markToastAsShown(createMessageId(topic, msg));
            toast.success(`Half cycle finished for ${currentRobot.RobotName}. Cycles: ${newCycles}`);
          }
        }
        
      } catch (error) {
        console.error("❌ HALF CYCLE UPDATE FAILED:", error);
      }
      
      endMessageProcessing(messageId);
      
    } catch (error) {
      console.error("❌ Error in handleHalfCycleFinished:", error);
    }
  }, [API_BASE, shouldShowMessageToUser, processAndSaveMessage]);

  const findActualButtonName = useCallback((topic, buttonValue) => {
    for (const robot of robotsDataRef.current) {
      if (!robot || !robot.Sections) continue;
      
      for (const sectionKey in robot.Sections) {
        const section = robot.Sections[sectionKey];
        if (!section) continue;
        
        if (section.Topic_main === topic || section.Topic_subscribe === topic) {
          if (section.ActiveBtns && Array.isArray(section.ActiveBtns)) {
            for (const activeBtn of section.ActiveBtns) {
              if (activeBtn && activeBtn.Name && 
                  activeBtn.Name.toLowerCase() === buttonValue.toLowerCase()) {
                return activeBtn.Name;
              }
              
              if (activeBtn && activeBtn.Command && activeBtn.Command === buttonValue) {
                return activeBtn.Name;
              }
            }
          }
          
          return buttonValue;
        }
      }
    }
    
    return buttonValue;
  }, []);

  const extractAllDataFromMessage = useCallback((messageString) => {
    const statusData = {};
    
    // First, try to parse as JSON
    try {
      const parsedMessage = JSON.parse(messageString);
      if (parsedMessage.type && parsedMessage.message) {
        return {
          isJsonMessage: true,
          type: parsedMessage.type,
          message: parsedMessage.message
        };
      }
    } catch (error) {
      // Not valid JSON or not in expected format, continue with regular parsing
    }
    
    // Extract voltage
    const voltagePatterns = [
      /voltage:\s*(\d+)/i,
      /voltage\s*=\s*(\d+)/i,
      /"voltage":\s*(\d+)/i,
      /volt.*?(\d+)/i
    ];
    
    for (const pattern of voltagePatterns) {
      const voltageMatch = messageString.match(pattern);
      if (voltageMatch && voltageMatch[1]) {
        statusData.voltage = parseInt(voltageMatch[1]);
        break;
      }
    }
    
    // Extract mode
    const modePatterns = [
      /mode:\s*([a-zA-Z]+)/i,
      /mode\s*=\s*([a-zA-Z]+)/i,
      /"mode":\s*"([a-zA-Z]+)"/i,
      /status:\s*([a-zA-Z]+)/i
    ];
    
    for (const pattern of modePatterns) {
      const modeMatch = messageString.match(pattern);
      if (modeMatch && modeMatch[1]) {
        statusData.mode = modeMatch[1];
        break;
      }
    }
    
    // Check for message_status pattern
    if (messageString.includes('message_status:')) {
      const statusMatch = messageString.match(/message_status:\s*\{([^}]+)\}/i);
      if (statusMatch && statusMatch[1]) {
        const statusContent = statusMatch[1];
        
        const voltageMatch = statusContent.match(/voltage:\s*(\d+)/i);
        const modeMatch = statusContent.match(/mode:\s*([a-zA-Z]+)/i);
        
        if (voltageMatch && voltageMatch[1]) {
          statusData.voltage = parseInt(voltageMatch[1]);
        }
        
        if (modeMatch && modeMatch[1]) {
          statusData.mode = modeMatch[1];
        }
      }
    }
    
    return Object.keys(statusData).length > 0 ? statusData : null;
  }, []);

  const updateAllFieldsSeparately = useCallback(async (robotId, sectionName, updatedData) => {
    try {
      const currentRobotResponse = await axios.get(`${API_BASE}/robots/${robotId}`);
      const currentRobot = currentRobotResponse.data;
      
      const updates = [];
      
      if (updatedData.voltage !== undefined) {
        const voltagePayload = {
          ...currentRobot,
          Sections: {
            ...currentRobot.Sections,
            [sectionName]: {
              ...currentRobot.Sections[sectionName],
              Voltage: updatedData.voltage
            }
          }
        };
        
        updates.push(axios.put(`${API_BASE}/robots.php/${robotId}`, voltagePayload));
      }
      
      if (updatedData.mode !== undefined) {
        const statusPayload = {
          ...currentRobot,
          Sections: {
            ...currentRobot.Sections,
            [sectionName]: {
              ...currentRobot.Sections[sectionName],
              Status: updatedData.mode
            }
          }
        };
        
        updates.push(axios.put(`${API_BASE}/robots.php/${robotId}`, statusPayload));
      }
      
      for (let i = 0; i < updates.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        await updates[i];
      }
      
    } catch (error) {
      console.error("❌ SEPARATE UPDATES FAILED:", error);
    }
  }, [API_BASE]);

  const updateRobotSectionData = useCallback(async (robotId, sectionName, updatedData, robotName, topic, robotSectionInfo) => {
    const updateId = `update-${robotId}-${sectionName}-${Date.now()}`;
    
    if (processingMessagesRef.current.has(updateId)) {
      return;
    }
    
    processingMessagesRef.current.set(updateId, true);
    
    try {
      const currentRobotResponse = await axios.get(`${API_BASE}/robots/${robotId}`);
      const currentRobot = currentRobotResponse.data;
      
      const updatedSections = {
        ...currentRobot.Sections,
        [sectionName]: {
          ...currentRobot.Sections[sectionName],
          Voltage: updatedData.voltage !== undefined ? updatedData.voltage : currentRobot.Sections[sectionName].Voltage,
          Status: updatedData.mode !== undefined ? updatedData.mode : currentRobot.Sections[sectionName].Status,
        }
      };

      const updatePayload = {
        ...currentRobot,
        Sections: updatedSections
      };

      await axios.put(`${API_BASE}/robots.php/${robotId}`, updatePayload);
      
      if (updatedData.voltage !== undefined && updatedData.voltage < 15) {
        await sendLowVoltageAlert(robotName, updatedData.voltage, topic, robotSectionInfo);
      }
      
      setTimeout(() => {
        updateAllFieldsSeparately(robotId, sectionName, updatedData);
      }, 500);
      
    } catch (error) {
      await updateAllFieldsSeparately(robotId, sectionName, updatedData);
      
      if (updatedData.voltage !== undefined && updatedData.voltage < 15) {
        await sendLowVoltageAlert(robotName, updatedData.voltage, topic, robotSectionInfo);
      }
      
      throw error;
    } finally {
      setTimeout(() => {
        processingMessagesRef.current.delete(updateId);
      }, 3000);
    }
  }, [API_BASE, updateAllFieldsSeparately, sendLowVoltageAlert]);

  const fetchAndConnectRobots = useCallback(async () => {
    if (isInitialized) return;

    try {
      const robotsArray = await fetchInitialData();
      
      if (!robotsArray.length) {
        setIsInitialized(true);
        return;
      }
      
      let allConnections = [];
      const newClients = {};
      
      robotsArray.forEach(robot => {
        const robotConnections = extractMqttConnectionsFromRobot(robot);
        allConnections = [...allConnections, ...robotConnections];
      });
      
      if (allConnections.length === 0) {
        setIsInitialized(true);
        return;
      }
      
      allConnections.forEach(connection => {
        try {
          const connectUrl = `wss://${connection.host}:${connection.port}/mqtt`;
          
          const client = mqtt.connect(connectUrl, {
            clientId: connection.clientId,
            username: connection.username,
            password: connection.password,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000,
            keepalive: 30,
          });

          client.on("connect", () => {
            setActiveConnections(prev => {
              const existing = prev.filter(conn => 
                conn.robotId !== connection.robotId || conn.sectionName !== connection.sectionName
              );
              return [...existing, { 
                ...connection,
                connected: true,
                lastSeen: new Date().toISOString()
              }];
            });

            if (connection.topicSubscribe) {
              client.subscribe(connection.topicSubscribe, (err) => {
                if (err) {
                  console.error(`Subscribe error for ${connection.robotName}:`, err);
                }
              });
            }
          });

          client.on("message", async (topic, payload) => {
            try {
              const messageString = payload.toString();
              const messageId = createMessageId(topic, messageString);
              
              // Check if message is already being processed or was recently processed
              if (isMessageProcessing(messageId) || processedMessagesRef.current.has(messageId)) {
                return;
              }
              
              const messageLower = messageString.toLowerCase();
              const isHalfCycle = messageLower.includes('half cycle finished') || 
                                 messageString.trim() === "Half cycle finished" ||
                                 messageLower.includes('half-cycle finished');
              
              const robotSectionInfo = findRobotAndSectionByTopic(topic);
              
              // Handle half-cycle messages
              if (isHalfCycle) {
                await handleHalfCycleFinished(
                  connection.robotId, 
                  connection.sectionName, 
                  topic, 
                  connection,
                  robotSectionInfo  
                );
                return;
              }
              
              // Try to extract message_status data
              const messageData = extractAllDataFromMessage(messageString);
              
              // Handle JSON messages
              if (messageData && messageData.isJsonMessage) {
                const msgObj = await processAndSaveMessage(
                  topic, 
                  messageData.message,
                  connection.robotId, 
                  connection.sectionName,
                  false, 
                  null,
                  robotSectionInfo,
                  connection.robotName,
                  messageData.type
                );
                
                if (msgObj) {
                  const shouldShow = await shouldShowMessageToUser(robotSectionInfo);
                  
                  if (shouldShow) {
                    const robotDisplayName = msgObj.robotName || connection.robotName;
                    const isAlertType = messageData.type.toLowerCase() === 'alert' || 
                                       messageData.type.toLowerCase() === 'error' ||
                                       messageData.type.toLowerCase() === 'warning';
                    
                    if (isAlertType) {
                      if (!isToastDuplicate(messageId)) {
                        markToastAsShown(messageId);
                        toast.error(`🚨 ${robotDisplayName}`, {
                          description: messageData.message.length > 100 ? 
                            `${messageData.message.substring(0, 100)}...` : messageData.message,
                          duration: 8000,
                        });
                      }
                    } else {
                      if (!isToastDuplicate(messageId)) {
                        markToastAsShown(messageId);
                        toast.info(`ℹ️ ${robotDisplayName} (${messageData.type})`, {
                          description: messageData.message.length > 80 ? 
                            `${messageData.message.substring(0, 80)}...` : messageData.message,
                          duration: 5000,
                        });
                      }
                    }
                  }
                }
                return;
              }
              
              // Handle regular message_status data - NOT saved as notification
              if (messageData) {
                try {
                  if (robotSectionInfo) {
                    const { robot, sectionName } = robotSectionInfo;
                    
                    await updateRobotSectionData(
                      robot.id, 
                      sectionName, 
                      messageData, 
                      robot.RobotName, 
                      topic, 
                      robotSectionInfo
                    );
                  }
                } catch (error) {
                  console.error("❌ Error processing message update:", error);
                }
                return;
              }
              
              // Handle all other normal messages
              const msgObj = await processAndSaveMessage(
                topic, 
                messageString, 
                connection.robotId, 
                connection.sectionName,
                false, 
                null,
                robotSectionInfo,
                connection.robotName
              );
              
              if (msgObj) {
                const shouldShow = await shouldShowMessageToUser(robotSectionInfo);
                const isScheduleMessage = messageString.toLowerCase().includes('schedule');
                
                if (shouldShow && !(userRoleRef.current === 'user' && isScheduleMessage)) {
                  const messageLower = msgObj.message.toLowerCase();
                  const robotDisplayName = msgObj.robotName || connection.robotName;
                  
                  if (msgObj.type === "alert" || 
                      messageLower.includes('alert') || 
                      messageLower.includes('error') ||
                      messageLower.includes('critical') ||
                      messageLower.includes('warning') ||
                      messageLower.includes('fail')) {
                    
                    if (!isToastDuplicate(messageId)) {
                      markToastAsShown(messageId);
                      toast.error(`🚨 ${robotDisplayName}`, {
                        description: msgObj.message.length > 100 ? 
                          `${msgObj.message.substring(0, 100)}...` : msgObj.message,
                        duration: 8000,
                      });
                    }
                  } else {
                    if (!isToastDuplicate(messageId)) {
                      markToastAsShown(messageId);
                      toast.info(`ℹ️ ${robotDisplayName}`, {
                        description: msgObj.message.length > 80 ? 
                          `${msgObj.message.substring(0, 80)}...` : msgObj.message,
                        duration: 5000,
                      });
                    }
                  }
                }
              }

            } catch (error) {
              console.error("Error processing MQTT message:", error);
            }
          });

          client.on("error", (error) => {
            console.error(`❌ MQTT Error for ${connection.robotName} - ${connection.sectionName}:`, error);
            setActiveConnections(prev => 
              prev.map(conn => 
                (conn.robotId === connection.robotId && conn.sectionName === connection.sectionName)
                  ? { ...conn, connected: false, error: error.message }
                  : conn
              )
            );
          });

          client.on("close", () => {
            setActiveConnections(prev => 
              prev.map(conn => 
                (conn.robotId === connection.robotId && conn.sectionName === connection.sectionName)
                  ? { ...conn, connected: false }
                  : conn
              )
            );
          });

          client.on("offline", () => {
            setActiveConnections(prev => 
              prev.map(conn => 
                (conn.robotId === connection.robotId && conn.sectionName === connection.sectionName)
                  ? { ...conn, connected: false }
                  : conn
              )
            );
          });

          newClients[`${connection.robotId}-${connection.sectionName}`] = client;
          clientsRef.current[`${connection.robotId}-${connection.sectionName}`] = client;

        } catch (error) {
          console.error(`Failed to create MQTT connection for ${connection.robotName} - ${connection.sectionName}:`, error);
        }
      });

      setClients(newClients);
      setActiveConnections(allConnections.map(conn => ({ ...conn, connected: false })));
      setIsInitialized(true);
      
    } catch (error) {
      console.error("Failed to fetch robots from API:", error);
      setIsInitialized(true);
    }
  }, [API_BASE, isInitialized, fetchInitialData, extractAllDataFromMessage, updateRobotSectionData, processAndSaveMessage, findRobotAndSectionByTopic, handleHalfCycleFinished, shouldShowMessageToUser]);

  const reconnectConnection = useCallback((robotId, sectionName) => {
    const clientKey = `${robotId}-${sectionName}`;
    const client = clientsRef.current[clientKey];
    
    if (client) {
      client.end();
      
      setTimeout(() => {
        fetchAndConnectRobots();
      }, 2000);
    }
  }, [fetchAndConnectRobots]);

  const reconnectAll = useCallback(() => {
    Object.values(clientsRef.current).forEach(client => {
      if (client && client.end) {
        client.end();
      }
    });
    
    setClients({});
    clientsRef.current = {};
    setActiveConnections([]);
    setIsInitialized(false);
    
    setTimeout(() => {
      fetchAndConnectRobots();
    }, 3000);
  }, [fetchAndConnectRobots]);

  const publishMessage = useCallback((robotId, sectionName, topic, message) => {
    const clientKey = `${robotId}-${sectionName}`;
    const client = clientsRef.current[clientKey];
    
    if (!client || !client.connected) {
      console.error(`Cannot publish: No connected client for ${robotId}-${sectionName}`);
      return false;
    }
    
    try {
      client.publish(topic, message);
      return true;
    } catch (error) {
      console.error(`Publish failed for ${robotId}-${sectionName}:`, error);
      return false;
    }
  }, []);

  const publishButtonMessage = useCallback((robotId, sectionName, topic, buttonValue) => {
    try {
      const actualButtonName = findActualButtonName(topic, buttonValue);
      const finalMessage = actualButtonName;
      
      const published = publishMessage(robotId, sectionName, topic, finalMessage);
      
      const isScheduleButton = actualButtonName.toLowerCase().includes('schedule');
      const currentUserRole = userRoleRef.current;
      
      if (published && currentUserRole === 'user' && isScheduleButton) {
        toast.success(`Schedule command sent successfully to ${robotId}-${sectionName}`, {
          duration: 3000,
        });
      }
      
      if (published) {
        const robotSectionInfo = findRobotAndSectionByTopic(topic);
        const shouldShow = userRoleRef.current === 'user' ? 
          robotSectionInfo && robotSectionInfo.robot && 
          robotSectionInfo.robot.projectId : true;
        
        if (shouldShow) {
          const logMessage = {
            topic_main: findTopicMain(topic),
            message: `Button pressed: ${actualButtonName}`,
            type: "info",
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toISOString().slice(11, 19),
            RobotId: robotId,
            sectionName: sectionName,
            direction: 'outgoing'
          };
          
          axios.post(`${API_BASE}/logs.php`, logMessage).catch(err => {
            console.error("❌ Failed to save button press log:", err);
          });
        }
      }
      
      return published;
      
    } catch (e) {
      console.error("publishButtonMessage error:", e);
      return false;
    }
  }, [publishMessage, findActualButtonName, findTopicMain, API_BASE]);

  const getConnectionStatus = (robotId, sectionName) => {
    const clientKey = `${robotId}-${sectionName}`;
    const client = clientsRef.current[clientKey];
    
    if (!client) return 'disconnected';
    return client.connected ? 'connected' : 'connecting';
  };

  useEffect(() => {
    if (!isInitialized) {
      fetchAndConnectRobots();
    }
  }, [fetchAndConnectRobots, isInitialized]);

  useEffect(() => {
    return () => {
      Object.values(clientsRef.current).forEach(client => {
        if (client && client.end) {
          try {
            client.end();
          } catch (error) {
            console.error("Error ending client:", error);
          }
        }
      });
    };
  }, []);

  const value = {
    clients: clientsRef.current,
    activeConnections,
    notifications,
    reconnectAll,
    reconnectConnection,
    publishMessage,
    publishButtonMessage,
    getConnectionStatus,
    isInitialized,
    connectionCount: Object.keys(clientsRef.current).length,
    connectedCount: activeConnections.filter(conn => conn.connected).length
  };

  return (
    <MqttContext.Provider value={value}>
      {children}
    </MqttContext.Provider>
  );
}

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error("useMqtt must be used within an MqttProvider");
  }
  return context;
};