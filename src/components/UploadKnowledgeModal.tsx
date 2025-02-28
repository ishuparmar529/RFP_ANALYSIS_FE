import { useState, useEffect } from "react";
import { UploadIcon, X, FileText, File } from "lucide-react";
import { createPortal } from "react-dom";
import axios from "axios";
import { BASE_URL } from "../constants";
import { toast } from "sonner";

// Create a modal container if it doesn't exist
const getModalRoot = () => {
  let modalRoot = document.getElementById("modal-root");
  if (!modalRoot) {
    modalRoot = document.createElement("div");
    modalRoot.setAttribute("id", "modal-root");
    document.body.appendChild(modalRoot);
    // Set styles to ensure it's always on top
    Object.assign(modalRoot.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "100000",
    });
  }
  return modalRoot;
};

export function ModalPortal({ children }) {
  const [modalRoot, setModalRoot] = useState(null);

  useEffect(() => {
    setModalRoot(getModalRoot());
    return () => {
      // Cleanup if needed
    };
  }, []);

  return modalRoot ? createPortal(children, modalRoot) : null;
}

export function UploadKnowledgeModal({ isOpen, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);

  const [isUploading, setIsUploading] = useState(false);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => {
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [isOpen, onClose]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter((file) => {
      const fileType = file.type;
      return (
        fileType === "application/pdf" ||
        fileType === "application/msword" ||
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleSubmit = async () => {
    // Here you would implement your file upload logic
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    try {
      setIsUploading(true);
      const response = await axios.post(`${BASE_URL}/index-files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
      });

      // Update the PDF list with newly uploaded files
      if (response.data.files) {
        setPdfs((prev) => [...prev, ...response.data.files]);
      }
      setIsUploading(false);

      toast.success("Knowledge base updated successfully");
      // Clear the file input
    } catch (error) {
      setIsUploading(false);
      toast.error("Something went wrong");
    }

    console.log("Files to upload:", files);
    // Reset the state after uploading

    setFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: "1rem",
          zIndex: 999999,
          pointerEvents: "auto",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            width: "100%",
            maxWidth: "28rem",
            padding: "1.5rem",
            position: "relative",
            zIndex: 1000000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              color: "#9CA3AF",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X className="h-5 w-5" />
          </button>

          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            Upload Knowledge Base
          </h2>

          {/* Upload area */}
          <div
            style={{
              border: "2px dashed",
              borderColor: dragActive ? "#3B82F6" : "#D1D5DB",
              backgroundColor: dragActive ? "#EFF6FF" : "transparent",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadIcon
              style={{
                margin: "0 auto",
                height: "3rem",
                width: "3rem",
                color: "#9CA3AF",
                marginBottom: "0.5rem",
              }}
            />
            <p
              style={{
                fontSize: "0.875rem",
                color: "#4B5563",
                marginBottom: "0.5rem",
              }}
            >
              Drag and drop files here, or click to select files
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#6B7280",
                marginBottom: "0.75rem",
              }}
            >
              Supported formats: PDF, Word (.doc, .docx)
            </p>
            <label style={{ display: "inline-block" }}>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <span
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563EB",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                Select Files
              </span>
            </label>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h3
                style={{
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                Selected Files:
              </h3>
              <div style={{ maxHeight: "10rem", overflowY: "auto" }}>
                {files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {getFileIcon(file)}
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.875rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "16rem",
                        }}
                      >
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        color: "#9CA3AF",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #D1D5DB",
                color: "#374151",
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "0.375rem",
                background: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={files.length === 0}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: files.length === 0 ? "#60A5FA" : "#2563EB",
                color: "white",
                fontSize: "0.875rem",
                fontWeight: 500,
                borderRadius: "0.375rem",
                border: "none",
                cursor: files.length === 0 ? "not-allowed" : "pointer",
                opacity: files.length === 0 ? 0.7 : 1,
              }}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function UploadButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 w-full py-2.5 px-4 text-sm font-medium
          text-gray-700 rounded-lg
          hover:bg-gray-200
          focus:outline-none focus:ring-2 
          focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200"
      >
        <UploadIcon className="h-4 w-4 text-gray-500" />
        <span>Knowledge Base</span>
      </button>

      <UploadKnowledgeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
