import React from 'react';

export default function TermsPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          The Million Pixel Grid
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm font-semibold border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition"
        >
          ← Back to Grid
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 text-gray-300">

        {/* Title */}
        <div className="mb-12">
          <div className="text-xs font-bold tracking-widest text-cyan-500 uppercase mb-4">Legal & Info</div>
          <h1 className="text-4xl font-black text-white mb-4 leading-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-gray-500 text-sm">Last updated: February 2026</p>
        </div>

        {/* Art Project Notice — most prominent */}
        <div className="mb-10 p-6 rounded-2xl border-2 border-cyan-500/40 bg-cyan-950/20">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎨</div>
            <div>
              <h2 className="text-xl font-bold text-cyan-300 mb-2">This is an Art Project</h2>
              <p className="text-gray-300 leading-relaxed">
                The Million Pixel Grid is an independent, non-commercial collaborative digital art project.
                It is not a business, investment, product, or financial instrument of any kind.
                The goal is simple: to fill a 1,000 × 1,000 pixel canvas — one pixel at a time —
                through the collective participation of people from around the world, creating
                a piece of internet history worth <span className="text-white font-bold">£1,000,000</span> in combined contributions.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">01</span>
              What You Are Paying For
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                When you purchase one or more pixels, you are making a <span className="text-white">voluntary contribution</span> to
                a collaborative art project. Each pixel costs <span className="text-white font-bold">£1 GBP</span>.
              </p>
              <p>
                In return, your selected pixel(s) will be permanently displayed on the grid in your chosen colour,
                optionally linked to a URL of your choosing. Your pixel becomes part of the final artwork.
              </p>
              <p>
                You are <span className="text-white">not</span> purchasing a physical product, a digital asset, an NFT,
                a share, a financial return, or any form of ownership over the project itself.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">02</span>
              Permanence &amp; Display
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                Once your payment is confirmed, your pixel(s) are assigned permanently. They will remain on
                the grid for as long as the project is online.
              </p>
              <p>
                The project creator reserves the right to remove pixels that display content that is illegal
                under the laws of England and Wales — without refund. Beyond this, no restrictions are placed
                on colour, imagery, or linked content.{' '}
                <span className="text-white italic">Art should not conform to societal standards.</span>
              </p>
              <p>
                Links attached to pixels must not point to phishing, malware, or otherwise illegal destinations.
                All other links are permitted without restriction.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">03</span>
              Payments &amp; Refunds
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                All payments are processed securely via Flutterwave (card / mobile money) or PayPal.
                Crypto payments are accepted with manual verification.
              </p>
              <p>
                All prices are in <span className="text-white font-bold">British Pounds Sterling (£ GBP)</span>.
                International buyers will be charged in GBP; your card provider or PayPal
                will apply their own exchange rate.
              </p>
              <p>
                <span className="text-white font-semibold">All sales are final.</span> Due to the nature
                of this project — pixels are immediately reserved and displayed upon confirmed payment —
                we are unable to offer refunds once a transaction is complete.
              </p>
              <p>
                If a technical error results in a duplicate charge or a pixel not being assigned correctly,
                please contact us and we will resolve it.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">04</span>
              Tax &amp; VAT
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                This project is operated as a personal art project, not a registered business.
                It is currently <span className="text-white">below the UK VAT registration threshold</span> and
                therefore does not charge or collect VAT.
              </p>
              <p>
                Participants are responsible for understanding any tax implications in their own jurisdiction.
                The price you pay is the price displayed — <span className="text-white font-bold">£1 per pixel</span>,
                with no hidden fees added by us.
              </p>
              <p>
                Payment processors (Flutterwave, PayPal) may apply their own transaction fees,
                which are borne by the buyer where applicable.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">05</span>
              Intellectual Property
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                By purchasing a pixel you grant the project the right to display your chosen colour and link
                as part of the collective artwork. You retain no copyright claim over the overall canvas.
              </p>
              <p>
                The concept, design, and codebase of The Million Pixel Grid belong to the project creator.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">06</span>
              Limitation of Liability
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                This project is provided as-is. The creator makes no guarantees about uptime, longevity,
                or the final value of the completed artwork.
              </p>
              <p>
                The creator shall not be liable for any indirect, incidental, or consequential damages
                arising from participation in this project.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-cyan-500 font-mono text-sm">07</span>
              Contact
            </h2>
            <div className="space-y-3 text-gray-400 leading-relaxed">
              <p>
                For any issues with your order, pixel assignment, or general questions,
                please reach out via the contact details on this site. We aim to respond within 48 hours.
              </p>
            </div>
          </section>

          {/* Governing Law */}
          <div className="pt-6 border-t border-gray-800 text-sm text-gray-500">
            <p>These terms are governed by the laws of England and Wales. By purchasing a pixel you agree to these terms.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
