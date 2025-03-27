import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const makeEndpoint = `${API_HOST_PREFIX}/api/make`;

const deleteMake = (id) => {
  const config = {
    method: "DELETE",
    url: `${makeEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addMake = (payload) => {
  const config = {
    method: "POST",
    url: `${makeEndpoint}/add-new`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getMakeById = (id) => {
  const config = {
    method: "GET",
    url: `${makeEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllMakes = () => {
  const config = {
    method: "GET",
    url: `${makeEndpoint}/available`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllCompanies = () => {
  const config = {
    method: "GET",
    url: `${makeEndpoint}/companies`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const makeService = {
  deleteMake,
  addMake,
  getMakeById,
  getAllMakes,
  getAllCompanies,
};

export default makeService;
