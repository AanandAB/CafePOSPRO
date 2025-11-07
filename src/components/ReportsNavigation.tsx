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
  ];

  return (
    <div className="border-b border-amber-200">
      <nav className="flex overflow-x-auto gap-2 md:gap-4 px-4 md:px-6 py-3 scrollbar-hide">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${
              activeReport === report.id
                ? "bg-amber-600 text-white shadow-md"
                : "text-gray-700 hover:bg-amber-50"
            }`}
          >
            <span className="text-lg md:text-xl">{report.icon}</span>
            <span className="font-medium text-sm md:text-base">{report.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
