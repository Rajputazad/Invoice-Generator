"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type LineItem = {
  id: string;
  description: string;
  quantity: number | "";
  price: number | "";
};

type InvoiceState = {
  companyName: string;
  invoiceTitle: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
  companyPhone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  abn: string;
  website: string;
  note: string;
  taxRate: number;
  items: LineItem[];
};

type SavedInvoice = InvoiceState & {
  id: string;
  savedAt: string;
};

type View = "generator" | "saved" | "settings";

const PASSWORD = "Beyond@961";
const PASSWORD_ALIASES = [PASSWORD, "Beyond\\@961"];
const AUTH_KEY = "invoice-generator-auth-v1";
const DRAFT_KEY = "invoice-generator-state-v3";
const SAVED_KEY = "invoice-generator-saved-v1";

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateInvoiceNumber() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `#${day}${month}${year}${hours}${minutes}`;
}

const defaultInvoice: InvoiceState = {
  companyName: "BEYOND BIKES",
  invoiceTitle: "INVOICE",
  invoiceNumber: generateInvoiceNumber(),
  invoiceDate: todayDate(),
  customerName: "",
  customerPhone: "",
  accountName: "BEYOND BIKES PTY LTD",
  bsb: "033-059",
  accountNumber: "823213",
  companyPhone: "0498854229",
  email: "info.beyondbikes@gmail.com",
  addressLine1: "768 Glen Huntly Rd, Caulfield South",
  addressLine2: "3162",
  abn: "61988672940",
  website: "www.beyondbikes.com.au",
  note: "No Refund",
  taxRate: 9.8,
  items: [
    {
      id: "item-1",
      description: "",
      quantity: "",
      price: "",
    },
  ],
};

const settingsFields: Array<{
  field: keyof InvoiceState;
  label: string;
  type?: string;
}> = [
  { field: "companyName", label: "Company name" },
  { field: "invoiceTitle", label: "Invoice title" },
  { field: "accountName", label: "Account name" },
  { field: "bsb", label: "BSB" },
  { field: "accountNumber", label: "Account no." },
  { field: "companyPhone", label: "Business phone" },
  { field: "email", label: "Email" },
  { field: "addressLine1", label: "Address line 1" },
  { field: "addressLine2", label: "Address line 2" },
  { field: "abn", label: "ABN" },
  { field: "website", label: "Website" },
  { field: "note", label: "Note" },
  { field: "taxRate", label: "Tax rate", type: "number" },
];

