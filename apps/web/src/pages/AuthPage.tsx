import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuthToken } from "../services/api";
import type { Guardian } from "../types";

type Props = {
  onAuth: (guardian: Guardian) => void;
};

export function AuthPage({ onAuth }: Props) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setLoading(true);
    setError("");
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, payload);
      setAuthToken(data.token);
      onAuth(data.guardian);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <h1>EstudoIA Kids</h1>
        <p>Estudo inteligente para crianças e acompanhamento para responsáveis.</p>

        <div className="mode-switch">
          <button className={isRegister ? "selected" : ""} type="button" onClick={() => setIsRegister(true)}>
            Cadastro
          </button>
          <button className={!isRegister ? "selected" : ""} type="button" onClick={() => setIsRegister(false)}>
            Login
          </button>
        </div>

        <form onSubmit={submit} className="grid-form">
          {isRegister && (
            <>
              <label>
                Nome completo
                <input name="fullName" required />
              </label>
              <label>
                CPF
                <input name="cpf" required placeholder="000.000.000-00" />
              </label>
              <label>
                Telefone
                <input name="phone" required placeholder="(11) 99999-9999" />
              </label>
            </>
          )}

          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" required />
          </label>

          {error && <p className="error-box">{error}</p>}
          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? "Processando..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}