import { AdminPage } from "./AdminPage";
import type { AdminPageProps } from "./AdminPage";

export type AdminDashboardProps = AdminPageProps;

/**
 * Preferred admin entry for route wiring.
 * Same composition as AdminPage, exposed under the requested name and path.
 * Security still comes from Worker side Access checks, not this shell.
 */
export function AdminDashboard(props: AdminDashboardProps) {
  return <AdminPage {...props} />;
}

export { AdminPage };
export type { AdminPageProps };
