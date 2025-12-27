import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import axios from "axios";

export default function RobotCard({ robot, onView }) {
  const [imageSrc, setImageSrc] = useState("");
  const [imageError, setImageError] = useState(false);
  const [buttonsColors, setButtonsColors] = useState({}); // store BtnID -> Color map

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;

  // Fetch button colors from buttons.php
  useEffect(() => {
    const fetchButtonColors = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/buttons.php`);
        const colorsMap = {};
        res.data.forEach((btn) => {
          colorsMap[btn.BtnID] = btn.Color || null;
        });
        setButtonsColors(colorsMap);
      } catch (err) {
      }
    };
    fetchButtonColors();
  }, []);

  if (!robot) {
    return (
      <div className="bg-white border border-gray-100 shadow-md rounded-2xl p-6 text-center">
        <p className="text-gray-500">No robot data from API</p>
      </div>
    );
  }

  const { 
    Image, 
    RobotName, 
    Sections = {}, 
    isTrolley 
  } = robot;

  const mainSection = Sections?.main || {};
  let activeBtns = [];

  try {
    if (Array.isArray(mainSection.ActiveBtns)) {
      activeBtns = mainSection.ActiveBtns;
    } else if (typeof mainSection.ActiveBtns === "string") {
      activeBtns = JSON.parse(mainSection.ActiveBtns);
    }
  } catch {
    activeBtns = [];
  }

  // Handle image source
  useEffect(() => {
    if (!Image || Image === "" || Image === "Array" || Image === "null") {
      setImageSrc("/default-robot.jpg");
    } else if (Image.startsWith("http")) {
      setImageSrc(Image);
    } else {
      setImageSrc(`${UPLOADS_URL}/${Image}`);
    }
  }, [Image]);

  const handleImageError = () => {
    setImageError(true);
    setImageSrc("/default-robot.jpg");
  };

  return (
    <div
      onClick={onView}
      className="group bg-white border border-gray-100 shadow-md rounded-2xl 
      overflow-hidden hover:shadow-xl hover:-translate-y-1 
      transition-all duration-500 flex flex-col cursor-pointer"
    >
      {/* Robot Image */}
      <div className="relative overflow-hidden">
        <img
          src={imageSrc ? imageSrc :"/default-robot.jpg"}
          alt={RobotName || "Robot"}
          className="h-56 w-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          onError={handleImageError}
          loading="lazy"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent 
          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        ></div>
      </div>

      {/* Robot Content */}
      <div className="p-6 flex flex-col justify-between grow">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-main-color transition-colors duration-300">
            {RobotName || "Unnamed Robot"}
          </h3>

          <div className="space-y-2 text-sm text-gray-600">
            <p className="leading-relaxed">
              Voltage: <span className="font-semibold">{mainSection.Voltage || "0"}V</span> — 
              Cycles: <span className="font-semibold">{mainSection.Cycles || "0"}</span>
            </p>

            <div className="leading-relaxed">
              Status:{" "}
              <span
                className={`font-semibold ${
                  mainSection.Status === "Running"
                    ? "text-green-600"
                    : mainSection.Status === "Idle"
                    ? "text-yellow-600"
                    : "text-gray-600"
                }`}
              >
                {mainSection.Status || "Unknown"}
              </span>
            </div>

            {/* <div className="leading-relaxed flex items-center gap-1">
              <span>Trolley:</span>
              <span className="font-semibold">
                {isTrolley ? (
                  <span className="text-green-600 flex items-center gap-1">🟢 Yes</span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">🔴 No</span>
                )}
              </span>
            </div> */}

            {/* Active Buttons with colors from buttons.php */}
            {/* <div className="mt-2">
              {activeBtns.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeBtns.map((btn, i) => {
                    const btnLabel = btn?.Name || btn?.name || `Button ${i + 1}`;
                    // Match robot button id with buttons.php BtnID
                    const btnColor = buttonsColors[btn.id];
                    return (
                      <span
                        key={btn?.id || i}
                        className={`px-3 py-1 rounded text-xs font-medium text-white border`}
                        style={{
                          backgroundColor: btnColor || "#cccccc",
                          borderColor: btnColor || "#999999",
                        }}
                      >
                        {btnColor ? btnLabel : `${btnLabel} (Unavailable)`}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-gray-400 text-xs italic">No active buttons</span>
              )}
            </div> */}
          </div>
        </div>

        <Button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="mt-6 bg-main-color text-white border border-main-color 
          hover:bg-white hover:text-main-color 
          hover:shadow-md transition-all duration-300 rounded-full"
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
