import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import axios from "axios";
import { Trash2, X, Loader, Bell, AlertTriangle } from "lucide-react";

export default function NotificationsTab({ robotId, sectionName }) {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [robotData, setRobotData] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // Helper function to convert Egypt time to Jordan time
  const convertToJordanTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return { date: dateStr, time: timeStr };
    
    try {
      // Parse as Egypt time (UTC+2)
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      
      // Create date in Egypt time (assuming Egypt is UTC+2)
      const egyptTime = new Date(Date.UTC(year, month - 1, day, hours - 2, minutes, seconds || 0));
      
      // Convert to Jordan time (UTC+3) by adding 1 hour
      const jordanTime = new Date(egyptTime.getTime() + (60 * 60 * 1000));
      
      // Format back to strings
      const jordanDate = jordanTime.toISOString().split('T')[0];
      const jordanTimeStr = jordanTime.toISOString().split('T')[1].substring(0, 8);
      
      return { date: jordanDate, time: jordanTimeStr };
    } catch (error) {
      console.error("Error converting time:", error);
      return { date: dateStr, time: timeStr };
    }
  };

  useEffect(() => {
    if (!robotId) {
      setError("Cannot determine robot ID");
      setLoading(false);
      return;
    }
    fetchNotesAndRobot();
  }, [robotId, sectionName]);

  // 🔥 NEW: Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (robotId) {
        fetchNotesAndRobot();
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [robotId, sectionName]);

  const extractNoteId = (note) => {
    return (
      note.notificationId ||
      note.id ||
      note.notification_id ||
      note.Id ||
      note.ID ||
      null
    );
  };

  const isAlertNotification = (note) => {
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
console.log(filtered)
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
      console.log("lkjhgfdsdfghjk",filtered)
    } catch (err) {
      setError(`Failed to load notifications or robot data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (note) => {
    const noteId = extractNoteId(note);
    if (!noteId) return alert("Cannot delete: Invalid ID");
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      setDeletingId(noteId);
      await axios.delete(`${API_BASE}/notifications/${noteId}`);

      setNotes((prev) => prev.filter((n) => extractNoteId(n) !== noteId));
      setFilteredNotes((prev) =>
        prev.filter((n) => extractNoteId(n) !== noteId)
      );
    } catch (err) {
      alert("Failed to delete notification: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!filteredNotes.length) return alert("No notifications to delete");
    if (
      !confirm(
        `Are you sure you want to delete all ${filteredNotes.length} notifications?`
      )
    )
      return;

    try {
      setClearingAll(true);
      for (const note of filteredNotes) {
        const noteId = extractNoteId(note);
        if (noteId) await axios.delete(`${API_BASE}/notifications/${noteId}`);
      }

      setNotes((prev) => prev.filter((n) => !filteredNotes.includes(n)));
      setFilteredNotes([]);
      alert("All notifications cleared successfully");
    } catch (err) {
      alert("Error while clearing notifications: " + err.message);
    } finally {
      setClearingAll(false);
    }
  };

  if (loading)
    return (
      <p className="text-center py-10 text-gray-500">
        Loading notifications for robot {robotId}...
      </p>
    );

  if (error)
    return (
      <div className="text-center py-5">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchNotesAndRobot}
          className="bg-main-color text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );

  return (
    <div className="p-4 pb-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-main-color">
          Robot Notifications - Section "{sectionName}"
        </h2>

        {filteredNotes.length > 0 && (
          <button
            onClick={handleClearAllNotifications}
            disabled={clearingAll}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {clearingAll ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Clear All ({filteredNotes.length})
          </button>
        )}
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          Total Notifications: {filteredNotes.length} • Auto-refresh every 5 seconds
        </p>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note, index) => {
            const noteId = extractNoteId(note);
            const isAlert = note.type === "alert";
            const backgroundColor = isAlert ? 'bg-red-50' : 'bg-blue-50';
            const borderColor = isAlert ? 'border-red-200' : 'border-blue-200';
            const iconColor = isAlert ? 'text-red-500' : 'text-main-color';
            const { date, time } = convertToJordanTime(note.date, note.time);

            return (
              <Card
                key={noteId || index}
                className={`shadow-md border ${borderColor} ${backgroundColor} p-2 relative gap-2`}
              >
                <button
                  onClick={() => handleDeleteNotification(note)}
                  disabled={deletingId === noteId}
                  className="absolute top-3 right-3 p-2 text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                  title="Delete this notification"
                >
                  {deletingId === noteId ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-1">
                    {isAlert ? (
                      <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
                    ) : (
                      <Bell className={`w-5 h-5 ${iconColor}`} />
                    )}
                    <CardTitle className={`text-lg ${isAlert ? 'text-red-800' : 'text-main-color'}`}>
                      {note.message}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className={`text-sm ${isAlert ? 'text-red-600' : 'text-gray-600'}`}>
                    Date: {date} | Time: {time} (UTC+3)
                  </p>
                  {isAlert && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">Alert Notification</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>No notifications found for section "{sectionName}"</p>
            <button
              onClick={fetchNotesAndRobot}
              className="bg-main-color text-white mt-3 px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}