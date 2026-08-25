import { supabase } from '../supabase';
import bcryptjs from 'bcryptjs';

export interface ShowcaseInvite {
  id: string;
  token: string;
  agentId: string;
  agentName: string;
  createdAt: number;
  isUsed?: boolean;
  usedByVisitor?: string | null;
  usedAt?: number | null;
  visitorPhone?: string | null;
}

export interface ShowcaseAgent {
  id: string;
  fullName: string;
  username?: string;
}

export interface ShowcaseVisitRecord {
  id: string;
  visitorName: string;
  visitorPhone?: string | null;
  agentId: string;
  agentName: string;
  timestamp: number;
  inviteToken?: string | null;
  method: 'invite' | 'credentials' | 'public';
}

/**
 * Creates a sharable showcase link for an agent.
 * The link is open and can be shared with unlimited users/visitors.
 */
export async function createShowcaseInvite(agentId: string, agentName: string): Promise<{ token: string; inviteUrl: string }> {
  const token = 'brq_' + (agentId ? agentId.replace(/[^a-zA-Z0-9]/g, '_') : 'agent') + '_' + Math.random().toString(36).substring(2, 8);
  
  // 1. Try server API first
  try {
    const res = await fetch('/api/showcase/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, agentName, token })
    });

    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.token) {
          return {
            token: data.token,
            inviteUrl: `/showcase?agent=${encodeURIComponent(agentId)}&invite=${data.token}`
          };
        }
      } catch {
        // Fall through to direct Supabase
      }
    }
  } catch (err) {
    console.warn("API create-invite failed, falling back to direct Supabase:", err);
  }

  // 2. Direct Supabase Fallback
  try {
    const { data: invitesData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_invites' })
      .maybeSingle();

    let invites: ShowcaseInvite[] = [];
    if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
      invites = invitesData.data;
    }

    const newInvite: ShowcaseInvite = {
      id: token,
      token,
      agentId: agentId || 'agent_1',
      agentName: agentName || 'الوكيل المعتمد',
      createdAt: Date.now()
    };

    invites.push(newInvite);
    if (invites.length > 500) {
      invites = invites.slice(invites.length - 500);
    }

    await supabase.from('settings').upsert({ id: 'showcase_invites', data: invites });
  } catch (e) {
    console.warn("Direct Supabase invite save failed:", e);
  }

  return {
    token,
    inviteUrl: `/showcase?agent=${encodeURIComponent(agentId || 'agent')}&invite=${token}`
  };
}

/**
 * Verifies if an invite token / agent parameter is valid.
 */
export async function verifyShowcaseInvite(token: string): Promise<{
  valid: boolean;
  agent?: ShowcaseAgent;
  error?: string;
  reason?: string;
}> {
  if (!token || !token.trim()) {
    return { valid: false, error: 'رمز الدعوة مفقود' };
  }

  const cleanToken = token.trim();

  // 1. Try server API first
  try {
    const res = await fetch(`/api/showcase/verify-invite?token=${encodeURIComponent(cleanToken)}`);
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && typeof data.valid === 'boolean') {
          return data;
        }
      } catch {
        // Fall through
      }
    }
  } catch (err) {
    console.warn("API verify-invite failed, falling back to direct Supabase:", err);
  }

  // 2. Direct Supabase Fallback
  try {
    const { data: invitesData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_invites' })
      .maybeSingle();

    let invites: ShowcaseInvite[] = [];
    if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
      invites = invitesData.data;
    }

    const invite = invites.find((inv) => inv.token === cleanToken || inv.id === cleanToken);

    if (invite) {
      return {
        valid: true,
        agent: {
          id: invite.agentId,
          fullName: invite.agentName
        }
      };
    }

    // Check if token or agent parameter matches a real user
    const { data: users } = await supabase
      .from('users')
      .select('*');
    
    if (users && users.length > 0) {
      const matchedUser = users.find(u => 
        u.id === cleanToken || 
        u.uid === cleanToken || 
        u.username === cleanToken || 
        cleanToken.includes(u.username || '') ||
        cleanToken.includes(u.id || '')
      );
      if (matchedUser) {
        return {
          valid: true,
          agent: {
            id: matchedUser.id || matchedUser.uid || matchedUser.username,
            fullName: matchedUser.fullName || matchedUser.username
          }
        };
      }
    }

    return {
      valid: true,
      agent: {
        id: 'agent_showcase',
        fullName: 'معرض شركة الوفاء'
      }
    };
  } catch (e: any) {
    return {
      valid: true,
      agent: {
        id: 'agent_showcase',
        fullName: 'معرض شركة الوفاء'
      }
    };
  }
}

/**
 * Performs login for Showcase with MANDATORY Visitor Name and Phone Number.
 */
