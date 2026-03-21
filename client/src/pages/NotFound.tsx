import { motion } from "framer-motion";
import { Link } from "wouter";
import { Shield, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[oklch(0.09_0.02_255)] flex items-center justify-center px-4">
      <div className="absolute inset-0 hex-bg opacity-30" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center relative z-10"
      >
        <div className="w-20 h-20 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-blue-400" />
        </div>
        <div className="text-8xl font-bold text-white/10 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>404</div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Page Not Found</h1>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white border-0 gap-2">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-white/15 text-gray-300 gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
