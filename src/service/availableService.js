import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const availabilityEndpoint = `${API_HOST_PREFIX}/api/available`;

const deleteAvailable = (id) => {
  const config = {
    method: "DELETE",
    url: `${availabilityEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addAvailable = (payload) => {
  const config = {
    method: "POST",
    url: `${availabilityEndpoint}/add-catagory`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAvailableById = (id) => {
  const config = {
    method: "GET",
    url: `${availabilityEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllAvailabilities = () => {
  const config = {
    method: "GET",
    url: `${availabilityEndpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const availableService = {
  deleteAvailable,
  addAvailable,
  getAvailableById,
  getAllAvailabilities,
};

export default availableService;
