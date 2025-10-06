import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { getTermName } from '../../utils/reportUtils';
import { callFunction } from '../../services/supabase/edgeFunctions';
import { useSettings } from '../../contexts/SettingsContext';
import { formatSessionBadge } from '../../utils/sessionUtils';

const ReportCards = () => {
  const { user } = useAuth();
  const { academicYear: settingsYear, currentTerm } = useSettings();
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Moved up to satisfy Hooks rules: hooks must not run after conditional returns
  const [signedMap, setSignedMap] = useState({}); // { [docId]: url }

  const getSignedUrl = async (card) => {
    try {
      const res = await callFunction('get-report-url', { document_id: card.id, expires_in: 300 });
      if (res?.success && res?.url) return res.url;
    } catch (e) {
      console.error('Failed to get signed URL:', e);
    }
    return null;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = (reportCards || []).map(c => c.id);
      const next = {};
      for (const id of ids) {
        const card = (reportCards || []).find(c => c.id === id);
        if (!card) continue;
        const url = await getSignedUrl(card);
        if (!alive) return;
        if (url) next[id] = url;
      }
      if (alive) setSignedMap(next);
    })();
    return () => { alive = false };
  }, [JSON.stringify(reportCards.map(c => c.id))]);

  useEffect(() => {
    if (user?.id) {
      fetchReportCards();
    }
  }, [user?.id]);

  const fetchReportCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', user.id)
        .eq('document_type', 'report_card')
        .eq('status', 'published')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setReportCards(data || []);
    } catch (error) {
      console.error('Error fetching report cards:', error);
    } finally {
      setLoading(false);
    }
  };

  // getTermName centralized in utils/reportUtils

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  
  
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Report Cards</h1>
        <p className="text-slate-600 mt-1">Download your official term report cards</p>
        <div className="text-sm text-slate-500 mt-1">{formatSessionBadge(settingsYear, currentTerm)}</div>
      </div>

      {reportCards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 text-4xl mb-3">📄</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No Report Cards Available</h3>
          <p className="text-slate-600">Your report cards will appear here once published by the administration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCards.map((card) => (
            <div key={card.id} className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">📄</div>
                <span className="text-xs text-slate-500">
                  {new Date(card.uploaded_at || card.updated_at || Date.now()).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {getTermName(card.term)} Report Card
              </h3>
              
              <p className="text-slate-600 text-sm mb-4">
                Academic Year: {card.academic_year}
              </p>
              
              {(() => {
                const href = signedMap[card.id] || null;
                return href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                  >
                    Download PDF
                  </a>
                ) : (
                  <button
                    onClick={async () => {
                      const url = await getSignedUrl(card);
                      if (url) setSignedMap(m => ({ ...m, [card.id]: url }));
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                  >
                    Get Link
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportCards;