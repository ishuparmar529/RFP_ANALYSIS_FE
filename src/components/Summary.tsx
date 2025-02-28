import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardCopy } from "lucide-react"; // Import the clipboard icon

const Summary = ({ text }) => {
  const parseContent = (text) => {
    return text.split("\n").map((line, index) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        // Section headers
        return (
          <h2 key={index} className="text-2xl font-bold mt-8 mb-4">
            {line.replace(/\*\*/g, "")}
          </h2>
        );
      } else if (line.startsWith("- **")) {
        // Subsection headers with bullet points
        const [header, ...content] = line.substring(3).split(":");
        return (
          <div key={index} className="my-3">
            <strong className="text-lg">{header.replace(/\*\*/g, "")}:</strong>
            {content.join(":")}
          </div>
        );
      } else if (line.startsWith("- ")) {
        // Regular bullet points
        return (
          <div key={index} className="ml-6 my-2 flex">
            <span className="mr-2">•</span>
            <span>{line.substring(2)}</span>
          </div>
        );
      } else if (line.match(/^\d+\./)) {
        // Numbered lists
        return (
          <div key={index} className="ml-6 my-2">
            {line}
          </div>
        );
      } else if (line.trim() === "") {
        // Empty lines
        return <div key={index} className="h-2" />;
      } else {
        // Regular paragraphs
        return (
          <p key={index} className="my-2">
            {line}
          </p>
        );
      }
    });
  };

  // Function to copy summary text to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show a temporary "Copied!" message
        const button = document.getElementById('copy-button');
        if (button) {
          const originalText = button.innerText;
          button.innerText = 'Copied!';
          setTimeout(() => {
            button.innerText = originalText;
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="mx-auto p-3 bg-white">
      <div className="mb-3 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Full Summary</h1>
        <button
          id="copy-button"
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
          title="Copy to clipboard"
        >
          <ClipboardCopy className="h-4 w-4" />
          <span>Copy</span>
        </button>
      </div>
      <div className="space-y-2">
        <Markdown remarkPlugins={[remarkGfm]}>
          {text}
        </Markdown>
      </div>
    </div>
  );
};

export default Summary;
