import React, { useState } from 'react';
import { Card, Badge, Button } from '@enheritage/ui';

type OrderStatus = 'PENDING' | 'PRINTING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
type ProductType = 'HARDCOVER_BOOK' | 'SOFTCOVER_BOOK' | 'PHOTO_BOOK' | 'FRAMED_PRINT' | 'USB_ARCHIVE';

interface PrintOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productType: ProductType;
  quantity: number;
  status: OrderStatus;
  orderedAt: string;
  shippedAt?: string;
  trackingNumber?: string;
  totalCents: number;
}

const MOCK_ORDERS: PrintOrder[] = [
  { id: 'o1', orderNumber: 'ENH-2026-0001', customerName: 'Sarah Johnson', customerEmail: 'sarah@example.com', productType: 'HARDCOVER_BOOK', quantity: 2, status: 'SHIPPED', orderedAt: '2026-03-10', shippedAt: '2026-03-14', trackingNumber: '1Z999AA10123456784', totalCents: 12998 },
  { id: 'o2', orderNumber: 'ENH-2026-0002', customerName: 'Michael Chen', customerEmail: 'mchen@example.com', productType: 'PHOTO_BOOK', quantity: 1, status: 'PRINTING', orderedAt: '2026-03-18', totalCents: 4999 },
  { id: 'o3', orderNumber: 'ENH-2026-0003', customerName: 'Emma Rodriguez', customerEmail: 'emma.r@example.com', productType: 'USB_ARCHIVE', quantity: 3, status: 'PENDING', orderedAt: '2026-03-24', totalCents: 5997 },
  { id: 'o4', orderNumber: 'ENH-2026-0004', customerName: 'David Williams', customerEmail: 'dwilliams@corp.com', productType: 'HARDCOVER_BOOK', quantity: 10, status: 'DELIVERED', orderedAt: '2026-02-28', shippedAt: '2026-03-04', trackingNumber: '1Z999AA10123456785', totalCents: 64990 },
  { id: 'o5', orderNumber: 'ENH-2026-0005', customerName: 'Lena Fischer', customerEmail: 'lena@example.com', productType: 'FRAMED_PRINT', quantity: 1, status: 'CANCELLED', orderedAt: '2026-03-05', totalCents: 7999 },
];

const statusVariantMap: Record<OrderStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  PENDING: 'warning',
  PRINTING: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

export default function KeepsakesPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const filtered = statusFilter === '' ? MOCK_ORDERS : MOCK_ORDERS.filter((o) => o.status === statusFilter);

  const totalRevenue = MOCK_ORDERS
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#101828]">Print Order Management</h1>
        <div className="text-sm text-[#667085]">
          Total revenue:{' '}
          <span className="font-semibold text-[#344054]">
            ${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'PENDING', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={[
              'px-3 py-1.5 rounded-md text-sm transition-colors',
              statusFilter === s
                ? 'bg-[#2B5BA8] text-white font-medium'
                : 'bg-white text-[#667085] border border-[#E4E7EC] hover:bg-[#F9FAFB]',
            ].join(' ')}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      <Card>
        <div className="-mx-6 -my-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                {['Order #', 'Customer', 'Product', 'Qty', 'Total', 'Status', 'Ordered', 'Tracking', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#344054]">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#344054]">{order.customerName}</p>
                    <p className="text-xs text-[#98A2B3]">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-[#667085] text-xs whitespace-nowrap">{order.productType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-[#667085]">{order.quantity}</td>
                  <td className="px-4 py-3 text-[#344054] font-medium">
                    ${(order.totalCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariantMap[order.status]} size="sm">{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{order.orderedAt}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#667085]">
                    {order.trackingNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" className="text-xs text-[#2B5BA8] hover:underline">Details</button>
                      {order.status === 'PRINTING' && (
                        <button type="button" className="text-xs text-[#10B981] hover:underline">Mark Shipped</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#98A2B3]">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
