const jwt = require('jsonwebtoken');

const tokenSecret = process.env.JWT_SECRET;
const tokenOptions = {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

const createToken = (userId) =>
  jwt.sign({ id: userId }, tokenSecret, tokenOptions);

module.exports = createToken;
