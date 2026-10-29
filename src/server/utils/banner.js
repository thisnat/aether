const qrcodeTerminal = require('qrcode-terminal');

const INNER_WIDTH = 62;
const BORDER_COLOR = '\x1b[38;2;99;102;241m';
const RESET = '\x1b[0m';

/**
 * Helper to construct a perfectly aligned banner row.
 * Automatically computes right padding based on visible character count.
 */
function row(visibleContent, styledContent = visibleContent) {
  const pad = Math.max(0, INNER_WIDTH - visibleContent.length);
  return `${BORDER_COLOR}  │${RESET}${styledContent}${' '.repeat(pad)}${BORDER_COLOR}│${RESET}`;
}

/**
 * Print the startup banner to the console with local/network links and QR code.
 */
function printStartupBanner(port, networkIp) {
  const localUrl = `http://localhost:${port}`;
  const networkUrl = `http://${networkIp}:${port}`;

  const borderTop = `${BORDER_COLOR}  ┌${'─'.repeat(INNER_WIDTH)}┐${RESET}`;
  const borderBottom = `${BORDER_COLOR}  └${'─'.repeat(INNER_WIDTH)}┘${RESET}`;

  console.log('\n');
  console.log(borderTop);
  console.log(row(''));
  console.log(row('   ▲  E  T  H  E  R', '   \x1b[38;2;129;140;248m▲  E  T  H  E  R\x1b[0m'));
  console.log(row('   Local-Network Markdown Note Engine', '   \x1b[90mLocal-Network Markdown Note Engine\x1b[0m'));
  console.log(row(''));
  console.log(row(
    `   ●  Local:    ${localUrl}`,
    `   \x1b[1m\x1b[32m●\x1b[0m  \x1b[1mLocal:\x1b[0m    \x1b[36m${localUrl}\x1b[0m`
  ));
  console.log(row(
    `   ●  Network:  ${networkUrl}`,
    `   \x1b[1m\x1b[34m●\x1b[0m  \x1b[1mNetwork:\x1b[0m  \x1b[35m${networkUrl}\x1b[0m`
  ));
  console.log(row(''));
  console.log(row(
    '   Scan the QR code below on mobile to open notes instantly',
    '   \x1b[90mScan the QR code below on mobile to open notes instantly\x1b[0m'
  ));
  console.log(borderBottom + '\n');

  try {
    qrcodeTerminal.generate(networkUrl, { small: true }, (qr) => {
      const indented = qr.split('\n').map(line => '    ' + line).join('\n');
      console.log(indented);
      console.log('\n    \x1b[90mReady & listening on 0.0.0.0:' + port + '. Press Ctrl+C to stop.\x1b[0m\n');
    });
  } catch {
    console.log('    \x1b[90mReady & listening on 0.0.0.0:' + port + '. Press Ctrl+C to stop.\x1b[0m\n');
  }
}

module.exports = {
  printStartupBanner,
};
