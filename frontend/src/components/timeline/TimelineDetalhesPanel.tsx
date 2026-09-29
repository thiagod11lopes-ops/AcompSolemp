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

  const linhasResumo = useMemo(() => {
    const linhas: { label: string; value: string }[] = []
    if (mostrarClinica) {
      linhas.push({ label: 'Clínica', value: pedido.clinica.nome })
    }
    if (pedido.paciente?.nome) {
      linhas.push({ label: 'Paciente', value: pedido.paciente.nome })
    } else if (pedido.material.descricao) {
      linhas.push({ label: 'Material', value: pedido.material.descricao })
    }
    if (pedido.dadosClinica?.procedimento) {
      linhas.push({ label: 'Procedimento', value: pedido.dadosClinica.procedimento })
    }
    linhas.push({ label: 'Solicitação', value: formatDate(pedido.dataSolicitacao) })
    return linhas.slice(0, 4)
  }, [pedido, mostrarClinica])

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
          borderRadius: 2.5,
          width: { xs: '100%', md: 248 },
          minWidth: { md: 232 },
          maxWidth: { md: 264 },
          flexShrink: 0,
          alignSelf: { xs: 'stretch', md: 'flex-start' },
          p: 1.75,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.1,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 6px 18px rgba(63, 107, 86, 0.14)',
            '& .resumo-cta': { color: 'primary.dark' },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(85, 139, 113, 0.12)',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                lineHeight: 1.2,
                fontSize: '0.65rem',
              }}
            >
              Resumo
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}
            >
              Dados do lançamento
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 0.65,
            py: 0.85,
            px: 1,
            borderRadius: 1.5,
            bgcolor: 'rgba(85, 139, 113, 0.06)',
          }}
        >
          {linhasResumo.map((linha) => (
            <Box
              key={linha.label}
              sx={{
                display: 'grid',
                gridTemplateColumns: '76px 1fr',
                columnGap: 0.75,
                alignItems: 'baseline',
                minWidth: 0,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, lineHeight: 1.35 }}
              >
                {linha.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
                title={linha.value}
              >
                {linha.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Valor
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {formatCurrency(pedido.valor)}
          </Typography>
        </Box>

        {(pedido.solemp?.numero || pedido.notaFiscal?.numero || historico.length > 0) && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              pt: 0.35,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            {pedido.solemp?.numero && (
              <Box
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: 'rgba(85, 139, 113, 0.1)',
                  color: 'primary.dark',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
                title={`SOLEMP ${pedido.solemp.numero}`}
              >
                SOLEMP {pedido.solemp.numero}
              </Box>
            )}
            {pedido.notaFiscal?.numero && (
              <Box
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: 'rgba(0,0,0,0.05)',
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                NF {pedido.notaFiscal.numero}
              </Box>
            )}
            {historico.length > 0 && (
              <Box
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: 'rgba(0,0,0,0.05)',
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                {historico.length === 1 ? '1 evento' : `${historico.length} eventos`}
              </Box>
            )}
          </Box>
        )}

        <Typography
          className="resumo-cta"
          variant="caption"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            lineHeight: 1.2,
            transition: 'color 0.15s ease',
          }}
        >
          Ver detalhes
        </Typography>
      </Box>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              maxWidth: '100%',
            },
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
