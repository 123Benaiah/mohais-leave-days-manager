import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a PDF from HTML content
 * @param {string} htmlContent - The HTML content to convert to PDF
 * @param {string} filename - The filename for the downloaded PDF
 * @param {Object} options - Additional options for PDF generation
 * @returns {Promise<void>}
 */
export const generatePDF = async (htmlContent, filename = 'document.pdf', options = {}) => {
  const {
    margin = 10,
    orientation = 'portrait',
    format = 'a4',
    scale = 2
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // Create a container for the HTML content
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = orientation === 'portrait' ? '210mm' : '297mm';
      container.style.padding = '20px';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      // Wait for any images to load
      await waitForImages(container);

      // Use html2canvas to convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      });

      // Calculate PDF dimensions
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      const imgWidth = format === 'a4' ? 210 - (margin * 2) : 297 - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');

      // Handle multi-page PDFs if content is too long
      const pageHeight = format === 'a4' ? 295 : 210;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(filename);

      // Clean up
      document.body.removeChild(container);

      resolve();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};

/**
 * Wait for all images to load in the container
 * @param {HTMLElement} container - The container element
 * @returns {Promise<void>}
 */
const waitForImages = (container) => {
  return new Promise((resolve) => {
    const images = container.getElementsByTagName('img');
    const imagePromises = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.complete) {
        imagePromises.push(
          new Promise((resolveImage) => {
            img.onload = resolveImage;
            img.onerror = resolveImage;
          })
        );
      }
    }

    if (imagePromises.length > 0) {
      Promise.all(imagePromises).then(resolve);
    } else {
      resolve();
    }
  });
};

/**
 * Generate Employee Report PDF
 * @param {Array} employees - Array of employee objects
 * @returns {Promise<void>}
 */
export const generateEmployeeReportPDF = async (employees) => {
  if (!employees || employees.length === 0) {
    throw new Error('No employees provided');
  }

  const generatedDate = new Date();
  const formattedDate = generatedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const formattedTime = generatedDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const htmlContent = `
    <div style="width: 100%; max-width: 100%;">
      <!-- Header Section -->
<div style="border-bottom: 3px solid #2c3e50; padding-bottom: 20px; margin-bottom: 20px;">
  <h1
    style="
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #2c3e50;
      margin: 0 0 15px 0;
      font-size: 24px;
    "
  >
    <img
      src="/coat-of-arms-of-zambia.png"
      alt="Zambia Coat of Arms"
      style="height: 40px; width: auto;"
    />
    Employee Field Work Days Management Report
  </h1>

  <div style="display: table; width: 100%; margin-top: 15px;">

          <div style="display: table-cell; width: 33%; background-color: #ecf0f1; padding: 10px; border-radius: 5px; text-align: center;">
            <p style="color: #7f8c8d; margin: 0; font-size: 12px; font-weight: bold;">Generated Date</p>
            <p style="color: #2c3e50; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">${formattedDate}</p>
          </div>
          <div style="display: table-cell; width: 33%; background-color: #ecf0f1; padding: 10px; border-radius: 5px; text-align: center;">
            <p style="color: #7f8c8d; margin: 0; font-size: 12px; font-weight: bold;">Time</p>
            <p style="color: #2c3e50; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">${formattedTime}</p>
          </div>
          <div style="display: table-cell; width: 33%; background-color: #3498db; padding: 10px; border-radius: 5px; text-align: center;">
            <p style="color: white; margin: 0; font-size: 12px; font-weight: bold;">Total Employees</p>
            <p style="color: white; margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">${employees.length}</p>
          </div>
        </div>
      </div>

      <!-- Employee Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 10px; table-layout: fixed;">
        <thead>
          <tr>
            <th style="border: 2px solid #34495e; padding: 8px 4px; text-align: center; background-color: #34495e; color: white; font-weight: bold; font-size: 10px; width: 8%;">#</th>
            <th style="border: 2px solid #34495e; padding: 8px 4px; text-align: center; background-color: #34495e; color: white; font-weight: bold; font-size: 10px; width: 12%;">Emp #</th>
            <th style="border: 2px solid #34495e; padding: 8px 4px; text-align: left; background-color: #34495e; color: white; font-weight: bold; font-size: 10px; width: 36%;">Name</th>
            <th style="border: 2px solid #34495e; padding: 8px 4px; text-align: center; background-color: #34495e; color: white; font-weight: bold; font-size: 10px; width: 15%;">Total</th>
            <th style="border: 2px solid #34495e; padding: 8px 4px; text-align: center; background-color: #34495e; color: white; font-weight: bold; font-size: 10px; width: 15%;">Used</th>
            <th style="border: 2px solid #34495e; padding: 8px 4px; text-align: center; background-color: #34495e; color: white; font-weight: bold; font-size: 10px; width: 14%;">Remaining</th>
          </tr>
        </thead>
        <tbody>
          ${employees.map((emp, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
              <td style="border: 1px solid #bdc3c7; padding: 6px 4px; text-align: center; font-size: 10px; font-weight: bold;">${idx + 1}</td>
              <td style="border: 1px solid #bdc3c7; padding: 6px 4px; text-align: center; font-size: 10px; word-break: break-word;">${emp.employee_number || '-'}</td>
              <td style="border: 1px solid #bdc3c7; padding: 6px 4px; text-align: left; font-size: 10px; font-weight: 500; word-break: break-word;">${emp.name}</td>
              <td style="border: 1px solid #bdc3c7; padding: 6px 4px; text-align: center; font-size: 10px;">${emp.total_days}</td>
              <td style="border: 1px solid #bdc3c7; padding: 6px 4px; text-align: center; font-size: 10px; color: #e74c3c; font-weight: bold;">${emp.used_days}</td>
              <td style="border: 1px solid #bdc3c7; padding: 6px 4px; text-align: center; font-size: 10px; color: ${emp.remaining_days <= 5 ? '#e74c3c' : '#27ae60'}; font-weight: bold;">${emp.remaining_days}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #bdc3c7; text-align: center; color: #7f8c8d; font-size: 11px;">
        <p style="margin: 5px 0;">MOHAIS Employee Leave Management System</p>
        <p style="margin: 5px 0; font-style: italic;">This report contains confidential employee information.</p>
      </div>
    </div>
  `;

  const filename = `employees_report_${Date.now()}.pdf`;
  return generatePDF(htmlContent, filename, {
    orientation: 'portrait',
    format: 'a4',
    scale: 2,
    margin: 10
  });
};
