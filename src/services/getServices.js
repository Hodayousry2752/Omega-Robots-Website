import apiClient from "./apiClient";

/**
 * GET request
 * @param {string} endpoint 
 */
export const getData = async (endpoint) => {
  try {
    const response = await apiClient.get(endpoint, { headers: { "Cache-Control": "no-cache" } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * POST request
 * @param {string} endpoint 
 * @param {object} data 
 */
export const postData = async (endpoint, data) => {
  try {
    const response = await apiClient.post(endpoint, data, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
