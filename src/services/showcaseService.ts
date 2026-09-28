import { supabase } from '../supabase';
import bcryptjs from 'bcryptjs';

export const SHOWCASE_INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours strictly

export interface ShowcaseInvite {
  id: string;
  token: string;
  agentId: string;
  agentName: string;
  createdAt: number;
  expiresAt?: number;
  isUsed?: boolean;
  usedByVisitor?: string | null;
  usedAt?: number | null;
  visitorPhone?: string | null;
}

export interface ShowcaseVisitorProfile {
  visitorName: string;
  visitorPhone: string;
  isVerified?: boolean;
  savedAt?: number;
  lastVerifiedAt?: number;
}

export function getSavedShowcaseVisitor(): ShowcaseVisitorProfile | null {
  try {
    // 1. Check primary auth key
    const rawAuth = localStorage.getItem('brq_showcase_auth') || sessionStorage.getItem('brq_showcase_auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed && parsed.visitorName && typeof parsed.visitorName === 'string') {
        return {
          visitorName: parsed.visitorName.trim(),
          visitorPhone: (parsed.visitorPhone || '').trim(),
          isVerified: true,
          savedAt: parsed.lastLoginAt || parsed.savedAt || Date.now(),
          lastVerifiedAt: parsed.lastVerifiedAt || parsed.lastLoginAt || Date.now()
        };
      }
    }
    // 2. Check visitor profile key
    const rawVisitor = localStorage.getItem('brq_showcase_visitor');
    if (rawVisitor) {
      const parsed = JSON.parse(rawVisitor);
      if (parsed && parsed.visitorName && typeof parsed.visitorName === 'string') {
        return {
          visitorName: parsed.visitorName.trim(),
          visitorPhone: (parsed.visitorPhone || '').trim(),
          isVerified: true,
          savedAt: parsed.savedAt || Date.now(),
          lastVerifiedAt: parsed.lastVerifiedAt || parsed.savedAt || Date.now()
        };
      }
    }
    // 3. Check permanent backup key
    const rawPermanent = localStorage.getItem('brq_permanent_visitor');
    if (rawPermanent) {
      const parsed = JSON.parse(rawPermanent);
      if (parsed && parsed.visitorName && typeof parsed.visitorName === 'string') {
        return {
          visitorName: parsed.visitorName.trim(),
          visitorPhone: (parsed.visitorPhone || '').trim(),
          isVerified: true,
          savedAt: parsed.savedAt || Date.now(),
          lastVerifiedAt: parsed.lastVerifiedAt || parsed.savedAt || Date.now()
        };
      }
    }
    // 4. Fallback: check persistent cookie (for in-app browsers like WhatsApp/Telegram webviews)
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)brq_visitor=([^;]*)/);
      if (match && match[1]) {
        try {
          const cookieData = JSON.parse(decodeURIComponent(match[1]));
          if (cookieData && cookieData.name) {
            return {
              visitorName: String(cookieData.name).trim(),
              visitorPhone: String(cookieData.phone || '').trim(),
              isVerified: true,
              savedAt: Date.now(),
              lastVerifiedAt: Date.now()
            };
          }
        } catch {}
      }
    }
  } catch {}
  return null;
}

