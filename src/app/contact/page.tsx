"use client";

export default function ContactPage() {
  return (
    <section className="section-pad max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <form className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input type="text" className="mt-1 block w-full rounded-md border-gray-300" placeholder="Your name" required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input type="email" className="mt-1 block w-full rounded-md border-gray-300" placeholder="you@example.com" required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Message</span>
          <textarea className="mt-1 block w-full rounded-md border-gray-300" rows={5} placeholder="Your message" required />
        </label>
        <button type="submit" className="px-4 py-2 bg-primary text-background rounded-md hover:opacity-90">
          Send Message
        </button>
      </form>
    </section>
  );
}
