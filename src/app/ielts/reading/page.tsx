"use client";

import { useMemo, useState } from "react";
import { useReadingTest } from "@/lib/queries";
import { ExamShell } from "@/components/ielts/ExamShell";
import { QuestionPalette } from "@/components/ielts/QuestionPalette";

export default function ReadingSimulatorPage() {
  const { data } = useReadingTest();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(1);

  const answered = useMemo(() => Object.keys(answers).map(Number), [answers]);
  if (!data) return null;

  const setAnswer = (n: number, value: string) =>
    setAnswers((prev) => {
      const next = { ...prev };
      if (value) next[n] = value;
      else delete next[n];
      return next;
    });

  return (
    <ExamShell
      moduleLabel="IELTS Reading"
      durationSeconds={3600}
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
      <div className="exam-scroll flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left — passage */}
        <section className="exam-scroll border-b border-outline-variant bg-surface-container-lowest px-6 py-8 lg:h-full lg:w-1/2 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-12 lg:py-10">
          <article className="mx-auto max-w-2xl">
            <p className="mb-2 text-label-caps font-label-caps uppercase text-on-surface-variant">
              Reading Passage {data.passageNumber}
            </p>
            <h1 className="mb-6 font-headline-lg text-headline-lg text-on-surface">
              {data.passageTitle}
            </h1>
            <div className="space-y-6 font-body-lg text-body-lg leading-relaxed text-on-surface">
              {data.paragraphs.map((p) => (
                <p key={p.label} className="ielts-highlight">
                  <strong>Paragraph {p.label}:</strong> {p.text}
                </p>
              ))}
            </div>
          </article>
        </section>

        {/* Right — questions */}
        <section className="exam-scroll bg-surface-container px-6 py-8 lg:h-full lg:w-1/2 lg:overflow-y-auto lg:px-12 lg:py-10">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 inline-block rounded-sm bg-primary px-4 py-2 text-on-primary">
              <span className="text-label-caps font-label-caps uppercase">
                Reading Passage {data.passageNumber}: {data.questionRange}
              </span>
            </div>

            <h2 className="mb-4 font-headline-md text-headline-md">{data.questionRange}</h2>
            <p className="mb-6 font-body-md text-body-md text-on-surface-variant">
              {data.headingInstructions}
            </p>

            <div className="mb-8 border border-outline bg-surface-container-lowest p-6">
              <h3 className="mb-4 border-b border-outline-variant pb-2 font-bold">List of Headings</h3>
              <ul className="space-y-2 font-body-md text-body-md">
                {data.headings.map((h) => (
                  <li key={h.numeral}>
                    <strong className="mr-1">{h.numeral}</strong> {h.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {data.matches.map((m) => (
                <div key={m.n} className="flex items-center gap-4">
                  <span className="w-8 font-bold">{m.n}</span>
                  <span className="w-28 font-body-md">{m.paragraph}</span>
                  <select
                    value={answers[m.n] ?? ""}
                    onChange={(e) => setAnswer(m.n, e.target.value)}
                    className="w-32 rounded-sm border border-outline bg-white p-1.5 outline-none focus:border-primary"
                  >
                    <option value="">Select…</option>
                    {data.headings.map((h) => (
                      <option key={h.numeral} value={h.numeral}>
                        {h.numeral}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </ExamShell>
  );
}
