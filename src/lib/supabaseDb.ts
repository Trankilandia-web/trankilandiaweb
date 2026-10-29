import { supabase, isSupabaseConfigured } from './supabase';
import {
  GymMember,
  MemberRoutine,
  ProgressRecord,
  getStoredMembers,
  saveStoredMembers,
  getStoredRoutines,
  saveStoredRoutines,
  getStoredProgress,
  saveStoredProgress,
} from '../data/gymStore';

// ==============================================================================
// TRANKILANDIA GYM · SERVICIO INTEGRAL DE BASE DE DATOS SUPABASE + LOCAL SYNC
// ==============================================================================

/**
 * Obtener todos los socios (Prioriza Supabase si está disponible, con fallback local)
 */
export async function getGymMembers(): Promise<GymMember[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: GymMember[] = data.map((d) => ({
          id: d.id,
          name: d.nombre,
          dni: d.dni,
          email: d.email || `${d.dni}@cliente.trankilandia.pe`,
          phone: d.celular || '',
          plan: d.plan,
          planPrice: Number(d.precio_plan) || 80,
          paymentType: d.tipo_pago || 'full',
          advancePaid: Number(d.adelanto_pagado) || 0,
          balanceDue: Number(d.saldo_pendiente) || 0,
          paymentDueDate: d.fecha_limite_pago || undefined,
          paymentMethod: d.metodo_pago || 'efectivo',
          receiptNumber: d.numero_boleta || 'B001-000000',
          membershipStatus: d.estado_membresia || 'active',
          expiresAt: '30 Nov 2026',
          coachName: d.coach_asignado || 'Coach Marcos Rivas',
          registeredAt: d.created_at ? new Date(d.created_at).toLocaleDateString('es-PE') : 'Oct 2026',
          observations: d.observaciones || undefined,
          age: d.edad || undefined,
          gender: d.sexo || undefined,
        }));
        saveStoredMembers(mapped);
        return mapped;
      }
    } catch {
      // Fallback a almacenamiento local / realMembers.json
    }
  }

  return getStoredMembers();
}

/**
 * Guardar o registrar un nuevo socio (En Supabase + Local)
 */
export async function registerGymMember(member: GymMember): Promise<void> {
  const current = getStoredMembers();
  const updated = [member, ...current.filter((m) => m.id !== member.id)];
  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('socios').upsert({
        id: member.id,
        nombre: member.name,
        dni: member.dni,
        email: member.email,
        celular: member.phone,
        plan: member.plan,
        precio_plan: member.planPrice,
        tipo_pago: member.paymentType,
        adelanto_pagado: member.advancePaid,
        saldo_pendiente: member.balanceDue,
        fecha_limite_pago: member.paymentDueDate,
        metodo_pago: member.paymentMethod,
        numero_boleta: member.receiptNumber,
        estado_membresia: member.membershipStatus,
        observaciones: member.observations,
        coach_asignado: member.coachName,
        edad: member.age,
        sexo: member.gender,
      });

      // Registrar también en tabla de ingresos
      await supabase.from('ingresos').insert({
        key_socio: member.id,
        monto: member.advancePaid,
        metodo_pago: member.paymentMethod,
        tipo: member.paymentType === 'advance' ? 'Adelanto de Membresía' : 'Membresía Completa',
        observacion: `Cobro boleta ${member.receiptNumber} (${member.plan})`,
      });
    } catch {
      // Continúa con almacenamiento local
    }
  }
}

/**
 * Liquidar saldo pendiente de un socio (Cobrar deuda)
 */
export async function payMemberBalance(
  memberId: string,
  paymentMethod: string
): Promise<GymMember[]> {
  const current = getStoredMembers();
  let paidAmount = 0;
  let memberReceipt = '';

  const updated = current.map((m) => {
    if (m.id === memberId) {
      paidAmount = m.balanceDue;
      memberReceipt = `B001-000${Date.now().toString().slice(-4)} (Liquidación)`;
      return {
        ...m,
        paymentType: 'full' as const,
        advancePaid: m.planPrice,
        balanceDue: 0,
        paymentDueDate: undefined,
        receiptNumber: memberReceipt,
      };
    }
    return m;
  });

  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      const target = updated.find((m) => m.id === memberId);
      if (target) {
        await supabase
          .from('socios')
          .update({
            tipo_pago: 'full',
            adelanto_pagado: target.planPrice,
            saldo_pendiente: 0,
            fecha_limite_pago: null,
            numero_boleta: memberReceipt,
          })
          .eq('id', memberId);

        await supabase.from('ingresos').insert({
          key_socio: memberId,
          monto: paidAmount,
          metodo_pago: paymentMethod,
          tipo: 'Liquidación de Saldo Pendiente',
          observacion: `Cancelación total boleta ${memberReceipt}`,
        });
      }
    } catch {
      // Ignorar error si la tabla no está en Supabase
    }
  }

  return updated;
}

/**
 * Obtener o sincronizar la rutina de un socio
 */
export async function getMemberRoutine(memberId: string): Promise<MemberRoutine | null> {
  const storedRoutines = getStoredRoutines();
  if (storedRoutines[memberId]) {
    return storedRoutines[memberId];
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('rutinas')
        .select('*')
        .eq('member_id', memberId)
        .maybeSingle();

      if (!error && data) {
        const routine: MemberRoutine = {
          memberId: data.member_id,
          routineTitle: data.title,
          objective: data.objective,
          coachName: data.coach_name,
          updatedAt: data.updated_at,
          coachNotes: data.coach_notes,
          days: data.days || [],
        };
        storedRoutines[memberId] = routine;
        saveStoredRoutines(storedRoutines);
        return routine;
      }
    } catch {}
  }

  return null;
}

/**
 * Guardar o asignar rutina a un socio
 */
export async function saveMemberRoutine(routine: MemberRoutine): Promise<void> {
  const storedRoutines = getStoredRoutines();
  storedRoutines[routine.memberId] = routine;
  saveStoredRoutines(storedRoutines);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('rutinas').upsert({
        member_id: routine.memberId,
        title: routine.routineTitle,
        objective: routine.objective,
        coach_name: routine.coachName,
        coach_notes: routine.coachNotes,
        days: routine.days,
        updated_at: routine.updatedAt,
      });
    } catch {}
  }
}

/**
 * Guardar nuevo registro de progreso físico
 */
export async function saveProgressRecord(record: ProgressRecord): Promise<ProgressRecord[]> {
  const current = getStoredProgress();
  const updated = [record, ...current];
  saveStoredProgress(updated);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('progresos').insert({
        id: record.id,
        member_id: record.memberId,
        fecha: record.date,
        peso_kg: record.weightKg,
        press_banca_kg: record.benchPressKg,
        sentadilla_kg: record.squatKg,
        peso_muerto_kg: record.deadliftKg,
        dominadas_reps: record.pullupsRep,
        observaciones: record.notes,
      });
    } catch {}
  }

  return updated;
}
