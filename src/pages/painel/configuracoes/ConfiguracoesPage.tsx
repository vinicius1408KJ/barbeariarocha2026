import { useCallback, useEffect, useRef, useState } from "react"
import { BellRing, Camera, Plus, Power, Share, Trash2, User } from "lucide-react"
import { toast } from "sonner"
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/notifications/push"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import { formatPriceBRL } from "@/lib/utils"
import type { Subscription } from "@/lib/types"

// "2.91" (number) → "2,91" (pt-BR input value)
function feeToInput(n: number): string {
  return Number(n).toString().replace(".", ",")
}

export function ConfiguracoesPage() {
  const { session } = useStaffSession()
  const [rate, setRate] = useState("")
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Card fees
  const [feeDebito, setFeeDebito] = useState("")
  const [feeCreditoVista, setFeeCreditoVista] = useState("")
  const [feeCreditoParcelado, setFeeCreditoParcelado] = useState("")

  // Avatar (barber photo shown on the chair-selection screen)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Push notifications
  const [pushState, setPushState] = useState<PushState | null>(null)
  const [pushBusy, setPushBusy] = useState(false)

  // PIN change
  const [pin1, setPin1] = useState("")
  const [pin2, setPin2] = useState("")

  // Subscription dialog
  const [subOpen, setSubOpen] = useState(false)
  const [subName, setSubName] = useState("")
  const [subPhone, setSubPhone] = useState("")
  const [subPlan, setSubPlan] = useState("")
  const [subAmount, setSubAmount] = useState("")
  const [subDay, setSubDay] = useState("5")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subsData, fees, barbers] = await Promise.all([
        adminRepository.listSubscriptions(),
        adminRepository.getCardFees(),
        adminRepository.listBarbers(),
      ])
      setSubs(subsData)
      setFeeDebito(feeToInput(fees.debitoPercent))
      setFeeCreditoVista(feeToInput(fees.creditoVistaPercent))
      setFeeCreditoParcelado(feeToInput(fees.creditoParceladoPercent))
      setAvatarUrl(barbers.find((b) => b.id === session?.barberId)?.avatarUrl ?? null)
    } finally {
      setLoading(false)
    }
  }, [session?.barberId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getPushState().then(setPushState)
  }, [])

  async function togglePush() {
    setPushBusy(true)
    try {
      if (pushState === "on") {
        setPushState(await disablePush())
        toast.success("Notificações desativadas neste aparelho.")
      } else {
        const next = await enablePush(session!.barberId)
        setPushState(next)
        if (next === "on") toast.success("Notificações ativadas neste aparelho.")
        else if (next === "denied")
          toast.error("Permissão negada. Libere nas configurações do navegador.")
      }
    } catch {
      toast.error("Não foi possível alterar as notificações.")
    } finally {
      setPushBusy(false)
    }
  }

  async function saveRate() {
    const pct = parseFloat(rate.replace(",", "."))
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Informe uma porcentagem entre 0 e 100.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.updateCommissionRate(session!.barberId, pct)
      toast.success("Comissão atualizada.")
      setRate("")
      load()
    } catch {
      toast.error("Não foi possível atualizar.")
    } finally {
      setBusy(false)
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file later
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB).")
      return
    }
    setUploading(true)
    try {
      const url = await adminRepository.uploadAvatar(session!.barberId, file)
      setAvatarUrl(url)
      toast.success("Foto atualizada.")
    } catch {
      toast.error("Não foi possível enviar a foto.")
    } finally {
      setUploading(false)
    }
  }

  async function removeAvatar() {
    setUploading(true)
    try {
      await adminRepository.updateBarberAvatar(session!.barberId, null)
      setAvatarUrl(null)
      toast.success("Foto removida.")
    } catch {
      toast.error("Não foi possível remover a foto.")
    } finally {
      setUploading(false)
    }
  }

  async function saveCardFees() {
    const parse = (v: string) => parseFloat(v.replace(",", ".").trim())
    const values = [feeDebito, feeCreditoVista, feeCreditoParcelado].map(parse)
    if (values.some((n) => isNaN(n) || n < 0 || n > 100)) {
      toast.error("Informe taxas entre 0 e 100.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.updateCardFees({
        debitoPercent: values[0],
        creditoVistaPercent: values[1],
        creditoParceladoPercent: values[2],
      })
      toast.success("Taxas do cartão salvas.")
      load()
    } catch {
      toast.error("Não foi possível salvar as taxas.")
    } finally {
      setBusy(false)
    }
  }

  async function savePin() {
    if (!/^\d{4}$/.test(pin1)) {
      toast.error("O PIN deve ter 4 dígitos.")
      return
    }
    if (pin1 !== pin2) {
      toast.error("Os PINs não coincidem.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.changePin(session!.barberId, pin1)
      toast.success("PIN alterado.")
      setPin1("")
      setPin2("")
    } catch {
      toast.error("Não foi possível alterar o PIN.")
    } finally {
      setBusy(false)
    }
  }

  async function createSub() {
    const cents = Math.round(parseFloat(subAmount.replace(",", ".")) * 100)
    const day = parseInt(subDay, 10)
    if (!subName.trim() || !subPlan.trim() || !cents || !day) {
      toast.error("Preencha todos os campos.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.createSubscription({
        clientName: subName.trim(),
        clientPhone: subPhone.trim(),
        planName: subPlan.trim(),
        amountCents: cents,
        billingDay: Math.min(28, Math.max(1, day)),
      })
      toast.success("Assinatura criada.")
      setSubName("")
      setSubPhone("")
      setSubPlan("")
      setSubAmount("")
      setSubOpen(false)
      load()
    } catch {
      toast.error("Não foi possível criar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Avatar */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Minha foto
            </p>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Sua foto" className="size-full object-cover" />
                ) : (
                  <User className="size-8" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Aparece na tela de escolher a cadeira.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="size-3.5" />
                    {uploading ? "Enviando..." : avatarUrl ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                  {avatarUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={uploading}
                      onClick={removeAvatar}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="size-3.5" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
            </div>
          </section>

          {/* Push notifications */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Notificações no celular
            </p>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              {pushState === "on" ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <BellRing className="size-4" />
                    Ativadas neste aparelho
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Você recebe um aviso a cada novo agendamento ou cancelamento, mesmo com o app
                    fechado.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pushBusy}
                    onClick={togglePush}
                    className="self-start"
                  >
                    Desativar neste aparelho
                  </Button>
                </>
              ) : pushState === "needs-install" ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    No iPhone, instale o app primeiro
                  </p>
                  <ol className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      1. Toque em <Share className="size-3.5" /> Compartilhar (na barra do Safari)
                    </li>
                    <li>2. Escolha "Adicionar à Tela de Início"</li>
                    <li>3. Abra o app pela tela de início e volte aqui para ativar</li>
                  </ol>
                </>
              ) : pushState === "denied" ? (
                <>
                  <p className="text-sm text-foreground">Permissão de notificação bloqueada.</p>
                  <p className="text-xs text-muted-foreground">
                    Libere as notificações deste site nas configurações do navegador e recarregue.
                  </p>
                </>
              ) : pushState === "unsupported" ? (
                <p className="text-sm text-muted-foreground">
                  Este navegador não suporta notificações push.
                </p>
              ) : pushState === "off" ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Receba um aviso a cada novo agendamento ou cancelamento, mesmo com o app fechado.
                  </p>
                  <Button
                    disabled={pushBusy}
                    onClick={togglePush}
                    className="h-9 self-start"
                  >
                    <BellRing className="size-4" />
                    Ativar notificações
                  </Button>
                </>
              ) : (
                <Skeleton className="h-9 w-40 rounded-lg" />
              )}
            </div>
          </section>

          {/* Commission */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Minha comissão
            </p>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="rate">Percentual (%)</Label>
                  <Input
                    id="rate"
                    inputMode="decimal"
                    placeholder="40"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button disabled={busy} onClick={saveRate} className="h-8">
                  Salvar
                </Button>
              </div>
            </div>
          </section>

          {/* Card fees */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Taxas do cartão
            </p>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Mostradas ao fechar a comanda no cartão, para você ver o valor líquido que recebe.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fee-debito">Débito (%)</Label>
                <Input
                  id="fee-debito"
                  inputMode="decimal"
                  placeholder="1,39"
                  value={feeDebito}
                  onChange={(e) => setFeeDebito(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fee-credito-vista">Crédito à vista (%)</Label>
                <Input
                  id="fee-credito-vista"
                  inputMode="decimal"
                  placeholder="2,91"
                  value={feeCreditoVista}
                  onChange={(e) => setFeeCreditoVista(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fee-credito-parcelado">Crédito parcelado (%)</Label>
                <Input
                  id="fee-credito-parcelado"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={feeCreditoParcelado}
                  onChange={(e) => setFeeCreditoParcelado(e.target.value)}
                />
              </div>
              <Button disabled={busy} onClick={saveCardFees} className="h-9">
                Salvar taxas
              </Button>
            </div>
          </section>

          {/* PIN change */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Alterar PIN
            </p>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pin1">Novo PIN (4 dígitos)</Label>
                <Input
                  id="pin1"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin1}
                  onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pin2">Confirmar PIN</Label>
                <Input
                  id="pin2"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <Button disabled={busy} onClick={savePin} className="h-9">
                Alterar PIN
              </Button>
            </div>
          </section>

          {/* Subscriptions */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Assinaturas / Clube
              </p>
              <Button size="xs" variant="ghost" onClick={() => setSubOpen(true)}>
                <Plus className="size-3.5" />
                Nova
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {subs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  Nenhuma assinatura cadastrada.
                </p>
              ) : (
                subs.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.clientName} · {s.planName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPriceBRL(s.amountCents)}/mês · dia {s.billingDay}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        adminRepository.updateSubscriptionActive(s.id, !s.active).then(load)
                      }
                      className={
                        "flex items-center gap-1 text-xs font-semibold uppercase " +
                        (s.active ? "text-emerald-400" : "text-muted-foreground")
                      }
                    >
                      <Power className="size-3.5" />
                      {s.active ? "Ativa" : "Inativa"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova assinatura</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-name">Cliente</Label>
              <Input id="sub-name" value={subName} onChange={(e) => setSubName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-phone">Telefone</Label>
              <Input id="sub-phone" value={subPhone} onChange={(e) => setSubPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-plan">Plano</Label>
              <Input
                id="sub-plan"
                placeholder="Clube Mensal"
                value={subPlan}
                onChange={(e) => setSubPlan(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-amount">Valor/mês</Label>
                <Input
                  id="sub-amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={subAmount}
                  onChange={(e) => setSubAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-day">Dia cobrança</Label>
                <Input
                  id="sub-day"
                  inputMode="numeric"
                  value={subDay}
                  onChange={(e) => setSubDay(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <Button disabled={busy} onClick={createSub} className="mt-1 h-10">
              Criar assinatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
