import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const siteEndpoint = `${API_HOST_PREFIX}/api/sites`;

const addSite = (payload) => {
  const config = {
    method: "POST",
    url: `${siteEndpoint}/new-site`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllSites = () => {
  const config = {
    method: "GET",
    url: `${siteEndpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const siteService = {
  addSite,
  getAllSites,
};

export default siteService;
