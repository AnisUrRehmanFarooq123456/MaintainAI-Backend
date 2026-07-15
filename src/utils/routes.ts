const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/forgot-password/reset",
];

const roleHomeRoute: Record<string, string> = {
  admin: "/admin",
  technician: "/technician",
  supervisor: "/supervisor",
  reporter: "/reporter",
};

const roleRoutePrefix: Record<string, string> = {
  admin: "/admin",
  technician: "/technician",
  supervisor: "/supervisor",
  reporter: "/reporter",
};

function normalizeRole(role: string | undefined | null): string {
  return (role || "").trim().toLowerCase();
}

export { publicRoutes, roleHomeRoute, roleRoutePrefix, normalizeRole };