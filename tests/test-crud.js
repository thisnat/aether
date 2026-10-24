const { spawn } = require('child_process');
const http = require('http');

const child = spawn('node', ['server.js', '--port', '3459'], { stdio: ['ignore', 'pipe', 'pipe'] });

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3459,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

setTimeout(async () => {
  try {
    console.log('1. Creating a new test note in vault...');
    const createRes = await req('POST', '/api/vault/file', {
      path: 'TestFolder/Live Note.md',
      content: '# Live Note\n\nTesting live note creation [[Welcome to Aether]]'
    });
    console.log('Created note:', createRes.body.title);

    console.log('2. Fetching tree...');
    const treeRes = await req('GET', '/api/vault/tree');
    console.log('Tree items:', treeRes.body.tree.map(t => t.name));

    console.log('3. Searching for "Live Note"...');
    const searchRes = await req('GET', '/api/vault/search?q=Live%20Note');
    console.log('Search matches found:', searchRes.body.results.length);

    console.log('4. Deleting test note...');
    const delRes = await req('DELETE', '/api/vault/file?path=TestFolder/Live%20Note.md');
    console.log('Deleted note result:', delRes.body);

    console.log('5. Deleting test folder...');
    const delFolderRes = await req('DELETE', '/api/vault/directory?path=TestFolder');
    console.log('Deleted folder result:', delFolderRes.body);

    console.log('SUCCESS! All vault operations passed verified.');
  } catch (e) {
    console.error('Error during test:', e);
    process.exitCode = 1;
  } finally {
    child.kill('SIGINT');
  }
}, 1200);
