"use client";

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  ChevronLeft,
  FolderKanban,
  LoaderCircle,
  LogOut,
  Settings,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { type ClassRecord } from "@/lib/class-record";
import type { CourseRecord } from "@/lib/course-types";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceClassSwitcher } from "@/components/workspace-class-switcher";
import { WorkspaceCourseSwitcher } from "@/components/workspace-course-switcher";

const sidebarItems = [
  { label: "Courses", href: "/workspace", icon: BookOpenText },
  { label: "Dashboard", href: "/dashboard", icon: FolderKanban },
];

const courseSections = ["Summary", "Versions", "Notes"];

type WorkspaceShellProps = {
  children: ReactNode;
  classes?: ClassRecord[];
  activeClass?: ClassRecord | null;
  courses?: CourseRecord[];
  currentCourse?: CourseRecord | null;
  classesEnabled?: boolean;
  classesMessage?: string | null;
  userEmail?: string | null;
  sidebarBottom?: ReactNode;
};

export function WorkspaceShell({
  children,
  classes,
  activeClass,
  courses,
  currentCourse,
  classesEnabled = true,
  classesMessage = null,
  userEmail = null,
  sidebarBottom,
}: WorkspaceShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hasClassWorkspace = classes !== undefined;
  const hasCourseWorkspace = courses !== undefined;
  const profileLabel = userEmail ?? "Signed in";
  const initials = (userEmail?.[0] ?? "P").toUpperCase();
  const settingsTitleId = useId();
  const settingsDescriptionId = useId();

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSettingsOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsSettingsOpen(false);
      router.push("/auth");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleSettingsBackdropClick() {
    setIsSettingsOpen(false);
  }

  function handleSettingsPanelClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  function handleSettingsKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setIsSettingsOpen(false);
    }
  }
  return (
    <div className={`workspace-shell${isCollapsed ? " is-collapsed" : ""}`}>
      <aside className="workspace-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <BrandLogo size={28} className="sidebar-logo-image" />
          </div>
          <div className="sidebar-brand-copy">
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

        {sidebarBottom ? <div className="sidebar-top-slot">{sidebarBottom}</div> : null}

        <nav className="sidebar-nav" aria-label="Primary">
          {sidebarItems.map((item) => {
            const isActive =
              item.href === "/workspace"
                ? pathname === "/workspace" || pathname.startsWith("/workspace/")
                : pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={isActive ? "sidebar-link is-active" : "sidebar-link"}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {hasCourseWorkspace ? (
          <WorkspaceCourseSwitcher
            courses={courses}
            activeCourseSlug={currentCourse?.slug ?? null}
          />
        ) : hasClassWorkspace ? (
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
          <button
            className="sidebar-link"
            type="button"
            title={isCollapsed ? "Settings" : undefined}
            onClick={() => setIsSettingsOpen(true)}
          >
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

      {isSettingsOpen ? (
        <div className="settings-modal-backdrop" onClick={handleSettingsBackdropClick}>
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={settingsTitleId}
            aria-describedby={settingsDescriptionId}
            onClick={handleSettingsPanelClick}
            onKeyDown={handleSettingsKeyDown}
          >
            <div className="settings-modal-header">
              <div>
                <p className="settings-modal-kicker">Workspace account</p>
                <h2 id={settingsTitleId}>Settings</h2>
              </div>
              <button
                type="button"
                className="settings-modal-close"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close settings"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <p id={settingsDescriptionId} className="settings-modal-description">
              Manage the signed-in account and session for this workspace.
            </p>

            <section className="settings-modal-card" aria-label="Account details">
              <div className="settings-modal-profile">
                <div className="settings-modal-avatar" aria-hidden="true">
                  {initials}
                </div>
                <div className="settings-modal-profile-copy">
                  <p className="settings-modal-label">Signed in as</p>
                  <p className="settings-modal-email">{profileLabel}</p>
                </div>
              </div>
            </section>

            <section className="settings-modal-card" aria-label="Coming soon">
              <p className="settings-modal-label">Coming soon</p>
              <p className="settings-modal-note">
                More account and workspace controls will live here as the product surface grows.
              </p>
            </section>

            <div className="settings-modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsSettingsOpen(false)}
              >
                Close
              </Button>
              <Button type="button" onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Signing out
                  </>
                ) : (
                  <>
                    Log out
                    <LogOut aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
