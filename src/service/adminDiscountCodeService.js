import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/admin/discounts`;

const scrubParams = (params) => {
  const clean = { ...params };

  Object.keys(clean).forEach((key) => {
    const value = clean[key];

    if (value === "" || value === null || value === undefined) {
      delete clean[key];
    }
  });

  return clean;
};

const addDiscountCode = (payload) => {
  const config = {
    method: "POST",
    url: endpoint,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getDiscountCodeById = (id) => {
  const config = {
    method: "GET",
    url: `${endpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getDiscountCodesPaginated = (pageIndex, pageSize, filters = {}) => {
  const config = {
    method: "GET",
    url: `${endpoint}/paginate`,
    params: scrubParams({ pageIndex, pageSize, ...filters }),
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const markShopifyCreated = (id, payload) => {
  const config = {
    method: "PUT",
    url: `${endpoint}/${id}/shopify-created`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const deactivateDiscountCode = (id, payload) => {
  const config = {
    method: "PUT",
    url: `${endpoint}/${id}/deactivate`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const adminDiscountCodeService = {
  addDiscountCode,
  getDiscountCodeById,
  getDiscountCodesPaginated,
  markShopifyCreated,
  deactivateDiscountCode,
};

export default adminDiscountCodeService;
