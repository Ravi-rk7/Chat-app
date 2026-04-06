import { Fragment, useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageDateLabel, formatMessageTime, getMessageStatus, isSameDay } from "../lib/utils";

const getId = (value) => (typeof value === "string" ? value : value?._id);

const ChatContainer = () => {
  const { isMessagesLoading, messages, getMessages, selectedUser, markMessagesAsSeen, typingUserIds } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const isTyping = typingUserIds.includes(selectedUser._id);

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (!socket || !selectedUser?._id) {
      return undefined;
    }

    socket.emit("chat:join", { targetUserId: selectedUser._id });
    markMessagesAsSeen(selectedUser._id);

    return () => {
      socket.emit("chat:leave", { targetUserId: selectedUser._id });
    };
  }, [selectedUser._id, socket, markMessagesAsSeen]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isTyping]);

  if (isMessagesLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-base-100">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto bg-base-200/35 p-4 sm:p-6">
        {messages.map((message, index) => {
          const previousMessage = messages[index - 1];
          const nextMessage = messages[index + 1];
          const senderId = getId(message.senderId);
          const isOwnMessage = senderId === authUser._id;
          const shouldShowDate = !previousMessage || !isSameDay(previousMessage.createdAt, message.createdAt);
          const shouldShowAvatar =
            !previousMessage || getId(previousMessage.senderId) !== senderId || !isSameDay(previousMessage.createdAt, message.createdAt);
          const shouldShowStatus = isOwnMessage && (!nextMessage || getId(nextMessage.senderId) !== senderId);

          return (
            <Fragment key={message._id}>
              {shouldShowDate && (
                <div className="my-4 flex items-center justify-center">
                  <div className="rounded-full border border-base-300 bg-base-100 px-4 py-1 text-xs font-medium text-base-content/60 shadow-sm">
                    {formatMessageDateLabel(message.createdAt)}
                  </div>
                </div>
              )}

              <div className={`mb-3 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[88%] items-end gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                  {shouldShowAvatar ? (
                    <img
                      src={isOwnMessage ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                      alt={isOwnMessage ? authUser.fullName : selectedUser.fullName}
                      className="size-9 rounded-full object-cover ring-1 ring-base-300"
                    />
                  ) : (
                    <div className="size-9 shrink-0" />
                  )}

                  <div className={`space-y-1 ${isOwnMessage ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-[1.4rem] px-4 py-3 shadow-sm ${
                        isOwnMessage
                          ? "bg-primary text-primary-content"
                          : "border border-base-300/70 bg-base-100 text-base-content"
                      }`}
                    >
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Attachment"
                          className="mb-3 max-h-72 w-full rounded-2xl object-cover sm:max-w-xs"
                        />
                      )}

                      {message.text && <p className="whitespace-pre-wrap break-words text-sm sm:text-[15px]">{message.text}</p>}
                    </div>

                    <div className={`px-1 text-[11px] text-base-content/50 ${isOwnMessage ? "text-right" : ""}`}>
                      <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                      {shouldShowStatus && <span>{` - ${getMessageStatus(message, isOwnMessage)}`}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}

        {isTyping && (
          <div className="mt-2 flex justify-start">
            <div className="flex items-end gap-3">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="size-9 rounded-full object-cover ring-1 ring-base-300"
              />
              <div className="rounded-[1.4rem] border border-base-300/70 bg-base-100 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 animate-bounce rounded-full bg-base-content/40 [animation-delay:-0.25s]"></span>
                  <span className="size-2 animate-bounce rounded-full bg-base-content/40 [animation-delay:-0.1s]"></span>
                  <span className="size-2 animate-bounce rounded-full bg-base-content/40"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
