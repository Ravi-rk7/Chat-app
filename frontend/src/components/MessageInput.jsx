import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, isSendingMessage, selectedUser } = useChatStore();
  const { socket } = useAuthStore();

  const emitTypingState = (eventName) => {
    if (!socket || !selectedUser?._id) return;
    socket.emit(eventName, { targetUserId: selectedUser._id });
  };

  const stopTyping = () => {
    clearTimeout(typingTimeoutRef.current);
    emitTypingState("typing:stop");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTextChange = (event) => {
    const nextValue = event.target.value;
    setText(nextValue);

    if (!nextValue.trim()) {
      stopTyping();
      return;
    }

    emitTypingState("typing:start");
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingState("typing:stop");
    }, 1200);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      stopTyping();
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.log("Failed to send message:", error);
    }
  };

  useEffect(() => {
    const activeTargetUserId = selectedUser?._id;

    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (socket && activeTargetUserId) {
        socket.emit("typing:stop", { targetUserId: activeTargetUserId });
      }
    };
  }, [selectedUser?._id, socket]);

  return (
    <div className="w-full border-t border-base-300/70 bg-base-100/90 p-4 backdrop-blur">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200/60 p-3">
          <div className="relative shrink-0">
            <img
              src={imagePreview}
              alt="Preview"
              className="size-20 rounded-2xl border border-base-300 object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-base-300"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>

          <div className="min-w-0">
            <p className="font-medium">Image ready to send</p>
            <p className="text-sm text-base-content/60">Add a caption or send it as-is.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder={`Message ${selectedUser?.fullName || "your contact"}`}
            value={text}
            className="input input-bordered h-12 w-full rounded-2xl border-base-300 bg-base-100 px-4"
            onChange={handleTextChange}
          />

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`btn btn-circle btn-ghost border border-base-300 ${
              imagePreview ? "text-emerald-500" : "text-base-content/60"
            }`}
            disabled={isSendingMessage}
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <ImagePlus size={20} />
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-circle h-12 w-12"
          disabled={(!text.trim() && !imagePreview) || isSendingMessage}
        >
          {isSendingMessage ? <Loader2 className="size-5 animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
