import React from 'react';

// Local skeleton primitives (we can later extract to components/ui/Skeleton.jsx)
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

const SkeletonText = ({ lines = 2, lineClassName = '' }) => (
  <div aria-hidden className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={cx('h-3 bg-slate-200/70 dark:bg-slate-700/40 animate-pulse rounded', i === lines - 1 ? 'w-2/3' : 'w-full', lineClassName)} />
    ))}
  </div>
);

// Section wrappers
const Card = ({ children, className = '' }) => (
  <div className={cx('bg-white rounded-lg shadow-md overflow-hidden border border-slate-200', className)}>
    {children}
  </div>
);

const CardHeader = ({ className = '', children }) => (
  <div className={cx('p-3 sm:p-4 border-b border-slate-200', className)}>{children}</div>
);

const CardBody = ({ className = '', children }) => (
  <div className={cx('p-4 sm:p-6 bg-slate-50', className)}>{children}</div>
);

// Main page skeleton matching Teacher Dashboard layout
const TeacherDashboardSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-lg shadow-lg border-t-4 border-green-500">
        <div className="space-y-3">
          <SkeletonBlock className="h-6 sm:h-7 w-1/2 bg-white/20" rounded="rounded" />
          <SkeletonBlock className="h-4 sm:h-5 w-2/3 bg-white/10" rounded="rounded" />
        </div>
      </div>

      {/* Stats summary grid */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-2 border-l-4 border-slate-300 rounded bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <SkeletonBlock className="h-3 w-24 mb-2" />
                    <SkeletonBlock className="h-5 w-16" />
                  </div>
                  <SkeletonCircle size={28} className="ml-3" />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Main content grid: My Classes + Recent Assignments */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* My Classes skeleton */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700">
            <div className="flex items-center gap-2">
              <SkeletonCircle size={24} className="bg-white/30" />
              <SkeletonBlock className="h-5 w-32 bg-white/30" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border-l-4 border-green-500 pl-4 py-3 rounded-r-lg shadow-sm">
                  <SkeletonBlock className="h-4 w-48 mb-2" />
                  <SkeletonBlock className="h-3 w-64 mb-2" />
                  <SkeletonBlock className="h-3 w-32" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Recent Assignments skeleton */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800">
            <div className="flex items-center gap-2">
              <SkeletonCircle size={24} className="bg-white/30" />
              <SkeletonBlock className="h-5 w-40 bg-white/30" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                  <SkeletonCircle size={32} />
                  <div className="flex-1">
                    <SkeletonBlock className="h-4 w-3/4 mb-2" />
                    <SkeletonBlock className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SkeletonCircle size={24} />
            <SkeletonBlock className="h-5 w-36" />
          </div>
        </CardHeader>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg p-4 border border-slate-200 bg-white">
                <SkeletonCircle size={32} className="mb-3" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TeacherDashboardSkeleton;
