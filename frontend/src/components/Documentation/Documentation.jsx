import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';

import instance from '../../api/AxiosInstance';
import {
  createDocumentationVersion,
  createPage as createPageAPI,
  createPageGroup,
  deleteDocumentation,
  deletePage,
  deletePageGroup,
  getDocumentations,
  getPageGroups,
  getPages,
  updateDocumentation,
  updatePageGroup
} from '../../api/Requests';
import { AuthContext } from '../../context/AuthContext';
import { ModalContext } from '../../context/ModalContext';
import {
  combinePages,
  getClosestVersion,
  getVersion,
  handleError
} from '../../utils/Common';
import { toastMessage } from '../../utils/Toast';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import EditDocumentModal from '../CreateDocumentModal/EditDocumentModal';
import CreatePageGroup from '../CreatePageGroup/CreatePageGroup';
import CreatePage from '../CreatePageModal/CreatePageModal';
import DeleteModal from '../DeleteModal/DeleteModal';
import Table from '../Table/Table';

export default function Documentation () {
  const navigate = useNavigate();
  const { refresh, refreshData, user } = useContext(AuthContext);

  const {
    openModal,
    closeModal,
    createPageGroupModal,
    createPageModal,
    deleteModal,
    editModal,
    cloneDocumentModal,
    currentModalItem,
    pageSizeDropdown
  } = useContext(ModalContext);

  const [searchParam] = useSearchParams();
  const docId = searchParam.get('id');
  const versionId = searchParam.get('versionId');
  const [loading, setLoading] = useState(true);
  const [pageGroupLoading, setPageGroupLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectPageSize, setSelectPageSize] = useState(1);

  // Documentation CRUD
  const [documentData, setDocumentData] = useState([]);

  // pageGroup CRUD
  const [groupsAndPageData, setGroupsAndPageData] = useState([]);

  // version
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');

  const toggleDropdown = () => {
    setShowVersionDropdown(!showVersionDropdown);
  };

  const handleSearchVersionChange = (e) => {
    setSearchQuery(e.target.value);
  };
  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setShowVersionDropdown(false);
    navigate(
      `/dashboard/documentation?id=${docId}&versionId=${version.id}&version=${version.version}`
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const documentationsResult = await getDocumentations();

      if (handleError(documentationsResult, navigate)) {
        setLoading(false);
        return;
      }

      if (documentationsResult.status === 'success') {
        const data = documentationsResult.data;

        const pDoc = data.filter((obj) => parseInt(obj.id) === parseInt(docId));
        const cDocs = data.filter((obj) => (obj.clonedFrom !== null && obj.clonedFrom !== undefined) && (parseInt(obj.clonedFrom) === parseInt(docId)));

        const clonedData = [...pDoc, ...cDocs];
        setDocumentData(clonedData);

        if (versionId) {
          const currentVersion = getVersion(clonedData, versionId);
          setSelectedVersion(currentVersion);
        } else {
          const latestVersion = await getClosestVersion(clonedData);
          setSelectedVersion(latestVersion || '');
        }
      }
      setLoading(false);
    };
    if (docId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [docId, refresh, user, navigate, versionId]);

  useEffect(() => {
    const fetchData = async () => {
      setPageGroupLoading(true);
      const [pageGroupsResult, pagesResult] = await Promise.all([
        getPageGroups(),
        getPages()
      ]);

      handleError(pageGroupsResult, navigate);
      handleError(pagesResult, navigate);

      if (
        pageGroupsResult.status === 'success' &&
        pagesResult.status === 'success'
      ) {
        const combinedData = combinePages(
          pageGroupsResult.data || [],
          pagesResult.data || []
        );
        setGroupsAndPageData(combinedData);
      }
      setPageGroupLoading(false);
    };
    if (docId) {
      fetchData();
    } else {
      setPageGroupLoading(false);
    }
  }, [docId, user, navigate, refresh]);

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredItems = groupsAndPageData.filter(
    (obj) =>
      obj.documentationId === Number(selectedVersion.id) &&
      (obj.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async () => {
    const result = await deleteDocumentation(Number(selectedVersion.id));

    if (handleError(result, navigate)) {
      return;
    }

    if (result.status === 'success') {
      closeModal('delete');
      toastMessage(result.data.message, 'success');
      refreshData();
      navigate('/');
    }
  };

  const handleUpdate = async (editTitle, editDescription, editVersion, version) => {
    let result;
    if (cloneDocumentModal) {
      result = await createDocumentationVersion({
        originalDocId: Number(selectedVersion.id),
        version
      });
    } else {
      result = await updateDocumentation({
        id: Number(selectedVersion.id),
        name: editTitle,
        description: editDescription,
        version: editVersion
      });
    }

    if (handleError(result, navigate)) return;

    if (result.status === 'success') {
      if (cloneDocumentModal) {
        closeModal('cloneDocument');
      }
      closeModal('edit');
      refreshData();
      toastMessage(result.data.message, 'success');
    }
  };

  const handleDeletePageGroup = async (id, path) => {
    const type = 'slug' in path ? 'page' : 'pageGroup';

    let result;

    if (type === 'pageGroup') {
      result = await deletePageGroup(Number(id));
    } else if (type === 'page') {
      result = await deletePage(Number(id));
    }

    if (handleError(result, navigate)) {
      return;
    }

    if (result.status === 'success') {
      closeModal('delete');
      toastMessage(result.data.message, 'success');
      refreshData();
    }
  };
  const handlePageGroupUpdate = async (
    editTitle,
    editDescription,
    editVersion,
    version,
    id
  ) => {
    const result = await updatePageGroup({
      id: Number(id),
      name: editTitle,
      documentationId: Number(selectedVersion.id)
    });

    if (handleError(result, navigate)) {
      return;
    }

    if (result.status === 'success') {
      closeModal('edit');
      refreshData();
      toastMessage(result.data.message, 'success');
    }
  };

  const handleCreatePageGroup = async (title) => {
    if (title === '') {
      toastMessage(
        'Title is required. Please Enter PageGroup title',
        'warning'
      );
      return;
    }

    const result = await createPageGroup({
      name: title,
      documentationId: Number(selectedVersion.id)
    });

    if (handleError(result, navigate)) {
      return;
    }

    if (result.status === 'success') {
      closeModal('createPageGroup');
      refreshData();
      toastMessage(result.data.message, 'success');
    }
  };

  const handleCreatePage = async (title, slug) => {
    if (title === '' || slug === '') {
      toastMessage(
        'Title and Slug are required. Please Enter Page title and slug',
        'warning'
      );
      return;
    }

    const docIdOrVersionId = selectedVersion.id ? selectedVersion.id : docId;

    const result = await createPageAPI({
      title,
      slug,
      content: JSON.stringify([]),
      documentationId: parseInt(docIdOrVersionId)
    });

    if (handleError(result, navigate)) {
      return;
    }

    if (result.status === 'success') {
      closeModal('createPage');
      refreshData();
      toastMessage(result.data.message, 'success');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) {
      return;
    }

    const newItems = Array.from(
      groupsAndPageData.filter(
        (obj) => obj.documentationId === Number(selectedVersion.id)
      )
    );

    const [reorderedItem] = newItems.splice(result.source.index, 1);

    newItems.splice(result.destination.index, 0, reorderedItem);
    setGroupsAndPageData(newItems);

    const updateOrder = async (item, index) => {
      try {
        const endpoint = item?.name
          ? '/docs/page-group/reorder'
          : '/docs/page/reorder';
        await instance.post(endpoint, {
          id: item.id,
          documentationId: selectedVersion.id,
          order: index
        });
      } catch (err) {
        console.error(err);
        if (!err.response || err?.response?.status === 500) {
          toastMessage(err?.message, 'error');
          navigate('/server-down');
          return;
        }
        toastMessage(err?.response?.data?.message, 'error');
      }
    };

    await Promise.all(newItems.map((item, index) => updateOrder(item, index)));
    refreshData();
  };

  const filteredVersions = documentData.filter((version) =>
    version.version.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const itemsPerPage = selectPageSize;
  const pageSizes = [1, 2, 3, 40, 60, 80, 100, 150];
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = useCallback(
    (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
      }
    },
    [totalPages]
  );

  const handlePageSizeSelect = (value) => {
    setSelectPageSize(value);
    closeModal('pageSizeDropdown');
  };

  return (
    <AnimatePresence className="bg-gray-50 dark:bg-gray-900 p-3 sm:p-5">
      <Breadcrumb key="breadcrumb-container"/>

      {!loading &&
        <>
          {documentData.length !== 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="documentation-component-container"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className=" lg:mt-0 lg:col-span-5 flex justify-end mr-5 gap-3"
                key="documentation-actions-buttons"
              >
                <motion.button
                  whilehover={{ scale: 1.3 }}
                  onClick={() => {
                    openModal('cloneDocument', null);
                  }}
                  title="Clone Documentation"
                  key="clone-button"
                >
                  <Icon
                    icon="clarity:clone-line"
                    className="w-6 h-6 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-700"
                  />
                </motion.button>

                <motion.button
                  whilehover={{ scale: 1.3 }}
                  onClick={() => {
                    openModal('edit', null);
                  }}
                  title="Edit Documentation"
                  key="edit-document-button"
                >
                  <Icon
                    icon="material-symbols:edit-outline"
                    className="w-6 h-6 text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-600"
                  />
                </motion.button>

                <motion.button
                  whilehover={{ scale: 1.3 }}
                  onClick={() => {
                    openModal('delete');
                  }}
                  key="delete-document-button"
                  title="Delete Documentation"
                >
                  <Icon
                    icon="material-symbols:delete"
                    className="w-6 h-6 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-600"
                  />
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid max-w-screen-xl"
                key="documentation-info"
              >
                <div className="mr-auto place-self-center lg:col-span-7">
                  <h1 className="max-w-xl mb-4 text-4xl font-bold tracking-tight leading-none md:text-4xl xl:text-4xl dark:text-white">
                    {documentData[0]?.name}
                  </h1>
                  <p className="max-w-2xl mb-6 font-light text-gray-700 lg:mb-8 md:text-lg lg:text-xl dark:text-gray-400">
                    {documentData[0]?.description}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg overflow-hidden"
                key="documentation-table"
              >
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
                  <div
                    className="flex items-center w-full md:w-auto space-x-2"
                    key="versioning-container"
                  >
                    <div className="relative w-full md:w-64">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Icon
                          icon="material-symbols:search"
                          className="w-6 h-6 text-gray-400 dark:text-gray-500"
                        />
                      </div>
                      <input
                        type="text"
                        id="simple-search"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                        placeholder="Search"
                      />
                    </div>

                    <div className="relative inline-block z-20">
                      <div
                        id="dropdownSelect"
                        className="flex items-center border gap-2 border-gray-400 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer dark:bg-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-white"
                        onClick={toggleDropdown}
                      >
                        {selectedVersion.version}
                        <Icon icon="mingcute:down-fill" className="h-6 w-6" />
                      </div>

                      {showVersionDropdown && (
                        <div
                          id="dropdownSearch"
                          className="absolute bg-white rounded-lg shadow w-52 dark:bg-gray-700 z-30"
                        >
                          <div className="p-1 h-auto w-full">
                            <label htmlFor="input-group-search" className="sr-only">
                              Search
                            </label>
                            {filteredVersions.length !== 2 ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  id="input-group-search"
                                  className="block w-full p-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                  placeholder="Search version"
                                  value={searchQuery}
                                  onChange={handleSearchVersionChange}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center ps-2 rounded">
                                <span className="w-full py-2 ms-2 text-sm font-medium text-gray-900 rounded dark:text-gray-300">
                                  No versions found
                                </span>
                              </div>
                            )}
                            <ul
                              className="h-auto w-full mt-2 overflow-y-auto text-sm text-gray-700 dark:text-gray-200"
                              aria-labelledby="dropdownSelect"
                            >
                              {filteredVersions.length > 0 ? (
                                filteredVersions
                                  .map((option) => (
                                    <li
                                      key={`version-${option.id}`}
                                      className="relative w-full"
                                    >
                                      <div
                                        className={`flex items-center ps-2 rounded hover:bg-gray-200 cursor-pointer ${selectedVersion.version === option.version ? 'bg-gray-900 cursor-text dark:hover:bg-gray-900' : 'dark:hover:bg-gray-800'}`}
                                        onClick={() => handleVersionSelect(option)}
                                      >
                                        <p className="w-full p-3 ms-2 text-md font-medium text-gray-900 rounded dark:text-gray-300">
                                          {option.version}
                                        </p>
                                      </div>
                                    </li>
                                  ))
                              ) : (
                                <li>
                                  <div className="flex items-center ps-2 rounded">
                                    <span className="w-full py-2 ms-2 text-sm font-medium text-gray-900 rounded dark:text-gray-300">
                                      No matched versions
                                    </span>
                                  </div>
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => openModal('createPageGroup')}
                      type="button"
                      className="flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800"
                    >
                      <span className="px-1 text-left items-center dark:text-white text-md">
                        New Group
                      </span>
                      <Icon icon="ei:plus" className="w-6 h-6 dark:text-white" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => openModal('createPage')}
                      type="button"
                      className="flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800"
                    >
                      <span className="px-1 text-left items-center dark:text-white text-md">
                        New Page
                      </span>
                      <Icon icon="ei:plus" className="w-6 h-6 dark:text-white" />
                    </motion.button>
                  </div>
                </div>

                {filteredItems && (
                  <div className="overflow-x-auto h-auto">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="table" type="TABLE">
                        {(provided) => (
                          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                              <tr>
                                <th />
                                <th scope="col" className="px-4 py-3">
                                  Title
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 whitespace-nowrap"
                                >
                                  Author / Editor
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 whitespace-nowrap"
                                >
                                  Create / update
                                </th>
                                <th scope="col" className="px-4 py-3" />
                              </tr>
                            </thead>

                            <tbody
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              {pageGroupLoading ? (
                                <tr className="border-b dark:border-gray-700">
                                  <td colSpan="12" className="p-8">
                                    <div className="flex flex-col items-center justify-center">
                                      {pageGroupLoading && (
                                        <Icon
                                          icon="line-md:loading-twotone-loop"
                                          className="w-32 h-32"
                                        />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ) : !filteredItems === null ||
                                filteredItems.length <= 0 ? (
                                <motion.tr
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="border-b dark:bg-gray-700"
                                  key="no-pages-found-message"
                                >
                                  <td colSpan="12" className="text-center p-8">
                                    <h1 className="text-center text-gray-600 sm:text-lg font-semibold">
                                      No Pages Found
                                    </h1>
                                  </td>
                                </motion.tr>
                                  ) : (
                                    filteredItems.slice(startIdx, endIdx).map((obj, index) => (
                                  <Draggable
                                    key={
                                      obj.name
                                        ? `pageGroup-${obj.id}`
                                        : `page-${obj.id}`
                                    }
                                    draggableId={
                                      obj.name
                                        ? `pageGroup-${obj.id}`
                                        : `page-${obj.id}`
                                    }
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <Table
                                        provided={provided}
                                        snapshot={snapshot}
                                        obj={obj}
                                        index={index}
                                        docId={selectedVersion.id}
                                        pageGroupId={obj.id}
                                        version={selectedVersion.version}
                                      />
                                    )}
                                  </Draggable>
                                    ))
                                  )}
                              {provided.placeholder}
                            </tbody>
                          </table>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                )}

                {filteredItems.length > 0 &&
                  <nav
                    className='flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4'
                    aria-label='Table navigation'
                  >
                    <span className='text-sm font-normal text-gray-500 dark:text-gray-400'>
                      Showing{' '}
                      <span className='font-semibold text-gray-900 dark:text-white mx-1'>
                        {startIdx + 1}-{Math.min(endIdx, totalItems)}
                      </span>{' '}
                      of{' '}
                      <span className='font-semibold text-gray-900 dark:text-white mx-1'>
                        {totalItems}
                      </span>{' '}
                      users
                    </span>

                    <div className='flex items-center gap-3'>
                      <span className='dark:text-white '>Page size</span>
                      <div className="relative inline-block w-64">
                        <button
                          onClick={() => openModal('pageSizeDropdown')}
                          className="flex items-center justify-between w-20 py-2 px-4 bg-white border dark:text-white border-gray-300 rounded-md shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 text-left"
                        >
                          <span>{selectPageSize}</span>
                          <Icon icon="mingcute:down-fill" className="h-5 w-5" />
                        </button>
                        {pageSizeDropdown && (
                          <div className="absolute w-28 bg-white border border-gray-300 rounded-md shadow-lg z-10 dark:bg-gray-800 dark:border-gray-600 bottom-full mb-1 max-h-36 overflow-y-auto" >
                            {pageSizes.map((option) => (
                              <div
                                key={option}
                                onClick={() => handlePageSizeSelect(option)}
                                className="py-2 px-4 cursor-pointer dark:text-white hover:bg-gray-300 dark:hover:bg-gray-900 "
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ul className='inline-flex items-stretch -space-x-px'>
                      <li>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className='flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                        >
                          <span className='sr-only'>Previous</span>
                          <Icon icon='mingcute:left-fill' />
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <li key={i}>
                          <button
                            onClick={() => handlePageChange(i + 1)}
                            className={`flex items-center justify-center text-sm py-2 px-3 leading-tight ${currentPage === i + 1
                                ? 'text-primary-600 bg-primary-50 border border-primary-300 hover:bg-primary-100 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                              }`}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className='flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                        >
                          <Icon icon='mingcute:right-fill' />
                        </button>
                      </li>
                    </ul>
                  </nav>
                }
                {/* Edit Component */}
                {editModal && (
                  <EditDocumentModal
                    heading={
                      currentModalItem ? 'Rename Page Group' : 'Edit Documentation'
                    }
                    title={
                      currentModalItem
                        ? currentModalItem.name
                        : documentData[0]?.name
                    }
                    documentVersion={!currentModalItem && selectedVersion.version}
                    description={!currentModalItem && documentData[0]?.description}
                    id={
                      currentModalItem ? currentModalItem.id : selectedVersion.id
                    }
                    updateData={
                      currentModalItem ? handlePageGroupUpdate : handleUpdate
                    }
                  />
                )}

                {/* Version Modal */}
                {cloneDocumentModal && (
                  <EditDocumentModal
                    heading="New Document Version"
                    title={documentData[0]?.name}
                    description={documentData[0]?.description}
                    id={documentData[0]?.id}
                    updateData={handleUpdate}
                  />
                )}

                {deleteModal && (
                  <DeleteModal
                    deleteDoc={
                      currentModalItem
                        ? () =>
                            handleDeletePageGroup(
                              currentModalItem.id,
                              currentModalItem
                            )
                        : handleDelete
                    }
                    id={
                      currentModalItem ? currentModalItem.id : documentData[0]?.id
                    }
                    title="Are you sure?"
                    message={`You're permanently deleting ${currentModalItem ? `"${currentModalItem.name || currentModalItem.title}"` : `"${documentData[0]?.name}" version ${selectedVersion.version}`}`}
                  />
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
              key="no-documentation-found-message-conatiner"
            >
              <h1 className="text-gray-600 text-3xl p-10">
                no documentations found
              </h1>
            </motion.div>
          )}
        </>
      }

      {/* Create pageGroup resusable component */}
      {createPageGroupModal && (
        <CreatePageGroup
          handleCreate={handleCreatePageGroup}
          key="create-page-group-0"
        />
      )}

      {createPageModal && (
        <CreatePage handleCreate={handleCreatePage} key="create-page-0" />
      )}
    </AnimatePresence>
  );
}
