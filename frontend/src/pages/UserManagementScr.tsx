import { useState, useEffect, useMemo } from "react";
import { C, FD, FB, FM, api, uid, showT, NavIcon, Av, Btn, Inp, Sel, Mdl, Spin, Tag, Toggle } from "../shared";

const MODULES = [
  { key: "home", label: "Home / Dashboard", icon: "home" },
  { key: "inbox", label: "Inbox", icon: "inbox" },
  { key: "teamchat", label: "Team Chat", icon: "teamchat" },
  { key: "monitor", label: "Live Monitor", icon: "monitor" },
  { key: "contacts", label: "Contacts", icon: "contacts" },
  { key: "crm", label: "CRM", icon: "crm" },
  { key: "calendar", label: "Schedule", icon: "calendar" },
  { key: "reports", label: "Reports", icon: "reports" },
  { key: "marketing", label: "Marketing", icon: "marketing" },
  { key: "integrations", label: "Integrations & API", icon: "integrations" },
  { key: "knowledgebase", label: "Knowledge Base", icon: "knowledgebase" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function UserManagementScr() {
  const [tab, setTab] = useState<"users" | "departments">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // User form
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPass, setUPass] = useState("");
  const [uRole, setURole] = useState("agent");
  const [uDept, setUDept] = useState("");
  const [uPerms, setUPerms] = useState<string[]>([...MODULES.map(m => m.key)]);
  const [saving, setSaving] = useState(false);

  // Dept form
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [dName, setDName] = useState("");
  const [dDesc, setDDesc] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        api.get("/users/managed"),
        api.get("/users/departments"),
      ]);
      if (uRes?.users) setUsers(uRes.users);
      if (dRes?.departments) setDepartments(dRes.departments);
    } catch (e: any) {
      showT(e.message || "Failed to load", "error");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Filtered users
  const filtered = useMemo(() => {
    let list = users;
    if (deptFilter !== "all") {
      list = list.filter(u => (deptFilter === "none" ? !u.department_id : u.department_id === deptFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list;
  }, [users, deptFilter, search]);

  // Open user modal
  const openUserModal = (user?: any) => {
    if (user) {
      setEditUser(user);
      setUName(user.name || "");
      setUEmail(user.email || "");
      setUPass("");
      setURole(user.role || "agent");
      setUDept(user.department_id || "");
      setUPerms(user.permissions || [...MODULES.map(m => m.key)]);
    } else {
      setEditUser(null);
      setUName(""); setUEmail(""); setUPass(""); setURole("agent"); setUDept("");
      setUPerms([...MODULES.map(m => m.key)]);
    }
    setShowUserModal(true);
  };

  const saveUser = async () => {
    if (!uName || !uEmail) { showT("Name and email required", "warn"); return; }
    if (!editUser && !uPass) { showT("Password required for new user", "warn"); return; }
    if (!editUser && uPass.length < 6) { showT("Password must be at least 6 characters", "warn"); return; }
    setSaving(true);
    try {
      const body: any = { name: uName, email: uEmail, role: uRole, department_id: uDept || null, permissions: uPerms };
      if (uPass) body.password = uPass;
      if (editUser) {
        const res = await api.patch(`/users/managed/${editUser.id}`, body);
        setUsers(prev => prev.map(u => u.id === editUser.id ? res.user : u));
        showT("User updated", "success");
      } else {
        body.password = uPass;
        const res = await api.post("/users/managed", body);
        setUsers(prev => [res.user, ...prev]);
        showT("User created", "success");
      }
      setShowUserModal(false);
    } catch (e: any) {
      showT(e.message || "Failed to save", "error");
    }
    setSaving(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await api.del(`/users/managed/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      showT("User deleted", "success");
    } catch (e: any) {
      showT(e.message || "Failed to delete", "error");
    }
  };

  // Department modal
  const openDeptModal = (dept?: any) => {
    if (dept) {
      setEditDept(dept);
      setDName(dept.name || "");
      setDDesc(dept.description || "");
    } else {
      setEditDept(null);
      setDName(""); setDDesc("");
    }
    setShowDeptModal(true);
  };

  const saveDept = async () => {
    if (!dName) { showT("Department name required", "warn"); return; }
    setDeptSaving(true);
    try {
      if (editDept) {
        const res = await api.patch(`/users/departments/${editDept.id}`, { name: dName, description: dDesc });
        setDepartments(prev => prev.map(d => d.id === editDept.id ? res.department : d));
        showT("Department updated", "success");
      } else {
        const res = await api.post("/users/departments", { name: dName, description: dDesc });
        setDepartments(prev => [...prev, res.department]);
        showT("Department created", "success");
      }
      setShowDeptModal(false);
    } catch (e: any) {
      showT(e.message || "Failed to save", "error");
    }
    setDeptSaving(false);
  };

  const deleteDept = async (id: string) => {
    if (!confirm("Delete this department? Users in it will be unassigned.")) return;
    try {
      await api.del(`/users/departments/${id}`);
      setDepartments(prev => prev.filter(d => d.id !== id));
      setUsers(prev => prev.map(u => u.department_id === id ? { ...u, department_id: null, department_name: null } : u));
      showT("Department deleted", "success");
    } catch (e: any) {
      showT(e.message || "Failed to delete", "error");
    }
  };

  const togglePerm = (key: string) => {
    setUPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const selectAllPerms = () => setUPerms([...MODULES.map(m => m.key)]);
  const clearAllPerms = () => setUPerms([]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", fontFamily: FB, color: C.t1 }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: C.s1, borderBottom: `1px solid ${C.b1}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.a}, ${C.p})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <NavIcon id="users" s={16} col="#fff" />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, fontFamily: FD, margin: 0 }}>User Management</h1>
        </div>
        <div style={{ display: "flex", gap: 0, marginLeft: 8 }}>
          {([["users", "Users"], ["departments", "Departments"]] as const).map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, fontFamily: FD, color: tab === id ? C.a : C.t3, borderBottom: `2.5px solid ${tab === id ? C.a : "transparent"}`, background: "transparent", border: "none", cursor: "pointer", transition: "color .15s" }}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <Btn ch={tab === "users" ? "+ Add User" : "+ Add Department"} v="primary" onClick={() => tab === "users" ? openUserModal() : openDeptModal()} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}><Spin /></div>
        ) : tab === "users" ? (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.t1, fontFamily: FB, width: 260, outline: "none" }} />
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: C.t1, fontFamily: FB, cursor: "pointer", outline: "none" }}>
                <option value="all">All Departments</option>
                <option value="none">No Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: C.t3, alignSelf: "center" }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Users table */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: C.t3 }}>
                <NavIcon id="users" s={48} col={C.t3} />
                <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>No users found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Create users and assign them departments and access permissions.</div>
                <div style={{ marginTop: 16 }}><Btn ch="+ Add User" v="primary" onClick={() => openUserModal()} /></div>
              </div>
            ) : (
              <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.s2, borderBottom: `1px solid ${C.b1}` }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontFamily: FD, fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>User</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontFamily: FD, fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>Department</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontFamily: FD, fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>Role</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontFamily: FD, fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>Access</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontFamily: FD, fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => {
                      const permCount = u.permissions ? u.permissions.length : MODULES.length;
                      return (
                        <tr key={u.id} className="hov" style={{ borderBottom: `1px solid ${C.b1}`, cursor: "pointer", transition: "background .1s" }} onClick={() => openUserModal(u)}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Av i={u.avatar || u.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?"} c={u.color || C.a} s={34} dot={u.status === "active" || u.status === "online"} />
                              <div>
                                <div style={{ fontWeight: 600, color: C.t1 }}>{u.name}</div>
                                <div style={{ fontSize: 11, color: C.t3 }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {u.department_name ? (
                              <Tag text={u.department_name} color={C.a} />
                            ) : (
                              <span style={{ fontSize: 11, color: C.t3 }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: FM, background: u.role === "admin" ? C.pd : u.role === "owner" ? C.yd : C.s3, color: u.role === "admin" ? C.p : u.role === "owner" ? C.y : C.t2 }}>{u.role}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 12, color: permCount === MODULES.length ? C.g : C.y }}>
                              {permCount === MODULES.length ? "Full Access" : `${permCount}/${MODULES.length} modules`}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button className="hov" onClick={() => openUserModal(u)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.s3, color: C.t2, border: `1px solid ${C.b1}`, cursor: "pointer" }}>Edit</button>
                              <button className="hov" onClick={() => deleteUser(u.id)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.rd, color: C.r, border: `1px solid ${C.r}44`, cursor: "pointer" }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* Departments tab */
          <>
            {departments.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: C.t3 }}>
                <NavIcon id="crm" s={48} col={C.t3} />
                <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>No departments yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Create departments to organize your users.</div>
                <div style={{ marginTop: 16 }}><Btn ch="+ Add Department" v="primary" onClick={() => openDeptModal()} /></div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {departments.map(d => (
                  <div key={d.id} className="card-lift" style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 12, padding: 20, cursor: "pointer" }} onClick={() => openDeptModal(d)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: C.ad, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <NavIcon id="crm" s={18} col={C.a} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: FD }}>{d.name}</div>
                        {d.description && <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{d.description}</div>}
                      </div>
                      <button className="hov" onClick={e => { e.stopPropagation(); deleteDept(d.id); }} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, background: C.rd, color: C.r, border: `1px solid ${C.r}44`, cursor: "pointer" }}>Delete</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <NavIcon id="users" s={14} col={C.t3} />
                      <span style={{ fontSize: 12, color: C.t2 }}>{d.member_count || 0} member{d.member_count !== 1 ? "s" : ""}</span>
                    </div>
                    {/* Show member avatars */}
                    {users.filter(u => u.department_id === d.id).length > 0 && (
                      <div style={{ display: "flex", gap: -4, marginTop: 10 }}>
                        {users.filter(u => u.department_id === d.id).slice(0, 5).map((u, i) => (
                          <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0 }}>
                            <Av i={u.avatar || "?"} c={u.color || C.a} s={26} />
                          </div>
                        ))}
                        {users.filter(u => u.department_id === d.id).length > 5 && (
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.s3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.t3, marginLeft: -8, border: `2px solid ${C.s1}` }}>+{users.filter(u => u.department_id === d.id).length - 5}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <Mdl title={editUser ? "Edit User" : "Create User"} onClose={() => setShowUserModal(false)} w={520}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name *</label>
              <Inp val={uName} set={setUName} ph="e.g. John Doe" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Email *</label>
              <Inp val={uEmail} set={setUEmail} ph="e.g. john@company.com" type="email" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>{editUser ? "New Password (leave blank to keep)" : "Password *"}</label>
              <Inp val={uPass} set={setUPass} ph={editUser ? "Leave blank to keep current" : "Min 6 characters"} type="password" />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Role</label>
                <Sel val={uRole} set={setURole} opts={[{ v: "agent", l: "Agent" }, { v: "admin", l: "Admin" }, { v: "owner", l: "Owner" }]} sx={{ width: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Department</label>
                <select value={uDept} onChange={e => setUDept(e.target.value)} style={{ background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: C.t1, fontFamily: FB, cursor: "pointer", outline: "none", width: "100%" }}>
                  <option value="">No Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>Module Access</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={selectAllPerms} style={{ fontSize: 10, color: C.a, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Select All</button>
                  <button onClick={clearAllPerms} style={{ fontSize: 10, color: C.t3, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear All</button>
                </div>
              </div>
              <div style={{ background: C.bg, border: `1px solid ${C.b1}`, borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {MODULES.map(m => {
                  const on = uPerms.includes(m.key);
                  return (
                    <div key={m.key} onClick={() => togglePerm(m.key)} className="hov" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer", background: on ? C.ad : "transparent", border: `1px solid ${on ? C.a + "44" : "transparent"}`, transition: "all .15s" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${on ? C.a : C.b1}`, background: on ? C.a : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                        {on && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>&#10003;</span>}
                      </div>
                      <NavIcon id={m.icon} s={14} col={on ? C.a : C.t3} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: on ? C.t1 : C.t3 }}>{m.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: C.t3, marginTop: 6 }}>
                {uPerms.length === MODULES.length ? "Full access to all modules" : `Access to ${uPerms.length} of ${MODULES.length} modules`}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn ch="Cancel" v="ghost" onClick={() => setShowUserModal(false)} />
              <Btn ch={saving ? "Saving..." : editUser ? "Update User" : "Create User"} v="primary" onClick={saveUser} disabled={saving} />
            </div>
          </div>
        </Mdl>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <Mdl title={editDept ? "Edit Department" : "Create Department"} onClose={() => setShowDeptModal(false)} w={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Department Name *</label>
              <Inp val={dName} set={setDName} ph="e.g. Sales, Support, Engineering" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, fontFamily: FM, color: C.t3, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Description</label>
              <Inp val={dDesc} set={setDDesc} ph="Optional description" />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn ch="Cancel" v="ghost" onClick={() => setShowDeptModal(false)} />
              <Btn ch={deptSaving ? "Saving..." : editDept ? "Update" : "Create"} v="primary" onClick={saveDept} disabled={deptSaving} />
            </div>
          </div>
        </Mdl>
      )}
    </div>
  );
}
