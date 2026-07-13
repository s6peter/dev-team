"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDollars, formatDate } from "@/lib/utils";
import {
  loadPricingData,
  savePricingData,
  defaultPricingData,
  type CategoryPricing,
  type ServicePricingItem,
} from "@/lib/pricing-data";
import {
  Calendar,
  Clock,
  Check,
  X,
  User,
  DollarSign,
  Lock,
  List,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";

const ADMIN_PASSWORD = "queeng2024";
const PRICING_LAST_SAVED_AT_KEY = "queeng_pricing_last_saved_at";
const AUTOSAVE_DELAY_MS = 800;

interface AppointmentRecord {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  sizeName?: string;
  lengthName?: string;
  date: string;
  startTime: string;
  price: number;
  deposit: number;
  status: string;
  notes?: string;
  createdAt?: string;
}

function loadAppointments(): AppointmentRecord[] {
  try {
    const raw = localStorage.getItem("queeng_appointments");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAppointments(appointments: AppointmentRecord[]) {
  localStorage.setItem("queeng_appointments", JSON.stringify(appointments));
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeTab, setActiveTab] = useState<"appointments" | "services">("appointments");

  const [allAppointments, setAllAppointments] = useState<AppointmentRecord[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const [pricingData, setPricingData] = useState<CategoryPricing[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPricingDataRef = useRef<CategoryPricing[]>([]);
  const dirtyRef = useRef(false);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const persistPricingChanges = useCallback((data: CategoryPricing[]) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      savePricingData(data);
      const savedAt = new Date().toISOString();
      setLastSavedAt(savedAt);
      setIsDirty(false);

      try {
        localStorage.setItem(PRICING_LAST_SAVED_AT_KEY, savedAt);
      } catch {
        // ignore localStorage write errors for metadata
      }
    } catch {
      setSaveError("Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const applyPricingChange = useCallback((mutate: (draft: CategoryPricing[]) => void) => {
    setPricingData((current) => {
      const updated = deepClone(current);
      mutate(updated);
      latestPricingDataRef.current = updated;
      return updated;
    });
    setIsDirty(true);
    setSaveError(null);

    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      persistPricingChanges(latestPricingDataRef.current);
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);
  }, [clearAutosaveTimer, persistPricingChanges]);

  useEffect(() => {
    if (authenticated) {
      clearAutosaveTimer();
      const initialPricing = loadPricingData();
      setPricingData(initialPricing);
      latestPricingDataRef.current = initialPricing;
      setIsDirty(false);
      setIsSaving(false);
      setSaveError(null);
      try {
        setLastSavedAt(localStorage.getItem(PRICING_LAST_SAVED_AT_KEY));
      } catch {
        setLastSavedAt(null);
      }
      fetchAppointments();
    }
  }, [authenticated, clearAutosaveTimer]);

  useEffect(() => {
    if (!authenticated) return;
    fetchAppointments();
  }, [filter]);

  useEffect(() => {
    latestPricingDataRef.current = pricingData;
  }, [pricingData]);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (!dirtyRef.current || latestPricingDataRef.current.length === 0) return;

      try {
        savePricingData(latestPricingDataRef.current);
        localStorage.setItem(PRICING_LAST_SAVED_AT_KEY, new Date().toISOString());
      } catch {
        // ignore flush errors during unmount
      }
    };
  }, [clearAutosaveTimer]);

  useEffect(() => {
    if (!authenticated || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [authenticated, isDirty]);

  function fetchAppointments() {
    const all = loadAppointments();
    setAllAppointments(all);
    if (filter === "all") {
      setFilteredAppointments(all);
    } else {
      setFilteredAppointments(all.filter((a) => a.status === filter));
    }
    setLoading(false);
  }

  function handleStatusChange(appointmentId: string, newStatus: string) {
    const all = loadAppointments();
    const updated = all.map((a) =>
      a.id === appointmentId ? { ...a, status: newStatus } : a
    );
    saveAppointments(updated);
    fetchAppointments();
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  }

  // --- Pricing edit functions (deep clone to avoid mutation) ---

  function updatePricingCell(catIdx: number, svcIdx: number, rowIdx: number, cellIdx: number, value: string) {
    const num = parseInt(value, 10);
    applyPricingChange((updated) => {
      updated[catIdx].services[svcIdx].pricing[rowIdx].lengths[cellIdx].price = isNaN(num) ? 0 : num;
    });
  }

  function addPricingRow(catIdx: number, svcIdx: number) {
    applyPricingChange((updated) => {
      updated[catIdx].services[svcIdx].pricing.push({
        size: "New Size",
        lengths: [{ label: "Starting at", price: 0 }],
      });
    });
  }

  function removePricingRow(catIdx: number, svcIdx: number, rowIdx: number) {
    applyPricingChange((updated) => {
      updated[catIdx].services[svcIdx].pricing.splice(rowIdx, 1);
    });
  }

  function updateRowSize(catIdx: number, svcIdx: number, rowIdx: number, value: string) {
    applyPricingChange((updated) => {
      updated[catIdx].services[svcIdx].pricing[rowIdx].size = value;
    });
  }

  function addLengthColumn(catIdx: number, svcIdx: number) {
    applyPricingChange((updated) => {
      for (const row of updated[catIdx].services[svcIdx].pricing) {
        row.lengths.push({ label: "New", price: 0 });
      }
    });
  }

  function removeLengthColumn(catIdx: number, svcIdx: number, cellIdx: number) {
    applyPricingChange((updated) => {
      for (const row of updated[catIdx].services[svcIdx].pricing) {
        if (row.lengths.length > 1) row.lengths.splice(cellIdx, 1);
      }
    });
  }

  function updateLengthLabel(catIdx: number, svcIdx: number, cellIdx: number, value: string) {
    applyPricingChange((updated) => {
      for (const row of updated[catIdx].services[svcIdx].pricing) {
        if (row.lengths[cellIdx]) row.lengths[cellIdx].label = value;
      }
    });
  }

  function addServiceToCategory(catIdx: number) {
    const name = window.prompt("Service name:");
    if (!name) return;
    applyPricingChange((updated) => {
      updated[catIdx].services.push({
        id: crypto.randomUUID(),
        name,
        pricing: [{ size: "Standard", lengths: [{ label: "Starting at", price: 0 }] }],
      });
    });
  }

  function removeServiceFromCategory(catIdx: number, svcIdx: number) {
    if (!window.confirm("Remove this service from pricing?")) return;
    applyPricingChange((updated) => {
      updated[catIdx].services.splice(svcIdx, 1);
      if (updated[catIdx].services.length === 0) updated.splice(catIdx, 1);
    });
  }

  function handleSavePricing() {
    clearAutosaveTimer();
    persistPricingChanges(latestPricingDataRef.current.length > 0 ? latestPricingDataRef.current : pricingData);
  }

  function handleResetPricing() {
    if (!window.confirm("Reset all pricing to defaults? This cannot be undone.")) return;
    const fresh = deepClone(defaultPricingData);
    clearAutosaveTimer();
    setPricingData(fresh);
    latestPricingDataRef.current = fresh;
    setIsDirty(true);
    setSaveError(null);
    persistPricingChanges(fresh);
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader className="text-center">
              <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-2">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="mt-2"
                    placeholder="Enter admin password"
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">Login</Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Stats computed from ALL appointments, not filtered
  const pendingCount = allAppointments.filter((a) => a.status === "pending").length;
  const confirmedCount = allAppointments.filter((a) => a.status === "confirmed").length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = allAppointments.filter((a) => a.date === todayStr);
  const revenue = allAppointments
    .filter((a) => a.status === "confirmed" || a.status === "completed")
    .reduce((sum, a) => sum + (a.price || 0), 0);

  const lastSavedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;

  let pricingStatusText = "No pricing changes yet";
  let pricingStatusClass = "text-sm text-muted-foreground font-medium";

  if (saveError) {
    pricingStatusText = saveError;
    pricingStatusClass = "text-sm text-red-600 font-medium";
  } else if (isSaving) {
    pricingStatusText = "Saving...";
  } else if (isDirty) {
    pricingStatusText = "Unsaved changes";
    pricingStatusClass = "text-sm text-amber-600 font-medium";
  } else if (lastSavedLabel) {
    pricingStatusText = `Saved at ${lastSavedLabel}`;
    pricingStatusClass = "text-sm text-green-600 font-medium";
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "appointments" ? "default" : "outline"}
              onClick={() => setActiveTab("appointments")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Appointments
            </Button>
            <Button
              variant={activeTab === "services" ? "default" : "outline"}
              onClick={() => setActiveTab("services")}
            >
              <List className="h-4 w-4 mr-2" />
              Manage Services
            </Button>
          </div>

          {activeTab === "appointments" && (
            <>
              {/* Stats - computed from ALL appointments */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <Calendar className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pendingCount}</p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{confirmedCount}</p>
                        <p className="text-sm text-muted-foreground">Confirmed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{todayAppointments.length}</p>
                        <p className="text-sm text-muted-foreground">Today</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <DollarSign className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatDollars(revenue)}</p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Tabs - includes no_show */}
              <div className="flex gap-2 mb-6">
                {["all", "pending", "confirmed", "completed", "no_show"].map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(status)}
                  >
                    {status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Appointments List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading appointments...</p>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No appointments found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments.map((appointment) => (
                    <Card key={appointment.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{appointment.clientName}</h3>
                              <p className="text-sm text-muted-foreground">{appointment.clientEmail}</p>
                              {appointment.clientPhone && (
                                <p className="text-sm text-muted-foreground">{appointment.clientPhone}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(appointment.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {appointment.startTime}
                                </span>
                              </div>
                              <p className="text-sm mt-2">
                                <strong>Service:</strong> {appointment.serviceName}
                              </p>
                              {appointment.sizeName && (
                                <p className="text-sm"><strong>Size:</strong> {appointment.sizeName}</p>
                              )}
                              {appointment.lengthName && (
                                <p className="text-sm"><strong>Length:</strong> {appointment.lengthName}</p>
                              )}
                              {appointment.notes && (
                                <p className="text-sm"><strong>Notes:</strong> {appointment.notes}</p>
                              )}
                              <p className="text-sm">
                                <strong>Price:</strong> {formatDollars(appointment.price || 0)}
                              </p>
                              {appointment.deposit > 0 && (
                                <p className="text-sm">
                                  <strong>Deposit:</strong> {formatDollars(appointment.deposit)}
                                </p>
                              )}
                              <span
                                className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                                  appointment.status === "confirmed"
                                    ? "bg-green-100 text-green-700"
                                    : appointment.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : appointment.status === "completed"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {appointment.status.charAt(0).toUpperCase() +
                                  appointment.status.slice(1).replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {appointment.status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => handleStatusChange(appointment.id, "confirmed")}>
                                  <Check className="h-4 w-4 mr-1" /> Confirm
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(appointment.id, "no_show")}>
                                  No Show
                                </Button>
                              </>
                            )}
                            {appointment.status === "confirmed" && (
                              <>
                                <Button size="sm" onClick={() => handleStatusChange(appointment.id, "completed")}>
                                  <Check className="h-4 w-4 mr-1" /> Complete
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(appointment.id, "no_show")}>
                                  No Show
                                </Button>
                              </>
                            )}
                            {(appointment.status === "completed" || appointment.status === "no_show") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(appointment.id, "pending")}
                              >
                                Revert to Pending
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "services" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Pricing Tables</h2>
                <div className="flex gap-2 items-center">
                  <span className={pricingStatusClass}>{pricingStatusText}</span>
                  <Button variant="outline" size="sm" onClick={handleResetPricing} disabled={isSaving}>
                    Reset to Defaults
                  </Button>
                  <Button size="sm" onClick={handleSavePricing} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "Saving..." : "Save All Pricing"}
                  </Button>
                </div>
              </div>

              {pricingData.map((cat, catIdx) => (
                <Card key={cat.name} className="mb-4">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-semibold">{cat.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({cat.services.length} service{cat.services.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                    {expandedCategory === cat.name ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>

                  {expandedCategory === cat.name && (
                    <div className="border-t">
                      {cat.services.map((svc, svcIdx) => (
                        <div key={svc.id}>
                          {cat.services.length > 1 ? (
                            <>
                              <button
                                onClick={() => setExpandedService(expandedService === svc.id ? null : svc.id)}
                                className="w-full flex items-center justify-between px-6 py-3 text-left border-b border-dashed border-muted"
                              >
                                <span className="font-medium">{svc.name}</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); removeServiceFromCategory(catIdx, svcIdx); }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                  {expandedService === svc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </button>
                              {expandedService === svc.id && (
                                <PricingEditor
                                  catIdx={catIdx}
                                  svcIdx={svcIdx}
                                  svc={svc}
                                  updatePricingCell={updatePricingCell}
                                  addPricingRow={addPricingRow}
                                  removePricingRow={removePricingRow}
                                  updateRowSize={updateRowSize}
                                  addLengthColumn={addLengthColumn}
                                  removeLengthColumn={removeLengthColumn}
                                  updateLengthLabel={updateLengthLabel}
                                />
                              )}
                            </>
                          ) : (
                            <PricingEditor
                              catIdx={catIdx}
                              svcIdx={svcIdx}
                              svc={svc}
                              updatePricingCell={updatePricingCell}
                              addPricingRow={addPricingRow}
                              removePricingRow={removePricingRow}
                              updateRowSize={updateRowSize}
                              addLengthColumn={addLengthColumn}
                              removeLengthColumn={removeLengthColumn}
                              updateLengthLabel={updateLengthLabel}
                            />
                          )}
                        </div>
                      ))}
                      <div className="px-6 py-3">
                        <Button size="sm" variant="outline" onClick={() => addServiceToCategory(catIdx)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Service to {cat.name}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PricingEditor({
  catIdx, svcIdx, svc,
  updatePricingCell, addPricingRow, removePricingRow, updateRowSize,
  addLengthColumn, removeLengthColumn, updateLengthLabel,
}: {
  catIdx: number;
  svcIdx: number;
  svc: ServicePricingItem;
  updatePricingCell: (catIdx: number, svcIdx: number, rowIdx: number, cellIdx: number, value: string) => void;
  addPricingRow: (catIdx: number, svcIdx: number) => void;
  removePricingRow: (catIdx: number, svcIdx: number, rowIdx: number) => void;
  updateRowSize: (catIdx: number, svcIdx: number, rowIdx: number, value: string) => void;
  addLengthColumn: (catIdx: number, svcIdx: number) => void;
  removeLengthColumn: (catIdx: number, svcIdx: number, cellIdx: number) => void;
  updateLengthLabel: (catIdx: number, svcIdx: number, cellIdx: number, value: string) => void;
}) {
  const hasLengths =
    svc.pricing.length > 0 &&
    svc.pricing[0].lengths.length > 1 &&
    svc.pricing[0].lengths[0].label !== "Starting at" &&
    svc.pricing[0].lengths[0].label !== "Price";

  return (
    <div className="px-6 py-4 border-t border-dashed border-muted">
      <div className="flex gap-2 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => addPricingRow(catIdx, svcIdx)}>
          <Plus className="h-3 w-3 mr-1" /> Add Row
        </Button>
        <Button size="sm" variant="outline" onClick={() => addLengthColumn(catIdx, svcIdx)}>
          <Plus className="h-3 w-3 mr-1" /> Add Length Column
        </Button>
      </div>

      <div className="overflow-x-auto">
        {hasLengths ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-2 font-medium">Size</th>
                {svc.pricing[0].lengths.map((l, cellIdx) => (
                  <th key={cellIdx} className="text-center py-2 px-1">
                    <div className="flex flex-col items-center gap-1">
                      <Input
                        className="h-6 text-center text-xs w-20"
                        value={l.label}
                        onChange={(e) => updateLengthLabel(catIdx, svcIdx, cellIdx, e.target.value)}
                      />
                      {svc.pricing[0].lengths.length > 1 && (
                        <button
                          onClick={() => removeLengthColumn(catIdx, svcIdx, cellIdx)}
                          className="text-red-400 hover:text-red-600 text-[10px]"
                        >
                          remove
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {svc.pricing.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-dashed">
                  <td className="py-2 pr-2">
                    <Input
                      className="h-7 text-xs"
                      value={row.size}
                      onChange={(e) => updateRowSize(catIdx, svcIdx, rowIdx, e.target.value)}
                    />
                  </td>
                  {row.lengths.map((cell, cellIdx) => (
                    <td key={cellIdx} className="py-2 px-1">
                      <div className="flex items-center">
                        <span className="text-muted-foreground text-xs mr-0.5">$</span>
                        <Input
                          className="h-7 text-xs w-16"
                          type="number"
                          min={0}
                          value={cell.price}
                          onChange={(e) => updatePricingCell(catIdx, svcIdx, rowIdx, cellIdx, e.target.value)}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="py-2">
                    <button
                      onClick={() => removePricingRow(catIdx, svcIdx, rowIdx)}
                      className="text-red-400 hover:text-red-600 ml-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-2">
            {svc.pricing.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-2">
                <Input
                  className="h-7 text-xs flex-1"
                  value={row.size}
                  onChange={(e) => updateRowSize(catIdx, svcIdx, rowIdx, e.target.value)}
                  placeholder="Size name"
                />
                <span className="text-muted-foreground text-xs">{row.lengths[0]?.label || "Price"}:</span>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-xs mr-0.5">$</span>
                  <Input
                    className="h-7 text-xs w-20"
                    type="number"
                    min={0}
                    value={row.lengths[0]?.price ?? 0}
                    onChange={(e) => updatePricingCell(catIdx, svcIdx, rowIdx, 0, e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removePricingRow(catIdx, svcIdx, rowIdx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
