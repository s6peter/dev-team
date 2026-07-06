import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Scissors,
  Star,
  Clock,
  Shield,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

const services = [
  {
    name: "Box Braids",
    description: "Classic box braids in various sizes and lengths",
    price: "From $160",
    duration: "3-5 hours",
  },
  {
    name: "Knotless Braids",
    description: "Gentle knotless braids for a natural look",
    price: "From $130",
    duration: "3-5 hours",
  },
  {
    name: "BOHO Knotless",
    description: "Knotless braids with boho curls",
    price: "From $150",
    duration: "3-5 hours",
  },
  {
    name: "Cornrows",
    description: "Traditional cornrows, feed-ins, tribal braids, and lemonade styles",
    price: "From $60",
    duration: "2-4 hours",
  },
  {
    name: "Twists",
    description: "Havana, Senegalese, Passion, or Island twists",
    price: "From $140",
    duration: "3-5 hours",
  },
  {
    name: "Crochet Braids",
    description: "Crochet installs with various bases and hair textures",
    price: "From $120",
    duration: "2-4 hours",
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    rating: 5,
    comment:
      "Amazing work! QueenG took her time and made sure everything was perfect. My box braids have never looked better!",
  },
  {
    name: "Ashley T.",
    rating: 5,
    comment:
      "Best braiding experience I've ever had. Professional, clean, and my hair looks incredible. Will definitely be back!",
  },
  {
    name: "Jasmine R.",
    rating: 5,
    comment:
      "Love my knotless braids! QueenG was so patient and made sure I was comfortable throughout the whole process.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Professional Braiding
              <span className="text-primary"> Services</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Creating beautiful, long-lasting protective styles that enhance
              your natural beauty. Book your appointment today and experience
              the QueenG difference.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/book">
                <Button size="lg" className="text-base">
                  Book Appointment
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline" size="lg" className="text-base">
                  View Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose QueenG Braids?
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              We provide a premium braiding experience with attention to detail
              and customer satisfaction.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7">
                  <Scissors className="h-5 w-5 text-primary" />
                  Expert Craftsmanship
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    With over 10 years of experience, QueenG delivers flawless
                    braids that look natural and last longer.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7">
                  <Shield className="h-5 w-5 text-primary" />
                  Premium Quality
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    We use only high-quality hair products and tools to ensure
                    your hair stays healthy and beautiful.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7">
                  <Clock className="h-5 w-5 text-primary" />
                  Convenient Booking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    Easy online booking with flexible scheduling. Choose your
                    service, pick a time, and secure your spot with a deposit.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 sm:py-32 bg-accent/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Our Services
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Choose from our wide range of professional braiding services.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.name} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground flex-1">
                    {service.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      {service.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {service.duration}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/services">
              <Button variant="outline">View All Services</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What Our Clients Say
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    &ldquo;{testimonial.comment}&rdquo;
                  </p>
                  <p className="mt-4 text-sm font-medium">
                    {testimonial.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-primary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-primary-foreground">
              Ready to Transform Your Look?
            </h2>
            <p className="mt-6 text-lg leading-8 text-primary-foreground/80">
              Book your appointment today and let QueenG create the perfect
              protective style for you.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/book">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-base"
                >
                  Book Now
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Visit Us
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
            <div>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <MapPin className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      4909 Beaver Creek Ave, Denton, TX 76207
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a
                      href="tel:+19016311481"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      (901) 631-1481
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a
                      href="mailto:queengbraids@gmail.com"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      queengbraids@gmail.com
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="font-medium mb-4">Hours</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">Monday - Friday</p>
                  <p>4:00 PM - 8:00 PM</p>
                  <p className="text-muted-foreground">Saturday</p>
                  <p>7:00 AM - 8:00 PM</p>
                  <p className="text-muted-foreground">Sunday</p>
                  <p>1:00 PM - 8:00 PM</p>
                </div>
              </div>
            </div>
            <div className="h-96 rounded-lg overflow-hidden bg-muted">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3354.1234567890123!2d-96.7969!3d32.7767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDQ2JzM2LjEiTiA5NsKwNDcnNDguOCJX!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
