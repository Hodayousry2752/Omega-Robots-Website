// services/robotServices.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function updateRobot(robotId, data) {
  if (!robotId) {
    console.error("Robot ID is missing for update");
    return;
  }
  
  try {
    console.log("📤 Sending UPDATE request to API:", JSON.stringify(data, null, 2));
    
    const response = await fetch(`${BASE_URL}/robots/${robotId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Update successful:", result);
    return result;
  } catch (err) {
    console.error("❌ Error updating robot:", err);
    throw err;
  }
}

export async function createRobot(data) {
  try {
    console.log("📤 Sending CREATE request to API:", JSON.stringify(data, null, 2));
    
    const response = await fetch(`${BASE_URL}/robots`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Create successful:", result);
    return result;
  } catch (err) {
    console.error("❌ Error creating robot:", err);
    throw err;
  }
}

export async function getRobot(robotId) {
  try {
    const response = await fetch(`${BASE_URL}/robots/${robotId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    throw err;
  }
}