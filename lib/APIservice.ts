import axios from "axios";
import { format } from "date-fns";

const BASE_URL = "https://9b1a-112-196-96-42.ngrok-free.app"

export const fetchPdf = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/list-pdfs`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "69420"
        },
      });
       return res.data
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
};

export const getHistory = async ({filter,startDate,endDate}:{filter:string,startDate:string,endDate:string}) => {
    try {
      const params = new URLSearchParams();
      params.set("filter", filter);
      if (startDate && endDate) {
        params.set("start_date", format(startDate, "yyyy-MM-dd"));
        params.set("end_date", format(endDate, "yyyy-MM-dd"));
      }
      const res = await axios.get(`${BASE_URL}/chat-history/?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "69420"
        },
      });
       return res.data
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
};

export const UploadFiles = async (files:any)=>{
    try {
        const formData = new FormData();
        files.forEach((file:any) => {
            formData.append("files", file);
        });
        const response = await axios.post(`${BASE_URL}/upload-files`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "ngrok-skip-browser-warning": "69420"
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
}

export const DeletePdf = async (fileName: string) => {
    try {
        const res = await axios.delete(`${BASE_URL}/delete-file`, {
            data: { file_names: [fileName] }
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

type questions={
    file_names:[],
    user_query:String,
    use_rag :boolean
}

export const uploadQuestions = async (questions:questions) => {
    try {
        const res = await axios.post(`${BASE_URL}/generate-response`, {
           ...questions
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

// New functions added below:

export const deleteProject = async (projectId: number) => {
    try {
        const res = await axios.delete(`${BASE_URL}/project-delete/?project_id=${projectId}`, {
            headers: {
                "ngrok-skip-browser-warning": "69420"
            }
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

export const getProjects = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/get-projects/`, {
            headers: {
                "ngrok-skip-browser-warning": "69420"
            }
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

export const uploadFilesWithProject = async (files: any[], projectId: number) => {
    try {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("files", file);
        });
        formData.append("project_id", projectId.toString());
        
        const response = await axios.post(`${BASE_URL}/upload-files/`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "ngrok-skip-browser-warning": "69420"
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

export const listFiles = async (projectId: number) => {
    try {
        const res = await axios.get(`${BASE_URL}/list-files/?project_id=${projectId}`, {
            headers: {
                "ngrok-skip-browser-warning": "69420"
            }
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

export const uploadKnowledgeBase = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append('files', file);
    });
    
    const res = await axios.post(`${BASE_URL}/upload-knowledge/`, formData, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
            "Content-Type": "multipart/form-data"
        }
    });
    return res.data;
};

export const generateResponse = async (userQuery: string, projectId: number) => {
    try {
        const res = await axios.post(`${BASE_URL}/generate-response/`, {
            user_query: userQuery,
            project_id: projectId
        }, {
            headers: {
                "ngrok-skip-browser-warning": "69420"
            }
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};

export const deleteFile = async (projectId: number, fileId: number) => {
    try {
        const res = await axios.delete(`${BASE_URL}/file-delete/`, {
            data: {
                project_id: projectId,
                file_id: fileId
            },
            headers: {
                "ngrok-skip-browser-warning": "69420"
            }
        });
        return res.data;
    } catch (error) {
        console.error('Error details:', error);
        throw error;
    }
};