import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { api } from "../lib/api";

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: "manager" | "user";
  department?: string;
  position?: string;
  isActive?: boolean;
  lastSeen?: string;
  createdAt: string;
}

export default function TeamPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "user">("user");

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get("/users");
      // API returns { data: users[], pagination: {...} }
      const usersList = response.data.data || response.data.users || [];
      setMembers(usersList);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (memberId: string) => {
    // Navigate to messages page - the MessagesPage will handle showing the conversation
    navigate(`/messages/${memberId}`);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement invite functionality
    console.log("Invite:", { email: inviteEmail, role: inviteRole });
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("user");
  };

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true;
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Group by role
  const managers = filteredMembers.filter((m) => m.role === "manager");
  const users = filteredMembers.filter((m) => m.role === "user");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-600">
            {members.length} team member{members.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Button
          onClick={() => setShowInviteModal(true)}
          leftIcon={<UserPlusIcon className="w-4 h-4" />}
        >
          Invite Member
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
        />
      </div>

      {/* Managers */}
      {managers.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
            Managers ({managers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {managers.map((member, index) => (
              <motion.div
                key={member._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    src={member.avatar}
                    firstName={member.firstName}
                    lastName={member.lastName}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">
                      {member.position || member.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        Manager
                      </span>
                      {member.department && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                          {member.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1">
                    View Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMessage(member._id)}
                    leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                  >
                    Message
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      {users.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
            Team Members ({users.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((member, index) => (
              <motion.div
                key={member._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    src={member.avatar}
                    firstName={member.firstName}
                    lastName={member.lastName}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">
                      {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">
                      {member.position || member.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        Team Member
                      </span>
                      {member.department && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                          {member.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1">
                    View Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMessage(member._id)}
                    leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                  >
                    Message
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No team members found</p>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "manager" | "user")
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="user">Team Member</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Send Invitation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
