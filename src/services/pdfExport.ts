"use client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Service for exporting SOP content to PDF with media support
 */
export class PDFExportService {
  /**
   * Converts HTML content to PDF with proper formatting
   * @param elementId - ID of the element containing SOP content
   * @param fileName - Name for the output PDF file
   */
  static async exportToPDF(elementId: string, fileName: string) {
    try {
      // Capture all media elements first
      await this.captureMediaElements();
      
      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found");
      
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      throw error;
    }
  }
  
  /**
   * Captures snapshots of video elements and replaces them with static images
   */
  private static async captureMediaElements() {
    const videos = document.querySelectorAll("video");
    
    for (const video of Array.from(videos)) {
      try {
        // Create canvas from video frame
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Replace video with canvas
        const parent = video.parentNode;
        if (parent) {
          parent.replaceChild(canvas, video);
          canvas.className = video.className;
        }
      } catch (error) {
        console.warn("Failed to capture video frame:", error);
      }
    }
  }
}