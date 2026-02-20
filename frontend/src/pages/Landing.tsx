import { Link } from 'react-router-dom'
import { Mic, Brain, FileText, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Resume-Aware',
    description:
      'Upload your resume and get questions tailored to your specific experience and projects.',
  },
  {
    icon: Mic,
    title: 'Voice-Driven',
    description:
      'Speak naturally — our AI interviewer listens, understands, and responds in real-time.',
  },
  {
    icon: Brain,
    title: 'STAR Evaluation',
    description:
      'Every answer is evaluated on Situation, Task, Action, Result, and Communication.',
  },
  {
    icon: BarChart3,
    title: 'Detailed Scorecard',
    description:
      'Get actionable feedback with dimension breakdowns and improvement suggestions.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-gray-950 to-purple-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold">Intervue</span>
          </div>
          <Link to="/login" className="btn-secondary text-sm">
            Sign In
          </Link>
        </nav>

        <div className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-20 text-center lg:pt-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            AI-Powered Behavioral Interview Practice
          </div>

          <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight lg:text-7xl">
            Practice interviews
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              that know you
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 lg:text-xl">
            Upload your resume. Our AI reads it, crafts tailored behavioral
            questions, interviews you by voice, and delivers a detailed STAR
            framework scorecard.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/login" className="btn-primary px-8 py-3 text-base">
              Get Started — It's Free
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card group p-6 transition-colors hover:border-brand-600/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/10 text-brand-400 transition-colors group-hover:bg-brand-600/20">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="mb-12 text-center font-display text-3xl font-bold">
          How it works
        </h2>
        <div className="space-y-8">
          {[
            { step: '01', title: 'Upload your resume', desc: 'Drop your PDF and our AI extracts your experience, skills, and projects.' },
            { step: '02', title: 'Start the interview', desc: 'Choose a voice, and your AI interviewer begins asking tailored behavioral questions.' },
            { step: '03', title: 'Speak your answers', desc: 'Talk naturally — the AI listens, transcribes, and may ask follow-ups.' },
            { step: '04', title: 'Get your scorecard', desc: 'Receive detailed STAR-framework scoring with strengths and improvement areas.' },
          ].map((item) => (
            <div key={item.step} className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-500/30 font-mono text-sm font-semibold text-brand-400">
                {item.step}
              </div>
              <div>
                <h3 className="mb-1 font-display text-lg font-semibold">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-500">
        Built with FastAPI, React, and OpenAI — {new Date().getFullYear()}
      </footer>
    </div>
  )
}
