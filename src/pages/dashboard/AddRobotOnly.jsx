import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import RobotMainPanel from "@/components/robots/RobotMainPanel";
import { postData } from "@/services/postServices";
import imageCompression from "browser-image-compression";

import RobotImg from "../../assets/Robot1.jpg";

export default function AddRobotOnly() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [robot, setRobot] = useState({
    RobotName: "",
    Image: null,
    imagePreview: RobotImg, 
    projectId: id || "",
    isTrolley: false,
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
    },
  });

  const [loading, setLoading] = useState(false);

  // Function to compress image
  const compressImage = async (imageFile) => {
    try {
      
      const options = {
        maxSizeMB: 1, // Maximum size in MB (less than 1 MB)
        maxWidthOrHeight: 1920, // Maximum width or height (maintains aspect ratio)
        useWebWorker: true, // Use web worker for faster compression
        fileType: 'image/jpeg', // Force JPEG format for better compression
        initialQuality: 0.8, // Quality between 0 and 1
      };

      const compressedFile = await imageCompression(imageFile, options);
      
      
      // If still too large, compress further with lower quality
      if (compressedFile.size > 1024 * 1024) { // If still > 1MB
        const furtherOptions = {
          ...options,
          maxSizeMB: 0.5, // Target 0.5 MB
          initialQuality: 0.6,
        };
        const furtherCompressed = await imageCompression(imageFile, furtherOptions);
        return furtherCompressed;
      }
      
      return compressedFile;
    } catch (error) {
      toast.error('Failed to compress image. Using original.');
      return imageFile; // Fallback to original image
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

  const updateRobotName = (name) => {
    setRobot((prev) => ({ ...prev, RobotName: name }));
  };

  const updateImage = async (file, preview) => {
    // If file is too large (> 1MB), compress it
    if (file && file.size > 1024 * 1024) {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
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

  const handleSave = async () => {
    if (!robot.RobotName.trim())
      return toast.error("Please enter a robot name!");
    if (!robot.Sections.main.mqttUrl.trim()) 
      return toast.error("Please enter MQTT URL for Robot!");
    if (!robot.projectId) return toast.error("Project ID is missing!");

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("RobotName", robot.RobotName.trim());
      fd.append("projectId", robot.projectId);
      fd.append("isTrolley", robot.isTrolley ? 1 : 0);
      
      const sectionsToSend = {
        main: {
          ...robot.Sections.main,
          Voltage: "0",
          Cycles: "0",
          Status: "stopped"
        }
      };
      
      fd.append("Sections", JSON.stringify(sectionsToSend));

      if (robot.Image) {
        // Final check: if image is still too large, compress one more time
        let finalImage = robot.Image;
        if (robot.Image.size > 1024 * 1024) {
          toast.info('Final compression...');
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
        toast.success("Robot added successfully!");
        navigate(-1);
      } else {
        toast.error(data.message || "Something went wrong!");
      }
    } catch (err) {
      toast.error("Failed to save robot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-5xl mx-auto space-y-10">
        {/* ------- Header ------- */}
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-main-color text-white hover:bg-main-color/90"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* ------- Robot Section ------- */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-main-color">Robot</h2>
              <p className="text-sm text-gray-500 mt-1">
                Robot settings, controls & logs
              </p>
              <p className="text-xs text-blue-500 mt-1">
                ⚡ Images will be automatically compressed to under 1MB
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