import { useChatStore } from "../store/useChatStore"
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const {selectedUser} = useChatStore();
  
  return (
    <div className="min-h-screen bg-base-200/70 px-3 pb-4 pt-20 sm:px-4">
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-6xl overflow-hidden rounded-[1.75rem] border border-base-300/70 bg-base-100 shadow-xl shadow-base-content/5">
        <div className={`${selectedUser ? "hidden md:flex" : "flex"} w-full md:w-[23rem] md:flex-shrink-0`}>
          <Sidebar />
        </div>

        <div className={`${selectedUser ? "flex" : "hidden md:flex"} min-w-0 flex-1`}>
          {selectedUser ? <ChatContainer/> : <NoChatSelected/>}
        </div>
      </div>
    </div>

  ) }

export default HomePage
