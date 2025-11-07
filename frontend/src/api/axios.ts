import axios from "axios";

const api = axios.create({
  baseURL: "/api", // o Nginx vai redirecionar isso automaticamente pro backend:3000
});

export default api;
