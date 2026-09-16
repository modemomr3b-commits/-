export const burnProductOverlay = async (product: any, rawImageUrl: string): Promise<string> => {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
  } catch {
    // Ignore font ready check failure if unsupported
  }

  return new Promise((resolve) => {
    let isResolved = false;
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve(rawImageUrl);
      }
    }, 4000);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isResolved) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          isResolved = true;
          clearTimeout(timeout);
          resolve(rawImageUrl);
          return;
        }

        // Use natural image width for canvas, and scale the ribbon accordingly
        const baseWidth = 1080;
        const minCanvasWidth = 600; // avoid making the image too small that text is unreadable
        const CANVAS_W = Math.max(img.width, minCanvasWidth);
        const imgScale = CANVAS_W / img.width;
        
        const CANVAS_IMG_H = img.height * imgScale;
        
        // Ribbon scaling based on 1080px reference
        const scale = CANVAS_W / baseWidth;
        const ribbonH = 240 * scale;
        
        const CANVAS_H = CANVAS_IMG_H + ribbonH;
        
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        // Draw original image scaled to canvas if needed
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_IMG_H);

        const topH = CANVAS_IMG_H;

        // Gradient ribbon background
        const grad = ctx.createLinearGradient(0, topH, 0, CANVAS_H);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, '#050505');
        ctx.fillStyle = grad;
        ctx.fillRect(0, topH, CANVAS_W, ribbonH);

        // Gold border at the top of the ribbon
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(0, topH, CANVAS_W, 6 * scale);

        // Context settings for Arabic
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // --- ROW 1: Code and Packaging ---
        const row1Y = topH + (25 * scale);

        // Code (Right side - Enlarged in Original Gold)
        ctx.fillStyle = '#ffd700';
        ctx.font = `900 ${52 * scale}px Cairo, sans-serif`;
        const codeText = `الكود: ${product.productCode || '---'}`;
        ctx.fillText(codeText, CANVAS_W - (35 * scale), row1Y);

        // Packaging (Left side - Strictly use what the user entered only)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#cccccc';
        ctx.font = `bold ${32 * scale}px Cairo, sans-serif`;

        const userPackaging = product.packaging !== undefined && product.packaging !== null && String(product.packaging).trim() !== ''
          ? String(product.packaging).trim()
          : (product.size?.packaging !== undefined && product.size?.packaging !== null && String(product.size.packaging).trim() !== ''
              ? String(product.size.packaging).trim()
              : (product.packing !== undefined && product.packing !== null && String(product.packing).trim() !== ''
                  ? String(product.packing).trim()
                  : ''));

        let packStr = 'التعبئة: ---';
        if (userPackaging && userPackaging !== '---' && userPackaging !== 'null' && userPackaging !== 'undefined') {
          packStr = userPackaging.startsWith('التعبئة:') ? userPackaging : `التعبئة: ${userPackaging}`;
        }
        ctx.fillText(packStr, 35 * scale, row1Y + (10 * scale));

        // --- ROW 2: Prices ---
        ctx.textAlign = 'right';
        const boxY = topH + (115 * scale);
        const isCrushEnabled = product.forceStandardCrush ?? true;

        if (isCrushEnabled) {
          // Dozen Box (Right Side)
          const doxW = 380 * scale;
          const doxH = 90 * scale;
          const doxX = CANVAS_W - (40 * scale) - doxW;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
          ctx.lineWidth = 2 * scale;
          
          if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(doxX, boxY, doxW, doxH, 12 * scale);
              ctx.fill();
              ctx.stroke();
          } else {
              ctx.fillRect(doxX, boxY, doxW, doxH);
          }

          // 'دم الغزال' Crimson Red for Wholesale Label
          ctx.fillStyle = '#dc2626';
          ctx.font = `bold ${24 * scale}px Cairo, sans-serif`;
          ctx.fillText('سعر الجملة (الدرزن)', doxX + doxW - (20 * scale), boxY + (15 * scale));
          ctx.fillStyle = '#ffd700';
          ctx.font = `bold ${36 * scale}px Cairo, sans-serif`;
          ctx.fillText(Number(product.price || 0).toLocaleString("en-US") + ' د.ع', doxX + doxW - (20 * scale), boxY + (45 * scale));

          // Piece Box (Left Side)
          const pceW = 380 * scale;
          const pceH = 90 * scale;
          const pceX = 40 * scale;

          ctx.fillStyle = '#d4af37'; // Ensure piece box is solid gold
          ctx.strokeStyle = '#d4af37';
          
          if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(pceX, boxY, pceW, pceH, 12 * scale);
              ctx.fill();
              ctx.stroke();
          } else {
              ctx.fillRect(pceX, boxY, pceW, pceH);
          }

          const calcPieces = 12;
          const finalPiecePrice = product.piecePriceIqd || (product.price ? Math.round(product.price / calcPieces) : 0);

          // 'دم الغزال' Deep Burgundy / Oxblood Red for Retail Label on Gold
          ctx.fillStyle = '#800020';
          ctx.font = `bold ${24 * scale}px Cairo, sans-serif`;
          ctx.fillText('سعر المفرد (القطعة)', pceX + pceW - (20 * scale), boxY + (15 * scale));
          ctx.fillStyle = '#000000'; // Black text for price
          ctx.font = `bold ${36 * scale}px Cairo, sans-serif`;
          ctx.fillText((finalPiecePrice ? Number(finalPiecePrice).toLocaleString("en-US") : '---') + ' د.ع', pceX + pceW - (20 * scale), boxY + (45 * scale));

          // --- Middle BRQ Text inside ribbon ---
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
          ctx.font = `${80 * scale}px Cairo, sans-serif`;
          ctx.fillText('𝓑𝓡𝓠', CANVAS_W / 2, boxY + (doxH / 2));
        } else {
          // Crush is disabled ("لا"): Draw ONLY Wholesale Box centered, WITHOUT piece price box
          const doxW = 680 * scale;
          const doxH = 90 * scale;
          const doxX = (CANVAS_W - doxW) / 2;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
          ctx.lineWidth = 2 * scale;
          
          if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(doxX, boxY, doxW, doxH, 12 * scale);
              ctx.fill();
              ctx.stroke();
          } else {
              ctx.fillRect(doxX, boxY, doxW, doxH);
          }

          ctx.textAlign = 'center';
          ctx.fillStyle = '#dc2626';
          ctx.font = `bold ${24 * scale}px Cairo, sans-serif`;
          ctx.fillText('السعر', CANVAS_W / 2, boxY + (15 * scale));
          ctx.fillStyle = '#ffd700';
          ctx.font = `bold ${38 * scale}px Cairo, sans-serif`;
          ctx.fillText(Number(product.price || 0).toLocaleString("en-US") + ' د.ع', CANVAS_W / 2, boxY + (48 * scale));
        }

        isResolved = true;
        clearTimeout(timeout);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve(rawImageUrl);
        }
      }
    };
    img.onerror = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        resolve(rawImageUrl);
      }
    };
    img.src = rawImageUrl;
  });
};
