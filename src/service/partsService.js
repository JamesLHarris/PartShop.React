import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const partsEndpoint = `${API_HOST_PREFIX}/api/home`;

const deletePart = (id) => {
  const config = {
    method: "DELETE",
    url: `${partsEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addPart = (payload) => {
  const config = {
    method: "POST",
    url: `${partsEndpoint}/add-new`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getPartById = (id) => {
  const config = {
    method: "GET",
    url: `${partsEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllAvailablePartsCustomer = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${partsEndpoint}/available?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllParts = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${partsEndpoint}/stock?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const partsService = {
  deletePart,
  addPart,
  getPartById,
  getAllAvailablePartsCustomer,
  getAllParts,
};

export default partsService;
