import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/refunds`;

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
  const params = {
    pageIndex,
    pageSize,
    ...filters,
  };

  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === "" || value === null || value === undefined) {
      delete params[key];
    }
  });

  const config = {
    method: "GET",
    url: `${endpoint}/paginate`,
    params,
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

const refundRequestsService = {
  addRefundRequest,
  getRefundRequestById,
  getRefundRequestsPaginated,
  updateRefundRequestStatus,
};

export default refundRequestsService;
