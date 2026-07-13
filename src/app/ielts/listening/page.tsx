"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleHelp, Info, LogOut, Play, Volume2, AudioLines, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useListeningTest } from "@/lib/queries";
import { ExamShell } from "@/components/ielts/ExamShell";
import { QuestionPalette } from "@/components/ielts/QuestionPalette";
import { cn } from "@/lib/cn";

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function AudioPlayer({ durationLabel, note }: { durationLabel: string; note: string }) {
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const [pct, setPct] = useState(0);

  // Parse "05:42" -> seconds for the elapsed readout.
  const totalSeconds = useMemo(() => {
    const [m, s] = durationLabel.split(":").map(Number);
    return m * 60 + s;
  }, [durationLabel]);

  useEffect(() => {
    if (state !== "playing") return;
    const id = setInterval(() => {
      setPct((p) => {
        if (p >= 100) {
          clearInterval(id);
          setState("done");
          return 100;
        }
        return p + 1;
      });
    }, 60);
    return () => clearInterval(id);
  }, [state]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-highest p-6">
      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:gap-6">
        <button
          onClick={() => state === "idle" && setState("playing")}
          disabled={state !== "idle"}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "idle" && (
            <>
              <Play className="h-5 w-5" /> PLAY AUDIO
            </>
          )}
          {state === "playing" && (
            <>
              <AudioLines className="h-5 w-5 animate-pulse" /> PLAYING…
            </>
          )}
          {state === "done" && (
            <>
              <CheckCircle2 className="h-5 w-5" /> FINISHED
            </>
          )}
        </button>

        <div className="flex flex-1 items-center gap-4">
          <span className="whitespace-nowrap text-xs font-bold text-on-surface-variant tabular-nums">
            {mmss((pct / 100) * totalSeconds)} / {durationLabel}
          </span>
          <div className="relative h-2 w-full overflow-hidden bg-surface-variant">
            <div className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-75" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex min-w-[150px] items-center gap-3">
          <Volume2 className="h-5 w-5 text-on-surface-variant" />
          <input type="range" min={0} max={100} defaultValue={80} className="h-1.5 w-full cursor-pointer accent-primary" />
        </div>
      </div>
      <p className="text-center text-[11px] font-label-caps uppercase italic tracking-widest text-on-surface-variant">
        {note}
      </p>
    </div>
  );
}

