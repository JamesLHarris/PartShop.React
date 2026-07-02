import axios from "axios";
import { API_HOST_PREFIX, onGlobalError, onGlobalSuccess } from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/shopify/orders`;

const getRecent = (view = "awaitingShipment", first = 25) => {
  const config = {
    params: { view, first },
  };

  return axios
    .get(`${endpoint}/recent`, config)
    .then(onGlobalSuccess)
    .catch(onGlobalError);
};

const syncRecentPaid = (first = 25) => {
  const config = {
    params: { first },
  };

  return axios
    .post(`${endpoint}/sync-recent-paid`, null, config)
    .then(onGlobalSuccess)
    .catch(onGlobalError);
};

const shopifyOrderService = { getRecent, syncRecentPaid };

export default shopifyOrderService;
