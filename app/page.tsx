import Link from "next/link";

const features = [
  {
    title: "Personalized Study Paths",
    description:
      "Generate adaptive weekly plans based on goals, learning style, and available study time."
  },
  {
    title: "Interactive AI Tutor",
    description:
      "Ask questions in natural language and get explanations with examples tailored to your level."
  },
  {
    title: "Progress Insights",
    description:
      "Track mastery by topic with clear analytics and actionable next-step recommendations."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-10 md:px-8 md:py-14">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="text-lg font-semibold tracking-tight">SmartLearn AI</div>
          <button className="rounded-lg border border-brand-400/50 bg-brand-500/20 px-4 py-2 text-sm font-medium text-brand-100 transition hover:bg-brand-500/30">
            Get Early Access
          </button>
        </header>

        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-brand-100">
              AI Smart Learning Assistant
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Learn faster with an assistant that adapts to you.
            </h1>
            <p className="max-w-xl text-base text-slate-300 md:text-lg">
              Turn goals into a focused learning system: personalized plans,
              instant tutor support, and measurable progress in one dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                Next &rarr;
              </Link>
              <button className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
                Watch Demo
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-brand-900/20">
            <p className="mb-4 text-sm font-medium text-slate-300">
              Today&apos;s Study Plan
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                08:00 PM - Review algebra fundamentals
              </li>
              <li className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                08:45 PM - AI quiz: 10 adaptive questions
              </li>
              <li className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                09:15 PM - Reflection + next-step recommendations
              </li>
            </ul>
          </div>
        </section>

        <section className="pb-16 md:pb-24">
          <h2 className="mb-6 text-2xl font-semibold text-white">Core Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <h3 className="mb-2 text-lg font-semibold text-slate-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-800 pt-6 text-sm text-slate-400">
          Built with Next.js, Tailwind CSS, and TypeScript.
        </footer>
      </div>
    </main>
  );
}
