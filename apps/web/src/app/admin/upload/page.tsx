"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, XCircle, Loader } from "lucide-react";
import api from "@/lib/api";

interface UploadResult {
  uploaded: number;
  failed: number;
  resume_ids: number[];
  errors: string[];
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await api.post("/resumes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      });
      setResult(res.data);
      setFiles([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setResult({ uploaded: 0, failed: files.length, resume_ids: [], errors: [message] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Upload Resumes</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 text-zinc-400" size={40} />
        <p className="text-zinc-600 dark:text-zinc-400">
          {isDragActive ? "Drop files here..." : "Drag & drop PDF or DOCX files, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
          Supports .pdf and .docx formats
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </h2>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{file.name}</span>
                  <span className="text-xs text-zinc-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="text-zinc-400 hover:text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Processing resumes...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload & Process
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Upload Results</h2>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {result.uploaded} uploaded
              </span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-600" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {result.failed} failed
                </span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              {result.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600 dark:text-red-400">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
