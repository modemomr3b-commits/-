import { Order } from '../types';

export interface CleanedOrderInfo {
  customerName: string; // explicitly entered customer name, or "" if none entered
  agentName: string;    // the agent/user account name
  agentId: string;      // the agent's user ID
  transport: string;    // explicitly entered transport, or ""
  notes: string;        // explicitly entered notes by user, or ""
  displayNotes: string; // combined user text (transport + notes) or clean notes, or "" if empty
}

/**
 * Extracts and sanitizes order customer info, transport, and notes
 * without adding boilerplate or repetitive strings.
 */
export function parseOrderDetails(order?: Partial<Order> & { agentName?: string; visitorName?: string; displayCustomerName?: string; rawNotes?: string }): CleanedOrderInfo {
  if (!order) {
    return {
      customerName: '',
      agentName: '',
      agentId: '',
      transport: '',
      notes: '',
      displayNotes: '',
    };
  }

  let agentName = (order.username || order.fullName || order.agentName || '').trim();
  let agentId = (order.userId || '').toString().trim();
  const rawNotes = (order.rawNotes || order.notes || '').trim();
  
  let customerName = (order.customerName || order.visitorName || '').trim();
  let transport = (order.transport || '').trim();
  const cleanNotesLines: string[] = [];

  if (rawNotes) {
    const lines = rawNotes.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Extract agent name if not set
      const agentMatch = line.match(/^(?:الوكيل|اسم الوكيل):\s*(.+)$/i);
      if (agentMatch) {
        const val = agentMatch[1].trim();
        if (val && !agentName) {
          agentName = val;
        }
        continue;
      }

      // Extract agent id if not set
      const agentIdMatch = line.match(/^(?:معرف الوكيل|كود الوكيل|معرف المستخدم):\s*(.+)$/i);
      if (agentIdMatch) {
        const val = agentIdMatch[1].trim();
        if (val && !agentId) {
          agentId = val;
        }
        continue;
      }
      
      const visitorMatch = line.match(/^طلبية من زائر المعرض:\s*(.+)$/i) || line.match(/^زائر المعرض:\s*(.+)$/i);
      if (visitorMatch) {
        const val = visitorMatch[1].trim();
        if (val && (!customerName || customerName === agentName)) {
          customerName = `زائر المعرض: ${val}`;
        }
        continue;
      }

      const custMatch = line.match(/^اسم الزبون:\s*(.+)$/i);
      if (custMatch) {
        const val = custMatch[1].trim();
        if (val && (!customerName || customerName === agentName)) {
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

  // If customerName was filled with agent's name automatically, reset to empty
  if (customerName === agentName) {
    customerName = '';
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
    agentId: agentId || '',
    transport,
    notes: cleanNotes,
    displayNotes: displayParts.join('\n').trim(),
  };
}

/**
 * Checks if an order belongs to the currently logged in agent.
 */
export function isOrderBelongsToAgent(order: any, user: any): boolean {
  if (!order || !user) return false;
  if (user.role === 'admin') return true;

  const uId = (user.id || user.uid || '').toString().toLowerCase().trim();
  const uName = (user.username || '').toLowerCase().trim();
  const uFull = (user.fullName || '').toLowerCase().trim();

  const oUserId = (order.userId || '').toString().toLowerCase().trim();
  const oAgentId = (order.agentId || '').toString().toLowerCase().trim();
  const oUsername = (order.username || '').toLowerCase().trim();
  const oFullName = (order.fullName || '').toLowerCase().trim();
  const oAgentName = (order.agentName || '').toLowerCase().trim();
  const oCust = (order.customerName || '').toLowerCase().trim();
  const oNotes = (order.rawNotes || order.notes || '').toLowerCase();

  // 1. Match by Agent ID
  if (uId && (oUserId === uId || oAgentId === uId || oNotes.includes(uId))) {
    return true;
  }

  // 2. Match by Username
  if (uName && (
    oUserId === uName || 
    oUsername === uName || 
    oFullName === uName || 
    oAgentName === uName || 
    oCust === uName || 
    oNotes.includes(uName)
  )) {
    return true;
  }

  // 3. Match by Full Name
  if (uFull && (
    oFullName === uFull || 
    oUsername === uFull || 
    oAgentName === uFull || 
    oCust === uFull || 
    oNotes.includes(uFull)
  )) {
    return true;
  }

  return false;
}
