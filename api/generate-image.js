const generateDecor = require('./generate-decor');

module.exports = async (req, res) => {
  return generateDecor(req, res);
};
