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
  updateRefundRequestStatus,
};

export default refundRequestsService;
