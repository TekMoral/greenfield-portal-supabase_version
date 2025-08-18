import React, { useEffect, useState } from "react";
import edgeFunctionsService from "../../services/supabase/edgeFunctions";

const PAGE_SIZE = 50;

function AuditLogsCard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);

  const loadLogs = async (o = 0) => {
    setLoading(true);
    setError(null);
    try {
      
const res = await edgeFunctionsService.callFunction(
  "get-audit-logs",
  { limit: PAGE_SIZE, offset: o },
  { method: "POST" }
);


      console.log('DEBUG: Full result from edge function:', res);
      if (Array.isArray(res)) {
        setLogs(res);
      } else if (res && Array.isArray(res.audits)) {
        setLogs(res.audits);
      } else {
        setLogs([]);
      }
      setOffset(o);
    } catch (e) {
      setError(e.userMessage || e.responseJson?.error || e.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(0);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">System Audit Logs</h2>
        <button
          className="ml-2 px-3 py-1 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
          onClick={() => loadLogs(0)}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {error ? (
        <div className="text-red-600">{error}</div>
      ) : loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {console.log('DEBUG: logs state during render:', logs)}
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td className="py-4 text-center text-gray-500" colSpan={5}>No audit entries found.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-700">
                      {log.action}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{log.actor_name || log.user_id}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{log.resource_type || '-'}</span>
                        <span className="text-gray-700">{log.resource_name || '-'}</span>
                        {log.resource_id && (
                          <span className="text-gray-400 text-[10px]">ID: {log.resource_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-xl break-all">
                      <pre className="whitespace-pre-wrap text-xs break-words">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details || '')}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex justify-between items-center mt-4">
        <button
          className="text-sm px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded"
          onClick={() => loadLogs(Math.max(0, offset - PAGE_SIZE))}
          disabled={loading || offset === 0}
        >
          Previous
        </button>
        <span className="text-gray-500 text-xs">Page {Math.floor(offset / PAGE_SIZE) + 1}</span>
        <button
          className="text-sm px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded"
          onClick={() => loadLogs(offset + PAGE_SIZE)}
          disabled={loading || logs.length < PAGE_SIZE}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default AuditLogsCard;
