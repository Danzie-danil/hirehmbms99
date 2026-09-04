// ─── BMSTz Cross-Platform Camera Barcode & QR Code Scanner Engine ──────────────
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

let html5QrCodeEngine = null;
let isProcessingBarcode = false;

export function openCameraScannerModal(onDetectedCallback) {
    isProcessingBarcode = false;
    window.closeCameraScanner();

    const overlay = document.createElement('div');
    overlay.className = 'barcode-scanner-overlay fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-between p-4 slide-in';

    overlay.innerHTML = `
    <style>
        #barcodeReader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
        }
        #barcodeReader canvas {
            display: none !important;
        }
        #barcodeReader__scan_region {
            border: 3px solid #34d399 !important;
            border-radius: 20px !important;
            box-shadow: 0 0 25px rgba(52, 211, 153, 0.4) !important;
        }
    </style>

    <!-- Top Header -->
    <div class="w-full max-w-md flex items-center justify-between text-white z-10 pt-2">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center">
                <i data-lucide="scan" class="w-4 h-4 text-indigo-400"></i>
            </div>
            <div>
                <h3 class="font-bold text-sm text-white">${window.t ? window.t('scan_barcode', 'Scan Product Barcode') : 'Scan Product Barcode'}</h3>
                <p class="text-[10px] text-gray-400 font-medium">${window.t ? window.t('point_camera', 'Fit barcode inside the green frame') : 'Fit barcode inside the green frame'}</p>
            </div>
        </div>
        <button onclick="window.closeCameraScanner()" class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
        </button>
    </div>

    <!-- Scanner Viewport Container -->
    <div class="relative w-full max-w-md aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex items-center justify-center">
        <div id="barcodeReader" class="w-full h-full object-cover"></div>

        <div id="barcodeScannerStatus" class="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-md rounded-xl p-2.5 text-center text-white text-xs font-semibold z-20">
            ${window.t ? window.t('scanning', 'Starting camera stream...') : 'Starting camera stream...'}
        </div>
    </div>

    <!-- Manual Entry & Controls Footer -->
    <div class="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-4 text-white space-y-3 z-10">
        <div class="flex gap-2">
            <input type="text" id="manualBarcodeEntry"
                placeholder="${window.t ? window.t('scan_barcode', 'Or enter SKU / barcode manually...') : 'Or enter SKU manually...'}"
                class="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-400">
            <button onclick="window.submitManualBarcode('${onDetectedCallback ? 'custom' : 'default'}')"
                class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors">
                ${window.t ? window.t('search', 'Search') : 'Search'}
            </button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons({ scope: overlay });

    startHtml5Scanner(onDetectedCallback);
}

async function startHtml5Scanner(onDetectedCallback) {
    const statusEl = document.getElementById('barcodeScannerStatus');
    const readerDiv = document.getElementById('barcodeReader');
    if (!readerDiv) return;

    // Request Android & browser camera runtime permissions explicitly
    if (window.requestCameraPermission) {
        await window.requestCameraPermission(false);
    } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const permissionStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            permissionStream.getTracks().forEach(track => track.stop());
        } catch (permErr) {
            console.warn('[BarcodeScanner] Explicit getUserMedia request caught:', permErr);
        }
    }

    try {
        const formatsToSupport = [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
        ];

        html5QrCodeEngine = new Html5Qrcode("barcodeReader", {
            formatsToSupport,
            verbose: false,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        });

        // Dynamic wide qrbox formula: 92% width so long 1D barcodes fit cleanly without side cropping
        const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const width = Math.floor(viewfinderWidth * 0.92);
            const height = Math.max(120, Math.floor(minEdge * 0.45));
            return { width, height };
        };

        const config = {
            fps: 20,
            qrbox: qrboxFunction,
            aspectRatio: 1.0,
            videoConstraints: {
                facingMode: { ideal: "environment" },
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
            }
        };

        const onScanSuccess = (decodedText) => {
            if (decodedText && !isProcessingBarcode) {
                isProcessingBarcode = true;
                handleDetectedBarcode(decodedText, onDetectedCallback);
            }
        };

        const onScanFailure = () => {
            // Unmatched frame
        };

        try {
            await html5QrCodeEngine.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
            );
        } catch (e1) {
            await html5QrCodeEngine.start(
                { facingMode: "user" },
                config,
                onScanSuccess,
                onScanFailure
            );
        }

        if (statusEl) statusEl.textContent = window.t ? window.t('point_camera', 'Fit barcode inside the green box...') : 'Fit barcode inside the green box...';
    } catch (err) {
        console.error('[BarcodeScanner] Camera initialization error:', err);
        if (statusEl) {
            statusEl.innerHTML = `
            <div class="p-3 bg-red-950/90 border border-red-500/50 rounded-2xl text-center space-y-2">
                <p class="text-xs font-black text-red-300">Camera Access Blocked in Chrome</p>
                <p class="text-[10px] text-gray-200 leading-snug">
                    1. Tap the <strong>Tune / Lock icon</strong> next to the web address bar in Chrome.<br>
                    2. Tap <strong>Permissions</strong> → <strong>Camera</strong> → <strong>Allow</strong>.<br>
                    3. Tap below to restart camera.
                </p>
                <button onclick="window.retryCameraPermission('${onDetectedCallback ? 'custom' : 'default'}')" 
                    class="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5">
                    <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i> Try Camera Again
                </button>
            </div>`;
            if (window.lucide) lucide.createIcons({ scope: statusEl });
        }
    }
}

window.retryCameraPermission = async function (callbackType) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(t => t.stop());
            openCameraScannerModal(callbackType === 'custom' ? callbackType : null);
            return;
        } catch (e) {
            console.warn('[BarcodeScanner] Retry getUserMedia failed:', e);
        }
    }
    if (typeof showToast === 'function') {
        showToast('Please enable Camera in Chrome Site Settings (Tap Lock icon in address bar)', 'warning');
    }
};

function handleDetectedBarcode(code, onDetectedCallback) {
    if (navigator.vibrate) navigator.vibrate(120);
    if (window.playSound) playSound('pop-alert');

    window.closeCameraScanner();

    if (onDetectedCallback && typeof window[onDetectedCallback] === 'function') {
        window[onDetectedCallback](code);
    } else if (typeof window.handleBarcodeScan === 'function') {
        window.handleBarcodeScan(code);
    } else {
        if (typeof showToast === 'function') {
            showToast(`${window.t ? window.t('barcode_detected', 'Barcode detected') : 'Barcode detected'}: ${code}`, 'success');
        }
    }
}

window.submitManualBarcode = function (callbackType) {
    const input = document.getElementById('manualBarcodeEntry');
    const val = input?.value?.trim();
    if (!val) return;
    handleDetectedBarcode(val, callbackType === 'custom' ? callbackType : null);
};

window.closeCameraScanner = function () {
    if (html5QrCodeEngine) {
        try {
            html5QrCodeEngine.stop().then(() => {
                html5QrCodeEngine.clear();
                html5QrCodeEngine = null;
            }).catch(() => {
                html5QrCodeEngine = null;
            });
        } catch (e) {
            html5QrCodeEngine = null;
        }
    }
    document.querySelectorAll('.barcode-scanner-overlay').forEach(el => el.remove());
};

window.openCameraScannerModal = openCameraScannerModal;
