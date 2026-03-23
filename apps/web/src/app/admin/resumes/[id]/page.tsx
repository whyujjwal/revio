"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader, Mail, Phone, MapPin, Briefcase, GraduationCap } from "lucide-react";
import api from "@/lib/api";

interface ResumeDetail {
  id: number;
  original_filename: string;
  candidate_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[] | null;
  experience_years: number | null;
  experience_json: string | null;
  education_json: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  year: string;
}

export default function ResumeDetailPage() {
  const params = useParams();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/resumes/${params.id}`)
      .then((res) => setResume(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-zinc-400" size={24} />
      </div>
    );
  }

  if (!resume) return <p className="text-zinc-500">Resume not found.</p>;

  let experience: Experience[] = [];
  let education: Education[] = [];
  try {
    if (resume.experience_json) experience = JSON.parse(resume.experience_json);
  } catch { /* ignore */ }
  try {
    if (resume.education_json) education = JSON.parse(resume.education_json);
  } catch { /* ignore */ }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/resumes"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <ArrowLeft size={14} /> Back to resumes
      </Link>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {resume.candidate_name || resume.original_filename}
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            {resume.email && (
              <span className="flex items-center gap-1"><Mail size={14} />{resume.email}</span>
            )}
            {resume.phone && (
              <span className="flex items-center gap-1"><Phone size={14} />{resume.phone}</span>
            )}
            {resume.location && (
              <span className="flex items-center gap-1"><MapPin size={14} />{resume.location}</span>
            )}
            {resume.experience_years && (
              <span className="flex items-center gap-1">
                <Briefcase size={14} />{resume.experience_years} years experience
              </span>
            )}
          </div>
        </div>

        {resume.summary && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Summary</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{resume.summary}</p>
          </div>
        )}

        {resume.skills && resume.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {experience.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-1">
              <Briefcase size={14} /> Experience
            </h2>
            <div className="space-y-3">
              {experience.map((exp, i) => (
                <div key={i} className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
                  <p className="font-medium text-zinc-900 dark:text-white text-sm">{exp.role}</p>
                  <p className="text-sm text-zinc-500">{exp.company} &middot; {exp.duration}</p>
                  {exp.description && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-1">
              <GraduationCap size={14} /> Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, i) => (
                <div key={i} className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
                  <p className="font-medium text-zinc-900 dark:text-white text-sm">{edu.degree}</p>
                  <p className="text-sm text-zinc-500">{edu.institution} &middot; {edu.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {resume.error_message && (
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{resume.error_message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
