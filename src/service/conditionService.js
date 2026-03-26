import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const conditionEndpoint = `${API_HOST_PREFIX}/api/conditions`;

const getAllConditions = () => {
  const config = {
    method: "GET",
    url: `${conditionEndpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getConditionById = (id) => {
  const config = {
    method: "GET",
    url: `${conditionEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addCondition = (payload) => {
  const config = {
    method: "POST",
    url: conditionEndpoint,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const conditionService = {
  getAllConditions,
  getConditionById,
  addCondition,
};

export default conditionService;
