import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/refunds`;

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

const addRefundRequest = (payload) => {
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

const getRefundRequestById = (id) => {
  const config = {
    method: "GET",
    url: `${endpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getRefundRequestsPaginated = (pageIndex, pageSize, filters = {}) => {
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

const getReturnReasons = () => {
  const config = {
    method: "GET",
    url: `${endpoint}/reasons`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getReturnStatuses = () => {
  const config = {
    method: "GET",
    url: `${endpoint}/statuses`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const updateRefundRequestStatus = (id, payload) => {
  const config = {
    method: "PATCH",
    url: `${endpoint}/${id}/status`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};



const getShopifyOrderForRefund = (id) => {
  const config = {
    method: "GET",
    url: `${endpoint}/${id}/shopify-order`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const matchShopifyItems = (id, items) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/match-shopify-items`,
    data: { items },
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getRefundEligibility = (id) => {
  const config = {
    method: "GET",
    url: `${endpoint}/${id}/eligibility`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const applyRefundDecision = (id, payload) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/decision`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const sendRefundDecisionEmail = (id) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/decision-email`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const saveReturnLabel = (id, formData) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/return-label`,
    data: formData,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "multipart/form-data" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const sendReturnLabelEmail = (id) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/return-label-email`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const updateReturnTracking = (id, payload) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/return-tracking`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const markReturnDelivered = (id, payload) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/return-delivered`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const markReturnItemReceived = (id, payload) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/item-received`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const completeReturnInspection = (id, payload) => {
  const config = {
    method: "POST",
    url: `${endpoint}/${id}/inspection`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const submitCustomerReturnRequest = (formData) => {
  const config = {
    method: "POST",
    url: `${endpoint}/customer-submit`,
    data: formData,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "multipart/form-data" },
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const refundRequestsService = {
  submitCustomerReturnRequest,
  addRefundRequest,
  getRefundRequestById,
  getRefundRequestsPaginated,
  getReturnReasons,
  getReturnStatuses,
  getShopifyOrderForRefund,
  matchShopifyItems,
  getRefundEligibility,
  applyRefundDecision,
  sendRefundDecisionEmail,
  saveReturnLabel,
  sendReturnLabelEmail,
  updateReturnTracking,
  markReturnDelivered,
  markReturnItemReceived,
  completeReturnInspection,
  updateRefundRequestStatus,
};

export default refundRequestsService;