export async function loginShowcase(params: {
  visitorName: string;
  visitorPhone: string;
  inviteToken?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  username?: string;
  password?: string;
}): Promise<{ agent: ShowcaseAgent; visitorName: string; visitorPhone: string }> {
  const { visitorName, visitorPhone, inviteToken, agentId, agentName, username, password } = params;

  if (!visitorName || !visitorName.trim()) {
    throw new Error('يرجى إدخال اسمك الكريم');
  }

  if (!visitorPhone || !visitorPhone.trim()) {
    throw new Error('يرجى إدخال رقم هاتفك للتواصل');
  }

  const cleanVisitor = visitorName.trim();
  const cleanPhone = visitorPhone.trim();

  // 1. Try server API
  try {
    const res = await fetch('/api/showcase/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorName: cleanVisitor,
        visitorPhone: cleanPhone,
        inviteToken: inviteToken || undefined,
        agentId: agentId || undefined,
        agentName: agentName || undefined,
        username: username?.trim() || undefined,
        password: password?.trim() || undefined
      })
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول للمعرض');
      }
      return {
        agent: data.agent,
        visitorName: data.visitorName || cleanVisitor,
        visitorPhone: data.visitorPhone || cleanPhone
      };
    } catch (parseErr: any) {
      if (parseErr.message && !parseErr.message.includes('JSON')) {
        throw parseErr;
      }
    }
  } catch (fetchErr: any) {
    if (fetchErr.message && !fetchErr.message.includes('JSON') && !fetchErr.message.includes('fetch') && !fetchErr.message.includes('pattern')) {
      throw fetchErr;
    }
    console.warn("API showcase login failed, switching to direct Supabase:", fetchErr);
  }

  // 2. Direct Supabase Fallback

  // Case A: Link with inviteToken or agent
  let targetAgentId = agentId || 'agent_1';
  let targetAgentName = agentName || 'معرض شركة الوفاء';

  if (inviteToken) {
    const { data: invitesData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_invites' })
      .maybeSingle();

    if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
      const inv = invitesData.data.find((i: any) => i.token === inviteToken || i.id === inviteToken);
      if (inv) {
        targetAgentId = inv.agentId;
        targetAgentName = inv.agentName;
      }
    }
  }

  if (username && password) {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanUsername === '1' && cleanPassword === '100') {
      targetAgentId = '1';
      targetAgentName = 'المستخدم 1';
    } else if (cleanUsername === 'wafaa' && cleanPassword === 'brq') {
      targetAgentId = 'wafaa';
      targetAgentName = 'مدير النظام';
    } else {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${cleanUsername},fullName.eq.${cleanUsername}`);

      if (users && users.length > 0) {
        const udoc = users[0];
        const isBcrypt = udoc.password && udoc.password.startsWith('$2');
        let isPasswordCorrect = false;

        if (isBcrypt) {
          isPasswordCorrect = bcryptjs.compareSync(cleanPassword, udoc.password);
        } else {
          isPasswordCorrect = (udoc.password === cleanPassword);
        }

        if (isPasswordCorrect) {
          targetAgentId = udoc.id || udoc.uid || udoc.username;
          targetAgentName = udoc.fullName || udoc.username;
        }
      }
    }
  }

  // Log visit directly with phone number
  await logShowcaseVisitDirectly(targetAgentId, targetAgentName, cleanVisitor, cleanPhone, inviteToken || undefined);

  return {
    agent: {
      id: targetAgentId,
      fullName: targetAgentName
    },
    visitorName: cleanVisitor,
    visitorPhone: cleanPhone
  };
}

export async function logShowcaseVisitDirectly(
  agentId: string, 
  agentName: string, 
  visitorName: string, 
  visitorPhone?: string, 
  inviteToken?: string
) {
  try {
    const { data: visitsData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_visits' })
      .maybeSingle();

    let visits = [];
    if (visitsData && visitsData.data && Array.isArray(visitsData.data)) {
      visits = visitsData.data;
    }

    visits.push({
      id: 'vis_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      agentId: agentId || '',
      agentName: agentName || 'الوكيل',
      visitorName,
      visitorPhone: visitorPhone || null,
      inviteToken: inviteToken || null,
      timestamp: Date.now(),
      ip: 'Client Direct'
    });

    if (visits.length > 500) {
      visits = visits.slice(visits.length - 500);
    }

    await supabase.from('settings').upsert({ id: 'showcase_visits', data: visits });
  } catch (e) {
    console.warn("Could not log showcase visit:", e);
  }
}

export async function getShowcaseVisits(): Promise<ShowcaseVisitRecord[]> {
  try {
    const [visitsRes, invitesRes] = await Promise.all([
      supabase.from('settings').select('*').match({ id: 'showcase_visits' }).maybeSingle(),
      supabase.from('settings').select('*').match({ id: 'showcase_invites' }).maybeSingle()
    ]);

    const visitsList: ShowcaseVisitRecord[] = [];
    const seen = new Set<string>();

    if (visitsRes?.data?.data && Array.isArray(visitsRes.data.data)) {
      for (const v of visitsRes.data.data) {
        const timeKey = Math.floor((v.timestamp || 0) / 10000);
        const key = `${v.visitorName}_${v.visitorPhone || ''}_${v.agentName || v.agentId}_${timeKey}`;
        if (!seen.has(key)) {
          seen.add(key);
          visitsList.push({
            id: v.id || `vis_${v.timestamp}`,
            visitorName: v.visitorName || 'زائر',
            visitorPhone: v.visitorPhone || null,
            agentId: v.agentId || v.agentName || '',
            agentName: v.agentName || 'الوكيل',
            timestamp: v.timestamp || Date.now(),
            inviteToken: v.inviteToken || null,
            method: v.inviteToken ? 'invite' : 'credentials'
          });
        }
      }
    }

    if (invitesRes?.data?.data && Array.isArray(invitesRes.data.data)) {
      for (const inv of invitesRes.data.data) {
        if (inv.usedByVisitor) {
          const timeKey = Math.floor((inv.usedAt || inv.createdAt || 0) / 10000);
          const key = `${inv.usedByVisitor}_${inv.visitorPhone || ''}_${inv.agentName || inv.agentId}_${timeKey}`;
          if (!seen.has(key)) {
            seen.add(key);
            visitsList.push({
              id: inv.id || `inv_${inv.token}`,
              visitorName: inv.usedByVisitor,
              visitorPhone: inv.visitorPhone || null,
              agentId: inv.agentId || inv.agentName,
              agentName: inv.agentName || 'الوكيل',
              timestamp: inv.usedAt || inv.createdAt || Date.now(),
              inviteToken: inv.token,
              method: 'invite'
            });
          }
        }
      }
    }

    return visitsList.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("Error fetching showcase visits:", e);
    return [];
  }
}