const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function newItem(): LineItem {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}`,
    description: "",
    quantity: "",
    price: "",
  };
}

function freshInvoice(current: InvoiceState): InvoiceState {
  return {
    ...current,
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: todayDate(),
    customerName: "",
    customerPhone: "",
    items: [newItem()],
  };
}

function invoiceFileName(invoice: InvoiceState) {
  const invoiceNumber = invoice.invoiceNumber.replace(/[^a-z0-9-]/gi, "");
  return `${invoiceNumber || "invoice"}.pdf`;
}

function toLineText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function numericValue(value: number | "") {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMaybeCurrency(value: number | "") {
  return value === "" ? "" : currency.format(value);
}

function formatMaybeQuantity(value: number | "") {
  return value === "" ? "" : String(value).padStart(2, "0");
}

async function imageToDataUrl(path: string) {
  const response = await fetch(path);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeView, setActiveView] = useState<View>("generator");
  const [invoice, setInvoice] = useState<InvoiceState>(defaultInvoice);
  const [settingsDraft, setSettingsDraft] =
    useState<InvoiceState>(defaultInvoice);
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [saveState, setSaveState] = useState("Saved locally");
  const [formError, setFormError] = useState("");
  const showFieldErrors = Boolean(formError);

  useEffect(() => {
    try {
      setAuthenticated(window.sessionStorage.getItem(AUTH_KEY) === "true");
    } catch {
      setAuthenticated(false);
    }

    const storedDraft = window.localStorage.getItem(DRAFT_KEY);
    const storedSaved = window.localStorage.getItem(SAVED_KEY);

    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft) as InvoiceState;
        const hydratedInvoice = {
          ...defaultInvoice,
          ...parsed,
          invoiceNumber: parsed.invoiceNumber?.trim()
            ? parsed.invoiceNumber
            : generateInvoiceNumber(),
          items: parsed.items?.length ? parsed.items : defaultInvoice.items,
        };
        setInvoice({
          ...hydratedInvoice,
        });
        setSettingsDraft({
          ...hydratedInvoice,
        });
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }

    if (storedSaved) {
      try {
        setSavedInvoices(JSON.parse(storedSaved) as SavedInvoice[]);
      } catch {
        window.localStorage.removeItem(SAVED_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
    setSaveState("Draft saved locally");
  }, [invoice]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(savedInvoices));
  }, [savedInvoices]);

  const totals = useMemo(() => {
    const total = invoice.items.reduce(
      (sum, item) => sum + numericValue(item.quantity) * numericValue(item.price),
      0,
    );
    const tax = total * (invoice.taxRate / (100 + invoice.taxRate));
    const subtotal = total - tax;
    return {
      subtotal,
      tax,
      total,
    };
  }, [invoice.items, invoice.taxRate]);

  const filteredSavedInvoices = useMemo(() => {
    const search = savedSearch.trim().toLowerCase();

    if (!search) return savedInvoices;

    return savedInvoices.filter((savedInvoice) => {
      const searchableText = [
        savedInvoice.invoiceNumber,
        savedInvoice.customerName,
        savedInvoice.customerPhone,
        savedInvoice.invoiceDate,
        formatDate(savedInvoice.invoiceDate),
        ...savedInvoice.items.map((item) => item.description),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [savedInvoices, savedSearch]);

  const validateInvoice = () => {
    if (!invoice.invoiceNumber.trim()) return "Invoice number is required.";
    if (!invoice.invoiceDate) return "Invoice date is required.";
    if (!invoice.customerName.trim()) return "Customer name is required.";

    const missingItem = invoice.items.findIndex(
      (item) =>
        !item.description.trim() ||
        item.quantity === "" ||
        numericValue(item.quantity) <= 0 ||
        item.price === "" ||
        numericValue(item.price) <= 0,
    );

    if (missingItem >= 0) {
      return `Item ${missingItem + 1} needs description, quantity, and price.`;
    }

    return "";
  };

  const requireValidInvoice = () => {
    const error = validateInvoice();
    setFormError(error);
    return !error;
  };

  const fieldError = (field: "invoiceNumber" | "invoiceDate" | "customerName") => {
    if (!showFieldErrors) return "";
    if (field === "invoiceNumber" && !invoice.invoiceNumber.trim()) {
      return "Invoice number is required.";
    }
    if (field === "invoiceDate" && !invoice.invoiceDate) {
      return "Invoice date is required.";
    }
    if (field === "customerName" && !invoice.customerName.trim()) {
      return "Customer name is required.";
    }

    return "";
  };

  const itemError = (
    item: LineItem,
    field: "description" | "quantity" | "price",
  ) => {
    if (!showFieldErrors) return "";
    if (field === "description" && !item.description.trim()) {
      return "Item description is required.";
    }
    if (
      field === "quantity" &&
      (item.quantity === "" || numericValue(item.quantity) <= 0)
    ) {
      return "Quantity is required.";
    }
    if (field === "price" && (item.price === "" || numericValue(item.price) <= 0)) {
      return "Price is required.";
    }

    return "";
  };

  const updateField =
    <K extends keyof InvoiceState>(field: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === "taxRate" ? Number(event.target.value) : event.target.value;

      setSaveState("Saving...");
      setFormError("");
      setInvoice((current) => ({ ...current, [field]: value }));
    };

  const updateItem = (
    id: string,
    field: keyof Omit<LineItem, "id">,
    value: string,
  ) => {
    setSaveState("Saving...");
    setFormError("");
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "description"
                  ? value
                  : value === ""
                    ? ""
                    : Number(value),
            }
          : item,
      ),
    }));
  };

  const updateSettingsField =
    <K extends keyof InvoiceState>(field: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "taxRate" ? Number(event.target.value) : event.target.value;

      setSettingsDraft((current) => ({ ...current, [field]: value }));
    };

  const openView = (view: View) => {
    if (view === "settings") {
      setSettingsDraft(invoice);
      setSettingsEditing(false);
    }

    setActiveView(view);
  };

  const saveSettings = () => {
    setInvoice((current) => ({
      ...settingsDraft,
      invoiceNumber: current.invoiceNumber,
      invoiceDate: current.invoiceDate,
      customerName: current.customerName,
      customerPhone: current.customerPhone,
      items: current.items,
    }));
    setSaveState("Settings updated");
    setSettingsEditing(false);
    setActiveView("generator");
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enteredPassword = password.trim();

    if (!PASSWORD_ALIASES.includes(enteredPassword)) {
      setAuthError("Incorrect password");
      return;
    }

    try {
      window.sessionStorage.setItem(AUTH_KEY, "true");
    } catch {
      // Some mobile/private browsers block storage; keep this session unlocked in memory.
    }
    setAuthenticated(true);
    setAuthError("");
  };

  const logout = () => {
    try {
      window.sessionStorage.removeItem(AUTH_KEY);
    } catch {}
    setAuthenticated(false);
    setPassword("");
  };

  const addItem = () => {
    setInvoice((current) => ({
      ...current,
      items: [...current.items, newItem()],
    }));
  };

  const removeItem = (id: string) => {
    setInvoice((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((item) => item.id !== id),
    }));
  };

  const startNewInvoice = () => {
    setInvoice((current) => freshInvoice(current));
    setActiveView("generator");
  };

  const saveInvoice = () => {
    if (!requireValidInvoice()) return;

    const id =
      invoice.invoiceNumber.trim() ||
      globalThis.crypto?.randomUUID?.() ||
      `invoice-${Date.now()}`;
    const savedInvoice: SavedInvoice = {
      ...invoice,
      id,
      savedAt: new Date().toISOString(),
    };

    setSavedInvoices((current) => [
      savedInvoice,
      ...current.filter((item) => item.id !== id),
    ]);
    setSaveState("Invoice saved");
  };

  const loadInvoice = (savedInvoice: SavedInvoice) => {
    const { id: _id, savedAt: _savedAt, ...invoiceState } = savedInvoice;
    setInvoice(invoiceState);
    setSettingsDraft(invoiceState);
    setActiveView("generator");
    setSaveState("Invoice loaded");
  };

  const deleteInvoice = (id: string) => {
    setSavedInvoices((current) => current.filter((item) => item.id !== id));
  };

  const shareInvoice = async () => {
    if (!requireValidInvoice()) return;

    setSaveState("Preparing PDF...");
    const [{ default: jsPDF }, logoData] = await Promise.all([
      import("jspdf"),
      imageToDataUrl("/beyond-bikes-logo-clean.png"),
    ]);
    const pdf = new jsPDF("p", "mm", "a4");
    const left = 20;
    const right = 190;
    const tableWidth = right - left;
    const columns = [28, 62, 22, 29, 29];
    const columnX = columns.reduce<number[]>(
      (positions, width) => [...positions, positions[positions.length - 1] + width],
      [left],
    );

    pdf.setProperties({
      title: `${invoice.invoiceTitle} ${invoice.invoiceNumber}`,
      subject: `${invoice.companyName} invoice`,
      creator: "Beyond Bikes Invoice Generator",
    });

    pdf.addImage(logoData, "PNG", left, 14, 39, 30);

    pdf.setFontSize(28);
    pdf.text(invoice.invoiceTitle, right, 38, { align: "right" });
    pdf.setLineWidth(0.45);
    pdf.line(left, 52, right, 52);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(63, 59, 73);
    pdf.setFontSize(13);
    pdf.text("INVOICE TO:", left, 70);
    pdf.setFontSize(12);
    pdf.text(invoice.customerName || "Customer name", left, 83);
    pdf.text(invoice.customerPhone || "Customer phone", left, 94);

    pdf.text(`Invoice No: ${invoice.invoiceNumber}`, 138, 83);
    pdf.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 138, 94);

    const tableTop = 114;
    let y = tableTop;
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(205, 205, 205);
    pdf.setLineWidth(0.2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);

    const headers = ["S.No.", "Item", "Qty", "Price", "Total"];
    for (let index = 0; index < headers.length; index += 1) {
      pdf.rect(columnX[index], y, columns[index], 10);
      pdf.text(headers[index], columnX[index] + columns[index] / 2, y + 6.5, {
        align: "center",
      });
    }
    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    invoice.items.forEach((item, index) => {
      const description = pdf.splitTextToSize(
        toLineText(item.description),
        columns[1] - 8,
      );
      const rowHeight = Math.max(22, description.length * 5 + 8);
      const cells = [
        String(index + 1).padStart(2, "0"),
        description,
        formatMaybeQuantity(item.quantity),
        formatMaybeCurrency(item.price),
        item.quantity === "" || item.price === ""
          ? ""
          : currency.format(numericValue(item.quantity) * numericValue(item.price)),
      ];

      for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
        pdf.rect(columnX[cellIndex], y, columns[cellIndex], rowHeight);
      }

      pdf.text(String(cells[0]), columnX[0] + 4, y + 7);
      pdf.text(cells[1] as string[], columnX[1] + 4, y + 7);
      pdf.text(String(cells[2]), columnX[2] + 4, y + 7);
      pdf.text(String(cells[3]), columnX[3] + 4, y + 7);
      pdf.text(String(cells[4]), columnX[4] + 4, y + 7);
      y += rowHeight;
    });

    y += 16;
    const totalsX = 128;
    const totalsLabelWidth = 35;
    const totalsValueWidth = 27;
    const totalsRows = [
      ["Sub-total:", currency.format(totals.subtotal)],
      ["Tax included:", currency.format(totals.tax)],
      ["Total:", currency.format(totals.total)],
    ];
    totalsRows.forEach(([label, value], index) => {
      pdf.setFillColor(index === 1 ? 242 : 255, index === 1 ? 242 : 255, index === 1 ? 242 : 255);
      pdf.rect(totalsX, y, totalsLabelWidth, 9, "FD");
      pdf.rect(totalsX + totalsLabelWidth, y, totalsValueWidth, 9, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.text(label, totalsX + 4, y + 6);
      pdf.text(value, totalsX + totalsLabelWidth + 4, y + 6);
      y += 9;
    });

    const paymentY = 224;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const paymentRows = [
      ["Acc Name", invoice.accountName],
      ["BSB", invoice.bsb],
      ["Acc No.", invoice.accountNumber],
    ];
    paymentRows.forEach(([label, value], index) => {
      const rowY = paymentY + index * 8;
      pdf.setFont("helvetica", "bold");
      pdf.text(label, left, rowY);
      pdf.setFont("helvetica", "normal");
      pdf.text(":", left + 24, rowY);
      pdf.text(value, left + 29, rowY);
    });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.text("THANK YOU!", right, paymentY + 12, { align: "right" });

    pdf.setDrawColor(23, 107, 139);
    pdf.setLineWidth(0.65);
    pdf.line(left, 249, right, 249);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.text(invoice.companyPhone, left, 262);
    pdf.setTextColor(71, 127, 144);
    pdf.text(invoice.email, left, 270);
    pdf.setTextColor(0, 0, 0);
    pdf.text(invoice.addressLine1, left, 278);
    pdf.text(invoice.addressLine2, left, 286);

    pdf.text(`ABN : ${invoice.abn}`, 124, 262);
    pdf.text(invoice.website, 124, 270);
    pdf.text(invoice.note, 124, 278);

    const blob = pdf.output("blob");
    const file = new File([blob], invoiceFileName(invoice), {
      type: "application/pdf",
    });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `${invoice.invoiceTitle} ${invoice.invoiceNumber}`,
        text: `${invoice.invoiceTitle} ${invoice.invoiceNumber}`,
        files: [file],
      });
      setSaveState("PDF shared");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    setSaveState("PDF downloaded");
  };

  const copyInvoiceSummary = async () => {
    if (!requireValidInvoice()) return;

    const shareText = `${invoice.companyName} ${invoice.invoiceTitle}
