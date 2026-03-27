import { UniversalDropzone } from "@/components/universal-dropzone";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070709] bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:20px_20px] text-neutral-100 font-sans antialiased flex flex-col items-center">
      
      <div className="z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center gap-12">
        
        {/* Sleek, Monochrome Minimalist Header */}
        <div className="text-center space-y-6 pt-10">
          <div className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1 text-xs font-semibold text-neutral-400 mb-2 tracking-widest uppercase shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></span>
            100% Local Execution
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white drop-shadow-sm font-sans mb-6">
            Everything, everywhere.
            <br />
            <span className="text-neutral-500 font-light">
              Serverless.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed">
            mp33pm is an infinitely scalable, completely private local processing suite.
            Convert, Compress, and AI-Extract directly in your browser without ever uploading a file.
          </p>
        </div>

        {/* Dropzone Component */}
        <div className="w-full">
          <UniversalDropzone />
        </div>
      </div>
    </main>
  );
}