export default function ListeningSimulatorPage() {
  const { data } = useListeningTest();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(6);

  const answered = useMemo(() => {
    const base = new Set<number>(data?.answered ?? []);
    Object.keys(answers).forEach((n) => base.add(Number(n)));
    return Array.from(base);
  }, [answers, data?.answered]);

  if (!data) return null;
  const set = (n: number, v: string) =>
    setAnswers((p) => {
      const next = { ...p };
      if (v.trim()) next[n] = v;
      else delete next[n];
      return next;
    });

  return (
    <ExamShell
      moduleLabel="IELTS Listening"
      durationSeconds={1800}
      center={
        <QuestionPalette
          total={data.totalQuestions}
          current={current}
          answered={answered}
          onSelect={setCurrent}
        />
      }
      onBack={() => setCurrent((c) => Math.max(1, c - 1))}
      onNext={() => setCurrent((c) => Math.min(data.totalQuestions, c + 1))}
      backDisabled={current <= 1}
    >
      <div className="flex h-full">
        {/* Candidate sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container px-4 pt-8 lg:flex">
          <div className="mb-8 px-2">
            <h3 className="mb-2 text-label-caps font-label-caps uppercase text-primary">Candidate Profile</h3>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-primary-fixed font-bold text-primary">
                JD
              </div>
              <div>
                <p className="text-sm font-bold">Jane Doe</p>
                <p className="text-xs text-on-surface-variant">ID: 123456</p>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <button className="flex w-full items-center gap-3 px-3 py-2 text-label-caps font-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant">
              <CircleHelp className="h-5 w-5" /> HELP
            </button>
            <button className="flex w-full items-center gap-3 px-3 py-2 text-label-caps font-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant">
              <Info className="h-5 w-5" /> INFORMATION
            </button>
            <Link
              href="/ielts"
              className="mt-8 flex w-full items-center gap-3 px-3 py-2 text-label-caps font-label-caps text-error transition-colors hover:bg-error-container"
            >
              <LogOut className="h-5 w-5" /> FINISH TEST
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex min-h-0 flex-1 flex-col">
          <section className="shrink-0 border-b border-outline-variant bg-surface-container-low px-gutter py-6">
            <AudioPlayer durationLabel={data.audio.duration} note={data.audio.note} />
          </section>

          <section className="exam-scroll flex-1 overflow-y-auto bg-white">
            <div className="mx-auto max-w-4xl px-gutter py-8 pb-16">
              <div className="mb-10 border-b-2 border-primary-fixed pb-4">
                <h2 className="mb-1 font-headline-lg text-headline-lg text-primary">
                  PART {data.part}: {data.form.title ? `Questions 1-10` : ""}
                </h2>
                <p className="text-on-surface-variant">
                  {data.instructions.split("ONE WORD AND/OR A NUMBER")[0]}
                  <span className="font-bold text-on-surface">ONE WORD AND/OR A NUMBER</span>
                  {data.instructions.split("ONE WORD AND/OR A NUMBER")[1]}
                </p>
              </div>

              {/* Form */}
              <div className="mb-12 border border-outline-variant bg-surface-container-lowest p-6 sm:p-8">
                <h3 className="mb-8 border-b pb-4 text-center font-headline-md text-headline-md uppercase tracking-widest">
                  {data.form.title}
                </h3>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {data.form.fields.map((f) => (
                    <div key={f.n} className="flex flex-col gap-2">
                      <label className="text-label-caps font-label-caps uppercase text-on-surface-variant">
                        {f.n}. {f.label}
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">{f.n}.</span>
                        <input
                          onChange={(e) => set(f.n, e.target.value)}
                          placeholder={f.placeholder}
                          className="flex-grow border-b-2 border-outline bg-transparent px-2 py-1 font-body-lg text-body-lg outline-none transition-colors focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <table className="mt-8 w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container text-left">
                      {data.form.table.columns.map((c) => (
                        <th key={c} className="border border-outline-variant p-3 text-label-caps font-label-caps uppercase">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.form.table.rows.map((r, i) => (
                      <tr key={r.n} className={i % 2 === 1 ? "bg-surface-container-low" : undefined}>
                        <td className="border border-outline-variant p-4 font-bold">{r.item}</td>
                        <td className="border border-outline-variant p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{r.n}.</span>
                            <input
                              onChange={(e) => set(r.n, e.target.value)}
                              placeholder={r.placeholder}
                              className="w-full border-b border-outline py-1 outline-none transition-colors focus:border-primary"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MCQs */}
              <div>
                <h3 className="mb-2 font-headline-md text-headline-md text-primary">
                  Questions {data.mcqs[0].n}-{data.mcqs[0].n + 4}
                </h3>
                <p className="mb-8 text-on-surface-variant">
                  Choose the correct letter, <span className="font-bold">A, B or C</span>.
                </p>
                <div className="space-y-10">
                  {data.mcqs.map((q) => (
                    <div key={q.n}>
                      <p className="mb-4 font-body-lg text-body-lg">
                        <span className="mr-2 font-bold text-primary">{q.n}.</span>
                        {q.prompt}
                      </p>
                      <div className="ml-6 grid grid-cols-1 gap-3">
                        {q.options.map((o) => {
                          const selected = answers[q.n] === o.value;
                          return (
                            <label
                              key={o.value}
                              className={cn(
                                "group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                                selected
                                  ? "border-primary bg-primary-fixed/40"
                                  : "border-outline hover:bg-surface-container-low",
                              )}
                            >
                              <input
                                type="radio"
                                name={`q${q.n}`}
                                value={o.value}
                                checked={selected}
                                onChange={() => set(q.n, o.value)}
                                className="h-4 w-4 accent-primary"
                              />
                              <span className="text-on-surface group-hover:text-primary">
                                {o.value}. {o.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ExamShell>
  );
}
