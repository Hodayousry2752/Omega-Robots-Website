import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getData } from "../../services/getServices";
import imgRobot from "../../assets/Robot1.jpg";

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getData(`${BASE_URL}/users/${id}`);
        const userData = Array.isArray(response) ? response[0] : response;
        setUser(userData);
        console.log("User details:", userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, [id]);

  if (!user) {
    return (
      <div className="p-10 text-center text-gray-600">Loading user data...</div>
    );
  }

  return (
    <motion.div
      className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-200">
        <img
          src={user.avatar || imgRobot}
          alt={user.Username}
          className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-main-color shadow-md mb-6"
        />
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {user.Username}
        </h2>

        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong className="text-main-color">Project:</strong>{" "}
            {user.ProjectName}
          </p>
          <p>
            <strong className="text-main-color">Phone:</strong>{" "}
            {user.TelephoneNumber}
          </p>
          <p>
            <strong className="text-main-color">Password:</strong>{" "}
            {user.Password}
          </p>
          <p className="text-center text-gray-500 mb-6">
            <strong className="text-main-color">Email:</strong> {user.Email}
          </p>
        </div>

        <Button
          onClick={() => navigate(-1)}
          className="mt-8 w-full flex items-center justify-center gap-2 bg-main-color text-white hover:bg-white hover:text-main-color border border-main-color rounded-xl transition-all"
        >
          <ArrowLeft size={18} /> Back
        </Button>
      </div>
    </motion.div>
  );
}
