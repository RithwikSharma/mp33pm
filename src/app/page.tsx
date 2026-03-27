import Image from "next/image";
import { UniversalDropzone } from "@/components/universal-dropzone";

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0a0e14_0%,#0c1118_45%,#0b1016_100%)] text-neutral-100 antialiased flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60 [background:radial-gradient(circle_at_20%_20%,rgba(67,94,121,0.20),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(64,118,124,0.16),transparent_40%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col items-center justify-center gap-8">
        <header className="w-full rounded-2xl border border-[#2d3642] bg-[#0f141c]/80 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border border-[#3b4658] bg-[#131b26] p-1.5">
                <Image src="/icon.svg" alt="mp33pm icon" width={28} height={28} className="h-full w-full" priority />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#86a2be] font-semibold">mp33pm</p>
                <p className="text-sm text-[#a9b7c9]">File workflow engine</p>
              </div>
            </div>
            <p className="text-xs text-[#7f91a5] font-medium">No uploads. No accounts.</p>
          </div>
        </header>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 pt-3 items-center">
          <div className="lg:col-span-5 rounded-2xl border border-[#2f3946] bg-[#121925]/90 p-4 sm:p-6 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.85)] space-y-3">
            <div className="inline-flex items-center rounded-full border border-[#334053] bg-[#111a27] px-3 py-1 text-[11px] font-semibold text-[#9db3ca] tracking-[0.18em] uppercase shadow-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-300 mr-2"></span>
              Browser-native execution
            </div>
            <div className="rounded-xl border border-[#304054]/60 bg-[#0f141f] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8ea2b8] mb-1">Precision outputs</p>
              <p className="text-sm text-[#d5e0ef] font-medium">Set per-file targets for conversion, compression, and extraction.</p>
            </div>
            <div className="rounded-xl border border-[#304054]/60 bg-[#0f141f] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8ea2b8] mb-1">Measured performance</p>
              <p className="text-sm text-[#d5e0ef] font-medium">Inspect output size, reduction percentage, and processing time on every run.</p>
            </div>
            <div className="rounded-xl border border-[#304054]/60 bg-[#0f141f] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8ea2b8] mb-1">Batch control</p>
              <p className="text-sm text-[#d5e0ef] font-medium">Queue mixed formats together and execute them in a single pass.</p>
            </div>
          </div>

          <div className="lg:col-span-7 text-center lg:text-left space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#eef3fb] leading-tight">
              Production-grade
              <br />
              <span className="text-[#8ea2b8] font-medium">file workflows.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#99a7b8] font-medium max-w-3xl leading-relaxed mx-auto lg:mx-0">
              mp33pm delivers fast, on-device processing for documents, media, images, and spreadsheets with clear, verifiable results.
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-[#2d3642] bg-[#0f141c]/80 backdrop-blur-sm p-3 sm:p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
          <UniversalDropzone />
        </div>
      </div>
    </main>
  );
}
