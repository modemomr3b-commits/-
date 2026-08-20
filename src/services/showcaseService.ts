import { supabase } from '../supabase';
import bcryptjs from 'bcryptjs';

export interface ShowcaseInvite {
  id: string;
  token: string;
  agentId: string;
  agentName: string;
  createdAt: number;
  isUsed: boolean;
  usedByVisitor?: string | null;
  usedAt?: number | null;
}

export interface ShowcaseAgent {
  id: string;
  fullName: string;
  username?: string;
}

/**
 * Creates a one-time invite token for an agent.
 * Works seamlessly on Cloud Run (with backend) and Vercel (direct Supabase).
 */
export async function createShowcaseInvite(agentId: string, agentName: string): Promise<{ token: string; inviteUrl: string }> {
  // 1. Try server API first
  try {
    const res = await fetch('/api/showcase/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, agentName })
    });

    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.token) {
          return {
            token: data.token,
            inviteUrl: `/showcase?invite=${data.token}`
          };
        }
      } catch {
        // Fall through to direct Supabase
      }
    }
  } catch (err) {
    console.warn("API create-invite failed, falling back to direct Supabase:", err);
  }

  // 2. Direct Supabase Fallback (Guaranteed to work on Vercel / Static deployments)
  const token = 'brq_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
  
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
    createdAt: Date.now(),
    isUsed: false,
    usedByVisitor: null,
    usedAt: null
  };

  invites.push(newInvite);
  if (invites.length > 500) {
    invites = invites.slice(invites.length - 500);
  }

  await supabase.from('settings').upsert({ id: 'showcase_invites', data: invites });

  return {
    token,
    inviteUrl: `/showcase?invite=${token}`
  };
}

/**
 * Verifies if an invite token is valid and unspent.
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
        // Fall through to direct Supabase
      }
    }
  } catch (err) {
    console.warn("API verify-invite failed, falling back to direct Supabase:", err);
  }

  // 2. Direct Supabase Fallback
  try {
    const { data: invitesData, error } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_invites' })
      .maybeSingle();

    if (error) {
      console.warn("Supabase fetch invites error:", error);
    }

    let invites: ShowcaseInvite[] = [];
    if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
      invites = invitesData.data;
    }

    const invite = invites.find((inv) => inv.token === cleanToken || inv.id === cleanToken);

    if (!invite) {
      return {
        valid: false,
        reason: 'not_found',
        error: 'رابط الدعوة غير موجود أو منتهي الصلاحية'
      };
    }

    if (invite.isUsed) {
      return {
        valid: false,
        reason: 'already_used',
        error: 'عذراً، هذا الرابط صالح للاستخدام لمرة واحدة فقط وقد تم استخدامه مسبقاً.'
      };
    }

    return {
      valid: true,
      agent: {
        id: invite.agentId,
        fullName: invite.agentName
      }
    };
  } catch (e: any) {
    return {
      valid: false,
      error: 'تعذر التحقق من صلاحية الرابط، يرجى المحاولة مرة أخرى'
    };
  }
}

/**
 * Performs login for Showcase either via single-use invite token or agent credentials.
 */
