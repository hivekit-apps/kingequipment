import { redirect } from 'next/navigation';

// /admin/dashboard is an alias for /admin (the operational dashboard is the
// default landing page). Kept so nav links / bookmarks to /admin/dashboard
// don't 404 if someone typed the explicit URL.
export default function DashboardAlias(): never {
  redirect('/admin');
}
