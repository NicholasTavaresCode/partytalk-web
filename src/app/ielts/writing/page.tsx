"use client";

import { useMemo, useState } from "react";
import { Scissors, Copy, Clipboard } from "lucide-react";
import { useWritingTasks } from "@/lib/queries";
import { ExamShell } from "@/components/ielts/ExamShell";
import { RainfallChart } from "@/components/ielts/RainfallChart";
import { cn } from "@/lib/cn";

export default function WritingSimulatorPage() {
  const { data: tasks } = useWritingTasks();
  const [active, setActive] = useState<1 | 2>(1);
  const [essays, setEssays] = useState<Record<number, string>>({ 1: "", 2: "" });

  const task = tasks?.find((t) => t.id === active);
  const words = useMemo(() => {
    const text = essays[active].trim();
    return text ? text.split(/\s+/).length : 0;
  }, [essays, active]);

  if (!tasks || !task) return null;

  const tabs = (
    <div className="flex items-center gap-2">
      {tasks.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={cn(
            "flex h-10 w-14 flex-col items-center justify-center border transition-all",
            active === t.id
              ? "border-2 border-primary bg-tertiary-fixed text-on-tertiary-fixed"
              : "border border-outline bg-surface-container-low text-on-surface-variant hover:bg-primary hover:text-on-primary",
          )}
        >
          <span className="text-[10px] uppercase leading-tight opacity-70">Task</span>
          <span className="font-question-num text-question-num">{t.id}</span>
        </button>
      ))}
    </div>
  );

  return (
    <ExamShell
      moduleLabel="IELTS Writing"
      durationSeconds={3600}
      center={tabs}
      onBack={() => setActive(1)}
      onNext={() => setActive(2)}
      backDisabled={active === 1}
      nextLabel={active === 1 ? "Task 2" : "Submit"}
    >
      <div className="flex h-full flex-col bg-outline-variant lg:flex-row">
        {/* Left — prompt & chart */}
        <section className="exam-scroll flex flex-col gap-6 overflow-y-auto bg-surface-container-lowest p-gutter lg:h-full lg:w-1/2">
          <div className="border-b border-outline-variant pb-4">
            <h2 className="mb-2 font-headline-lg text-headline-lg text-primary">
              Writing {task.label}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              You should spend about {task.minutes} minutes on this task.
            </p>
          </div>

          <div>
            <p className="font-body-lg text-body-lg leading-relaxed text-on-surface">{task.prompt}</p>
            {task.emphasis && (
              <p className="mt-4 font-body-lg text-body-lg font-bold leading-relaxed text-on-surface">
                {task.emphasis}
              </p>
            )}
            <p className="mt-4 font-body-md text-body-md italic text-on-surface-variant">
              Write at least {task.minWords} words.
            </p>
          </div>

          {task.chart && (
            <div className="mt-2 border border-outline-variant bg-white p-4">
              <RainfallChart months={task.chart.months} series={task.chart.series} unit={task.chart.unit} />
              <p className="mt-2 text-center text-[12px] uppercase italic tracking-wider text-outline">
                {task.chart.caption}
              </p>
            </div>
          )}
          <div className="h-8 shrink-0" />
        </section>

        {/* Divider */}
        <div className="hidden h-full w-[2px] bg-outline-variant lg:block" />

        {/* Right — response area */}
        <section className="flex min-h-0 flex-1 flex-col bg-surface-container-low p-gutter lg:h-full lg:w-1/2">
          <div className="flex min-h-0 flex-1 flex-col border border-outline-variant bg-white">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container px-4 py-2 text-on-surface-variant">
              <span className="text-label-caps font-label-caps uppercase">Response Area</span>
              <div className="flex gap-4">
                <button aria-label="Cut" className="transition-colors hover:text-primary">
                  <Scissors className="h-[18px] w-[18px]" />
                </button>
                <button aria-label="Copy" className="transition-colors hover:text-primary">
                  <Copy className="h-[18px] w-[18px]" />
                </button>
                <button aria-label="Paste" className="transition-colors hover:text-primary">
                  <Clipboard className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>

            <textarea
              value={essays[active]}
              onChange={(e) => setEssays((p) => ({ ...p, [active]: e.target.value }))}
              spellCheck={false}
              placeholder="Type your essay here…"
              className="writing-area min-h-0 flex-1 resize-none border-none p-6 font-body-lg text-body-lg text-on-surface outline-none"
            />

            <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-4 py-2">
              <div className="text-label-caps font-label-caps uppercase text-on-surface-variant">
                WORD COUNT:{" "}
                <span className={cn("font-bold", words >= task.minWords ? "text-emerald-600" : "text-primary")}>
                  {words}
                </span>
                <span className="opacity-60"> / {task.minWords}</span>
              </div>
              <div className="text-label-caps font-label-caps uppercase text-on-surface-variant opacity-60">
                {task.label}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ExamShell>
  );
}
