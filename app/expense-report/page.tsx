"use client";

import { useState, useRef } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  receipt: boolean;
}

const EXPENSE_CATEGORIES = [
  "Fuel / Mileage",
  "Meals",
  "Lodging",
  "Transportation",
  "Supplies",
  "Equipment",
  "Tools",
  "Parts",
  "Shipping",
  "Phone / Internet",
  "Software / Subscriptions",
  "Training",
  "Other",
];

export default function ExpenseReportPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const printRef = useRef<HTMLDivElement>(null);

  const [reportInfo, setReportInfo] = useState({
    employeeName: user?.name || "",
    department: "",
    reportDate: new Date().toISOString().split("T")[0],
    periodStart: "",
    periodEnd: "",
    purpose: "",
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "Fuel / Mileage",
      amount: 0,
      receipt: false,
    },
  ]);

  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: `exp-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        description: "",
        category: "Fuel / Mileage",
        amount: 0,
        receipt: false,
      },
    ]);
  };

  const removeExpense = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((e) => e.id !== id));
    }
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenses(
      expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const clearAll = () => {
    setExpenses([
      {
        id: `exp-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        description: "",
        category: "Fuel / Mileage",
        amount: 0,
        receipt: false,
      },
    ]);
    setReportInfo({
      employeeName: user?.name || "",
      department: "",
      reportDate: new Date().toISOString().split("T")[0],
      periodStart: "",
      periodEnd: "",
      purpose: "",
    });
  };

  return (
    <Protected>
      <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
        <Sidebar />
        <main className="flex-1 overflow-auto print:overflow-visible">
          {/* Header - Hidden when printing */}
          <header className={`sticky top-0 z-10 p-6 border-b print:hidden ${isDark ? "bg-slate-900/95 backdrop-blur border-slate-700" : "bg-[#f2f2f7]/95 backdrop-blur border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Expense Report
                </h1>
                <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Create and print expense reimbursement requests
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAll}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                >
                  Clear All
                </button>
                <button
                  onClick={handlePrint}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 print:p-0">
            {/* Input Form - Hidden when printing */}
            <div className="print:hidden space-y-6">
              {/* Report Info */}
              <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Report Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Employee Name
                    </label>
                    <input
                      type="text"
                      value={reportInfo.employeeName}
                      onChange={(e) => setReportInfo({ ...reportInfo, employeeName: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Department
                    </label>
                    <select
                      value={reportInfo.department}
                      onChange={(e) => setReportInfo({ ...reportInfo, department: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    >
                      <option value="">Select Department</option>
                      <option value="Executive">Executive</option>
                      <option value="IT">IT</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Office">Office</option>
                      <option value="Sales">Sales</option>
                      <option value="Delivery">Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Report Date
                    </label>
                    <input
                      type="date"
                      value={reportInfo.reportDate}
                      onChange={(e) => setReportInfo({ ...reportInfo, reportDate: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Period Start
                    </label>
                    <input
                      type="date"
                      value={reportInfo.periodStart}
                      onChange={(e) => setReportInfo({ ...reportInfo, periodStart: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Period End
                    </label>
                    <input
                      type="date"
                      value={reportInfo.periodEnd}
                      onChange={(e) => setReportInfo({ ...reportInfo, periodEnd: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Purpose / Business Reason
                    </label>
                    <input
                      type="text"
                      value={reportInfo.purpose}
                      onChange={(e) => setReportInfo({ ...reportInfo, purpose: e.target.value })}
                      placeholder="e.g., Client visit, Trade show, Training"
                      className={`w-full px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                    />
                  </div>
                </div>
              </div>

              {/* Expense Items */}
              <div className={`rounded-xl p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Expense Items
                  </h2>
                  <button
                    onClick={addExpense}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {expenses.map((expense, index) => (
                    <div
                      key={expense.id}
                      className={`p-4 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-gray-50"}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className={`text-sm font-medium w-6 pt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {index + 1}.
                        </span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              Date
                            </label>
                            <input
                              type="date"
                              value={expense.date}
                              onChange={(e) => updateExpense(expense.id, "date", e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg text-sm ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              Description
                            </label>
                            <input
                              type="text"
                              value={expense.description}
                              onChange={(e) => updateExpense(expense.id, "description", e.target.value)}
                              placeholder="What was the expense for?"
                              className={`w-full px-3 py-2 rounded-lg text-sm ${isDark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              Category
                            </label>
                            <select
                              value={expense.category}
                              onChange={(e) => updateExpense(expense.id, "category", e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg text-sm ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-900"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                            >
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              Amount ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={expense.amount || ""}
                              onChange={(e) => updateExpense(expense.id, "amount", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className={`w-full px-3 py-2 rounded-lg text-sm ${isDark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} border focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={expense.receipt}
                                onChange={(e) => updateExpense(expense.id, "receipt", e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                              />
                              <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                Receipt
                              </span>
                            </label>
                            <button
                              onClick={() => removeExpense(expense.id)}
                              disabled={expenses.length === 1}
                              className={`p-2 rounded-lg transition-colors ${
                                expenses.length === 1
                                  ? "opacity-30 cursor-not-allowed"
                                  : isDark
                                    ? "hover:bg-slate-600 text-slate-400 hover:text-red-400"
                                    : "hover:bg-gray-200 text-gray-400 hover:text-red-500"
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className={`mt-6 pt-4 border-t ${isDark ? "border-slate-600" : "border-gray-200"}`}>
                  <div className="flex items-center justify-end gap-4">
                    <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                      Total:
                    </span>
                    <span className={`text-2xl font-bold ${isDark ? "text-cyan-400" : "text-blue-600"}`}>
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Printable Report */}
            <div ref={printRef} className="hidden print:block print-report">
              {/* Header with Logo */}
              <div className="flex items-start justify-between mb-8 pb-4 border-b-2 border-gray-800">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                      <span className="text-cyan-400 font-bold text-xl">IE</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">IE Central</h1>
                      <p className="text-sm text-gray-600">Industrial Equipment Central</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-gray-900">EXPENSE REPORT</h2>
                  <p className="text-sm text-gray-600">
                    Report Date: {reportInfo.reportDate ? new Date(reportInfo.reportDate).toLocaleDateString() : "_______________"}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-sm"><strong>Employee Name:</strong> {reportInfo.employeeName || "___________________________"}</p>
                  <p className="text-sm mt-2"><strong>Department:</strong> {reportInfo.department || "___________________________"}</p>
                </div>
                <div>
                  <p className="text-sm"><strong>Period:</strong> {reportInfo.periodStart ? new Date(reportInfo.periodStart).toLocaleDateString() : "___________"} to {reportInfo.periodEnd ? new Date(reportInfo.periodEnd).toLocaleDateString() : "___________"}</p>
                  <p className="text-sm mt-2"><strong>Business Purpose:</strong> {reportInfo.purpose || "___________________________"}</p>
                </div>
              </div>

              {/* Expense Table */}
              <table className="w-full border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">#</th>
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Date</th>
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Description</th>
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Category</th>
                    <th className="border border-gray-400 px-3 py-2 text-right text-sm font-semibold">Amount</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, index) => (
                    <tr key={expense.id}>
                      <td className="border border-gray-400 px-3 py-2 text-sm">{index + 1}</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">{expense.date ? new Date(expense.date).toLocaleDateString() : ""}</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">{expense.description}</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">{expense.category}</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-right">${expense.amount.toFixed(2)}</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm text-center">{expense.receipt ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                  {/* Empty rows for handwriting */}
                  {Array.from({ length: Math.max(0, 8 - expenses.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                      <td className="border border-gray-400 px-3 py-2 text-sm">&nbsp;</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="border border-gray-400 px-3 py-2 text-sm text-right">TOTAL:</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm text-right">${total.toFixed(2)}</td>
                    <td className="border border-gray-400 px-3 py-2 text-sm"></td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-12">
                <div>
                  <p className="text-sm mb-12">I certify that the above expenses were incurred for legitimate business purposes.</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm"><strong>Employee Signature</strong></p>
                    <p className="text-xs text-gray-500">Date: _______________</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm mb-12">Approved for reimbursement:</p>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm"><strong>Manager Signature</strong></p>
                    <p className="text-xs text-gray-500">Date: _______________</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
                <p>Please attach all receipts to this report. Submit to Accounting within 30 days of expense.</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-report {
            display: block !important;
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
          }
        }
      `}</style>
    </Protected>
  );
}
