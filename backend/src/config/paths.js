const path = require('path');

const projectRoot = path.resolve(__dirname, '../../..');
const publicRoot = path.join(projectRoot, 'frontend', 'public');

module.exports = {
    projectRoot,
    publicRoot,
};
