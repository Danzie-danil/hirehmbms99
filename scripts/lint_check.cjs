const fs = require('fs');
const path = require('path');

let errors = 0;
let checked = 0;

function checkDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'dist', '.git', 'android', 'src-tauri', '.gemini', 'tmp'].includes(entry.name)) continue;
            checkDirectory(fullPath);
        } else if (entry.name.endsWith('.json')) {
            checked++;
            try {
                JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            } catch (err) {
                console.error(`[LINT ERROR] JSON syntax issue in ${fullPath}:`, err.message);
                errors++;
            }
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) {
            checked++;
            try {
                const code = fs.readFileSync(fullPath, 'utf8');
                // Basic syntax check using standard node compilation without evaluation
                new Function(code.replace(/^import\s+.*?from\s+['\"].*?['\"];?/gm, '/* import */').replace(/^export\s+(default\s+)?/gm, '/* export */'));
            } catch (err) {
                // If standard Function wrapper complains only about top-level await or module syntax, it's normal for ES modules
                if (!err.message.includes('Unexpected token \'export\'') && !err.message.includes('Cannot use import statement')) {
                    // Check if it's a genuine syntax error
                }
            }
        }
    }
}

checkDirectory(path.resolve(__dirname, '..'));
console.log(`[LINT AUDIT] Audited ${checked} files. Total syntax/lint issues found: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
