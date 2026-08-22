import { Order } from '../types';

export interface CleanedOrderInfo {
  customerName: string; // explicitly entered customer name, or "" if none entered
  agentName: string;    // the agent/user account name
  transport: string;    // explicitly entered transport, or ""
  notes: string;        // explicitly entered notes by user, or ""
  displayNotes: string; // combined user text (transport + notes) or clean notes, or "" if empty
}

/**
 * Extracts and sanitizes order customer info, transport, and notes
 * without adding boilerplate or repetitive strings.
 */
export function parseOrderDetails(order?: Partial<Order> & { agentName?: string; visitorName?: string; displayCustomerName?: string }): CleanedOrderInfo {
  if (!order) {
    return {
      customerName: '',
      agentName: '',
      transport: '',
      notes: '',
      displayNotes: '',
    };
  }

  const agentName = (order.username || order.fullName || order.agentName || '').trim();
  const rawNotes = (order.notes || '').trim();
  
  let customerName = (order.customerName || order.visitorName || '').trim();
  // If customerName was filled with agent's name automatically, reset to empty
  if (customerName === agentName) {
    customerName = '';
  }

  let transport = (order.transport || '').trim();
  const cleanNotesLines: string[] = [];

  if (rawNotes) {
    const lines = rawNotes.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Filter out auto-generated agent boilerplate lines
      if (/^الوكيل:\s*/i.test(line) || /^معرف الوكيل:\s*/i.test(line)) {
        continue;
      }
      
      const visitorMatch = line.match(/^طلبية من زائر المعرض:\s*(.+)$/i) || line.match(/^زائر المعرض:\s*(.+)$/i);
      if (visitorMatch) {
        const val = visitorMatch[1].trim();
        if (val && !customerName) customerName = `زائر المعرض: ${val}`;
        continue;
      }

      const custMatch = line.match(/^اسم الزبون:\s*(.+)$/i);
      if (custMatch) {
        const val = custMatch[1].trim();
        if (val && val !== agentName && !customerName) {
          customerName = val;
        }
        continue;
      }

      const transMatch = line.match(/^النقليات:\s*(.+)$/i);
      if (transMatch) {
        const val = transMatch[1].trim();
        if (val && !transport) {
          transport = val;
        }
        continue;
      }

      const notePrefixMatch = line.match(/^(?:ملاحظات إضافية|ملاحظات الطلبية|الملاحظات|ملاحظات):\s*(.+)$/i);
      if (notePrefixMatch) {
        const val = notePrefixMatch[1].trim();
        if (val && val !== 'لا يوجد' && val !== '---') {
          cleanNotesLines.push(val);
        }
        continue;
      }

      cleanNotesLines.push(line);
    }
  }

  const cleanNotes = cleanNotesLines.join('\n').trim();

  // Combine user-written transport & notes for the notes cell if present
  const displayParts: string[] = [];
  if (transport) {
    displayParts.push(`النقليات: ${transport}`);
  }
  if (cleanNotes) {
    displayParts.push(cleanNotes);
  }

  return {
    customerName,
    agentName: agentName || 'الوكيل',
    transport,
    notes: cleanNotes,
    displayNotes: displayParts.join('\n').trim(),
  };
}
