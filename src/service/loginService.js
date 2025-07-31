import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const loginEndpoint = `${API_HOST_PREFIX}/api/login`;

const userLogin = (payload) => {
  const config = {
    method: "POST",
    url: `${loginEndpoint}/login`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const loginService = {
  userLogin,
};

export default loginService;
