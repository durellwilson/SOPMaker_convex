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
   * Captures snapshots of video and image elements and replaces them with static images
   */
  private static async captureMediaElements() {
    // Handle video elements
    const videos = document.querySelectorAll("video");
    for (const video of Array.from(videos)) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const parent = video.parentNode;
        if (parent) {
          parent.replaceChild(canvas, video);
          canvas.className = video.className;
        }
      } catch (error) {
        console.warn("Failed to capture video frame:", error);
      }
    }
    // Handle image elements
    const images = document.querySelectorAll("img");
    for (const img of Array.from(images)) {
      try {
        if (!img.complete || img.naturalWidth === 0) continue;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const parent = img.parentNode;
        if (parent) {
          parent.replaceChild(canvas, img);
          canvas.className = img.className;
        }
      } catch (error) {
        console.warn("Failed to capture image:", error);
      }
    }
  }
}