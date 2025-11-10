import { useState } from "react";
import axios from "axios";
import Head from "next/head";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState(""); // estado para o RA ou Nome digitado
  const [loading, setLoading] = useState(false); // logica para loading

  const [studentResults, setStudentResults] = useState([]); // lista de resultados de alunos
  const [error, setError] = useState(""); // mensagem de erro

  const [hasSearched, setHasSearched] = useState(false); // para controlar se uma busca foi feita

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError("Por favor, digite o RA ou Nome do aluno");
      return;
    }

    setLoading(true); // mostra a animação de loading
    setError(""); // limpa mensagens de erro
    setStudentResults([]); // limpa resultados anteriores
    setHasSearched(false); // reseta o estado de busca

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await axios.post(`${API_URL}/api/verify-student`, {
        searchTerm: searchTerm.trim(),
      });

      if (response.data.success) {
        setStudentResults(response.data.data);
        setSearchTerm(""); // Limpa o campo
      } else {
        setError(response.data.message || "Erro ao buscar aluno");
      }
    } catch (err) {
      setError(
        "Erro de conexão com o servidor. Verifique se o backend está rodando."
      );
      console.error("Erro:", err);
    } finally {
      setLoading(false); // esconde a animação de loading
      setHasSearched(true); // marca que uma busca foi concluída
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-100 flex flex-col items-center justify-start p-4 sm:p-8">
      <Head>
        <title>Controle de Estacionamento - FSH</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* logo da fsh */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <img
          src="/logo-fsh.avif"
          alt="Logo da FSH (Faculdade Santa Helena)"
          className="w-24 sm:w-32 h-auto" // Um pouco menor em telas pequenas
        />
      </div>

      {/* Card Principal de Busca */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md mt-16 sm:mt-0">
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Controle de Estacionamento
          </h1>
          <p className="text-gray-600">Verifique o acesso do aluno</p>
        </div>

        {/* Campo de Busca */}
        <div className="mb-4">
          <label
            htmlFor="ra"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Digite o RA ou Nome do aluno:
          </label>
          <input
            id="ra"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ex: 2023001 ou Bruno"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              VERIFICANDO...
            </>
          ) : (
            "VERIFICAR"
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-center">{error}</p>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema integrado com JACAD</p>
          <p className="mt-1">FSH - {new Date().getFullYear()}</p>
        </div>
      </div>

      <div className="w-full max-w-md mt-6">
        {/* Caso 1: Busca concluída, NENHUM resultado */}
        {hasSearched && !loading && studentResults.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="font-medium text-gray-700">Nenhum aluno encontrado</p>
            <p className="text-sm text-gray-500">
              Verifique o RA ou o nome digitado.
            </p>
          </div>
        )}

        {/* Caso 2: Busca concluída, encontrou resultados */}
        {studentResults.length > 0 && !loading && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Resultados encontrados: ({studentResults.length})
            </h2>

            {studentResults.map((student, index) => (
              <div
                key={student.ra || index} // chave única é o RA
                className={`p-4 rounded-lg border-2 shadow-sm bg-white ${
                  student.active ? "border-green-400" : "border-red-400"
                }`}
              >
                <div>
                  <p
                    className={`text-lg font-bold ${
                      student.active ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {student.active ? "MATRÍCULA ATIVA" : "MATRÍCULA NÃO ATIVA"}
                  </p>
                  <p className="text-gray-800 font-semibold text-lg mt-2">
                    {student.name}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">RA: {student.ra}</p>
                  <p className="text-gray-600 text-sm">
                    Curso: {student.course}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
