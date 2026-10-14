"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { getToken, getRole, getUser } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { toast } from "@/lib/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const ROLE_STYLES = {
  admin: "bg-lime-300/40 text-olive-800 border-lime-500",
  farmer: "bg-cream-100 text-charcoal-900 border-cream-200",
};

const INPUT_CLASS =
  "rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-charcoal-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-500";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminUsersPage() {
  const t = useT();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [changingId, setChangingId] = useState(null);
  const myId = getUser()?.id;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    if (getRole() !== "admin") {
      router.push("/dashboard");
      return;
    }

    fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setError(t("Could not load users.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const q = query.trim().toLowerCase();
  const visible = users.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  );

  function openUser(id) {
    router.push(`/admin/users/${id}`);
  }

  // Promote a farmer to admin, or demote an admin to farmer.
  async function changeRole(u, e) {
    e.stopPropagation(); // don't open the user's page
    const newRole = u.role === "admin" ? "farmer" : "admin";
    const question =
      newRole === "admin"
        ? t("Make {name} an admin? They will be able to see all users and data.", { name: u.name })
        : t("Make {name} a farmer? They will lose admin access.", { name: u.name });
    if (!window.confirm(question)) return;

    setChangingId(u.id);
    try {
      const res = await fetch(`${API_URL}/admin/users/${u.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ role: newRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || t("Something went wrong"));
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
      toast.success(
        t("{name} is now {role}", { name: u.name, role: t(newRole === "admin" ? "an admin" : "a farmer") })
      );
      toast.info(t("The change applies the next time they log in."));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex">
      <Sidebar />
      <div className="flex-1 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-heading text-3xl font-semibold text-charcoal-900 mb-1">{t("Users")}</h1>
          <p className="text-charcoal-900/60 mb-6">
            {t("Everyone registered on AgriVantage. Click a user to see what they have done.")}
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search by name or email")}
              className={`${INPUT_CLASS} flex-1 min-w-56`}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={INPUT_CLASS}>
              <option value="all">{t("All roles")}</option>
              <option value="farmer">{t("Farmers")}</option>
              <option value="admin">{t("Admins")}</option>
            </select>
          </div>

          {loading && <p className="text-charcoal-900/50 text-sm">{t("Loading...")}</p>}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {!loading && users.length > 0 && visible.length === 0 && (
            <p className="text-sm text-charcoal-900/50">{t("No users match your search.")}</p>
          )}

          {visible.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-200 shadow-lg shadow-charcoal-900/5 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-olive-700 text-lime-400">
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("ID")}</th>
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("Name")}</th>
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("Email")}</th>
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("Role")}</th>
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("Fields")}</th>
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("Predictions")}</th>
                    <th className="text-left font-heading font-semibold px-5 py-3.5">{t("Last active")}</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u, i) => (
                    <tr
                      key={u.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => openUser(u.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openUser(u.id);
                      }}
                      className={`border-t border-cream-100 cursor-pointer hover:bg-lime-300/20 focus:bg-lime-300/20 focus:outline-none transition-colors ${
                        i % 2 === 0 ? "bg-white" : "bg-cream-100/30"
                      }`}
                    >
                      <td className="px-5 py-3.5 text-charcoal-900/60">{u.id}</td>
                      <td className="px-5 py-3.5 font-medium text-charcoal-900">
                        {u.name}
                        {u.id === myId && (
                          <span className="ml-2 text-xs font-normal text-charcoal-900/40">({t("you")})</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-charcoal-900/80">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                            ROLE_STYLES[u.role] || "bg-zinc-100 text-zinc-800 border-zinc-300"
                          }`}
                        >
                          {t(u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : "")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-charcoal-900/80">{u.fields ?? 0}</td>
                      <td className="px-5 py-3.5 text-charcoal-900/80">{u.predictions ?? 0}</td>
                      <td className="px-5 py-3.5 text-charcoal-900/60 whitespace-nowrap">
                        {formatDate(u.last_active) || t("Never")}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {u.id !== myId && (
                          <button
                            type="button"
                            disabled={changingId === u.id}
                            onClick={(e) => changeRole(u, e)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className={`mr-3 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                              u.role === "admin"
                                ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                                : "border-lime-500 bg-lime-300/30 text-olive-800 hover:bg-lime-300/60"
                            }`}
                          >
                            {u.role === "admin" ? t("Make farmer") : t("Make admin")}
                          </button>
                        )}
                        <span className="text-olive-700 font-medium">{t("View")} →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}