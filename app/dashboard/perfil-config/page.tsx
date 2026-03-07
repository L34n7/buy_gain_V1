"use client";

import "./perfil-config.css";
import React, { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useRouter } from "next/navigation";

type ProfileFormData = {
  name: string;
  nickname: string;
  birth_date: string | null;
  phone: string;
  avatar_url: string;

  gender: string | null;
  city: string;
  state: string;
  allow_notifications: boolean;
  document_type: string | null;
  document_value: string;
};

type CropArea = { x: number; y: number; width: number; height: number };

function validateNickname(nickname: string): string | null {
  if (!nickname) return "Nickname é obrigatório";
  if (nickname.length < 3 || nickname.length > 20) return "Nickname deve ter entre 3 e 20 caracteres";
  if (!/^[a-z0-9._]+$/.test(nickname)) return "Use apenas letras minúsculas, números, ponto ou underline";
  if (/^[._]|[._]$/.test(nickname)) return "Nickname não pode começar ou terminar com ponto ou underline";
  return null;
}

const PROFILE_REWARD_POINTS = 260;

export default function ProfileForm() {
  const router = useRouter();

  const [form, setForm] = useState<ProfileFormData>({
    name: "",
    nickname: "",
    birth_date: null,
    phone: "",
    avatar_url: "",
    gender: null,
    city: "",
    state: "",
    allow_notifications: true,
    document_type: null,
    document_value: "",
  });

  function handleBack() {
    router.push("/dashboard/perfil");
  }

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [progress, setProgress] = useState<number>(0);

  /* image crop */
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [openCrop, setOpenCrop] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<ProfileFormData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  // NOVO: avatar temporário (guardado até o usuário clicar "Salvar alterações")
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  function digitsOnly(v = "") {
    return String(v).replace(/\D/g, "");
  }

  function formatPhoneForDisplay(digits: string) {
    const d = digitsOnly(digits);
    if (!d) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  }

  function formatCPFForDisplay(digits: string) {
    const d = digitsOnly(digits);
    if (!d) return "";
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }

  // simple CPF check (same as backend)
  function isValidCPF(cpfRaw: string) {
    const cpf = digitsOnly(cpfRaw);
    if (!cpf || cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    const nums = cpf.split("").map(Number);
    const calcCheck = (arr: number[], factor: number) => {
      const total = arr.reduce((acc, val) => acc + val * factor--, 0);
      const mod = total % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const first = calcCheck(nums.slice(0, 9), 10);
    const second = calcCheck(nums.slice(0, 10), 11);
    return first === nums[9] && second === nums[10];
  }

  function isValidPhone(digits: string) {
    const d = digitsOnly(digits);
    return d.length === 10 || d.length === 11;
  }

  function isValidState(s: string) {
    return /^[A-Z]{2}$/.test(String(s).toUpperCase());
  }

  function computeProgress(data: ProfileFormData) {
    const checks: boolean[] = [];
    checks.push(Boolean(String(data.name).trim()));
    checks.push(Boolean(String(data.nickname).trim()));
    checks.push(Boolean(data.birth_date));
    checks.push(isValidPhone(data.phone));
    checks.push(Boolean(data.avatar_url && data.avatar_url.trim()));
    checks.push(Boolean(data.gender));
    checks.push(Boolean(String(data.city).trim()));
    checks.push(isValidState(data.state));
    checks.push(Boolean(data.document_type));
    if (data.document_type === "CPF") {
      checks.push(digitsOnly(data.document_value).length === 11);
    } else if (data.document_type === "RG") {
      checks.push(digitsOnly(data.document_value).length >= 5);
    } else {
      checks.push(false);
    }
    const filled = checks.filter(Boolean).length;
    const total = checks.length || 1;
    return Math.round((filled / total) * 100);
  }

  useEffect(() => {
    // 🔒 Se o perfil já foi concluído no backend,
    // o progresso fica travado em 100%
    if (profileCompleted) {
      setProgress(100);
      return;
    }

    setProgress(computeProgress(form));
  }, [form, profileCompleted]);

  async function shootConfetti() {
    if (typeof window === "undefined") return;

    const duration = 800;
    const end = Date.now() + duration;

    const colors = ["#8b3cf2", "#00fff5", "#ffffff", "#ffd700"];

    const frame = () => {
      if (Date.now() > end) return;

      // esquerda
      (window as any).confetti?.({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0, y:0.6 },
        colors,
      });

      // direita
      (window as any).confetti?.({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1, y:0.6 },
        colors,
      });

      requestAnimationFrame(frame);
    };

    try {
      const mod = await import("canvas-confetti");
      (window as any).confetti = mod.default ?? mod;
      frame();
    } catch {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js";
      script.onload = () => frame();
      document.head.appendChild(script);
    }
  }

  function showToast(message: string, duration = 5000) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration);
  }

  async function reloadProfile() {
    try {
      const res = await fetch("/api/profile", {
      credentials: "include",
    });
      if (!res.ok) return;
      const data = await res.json();
      if (data.profile) {
        setProfileCompleted(!!data.profile.profile_completed);
        const loadedForm: ProfileFormData = {
          name: data.profile.name ?? "",
          nickname: data.profile.nickname ?? "",
          birth_date: data.profile.birth_date ?? null,
          phone: digitsOnly(data.profile.phone ?? ""),
          avatar_url: data.profile.avatar_url ?? "",
          gender: data.profile.gender ?? null,
          city: data.profile.city ?? "",
          state: (data.profile.state ?? "").toUpperCase(),
          allow_notifications: typeof data.profile.allow_notifications === "boolean" ? data.profile.allow_notifications : true,
          document_type: data.profile.document_type ?? null,
          document_value: digitsOnly(data.profile.document_value ?? ""),
        };

        setForm(loadedForm);
        setInitialForm({ ...loadedForm });
        if (data.profile.profile_completed) {
          setProgress(100);
        } else {
          setProgress(computeProgress(loadedForm));
        }
        if (loadedForm.avatar_url) setAvatarPreview(loadedForm.avatar_url);
      }
    } catch (err) {
      console.error("Erro ao recarregar perfil:", err);
    }
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile",{
        credentials: "include",
      });
        if (!res.ok) {
          console.error("Erro ao buscar perfil");
          return;
        }
        const data = await res.json();
        if (data.profile) {
          setProfileCompleted(!!data.profile.profile_completed);
          const loadedForm: ProfileFormData = {
            name: data.profile.name ?? "",
            nickname: data.profile.nickname ?? "",
            birth_date: data.profile.birth_date ?? null,
            phone: digitsOnly(data.profile.phone ?? ""),
            avatar_url: data.profile.avatar_url ?? "",
            gender: data.profile.gender ?? null,
            city: data.profile.city ?? "",
            state: (data.profile.state ?? "").toUpperCase(),
            allow_notifications: typeof data.profile.allow_notifications === "boolean" ? data.profile.allow_notifications : true,
            document_type: data.profile.document_type ?? null,
            document_value: digitsOnly(data.profile.document_value ?? ""),
          };

          setForm(loadedForm);
          setInitialForm({ ...loadedForm });
          if (data.profile.profile_completed) {
            setProgress(100);
          } else {
            setProgress(computeProgress(loadedForm));
          }
          if (loadedForm.avatar_url) setAvatarPreview(loadedForm.avatar_url);
        }
      } catch (err) {
        console.error("Erro loadProfile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    if (name === "nickname") {
      const normalized = value.toLowerCase().replace(/\s+/g, "");
      setForm((prev) => ({ ...prev, nickname: normalized }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = digitsOnly(e.target.value).slice(0, 11);
    setForm((prev) => ({ ...prev, phone: raw }));
  }

  function handleDocumentTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null;
    setForm((prev) => ({ ...prev, document_type: val, document_value: "" }));
  }

  function handleDocumentValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (form.document_type === "CPF") {
      const raw = digitsOnly(e.target.value).slice(0, 11);
      setForm((prev) => ({ ...prev, document_value: raw }));
    } else {
      const raw = String(e.target.value).slice(0, 12);
      setForm((prev) => ({ ...prev, document_value: raw }));
    }
  }

  function hasChanges() {
    // Se houver avatar pendente, já considera como alteração
    if (pendingAvatarFile) return true;
    if (!initialForm) return false;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }

  // ---------- IMPORTANT FIX: e.preventDefault early ---------- //
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nicknameError = validateNickname(form.nickname);
    if (nicknameError) {
      showToast(`❌ ${nicknameError}`);
      return;
    }

    if (form.document_type === "CPF" && !isValidCPF(form.document_value)) {
      showToast("❌ CPF inválido. Verifique os números digitados.");
      return;
    }

    if (!hasChanges()) return;
    setLoading(true);

    try {
      // Se existir avatar pendente, envia para /api/profile/upload-avatar AGORA
      let finalAvatarUrl = form.avatar_url;

      if (pendingAvatarFile) {
        setProgress(10);
        const formData = new FormData();
        formData.append("file", pendingAvatarFile);

        const uploadRes = await fetch("/api/profile/upload-avatar", {
          credentials: "include",
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();

        if (!uploadRes.ok) {
          showToast(uploadJson.error || "Erro ao enviar avatar");
          setLoading(false);
          return;
        }

        finalAvatarUrl = uploadJson.publicUrl ?? finalAvatarUrl;
        setProgress(60);
      }

      const payload = {
        name: form.name || null,
        nickname: form.nickname || null,
        birth_date: form.birth_date || null,
        phone: form.phone || null,
        avatar_url: finalAvatarUrl || null,
        gender: form.gender || null,
        city: form.city || null,
        state: form.state || null,
        allow_notifications: form.allow_notifications,
        document_type: form.document_type || null,
        document_value: form.document_value || null,
      };

      const res = await fetch("/api/profile/update", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        showToast(result.error || "Erro ao salvar perfil");
        return;
      }

      // Atualiza avatar global: use a URL final (se houve upload, finalAvatarUrl; senão form.avatar_url)
      const avatarToDispatch = finalAvatarUrl || form.avatar_url;

      try {
        window.dispatchEvent(
          new CustomEvent("profile:updated", {
            detail: { avatar_url: avatarToDispatch },
          })
        );
      } catch {}

      try {
        router.refresh();
      } catch {}

      // Atualiza localmente o form e limpa pendingAvatarFile
      setForm((prev) => ({ ...prev, avatar_url: avatarToDispatch }));
      setPendingAvatarFile(null);

      await reloadProfile();

      // 🎉 PERFIL COMPLETO — IMEDIATO
      if (!profileCompleted && result.profile_completed) {

        setProfileCompleted(true);
        setShowCompleteBanner(true);

        // 💥 CONFETTI
        await shootConfetti();

        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("xp:updated", {
              detail: {
                xp_gained: result.xp_gained || 0,
                leveled_up: result.leveled_up || false,
                new_level: result.new_level || null,
                source: "complete_profile",
              },
            })
          );
        }, 6500);

        setTimeout(() => setShowCompleteBanner(false), 7000);

      } else {
        showToast("✅ Perfil salvo com sucesso", 4000);
      }

      // garante que initialForm reflita o que ficou salvo
      setInitialForm((prev) => {
        const base = prev ? { ...prev } : { ...form };
        base.avatar_url = finalAvatarUrl || base.avatar_url;
        base.name = payload.name ?? base.name;
        base.nickname = payload.nickname ?? base.nickname;
        base.birth_date = payload.birth_date ?? base.birth_date;
        base.phone = payload.phone ?? base.phone;
        base.gender = payload.gender ?? base.gender;
        base.city = payload.city ?? base.city;
        base.state = payload.state ?? base.state;
        base.allow_notifications = payload.allow_notifications ?? base.allow_notifications;
        base.document_type = payload.document_type ?? base.document_type;
        base.document_value = payload.document_value ?? base.document_value;
        return base;
      });

    } catch (err) {
      console.error("Erro submit perfil:", err);
      showToast("Erro inesperado ao salvar perfil");
      setInitialForm({ ...form });
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 700);
    }
  }


  // ---------- cropper helpers (mantive sua lógica) ---------- //
  const onCropComplete = useCallback((_croppedArea: any, croppedPixels: any) => {
    if (croppedPixels) {
      setCroppedAreaPixels({
        x: Math.round(croppedPixels.x),
        y: Math.round(croppedPixels.y),
        width: Math.round(croppedPixels.width),
        height: Math.round(croppedPixels.height),
      });
    }
  }, []);

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  async function getCroppedImageBlob(imageSrc: string, cropPx: CropArea) {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível criar contexto do canvas");
    const OUT_SIZE = 512;
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    ctx.drawImage(image, cropPx.x, cropPx.y, cropPx.width, cropPx.height, 0, 0, OUT_SIZE, OUT_SIZE);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", 0.9));
    if (!blob) throw new Error("Falha ao gerar imagem final");
    return blob;
  }

  function handleSelectImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Formato não suportado. Use JPG, PNG ou WEBP.");
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast("Imagem muito grande. Máx: 2MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setOpenCrop(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  // NOVO: agora apenas gera preview e guarda o File temporário (NÃO faz upload)
  async function handleConfirmCrop() {
    if (!imageSrc || !croppedAreaPixels) {
      showToast("Nada para cortar.");
      return;
    }
    try {
      setUploadingAvatar(true);

      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);

      // cria preview visual (blob url)
      const previewUrl = URL.createObjectURL(blob);
      setAvatarPreview(previewUrl);

      // cria arquivo temporário que será enviado apenas ao salvar
      const file = new File(
        [blob],
        `avatar-temp-${Date.now()}.webp`,
        { type: "image/webp" }
      );

      setPendingAvatarFile(file);

      setOpenCrop(false);
      setImageSrc(null);
      setCroppedAreaPixels(null);

    } catch (err) {
      console.error("Erro crop avatar:", err);
      showToast("Erro ao processar avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleCancelCrop() {
    if (imageSrc && imageSrc.startsWith("blob:")) {
      try { URL.revokeObjectURL(imageSrc); } catch (e) {}
    }
    setOpenCrop(false);
    setImageSrc(null);
    setCroppedAreaPixels(null);
  }

  if (loadingProfile) {
    return (
      <div className="profile-form">
        <h3>Perfil</h3>
        <p>Carregando informações do perfil...</p>
      </div>
    );
  }

  return (
    <>
      {toastMessage && <div className="toast-popup">{toastMessage}</div>}
      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <h3 className="profile-title-config">Editar Perfil</h3>

        <label className="label">Avatar</label>
        <div className="profile-avatar-row">
          <div className="avatar-wrapper">
            {avatarPreview || form.avatar_url ? (
              <img src={avatarPreview ?? form.avatar_url} alt="avatar" className="avatar-img" />
            ) : (
              <div className="avatar-fallback">{(form.name?.charAt(0) ?? "U").toUpperCase()}</div>
            )}
          </div>

          <div className="profile-avatar-controls">
            <h2 className="profile-name-av">{form.nickname}</h2>
            <h3 className="profile-text-av"> Alterar Foto de Perfil </h3>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSelectImage} id="avatar-file-input" className="file-input" />
            <small className="profile-avatar-help">JPG / PNG / WEBP — Máx 2MB — será cortada para círculo 512×512</small>
          </div>
        </div>

        {/* NOME + NICKNAME */}
        <div className="profile-grid-2">
          <div className="profile-name">
            <label className="label">Nome</label>
            <input className="input" name="name" value={form.name} onChange={handleChange} placeholder="Seu nome completo" maxLength={80} />
          </div>

          <div className="profile-name">
            <label className="label">Nickname (Apelido)</label>
            <input className="input" name="nickname" value={form.nickname} onChange={handleChange} placeholder="ex: nobmaster69" maxLength={20} autoComplete="off" />
            <small className="input-help">Use 3–20 caracteres: letras minúsculas, números, ponto ou underline.</small>
          </div>
        </div>

        {/* GÊNERO, DOCUMENTO */}
        <div className="profile-grid-document">
          <div className="profile-field">
            <label className="label">Gênero</label>
            <select className="input" value={form.gender ?? ""} name="gender" onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value || null }))}>
              <option className="input-select" value="">Prefiro não informar</option>
              <option className="input-select" value="masculino">Masculino</option>
              <option className="input-select" value="feminino">Feminino</option>
              <option className="input-select" value="outro">Outro</option>
            </select>
          </div>

          <div className="profile-field">
            <label className="label">Tipo de documento</label>
            <select className="input" value={form.document_type ?? ""} onChange={handleDocumentTypeChange}>
              <option className="input-select" input-selectvalue="">Selecione</option>
              <option className="input-select" value="CPF">CPF</option>
              <option className="input-select" value="RG">RG</option>
            </select>
          </div>

          <div className="profile-field">
            <label className="label">Documento</label>
            <input className="input" value={form.document_type === "CPF" ? formatCPFForDisplay(form.document_value) : form.document_value} onChange={handleDocumentValueChange} placeholder={form.document_type === "CPF" ? "000.000.000-00" : "Número do documento"} inputMode={form.document_type === "CPF" ? "numeric" : "text"} />
          </div>
        </div>

        {/* DATA + TELEFONE */}
        <div className="profile-grid-2">
          <div className="profile-field">
            <label className="label">Data de nascimento</label>
            <input className="input" type="date" name="birth_date" value={form.birth_date ?? ""} onChange={(e) => { const v = e.target.value; setForm((prev) => ({ ...prev, birth_date: v === "" ? null : v })); }} />
          </div>

          <div className="profile-field">
            <label className="label">Celular / WhatsApp</label>
            <input className="input" name="phone_display" value={formatPhoneForDisplay(form.phone)} onChange={handlePhoneInput} placeholder="(11) 99999-9999" inputMode="numeric" />
            <small className="input-help">Apenas números — máximo 11 dígitos</small>
          </div>
        </div>

        {/* CIDADE + ESTADO */}
        <div className="profile-grid-2">
          <div className="profile-field">
            <label className="label">Cidade</label>
            <input className="input" name="city" value={form.city} onChange={handleChange} placeholder="Sua cidade" maxLength={50} />
          </div>

          <div className="profile-field">
            <label className="label">Estado (UF)</label>
            <input className="input" name="state" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} />
            <small className="input-help">Use 2 letras (ex: SP)</small>
          </div>
        </div>

        <div className="profile-checkbox" style={{ marginTop: 10 }}>
          <label>
            <input type="checkbox" checked={form.allow_notifications} onChange={(e) => setForm((prev) => ({ ...prev, allow_notifications: e.target.checked }))} />{" "}
            Desejo receber notificações por WhatsApp e Email
          </label>
        </div>

        <div className="profile-submit-row">
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-ghost profile-back-btn"
          >
            ← Voltar
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !hasChanges()}
          >
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>

        {!profileCompleted && (
          <div className="profile-progress-line">
            <div className="profile-progress-mensagem">Complete todos os campos do perfil e receba <strong>260 pontos</strong> e <span>200 XP</span></div>
            <div className="profile-progress-text">Perfil completo: <strong>{progress}%</strong></div>
            <div className="progress-bar-outer"><div className="progress-bar-inner" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </form>

      {openCrop && imageSrc && (
        <div className="crop-modal-overlay">
          <div className="modal-card">
            <div className="modal-card-header">
              <h3>Recortar avatar</h3>
              <div className="modal-status">{uploadingAvatar ? "Enviando..." : "Ajuste e confirme"}</div>
            </div>

            <div className="cropper-container">
              <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} showGrid={false} />
            </div>

            <div className="crop-controls">
              <label className="control-label">Zoom</label>
              <input className="range" type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              <div className="crop-actions">
                <button onClick={handleCancelCrop} className="btn btn-ghost">Cancelar</button>
                <button onClick={handleConfirmCrop} className="btn btn-primary" disabled={uploadingAvatar}>{uploadingAvatar ? "Enviando..." : "Confirmar"}</button>
              </div>
            </div>

            {uploadingAvatar && (
              <div className="profile-progress">
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} /></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
