import axios from "axios";
import { API_HOST_PREFIX, onGlobalError, onGlobalSuccess } from "./serviceHelpers";

const endpoint = `${API_HOST_PREFIX}/api/discounts/active-banner`;

const getActiveBanner = () =>
  axios({ method: "GET", url: endpoint, withCredentials: true, crossdomain: true })
    .then(onGlobalSuccess)
    .catch(onGlobalError);

export default { getActiveBanner };
