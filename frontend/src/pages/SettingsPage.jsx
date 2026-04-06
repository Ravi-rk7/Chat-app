import {THEMES} from "../constants/index.js";
import {Send} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore.js";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];


const SettingsPage = () => {
  
  const {theme , setTheme} = useThemeStore();

  return (
    <div className='min-h-screen bg-base-200/60 px-4 pb-10 pt-24'>
    <div className='container mx-auto max-w-5xl'>
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-base-300/70 bg-base-100 p-6 shadow-xl shadow-base-content/5">
          <div className="flex flex-col gap-1">
            <h2 className='text-lg font-semibold'>Theme</h2>
            <p className='text-sm text-base-content/70'>Choose a theme for your chat interface</p>
          </div>

          <div className='mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8'>
            {THEMES.map((t)=>(
              <button
                key={t}
                className={`
                  group flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-colors
                  ${theme===t?"bg-base-200 ring-1 ring-primary/20":"hover:bg-base-200/50"} 
                  `}
                  onClick={()=>setTheme(t)}
              >

                <div className="relative h-8 w-full overflow-hidden rounded-md" data-theme={t}>
                  <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                    <div className="rounded bg-primary"></div>
                    <div className="rounded bg-secondary"></div>
                    <div className="rounded bg-accent"></div>
                    <div className="rounded bg-neutral"></div>
                  </div>
                </div>
                <span className="w-full truncate text-center text-[11px] font-medium">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </button> 

            ))}

          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-base-300 bg-base-100 shadow-xl shadow-base-content/5">
          <div className="border-b border-base-300 px-6 py-4">
            <h3 className="text-lg font-semibold">Preview</h3>
            <p className="mt-1 text-sm text-base-content/65">A quick look at how conversations feel with the active theme.</p>
          </div>
          <div className="bg-base-200 p-4">
            <div className="mx-auto max-w-lg">
              <div className="overflow-hidden rounded-xl bg-base-100 shadow-sm">
                <div className="border-b border-base-300 bg-base-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-primary-content">
                      J
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">John Doe</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>

                <div className="min-h-[200px] max-h-[200px] space-y-4 overflow-y-auto bg-base-100 p-4">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-xl p-3 shadow-sm
                          ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                        `}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`
                            mt-1.5 text-[10px]
                            ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                          `}
                        >
                          12:00 PM
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-base-300 bg-base-100 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered h-10 flex-1 text-sm"
                      placeholder="Type a message..."
                      value="This is a preview"
                      readOnly
                    />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
    </div>
  )
}

export default SettingsPage
