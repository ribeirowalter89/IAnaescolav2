import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, clearAuthToken } from "../services/api";
import type { Child, Guardian, Subject } from "../types";

const grades = [
  "ANO_1_FUND",
  "ANO_2_FUND",
  "ANO_3_FUND",
  "ANO_4_FUND",
  "ANO_5_FUND",
  "ANO_6_FUND",
  "ANO_7_FUND",
  "ANO_8_FUND",
  "ANO_9_FUND",
  "ANO_1_MEDIO",
  "ANO_2_MEDIO",
  "ANO_3_MEDIO"
];

type Props = {
  guardian: Guardian;
};

export function DashboardPage({ guardian }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<Child | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [status, setStatus] = useState("");

  const title = useMemo(() => (editing ? "Editar criança" : "Adicionar criança"), [editing]);

  async function loadData() {
    const [childrenRes, subjectRes] = await Promise.all([api.get("/children"), api.get("/children/subjects")]);
    setChildren(childrenRes.data.children);
    setSubjects(subjectRes.data.subjects);
  }

  useEffect(() => {
    loadData().catch(() => setStatus("Erro ao carregar dashboard."));
  }, []);

  async function submitChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hobbies = String(formData.get("hobbies") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      name: formData.get("name"),
      age: Number(formData.get("age")),
      gradeLevel: formData.get("gradeLevel"),
      hobbies,
      subjectIds: formData.getAll("subjectIds")
    };

    if (!payload.subjectIds.length) {
      setStatus("Selecione pelo menos uma matéria.");
      return;
    }

    if (editing) {
      await api.put(`/children/${editing.id}`, payload);
      setStatus("Criança atualizada com sucesso.");
    } else {
      await api.post("/children", payload);
      setStatus("Criança cadastrada com sucesso.");
    }

    setOpenForm(false);
    setEditing(null);
    await loadData();
  }

  async function shareAccess(childId: string) {
    const email = window.prompt("Email do responsável secundário:");
    if (!email) return;

    try {
      await api.post(`/children/${childId}/share`, { guardianEmail: email, role: "SECUNDARIO" });
      setStatus("Acesso compartilhado com sucesso.");
    } catch {
      setStatus("Não foi possível compartilhar. Verifique se o responsável já tem conta.");
    }
  }

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <h1>EstudoIA Kids</h1>
          <p>Responsável: {guardian.fullName}</p>
        </div>
        <button
          className="ghost-btn"
          onClick={() => {
            clearAuthToken();
            window.location.href = "/auth";
          }}
        >
          Sair
        </button>
      </header>

      <section className="card-row">
        <article className="card highlight">
          <h2>Crianças da conta</h2>
          <p>{children.length} perfil(s) cadastrados</p>
          <button className="primary-btn" onClick={() => setOpenForm(true)}>
            + Adicionar criança
          </button>
        </article>
      </section>

      {status && <p className="info-box">{status}</p>}

      <section className="grid-cards">
        {children.map((child) => (
          <article className="child-card" key={child.id}>
            <h3>{child.name}</h3>
            <p>
              {child.age} anos • {child.gradeLevel.replaceAll("_", " ")}
            </p>
            <p className="chips">
              {child.subjects.map((s) => (
                <span key={s.subject.id}>{s.subject.name}</span>
              ))}
            </p>
            <p>Hobbies: {child.hobbies.join(", ") || "-"}</p>
            <div className="actions-inline">
              <Link className="primary-btn" to={`/study/${child.id}`}>
                Estudar
              </Link>
              <Link className="ghost-btn" to={`/history/${child.id}`}>
                Histórico
              </Link>
              <button
                className="ghost-btn"
                onClick={() => {
                  setEditing(child);
                  setOpenForm(true);
                }}
              >
                Editar
              </button>
              <button className="ghost-btn" onClick={() => shareAccess(child.id)}>
                Compartilhar
              </button>
            </div>
          </article>
        ))}
      </section>

      {openForm && (
        <dialog className="modal" open>
          <form onSubmit={submitChild} className="grid-form">
            <h3>{title}</h3>
            <label>
              Nome
              <input name="name" defaultValue={editing?.name || ""} required />
            </label>
            <label>
              Idade (5-18)
              <input name="age" type="number" min={5} max={18} defaultValue={editing?.age || 8} required />
            </label>
            <label>
              Ano escolar
              <select name="gradeLevel" defaultValue={editing?.gradeLevel || "ANO_5_FUND"}>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hobbies (separados por vírgula)
              <input name="hobbies" defaultValue={editing?.hobbies.join(", ") || ""} />
            </label>

            <fieldset>
              <legend>Matérias</legend>
              <div className="subject-grid">
                {subjects.map((subject) => (
                  <label key={subject.id} className="subject-item">
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={subject.id}
                      defaultChecked={Boolean(editing?.subjects.some((s) => s.subject.id === subject.id))}
                    />
                    {subject.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="actions-inline">
              <button className="primary-btn" type="submit">
                Salvar
              </button>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => {
                  setOpenForm(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </dialog>
      )}
    </main>
  );
}