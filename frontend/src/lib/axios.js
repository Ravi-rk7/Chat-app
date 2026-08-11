import axios from "axios";
import { API_BASE_URL } from "./env.js";
import { getAuthToken } from "./authToken.js";

export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    
})

axiosInstance.interceptors.request.use((config) => {
    const token = getAuthToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});
