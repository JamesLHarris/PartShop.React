import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const modelEndpoint = `${API_HOST_PREFIX}/api/catagory`;

const deleteCatagory = (id) => {
  const config = {
    method: "DELETE",
    url: `${modelEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addCatagory = (payload) => {
  const config = {
    method: "POST",
    url: `${modelEndpoint}/add-catagory`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getCatagoryById = (id) => {
  const config = {
    method: "GET",
    url: `${modelEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllCatagories = () => {
  const config = {
    method: "GET",
    url: `${modelEndpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const catagoryService = {
  deleteCatagory,
  addCatagory,
  getCatagoryById,
  getAllCatagories,
};

export default catagoryService;
