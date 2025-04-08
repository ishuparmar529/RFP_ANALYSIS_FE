import { useState, type ChangeEvent, type FormEvent } from "react";
import { BASE_URL, DEFAULT_APP_SETTINGS } from "../constants";
import axios from "axios";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Summary from "../components/Summary";

interface AppSettings {
  maxParallelStepAnalysis: number;
}

export default function PDFPromptAnalyzer({
  pdfList,
  settings = DEFAULT_APP_SETTINGS,
}: {
  pdfList: string[];
  settings?: AppSettings;
}) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepResponses, setStepResponses] = useState<{ [key: number]: string }>(
    {}
  );
  const [stepLoading, setStepLoading] = useState<{ [key: number]: boolean }>(
    {}
  );
  // Separate loading states for each operation
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isAnalyzingAllSteps, setIsAnalyzingAllSteps] = useState(false);
  const [isAnalyzeAndSummarizeLoading, setIsAnalyzeAndSummarizeLoading] =
    useState(false);
  const [summarizedResult, setSummarizedResult] = useState<string | null>(null);
  const [stepsToSummarize, setStepsToSummarize] = useState([]);
  const [workflowProgress, setWorkflowProgress] = useState<{
    totalSteps: number;
    completedSteps: number;
    status: "idle" | "analyzing" | "summarizing" | "completed";
  }>({
    totalSteps: 0,
    completedSteps: 0,
    status: "idle",
  });

  // Add state to track visible/hidden steps
  const [hiddenSteps, setHiddenSteps] = useState<{ [key: number]: boolean }>(
    {}
  );

  // Add state to toggle between summary and steps view
  const [viewMode, setViewMode] = useState<"steps" | "summary">("steps");
  const [stepIsRag, setStepIsRag] = useState({});
  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/generate-response/`, {
        user_query: prompt,
        pdf_names: pdfList,
      });

      const steps = JSON.parse(response.data.llm_response);
      setResponse(response.data.llm_response);
      setStepResponses({}); // Clear previous step responses
      setStepLoading({}); // Clear step loading states
      setHiddenSteps({}); // Reset hidden steps state
      setStepsToSummarize([]);
      setSummarizedResult(null);
      setViewMode("steps"); // Reset view mode to steps

      // Reset workflow progress
      setWorkflowProgress({
        totalSteps: steps.length,
        completedSteps: 0,
        status: "idle",
      });
    } catch (error) {
      console.error("Error:", error);
      setResponse("An error occurred while processing your request.");
    } finally {
      setLoading(false);
    }
  };
  const toggleRagOption = (index) => {
    setStepIsRag((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };
  const handleReprompt = async (stepContent: string, index: number) => {
    setStepLoading((prev) => ({ ...prev, [index]: true }));
    try {
      console.log("Analyzing step:", stepContent); // Debug log
      const response = await axios.post(`${BASE_URL}/retrieve-response`, {
        user_query: stepContent,
        pdf_names: pdfList,
        first_step_query: prompt,
        use_rag: stepIsRag[index] || false,
      });

      console.log("Step analysis response:", response.data.rag_response); // Debug log

      setStepsToSummarize((prev) => [
        ...prev,
        {
          storyboarding_query: stepContent,
          storyboarding_response: response.data.rag_response,
        },
      ]);
      setStepResponses((prev) => ({
        ...prev,
        [index]: response.data.rag_response,
      }));

      // Update workflow progress
      setWorkflowProgress((prev) => ({
        ...prev,
        completedSteps: prev.completedSteps + 1,
        status:
          prev.completedSteps + 1 === prev.totalSteps
            ? "completed"
            : "analyzing",
      }));

      toast.success(`Step ${index + 1} analyzed successfully`);
    } catch (error) {
      console.error("Error analyzing step:", error);
      setStepResponses((prev) => ({
        ...prev,
        [index]: "An error occurred while processing your request.",
      }));
      toast.error(`Failed to analyze step ${index + 1}`);
    } finally {
      setStepLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Helper function to process steps in parallel batches
  const processInParallelBatches = async (
    indices: number[],
    steps: string[],
    maxParallel: number
  ) => {
    // Process in batches of maxParallel
    for (let i = 0; i < indices.length; i += maxParallel) {
      const batch = indices.slice(i, i + maxParallel);

      // Process this batch in parallel
      await Promise.all(
        batch.map((index) =>
          !stepLoading[index] && !stepResponses[index]
            ? handleReprompt(steps[index], index)
            : Promise.resolve()
        )
      );
    }
  };

  // Function to analyze all pending steps
  const handleAnalyzePendingSteps = async () => {
    if (!response) return;

    setIsAnalyzingAllSteps(true);
    setWorkflowProgress((prev) => ({
      ...prev,
      status: "analyzing",
    }));

    const steps = JSON.parse(response);

    // Find all steps that haven't been analyzed yet
    const pendingStepIndices = steps
      .map((_, index) => (!stepResponses[index] ? index : null))
      .filter((index) => index !== null);

    if (pendingStepIndices.length === 0) {
      toast.info("No pending steps to analyze");
      setIsAnalyzingAllSteps(false);
      return;
    }

    const maxParallel = settings.maxParallelStepAnalysis;
    toast.info(
      `Analyzing ${pendingStepIndices.length} pending steps (${maxParallel} at a time)...`
    );

    try {
      // Process steps in parallel batches
      await processInParallelBatches(pendingStepIndices, steps, maxParallel);

      toast.success("All pending steps have been analyzed");
    } catch (error) {
      console.error("Error during parallel analysis:", error);
      toast.error("Some steps failed to analyze");
    } finally {
      setIsAnalyzingAllSteps(false);
    }
  };

  // Function to analyze pending steps and then summarize
  const handleAnalyzeAndSummarize = async () => {
    if (!response) return;

    setIsAnalyzeAndSummarizeLoading(true);

    try {
      // First analyze all pending steps
      await handleAnalyzePendingSteps();

      // Then summarize all steps
      await handleSumarize();
    } catch (error) {
      console.error("Error during analyze and summarize:", error);
      toast.error("Failed to complete the analyze and summarize process");
    } finally {
      setIsAnalyzeAndSummarizeLoading(false);
    }
  };

  // Add function to toggle step visibility
  const toggleStepVisibility = (index: number) => {
    setHiddenSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Toggle between summary and steps view
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "summary" ? "steps" : "summary"));
  };

  // Function to scroll to a specific step
  const scrollToStep = (index: number) => {
    const stepElement = document.getElementById(`step-${index}`);
    if (stepElement) {
      // Ensure the step is visible
      setHiddenSteps((prev) => ({
        ...prev,
        [index]: false,
      }));

      // Scroll to the step with smooth behavior
      stepElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  async function handleSumarize() {
    setIsSummaryLoading(true);
    setWorkflowProgress((prev) => ({
      ...prev,
      status: "summarizing",
    }));

    const payload = {
      first_step_query: prompt,
      pdf_names: pdfList,
      user_query: stepsToSummarize,
    };

    try {
      const response = await axios.post(`${BASE_URL}/final-response`, payload);
      setSummarizedResult(response.data.final_response);
      setViewMode("summary"); // Switch to summary view after summarizing

      // Update workflow progress to completed
      setWorkflowProgress((prev) => ({
        ...prev,
        status: "completed",
      }));
    } catch (error) {
      console.error("Error summarizing steps:", error);
      toast.error("Failed to summarize steps");
    } finally {
      setIsSummaryLoading(false);
    }

    console.log(stepsToSummarize, "steps to summarize");
  }

  // Calculate progress percentage
  const progressPercentage =
    workflowProgress.totalSteps > 0
      ? (workflowProgress.completedSteps / workflowProgress.totalSteps) * 100
      : 0;

  // Get status text
  const getStatusText = () => {
    switch (workflowProgress.status) {
      case "idle":
        return "Ready to start";
      case "analyzing":
        return `Analyzing steps (${workflowProgress.completedSteps}/${workflowProgress.totalSteps}) - ${settings.maxParallelStepAnalysis} at a time`;
      case "summarizing":
        return "Creating summary...";
      case "completed":
        return summarizedResult ? "Summary completed" : "All steps analyzed";
      default:
        return "";
    }
  };

  // Generate step markers for the progress bar
  const renderStepMarkers = () => {
    if (!response || workflowProgress.totalSteps === 0) return null;

    const steps = JSON.parse(response);
    return (
      <div className="flex justify-between mt-1 px-1">
        {steps.map((_, index) => {
          const isCompleted = !!stepResponses[index];
          const isLoading = stepLoading[index];

          return (
            <button
              key={index}
              onClick={() => scrollToStep(index)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-200 ${
                isCompleted
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : isLoading
                  ? "bg-yellow-500 text-white animate-pulse"
                  : "bg-gray-300 text-gray-700 hover:bg-gray-400"
              }`}
              title={`Jump to Step ${index + 1}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="prompt"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={handlePromptChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your prompt here..."
          />
        </div>
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {loading ? "Processing..." : "Analyze"}
        </button>
      </form>

      {response && (
        <div className="bg-white p-4 w-full">
          {/* Progress indicator */}
          {workflowProgress.totalSteps > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Workflow Progress
                </span>
                <span
                  className={`text-sm font-medium ${
                    workflowProgress.status === "completed"
                      ? "text-green-600"
                      : workflowProgress.status === "summarizing"
                      ? "text-purple-600"
                      : "text-blue-600"
                  }`}
                >
                  {getStatusText()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ease-in-out ${
                    workflowProgress.status === "completed"
                      ? "bg-green-600"
                      : workflowProgress.status === "summarizing"
                      ? "bg-purple-600"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              {/* Step markers for quick navigation */}
              {renderStepMarkers()}
            </div>
          )}

          {/* View toggle button - only show when summary is available */}
          {summarizedResult && (
            <div className="mb-4">
              <button
                onClick={toggleViewMode}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:bg-indigo-700"
              >
                {viewMode === "summary" ? "Show Steps" : "Show Summary"}
              </button>
            </div>
          )}

          {/* Conditional rendering based on view mode */}
          {viewMode === "summary" && summarizedResult ? (
            <Summary text={summarizedResult} />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 justify-start mb-4">
                <button
                  onClick={handleSumarize}
                  disabled={
                    isSummaryLoading ||
                    isAnalyzingAllSteps ||
                    isAnalyzeAndSummarizeLoading ||
                    workflowProgress.completedSteps === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isSummaryLoading ? "Summarizing..." : "Summarize"}
                </button>
                <button
                  onClick={handleAnalyzePendingSteps}
                  disabled={
                    isAnalyzingAllSteps ||
                    isSummaryLoading ||
                    isAnalyzeAndSummarizeLoading
                  }
                  className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {isAnalyzingAllSteps
                    ? "Analyzing..."
                    : "Analyze pending steps"}
                </button>
                <button
                  onClick={handleAnalyzeAndSummarize}
                  disabled={
                    isAnalyzingAllSteps ||
                    isSummaryLoading ||
                    isAnalyzeAndSummarizeLoading
                  }
                  className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
                >
                  {isAnalyzeAndSummarizeLoading
                    ? "Processing..."
                    : "Analyze and Summarize"}
                </button>
              </div>
              <div className="space-y-6">
                {JSON.parse(response).map((step, index) => {
                  const stepNumber = `Step ${index + 1}`;
                  const colors = [
                    "bg-blue-100 border-blue-500",
                    "bg-green-100 border-green-500",
                    "bg-yellow-100 border-yellow-500",
                    "bg-purple-100 border-purple-500",
                    "bg-pink-100 border-pink-500",
                    "bg-indigo-100 border-indigo-500",
                  ];
                  const colorClass = colors[index % colors.length];
                  const isHidden = hiddenSteps[index];
                  const isStepAnalyzed = !!stepResponses[index];
                  const isStepLoading = stepLoading[index];

                  return (
                    <div
                      key={index}
                      id={`step-${index}`}
                      className="rounded-0 overflow-hidden border border-gray-200"
                    >
                      <div
                        className={`p-3 py-2 ${colorClass} flex justify-between items-center overflow-hidden ${
                          isStepAnalyzed
                            ? "border-l-8 border-green-600"
                            : isStepLoading
                            ? "border-l-8 border-yellow-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="text-lg">
                            {stepNumber}
                            {isHidden
                              ? `${step
                                  ?.replace(stepNumber, "")
                                  .substring(0, 120)}...`
                              : ""}
                          </h3>
                          {/* Status indicator */}
                          {isStepAnalyzed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg
                                className="mr-1.5 h-2 w-2 text-green-400"
                                fill="currentColor"
                                viewBox="0 0 8 8"
                              >
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Analyzed
                            </span>
                          )}
                          {isStepLoading && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <svg
                                className="animate-pulse mr-1.5 h-2 w-2 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 8 8"
                              >
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Analyzing...
                            </span>
                          )}
                          {!isStepAnalyzed && !isStepLoading && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <svg
                                className="mr-1.5 h-2 w-2 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 8 8"
                              >
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Pending
                            </span>
                          )}

                          <div className="flex items-center">
                            <input
                              id={`rag-checkbox-${index}`}
                              type="checkbox"
                              checked={stepIsRag[index] || false}
                              onChange={() => toggleRagOption(index)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <label
                              htmlFor={`rag-checkbox-${index}`}
                              className="ml-2 text-sm font-medium text-gray-700"
                            >
                              Use RAG for analysis
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleStepVisibility(index)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-200 transition-colors duration-200"
                        >
                          {isHidden ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 0 0 16 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                              />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Content section - hidden when isHidden is true */}
                      <div
                        className={`transition-all duration-300 ease-in-out ${
                          isHidden
                            ? "max-h-0 opacity-0 overflow-hidden"
                            : "max-h-full opacity-100"
                        }`}
                      >
                        <div
                          className={`p-4 border-t border-gray-200 ${colorClass.replace(
                            "bg-",
                            "bg-opacity-40 bg-"
                          )}`}
                        >
                          <p className="text-gray-700">{step}</p>
                        </div>

                        {stepResponses[index] ? (
                          <div className="bg-gray-50 p-4 border-t border-gray-200">
                            <h4 className="font-semibold mb-2 text-blue-600">
                              Step Analysis:
                            </h4>
                            <p className="text-gray-800">
                              <Markdown remarkPlugins={[remarkGfm]}>
                                {stepResponses[index]}
                              </Markdown>
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 flex justify-center border-t border-gray-200">
                            <button
                              onClick={() => handleReprompt(step, index)}
                              disabled={
                                stepLoading[index] ||
                                isAnalyzingAllSteps ||
                                isAnalyzeAndSummarizeLoading
                              }
                              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                              {stepLoading[index]
                                ? "Analyzing..."
                                : "Analyze this step"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
