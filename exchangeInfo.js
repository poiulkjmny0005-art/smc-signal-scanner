const { proxy } = require('./_proxy');
module.exports = async (req, res) => proxy('/fapi/v1/exchangeInfo', res);
