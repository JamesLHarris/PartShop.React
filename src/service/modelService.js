import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const modelEndpoint = `${API_HOST_PREFIX}/api/models`;

const deleteModel = (id) => {
  const config = {
    method: "DELETE",
    url: `${modelEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addModel = (payload) => {
  const config = {
    method: "POST",
    url: `${modelEndpoint}/add-new`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getModelById = (id) => {
  const config = {
    method: "GET",
    url: `${modelEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllModelsByMakeId = (id) => {
  const config = {
    method: "GET",
    url: `${modelEndpoint}/make/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllModels = () => {
  const config = {
    method: "GET",
    url: `${modelEndpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const modelService = {
  deleteModel,
  addModel,
  getModelById,
  getAllModelsByMakeId,
  getAllModels,
};

export default modelService;
