import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: 'page' | 'blog' | 'section';
  status: 'published' | 'draft' | 'archived';
  content: string;
  lastEdited: string;
}

interface KPI {
  label: string;
  value: number;
  icon: React.ReactNode;
}

const ContentManagement: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pages' | 'blog' | 'sections'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newContent, setNewContent] = useState({
    title: '',
    slug: '',
    type: 'page' as const,
    content: '',
  });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('sisg_admin_token');

  // Fetch content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/admin/content', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setContent(data);
          applyFilters(data, activeFilter, searchTerm);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchContent();
    }
  }, [token]);

  // Apply filters
  useEffect(() => {
    applyFilters(content, activeFilter, searchTerm);
  }, [activeFilter, searchTerm, content]);

  const applyFilters = (items: ContentItem[], filter: typeof activeFilter, search: string) => {
    let filtered = items;

    if (filter !== 'all') {
      filtered = filtered.filter(item => {
        if (filter === 'pages') return item.type === 'page';
        if (filter === 'blog') return item.type === 'blog';
        if (filter === 'sections') return item.type === 'section';
        return true;
      });
    }

    if (search) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredContent(filtered);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/content/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        const updatedItem = content.find(item => item.id === id);
        if (updatedItem) {
          updatedItem.content = editContent;
          setContent([...content]);
          setEditingId(null);
        }
      }
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const handleAddContent = async () => {
    if (!newContent.title || !newContent.slug || !newContent.content) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newContent,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setContent([...content, created]);
        setNewContent({ title: '', slug: '', type: 'page', content: '' });
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error creating content:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'page':
        return 'bg-[#0066ff]/10 text-[#0066ff]';
      case 'blog':
        return 'bg-[#8b5cf6]/10 text-[#8b5cf6]';
      case 'section':
        return 'bg-[#00d4ff]/10 text-[#00d4ff]';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-[#00e5a0]/10 text-[#00e5a0]';
      case 'draft':
        return 'bg-[#ffb800]/10 text-[#ffb800]';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const kpis: KPI[] = [
    {
      label: 'Total Pages',
      value: content.length,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      label: 'Published',
      value: content.filter(c => c.status === 'published').length,
      icon: <Eye className="w-5 h-5" />,
    },
    {
      label: 'Drafts',
      value: content.filter(c => c.status === 'draft').length,
      icon: <Edit2 className="w-5 h-5" />,
    },
    {
      label: 'Blog Posts',
      value: content.filter(c => c.type === 'blog').length,
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sora text-3xl font-bold mb-2">Content Management</h1>
            <p className="text-gray-400">Manage pages, blog posts, and content sections</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0066ff] to-[#00d4ff] text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:shadow-lg hover:shadow-[#0066ff]/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Content
          </motion.button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="tech-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-[#0066ff] to-[#00d4ff] bg-clip-text text-transparent">
                    {kpi.value}
                  </p>
                </div>
                <div className="text-[#00d4ff] opacity-60">{kpi.icon}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="tech-card">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by title or slug..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066ff]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(['all', 'pages', 'blog', 'sections'] as const).map(filter => (
                <motion.button
                  key={filter}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-all ${
                    activeFilter === filter
                      ? 'bg-gradient-to-r from-[#0066ff] to-[#00d4ff] text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Items */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-400">Loading content...</p>
          ) : filteredContent.length === 0 ? (
            <p className="text-center text-gray-400">No content found</p>
          ) : (
            <AnimatePresence>
              {filteredContent.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="tech-card cursor-pointer hover:border-[#0066ff]/50 transition-all"
                  onClick={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-sora text-lg font-semibold text-white">
                          {item.title}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-gray-500 mb-2">
                        slug: {item.slug}
                      </p>
                      {!expandedId && (
                        <p className="text-gray-400 text-sm line-clamp-2">
                          {item.content}
                        </p>
                      )}
                      <p className="font-mono text-xs text-gray-500 mt-2">
                        Last edited: {new Date(item.lastEdited).toLocaleDateString()}
                      </p>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="text-gray-500 hover:text-[#0066ff] transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                    </motion.div>
                  </div>

                  {/* Expanded View */}
                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-700 space-y-4"
                      >
                        {editingId === item.id ? (
                          <>
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              className="w-full h-48 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#0066ff]"
                            />
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSaveEdit(item.id);
                                }}
                                className="px-4 py-2 bg-[#00e5a0] text-black rounded-lg font-mono text-sm font-semibold hover:shadow-lg hover:shadow-[#00e5a0]/50 transition-all"
                              >
                                Save
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                }}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg font-mono text-sm font-semibold hover:bg-gray-600 transition-all"
                              >
                                Cancel
                              </motion.button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-gray-800 p-3 rounded-lg max-h-48 overflow-y-auto">
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">
                                {item.content}
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={e => {
                                e.stopPropagation();
                                setEditingId(item.id);
                                setEditContent(item.content);
                              }}
                              className="px-4 py-2 bg-[#0066ff] text-white rounded-lg font-mono text-sm font-semibold hover:shadow-lg hover:shadow-[#0066ff]/50 transition-all"
                            >
                              Edit
                            </motion.button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Add Content Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="tech-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-sora text-2xl font-bold">Add New Content</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newContent.title}
                    onChange={e => setNewContent({ ...newContent, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={newContent.slug}
                    onChange={e => setNewContent({ ...newContent, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <select
                    value={newContent.type}
                    onChange={e =>
                      setNewContent({
                        ...newContent,
                        type: e.target.value as typeof newContent.type,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  >
                    <option value="page">Page</option>
                    <option value="blog">Blog</option>
                    <option value="section">Section</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Content
                  </label>
                  <textarea
                    value={newContent.content}
                    onChange={e => setNewContent({ ...newContent, content: e.target.value })}
                    className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddContent}
                    className="flex-1 bg-gradient-to-r from-[#0066ff] to-[#00d4ff] text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:shadow-lg hover:shadow-[#0066ff]/50 transition-all"
                  >
                    Create
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default ContentManagement;
