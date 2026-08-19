import { Order } from '../types';
import { formatDateTime } from './time';

export const printOrderInvoice = (order: Order) => {
  const ITEMS_PER_PAGE = 25;
  const items = order.items || [];
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const dateFormatted = formatDateTime(order.createdAt);

  const getCustName = (): string => {
    if (order.customerName && order.customerName.trim()) return order.customerName.trim();
    if (order.notes) {
      const match = order.notes.match(/اسم الزبون:\s*([^\n\r]+)/);
      if (match && match[1]?.trim()) return match[1].trim();
    }
    if (order.fullName && order.fullName.trim() && order.fullName !== order.username) {
      return order.fullName.trim();
    }
    return order.fullName || order.username || '---';
  };

  const customerName = getCustName();

  const pagesHtml: string[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageItems = items.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
    const startIdx = pageIndex * ITEMS_PER_PAGE;
    const pageTotalQty = pageItems.reduce((acc, it) => acc + (it.quantity || 0), 0);

    const rowsHtml = pageItems.map((item, idx) => {
      const globalIdx = startIdx + idx + 1;
      const prodName = item.product?.name || "منتج";
      const modelNum = item.product?.modelNumber || "-";
      const prodCode = item.product?.productCode || "-";
      const qty = item.quantity || 0;

      return `
        <tr class="item-row">
          <td class="col-num">${globalIdx}</td>
          <td class="col-name">
            <div class="prod-title">${prodName}</div>
          </td>
          <td class="col-model">${modelNum}</td>
          <td class="col-code"><span class="code-badge">${prodCode}</span></td>
          <td class="col-qty"><strong class="qty-num">${qty}</strong></td>
        </tr>
      `;
    }).join('');

    // If less than 25 items on the page, fill empty ghost rows to keep layout aligned or leave compact
    pagesHtml.push(`
      <div class="print-page ${pageIndex < totalPages - 1 ? 'page-break' : ''}">
        <!-- Header -->
        <div class="header">
          <div class="header-right">
            <h1 class="company-name">شركة الوفاء المتميز</h1>
            <div class="company-sub">قائمة تجهيز واستلام طلبيات الجملة</div>
          </div>
          <div class="header-center">
            <div class="order-badge">
              <span class="badge-label">رقم الطلبية</span>
              <span class="badge-val">${order.orderNumber || order.id?.slice(0, 8)}</span>
            </div>
            ${totalPages > 1 ? `<div class="page-indicator">ورقة ${pageIndex + 1} من ${totalPages} (25 مادة بالورقة)</div>` : `<div class="page-indicator">ورقة واحدة (25 مادة بالورقة)</div>`}
          </div>
          <div class="header-left">
            <div class="meta-item"><strong>التاريخ:</strong> <span dir="ltr">${dateFormatted}</span></div>
            <div class="meta-item"><strong>إجمالي المواد:</strong> <span>${items.length} مادة</span></div>
          </div>
        </div>

        <!-- Info Bar -->
        <div class="info-bar">
          <div class="info-col"><strong>اسم الزبون:</strong> <span style="color: #000; font-weight: 900; font-size: 15px; background: #fef08a; padding: 2px 8px; border-radius: 4px; border: 1px solid #fde047;">${customerName}</span></div>
          <div class="info-col"><strong>حساب الوكيل:</strong> ${order.username || '---'}</div>
          <div class="info-col"><strong>إجمالي كمية الطلب:</strong> <span class="highlight-qty">${order.totalQuantity} قطعة</span></div>
        </div>

        ${order.notes && pageIndex === 0 ? `
          <div class="notes-box">
            <strong>ملاحظات الطلب:</strong> ${order.notes}
          </div>
        ` : ''}

        <!-- 25 Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 32px;">ت</th>
              <th>اسم المادة / المنتج</th>
              <th style="width: 100px;">الموديل / الرمز</th>
              <th style="width: 130px;">كود المادة</th>
              <th style="width: 70px;">الكمية (قطع)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="footer-row">
              <td colspan="4" class="text-left font-bold">مجموع كمية هذه الصفحة:</td>
              <td class="col-qty font-bold highlight-cell">${pageTotalQty}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Signatures & Footer -->
        <div class="page-footer">
          <div class="sig-box">توقيع المستلم: ....................</div>
          <div class="sig-box">توقيع مسؤول المخزن / التجهيز: ....................</div>
          <div class="sig-box">الختم والتأكيد: ....................</div>
        </div>
      </div>
    `);
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>طباعة طلبية - ${order.orderNumber || order.id?.slice(0, 8)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            direction: rtl;
            font-size: 11px;
            line-height: 1.2;
          }
          .print-page {
            width: 100%;
            height: 100%;
            max-height: 285mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #111;
            padding-bottom: 4px;
            margin-bottom: 4px;
          }
          .company-name {
            font-size: 16px;
            font-weight: 900;
            margin: 0;
            color: #000;
            letter-spacing: -0.5px;
          }
          .company-sub {
            font-size: 9.5px;
            color: #444;
            font-weight: bold;
          }
          .order-badge {
            border: 1.5px solid #000;
            border-radius: 4px;
            padding: 2px 8px;
            text-align: center;
            background: #f8f8f8;
            display: inline-block;
          }
          .badge-label {
            font-size: 8.5px;
            display: block;
            color: #555;
            font-weight: bold;
          }
          .badge-val {
            font-size: 13px;
            font-weight: 900;
            font-family: monospace;
          }
          .page-indicator {
            font-size: 8.5px;
            color: #666;
            text-align: center;
            margin-top: 2px;
            font-weight: bold;
          }
          .meta-item {
            font-size: 9.5px;
            text-align: left;
            margin-bottom: 1px;
          }
          .info-bar {
            display: flex;
            justify-content: space-between;
            background: #f3f3f3;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 3px 8px;
            margin-bottom: 4px;
            font-size: 9.5px;
          }
          .highlight-qty {
            font-weight: 900;
            font-size: 11px;
            color: #000;
            background: #ffe066;
            padding: 0 4px;
            border-radius: 2px;
          }
          .notes-box {
            font-size: 9px;
            background: #fff9db;
            border: 1px dashed #d4af37;
            padding: 2px 6px;
            margin-bottom: 4px;
            border-radius: 3px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
            flex-grow: 1;
          }
          .items-table th {
            background: #222;
            color: #fff;
            font-size: 9.5px;
            font-weight: bold;
            padding: 3px 4px;
            text-align: center;
            border: 1px solid #222;
          }
          .items-table td {
            padding: 2.2px 4px;
            border: 1px solid #bbb;
            font-size: 10px;
            vertical-align: middle;
          }
          .item-row:nth-child(even) {
            background-color: #fafafa;
          }
          .col-num {
            text-align: center;
            font-weight: bold;
            font-size: 9px;
            width: 26px;
          }
          .col-name {
            text-align: right;
            font-weight: bold;
          }
          .prod-title {
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 250px;
          }
          .col-model {
            text-align: center;
            font-size: 9.5px;
            font-family: monospace;
          }
          .col-code {
            text-align: center;
          }
          .code-badge {
            display: inline-block;
            font-family: monospace;
            font-weight: 900;
            font-size: 11px;
            letter-spacing: 0.5px;
            background: #eee;
            padding: 1px 5px;
            border-radius: 3px;
            border: 1px solid #999;
          }
          .col-qty {
            text-align: center;
            font-weight: 900;
            font-size: 11px;
          }
          .qty-num {
            font-size: 11px;
            font-weight: 900;
          }
          .footer-row td {
            background: #f0f0f0;
            font-size: 10px;
            border-top: 2px solid #000;
            padding: 3px 4px;
          }
          .text-left {
            text-align: left;
          }
          .highlight-cell {
            background: #ffe066 !important;
            font-size: 12px;
          }
          .page-footer {
            display: flex;
            justify-content: space-between;
            padding-top: 4px;
            border-top: 1px solid #000;
            margin-top: 2px;
            font-size: 8.5px;
            color: #333;
          }
          .sig-box {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${pagesHtml.join('')}
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print error:", e);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }
    }, 300);
  }
};
