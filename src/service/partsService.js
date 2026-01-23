import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const homeEndpoint = `${API_HOST_PREFIX}/api/home`;

const deletePart = (id) => {
  const config = {
    method: "DELETE",
    url: `${homeEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addPart = (payload) => {
  const config = {
    method: "POST",
    url: `${homeEndpoint}/add-new`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const updatePart = (payload, id) => {
  const config = {
    method: "PUT",
    url: `${homeEndpoint}/${id}`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const patchPart = (payload, id) => {
  const config = {
    method: "PATCH",
    url: `${homeEndpoint}/${id}`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getPartById = (id) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/admin/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getPartByIdCustomer = (id) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/part/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllAvailablePartsCustomer = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/available?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllParts = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/stock?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getByCategoryCustomer = (pageIndex, pageSize, categoryId) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/category/${categoryId}?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getByModelCustomer = (pageIndex, pageSize, modelId) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/model/${modelId}?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const searchPart = (params = {}) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/search`,
    params,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const partsService = {
  deletePart,
  addPart,
  updatePart,
  patchPart,
  getPartById,
  getAllAvailablePartsCustomer,
  getAllParts,
  searchPart,
  getPartByIdCustomer,
  getByCategoryCustomer,
  getByModelCustomer,
};

export default partsService;