export async function loginShowcase(params: {
  visitorName: string;
  inviteToken?: string | null;
  username?: string;
  password?: string;
}): Promise<{ agent: ShowcaseAgent; visitorName: string }> {
  const { visitorName, inviteToken, username, password } = params;

  if (!visitorName || !visitorName.trim()) {
    throw new Error('يرجى إدخال اسمك الكريم');
  }

  const cleanVisitor = visitorName.trim();

  // 1. Try server API
  try {
    const res = await fetch('/api/showcase/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorName: cleanVisitor,
        inviteToken: inviteToken || undefined,
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
        visitorName: data.visitorName || cleanVisitor
      };
    } catch (parseErr: any) {
      if (parseErr.message && !parseErr.message.includes('JSON')) {
        throw parseErr;
      }
      // If it's a JSON parse error because server returned HTML (Vercel static), fallback
    }
  } catch (fetchErr: any) {
    if (fetchErr.message && !fetchErr.message.includes('JSON') && !fetchErr.message.includes('fetch') && !fetchErr.message.includes('pattern')) {
      throw fetchErr;
    }
    console.warn("API showcase login failed, switching to direct Supabase:", fetchErr);
  }

  // 2. Direct Supabase Fallback

  // Scenario A: Invite token
  if (inviteToken) {
    const { data: invitesData } = await supabase
      .from('settings')
      .select('*')
      .match({ id: 'showcase_invites' })
      .maybeSingle();

    let invites: ShowcaseInvite[] = [];
    if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
      invites = invitesData.data;
    }

    const inviteIdx = invites.findIndex((inv) => inv.token === inviteToken || inv.id === inviteToken);
    if (inviteIdx === -1) {
      throw new Error('رابط الدعوة غير صالح أو غير موجود.');
    }

    const currentInvite = invites[inviteIdx];
    if (currentInvite.isUsed) {
      throw new Error('عذراً! هذا الرابط صالح للاستخدام لمرة واحدة فقط وقد تم استخدامه مسبقاً.');
    }

    // Mark as used
    currentInvite.isUsed = true;
    currentInvite.usedByVisitor = cleanVisitor;
    currentInvite.usedAt = Date.now();
    invites[inviteIdx] = currentInvite;

    await supabase.from('settings').upsert({ id: 'showcase_invites', data: invites });

    // Log visit
    logShowcaseVisitDirectly(currentInvite.agentName, cleanVisitor);

    return {
      agent: {
        id: currentInvite.agentId,
        fullName: currentInvite.agentName
      },
      visitorName: cleanVisitor
    };
  }

  // Scenario B: Manual credentials
  const cleanUsername = username?.trim();
  const cleanPassword = password?.trim();

  if (!cleanUsername || !cleanPassword) {
    throw new Error('يرجى إدخال بيانات الدخول كاملة');
  }

  // Demo accounts
  if (cleanUsername === '1' && cleanPassword === '100') {
    logShowcaseVisitDirectly('المستخدم 1', cleanVisitor);
    return {
      agent: { id: '1', fullName: 'المستخدم 1', username: '1' },
      visitorName: cleanVisitor
    };
  }

  if (cleanUsername === 'wafaa' && cleanPassword === 'brq') {
    logShowcaseVisitDirectly('مدير النظام', cleanVisitor);
    return {
      agent: { id: 'wafaa', fullName: 'مدير النظام', username: 'wafaa' },
      visitorName: cleanVisitor
    };
  }

  // Look up user by username OR fullName (allowing friendly name match)
  const { data: users, error: sbErr } = await supabase
    .from('users')
    .select('*')
    .or(`username.eq.${cleanUsername},fullName.eq.${cleanUsername}`);

  if (sbErr || !users || users.length === 0) {
    throw new Error('بيانات الوكيل غير صحيحة');
  }

  const udoc = users[0];
  const isBcrypt = udoc.password && udoc.password.startsWith('$2');
  let isPasswordCorrect = false;

  if (isBcrypt) {
    isPasswordCorrect = bcryptjs.compareSync(cleanPassword, udoc.password);
  } else {
    isPasswordCorrect = (udoc.password === cleanPassword);
  }

  if (!isPasswordCorrect) {
    throw new Error('كلمة المرور غير صحيحة');
  }

  if (udoc.status === 'inactive' || udoc.isActive === false) {
    throw new Error('حساب الوكيل موقوف.');
  }

  logShowcaseVisitDirectly(udoc.fullName || udoc.username, cleanVisitor);

  return {
    agent: {
      id: udoc.id || udoc.uid || udoc.username,
      fullName: udoc.fullName || udoc.username,
      username: udoc.username
    },
    visitorName: cleanVisitor
  };
}

async function logShowcaseVisitDirectly(agentName: string, visitorName: string) {
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
      agentName,
      visitorName,
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
