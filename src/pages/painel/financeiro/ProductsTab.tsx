import { useCallback, useEffect, useState } from "react"
import { Minus, Pencil, Plus, Power, ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { adminRepository } from "@/lib/repository/adminRepository"
import { PAYMENT_LABEL } from "@/lib/statusLabels"
import { cn, formatPriceBRL } from "@/lib/utils"
import type { PaymentMethod, Product } from "@/lib/types"

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cartao", "dinheiro", "vale"]
const LOW_STOCK = 3

export function ProductsTab() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [busy, setBusy] = useState(false)

  // add / edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")

  // sell dialog
  const [selling, setSelling] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [payment, setPayment] = useState<PaymentMethod | null>(null)

  const load = useCallback(async () => {
    try {
      setProducts(await adminRepository.listProducts())
    } catch {
      setProducts([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setName("")
    setPrice("")
    setStock("")
    setFormOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setName(p.name)
    setPrice((p.priceCents / 100).toString().replace(".", ","))
    setStock(String(p.stock))
    setFormOpen(true)
  }

  async function saveForm() {
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100)
    const qtyStock = parseInt(stock || "0", 10)
    if (!name.trim()) return toast.error("Informe o nome do produto.")
    if (!cents || cents <= 0) return toast.error("Informe um preço válido.")
    if (isNaN(qtyStock) || qtyStock < 0) return toast.error("Estoque inválido.")
    setBusy(true)
    try {
      if (editing) {
        await adminRepository.updateProduct(editing.id, {
          name: name.trim(),
          priceCents: cents,
          stock: qtyStock,
        })
        toast.success("Produto atualizado.")
      } else {
        await adminRepository.createProduct({
          name: name.trim(),
          priceCents: cents,
          stock: qtyStock,
        })
        toast.success("Produto adicionado.")
      }
      setFormOpen(false)
      load()
    } catch {
      toast.error("Não foi possível salvar.")
    } finally {
      setBusy(false)
    }
  }

  // Optimistic quick stock adjustment (receiving / correcting).
  async function adjustStock(p: Product, delta: number) {
    const next = Math.max(0, p.stock + delta)
    if (next === p.stock) return
    setProducts((prev) => prev?.map((x) => (x.id === p.id ? { ...x, stock: next } : x)) ?? prev)
    try {
      await adminRepository.updateProduct(p.id, { stock: next })
    } catch {
      toast.error("Não foi possível atualizar o estoque.")
      load()
    }
  }

  async function toggleActive(p: Product) {
    setProducts((prev) => prev?.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)) ?? prev)
    try {
      await adminRepository.updateProduct(p.id, { active: !p.active })
    } catch {
      load()
    }
  }

  async function remove(p: Product) {
    try {
      await adminRepository.deleteProduct(p.id)
      toast.success("Produto removido.")
      load()
    } catch {
      toast.error("Não foi possível remover.")
    }
  }

  function openSell(p: Product) {
    setSelling(p)
    setQty(1)
    setPayment(null)
  }

  async function confirmSell() {
    if (!selling) return
    if (!payment) return toast.error("Selecione a forma de pagamento.")
    if (qty < 1 || qty > selling.stock) return toast.error("Quantidade indisponível.")
    setBusy(true)
    try {
      await adminRepository.sellProduct({ productId: selling.id, qty, paymentMethod: payment })
      toast.success("Venda registrada!")
      setSelling(null)
      load()
    } catch {
      toast.error("Não foi possível registrar a venda.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Produtos
          </p>
          <p className="text-sm text-muted-foreground">
            {products ? `${products.filter((p) => p.active).length} ativos` : "—"}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" />
          Novo
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {products === null ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado.
          </p>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border border-border bg-card px-4 py-3",
                !p.active && "opacity-55"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-sm font-semibold text-primary">{formatPriceBRL(p.priceCents)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    aria-label={p.active ? "Desativar" : "Ativar"}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent",
                      p.active ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    <Power className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    aria-label="Editar"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    aria-label="Remover"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                {/* Stock stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustStock(p, -1)}
                    disabled={p.stock === 0}
                    className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span
                    className={cn(
                      "min-w-16 text-center text-xs font-semibold",
                      p.stock === 0
                        ? "text-destructive"
                        : p.stock <= LOW_STOCK
                          ? "text-amber-400"
                          : "text-foreground"
                    )}
                  >
                    {p.stock === 0 ? "Esgotado" : `${p.stock} em estoque`}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustStock(p, 1)}
                    className="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!p.active || p.stock === 0}
                  onClick={() => openSell(p)}
                >
                  <ShoppingCart className="size-3.5" />
                  Vender
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-name">Nome</Label>
              <Input
                id="prod-name"
                placeholder="Pomada, cera, óleo..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-price">Preço</Label>
                <Input
                  id="prod-price"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prod-stock">Estoque</Label>
                <Input
                  id="prod-stock"
                  inputMode="numeric"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <Button disabled={busy} onClick={saveForm} className="mt-1 h-10">
              {editing ? "Salvar" : "Adicionar produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell dialog */}
      <Dialog open={!!selling} onOpenChange={(o) => !o && setSelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vender · {selling?.name}</DialogTitle>
            <DialogDescription>
              {selling && `${formatPriceBRL(selling.priceCents)} · ${selling.stock} em estoque`}
            </DialogDescription>
          </DialogHeader>
          {selling && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-6 text-center text-lg font-semibold text-foreground">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(selling.stock, q + 1))}
                    disabled={qty >= selling.stock}
                    className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-30"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Forma de pagamento</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayment(m)}
                      className={cn(
                        "h-9 rounded-lg border text-xs font-medium transition-colors",
                        payment === m
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      )}
                    >
                      {PAYMENT_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold text-primary">
                  {formatPriceBRL(selling.priceCents * qty)}
                </span>
              </div>

              <Button disabled={busy} onClick={confirmSell} className="h-10">
                <ShoppingCart className="size-4" />
                Confirmar venda
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
