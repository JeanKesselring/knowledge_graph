export default function Header() {
  return (
    <header className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-[#dbedfb] px-5 py-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a6cfea] text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 2C9 6 4 8 4 13a8 8 0 0 0 16 0c0-5-5-7-8-11z" />
          </svg>
        </div>
        <span className="text-lg font-medium text-[#3a7bb0]">Common Sage</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#374151]">Lucio Canepa ▾</span>
        <div className="h-9 w-9 overflow-hidden rounded-full bg-[#c4b89a] ring-2 ring-white" />
      </div>
    </header>
  );
}
