// src/services/postButtons.js
import apiClient from "./apiClient";

export const postButtons = async (robotId, buttons) => {
  if (!robotId || !Array.isArray(buttons)) {
    throw new Error("Invalid data for posting buttons");
  }

  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  try {
    if (buttons.length === 0) {
      return { success: true, message: "No buttons to save" };
    }


    for (const btn of buttons) {
      const payload = {
        BtnName: btn.name,
        RobotId: parseInt(robotId),
        Color: btn.Color || "#4CAF50",
        Operation: "/start",
        projectId: 10,
      };


      await apiClient.post(`${BASE_URL}/buttons`, payload);
    }

    const res = await apiClient.get(`${BASE_URL}/buttons`);

    return { success: true, data: res.data };
  } catch (error) {
    throw error;
  }
};
