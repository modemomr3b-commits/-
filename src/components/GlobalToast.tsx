import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store';

export default function GlobalToast() {
  const { toast } = useStore();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.2)] border backdrop-blur-md pointer-events-auto ${
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
              toast.type === 'loading' ? 'bg-brq-gold/10 border-brq-gold/50 text-brq-gold' :
              'bg-green-500/10 border-green-500/50 text-green-500'
            }`}
          >
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'loading' && <Loader2 size={20} className="animate-spin" />}
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
