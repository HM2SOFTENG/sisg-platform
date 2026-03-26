import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Mail,
  Briefcase,
  Calendar,
  Search,
  X,
  CheckCircle,
  Circle,
  Pencil,
  Trash2,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  department: 'Executive' | 'Engineering' | 'Security' | 'Operations' | 'Marketing';
  status: 'active' | 'inactive';
  joinDate: string;
  skills: string[];
}

interface KPI {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}

const defaultMemberForm = {
  name: '',
  role: '',
  email: '',
  department: 'Engineering' as const,
  skills: '',
};

const UserManagement: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [activeDepartment, setActiveDepartment] = useState<'All' | 'Executive' | 'Engineering' | 'Security' | 'Operations' | 'Marketing'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberForm, setMemberForm] = useState(defaultMemberForm);

  const token = localStorage.getItem('sisg_admin_token');

  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch('/api/admin/team', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
          applyFilters(data, activeDepartment, searchTerm);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchMembers();
    }
  }, [token]);

  // Apply filters
  useEffect(() => {
    applyFilters(members, activeDepartment, searchTerm);
  }, [activeDepartment, searchTerm, members]);

  const applyFilters = (items: TeamMember[], dept: typeof activeDepartment, search: string) => {
    let filtered = items;

    if (dept !== 'All') {
      filtered = filtered.filter(item => item.department === dept);
    }

    if (search) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase()) ||
        item.role.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredMembers(filtered);
  };

  const openAddModal = () => {
    setEditMember(null);
    setMemberForm(defaultMemberForm);
    setShowModal(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditMember(member);
    setMemberForm({
      name: member.name,
      role: member.role,
      email: member.email,
      department: member.department as 'Engineering',
      skills: member.skills.join(', '),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMember(null);
    setMemberForm(defaultMemberForm);
  };

  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.role || !memberForm.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editMember) {
        // UPDATE
        const response = await fetch(`/api/admin/team/${editMember.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...memberForm,
            skills: memberForm.skills.split(',').map(s => s.trim()).filter(Boolean),
          }),
        });

        if (response.ok) {
          const updated = await response.json();
          setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
          closeModal();
          toast.success('Member updated successfully');
        } else {
          toast.error('Failed to update member');
        }
      } else {
        // CREATE
        const response = await fetch('/api/admin/team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...memberForm,
            skills: memberForm.skills.split(',').map(s => s.trim()).filter(Boolean),
            status: 'active',
            joinDate: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const created = await response.json();
          setMembers(prev => [...prev, created]);
          closeModal();
          toast.success('User created successfully');
        } else {
          toast.error('Failed to create user');
        }
      }
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Error saving member');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Remove this team member? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        toast.success('Member removed');
      } else {
        toast.error('Failed to remove member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Error removing member');
    }
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'Executive':
        return 'text-[#ff3b3b] bg-[#ff3b3b]/10';
      case 'Engineering':
        return 'text-[#0066ff] bg-[#0066ff]/10';
      case 'Security':
        return 'text-[#00d4ff] bg-[#00d4ff]/10';
      case 'Operations':
        return 'text-[#00e5a0] bg-[#00e5a0]/10';
      case 'Marketing':
        return 'text-[#8b5cf6] bg-[#8b5cf6]/10';
      default:
        return 'text-gray-400 bg-gray-700';
    }
  };

  const departmentBreakdown = [
    { name: 'Executive', count: members.filter(m => m.department === 'Executive').length, color: '#ff3b3b' },
    { name: 'Engineering', count: members.filter(m => m.department === 'Engineering').length, color: '#0066ff' },
    { name: 'Security', count: members.filter(m => m.department === 'Security').length, color: '#00d4ff' },
    { name: 'Operations', count: members.filter(m => m.department === 'Operations').length, color: '#00e5a0' },
    { name: 'Marketing', count: members.filter(m => m.department === 'Marketing').length, color: '#8b5cf6' },
  ];

  const kpis: KPI[] = [
    {
      label: 'Total Members',
      value: members.length,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Active',
      value: members.filter(m => m.status === 'active').length,
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      label: 'Departments',
      value: new Set(members.map(m => m.department)).size,
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      label: 'Avg Tenure',
      value: '1.2 yrs',
      icon: <Calendar className="w-5 h-5" />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-sora text-xl sm:text-3xl font-bold mb-2">User Management</h1>
            <p className="text-gray-400">Manage team members and departments</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-[#0066ff] to-[#00d4ff] text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:shadow-lg hover:shadow-[#0066ff]/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </motion.button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="tech-card p-3 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-2">
                    {kpi.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#0066ff] to-[#00d4ff] bg-clip-text text-transparent">
                    {kpi.value}
                  </p>
                </div>
                <div className="text-[#00d4ff] opacity-60 text-sm sm:text-base flex-shrink-0">{kpi.icon}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Department Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="tech-card"
        >
          <h2 className="font-sora text-xl font-bold mb-4">Department Breakdown</h2>
          <div className="space-y-3">
            {departmentBreakdown.map((dept, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-gray-300">{dept.name}</span>
                  <span className="font-mono text-sm text-gray-400">{dept.count}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${members.length > 0 ? (dept.count / members.length) * 100 : 0}%`,
                    }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    style={{ backgroundColor: dept.color }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Search and Filters */}
        <div className="tech-card">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066ff]"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(['All', 'Executive', 'Engineering', 'Security', 'Operations', 'Marketing'] as const).map(dept => (
                <motion.button
                  key={dept}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveDepartment(dept)}
                  className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold transition-all ${
                    activeDepartment === dept
                      ? 'bg-gradient-to-r from-[#0066ff] to-[#00d4ff] text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {dept}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {loading ? (
            <p className="text-center text-gray-400 col-span-2">Loading members...</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-gray-400 col-span-2">No members found</p>
          ) : (
            <AnimatePresence>
              {filteredMembers.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="tech-card hover:border-[#0066ff]/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-sora text-lg font-bold text-white">
                          {member.name}
                        </h3>
                        <motion.div
                          animate={{
                            scale: member.status === 'active' ? 1 : 0.8,
                          }}
                        >
                          {member.status === 'active' ? (
                            <CheckCircle className="w-4 h-4 text-[#00e5a0]" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-500" />
                          )}
                        </motion.div>
                      </div>
                      <p className="font-mono text-sm text-gray-400 mb-2">
                        {member.role}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono font-semibold ${getDepartmentColor(member.department)}`}>
                        {member.department}
                      </span>
                    </div>
                    {/* Edit / Delete buttons */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        title="Edit member"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <p className="font-mono text-sm text-gray-400 break-all">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="font-mono text-sm text-gray-400">
                        Joined {new Date(member.joinDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {member.skills.length > 0 && (
                    <div className="pt-4 border-t border-gray-700">
                      <p className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                        Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {member.skills.map((skill, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-mono"
                          >
                            {skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="tech-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-sora text-2xl font-bold">
                  {editMember ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={memberForm.role}
                    onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Department
                  </label>
                  <select
                    value={memberForm.department}
                    onChange={e =>
                      setMemberForm({
                        ...memberForm,
                        department: e.target.value as typeof memberForm.department,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Security">Security</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={memberForm.skills}
                    onChange={e => setMemberForm({ ...memberForm, skills: e.target.value })}
                    placeholder="React, TypeScript, Node.js"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveMember}
                    className="flex-1 bg-gradient-to-r from-[#0066ff] to-[#00d4ff] text-white px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:shadow-lg hover:shadow-[#0066ff]/50 transition-all"
                  >
                    {editMember ? 'Save Changes' : 'Add'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeModal}
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

export default UserManagement;
