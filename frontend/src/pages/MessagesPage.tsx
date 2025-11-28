import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../stores/authStore";
import { useSocket, useSocketEvent } from "../lib/socket";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { cn } from "../lib/utils";
import { api } from "../lib/api";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  department?: string;
  position?: string;
  lastSeen?: string;
}

interface Message {
  _id: string;
  content: string;
  sender: User;
  recipient?: User;
  channel?: string;
  createdAt: string;
  isEdited?: boolean;
}

interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { channelOrUserId } = useParams<{ channelOrUserId?: string }>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket
  useSocket();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle URL parameter to open conversation directly
  useEffect(() => {
    if (channelOrUserId && !selectedUser) {
      // Fetch the user info and select them
      fetchUserAndSelect(channelOrUserId);
    }
  }, [channelOrUserId]);

  const fetchUserAndSelect = async (userId: string) => {
    try {
      const response = await api.get(`/users/${userId}`);
      if (response.data.user) {
        setSelectedUser(response.data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  // Fetch messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket event for new messages
  const handleNewMessage = useCallback(
    (data: unknown) => {
      const message = data as Message;
      // Add message if it's part of current conversation
      if (
        selectedUser &&
        (message.sender._id === selectedUser._id ||
          message.recipient?._id === selectedUser._id)
      ) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      // Refresh conversations list
      fetchConversations();
    },
    [selectedUser]
  );

  useSocketEvent("message:new", handleNewMessage);

  const fetchConversations = async () => {
    try {
      const response = await api.get("/messages/conversations");
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const fetchMessages = async (userId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/messages/dm/${userId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for new chat
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await api.get("/users");
        // API returns { data: users[], pagination: {...} }
        const usersList = response.data.data || response.data.users || [];
        setUsers(usersList.filter((u: User) => u._id !== user?._id));
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (showNewChat) {
      fetchUsers();
      setUserSearchQuery("");
    }
  }, [showNewChat, user]);

  // Filter users based on search
  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery) return true;
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(userSearchQuery.toLowerCase());
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await api.post("/messages", {
        content: messageText.trim(),
        recipient: selectedUser._id,
      });

      const newMessage = response.data.message;
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");

      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSelectUser = (targetUser: User) => {
    setSelectedUser(targetUser);
    setShowNewChat(false);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedUser(conversation.user);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const name = `${c.user.firstName} ${c.user.lastName}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Sidebar - Conversations list */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowNewChat(true)}
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              New
            </Button>
          </div>
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
          />
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const isActive = selectedUser?._id === conversation.user._id;
              const hasUnread = conversation.unreadCount > 0;

              return (
                <button
                  key={conversation.user._id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left",
                    isActive && "bg-primary-50"
                  )}
                >
                  <Avatar
                    src={conversation.user.avatar}
                    firstName={conversation.user.firstName}
                    lastName={conversation.user.lastName}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {conversation.user.firstName}{" "}
                        {conversation.user.lastName}
                      </span>
                      {conversation.lastMessage && (
                        <span className="text-xs text-slate-500">
                          {format(
                            new Date(conversation.lastMessage.createdAt),
                            "HH:mm"
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      {hasUnread && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No conversations yet</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setShowNewChat(true)}
              >
                Start a conversation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedUser.avatar}
                  firstName={selectedUser.firstName}
                  lastName={selectedUser.lastName}
                  size="md"
                />
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUser.position ||
                      selectedUser.department ||
                      "Team member"}
                  </p>
                </div>
              </div>

              <button className="p-2 rounded-lg hover:bg-slate-100">
                <EllipsisHorizontalIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((message, index) => {
                  const isOwn = message.sender._id === user?._id;
                  const showAvatar =
                    !isOwn &&
                    (index === 0 ||
                      messages[index - 1].sender._id !== message.sender._id);

                  return (
                    <motion.div
                      key={message._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-3", isOwn && "flex-row-reverse")}
                    >
                      {!isOwn && showAvatar ? (
                        <Avatar
                          src={message.sender.avatar}
                          firstName={message.sender.firstName}
                          lastName={message.sender.lastName}
                          size="sm"
                        />
                      ) : (
                        !isOwn && <div className="w-8" />
                      )}

                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          isOwn
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        )}
                      >
                        {!isOwn && showAvatar && (
                          <p className="text-xs font-medium mb-1">
                            {message.sender.firstName}
                          </p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-white/70" : "text-slate-500"
                          )}
                        >
                          {format(new Date(message.createdAt), "HH:mm")}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">
                      No messages yet
                    </p>
                    <p className="text-xs text-slate-400">
                      Send a message to start the conversation
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-slate-100"
            >
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Button
                  type="submit"
                  disabled={!messageText.trim() || sendingMessage}
                  className="rounded-full"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Your Messages
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Select a conversation or start a new one
              </p>
              <Button
                onClick={() => setShowNewChat(true)}
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New chat modal */}
      <Modal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        title="New Conversation"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search users..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
          />

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loadingUsers ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                >
                  <Avatar
                    src={u.avatar}
                    firstName={u.firstName}
                    lastName={u.lastName}
                    size="md"
                  />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {u.position || u.department || "Team member"}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">
                  {userSearchQuery
                    ? "No users found matching your search"
                    : "No users available"}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
