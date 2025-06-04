interface LoadingScreenProps {
  visible: boolean;
  backgroundColor?: string;
}

export default function LoadingScreen({ visible, backgroundColor = "#3498db" }: LoadingScreenProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor }}>
      <div className="flex flex-col items-center space-y-4">
        <div className="loading loading-spinner loading-lg text-white"></div>
        <div className="text-white text-lg font-medium">Loading Application...</div>
      </div>
    </div>
  );
}
