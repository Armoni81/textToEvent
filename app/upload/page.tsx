"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";

type CsvRow = {
  name?: string;
  phone?: string;
  party_size?: string;
  tag?: string;
};

function UploadForm() {
  const [status, setStatus] = useState<string>("");
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  function parseFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus("Please upload a .csv file.");
      return;
    }

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5));
        setStatus(
          `Parsed ${results.data.length} rows. Review below, then send them to the ledger.`
        );
        (window as any).__parsedGuests = results.data;
      },
      error: (err) => {
        setStatus(`Parse error: ${err.message}`);
      },
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleImport() {
    const rows: CsvRow[] = (window as any).__parsedGuests || [];
    if (rows.length === 0) {
      setStatus("No parsed rows to import — upload a CSV first.");
      return;
    }

    const formatted = rows
      .filter((r) => r.name && r.phone)
      .map((r) => ({
        name: r.name!.trim(),
        phone: r.phone!.trim(),
        party_size: r.party_size ? parseInt(r.party_size, 10) || 1 : 1,
        tag: r.tag?.trim() || null,
        rsvp_status: "pending",
      }));

    setStatus(`Importing ${formatted.length} guests...`);

    // user_id is filled in automatically by the database (default auth.uid())
    const { error } = await supabase.from("guests").insert(formatted);

    if (error) {
      setStatus(`Import failed: ${error.message}`);
    } else {
      setStatus(`Imported ${formatted.length} guests successfully.`);
      router.push("/");
    }
  }

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-1">Start new threads</h1>
      <p className="text-sm opacity-60 mb-8">
        Upload a CSV with columns{" "}
        <span className="font-mono">name, phone, party_size, tag</span>. Only
        name and phone are required.
      </p>

      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition hover:opacity-80"
        style={{
          borderColor: isDragging ? "var(--violet)" : "var(--cloud-line)",
          backgroundColor: isDragging ? "var(--cloud)" : "var(--card)",
        }}
      >
        <span className="text-3xl">💌</span>
        <span className="font-semibold">
          {isDragging ? "Drop it!" : "Choose a CSV file"}
        </span>
        <span className="text-xs opacity-50">or drag one here</span>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>

      {preview.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-semibold mb-3">Preview</p>
          <div className="flex flex-col gap-2">
            {preview.map((row, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 flex items-center justify-between text-sm"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--cloud-line)",
                }}
              >
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="font-mono text-xs opacity-50">{row.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.tag && (
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--cloud)",
                        color: "var(--violet-dark)",
                      }}
                    >
                      {row.tag}
                    </span>
                  )}
                  <span className="text-xs font-mono opacity-40">
                    party of {row.party_size || "1"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <button
          onClick={handleImport}
          className="mt-6 px-5 py-2.5 rounded-full text-white font-semibold text-sm"
          style={{ backgroundColor: "var(--violet)" }}
        >
          Add to the ledger →
        </button>
      )}

      {status && <p className="mt-4 text-sm opacity-70">{status}</p>}
    </main>
  );
}

export default function UploadPage() {
  return (
    <AuthGate>
      <UploadForm />
    </AuthGate>
  );
}
