import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";

interface SalesRecord {
  _id: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMode: string;
  staffId: string;
  date: number;
}

interface TaxReportData {
  period: string;
  totalSales: number;
  totalTax: number;
  taxableSales: number;
  exemptSales: number;
  zeroRatedSales: number;
  vatRate: number;
  transactions: number;
}

export function UaeTaxReports() {
  const [dateRange, setDateRange] = useState<"week" | "month" | "quarter" | "year">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [reportData, setReportData] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salesRecords = useQuery(api.analytics.getSalesData);
  const restaurantProfile = useQuery(api.restaurant.getRestaurantProfile);

  // Calculate tax report data
  useEffect(() => {
    if (!salesRecords) return;

    try {
      setLoading(true);
      setError(null);
      
      // Determine date range
      let startDate: Date;
      let endDate = new Date();
      
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error("Invalid date range");
        }
      } else {
        startDate = new Date();
        switch (dateRange) {
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "quarter":
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
      }

      // Filter sales records by date range
      const filteredRecords = salesRecords.filter(
        (record: SalesRecord) => {
          // Validate record date
          if (!record.date) return false;
          return record.date >= startDate.getTime() && record.date <= endDate.getTime();
        }
      );

      // Calculate report data
      const totalSales = filteredRecords.reduce((sum, record) => sum + (record.finalAmount || 0), 0);
      const totalTax = filteredRecords.reduce((sum, record) => sum + (record.tax || 0), 0);
      const taxableSales = filteredRecords.reduce((sum, record) => sum + (record.subtotal || 0), 0);
      const transactions = filteredRecords.length;
      
      // For UAE, we'll assume all sales are taxable at the standard rate
      // In a real implementation, you might have different categories
      const exemptSales = 0;
      const zeroRatedSales = 0;
      const vatRate = restaurantProfile?.vatRate || 5;

      const period = customStartDate && customEndDate 
        ? `${format(new Date(customStartDate), "MMM dd, yyyy")} - ${format(new Date(customEndDate), "MMM dd, yyyy")}`
        : `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`;

      setReportData({
        period,
        totalSales,
        totalTax,
        taxableSales,
        exemptSales,
        zeroRatedSales,
        vatRate,
        transactions
      });
    } catch (err) {
      console.error("Error calculating tax report data:", err);
      setError("Failed to calculate tax report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [salesRecords, dateRange, customStartDate, customEndDate, restaurantProfile]);

  const exportToCSV = () => {
    if (!reportData) return;

    const csvContent = `data:text/csv;charset=utf-8,
UAE VAT Report
Period,${reportData.period}
VAT Rate,${reportData.vatRate}%
Total Sales,${reportData.totalSales.toFixed(2)}
Total VAT,${reportData.totalTax.toFixed(2)}
Taxable Sales,${reportData.taxableSales.toFixed(2)}
Exempt Sales,${reportData.exemptSales.toFixed(2)}
Zero Rated Sales,${reportData.zeroRatedSales.toFixed(2)}
Number of Transactions,${reportData.transactions}

Itemized Transactions
Order Number,Date,Table,Subtotal,VAT,Total,Payment Method
${salesRecords?.map((record: SalesRecord) => 
  `${record.orderNumber},${format(new Date(record.date), "yyyy-MM-dd")},${record.tableNumber || "N/A"},${record.subtotal.toFixed(2)},${record.tax.toFixed(2)},${record.finalAmount.toFixed(2)},${record.paymentMode}`
).join("\n") || ""}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `uae_vat_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && reportData) {
      printWindow.document.write(`
        <html>
          <head>
            <title>UAE VAT Report</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .report-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
              }
              .summary-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              .summary-table th, .summary-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              .summary-table th {
                background-color: #f2f2f2;
              }
              .transactions-table {
                width: 100%;
                border-collapse: collapse;
              }
              .transactions-table th, .transactions-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              .transactions-table th {
                background-color: #f2f2f2;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>UAE VAT Report</h1>
              <h2>${restaurantProfile?.name || "CafePOSPro"}</h2>
            </div>
            
            <div class="report-info">
              <div>
                <p><strong>Period:</strong> ${reportData.period}</p>
                <p><strong>Report Generated:</strong> ${format(new Date(), "MMM dd, yyyy HH:mm")}</p>
              </div>
              <div>
                <p><strong>VAT Rate:</strong> ${reportData.vatRate}%</p>
                <p><strong>Tax Registration Number:</strong> ${restaurantProfile?.gstNumber || "Not registered"}</p>
              </div>
            </div>
            
            <h3>Summary</h3>
            <table class="summary-table">
              <tr>
                <th>Description</th>
                <th>Amount (AED)</th>
              </tr>
              <tr>
                <td>Total Sales</td>
                <td>${reportData.totalSales.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total VAT Collected</td>
                <td>${reportData.totalTax.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Taxable Sales</td>
                <td>${reportData.taxableSales.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Exempt Sales</td>
                <td>${reportData.exemptSales.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Zero Rated Sales</td>
                <td>${reportData.zeroRatedSales.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Number of Transactions</td>
                <td>${reportData.transactions}</td>
              </tr>
            </table>
            
            <h3>Itemized Transactions</h3>
            <table class="transactions-table">
              <tr>
                <th>Order Number</th>
                <th>Date</th>
                <th>Table</th>
                <th>Subtotal</th>
                <th>VAT</th>
                <th>Total</th>
                <th>Payment Method</th>
              </tr>
              ${salesRecords?.map((record: SalesRecord) => `
                <tr>
                  <td>${record.orderNumber}</td>
                  <td>${format(new Date(record.date), "yyyy-MM-dd")}</td>
                  <td>${record.tableNumber || "N/A"}</td>
                  <td>${record.subtotal.toFixed(2)}</td>
                  <td>${record.tax.toFixed(2)}</td>
                  <td>${record.finalAmount.toFixed(2)}</td>
                  <td>${record.paymentMode}</td>
                </tr>
              `).join('') || ""}
            </table>
            
            <div class="footer">
              <p>This report is generated by CafePOSPro for UAE VAT compliance purposes.</p>
              <p>For official submissions, please consult with your tax advisor.</p>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">UAE VAT Reports</h2>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate VAT Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setCustomStartDate("");
                setCustomEndDate("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={loading || !reportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Export to CSV
          </button>
          <button
            onClick={printReport}
            disabled={loading || !reportData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Print Report
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        </div>
      ) : reportData ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">VAT Report Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">Period</p>
              <p className="text-lg font-semibold text-blue-900">{reportData.period}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">Total Sales</p>
              <p className="text-lg font-semibold text-green-900">
                {restaurantProfile?.currency || "AED"} {reportData.totalSales.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-700">Total VAT</p>
              <p className="text-lg font-semibold text-amber-900">
                {restaurantProfile?.currency || "AED"} {reportData.totalTax.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700">Transactions</p>
              <p className="text-lg font-semibold text-purple-900">{reportData.transactions}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">Taxable Sales</p>
              <p className="text-lg font-semibold text-gray-900">
                {restaurantProfile?.currency || "AED"} {reportData.taxableSales.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">Exempt Sales</p>
              <p className="text-lg font-semibold text-gray-900">
                {restaurantProfile?.currency || "AED"} {reportData.exemptSales.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">Zero Rated Sales</p>
              <p className="text-lg font-semibold text-gray-900">
                {restaurantProfile?.currency || "AED"} {reportData.zeroRatedSales.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">VAT Rate</h4>
            <p className="text-2xl font-bold text-amber-600">{reportData.vatRate}%</p>
            <p className="text-sm text-gray-600 mt-1">
              Standard VAT rate for UAE as configured in restaurant settings
            </p>
          </div>
        </div>
      ) : !loading && !error ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <p className="text-gray-500 text-center">Select a date range to generate VAT report</p>
        </div>
      ) : null}
    </div>
  );
}