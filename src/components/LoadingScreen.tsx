import AppImage from "@/components/shared/AppImage";

interface LoadingScreenProps {
  visible: boolean;
  backgroundColor?: string;
}

export default function LoadingScreen({ visible }: LoadingScreenProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-base-200" style={{ zIndex: 999999999 }}>
      <div className="shadow-2xl rounded-2xl bg-base-100 p-8 flex flex-col items-center gap-6 w-[90vw] max-w-md">
        {/* Logos side by side */}
        <div className="flex flex-row items-center justify-center gap-6 w-full">
          <div className="relative h-16 w-32 sm:h-20 sm:w-40 flex-shrink-0">
            <AppImage src="/images/countyofsimcoelogo.png" alt="County of Simcoe" className="absolute inset-0 h-full w-full object-contain" />
          </div>
          <div className="relative h-16 w-32 sm:h-20 sm:w-40 flex-shrink-0">
            <AppImage src="/images/opengislogo.png" alt="OpenGIS" className="absolute inset-0 h-full w-full object-contain" />
          </div>
        </div>

        {/* Copyright */}
        <p className="text-base-content text-center text-sm sm:text-base font-medium">© The Corporation of the County of Simcoe</p>

        {/* Spinner */}
        <span className="loading loading-spinner loading-lg text-primary"></span>

        {/* Loading text */}
        <p className="text-base-content/70 text-sm">Loading Application</p>
      </div>
    </div>
  );
}
