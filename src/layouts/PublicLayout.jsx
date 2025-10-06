import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';

export default function PublicLayout() {
  return (
    <>
      <PublicHeader />
      <div className="app-content">
        <Outlet />
      </div>
    </>
  );
}
