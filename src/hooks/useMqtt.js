import { useEffect, useState, useRef } from "react";
import axios from "axios";
import mqtt from "mqtt";

const API_BASE = "http://localhost/robots_api/api";

export default function useMqtt({ host, port, clientId, username, password }) {
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [robotsData, setRobotsData] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [usersData, setUsersData] = useState([]);

  // Fetch robots, projects, and users data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch robots data
        const robotsRes = await axios.get(`${API_BASE}/robots`);
        setRobotsData(robotsRes.data);
        
        // Fetch projects data
        const projectsRes = await axios.get(`${API_BASE}/projects`);
        setProjectsData(projectsRes.data);
        
        // Fetch users data
        const usersRes = await axios.get(`${API_BASE}/users`);
        setUsersData(usersRes.data);
        
      } catch (err) {
      }
    };
    fetchInitialData();
  }, []);

  // Helper function to send email to project users
  const sendEmailToProjectUsers = async (projectId, robotName, voltage) => {
    try {
      
      // Find project by ID
      const project = projectsData.find(p => p.projectId === projectId || p.id === projectId);
      if (!project) {
        return;
      }
      
      const projectName = project.ProjectName;
      
      // Find users in this project
      const projectUsers = usersData.filter(user => 
        user.ProjectName && user.ProjectName.trim() === projectName.trim()
      );
      
      if (projectUsers.length === 0) {
        return;
      }
      
      
      
      // Prepare email message
      const emailMessage = `⚠️ Danger Alert: Robot "${robotName}" voltage is critically low (${voltage}V)!`;
      
      // Send email to each user
      for (const user of projectUsers) {
        if (user.Email) {
          try {
            
            await axios.post(`${API_BASE}/sendEmail.php`, {
              email: user.Email,
              message: emailMessage
            });
            
          } catch (emailError) {
          }
        }
      }
      
    } catch (error) {
    }
  };

  const findActualButtonName = (topic, buttonValue) => {
    
    for (const robot of robotsData) {
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
  };

  const findTopicMain = (topic_sub) => {
    for (const robot of robotsData) {
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
  };

  const processAndSaveMessage = async (topic, messageString, isFromButton = false, buttonName = null) => {
    try {
      let finalMessageObj;
      const nowDate = new Date().toISOString().slice(0, 10);
      const nowTime = new Date().toISOString().slice(11, 19);

      let trimmed = (typeof messageString === "string") ? messageString.trim() : String(messageString);

      // 🔧 Remove extra wrapping quotes if present (e.g. "\"{...}\"")
      if (
        trimmed.startsWith('"') &&
        trimmed.endsWith('"')
      ) {
        trimmed = trimmed.slice(1, -1);
      }


      try {
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsed = JSON.parse(trimmed);
          
          if (isFromButton && buttonName) {
            finalMessageObj = {
              topic_main: parsed.topic_main || findTopicMain(topic),
              message: buttonName,
              type: parsed.type,
              date: parsed.date || nowDate,
              time: parsed.time || nowTime,
            };
          } else {
            finalMessageObj = {
              topic_main: parsed.topic_main || findTopicMain(topic),
              message: parsed.message || JSON.stringify(parsed),
              type: parsed.type,
              date: parsed.date || nowDate,
              time: parsed.time || nowTime,
            };
          }
        } else {
          if (isFromButton && buttonName) {
            finalMessageObj = {
              topic_main: findTopicMain(topic),
              message: buttonName,
              type: "info",
              date: nowDate,
              time: nowTime,
            };
          } else {
            finalMessageObj = {
              topic_main: findTopicMain(topic),
              message: trimmed,
              type: "info",
              date: nowDate,
              time: nowTime,
            };
          }
        }
      } catch (parseError) {
        if (isFromButton && buttonName) {
          finalMessageObj = {
            topic_main: findTopicMain(topic),
            message: buttonName,
            type: "info",
            date: nowDate,
            time: nowTime,
          };
        } else {
          finalMessageObj = {
            topic_main: findTopicMain(topic),
            message: trimmed,
            type: "info",
            date: nowDate,
            time: nowTime,
          };
        }
      }


      try {
        await axios.post(`${API_BASE}/notifications.php`, finalMessageObj);

        await axios.post(`${API_BASE}/logs.php`, finalMessageObj);

        setMessages(prev => [...prev, finalMessageObj]);
        
        return finalMessageObj;
      } catch (error) {
        return null;
      }

    } catch (err) {
      return null;
    }
  };

  const sendLowVoltageAlert = async (robotName, voltage, topic, robotSectionInfo) => {
    try {
      
      alert(`⚠️ Danger Alert: Robot "${robotName}" voltage is critically low (${voltage}V)!`);
      
      const alertMessage = {
        topic_main: robotSectionInfo ? findTopicMain(topic) : topic,
        message: `⚠️ Danger: Robot "${robotName}" voltage is critically low (${voltage}V)!`,
        type: "alert",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toISOString().slice(11, 19)
      };

      await axios.post(`${API_BASE}/notifications.php`, alertMessage);
      await axios.post(`${API_BASE}/logs.php`, alertMessage);
      
      // Get projectId from robotSectionInfo
      if (robotSectionInfo && robotSectionInfo.robot) {
        const projectId = robotSectionInfo.robot.projectId;
        
        // Send emails to project users
        await sendEmailToProjectUsers(projectId, robotName, voltage);
      } else {
      }
      
    } catch (error) {
    }
  };

  const updateAllFieldsSeparately = async (robotId, sectionName, updatedData) => {
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
        
        updates.push(
          axios.put(`${API_BASE}/robots.php/${robotId}`, voltagePayload)
            .then(() => console.log(``))
            .catch(err => console.error())
        );
      }
      
      // 🔥 تحديث Status
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
        
        updates.push(
          axios.put(`${API_BASE}/robots.php/${robotId}`, statusPayload)
            .then(() => console.log())
            .catch(err => console.error())
        );
      }
      
      // if (updatedData.cycles !== undefined) {
      //   const cyclesPayload = {
      //     ...currentRobot,
      //     Sections: {
      //       ...currentRobot.Sections,
      //       [sectionName]: {
      //         ...currentRobot.Sections[sectionName],
      //         Cycles: updatedData.cycles
      //       }
      //     }
      //   };
      //   
      //   updates.push(
      //     axios.put(`${API_BASE}/robots.php/${robotId}`, cyclesPayload)
      //       .then(() => console.log(`✅ CYCLES UPDATED: ${updatedData.cycles}`))
      //       .catch(err => console.error(`❌ CYCLES UPDATE FAILED:`, err))
      //   );
      // }
      
      for (let i = 0; i < updates.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        await updates[i];
      }
      
      
      
    } catch (error) {
      
    }
  };

  const updateRobotSectionData = async (robotId, sectionName, updatedData, robotName, topic, robotSectionInfo) => {
    try {
      
      
      const currentRobotResponse = await axios.get(`${API_BASE}/robots/${robotId}`);
      const currentRobot = currentRobotResponse.data;
      
      const updatedSections = {
        ...currentRobot.Sections,
        [sectionName]: {
          ...currentRobot.Sections[sectionName],
          Voltage: updatedData.voltage !== undefined ? updatedData.voltage : currentRobot.Sections[sectionName].Voltage,
          Status: updatedData.mode !== undefined ? updatedData.mode : currentRobot.Sections[sectionName].Status,
          // Cycles: updatedData.cycles !== undefined ? updatedData.cycles : currentRobot.Sections[sectionName].Cycles
        }
      };

      const updatePayload = {
        ...currentRobot,
        Sections: updatedSections
      };

      

      const response = await axios.put(`${API_BASE}/robots.php/${robotId}`, updatePayload);
      
      if (updatedData.voltage !== undefined && updatedData.voltage < 15) {
        await sendLowVoltageAlert(robotName, updatedData.voltage, topic, robotSectionInfo);
      }
      
      setTimeout(async () => {
        await updateAllFieldsSeparately(robotId, sectionName, updatedData);
      }, 500);
      
      return response.data;
    } catch (error) {
      await updateAllFieldsSeparately(robotId, sectionName, updatedData);
      
      if (updatedData.voltage !== undefined && updatedData.voltage < 15) {
        await sendLowVoltageAlert(robotName, updatedData.voltage, topic, robotSectionInfo);
      }
      
      throw error;
    }
  };

  const findRobotAndSectionByTopic = (topic) => {
    for (const robot of robotsData) {
      if (robot.Sections) {
        for (const sectionName in robot.Sections) {
          const section = robot.Sections[sectionName];
          if (section.Topic_subscribe === topic) {
            return { robot, sectionName, section };
          }
        }
      }
    }
    return null;
  };

  const extractAllDataFromMessage = (messageString) => {
    console.log();
    
    const statusData = {};
    
    const voltageMatch = messageString.match(/voltage:\s*(\d+)/i);
    if (voltageMatch) {
      statusData.voltage = parseInt(voltageMatch[1]);
    }
    
    const modeMatch = messageString.match(/mode:\s*([a-zA-Z]+)/i);
    if (modeMatch) {
      statusData.mode = modeMatch[1];
    }
    
    // const cyclesMatch = messageString.match(/cycles:\s*(\d+)/i);
    // if (cyclesMatch) {
    //   statusData.cycles = parseInt(cyclesMatch[1]);
    // }
    
    return Object.keys(statusData).length > 0 ? statusData : null;
  };

  useEffect(() => {
    if (!robotsData.length) return;

    const connectUrl = `wss://${host}:${port}/mqtt`;
    const client = mqtt.connect(connectUrl, {
      clean: true,
      connectTimeout: 4000,
      keepalive: 60,
      clientId,
      username,
      password,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setIsConnected(true);
      console.log();

      robotsData.forEach(robot => {
        if (robot.Sections) {
          Object.values(robot.Sections).forEach(section => {
            if (section.Topic_subscribe) {
              client.subscribe(section.Topic_subscribe, { qos: 0 });
              console.log();
            }
          });
        }
      });
    });

    client.on("error", (err) => console.log());

    client.on("message", async (topic, message) => {

      const messageString = message.toString();
      
      const messageData = extractAllDataFromMessage(messageString);
      
      if (messageData) {
        
        try {
          const robotSectionInfo = findRobotAndSectionByTopic(topic);
          
          if (robotSectionInfo) {
            const { robot, sectionName, section } = robotSectionInfo;
           
            
            await updateRobotSectionData(
              robot.id, 
              sectionName, 
              messageData, 
              robot.RobotName, 
              topic, 
              robotSectionInfo
            );
            
          } else {
          }
        } catch (error) {
        }
      } else {
        const msgObj = await processAndSaveMessage(topic, messageString, false, null);
        
        if (msgObj) {
        }
      }
    });

    return () => client.end();
  }, [host, port, clientId, username, password, robotsData]);

  useEffect(() => {
    if (!isConnected || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const isStatusUpdate = lastMsg.message.includes('message_status:');

    if (!isStatusUpdate) {
    }
  }, [messages, isConnected]);

  const publish = (topic, msg, isFromButton = false, buttonName = null) => {
    if (!clientRef.current) {
      return;
    }
    try {
      let finalPayload;
      let finalButtonName = buttonName;

      if (isFromButton || (typeof msg === 'string' && (msg.startsWith('/') || msg.includes('start') || msg.includes('stop')))) {
        const actualButtonName = findActualButtonName(topic, msg);
        finalButtonName = actualButtonName;
        finalPayload = actualButtonName; 
      } else {
        finalPayload = typeof msg === "object" ? JSON.stringify(msg) : String(msg);
      }

      
      clientRef.current.publish(topic, finalPayload, { qos: 0 }, (err) => {
        if (err) console.error();
        else console.log();
      });

      if (isFromButton || finalButtonName) {
        processAndSaveMessage(topic, finalPayload, true, finalButtonName).catch((e) => {
        });
      }
    } catch (e) {
    }
  };

  const publishMessageStatusUpdate = (topic, voltage, mode, cycles) => {
    const message = `message_status:{voltage:${voltage}, mode:${mode}, cycles:${cycles}}`;
    publish(topic, message, true);
  };

  const publishStructuredMessage = (topic, messageData) => {
    const structuredMessage = {
      topic_main: messageData.topic_main,
      message: messageData.message,
      type: messageData.type || "info",
      date: messageData.date || new Date().toISOString().slice(0, 10),
      time: messageData.time || new Date().toISOString().slice(11, 19)
    };
    publish(topic, JSON.stringify(structuredMessage));
  };

  const publishButtonMessage = (topic, buttonValue) => {
    try {
      
      const actualButtonName = findActualButtonName(topic, buttonValue);
      
      const finalMessage = actualButtonName;
      
      
      publish(topic, finalMessage, true, actualButtonName);
      
    } catch (e) {
    }
  };

  return {
    client: clientRef.current,
    isConnected,
    messages,
    publishMessage: publish,
    publishMessageStatusUpdate,
    publishStructuredMessage,
    publishButtonMessage,
  };
}