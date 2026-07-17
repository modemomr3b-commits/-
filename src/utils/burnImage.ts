export const burnProductOverlay = (product: any, rawImageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No context');

        // Use natural image width for canvas, and scale the ribbon accordingly
        const baseWidth = 1080;
        const minCanvasWidth = 600; // avoid making the image too small that text is unreadable
        const CANVAS_W = Math.max(img.width, minCanvasWidth);
        const imgScale = CANVAS_W / img.width;
        
        const CANVAS_IMG_H = img.height * imgScale;
        
        // Ribbon scaling based on 1080px reference
        const scale = CANVAS_W / baseWidth;
        const ribbonH = 220 * scale;
        
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
        const row1Y = topH + (35 * scale);

        // Code (Right side)
        ctx.fillStyle = '#d4af37';
        ctx.font = `bold ${34 * scale}px Arial`;
        const codeText = `الكود: ${product.productCode || '---'}`;
        ctx.fillText(codeText, CANVAS_W - (40 * scale), row1Y);

        // Packaging (Left side)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#cccccc';
        ctx.font = `${32 * scale}px Arial`;
        let packStr = `التعبئة: ${product.packaging || '---'}`;
        ctx.fillText(packStr, 40 * scale, row1Y);

        // --- ROW 2: Prices ---
        ctx.textAlign = 'right';
        const boxY = topH + (100 * scale);
        
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

        ctx.fillStyle = '#aaaaaa';
        ctx.font = `${24 * scale}px Arial`;
        ctx.fillText('سعر الجملة (الدرزن)', doxX + doxW - (20 * scale), boxY + (15 * scale));
        ctx.fillStyle = '#d4af37';
        ctx.font = `bold ${36 * scale}px Arial`;
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

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Dark text for label
        ctx.font = `${24 * scale}px Arial`;
        // In Arabic, we're writing rtl but the text origin is right for fillText because of ctx.textAlign = 'right'
        ctx.fillText('سعر المفرد (القطعة)', pceX + pceW - (20 * scale), boxY + (15 * scale));
        ctx.fillStyle = '#000000'; // Black text for price
        ctx.font = `bold ${36 * scale}px Arial`;
        ctx.fillText((product.piecePriceIqd ? Number(product.piecePriceIqd).toLocaleString("en-US") : '---') + ' د.ع', pceX + pceW - (20 * scale), boxY + (45 * scale));

        // --- Middle BRQ Text inside ribbon ---
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
        ctx.font = `bold ${64 * scale}px Arial`;
        ctx.fillText('BRQ', CANVAS_W / 2, boxY + (doxH / 2));

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject('Failed to load image for burning');
    img.src = rawImageUrl;
  });
};
