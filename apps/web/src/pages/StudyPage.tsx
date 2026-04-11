import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import type { Child, Guardian, ProcessedContent, Subject } from "../types";
import { FileDropzone } from "../components/FileDropzone";
import { MermaidBlock } from "../components/MermaidBlock";

type Props = {
  guardian: Guardian;
};

type GeneratedQuestion = {
  id: string;
  question: string;
  options: string[];
};

export function StudyPage({ guardian }: Props) {
  const { childId } = useParams();
  const [child, setChild] = useState<Child | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [contents, setContents] = useState<ProcessedContent[]>([]);
  const [activeContentId, setActiveContentId] = useState("");
  const [tab, setTab] = useState<"resumo" | "guia" | "teste" | "aprenda">("resumo");
  const [mode, setMode] = useState<"crianca" | "responsavel">("crianca");
  const [details, setDetails] = useState("");
  const [detailRefs, setDetailRefs] = useState<string[]>([]);

  const [questionCount, setQuestionCount] = useState(10);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");

  const activeContent = useMemo(
    () => contents.find((c) => c.id === activeContentId) || null,
    [contents, activeContentId]
  );

  async function load() {
    const childrenRes = await api.get("/children");
    const found = childrenRes.data.children.find((item: Child) => item.id === childId);
    setChild(found || null);
    if (found?.subjects[0]) setSubjectId(found.subjects[0].subject.id);

    if (childId) {
      const contentRes = await api.get(`/content/child/${childId}`);
      setContents(contentRes.data.contents);
      if (contentRes.data.contents[0]) setActiveContentId(contentRes.data.contents[0].id);
    }
  }

  useEffect(() => {
    load().catch(() => setStatus("Erro ao carregar dados da criança."));
  }, [childId]);

  async function processUpload(event: FormEvent) {
    event.preventDefault();
    if (!file || !childId || !subjectId) {
      setStatus("Selecione a matéria e um arquivo.");
      return;
    }

    setProcessing(true);
    setStatus("Processando conteúdo com IA...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("childId", childId);
    formData.append("subjectId", subjectId);

    try {
      const processRes = await api.post("/content/process", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (!processRes.data.hadExtractedText) {
        setStatus("Arquivo sem texto detectável. A IA usou fallback offline e sugestões de melhoria.");
      } else {
        setStatus("Conteúdo processado com sucesso.");
      }

      await load();
      setFile(null);
    } catch {
      setStatus("Falha no processamento. Verifique conexão/API e tente novamente.");
    } finally {
      setProcessing(false);
    }
  }

  async function fetchMoreDetails() {
    if (!activeContent) return;
    const { data } = await api.post(`/content/${activeContent.id}/more-details`);
    setDetails(data.details);
    setDetailRefs(data.references || []);
  }

  async function generateTest() {
    if (!activeContent) return;
    const { data } = await api.post("/tests/generate", {
      contentId: activeContent.id,
      questionCount
    });
    setGeneratedQuestions(data.questions);
    setAnswers(new Array(data.questions.length).fill(-1));
    setResult(null);
  }

  async function submitTest() {
    if (!activeContent) return;
    const { data } = await api.post("/tests/submit", {
      contentId: activeContent.id,
      answers
    });
    setResult(data);
  }

  function onAnswer(index: number, value: number) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  if (!child) {
    return <main className="container">Criança não encontrada.</main>;
  }

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <h1>{child.name}</h1>
          <p>
            {child.age} anos • {child.gradeLevel.replaceAll("_", " ")} • Responsável: {guardian.fullName}
          </p>
        </div>
        <div className="actions-inline">
          <Link className="ghost-btn" to="/">
            Voltar
          </Link>
          <Link className="ghost-btn" to={`/history/${child.id}`}>
            Histórico
          </Link>
        </div>
      </header>

      <section className="card upload-card">
        <div className="actions-inline">
          <label>
            Matéria
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {child.subjects.map((item) => (
                <option key={item.subject.id} value={item.subject.id}>
                  {item.subject.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mode-switch small">
            <button className={mode === "crianca" ? "selected" : ""} type="button" onClick={() => setMode("crianca")}>
              Modo Criança
            </button>
            <button
              className={mode === "responsavel" ? "selected" : ""}
              type="button"
              onClick={() => setMode("responsavel")}
            >
              Modo Responsável
            </button>
          </div>
        </div>

        <form onSubmit={processUpload}>
          <FileDropzone onFile={setFile} disabled={processing} />
          {file && <p>Arquivo selecionado: {file.name}</p>}
          <button className="primary-btn" type="submit" disabled={processing || !file}>
            {processing ? "Processando..." : "Processar arquivo"}
          </button>
        </form>
        {processing && <div className="spinner" aria-label="loading" />}
        {status && <p className="info-box">{status}</p>}
      </section>

      <section className="content-layout">
        <aside className="card content-list">
          <h3>Conteúdos processados</h3>
          {contents.map((content) => (
            <button
              className={`list-item ${content.id === activeContentId ? "active" : ""}`}
              key={content.id}
              onClick={() => setActiveContentId(content.id)}
            >
              {content.subject.name} • {new Date(content.createdAt).toLocaleDateString("pt-BR")}
            </button>
          ))}
        </aside>

        <article className={`card tabs-card ${mode}`}>
          {!activeContent ? (
            <p>Envie um arquivo para iniciar.</p>
          ) : (
            <>
              <div className="tab-buttons">
                <button className={tab === "resumo" ? "selected" : ""} onClick={() => setTab("resumo")}>
                  Resumo
                </button>
                <button className={tab === "guia" ? "selected" : ""} onClick={() => setTab("guia")}>
                  Guia
                </button>
                <button className={tab === "teste" ? "selected" : ""} onClick={() => setTab("teste")}>
                  Teste
                </button>
                <button className={tab === "aprenda" ? "selected" : ""} onClick={() => setTab("aprenda")}>
                  Aprenda+
                </button>
              </div>

              {tab === "resumo" && (
                <section>
                  <p className="badge">Nível: {activeContent.complexityLevel}</p>
                  <p>{activeContent.summaryForKid}</p>
                  {mode === "crianca" && <p className="badge success">Badge ganho: Explorador do Conhecimento</p>}
                </section>
              )}

              {tab === "guia" && (
                <section>
                  <p>{activeContent.detailedGuide}</p>
                  <MermaidBlock chart={activeContent.mermaidFlowchart} />
                  {activeContent.generatedImageUrl && (
                    <img alt="Ilustração de apoio" className="guide-image" src={activeContent.generatedImageUrl} />
                  )}
                  <button className="ghost-btn" onClick={fetchMoreDetails}>
                    Mais Detalhes
                  </button>
                  {details && (
                    <div className="details-box">
                      <p>{details}</p>
                      {detailRefs.length > 0 && (
                        <ul>
                          {detailRefs.map((ref) => (
                            <li key={ref}>{ref}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </section>
              )}

              {tab === "teste" && (
                <section>
                  <label>
                    Nº de questões (5-50)
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                    />
                  </label>
                  <button className="primary-btn" onClick={generateTest}>
                    Gerar teste cego
                  </button>

                  {generatedQuestions.map((question, qIndex) => (
                    <div className="question-card" key={question.id}>
                      <p>
                        {qIndex + 1}. {question.question}
                      </p>
                      {question.options.map((option, oIndex) => (
                        <label key={option} className="option-item">
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            onChange={() => onAnswer(qIndex, oIndex)}
                            checked={answers[qIndex] === oIndex}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ))}

                  {generatedQuestions.length > 0 && (
                    <button className="primary-btn" onClick={submitTest}>
                      Finalizar teste
                    </button>
                  )}

                  {result && (
                    <div className="result-box">
                      <h4>Pontuação: {result.scorePercent}%</h4>
                      {result.feedback.map((item: any, index: number) => (
                        <article key={index} className={item.correct ? "feedback-ok" : "feedback-error"}>
                          <p>{item.question}</p>
                          <p>{item.reason}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {tab === "aprenda" && (
                <section className="recommend-grid">
                  {activeContent.recommendations.slice(0, 10).map((rec) => (
                    <a href={rec.url} key={rec.id} target="_blank" rel="noreferrer" className="recommend-card">
                      {rec.thumbnailUrl ? <img src={rec.thumbnailUrl} alt={rec.title} /> : <div className="thumb-placeholder" />}
                      <h4>{rec.title}</h4>
                      <p>
                        {rec.source} • Relevância {Math.round(rec.relevanceScore * 100)}%
                      </p>
                    </a>
                  ))}
                </section>
              )}
            </>
          )}
        </article>
      </section>
    </main>
  );
}