import axios from "axios";
import {
  API_HOST_PREFIX,
  onGlobalError,
  onGlobalSuccess,
} from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/shopify/checkout`;

const createCartCheckout = (items) => {
  const payload = {
    items: (items || []).map((item) => ({
      partId: Number(item.partId ?? item.id),
      quantity: Number(item.quantity ?? item.qty ?? 1),
    })),
  };

  return axios
    .post(`${endpoint}/cart`, payload)
    .then(onGlobalSuccess)
    .catch(onGlobalError);
};

const createSinglePartCheckout = (partId, quantity = 1) => {
  return createCartCheckout([{ partId, quantity }]);
};

const getCheckoutStatus = (checkoutToken) => {
  return axios
    .get(`${endpoint}/status/${encodeURIComponent(checkoutToken)}`)
    .then(onGlobalSuccess)
    .catch(onGlobalError);
};

const shopifyCheckoutService = {
  createCartCheckout,
  createSinglePartCheckout,
  getCheckoutStatus,
};

export default shopifyCheckoutService;
