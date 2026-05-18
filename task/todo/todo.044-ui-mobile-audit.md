# T-044 — UI/UX mobile responsive audit

## P — Plan
**Why**: User yêu cầu auto-audit UI khi mobile viewport (390px). Đảm bảo các page
không vỡ layout, không horizontal overflow, sticky elements không che content.

**Scope**: 26 routes liệt kê:
- **Auth/onboard** (4): /login, /first-login, /profile/setup
- **Owner** (12): /dashboard (owner), /rooms, /admin/{tenants, chat-groups, documents,
  guests, move-requests, settings, utilities}, /admin/finance/{expenses, invoices, payments, report}
- **Tenant** (5): /home, /tenant/{payments, move-out, guests, documents, change-password}
- **Shared** (5): /community, /chat, /chat-groups, /chat-groups/[id], /notifications, /profile

**Test matrix per page**:
| Check | Method |
|---|---|
| Horizontal overflow | `document.documentElement.scrollWidth > clientWidth` |
| Content cut by sticky header | Visual screenshot |
| Bottom nav overlap | Visual + bottom safe area check |
| Modal touch targets | Visual |
| Text wrap/truncate | Visual |
| Form usability | Try input |

**Viewport**: 390x844 (iPhone 12/13/14 standard).

## D — Do
1. Start dev server (existing)
2. Resize Chrome to 390x844
3. Login owner → audit owner pages
4. Login tenant → audit tenant pages
5. Document issues vào work/t044-ui-audit-findings.md
6. Fix critical inline nếu đơn giản; defer các issue lớn

## C — Check
- Build pass sau bất kỳ fix nào
- Document tất cả findings (PASS / WARN / FAIL)

## E — Phase E
Task IS Phase E (audit only).

## A — Act
- Commit findings doc + fixes nếu có
- FF merge + push
