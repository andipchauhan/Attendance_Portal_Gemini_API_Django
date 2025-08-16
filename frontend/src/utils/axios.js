import axios from 'axios';
axios.defaults.withCredentials = true;
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export default axios;
