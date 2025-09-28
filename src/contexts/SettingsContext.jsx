import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/*
  SettingsContext
  - Provides global system settings (academic year, current term, etc.)
  - Loads from Supabase table `school_settings` (single-row config)
  - Falls back to sensible defaults if not found
  - Exposes update function for super_admin Settings page to persist changes

  Expected table: public.school_settings (single row)
  Suggested columns:
    id UUID default uuid_generate_v4() primary key
    school_name text
    school_address text
    school_phone text
    school_email text
    academic_year text
    current_term text
    created_at timestamptz default now()
    updated_at timestamptz default now()
*/

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    schoolName: 'Greenfield College',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    academicYear: '2024/2025',
    currentTerm: '1st Term',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mapRowToSettings = (row) => ({
    schoolName: row?.school_name || 'Victory International College',
    schoolAddress: row?.address || row?.school_address || '',
    schoolPhone: row?.phone || row?.school_phone || '',
    schoolEmail: row?.email || row?.school_email || '',
    academicYear: row?.academic_year || '2024/2025',
    currentTerm: row?.current_term || '1st Term',
    id: row?.id || null,
  });

  const mapSettingsToRow = (cfg) => ({
    school_name: cfg.schoolName,
    address: cfg.schoolAddress,
    phone: cfg.schoolPhone,
    email: cfg.schoolEmail,
    academic_year: cfg.academicYear,
    current_term: cfg.currentTerm,
    updated_at: new Date().toISOString(),
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try DB first
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        // If table missing or no row, silently fall back to localStorage/defaults
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem('school_settings_cache') : null;
        if (cached) {
          setSettings(JSON.parse(cached));
        } else {
          // keep defaults
        }
        setLoading(false);
        return;
      }

      const cfg = mapRowToSettings(data || {});
      setSettings(cfg);
      try { if (typeof window !== 'undefined') window.localStorage.setItem('school_settings_cache', JSON.stringify(cfg)); } catch (_) {}
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (partial) => {
    const next = { ...settings, ...partial };
    setSettings(next);

    // Persist to DB (single-row upsert pattern)
    try {
      const row = mapSettingsToRow(next);

      // Check if a row exists
      const { data: existing } = await supabase
        .from('school_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      let upsertRes;
      if (existing?.id) {
        upsertRes = await supabase
          .from('school_settings')
          .update(row)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        upsertRes = await supabase
          .from('school_settings')
          .insert({ ...row })
          .select()
          .single();
      }

      if (upsertRes.error) {
        console.error('Failed to save settings:', upsertRes.error);
        return { success: false, error: upsertRes.error.message };
      }

      const cfg = mapRowToSettings(upsertRes.data || {});
      setSettings(cfg);
      try { if (typeof window !== 'undefined') window.localStorage.setItem('school_settings_cache', JSON.stringify(cfg)); } catch (_) {}
      return { success: true, data: cfg };
    } catch (e) {
      console.error('updateSettings exception:', e);
      return { success: false, error: e?.message || String(e) };
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({
    settings,
    loading,
    error,
    academicYear: settings.academicYear,
    currentTerm: settings.currentTerm,
    refresh: loadSettings,
    updateSettings,
  }), [settings, loading, error]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
