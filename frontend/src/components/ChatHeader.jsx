import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatLastSeen } from "../lib/utils";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUserIds } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUserIds.includes(selectedUser._id);
  const statusLabel = isTyping
    ? "Typing..."
    : isOnline
      ? "Active now"
      : `Last seen ${formatLastSeen(selectedUser.lastSeen)}`;

  return (
    <div className="border-b border-base-300/70 bg-base-100/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-sm btn-circle md:hidden"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="avatar">
            <div className="relative size-11 rounded-full">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              <span
                className={`absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-base-100 ${
                  isOnline ? "bg-emerald-500" : "bg-base-300"
                }`}
              ></span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">{statusLabel}</p>
          </div>
        </div>

        <div className="hidden rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/60 sm:block">
          {isOnline ? "Available" : "Away"}
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
