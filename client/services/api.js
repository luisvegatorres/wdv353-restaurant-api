import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

function resource(path) {
  return {
    list: async (signal) => (await api.get(path, { signal })).data,
    create: async (body) => (await api.post(path, body)).data,
    replace: async (id, body) => (await api.put(`${path}/${id}`, body)).data,
    remove: async (id) => {
      await api.delete(`${path}/${id}`);
    },
  };
}

export const restaurantsApi = resource('/restaurants');
export const menuItemsApi = resource('/menu-items');

export function errorMessage(error) {
  const body = error.response?.data;
  if (typeof body?.error === 'string') {
    return [
      body.error,
      ...(Array.isArray(body.details) ? body.details : []),
    ].join(' ');
  }
  return 'Could not reach the API. Check that the Node server and MongoDB are running, then try again.';
}
