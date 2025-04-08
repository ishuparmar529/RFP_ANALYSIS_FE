import { useState, useEffect } from "react";
import { PDFSidebar } from "./components/pdf-sidebar";
import { BASE_URL, DEFAULT_APP_SETTINGS } from "./constants";
import axios from "axios";
import PDFPromptAnalyzer from "./screens/home";

const AccordionCard = ({
  isOpen,
  toggleAccordion: onToggle,
  index,
  children,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg mb-6 shadow-md">
      <div
        className="px-3 py-2 flex justify-between items-center cursor-pointer bg-white hover:bg-gray-50 transition-colors duration-200"
        onClick={onToggle}
      >
        <h3 className="text-lg font-semibold text-gray-800">
          Section {index + 1}
        </h3>
        <span
          className={`text-xl transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-0 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};
function App() {
  const [pdfs, setPdfs] = useState([]);
  const [accordions, setAccordions] = useState([{ isOpen: true }]);
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);

  async function getPdfList() {
    try {
      const response = await axios.get(`${BASE_URL}/list-pdfs`, {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });
      setPdfs(response.data.document_list);
    } catch (error) {
      console.error("Error:", error);
    }
  }
  useEffect(() => {
    getPdfList();
  }, []);

  const toggleAccordion = (index) => {
    setAccordions(
      accordions.map((item, i) => ({
        ...item,
        isOpen: i === index ? !item.isOpen : item.isOpen,
      }))
    );
  };

  const addNewAccordion = () => {
    setAccordions([...accordions, { isOpen: true }]);
  };

  const handleSettingsChange = (newSettings) => {
    setAppSettings(newSettings);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed height and hide overflow */}
      <div className="flex-shrink-0 h-screen sticky top-0 ">
        {/* Prevent sidebar from shrinking */}
        <PDFSidebar
          setPfs={setPdfs}
          getPdfList={getPdfList}
          initialPdfs={pdfs}
          uploadEndpoint={`${BASE_URL}/upload-file`}
          settings={appSettings}
          onSettingsChange={handleSettingsChange}
        />
      </div>
      <main className="flex-1 overflow-y-auto bg-gray-100">
        {" "}
        {/* Enable vertical scroll */}
        <div className="p-4">
          <div className=" mx-auto">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-gray-100 py-4 z-10">
              {" "}
              {/* Sticky header with lower z-index */}
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
              <button
                onClick={addNewAccordion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         transition-colors duration-200 flex items-center gap-2 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                <span className="text-xl leading-none">+</span>
                <span>Add New Section</span>
              </button>
            </div>

            <div className="space-y-4  ">
              {accordions.map((accordion, index) => (
                <AccordionCard
                  key={index}
                  index={index}
                  isOpen={accordion.isOpen}
                  toggleAccordion={() => toggleAccordion(index)}
                  title={`PDF Analysis ${index + 1}`}
                >
                  <PDFPromptAnalyzer pdfList={pdfs} settings={appSettings} />
                </AccordionCard>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
