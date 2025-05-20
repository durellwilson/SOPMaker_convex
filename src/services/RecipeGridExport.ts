import html2pdf from 'html2pdf.js';
import { PDFExportOptions } from './EnhancedPDFExport';

/**
 * RecipeGridExport service handles exporting SOPs in a recipe-style grid format
 * with materials on the left and procedure steps on the right
 */
export class RecipeGridExport {
  /**
   * Export SOP content in a recipe-style grid format to PDF
   * @param sopData The SOP data containing title, description, materials, and steps
   * @param fileName Name for the output PDF file
   * @param options PDF export options
   */
  static async exportToPDF(
    sopData: {
      sop: {
        title: string;
        description: string;
        materials?: string;
      };
      steps: Array<{
        instruction: string;
        imageId?: string;
      }>;
    },
    fileName: string,
    options: PDFExportOptions = {}
  ) {
    try {
      // Create a temporary div for PDF export
      const tempDiv = document.createElement('div');
      tempDiv.id = 'recipe-grid-export';
      tempDiv.className = 'p-8 bg-white';
      
      // Default options
      const {
        includeHeader = true,
        includeFooter = true,
        companyName = 'SOP Builder',
        darkMode = false
      } = options;
      
      // Add SOP header
      const header = document.createElement('div');
      header.innerHTML = `
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #4f46e5;">${sopData.sop.title}</h1>
        <p style="margin-bottom: 24px; color: #333333;">${sopData.sop.description}</p>
        <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e5e7eb;">
      `;
      tempDiv.appendChild(header);
      
      // Parse materials
      const materials = sopData.sop.materials
        ? sopData.sop.materials
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[•*\-–]\s+/, '').trim())
        : [];
      
      // Create recipe-style grid container
      const gridContainer = document.createElement('div');
      gridContainer.style.border = '1px solid #e5e7eb';
      gridContainer.style.borderRadius = '8px';
      gridContainer.style.overflow = 'hidden';
      gridContainer.style.marginBottom = '24px';
      
      // Add grid header
      const gridHeader = document.createElement('div');
      gridHeader.style.backgroundColor = '#eef2ff'; // indigo-50
      gridHeader.style.padding = '12px';
      gridHeader.style.borderBottom = '1px solid #e5e7eb';
      gridHeader.style.textAlign = 'center';
      
      const gridTitle = document.createElement('h3');
      gridTitle.textContent = `${sopData.sop.title} - Procedure Grid`;
      gridTitle.style.fontSize = '18px';
      gridTitle.style.fontWeight = '600';
      gridTitle.style.color = '#4338ca'; // indigo-700
      
      gridHeader.appendChild(gridTitle);
      gridContainer.appendChild(gridHeader);
      
      // Create grid layout
      const gridLayout = document.createElement('div');
      gridLayout.style.display = 'grid';
      gridLayout.style.gridTemplateColumns = '1fr 2fr';
      
      // Materials column
      const materialsColumn = document.createElement('div');
      materialsColumn.style.backgroundColor = '#f9fafb'; // gray-50
      materialsColumn.style.padding = '16px';
      materialsColumn.style.borderRight = '1px solid #e5e7eb';
      
      // Calculate material usage timing based on steps
      // This helps express the relationship between materials and step timing
      const materialTimings = materials.map((_, index) => {
        // Simple algorithm to distribute materials across steps
        const stepIndex = Math.min(Math.floor(index * sopData.steps.length / materials.length), sopData.steps.length - 1);
        return stepIndex;
      });
      
      const materialsTitle = document.createElement('h4');
      materialsTitle.textContent = 'Materials';
      materialsTitle.style.fontSize = '16px';
      materialsTitle.style.fontWeight = '500';
      materialsTitle.style.marginBottom = '12px';
      materialsTitle.style.color = '#374151'; // gray-700
      
      const materialsList = document.createElement('ul');
      materialsList.style.listStyleType = 'none';
      materialsList.style.padding = '0';
      materialsList.style.margin = '0';
      materialsList.style.display = 'flex';
      materialsList.style.flexDirection = 'column';
      materialsList.style.gap = '8px';
      
      materials.forEach((material, index) => {
        const listItem = document.createElement('li');
        listItem.style.display = 'flex';
        listItem.style.alignItems = 'flex-start';
        listItem.style.gap = '8px';
        
        const bullet = document.createElement('div');
        bullet.style.width = '24px';
        bullet.style.height = '24px';
        bullet.style.backgroundColor = '#eef2ff'; // indigo-50
        bullet.style.borderRadius = '50%';
        bullet.style.display = 'flex';
        bullet.style.alignItems = 'center';
        bullet.style.justifyContent = 'center';
        bullet.style.flexShrink = '0';
        bullet.style.marginTop = '2px';
        
        const bulletText = document.createElement('span');
        bulletText.textContent = `${index + 1}`;
        bulletText.style.fontSize = '12px';
        bulletText.style.fontWeight = '500';
        bulletText.style.color = '#4f46e5'; // indigo-600
        
        bullet.appendChild(bulletText);
        
        const materialText = document.createElement('span');
        materialText.textContent = material;
        materialText.style.color = '#374151'; // gray-700
        
        listItem.appendChild(bullet);
        listItem.appendChild(materialText);
        materialsList.appendChild(listItem);
      });
      
