"use client";

import { useEffect, useRef, useState } from "react";
import type { Employee } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getRole } from "@/lib/api";
import { formatDateForInput } from "@/lib/utils";

// Operator cannot edit these fields
const OPERATOR_EXCLUDED_FIELDS = new Set(["NIP_BARU"]);

export default function EmployeeEditPage() {
  const params = useParams<{ nip: string }>();
  const router = useRouter();
  const nip = params.nip;
  const [data, setData] = useState<Employee | null>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<string>("");
  const successModalRef = useRef<HTMLDialogElement>(null);
  const errorModalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Validate NIP parameter
    if (!nip || nip.trim() === '') {
      setError("Parameter NIP tidak valid");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    setRole(getRole());

    async function load() {
      try {
        const json = await apiFetch<{ success: boolean; data: Employee }>(`/employees/${nip}`);
        if (!json.data) {
          setError("Data pegawai tidak ditemukan");
          return;
        }
        setData(json.data);
      } catch (err: any) {
        const errorMsg = err?.message || "Gagal memuat data pegawai";
        setError(errorMsg);
        // Don't set loading to false if it's a network error that might recover
        if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
          // Keep loading state for network errors
          return;
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [nip, router]);

  function canEditField(name: string): boolean {
    // induk_unit is always read-only (computed field)
    if (name === "induk_unit") return false;
    // Admin can edit all fields except induk
    if (role === "admin") return true;
    // Operator can edit all fields except NIP_BARU and induk
    if (role === "operator") return !OPERATOR_EXCLUDED_FIELDS.has(name);
    return false;
  }

  const readOnly = role === "user" || role === "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data || readOnly) return;

    setError("");
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const [key, value] of new FormData(e.currentTarget).entries()) {
        if (canEditField(key)) payload[key] = value;
      }

      await apiFetch(`/employees/${nip}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Show success modal
      setModalMessage("Data pegawai berhasil diperbarui!");
      setShowSuccessModal(true);
      successModalRef.current?.showModal();
    } catch (err: any) {
      let errorMsg = "Gagal menyimpan perubahan data pegawai";
      
      // Parse error message untuk memberikan info yang lebih spesifik
      const originalError = err.message || "";
      
      if (originalError.includes("fetch") || originalError.includes("network") || originalError.includes("Failed to fetch")) {
        errorMsg = "Gagal menyimpan: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else if (originalError.includes("validation") || originalError.includes("errors")) {
        // Error dari validasi backend
        errorMsg = `Gagal menyimpan: ${originalError}`;
      } else if (originalError.includes("401") || originalError.includes("Unauthorized")) {
        errorMsg = "Gagal menyimpan: Sesi Anda telah berakhir. Silakan login kembali.";
      } else if (originalError.includes("403") || originalError.includes("Forbidden")) {
        errorMsg = "Gagal menyimpan: Anda tidak memiliki izin untuk mengubah data ini.";
      } else if (originalError.includes("404") || originalError.includes("Not Found")) {
        errorMsg = "Gagal menyimpan: Data pegawai tidak ditemukan di server.";
      } else if (originalError.includes("422") || originalError.includes("Unprocessable")) {
        errorMsg = `Gagal menyimpan: ${originalError}`;
      } else if (originalError.includes("500") || originalError.includes("Internal Server Error")) {
        errorMsg = "Gagal menyimpan: Terjadi kesalahan pada server. Silakan coba lagi nanti.";
      } else if (originalError.includes("429") || originalError.includes("Too Many Requests")) {
        errorMsg = "Gagal menyimpan: Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.";
      } else if (originalError.trim() !== "") {
        // Gunakan pesan error dari server jika ada
        errorMsg = `Gagal menyimpan: ${originalError}`;
      }
      
      setError(errorMsg);
      // Show error modal
      setModalMessage(errorMsg);
      setShowErrorModal(true);
      errorModalRef.current?.showModal();
    } finally {
      setSaving(false);
    }
  }

  function handleSuccessModalClose() {
    setShowSuccessModal(false);
    successModalRef.current?.close();
    router.replace(`/employees`);
  }

  function handleErrorModalClose() {
    setShowErrorModal(false);
    errorModalRef.current?.close();
  }

  if (loading)
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  if (error && !data)
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
        <a href="/employees" className="btn btn-primary mt-4">
          Kembali ke Daftar
        </a>
      </div>
    );

  // Safety check: if no data after loading, show error
  if (!data && !loading) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Data pegawai tidak ditemukan untuk NIP: {nip}</span>
        </div>
        <a href="/employees" className="btn btn-primary mt-4">
          Kembali ke Daftar
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="breadcrumbs text-sm mb-2">
              <ul>
                <li>
                  <a href="/employees">Daftar Pegawai</a>
                </li>
                <li>Edit - {data?.NAMA_LENGKAP || nip}</li>
              </ul>
            </div>
            <h1 className="text-3xl font-bold">Edit Data Pegawai</h1>
            <p className="text-sm opacity-70 mt-1">Perbarui informasi data pegawai</p>
          </div>
          <a className="btn btn-outline" href="/employees">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Kembali
          </a>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* Identitas Pokok */}
        <fieldset className="fieldset mb-4 border border-base-300 rounded-lg p-6 bg-base-100">
          <legend className="fieldset-legend text-xl font-bold px-2">Identitas Pokok</legend>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">NIP Lama</span>
              </label>
              <input
                name="NIP"
                type="text"
                defaultValue={data?.NIP || ""}
                placeholder="NIP Lama"
                disabled={!canEditField("NIP") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">NIP Baru</span>
              </label>
              <input
                name="NIP_BARU"
                type="text"
                defaultValue={data?.NIP_BARU || ""}
                placeholder="NIP Baru"
                disabled={!canEditField("NIP_BARU") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Nama Lengkap</span>
              </label>
              <input
                name="NAMA_LENGKAP"
                type="text"
                defaultValue={data?.NAMA_LENGKAP || ""}
                placeholder="Nama lengkap"
                disabled={!canEditField("NAMA_LENGKAP") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Tempat Lahir</span>
              </label>
              <input
                name="TEMPAT_LAHIR"
                type="text"
                defaultValue={data?.TEMPAT_LAHIR || ""}
                placeholder="Tempat lahir"
                disabled={!canEditField("TEMPAT_LAHIR") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Tanggal Lahir</span>
              </label>
              <input
                name="TGL_LAHIR"
                type="date"
                defaultValue={formatDateForInput(data?.TGL_LAHIR)}
                disabled={!canEditField("TGL_LAHIR") || readOnly}
                className="input input-bordered"
              />
            </div>
          </div>
        </fieldset>

        {/* Pangkat & Golongan */}
        <fieldset className="fieldset mb-4 border border-base-300 rounded-lg p-6 bg-base-100">
          <legend className="fieldset-legend text-xl font-bold px-2">Pangkat & Golongan</legend>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kode Pangkat</span>
              </label>
              <input
                name="KODE_PANGKAT"
                type="text"
                defaultValue={data?.KODE_PANGKAT || ""}
                placeholder="IIIc"
                disabled={!canEditField("KODE_PANGKAT") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Gol Ruang</span>
              </label>
              <input
                name="GOL_RUANG"
                type="text"
                defaultValue={data?.GOL_RUANG || ""}
                placeholder="Penata Tingkat I"
                disabled={!canEditField("GOL_RUANG") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Pangkat ASN</span>
              </label>
              <input
                name="pangkat_asn"
                type="text"
                defaultValue={data?.pangkat_asn || ""}
                placeholder="Penata Muda"
                disabled={!canEditField("pangkat_asn") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">TMT Pangkat</span>
              </label>
              <input
                name="TMT_PANGKAT"
                type="date"
                defaultValue={formatDateForInput(data?.TMT_PANGKAT)}
                disabled={!canEditField("TMT_PANGKAT") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Masa Kerja (Tahun)</span>
              </label>
              <input
                name="MK_TAHUN"
                type="number"
                defaultValue={data?.MK_TAHUN || ""}
                placeholder="0"
                disabled={!canEditField("MK_TAHUN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Masa Kerja (Bulan)</span>
              </label>
              <input
                name="MK_BULAN"
                type="number"
                defaultValue={data?.MK_BULAN || ""}
                placeholder="0"
                disabled={!canEditField("MK_BULAN") || readOnly}
                className="input input-bordered"
              />
            </div>
          </div>
        </fieldset>

        {/* Jabatan & Unit Kerja */}
        <fieldset className="fieldset mb-4 border border-base-300 rounded-lg p-6 bg-base-100">
          <legend className="fieldset-legend text-xl font-bold px-2">Jabatan & Unit Kerja</legend>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kode Satuan Kerja</span>
              </label>
              <input
                name="KODE_SATUAN_KERJA"
                type="text"
                defaultValue={data?.KODE_SATUAN_KERJA || ""}
                placeholder="Kode Satuan Kerja"
                disabled={!canEditField("KODE_SATUAN_KERJA") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Satuan Kerja</span>
              </label>
              <input
                name="SATUAN_KERJA"
                type="text"
                defaultValue={data?.SATUAN_KERJA || ""}
                placeholder="Satuan Kerja"
                disabled={!canEditField("SATUAN_KERJA") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kode Jabatan</span>
              </label>
              <input
                name="KODE_JABATAN"
                type="text"
                defaultValue={data?.KODE_JABATAN || ""}
                placeholder="Kode Jabatan"
                disabled={!canEditField("KODE_JABATAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">TMT Jabatan</span>
              </label>
              <input
                name="TMT_JABATAN"
                type="date"
                defaultValue={formatDateForInput(data?.TMT_JABATAN)}
                disabled={!canEditField("TMT_JABATAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Keterangan Jabatan</span>
              </label>
              <input
                name="KET_JABATAN"
                type="text"
                defaultValue={data?.KET_JABATAN || ""}
                placeholder="Keterangan Jabatan"
                disabled={!canEditField("KET_JABATAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">ISI Unit Kerja</span>
              </label>
              <input
                name="ISI_UNIT_KERJA"
                type="text"
                defaultValue={data?.ISI_UNIT_KERJA || ""}
                placeholder="Unit Kerja Detail"
                disabled={!canEditField("ISI_UNIT_KERJA") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kabupaten/Kota</span>
              </label>
              <input
                name="kab_kota"
                type="text"
                defaultValue={data?.kab_kota || ""}
                placeholder="Kabupaten/Kota"
                disabled={!canEditField("kab_kota") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  Induk Unit <span className="text-xs text-warning">(Otomatis)</span>
                </span>
              </label>
              <input
                type="text"
                value={data?.induk_unit || "-"}
                disabled
                className="input input-bordered input-disabled bg-base-200"
              />
            </div>
          </div>
        </fieldset>

        {/* Pendidikan */}
        <fieldset className="fieldset mb-4 border border-base-300 rounded-lg p-6 bg-base-100">
          <legend className="fieldset-legend text-xl font-bold px-2">Pendidikan</legend>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Nama Sekolah</span>
              </label>
              <input
                name="NAMA_SEKOLAH"
                type="text"
                defaultValue={data?.NAMA_SEKOLAH || ""}
                placeholder="Nama Sekolah"
                disabled={!canEditField("NAMA_SEKOLAH") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kode Jenjang</span>
              </label>
              <input
                name="KODE_JENJANG_PENDIDIKAN"
                type="text"
                defaultValue={data?.KODE_JENJANG_PENDIDIKAN || ""}
                placeholder="Kode Jenjang"
                disabled={!canEditField("KODE_JENJANG_PENDIDIKAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Jenjang Pendidikan</span>
              </label>
              <input
                name="JENJANG_PENDIDIKAN"
                type="text"
                defaultValue={data?.JENJANG_PENDIDIKAN || ""}
                placeholder="S1, S2, dll"
                disabled={!canEditField("JENJANG_PENDIDIKAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Fakultas</span>
              </label>
              <input
                name="FAKULTAS_PENDIDIKAN"
                type="text"
                defaultValue={data?.FAKULTAS_PENDIDIKAN || ""}
                placeholder="Fakultas"
                disabled={!canEditField("FAKULTAS_PENDIDIKAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Jurusan</span>
              </label>
              <input
                name="JURUSAN"
                type="text"
                defaultValue={data?.JURUSAN || ""}
                placeholder="Jurusan"
                disabled={!canEditField("JURUSAN") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Tahun Lulus</span>
              </label>
              <input
                name="TAHUN_LULUS"
                type="number"
                defaultValue={data?.TAHUN_LULUS || ""}
                placeholder="2010"
                disabled={!canEditField("TAHUN_LULUS") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">AKTA</span>
              </label>
              <input
                name="AKTA"
                type="text"
                defaultValue={data?.AKTA || ""}
                placeholder="AKTA"
                disabled={!canEditField("AKTA") || readOnly}
                className="input input-bordered"
              />
            </div>
          </div>
        </fieldset>

        {/* Status & Pengangkatan */}
        <fieldset className="fieldset mb-6 border border-base-300 rounded-lg p-6 bg-base-100">
          <legend className="fieldset-legend text-xl font-bold px-2">Status & Pengangkatan</legend>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">TMT CPNS</span>
              </label>
              <input
                name="tmt_cpns"
                type="date"
                defaultValue={formatDateForInput(data?.tmt_cpns)}
                disabled={!canEditField("tmt_cpns") || readOnly}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">TMT Pensiun</span>
              </label>
              <input
                name="TMT_PENSIUN"
                type="date"
                defaultValue={formatDateForInput(data?.TMT_PENSIUN)}
                disabled={!canEditField("TMT_PENSIUN") || readOnly}
                className="input input-bordered"
              />
            </div>
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 p-4 bg-base-100 rounded-lg border border-base-300 shadow-lg">
          <div className="text-sm opacity-70">
            {role === "admin" && <span className="badge badge-primary">Admin - Akses Lengkap</span>}
            {role === "operator" && <span className="badge badge-secondary">Operator - Terbatas</span>}
            {readOnly && <span className="badge badge-warning">Read Only</span>}
          </div>
          <div className="flex gap-3">
            <a className="btn btn-outline" href="/employees">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Kembali
            </a>
            <button className="btn btn-primary" disabled={readOnly || saving}>
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                  </svg>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <dialog ref={successModalRef} className="modal">
        <div className="modal-box">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-success">Update data Berhasil!</h3>
          </div>
          <p className="py-4 text-base-content">{modalMessage}</p>
          <div className="modal-action">
            <button className="btn btn-success" onClick={handleSuccessModalClose}>
              OK
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleSuccessModalClose}>close</button>
        </form>
      </dialog>

      {/* Error Modal */}
      <dialog ref={errorModalRef} className="modal">
        <div className="modal-box">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-error">Gagal!</h3>
          </div>
          <p className="py-4 text-base-content">{modalMessage}</p>
          <div className="modal-action">
            <button className="btn btn-error" onClick={handleErrorModalClose}>
              Tutup
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleErrorModalClose}>close</button>
        </form>
      </dialog>
    </div>
  );
}
