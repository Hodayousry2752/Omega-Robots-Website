import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Function to generate color based on button ID
const generateColorFromId = (id) => {
  if (!id) return "#4F46E5";
  
  // Convert ID to a number and use it to generate a color
  const idNum = typeof id === 'string' ? parseInt(id, 10) || 0 : id;
  
  // Generate hue based on ID (0-360)
  const hue = (idNum * 137.508) % 360; // Using golden angle approximation
  
  // Fixed saturation and lightness for consistent colors
  const saturation = 65;
  const lightness = 50;
  
  // Convert HSL to RGB (simplified conversion)
  const h = hue / 60;
  const c = (1 - Math.abs(2 * (lightness/100) - 1)) * (saturation/100);
  const x = c * (1 - Math.abs((h % 2) - 1));
  let r, g, b;
  
  if (h >= 0 && h < 1) { [r, g, b] = [c, x, 0]; }
  else if (h >= 1 && h < 2) { [r, g, b] = [x, c, 0]; }
  else if (h >= 2 && h < 3) { [r, g, b] = [0, c, x]; }
  else if (h >= 3 && h < 4) { [r, g, b] = [0, x, c]; }
  else if (h >= 4 && h < 5) { [r, g, b] = [x, 0, c]; }
  else { [r, g, b] = [c, 0, x]; }
  
  const m = (lightness/100) - c/2;
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  // Convert to hex
  const toHex = (n) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function TrolleyPanelDetails({
  robotId,
  imgSrc = "/assets/placeholder-trolley.jpg",
  trolleyData = {},
  publish,
  client,
}) {
  const safeImgSrc = imgSrc && imgSrc.trim() !== "" ? imgSrc : "/assets/placeholder-trolley.jpg";
  const carSection = trolleyData?.Sections?.car || {};
  const [updatingButtons, setUpdatingButtons] = useState({});
  const [updatingValues, setUpdatingValues] = useState({});
  const [showMqttPassword, setShowMqttPassword] = useState(false);

  // Get storage key for this robot's trolley button visibility
  const getStorageKey = () => `robot_${trolleyData?.id}_trolley_button_visibility`;
  const getValueStorageKey = () => `robot_${trolleyData?.id}_trolley_value_visibility`;

  // Load button visibility from localStorage
  const loadButtonVisibility = () => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading button visibility:", error);
      return {};
    }
  };

  // Load value visibility from localStorage
  const loadValueVisibility = () => {
    try {
      const stored = localStorage.getItem(getValueStorageKey());
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading value visibility:", error);
      return {};
    }
  };

  // Save button visibility to localStorage
  const saveButtonVisibility = (visibilityMap) => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(visibilityMap));
    } catch (error) {
      console.error("Error saving button visibility:", error);
    }
  };

  // Save value visibility to localStorage
  const saveValueVisibility = (visibilityMap) => {
    try {
      localStorage.setItem(getValueStorageKey(), JSON.stringify(visibilityMap));
    } catch (error) {
      console.error("Error saving value visibility:", error);
    }
  };

  const getActiveButtons = () => {
    if (!carSection.ActiveBtns) return [];
    
    try {
      if (Array.isArray(carSection.ActiveBtns)) {
        return carSection.ActiveBtns;
      } else if (typeof carSection.ActiveBtns === "string") {
        return JSON.parse(carSection.ActiveBtns);
      }
    } catch (error) {
      console.error("Error parsing ActiveBtns:", error);
    }
    return [];
  };

  const activeButtons = getActiveButtons();

  // Get button color based on ID
  const getButtonColor = (btnId) => {
    return generateColorFromId(btnId);
  };

  const handleButtonClick = (btnName) => {
    console.log("🛒 Trolley Button Clicked:", btnName);
    
    if (publish) {
      publish(btnName);
      toast.success(`Sent: ${btnName}`);
    } else {
      console.log(`Would publish trolley button: ${btnName}`);
      toast.info(`Would send: ${btnName}`);
    }
  };

  // Function to update button visibility - Client-side only
  const updateButtonVisibility = (buttonId, buttonName, isVisible) => {
    try {
      setUpdatingButtons(prev => ({ ...prev, [buttonId]: true }));
      
      console.log("Updating trolley button visibility in localStorage:", { buttonId, buttonName, isVisible });
      
      // Load current visibility
      const currentVisibility = loadButtonVisibility();
      
      // Update visibility for this button
      const updatedVisibility = {
        ...currentVisibility,
        [buttonId]: isVisible
      };
      
      // Save to localStorage
      saveButtonVisibility(updatedVisibility);

      toast.success(isVisible ? "Button is now visible to users" : "Button is now hidden from users");
      
    } catch (err) {
      console.error("Error updating button visibility:", err);
      toast.error("Failed to update button visibility");
    } finally {
      setTimeout(() => {
        setUpdatingButtons(prev => ({ ...prev, [buttonId]: false }));
      }, 500);
    }
  };

  // Function to update value visibility - Client-side only
  const updateValueVisibility = (valueId, valueName, isVisible) => {
    try {
      setUpdatingValues(prev => ({ ...prev, [valueId]: true }));
      
      console.log("Updating value visibility in localStorage:", { valueId, valueName, isVisible });
      
      // Load current visibility
      const currentVisibility = loadValueVisibility();
      
      // Update visibility for this value
      const updatedVisibility = {
        ...currentVisibility,
        [valueId]: isVisible
      };
      
      // Save to localStorage
      saveValueVisibility(updatedVisibility);

      toast.success(isVisible ? `${valueName} is now visible to users` : `${valueName} is now hidden from users`);
      
    } catch (err) {
      console.error("Error updating value visibility:", err);
      toast.error("Failed to update value visibility");
    } finally {
      setTimeout(() => {
        setUpdatingValues(prev => ({ ...prev, [valueId]: false }));
      }, 500);
    }
  };

  // Check if a button is visible
  const isButtonVisible = (buttonId) => {
    const visibility = loadButtonVisibility();
    // If not in storage, default to visible (true)
    return visibility[buttonId] !== false;
  };

  // Check if a value is visible
  const isValueVisible = (valueId) => {
    const visibility = loadValueVisibility();
    // If not in storage, default to visible (true)
    return visibility[valueId] !== false;
  };

  const toggleMqttPasswordVisibility = () => {
    setShowMqttPassword(!showMqttPassword);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 transition hover:shadow-lg">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 grid grid-cols-2 gap-4">
          <ViewFieldWithVisibility 
            label="Voltage" 
            value={carSection.Voltage ?? "-"} 
            fieldId="voltage-trolley"
            isVisible={isValueVisible("voltage-trolley")}
            onVisibilityChange={(isVisible) => updateValueVisibility("voltage-trolley", "Voltage", isVisible)}
            updating={updatingValues["voltage-trolley"]}
          />
          <ViewFieldWithVisibility 
            label="Cycles" 
            value={carSection.Cycles ?? "-"} 
            fieldId="cycles-trolley"
            isVisible={isValueVisible("cycles-trolley")}
            onVisibilityChange={(isVisible) => updateValueVisibility("cycles-trolley", "Cycles", isVisible)}
            updating={updatingValues["cycles-trolley"]}
          />
          <ViewFieldWithVisibility 
            label="Status" 
            value={carSection.Status || "-"} 
            fieldId="status-trolley"
            isVisible={isValueVisible("status-trolley")}
            onVisibilityChange={(isVisible) => updateValueVisibility("status-trolley", "Status", isVisible)}
            updating={updatingValues["status-trolley"]}
          />

          {/* MQTT Credentials from car section */}
          <ViewField label="MQTT URL" value={carSection.mqttUrl || "-"} />
          <ViewField label="MQTT Username" value={carSection.mqttUsername || "-"} />
          
          {/* MQTT Password with eye icon */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">MQTT Password</label>
            <div className="border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg p-2.5 cursor-default select-none overflow-hidden relative group">
              <div className="truncate pr-8">
                {showMqttPassword ? carSection.mqttPassword || "-" : "••••••••"}
              </div>
              <button
                onClick={toggleMqttPasswordVisibility}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                title={showMqttPassword ? "Hide password" : "Show password"}
              >
                {showMqttPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          
          <ViewField label="Topic Publisher" value={carSection.Topic_main || "-"} />
          <ViewField label="Topic Subscribe" value={carSection.Topic_subscribe || "-"} />

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">Active Buttons</label>
              <span className="text-xs text-gray-400">Hover over buttons to show visibility controls</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {activeButtons.map((btn, index) => {
                const btnName = typeof btn === "object" && btn !== null ? btn.Name || btn.name || "" : btn;
                const btnId = btn.id || btnName || `btn-${index}`;
                const isVisible = isButtonVisible(btnId);
                const buttonColor = btn.Color || getButtonColor(btnId);
                
                // Skip schedule buttons in trolley section
                if (btnName.toLowerCase().includes('schedule')) {
                  return null;
                }
                
                return (
                  <div key={btnId} className="flex items-center gap-2 group">
                    {/* Main Button */}
                    <button
                      onClick={() => handleButtonClick(btnName)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border select-none cursor-pointer hover:opacity-90 transition-all min-w-[120px] justify-center"
                      style={{
                        backgroundColor: buttonColor,
                        borderColor: buttonColor,
                        color: "#fff",
                      }}
                    >
                      {btnName} ✓
                    </button>
                    
                    {/* Visibility Toggle Button - Separate element */}
                    <button
                      onClick={() => updateButtonVisibility(btnId, btnName, !isVisible)}
                      disabled={updatingButtons[btnId]}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                        updatingButtons[btnId] 
                          ? 'bg-gray-400 cursor-not-allowed opacity-100' 
                          : isVisible 
                            ? 'bg-green-500 hover:bg-green-600 cursor-pointer' 
                            : 'bg-red-500 hover:bg-red-600 cursor-pointer'
                      } opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 shadow-md border border-white`}
                      title={isVisible ? "Hide from users" : "Show to users"}
                    >
                      {updatingButtons[btnId] ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : isVisible ? (
                        <Eye className="w-4 h-4 text-white" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                );
              })}
              {activeButtons.length === 0 && (
                <div className="text-gray-500 italic text-sm">
                  No active buttons
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Original ViewField component
function ViewField({ label, value }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-1">{label}</label>
      <div className="border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg p-2.5 cursor-default select-none overflow-hidden">
        <div className="truncate" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

// New ViewField with visibility control
function ViewFieldWithVisibility({ label, value, fieldId, isVisible, onVisibilityChange, updating }) {
  return (
    <div className="flex flex-col group relative">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-500">{label}</label>
        <button
          onClick={() => onVisibilityChange(!isVisible)}
          disabled={updating}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            updating 
              ? 'bg-gray-400 cursor-not-allowed opacity-100' 
              : isVisible 
                ? 'bg-green-500 hover:bg-green-600 cursor-pointer' 
                : 'bg-red-500 hover:bg-red-600 cursor-pointer'
          } opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 shadow-md border border-white`}
          title={isVisible ? `Hide ${label} from users` : `Show ${label} to users`}
        >
          {updating ? (
            <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isVisible ? (
            <Eye className="w-3 h-3 text-white" />
          ) : (
            <EyeOff className="w-3 h-3 text-white" />
          )}
        </button>
      </div>
      <div className="border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg p-2.5 cursor-default select-none overflow-hidden">
        <div className="truncate" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}