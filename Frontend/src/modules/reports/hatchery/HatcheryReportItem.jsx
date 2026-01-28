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
      const response = await fetch("http://localhost:5002/api/hatchery/report/hatchery");
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
      doc.save("Hatchery_Performance_Report.pdf");
    } catch (err) {
      alert("Failed to generate report matrix");
    } finally {
      setTimeout(() => setStatus("Available"), 1000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl p-3 hover:shadow-lg hover:border-cyan-200 dark:hover:border-cyan-900 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2.5 rounded-xl shadow-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{report.title}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center font-medium">
                <Calendar className="h-3 w-3 mr-1 opacity-60" />
                {report.date}
              </span>
              <span className="text-[8px] bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded-full font-black uppercase">
                {report.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {status === "Generating" ? (
            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full font-black animate-pulse uppercase tracking-widest">
              Processing
            </span>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-[9px] text-green-600 dark:text-green-500 font-black uppercase tracking-widest">
                Ready
              </span>
              <Button
                variant="secondary"
                className="p-2 h-auto rounded-lg shadow-sm"
                onClick={generatePDF}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
