export default function AboutPage() {
  return (
    <main className="min-h-screen bg-charcoal-900 py-12 px-4 pt-28 sm:pt-32">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-center">
          About Us
        </h1>
        <p className="text-xl text-gray-400 text-center mb-16">
          Premium beard care for men who demand excellence
        </p>

        <div className="space-y-16">
          <section className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-wood-500">
              Our Mission
            </h2>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              We craft premium beard care products that deliver real results. No
              gimmicks. No shortcuts. Just quality ingredients and proven
              formulations for men who take grooming seriously.
            </p>
          </section>

          <section className="bg-charcoal-800 border border-charcoal-700 p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-wood-500">
              What We Stand For
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Quality First
                </h3>
                <p>Premium natural ingredients in every product</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Real Results
                </h3>
                <p>Formulations that actually work, not empty promises</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  No Compromise
                </h3>
                <p>Professional-grade care at accessible prices</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Built for Men
                </h3>
                <p>Products designed for the modern gentleman</p>
              </div>
            </div>
          </section>

          <div className="text-center pt-8">
            <a
              href="/shop"
              className="inline-block bg-wood-500 hover:bg-wood-600 text-white font-semibold px-12 py-4 text-lg transition-colors"
            >
              Shop Our Products
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
