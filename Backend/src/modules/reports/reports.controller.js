import { reportsService } from "./reports.service.js";
import PDFDocument from "pdfkit";

const formatSnapshotForPDF = (doc, snapshot, type) => {
  const pageWidth = doc.page.width - 100;
  const leftMargin = 50;

  // Header
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#0e7490")
    .text(snapshot.title || type, leftMargin, 50, { align: "center" });
  doc.moveDown(0.5);

  if (snapshot.period) {
    doc.fontSize(9).font("Helvetica").fillColor("#64748b")
      .text(`Period: ${snapshot.period.from || "All Time"} — ${snapshot.period.to || "Present"}`, { align: "center" });
  }

  doc.moveDown(1);
  doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke("#e2e8f0");
  doc.moveDown(0.8);

  // Helper to draw a table
  const drawTable = (title, headers, rows) => {
    // Check if we need a new page
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    doc.fontSize(13).font("Helvetica-Bold").fillColor("#1e293b").text(title, leftMargin);
    doc.moveDown(0.5);

    const colWidth = pageWidth / headers.length;
    const startY = doc.y;

    // Header row background
    doc.rect(leftMargin, startY, pageWidth, 22).fill("#0e7490");

    // Header text
    headers.forEach((h, i) => {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff")
        .text(h, leftMargin + (i * colWidth) + 5, startY + 6, { width: colWidth - 10, align: "left" });
    });

    let currentY = startY + 22;

    // Data rows
    rows.forEach((row, rowIndex) => {
      if (currentY > doc.page.height - 80) {
        doc.addPage();
        currentY = 50;
      }

      // Alternating row colors
      if (rowIndex % 2 === 0) {
        doc.rect(leftMargin, currentY, pageWidth, 20).fill("#f8fafc");
      } else {
        doc.rect(leftMargin, currentY, pageWidth, 20).fill("#ffffff");
      }

      row.forEach((cell, i) => {
        doc.fontSize(8).font("Helvetica").fillColor("#334155")
          .text(String(cell ?? "N/A"), leftMargin + (i * colWidth) + 5, currentY + 5, { width: colWidth - 10, align: "left" });
      });

      currentY += 20;
    });

    // Bottom border
    doc.moveTo(leftMargin, currentY).lineTo(leftMargin + pageWidth, currentY).stroke("#e2e8f0");
    doc.y = currentY + 15;
    doc.moveDown(0.5);
  };

  // Type-specific tables
  switch (type) {
    case "monthly-conservation-summary": {
      const h = snapshot.health || {};
      const d = snapshot.detections || {};
      const a = snapshot.alerts || {};
      const hat = snapshot.hatchery || {};

      drawTable("Health Overview", ["Metric", "Value"], [
        ["Total Health Records", h.total || 0],
        ["Healthy", h.healthy || 0],
        ["Fibropapillomatosis (FP)", h.fp || 0],
        ["Barnacles", h.barnacles || 0],
        ["Avg. Confidence", ((h.avgConfidence || 0) * 100).toFixed(1) + "%"]
      ]);

      drawTable("Detection Overview", ["Metric", "Value"], [
        ["Total Detections", d.total || 0],
        ["Turtles", d.turtles || 0],
        ["Predators", d.predators || 0],
        ["Humans", d.humans || 0],
        ["Nests", d.nests || 0],
        ["Safe Nests", d.safeNests || 0]
      ]);

      drawTable("Shoreline Alerts", ["Metric", "Value"], [
        ["Total Alerts", a.total || 0],
        ["High Risk", a.high || 0],
        ["Medium Risk", a.medium || 0],
        ["Low Risk", a.low || 0],
        ["Resolved", a.resolved || 0],
        ["New", a.newAlerts || 0]
      ]);

      drawTable("Hatchery Summary", ["Metric", "Value"], [
        ["Total Videos", hat.total || 0],
        ["Completed", hat.completed || 0],
        ["Processing", hat.processing || 0],
        ["Errors", hat.errors || 0]
      ]);
      break;
    }

    case "turtle-health-analytics": {
      const s = snapshot.summary || {};
      drawTable("Health Summary", ["Metric", "Value"], [
        ["Total Records", s.total || 0],
        ["Healthy", s.healthy || 0],
        ["FP", s.fp || 0],
        ["Barnacles", s.barnacles || 0],
        ["Avg. Confidence", ((s.avgConfidence || 0) * 100).toFixed(1) + "%"],
        ["Min Confidence", ((s.minConfidence || 0) * 100).toFixed(1) + "%"],
        ["Max Confidence", ((s.maxConfidence || 0) * 100).toFixed(1) + "%"]
      ]);

      if (snapshot.diagnosisBreakdown?.length) {
        drawTable("Diagnosis Breakdown", ["Class", "Count", "Avg Confidence"],
          snapshot.diagnosisBreakdown.map(d => [d._id, d.count, ((d.avgConfidence || 0) * 100).toFixed(1) + "%"])
        );
      }

      if (snapshot.monthlyTrend?.length) {
        drawTable("Monthly Trend", ["Month", "Year", "Total", "Healthy", "Unhealthy", "Avg Confidence"],
          snapshot.monthlyTrend.map(t => [t.month, t.year, t.total, t.healthy, t.unhealthy, (t.avgConfidence * 100).toFixed(1) + "%"])
        );
      }

      if (snapshot.recentRecords?.length) {
        drawTable("Recent Records", ["Date", "Diagnosis", "Confidence", "Notes"],
          snapshot.recentRecords.slice(0, 15).map(r => [
            new Date(r.timestamp).toLocaleDateString(),
            r.diagnosisClass,
            ((r.confidence || 0) * 100).toFixed(1) + "%",
            (r.notes || "—").substring(0, 40)
          ])
        );
      }
      break;
    }

    case "nest-protection-report": {
      const s = snapshot.summary || {};
      drawTable("Detection Summary", ["Metric", "Value"], [
        ["Total Detections", s.total || 0],
        ["Turtles", s.turtles || 0],
        ["Predators", s.predators || 0],
        ["Humans", s.humans || 0],
        ["Nests", s.nests || 0],
        ["Avg. Confidence", ((s.avgConfidence || 0) * 100).toFixed(1) + "%"]
      ]);

      if (snapshot.typeBreakdown?.length) {
        drawTable("Detection Type Breakdown", ["Type", "Count", "Avg Confidence"],
          snapshot.typeBreakdown.map(t => [t._id, t.count, ((t.avgConfidence || 0) * 100).toFixed(1) + "%"])
        );
      }

      if (snapshot.zoneBreakdown?.length) {
        drawTable("Zone Activity", ["Zone", "Count"],
          snapshot.zoneBreakdown.map(z => [z._id || "Unknown", z.count])
        );
      }

      if (snapshot.nestStatusBreakdown?.length) {
        drawTable("Nest Status", ["Status", "Count"],
          snapshot.nestStatusBreakdown.map(n => [n._id || "Unknown", n.count])
        );
      }

      if (snapshot.monthlyTrend?.length) {
        drawTable("Monthly Trend", ["Month", "Year", "Total", "Nests", "Threats"],
          snapshot.monthlyTrend.map(t => [t.month, t.year, t.total, t.nests, t.threats])
        );
      }
      break;
    }

    case "shoreline-risk-assessment": {
      const s = snapshot.summary || {};
      drawTable("Alert Summary", ["Metric", "Value"], [
        ["Total Alerts", s.total || 0],
        ["High Risk", s.high || 0],
        ["Medium Risk", s.medium || 0],
        ["Low Risk", s.low || 0],
        ["Resolved", s.resolved || 0],
        ["Acknowledged", s.acknowledged || 0],
        ["New", s.newAlerts || 0]
      ]);

      if (snapshot.riskLevelBreakdown?.length) {
        drawTable("Risk Level Distribution", ["Risk Level", "Count"],
          snapshot.riskLevelBreakdown.map(r => [r._id, r.count])
        );
      }

      if (snapshot.statusBreakdown?.length) {
        drawTable("Status Distribution", ["Status", "Count"],
          snapshot.statusBreakdown.map(s => [s._id, s.count])
        );
      }

      if (snapshot.sourceBreakdown?.length) {
        drawTable("Source Distribution", ["Source", "Count"],
          snapshot.sourceBreakdown.map(s => [s._id || "Unknown", s.count])
        );
      }

      if (snapshot.monthlyTrend?.length) {
        drawTable("Monthly Trend", ["Month", "Year", "Total", "High Risk", "Resolved"],
          snapshot.monthlyTrend.map(t => [t.month, t.year, t.total, t.high, t.resolved])
        );
      }

      if (snapshot.recentAlerts?.length) {
        drawTable("Recent Alerts", ["Date", "Risk", "Status", "Message"],
          snapshot.recentAlerts.slice(0, 10).map(a => [
            new Date(a.createdAt).toLocaleDateString(),
            a.riskLevel,
            a.status,
            (a.message || "—").substring(0, 50)
          ])
        );
      }
      break;
    }

    case "hatchery-management": {
      const vs = snapshot.videos?.summary || {};
      const as = snapshot.alerts?.summary || {};

      drawTable("Video Summary", ["Metric", "Value"], [
        ["Total Videos", vs.total || 0],
        ["Completed", vs.completed || 0],
        ["Processing", vs.processing || 0],
        ["Uploaded", vs.uploaded || 0],
        ["Errors", vs.errors || 0],
        ["Avg. Confidence", ((vs.avgConfidence || 0) * 100).toFixed(1) + "%"]
      ]);

      drawTable("Alert Summary", ["Metric", "Value"], [
        ["Total Alerts", as.total || 0],
        ["Pending", as.pending || 0],
        ["Acknowledged", as.acknowledged || 0],
        ["Resolved", as.resolved || 0]
      ]);

      if (snapshot.videos?.bySpecies?.length) {
        drawTable("Species Distribution", ["Species", "Count"],
          snapshot.videos.bySpecies.map(s => [s._id || "Pending", s.count])
        );
      }

      if (snapshot.alerts?.byTank?.length) {
        drawTable("Alerts by Tank", ["Tank", "Count"],
          snapshot.alerts.byTank.map(t => [t._id || "Unknown", t.count])
        );
      }
      break;
    }

    default:
      // Generic key-value fallback
      drawTable("Report Data", ["Key", "Value"],
        Object.entries(snapshot).filter(([_, v]) => typeof v !== "object").map(([k, v]) => [k, v])
      );
  }

  // Footer
  doc.moveDown(1);
  doc.moveTo(leftMargin, doc.y).lineTo(leftMargin + pageWidth, doc.y).stroke("#e2e8f0");
  doc.moveDown(0.5);
  doc.fontSize(7).font("Helvetica").fillColor("#94a3b8")
    .text(`Generated by Franklin Conservation System • ${new Date().toLocaleString()}`, { align: "center" });
};

