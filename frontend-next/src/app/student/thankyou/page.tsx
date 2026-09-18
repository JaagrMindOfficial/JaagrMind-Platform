"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { CheckCircle2, Lightbulb } from "lucide-react";

export default function ThankYouPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    // Optional confetti or sounds could go here
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/student/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-full max-w-md text-center space-y-8 relative z-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto h-24 w-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 shadow-sm"
        >
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </motion.div>

        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold tracking-tight"
          >
            Thank You!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-lg leading-relaxed"
          >
            You have successfully completed the check-in. Your responses have been safely recorded.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-muted/50 border rounded-xl p-5 text-sm text-muted-foreground text-left flex gap-4 items-start shadow-sm"
        >
          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p>
            Remember: This check-in helps us understand how we can support your growth. 
            There are no right or wrong answers, only opportunities to learn more about yourself.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button size="lg" onClick={handleLogout} className="w-full sm:w-auto px-12 h-12 text-base">
            Back to Login
          </Button>
        </motion.div>
      </motion.div>

      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