      materialsColumn.appendChild(materialsTitle);
      materialsColumn.appendChild(materialsList);
      
      // Steps column
      const stepsColumn = document.createElement('div');
      stepsColumn.style.padding = '16px';
      
      const stepsTitle = document.createElement('h4');
      stepsTitle.textContent = 'Procedure Steps';
      stepsTitle.style.fontSize = '16px';
      stepsTitle.style.fontWeight = '500';
      stepsTitle.style.marginBottom = '12px';
      stepsTitle.style.color = '#374151'; // gray-700
      
      const stepsList = document.createElement('div');
      stepsList.style.display = 'flex';
      stepsList.style.flexDirection = 'column';
      stepsList.style.gap = '16px';
      
      sopData.steps.forEach((step, index) => {
        const stepItem = document.createElement('div');
        stepItem.style.display = 'flex';
        stepItem.style.gap = '12px';
        
        const stepNumber = document.createElement('div');
        stepNumber.style.width = '32px';
        stepNumber.style.height = '32px';
        stepNumber.style.backgroundColor = '#eef2ff'; // indigo-50
        stepNumber.style.borderRadius = '50%';
        stepNumber.style.display = 'flex';
        stepNumber.style.alignItems = 'center';
        stepNumber.style.justifyContent = 'center';
        stepNumber.style.flexShrink = '0';
        
        const stepNumberText = document.createElement('span');
        stepNumberText.textContent = `${index + 1}`;
        stepNumberText.style.fontSize = '14px';
        stepNumberText.style.fontWeight = '600';
        stepNumberText.style.color = '#4f46e5'; // indigo-600
        
        stepNumber.appendChild(stepNumberText);
        
        const stepContent = document.createElement('div');
        stepContent.style.flex = '1';
        
        const stepText = document.createElement('p');
        stepText.textContent = step.instruction;
        stepText.style.margin = '0';
        stepText.style.color = '#374151'; // gray-700
        
        stepContent.appendChild(stepText);
        
        stepItem.appendChild(stepNumber);
        stepItem.appendChild(stepContent);
        stepsList.appendChild(stepItem);
      });
      
      stepsColumn.appendChild(stepsTitle);
      stepsColumn.appendChild(stepsList);
      
      // Add columns to grid layout
      gridLayout.appendChild(materialsColumn);
      gridLayout.appendChild(stepsColumn);
      gridContainer.appendChild(gridLayout);
      
      // Add grid to main container
      tempDiv.appendChild(gridContainer);
      
      // Add company header if requested
      if (includeHeader) {
        const companyHeader = document.createElement('div');
        companyHeader.style.textAlign = 'center';
        companyHeader.style.marginBottom = '30px';
        companyHeader.style.borderBottom = '2px solid #4f46e5';
        companyHeader.style.paddingBottom = '15px';
        
        const logoText = document.createElement('h2');
        logoText.textContent = companyName;
        logoText.style.margin = '0';
        logoText.style.color = '#4f46e5';
        logoText.style.fontSize = '24px';
        logoText.style.fontWeight = 'bold';
        
        const dateText = document.createElement('div');
        dateText.textContent = new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        dateText.style.fontSize = '12px';
        dateText.style.color = '#666666';
        dateText.style.marginTop = '8px';
        
        companyHeader.appendChild(logoText);
        companyHeader.appendChild(dateText);
        tempDiv.prepend(companyHeader);
      }
      
      // Add footer if requested
      if (includeFooter) {
        const footer = document.createElement('div');
        footer.style.textAlign = 'center';
        footer.style.marginTop = '30px';
        footer.style.borderTop = '1px solid #dddddd';
        footer.style.paddingTop = '15px';
        footer.style.fontSize = '10px';
        footer.style.color = '#666666';
        
        const footerText = document.createElement('p');
        footerText.textContent = `Generated by ${companyName} on ${new Date().toLocaleDateString()}`;
        footerText.style.margin = '0';
        
        const pageNumbers = document.createElement('p');
        pageNumbers.textContent = 'Page 1';
        pageNumbers.style.margin = '5px 0 0 0';
        pageNumbers.style.fontSize = '9px';
        pageNumbers.style.fontStyle = 'italic';
        
        footer.appendChild(footerText);
        footer.appendChild(pageNumbers);
        tempDiv.appendChild(footer);
      }
      
      // Add to document for export
      document.body.appendChild(tempDiv);
      
      // Configure PDF options
      const pdfOptions = {
        margin: [20, 20],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.99 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true,
          precision: 16
        }
      };
      
      // Generate PDF
      await html2pdf().from(tempDiv).set(pdfOptions).save();
      
      // Clean up
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error("Recipe Grid PDF export failed:", error);
      throw error;
    }
  }
}