import type { ReactNode } from "react";
import type { UserSession } from "../lib/contracts";
import {
  DashboardShell,
  DashboardSidebar,
  DashboardSidebarLink,
  DashboardSidebarSection,
  DashboardTopbar
} from "./dashboard-shell";

export type CustomerConsoleRoute =
  | "overview"
  | "apps"
  | "sources"
  | "inbox"
  | "memories"
  | "evidence"
  | "developer"
  | "privacy"
  | "billing"
  | "settings";

type CustomerConsoleTone = "neutral" | "ok" | "warn" | "risk" | "muted";

export interface CustomerConsoleProps {
  activeRoute: CustomerConsoleRoute;
  session: UserSession | null;
  serviceLabel: string;
  serviceTone: CustomerConsoleTone;
  actions?: ReactNode;
  children: ReactNode;
}

const workspaceLinks: Array<{ route: CustomerConsoleRoute; href: string; label: string; meta?: string }> = [
  { route: "overview", href: "/", label: "Overview" },
  { route: "apps", href: "/apps", label: "Apps" },
  { route: "sources", href: "/sources", label: "Sources" },
  { route: "inbox", href: "/inbox", label: "Inbox" },
  { route: "memories", href: "/memories", label: "Memories" },
  { route: "evidence", href: "/evidence", label: "Evidence" },
  { route: "developer", href: "/developer", label: "Developer" }
];

const accountLinks: Array<{ route: CustomerConsoleRoute; href: string; label: string; meta?: string }> = [
  { route: "privacy", href: "/privacy", label: "Privacy" },
  { route: "billing", href: "/billing", label: "Billing" },
  { route: "settings", href: "/settings", label: "Settings" }
];

export function CustomerConsole({
  activeRoute,
  session,
  serviceLabel,
  serviceTone,
  actions,
  children
}: CustomerConsoleProps) {
  return (
    <DashboardShell
      sidebar={<CustomerSidebar activeRoute={activeRoute} session={session} serviceLabel={serviceLabel} />}
      topbar={
        <DashboardTopbar
          title="Customer console"
          meta={session ? `${session.vault.name} · ${session.account.plan}` : "Personal workspace"}
          actions={
            <>
              <span className={`statusBadge ${serviceTone}`}>{serviceLabel}</span>
              {actions}
            </>
          }
        />
      }
    >
      {children}
    </DashboardShell>
  );
}

function CustomerSidebar({
  activeRoute,
  session,
  serviceLabel
}: {
  activeRoute: CustomerConsoleRoute;
  session: UserSession | null;
  serviceLabel: string;
}) {
  return (
    <DashboardSidebar
      label="Lore"
      eyebrow="Customer"
      footer={
        <div>
          <div>{session?.account.email ?? "Preview workspace"}</div>
          <div>{serviceLabel}</div>
        </div>
      }
    >
      <DashboardSidebarSection title="Workspace">
        {workspaceLinks.map((link) => (
          <DashboardSidebarLink key={link.route} href={link.href} label={link.label} meta={link.meta} current={activeRoute === link.route} />
        ))}
      </DashboardSidebarSection>
      <DashboardSidebarSection title="Account">
        {accountLinks.map((link) => (
          <DashboardSidebarLink key={link.route} href={link.href} label={link.label} meta={link.meta} current={activeRoute === link.route} />
        ))}
      </DashboardSidebarSection>
    </DashboardSidebar>
  );
}
