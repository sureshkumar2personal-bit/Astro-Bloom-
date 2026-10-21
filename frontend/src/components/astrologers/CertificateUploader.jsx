export default function CertificateUploader({ certificates, onUpload }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('certificateName', file.name);
    onUpload(fd);
  };

  return (
    <div className="edit-section">
      <h2>Certificates</h2>
      {certificates.map((c, i) => (
        <div key={i} className="cert-row">
          <span>📜 {c.certificateName}</span>
          <span className={`cert-status cert-${c.verificationStatus}`}>{c.verificationStatus}</span>
        </div>
      ))}
      <label className="upload-btn">
        <input type="file" accept="image/*,application/pdf" hidden onChange={handleFile} />
        + Upload Certificate
      </label>
    </div>
  );
}
