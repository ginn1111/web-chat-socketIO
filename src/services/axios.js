import axios from 'axios';

export default (token) =>
  axios.create({
    baseURL: process.env.API_URL,
    headers: {
      'x-authorization': `Bearer ${token}`,
    },
  });
