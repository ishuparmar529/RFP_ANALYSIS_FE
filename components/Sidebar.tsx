import React, { useEffect, useState } from 'react';
import { Bell, Plus, Search, Settings, X, ChevronDown, Trash2, Upload } from "lucide-react";
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteFile, deleteProject, fetchPdf, getProjects, listFiles, uploadFilesWithProject, uploadKnowledgeBase } from '@/lib/APIservice';
import { toast } from 'sonner';
import { LoadingSpinner } from './LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import axios from 'axios';
import { useProject } from '@/app/projectContext';
import Link from 'next/link';

type Props = {
    sidebarOpen: boolean;
};

interface PdfFile {
    id: number;
    filename: string;
    project_id: number;
}

const BASE_URL = 'https://9b1a-112-196-96-42.ngrok-free.app';

const createProject = async (name: string) => {
    const res = await axios.post(`${BASE_URL}/projects/?name=${encodeURIComponent(name)}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420"
        }
    });
    return res.data;
};


function Sidebar({ sidebarOpen }: Props) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const { selectedProject, setSelectedProject } = useProject();
    const knowledgeInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const { data: Projects, isLoading: ProjectsLoading, error: ProjectError } = useQuery({ 
        queryKey: ['projectList'], 
        queryFn: getProjects 
    });

    const { mutate: uploadKnowledgeMutation, isPending: uploadKnowledgePending } = useMutation({
        mutationFn: (files: File[]) => uploadKnowledgeBase(files),
        onSuccess: () => {
            toast.success('Knowledge base files uploaded successfully');
            if (knowledgeInputRef.current) {
                knowledgeInputRef.current.value = "";
            }
            // Optionally invalidate any relevant queries
            // queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
        },
        onError: () => {
            toast.error('Failed to upload knowledge base files');
            if (knowledgeInputRef.current) {
                knowledgeInputRef.current.value = "";
            }
        },
    });

    const { mutate: deleteProjectMutation, isPending: deleteProjectPending } = useMutation({
        mutationFn: (projectId: number) => deleteProject(projectId),
        onSuccess: (data, variables) => {
            toast.success('Project deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['projectList'] });
            if (selectedProject?.id === variables) {
                setSelectedProject(null);
            }
        },
        onError: () => {
            toast.error('Failed to delete project');
        },
    });

    const { mutate: createProjectMutation, isPending: createPending } = useMutation({
        mutationFn: createProject,
        onSuccess: (data) => {
            toast.success('Project created successfully');
            queryClient.invalidateQueries({ queryKey: ['projectList'] });
            setIsCreateDialogOpen(false);
            setNewProjectName('');
            setSelectedProject({ id: data.id, name: newProjectName });
        },
        onError: () => {
            toast.error('Failed to create project');
        },
    });

    const { mutate: DeletePdf, isPending: deletePending } = useMutation({
        mutationFn: ({ projectId, fileId }: { projectId: number; fileId: number }) =>
            deleteFile(projectId, fileId),
        onSuccess: (_, variables) => {
            toast.success('File deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['projectFiles', variables.projectId] });
        },
        onError: () => {
            toast.error('Failed to delete file');
        },
    });

    const { mutate: uploadFilesMutation, isPending: uploadPending } = useMutation({
        mutationFn: ({ files, projectId }: { files: File[], projectId: number }) => 
            uploadFilesWithProject(files, projectId),
        onSuccess: () => {
            toast.success('Files uploaded successfully');
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            queryClient.invalidateQueries({ queryKey: ['projectFiles', selectedProject?.id] });
        },
        onError: () => {
            toast.error('Failed to upload files');
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
    });

    const handleKnowledgeUploadClick = () => {
        if (knowledgeInputRef.current) {
            knowledgeInputRef.current.click();
        }
    };

    const handleDeleteProject = (projectId: number) => {
        deleteProjectMutation(projectId);
    };

    const handleCreateProject = () => {
        if (newProjectName.trim()) {
            createProjectMutation(newProjectName);
        }
    };

    const removeFile = (fileId: number, projectId: number) => {
        DeletePdf({ projectId, fileId }); 
    };

    const toggleProject = (projectId: number, projectName: string) => {
        if (selectedProject?.id === projectId) {
            setSelectedProject(null);
        } else {
            setSelectedProject({ id: projectId, name: projectName });
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, projectId: number) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0 && projectId) {
            uploadFilesMutation({ files, projectId });
        }
    };

    const handleKnowledgeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            uploadKnowledgeMutation(files);
        }
    };

    return (
        <div className={cn(
            "w-[280px] bg-[#111827] text-white flex flex-col fixed md:static inset-y-0 left-0 z-60 transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <Link href="/">
    <h2 className="font-medium">Company Logo</h2>
  </Link>
                <Bell size={20} className="text-gray-400" />
            </div>

            {/* Project Dropdown List */}
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-gray-300 mb-2">Projects</h3>
                {deletePending || ProjectsLoading || deleteProjectPending ? (
                    <div className='flex justify-center items-center h-15'>
                        <LoadingSpinner />
                    </div>
                ) : Projects?.projects?.length > 0 ? (
                    Projects.projects.map((project: any, index: number) => (
                        <div key={index} className="mb-2">
                            <div className="bg-[#1a2234] p-2 text-xs flex items-center justify-between text-gray-300 rounded">
                                <div 
                                    className="flex items-center flex-1 cursor-pointer"
                                    onClick={() => toggleProject(project.id, project.name)}
                                >
                                    <p className='truncate mr-2'>{project.name}</p>
                                    <ChevronDown 
                                        size={16} 
                                        className={cn(
                                            "text-gray-400 flex-shrink-0 transition-transform",
                                            selectedProject?.id === project.id ? "rotate-180" : ""
                                        )} 
                                    />
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Trash2 
                                            size={16} 
                                            className="text-gray-400 cursor-pointer hover:text-red-400 ml-2"
                                        />
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the project
                                                and all associated files.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handleDeleteProject(project.id)}
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            {selectedProject?.id === project.id && (
                                <div className="pl-4 pt-2">

                                    <ProjectFiles 
                                        projectId={project.id} 
                                        removeFile={removeFile} 
                                    />
                                    <div className='pl-4'>
                                    <Button variant='ghost' onClick={handleUploadClick} className="flex items-center text-gray-300 w-full text-xs cursor-pointer mt-2">
                                       {uploadPending ? <LoadingSpinner /> :<Upload size={16} className="mr-2" /> }
                                        Upload Files
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, project.id)}
                                            disabled={uploadPending}
                                        />
                                    </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-sm">No projects available</p>
                )}
            </div>

            {/* Create Project Button */}
            <div className="p-4 border-b border-gray-700">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="flex items-center text-gray-300 text-sm">
                            <Plus size={18} className="mr-2" />
                            Create Project
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input
                                placeholder="Project Name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                            />
                            <Button 
                                onClick={handleCreateProject}
                                disabled={createPending || !newProjectName.trim()}
                            >
                                {createPending ? <LoadingSpinner /> : 'Create'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="p-4 border-b border-gray-700">
                <Button 
                    variant='ghost' 
                    onClick={handleKnowledgeUploadClick} 
                    className="flex items-center text-gray-300 w-full text-sm cursor-pointer"
                >
                    {uploadKnowledgePending ? (
                        <LoadingSpinner />
                    ) : (
                        <Upload size={18} className="mr-2" />
                    )}
                    Upload Knowledge Base
                    <input
                        type="file"
                        multiple
                        ref={knowledgeInputRef}
                        className="hidden"
                        onChange={handleKnowledgeFileUpload}
                        disabled={uploadKnowledgePending}
                    />
                </Button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4">
                <ul className="space-y-6">
                <li className="flex items-center text-gray-300">
  <Link href={"chatHistory"} className="flex items-center">
    <div className="w-6 h-6 mr-2 flex items-center justify-center border border-gray-600 rounded">
      <span className="text-xs">💬</span>
    </div>
    Chat History
  </Link>
</li>
                    
                    <li className="flex items-center text-gray-300">
                        <div className="w-6 h-6 mr-2 flex items-center justify-center border border-gray-600 rounded">
                            <span className="text-xs">📄</span>
                        </div>
                        Synopsis
                    </li>
                    <li className="flex items-center text-gray-300">
                        <div className="w-6 h-6 mr-2 flex items-center justify-center border border-gray-600 rounded">
                            <span className="text-xs">🚩</span>
                        </div>
                        Red Flags / Dependencies
                    </li>
                    <li className="flex items-center text-white font-medium">
                        <div className="w-6 h-6 mr-2 flex items-center justify-center border border-gray-600 rounded">
                            <span className="text-xs">📄</span>
                        </div>
                        Prepare Response
                    </li>

                    <li className="flex items-center text-gray-300">
                        <div className="w-6 h-6 mr-2 flex items-center justify-center border border-gray-600 rounded">
                            <Search size={16} />
                        </div>
                        Search in KMS
                    </li>
                </ul>
            </nav>

            {/* Settings */}
            <div className="p-4 border-t border-gray-700">
                <button className="flex items-center text-gray-300">
                    <Settings size={18} className="mr-2" />
                    Settings
                </button>
            </div>
        </div>
    );
}

interface ProjectFilesProps {
    projectId: number;
    removeFile: (fileId: number, projectId: number) => void;
}

function ProjectFiles({ projectId, removeFile }: ProjectFilesProps) {
    const { data: files, isLoading, error } = useQuery({
        queryKey: ['projectFiles', projectId],
        queryFn: () => listFiles(projectId),
    });

    if (isLoading) return <div className="pl-4 pt-2 flex justify-center items-center"><LoadingSpinner /></div>;
    if (error) return <div className="pl-4 pt-2 text-red-400 text-xs">Failed to load files</div>;

    return (
        <div className="pl-4 pt-2">
            {files?.files_list?.length > 0 ? (
                files?.files_list.map((file: PdfFile) => (
                    <div 
                        key={file.id} 
                        className="bg-[#1f2a44] p-2 text-xs flex items-center justify-between text-gray-300 rounded mb-1"
                    >
                        <p className='truncate mr-2'>{file?.filename}</p>
                        <X 
                            size={16} 
                            className="text-gray-400 flex-shrink-0 cursor-pointer" 
                            onClick={() => removeFile(file.id, file.project_id)} 
                        />
                    </div>
                ))
            ) : (
                <p className="text-gray-400 text-xs">No files in this project</p>
            )}
        </div>
    );
}

export default Sidebar;