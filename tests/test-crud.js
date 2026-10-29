const { spawn } = require('child_process');
const http = require('http');

const PORT = 3459;
const child = spawn(process.execPath, ['server.js', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

// Wait for server to start responding
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await req('GET', '/api/network');
      if (res.status === 200) return true;
    } catch {
      // Wait 100ms before next retry
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('Server did not start in time');
}

(async () => {
  try {
    console.log('Waiting for Aether server on port ' + PORT + '...');
    await waitForServer();

    console.log('1. Checking Network API endpoint...');
    const netRes = await req('GET', '/api/network');
    console.log('Network primary IP:', netRes.body.primaryIp, 'Peer count:', netRes.body.peerCount);

    console.log('2. Creating a new test note in vault...');
    const createRes = await req('POST', '/api/vault/file', {
      path: 'TestFolder/Live Note.md',
      content: '# Live Note\n\nTesting live note creation [[Welcome to Aether]]',
    });
    console.log('Created note:', createRes.body.title);

    console.log('3. Fetching graph data & references...');
    const graphRes = await req('GET', '/api/vault/graph');
    console.log(
      'Graph nodes:',
      graphRes.body.nodes.length,
      'Graph links:',
      graphRes.body.links.length
    );
    if (!graphRes.body.nodes.some((n) => n.title === 'Live Note')) {
      throw new Error('Graph did not include Live Note');
    }

    console.log('4. Fetching tree...');
    const treeRes = await req('GET', '/api/vault/tree');
    console.log(
      'Tree items:',
      treeRes.body.tree.map((t) => t.name)
    );

    console.log('4. Searching for "Live Note"...');
    const searchRes = await req('GET', '/api/vault/search?q=Live%20Note');
    console.log('Search matches found:', searchRes.body.results.length);

    console.log('5. Renaming note...');
    const renameRes = await req('POST', '/api/vault/rename', {
      oldPath: 'TestFolder/Live Note.md',
      newPath: 'TestFolder/Renamed Note.md',
    });
    console.log('Renamed note result:', renameRes.body);

    console.log('6. Deleting test note...');
    const delRes = await req('DELETE', '/api/vault/file?path=TestFolder/Renamed%20Note.md');
    console.log('Deleted note result:', delRes.body);

    console.log('7. Deleting test folder...');
    const delFolderRes = await req('DELETE', '/api/vault/directory?path=TestFolder');
    console.log('Deleted folder result:', delFolderRes.body);

    console.log('SUCCESS! All vault operations passed verified.');
  } catch (e) {
    console.error('Error during test:', e);
    process.exitCode = 1;
  } finally {
    child.kill('SIGINT');
  }
})();
