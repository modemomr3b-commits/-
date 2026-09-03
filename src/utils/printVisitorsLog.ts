import { formatDateTime } from './time';
import { ShowcaseVisitRecord } from '../services/showcaseService';
import { User } from '../types';

export interface VisitorsLogPrintOptions {
  title?: string;
  scope?: 'all' | 'filtered' | 'agent';
  agentFilterName?: string;
  filterDescription?: string;
}

export const printVisitorsLogToPDF = (
  visits: ShowcaseVisitRecord[],
  users: User[] = [],
  options: VisitorsLogPrintOptions = {}
) => {
  const printTime = Date.now();
  const printTimeFormatted = formatDateTime(printTime);
  
  // Create quick lookup map for agents/users
  const userMap = new Map<string, User>();
  users.forEach(u => {
    if (u.id) userMap.set(u.id, u);
    if (u.uid) userMap.set(u.uid, u);
    if (u.username) userMap.set(u.username, u);
  });

  // Combine and prepare all records up to current moment
  const records = visits.map((v, index) => {
    const hostAgent = userMap.get(v.agentId) || users.find(u => u.username === v.agentId || u.fullName === v.agentName);
    const isOnline = Boolean(v.isOnline || (v.lastActive && printTime - v.lastActive < 45000));
    return {
      index: index + 1,
      id: v.id,
      visitorName: v.visitorName || 'زائر غير مسمى',
      visitorPhone: v.visitorPhone || '-',
      agentName: v.agentName || hostAgent?.fullName || 'معرض عام',
      agentPhone: hostAgent?.phone || '-',
      timestamp: v.timestamp || printTime,
      timestampFormatted: formatDateTime(v.timestamp || printTime),
      isOnline,
      method: v.method === 'invite' ? 'رابط دعوة' : 'دخول مباشر'
    };
  });

  // Group records by agent so each agent's customers appear together in succession ("كل وكيل وزبائنه سوة ومصنفين")
  records.sort((a, b) => {
    if (a.agentName !== b.agentName) {
      return a.agentName.localeCompare(b.agentName, 'ar');
    }
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
  records.forEach((r, idx) => {
    r.index = idx + 1;
  });

  // Calculate high-level summary statistics up to this moment
  const totalEntries = records.length;
  const uniqueVisitorNames = new Set(records.map(r => r.visitorName.toLowerCase().trim())).size;
  const onlineCount = records.filter(r => r.isOnline).length;
  const distinctAgents = new Set(records.map(r => r.agentName)).size;

  // Pagination for A4 paper (approx 28-30 rows per page with nice spacing)
  const ROWS_PER_PAGE = 26;
  const totalPages = Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE));
  const pagesHtml: string[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageRecords = records.slice(pageIndex * ROWS_PER_PAGE, (pageIndex + 1) * ROWS_PER_PAGE);

    const rowsHtml = pageRecords.map(r => `
      <tr class="log-row ${r.isOnline ? 'online-row' : ''}">
        <td class="col-idx font-mono">${r.index}</td>
        <td class="col-name font-bold">
          <div class="name-text">${escapeHtml(r.visitorName)}</div>
        </td>
        <td class="col-phone font-mono" dir="ltr">
          <span class="phone-badge">${escapeHtml(r.visitorPhone)}</span>
        </td>
        <td class="col-agent">
          <div class="agent-title font-bold">${escapeHtml(r.agentName)}</div>
          ${r.agentPhone !== '-' ? `<div class="sub-phone font-mono" dir="ltr">${escapeHtml(r.agentPhone)}</div>` : ''}
        </td>
        <td class="col-method">
          <span class="method-tag">${escapeHtml(r.method)}</span>
        </td>
        <td class="col-time font-mono" dir="ltr">
          ${escapeHtml(r.timestampFormatted)}
        </td>
        <td class="col-status">
          ${r.isOnline 
            ? `<span class="status-badge online">متصل الآن ●</span>` 
            : `<span class="status-badge verified">موثق ✓</span>`
          }
        </td>
      </tr>
    `).join('');

    pagesHtml.push(`
      <div class="print-page ${pageIndex < totalPages - 1 ? 'page-break' : ''}">
        <!-- Top Letterhead -->
        <div class="doc-header">
          <div class="header-brand">
            <h1 class="brand-title">شركة الوفاء المتميز للتجارة العامة</h1>
            <div class="brand-subtitle">نظام إدارة المعارض وروابط الزوار • التقرير الرسمي الشامل</div>
          </div>
          <div class="header-doc-info">
            <div class="doc-badge">تقرير رسمي PDF</div>
            <div class="doc-meta-item"><strong>تاريخ ووقت الطباعة:</strong> <span dir="ltr">${printTimeFormatted}</span></div>
            <div class="doc-meta-item"><strong>رقم الصفحة:</strong> صفحة ${pageIndex + 1} من إجمالي ${totalPages}</div>
          </div>
        </div>

        <!-- Document Title & Metrics (on first page) -->
        ${pageIndex === 0 ? `
          <div class="report-overview">
            <div class="report-title-block">
              <h2 class="report-main-title">
                ${options.title || 'سجل دخول زوار المعارض الشامل (حتى لحظة الطباعة)'}
              </h2>
              ${options.filterDescription ? `<div class="filter-note">${escapeHtml(options.filterDescription)}</div>` : ''}
            </div>

            <!-- Stats Bar -->
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-label">إجمالي حركات الدخول</span>
                <span class="stat-value font-mono">${totalEntries}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">عدد الزوار الفريدين</span>
                <span class="stat-value font-mono">${uniqueVisitorNames}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">المتواجدون أونلاين الآن</span>
                <span class="stat-value text-emerald font-mono">${onlineCount}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">عدد الوكلاء المستضيفين</span>
                <span class="stat-value font-mono">${distinctAgents}</span>
              </div>
            </div>
          </div>
        ` : `
          <div class="running-header">
            <span>تابع: سجل دخول الزوار (حتى لحظة الطباعة) • صفحة ${pageIndex + 1} من ${totalPages}</span>
            <span dir="ltr">${printTimeFormatted}</span>
          </div>
        `}

        <!-- Main Data Table -->
        <div class="table-container">
          <table class="visitors-table">
            <thead>
              <tr>
                <th style="width: 32px;">ت</th>
                <th style="width: 170px;">اسم الزائر الكريم</th>
                <th style="width: 115px;">رقم هاتف الزائر</th>
                <th>الوكيل المضيف / المعرض</th>
                <th style="width: 75px;">طريقة الدخول</th>
                <th style="width: 125px;">تاريخ ووقت الدخول</th>
                <th style="width: 75px;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Footer / Official Stamp Area -->
        <div class="doc-footer">
          <div class="footer-col">
            <span class="footer-label">تدقيق ومطابقة السجلات:</span>
            <span class="footer-line">.....................................</span>
          </div>
          <div class="footer-col text-center">
            <span class="footer-label">الختم الرسمي للإدارة:</span>
            <div class="stamp-placeholder">[ ختم شركة الوفاء المتميز ]</div>
          </div>
          <div class="footer-col text-left">
            <span class="footer-label">توقيع المسؤول المفوّض:</span>
            <span class="footer-line">.....................................</span>
          </div>
        </div>
      </div>
    `);
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>سجل زوار المعرض - شركة الوفاء المتميز - ${new Date(printTime).toISOString().slice(0, 10)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 7mm 6mm 7mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
            direction: rtl;
            font-size: 10px;
            line-height: 1.25;
            -webkit-font-smoothing: antialiased;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .font-bold {
            font-weight: 800;
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

          /* Header */
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 5px;
          }
          .brand-title {
            font-size: 16px;
            font-weight: 900;
            margin: 0;
            color: #0f172a;
          }
          .brand-subtitle {
            font-size: 9px;
            color: #475569;
            margin-top: 1px;
            font-weight: 600;
          }
          .header-doc-info {
            text-align: left;
            font-size: 9px;
            color: #1e293b;
          }
          .doc-badge {
            display: inline-block;
            background: #0f172a;
            color: #f8fafc;
            font-weight: 900;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 9px;
            margin-bottom: 2px;
          }
          .doc-meta-item {
            margin-top: 1px;
          }

          /* Overview & Stats */
          .report-overview {
            margin-bottom: 6px;
          }
          .report-main-title {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            margin: 3px 0 2px 0;
            text-align: center;
          }
          .filter-note {
            font-size: 9.5px;
            color: #334155;
            text-align: center;
            margin-bottom: 4px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            margin: 4px 0;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 4px 6px;
            text-align: center;
          }
          .stat-label {
            display: block;
            font-size: 8px;
            color: #64748b;
            font-weight: 700;
          }
          .stat-value {
            display: block;
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 1px;
          }
          .text-emerald {
            color: #047857 !important;
          }

          .running-header {
            display: flex;
            justify-content: space-between;
            font-size: 8.5px;
            font-weight: 700;
            color: #475569;
            border-bottom: 1px dashed #94a3b8;
            padding-bottom: 3px;
            margin-bottom: 5px;
          }

          /* Table */
          .table-container {
            flex: 1;
          }
          .visitors-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }
          .visitors-table th {
            background: #e2e8f0;
            color: #0f172a;
            border: 1px solid #64748b;
            padding: 4px 5px;
            font-weight: 900;
            font-size: 9px;
            text-align: right;
          }
          .visitors-table td {
            border: 1px solid #cbd5e1;
            padding: 3.5px 5px;
            vertical-align: middle;
          }
          .col-idx {
            text-align: center;
            font-weight: 900;
            color: #475569;
            background: #f8fafc;
          }
          .name-text {
            font-size: 10px;
            color: #0f172a;
          }
          .phone-badge {
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            padding: 1px 4px;
            border-radius: 2px;
            display: inline-block;
          }
          .agent-title {
            font-size: 9.5px;
            color: #1e293b;
          }
          .sub-phone {
            font-size: 8px;
            color: #64748b;
          }
          .method-tag {
            font-size: 8px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 1px 4px;
            border-radius: 3px;
            color: #334155;
            display: inline-block;
          }
          .status-badge {
            font-size: 8px;
            font-weight: 800;
            padding: 1.5px 5px;
            border-radius: 3px;
            display: inline-block;
            white-space: nowrap;
          }
          .status-badge.online {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .status-badge.verified {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .online-row td {
            background-color: #f0fdf4 !important;
          }

          /* Footer */
          .doc-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1.5px solid #000;
            padding-top: 4px;
            margin-top: 4px;
            font-size: 8.5px;
            color: #1e293b;
          }
          .footer-col {
            flex: 1;
          }
          .footer-label {
            display: block;
            font-weight: 700;
            margin-bottom: 3px;
          }
          .footer-line {
            color: #94a3b8;
          }
          .stamp-placeholder {
            border: 1px dashed #64748b;
            padding: 4px 8px;
            display: inline-block;
            border-radius: 4px;
            color: #64748b;
            font-weight: bold;
            font-size: 8px;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
        </style>
      </head>
      <body>
        ${pagesHtml.join('')}
      </body>
    </html>
  `;

  // Use isolated invisible iframe to avoid any DOM or window pollution
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
        console.error("Visitors Log Print error:", e);
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }
    }, 350);
  }
};

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
