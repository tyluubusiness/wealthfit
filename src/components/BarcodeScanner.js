import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';
import { X, Camera, CheckCircle, RefreshCw, Loader, AlertCircle } from 'lucide-react';
import './BarcodeScanner.css';

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Fetch product data from Open Food Facts by barcode number.
// This is the same free database we use for food search.
async function lookupBarcode(barcode) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    throw new Error('Product not found in database. Try searching by name instead.');
  }

  const p = data.product;
  const n = p.nutriments || {};

  // Prefer "per serving" data if available, fall back to per 100g
  const servingG = p.serving_quantity ? Number(p.serving_quantity) : null;
  const scale    = servingG ? servingG / 100 : 1; // multiplier vs per-100g values

  function per(key100g) {
    const val = n[key100g];
    if (val == null || val === '') return null;
    return Math.round(Number(val) * scale * 10) / 10;
  }

  const calories = per('energy-kcal_100g') ?? per('energy_100g');

  if (!calories && calories !== 0) {
    throw new Error('No calorie data found for this product.');
  }

  return {
    barcode,
    name:        p.product_name || p.abbreviated_product_name || 'Unknown Product',
    brand:       p.brands || '',
    servingSize: p.serving_size || (servingG ? `${servingG}g` : '100g'),
    calories:    Math.round(calories),
    protein:     per('proteins_100g')       ?? 0,
    carbs:       per('carbohydrates_100g')  ?? 0,
    fat:         per('fat_100g')            ?? 0,
    sugar:       per('sugars_100g'),
    fiber:       per('fiber_100g'),
    sodium:      n['sodium_100g'] != null
                   ? Math.round(n['sodium_100g'] * scale * 1000)
                   : null,
    imageUrl:    p.image_front_small_url || p.image_url || null,
  };
}

