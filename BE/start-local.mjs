import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jar = fileURLToPath(new URL('./target/portfolio-api.jar', import.meta.url));
const result = spawnSync('java', ['-jar', jar], { stdio: 'inherit' });

if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
