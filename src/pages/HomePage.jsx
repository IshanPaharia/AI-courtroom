import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gavel, Users, MessageSquare, Award, Zap, Shield } from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Two Sides, One Truth',
    description: 'Plaintiff files the case, defendant responds. Structured rounds keep it fair.',
  },
  {
    icon: MessageSquare,
    title: 'Argue Your Case',
    description: 'Opening statements, rebuttals, and closing arguments. Make every word count.',
  },
  {
    icon: Gavel,
    title: 'AI Judge Decides',
    description: 'An AI judge reviews all arguments and delivers a binding (not really) verdict.',
  },
  {
    icon: Award,
    title: 'Any Compensation',
    description: 'Demand anything — snacks, favors, public apologies, the TV remote for a week.',
  },
  {
    icon: Zap,
    title: 'Judge Personas',
    description: 'Pick your judge: Strict, Chill, Drama Queen, or Pirate. Each has their own style.',
  },
  {
    icon: Shield,
    title: 'Objection System',
    description: 'Got 2 objection tokens. Use them wisely to counter your opponent out of turn.',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full py-8 text-center md:py-16"
      >
        <div className="card-brutal mx-auto max-w-2xl bg-court-gold text-court-ink border-court-ink">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-court-ink bg-court-ink shadow-brutal md:h-24 md:w-24"
          >
            <Gavel className="h-10 w-10 text-court-gold md:h-12 md:w-12" />
          </motion.div>

          <h1 className="mb-3 text-3xl font-black tracking-tight md:text-5xl">
            AI Courtroom
          </h1>
          <p className="mb-6 text-base font-medium text-court-ink/80 md:text-lg">
            Settle friendly disputes with an AI Judge. File a case, argue your side,
            and get a verdict — compensation included.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/new-case"
              className="btn-brutal bg-court-ink text-court-gold text-base w-full sm:w-auto border-court-ink"
            >
              <Gavel className="h-5 w-5" />
              File a Case
            </Link>
            <Link
              to="/dashboard"
              className="btn-brutal bg-court-card text-court-dark text-base w-full sm:w-auto"
            >
              View Cases
            </Link>
          </div>
        </div>
      </motion.section>

      {/* How it works */}
      <section className="w-full py-4 md:py-8">
        <h2 className="mb-6 text-center text-2xl font-black md:text-3xl">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['File a Case', 'Argue Your Side', 'Get the Verdict'].map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="card-brutal flex items-start gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-court-dark bg-court-gold font-black text-lg shadow-brutal-sm">
                {i + 1}
              </div>
              <div>
                <h3 className="font-bold">{step}</h3>
                <p className="mt-1 text-sm text-court-dark/70">
                  {i === 0 && 'Describe the conflict and what compensation you want.'}
                  {i === 1 && 'Both sides get 3 rounds to present their arguments.'}
                  {i === 2 && 'The AI Judge delivers the final verdict and compensation.'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="w-full py-4 md:py-8">
        <h2 className="mb-6 text-center text-2xl font-black md:text-3xl">Features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="card-brutal card-hover group"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-court-dark bg-court-gold-light shadow-brutal-sm group-hover:bg-court-gold transition-colors">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold">{feature.title}</h3>
              <p className="mt-1 text-sm text-court-dark/70">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-8 md:py-12">
        <div className="card-brutal bg-court-ink text-center border-court-ink">
          <h2 className="mb-3 text-2xl font-black text-court-gold md:text-3xl">
            Ready to Seek Justice?
          </h2>
          <p className="mb-6 text-white/70">
            It&apos;s time to settle that debate once and for all.
          </p>
          <Link
            to="/new-case"
            className="btn-brutal bg-court-gold text-court-dark text-base border-court-gold"
          >
            <Gavel className="h-5 w-5" />
            File Your First Case
          </Link>
        </div>
      </section>
    </div>
  );
}
