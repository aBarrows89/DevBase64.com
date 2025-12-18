"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Doc } from "@/convex/_generated/dataModel";

type Project = Doc<"projects">;

interface ProjectCardProps {
  project: Project;
  isDragging?: boolean;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default function ProjectCard({
  project,
  isDragging,
  onClick,
}: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: project._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-4 bg-slate-800/80 border border-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all ${
        dragging ? "opacity-50 shadow-2xl scale-105" : ""
      }`}
    >
      {/* Priority indicator */}
      <div className="flex items-start justify-between mb-2">
        <span
          className={`w-2 h-2 rounded-full ${priorityColors[project.priority] || "bg-slate-500"}`}
        />
        {project.aiTimelineAnalysis && (
          <span
            className={`px-2 py-0.5 text-xs rounded ${
              project.aiTimelineAnalysis.isOnSchedule
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {project.aiTimelineAnalysis.isOnSchedule
              ? "On Track"
              : `${project.aiTimelineAnalysis.behindByDays}d behind`}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-white font-medium mb-1 line-clamp-2">
        {project.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
        {project.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        {project.dueDate && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {new Date(project.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        {project.estimatedHours && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {project.estimatedHours}h
          </span>
        )}
      </div>

      {/* AI Generated Steps indicator */}
      {project.aiGeneratedSteps && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <span className="text-xs text-cyan-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            AI Steps Generated
          </span>
        </div>
      )}
    </div>
  );
}
