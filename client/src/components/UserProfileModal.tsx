/**
 * UserProfileModal — Reusable compact user profile popup
 * Shows when any avatar or name is clicked across the app.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Calendar, MessageSquare, ExternalLink, Briefcase } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface UserProfileModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  userDept?: string;
  skills?: string[];
  joinDate?: string;
  onClose: () => void;
  onSendMessage: (userId: string, userName: string, userEmail: string) => void;
  onViewProfile: (userId: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const AVATAR_COLORS = [
  "#0066ff", "#8b5cf6", "#00e5a0", "#ffb800", "#ff6b35", "#00d4ff", "#ff3b3b",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDeptBadgeClass(dept?: string): string {
  switch (dept) {
    case "Executive":    return "text-red-400 bg-red-400/10";
    case "Engineering":  return "text-blue-400 bg-blue-400/10";
    case "Security":     return "text-cyan-400 bg-cyan-400/10";
    case "Operations":   return "text-green-400 bg-green-400/10";
    case "Marketing":    return "text-purple-400 bg-purple-400/10";
    default:             return "text-gray-400 bg-gray-400/10";
  }
}

function formatJoinDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function UserProfileModal({
  userId,
  userName,
  userEmail,
  userRole,
  userDept,
  skills = [],
  joinDate,
  onClose,
  onSendMessage,
  onViewProfile,
}: UserProfileModalProps) {
  const color = avatarColor(userName);
  const initials = getInitials(userName);
  const deptClass = getDeptBadgeClass(userDept);
  const visibleSkills = skills.slice(0, 4);
  const extraSkills = skills.length > 4 ? skills.length - 4 : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="profile-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      >
        <motion.div
          key="profile-modal"
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ backgroundColor: color }} />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors z-10"
            style={{ position: "absolute" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="p-5">
            {/* Avatar + name row */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[var(--foreground)] truncate">{userName}</h2>
                {userRole && (
                  <p className="text-xs text-[var(--muted-foreground)] font-mono truncate mt-0.5">{userRole}</p>
                )}
                {userDept && (
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${deptClass}`}>
                    {userDept}
                  </span>
                )}
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-mono truncate">{userEmail}</span>
              </div>
              {joinDate && (
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-mono">Joined {formatJoinDate(joinDate)}</span>
                </div>
              )}
              {userDept && (
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-mono">{userDept}</span>
                </div>
              )}
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {visibleSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-white/5 border border-[var(--border)] text-[var(--muted-foreground)] text-[10px] font-mono rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {extraSkills > 0 && (
                    <span className="px-2 py-0.5 bg-white/5 border border-[var(--border)] text-[var(--muted-foreground)] text-[10px] font-mono rounded-full">
                      +{extraSkills} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onSendMessage(userId, userName, userEmail)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0066ff]/10 hover:bg-[#0066ff]/20 border border-[#0066ff]/30 text-[#0066ff] text-xs font-mono rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send Message
              </button>
              <button
                onClick={() => onViewProfile(userId)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-[var(--border)] text-[var(--foreground)] text-xs font-mono rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Profile
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
