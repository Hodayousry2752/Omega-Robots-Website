import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { postData } from "@/services/postServices";
import RobotMainPanel from "@/components/robots/RobotMainPanel";
import RobotTrolleyPanel from "@/components/robots/RobotTrolleyPanel";
import imageCompression from "browser-image-compression";
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

  // Function to compress image
  const compressImage = async (imageFile) => {
    try {
      
      const options = {
        maxSizeMB: 1, // Maximum size in MB
        maxWidthOrHeight: 1920, // Maximum width or height
        useWebWorker: true, // Use web worker for faster compression
        fileType: 'image/jpeg', // Force JPEG format
        initialQuality: 0.8, // Quality between 0 and 1
      };

      const compressedFile = await imageCompression(imageFile, options);
      
      
      // If still too large, compress further
      if (compressedFile.size > 1024 * 1024) {
        const furtherOptions = {
          ...options,
          maxSizeMB: 0.5,
          initialQuality: 0.6,
        };
        const furtherCompressed = await imageCompression(imageFile, furtherOptions);
        return furtherCompressed;
      }
      
      return compressedFile;
    } catch (error) {
      toast.error('Failed to compress image. Using original.');
      return imageFile;
    }
  };

  const convertImageUrlToFile = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });
      
      // Compress default image if it's large
      if (blob.size > 1024 * 1024) {
        return await compressImage(file);
      }
      
      return file;
    } catch (error) {
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
        // Final compression check before upload
        let finalImage = robot.Image;
        if (robot.Image.size > 1024 * 1024) {
          toast.info('Compressing image for upload...');
          finalImage = await compressImage(robot.Image);
        }
        fd.append("Image", finalImage);
        
        
      } else {
        try {
          const defaultImageFile = await convertImageUrlToFile(RobotImg, "Robot1.jpg");
          if (defaultImageFile) {
            fd.append("Image", defaultImageFile);
          }
        } catch (error) {
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

  const updateImage = async (file, preview) => {
    // If file is too large (> 1MB), compress it
    if (file && file.size > 1024 * 1024) {
      try {
        toast.loading('Compressing image...');
        
        const compressedFile = await compressImage(file);
        
        // Create preview from compressed file
        const compressedPreview = URL.createObjectURL(compressedFile);
        
        setRobot((prev) => ({
          ...prev,
          Image: compressedFile,
          imagePreview: compressedPreview,
        }));
        
        toast.dismiss();
        toast.success('Image compressed successfully!');
      } catch (error) {
        toast.error('Failed to compress image');
        // Fallback to original
        setRobot((prev) => ({
          ...prev,
          Image: file,
          imagePreview: preview,
        }));
      }
    } else {
      // If file is already small, use as is
      setRobot((prev) => ({
        ...prev,
        Image: file,
        imagePreview: preview,
      }));
    }
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
            <p className="text-xs text-blue-500 mt-1">
              ⚡ Images will be automatically compressed to under 1MB
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              className="bg-white border text-main-color"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-main-color text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
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