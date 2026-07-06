const fs = require('fs');
let member = fs.readFileSync('src/components/MemberLayout.tsx', 'utf8');

if (!member.includes("path: '/messages'")) {
  member = member.replace(
    /import \{ Home, Search, Heart, ShoppingBag, User, LogOut, Menu, X, Plus, Shield, ShieldCheck, Download, Share, ChevronLeft, Trash2 \} from 'lucide-react';/,
    "import { Home, Search, Heart, ShoppingBag, User, LogOut, Menu, X, Plus, Shield, ShieldCheck, Download, Share, ChevronLeft, Trash2, MessageCircle } from 'lucide-react';"
  );
  member = member.replace(
    /\{ icon: ShoppingBag, path: '\/cart', label: 'الطلبات', badge: cart.length \},/,
    `{ icon: ShoppingBag, path: '/cart', label: 'الطلبات', badge: cart.length },\n    { icon: MessageCircle, path: '/messages', label: 'الرسائل' },`
  );
  fs.writeFileSync('src/components/MemberLayout.tsx', member);
}

let admin = fs.readFileSync('src/components/AdminLayout.tsx', 'utf8');
if (!admin.includes("path: '/admin/notifications'")) {
  admin = admin.replace(
    /import \{[\s\S]*?\} from 'lucide-react';/,
    (match) => {
      if (!match.includes('MessageSquare')) {
        return match.replace('Trash2,', 'Trash2, MessageSquare,');
      }
      return match;
    }
  );
  admin = admin.replace(
    /\{ icon: Users, path: '\/admin\/users', label: 'إدارة المستخدمين' \},/,
    `{ icon: Users, path: '/admin/users', label: 'إدارة المستخدمين' },\n    { icon: MessageSquare, path: '/admin/notifications', label: 'الرسائل' },`
  );
  fs.writeFileSync('src/components/AdminLayout.tsx', admin);
}
