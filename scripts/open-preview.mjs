import { spawn } from 'node:child_process';
import { exec } from 'node:child_process';
import http from 'node:http';

const PREVIEW_URL = 'http://localhost:5173/';

function isServerUp() {
  return new Promise((resolve) => {
    const req = http.get(PREVIEW_URL, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser() {
  const url = PREVIEW_URL;
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`, { shell: 'cmd.exe' });
    return;
  }
  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
    return;
  }
  exec(`xdg-open "${url}"`);
}

async function waitForServer(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (await isServerUp()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  if (await isServerUp()) {
    openBrowser();
    console.log(`Preview: ${PREVIEW_URL}`);
    return;
  }

  console.log('Starting dev server...');
  const child = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    detached: process.platform !== 'win32',
  });

  const ready = await waitForServer();
  if (!ready) {
    console.error('Dev server did not start. Check the terminal for errors.');
    child.kill();
    process.exit(1);
  }

  openBrowser();
  console.log(`Preview: ${PREVIEW_URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
