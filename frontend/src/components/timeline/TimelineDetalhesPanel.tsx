import { useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import type { HistoricoEvento, PedidoComDetalhes } from '@/types'
import {
  asStringArray,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNip,
} from '@/utils/format'

const TIPO_USUARIO_LABEL: Record<string, string> = {
  MILITAR: 'Militar',
  MILITAR_DA_RESERVA: 'Militar da Reserva',
  MILITAR_RESERVADO: 'Militar Reformado',
  DEPENDENTE_DIRETO: 'Dependente Direto',
  DEPENDENTE_INDIRETO: 'Dependente Indireto',
  PENSIONISTA: 'Pensionista',
}

interface TimelineDetalhesPanelProps {
  pedido: PedidoComDetalhes
  historico: HistoricoEvento[]
  /** Exibe o nome da clínica no resumo/detalhe (gestor). */
  mostrarClinica?: boolean
  /** Detalhe completo do paciente/tipo (clínica). */
  detalheCompleto?: boolean
}

function Linha({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
      <strong>{label}:</strong> {value}
    </Typography>
  )
}

/**
 * Botão à direita da timeline com capa-resumo; ao clicar abre o detalhe completo
 * (dados do lançamento, SOLEMP, NF e histórico) que antes ficava abaixo.
 */
export function TimelineDetalhesPanel({
  pedido,
  historico,
  mostrarClinica = false,
  detalheCompleto = false,
}: TimelineDetalhesPanelProps) {
  const [open, setOpen] = useState(false)
  const fotos = asStringArray(pedido.dadosClinica?.fotos)

  const resumo = useMemo(() => {
    const linhas: string[] = []
    if (mostrarClinica) linhas.push(pedido.clinica.nome)
    if (pedido.paciente?.nome) linhas.push(pedido.paciente.nome)
    else if (pedido.material.descricao) linhas.push(pedido.material.descricao)
    if (pedido.dadosClinica?.procedimento) {
      linhas.push(pedido.dadosClinica.procedimento)
    }
    return linhas.slice(0, 3)
  }, [pedido, mostrarClinica])

  const chipsResumo = useMemo(() => {
    const items: string[] = []
    items.push(formatCurrency(pedido.valor))
    if (pedido.solemp?.numero) items.push(`SOLEMP ${pedido.solemp.numero}`)
    if (pedido.notaFiscal?.numero) items.push(`NF ${pedido.notaFiscal.numero}`)
    if (historico.length > 0) {
      items.push(
        historico.length === 1 ? '1 evento' : `${historico.length} eventos`,
      )
    }
    return items
  }, [pedido, historico.length])

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir resumo e detalhes do lançamento"
        sx={{
          appearance: 'none',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          borderRadius: 3,
          width: { xs: '100%', md: 220 },
          minWidth: { md: 200 },
          maxWidth: { md: 240 },
          flexShrink: 0,
          p: 2,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          alignSelf: { xs: 'stretch', md: 'stretch' },
          minHeight: { md: 220 },
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          transition: 'transform 0.15s ease, box-shadow 0.18s ease, border-color 0.18s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'primary.main',
            boxShadow: '0 8px 22px rgba(63, 107, 86, 0.16)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(85, 139, 113, 0.12)',
              color: 'primary.main',
            }}
          >
            <DescriptionOutlinedIcon fontSize="small" />
          </Box>
          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        </Box>

        <Typography
          variant="overline"
          sx={{ letterSpacing: 1.1, color: 'text.secondary', lineHeight: 1.2 }}
        >
          Resumo
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
          Dados do lançamento
        </Typography>

        <Box sx={{ display: 'grid', gap: 0.35, flex: 1 }}>
          {resumo.map((linha) => (
            <Typography
              key={linha}
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={linha}
            >
              {linha}
            </Typography>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 'auto' }}>
          {chipsResumo.map((chip) => (
            <Box
              key={chip}
              sx={{
                px: 0.9,
                py: 0.35,
                borderRadius: 999,
                bgcolor: 'rgba(85, 139, 113, 0.1)',
                color: 'primary.dark',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {chip}
            </Box>
          ))}
        </Box>

        <Typography
          variant="caption"
          sx={{ color: 'primary.main', fontWeight: 700, mt: 0.25 }}
        >
          Ver detalhes
        </Typography>
      </Box>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            maxWidth: '100%',
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            bgcolor: 'background.paper',
            zIndex: 1,
          }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              {pedido.numero}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Dados do lançamento
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ px: 2.5, py: 2.5, display: 'grid', gap: 2.5 }}>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {mostrarClinica && <Linha label="Clínica" value={pedido.clinica.nome} />}

            {pedido.paciente && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                  Paciente
                </Typography>
                <Linha label="Nome" value={pedido.paciente.nome} />
                <Linha
                  label="Vínculo"
                  value={
                    pedido.paciente.vinculo === 'TITULAR' ? 'Titular' : 'Dependente'
                  }
                />
                <Linha label="NIP" value={formatNip(pedido.paciente.nip)} />
                <Linha
                  label="NIP do titular"
                  value={formatNip(pedido.paciente.nipTitular)}
                />
                <Linha label="Nome do titular" value={pedido.paciente.nomeTitular} />
                {detalheCompleto && (
                  <Linha
                    label="Tipo de usuário"
                    value={
                      TIPO_USUARIO_LABEL[pedido.paciente.tipoUsuario] ??
                      pedido.paciente.tipoUsuario
                    }
                  />
                )}
              </>
            )}

            {pedido.dadosClinica && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>
                  {detalheCompleto ? 'Clínica' : 'Procedimento'}
                </Typography>
                {detalheCompleto && (
                  <Linha label="Nome da Clínica" value={pedido.dadosClinica.nomeClinica} />
                )}
                <Linha label="Médico" value={pedido.dadosClinica.medico} />
                <Linha label="Procedimento" value={pedido.dadosClinica.procedimento} />
                <Linha
                  label="Data da Cirurgia"
                  value={formatDate(pedido.dadosClinica.dataCirurgia)}
                />
                {detalheCompleto ? (
                  <>
                    <Linha
                      label="Empresa consignada"
                      value={pedido.dadosClinica.empresaConsignada}
                    />
                    <Linha label="Pregão" value={pedido.dadosClinica.pregao} />
                    <Linha
                      label="Material Utilizado"
                      value={pedido.dadosClinica.materialUtilizado}
                    />
                    <Linha label="Quantidade" value={pedido.dadosClinica.quantidade} />
                    <Linha
                      label="Valor Unitário"
                      value={formatCurrency(pedido.dadosClinica.valorUnitario)}
                    />
                    <Linha
                      label="Valor Total"
                      value={formatCurrency(pedido.dadosClinica.valorTotal)}
                    />
                    <Linha
                      label="Folha da Sala"
                      value={pedido.dadosClinica.folhaSala || '—'}
                    />
                    <Linha
                      label="Descrição da Cirurgia"
                      value={pedido.dadosClinica.descricaoCirurgica || '—'}
                    />
                    <Linha
                      label="Etiquetas"
                      value={pedido.dadosClinica.etiquetas || '—'}
                    />
                    <Linha
                      label="Fotos"
                      value={fotos.length > 0 ? fotos.join(', ') : '—'}
                    />
                  </>
                ) : (
                  <>
                    <Linha label="Material" value={pedido.dadosClinica.materialUtilizado} />
                    <Linha
                      label="Valor Total"
                      value={formatCurrency(pedido.dadosClinica.valorTotal)}
                    />
                  </>
                )}
              </>
            )}

            <Linha label="Solicitação" value={formatDate(pedido.dataSolicitacao)} />
            {!detalheCompleto && <Linha label="Valor" value={formatCurrency(pedido.valor)} />}
          </Box>

          {pedido.solemp && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                SOLEMP
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.75 }}>
                <Linha label="Número" value={pedido.solemp.numero} />
                <Linha label="Data" value={formatDate(pedido.solemp.data)} />
              </Box>
            </Box>
          )}

          {pedido.notaFiscal && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Nota Fiscal
              </Typography>
              <Box sx={{ display: 'grid', gap: 0.75 }}>
                <Linha label="Número" value={pedido.notaFiscal.numero} />
                <Linha
                  label="Data"
                  value={formatDate(pedido.notaFiscal.dataEmissao)}
                />
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Histórico
            </Typography>
            {historico.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum evento registrado.
              </Typography>
            ) : (
              <List dense disablePadding>
                {historico.map((h, i) => (
                  <Box key={h.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemText
                        primary={h.etapaNome}
                        secondary={
                          <>
                            {h.usuarioNome} · {formatDateTime(h.data)}
                            <br />
                            {h.observacao}
                          </>
                        }
                      />
                    </ListItem>
                    {i < historico.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={() => setOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Fechar
          </Button>
        </Box>
      </Drawer>
    </>
  )
}
