const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const scanDirs = ['js', 'api', 'supabase'];

const tablesFound = new Set();
const rpcsFound = new Set();
const queriesByFile = [];
const rpcsByFile = [];

function scanFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.js', '.cjs', '.ts', '.html', '.sql'].includes(ext)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    // Match .from('tableName') or .from("tableName")
    const fromRegex = /\.from\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g;
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
        const table = match[1];
        tablesFound.add(table);
        queriesByFile.push({ file: relPath, table, type: 'from' });
    }

    // Match .rpc('functionName') or .rpc("functionName")
    const rpcRegex = /\.rpc\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]/g;
    while ((match = rpcRegex.exec(content)) !== null) {
        const rpc = match[1];
        rpcsFound.add(rpc);
        rpcsByFile.push({ file: relPath, rpc });
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'android', 'src-tauri'].includes(entry.name)) continue;
            walkDir(fullPath);
        } else {
            scanFile(fullPath);
        }
    }
}

scanDirs.forEach(d => walkDir(path.join(rootDir, d)));

const auditDir = path.join(rootDir, 'migration', 'audit');
if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
}

fs.writeFileSync(
    path.join(auditDir, 'tables_discovered.json'),
    JSON.stringify(Array.from(tablesFound).sort(), null, 2)
);

fs.writeFileSync(
    path.join(auditDir, 'rpcs_discovered.json'),
    JSON.stringify(Array.from(rpcsFound).sort(), null, 2)
);

fs.writeFileSync(
    path.join(auditDir, 'queries_by_file.json'),
    JSON.stringify(queriesByFile, null, 2)
);

fs.writeFileSync(
    path.join(auditDir, 'rpcs_by_file.json'),
    JSON.stringify(rpcsByFile, null, 2)
);

console.log(`Scan completed:`);
console.log(`- Unique tables referenced: ${tablesFound.size}`);
console.log(`- Unique RPCs referenced: ${rpcsFound.size}`);
console.log(`- Total .from() invocations: ${queriesByFile.length}`);
console.log(`- Total .rpc() invocations: ${rpcsByFile.length}`);
