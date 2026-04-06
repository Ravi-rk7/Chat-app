import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { authUser, logout } = useAuthStore();

  return (
    <header
      className="fixed top-0 z-40 w-full border-b border-base-300/70 bg-base-100/85 backdrop-blur-xl"
    >
      <div className="container mx-auto h-16 px-4">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-6">
            <Link to={"/"} className="flex items-center gap-3 transition-opacity hover:opacity-85">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">Yappy</h1>
                <p className="hidden text-xs text-base-content/60 sm:block">Realtime conversations, polished for production</p>
              </div>
            </Link>
          </div>

        <div className="flex items-center gap-2">
          <Link to={"/settings"} className="btn btn-sm btn-ghost gap-2 rounded-xl">
            <Settings className="size-4"/>
            <span className="hidden sm:inline">Settings</span>
          </Link>

          {authUser && 
            <>
              <Link to={"/profile"} className="btn btn-sm btn-ghost gap-2 rounded-xl">
                {authUser.profilePic ? (
                  <img
                    src={authUser.profilePic}
                    alt={authUser.fullName}
                    className="size-5 rounded-full object-cover"
                  />
                ) : (
                  <User className="size-4"/>
                )}
                <span className="hidden sm:inline">{authUser.fullName?.split(" ")[0] || "Profile"}</span>
              </Link>

              <button className="btn btn-sm btn-ghost gap-2 rounded-xl" onClick={logout}>
                <LogOut className="size-4"/>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          }
          
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
