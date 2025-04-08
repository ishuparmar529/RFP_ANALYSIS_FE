"use client";

import * as React from "react";
import { FileText, Upload, Trash2 } from "lucide-react";
import axios from "axios";
import { BASE_URL } from "../constants";
import { toast } from "sonner";
import { SettingsButton, SettingsModal } from "./SettingsModal";
import { createPortal } from "react-dom";
import { UploadButton } from "./UploadKnowledgeModal";

interface AppSettings {
  maxParallelStepAnalysis: number;
}

interface PDFSidebarProps {
  initialPdfs?: string[];
  uploadEndpoint: string;
  className?: string;
  getPdfList: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function PDFSidebar({
  initialPdfs,
  getPdfList,
  className = "",
  settings,
  onSettingsChange,
}: PDFSidebarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [pdfs, setPdfs] = React.useState<string[]>(initialPdfs || []);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [selectedPdf, setSelectedPdf] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (deleteConfirmOpen) {
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scrolling when modal is closed
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [deleteConfirmOpen]);

  React.useEffect(() => {
    if (initialPdfs) {
      setPdfs(initialPdfs);
    }
  }, [initialPdfs]);

  const handleFileChangepdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSendFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await axios.post(`${BASE_URL}/upload-files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      // Update the PDF list with newly uploaded files
      if (response.data.files) {
        setPdfs((prev) => [...prev, ...response.data.files]);
      }
      setFiles([]);
      setUploadLoading(false);
      toast.success("Files uploaded successfully");
      getPdfList();

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload Failed:", error);
      setUploadLoading(false);
      toast.error("Failed to upload files");
    }
  };

  const openDeleteConfirm = (pdf: string) => {
    setSelectedPdf(pdf);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setSelectedPdf(null);
    setDeleteConfirmOpen(false);
  };

  const handleDeletePdf = async () => {
    if (!selectedPdf) return;

    setDeleteLoading(true);
    try {
      // Replace with your actual delete endpoint
      await axios.delete(`${BASE_URL}/delete-file`, {
        data: { filenames: [selectedPdf] },
      });

      // Remove the deleted PDF from the state
      setPdfs(pdfs.filter((pdf) => pdf !== selectedPdf));
      toast.success("PDF deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete PDF");
    } finally {
      setDeleteLoading(false);
      closeDeleteConfirm();
    }
  };

  // Create the delete confirmation modal content
  const deleteModalContent =
    deleteConfirmOpen && mounted ? (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete PDF</h3>
          <p className="text-gray-500 mb-4">
            Are you sure you want to delete this file?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeDeleteConfirm}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePdf}
              disabled={deleteLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-red-300"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <aside
      className={`flex h-screen w-72 flex-col border-r bg-gray-50 ${className}`}
    >
      {/* PDF List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Your PDFs</h2>
        {pdfs?.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            No PDFs uploaded yet
          </p>
        ) : (
          <ul className="space-y-2">
            {pdfs?.map((pdf) => (
              <li key={pdf}>
                <div className="flex items-center justify-between rounded-lg p-2 text-sm text-gray-700 hover:bg-gray-100 group">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{pdf}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteConfirm(pdf);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upload Section */}
      <div className="p-4 bg-gray-50 rounded-lg border-t border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              onChange={handleFileChangepdf}
              className="w-full h-[42px] text-sm text-gray-500 rounded-lg
                 file:mr-4 file:py-2.5 file:px-4 
                 file:rounded-lg file:border-0 
                 file:text-sm file:font-medium
                 file:bg-blue-50 file:text-blue-700
                 hover:file:bg-blue-100
                 file:cursor-pointer
                 focus:outline-none focus:border-blue-500
                 border border-gray-300
                 cursor-pointer"
              ref={fileInputRef}
            />
          </div>

          <button
            type="button"
            onClick={handleSendFiles}
            disabled={uploadLoading}
            className="w-full flex items-center justify-center
                py-2.5 px-4 text-sm font-medium
                bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 
                focus:outline-none focus:ring-2 
                focus:ring-blue-500 focus:ring-offset-2
                disabled:bg-blue-300 disabled:cursor-not-allowed
                transition-colors duration-200"
          >
            {uploadLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></span>
                Uploading...
              </span>
            ) : (
              "Upload Files"
            )}
          </button>

          {/* Settings Button */}
          <div className="border-t border-gray-200 pt-3 mt-1">
            <SettingsButton onClick={() => setIsSettingsOpen(true)} />
          </div>
          <div className="border-t border-gray-200 pt-3 mt-1">
            <UploadButton />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={onSettingsChange}
      />

      {/* Delete Confirmation Modal - using portal */}
      {mounted &&
        deleteModalContent &&
        createPortal(deleteModalContent, document.body)}
    </aside>
  );
}
