import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

axiosInstance.interceptors.response.use(
    (response) => {
        // Automatically extract the data field if it follows our backend pattern
        if (response.data && response.data.status === 'success' && 'data' in response.data) {
            return {
                ...response,
                data: response.data.data
            };
        }
        return response;
    },
    (error) => {
        // Handle error responses
        const message = error.response?.data?.message || error.message;
        console.error('API Error:', message);
        return Promise.reject(error);
    }
);

export default axiosInstance;
