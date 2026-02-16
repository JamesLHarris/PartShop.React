import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const homeEndpoint = `${API_HOST_PREFIX}/api/home`;
const partsEndpoint = `${API_HOST_PREFIX}/api/parts`;
const partImageUrl = API_HOST_PREFIX;

const deletePart = (id) => {
  const config = {
    method: "DELETE",
    url: `${homeEndpoint}/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const addPart = (payload) => {
  const config = {
    method: "POST",
    url: `${homeEndpoint}/add-new`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const patchPart = (payload, id) => {
  const config = {
    method: "PATCH",
    url: `${homeEndpoint}/${id}`,
    data: payload,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getPartById = (id) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/admin/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getPartByIdCustomer = (id) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/part/${id}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getPartImagesByPartId = (id) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/${id}/images`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

// Upload 1+ gallery images for a part.
// FormData keys must match the API request model:
// - Images: one or more File entries
// - SortStart: integer (optional)
const addPartImages = (id, files = []) => {
  const fd = new FormData();
  (files || []).forEach((f) => fd.append("Images", f));

  const config = {
    method: "POST",
    url: `${homeEndpoint}/${id}/images`,
    data: fd,
    withCredentials: true,
    crossdomain: true,
  };

  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const uploadMultipleImages = (id, formData) => {
  return axios({
    method: "POST",
    url: `${homeEndpoint}/${id}/images`,
    data: formData,
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
  }).then(onGlobalSuccess);
};

const getAllAvailablePartsCustomer = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${partsEndpoint}/customer/paginate?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAllParts = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/stock?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getByCategoryCustomer = (pageIndex, pageSize, categoryId) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/category/${categoryId}?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getByModelCustomer = (pageIndex, pageSize, modelId) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/model/${modelId}?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const searchPart = (params = {}) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/search`,
    params,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const customerSearch = (params = {}) => {
  const config = {
    method: "GET",
    url: `${homeEndpoint}/search/customer`,
    params,
    withCredentials: true,
    crossdomain: true,
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const partsService = {
  deletePart,
  addPart,
  patchPart,
  getPartById,
  getAllAvailablePartsCustomer,
  getAllParts,
  searchPart,
  customerSearch,
  getPartByIdCustomer,
  getPartImagesByPartId,
  addPartImages,
  getByCategoryCustomer,
  getByModelCustomer,
  partImageUrl,
  uploadMultipleImages,
};

export default partsService;
