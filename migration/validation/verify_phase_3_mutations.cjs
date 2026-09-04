const { ConvexHttpClient } = require('convex/browser');
const fs = require('fs');
const path = require('path');

const CONVEX_URL = 'https://lovely-rhinoceros-87.convex.cloud';
const client = new ConvexHttpClient(CONVEX_URL);

const reportsDir = path.resolve(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

console.log('====================================================');
console.log('PHASE 3 CONVEX TRANSACTIONAL ENGINE VERIFICATION');
console.log('Convex Target:', CONVEX_URL);
console.log('====================================================\n');

async function runTests() {
    const testResults = [];
    const testOwnerId = 'test-owner-' + Date.now();
    const testBranchA = 'test-branch-a-' + Date.now();
    const testBranchB = 'test-branch-b-' + Date.now();

    try {
        // TEST 1: Inventory Item Creation & Branch Stocking
        console.log('[TEST 1] Testing inventory:createBranchItem...');
        const itemRes = await client.mutation('inventory:createBranchItem', {
            branchId: testBranchA,
            ownerId: testOwnerId,
            name: 'Convex Test Product',
            sku: 'SKU-CVX-' + Date.now(),
            category: 'Testing',
            quantity: 25,
            minThreshold: 5,
            costPrice: 5000,
            price: 8000,
            retailPrice: 8000,
            wholesalePrice: 7000
        });
        const createdInvId = itemRes.id;
        console.log('  -> Created inventory item ID:', createdInvId);
        testResults.push({ name: 'createBranchItem', status: 'PASS', id: createdInvId });

        // TEST 2: Sales Idempotency & Stock Decrement
        console.log('\n[TEST 2] Testing sales:createSale atomic execution & idempotency...');
        const testTxId = 'TX-' + Date.now();
        const saleRes1 = await client.mutation('sales:createSale', {
            branchId: testBranchA,
            ownerId: testOwnerId,
            clientTxId: testTxId,
            customerName: 'Amani Test',
            productId: createdInvId,
            quantity: 2,
            amount: 16000,
            paymentMethod: 'cash',
            itemName: 'Convex Test Product'
        });

        console.log('  -> Initial sale created with ID:', saleRes1.id);

        // Replay same transaction to test idempotency guard
        const saleRes2 = await client.mutation('sales:createSale', {
            branchId: testBranchA,
            ownerId: testOwnerId,
            clientTxId: testTxId,
            customerName: 'Amani Test',
            productId: createdInvId,
            quantity: 2,
            amount: 16000,
            paymentMethod: 'cash'
        });

        const isIdempotent = saleRes2.idempotent === true && String(saleRes1.id) === String(saleRes2.id);
        console.log('  -> Idempotent replay check:', isIdempotent ? 'PASSED (exact match)' : 'FAILED');
        testResults.push({ name: 'createSale_idempotency', status: isIdempotent ? 'PASS' : 'FAIL', saleId: saleRes1.id });

        // TEST 3: Inter-Branch Stock Transfer (Atomic Dual-Movement)
        console.log('\n[TEST 3] Testing inventory:transferBranchToBranchStock...');
        const transferRes = await client.mutation('inventory:transferBranchToBranchStock', {
            fromBranchId: testBranchA,
            toBranchId: testBranchB,
            inventoryId: createdInvId,
            quantity: 5,
            notes: 'Test inter-branch transfer'
        });

        console.log('  -> Transferred 5 units. Transfer ID:', transferRes.transferId);
        testResults.push({ name: 'transferBranchToBranchStock', status: 'PASS', transferId: transferRes.transferId });

        // TEST 4: Atomic Rollback on Insufficient Stock
        console.log('\n[TEST 4] Testing atomic rollback when stock is insufficient...');
        let rollbackWorked = false;
        try {
            await client.mutation('inventory:transferBranchToBranchStock', {
                fromBranchId: testBranchA,
                toBranchId: testBranchB,
                inventoryId: createdInvId,
                quantity: 9999, // exceeds available
                notes: 'Should fail'
            });
        } catch (err) {
            rollbackWorked = true;
            console.log('  -> Expected error caught safely:', err.message);
        }
        testResults.push({ name: 'insufficient_stock_rollback', status: rollbackWorked ? 'PASS' : 'FAIL' });

        // TEST 5: Central Enterprise Catalog Creation & Dispatch
        console.log('\n[TEST 5] Testing centralInventory:createCentralItem & dispatchCentralStock...');
        const centralRes = await client.mutation('centralInventory:createCentralItem', {
            ownerId: testOwnerId,
            name: 'Central Test Catalog Item',
            sku: 'SKU-CENTRAL-' + Date.now(),
            category: 'Master',
            quantity: 50,
            minThreshold: 10,
            costPrice: 10000,
            price: 15000,
            retailPrice: 15000,
            wholesalePrice: 13000
        });

        const dispatchRes = await client.mutation('centralInventory:dispatchCentralStock', {
            centralItemId: centralRes.id,
            branchId: testBranchB,
            quantity: 12,
            notes: 'Dispatch to branch B'
        });

        console.log('  -> Dispatched 12 units. Remaining central stock:', dispatchRes.remainingCentralStock);
        testResults.push({
            name: 'centralInventory_dispatch',
            status: dispatchRes.remainingCentralStock === 38 ? 'PASS' : 'FAIL',
            remainingStock: dispatchRes.remainingCentralStock
        });

        // Summary Report
        const allPassed = testResults.every(t => t.status === 'PASS');
        const report = {
            timestamp: new Date().toISOString(),
            convexUrl: CONVEX_URL,
            allPassed,
            testResults
        };

        const reportPath = path.join(reportsDir, 'phase_3_verification_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\nVerification report written to: ${reportPath}`);

        if (allPassed) {
            console.log('\n>>> ALL PHASE 3 CONVEX TRANSACTION MUTATION TESTS PASSED! <<<');
        } else {
            console.error('\n>>> SOME PHASE 3 TESTS FAILED <<<');
            process.exit(1);
        }

    } catch (err) {
        console.error('Fatal test error:', err);
        process.exit(1);
    }
}

runTests();
