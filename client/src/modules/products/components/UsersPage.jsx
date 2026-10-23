import { useEffect, useMemo, useState } from "react";
import { Search, UserCog, UserPlus, X } from "lucide-react";
import { apiRequest } from "../api/productsApi.js";

const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  manager: "Staff",
  user: "User",
  vendor: "Vendor (create only)",
};

const formatCreatedDate = (dateValue) => {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const result = await apiRequest("/users/");
      setUsers(result.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !normalizedSearch ||
        [user.name, user.email, user.role, user._id || user.id]
          .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      const matchesRole = roleFilter === "all" || user.role === roleFilter ||
        (roleFilter === "staff" && user.role === "manager");
      const hasProductAccess = user.role === "admin" || user.role === "vendor" || user.canManageProducts === true;
      const matchesAccess = accessFilter === "all" ||
        (accessFilter === "enabled" && hasProductAccess) ||
        (accessFilter === "disabled" && !hasProductAccess);
      return matchesSearch && matchesRole && matchesAccess;
    });
  }, [users, search, roleFilter, accessFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsCreating(true);
    try {
      const result = await apiRequest("/users/", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setIsCreateFormOpen(false);
      setNotice(result.message || "User account created successfully.");
      await fetchUsers();
      setCurrentPage(1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCreating(false);
    }
  };

  const updateRole = async (userId, nextRole) => {
    setError("");
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      await fetchUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateProductAccess = async (userId, canManageProducts) => {
    setError("");
    try {
      await apiRequest(`/users/${userId}/product-access`, {
        method: "PATCH",
        body: JSON.stringify({ canManageProducts }),
      });
      await fetchUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="information-page users-page">
      <article className="information-card users-directory-card">
        <div className="users-directory-header">
          <div className="section-title-row">
            <span className="information-card-icon"><UserCog size={18} /></span>
            <div>
              <h2>User management</h2>
              <p>Manage accounts, roles, and product access.</p>
            </div>
          </div>
          <button
            className="button button-primary users-create-trigger"
            type="button"
            onClick={() => {
              setIsCreateFormOpen((open) => !open);
              setError("");
            }}
          >
            {isCreateFormOpen ? <X size={16} /> : <UserPlus size={16} />}
            {isCreateFormOpen ? "Close" : "Create user"}
          </button>
        </div>

        {isCreateFormOpen && (
          <section className="user-create-panel" aria-labelledby="create-user-title">
            <div className="user-create-heading">
              <div>
                <h3 id="create-user-title">Create a user account</h3>
                <p>The user can sign in with this email and initial password.</p>
              </div>
            </div>
            <form className="user-create-form" onSubmit={createUser}>
              <label>
                <span>Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} autoComplete="name" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
              </label>
              <label>
                <span>Initial password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" />
              </label>
              <label>
                <span>Role</span>
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  {Object.entries(ROLE_LABELS).filter(([value]) => value !== "manager").map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="user-create-actions">
                <button className="button button-primary" type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Save user"}
                </button>
              </div>
            </form>
          </section>
        )}

        {notice && <div className="standalone-success" role="status">{notice}</div>}
        {error && <div className="standalone-error" role="alert">{error}</div>}

        <div className="users-filter-grid" aria-label="Filter users">
          <label>
            <span>Role</span>
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setCurrentPage(1); }}>
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="vendor">Vendor</option>
              <option value="user">User</option>
            </select>
          </label>
          <label>
            <span>Product access</span>
            <select value={accessFilter} onChange={(event) => { setAccessFilter(event.target.value); setCurrentPage(1); }}>
              <option value="all">All access</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Not enabled</option>
            </select>
          </label>
        </div>

        <div className="users-table-toolbar">
          <label className="users-page-size">
            <span>Show</span>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </label>
          <label className="users-search">
            <span>Search</span>
            <span className="users-search-input"><Search size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Name, email, or ID" /></span>
          </label>
        </div>

        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Product access</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="users-table-message" colSpan="4">Loading users...</td></tr>
              ) : visibleUsers.length ? visibleUsers.map((user) => {
                const userId = user._id || user.id;
                const hasProductAccess = user.role === "admin" || user.role === "vendor" || user.canManageProducts === true;
                return (
                  <tr key={userId}>
                    <td className="users-table-person">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </td>
                    <td>
                      <select
                        className="users-role-select"
                        aria-label={`Role for ${user.name}`}
                        value={user.role || "user"}
                        onChange={(event) => updateRole(userId, event.target.value)}
                      >
                        {user.role === "manager" && <option value="manager" disabled>Staff (legacy)</option>}
                        {Object.entries(ROLE_LABELS).filter(([value]) => value !== "manager").map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="product-access-toggle">
                        <input
                          type="checkbox"
                          checked={hasProductAccess}
                          disabled={user.role === "admin" || user.role === "vendor"}
                          onChange={(event) => updateProductAccess(userId, event.target.checked)}
                        />
                        <span>{user.role === "vendor" ? "Create only" : hasProductAccess ? "Enabled" : "View only"}</span>
                      </label>
                    </td>
                    <td><time dateTime={user.createdAt || undefined}>{formatCreatedDate(user.createdAt)}</time></td>
                  </tr>
                );
              }) : (
                <tr><td className="users-table-message" colSpan="4">No users match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="users-table-footer">
          <span>
            Showing {filteredUsers.length ? (currentPage - 1) * pageSize + 1 : 0}
            –{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          <div className="users-pagination" aria-label="User list pages">
            <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>‹</button>
            <span>{currentPage} / {pageCount}</span>
            <button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => page + 1)}>›</button>
          </div>
        </div>
      </article>
    </section>
  );
}
