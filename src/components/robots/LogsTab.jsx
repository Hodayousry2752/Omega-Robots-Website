import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useLocation } from "react-router-dom";
import { Download, RefreshCw, FileText } from "lucide-react";

export default function UserLogsTab({ sectionName }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [sectionCycles, setSectionCycles] = useState(null); // 🔥 NEW: Store cycles value

  const params = useParams();
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);

  let deviceType = null;
  let deviceId = null;

  if (pathParts.includes("robotDetails")) {
    deviceType = "robot";
    deviceId = pathParts[pathParts.indexOf("robotDetails") + 1];
  } else if (pathParts.includes("trolleyDetails")) {
    deviceType = "trolley";
    deviceId = pathParts[pathParts.indexOf("trolleyDetails") + 1];
  } else if (params.id) {
    deviceId = params.id;
    deviceType = "robot";
  }

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
      return { date, time }; // Return original if conversion fails
    }
  };

  useEffect(() => {
    if (!deviceId) {
      setError("Cannot determine device ID from URL");
      setLoading(false);
      return;
    }
    fetchLogsAndDevice();
  }, [deviceId, deviceType, sectionName]);

  // 🔥 NEW: Extract cycles from device data
  useEffect(() => {
    if (deviceData && deviceData.Sections && deviceData.Sections[sectionName]) {
      const cycles = deviceData.Sections[sectionName].Cycles;
      setSectionCycles(cycles);
    }
  }, [deviceData, sectionName]);

  // 🔥 NEW: Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (deviceId) {
        fetchLogsAndDevice();
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [deviceId, deviceType, sectionName]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filterLogsBySection = (logsData, device, sectionName) => {
    if (!device?.Sections?.[sectionName] || !Array.isArray(logsData)) return [];
    const topic = device.Sections[sectionName].Topic_main;

    const filtered = logsData.filter((log) => log.topic_main === topic);

    const sorted = filtered.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA - dateTimeB;
    });

    const lastTen = sorted.slice(-10);
    return lastTen.reverse();
  };

  const fetchLogsAndDevice = async () => {
    try {
      setLoading(true);
      setError(null);

      const logsRes = await axios.get(`${API_BASE}/logs.php`, {
        headers: { "Content-Type": "application/json" },
      });
      const allLogs = Array.isArray(logsRes.data)
        ? logsRes.data
        : logsRes.data?.logs || [];
      setLogs(allLogs);

      const deviceRes = await axios.get(`${API_BASE}/${deviceType}s/${deviceId}`);
      const device = deviceRes.data;
      setDeviceData(device);

      // 🔥 NEW: Set cycles when device data is fetched
      if (device.Sections && device.Sections[sectionName]) {
        setSectionCycles(device.Sections[sectionName].Cycles);
      }

      const filtered = filterLogsBySection(allLogs, device, sectionName);
      setFilteredLogs(filtered);
    } catch (err) {
      setError(`Failed to load logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (filteredLogs.length === 0) {
      setToast({ show: true, message: "No logs available to download" });
      return;
    }

    const headers = ["Date", "Time", "Message", "Topic"];
    
    // 🔥 NEW: Create CSV content with cycles row first
    const cyclesRow = ["Total_Cycles", sectionCycles || "N/A", "", ""];
    
    const csvContent = [
      cyclesRow.join(","),
      headers.join(","),
      ...filteredLogs.map((log) => {
        // Convert to Jordan time for download
        const jordanTime = convertToJordanTime(log.date, log.time);
        return [
          `"'${jordanTime.date || ""}'"`,
          `"'${jordanTime.time || ""}'"`,
          `"${(log.message || "").replace(/"/g, '""')}"`,
          `"${log.topic_main || ""}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `logs_${deviceType}_${deviceId}_${Date.now()}.csv`;
    link.click();
    
    setToast({ show: true, message: "Logs downloaded successfully!" });
  };

  if (loading)
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main-color mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading logs...</p>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchLogsAndDevice}
          className="bg-main-color text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-main-color">
            {deviceType === "robot" ? "Robot" : "Trolley"} Logs - {sectionName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Activity logs and system events • Cycles: {sectionCycles !== null ? sectionCycles : "Loading..."}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownloadExcel}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          
          <button
            onClick={fetchLogsAndDevice}
            className="flex items-center gap-2 bg-main-color text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">
              Total Logs: <span className="font-bold">{filteredLogs.length}</span> • 
              Section Cycles: <span className="font-bold">{sectionCycles !== null ? sectionCycles : "N/A"}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Showing last 10 logs only • Read-only access • Auto-refresh every 5 seconds • Times in Jordan Time
            </p>
          </div>
          <FileText className="w-6 h-6 text-blue-500" />
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => {
            // Convert each log's time to Jordan time
            const jordanTime = convertToJordanTime(log.date, log.time);
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-main-color rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-medium">
                      {log.message || "No message"}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      <span>Date: {jordanTime.date || "Unknown"}</span>
                      <span>Time: {jordanTime.time || "Unknown"}</span>
                      {log.topic_main && (
                        <span>Topic: {log.topic_main}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No logs found</p>
            <p className="text-gray-400 text-sm mt-1">
              No logs available for section "{sectionName}"
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {filteredLogs.length > 0 && (
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Displaying {logs.length} logs • Section Cycles: {sectionCycles !== null ? sectionCycles : "N/A"}
            </span>
            <span className="text-xs bg-main-color text-white px-2 py-1 rounded">
              UTC+3
            </span>
          </div>
        </div>
      )}
    </div>
  );
}