/**
 * UserProfile — Public full-profile page (/u/:userId)
 * Mobile-first, community-style profile. No DashboardLayout.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, MessageSquare, Users, Heart, Send, Loader2,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  joinDate: string;
  skills: string[];
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  type: string;
  likes: string[];
  createdAt: string;
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
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function getCoverGradient(dept?: string): string {
  switch (dept) {
    case "Executive":   return "from-red-900 to-gray-900";
    case "Engineering": return "from-blue-900 to-gray-900";
    case "Security":    return "from-cyan-900 to-gray-900";
    case "Operations":  return "from-green-900 to-gray-900";
    case "Marketing":   return "from-purple-900 to-gray-900";
    default:            return "from-gray-800 to-gray-900";
  }
}

function getDeptBadgeClass(dept?: string): string {
  switch (dept) {
    case "Executive":   return "text-red-400 bg-red-400/10";
    case "Engineering": return "text-blue-400 bg-blue-400/10";
    case "Security":    return "text-cyan-400 bg-cyan-400/10";
    case "Operations":  return "text-green-400 bg-green-400/10";
    case "Marketing":   return "text-purple-400 bg-purple-400/10";
    default:            return "text-gray-400 bg-gray-400/10";
  }
}

function getToken(): string {
  return localStorage.getItem("sisg_admin_token") || "";
}

async function apiFetch(path: string, opts: RequestInit = {}): Promise<unknown> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ============================================================================
// POST CARD
// ============================================================================

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onLike: (postId: string) => void;
}

function PostCard({ post, currentUserId, onLike }: PostCardProps) {
  const color = avatarColor(post.authorName);
  const liked = currentUserId ? post.likes.includes(currentUserId) : false;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card,#111)] border border-[var(--border,#222)] rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {getInitials(post.authorName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm text-white">{post.authorName}</span>
            <span className="text-[10px] font-mono text-gray-500">{timeAgo(post.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{post.content}</p>
        </div>
      </div>
      {/* Like button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
            liked
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-white/5 text-gray-500 border border-white/10 hover:text-red-400 hover:border-red-500/30"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
          {post.likes.length}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

type Tab = "wall" | "about" | "skills";

export default function UserProfile() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [, navigate] = useLocation();

  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("wall");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [postContent, setPostContent] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postsCount, setPostsCount] = useState(0);

  // Fetch user data
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/admin/users/${userId}`)
      .then((data) => {
        setUser(data as UserData);
      })
      .catch(() => {
        setError("User not found");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    try {
      const data = await apiFetch(`/api/admin/users/${userId}/posts`) as { posts: Post[] };
      setPosts(data.posts || []);
      setPostsCount((data.posts || []).length);
    } catch {
      // silently fail
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Check own profile
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiFetch("/api/admin/verify")
      .then((data) => {
        const d = data as { user?: { id?: string; email?: string } };
        const me = d.user;
        if (me && user) {
          const sameById = me.id === userId;
          const sameByEmail = me.email === user.email;
          if (sameById || sameByEmail) {
            setIsOwnProfile(true);
            setCurrentUserId(me.id || me.email || null);
          }
        }
      })
      .catch(() => {});
  }, [userId, user]);

  const handlePost = async () => {
    if (!postContent.trim() || !user) return;
    setSubmittingPost(true);
    try {
      const token = getToken();
      if (!token) return;
      await fetch(`/api/admin/users/${userId}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: postContent.trim() }),
      });
      setPostContent("");
      fetchPosts();
    } catch {
      // silently fail
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/users/${userId}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (res.ok) {
        const data = await res.json() as { post: Post };
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
      }
    } catch {
      // silently fail
    }
  };

  // ---- LOADING / ERROR ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0066ff] animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-lg">{error || "User not found"}</p>
        <button
          onClick={() => navigate("/")}
          className="text-[#0066ff] hover:underline text-sm font-mono"
        >
          ← Go home
        </button>
      </div>
    );
  }

  const color = avatarColor(user.name);
  const coverGradient = getCoverGradient(user.department);
  const deptClass = getDeptBadgeClass(user.department);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ---- TOP NAV ---- */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gray-950/90 backdrop-blur border-b border-white/5">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="font-bold tracking-widest text-sm text-white">SISG</span>
        <div className="w-14" /> {/* spacer */}
      </nav>

      {/* ---- COVER + AVATAR HERO ---- */}
      <div className="pt-[52px]">
        {/* Cover */}
        <div className={`relative h-[200px] bg-gradient-to-br ${coverGradient}`}>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "24px 24px" }}
          />
        </div>

        {/* Avatar overlapping cover */}
        <div className="relative px-4 pb-4">
          <div className="flex items-end justify-between -mt-12 mb-3">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-950 shadow-xl flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {getInitials(user.name)}
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => navigate("/dashboard/messages")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066ff]/10 hover:bg-[#0066ff]/20 border border-[#0066ff]/30 text-[#0066ff] text-xs font-mono rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </button>
              <button
                onClick={() => navigate("/dashboard/team")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono rounded-lg transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                Team Page
              </button>
            </div>
          </div>

          {/* Name, role, dept */}
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{user.role}</p>
          {user.department && (
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-mono font-semibold ${deptClass}`}>
              {user.department}
            </span>
          )}
        </div>

        {/* ---- STATS ROW ---- */}
        <div className="mx-4 mb-4 bg-gray-900/60 border border-white/5 rounded-xl p-3 grid grid-cols-3 divide-x divide-white/10">
          <div className="text-center px-2">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Member Since</p>
            <p className="text-sm font-semibold text-white">
              {user.joinDate ? new Date(user.joinDate).getFullYear() : "—"}
            </p>
          </div>
          <div className="text-center px-2">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Department</p>
            <p className="text-sm font-semibold text-white truncate">{user.department || "—"}</p>
          </div>
          <div className="text-center px-2">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Posts</p>
            <p className="text-sm font-semibold text-white">{postsCount}</p>
          </div>
        </div>

        {/* ---- TABS ---- */}
        <div className="mx-4 flex border-b border-white/10 mb-4">
          {(["wall", "about", "skills"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 ${
                tab === t
                  ? "border-[#0066ff] text-[#0066ff]"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ---- TAB CONTENT ---- */}
        <div className="px-4 pb-20">
          <AnimatePresence mode="wait">
            {/* WALL TAB */}
            {tab === "wall" && (
              <motion.div
                key="wall"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Post composer (own profile only) */}
                {isOwnProfile && (
                  <div className="bg-gray-900/60 border border-white/5 rounded-xl p-3">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="What's on your mind?"
                      rows={3}
                      className="w-full bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handlePost}
                        disabled={!postContent.trim() || submittingPost}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0066ff] hover:bg-[#0055dd] disabled:opacity-40 text-white text-xs font-mono rounded-lg transition-colors"
                      >
                        {submittingPost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Post
                      </button>
                    </div>
                  </div>
                )}

                {/* Posts feed */}
                {postsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                    <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">No posts yet</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      onLike={handleLike}
                    />
                  ))
                )}
              </motion.div>
            )}

            {/* ABOUT TAB */}
            {tab === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="bg-gray-900/60 border border-white/5 rounded-xl divide-y divide-white/5">
                  {[
                    { label: "Full Name", value: user.name },
                    { label: "Email", value: user.email },
                    { label: "Role", value: user.role },
                    { label: "Department", value: user.department },
                    {
                      label: "Join Date",
                      value: user.joinDate
                        ? new Date(user.joinDate).toLocaleDateString(undefined, {
                            year: "numeric", month: "long", day: "numeric",
                          })
                        : "—",
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{label}</span>
                      <span className="text-sm text-white">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SKILLS TAB */}
            {tab === "skills" && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {user.skills.length === 0 ? (
                  <p className="text-center text-gray-600 py-12 text-sm">No skills listed</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 bg-gray-900/60 border border-white/10 text-gray-300 text-xs font-mono rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
