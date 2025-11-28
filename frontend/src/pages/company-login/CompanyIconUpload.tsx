import { useState } from "react";
import api from "../../api/axios";

type Props = {
  companyId: number;
};

export default function CompanyIconUpload({ companyId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("icon", file);

    try {
      setUploading(true);
      await api.post(`/company/icon/upload/${companyId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Ícone enviado com sucesso!");
    } catch (err) {
      alert("Erro ao enviar ícone");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <input type="file" accept="image/*" onChange={handleChange} />
      <button type="submit" disabled={!file || uploading}>
        {uploading ? "Enviando..." : "Enviar ícone"}
      </button>
    </form>
  );
}
