interface ReportsNavigationProps {
  activeReport: string;
  setActiveReport: (report: string) => void;
}

export function ReportsNavigation({
  activeReport,
  setActiveReport,
}: ReportsNavigationProps) {
  const reports = [
    { id: "sales", name: "Sales Reports", icon: "💰" },
    { id: "inventory", name: "Inventory Reports", icon: "📦" },
    { id: "performance", name: "Performance Metrics", icon: "📊" },
    { id: "uaetax", name: "UAE VAT Reports", icon: "🧾" }, // Add UAE tax reports
  ];

  return (
    <div className="border-b border-amber-200">
      <nav className="flex overflow-x-auto gap-4 px-6 py-3 scrollbar-hide">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeReport === report.id
                ? "bg-amber-600 text-white"
                : "text-gray-700 hover:bg-amber-50"
            }`}
          >
            <span>{report.icon}</span>
            <span className="font-medium">{report.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}