import type { ButtonHTMLAttributes, ReactNode } from "react";

type DashboardTone = "neutral" | "ok" | "warn" | "risk";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface DashboardShellProps {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardShell({ sidebar, topbar, children, className }: DashboardShellProps) {
  return (
    <div className={classNames("dashboardShell", className)}>
      <aside className="dashboardShellSidebar">{sidebar}</aside>
      <div className="dashboardShellFrame">
        {topbar ? <div className="dashboardShellTopbar">{topbar}</div> : null}
        <main className="dashboardShellContent">{children}</main>
      </div>
    </div>
  );
}

export interface DashboardSidebarProps {
  label: string;
  eyebrow?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function DashboardSidebar({ label, eyebrow, footer, children }: DashboardSidebarProps) {
  return (
    <nav className="dashboardSidebar" aria-label={label}>
      <div className="dashboardSidebarBrand">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <strong>{label}</strong>
      </div>
      <div className="dashboardSidebarNav">{children}</div>
      {footer ? <div className="dashboardSidebarFooter">{footer}</div> : null}
    </nav>
  );
}

export function DashboardSidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dashboardSidebarSection">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export interface DashboardSidebarLinkProps {
  href: string;
  label: string;
  meta?: string;
  current?: boolean;
}

export function DashboardSidebarLink({ href, label, meta, current }: DashboardSidebarLinkProps) {
  return (
    <a className={classNames("dashboardSidebarLink", current && "current")} href={href} aria-current={current ? "page" : undefined}>
      <span>{label}</span>
      {meta ? <small>{meta}</small> : null}
    </a>
  );
}

export function DashboardTopbar({ title, meta, actions }: { title: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <div className="dashboardTopbarTitle">
        <strong>{title}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>
      {actions ? <div className="dashboardTopbarActions">{actions}</div> : null}
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="dashboardPageHeader">
      <div>
        {eyebrow ? <span className="dashboardEyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="dashboardHeaderMeta">{meta}</div> : null}
      </div>
      {actions ? <div className="dashboardHeaderActions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="dashboardSectionHeader">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="dashboardSectionActions">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
  trend
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: DashboardTone;
  trend?: ReactNode;
}) {
  return (
    <article className={classNames("dashboardStatCard", `tone-${tone}`)}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {trend ? <small>{trend}</small> : null}
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function DataCard({
  title,
  description,
  meta,
  actions,
  children,
  className
}: {
  title?: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames("dashboardDataCard", className)}>
      {title || description || meta || actions ? (
        <SectionHeader
          title={title}
          description={description}
          actions={
            meta || actions ? (
              <>
                {meta}
                {actions}
              </>
            ) : null
          }
        />
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  tone = "neutral"
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: DashboardTone;
}) {
  return (
    <div className={classNames("dashboardEmptyState", `tone-${tone}`)}>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function TableWrapper({
  label,
  description,
  actions,
  children
}: {
  label: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dashboardTableWrapper" aria-label={label}>
      <SectionHeader title={label} description={description} actions={actions} />
      <div className="dashboardTableScroll">{children}</div>
    </section>
  );
}

export function FilterBar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="dashboardFilterBar">
      <div className="dashboardFilterFields">{children}</div>
      {actions ? <div className="dashboardFilterActions">{actions}</div> : null}
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  meta,
  control
}: {
  label: string;
  description?: ReactNode;
  meta?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="dashboardSettingsRow">
      <div>
        <strong>{label}</strong>
        {description ? <p>{description}</p> : null}
        {meta ? <small>{meta}</small> : null}
      </div>
      <div>{control}</div>
    </div>
  );
}

export function DestructivePanel({
  title,
  description,
  confirmation,
  actionLabel,
  actionProps
}: {
  title: string;
  description: ReactNode;
  confirmation?: ReactNode;
  actionLabel: string;
  actionProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <section className="dashboardDestructivePanel">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {confirmation ? <div className="dashboardDestructiveConfirm">{confirmation}</div> : null}
      </div>
      <button type="button" {...actionProps} className={classNames("danger", actionProps?.className)}>
        {actionLabel}
      </button>
    </section>
  );
}
