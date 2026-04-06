import { Users } from "lucide-react";

const SidebarSkeleton = () => {
  const skeletonContacts = Array(8).fill(null);

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-base-300/70 bg-base-100"
    >
      <div className="border-b border-base-300/70 w-full p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-base-200">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="skeleton mb-2 h-4 w-28" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>

        <div className="skeleton mt-4 h-12 w-full rounded-2xl" />
      </div>

      <div className="overflow-y-auto w-full p-3">
        {skeletonContacts.map((_, idx) => (
          <div key={idx} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-base-300/40 p-3">
            <div className="relative">
              <div className="skeleton size-12 rounded-full" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-12" />
              </div>
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
