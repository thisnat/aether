const os = require('os');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');

/**
 * Detect the primary local network IPv4 address.
 * Prioritizes Wi-Fi / Ethernet non-internal interfaces.
 */
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const iface of netList) {
      // Look for IPv4 and non-internal (not 127.0.0.1)
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

/**
 * Generate a QR code data URL (base64 image) for browser modal.
 */
async function generateQrDataUrl(url) {
  try {
    return await qrcode.toDataURL(url, {
      margin: 1.5,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return null;
  }
}

/**
 * Print the startup banner to the console with local/network links and QR code.
 */
function printStartupBanner(port, networkIp) {
  const localUrl = `http://localhost:${port}`;
  const networkUrl = `http://${networkIp}:${port}`;

  console.log('\n');
  console.log('\x1b[38;2;99;102;241m' + '  ┌──────────────────────────────────────────────────────────────┐' + '\x1b[0m');
  console.log('\x1b[38;2;99;102;241m' + '  │                                                              │' + '\x1b[0m');
  console.log('\x1b[38;2;129;140;248m' + '  │   ▲  E  T  H  E  R                                           │' + '\x1b[0m');
  console.log('\x1b[90m'               + '  │   Local-Network Markdown Note Engine                         │' + '\x1b[0m');
  console.log('\x1b[38;2;99;102;241m' + '  │                                                              │' + '\x1b[0m');
  console.log('\x1b[38;2;99;102;241m' + '  │   ' + '\x1b[1m\x1b[32m●\x1b[0m  ' + '\x1b[1mLocal:\x1b[0m    ' + '\x1b[36m' + localUrl.padEnd(43) + '\x1b[0m' + '\x1b[38;2;99;102;241m│\x1b[0m');
  console.log('\x1b[38;2;99;102;241m' + '  │   ' + '\x1b[1m\x1b[34m●\x1b[0m  ' + '\x1b[1mNetwork:\x1b[0m  ' + '\x1b[35m' + networkUrl.padEnd(43) + '\x1b[0m' + '\x1b[38;2;99;102;241m│\x1b[0m');
  console.log('\x1b[38;2;99;102;241m' + '  │                                                              │' + '\x1b[0m');
  console.log('\x1b[90m'               + '  │   Scan the QR code below on mobile to open notes instantly   │' + '\x1b[0m');
  console.log('\x1b[38;2;99;102;241m' + '  └──────────────────────────────────────────────────────────────┘' + '\x1b[0m\n');

  try {
    qrcodeTerminal.generate(networkUrl, { small: true }, (qr) => {
      // Indent QR code for clean terminal presentation
      const indented = qr.split('\n').map(line => '    ' + line).join('\n');
      console.log(indented);
      console.log('\n    \x1b[90mReady & listening on 0.0.0.0:' + port + '. Press Ctrl+C to stop.\x1b[0m\n');
    });
  } catch {
    console.log('    \x1b[90mReady & listening on 0.0.0.0:' + port + '. Press Ctrl+C to stop.\x1b[0m\n');
  }
}

module.exports = {
  getNetworkAddresses,
  generateQrDataUrl,
  printStartupBanner,
};
