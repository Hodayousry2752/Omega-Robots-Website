import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getData } from "@/services/getServices";

export default function TrolleySettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [robot, setRobot] = useState(null);
  const [carButtons, setCarButtons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const MAIN_COLOR = "#0d9488";


  const getButtonColor = (color) => color?.trim() || MAIN_COLOR;

  const extractButtonId = (btn) => {
    if (!btn) return null;
    if (typeof btn === "object") return btn.id || btn.Name || btn.BtnName;
    if (typeof btn === "string") return btn;
    return null;
  };

  const fetchButtonDetails = async (btn) => {
    const btnId = extractButtonId(btn);
    if (!btnId) return null;
    try {
      const btnDetails = await getData(`${BASE_URL}/buttons/${btnId}`);
      return {
        id: btnId,
        name: btnDetails.BtnName || btn.Name || btn.BtnName || btn.id || btn,
        color: getButtonColor(btnDetails.Color),
        section: "car",
      };
    } catch (err) {
      return {
        id: btnId,
        name: btn.Name || btn.BtnName || btn.id || btn,
        color: getButtonColor(btn.Color),
        section: "car",
      };
    }
  };

  const fetchData = async () => {
    if (!id) {
      setError("No robot ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const robotData = await getData(`${BASE_URL}/robots/${id}`);
      
      setRobot(robotData);

      const carBtns = [];

      // Car buttons (trolley)
      if (robotData.isTrolley === 1 && robotData.Sections?.car?.ActiveBtns) {
        for (const btn of robotData.Sections.car.ActiveBtns) {
          const detailedBtn = await fetchButtonDetails(btn);
          if (detailedBtn) carBtns.push(detailedBtn);
        }
      } else {
      }

      setCarButtons(carBtns);

    } catch (err) {
      setError(`Failed to load trolley data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setError("No robot ID provided in URL");
      setLoading(false);
    }
  }, [id]);

  const handleButtonClick = (btn) => {
    const btnId = extractButtonId(btn);
    if (!btnId) return alert("Invalid button data (missing id or name)");
    navigate(`/homeDashboard/trolleySettings/${id}/button/${btnId}`);
  };

  const handleAddButton = () => {
    navigate(`/homeDashboard/trolleySettings/${id}/button/new`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-color mx-auto mb-4"></div>
          Loading trolley data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
        <div className="w-full max-w-4xl mx-auto mb-6">
          <Button
            onClick={handleBack}
            className="flex items-center gap-2 bg-main-color text-white hover:bg-white hover:text-main-color border border-main-color transition-all duration-200"
          >
            <ArrowLeft size={18} /> Back
          </Button>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Trolley Settings</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchData} className="bg-main-color text-white">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <div className="w-full max-w-4xl mx-auto mb-6">
        <Button
          onClick={handleBack}
          className="flex items-center gap-2 bg-main-color text-white hover:bg-white hover:text-main-color border border-main-color transition-all duration-200"
        >
          <ArrowLeft size={18} /> Back
        </Button>
      </div>

      <h1 className="text-3xl font-bold text-center mb-10 text-gray-800">
        {robot?.RobotName} - Trolley Settings
      </h1>

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Trolley Buttons */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-purple-700 mb-2">Trolley Buttons</h3>
            <p className="text-gray-500">Total buttons: {carButtons.length}</p>
          </div>
          {carButtons.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-4">
              {carButtons.map((btn) => (
                <Button
                  key={btn.id}
                  onClick={() => handleButtonClick(btn)}
                  style={{ backgroundColor: btn.color, color: "#fff", border: `2px solid ${btn.color}` }}
                  className="px-6 py-3 rounded-xl text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 min-w-[100px] hover:scale-105 cursor-pointer"
                >
                  {btn.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No active buttons for trolley</p>
              <p className="text-sm text-gray-400">
                The robot exists but doesn't have trolley buttons configured.
              </p>
            </div>
          )}
        </div>

        {/* Add New Trolley Button */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-purple-700 mb-2">Add New Trolley Button</h3>
            <p className="text-gray-500">Add a new button to the trolley section</p>
          </div>
          <div className="flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Create custom buttons for your trolley with specific operations and colors.
              </p>
            </div>

            <div className="flex gap-3 justify-center mt-4">
              <Button
                onClick={handleAddButton}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 bg-purple-600 text-white border-2 border-purple-600 hover:bg-purple-700 transition-all cursor-pointer"
              >
                <PlusCircle size={18} /> Add New Trolley Button
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}