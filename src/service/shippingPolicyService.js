import axios from "axios";
import {
  API_HOST_PREFIX,
  onGlobalSuccess,
  onGlobalError,
} from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/shippingpolicies`;

const getAllShippingPolicies = () => {
  const config = {
    method: "GET",
    url: `${endpoint}/all`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const shippingPolicyService = { getAllShippingPolicies };
export default shippingPolicyService;
