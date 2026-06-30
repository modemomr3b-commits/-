import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Animated3DLogo from './ui/Animated3DLogo';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 1000); // 1s for fade out
    }, 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ 
            // Deep royal blue (#081B63) with elegant dark gradients
            background: 'radial-gradient(circle at center, #0a2569 0%, #081B63 40%, #020a17 100%)' 
          }}
        >
          {/* Ambient soft blue glow behind the logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              className="w-[40vw] h-[40vw] rounded-full bg-blue-500/20 blur-[100px]" 
              animate={{ scale: isHovered ? 1.2 : 1, opacity: isHovered ? 0.8 : 0.5 }}
              transition={{ duration: 1 }}
            />
          </div>

          {/* 3D Scene Container */}
          <motion.div
            className="relative flex flex-col items-center justify-center group cursor-pointer w-full h-full"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            {/* The R3F Canvas */}
            <div className="relative w-[350px] h-[350px] md:w-[500px] md:h-[500px] z-10 flex items-center justify-center">
               <Animated3DLogo isHovered={isHovered} scale={1.2} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
