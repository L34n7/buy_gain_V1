import { NextResponse } from "next/server";
import {
  createUserSupabase,
  createAdminSupabase,
} from "@/lib/supabaseServer";

const PROFILE_REWARD_POINTS = 260;
const PROFILE_XP_REWARD = 200; // 🎮 XP por perfil completo

function digitsOnly(v = "") {
  return String(v).replace(/\D/g, "");
}

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

function isValidPhone(phoneRaw: string | null | undefined) {
  if (!phoneRaw) return false;
  const d = digitsOnly(String(phoneRaw));
  return d.length === 10 || d.length === 11;
}

function isValidStateCode(s: string | null | undefined) {
  if (!s) return false;
  return /^[A-Z]{2}$/.test(String(s).toUpperCase());
}

function isValidNickname(nickname: string) {
  if (!nickname) return false;
  if (nickname.length < 3 || nickname.length > 20) return false;
  if (!/^[a-z0-9._]+$/.test(nickname)) return false;
  if (/^[._]|[._]$/.test(nickname)) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const supabaseUser = await createUserSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const {
      name,
      nickname,
      birth_date,
      phone,
      avatar_url,
      gender,
      city,
      state,
      allow_notifications,
      document_type,
      document_value,
    } = await req.json();

    if (nickname && !isValidNickname(nickname)) {
      return NextResponse.json(
        { error: "Nickname inválido." },
        { status: 400 }
      );
    }

    const admin = await createAdminSupabase();

    const { data: legacyUser, error: legacyError } = await admin
      .from("users")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (legacyError || !legacyUser) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    const normalizedBirthDate =
      birth_date && String(birth_date).trim() !== ""
        ? birth_date
        : legacyUser.birth_date;

    const normalizedPhone =
      phone && String(phone).trim() !== ""
        ? digitsOnly(phone)
        : legacyUser.phone;

    const normalizedAvatar =
      avatar_url && String(avatar_url).trim() !== ""
        ? avatar_url
        : legacyUser.avatar_url;

    const normalizedGender =
      gender && String(gender).trim() !== ""
        ? gender
        : legacyUser.gender;

    const normalizedCity =
      city && String(city).trim() !== ""
        ? city
        : legacyUser.city;

    const normalizedState =
      state && String(state).trim() !== ""
        ? (state as string).toUpperCase()
        : legacyUser.state;

    const normalizedDocumentType =
      document_type && String(document_type).trim() !== ""
        ? document_type
        : legacyUser.document_type;

    const normalizedDocumentValue =
      document_value && String(document_value).trim() !== ""
        ? document_value
        : legacyUser.document_value;

    const normalizedAllowNotifications =
      typeof allow_notifications === "boolean"
        ? allow_notifications
        : legacyUser.allow_notifications;

    const docValid =
      normalizedDocumentType === "CPF"
        ? isValidCPF(String(normalizedDocumentValue || ""))
        : normalizedDocumentType === "RG"
        ? digitsOnly(String(normalizedDocumentValue || "")).length >= 5
        : false;

    const willBeCompleted =
      Boolean(String(name ?? legacyUser.name).trim()) &&
      Boolean(String(nickname ?? legacyUser.nickname).trim()) &&
      Boolean(normalizedBirthDate) &&
      isValidPhone(normalizedPhone) &&
      Boolean(normalizedAvatar) &&
      Boolean(normalizedGender) &&
      Boolean(String(normalizedCity ?? "").trim()) &&
      isValidStateCode(normalizedState) &&
      Boolean(normalizedDocumentType) &&
      docValid;

    const shouldMarkCompleted =
      willBeCompleted && !legacyUser.profile_completed;

    const { error: updateError } = await admin
      .from("users")
      .update({
        name: name ?? legacyUser.name,
        nickname: nickname ?? legacyUser.nickname,
        birth_date: normalizedBirthDate,
        phone: normalizedPhone,
        avatar_url: normalizedAvatar,
        gender: normalizedGender,
        city: normalizedCity,
        state: normalizedState,
        allow_notifications: normalizedAllowNotifications,
        document_type: normalizedDocumentType,
        document_value: normalizedDocumentValue,
        profile_completed: shouldMarkCompleted
          ? true
          : legacyUser.profile_completed,
        profile_completed_at: shouldMarkCompleted
          ? new Date().toISOString()
          : legacyUser.profile_completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar perfil" },
        { status: 500 }
      );
    }

    if (shouldMarkCompleted) {
      try {
        // 🎯 PONTOS
        const { data: extrato } = await admin
          .from("extrato_pontos")
          .select("tipo, pontos")
          .eq("user_id", legacyUser.id);

        const saldoAtual = !extrato
          ? 0
          : extrato.reduce((acc, row) => {
              return row.tipo === "CREDITO"
                ? acc + row.pontos
                : acc - row.pontos;
            }, 0);

        const novoSaldo = saldoAtual + PROFILE_REWARD_POINTS;

        await admin.from("extrato_pontos").insert({
          user_id: legacyUser.id,
          tipo: "CREDITO",
          origem: "PERFIL_COMPLETO",
          referencia_id: "PERFIL",
          pontos: PROFILE_REWARD_POINTS,
          saldo_apos: novoSaldo,
        });

      } catch (e) {
        console.error("Erro ao aplicar bônus perfil:", e);
      }
    }

    return NextResponse.json({
      success: true,
      profile_completed:
        shouldMarkCompleted || legacyUser.profile_completed,
    });
  } catch (err) {
    console.error("Erro API profile/update:", err);
    return NextResponse.json(
      { error: "Erro inesperado" },
      { status: 500 }
    );
  }
}