// ── PRODUCT CONFIRM CARD ──────────────────────────────────────────────────────
// Shows after a barcode is scanned and the product is found.
// User can confirm, adjust serving multiplier, or cancel.
function ProductConfirmCard({ product, onConfirm, onCancel, onRescan }) {
  // Serving multiplier: 1 = one serving, 2 = two servings, 0.5 = half, etc.
  const [multiplier, setMultiplier] = useState(1);

  const scaled = {
    calories: Math.round(product.calories * multiplier),
    protein:  Math.round((product.protein  || 0) * multiplier * 10) / 10,
    carbs:    Math.round((product.carbs    || 0) * multiplier * 10) / 10,
    fat:      Math.round((product.fat      || 0) * multiplier * 10) / 10,
    sugar:    product.sugar  != null ? Math.round(product.sugar  * multiplier * 10) / 10 : null,
    fiber:    product.fiber  != null ? Math.round(product.fiber  * multiplier * 10) / 10 : null,
    sodium:   product.sodium != null ? Math.round(product.sodium * multiplier) : null,
  };

  function handleConfirm() {
    onConfirm({
      name:       product.name + (product.brand ? ` (${product.brand})` : ''),
      servingSize: `${multiplier === 1 ? '' : multiplier + '× '}${product.servingSize}`,
      calories:   scaled.calories,
      protein:    scaled.protein,
      carbs:      scaled.carbs,
      fat:        scaled.fat,
      sugar:      scaled.sugar,
      fiber:      scaled.fiber,
      sodium:     scaled.sodium,
    });
  }

  const macroTotal = scaled.protein * 4 + scaled.carbs * 4 + scaled.fat * 9;
  const pPct = macroTotal > 0 ? Math.round((scaled.protein * 4 / macroTotal) * 100) : 0;
  const cPct = macroTotal > 0 ? Math.round((scaled.carbs   * 4 / macroTotal) * 100) : 0;
  const fPct = macroTotal > 0 ? Math.round((scaled.fat     * 9 / macroTotal) * 100) : 0;

  return (
    <div className="product-confirm-card fade-in">
      {/* Product header */}
      <div className="product-confirm-header">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="product-confirm-img" />
        )}
        <div className="product-confirm-info">
          <p className="product-confirm-name">{product.name}</p>
          {product.brand && <p className="product-confirm-brand">{product.brand}</p>}
          <p className="product-confirm-barcode">Barcode: {product.barcode}</p>
        </div>
        <div className="product-confirm-check">
          <CheckCircle size={22} color="var(--accent)" />
        </div>
      </div>

      {/* Serving adjuster */}
      <div className="serving-adjuster">
        <label className="label">Servings</label>
        <div className="serving-adjuster-row">
          <button
            className="serving-btn"
            onClick={() => setMultiplier(m => Math.max(0.25, Math.round((m - 0.25) * 4) / 4))}
          >−</button>
          <span className="serving-val">{multiplier}×</span>
          <button
            className="serving-btn"
            onClick={() => setMultiplier(m => Math.round((m + 0.25) * 4) / 4)}
          >+</button>
          <span className="serving-size-label">{product.servingSize} per serving</span>
        </div>
      </div>

      {/* Macro breakdown */}
      <div className="product-macros">
        <div className="product-macro-main">
          <span className="product-cal-big">{scaled.calories}</span>
          <span className="product-cal-unit">kcal</span>
        </div>
        <div className="product-macro-bars">
          <div className="product-macro-bar-row">
            <span className="product-macro-label protein">Protein</span>
            <div className="product-macro-track">
              <div className="product-macro-fill protein" style={{ width: pPct + '%' }} />
            </div>
            <span className="product-macro-val">{scaled.protein}g</span>
          </div>
          <div className="product-macro-bar-row">
            <span className="product-macro-label carbs">Carbs</span>
            <div className="product-macro-track">
              <div className="product-macro-fill carbs" style={{ width: cPct + '%' }} />
            </div>
            <span className="product-macro-val">{scaled.carbs}g</span>
          </div>
          <div className="product-macro-bar-row">
            <span className="product-macro-label fat">Fat</span>
            <div className="product-macro-track">
              <div className="product-macro-fill fat" style={{ width: fPct + '%' }} />
            </div>
            <span className="product-macro-val">{scaled.fat}g</span>
          </div>
        </div>
      </div>

      {/* Micros row */}
      {(scaled.sugar != null || scaled.fiber != null || scaled.sodium != null) && (
        <div className="product-micros">
          {scaled.sugar  != null && <span className="product-micro">🍬 Sugar: {scaled.sugar}g</span>}
          {scaled.fiber  != null && <span className="product-micro">🌾 Fiber: {scaled.fiber}g</span>}
          {scaled.sodium != null && <span className="product-micro">🧂 Sodium: {scaled.sodium}mg</span>}
        </div>
      )}

      {/* Action buttons */}
      <div className="product-confirm-actions">
        <button className="btn-primary product-confirm-btn" onClick={handleConfirm}>
          <CheckCircle size={15} /> Log This Food
        </button>
        <button className="btn-ghost" onClick={onRescan}>
          <RefreshCw size={14} /> Scan Again
        </button>
        <button className="btn-ghost" onClick={onCancel}>
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ── MAIN BARCODE SCANNER COMPONENT ────────────────────────────────────────────
export default function BarcodeScanner({ onFoodFound, onClose }) {
  const videoRef    = useRef(null);
  const readerRef   = useRef(null);
  const controlsRef = useRef(null);   // holds the zxing stop handle

  const [scanState, setScanState]   = useState('starting'); // starting | scanning | found | error | notfound
  const [product, setProduct]       = useState(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [lastBarcode, setLastBarcode] = useState('');

  // Start the camera and barcode reader
  const startScanner = useCallback(async () => {
    setScanState('starting');
    setProduct(null);
    setLastBarcode('');

    try {
      // BrowserMultiFormatReader reads many barcode formats: UPC-A, EAN-13, QR, etc.
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // List available cameras and prefer the back camera on mobile
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCam = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      const deviceId = backCam?.deviceId || devices[0]?.deviceId || undefined;

      if (!videoRef.current) return;

      setScanState('scanning');

      // decodeFromVideoDevice streams camera to the <video> element and calls
      // our callback every time it detects a barcode
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        async (result, err) => {
          if (result) {
            const barcode = result.getText();
            // Avoid re-processing the same barcode twice in a row
            if (barcode === lastBarcode) return;
            setLastBarcode(barcode);

            // Stop scanning while we look up the product
            controls?.stop();

            setScanState('found');
            try {
              const productData = await lookupBarcode(barcode);
              setProduct(productData);
            } catch (lookupErr) {
              setErrorMsg(lookupErr.message);
              setScanState('notfound');
            }
          }
          // NotFoundException just means no barcode in this frame — that's normal
        }
      );

      controlsRef.current = controls;

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('No camera found on this device.');
      } else {
        setErrorMsg('Could not start camera: ' + (err.message || 'Unknown error'));
      }
      setScanState('error');
    }
  }, [lastBarcode]);

  // Start scanning when component mounts
  useEffect(() => {
    startScanner();
    // Clean up: stop camera when component unmounts
    return () => {
      controlsRef.current?.stop?.();
    };
  }, []); // start once on mount

  function handleRescan() {
    controlsRef.current?.stop?.();
    setProduct(null);
    startScanner();
  }

  function handleConfirm(foodData) {
    onFoodFound(foodData);
    controlsRef.current?.stop?.();
  }

  function handleClose() {
    controlsRef.current?.stop?.();
    onClose();
  }

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-modal card">
        {/* Header */}
        <div className="barcode-scanner-header">
          <div className="barcode-scanner-title-row">
            <Camera size={16} color="var(--accent)" />
            <h3 className="barcode-scanner-title">Scan Barcode</h3>
          </div>
          <button className="btn-ghost barcode-close-btn" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* Camera viewfinder — always rendered so ref attaches, hidden when not needed */}
        <div className={'barcode-viewfinder ' + (scanState === 'scanning' || scanState === 'starting' ? 'visible' : 'hidden')}>
          <video ref={videoRef} className="barcode-video" autoPlay muted playsInline />
          {/* Targeting overlay */}
          <div className="barcode-target">
            <div className="barcode-target-corner tl" />
            <div className="barcode-target-corner tr" />
            <div className="barcode-target-corner bl" />
            <div className="barcode-target-corner br" />
            <div className="barcode-scan-line" />
          </div>
          <p className="barcode-hint">Point at the barcode on any food package</p>
        </div>

        {/* States */}
        {scanState === 'starting' && (
          <div className="barcode-status fade-in">
            <Loader size={24} className="barcode-spinner" />
            <p>Starting camera...</p>
          </div>
        )}

        {scanState === 'found' && !product && (
          <div className="barcode-status fade-in">
            <Loader size={24} className="barcode-spinner" />
            <p>Looking up product...</p>
          </div>
        )}

        {scanState === 'error' && (
          <div className="barcode-status error fade-in">
            <AlertCircle size={28} color="var(--red)" />
            <p className="barcode-error-text">{errorMsg}</p>
            <button className="btn-primary" onClick={handleRescan}>
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        )}

        {scanState === 'notfound' && (
          <div className="barcode-status error fade-in">
            <AlertCircle size={24} color="var(--gold)" />
            <p className="barcode-error-text">{errorMsg}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleRescan}>
                <RefreshCw size={14} /> Scan Again
              </button>
              <button className="btn-ghost" onClick={handleClose}>Search by Name</button>
            </div>
          </div>
        )}

        {/* Product confirmation */}
        {product && (
          <ProductConfirmCard
            product={product}
            onConfirm={handleConfirm}
            onCancel={handleClose}
            onRescan={handleRescan}
          />
        )}
      </div>
    </div>
  );
}