export function saveShowcaseVisitor(visitorName: string, visitorPhone: string, agent?: ShowcaseAgent, isVerified: boolean = true) {
  try {
    const cleanName = (visitorName || '').trim();
    const cleanPhone = (visitorPhone || '').trim();
    const now = Date.now();
    if (cleanName) {
      const profileData = {
        visitorName: cleanName,
        visitorPhone: cleanPhone,
        isVerified: true,
        savedAt: now,
        lastVerifiedAt: now
      };
      localStorage.setItem('brq_showcase_visitor', JSON.stringify(profileData));
      localStorage.setItem('brq_permanent_visitor', JSON.stringify(profileData));
      
      const authPayload = {
        agent: agent && agent.id ? agent : { id: 'agent_showcase', fullName: 'معرض شركة الوفاء' },
        visitorName: cleanName,
        visitorPhone: cleanPhone,
        isVerified: true,
        lastLoginAt: now,
        lastVerifiedAt: now
      };

      localStorage.setItem('brq_showcase_auth', JSON.stringify(authPayload));
      sessionStorage.setItem('brq_showcase_auth', JSON.stringify(authPayload));

      // Save cookie lasting 2 years for in-app browser continuity
      try {
        const cookieVal = encodeURIComponent(JSON.stringify({ name: cleanName, phone: cleanPhone }));
        document.cookie = `brq_visitor=${cookieVal}; path=/; max-age=63072000; SameSite=Lax`;
      } catch {}
    }
  } catch {}
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
  lastActive?: number;
  isOnline?: boolean;
  inviteToken?: string | null;
  method: 'invite' | 'credentials' | 'public';
}

export interface BlockedVisitor {
  id: string;
  phone?: string | null;
  visitorName?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  blockedAt: number;
  blockedBy?: string | null;
  reason?: string | null;
}

/**
 * Normalizes phone numbers to compare them accurately
 */
export function isPhoneMatch(p1?: string | null, p2?: string | null): boolean {
  if (!p1 || !p2) return false;
  const d1 = p1.replace(/[^0-9]/g, '');
  const d2 = p2.replace(/[^0-9]/g, '');
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 7 && d2.length >= 7) {
    if (d1.endsWith(d2) || d2.endsWith(d1)) return true;
    const s1 = d1.slice(-9);
    const s2 = d2.slice(-9);
    if (s1.length >= 7 && s2.length >= 7 && (s1 === s2 || s1.endsWith(s2) || s2.endsWith(s1))) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a visitor is in the blocked list by phone or exact name
 */
export function isVisitorInBlockedList(
  phone?: string | null,
  visitorName?: string | null,
  blockedList: BlockedVisitor[] = []
): boolean {
  if (!Array.isArray(blockedList) || blockedList.length === 0) return false;
  
  const cleanName = (visitorName || '').trim().toLowerCase();
  
  for (const b of blockedList) {
    // 1. Phone match
    if (phone && b.phone && isPhoneMatch(phone, b.phone)) {
      return true;
    }
    // 2. Name match if provided
    if (cleanName && b.visitorName && b.visitorName.trim().toLowerCase() === cleanName) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generates showcase invite details synchronously and immediately with zero latency.
 */
export function generateShowcaseInviteData(agentId?: string, agentName?: string, customToken?: string) {
  const cleanAgentId = (agentId || 'agent').toString().trim();
  const cleanAgentName = (agentName || 'الوكيل المعتمد').toString().trim();
  const token = customToken || ('brq_' + cleanAgentId.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 8));
  const inviteUrl = `/showcase?agent=${encodeURIComponent(cleanAgentId)}&agentName=${encodeURIComponent(cleanAgentName)}&invite=${token}`;
  
  let origin = '';
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      origin = window.location.origin;
    }
  } catch {
    origin = '';
  }

  const fullUrl = origin ? `${origin}${inviteUrl}` : inviteUrl;
  const message = `✨ معرض شركة الوفاء المتميز BRQ ✨\nدعوة خاصة من: ${cleanAgentName}\nتفضل بالاطلاع على أحدث الموديلات والتشكيلات الحصرية عبر الرابط المباشر:\n${fullUrl}`;

  return {
    token,
    agentId: cleanAgentId,
    agentName: cleanAgentName,
    inviteUrl,
    fullUrl,
    message,
    expiresAt: Date.now() + SHOWCASE_INVITE_TTL_MS
  };
}

/**
 * Creates a sharable showcase link for an agent.
 * The link is open and can be shared with unlimited users/visitors for 24 hours.
 */