export const reportsController = {
  getAll: async (req, res) => {
    try {
      const reports = await reportsService.getAllReports();
      res.status(200).json({ success: true, reports });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ success: false, message: "Failed to fetch reports", error: error.message });
    }
  },

  generate: async (req, res) => {
    try {
      const { type, from, to } = req.body;
      if (!type) {
        return res.status(400).json({ success: false, message: "Report type is required" });
      }

      const validTypes = [
        "monthly-conservation-summary",
        "turtle-health-analytics",
        "nest-protection-report",
        "shoreline-risk-assessment",
        "hatchery-management"
      ];

      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: `Invalid report type. Valid types: ${validTypes.join(", ")}` });
      }

      const report = await reportsService.generateReport(type, from, to);
      res.status(201).json({
        success: true,
        report: {
          _id: report._id,
          type: report.type,
          title: report.title,
          generatedAt: report.generatedAt,
          filters: report.filters,
          snapshot: report.snapshot
        }
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ success: false, message: "Failed to generate report", error: error.message });
    }
  },

  download: async (req, res) => {
    try {
      const { id } = req.params;
      const { format = "json" } = req.query;

      const report = await reportsService.getReportById(id);
      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${report.type}_${report._id}.json"`);
        return res.json(report.snapshot);
      }

      if (format === "pdf") {
        const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${report.type}_${report._id}.pdf"`);

        // Collect chunks and send at end to avoid stream errors
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(chunks);
          res.end(pdfBuffer);
        });
        doc.on("error", (err) => {
          console.error("PDF generation error:", err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: "PDF generation error" });
          }
        });

        formatSnapshotForPDF(doc, report.snapshot, report.type);
        doc.end();
        return;
      }

      res.status(400).json({ success: false, message: "Invalid format. Use 'json' or 'pdf'" });
    } catch (error) {
      console.error("Error downloading report:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to download report", error: error.message });
      }
    }
  },

  deleteReport: async (req, res) => {
    try {
      const { id } = req.params;
      const report = await reportsService.deleteReport(id);
      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }
      res.status(200).json({ success: true, message: "Report deleted successfully" });
    } catch (error) {
      console.error("Error deleting report:", error);
      res.status(500).json({ success: false, message: "Failed to delete report", error: error.message });
    }
  }
};
