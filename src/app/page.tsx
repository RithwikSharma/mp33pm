import { UniversalDropzone } from "@/components/universal-dropzone";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans antialiased overflow-x-hidden relative flex flex-col items-center justify-center">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center gap-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500">
            mp33pm
          </h1>
          <p className="text-lg text-neutral-400 font-light max-w-xl mx-auto">
            Unlimited client-side conversions. No limits, no servers. Powered completely by your hardware.
          </p>
        </div>

        {/* Dropzone Component */}
        <UniversalDropzone />
      </div>
    </main>
  );
}
