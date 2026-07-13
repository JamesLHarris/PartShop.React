import axios from "axios";
import { API_HOST_PREFIX, onGlobalError, onGlobalSuccess } from "./serviceHelpers";

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

const shopifyCheckoutService = {
  createCartCheckout,
  createSinglePartCheckout,
};

export default shopifyCheckoutService;
