const os = require('os');

/**
 * Detect primary local network IPv4 address.
 * Prioritizes Wi-Fi / Ethernet non-internal interfaces.
 */
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const iface of netList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address,
        });
      }
    }
  }

  // Find the most likely primary LAN IP (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x)
  let primary = addresses.find(a =>
    a.address.startsWith('192.168.') ||
    a.address.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(a.address)
  );

  if (!primary && addresses.length > 0) {
    primary = addresses[0];
  }

  return {
    primaryIp: primary ? primary.address : 'localhost',
    allIps: addresses,
  };
}

module.exports = {
  getNetworkAddresses,
};
