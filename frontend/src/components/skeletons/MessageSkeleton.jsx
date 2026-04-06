const MessageSkeleton = () => {
    const skeletonMessages = Array(6).fill(null);
  
    return (
      <div className="flex-1 overflow-y-auto bg-base-200/35 p-4 sm:p-6">
        {skeletonMessages.map((_, idx) => (
          <div key={idx} className={`mb-4 flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className={`flex max-w-[85%] items-end gap-3 ${idx % 2 === 0 ? "" : "flex-row-reverse"}`}>
              <div className="size-9 rounded-full">
                <div className="skeleton h-full w-full rounded-full" />
              </div>
  
              <div>
                <div className="skeleton mb-2 h-16 w-[220px] rounded-[1.4rem]" />
                <div className="skeleton h-3 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default MessageSkeleton;
