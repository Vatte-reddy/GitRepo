import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeRepository = (repoUrl) => {
  return apiClient.post('/analyze', { repo_url: repoUrl });
};

export default apiClient;
