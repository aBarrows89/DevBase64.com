"use client";

import { useState } from "react";
import { useDocHub } from "./DocHubContext";

type Section = "privacy" | "sharing" | "folders" | "signatures" | "groups" | "features";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "privacy", label: "Privacy", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { id: "sharing", label: "Sharing", icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" },
  { id: "folders", label: "Folders", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { id: "signatures", label: "Signatures", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
  { id: "groups", label: "Groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "features", label: "More", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
];

function SectionContent({ section, isDark }: { section: Section; isDark: boolean }) {
  const heading = `text-base font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`;
  const text = `text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-gray-600"}`;
  const subtext = `text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`;
  const card = `p-3 rounded-xl ${isDark ? "bg-slate-800/40" : "bg-gray-50"}`;

  switch (section) {
    case "privacy":
      return (
        <div className="space-y-4">
          <div>
            <h3 className={heading}>Privacy & Visibility</h3>
            <p className={text}>
              Everything you upload is <strong>private by default</strong>. Only you can see your files unless you choose to share them.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { dot: isDark ? "bg-slate-400" : "bg-gray-400", name: "Just Me", desc: "Private. Only you can see this file or folder. This is the default for everything you upload.", tag: "Default" },
              { dot: isDark ? "bg-blue-400" : "bg-blue-500", name: "Team", desc: "All signed-in employees can view this. Use for internal references like schedules or contact lists." },
              { dot: isDark ? "bg-emerald-400" : "bg-emerald-500", name: "Everyone", desc: "Visible to everyone in the organization. Ideal for company-wide policies, SOPs, handbooks, and forms." },
            ].map((tier) => (
              <div key={tier.name} className={card}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full ${tier.dot}`} />
                  <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{tier.name}</span>
                  {tier.tag && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"}`}>
                      {tier.tag}
                    </span>
                  )}
                </div>
                <p className={subtext}>{tier.desc}</p>
              </div>
            ))}
          </div>

          <p className={subtext}>
            You can change a file's visibility anytime from the upload settings or by right-clicking and managing access.
          </p>
        </div>
      );

    case "sharing":
      return (
        <div className="space-y-4">
          <div>
            <h3 className={heading}>Sharing Files & Folders</h3>
            <p className={text}>There are several ways to share:</p>
          </div>

          <div className={card}>
            <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Share with Specific People</p>
            <p className={subtext}>Right-click a folder, choose "Manage Access", and select users from the dropdown. They'll be able to access the folder without needing a password.</p>
          </div>

          <div className={card}>
            <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Share with Groups</p>
            <p className={subtext}>Create groups like "Management" or "Warehouse" from the Manage Access panel. Toggle groups on/off to share a folder with all members at once.</p>
          </div>

          <div className={card}>
            <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Public Links</p>
            <p className={subtext}>Right-click a file, choose "Share", and toggle "Public Link" on. This generates a URL anyone can use to view the document — even without an account. Great for sharing with external parties.</p>
          </div>
        </div>
      );

    case "folders":
      return (
        <div className="space-y-4">
          <div>
            <h3 className={heading}>Folders & Organization</h3>
            <p className={text}>Organize your documents into folders. Folders can be nested inside other folders for deeper organization.</p>
          </div>

          <div className="space-y-2">
            <div className={card}>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Drag & Drop</p>
              <p className={subtext}>Drag a file onto a folder to move it. Drag a folder onto another folder to nest it inside.</p>
            </div>
            <div className={card}>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Password Protection</p>
              <p className={subtext}>When creating a folder with Confidential or HIPAA privacy level, you can set a password. Access is logged for compliance. Even admins cannot bypass the password — this follows the HIPAA minimum necessary principle.</p>
            </div>
            <div className={card}>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Breadcrumb Navigation</p>
              <p className={subtext}>Click any part of the breadcrumb trail at the top to jump back to a parent folder. Click "Doc Hub" to return to the root.</p>
            </div>
          </div>
        </div>
      );

    case "signatures":
      return (
        <div className="space-y-4">
          <div>
            <h3 className={heading}>E-Signatures</h3>
            <p className={text}>Collect signature acknowledgments on documents — perfect for new policies, training materials, or onboarding forms.</p>
          </div>

          <div className="space-y-0">
            {[
              { step: "1", title: "Upload with signature required", desc: "When uploading a document, expand \"Advanced options\" and toggle \"Requires e-signature\" on." },
              { step: "2", title: "Employees are notified", desc: "The document appears in the sidebar under \"Needs Signature\" with a badge count so nothing gets missed." },
              { step: "3", title: "They sign with a signature pad", desc: "Right-click the document and choose \"Sign Document\" to open a canvas where they draw their signature with mouse or finger." },
              { step: "4", title: "Audit trail is created", desc: "Each signature records the signer's name, email, timestamp, IP address, and browser info for compliance." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 py-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-600"
                }`}>
                  {item.step}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{item.title}</p>
                  <p className={subtext}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`${card} flex items-start gap-2`}>
            <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? "text-amber-400" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={subtext}>This is designed for internal acknowledgments (policy reads, training completion). For legally binding contracts, use a dedicated e-sign service like DocuSign.</p>
          </div>
        </div>
      );

    case "groups":
      return (
        <div className="space-y-4">
          <div>
            <h3 className={heading}>Custom Groups</h3>
            <p className={text}>Groups let you share folders and files with multiple people at once without selecting each person individually.</p>
          </div>

          <div className="space-y-2">
            <div className={card}>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Creating a Group</p>
              <p className={subtext}>Right-click any folder, choose "Manage Access", and click "New Group". Pick a color, name it (e.g. "Accounting", "Warehouse Crew"), and check off the members.</p>
            </div>
            <div className={card}>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Using Groups</p>
              <p className={subtext}>Once created, groups appear as toggle pills in the Manage Access panel. Click a group to share or unshare a folder with everyone in it. Groups are reusable across all folders.</p>
            </div>
            <div className={card}>
              <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Editing Groups</p>
              <p className={subtext}>Click the pencil icon next to any group to rename it, change its color, or add/remove members.</p>
            </div>
          </div>
        </div>
      );

    case "features":
      return (
        <div className="space-y-4">
          <div>
            <h3 className={heading}>More Features</h3>
          </div>

          <div className="space-y-2">
            {[
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Version History", desc: "Right-click a file to view previous versions, upload new ones, or restore an older version." },
              { icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Expiration Dates", desc: "Set expiration dates during upload. Documents are flagged as \"Expiring\" or \"Expired\" with color-coded badges." },
              { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", title: "Search", desc: "Search across all document names, descriptions, and filenames you have access to. Results include both files and folders." },
              { icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z", title: "Grid & List Views", desc: "Toggle between card layout (visual) and table layout (compact) using the view switcher in the toolbar." },
              { icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12", title: "Drag & Drop Upload", desc: "Drop files anywhere on the page to upload them to the current folder." },
              { icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z", title: "Categories", desc: "Tag documents as Forms, Policies, SOPs, Templates, Training, or Other. Filter by category using the pills in the toolbar." },
            ].map((item) => (
              <div key={item.title} className={`${card} flex items-start gap-3`}>
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? "text-cyan-400" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <div>
                  <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{item.title}</p>
                  <p className={subtext}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

export default function HelpModal() {
  const { isDark } = useDocHub();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("privacy");

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
        title="How Doc Hub works"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-black/40"} backdrop-blur-sm`} />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-2xl mx-4 h-[75vh] rounded-2xl overflow-hidden flex flex-col ${
              isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-gray-200 shadow-2xl"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Doc Hub Guide</h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>Learn how to organize, share, and manage your documents</p>
              </div>
              <button onClick={() => setOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body — side nav + content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Section nav */}
              <div className={`w-40 flex-shrink-0 border-r overflow-y-auto py-2 ${isDark ? "border-slate-700/50 bg-slate-900/50" : "border-gray-100 bg-gray-50/50"}`}>
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                      activeSection === s.id
                        ? isDark
                          ? "bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400"
                          : "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                        : isDark
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                    </svg>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <SectionContent section={activeSection} isDark={isDark} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
