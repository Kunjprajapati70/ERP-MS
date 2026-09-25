require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { freePort } = require('../src/utils/freePort');

const port = Number(process.env.PORT || 5000);
const killed = freePort(port);
if (killed.length) {
  // eslint-disable-next-line no-console
  console.log(`[dev] Freed port ${port} (stopped PID ${killed.join(', ')})`);
}
