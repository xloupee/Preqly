"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { BookOpenText, ChevronLeft, FolderKanban, Settings, Sparkles } from "lucide-react";

import { type ClassRecord } from "@/lib/class-record";
import { WorkspaceClassSwitcher } from "@/components/workspace-class-switcher";

const sidebarItems = [
  { label: "Courses", href: "/workspace", icon: BookOpenText, active: true },
  { label: "Dashboard", href: "/workspace", icon: FolderKanban, active: false },
];

const courseSections = ["Summary", "Versions", "Notes"];

type WorkspaceShellProps = {
  children: ReactNode;
  classes?: ClassRecord[];
  activeClass?: ClassRecord | null;
  classesEnabled?: boolean;
  classesMessage?: string | null;
  userEmail?: string | null;
};

export function WorkspaceShell({
  children,
  classes,
  activeClass,
  classesEnabled = true,
  classesMessage = null,
  userEmail = null,
}: WorkspaceShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasClassWorkspace = classes !== undefined;
  const profileLabel = userEmail ?? "Signed in";
  const initials = (userEmail?.[0] ?? "P").toUpperCase();

  return (
    <div className={`workspace-shell${isCollapsed ? " is-collapsed" : ""}`}>
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Sparkles aria-hidden="true" />
          </div>
          <div className="sidebar-brand-copy">
            <p className="sidebar-overline">Preqly</p>
            <h1>Workspace</h1>
          </div>
          <button
            className="sidebar-collapse"
            type="button"
            aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={item.active ? "sidebar-link is-active" : "sidebar-link"}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {hasClassWorkspace ? (
          <WorkspaceClassSwitcher
            classes={classes}
            activeClassId={activeClass?.id ?? null}
            classesEnabled={classesEnabled}
            classesMessage={classesMessage}
          />
        ) : (
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
        )}

        <div className="sidebar-footer">
          <button className="sidebar-link" type="button" title={isCollapsed ? "Settings" : undefined}>
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </button>

          <div className="sidebar-profile" aria-label="Signed-in profile">
            <div className="sidebar-profile-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="sidebar-profile-copy">
              <p className="sidebar-profile-label">Profile</p>
              <p className="sidebar-profile-email">{profileLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {children}
    </div>
  );
}
