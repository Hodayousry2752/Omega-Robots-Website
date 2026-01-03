//  putButtons.js — final version (adds + keeps + deletes)
import apiClient from "./apiClient";

export const putButtons = async (robotId, buttons) => {
  if (!robotId || !Array.isArray(buttons)) {
    throw new Error("Invalid data for updating buttons");
  }

  try {
    const allRes = await apiClient.get(`buttons.php`);
    const allButtons = Array.isArray(allRes.data)
      ? allRes.data
      : allRes.data?.data || [];

    const currentButtons = allButtons.filter(
      (btn) => String(btn.RobotId) === String(robotId)
    );

    

    const normalize = (b) => (b.BtnName ?? b.name ?? "").toLowerCase();

    const toDelete = currentButtons.filter(
      (curr) => !buttons.some((nb) => normalize(nb) === normalize(curr))
    );
    const toAdd = buttons.filter(
      (nb) => !currentButtons.some((curr) => normalize(curr) === normalize(nb))
    );
    const toKeep = buttons.filter((nb) =>
      currentButtons.some((curr) => normalize(curr) === normalize(nb))
    );

    const requests = [];

    for (const btn of toDelete) {
      const delId = btn.id ?? btn.BtnID ?? btn.BtnId;
      if (delId) {
        requests.push(apiClient.delete(`buttons.php/${delId}`));
      }
    }

    for (const btn of toAdd) {
      const payload = {
        BtnName: btn.name ?? btn.BtnName,
        RobotId: parseInt(robotId),
        Color: btn.Color ?? null,
        Operation: btn.Operation ?? "/start",
      };
      requests.push(apiClient.post(`buttons.php`, payload));
    }

    for (const btn of toKeep) {
      const existing = currentButtons.find(
        (curr) => normalize(curr) === normalize(btn)
      );
      if (existing) {
        const payload = {
          BtnName: existing.BtnName,
          RobotId: parseInt(robotId),
          Color: existing.Color,
          Operation: existing.Operation ?? "/start",
        };
        requests.push(apiClient.put(`buttons.php/${existing.id}`, payload));
      }
    }

    if (requests.length > 0) {
      await Promise.all(requests);
    } else {
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};
