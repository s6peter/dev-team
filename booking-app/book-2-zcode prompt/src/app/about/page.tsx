import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors, Award, Heart, Users } from "lucide-react";

const stats = [
  { label: "Years Experience", value: "10+" },
  { label: "Happy Clients", value: "500+" },
  { label: "Styles Created", value: "1000+" },
  { label: "5-Star Reviews", value: "200+" },
];

const values = [
  {
    icon: Scissors,
    title: "Expert Craftsmanship",
    description:
      "Every braid is crafted with precision and care, ensuring a flawless finish that lasts.",
  },
  {
    icon: Heart,
    title: "Client Satisfaction",
    description:
      "Your happiness is our priority. We work with you to achieve the look you desire.",
  },
  {
    icon: Award,
    title: "Quality Products",
    description:
      "We use only premium hair products and tools to keep your hair healthy and beautiful.",
  },
  {
    icon: Users,
    title: "Welcoming Environment",
    description:
      "Relax and enjoy your experience in our comfortable, clean, and welcoming studio.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                About QueenG Braids
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Passionate about creating beautiful protective styles that
                enhance your natural beauty.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight">Our Story</h2>
              <div className="mt-6 space-y-6 text-muted-foreground">
                <p>
                  QueenG Braids & Essentials was founded with a simple mission:
                  to provide high-quality braiding services in a welcoming and
                  professional environment. With over 10 years of experience,
                  we specialize in creating beautiful, long-lasting protective
                  styles that enhance your natural beauty.
                </p>
                <p>
                  Our founder, QueenG, started braiding at a young age and
                  developed a passion for creating unique styles that make
                  people feel confident and beautiful. What started as a hobby
                  has grown into a thriving business, serving hundreds of
                  satisfied clients.
                </p>
                <p>
                  We believe that everyone deserves to feel beautiful, and our
                  mission is to help you achieve that through expert braiding
                  services. Whether you&apos;re looking for classic box braids,
                  intricate cornrows, or trendy knotless braids, we have the
                  skills and experience to bring your vision to life.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-24 sm:py-32 bg-accent/50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                By the Numbers
              </h2>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Our Values</h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                What drives us every day
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
              {values.map((value) => (
                <Card key={value.title}>
                  <CardContent className="p-8">
                    <value.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">{value.title}</h3>
                    <p className="mt-3 text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
