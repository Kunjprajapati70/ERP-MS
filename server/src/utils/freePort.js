const { execSync } = require('child_process');

function findListeningPids(port) {
  const numericPort = Number(port);
  if (!numericPort) return [];

  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano', { encoding: 'utf8' });
      const pids = new Set();
      const matcher = new RegExp(`:${numericPort}\\s`);
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes('LISTENING') || !matcher.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (pid && pid !== process.pid) pids.add(pid);
      }
      return [...pids];
    }

    const output = execSync(`lsof -ti tcp:${numericPort} -sTCP:LISTEN || true`, {
      encoding: 'utf8',
      shell: '/bin/sh',
    });
    return output
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((pid) => pid && pid !== process.pid);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

function freePort(port) {
  const pids = findListeningPids(port);
  const killed = [];
  for (const pid of pids) {
    if (killPid(pid)) killed.push(pid);
  }
  return killed;
}

module.exports = {
  findListeningPids,
  freePort,
};
