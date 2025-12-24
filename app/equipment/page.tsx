"use client";

import { useState } from "react";
import Protected from "../protected";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import { useAuth } from "../auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import SignaturePad from "@/components/SignaturePad";

type EquipmentType = "scanners" | "pickers";

// Equipment value for agreements
const EQUIPMENT_VALUE = 100;

function EquipmentContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<EquipmentType>("scanners");
  const [selectedLocation, setSelectedLocation] = useState<Id<"locations"> | "all">("all");
  const [showNewEquipment, setShowNewEquipment] = useState(false);
  const [editingId, setEditingId] = useState<Id<"scanners"> | Id<"pickers"> | null>(null);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [retireId, setRetireId] = useState<Id<"scanners"> | Id<"pickers"> | null>(null);
  const [retireReason, setRetireReason] = useState("");
  const [error, setError] = useState("");

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEquipmentId, setAssignEquipmentId] = useState<Id<"scanners"> | Id<"pickers"> | null>(null);
  const [assignEquipmentData, setAssignEquipmentData] = useState<{
    number: string;
    serialNumber?: string;
  } | null>(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [assignStep, setAssignStep] = useState<"select" | "sign">("select");

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnEquipmentId, setReturnEquipmentId] = useState<Id<"scanners"> | Id<"pickers"> | null>(null);
  const [returnEquipmentData, setReturnEquipmentData] = useState<{
    number: string;
    assignedPersonName?: string | null;
  } | null>(null);
  const [checklist, setChecklist] = useState({
    physicalCondition: true,
    screenFunctional: true,
    buttonsWorking: true,
    batteryCondition: true,
    chargingPortOk: true,
    scannerFunctional: true,
    cleanCondition: true,
  });
  const [overallCondition, setOverallCondition] = useState<string>("good");
  const [damageNotes, setDamageNotes] = useState("");
  const [repairRequired, setRepairRequired] = useState(false);
  const [readyForReassignment, setReadyForReassignment] = useState(true);
  const [deductionRequired, setDeductionRequired] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);

  // Queries
  const locations = useQuery(api.locations.listActive);
  const scanners = useQuery(api.equipment.listScanners,
    selectedLocation === "all" ? {} : { locationId: selectedLocation }
  );
  const pickers = useQuery(api.equipment.listPickers,
    selectedLocation === "all" ? {} : { locationId: selectedLocation }
  );
  const personnel = useQuery(api.personnel.list, {});
  const activePersonnel = useQuery(api.equipment.listActivePersonnel);

  // Mutations
  const createScanner = useMutation(api.equipment.createScanner);
  const updateScanner = useMutation(api.equipment.updateScanner);
  const createPicker = useMutation(api.equipment.createPicker);
  const updatePicker = useMutation(api.equipment.updatePicker);
  const retireEquipment = useMutation(api.equipment.retireEquipment);
  const assignEquipmentWithAgreement = useMutation(api.equipment.assignEquipmentWithAgreement);
  const returnEquipmentWithCheck = useMutation(api.equipment.returnEquipmentWithCheck);

  // Form state
  const [formData, setFormData] = useState({
    number: "",
    pin: "",
    serialNumber: "",
    model: "",
    locationId: "" as string,
    purchaseDate: "",
    notes: "",
    conditionNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.locationId) {
      setError("Please select a location");
      return;
    }

    if (!formData.number.trim()) {
      setError("Please enter an identifier");
      return;
    }

    try {
      if (editingId) {
        if (activeTab === "scanners") {
          await updateScanner({
            id: editingId as Id<"scanners">,
            number: formData.number.trim() || undefined,
            pin: formData.pin || undefined,
            serialNumber: formData.serialNumber || undefined,
            model: formData.model || undefined,
            locationId: formData.locationId as Id<"locations">,
            purchaseDate: formData.purchaseDate || undefined,
            notes: formData.notes || undefined,
            conditionNotes: formData.conditionNotes || undefined,
          });
        } else {
          await updatePicker({
            id: editingId as Id<"pickers">,
            number: formData.number.trim() || undefined,
            pin: formData.pin || undefined,
            serialNumber: formData.serialNumber || undefined,
            model: formData.model || undefined,
            locationId: formData.locationId as Id<"locations">,
            purchaseDate: formData.purchaseDate || undefined,
            notes: formData.notes || undefined,
            conditionNotes: formData.conditionNotes || undefined,
          });
        }
      } else {
        if (activeTab === "scanners") {
          await createScanner({
            number: formData.number.trim(),
            pin: formData.pin || undefined,
            serialNumber: formData.serialNumber || undefined,
            model: formData.model || undefined,
            locationId: formData.locationId as Id<"locations">,
            purchaseDate: formData.purchaseDate || undefined,
            notes: formData.notes || undefined,
            conditionNotes: formData.conditionNotes || undefined,
          });
        } else {
          await createPicker({
            number: formData.number.trim(),
            pin: formData.pin || undefined,
            serialNumber: formData.serialNumber || undefined,
            model: formData.model || undefined,
            locationId: formData.locationId as Id<"locations">,
            purchaseDate: formData.purchaseDate || undefined,
            notes: formData.notes || undefined,
            conditionNotes: formData.conditionNotes || undefined,
          });
        }
      }

      setShowNewEquipment(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleRetire = async () => {
    if (!retireId || !retireReason.trim() || !user?._id) return;

    try {
      await retireEquipment({
        equipmentType: activeTab === "scanners" ? "scanner" : "picker",
        equipmentId: retireId,
        reason: retireReason.trim(),
        userId: user._id,
      });
      setShowRetireModal(false);
      setRetireId(null);
      setRetireReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retire equipment");
    }
  };

  const resetForm = () => {
    setFormData({
      number: "",
      pin: "",
      serialNumber: "",
      model: "",
      locationId: locations?.[0]?._id ?? "",
      purchaseDate: "",
      notes: "",
      conditionNotes: "",
    });
  };

  const handleEdit = (item: NonNullable<typeof scanners>[0] | NonNullable<typeof pickers>[0]) => {
    setEditingId(item._id as Id<"scanners"> | Id<"pickers">);
    setFormData({
      number: String(item.number),
      pin: item.pin || "",
      serialNumber: item.serialNumber || "",
      model: item.model || "",
      locationId: item.locationId,
      purchaseDate: item.purchaseDate || "",
      notes: item.notes || "",
      conditionNotes: item.conditionNotes || "",
    });
    setShowNewEquipment(true);
  };

  const openRetireModal = (id: Id<"scanners"> | Id<"pickers">) => {
    setRetireId(id);
    setRetireReason("");
    setShowRetireModal(true);
  };

  const openAssignModal = (item: NonNullable<typeof scanners>[0] | NonNullable<typeof pickers>[0]) => {
    setAssignEquipmentId(item._id as Id<"scanners"> | Id<"pickers">);
    setAssignEquipmentData({
      number: String(item.number),
      serialNumber: item.serialNumber,
    });
    setSelectedPersonnelId("");
    setSignatureData(null);
    setAssignStep("select");
    setShowAssignModal(true);
  };

  const openReturnModal = (item: NonNullable<typeof scanners>[0] | NonNullable<typeof pickers>[0]) => {
    setReturnEquipmentId(item._id as Id<"scanners"> | Id<"pickers">);
    setReturnEquipmentData({
      number: String(item.number),
      assignedPersonName: item.assignedPersonName,
    });
    setChecklist({
      physicalCondition: true,
      screenFunctional: true,
      buttonsWorking: true,
      batteryCondition: true,
      chargingPortOk: true,
      scannerFunctional: true,
      cleanCondition: true,
    });
    setOverallCondition("good");
    setDamageNotes("");
    setRepairRequired(false);
    setReadyForReassignment(true);
    setDeductionRequired(false);
    setDeductionAmount(0);
    setShowReturnModal(true);
  };

  const handleAssign = async () => {
    if (!assignEquipmentId || !selectedPersonnelId || !signatureData || !user?._id) return;

    try {
      await assignEquipmentWithAgreement({
        equipmentType: activeTab === "scanners" ? "scanner" : "picker",
        equipmentId: assignEquipmentId,
        personnelId: selectedPersonnelId as Id<"personnel">,
        signatureData: signatureData,
        userId: user._id,
        userName: user.name,
        equipmentValue: EQUIPMENT_VALUE,
      });
      setShowAssignModal(false);
      setAssignEquipmentId(null);
      setAssignEquipmentData(null);
      setSelectedPersonnelId("");
      setSignatureData(null);
      setAssignStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign equipment");
    }
  };

  const handleReturn = async () => {
    if (!returnEquipmentId || !user?._id) return;

    try {
      await returnEquipmentWithCheck({
        equipmentType: activeTab === "scanners" ? "scanner" : "picker",
        equipmentId: returnEquipmentId,
        checkedBy: user._id,
        checkedByName: user.name,
        checklist: checklist,
        overallCondition: overallCondition,
        damageNotes: damageNotes || undefined,
        repairRequired: repairRequired,
        readyForReassignment: readyForReassignment,
        deductionRequired: deductionRequired,
        deductionAmount: deductionRequired ? deductionAmount : undefined,
      });
      setShowReturnModal(false);
      setReturnEquipmentId(null);
      setReturnEquipmentData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to return equipment");
    }
  };

  const getAgreementText = () => {
    if (!assignEquipmentData) return "";
    const selectedPerson = activePersonnel?.find(p => p._id === selectedPersonnelId);
    const employeeName = selectedPerson?.name || "Employee";
    const serialDisplay = assignEquipmentData.serialNumber ? ` (Serial: ${assignEquipmentData.serialNumber})` : "";
    const equipmentLabel = activeTab === "scanners" ? "Scanner" : "Picker";

    return `EQUIPMENT RESPONSIBILITY AGREEMENT

This Equipment Responsibility Agreement ("Agreement") is entered into between the Employee named below and IE Tires, LLC ("Company").

EQUIPMENT ASSIGNED:
${equipmentLabel} #${assignEquipmentData.number}${serialDisplay}
Equipment Value: $${EQUIPMENT_VALUE.toFixed(2)}

EMPLOYEE: ${employeeName}

TERMS AND CONDITIONS:

1. SOLE RESPONSIBILITY: The undersigned Employee acknowledges receipt of the above-described Company equipment and accepts full responsibility for its care, security, and proper use.

2. AUTHORIZED USE ONLY: This equipment is issued exclusively to the undersigned Employee. No other individual is authorized to access, operate, or use this equipment under any circumstances.

3. ON-PREMISES ONLY: This equipment must remain on Company premises at all times. Under no circumstances shall this equipment be removed from the workplace or taken to the Employee's residence.

4. DAMAGE REPORTING: The Employee shall immediately report any damage, malfunction, or defect to their supervisor. Failure to promptly report damage may result in disciplinary action and financial liability.

5. FINANCIAL LIABILITY:
   a) Failure to return equipment upon separation from employment, reassignment, or request by management will result in a deduction of up to $${EQUIPMENT_VALUE.toFixed(2)} from the Employee's final pay.
   b) Damage resulting from intentional misconduct, gross negligence, or careless handling may result in a deduction of up to $${EQUIPMENT_VALUE.toFixed(2)} from Employee's pay to cover replacement costs.

6. RETURN REQUIREMENT: Upon termination of employment, reassignment, or request by management, the Employee shall immediately return this equipment in the same condition as received, allowing for reasonable wear and tear.

By signing below, the Employee acknowledges that they have read, understand, and agree to abide by all terms and conditions set forth in this Agreement.`;
  };

  const currentItems = activeTab === "scanners" ? scanners : pickers;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/20 text-green-400";
      case "assigned":
        return "bg-blue-500/20 text-blue-400";
      case "maintenance":
        return "bg-yellow-500/20 text-yellow-400";
      case "lost":
        return "bg-red-500/20 text-red-400";
      case "retired":
        return "bg-slate-500/20 text-slate-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-gray-50"}`}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-4 sm:px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Equipment</h1>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Manage scanners and pickers inventory
              </p>
            </div>
            <button
              onClick={() => {
                setShowNewEquipment(true);
                setEditingId(null);
                resetForm();
              }}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add {activeTab === "scanners" ? "Scanner" : "Picker"}</span>
            </button>
          </div>

          {/* Tabs and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Equipment Type Tabs */}
            <div className={`inline-flex rounded-lg p-1 ${isDark ? "bg-slate-800" : "bg-gray-200"}`}>
              <button
                onClick={() => setActiveTab("scanners")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "scanners"
                    ? isDark ? "bg-cyan-500 text-white" : "bg-white text-gray-900 shadow-sm"
                    : isDark ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Scanners ({scanners?.length ?? 0})
              </button>
              <button
                onClick={() => setActiveTab("pickers")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "pickers"
                    ? isDark ? "bg-cyan-500 text-white" : "bg-white text-gray-900 shadow-sm"
                    : isDark ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pickers ({pickers?.length ?? 0})
              </button>
            </div>

            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value as Id<"locations"> | "all")}
              className={`px-3 py-2 text-sm rounded-lg border focus:outline-none ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <option value="all">All Locations</option>
              {locations?.map((loc) => (
                <option key={loc._id} value={loc._id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
              <button onClick={() => setError("")} className="ml-4 text-red-300 hover:text-red-100">Dismiss</button>
            </div>
          )}

          {/* Equipment Grid */}
          {!currentItems ? (
            <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Loading...
            </div>
          ) : currentItems.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${isDark ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-white border-gray-200 text-gray-500"}`}>
              No {activeTab} found. Add your first {activeTab === "scanners" ? "scanner" : "picker"}.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {currentItems.map((item) => (
                <div
                  key={item._id}
                  className={`border rounded-xl p-5 ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`min-w-14 h-14 px-3 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${isDark ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-900"}`}>
                        #{item.number}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                          {activeTab === "scanners" ? "Scanner" : "Picker"} #{item.number}
                        </h3>
                        <p className={`text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {item.locationName}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.pin && (
                    <div className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className={`${isDark ? "text-slate-500" : "text-gray-400"}`}>PIN:</span> {item.pin}
                    </div>
                  )}

                  {item.assignedPersonName && (
                    <div className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className={`${isDark ? "text-slate-500" : "text-gray-400"}`}>Assigned to:</span> {item.assignedPersonName}
                    </div>
                  )}

                  {item.model && (
                    <div className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className={`${isDark ? "text-slate-500" : "text-gray-400"}`}>Model:</span> {item.model}
                    </div>
                  )}

                  {item.serialNumber && (
                    <div className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className={`${isDark ? "text-slate-500" : "text-gray-400"}`}>S/N:</span> {item.serialNumber}
                    </div>
                  )}

                  {item.notes && (
                    <p className={`text-sm mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                      {item.notes}
                    </p>
                  )}

                  {item.conditionNotes && (
                    <div className={`text-sm mt-2 p-2 rounded ${isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                      <span className="font-medium">Condition:</span> {item.conditionNotes}
                    </div>
                  )}

                  <div className={`flex flex-wrap gap-2 mt-4 pt-4 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                    <button
                      onClick={() => handleEdit(item)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      Edit
                    </button>
                    {item.status === "available" && (
                      <button
                        onClick={() => openAssignModal(item)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                      >
                        Assign
                      </button>
                    )}
                    {item.status === "assigned" && (
                      <button
                        onClick={() => openReturnModal(item)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                      >
                        Return
                      </button>
                    )}
                    {item.status !== "retired" && (
                      <button
                        onClick={() => openRetireModal(item._id as Id<"scanners"> | Id<"pickers">)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                      >
                        Retire
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Equipment Modal */}
        {showNewEquipment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                {editingId ? `Edit ${activeTab === "scanners" ? "Scanner" : "Picker"}` : `Add New ${activeTab === "scanners" ? "Scanner" : "Picker"}`}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Identifier *
                    </label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      required
                      placeholder="e.g., 1, A-12, SC-001"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      PIN
                    </label>
                    <input
                      type="text"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      placeholder="1234"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Location *
                  </label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    required
                  >
                    <option value="">Select a location</option>
                    {locations?.map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="e.g., Zebra TC52"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="General notes about this equipment"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Condition Notes
                  </label>
                  <textarea
                    value={formData.conditionNotes}
                    onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
                    rows={2}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="Current condition (e.g., screen scratched, battery weak)"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewEquipment(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {editingId ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Retire Equipment Modal */}
        {showRetireModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-md ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Retire {activeTab === "scanners" ? "Scanner" : "Picker"}
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                This will mark the equipment as retired and remove any current assignment. This action cannot be undone.
              </p>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Reason for Retirement *
                  </label>
                  <textarea
                    value={retireReason}
                    onChange={(e) => setRetireReason(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="e.g., Damaged beyond repair, obsolete model, lost"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRetireModal(false);
                      setRetireId(null);
                      setRetireReason("");
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRetire}
                    disabled={!retireReason.trim()}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? "bg-red-500 text-white hover:bg-red-600" : "bg-red-600 text-white hover:bg-red-700"}`}
                  >
                    Retire Equipment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Equipment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Assign {activeTab === "scanners" ? "Scanner" : "Picker"} #{assignEquipmentData?.number}
                </h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignEquipmentId(null);
                    setAssignEquipmentData(null);
                    setSelectedPersonnelId("");
                    setSignatureData(null);
                    setAssignStep("select");
                  }}
                  className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {assignStep === "select" ? (
                <>
                  <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Select an employee to assign this equipment. They will need to sign an equipment responsibility agreement.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        Assign to Employee *
                      </label>
                      <select
                        value={selectedPersonnelId}
                        onChange={(e) => setSelectedPersonnelId(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                      >
                        <option value="">Select an employee</option>
                        {activePersonnel?.map((person) => (
                          <option key={person._id} value={person._id}>
                            {person.name} - {person.position} ({person.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignModal(false);
                          setAssignEquipmentId(null);
                          setAssignEquipmentData(null);
                          setSelectedPersonnelId("");
                        }}
                        className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignStep("sign")}
                        disabled={!selectedPersonnelId}
                        className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                      >
                        Continue to Agreement
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`mb-4 p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-blue-50"}`}>
                    <p className={`text-sm font-medium ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                      Assigning to: {activePersonnel?.find(p => p._id === selectedPersonnelId)?.name}
                    </p>
                  </div>

                  <div className={`mb-4 p-4 rounded-lg border max-h-64 overflow-y-auto ${isDark ? "bg-slate-900/50 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                    <pre className={`text-xs whitespace-pre-wrap font-mono ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      {getAgreementText()}
                    </pre>
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Employee Signature *
                    </label>
                    <p className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      Have the employee sign below to acknowledge the equipment responsibility agreement.
                    </p>
                    <SignaturePad
                      onSignatureChange={setSignatureData}
                      width={500}
                      height={150}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignStep("select");
                        setSignatureData(null);
                      }}
                      className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={!signatureData}
                      className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      Assign Equipment
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Return Equipment Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`border rounded-xl p-4 sm:p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Return {activeTab === "scanners" ? "Scanner" : "Picker"} #{returnEquipmentData?.number}
                </h2>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnEquipmentId(null);
                    setReturnEquipmentData(null);
                  }}
                  className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
                >
                  <svg className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`mb-4 p-3 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-amber-50"}`}>
                <p className={`text-sm ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                  <span className="font-medium">Returning from:</span> {returnEquipmentData?.assignedPersonName || "Unknown"}
                </p>
              </div>

              <div className="space-y-6">
                {/* Condition Checklist */}
                <div>
                  <h3 className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Condition Checklist
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "physicalCondition", label: "No physical damage" },
                      { key: "screenFunctional", label: "Screen works properly" },
                      { key: "buttonsWorking", label: "All buttons responsive" },
                      { key: "batteryCondition", label: "Battery holds charge" },
                      { key: "chargingPortOk", label: "Charging port undamaged" },
                      { key: "scannerFunctional", label: "Scanning works" },
                      { key: "cleanCondition", label: "Equipment is clean" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checklist[item.key as keyof typeof checklist]
                            ? isDark ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"
                            : isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checklist[item.key as keyof typeof checklist]}
                          onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Overall Condition */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Overall Condition
                  </label>
                  <select
                    value={overallCondition}
                    onChange={(e) => setOverallCondition(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                  >
                    <option value="excellent">Excellent - Like new</option>
                    <option value="good">Good - Normal wear</option>
                    <option value="fair">Fair - Some issues</option>
                    <option value="poor">Poor - Multiple issues</option>
                    <option value="damaged">Damaged - Needs repair</option>
                  </select>
                </div>

                {/* Damage Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                    Damage Notes (if any)
                  </label>
                  <textarea
                    value={damageNotes}
                    onChange={(e) => setDamageNotes(e.target.value)}
                    rows={2}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                    placeholder="Describe any damage or issues found..."
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? "border-slate-600" : "border-gray-200"}`}>
                    <input
                      type="checkbox"
                      checked={repairRequired}
                      onChange={(e) => {
                        setRepairRequired(e.target.checked);
                        if (e.target.checked) setReadyForReassignment(false);
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Repair required before next use
                    </span>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? "border-slate-600" : "border-gray-200"}`}>
                    <input
                      type="checkbox"
                      checked={readyForReassignment}
                      onChange={(e) => setReadyForReassignment(e.target.checked)}
                      disabled={repairRequired}
                      className="w-4 h-4 rounded disabled:opacity-50"
                    />
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"} ${repairRequired ? "opacity-50" : ""}`}>
                      Ready for reassignment
                    </span>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? "border-slate-600" : "border-gray-200"}`}>
                    <input
                      type="checkbox"
                      checked={deductionRequired}
                      onChange={(e) => setDeductionRequired(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      Pay deduction required for damage
                    </span>
                  </label>

                  {deductionRequired && (
                    <div className="ml-7">
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        Deduction Amount
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`${isDark ? "text-slate-400" : "text-gray-500"}`}>$</span>
                        <input
                          type="number"
                          value={deductionAmount}
                          onChange={(e) => setDeductionAmount(Math.min(EQUIPMENT_VALUE, Math.max(0, Number(e.target.value))))}
                          max={EQUIPMENT_VALUE}
                          min={0}
                          className={`w-32 px-4 py-2 border rounded-lg focus:outline-none ${isDark ? "bg-slate-900/50 border-slate-600 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500"}`}
                        />
                        <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          (max ${EQUIPMENT_VALUE})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReturnModal(false);
                      setReturnEquipmentId(null);
                      setReturnEquipmentData(null);
                    }}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReturn}
                    className={`flex-1 px-4 py-3 font-medium rounded-lg transition-colors ${isDark ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-amber-600 text-white hover:bg-amber-700"}`}
                  >
                    Complete Return
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <Protected>
      <EquipmentContent />
    </Protected>
  );
}
