"use client";

export default function Topbar() {
  return (
    <header className="h-16 border-b flex items-center justify-between px-8 bg-white">
      <input
        placeholder="Search ideas..."
        className="border rounded-lg px-4 py-2 w-80"
      />

      <div className="font-semibold">
        Loan Nguyen
      </div>
    </header>
  );
}