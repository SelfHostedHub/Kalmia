import { initFlowbite } from "flowbite";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { privateAxios } from "../../api/axios";
import ClipLoader from "react-spinners/ClipLoader";
import EditDocumentModal from "../createDocumentModal/EditDocumentModal";
import DeleteModal from "../deleteModal/DeleteModal";
import { toastError, toastSuccess, toastWarning } from "../../utlis/toast";
import CreatePageGroup from "../createPageGroup/CreatePageGroup";
import { AnimatePresence, motion } from "framer-motion";
import { AuthContext } from "../../Context/AuthContext";

export default function Documentation() {
  const { refresh, refreshData, user, documentationData } =
    useContext(AuthContext);
  const navigate = useNavigate();

  const [searchParam] = useSearchParams();
  const doc_id = searchParam.get("id");

  const [loading, setLoading] = useState(false);

  //Documentation CRUD
  const [documentData, setDocumentData] = useState([]);
  const [isEditModal, setIsEditModal] = useState(false);
  const [isDeleteModal, setDeleteModal] = useState(false);

  //pageGroup CRUD
  const [isEditpageGroup, setIsEditpageGroup] = useState(false);
  const [isPageGroupsDeleteModal, setIsPageGroupsDeleteModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const [openCreatePageGroup, setOpenCreatePageGroup] = useState(false);

  //pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const totalItems = documentationData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to the first page on search
  };

  
  // Filter the items based on the search term
  const filteredItems = documentationData.filter(
    (obj) =>
      obj.documentationId === Number(doc_id) &&
      (obj.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       obj.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

    const paginatedItems = filteredItems.slice(startIdx, endIdx);

  //pagination function
  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  //Flowbite js function
  useEffect(() => {
    initFlowbite();
  }, [paginatedItems, handlePageChange]);

  //Fetch document information
  useEffect(() => {
    setLoading(true);
    const fetchdata = async () => {
      setLoading(true);

      if (!doc_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, status } = await privateAxios.post(
          `/docs/documentation`,
          { id: Number(doc_id) }
        );

        if (status === 200) {
          setDocumentData(data);
          setLoading(false);
        }
      } catch (err) {
        if (!err?.response) {
          navigate("/server-down");
        } else if (err.response?.status === 400) {
          toastError(err.response.data.error);
        } else if (err.response?.status === 401) {
          toastError(err.response.data.error);
        } else {
          toastError("Login Failed");
        }
      }
    };

    fetchdata();
  }, [doc_id, refresh, navigate, user]);

  const handleDeletemodalopen = () => {
    setDeleteModal(true);
  };

  const handleCancel = () => {
    setDeleteModal(false);
  };

  //Documentation CRUD function
  const handleDelete = async () => {
    try {
      const { data, status } = await privateAxios.post(
        "docs/documentation/delete",
        { id: Number(doc_id) }
      );
      if (status === 200) {
        toastSuccess(data.message);
        refreshData();
        navigate("/dashboard");
      }
    } catch (err) {
      toastError(err.response.data.message);
    }
  };

  const handleEditClose = () => {
    setIsEditModal(!isEditModal);
  };

  const handelUpdate = async (editTitle, editDescription) => {
    try {
      const { data, status } = await privateAxios.post(
        "docs/documentation/edit",
        {
          id: Number(doc_id),
          name: editTitle,
          description: editDescription,
        }
      );

      if (status === 200) {
        setIsEditModal(false);
        refreshData();
        toastSuccess(data.message);
      } else {
        console.log("Error found :", data.error);
      }
    } catch (err) {
      toastError(err.response.data.message);
    }
  };

  //PageGroup CRUD function
  const openDeletePageGroups = (item) => {
    setCurrentItem(item);
    setIsPageGroupsDeleteModal(true);
  };

  const handleCancelPagegroupDelete = () => {
    setIsPageGroupsDeleteModal(false);
    setCurrentItem(null);
  };

  const handleDeletePageGroup = async (id) => {
    try {
      const { data, status } = await privateAxios.post(
        "docs/page-group/delete",
        { id: Number(id) }
      );
      if (status === 200) {
        toastSuccess(data.message);
        setIsPageGroupsDeleteModal(false);
        refreshData();
      }
    } catch (err) {
      toastError(err.response.data.message);
    }
  };

  const openEditPageGroup = (item) => {
    setCurrentItem(item);
    setIsEditpageGroup(true);
  };

  const handleEditPageGroupClose = () => {
    setIsEditpageGroup(false);
    setCurrentItem(null);
  };

  const handelPageGroupUpdate = async (editTitle, editDescription, id) => {
    try {
      const { data, status } = await privateAxios.post("docs/page-group/edit", {
        id: Number(id),
        name: editTitle,
        documentationSiteId: Number(doc_id),
      });

      if (status === 200) {
        setIsEditpageGroup(false);
        refreshData();
        toastSuccess(data.message);
      } else {
        console.log("Error found :", data.error);
      }
    } catch (err) {
      toastError(err.response.data.message);
    }
  };

  const CreatePageGroupModalClose = () => {
    setOpenCreatePageGroup(false);
  };

  const handleCreatePageGroup = async (title) => {
    if (title === "") {
      toastWarning("Title is required. Please Enter PageGroup title");
      return;
    }

    try {
      const { data, status } = await privateAxios.post(
        "docs/page-group/create",
        {
          name: title,
          documentationSiteId: Number(doc_id),
        }
      );

      if (status === 200) {
        setOpenCreatePageGroup(false);
        refreshData();
        toastSuccess(data.message);
      } else {
        console.log("Error found :", data.error);
      }
    } catch (err) {
      toastError(err.response.data.message);
    }
  };

  return (
    <AnimatePresence class="bg-gray-50 dark:bg-gray-900 p-3 sm:p-5">
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        class="flex"
        aria-label="Breadcrumb"
      >
        <ol class="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
          <li class="inline-flex items-center">
            <Link
              to="/dashboard"
              class="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
            >
              <svg
                class="w-3 h-3 me-2.5"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
              </svg>
              Home
            </Link>
          </li>
          <li aria-current="page">
            <div class="flex items-center">
              <svg
                class="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
              <span class="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">
                Documentation
              </span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Create pageGroup resusable component */}
      {openCreatePageGroup && (
        <CreatePageGroup
          closeModal={CreatePageGroupModalClose}
          handleCreate={handleCreatePageGroup}
        />
      )}

      {/* Edit Documentation component */}
      {isEditModal && (
        <EditDocumentModal
          heading="Edit Documentation"
          value={documentData.id}
          doc_id={documentData.id}
          title={documentData.name}
          description={documentData.description}
          closeModal={handleEditClose}
          updateData={handelUpdate}
        />
      )}

      {/* Delete Documentation Component */}
      {isDeleteModal && (
        <DeleteModal
          cancelModal={handleCancel}
          deleteDoc={handleDelete}
          id={documentData.id}
          title={`Are you sure you want to delete this ${documentData.name} Documentation`}
          message="By deleting this documentation associated page groups and pages will also be permanently deleted."
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        class=" lg:mt-0 lg:col-span-5 flex justify-end mr-5 gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.3 }}
          onClick={() => setIsEditModal(!isEditModal)}
          title="Edit Documentation"
        >
          <svg
            class="w-6 h-6 cursor-pointer text-gray-800 hover:border dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"
            />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.3 }}
          onClick={handleDeletemodalopen}
          title="Delete Documentation"
        >
          <svg
            class="w-6 h-6 cursor-pointer hover:border  text-red-700 dark:text-red-400"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"
            />
          </svg>
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        class="grid max-w-screen-xl px-4 mx-auto lg:gap-8 xl:gap-0 lg:grid-cols-12"
      >
        <div class="mr-auto place-self-center lg:col-span-7">
          <h1 class="max-w-xl mb-4 text-4xl font-bold tracking-tight leading-none md:text-4xl xl:text-4xl dark:text-white">
            {documentData.name}
          </h1>
          <p class="max-w-2xl mb-6 font-light text-gray-700 lg:mb-8 md:text-lg lg:text-xl dark:text-gray-400">
            {documentData.description}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.1 }}
        class="mx-auto max-w-screen-xl px-4 lg:px-12"
      >
        <div class="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg overflow-hidden">
          <div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
            <div class="w-full md:w-1/3">
              <div class="flex items-center">
                <label htmlFor="simple-search" class="sr-only">
                  Search
                </label>
                <div class="relative w-full">
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg
                      aria-hidden="true"
                      class="w-5 h-5 text-gray-500 dark:text-gray-400"
                      fill="currentColor"
                      viewbox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="simple-search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                    placeholder="Search"
                    
                  />
                </div>
              </div>
            </div>
            <div class="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setOpenCreatePageGroup(true)}
                type="button"
                class="flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800"
              >
                Create Group
              </motion.button>

              <motion.button whileHover={{ scale: 1.1 }}>
                <Link
                  to={`/dashboard/documentation/create-page?id=${doc_id}&dir=true`}
                  class="flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800"
                >
                  Create page
                </Link>
              </motion.button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" class="px-4 py-3">
                    Title
                  </th>
                  <th scope="col" class="px-4 py-3">
                    Path
                  </th>
                  <th scope="col" class="px-4 py-3">
                    Extension
                  </th>
                  <th scope="col" class="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="border-b dark:border-gray-700">
                    <td colSpan="4" className="py-8">
                      <div className="flex flex-col items-center justify-center">
                        <ClipLoader
                          color="#666161"
                          loading={loading}
                          size={100}
                          aria-label="Loading Spinner"
                          data-testid="loader"
                        />
                        <h1 className="text-xl font-bold text-center text-gray-500 mt-4">
                          Loading....
                        </h1>
                      </div>
                    </td>
                  </tr>
                ) : !paginatedItems || paginatedItems.length <= 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b dark:border-gray-700"
                  >
                    <td colSpan="4" className="text-center py-8">
                      <h1 className="text-center text-gray-600 sm:text-lg font-semibold">
                        No Pages Found
                      </h1>
                    </td>
                  </motion.tr>
                ) : (
                  <>
                    {paginatedItems &&
                      paginatedItems.map((obj) => (
                        <tr
                          className="border-b dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                          key={obj.id}
                        >
                          {obj.name ? (
                            <Link
                              to={`/dashboard/documentation/pagegroup?id=${doc_id}&pagegroup_id=${obj.id}`}
                            >
                              <th
                                scope="row"
                                className="flex items-center cursor-pointer gap-2 px-4 py-3 font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap dark:text-white"
                              >
                                <svg
                                  class="w-6 h-6 text-yellow-400 dark:text-white"
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    fill-rule="evenodd"
                                    d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 .087.586l2.977-7.937A1 1 0 0 1 6 10h12V9a2 2 0 0 0-2-2h-4.532l-1.9-2.28A2 2 0 0 0 8.032 4H4Zm2.693 8H6.5l-3 8H18l3-8H6.693Z"
                                    clip-rule="evenodd"
                                  />
                                </svg>
                                {obj.name || obj.title}
                              </th>
                            </Link>
                          ) : (
                            <Link
                              to={`/dashboard/documentation/edit-page?id=${doc_id}&dir=true&page_id=${obj.id}`}
                            >
                              <th
                                scope="row"
                                className="flex items-center cursor-pointer gap-2 px-4 py-3 font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap dark:text-white"
                              >
                                <svg
                                  class="w-6 h-6 text-gray-600 dark:text-white"
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke="currentColor"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"
                                  />
                                </svg>
                                {obj.title}
                              </th>
                            </Link>
                          )}

                          {obj.name ? (
                            <td className="px-4 py-3">/{obj.name}</td>
                          ) : (
                            <td className="px-4 py-3">/{obj.slug}</td>
                          )}

                          {obj.name ? (
                            <td className="px-4 py-3">Folder</td>
                          ) : (
                            <td className="px-4 py-3">file</td>
                          )}

                          {obj.name && (
                            <td className="px-4 py-3 flex items-center">
                              <button
                                id={`dropdown-button-${obj.id}`}
                                data-dropdown-toggle={`dropdown-${obj.id}`}
                                className="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-none dark:text-gray-400 dark:hover:text-gray-100"
                                type="button"
                              >
                                <svg
                                  className="w-5 h-5"
                                  aria-hidden="true"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                              </button>
                              <div
                                id={`dropdown-${obj.id}`}
                                className="hidden z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700 dark:divide-gray-600"
                              >
                                <ul
                                  className="py-1 text-sm text-gray-700 dark:text-gray-200"
                                  aria-labelledby={`dropdown-button-${obj.id}`}
                                >
                                  <li>
                                    <p
                                      onClick={() => openEditPageGroup(obj)}
                                      className="block py-2 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                    >
                                      Edit
                                    </p>
                                  </li>
                                  <li>
                                    <p
                                      onClick={() => openDeletePageGroups(obj)}
                                      className="block py-2 px-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                    >
                                      Delete
                                    </p>
                                  </li>
                                </ul>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* pagination  */}

          {!paginatedItems || paginatedItems.length <= 0 ? null : (
            <nav
              className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4"
              aria-label="Table navigation"
            >
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                Showing
                <span className="font-semibold text-gray-900 dark:text-white mx-1">
                  {startIdx + 1}-{Math.min(endIdx, totalItems)}
                </span>
                of
                <span className="font-semibold text-gray-900 dark:text-white mx-1">
                  {totalItems}
                </span>
              </span>
              <ul className="inline-flex items-stretch -space-x-px">
                <li>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="w-5 h-5"
                      aria-hidden="true"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handlePageChange(i + 1)}
                      className={`flex items-center justify-center text-sm py-2 px-3 leading-tight ${
                        currentPage === i + 1
                          ? "text-primary-600 bg-primary-50 border border-primary-300 hover:bg-primary-100 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                          : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
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
                    className="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="w-5 h-5"
                      aria-hidden="true"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              </ul>
            </nav>
          )}

          {/* PageGroup Edit Component */}
          {isEditpageGroup && currentItem && (
            <EditDocumentModal
              heading="Rename Page Group"
              title={currentItem.name}
              id={currentItem.id}
              closeModal={handleEditPageGroupClose}
              updateData={handelPageGroupUpdate}
            />
          )}

          {/* PageGroup delete Component */}
          {isPageGroupsDeleteModal && currentItem && (
            <DeleteModal
              cancelModal={handleCancelPagegroupDelete}
              deleteDoc={() => handleDeletePageGroup(currentItem.id)}
              id={currentItem.id}
              title={`Are you sure you want to delete this "${currentItem.name}"`}
              message={`By deleting this PageGroup associated pages will also be permanently deleted.`}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
