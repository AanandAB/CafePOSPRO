import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ReportsNavigation } from "./ReportsNavigation";
import { SalesReport } from "./SalesReport";
import { InventoryReport } from "./InventoryReport";
import { PerformanceReport } from "./PerformanceReport";
import { UaeTaxReports } from "./UaeTaxReports"; // Add UAE tax reports import

export function ReportsDashboard() {
  const [activeReport, setActiveReport] = useState("sales");
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });

  // Get all data needed for reports
  const salesData = useQuery(api.dataExport.exportSalesData, {
    startDate: dateRange.start ? dateRange.start.getTime() : undefined,
    endDate: dateRange.end ? dateRange.end.getTime() : undefined,
  });

  const inventoryData = useQuery(api.dataExport.exportInventoryData, {});
  const ledgerData = useQuery(api.dataExport.exportLedgerData, {
    startDate: dateRange.start ? dateRange.start.getTime() : undefined,
    endDate: dateRange.end ? dateRange.end.getTime() : undefined,
  });

  const staffData = useQuery(api.dataExport.exportStaffData, {});
  const ordersData = useQuery(api.orders.getAllActiveOrders);

  // Set default date range to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setDateRange({ start, end });
  }, []);

  const handleDateChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  const renderActiveReport = () => {
    switch (activeReport) {
      case "sales":
        return (
          <SalesReport
            salesData={salesData}
            dateRange={dateRange}
            onDateChange={handleDateChange}
          />
        );
      case "inventory":
        return (
          <InventoryReport
            inventoryData={inventoryData}
            dateRange={dateRange}
            onDateChange={handleDateChange}
          />
        );
      case "performance":
        return (
          <PerformanceReport
            salesData={salesData}
            staffData={staffData}
            ordersData={ordersData}
            dateRange={dateRange}
            onDateChange={handleDateChange}
          />
        );
      case "uaetax": // Add UAE tax reports case
        return <UaeTaxReports />;
      default:
        return (
          <SalesReport
            salesData={salesData}
            dateRange={dateRange}
            onDateChange={handleDateChange}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Business Reports & Analytics
        </h2>
        <div className="text-sm text-gray-600">
          Real-time insights and detailed analytics
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-amber-100">
        <ReportsNavigation
          activeReport={activeReport}
          setActiveReport={setActiveReport}
        />
        <div className="p-6">{renderActiveReport()}</div>
      </div>
    </div>
  );
}