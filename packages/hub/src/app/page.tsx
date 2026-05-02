import { ProjectListPage } from "../dashboard/pages";
import { listProjectsByRecentActivity } from "../db/queries";
import { getHubDatabase } from "../db/runtime";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const db = await getHubDatabase();
  const projects = await listProjectsByRecentActivity(db);

  return <ProjectListPage projects={projects} />;
}
