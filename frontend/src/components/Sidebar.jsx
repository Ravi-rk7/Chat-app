import { useDeferredValue, useEffect, useState } from "react";
import { Search, User, Users } from "lucide-react";
import { useChatStore } from "../store/useChatStore.js";
import SidebarSkeleton from "../components/skeletons/SidebarSkeleton.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { formatPreviewTime, getMessagePreview } from "../lib/utils.js";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <SidebarSkeleton />;

  const filteredUsers = users.filter((user) => {
    if (!deferredQuery) return true;

    return (
      user.fullName.toLowerCase().includes(deferredQuery) ||
      user.email.toLowerCase().includes(deferredQuery)
    );
  });

  const onlineCount = users.filter((user) => onlineUsers.includes(user._id)).length;

  return (
    <aside className="flex h-full w-full flex-col border-r border-base-300/70 bg-base-100">
      <div className="border-b border-base-300/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <span className="block font-semibold">Conversations</span>
              <span className="text-sm text-base-content/60">{onlineCount} online now</span>
            </div>
          </div>

          <div className="rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70">
            {users.length}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
          <Search className="size-4 text-base-content/50" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts"
            className="w-full bg-transparent text-sm outline-none placeholder:text-base-content/45"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const isOnline = onlineUsers.includes(user._id);
            const isSelected = selectedUser?._id === user._id;
            const previewText = `${user.lastMessage?.isMine ? "You: " : ""}${getMessagePreview(user.lastMessage)}`;

            return (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                  isSelected
                    ? "border-primary/30 bg-primary/10 shadow-sm shadow-primary/10"
                    : "border-transparent hover:border-base-300 hover:bg-base-200/70"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-12 rounded-full object-cover ring-1 ring-base-300"
                  />

                  <span
                    className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-base-100 ${
                      isOnline ? "bg-emerald-500" : "bg-base-300"
                    }`}
                  ></span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{user.fullName}</div>
                      <div className="mt-1 text-xs text-base-content/55">
                        {isOnline ? "Online" : "Offline"}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {user.lastMessage?.createdAt && (
                        <span className="text-[11px] text-base-content/45">
                          {formatPreviewTime(user.lastMessage.createdAt)}
                        </span>
                      )}
                      {user.unreadCount > 0 && (
                        <span className="flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-content">
                          {user.unreadCount > 9 ? "9+" : user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <User className="size-3.5 shrink-0 text-base-content/35" />
                    <p className="truncate text-sm text-base-content/60">{previewText}</p>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-base-300 bg-base-200/40 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-base-200">
              <Search className="size-6 text-base-content/50" />
            </div>
            <div>
              <h3 className="font-semibold">No matching contacts</h3>
              <p className="mt-1 text-sm text-base-content/60">Try a different name or email address.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
