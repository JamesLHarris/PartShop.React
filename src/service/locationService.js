import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const locationEndpoint = `${API_HOST_PREFIX}/api/locations`;

const deleteLocation = (id) => {
  const config = {
    method: "DELETE",
    url: `${locationEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addLocation = (payload) => {
  const config = {
    method: "POST",
    url: `${locationEndpoint}/new-location`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const updateLocation = (id, payload) => {
  const config = {
    method: "PUT",
    url: `${locationEndpoint}/${id}`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllLocations = () => {
  const config = {
    method: "GET",
    url: `${locationEndpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getLocationById = (id) => {
  const config = {
    method: "GET",
    url: `${locationEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getLocationHierarchyBySiteId = (id) => {
  const config = {
    method: "GET",
    url: `${locationEndpoint}/hierarchy/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const locationService = {
  deleteLocation,
  addLocation,
  updateLocation,
  getAllLocations,
  getLocationById,
  getLocationHierarchyBySiteId,
};

export default locationService;
