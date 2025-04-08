"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useMutation } from "@tanstack/react-query";
import { generateResponse } from "@/lib/APIservice";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useProject } from "./projectContext";
import ReactMarkdown from "react-markdown";

// Define a type for the question state
type QuestionState = {
  isOpen: boolean;
  text: string;
};

export default function RFPResponseApp() {
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { selectedProject } = useProject();
  const [response, setResponse] = useState<string | null>(null); // State to store the API response

  const { mutate: generateResponseFn, isPending: generatePending } = useMutation({
    mutationFn: ({ userQuery, projectId }: { projectId: number; userQuery: string }) =>
      generateResponse(userQuery, projectId),
    onSuccess: (data) => {
      toast.success("Questions submitted successfully");
      console.log("API Response:", data);
      setResponse(data.final_response
        ); // Store the response to display it
    },
    onError: (error) => {
      toast.error("Failed to submit questions");
      console.error("Submission error:", error);
    },
  });

  const [questions, setQuestions] = useState<QuestionState[]>([
    { isOpen: true, text: "" },
    { isOpen: true, text: "" },
  ]);

  // Toggle question visibility
  const toggleQuestion = (index: number) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, isOpen: !q.isOpen } : q)));
  };

  // Update question text
  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, text } : q)));
  };

  // Add new question
  const addQuestion = () => {
    setQuestions([...questions, { isOpen: true, text: "" }]);
  };

  // Delete question
  const deleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (checked: boolean) => {
    setChecked(checked);
  };

  // Submit questions using React Query mutation
  const submitQuestions = () => {
    const allQuestions = questions
      .map((q) => q.text)
      .filter((text) => text.trim() !== "")
      .join("\n");

    if (!allQuestions) {
      toast.error("Please enter at least one question");
      return;
    }

    if (!selectedProject?.id) {
      toast.error("No project selected");
      return;
    }

    generateResponseFn({
      userQuery: allQuestions,
      projectId: selectedProject.id,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100 relative overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="flex-1 overflow-auto w-full">
        <div className="max-w-5xl mx-auto bg-white min-h-full shadow-sm">
          <Header setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen} />

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-start gap-3">
            <div className="font-medium">{selectedProject?.name}</div>
              {/* <div className="font-medium">RAG</div>
              <Switch checked={checked} onCheckedChange={handleChange} /> */}
            </div>

            {questions.map((question, index) => (
              <div key={index} className="border rounded-md">
                <div
                  className="flex justify-between items-center p-4 border-b cursor-pointer"
                  onClick={() => toggleQuestion(index)}
                >
                  <h2 className="font-medium">Q{index + 1}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteQuestion(index)} className="text-red-500">
                      <Trash2 size={20} />
                    </button>
                    {question.isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                {question.isOpen && (
                  <div className="p-4">
                    <Textarea
                      placeholder="Enter your question here..."
                      className="min-h-[100px] border-gray-200"
                      value={question.text}
                      onChange={(e) => updateQuestionText(index, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}

            <Button
              variant="secondary"
              className="bg-[#111827] text-white hover:bg-[#1a2234]"
              onClick={addQuestion}
            >
              Add Another Question
            </Button>

            <Button
              className="bg-[#111827] w-full text-white hover:bg-[#1a2234]"
              onClick={submitQuestions}
              disabled={generatePending}
            >
              {generatePending ? "Submitting..." : "Submit Questions"}
            </Button>

            {/* Display the API response below the Submit button */}
            {response && (
              <div className="mt-6 p-6 border rounded-md bg-gray-50">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Response:</h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 bg-opacity-90 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}