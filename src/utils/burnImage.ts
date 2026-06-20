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
        const ribbonH = 270 * scale;
        
        const CANVAS_H = CANVAS_IMG_H + ribbonH;
        
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        // Draw original image scaled to canvas if needed
        ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_IMG_H);

        const topH = CANVAS_IMG_H;

        // Gradient ribbon background (Brand colors)
        const grad = ctx.createLinearGradient(0, topH, 0, CANVAS_H);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, topH, CANVAS_W, ribbonH);

        // Gold border at the top of the ribbon
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(0, topH, CANVAS_W, 6 * scale);

        // Context settings for Arabic
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${50 * scale}px Arial`;
        ctx.fillText(product.name || 'منتج جديد', CANVAS_W - (40 * scale), topH + (40 * scale));

        // Code row
        ctx.fillStyle = '#d4af37';
        ctx.font = `bold ${32 * scale}px Arial`;
        const codeText = `الكود: ${product.productCode || '---'}`;
        ctx.fillText(codeText, CANVAS_W - (40 * scale), topH + (110 * scale));

        // Packaging
        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaaaaa';
        ctx.font = `${32 * scale}px Arial`;
        let packStr = `التعبئة: ${product.packaging || '---'}`;
        if (product.piecesCount) packStr += ` (${product.piecesCount} قطعة)`;
        ctx.fillText(packStr, 40 * scale, topH + (40 * scale));

        // Price Boxes
        ctx.textAlign = 'right';
        const boxY = topH + (160 * scale);
        
        // Dozen Box
        const doxW = 400 * scale;
        const doxH = 90 * scale;
        const doxX = CANVAS_W - (440 * scale);

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

        ctx.fillStyle = '#888888';
        ctx.font = `${24 * scale}px Arial`;
        ctx.fillText('سعر الدرزن', CANVAS_W - (60 * scale), boxY + (15 * scale));
        ctx.fillStyle = '#d4af37';
        ctx.font = `bold ${40 * scale}px Arial`;
        ctx.fillText(Number(product.price).toLocaleString() + ' د.ع', CANVAS_W - (60 * scale), boxY + (45 * scale));

        // Piece Box
        const pceW = 480 * scale;
        const pceH = 90 * scale;
        const pceX = 40 * scale;

        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(pceX, boxY, pceW, pceH, 12 * scale);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(pceX, boxY, pceW, pceH);
        }

        ctx.fillStyle = '#888888';
        ctx.font = `${24 * scale}px Arial`;
        ctx.fillText('سعر القطعة', pceX + pceW - (20 * scale), boxY + (15 * scale));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${40 * scale}px Arial`;
        ctx.fillText((product.piecePriceIqd ? Number(product.piecePriceIqd).toLocaleString() : '---') + ' د.ع', pceX + pceW - (20 * scale), boxY + (45 * scale));

        // Watermark/Branding in the center of the ribbon
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.font = `bold ${100 * scale}px Arial`;
        ctx.fillText('BRQ', CANVAS_W / 2, topH + (ribbonH / 2));

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject('Failed to load image for burning');
    img.src = rawImageUrl;
  });
};
