import { motion } from 'framer-motion';
import { MessageCircle, Shield, Sparkles, Clock, BookmarkPlus, Languages } from 'lucide-react';

export default function WelcomeScreen() {
  const features = [
    { icon: Shield, label: 'End-to-End Encrypted', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Clock, label: 'Smart Scheduler', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: BookmarkPlus, label: 'Message Bookmarks', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { icon: Languages, label: 'AI Translation', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center bg-dark-950 px-8">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center relative z-10"
      >
        <motion.div
          className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-primary-500/20"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MessageCircle className="w-12 h-12 text-white" />
        </motion.div>

        <h2 className="text-4xl font-bold text-white mb-3">Nexus Chat</h2>
        <p className="text-dark-400 text-lg mb-10 max-w-md mx-auto">
          Select a conversation to start messaging, or search for someone new to connect with.
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className={`${feature.bg} border border-white/5 rounded-xl p-4 flex flex-col items-center gap-2`}
            >
              <feature.icon className={`w-5 h-5 ${feature.color}`} />
              <span className="text-xs text-dark-300 font-medium">{feature.label}</span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-dark-600 text-xs mt-8 flex items-center justify-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          Your messages are end-to-end encrypted
        </motion.p>
      </motion.div>
    </div>
  );
}
