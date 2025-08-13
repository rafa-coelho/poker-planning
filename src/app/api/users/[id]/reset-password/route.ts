import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'
import { emailService } from '@/lib/email/service'
import { generatePasswordResetToken, computeResetTokenDigest } from '@/lib/auth/password'

// POST /api/users/[id]/reset-password - Envia email de reset para o usuário
export const POST = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Permite que ADMIN/SUPER_ADMIN disparem reset para qualquer usuário da org
    const authCheck = await requirePermission('users:update')(req as any)
    if (authCheck) return authCheck

    const userId = req.nextUrl.pathname.split('/')[3]
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Verificar serviço de email
    if (!emailService.isConfigured()) {
      return NextResponse.json({ error: 'Serviço de email não configurado' }, { status: 503 })
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: context.organizationId },
      select: { id: true, email: true, name: true, resetToken: true, resetTokenExpiresAt: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Respeitar cooldown caso já exista token válido
    if (user.resetToken && user.resetTokenExpiresAt && user.resetTokenExpiresAt > new Date()) {
      return NextResponse.json({ error: 'Já existe um link de recuperação válido. Aguarde alguns minutos.' }, { status: 429 })
    }

    // Gerar token
    const token = await generatePasswordResetToken(user.id)

    // Persistir hash do token e expiração
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    const hashed = computeResetTokenDigest(token)
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashed, resetTokenExpiresAt: expiresAt }
    })

    // Enviar email
    const emailResult = await emailService.sendPasswordResetEmail(user.email, token, user.name)
    if (!emailResult.success) {
      return NextResponse.json({ error: 'Erro ao enviar email de reset' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Email de reset enviado com sucesso' })
  } catch (error) {
    console.error('Erro ao solicitar reset de senha do usuário:', error)
    return NextResponse.json({ error: 'Erro ao solicitar reset de senha', details: String(error) }, { status: 500 })
  }
})

