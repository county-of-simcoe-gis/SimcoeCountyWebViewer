import React from "react";
import { FaGithub } from "react-icons/fa";
import Map from "ol/Map";

// React component for GitHub button
interface GitHubButtonDisplayProps {
  map?: Map;
  href: string;
  children: React.ReactNode;
}

export function GitHubButtonDisplay({ href, children }: GitHubButtonDisplayProps) {
  return (
    <div className="inline-block overflow-hidden font-sans leading-none whitespace-nowrap">
      <a
        href={href}
        className="inline-flex items-center h-[26px] px-2.5 py-1.5 text-xs font-semibold leading-4 text-gray-800 bg-gradient-to-b from-gray-50 to-gray-200 border border-gray-300 rounded cursor-pointer select-none hover:bg-gradient-to-b hover:from-gray-100 hover:to-gray-300 hover:border-gray-400 active:bg-gray-300 active:border-gray-400 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px] transition-all duration-150"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaGithub size={16} className="inline-block align-text-top fill-current mr-1" />
        <span>{children}</span>
      </a>
    </div>
  );
}

// Default export is now just the React component
export default GitHubButtonDisplay;
