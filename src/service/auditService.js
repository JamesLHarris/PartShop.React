import axios from "axios";
import {
  onGlobalSuccess,
  onGlobalError,
  API_HOST_PREFIX,
} from "./serviceHelpers";

const auditEndpoint = `${API_HOST_PREFIX}/api/partsaudit`;

const getAuditByPartId = (id, pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${auditEndpoint}/part/${id}?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const getAuditByRecent = (pageIndex, pageSize) => {
  const config = {
    method: "GET",
    url: `${auditEndpoint}/recent?pageIndex=${pageIndex}&pageSize=${pageSize}`,
    withCredentials: true,
    crossdomain: true,
    headers: { "Content-Type": "application/json" },
  };
  return axios(config).then(onGlobalSuccess).catch(onGlobalError);
};

const auditService = {
  getAuditByPartId,
  getAuditByRecent,
};

export default auditService;
