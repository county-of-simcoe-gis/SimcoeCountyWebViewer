import React from "react";
import { FaGithub } from "react-icons/fa";
import Map from "ol/Map";
import "./GithubButton.css";

// React component for GitHub button
interface GitHubButtonDisplayProps {
  map?: Map;
  href: string;
  children: React.ReactNode;
}

export function GitHubButtonDisplay({ href, children }: GitHubButtonDisplayProps) {
  return (
    <div className="inline-block overflow-hidden font-sans leading-none whitespace-nowrap">
      <a href={href} className="github-button-link" target="_blank" rel="noopener noreferrer">
        <FaGithub size={16} className="inline-block align-text-top fill-current mr-1" />
        <span>{children}</span>
      </a>
    </div>
  );
}

// Default export is now just the React component
export default GitHubButtonDisplay;
