import { useMemo } from "react";
import { useDropzone } from "react-dropzone";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function FileDropzone({ onFile, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"]
    },
    onDrop: (files) => {
      if (files[0]) onFile(files[0]);
    }
  });

  const hint = useMemo(() => {
    if (disabled) return "Processando conteúdo...";
    if (isDragActive) return "Solte o arquivo aqui";
    return "Arraste PDF, DOCX, JPG ou PNG";
  }, [disabled, isDragActive]);

  return (
    <div className={`dropzone ${isDragActive ? "active" : ""} ${disabled ? "disabled" : ""}`} {...getRootProps()}>
      <input {...getInputProps()} />
      <p>{hint}</p>
    </div>
  );
}