const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

class ReportGenerator {
  /**
   * Format date for display
   */
  static formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Format action type for display
   */
  static formatActionType(actionType) {
    if (!actionType) return 'Unknown';
    return actionType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Generate PDF report for audit logs
   */
  static async generatePDF(logs, filters = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        // Collect PDF chunks
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve(result);
        });
        doc.on('error', reject);

        // PDF Title
        doc.fontSize(20).text('Audit Log Report', { align: 'center' });
        doc.moveDown();

        // Report date
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        // Filter information
        if (Object.keys(filters).length > 0) {
          doc.fontSize(12).text('Filters Applied:', { underline: true });
          doc.fontSize(10);
          Object.entries(filters).forEach(([key, value]) => {
            if (value) {
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              doc.text(`${label}: ${value}`);
            }
          });
          doc.moveDown();
        }

        // Summary
        doc.fontSize(12).text('Summary:', { underline: true });
        doc.fontSize(10).text(`Total Records: ${logs.length}`);
        doc.moveDown();

        // Table Header
        doc.fontSize(10);
        const tableTop = doc.y;
        const columns = {
          date: { x: 50, width: 80 },
          action: { x: 135, width: 70 },
          entity: { x: 210, width: 100 },
          performedBy: { x: 315, width: 80 },
          description: { x: 400, width: 150 }
        };

        // Table header
        doc.font('Helvetica-Bold');
        doc.text('Date', columns.date.x, tableTop);
        doc.text('Action', columns.action.x, tableTop);
        doc.text('Entity', columns.entity.x, tableTop);
        doc.text('Performed By', columns.performedBy.x, tableTop);
        doc.text('Description', columns.description.x, tableTop);

        // Draw line under header
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table data
        doc.font('Helvetica');
        let yPosition = tableTop + 25;
        const rowHeight = 25;

        logs.forEach((log, index) => {
          // Check for page break
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;

            // Redraw header on new page
            doc.font('Helvetica-Bold');
            doc.text('Date', columns.date.x, yPosition);
            doc.text('Action', columns.action.x, yPosition);
            doc.text('Entity', columns.entity.x, yPosition);
            doc.text('Performed By', columns.performedBy.x, yPosition);
            doc.text('Description', columns.description.x, yPosition);
            doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
            yPosition += 20;
            doc.font('Helvetica');
          }

          // Add row data
          doc.fontSize(8).text(this.formatDate(log.created_at), columns.date.x, yPosition, { width: columns.date.width });
          doc.text(this.formatActionType(log.action_type), columns.action.x, yPosition, { width: columns.action.width });
          doc.text(log.entity_name || log.entity_name || 'N/A', columns.entity.x, yPosition, { width: columns.entity.width });
          doc.text(log.performed_by_name || 'System', columns.performedBy.x, yPosition, { width: columns.performedBy.width });
          doc.text(log.description || '', columns.description.x, yPosition, { width: columns.description.width });

          yPosition += rowHeight;
        });

        // Footer
        doc.fontSize(8).text(`Page 1 of 1`, 50, 720, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate CSV report for audit logs
   */
  static async generateCSV(logs) {
    return new Promise((resolve, reject) => {
      try {
        // Create CSV content manually to return as string
        const headers = [
          'Date',
          'Action Type',
          'Entity Type',
          'Entity Name',
          'Entity ID',
          'Performed By',
          'Performed By Type',
          'Description',
          'IP Address'
        ];

        const csvRows = [headers.join(',')];

        logs.forEach(log => {
          const row = [
            `"${this.formatDate(log.created_at)}"`,
            `"${this.formatActionType(log.action_type)}"`,
            `"${log.entity_type || ''}"`,
            `"${(log.entity_name || '').replace(/"/g, '""')}"`,
            `"${log.entity_id || ''}"`,
            `"${(log.performed_by_name || '').replace(/"/g, '""')}"`,
            `"${log.performed_by_type || ''}"`,
            `"${(log.description || '').replace(/"/g, '""')}"`,
            `"${log.ip_address || ''}"`
          ];
          csvRows.push(row.join(','));
        });

        resolve(csvRows.join('\n'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate report based on format
   * @param {Array} logs - Array of audit log objects
   * @param {String} format - 'pdf' or 'csv'
   * @param {Object} filters - Filter information for the report
   * @returns {Promise<Buffer|String>} - PDF buffer or CSV string
   */
  static async generate(logs, format = 'pdf', filters = {}) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this.generatePDF(logs, filters);
      case 'csv':
        return await this.generateCSV(logs);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}

module.exports = ReportGenerator;
