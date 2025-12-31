"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Doc } from "@/convex/_generated/dataModel";

type Project = Doc<"projects"> & {
  taskCount?: number;
  completedTaskCount?: number;
};

type User = Doc<"users">;

interface ProjectCardProps {
  project: Project;
  users?: User[];
  isDragging?: boolean;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
};

export default function ProjectCard({
  project,
  users,
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
  const hasTaskCount = typeof project.taskCount === "number";

  // Get assignee first name
  const assignee = project.assignedTo && users
    ? users.find((u) => u._id === project.assignedTo)
    : null;
  const assigneeFirstName = assignee?.name?.split(" ")[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`px-3 py-2 bg-slate-800/80 border border-slate-700 border-l-4 ${priorityColors[project.priority] || "border-l-slate-500"} rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-600 hover:bg-slate-800 transition-all ${
        dragging ? "opacity-50 shadow-2xl scale-105" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-white text-sm font-medium line-clamp-2 flex-1">
          {project.name}
        </h3>
        {assigneeFirstName && (
          <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            {assigneeFirstName}
          </span>
        )}
      </div>
      {hasTaskCount && project.taskCount! > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-xs text-slate-400">
            {project.completedTaskCount}/{project.taskCount}
          </span>
        </div>
      )}
    </div>
  );
}
