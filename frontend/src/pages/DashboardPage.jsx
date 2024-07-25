import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';

import CreateDocModal from '../components/CreateDocumentModal/CreateDocModal';
import Navbar from '../components/Navbar/Navbar';
import Sidebar from '../components/Sidebar/Sidebar';
import { ModalContext } from '../context/ModalContext';

export default function DashboardPage () {
  const { createDocumentationModal } = useContext(ModalContext);
  return (
    <div className='antialiased bg-gray-50 dark:bg-gray-900'>
      <Navbar />
      <Sidebar />
      <main className='p-4 md:ml-64 min-h-screen pt-20'>
        {createDocumentationModal &&
          <CreateDocModal />}
        <Outlet />
      </main>
    </div>
  );
}
