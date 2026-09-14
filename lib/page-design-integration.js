// DESIGN-ONLY integration snippet for app/page.js
// 1) Add this import near the top:
import ThemeToggle from "../components/ThemeToggle";

// 2) Replace the current topbar's right-side demo badge:
//    <div className="demo-badge">...</div>
//
// with:
<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  <ThemeToggle />
  <div className="demo-badge">
    {isSupabaseConfigured ? "Supabase connected" : "Demo · Mock data"}
  </div>
</div>

