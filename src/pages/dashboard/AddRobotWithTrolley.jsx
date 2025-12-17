import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { postData } from "@/services/postServices";
import RobotMainPanel from "@/components/robots/RobotMainPanel";
import RobotTrolleyPanel from "@/components/robots/RobotTrolleyPanel";
import RobotImg from "../../assets/Robot1.jpg";

export default function AddRobotWithTrolley() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const type = location.state?.type || "withTrolley";
  const showTrolley = type === "withTrolley";
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [robot, setRobot] = useState({
    RobotName: "",
    Image: null,
    imagePreview: RobotImg, 
    Sections: {
      main: {
        Voltage: "0",
        Cycles: "0", 
        Status: "stopped",
        ActiveBtns: [],
        Topic_subscribe: "",
        Topic_main: "",
        mqttUrl: "",
        mqttUsername: "",
        mqttPassword: "",
      },
      car: showTrolley
        ? {
            Voltage: "0",
            Cycles: "0",
            Status: "stopped",
            ActiveBtns: [],
            Topic_subscribe: "",
            Topic_main: "",
            mqttUrl: "",
            mqttUsername: "",
            mqttPassword: "",
          }
        : {},
    },
  });

  /*
  const [isMainUnlocked, setIsMainUnlocked] = useState(false);
  const [mainPassword, setMainPassword] = useState("");

  const MAIN_PASSWORD = "#aoxns@343.";

  const handlePasswordSubmit = () => {
    if (mainPassword === MAIN_PASSWORD) {
      setIsMainUnlocked(true);
      toast.success("Robot section has been successfully opened.");
      setMainPassword("");
    } else {
      toast.error("Incorrect password");
      setMainPassword("");
    }
  };
  */

  const convertImageUrlToFile = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error("Error converting image to file:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!robot.RobotName) return toast.warning("Please enter robot name");
    if (!robot.Sections.main.mqttUrl) return toast.warning("Please enter MQTT URL for Robot");

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("RobotName", robot.RobotName);
      fd.append("projectId", Number(id));
      fd.append("isTrolley", showTrolley ? 1 : 0);
      
      // Prepare sections with their own MQTT credentials
      const sectionsToSend = {
        main: {
          ...robot.Sections.main,
          Voltage: "0",
          Cycles: "0",
          Status: "stopped"
        }
      };

      if (showTrolley) {
        sectionsToSend.car = {
          ...robot.Sections.car,
          Voltage: "0",
          Cycles: "0",
          Status: "stopped"
        };
      }
      
      fd.append("Sections", JSON.stringify(sectionsToSend));

      if (robot.Image) {
        fd.append("Image", robot.Image);
      } else {
        try {
          const defaultImageFile = await convertImageUrlToFile(RobotImg, "Robot1.jpg");
          if (defaultImageFile) {
            fd.append("Image", defaultImageFile);
            console.log("✅ Default image added to robot");
          }
        } catch (error) {
          console.error("Failed to add default image:", error);
        }
      }

      const res = await fetch(`${BASE_URL}/robots`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (data.success || data.message?.toLowerCase().includes("success")) {
        toast.success("Robot saved successfully!");
        navigate(-1);
      } else {
        toast.error(data.message || "Failed to save robot.");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save robot.");
    } finally {
      setLoading(false);
    }
  };

  const updateMainSection = (updates) => {
    const { Voltage, Cycles, Status, ...allowedUpdates } = updates;
    setRobot((prev) => ({
      ...prev,
      Sections: {
        ...prev.Sections,
        main: { 
          ...prev.Sections.main, 
          ...allowedUpdates,
          Voltage: "0",
          Cycles: "0",
          Status: "stopped"
        },
      },
    }));
  };

  const updateCarSection = (updates) => {
    const { Voltage, Cycles, Status, ...allowedUpdates } = updates;
    setRobot((prev) => ({
      ...prev,
      Sections: {
        ...prev.Sections,
        car: { 
          ...prev.Sections.car, 
          ...allowedUpdates,
          Voltage: "0",
          Cycles: "0",
          Status: "stopped"
        },
      },
    }));
  };

  const updateRobotName = (name) => {
    setRobot((prev) => ({ ...prev, RobotName: name }));
  };

  const updateImage = (file, preview) => {
    setRobot((prev) => ({
      ...prev,
      Image: file,
      imagePreview: preview,
    }));
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 sm:p-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-main-color">Add Robot</h1>
            <p className="text-sm text-gray-500 mt-1">
              Project ID: <span className="font-mono">{id || "-"}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              className="bg-white border text-main-color"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-main-color text-white">
              Save
            </Button>
          </div>
        </div>

        {/* TROLLEY SECTION */}
        {showTrolley && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-main-color">
                  Trolley Control
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Manage trolley controls, schedule and logs
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              <RobotTrolleyPanel
                carData={robot.Sections.car}
                updateCarSection={updateCarSection}
                imagePreview={robot.imagePreview}
                updateImage={updateImage}
                fixedFields={true}
              />
            </div>
          </section>
        )}

        {/* ROBOT SECTION */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-main-color">Robot</h2>
              <p className="text-sm text-gray-500 mt-1">
                Robot settings, controls & logs
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            {/*
              !isMainUnlocked ? (
                // Password Input Section
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-main-color mb-4">
                    Enter the password to access the robot control{" "}
                  </h3>
                  <div className="flex gap-3 items-center">
                    <input
                      type="password"
                      value={mainPassword}
                      onChange={(e) => setMainPassword(e.target.value)}
                      placeholder="Enter the password"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-color"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handlePasswordSubmit();
                        }
                      }}
                    />
                    <Button
                      onClick={handlePasswordSubmit}
                      className="bg-main-color text-white"
                    >
                      open
                    </Button>
                  </div>
                </div>
              ) : (
                // Main Control Section (Unlocked)
                <RobotMainPanel
                  mainData={robot.Sections.main}
                  updateMainSection={updateMainSection}
                  robotName={robot.RobotName}
                  updateRobotName={updateRobotName}
                  imagePreview={robot.imagePreview}
                  updateImage={updateImage}
                  fixedFields={true}
                />
              )
            */}
            
            {/* Main Control Section */}
            <RobotMainPanel
              mainData={robot.Sections.main}
              updateMainSection={updateMainSection}
              robotName={robot.RobotName}
              updateRobotName={updateRobotName}
              imagePreview={robot.imagePreview}
              updateImage={updateImage}
              fixedFields={true}
            />
          </div>
        </section>
      </div>
    </motion.div>
  );
}