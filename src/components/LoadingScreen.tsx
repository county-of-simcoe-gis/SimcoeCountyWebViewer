import AppImage from "@/components/shared/AppImage";
import LogoImage from "@/components/shared/LogoImage";

interface LoadingScreenProps {
  visible: boolean;
  backgroundColor?: string;
  headerLogoImageName?: string;
}

export default function LoadingScreen({ visible, headerLogoImageName }: LoadingScreenProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-base-200" style={{ zIndex: 999999999 }}>
      <div className="shadow-2xl rounded-2xl bg-base-100 p-8 flex flex-col items-center gap-6 w-[90vw] max-w-md">
        {/* Logos side by side when config logo is loaded; OpenGIS only until then */}
        <div className={`flex items-center justify-center w-full ${headerLogoImageName ? "flex-row gap-6" : ""}`}>
          {headerLogoImageName && <LogoImage headerLogoImageName={headerLogoImageName} alt="Logo Image" className="max-h-[50px] max-w-[200px] object-contain" />}
          <div className="relative h-16 w-32 sm:h-20 sm:w-40 flex-shrink-0">
            <AppImage src="/images/opengislogo.png" alt="OpenGIS" className="absolute inset-0 h-full w-full object-contain" />
          </div>
        </div>

        {/* Spinner */}
        <span className="loading loading-spinner loading-lg text-primary"></span>

        {/* Loading text */}
        <p className="text-base-content/70 text-sm">Loading Application</p>
      </div>
    </div>
  );
}
