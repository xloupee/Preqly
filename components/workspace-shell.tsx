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
  Trash2,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { type ClassRecord } from "@/lib/class-record";
import type { CourseJobRecord } from "@/lib/course-job-types";
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
  courseJobs?: CourseJobRecord[];
  currentCourse?: CourseRecord | null;
  classesEnabled?: boolean;
  classesMessage?: string | null;
  courseJobsEnabled?: boolean;
  courseJobsMessage?: string | null;
  userEmail?: string | null;
  sidebarBottom?: ReactNode;
};

export function WorkspaceShell({
  children,
  classes,
  activeClass,
  courses,
  courseJobs,
  currentCourse,
  classesEnabled = true,
  classesMessage = null,
  courseJobsEnabled = true,
  courseJobsMessage = null,
  userEmail = null,
  sidebarBottom,
}: WorkspaceShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [settingsCourses, setSettingsCourses] = useState(courses ?? []);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [deletingCourseSlug, setDeletingCourseSlug] = useState<string | null>(null);
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

  useEffect(() => {
    setSettingsCourses(courses ?? []);
  }, [courses]);

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

  async function handleDeleteCourse(slug: string) {
    setDeletingCourseSlug(slug);
    setSettingsError(null);

    try {
      const response = await fetch("/api/courses", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; slug?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "We could not remove this course.");
      }

      const remainingCourses = settingsCourses.filter((course) => course.slug !== slug);
      setSettingsCourses(remainingCourses);

      if (currentCourse?.slug === slug) {
        const nextCourse = remainingCourses[0] ?? null;
        setIsSettingsOpen(false);
        router.push(nextCourse ? `/workspace/${nextCourse.slug}` : "/workspace");
      } else {
        router.refresh();
      }
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "We could not remove this course.");
    } finally {
      setDeletingCourseSlug(null);
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
            courseJobs={courseJobs}
            courseJobsEnabled={courseJobsEnabled}
            courseJobsMessage={courseJobsMessage}
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
              <p className="settings-modal-label">Courses</p>
              {settingsCourses.length > 0 ? (
                <div className="settings-course-list">
                  {settingsCourses.map((course) => {
                    const isCurrent = course.slug === currentCourse?.slug;
                    const isSeedCourse = course.source === "seed";
                    const isDeleting = deletingCourseSlug === course.slug;

                    return (
                      <div key={course.slug} className="settings-course-row">
                        <div className="settings-course-copy">
                          <div className="settings-course-title-row">
                            <span className="settings-course-title">{course.title}</span>
                            {isCurrent ? (
                              <span className="settings-course-badge">Current</span>
                            ) : null}
                            {isSeedCourse ? (
                              <span className="settings-course-badge is-muted">Starter</span>
                            ) : null}
                          </div>
                          <p className="settings-course-meta">
                            {course.source === "seed"
                              ? "Starter course"
                              : course.syllabusFileName ?? "Generated course"}
                          </p>
                        </div>

                        {!isSeedCourse ? (
                          <button
                            type="button"
                            className="settings-course-remove"
                            onClick={() => void handleDeleteCourse(course.slug)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <LoaderCircle aria-hidden="true" className="animate-spin" />
                                Removing
                              </>
                            ) : (
                              <>
                                <Trash2 aria-hidden="true" />
                                Remove
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="settings-modal-note">No courses yet.</p>
              )}

              {settingsError ? (
                <p className="settings-modal-note is-error">{settingsError}</p>
              ) : null}
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
