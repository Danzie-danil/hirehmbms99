const { ConvexHttpClient } = require('convex/browser');
const fs = require('fs');
const path = require('path');

const CONVEX_URL = 'https://lovely-rhinoceros-87.convex.cloud';
const client = new ConvexHttpClient(CONVEX_URL);

const transformDir = path.resolve(__dirname, '../transform/data');
const reportDir = path.resolve(__dirname, '../reports');

if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
}

console.log('====================================================');
console.log('STARTING CONVEX IDEMPOTENT DATA INGESTION');
console.log('Convex Deployment:', CONVEX_URL);
console.log('Data Source:', transformDir);
console.log('====================================================\n');

// Ingestion dependency order
const TABLES_TO_INGEST = [
    { file: 'sysSettings.json', table: 'sysSettings' },
    { file: 'pricingPlans.json', table: 'pricingPlans' },
    { file: 'profiles.json', table: 'profiles' },
    { file: 'branches.json', table: 'branches' }
];

async function ingestTable(item) {
    const filePath = path.join(transformDir, item.file);
    if (!fs.existsSync(filePath)) {
        console.log(`- Skipping ${item.table}: file ${item.file} not found`);
        return { table: item.table, count: 0, status: 'SKIPPED' };
    }

    const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (records.length === 0) {
        console.log(`- Table ${item.table}: 0 records to import`);
        return { table: item.table, count: 0, status: 'EMPTY' };
    }

    console.log(`[INGEST] Importing ${records.length} records into '${item.table}'...`);

    // Ingest in chunks of 50
    const CHUNK_SIZE = 50;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        try {
            const res = await client.mutation('migrations/ingest:insertBatch', {
                table: item.table,
                documents: chunk
            });
            totalInserted += res.inserted;
            totalSkipped += res.skipped;
        } catch (err) {
            console.error(`[INGEST] Error importing chunk into '${item.table}':`, err.message);
            return { table: item.table, error: err.message, status: 'FAILED' };
        }
    }

    console.log(`[INGEST] Table '${item.table}': ${totalInserted} inserted, ${totalSkipped} skipped (already present)`);
    return { table: item.table, inserted: totalInserted, skipped: totalSkipped, total: records.length, status: 'SUCCESS' };
}

async function run() {
    const results = [];

    for (const item of TABLES_TO_INGEST) {
        const res = await ingestTable(item);
        results.push(res);
    }

    const reportPath = path.join(reportDir, 'import_summary.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        convexUrl: CONVEX_URL,
        results
    }, null, 2), 'utf8');

    console.log('\n====================================================');
    console.log('INGESTION RUN COMPLETED');
    console.log(`Report saved to: ${reportPath}`);
    console.log('====================================================');
}

run();
