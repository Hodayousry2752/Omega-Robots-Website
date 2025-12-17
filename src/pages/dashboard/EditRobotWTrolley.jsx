import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getData } from "@/services/getServices";
import Loading from "@/pages/Loading";
import RobotMainPanel from "@/components/robots/RobotMainPanel";
import RobotTrolleyPanel from "@/components/robots/RobotTrolleyPanel";

export default function EditRobot() {
  const navigate = useNavigate();
  const { id: robotId } = useParams();

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL;

  const [robot, setRobot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // تم تعليق متغيرات الباسورد لأن قسم الروبوت أصبح مفتوح بدون باسورد
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

  // Fetch robot data
  useEffect(() => {
    const fetchRobot = async () => {
      try {
        setLoading(true);
        console.log("Fetching robot with ID:", robotId);

        const data = await getData(`${BASE_URL}/robots.php/${robotId}`);
        console.log("Fetched robot data:", data);

        if (!data || Object.keys(data).length === 0) {
          throw new Error("No robot data found");
        }

        const mainSection = data.Sections?.main || {};
        const carSection = data.Sections?.car || {};

        console.log("Main section:", mainSection);
        console.log("Car section:", carSection);

        const processedRobot = {
          RobotName: data.RobotName || "",
          originalImage: data.Image || null,
          Image: null,
          imagePreview: data.Image
            ? `${UPLOADS_URL}/${data.Image}`
            : "/assets/placeholder-robot.jpg",
          isTrolley: data.isTrolley == 1 || data.isTrolley === "true" || data.isTrolley === true,
          Sections: {
            main: {
              Voltage: mainSection.Voltage || "",
              Cycles: mainSection.Cycles || "",
              Status: mainSection.Status || "Stopped",
              Topic_subscribe: mainSection.Topic_subscribe || "",
              Topic_main: mainSection.Topic_main || "",
              mqttUrl: mainSection.mqttUrl || "",
              mqttUsername: mainSection.mqttUsername || "",
              mqttPassword: mainSection.mqttPassword || "",
            },
            car: null
          },
        };

        // Add car section only if it exists and isTrolley is true
        if (processedRobot.isTrolley && carSection) {
          processedRobot.Sections.car = {
            Voltage: carSection.Voltage || "",
            Cycles: carSection.Cycles || "",
            Status: carSection.Status || "Stopped",
            Topic_subscribe: carSection.Topic_subscribe || "",
            Topic_main: carSection.Topic_main || "",
            mqttUrl: carSection.mqttUrl || "",
            mqttUsername: carSection.mqttUsername || "",
            mqttPassword: carSection.mqttPassword || "",
          };
        }

        console.log("Processed robot:", processedRobot);
        setRobot(processedRobot);
      } catch (err) {
        console.error("Error fetching robot:", err);
        toast.error("Failed to load robot data.");
      } finally {
        setLoading(false);
      }
    };

    if (robotId) {
      fetchRobot();
    }
  }, [robotId, BASE_URL, UPLOADS_URL]);

  // Update functions
  const updateRobotName = (name) => {
    console.log("Updating robot name to:", name);
    setRobot((prev) => ({ ...prev, RobotName: name }));
  };

  const updateImage = (file, preview) => {
    console.log("Updating image:", file, preview);
    setRobot((prev) => ({
      ...prev,
      Image: file,
      imagePreview: preview,
    }));
  };

  const updateMainSection = (updates) => {
    const { Voltage, Cycles, Status, ...allowedUpdates } = updates;
    console.log("Updating main section (filtered):", allowedUpdates);
    setRobot((prev) => ({
      ...prev,
      Sections: {
        ...prev.Sections,
        main: {
          ...prev.Sections.main,
          ...allowedUpdates,
          Voltage: prev.Sections.main.Voltage,
          Cycles: prev.Sections.main.Cycles,
          Status: prev.Sections.main.Status,
        },
      },
    }));
  };

  const updateCarSection = (updates) => {
    const { Voltage, Cycles, Status, ...allowedUpdates } = updates;
    console.log("Updating car section (filtered):", allowedUpdates);
    setRobot((prev) => ({
      ...prev,
      Sections: {
        ...prev.Sections,
        car: {
          ...(prev.Sections.car || {}),
          ...allowedUpdates,
          Voltage: prev.Sections.car?.Voltage || "",
          Cycles: prev.Sections.car?.Cycles || "",
          Status: prev.Sections.car?.Status || "Stopped",
        },
      },
    }));
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!robot?.RobotName) {
      toast.warning("Please enter robot name");
      return;
    }

    if (!robot.Sections?.main?.mqttUrl) {
      toast.warning("Please enter MQTT URL for Robot");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      // 🔹 Required fields
      formData.append("RobotName", robot.RobotName);

      // Send isTrolley as 1 or 0 (not boolean)
      formData.append("isTrolley", robot.isTrolley ? "1" : "0");

      // 🔹 Add method override for PUT
      formData.append("_method", "PUT");

      // 🔹 Handle image
      if (robot.Image instanceof File) {
        // New image uploaded
        formData.append("Image", robot.Image);
        console.log("Sending new image file:", robot.Image.name);
      } else if (robot.originalImage) {
        // Keep original image - send the filename only
        formData.append("Image", robot.originalImage);
        console.log("Keeping original image:", robot.originalImage);
      }

      // 🔹 Build Sections object
      const sectionsData = {
        main: {
          Voltage: robot.Sections.main.Voltage || "",
          Cycles: robot.Sections.main.Cycles || "",
          Status: robot.Sections.main.Status || "Stopped",
          Topic_subscribe: robot.Sections.main.Topic_subscribe || "",
          Topic_main: robot.Sections.main.Topic_main || "",
          mqttUrl: robot.Sections.main.mqttUrl || "",
          mqttUsername: robot.Sections.main.mqttUsername || "",
          mqttPassword: robot.Sections.main.mqttPassword || "",
        }
      };

      // Include car section only if isTrolley is true
      if (robot.isTrolley && robot.Sections.car) {
        sectionsData.car = {
          Voltage: robot.Sections.car.Voltage || "",
          Cycles: robot.Sections.car.Cycles || "",
          Status: robot.Sections.car.Status || "Stopped",
          Topic_subscribe: robot.Sections.car.Topic_subscribe || "",
          Topic_main: robot.Sections.car.Topic_main || "",
          mqttUrl: robot.Sections.car.mqttUrl || "",
          mqttUsername: robot.Sections.car.mqttUsername || "",
          mqttPassword: robot.Sections.car.mqttPassword || "",
        };
      } else if (!robot.isTrolley) {
        // If isTrolley is false, ensure car section is null or removed
        sectionsData.car = null;
      }

      // 🔹 Append Sections as JSON string
      formData.append("Sections", JSON.stringify(sectionsData));

      console.log("=== SENDING DATA TO SERVER ===");
      console.log("RobotName:", robot.RobotName);
      console.log("isTrolley:", robot.isTrolley ? "1" : "0");
      console.log("Sections:", sectionsData);
      
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value instanceof File ? `File: ${value.name}` : value);
      }

      // 🔹 Send request as POST with method override
      const response = await fetch(`${BASE_URL}/robots.php/${robotId}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Update response:", result);

      if (result?.message?.toLowerCase().includes("success")) {
        toast.success("Robot updated successfully!");
        navigate(-1);
      } else {
        toast.error(result.message || "Failed to update robot info.");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Error while updating robot.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (!robot)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Robot not found
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 sm:p-10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-3">
          <div>
            <h1 className="text-3xl font-bold text-main-color">Edit Robot</h1>
            <p className="text-sm text-gray-500 mt-1">
              Robot ID: <span className="font-mono">{robotId}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              className="bg-white border text-main-color"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-main-color text-white"
            >
              {submitting ? "Saving..." : "Update Robot"}
            </Button>
          </div>
        </div>

        {/* TROLLEY SECTION - Only show if robot has trolley */}
        {robot.isTrolley && robot.Sections.car && (
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-main-color mb-2">
              Trolley Control
            </h2>
            <RobotTrolleyPanel
              carData={robot.Sections.car}
              updateCarSection={updateCarSection}
              imagePreview={robot.imagePreview}
              updateImage={updateImage}
            />
          </section>
        )}

        {/* ROBOT SECTION */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-main-color mb-2">Robot</h2>

          <div className="mt-5 space-y-6">
            {/*
              !isMainUnlocked ? (
                // Password Input Section
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-main-color mb-4">
                    Enter the password to access the robot control
                  </h3>
                  <div className="flex max-md:flex-col gap-3 items-center">
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
            />
          </div>
        </section>
      </div>
    </motion.div>
  );
}