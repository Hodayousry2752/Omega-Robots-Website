import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import axios from "axios";
import { Bell, RefreshCw, AlertTriangle, Info } from "lucide-react";

export default function UserNotificationsTab({ robotId, sectionName }) {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [robotData, setRobotData] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

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
      console.error('Error converting time:', err);
      return { date, time }; // Return original if conversion fails
    }
  };

  const getDisplaySectionName = (section) => {
    if (section === "main") return "Robot";
    if (section === "car") return "Trolley";
    return section; 
  };

  const displaySectionName = getDisplaySectionName(sectionName);

  useEffect(() => {
    if (!robotId) {
      setError("Cannot determine robot ID");
      setLoading(false);
      return;
    }
    fetchNotesAndRobot();
  }, [robotId, sectionName]);

  const isAlertNotification = (note) => {
    // First check if there's a type field
    if (note.type === 'alert') return true;
    if (note.type === 'info') return false;
    
    // Fallback to message content checking
    const message = note.message?.toLowerCase() || '';
    return message.includes('alert') || 
           message.includes('error') || 
           message.includes('warning') ||
           message.includes('critical') ||
           message.includes('fail') ||
           message.includes('stopped') ||
           message.includes('emergency');
  };

  const filterNotesBySection = (notesData, robot, sectionName) => {
    if (!robot?.Sections?.[sectionName] || !Array.isArray(notesData)) return [];
    const topic = robot.Sections[sectionName].Topic_main;

    const filtered = notesData.filter((note) => note.topic_main === topic);

    const sorted = filtered.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA - dateTimeB;
    });

    const lastTen = sorted.slice(-10);
    return lastTen.reverse();
  };

  const fetchNotesAndRobot = async () => {
    try {
      setLoading(true);
      setError(null);

      const notesRes = await axios.get(`${API_BASE}/notifications.php`, {
        headers: { "Content-Type": "application/json" },
      });
      const allNotes = Array.isArray(notesRes.data) ? notesRes.data : [];
      setNotes(allNotes);

      const robotRes = await axios.get(`${API_BASE}/robots/${robotId}`);
      const robot = robotRes.data;
      setRobotData(robot);

      const filtered = filterNotesBySection(allNotes, robot, sectionName);
      setFilteredNotes(filtered);
    } catch (err) {
      setError(`Failed to load notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main-color mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading notifications...</p>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchNotesAndRobot}
          className="bg-main-color text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-main-color">
          Notifications - {displaySectionName} 
        </h2>
        <button
          onClick={fetchNotesAndRobot}
          className="flex items-center gap-2 bg-main-color text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">
              Total Notifications: <span className="font-bold">{filteredNotes.length}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Times displayed in Jordan Time
            </p>
          </div>
          <Bell className="w-6 h-6 text-blue-500" />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => {
            // Convert each note's time to Jordan time
            const jordanTime = convertToJordanTime(note.date, note.time);
            const isAlert = isAlertNotification(note);
            const backgroundColor = isAlert ? 'bg-red-50' : 'bg-blue-50';
            const borderColor = isAlert ? 'border-red-200' : 'border-blue-200';
            const icon = isAlert ? AlertTriangle : Info;
            const IconComponent = icon;
            const iconColor = isAlert ? 'text-red-500' : 'text-blue-500';

            return (
              <Card
                key={index}
                className={`shadow-sm border ${borderColor} ${backgroundColor} hover:shadow-md transition-shadow duration-200 gap-1`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 ${iconColor}`} />
                    <CardTitle className={`text-base font-semibold ${isAlert ? 'text-red-800' : 'text-gray-800'}`}>
                      {note.message || "No message"}
                    </CardTitle>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Date: {jordanTime.date || "Unknown"}</span>
                    <span>Time: {jordanTime.time || "Unknown"}</span>
                  </div>
                  {/* {note.topic_main && (
                    <p className="text-xs text-gray-500 mt-2">
                      Topic: {note.topic_main}
                    </p>
                  )} */}
                  {isAlert && (
                    <div className="flex items-center gap-1 mt-2">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">Alert</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No notifications found</p>
            <p className="text-gray-400 text-sm mt-1">
              No notifications available for section "{displaySectionName}" 
            </p>
            <button
              onClick={fetchNotesAndRobot}
              className="bg-main-color text-white mt-4 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}