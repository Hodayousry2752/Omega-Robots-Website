import apiClient from "./apiClient";

/**
 * PUT request
 * @param {string} endpoint 
 * @param {object} data 
 */
export const putData = async (endpoint, data) => {
  try {
    const response = await apiClient.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
