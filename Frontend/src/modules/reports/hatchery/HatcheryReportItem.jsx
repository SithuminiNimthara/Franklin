import { FileText, Download, Calendar } from "lucide-react";
import { useState } from "react";
import Button from "../../../shared/components/ui/Button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function HatcheryReportItem({ report }) {
  const [status, setStatus] = useState("Available");

  const generatePDF = async () => {
    setStatus("Generating");

    try {
      const response = await fetch(
        "http://localhost:5002/api/hatchery/report/hatchery",
      );
      const result = await response.json();

      if (!result.success) throw new Error();

      const data = result.data;
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Hatchery Performance Report", 14, 20);

      autoTable(doc, {
        startY: 30,
        head: [["Metric", "Value"]],
        body: [
          ["Total Hatchlings", data.summary.totalHatchlings],
          ["Species Types", data.summary.speciesTypes],
          ["Health Average", data.summary.healthAverage],
          ["Total Alerts", data.summary.totalAlerts],
          ["Critical Alerts (pending)", data.summary.criticalAlerts],
          ["Resolved Alerts", data.summary.resolvedAlerts],
        ],
      });

      doc.save("Hatchery_Report.pdf");
    } catch (err) {
      alert("Failed to generate hatchery report");
    } finally {
      setTimeout(() => setStatus("Available"), 1000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-100 rounded-xl p-4 hover:shadow-lg hover:border-cyan-200 transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-3 rounded-xl">
            <FileText className="h-6 w-6 text-cyan-600" />
          </div>

          <div>
            <h4 className="font-semibold text-gray-900">{report.title}</h4>
            <div className="flex items-center space-x-3 mt-2">
              <span className="text-xs text-gray-600 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {report.date}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {report.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {status === "Generating" ? (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold animate-pulse">
              GENERATING
            </span>
          ) : (
            <>
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                AVAILABLE
              </span>
              <Button
                className="p-2 h-auto"
                icon={Download}
                onClick={generatePDF}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
