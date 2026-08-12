const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch("https://13-48-123-128.sslip.io/api/v1/resources");
    const data = await res.json();
    console.log("Resources:", data.length);
  } catch (e) {
    console.error(e);
  }
}
test();
