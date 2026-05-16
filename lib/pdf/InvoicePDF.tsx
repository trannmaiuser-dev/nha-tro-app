import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Invoice } from '@/types'
import { ensureVietnameseFontRegistered, PDF_FONT_FAMILY } from './fonts'

ensureVietnameseFontRegistered()

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    fontFamily: PDF_FONT_FAMILY,
    color: '#222',
  },
  header: {
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 110,
    color: '#6b7280',
  },
  infoValue: {
    flex: 1,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  itemLabel: { flex: 3 },
  itemAmount: { flex: 1, textAlign: 'right', fontWeight: 'bold' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
  },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalAmount: { fontSize: 14, fontWeight: 'bold', color: '#dc2626' },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  noteSection: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  noteLabel: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
  },
})

const fmt = (n: number) => n.toLocaleString('vi-VN') + ' đ'

function waterDetail(mode: string, amount: number): string {
  if (amount === 0) return ''
  if (mode === 'per_m3')     return '(theo m³ tiêu thụ)'
  if (mode === 'per_person') return '(theo đầu người)'
  return '(cố định)'
}

interface Props {
  invoice: Invoice
  tenantName?: string | null
}

export default function InvoicePDF({ invoice, tenantName }: Props) {
  const createdDate = new Date(invoice.created_at).toLocaleDateString('vi-VN')
  const dueDate     = new Date(invoice.due_date).toLocaleDateString('vi-VN')
  const remaining   = invoice.total - invoice.paid_amount
  const extraItems  = Array.isArray(invoice.extra_items) ? invoice.extra_items : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>HÓA ĐƠN TIỀN PHÒNG</Text>
          <Text style={styles.subtitle}>Tháng {invoice.month}/{invoice.year}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phòng:</Text>
          <Text style={styles.infoValue}>{invoice.room?.name ?? '—'} (Tầng {invoice.room?.floor ?? '—'})</Text>
        </View>
        {tenantName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Người ở:</Text>
            <Text style={styles.infoValue}>{tenantName}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ngày tạo:</Text>
          <Text style={styles.infoValue}>{createdDate}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Hạn đóng:</Text>
          <Text style={styles.infoValue}>{dueDate}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Tiền phòng</Text>
          <Text style={styles.itemAmount}>{fmt(invoice.rent_amount)}</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Tiền điện</Text>
          <Text style={styles.itemAmount}>{fmt(invoice.electricity_amount)}</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Tiền nước {waterDetail(invoice.water_billing_mode, invoice.water_amount)}</Text>
          <Text style={styles.itemAmount}>{fmt(invoice.water_amount)}</Text>
        </View>
        {invoice.trash_fee > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Phí rác</Text>
            <Text style={styles.itemAmount}>{fmt(invoice.trash_fee)}</Text>
          </View>
        )}
        {invoice.parking_fee > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Phí gửi xe</Text>
            <Text style={styles.itemAmount}>{fmt(invoice.parking_fee)}</Text>
          </View>
        )}
        {invoice.internet_fee > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Phí internet</Text>
            <Text style={styles.itemAmount}>{fmt(invoice.internet_fee)}</Text>
          </View>
        )}
        {invoice.over_capacity_fee > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Phụ phí quá người</Text>
            <Text style={styles.itemAmount}>{fmt(invoice.over_capacity_fee)}</Text>
          </View>
        )}
        {extraItems.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemAmount}>{fmt(item.amount)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
          <Text style={styles.totalAmount}>{fmt(invoice.total)}</Text>
        </View>

        {invoice.paid_amount > 0 && (
          <>
            <View style={styles.paidRow}>
              <Text style={{ color: '#6b7280' }}>Đã thanh toán</Text>
              <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>{fmt(invoice.paid_amount)}</Text>
            </View>
            <View style={styles.paidRow}>
              <Text style={{ color: '#6b7280' }}>Còn lại</Text>
              <Text style={{ fontWeight: 'bold', color: remaining > 0 ? '#ea580c' : '#16a34a' }}>
                {fmt(remaining)}
              </Text>
            </View>
          </>
        )}

        {invoice.note && (
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Ghi chú:</Text>
            <Text>{invoice.note}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Hóa đơn này được tạo tự động từ hệ thống quản lý nhà trọ.
        </Text>
      </Page>
    </Document>
  )
}
