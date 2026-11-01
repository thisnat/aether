const qrcodeTerminal = require('qrcode-terminal');

const INNER_WIDTH = 62;
const BORDER_COLOR = '\x1b[38;2;0;117;222m'; // Notion Primary Blue #0075DE
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
function printStartupBanner(port, networkIp, sharingEnabled = false) {
  const localUrl = `http://localhost:${port}`;
  const networkUrl = `http://${networkIp}:${port}`;

  const borderTop = `${BORDER_COLOR}  ┌${'─'.repeat(INNER_WIDTH)}┐${RESET}`;
  const borderBottom = `${BORDER_COLOR}  └${'─'.repeat(INNER_WIDTH)}┘${RESET}`;

  console.log('\n');
  console.log(borderTop);
  console.log(row(''));
  console.log(row('   ▲  E  T  H  E  R', '   \x1b[38;2;0;117;222m\x1b[1m▲  E  T  H  E  R\x1b[0m'));
  console.log(
    row(
      '   Local-Network Markdown Note Engine',
      '   \x1b[90mLocal-Network Markdown Note Engine\x1b[0m'
    )
  );
  console.log(row(''));
  console.log(
    row(
      `   ●  Local:    ${localUrl}`,
      `   \x1b[1m\x1b[32m●\x1b[0m  \x1b[1mLocal:\x1b[0m    \x1b[36m${localUrl}\x1b[0m`
    )
  );
  console.log(
    row(
      `   ●  Network:  ${networkUrl}`,
      `   \x1b[1m\x1b[34m●\x1b[0m  \x1b[1mNetwork:\x1b[0m  \x1b[35m${networkUrl}\x1b[0m`
    )
  );
  console.log(row(''));
  console.log(
    row(
      '   Scan the QR code below on mobile to open notes',
      '   \x1b[90mScan the QR code below on mobile to open notes\x1b[0m'
    )
  );
  console.log(borderBottom + '\n');

  try {
    qrcodeTerminal.generate(networkUrl, { small: true }, (qr) => {
      const indented = qr
        .split('\n')
        .map((line) => '    ' + line)
        .join('\n');
      console.log(indented);

      if (sharingEnabled) {
        console.log(
          '\n    \x1b[32m✔ Local network sharing is active.\x1b[0m \x1b[90mReady on ' +
            networkUrl +
            '. Press Ctrl+C to stop.\x1b[0m\n'
        );
      } else {
        console.log(
          '\n    \x1b[33m○ Network sharing currently off.\x1b[0m \x1b[90mEnable in app topbar to grant device access.\x1b[0m'
        );
        console.log('    \x1b[90mReady on ' + localUrl + '. Press Ctrl+C to stop.\x1b[0m\n');
      }
    });
  } catch {
    console.log('    \x1b[90mReady & listening on ' + port + '. Press Ctrl+C to stop.\x1b[0m\n');
  }
}

module.exports = {
  printStartupBanner,
};
