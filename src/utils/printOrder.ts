import { Order } from '../types';
import { formatDateTime } from './time';
import { parseOrderDetails } from './orderUtils';

export const printOrderInvoice = (order: Order) => {
  const ITEMS_PER_PAGE = 50;
  const items = order.items || [];
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const dateFormatted = formatDateTime(order.createdAt);
  const info = parseOrderDetails(order);

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
            <div class="prod-title" title="${prodName}">${prodName}</div>
          </td>
          <td class="col-model">${modelNum}</td>
          <td class="col-code"><span class="code-badge">${prodCode}</span></td>
          <td class="col-qty"><span class="qty-num">${qty}</span></td>
        </tr>
      `;
    }).join('');

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
            ${totalPages > 1 ? `<div class="page-indicator">ورقة ${pageIndex + 1} من ${totalPages} (50 مادة بالورقة)</div>` : `<div class="page-indicator">ورقة واحدة (50 مادة بالورقة)</div>`}
          </div>
          <div class="header-left">
            <div class="meta-item"><strong>التاريخ:</strong> <span dir="ltr">${dateFormatted}</span></div>
            <div class="meta-item"><strong>إجمالي المواد:</strong> <span>${items.length} مادة</span></div>
          </div>
        </div>

        <!-- Info Bar -->
        <div class="info-bar">
          ${info.customerName ? `
            <div class="info-col"><strong>اسم الزبون:</strong> <span class="customer-highlight">${info.customerName}</span></div>
            <div class="info-col"><strong>حساب الوكيل:</strong> <span>${info.agentName}</span></div>
          ` : `
            <div class="info-col"><strong>حساب الوكيل:</strong> <span class="customer-highlight">${info.agentName}</span></div>
            <div class="info-col"><strong>نوع الطلب:</strong> <span>طلب مباشر من الوكيل</span></div>
          `}
          <div class="info-col"><strong>إجمالي كمية الطلب:</strong> <span class="highlight-qty">${order.totalQuantity || order.items?.reduce((a, b) => a + (b.quantity || 0), 0) || 0} قطعة</span></div>
        </div>

        ${info.displayNotes && pageIndex === 0 ? `
          <div class="notes-box">
            <strong>الملاحظات والتفاصيل:</strong> <span>${info.displayNotes}</span>
          </div>
        ` : ''}

        <!-- 50 Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 28px;">ت</th>
              <th>اسم المادة / المنتج</th>
              <th style="width: 105px;">الموديل / الرمز</th>
              <th style="width: 130px;">كود المادة</th>
              <th style="width: 75px;">الكمية (قطع)</th>
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
            margin: 4mm 5mm 4mm 5mm;
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
            line-height: 1.15;
            -webkit-font-smoothing: antialiased;
          }
          .print-page {
            width: 100%;
            height: 100%;
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
            padding-bottom: 3px;
            margin-bottom: 3px;
          }
          .company-name {
            font-size: 17px;
            font-weight: 900;
            margin: 0;
            color: #000;
            letter-spacing: -0.3px;
          }
          .company-sub {
            font-size: 11px;
            color: #333;
            font-weight: bold;
            margin-top: 1px;
          }
          .order-badge {
            border: 1.5px solid #000;
            border-radius: 4px;
            padding: 2px 10px;
            text-align: center;
            background: #f8f8f8;
            display: inline-block;
          }
          .badge-label {
            font-size: 9.5px;
            display: block;
            color: #444;
            font-weight: bold;
          }
          .badge-val {
            font-size: 14px;
            font-weight: 900;
            font-family: monospace;
          }
          .page-indicator {
            font-size: 9.5px;
            color: #333;
            text-align: center;
            margin-top: 2px;
            font-weight: bold;
          }
          .meta-item {
            font-size: 11px;
            text-align: left;
            margin-bottom: 1px;
            color: #111;
          }
          .info-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f4f4f5;
            border: 1px solid #aaa;
            border-radius: 4px;
            padding: 3px 8px;
            margin-bottom: 3px;
            font-size: 11px;
          }
          .customer-highlight {
            color: #000;
            font-weight: 900;
            font-size: 13px;
            background: #fef08a;
            padding: 1px 6px;
            border-radius: 3px;
            border: 1px solid #eab308;
            display: inline-block;
          }
          .highlight-qty {
            font-weight: 900;
            font-size: 12px;
            color: #000;
            background: #ffe066;
            padding: 1px 6px;
            border-radius: 3px;
            border: 1px solid #d4af37;
          }
          .notes-box {
            font-size: 10px;
            background: #fffbeb;
            border: 1px dashed #d97706;
            padding: 2px 6px;
            margin-bottom: 3px;
            border-radius: 3px;
            color: #111;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3px;
            flex-grow: 1;
            table-layout: fixed;
          }
          .items-table th {
            background: #1e293b;
            color: #fff;
            font-size: 10.5px;
            font-weight: 900;
            padding: 2.5px 3px;
            text-align: center;
            border: 1px solid #0f172a;
            letter-spacing: -0.2px;
          }
          .items-table td {
            padding: 1.5px 3px;
            border: 1px solid #94a3b8;
            font-size: 10.5px;
            vertical-align: middle;
            height: 16.5px;
          }
          .item-row:nth-child(even) {
            background-color: #f8fafc;
          }
          .col-num {
            text-align: center;
            font-weight: 900;
            font-size: 10px;
          }
          .col-name {
            text-align: right;
            font-weight: bold;
            padding-right: 4px !important;
          }
          .prod-title {
            font-size: 10.5px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #0f172a;
          }
          .col-model {
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            font-family: monospace;
            color: #334155;
          }
          .col-code {
            text-align: center;
          }
          .code-badge {
            display: inline-block;
            font-family: monospace;
            font-weight: 900;
            font-size: 10.5px;
            letter-spacing: 0px;
            background: #f1f5f9;
            padding: 0 4px;
            border-radius: 2px;
            border: 1px solid #64748b;
            color: #0f172a;
          }
          .col-qty {
            text-align: center;
          }
          .qty-num {
            font-size: 11.5px;
            font-weight: 900;
            color: #000;
          }
          .footer-row td {
            background: #e2e8f0;
            font-size: 11px;
            border-top: 2px solid #0f172a;
            padding: 3px 4px;
          }
          .text-left {
            text-align: left;
          }
          .font-bold {
            font-weight: 900;
          }
          .highlight-cell {
            background: #fef08a !important;
            font-size: 12px;
            color: #000;
          }
          .page-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 3px;
            border-top: 1.5px solid #000;
            margin-top: 2px;
            font-size: 9.5px;
            color: #1e293b;
            font-weight: bold;
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

