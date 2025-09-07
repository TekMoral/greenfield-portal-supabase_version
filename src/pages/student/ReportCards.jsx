import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';

const ReportCards = () => {
  const { user } = useAuth();
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReportCards(data || []);
    } catch (error) {
      console.error('Error fetching report cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTermName = (term) => {
    if (term === 1) return '1st Term';
    if (term === 2) return '2nd Term';
    if (term === 3) return '3rd Term';
    return `Term ${term}`;
  };

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
                  {new Date(card.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {getTermName(card.term)} Report Card
              </h3>
              
              <p className="text-slate-600 text-sm mb-4">
                Academic Year: {card.academic_year}
              </p>
              
              <a
                href={card.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
              >
                Download PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportCards;