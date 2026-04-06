import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="hidden w-full flex-1 items-center justify-center bg-base-200/30 p-16 md:flex">
      <div className="max-w-lg space-y-6 rounded-[2rem] border border-base-300/70 bg-base-100 px-10 py-12 text-center shadow-xl shadow-base-content/5">
        <div className="mx-auto flex size-20 items-center justify-center rounded-[1.75rem] bg-primary/10">
          <MessageSquare className="size-9 text-primary " />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold">Welcome back to Yappy</h2>
          <p className="text-base leading-7 text-base-content/65">
            Pick a conversation from the sidebar to see realtime updates, delivery states, and polished message history in one focused workspace.
          </p>
        </div>

        <div className="grid gap-3 text-left text-sm text-base-content/65">
          <div className="rounded-2xl bg-base-200/70 px-4 py-3">Search contacts and jump into active conversations faster.</div>
          <div className="rounded-2xl bg-base-200/70 px-4 py-3">Unread counters, last-message previews, and typing indicators keep the inbox feeling alive.</div>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
