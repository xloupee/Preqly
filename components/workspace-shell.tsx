import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpenText, ChevronLeft, FolderKanban, Settings, Sparkles } from "lucide-react";

const sidebarItems = [
  { label: "Courses", href: "/workspace", icon: BookOpenText, active: true },
  { label: "Dashboard", href: "/workspace", icon: FolderKanban, active: false },
  { label: "Settings", href: "/workspace", icon: Settings, active: false },
];

const courseSections = ["Summary", "Versions", "Notes"];

type WorkspaceShellProps = {
  children: ReactNode;
  sidebarBottom?: ReactNode;
};

export function WorkspaceShell({ children, sidebarBottom }: WorkspaceShellProps) {
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Sparkles aria-hidden="true" />
          </div>
          <div>
            <p className="sidebar-overline">Preqly</p>
            <h1>Workspace</h1>
          </div>
          <button className="sidebar-collapse" type="button" aria-label="Collapse navigation">
            <ChevronLeft aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={item.active ? "sidebar-link is-active" : "sidebar-link"}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <section className="sidebar-course-card" aria-label="Selected course">
          <p className="sidebar-course-label">Current course</p>
          <h2>CS50 Intro</h2>
          <div className="sidebar-course-sections">
            {courseSections.map((section) => (
              <button key={section} type="button" className="sidebar-section-link">
                {section}
              </button>
            ))}
          </div>
        </section>

        {sidebarBottom}

        <div className="sidebar-footer">
          <button className="sidebar-link" type="button">
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {children}
    </div>
  );
}
