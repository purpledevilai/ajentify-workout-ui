import Link from 'next/link';
import { Dumbbell, Mic, Brain, Calendar, TrendingUp, ArrowRight, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-9">
              <Dumbbell className="size-4 sm:size-5" />
            </div>
            <span className="text-base font-bold sm:text-lg">Ajentify Workout</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
        <div className="absolute top-1/2 left-1/2 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="size-3.5" />
            AI-Powered Personal Training
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Your AI{' '}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent">
              Personal Trainer
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Talk to your trainer naturally, get personalized workout plans, and track every rep.
            Voice-first training that adapts to you.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border bg-background px-8 text-base font-medium hover:bg-muted transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to train smarter
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powered by AI, designed for results.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Mic className="size-6" />}
              title="Voice AI Trainer"
              description="Speak naturally with your AI trainer. Describe your goals, ask for modifications, get coached in real-time."
              gradient="from-violet-500/10 to-purple-500/10"
              iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <FeatureCard
              icon={<Brain className="size-6" />}
              title="Personalized Plans"
              description="Your trainer creates workout plans tailored to your experience, equipment, injuries, and goals."
              gradient="from-blue-500/10 to-cyan-500/10"
              iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <FeatureCard
              icon={<Calendar className="size-6" />}
              title="Daily Workouts"
              description="Get structured daily workouts with exercises, sets, reps, and rest periods all planned out."
              gradient="from-emerald-500/10 to-green-500/10"
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <FeatureCard
              icon={<TrendingUp className="size-6" />}
              title="Progress Tracking"
              description="Log every set, track your progress over time, and let your trainer adjust your plan based on results."
              gradient="from-orange-500/10 to-amber-500/10"
              iconBg="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-violet-600 p-12 text-center text-white md:p-20">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_transparent_50%,_rgba(0,0,0,0.15)_100%)]" />
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Ready to transform your training?
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Start talking to your AI trainer today. No credit card required.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-primary shadow-lg hover:bg-white/90 transition-all"
              >
                Get Started Free
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="size-4" />
            Ajentify Workout
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Ajentify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
  iconBg,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
}) {
  return (
    <div className={`group relative rounded-2xl border bg-gradient-to-br ${gradient} p-6 transition-all hover:shadow-md hover:border-primary/20`}>
      <div className={`mb-4 flex size-12 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
