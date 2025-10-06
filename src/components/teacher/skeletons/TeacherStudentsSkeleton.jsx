import React from 'react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const SkeletonBlock = ({ className = '', rounded = 'rounded-md' }) => (
  <div aria-hidden className={cx('bg-slate-200/70 dark:bg-slate-700/40', 'animate-pulse', rounded, className)} />
);

const SkeletonCircle = ({ size = 48, className = '' }) => (
  <div
    aria-hidden
    className={cx('bg-slate-200/70 dark:bg-slate-700/40 animate-pulse rounded-full', className)}
    style={{ width: size, height: size }}
  />
);

const TeacherStudentsSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="ml-3 sm:ml-6 space-y-2">
          <SkeletonBlock className="h-6 sm:h-7 w-56" />
          <SkeletonBlock className="h-3 w-64 hidden sm:block" />
        </div>
        <div className="inline-flex items-center gap-2">
          <SkeletonCircle size={10} />
          <SkeletonBlock className="h-5 w-40 rounded-full" />
        </div>
      </div>

      <div className="h-1.5 bg-slate-200 rounded-full" aria-hidden />

      {/* Subject selector chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
      </div>

      {/* Students card container */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-100">
          <SkeletonBlock className="h-5 w-56 mb-2" />
          <SkeletonBlock className="h-3 w-40" />
        </div>

        <div className="p-4 sm:p-6">
          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:hidden gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border rounded-lg p-3 flex items-center gap-3">
                <SkeletonCircle size={48} />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-40" />
                  <div className="flex gap-2">
                    <SkeletonBlock className="h-3 w-16 rounded-full" />
                    <SkeletonBlock className="h-3 w-20 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <SkeletonBlock className="h-8 w-8 rounded" />
                  <SkeletonBlock className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {['Student', 'Admission', 'Class', 'Gender', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                      <SkeletonBlock className="h-3 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <SkeletonCircle size={40} />
                        <div className="space-y-2">
                          <SkeletonBlock className="h-4 w-40" />
                          <SkeletonBlock className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><SkeletonBlock className="h-3 w-24" /></td>
                    <td className="px-3 py-3"><SkeletonBlock className="h-3 w-32" /></td>
                    <td className="px-3 py-3"><SkeletonBlock className="h-3 w-16" /></td>
                    <td className="px-3 py-3"><SkeletonBlock className="h-5 w-20 rounded-full" /></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <SkeletonBlock className="h-8 w-8 rounded" />
                        <SkeletonBlock className="h-8 w-8 rounded" />
                        <SkeletonBlock className="h-8 w-8 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentsSkeleton;
