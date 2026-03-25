"use client";

import Protected from "../protected";
import Sidebar, { MobileHeader } from "@/components/Sidebar";
import { useTheme } from "../theme-context";
import {
  DocHubProvider,
  DocHubSidebar,
  FileBrowser,
  ContextMenu,
  PreviewModal,
  UploadModal,
  FolderModal,
  ShareAccessModal,
} from "@/components/dochub";

function DocumentsContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex h-screen theme-bg-primary">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />

        <DocHubProvider>
          <div className="flex-1 flex overflow-hidden">
            {/* Doc Hub Sidebar — folder tree, privacy tiers, storage meter */}
            <DocHubSidebar />

            {/* File Browser — breadcrumbs, grid/list, file cards */}
            <FileBrowser />
          </div>

          {/* Modals & Overlays */}
          <ContextMenu />
          <PreviewModal />
          <UploadModal />
          <FolderModal />
          <ShareAccessModal />
        </DocHubProvider>
      </main>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Protected>
      <DocumentsContent />
    </Protected>
  );
}
