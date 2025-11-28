import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  UserIcon,
  EnvelopeIcon,
  CameraIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import { useAuthStore } from "../stores/authStore";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

type SettingsTab = "profile" | "notifications" | "security" | "appearance";

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    department: user?.department || "",
    avatar: user?.avatar || "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskAssigned: true,
    taskCompleted: true,
    messageReceived: true,
    weeklyDigest: true,
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    compactMode: false,
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setLoading(true);
      const response = await api.post("/upload/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfileData((prev) => ({ ...prev, avatar: response.data.url }));
      updateUser({ avatar: response.data.url });
      setSuccess("Avatar updated successfully");
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      setLoading(true);
      await api.put("/users/me", profileData);
      updateUser(profileData);
      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (securityData.newPassword !== securityData.confirmPassword) {
      return;
    }

    try {
      setLoading(true);
      await api.put("/users/me/password", {
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword,
      });
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("Password changed successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to change password:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: SettingsTab; name: string; icon: React.ElementType }[] = [
    { id: "profile", name: "Profile", icon: UserIcon },
    { id: "notifications", name: "Notifications", icon: BellIcon },
    { id: "security", name: "Security", icon: ShieldCheckIcon },
    { id: "appearance", name: "Appearance", icon: PaintBrushIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      {/* Success message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6"
        >
          {success}
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar
                    src={profileData.avatar}
                    firstName={profileData.firstName}
                    lastName={profileData.lastName}
                    size="xl"
                  />
                  <button
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-200 hover:bg-slate-50"
                  >
                    <CameraIcon className="w-4 h-4 text-slate-600" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Profile Photo
                  </h3>
                  <p className="text-sm text-slate-500">
                    JPG, GIF or PNG. Max size 2MB.
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  leftIcon={<EnvelopeIcon className="w-5 h-5" />}
                />
                <Input
                  label="Department"
                  name="department"
                  value={profileData.department}
                  onChange={handleProfileChange}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSave} isLoading={loading}>
                  Save Changes
                </Button>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                {[
                  {
                    key: "emailNotifications",
                    label: "Email Notifications",
                    description:
                      "Receive email notifications for important updates",
                  },
                  {
                    key: "taskAssigned",
                    label: "Task Assigned",
                    description: "Get notified when a task is assigned to you",
                  },
                  {
                    key: "taskCompleted",
                    label: "Task Completed",
                    description:
                      "Get notified when tasks you created are completed",
                  },
                  {
                    key: "messageReceived",
                    label: "New Messages",
                    description: "Get notified when you receive new messages",
                  },
                  {
                    key: "weeklyDigest",
                    label: "Weekly Digest",
                    description:
                      "Receive a weekly summary of your tasks and progress",
                  },
                ].map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {setting.label}
                      </p>
                      <p className="text-sm text-slate-500">
                        {setting.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          notificationSettings[
                            setting.key as keyof typeof notificationSettings
                          ]
                        }
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            [setting.key]: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button isLoading={loading}>Save Preferences</Button>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Change Password
                </h3>
                <form
                  onSubmit={handlePasswordChange}
                  className="space-y-4 max-w-md"
                >
                  <Input
                    label="Current Password"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={(e) =>
                      setSecurityData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={securityData.newPassword}
                    onChange={(e) =>
                      setSecurityData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) =>
                      setSecurityData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    error={
                      securityData.confirmPassword &&
                      securityData.newPassword !== securityData.confirmPassword
                        ? "Passwords do not match"
                        : undefined
                    }
                    required
                  />
                  <Button type="submit" isLoading={loading}>
                    Update Password
                  </Button>
                </form>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </motion.div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Theme
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {["light", "dark", "system"].map((theme) => (
                    <button
                      key={theme}
                      onClick={() =>
                        setAppearance((prev) => ({ ...prev, theme }))
                      }
                      className={cn(
                        "p-4 rounded-lg border-2 transition-colors text-center",
                        appearance.theme === theme
                          ? "border-primary-500 bg-primary-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div
                        className={cn(
                          "w-12 h-8 rounded mx-auto mb-2",
                          theme === "light"
                            ? "bg-white border border-slate-200"
                            : theme === "dark"
                            ? "bg-slate-800"
                            : "bg-gradient-to-r from-white to-slate-800"
                        )}
                      />
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {theme}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Compact Mode</p>
                    <p className="text-sm text-slate-500">
                      Reduce spacing and show more content
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.compactMode}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          compactMode: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