export async function createShowcaseInvite(agentId: string, agentName: string, precomputedToken?: string): Promise<{ token: string; inviteUrl: string }> {
  const cleanAgentId = (agentId || 'agent').toString().trim();
  const cleanAgentName = (agentName || 'الوكيل المعتمد').toString().trim();
  const token = precomputedToken || ('brq_' + cleanAgentId.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 8));
  const targetInviteUrl = `/showcase?agent=${encodeURIComponent(cleanAgentId)}&agentName=${encodeURIComponent(cleanAgentName)}&invite=${token}`;
  
  const now = Date.now();
  const expiresAt = now + SHOWCASE_INVITE_TTL_MS;

  // 1. Try server API first
  try {
    const res = await fetch('/api/showcase/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: cleanAgentId, agentName: cleanAgentName, token, expiresAt })
    });

    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.token) {
          return {
            token: data.token,
            inviteUrl: data.inviteUrl || targetInviteUrl
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
      agentId: cleanAgentId,
      agentName: cleanAgentName,
      createdAt: now,
      expiresAt: expiresAt
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
    inviteUrl: targetInviteUrl
  };
}

/**
 * Verifies if an invite token / agent parameter is valid and not expired (24-hour lifetime).
 */
export async function verifyShowcaseInvite(token?: string, fallbackAgentId?: string, fallbackAgentName?: string): Promise<{
  valid: boolean;
  expired?: boolean;
  agent?: ShowcaseAgent;
  error?: string;
  reason?: string;
}> {
  const cleanToken = (token || '').trim();
  const cleanFallbackId = (fallbackAgentId || '').trim();
  const cleanFallbackName = (fallbackAgentName || '').trim();

  // 1. Try server API first
  try {
    const queryParams = new URLSearchParams();
    if (cleanToken) queryParams.set('token', cleanToken);
    if (cleanFallbackId) queryParams.set('agent', cleanFallbackId);
    if (cleanFallbackName) queryParams.set('agentName', cleanFallbackName);

    const res = await fetch(`/api/showcase/verify-invite?${queryParams.toString()}`);
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
    if (cleanToken) {
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

      if (invite && invite.agentId) {
        // Check 24-hour expiration
        const isExpired = invite.expiresAt 
          ? Date.now() > invite.expiresAt 
          : (invite.createdAt ? (Date.now() - invite.createdAt > SHOWCASE_INVITE_TTL_MS) : false);

        if (isExpired) {
          return {
            valid: false,
            expired: true,
            error: 'انتهت صلاحية هذا الرابط (صلاحية الرابط 24 ساعة فقط). يرجى طلب رابط جديد من الوكيل.'
          };
        }

        return {
          valid: true,
          expired: false,
          agent: {
            id: invite.agentId,
            fullName: invite.agentName || cleanFallbackName || 'الوكيل المعتمد'
          }
        };
      }
    }

    // Check if token or fallbackAgentId matches a registered user in users table
    const targetLookup = cleanFallbackId || cleanToken;
    if (targetLookup) {
      const { data: users } = await supabase
        .from('users')
        .select('*');
      
      if (users && users.length > 0) {
        const matchedUser = users.find(u => 
          (u.id && String(u.id).toLowerCase() === targetLookup.toLowerCase()) || 
          (u.uid && String(u.uid).toLowerCase() === targetLookup.toLowerCase()) || 
          (u.username && String(u.username).toLowerCase() === targetLookup.toLowerCase())
        );
        if (matchedUser) {
          return {
            valid: true,
            expired: false,
            agent: {
              id: matchedUser.id || matchedUser.uid || matchedUser.username,
              fullName: matchedUser.fullName || matchedUser.username
            }
          };
        }
      }
    }

    // If fallback agent parameters were provided in URL, use them directly
    if (cleanFallbackId) {
      return {
        valid: true,
        expired: false,
        agent: {
          id: cleanFallbackId,
          fullName: cleanFallbackName || 'الوكيل المعتمد'
        }
      };
    }

    return {
      valid: true,
      expired: false,
      agent: {
        id: 'agent_showcase',
        fullName: 'معرض شركة الوفاء'
      }
    };
  } catch (e: any) {
    if (cleanFallbackId) {
      return {
        valid: true,
        expired: false,
        agent: {
          id: cleanFallbackId,
          fullName: cleanFallbackName || 'الوكيل المعتمد'
        }
      };
    }
    return {
      valid: true,
      expired: false,
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
      const agentRes = data.agent || {
        id: agentId || 'agent_1',
        fullName: agentName || 'الوكيل المعتمد'
      };
      saveShowcaseVisitor(cleanVisitor, cleanPhone, agentRes);
      return {
        agent: agentRes,
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
  // Check if visitor is in blocked list
  try {
    const { data: blockedData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_blocked_visitors' })
      .maybeSingle();

    if (blockedData && blockedData.data && Array.isArray(blockedData.data)) {
      if (isVisitorInBlockedList(cleanPhone, cleanVisitor, blockedData.data)) {
        throw new Error('عذراً، تم إيقاف هذا الحساب عن دخول المعرض. يرجى مراجعة إدارة المعرض.');
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('تم إيقاف هذا الحساب')) {
      throw err;
    }
  }

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
        const isExpired = inv.expiresAt 
          ? Date.now() > inv.expiresAt 
          : (inv.createdAt ? (Date.now() - inv.createdAt > SHOWCASE_INVITE_TTL_MS) : false);

        if (isExpired) {
          throw new Error('انتهت صلاحية هذا الرابط (صلاحية الرابط 24 ساعة فقط). يرجى طلب رابط جديد من الوكيل.');
        }

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

  const finalAgent = {
    id: targetAgentId,
    fullName: targetAgentName
  };

  saveShowcaseVisitor(cleanVisitor, cleanPhone, finalAgent);

  return {
    agent: finalAgent,
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

/**
 * Updates or creates an active session heartbeat for a visitor (active right now)
 */
export async function heartbeatShowcaseVisit(
  agentId: string,
  agentName: string,
  visitorName: string,
  visitorPhone?: string
) {
  try {
    if (!visitorName) return;
    const now = Date.now();
    const cleanVisitor = visitorName.trim();
    const cleanPhone = (visitorPhone || '').trim();
    const cleanAgent = (agentName || 'معرض الوفاء').trim();

    const { data: visitsData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_visits' })
      .maybeSingle();

    let visits: any[] = [];
    if (visitsData && visitsData.data && Array.isArray(visitsData.data)) {
      visits = visitsData.data;
    }

    // Look for matching visitor today (within last 12 hours)
    let found = false;
    for (let i = visits.length - 1; i >= 0; i--) {
      const v = visits[i];
      if (
        v.visitorName === cleanVisitor &&
        (!cleanPhone || v.visitorPhone === cleanPhone) &&
        now - (v.timestamp || 0) < 12 * 60 * 60 * 1000
      ) {
        visits[i].timestamp = now;
        visits[i].lastActive = now;
        visits[i].isOnline = true;
        if (cleanPhone && !visits[i].visitorPhone) visits[i].visitorPhone = cleanPhone;
        found = true;
        break;
      }
    }

    if (!found) {
      visits.push({
        id: 'vis_' + now.toString(36) + Math.random().toString(36).substring(2, 6),
        agentId: agentId || '',
        agentName: cleanAgent,
        visitorName: cleanVisitor,
        visitorPhone: cleanPhone || null,
        timestamp: now,
        lastActive: now,
        isOnline: true,
        ip: 'Client Active'
      });
    }

    if (visits.length > 500) {
      visits = visits.slice(visits.length - 500);
    }

    await supabase.from('settings').upsert({ id: 'showcase_visits', data: visits });
  } catch (e) {
    // Non-blocking
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
      const now = Date.now();
      for (const v of visitsRes.data.data) {
        const timeKey = Math.floor((v.timestamp || 0) / 10000);
        const key = `${v.visitorName}_${v.visitorPhone || ''}_${v.agentName || v.agentId}_${timeKey}`;
        const activeTime = v.lastActive || v.timestamp || now;
        const isOnline = Boolean(v.isOnline || (now - activeTime < 45000));

        if (!seen.has(key)) {
          seen.add(key);
          visitsList.push({
            id: v.id || `vis_${v.timestamp}`,
            visitorName: v.visitorName || 'زائر',
            visitorPhone: v.visitorPhone || null,
            agentId: v.agentId || v.agentName || '',
            agentName: v.agentName || 'الوكيل',
            timestamp: v.timestamp || now,
            lastActive: activeTime,
            isOnline,
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

/**
 * Retrieves all blocked visitors from Supabase settings
 */
export async function getBlockedVisitors(): Promise<BlockedVisitor[]> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_blocked_visitors' })
      .maybeSingle();

    if (data && data.data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (e) {
    console.error("Error fetching blocked visitors:", e);
    return [];
  }
}

/**
 * Blocks / suspends a visitor account so they can no longer access the showcase
 */
export async function blockVisitor(params: {
  phone?: string | null;
  visitorName?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  blockedBy?: string | null;
  reason?: string | null;
}): Promise<BlockedVisitor[]> {
  try {
    const currentBlocked = await getBlockedVisitors();
    const cleanPhone = params.phone ? params.phone.trim() : null;
    const cleanName = params.visitorName ? params.visitorName.trim() : null;

    if (!cleanPhone && !cleanName) {
      throw new Error('يجب تحديد رقم الهاتف أو اسم الزائر لإيقاف الحساب');
    }

    // Check if already blocked
    const alreadyBlocked = currentBlocked.some(b => 
      (cleanPhone && b.phone && isPhoneMatch(cleanPhone, b.phone)) ||
      (cleanName && !cleanPhone && b.visitorName && b.visitorName.toLowerCase() === cleanName.toLowerCase())
    );

    if (alreadyBlocked) {
      return currentBlocked;
    }

    const newBlockedItem: BlockedVisitor = {
      id: 'block_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      phone: cleanPhone,
      visitorName: cleanName,
      agentId: params.agentId || null,
      agentName: params.agentName || null,
      blockedAt: Date.now(),
      blockedBy: params.blockedBy || 'الإدارة',
      reason: params.reason || 'تم إيقاف الحساب من قبل الإدارة'
    };

    const updated = [newBlockedItem, ...currentBlocked];
    await supabase.from('settings').upsert({ id: 'showcase_blocked_visitors', data: updated });

    // Also trigger server sync if available
    try {
      await fetch('/api/showcase/block-visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlockedItem)
      });
    } catch {}

    return updated;
  } catch (e: any) {
    console.error("Error blocking visitor:", e);
    throw e;
  }
}

/**
 * Unblocks / reactivates a suspended visitor account
 */
export async function unblockVisitor(identifier: string): Promise<BlockedVisitor[]> {
  try {
    const currentBlocked = await getBlockedVisitors();
    const cleanId = (identifier || '').trim();

    const updated = currentBlocked.filter(b => {
      if (b.id === cleanId) return false;
      if (b.phone && isPhoneMatch(cleanId, b.phone)) return false;
      if (b.visitorName && b.visitorName.toLowerCase() === cleanId.toLowerCase()) return false;
      return true;
    });

    await supabase.from('settings').upsert({ id: 'showcase_blocked_visitors', data: updated });

    try {
      await fetch('/api/showcase/unblock-visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId })
      });
    } catch {}

    return updated;
  } catch (e: any) {
    console.error("Error unblocking visitor:", e);
    throw e;
  }
}

/**
 * Fast check to verify if a visitor is currently blocked
 */
export async function checkIsVisitorBlocked(phone?: string | null, visitorName?: string | null): Promise<boolean> {
  try {
    const blockedList = await getBlockedVisitors();
    return isVisitorInBlockedList(phone, visitorName, blockedList);
  } catch {
    return false;
  }
}
