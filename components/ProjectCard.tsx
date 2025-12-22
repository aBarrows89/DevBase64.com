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
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
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
      className={`px-3 py-2 bg-slate-800/80 border border-slate-700 border-l-4 ${priorityColors[project.priority] || "border-l-slate-500"} rounded-lg cursor-grab active:cursor-grabbing hover:border-slate-600 hover:bg-slate-800 transition-all ${
        dragging ? "opacity-50 shadow-2xl scale-105" : ""
      }`}
    >
      <h3 className="text-white text-sm font-medium line-clamp-2">
        {project.name}
      </h3>
    </div>
  );
}
