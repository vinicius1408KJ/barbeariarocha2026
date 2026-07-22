import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBookingFlow } from "@/hooks/useBookingFlow"
import { normalizePhone } from "@/lib/utils"

const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo"),
  phone: z
    .string()
    .trim()
    .refine((value) => normalizePhone(value).length >= 10, "Informe um telefone válido com DDD"),
})

type ContactFormValues = z.infer<typeof contactSchema>

export function ContactInfoPage() {
  const { state, dispatch } = useBookingFlow()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: state.clientName, phone: state.clientPhone },
  })

  function onSubmit(values: ContactFormValues) {
    dispatch({ type: "SET_CONTACT", name: values.name, phone: values.phone })
    navigate("/agendar/confirmado")
  }

  return (
    <div className="min-h-svh">
      <PageHeader backTo="/agendar/horario" backLabel="Voltar" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-6 text-center font-display text-2xl tracking-wide">Seus dados</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Seu nome" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input id="phone" placeholder="(11) 91234-5678" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <Button type="submit" size="lg" className="mt-2 h-12 w-full text-sm">
            Continuar
          </Button>
        </form>
      </div>
    </div>
  )
}
