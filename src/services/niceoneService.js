// Updated niceoneService.js
import axios from "axios";

const BACKEND_API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001";
const niceoneApi = axios.create({
  baseURL: BACKEND_API_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

const pruneEmpty = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== "" && v != null) out[k] = v;
  }
  return out;
};

const extractProducts = (res) => {
  return (
    res.data.products ||
    res.data.data?.products ||
    res.data.data?.components?.flatMap((c) => c.products || []) ||
    []
  );
};

export const searchProducts = async (q, options = {}) => {
  await initializeApi();
  const params = pruneEmpty({
    q,
    sort: options.sort || "most_popular",
    page: options.page || 1,
    limit: options.limit || 30,
    search: options.search,
  });

  console.log("→ Proxying to /niceone/search with:", params);
  const resp = await niceoneApi.get("/niceone/search", { params });
  const products = extractProducts(resp);

  console.log(`✓ NiceOne service: ${products.length} products for "${q}"`);
  return { products };
};

export const testNiceOneConnection = async () => {
  const resp = await niceoneApi.get("/niceone/test");
  return resp.data;
};

export const initializeApi = async () => {
  const result = await testNiceOneConnection();
  if (!result.success) throw new Error(result.error || "NiceOne test failed");
};