Invoice No: ${invoice.invoiceNumber}
Invoice Date: ${formatDate(invoice.invoiceDate)}
Invoice To: ${invoice.customerName}
Subtotal before tax: ${currency.format(totals.subtotal)}
Tax included (${invoice.taxRate}%): ${currency.format(totals.tax)}
Total: ${currency.format(totals.total)}`;

    await navigator.clipboard.writeText(shareText);
    setSaveState("Invoice summary copied");
  };

  const actionButtons = (
    <>
      <button type="button" onClick={saveInvoice}>
        Save invoice
      </button>
      <button type="button" onClick={shareInvoice}>
        Share PDF
      </button>
      <button
        type="button"
        onClick={() => {
          if (requireValidInvoice()) window.print();
        }}
      >
        Print
      </button>
      <button type="button" className="secondary" onClick={startNewInvoice}>
        New
      </button>
      <button type="button" className="secondary" onClick={copyInvoiceSummary}>
        Copy summary
      </button>
    </>
  );

  if (!authenticated) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={handleLogin}>
          <img src="/beyond-bikes-logo-clean.png" alt="Beyond Bikes" />
          <h1>Invoice Generator</h1>
          <label>
            Password
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authError ? <p className="auth-error">{authError}</p> : null}
          <button type="submit">Unlock</button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <nav className="menu-bar no-print">
        <div className="menu-brand">
          <img src="/beyond-bikes-logo-clean.png" alt="Beyond Bikes" />
          <strong>{invoice.companyName}</strong>
        </div>
        <div className="menu-links">
          <button
            type="button"
            className={activeView === "generator" ? "active" : ""}
            onClick={() => openView("generator")}
          >
            Invoice
          </button>
          <button
            type="button"
            className={activeView === "saved" ? "active" : ""}
            onClick={() => openView("saved")}
          >
            Saved invoices
          </button>
          <button
            type="button"
            className={activeView === "settings" ? "active" : ""}
            onClick={() => openView("settings")}
          >
            Settings
          </button>
        </div>
        <button type="button" className="secondary" onClick={logout}>
          Lock
        </button>
      </nav>

      <section className="toolbar no-print">
        <div>
          <p className="eyebrow">
            {activeView === "generator"
              ? "Invoice generator"
              : activeView === "saved"
                ? "Local invoices"
                : "Company settings"}
          </p>
          <h1>
            {activeView === "generator" ? invoice.invoiceTitle : invoice.companyName}
          </h1>
        </div>
        <div className="actions">
          <span className="save-state">{saveState}</span>
          {formError ? <span className="form-error">{formError}</span> : null}
          {activeView === "generator" ? (
            <div className="desktop-actions">{actionButtons}</div>
          ) : null}
        </div>
      </section>

      {activeView === "saved" ? (
        <section className="saved-view no-print">
          <label className="saved-search">
            Search saved invoices
            <input
              type="search"
              value={savedSearch}
              onChange={(event) => setSavedSearch(event.target.value)}
              placeholder="Invoice number, customer, phone, date, or item"
            />
          </label>
          {savedInvoices.length === 0 ? (
            <div className="empty-state">No saved invoices yet.</div>
          ) : filteredSavedInvoices.length === 0 ? (
            <div className="empty-state">No invoices match your search.</div>
          ) : (
            filteredSavedInvoices.map((savedInvoice) => (
              <article className="saved-card" key={savedInvoice.id}>
                <div>
                  <strong>
                    {savedInvoice.invoiceNumber || "Invoice without number"}
                  </strong>
                  <p>{savedInvoice.customerName || "No customer name"}</p>
                  <span>
                    {formatDate(savedInvoice.invoiceDate)} -{" "}
                    {new Date(savedInvoice.savedAt).toLocaleString("en-AU")}
                  </span>
                </div>
                <div className="saved-actions">
                  <button type="button" onClick={() => loadInvoice(savedInvoice)}>
                    Open
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => deleteInvoice(savedInvoice.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}

      {activeView === "settings" ? (
        <form className="settings-view no-print">
          <fieldset>
            <legend>Settings</legend>
            <div className="settings-grid">
              {settingsFields.map(({ field, label, type }) => (
                <label key={field}>
                  {label}
                  <input
                    type={type ?? "text"}
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" ? "0.1" : undefined}
                    value={settingsDraft[field] as string | number}
                    onChange={updateSettingsField(field)}
                    disabled={!settingsEditing}
                  />
                </label>
              ))}
            </div>
            <div className="settings-actions">
              {settingsEditing ? (
                <>
                  <button type="button" onClick={saveSettings}>
                    Update and save
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSettingsDraft(invoice);
                      setSettingsEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setSettingsEditing(true)}>
                  Edit
                </button>
              )}
            </div>
          </fieldset>
        </form>
      ) : null}

      {activeView === "generator" ? (
        <>
        <section className="workspace">
          <form className="editor no-print">
            <fieldset>
              <legend>Invoice details</legend>
              <div className="grid-two">
                <label>
                  Invoice no.
                  {(() => {
                    const error = fieldError("invoiceNumber");
                    return (
                      <>
                  <input
                    required
                    aria-invalid={Boolean(error)}
                    value={invoice.invoiceNumber}
                    onChange={updateField("invoiceNumber")}
                  />
                        {error ? <span className="field-error">{error}</span> : null}
                      </>
                    );
                  })()}
                </label>
                <label>
                  Invoice date
                  {(() => {
                    const error = fieldError("invoiceDate");
                    return (
                      <>
                  <input
                    required
                    aria-invalid={Boolean(error)}
                    type="date"
                    value={invoice.invoiceDate}
                    onChange={updateField("invoiceDate")}
                  />
                        {error ? <span className="field-error">{error}</span> : null}
                      </>
                    );
                  })()}
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Customer</legend>
              <label>
                Invoice to
                {(() => {
                  const error = fieldError("customerName");
                  return (
                    <>
                <input
                  required
                  aria-invalid={Boolean(error)}
                  value={invoice.customerName}
                  onChange={updateField("customerName")}
                />
                      {error ? <span className="field-error">{error}</span> : null}
                    </>
                  );
                })()}
              </label>
              <label>
                Phone
                <input
                  value={invoice.customerPhone}
                  onChange={updateField("customerPhone")}
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Items</legend>
              {invoice.items.map((item, index) => (
                <div className="item-editor" key={item.id}>
                  <div className="item-header">
                    <strong>Item {index + 1}</strong>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => removeItem(item.id)}
                      disabled={invoice.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  <label>
                    Description
                    {(() => {
                      const error = itemError(item, "description");
                      return (
                        <>
                    <textarea
                      required
                      aria-invalid={Boolean(error)}
                      rows={3}
                      value={item.description}
                      onChange={(event) =>
                        updateItem(item.id, "description", event.target.value)
                      }
                    />
                          {error ? <span className="field-error">{error}</span> : null}
                        </>
                      );
                    })()}
                  </label>
                  <div className="grid-two">
                    <label>
                      Quantity
                      {(() => {
                        const error = itemError(item, "quantity");
                        return (
                          <>
                      <input
                        required
                        aria-invalid={Boolean(error)}
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, "quantity", event.target.value)
                        }
                      />
                            {error ? (
                              <span className="field-error">{error}</span>
                            ) : null}
                          </>
                        );
                      })()}
                    </label>
                    <label>
                      Price
                      {(() => {
                        const error = itemError(item, "price");
                        return (
                          <>
                      <input
                        required
                        aria-invalid={Boolean(error)}
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(event) =>
                          updateItem(item.id, "price", event.target.value)
                        }
                      />
                            {error ? (
                              <span className="field-error">{error}</span>
                            ) : null}
                          </>
                        );
                      })()}
                    </label>
                  </div>
                </div>
              ))}
              <button type="button" className="add-button" onClick={addItem}>
                Add item
              </button>
            </fieldset>
          </form>

          <article className="invoice-page" id="invoice">
            <header className="invoice-header">
              <img
                className="invoice-logo"
                src="/beyond-bikes-logo-clean.png"
                alt={invoice.companyName}
              />
              <h2>{invoice.invoiceTitle}</h2>
            </header>

            <section className="invoice-meta">
              <div>
                <p className="section-label">INVOICE TO:</p>
                <p>{invoice.customerName}</p>
                <p>{invoice.customerPhone}</p>
              </div>
              <div className="invoice-numbers">
                <p>
                  Invoice No: <span>{invoice.invoiceNumber}</span>
                </p>
                <p>
                  Invoice Date: <span>{formatDate(invoice.invoiceDate)}</span>
                </p>
              </div>
            </section>

            <table className="line-table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{String(index + 1).padStart(2, "0")}</td>
                    <td>{item.description}</td>
                    <td>{formatMaybeQuantity(item.quantity)}</td>
                    <td>{formatMaybeCurrency(item.price)}</td>
                    <td>
                      {item.quantity === "" || item.price === ""
                        ? ""
                        : currency.format(
                            numericValue(item.quantity) * numericValue(item.price),
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <section className="totals-panel">
              <div>
                <span>Sub-total:</span>
                <strong>{currency.format(totals.subtotal)}</strong>
              </div>
              <div>
                <span>Tax included:</span>
                <strong>{currency.format(totals.tax)}</strong>
              </div>
              <div>
                <span>Total:</span>
                <strong>{currency.format(totals.total)}</strong>
              </div>
            </section>

            <section className="payment-row">
              <div className="payment-details">
                <p>
                  <span>Acc Name</span>
                  <b>:</b>
                  <strong>{invoice.accountName}</strong>
                </p>
                <p>
                  <span>BSB</span>
                  <b>:</b>
                  <strong>{invoice.bsb}</strong>
                </p>
                <p>
                  <span>Acc No.</span>
                  <b>:</b>
                  <strong>{invoice.accountNumber}</strong>
                </p>
              </div>
              <strong className="thanks-text">THANK YOU!</strong>
            </section>

            <footer className="invoice-footer">
              <div>
                <p>{invoice.companyPhone}</p>
                <p className="email">{invoice.email}</p>
                <p>{invoice.addressLine1}</p>
                <p>{invoice.addressLine2}</p>
              </div>
              <div>
                <p>ABN : {invoice.abn}</p>
                <p>{invoice.website}</p>
                <p>{invoice.note}</p>
              </div>
            </footer>
          </article>
        </section>
        <section className="mobile-actions no-print">{actionButtons}</section>
        </>
      ) : null}
    </main>
  );
}
