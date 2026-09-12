import { useState, FormEvent } from "react";
import { login, setToken } from "../api/client";
import { ErrorMessage } from "../components";

interface LoginProps {
  t: (key: string) => string;
  onLogin: () => void;
}

export default function Login({ t, onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const data = await login(username, password);
      setToken(data.access_token);
      onLogin();
    } catch (e: any) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white border border-slate-200 rounded-xl p-6">
      <h2 className="text-base font-bold text-slate-800 mb-4">{t("login")}</h2>
      <form onSubmit={doLogin} className="space-y-3">
        <div>
          <label htmlFor="username" className="block text-xs text-slate-600 mb-1">
            {t("username")}
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs text-slate-600 mb-1">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {err && (
          <ErrorMessage
            message={err}
            onDismiss={() => setErr("")}
          />
        )}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-busy={loading}
        >
          {loading ? t("loading") : t("login")}
        </button>
        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
          Demo users: admin1/Admin123! (admin) • analyst1/Analyst123! • viewer1/Viewer123!
        </div>
      </form>
    </div>
  );
}
