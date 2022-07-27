const axios = require('axios');

module.exports = (token) =>
  axios.create({
    baseURL: process.env.API_URL,
    headers: {
      'x-authorization': `Bearer ${token}`,
    },
  });
