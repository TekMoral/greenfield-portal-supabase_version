// DebugSession.jsx
import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient"; // adjust the path as needed

export default function DebugSession() {
  useEffect(() => {
    const check = async () => {
      const result = await supabase.auth.getSession();
      console.log("🔍 Supabase Session:", result);
    };
    check();
  }, []);

  return <p>Check your console for session data</p>;
}
