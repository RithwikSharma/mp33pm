import { UniversalDropzone } from "@/components/universal-dropzone";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070709] text-white selection:bg-blue-500/30 font-sans antialiased overflow-x-hidden relative flex flex-col items-center justify-center">
      {/* Dynamic Symmetrical Ambient Lighting */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 via-purple-900/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[60%] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      
      <div className="z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-16">
        
        {/* Apple-like minimalist branding Header Section */}
        <div className="text-center space-y-6 pt-10">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1 text-sm font-medium text-neutral-300 mb-4 tracking-wide shadow-xl">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            Zero-Server Edge Conversions
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white/90 drop-shadow-sm">
            Everything, everywhere,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              all at once.
            </span>
          </h1>
          <p className="text-lg text-neutral-400/90 font-medium max-w-2xl mx-auto leading-relaxed">
            mp33pm is an infinitely scalable, completely private local processing suite.
            From heavy 4K videos to simple PDFs, run every conversion exclusively through your own hardware. 
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
