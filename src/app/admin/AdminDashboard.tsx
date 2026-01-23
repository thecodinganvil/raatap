"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface WaitlistEntry {
  id: string;
  user_id: string;
  email: string;
  name: string;
  gender: string;
  college: string;
  start_area: string;
  end_area: string;
  travel_time_start: string;
  travel_time_end: string;
  role: string;
  license_url: string | null;
  created_at: string;
}

type SortField = "created_at" | "name" | "college" | "role";
type SortOrder = "asc" | "desc";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WaitlistEntry[]>([]);
  
  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Unique colleges for filter dropdown
  const [colleges, setColleges] = useState<string[]>([]);

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/verify");
        const data = await res.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAdminEmail(data.email);
          await fetchEntries();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsAuthenticated(true);
        setAdminEmail(email);
        await fetchEntries();
      } else {
        setLoginError(data.error || "Invalid credentials");
      }
    } catch {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAuthenticated(false);
      setAdminEmail("");
      setEntries([]);
      setFilteredEntries([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/admin/waitlist");
      
      if (!res.ok) {
        console.error("Error fetching entries:", await res.text());
        return;
      }
      
      const { entries: data } = await res.json();

      const entriesData = (data || []) as WaitlistEntry[];
      setEntries(entriesData);
      setFilteredEntries(entriesData);
      
      // Extract unique colleges
      const uniqueColleges = [...new Set(entriesData.map((e: WaitlistEntry) => e.college).filter(Boolean))] as string[];
      setColleges(uniqueColleges.sort());
    } catch (error) {
      console.error("Error fetching entries:", error);
    }
  };

  // Filter and sort entries
  useEffect(() => {
    let result = [...entries];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry: WaitlistEntry) =>
          entry.name?.toLowerCase().includes(query) ||
          entry.email?.toLowerCase().includes(query) ||
          entry.college?.toLowerCase().includes(query)
      );
    }

    // College filter
    if (collegeFilter !== "all") {
      result = result.filter((entry: WaitlistEntry) => entry.college === collegeFilter);
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((entry: WaitlistEntry) => entry.role === roleFilter);
    }

    // Sort
    result.sort((a: WaitlistEntry, b: WaitlistEntry) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";
      
      if (sortField === "created_at") {
        aVal = new Date(aVal).getTime().toString();
        bVal = new Date(bVal).getTime().toString();
      }
      
      if (sortOrder === "asc") {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });

    setFilteredEntries(result);
  }, [entries, searchQuery, collegeFilter, roleFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "host": return "bg-blue-100 text-blue-700 border-blue-200";
      case "passenger": return "bg-green-100 text-green-700 border-green-200";
      case "both": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getGenderBadgeColor = (gender: string) => {
    switch (gender) {
      case "male": return "bg-sky-100 text-sky-700";
      case "female": return "bg-pink-100 text-pink-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Stats
  const stats = {
    total: entries.length,
    hosts: entries.filter((e: WaitlistEntry) => e.role === "host").length,
    passengers: entries.filter((e: WaitlistEntry) => e.role === "passenger").length,
    both: entries.filter((e: WaitlistEntry) => e.role === "both").length,
    uniqueColleges: colleges.length,
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#6675FF]/20"></div>
          <p className="text-gray-500">Loading admin dashboard...</p>
        </div>
      </main>
    );
  }

  // Login Form
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center px-4">
        {/* Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <Image src="/favicon.png" alt="Raatap" width={40} height={40} className="w-10 h-10" />
            </Link>
            <span className="inline-block px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full mb-4">
              Admin Access
            </span>
            <h1 className="text-2xl font-medium text-[#171717]">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-2">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] transition-colors"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 bg-[#6675FF] text-white font-medium rounded-xl hover:bg-[#5563ee] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-[#6675FF] transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated Dashboard
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] px-4 py-8">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/favicon.png" alt="Raatap" width={32} height={32} className="w-8 h-8" />
              </Link>
              <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Admin Dashboard
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-medium text-[#171717]">
              Waitlist Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Logged in as {adminEmail}
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
            <p className="text-3xl font-semibold text-[#171717]">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Signups</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
            <p className="text-3xl font-semibold text-blue-600">{stats.hosts}</p>
            <p className="text-sm text-gray-500">Hosts</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
            <p className="text-3xl font-semibold text-green-600">{stats.passengers}</p>
            <p className="text-sm text-gray-500">Passengers</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
            <p className="text-3xl font-semibold text-purple-600">{stats.both}</p>
            <p className="text-sm text-gray-500">Both</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
            <p className="text-3xl font-semibold text-amber-600">{stats.uniqueColleges}</p>
            <p className="text-sm text-gray-500">Colleges</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/50 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, or college..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] transition-colors"
                />
              </div>
            </div>

            {/* College Filter */}
            <div className="md:w-48">
              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] focus:outline-none focus:border-[#6675FF] transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Colleges</option>
                {colleges.map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="md:w-40">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] focus:outline-none focus:border-[#6675FF] transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="host">Host</option>
                <option value="passenger">Passenger</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-3">
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <span className="flex items-center gap-1">
                      Name
                      {sortField === "name" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                    onClick={() => handleSort("college")}
                  >
                    <span className="flex items-center gap-1">
                      College
                      {sortField === "college" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                    onClick={() => handleSort("role")}
                  >
                    <span className="flex items-center gap-1">
                      Role
                      {sortField === "role" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 transition-colors"
                    onClick={() => handleSort("created_at")}
                  >
                    <span className="flex items-center gap-1">
                      Joined
                      {sortField === "created_at" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      {entries.length === 0 ? "No waitlist entries yet" : "No entries match your filters"}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="font-medium text-[#171717]">{entry.name}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{entry.email}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getGenderBadgeColor(entry.gender)}`}>
                          {entry.gender}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-[#171717] max-w-[150px] truncate" title={entry.college}>
                          {entry.college}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-gray-600">
                          <span className="text-green-600">From:</span> {entry.start_area}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="text-red-600">To:</span> {entry.end_area}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {entry.travel_time_start} - {entry.travel_time_end}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg border capitalize ${getRoleBadgeColor(entry.role)}`}>
                          {entry.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {entry.license_url ? (
                          <a
                            href={entry.license_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#6675FF] hover:underline"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* College Breakdown */}
        {colleges.length > 0 && (
          <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50">
            <h2 className="text-lg font-medium text-[#171717] mb-4">Signups by College</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colleges.map(college => {
                const count = entries.filter((e: WaitlistEntry) => e.college === college).length;
                const percentage = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
                return (
                  <div 
                    key={college} 
                    className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl cursor-pointer hover:bg-[#6675FF]/5 transition-colors"
                    onClick={() => setCollegeFilter(collegeFilter === college ? "all" : college)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#171717] truncate" title={college}>
                        {college}
                      </p>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-[#6675FF] h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="text-lg font-semibold text-[#6675FF]">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Admin Dashboard • Raatap © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
